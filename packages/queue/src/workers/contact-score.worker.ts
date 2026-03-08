import {
	and,
	contactFollowUps,
	contactInteractions,
	contacts,
	db,
	eq,
	gte,
	notifications,
	or,
	sql,
	users,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { ContactScoreJobData } from "../jobs/contact-score";

/* ── Relationship Score Formula ── */

function computeScore(opts: {
	daysSinceLastInteraction: number;
	interactionsLast90Days: number;
	sentCount: number;
	receivedCount: number;
	starred: boolean;
}): number {
	const recencyScore = Math.max(0, 40 - opts.daysSinceLastInteraction);
	const frequencyScore = Math.min(30, opts.interactionsLast90Days * 2);

	const total = opts.sentCount + opts.receivedCount;
	const reciprocityScore =
		total > 0
			? 10 * (1 - Math.abs(opts.sentCount - opts.receivedCount) / total)
			: 0;

	const starredBonus = opts.starred ? 20 : 0;

	return Math.min(
		100,
		Math.round(recencyScore + frequencyScore + reciprocityScore + starredBonus),
	);
}

/* ── Compute avg interaction gap (median of gaps between interactions) ── */

function computeAvgGapDays(dates: Date[]): number | null {
	if (dates.length < 2) return null;

	const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
	const gaps: number[] = [];

	for (let i = 1; i < sorted.length; i++) {
		const diffMs = sorted[i]!.getTime() - sorted[i - 1]!.getTime();
		gaps.push(diffMs / (1000 * 60 * 60 * 24));
	}

	// Median
	gaps.sort((a, b) => a - b);
	const mid = Math.floor(gaps.length / 2);
	const median =
		gaps.length % 2 === 0 ? (gaps[mid - 1]! + gaps[mid]!) / 2 : gaps[mid]!;

	return Math.round(median);
}

/* ── Process all contacts for all users ── */

async function processScoring() {
	const now = new Date();
	const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

	// Get all users who have contacts
	const allUsers = await db
		.selectDistinct({ id: users.id })
		.from(users)
		.innerJoin(contacts, eq(contacts.userId, users.id));

	console.log(`[contact-score] Scoring contacts for ${allUsers.length} users`);

	let totalScored = 0;

	for (const user of allUsers) {
		try {
			const scored = await scoreUserContacts(user.id, now, ninetyDaysAgo);
			totalScored += scored;
		} catch (err) {
			console.error(
				`[contact-score] Failed for user ${user.id}:`,
				err instanceof Error ? err.message : err,
			);
		}
	}

	console.log(
		`[contact-score] Scoring complete: ${totalScored} contacts scored`,
	);

	// Run nudge system after scoring
	await processNudges(now);
}

/* ── Score contacts for one user ── */

async function scoreUserContacts(
	userId: string,
	now: Date,
	ninetyDaysAgo: Date,
): Promise<number> {
	// Get non-archived contacts with at least 1 interaction
	const userContacts = await db
		.select({
			id: contacts.id,
			starred: contacts.starred,
			lastInteractionAt: contacts.lastInteractionAt,
		})
		.from(contacts)
		.where(
			and(
				eq(contacts.userId, userId),
				eq(contacts.archived, false),
				sql`${contacts.interactionCount} > 0`,
			),
		);

	for (const contact of userContacts) {
		// Get interactions in last 90 days with type breakdown
		const stats = await db
			.select({
				total: sql<number>`count(*)::int`,
				sentCount: sql<number>`count(*) FILTER (WHERE ${contactInteractions.type} = 'email_sent')::int`,
				receivedCount: sql<number>`count(*) FILTER (WHERE ${contactInteractions.type} = 'email_received')::int`,
			})
			.from(contactInteractions)
			.where(
				and(
					eq(contactInteractions.contactId, contact.id),
					gte(contactInteractions.occurredAt, ninetyDaysAgo),
				),
			);

		const daysSinceLastInteraction = contact.lastInteractionAt
			? (now.getTime() - contact.lastInteractionAt.getTime()) /
				(1000 * 60 * 60 * 24)
			: 999;

		const score = computeScore({
			daysSinceLastInteraction,
			interactionsLast90Days: stats[0]?.total ?? 0,
			sentCount: stats[0]?.sentCount ?? 0,
			receivedCount: stats[0]?.receivedCount ?? 0,
			starred: contact.starred,
		});

		// Get all interaction dates for gap calculation
		const interactionDates = await db
			.select({ occurredAt: contactInteractions.occurredAt })
			.from(contactInteractions)
			.where(eq(contactInteractions.contactId, contact.id))
			.orderBy(contactInteractions.occurredAt);

		const avgGap = computeAvgGapDays(interactionDates.map((r) => r.occurredAt));

		await db
			.update(contacts)
			.set({
				relationshipScore: score,
				avgInteractionGapDays: avgGap,
				lastScoreComputedAt: now,
			})
			.where(eq(contacts.id, contact.id));
	}

	return userContacts.length;
}

/* ── Adaptive Follow-Up Nudges (Slice 11) ── */

async function processNudges(now: Date) {
	console.log("[contact-score] Processing follow-up nudges...");

	const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

	// Auto-dismiss old unactioned nudges (> 14 days old)
	const dismissed = await db
		.update(contactFollowUps)
		.set({ status: "dismissed" })
		.where(
			and(
				eq(contactFollowUps.type, "cadence_nudge"),
				eq(contactFollowUps.status, "pending"),
				sql`${contactFollowUps.createdAt} < ${fourteenDaysAgo}`,
			),
		)
		.returning({ id: contactFollowUps.id });

	if (dismissed.length > 0) {
		console.log(
			`[contact-score] Auto-dismissed ${dismissed.length} stale nudges`,
		);
	}

	// Find contacts that need nudges:
	// - starred or high interaction count (active relationships)
	// - have avgInteractionGapDays set
	// - days since last interaction > avgInteractionGapDays * 1.5
	// - not archived
	const candidates = await db
		.select({
			id: contacts.id,
			userId: contacts.userId,
			name: contacts.name,
			primaryEmail: contacts.primaryEmail,
			avgInteractionGapDays: contacts.avgInteractionGapDays,
			lastInteractionAt: contacts.lastInteractionAt,
		})
		.from(contacts)
		.where(
			and(
				eq(contacts.archived, false),
				sql`${contacts.avgInteractionGapDays} IS NOT NULL`,
				sql`${contacts.lastInteractionAt} IS NOT NULL`,
				sql`${contacts.interactionCount} >= 3`,
				or(eq(contacts.starred, true), sql`${contacts.interactionCount} >= 10`),
			),
		);

	let created = 0;

	for (const contact of candidates) {
		if (!contact.lastInteractionAt || !contact.avgInteractionGapDays) continue;

		const daysSinceLast =
			(now.getTime() - contact.lastInteractionAt.getTime()) /
			(1000 * 60 * 60 * 24);
		const threshold = contact.avgInteractionGapDays * 1.5;

		if (daysSinceLast <= threshold) continue;

		// Check for existing pending nudge
		const existing = await db.query.contactFollowUps.findFirst({
			where: and(
				eq(contactFollowUps.contactId, contact.id),
				eq(contactFollowUps.type, "cadence_nudge"),
				eq(contactFollowUps.status, "pending"),
			),
			columns: { id: true },
		});

		if (existing) continue;

		const contactLabel = contact.name ?? contact.primaryEmail;
		const title = `You usually interact with ${contactLabel} every ${contact.avgInteractionGapDays} days — it's been ${Math.round(daysSinceLast)} days`;

		await db.insert(contactFollowUps).values({
			userId: contact.userId,
			contactId: contact.id,
			type: "cadence_nudge",
			title,
			status: "pending",
		});

		// Create notification
		await db.insert(notifications).values({
			userId: contact.userId,
			type: "contact_follow_up",
			title: "Relationship cooling off",
			body: title,
			link: `/contacts/${contact.id}`,
		});

		created++;
	}

	if (created > 0) {
		console.log(`[contact-score] Created ${created} follow-up nudges`);
	}
}

/* ── Worker ── */

export function createContactScoreWorker() {
	const worker = new Worker<ContactScoreJobData>(
		"contact-score",
		async (job) => {
			console.log(`[contact-score] Processing job ${job.id}: ${job.data.type}`);
			await processScoring();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[contact-score] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[contact-score] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
