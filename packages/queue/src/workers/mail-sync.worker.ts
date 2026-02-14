import { db, emailAccounts, emails, eq } from "@wingmnn/db";
import type { SyncedEmail } from "@wingmnn/mail";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { Worker } from "bullmq";
import { connection } from "../connection";
import { enqueueClassify } from "../jobs/mail-ai";
import type { MailSyncJobData } from "../jobs/mail-sync";

async function upsertSyncedEmails(
	syncedEmails: SyncedEmail[],
	emailAccountId: string,
	userId: string,
): Promise<string[]> {
	if (syncedEmails.length === 0) return [];

	const inserted = await db
		.insert(emails)
		.values(
			syncedEmails.map((e) => ({
				emailAccountId,
				userId,
				providerMessageId: e.providerMessageId,
				providerThreadId: e.providerThreadId,
				subject: e.subject,
				fromAddress: e.fromAddress,
				fromName: e.fromName,
				toAddresses: e.toAddresses,
				ccAddresses: e.ccAddresses,
				snippet: e.snippet,
				receivedAt: e.receivedAt,
				isRead: e.isRead,
				isStarred: e.isStarred,
				hasAttachments: e.hasAttachments,
				labels: e.labels,
				bodyPlain: e.bodyPlain,
				bodyHtml: e.bodyHtml,
			})),
		)
		.onConflictDoNothing({
			target: [emails.emailAccountId, emails.providerMessageId],
		})
		.returning({ id: emails.id });

	return inserted.map((r) => r.id);
}

async function processMailSync(data: MailSyncJobData): Promise<void> {
	const account = await db.query.emailAccounts.findFirst({
		where: eq(emailAccounts.id, data.emailAccountId),
	});

	if (!account || !account.active) {
		console.log(
			`[mail-sync] Account ${data.emailAccountId} not found or inactive, skipping`,
		);
		return;
	}

	if (!account.accessToken) {
		console.error(
			`[mail-sync] Account ${data.emailAccountId} has no access token`,
		);
		await db
			.update(emailAccounts)
			.set({ syncStatus: "error", syncError: "No access token" })
			.where(eq(emailAccounts.id, data.emailAccountId));
		return;
	}

	const provider = getProvider(account.provider);
	if (!provider) {
		console.error(
			`[mail-sync] Unknown provider: ${account.provider} for account ${data.emailAccountId}`,
		);
		await db
			.update(emailAccounts)
			.set({
				syncStatus: "error",
				syncError: `Unknown provider: ${account.provider}`,
			})
			.where(eq(emailAccounts.id, data.emailAccountId));
		return;
	}

	await db
		.update(emailAccounts)
		.set({ syncStatus: "syncing" })
		.where(eq(emailAccounts.id, data.emailAccountId));

	try {
		switch (data.type) {
			case "initial-sync": {
				const accessToken = await getValidAccessToken(data.emailAccountId);
				if (!accessToken) {
					throw new Error("Failed to obtain valid access token");
				}

				const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
				const result = await provider.initialSync(accessToken, since);

				console.log(
					`[mail-sync] Initial sync for account ${data.emailAccountId}: ${result.emails.length} emails fetched`,
				);

				const insertedIds = await upsertSyncedEmails(
					result.emails,
					data.emailAccountId,
					data.userId,
				);

				await db
					.update(emailAccounts)
					.set({
						syncStatus: "synced",
						syncCursor: result.newCursor,
						lastSyncAt: new Date(),
						syncError: null,
					})
					.where(eq(emailAccounts.id, data.emailAccountId));

				if (insertedIds.length > 0) {
					await enqueueClassify(insertedIds, data.userId);
				}
				break;
			}

			case "incremental-sync": {
				const accessToken = await getValidAccessToken(data.emailAccountId);
				if (!accessToken) {
					throw new Error("Failed to obtain valid access token");
				}

				if (!account.syncCursor) {
					console.log(
						`[mail-sync] No sync cursor for account ${data.emailAccountId}, skipping incremental sync`,
					);
					await db
						.update(emailAccounts)
						.set({ syncStatus: "synced", lastSyncAt: new Date() })
						.where(eq(emailAccounts.id, data.emailAccountId));
					break;
				}

				const result = await provider.incrementalSync(
					accessToken,
					account.syncCursor,
				);

				console.log(
					`[mail-sync] Incremental sync for account ${data.emailAccountId}: ${result.emails.length} new emails`,
				);

				const insertedIds = await upsertSyncedEmails(
					result.emails,
					data.emailAccountId,
					data.userId,
				);

				await db
					.update(emailAccounts)
					.set({
						syncStatus: "synced",
						syncCursor: result.newCursor ?? account.syncCursor,
						lastSyncAt: new Date(),
						syncError: null,
					})
					.where(eq(emailAccounts.id, data.emailAccountId));

				if (insertedIds.length > 0) {
					await enqueueClassify(insertedIds, data.userId);
				}
				break;
			}

			case "webhook-push": {
				const accessToken = await getValidAccessToken(data.emailAccountId);
				if (!accessToken) {
					throw new Error("Failed to obtain valid access token");
				}

				const cursor = data.historyId;
				const result = await provider.incrementalSync(accessToken, cursor);

				console.log(
					`[mail-sync] Webhook push for account ${data.emailAccountId}, historyId: ${data.historyId}: ${result.emails.length} new emails`,
				);

				const insertedIds = await upsertSyncedEmails(
					result.emails,
					data.emailAccountId,
					data.userId,
				);

				await db
					.update(emailAccounts)
					.set({
						syncStatus: "synced",
						syncCursor: result.newCursor ?? cursor,
						lastSyncAt: new Date(),
						syncError: null,
					})
					.where(eq(emailAccounts.id, data.emailAccountId));

				if (insertedIds.length > 0) {
					await enqueueClassify(insertedIds, data.userId);
				}
				break;
			}
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown sync error";
		console.error(
			`[mail-sync] Sync failed for account ${data.emailAccountId}:`,
			err,
		);
		await db
			.update(emailAccounts)
			.set({ syncStatus: "error", syncError: message })
			.where(eq(emailAccounts.id, data.emailAccountId));
		throw err;
	}
}

export function createMailSyncWorker() {
	const worker = new Worker<MailSyncJobData>(
		"mail-sync",
		async (job) => {
			console.log(`[mail-sync] Processing job ${job.id}: ${job.data.type}`);
			await processMailSync(job.data);
		},
		{ connection, concurrency: 3 },
	);

	worker.on("completed", (job) => {
		console.log(`[mail-sync] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[mail-sync] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
