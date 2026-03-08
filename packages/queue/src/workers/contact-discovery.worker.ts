import {
	and,
	calendarEvents,
	contactInteractions,
	contacts,
	db,
	emailAccounts,
	emails,
	eq,
	inArray,
	mailSenderRules,
	sql,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { ContactDiscoveryJobData } from "../jobs/contact-discovery";

/* ── Generic email domains to skip for company detection ── */

const GENERIC_DOMAINS = new Set([
	"gmail.com",
	"googlemail.com",
	"outlook.com",
	"hotmail.com",
	"live.com",
	"yahoo.com",
	"yahoo.co.uk",
	"icloud.com",
	"me.com",
	"mac.com",
	"aol.com",
	"protonmail.com",
	"proton.me",
	"zoho.com",
	"mail.com",
	"yandex.com",
	"gmx.com",
	"gmx.net",
	"fastmail.com",
	"tutanota.com",
	"hey.com",
]);

/* ── Addresses to auto-archive ── */

const SYSTEM_PATTERNS = [
	"noreply@",
	"no-reply@",
	"no_reply@",
	"donotreply@",
	"do-not-reply@",
	"mailer-daemon@",
	"postmaster@",
	"bounce@",
	"notifications@",
	"notification@",
	"alert@",
	"alerts@",
	"system@",
	"automated@",
];

const AUTO_ARCHIVE_CATEGORIES = new Set([
	"newsletter",
	"promotional",
	"spam",
	"receipt",
	"confirmation",
]);

function isSystemAddress(email: string): boolean {
	const lower = email.toLowerCase();
	return SYSTEM_PATTERNS.some((p) => lower.startsWith(p));
}

function detectCompany(email: string): string | null {
	const domain = email.split("@")[1]?.toLowerCase();
	if (!domain || GENERIC_DOMAINS.has(domain)) return null;

	// Strip TLD suffixes and capitalize
	const parts = domain.split(".");
	const name = parts[0];
	if (!name || name.length < 2) return null;

	return name.charAt(0).toUpperCase() + name.slice(1);
}

/* ── Upsert contact + interaction ── */

interface ContactCandidate {
	email: string;
	name: string | null;
	interactionType: "email_sent" | "email_received" | "meeting";
	interactionTitle: string;
	occurredAt: Date;
	referenceId: string;
}

async function upsertContacts(userId: string, candidates: ContactCandidate[]) {
	// Get user's own email addresses to exclude
	const userAccounts = await db
		.select({ email: emailAccounts.email })
		.from(emailAccounts)
		.where(eq(emailAccounts.userId, userId));
	const ownEmails = new Set(userAccounts.map((a) => a.email.toLowerCase()));

	// Get sender rules for VIP/category info
	const senderRules = await db
		.select({
			senderAddress: mailSenderRules.senderAddress,
			vip: mailSenderRules.vip,
			category: mailSenderRules.category,
		})
		.from(mailSenderRules)
		.where(eq(mailSenderRules.userId, userId));
	const ruleMap = new Map(
		senderRules.map((r) => [r.senderAddress.toLowerCase(), r]),
	);

	// Dedupe candidates by email (keep all interactions)
	const byEmail = new Map<string, ContactCandidate[]>();
	for (const c of candidates) {
		const lower = c.email.toLowerCase().trim();
		if (!lower || ownEmails.has(lower)) continue;
		const list = byEmail.get(lower) ?? [];
		list.push(c);
		byEmail.set(lower, list);
	}

	for (const [email, interactions] of byEmail) {
		// Pick best name (most recent non-null)
		const bestName =
			interactions
				.filter((i) => i.name)
				.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0]
				?.name ?? null;

		const shouldArchive =
			isSystemAddress(email) ||
			AUTO_ARCHIVE_CATEGORIES.has(ruleMap.get(email)?.category ?? "");

		const isVip = ruleMap.get(email)?.vip ?? false;
		const company = detectCompany(email);

		// Upsert contact
		const result = await db
			.insert(contacts)
			.values({
				userId,
				primaryEmail: email,
				name: bestName,
				company,
				starred: isVip,
				archived: shouldArchive,
				source: "discovered",
			})
			.onConflictDoUpdate({
				target: [contacts.userId, contacts.primaryEmail],
				set: {
					// Only update name if we have one and existing is null
					name: sql`COALESCE(${contacts.name}, ${bestName})`,
					// Only set company if not already set
					company: company
						? sql`COALESCE(${contacts.company}, ${company})`
						: sql`${contacts.company}`,
				},
			})
			.returning({ id: contacts.id });

		const contactId = result[0]?.id;
		if (!contactId) continue;

		// Insert interactions (skip duplicates via unique index)
		for (const interaction of interactions) {
			await db
				.insert(contactInteractions)
				.values({
					userId,
					contactId,
					type: interaction.interactionType,
					referenceId: interaction.referenceId,
					title: interaction.interactionTitle,
					occurredAt: interaction.occurredAt,
				})
				.onConflictDoNothing({
					target: [
						contactInteractions.contactId,
						contactInteractions.type,
						contactInteractions.referenceId,
					],
				});
		}

		// Update interaction count and last interaction
		const stats = await db
			.select({
				count: sql<number>`count(*)::int`,
				maxOccurred: sql<Date>`max(${contactInteractions.occurredAt})`,
			})
			.from(contactInteractions)
			.where(eq(contactInteractions.contactId, contactId));

		if (stats[0]) {
			await db
				.update(contacts)
				.set({
					interactionCount: stats[0].count,
					lastInteractionAt: stats[0].maxOccurred,
				})
				.where(eq(contacts.id, contactId));
		}
	}
}

