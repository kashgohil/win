/**
 * One-time script to backfill email_attachments for existing emails.
 * Fetches message metadata from Gmail for emails with has_attachments = true
 * and inserts attachment rows.
 *
 * Usage: bun scripts/backfill-attachments.ts
 */

import {
	and,
	db,
	emailAccounts,
	emailAttachments,
	emails,
	eq,
} from "@wingmnn/db";
import type { SyncedAttachment } from "@wingmnn/mail";
import { getValidAccessToken } from "@wingmnn/mail";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

interface GmailPart {
	mimeType: string;
	filename?: string;
	headers?: { name: string; value: string }[];
	body?: { data?: string; size: number; attachmentId?: string };
	parts?: GmailPart[];
}

interface GmailPayload {
	parts?: GmailPart[];
}

function extractAttachments(payload: GmailPayload): SyncedAttachment[] {
	const attachments: SyncedAttachment[] = [];

	function walk(parts: GmailPart[] | undefined) {
		if (!parts) return;
		for (const part of parts) {
			if (part.filename && part.body?.attachmentId) {
				const contentIdHeader = part.headers?.find(
					(h) => h.name.toLowerCase() === "content-id",
				);
				const contentId = contentIdHeader?.value?.replace(/[<>]/g, "") ?? null;

				attachments.push({
					filename: part.filename,
					mimeType: part.mimeType,
					size: part.body.size,
					providerAttachmentId: part.body.attachmentId,
					contentId,
				});
			}
			if (part.parts) walk(part.parts);
		}
	}

	walk(payload.parts);
	return attachments;
}

async function main() {
	// Get all email accounts
	const accounts = await db.query.emailAccounts.findMany({
		where: eq(emailAccounts.active, true),
	});

	console.log(`Found ${accounts.length} active email accounts`);

	for (const account of accounts) {
		const accessToken = await getValidAccessToken(account.id);
		if (!accessToken) {
			console.log(`  Skipping account ${account.email}: no valid token`);
			continue;
		}

		// Only fetch emails flagged with has_attachments and no attachment rows yet
		const emailRows = await db.query.emails.findMany({
			where: and(
				eq(emails.emailAccountId, account.id),
				eq(emails.hasAttachments, true),
			),
			with: { attachments: true },
			columns: {
				id: true,
				providerMessageId: true,
				hasAttachments: true,
				subject: true,
			},
		});

		const needsBackfill = emailRows.filter((e) => e.attachments.length === 0);

		console.log(
			`  Account ${account.email}: ${needsBackfill.length}/${emailRows.length} emails need backfill`,
		);

		let backfilled = 0;
		let updated = 0;

		for (const email of needsBackfill) {
			try {
				const res = await fetch(
					`${GMAIL_API}/users/me/messages/${email.providerMessageId}?format=full`,
					{
						headers: { Authorization: `Bearer ${accessToken}` },
						signal: AbortSignal.timeout(15000),
					},
				);

				if (!res.ok) {
					console.log(
						`    Skip ${email.providerMessageId}: fetch failed (${res.status})`,
					);
					continue;
				}

				const msg = (await res.json()) as { payload: GmailPayload };
				const attachments = extractAttachments(msg.payload);

				if (attachments.length > 0) {
					await db.insert(emailAttachments).values(
						attachments.map((att) => ({
							emailId: email.id,
							filename: att.filename,
							mimeType: att.mimeType,
							size: att.size,
							providerAttachmentId: att.providerAttachmentId,
							contentId: att.contentId,
						})),
					);
					backfilled++;
					console.log(
						`    ✓ ${email.subject?.slice(0, 50)}: ${attachments.length} attachment(s)`,
					);
				} else if (email.hasAttachments) {
					// Fix the hasAttachments flag if no real attachments found
					await db
						.update(emails)
						.set({ hasAttachments: false })
						.where(eq(emails.id, email.id));
					updated++;
				}

				// Rate limiting: small delay between requests
				await new Promise((r) => setTimeout(r, 100));
			} catch (err) {
				console.error(`    Error processing ${email.providerMessageId}:`, err);
			}
		}

		console.log(
			`  Done: ${backfilled} emails backfilled, ${updated} hasAttachments flags corrected`,
		);
	}

	console.log("Backfill complete!");
	process.exit(0);
}

main().catch((err) => {
	console.error("Backfill failed:", err);
	process.exit(1);
});
