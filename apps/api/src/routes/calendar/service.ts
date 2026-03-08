import {
	and,
	asc,
	calendarAccounts,
	calendarEvents,
	count,
	db,
	desc,
	eq,
	gte,
	lt,
	lte,
} from "@wingmnn/db";
import {
	enqueueCalendarIncrementalSync,
	enqueueCalendarInitialSync,
	scheduleRecurringCalendarSync,
} from "@wingmnn/queue";
import { env } from "../../env";
import { createOAuthState, verifyOAuthState } from "../mail/oauth-state";

/* ── Google Calendar OAuth config ── */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_SCOPES = [
	"https://www.googleapis.com/auth/calendar.readonly",
	"https://www.googleapis.com/auth/calendar.events",
	"https://www.googleapis.com/auth/userinfo.email",
].join(" ");

function getGoogleRedirectUri(): string {
	return `${env.BETTER_AUTH_URL}/calendar/accounts/callback/google`;
}

function isGoogleConfigured(): boolean {
	return !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/* ── Serialization ── */

type SerializedAccount = {
	id: string;
	provider: "google" | "outlook";
	email: string;
	syncStatus: "pending" | "syncing" | "synced" | "error";
	lastSyncAt: string | null;
	syncError: string | null;
	active: boolean;
	createdAt: string;
};

function serializeAccount(
	account: typeof calendarAccounts.$inferSelect,
): SerializedAccount {
	return {
		id: account.id,
		provider: account.provider,
		email: account.email,
		syncStatus: account.syncStatus,
		lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
		syncError: account.syncError ?? null,
		active: account.active,
		createdAt: account.createdAt.toISOString(),
	};
}

type SerializedEvent = {
	id: string;
	calendarAccountId: string;
	externalId: string;
	title: string | null;
	description: string | null;
	location: string | null;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	status: "confirmed" | "tentative" | "cancelled";
	organizer: { email: string; displayName?: string } | null;
	attendees: {
		email: string;
		displayName?: string;
		responseStatus?: string;
	}[];
	recurrenceRule: string | null;
	recurringEventId: string | null;
	htmlLink: string | null;
	meetingLink: string | null;
	source: string;
	createdAt: string;
};

function serializeEvent(
	event: typeof calendarEvents.$inferSelect,
): SerializedEvent {
	return {
		id: event.id,
		calendarAccountId: event.calendarAccountId,
		externalId: event.externalId,
		title: event.title,
		description: event.description,
		location: event.location,
		startTime: event.startTime.toISOString(),
		endTime: event.endTime.toISOString(),
		isAllDay: event.isAllDay,
		status: event.status,
		organizer: event.organizer as SerializedEvent["organizer"],
		attendees: (event.attendees as SerializedEvent["attendees"]) ?? [],
		recurrenceRule: event.recurrenceRule,
		recurringEventId: event.recurringEventId,
		htmlLink: event.htmlLink,
		meetingLink: event.meetingLink,
		source: event.source,
		createdAt: event.createdAt.toISOString(),
	};
}

/* ── Result types ── */

type AccountListResult =
	| { ok: true; data: SerializedAccount[] }
	| { ok: false; error: string; status: number };

type ConnectResult =
	| { ok: true; url: string }
	| { ok: false; error: string; status: number };

type OAuthCallbackResult =
	| { ok: true; accountId: string }
	| { ok: false; error: string; status: number };

type DisconnectResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: number };

/* ── Service ── */