/* ── Full scan: process all emails for a user ── */

async function processFullScan(userId: string) {
	console.log(`[contact-discovery] Starting full scan for user ${userId}`);

	// Process emails in batches
	const BATCH_SIZE = 500;
	let offset = 0;
	let totalContacts = 0;

	while (true) {
		const batch = await db
			.select({
				id: emails.id,
				fromAddress: emails.fromAddress,
				fromName: emails.fromName,
				toAddresses: emails.toAddresses,
				ccAddresses: emails.ccAddresses,
				receivedAt: emails.receivedAt,
				subject: emails.subject,
				labels: emails.labels,
			})
			.from(emails)
			.where(eq(emails.userId, userId))
			.orderBy(emails.receivedAt)
			.limit(BATCH_SIZE)
			.offset(offset);

		if (batch.length === 0) break;

		const candidates: ContactCandidate[] = [];

		for (const email of batch) {
			const isSent = email.labels?.includes("SENT") ?? false;
			const occurredAt = email.receivedAt;
			const subject = email.subject ?? "(no subject)";

			// Sender
			if (email.fromAddress) {
				candidates.push({
					email: email.fromAddress,
					name: email.fromName ?? null,
					interactionType: isSent ? "email_sent" : "email_received",
					interactionTitle: `Email: ${subject}`,
					occurredAt,
					referenceId: email.id,
				});
			}

			// Recipients (only track if we sent the email)
			if (isSent) {
				for (const addr of email.toAddresses ?? []) {
					candidates.push({
						email: addr,
						name: null,
						interactionType: "email_sent",
						interactionTitle: `Email: ${subject}`,
						occurredAt,
						referenceId: email.id,
					});
				}
				for (const addr of email.ccAddresses ?? []) {
					candidates.push({
						email: addr,
						name: null,
						interactionType: "email_sent",
						interactionTitle: `Email: ${subject}`,
						occurredAt,
						referenceId: email.id,
					});
				}
			}
		}

		await upsertContacts(userId, candidates);
		totalContacts += candidates.length;
		offset += BATCH_SIZE;

		console.log(
			`[contact-discovery] Processed ${offset} emails (${totalContacts} contact candidates)`,
		);
	}

	console.log(
		`[contact-discovery] Email scan complete: ${totalContacts} candidates`,
	);

	// Process calendar events in batches
	let eventOffset = 0;
	let totalEventContacts = 0;

	while (true) {
		const batch = await db
			.select({
				id: calendarEvents.id,
				title: calendarEvents.title,
				organizer: calendarEvents.organizer,
				attendees: calendarEvents.attendees,
				startTime: calendarEvents.startTime,
				status: calendarEvents.status,
			})
			.from(calendarEvents)
			.where(eq(calendarEvents.userId, userId))
			.orderBy(calendarEvents.startTime)
			.limit(BATCH_SIZE)
			.offset(eventOffset);

		if (batch.length === 0) break;

		const candidates: ContactCandidate[] = [];

		for (const event of batch) {
			if (event.status === "cancelled") continue;
			const occurredAt = event.startTime;
			const title = event.title ?? "(no title)";

			if (event.organizer?.email) {
				candidates.push({
					email: event.organizer.email,
					name: event.organizer.displayName ?? null,
					interactionType: "meeting",
					interactionTitle: `Meeting: ${title}`,
					occurredAt,
					referenceId: event.id,
				});
			}

			for (const attendee of event.attendees ?? []) {
				if (!attendee.email) continue;
				if (attendee.responseStatus === "declined") continue;
				candidates.push({
					email: attendee.email,
					name: attendee.displayName ?? null,
					interactionType: "meeting",
					interactionTitle: `Meeting: ${title}`,
					occurredAt,
					referenceId: event.id,
				});
			}
		}

		await upsertContacts(userId, candidates);
		totalEventContacts += candidates.length;
		eventOffset += BATCH_SIZE;

		console.log(
			`[contact-discovery] Processed ${eventOffset} events (${totalEventContacts} contact candidates)`,
		);
	}

	console.log(
		`[contact-discovery] Full scan complete for user ${userId}: ${totalContacts} email + ${totalEventContacts} event candidates`,
	);
}

