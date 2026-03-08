import {
	and,
	calendarAccounts,
	calendarEvents,
	db,
	eq,
	lte,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { getValidCalendarToken } from "../calendar-token";
import { connection } from "../connection";
import type { CalendarSyncJobData } from "../jobs/calendar-sync";

const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

type GoogleEvent = {
	id: string;
	summary?: string;
	description?: string;
	location?: string;
	start?: { dateTime?: string; date?: string };
	end?: { dateTime?: string; date?: string };
	status?: string;
	organizer?: { email?: string; displayName?: string };
	attendees?: {
		email: string;
		displayName?: string;
		responseStatus?: string;
	}[];
	recurrence?: string[];
	recurringEventId?: string;
	htmlLink?: string;
	hangoutLink?: string;
	conferenceData?: {
		entryPoints?: { entryPointType?: string; uri?: string }[];
	};
	reminders?: {
		useDefault?: boolean;
		overrides?: { method: string; minutes: number }[];
	};
};

type GoogleEventsResponse = {
	items?: GoogleEvent[];
	nextPageToken?: string;
	nextSyncToken?: string;
};

function parseEventTime(
	time: { dateTime?: string; date?: string } | undefined,
	isEnd: boolean,
): { date: Date; isAllDay: boolean } {
	if (!time) {
		return { date: new Date(), isAllDay: false };
	}
	if (time.dateTime) {
		return { date: new Date(time.dateTime), isAllDay: false };
	}
	if (time.date) {
		const d = new Date(time.date);
		if (isEnd) {
			// Google all-day end dates are exclusive — subtract 1ms for storage
			d.setMilliseconds(d.getMilliseconds() - 1);
		}
		return { date: d, isAllDay: true };
	}
	return { date: new Date(), isAllDay: false };
}

function extractMeetingLink(event: GoogleEvent): string | null {
	if (event.hangoutLink) return event.hangoutLink;
	const entryPoints = event.conferenceData?.entryPoints;
	if (entryPoints) {
		const video = entryPoints.find((e) => e.entryPointType === "video");
		if (video?.uri) return video.uri;
	}
	return null;
}

function mapEventStatus(
	status?: string,
): "confirmed" | "tentative" | "cancelled" {
	if (status === "tentative") return "tentative";
	if (status === "cancelled") return "cancelled";
	return "confirmed";
}

async function fetchGoogleEvents(
	accessToken: string,
	params: Record<string, string>,
): Promise<GoogleEventsResponse> {
	const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
	for (const [k, v] of Object.entries(params)) {
		url.searchParams.set(k, v);
	}

	const res = await fetch(url.toString(), {
		headers: { Authorization: `Bearer ${accessToken}` },
	});

	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Google Calendar API error ${res.status}: ${body}`);
	}

	return (await res.json()) as GoogleEventsResponse;
}

async function upsertEvents(
	events: GoogleEvent[],
	calendarAccountId: string,
	userId: string,
): Promise<number> {
	let count = 0;

	for (const event of events) {
		if (!event.id) continue;

		// Handle cancelled events — delete from DB
		if (event.status === "cancelled") {
			await db
				.delete(calendarEvents)
				.where(
					and(
						eq(calendarEvents.calendarAccountId, calendarAccountId),
						eq(calendarEvents.externalId, event.id),
					),
				);
			continue;
		}

		const { date: startTime, isAllDay } = parseEventTime(event.start, false);
		const { date: endTime } = parseEventTime(event.end, true);

		const organizer = event.organizer
			? {
					email: event.organizer.email ?? "",
					displayName: event.organizer.displayName,
				}
			: null;

		const attendees = (event.attendees ?? []).map((a) => ({
			email: a.email,
			displayName: a.displayName,
			responseStatus: a.responseStatus,
		}));

		const reminders = event.reminders?.overrides ?? null;

		await db
			.insert(calendarEvents)
			.values({
				calendarAccountId,
				userId,
				externalId: event.id,
				title: event.summary ?? null,
				description: event.description ?? null,
				location: event.location ?? null,
				startTime,
				endTime,
				isAllDay,
				status: mapEventStatus(event.status),
				organizer,
				attendees,
				recurrenceRule: event.recurrence?.[0] ?? null,
				recurringEventId: event.recurringEventId ?? null,
				htmlLink: event.htmlLink ?? null,
				meetingLink: extractMeetingLink(event),
				reminders,
				source: "external",
				syncedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [calendarEvents.calendarAccountId, calendarEvents.externalId],
				set: {
					title: event.summary ?? null,
					description: event.description ?? null,
					location: event.location ?? null,
					startTime,
					endTime,
					isAllDay,
					status: mapEventStatus(event.status),
					organizer,
					attendees,
					recurrenceRule: event.recurrence?.[0] ?? null,
					recurringEventId: event.recurringEventId ?? null,
					htmlLink: event.htmlLink ?? null,
					meetingLink: extractMeetingLink(event),
					reminders,
					syncedAt: new Date(),
				},
			});

		count++;
	}

	return count;
}

async function processCalendarSync(
	data: Extract<CalendarSyncJobData, { calendarAccountId: string }>,
): Promise<void> {
	const account = await db.query.calendarAccounts.findFirst({
		where: eq(calendarAccounts.id, data.calendarAccountId),
	});

	if (!account || !account.active) {
		console.log(
			`[calendar-sync] Account ${data.calendarAccountId} not found or inactive, skipping`,
		);
		return;
	}

	if (!account.accessToken) {
		console.error(
			`[calendar-sync] Account ${data.calendarAccountId} has no access token`,
		);
		await db
			.update(calendarAccounts)
			.set({ syncStatus: "error", syncError: "No access token" })
			.where(eq(calendarAccounts.id, data.calendarAccountId));
		return;
	}

	await db
		.update(calendarAccounts)
		.set({ syncStatus: "syncing" })
		.where(eq(calendarAccounts.id, data.calendarAccountId));

	try {
		switch (data.type) {
			case "initial-sync": {
				const accessToken = await getValidCalendarToken(data.calendarAccountId);
				if (!accessToken) {
					throw new Error("Failed to obtain valid access token");
				}

				// Fetch events from 30 days ago to 60 days ahead
				const timeMin = new Date(
					Date.now() - 30 * 24 * 60 * 60 * 1000,
				).toISOString();
				const timeMax = new Date(
					Date.now() + 60 * 24 * 60 * 60 * 1000,
				).toISOString();

				let totalEvents = 0;
				let pageToken: string | undefined;
				let syncToken: string | undefined;

				do {
					const params: Record<string, string> = {
						timeMin,
						timeMax,
						singleEvents: "true",
						maxResults: "250",
						orderBy: "startTime",
					};
					if (pageToken) params.pageToken = pageToken;

					const response = await fetchGoogleEvents(accessToken, params);

					if (response.items && response.items.length > 0) {
						const count = await upsertEvents(
							response.items,
							data.calendarAccountId,
							data.userId,
						);
						totalEvents += count;
					}

					pageToken = response.nextPageToken;
					syncToken = response.nextSyncToken;
				} while (pageToken);

				console.log(
					`[calendar-sync] Initial sync for account ${data.calendarAccountId}: ${totalEvents} events`,
				);

				await db
					.update(calendarAccounts)
					.set({
						syncStatus: "synced",
						syncToken: syncToken ?? null,
						lastSyncAt: new Date(),
						syncError: null,
					})
					.where(eq(calendarAccounts.id, data.calendarAccountId));
				break;
			}

			case "incremental-sync": {
				const accessToken = await getValidCalendarToken(data.calendarAccountId);
				if (!accessToken) {
					throw new Error("Failed to obtain valid access token");
				}

				if (!account.syncToken) {
					console.log(
						`[calendar-sync] No sync token for account ${data.calendarAccountId}, running initial sync instead`,
					);
					await processCalendarSync({
						...data,
						type: "initial-sync",
					});
					return;
				}

				let totalEvents = 0;
				let pageToken: string | undefined;
				let newSyncToken: string | undefined;

				do {
					const params: Record<string, string> = {
						syncToken: account.syncToken,
					};
					if (pageToken) params.pageToken = pageToken;

					const response = await fetchGoogleEvents(accessToken, params);

					if (response.items && response.items.length > 0) {
						const count = await upsertEvents(
							response.items,
							data.calendarAccountId,
							data.userId,
						);
						totalEvents += count;
					}

					pageToken = response.nextPageToken;
					newSyncToken = response.nextSyncToken;
				} while (pageToken);

				console.log(
					`[calendar-sync] Incremental sync for account ${data.calendarAccountId}: ${totalEvents} events updated`,
				);

				await db
					.update(calendarAccounts)
					.set({
						syncStatus: "synced",
						syncToken: newSyncToken ?? account.syncToken,
						lastSyncAt: new Date(),
						syncError: null,
					})
					.where(eq(calendarAccounts.id, data.calendarAccountId));
				break;
			}
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown sync error";
		console.error(
			`[calendar-sync] Sync failed for account ${data.calendarAccountId}:`,
			message,
		);

		// If sync token is invalid (410 Gone), clear it to force full re-sync
		if (message.includes("410")) {
			await db
				.update(calendarAccounts)
				.set({
					syncStatus: "error",
					syncError: "Sync token expired, will re-sync",
					syncToken: null,
				})
				.where(eq(calendarAccounts.id, data.calendarAccountId));
		} else {
			await db
				.update(calendarAccounts)
				.set({
					syncStatus: "error",
					syncError: message,
				})
				.where(eq(calendarAccounts.id, data.calendarAccountId));
		}
	}
}

async function renewWebhooks(): Promise<void> {
	const soonExpiring = new Date(Date.now() + 24 * 60 * 60 * 1000);
	const accounts = await db.query.calendarAccounts.findMany({
		where: and(
			eq(calendarAccounts.active, true),
			lte(calendarAccounts.webhookExpiry, soonExpiring),
		),
	});

	for (const account of accounts) {
		const accessToken = await getValidCalendarToken(account.id);
		if (!accessToken) continue;

		// Stop old channel
		if (account.webhookChannelId && account.webhookResourceId) {
			try {
				await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: account.webhookChannelId,
						resourceId: account.webhookResourceId,
					}),
				});
			} catch {
				// Ignore stop errors
			}
		}

		// Register new channel
		const channelId = crypto.randomUUID();
		const webhookUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:8080"}/calendar/webhook`;

		try {
			const res = await fetch(
				`${GOOGLE_CALENDAR_API}/calendars/primary/events/watch`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${accessToken}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: channelId,
						type: "web_hook",
						address: webhookUrl,
						params: { ttl: "604800" },
					}),
				},
			);

			if (res.ok) {
				const data = (await res.json()) as {
					id: string;
					resourceId: string;
					expiration: string;
				};

				await db
					.update(calendarAccounts)
					.set({
						webhookChannelId: data.id,
						webhookResourceId: data.resourceId,
						webhookExpiry: new Date(Number(data.expiration)),
					})
					.where(eq(calendarAccounts.id, account.id));

				console.log(
					`[calendar-sync] Renewed webhook for account ${account.id}`,
				);
			}
		} catch (err) {
			console.error(
				`[calendar-sync] Webhook renewal failed for ${account.id}:`,
				err,
			);
		}
	}

	if (accounts.length > 0) {
		console.log(
			`[calendar-sync] Processed ${accounts.length} webhook renewals`,
		);
	}
}

export function createCalendarSyncWorker() {
	const worker = new Worker<CalendarSyncJobData>(
		"calendar-sync",
		async (job) => {
			console.log(`[calendar-sync] Processing job ${job.id}: ${job.data.type}`);
			if (job.data.type === "renew-webhooks") {
				await renewWebhooks();
			} else {
				await processCalendarSync(job.data);
			}
		},
		{ connection, concurrency: 3 },
	);

	worker.on("completed", (job) => {
		console.log(`[calendar-sync] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[calendar-sync] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