export const calendarService = {
	async getAccounts(userId: string): Promise<AccountListResult> {
		try {
			const accounts = await db.query.calendarAccounts.findMany({
				where: eq(calendarAccounts.userId, userId),
				orderBy: [desc(calendarAccounts.createdAt)],
			});
			return { ok: true, data: accounts.map(serializeAccount) };
		} catch (err) {
			console.error("[calendar] getAccounts failed:", err);
			return { ok: false, error: "Failed to load accounts", status: 500 };
		}
	},

	async connectAccount(
		userId: string,
		provider: string,
	): Promise<ConnectResult> {
		if (provider !== "google") {
			return {
				ok: false,
				error: `Unsupported provider: ${provider}. Only Google Calendar is supported.`,
				status: 400,
			};
		}

		if (!isGoogleConfigured()) {
			return {
				ok: false,
				error: "Google Calendar is not configured",
				status: 400,
			};
		}

		try {
			const state = await createOAuthState(userId);
			const params = new URLSearchParams({
				client_id: env.GOOGLE_CLIENT_ID!,
				redirect_uri: getGoogleRedirectUri(),
				response_type: "code",
				scope: GOOGLE_SCOPES,
				access_type: "offline",
				prompt: "consent",
				state,
			});

			const url = `${GOOGLE_AUTH_URL}?${params.toString()}`;
			return { ok: true, url };
		} catch (err) {
			console.error("[calendar] connectAccount failed:", err);
			return { ok: false, error: "Failed to generate auth URL", status: 500 };
		}
	},

	async handleOAuthCallback(
		code: string,
		state: string,
	): Promise<OAuthCallbackResult> {
		const userId = await verifyOAuthState(state);
		if (!userId) {
			return {
				ok: false,
				error: "Invalid or expired OAuth state",
				status: 400,
			};
		}

		try {
			// Exchange code for tokens
			const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					code,
					client_id: env.GOOGLE_CLIENT_ID!,
					client_secret: env.GOOGLE_CLIENT_SECRET!,
					redirect_uri: getGoogleRedirectUri(),
					grant_type: "authorization_code",
				}),
			});

			if (!tokenRes.ok) {
				const errBody = await tokenRes.text();
				console.error("[calendar] Token exchange failed:", errBody);
				return {
					ok: false,
					error: "Failed to exchange authorization code",
					status: 500,
				};
			}

			const tokens = (await tokenRes.json()) as {
				access_token: string;
				refresh_token?: string;
				expires_in: number;
				scope: string;
			};

			// Get user's email
			const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
				headers: { Authorization: `Bearer ${tokens.access_token}` },
			});

			if (!userInfoRes.ok) {
				return {
					ok: false,
					error: "Failed to get user info",
					status: 500,
				};
			}

			const userInfo = (await userInfoRes.json()) as { email: string };
			const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

			// Upsert account
			const conflictSet: Record<string, unknown> = {
				accessToken: tokens.access_token,
				tokenExpiresAt: expiresAt,
				scopes: tokens.scope,
				syncStatus: "pending" as const,
				active: true,
				syncError: null,
			};
			if (tokens.refresh_token) {
				conflictSet.refreshToken = tokens.refresh_token;
			}

			const rows = await db
				.insert(calendarAccounts)
				.values({
					userId,
					provider: "google",
					email: userInfo.email,
					accessToken: tokens.access_token,
					refreshToken: tokens.refresh_token ?? null,
					tokenExpiresAt: expiresAt,
					scopes: tokens.scope,
					syncStatus: "pending",
					active: true,
				})
				.onConflictDoUpdate({
					target: [
						calendarAccounts.userId,
						calendarAccounts.provider,
						calendarAccounts.email,
					],
					set: conflictSet,
				})
				.returning();

			const account = rows[0];
			if (!account) {
				return {
					ok: false,
					error: "Failed to create calendar account",
					status: 500,
				};
			}

			await enqueueCalendarInitialSync(account.id, userId);
			await scheduleRecurringCalendarSync(account.id, userId);

			// Register webhook for real-time push notifications
			await this.registerWebhook(account.id);

			return { ok: true, accountId: account.id };
		} catch (err) {
			console.error("[calendar] handleOAuthCallback failed:", err);
			return {
				ok: false,
				error: "Failed to complete OAuth connection",
				status: 500,
			};
		}
	},

	async listEvents(
		userId: string,
		params: {
			startAfter?: string;
			startBefore?: string;
			accountId?: string;
			limit?: number;
			cursor?: string;
		},
	) {
		try {
			const conditions = [eq(calendarEvents.userId, userId)];

			if (params.startAfter) {
				conditions.push(
					gte(calendarEvents.startTime, new Date(params.startAfter)),
				);
			}
			if (params.startBefore) {
				conditions.push(
					lt(calendarEvents.startTime, new Date(params.startBefore)),
				);
			}
			if (params.accountId) {
				conditions.push(eq(calendarEvents.calendarAccountId, params.accountId));
			}
			if (params.cursor) {
				conditions.push(gte(calendarEvents.startTime, new Date(params.cursor)));
			}

			const pageSize = params.limit ?? 100;

			const events = await db.query.calendarEvents.findMany({
				where: and(...conditions),
				orderBy: [asc(calendarEvents.startTime)],
				limit: pageSize + 1,
			});

			const hasMore = events.length > pageSize;
			const page = hasMore ? events.slice(0, pageSize) : events;

			return {
				ok: true as const,
				data: {
					events: page.map(serializeEvent),
					hasMore,
					nextCursor: hasMore
						? page[page.length - 1]?.startTime.toISOString()
						: undefined,
				},
			};
		} catch (err) {
			console.error("[calendar] listEvents failed:", err);
			return {
				ok: false as const,
				error: "Failed to load events",
				status: 500,
			};
		}
	},

	async getEvent(userId: string, eventId: string) {
		try {
			const event = await db.query.calendarEvents.findFirst({
				where: and(
					eq(calendarEvents.id, eventId),
					eq(calendarEvents.userId, userId),
				),
			});

			if (!event) {
				return { ok: false as const, error: "Event not found", status: 404 };
			}

			return { ok: true as const, data: serializeEvent(event) };
		} catch (err) {
			console.error("[calendar] getEvent failed:", err);
			return { ok: false as const, error: "Failed to load event", status: 500 };
		}
	},

	async getModuleData(userId: string) {
		try {
			const now = new Date();
			const todayStart = new Date(now);
			todayStart.setHours(0, 0, 0, 0);
			const todayEnd = new Date(now);
			todayEnd.setHours(23, 59, 59, 999);

			// Next upcoming event
			const nextEvent = await db.query.calendarEvents.findFirst({
				where: and(
					eq(calendarEvents.userId, userId),
					gte(calendarEvents.startTime, now),
					eq(calendarEvents.status, "confirmed"),
				),
				orderBy: [asc(calendarEvents.startTime)],
			});

			// Today's event count
			const [todayCount] = await db
				.select({ count: count() })
				.from(calendarEvents)
				.where(
					and(
						eq(calendarEvents.userId, userId),
						gte(calendarEvents.startTime, todayStart),
						lte(calendarEvents.startTime, todayEnd),
						eq(calendarEvents.status, "confirmed"),
					),
				);

			// Find conflicts (overlapping events today)
			const todayEvents = await db.query.calendarEvents.findMany({
				where: and(
					eq(calendarEvents.userId, userId),
					gte(calendarEvents.startTime, todayStart),
					lte(calendarEvents.startTime, todayEnd),
					eq(calendarEvents.status, "confirmed"),
				),
				orderBy: [asc(calendarEvents.startTime)],
			});

			let conflictCount = 0;
			const conflicts: { event1: SerializedEvent; event2: SerializedEvent }[] =
				[];
			for (let i = 0; i < todayEvents.length - 1; i++) {
				const current = todayEvents[i]!;
				const next = todayEvents[i + 1]!;
				if (current.isAllDay || next.isAllDay) continue;
				if (current.endTime > next.startTime) {
					conflictCount++;
					conflicts.push({
						event1: serializeEvent(current),
						event2: serializeEvent(next),
					});
				}
			}

			// Minutes until next event
			let minutesUntilNext: number | null = null;
			if (nextEvent) {
				minutesUntilNext = Math.round(
					(nextEvent.startTime.getTime() - now.getTime()) / 60000,
				);
			}

			return {
				ok: true as const,
				data: {
					nextEvent: nextEvent ? serializeEvent(nextEvent) : null,
					minutesUntilNext,
					todayCount: todayCount?.count ?? 0,
					conflictCount,
					conflicts,
				},
			};
		} catch (err) {
			console.error("[calendar] getModuleData failed:", err);
			return {
				ok: false as const,
				error: "Failed to load calendar data",
				status: 500,
			};
		}
	},

	async getValidToken(
		accountId: string,
	): Promise<
		{ ok: true; token: string } | { ok: false; error: string; status: number }
	> {
		const account = await db.query.calendarAccounts.findFirst({
			where: eq(calendarAccounts.id, accountId),
		});

		if (!account || !account.active || !account.accessToken) {
			return {
				ok: false,
				error: "Calendar account not found or inactive",
				status: 404,
			};
		}

		const TOKEN_BUFFER_MS = 5 * 60 * 1000;
		if (
			account.tokenExpiresAt &&
			account.tokenExpiresAt.getTime() > Date.now() + TOKEN_BUFFER_MS
		) {
			return { ok: true, token: account.accessToken };
		}

		if (!account.refreshToken) {
			return { ok: false, error: "No refresh token available", status: 401 };
		}

		try {
			const res = await fetch(GOOGLE_TOKEN_URL, {
				method: "POST",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: env.GOOGLE_CLIENT_ID!,
					client_secret: env.GOOGLE_CLIENT_SECRET!,
					refresh_token: account.refreshToken,
					grant_type: "refresh_token",
				}),
			});

			if (!res.ok) {
				return { ok: false, error: "Token refresh failed", status: 401 };
			}

			const data = (await res.json()) as {
				access_token: string;
				expires_in: number;
			};

			const expiresAt = new Date(Date.now() + data.expires_in * 1000);
			await db
				.update(calendarAccounts)
				.set({ accessToken: data.access_token, tokenExpiresAt: expiresAt })
				.where(eq(calendarAccounts.id, accountId));

			return { ok: true, token: data.access_token };
		} catch (err) {
			console.error("[calendar] token refresh failed:", err);
			return { ok: false, error: "Token refresh failed", status: 500 };
		}
	},

	async createEvent(
		userId: string,
		input: {
			accountId: string;
			title: string;
			startTime: string;
			endTime: string;
			isAllDay?: boolean;
			description?: string;
			location?: string;
		},
	) {
		try {
			// Verify account ownership
			const account = await db.query.calendarAccounts.findFirst({
				where: and(
					eq(calendarAccounts.id, input.accountId),
					eq(calendarAccounts.userId, userId),
				),
			});
			if (!account) {
				return {
					ok: false as const,
					error: "Calendar account not found",
					status: 404,
				};
			}

			const tokenResult = await this.getValidToken(input.accountId);
			if (!tokenResult.ok) {
				return {
					ok: false as const,
					error: tokenResult.error,
					status: tokenResult.status,
				};
			}

			// Build Google Calendar event body
			const isAllDay = input.isAllDay ?? false;
			const googleEvent: Record<string, unknown> = {
				summary: input.title,
				...(input.description && { description: input.description }),
				...(input.location && { location: input.location }),
			};

			if (isAllDay) {
				googleEvent.start = { date: input.startTime.slice(0, 10) };
				googleEvent.end = { date: input.endTime.slice(0, 10) };
			} else {
				googleEvent.start = { dateTime: input.startTime };
				googleEvent.end = { dateTime: input.endTime };
			}

			const res = await fetch(
				"https://www.googleapis.com/calendar/v3/calendars/primary/events",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${tokenResult.token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(googleEvent),
				},
			);

			if (!res.ok) {
				const body = await res.text();
				console.error("[calendar] createEvent Google API failed:", body);
				return {
					ok: false as const,
					error: "Failed to create event in Google Calendar",
					status: 502,
				};
			}

			const created = (await res.json()) as {
				id: string;
				htmlLink?: string;
				hangoutLink?: string;
			};

			// Insert into local DB
			const [dbEvent] = await db
				.insert(calendarEvents)
				.values({
					userId,
					calendarAccountId: input.accountId,
					externalId: created.id,
					title: input.title,
					description: input.description ?? null,
					location: input.location ?? null,
					startTime: new Date(input.startTime),
					endTime: new Date(input.endTime),
					isAllDay,
					status: "confirmed",
					organizer: null,
					attendees: [],
					htmlLink: created.htmlLink ?? null,
					meetingLink: created.hangoutLink ?? null,
					source: "google",
				})
				.returning();

			if (!dbEvent) {
				return {
					ok: false as const,
					error: "Failed to store event",
					status: 500,
				};
			}

			return { ok: true as const, data: serializeEvent(dbEvent) };
		} catch (err) {
			console.error("[calendar] createEvent failed:", err);
			return {
				ok: false as const,
				error: "Failed to create event",
				status: 500,
			};
		}
	},

	async updateEvent(
		userId: string,
		eventId: string,
		input: {
			title?: string;
			startTime?: string;
			endTime?: string;
			isAllDay?: boolean;
			description?: string;
			location?: string;
		},
	) {
		try {
			const event = await db.query.calendarEvents.findFirst({
				where: and(
					eq(calendarEvents.id, eventId),
					eq(calendarEvents.userId, userId),
				),
			});

			if (!event) {
				return { ok: false as const, error: "Event not found", status: 404 };
			}

			const tokenResult = await this.getValidToken(event.calendarAccountId);
			if (!tokenResult.ok) {
				return {
					ok: false as const,
					error: tokenResult.error,
					status: tokenResult.status,
				};
			}

			// Build patch body for Google
			const isAllDay = input.isAllDay ?? event.isAllDay;
			const googlePatch: Record<string, unknown> = {};
			if (input.title !== undefined) googlePatch.summary = input.title;
			if (input.description !== undefined)
				googlePatch.description = input.description;
			if (input.location !== undefined) googlePatch.location = input.location;

			if (input.startTime !== undefined || input.isAllDay !== undefined) {
				const startTime = input.startTime ?? event.startTime.toISOString();
				if (isAllDay) {
					googlePatch.start = { date: startTime.slice(0, 10) };
				} else {
					googlePatch.start = { dateTime: startTime };
				}
			}
			if (input.endTime !== undefined || input.isAllDay !== undefined) {
				const endTime = input.endTime ?? event.endTime.toISOString();
				if (isAllDay) {
					googlePatch.end = { date: endTime.slice(0, 10) };
				} else {
					googlePatch.end = { dateTime: endTime };
				}
			}

			const res = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.externalId}`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${tokenResult.token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify(googlePatch),
				},
			);

			if (!res.ok) {
				const body = await res.text();
				console.error("[calendar] updateEvent Google API failed:", body);
				return {
					ok: false as const,
					error: "Failed to update event in Google Calendar",
					status: 502,
				};
			}

			// Update local DB
			const dbUpdate: Record<string, unknown> = {};
			if (input.title !== undefined) dbUpdate.title = input.title;
			if (input.description !== undefined)
				dbUpdate.description = input.description;
			if (input.location !== undefined) dbUpdate.location = input.location;
			if (input.startTime !== undefined)
				dbUpdate.startTime = new Date(input.startTime);
			if (input.endTime !== undefined)
				dbUpdate.endTime = new Date(input.endTime);
			if (input.isAllDay !== undefined) dbUpdate.isAllDay = input.isAllDay;

			const [updated] = await db
				.update(calendarEvents)
				.set(dbUpdate)
				.where(
					and(
						eq(calendarEvents.id, eventId),
						eq(calendarEvents.userId, userId),
					),
				)
				.returning();

			if (!updated) {
				return {
					ok: false as const,
					error: "Failed to update event",
					status: 500,
				};
			}

			return { ok: true as const, data: serializeEvent(updated) };
		} catch (err) {
			console.error("[calendar] updateEvent failed:", err);
			return {
				ok: false as const,
				error: "Failed to update event",
				status: 500,
			};
		}
	},

	async deleteEvent(userId: string, eventId: string) {
		try {
			const event = await db.query.calendarEvents.findFirst({
				where: and(
					eq(calendarEvents.id, eventId),
					eq(calendarEvents.userId, userId),
				),
			});

			if (!event) {
				return { ok: false as const, error: "Event not found", status: 404 };
			}

			const tokenResult = await this.getValidToken(event.calendarAccountId);
			if (!tokenResult.ok) {
				return {
					ok: false as const,
					error: tokenResult.error,
					status: tokenResult.status,
				};
			}

			const res = await fetch(
				`https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.externalId}`,
				{
					method: "DELETE",
					headers: {
						Authorization: `Bearer ${tokenResult.token}`,
					},
				},
			);

			// 204 = deleted, 410 = already gone — both are fine
			if (!res.ok && res.status !== 410) {
				const body = await res.text();
				console.error("[calendar] deleteEvent Google API failed:", body);
				return {
					ok: false as const,
					error: "Failed to delete event from Google Calendar",
					status: 502,
				};
			}

			await db
				.delete(calendarEvents)
				.where(
					and(
						eq(calendarEvents.id, eventId),
						eq(calendarEvents.userId, userId),
					),
				);

			return { ok: true as const, message: "Event deleted" };
		} catch (err) {
			console.error("[calendar] deleteEvent failed:", err);
			return {
				ok: false as const,
				error: "Failed to delete event",
				status: 500,
			};
		}
	},

	async disconnectAccount(
		userId: string,
		accountId: string,
	): Promise<DisconnectResult> {
		try {
			const [deleted] = await db
				.delete(calendarAccounts)
				.where(
					and(
						eq(calendarAccounts.id, accountId),
						eq(calendarAccounts.userId, userId),
					),
				)
				.returning();

			if (!deleted) {
				return { ok: false, error: "Account not found", status: 404 };
			}

			return { ok: true, message: "Account disconnected" };
		} catch (err) {
			console.error("[calendar] disconnectAccount failed:", err);
			return {
				ok: false,
				error: "Failed to disconnect account",
				status: 500,
			};
		}
	},

	/* ── Webhooks ── */

	async registerWebhook(accountId: string) {
		try {
			const account = await db.query.calendarAccounts.findFirst({
				where: eq(calendarAccounts.id, accountId),
			});

			if (!account || !account.active) {
				console.error(
					`[calendar] registerWebhook: account ${accountId} not found or inactive`,
				);
				return;
			}

			const tokenResult = await this.getValidToken(accountId);
			if (!tokenResult.ok) {
				console.error(
					`[calendar] registerWebhook: token failed for ${accountId}`,
				);
				return;
			}

			const channelId = crypto.randomUUID();
			const webhookUrl = `${env.BETTER_AUTH_URL}/calendar/webhook`;

			// Google Calendar watch API — watches for changes to the calendar
			const res = await fetch(
				"https://www.googleapis.com/calendar/v3/calendars/primary/events/watch",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${tokenResult.token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						id: channelId,
						type: "web_hook",
						address: webhookUrl,
						params: { ttl: "604800" }, // 7 days
					}),
				},
			);

			if (!res.ok) {
				const body = await res.text();
				console.error("[calendar] registerWebhook Google API failed:", body);
				return;
			}

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
				.where(eq(calendarAccounts.id, accountId));

			console.log(
				`[calendar] webhook registered for account ${accountId}, expires ${data.expiration}`,
			);
		} catch (err) {
			console.error(`[calendar] registerWebhook failed for ${accountId}:`, err);
		}
	},

	async handleWebhookNotification(channelId: string, resourceId: string) {
		try {
			const account = await db.query.calendarAccounts.findFirst({
				where: and(
					eq(calendarAccounts.webhookChannelId, channelId),
					eq(calendarAccounts.webhookResourceId, resourceId),
				),
			});

			if (!account) {
				console.warn(`[calendar] webhook: no account for channel ${channelId}`);
				return { ok: false as const, error: "Unknown channel", status: 404 };
			}

			// Enqueue an incremental sync
			await enqueueCalendarIncrementalSync(account.id, account.userId);
			console.log(
				`[calendar] webhook triggered incremental sync for account ${account.id}`,
			);

			return { ok: true as const };
		} catch (err) {
			console.error("[calendar] handleWebhookNotification failed:", err);
			return {
				ok: false as const,
				error: "Webhook processing failed",
				status: 500,
			};
		}
	},

	async renewWebhooks() {
		try {
			// Find accounts with webhooks expiring within 24 hours
			const soonExpiring = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const accounts = await db.query.calendarAccounts.findMany({
				where: and(
					eq(calendarAccounts.active, true),
					lte(calendarAccounts.webhookExpiry, soonExpiring),
				),
			});

			for (const account of accounts) {
				// Stop the old channel first
				if (account.webhookChannelId && account.webhookResourceId) {
					await this.stopWebhookChannel(
						account.id,
						account.webhookChannelId,
						account.webhookResourceId,
					);
				}
				await this.registerWebhook(account.id);
			}

			if (accounts.length > 0) {
				console.log(`[calendar] renewed ${accounts.length} webhooks`);
			}
		} catch (err) {
			console.error("[calendar] renewWebhooks failed:", err);
		}
	},

	async stopWebhookChannel(
		accountId: string,
		channelId: string,
		resourceId: string,
	) {
		try {
			const tokenResult = await this.getValidToken(accountId);
			if (!tokenResult.ok) return;

			await fetch("https://www.googleapis.com/calendar/v3/channels/stop", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${tokenResult.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ id: channelId, resourceId }),
			});
		} catch (err) {
			console.error(
				`[calendar] stopWebhookChannel failed for ${accountId}:`,
				err,
			);
		}
	},
};