/* ── Extract from specific email IDs ── */

async function processExtractFromEmails(userId: string, emailIds: string[]) {
	if (emailIds.length === 0) return;

	const batch = await db
		.select({
			id: emails.id,
			fromAddress: emails.fromAddress,
			fromName: emails.fromName,
			toAddresses: emails.toAddresses,
			ccAddresses: emails.ccAddresses,
			receivedAt: emails.receivedAt,
			subject: emails.subject,
			labels: emails.labels,
		})
		.from(emails)
		.where(and(eq(emails.userId, userId), inArray(emails.id, emailIds)));

	const candidates: ContactCandidate[] = [];

	for (const email of batch) {
		const isSent = email.labels?.includes("SENT") ?? false;
		const occurredAt = email.receivedAt;
		const subject = email.subject ?? "(no subject)";

		if (email.fromAddress) {
			candidates.push({
				email: email.fromAddress,
				name: email.fromName ?? null,
				interactionType: isSent ? "email_sent" : "email_received",
				interactionTitle: `Email: ${subject}`,
				occurredAt,
				referenceId: email.id,
			});
		}

		if (isSent) {
			for (const addr of email.toAddresses ?? []) {
				candidates.push({
					email: addr,
					name: null,
					interactionType: "email_sent",
					interactionTitle: `Email: ${subject}`,
					occurredAt,
					referenceId: email.id,
				});
			}
			for (const addr of email.ccAddresses ?? []) {
				candidates.push({
					email: addr,
					name: null,
					interactionType: "email_sent",
					interactionTitle: `Email: ${subject}`,
					occurredAt,
					referenceId: email.id,
				});
			}
		}
	}

	if (candidates.length > 0) {
		await upsertContacts(userId, candidates);
		console.log(
			`[contact-discovery] Extracted ${candidates.length} contact candidates from ${emailIds.length} emails`,
		);
	}
}

/* ── Extract from specific calendar event IDs ── */

async function processExtractFromEvents(userId: string, eventIds: string[]) {
	if (eventIds.length === 0) return;

	const batch = await db
		.select({
			id: calendarEvents.id,
			title: calendarEvents.title,
			organizer: calendarEvents.organizer,
			attendees: calendarEvents.attendees,
			startTime: calendarEvents.startTime,
			status: calendarEvents.status,
		})
		.from(calendarEvents)
		.where(
			and(
				eq(calendarEvents.userId, userId),
				inArray(calendarEvents.id, eventIds),
			),
		);

	const candidates: ContactCandidate[] = [];

	for (const event of batch) {
		if (event.status === "cancelled") continue;
		const occurredAt = event.startTime;
		const title = event.title ?? "(no title)";

		// Organizer
		if (event.organizer?.email) {
			candidates.push({
				email: event.organizer.email,
				name: event.organizer.displayName ?? null,
				interactionType: "meeting",
				interactionTitle: `Meeting: ${title}`,
				occurredAt,
				referenceId: event.id,
			});
		}

		// Attendees
		for (const attendee of event.attendees ?? []) {
			if (!attendee.email) continue;
			if (attendee.responseStatus === "declined") continue;
			candidates.push({
				email: attendee.email,
				name: attendee.displayName ?? null,
				interactionType: "meeting",
				interactionTitle: `Meeting: ${title}`,
				occurredAt,
				referenceId: event.id,
			});
		}
	}

	if (candidates.length > 0) {
		await upsertContacts(userId, candidates);
		console.log(
			`[contact-discovery] Extracted ${candidates.length} contact candidates from ${eventIds.length} events`,
		);
	}
}

/* ── Worker ── */

export function createContactDiscoveryWorker() {
	const worker = new Worker<ContactDiscoveryJobData>(
		"contact-discovery",
		async (job) => {
			switch (job.data.type) {
				case "full-scan":
					await processFullScan(job.data.userId);
					break;
				case "extract-from-emails":
					await processExtractFromEmails(job.data.userId, job.data.emailIds);
					break;
				case "extract-from-events":
					await processExtractFromEvents(job.data.userId, job.data.eventIds);
					break;
			}
		},
		{ connection, concurrency: 2 },
	);

	worker.on("completed", (job) => {
		console.log(`[contact-discovery] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[contact-discovery] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
