import {
	and,
	calendarEvents,
	contactFollowUps,
	contactInteractions,
	contacts,
	db,
	desc,
	emails,
	eq,
	gte,
	lte,
	notifications,
	or,
	sql,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { ContactMeetingPrepJobData } from "../jobs/contact-meeting-prep";

/* ── Process upcoming meetings ── */

async function processUpcomingMeetings() {
	const now = new Date();
	const fifteenMinLater = new Date(now.getTime() + 15 * 60 * 1000);

	// Find events starting within the next 15 minutes that haven't been prepped
	const upcomingEvents = await db
		.select({
			id: calendarEvents.id,
			userId: calendarEvents.userId,
			title: calendarEvents.title,
			startTime: calendarEvents.startTime,
			organizer: calendarEvents.organizer,
			attendees: calendarEvents.attendees,
		})
		.from(calendarEvents)
		.where(
			and(
				gte(calendarEvents.startTime, now),
				lte(calendarEvents.startTime, fifteenMinLater),
				sql`${calendarEvents.status} != 'cancelled'`,
			),
		);

	if (upcomingEvents.length === 0) return;

	// Filter out events that already have a meeting_prep follow-up
	const eventIds = upcomingEvents.map((e) => e.id);
	const existingPreps = await db
		.select({ sourceEventId: contactFollowUps.sourceEventId })
		.from(contactFollowUps)
		.where(
			and(
				eq(contactFollowUps.type, "meeting_prep"),
				sql`${contactFollowUps.sourceEventId} IN (${sql.join(
					eventIds.map((id) => sql`${id}`),
					sql`, `,
				)})`,
			),
		);

	const preppedEventIds = new Set(
		existingPreps.map((p) => p.sourceEventId).filter(Boolean),
	);

	let created = 0;

	for (const event of upcomingEvents) {
		if (preppedEventIds.has(event.id)) continue;

		// Collect all attendee emails
		const attendeeEmails: string[] = [];
		if (event.organizer?.email) {
			attendeeEmails.push(event.organizer.email.toLowerCase());
		}
		for (const a of event.attendees ?? []) {
			if (a.email) {
				attendeeEmails.push(a.email.toLowerCase());
			}
		}

		if (attendeeEmails.length === 0) continue;

		// Find matching contacts for attendees
		const matchedContacts = await db
			.select({
				id: contacts.id,
				name: contacts.name,
				primaryEmail: contacts.primaryEmail,
				relationshipScore: contacts.relationshipScore,
				lastInteractionAt: contacts.lastInteractionAt,
				notes: contacts.notes,
			})
			.from(contacts)
			.where(
				and(
					eq(contacts.userId, event.userId),
					eq(contacts.archived, false),
					sql`lower(${contacts.primaryEmail}) IN (${sql.join(
						attendeeEmails.map((e) => sql`${e}`),
						sql`, `,
					)})`,
				),
			);

		if (matchedContacts.length === 0) continue;

		// Build brief context for each contact
		const briefParts: string[] = [];

		for (const contact of matchedContacts) {
			const label = contact.name ?? contact.primaryEmail;
			const parts = [`**${label}** (score: ${contact.relationshipScore}/100)`];

			// Last interaction
			if (contact.lastInteractionAt) {
				const lastInteraction = await db
					.select({
						title: contactInteractions.title,
						occurredAt: contactInteractions.occurredAt,
					})
					.from(contactInteractions)
					.where(eq(contactInteractions.contactId, contact.id))
					.orderBy(desc(contactInteractions.occurredAt))
					.limit(1);

				if (lastInteraction[0]) {
					const daysAgo = Math.round(
						(now.getTime() - lastInteraction[0].occurredAt.getTime()) /
							(1000 * 60 * 60 * 24),
					);
					parts.push(`Last: ${lastInteraction[0].title} (${daysAgo}d ago)`);
				}
			}

			// Recent email subjects
			const recentEmails = await db
				.select({ subject: emails.subject })
				.from(emails)
				.where(
					and(
						eq(emails.userId, event.userId),
						or(
							eq(emails.fromAddress, contact.primaryEmail),
							sql`${emails.toAddresses} @> ARRAY[${contact.primaryEmail}]::text[]`,
						),
					),
				)
				.orderBy(desc(emails.receivedAt))
				.limit(3);

			if (recentEmails.length > 0) {
				const subjects = recentEmails
					.map((e) => e.subject ?? "(no subject)")
					.join(", ");
				parts.push(`Recent emails: ${subjects}`);
			}

			// Notes
			if (contact.notes) {
				parts.push(`Notes: ${contact.notes}`);
			}

			briefParts.push(parts.join("\n"));
		}

		const attendeeNames = matchedContacts
			.map((c) => c.name ?? c.primaryEmail)
			.join(", ");

		const title = `Meeting prep: ${event.title ?? "(no title)"}`;
		const context = briefParts.join("\n\n---\n\n");

		// Create meeting_prep follow-up
		await db.insert(contactFollowUps).values({
			userId: event.userId,
			contactId: matchedContacts[0]!.id,
			type: "meeting_prep",
			title,
			context,
			sourceEventId: event.id,
			dueAt: event.startTime,
			status: "pending",
		});

		// Create notification
		await db.insert(notifications).values({
			userId: event.userId,
			type: "contact_meeting_prep",
			title: `Meeting with ${attendeeNames} in 15 min`,
			body: `Here's your prep brief for "${event.title ?? "(no title)"}"`,
			link: `/contacts/meeting-prep/${event.id}`,
		});

		created++;
	}

	if (created > 0) {
		console.log(`[meeting-prep] Created ${created} meeting prep briefs`);
	}
}

/* ── Worker ── */

export function createContactMeetingPrepWorker() {
	const worker = new Worker<ContactMeetingPrepJobData>(
		"contact-meeting-prep",
		async (job) => {
			console.log(`[meeting-prep] Processing job ${job.id}: ${job.data.type}`);
			await processUpcomingMeetings();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[meeting-prep] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[meeting-prep] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
