import { db, emailAccounts, emails, eq } from "@wingmnn/db";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { MailSendJobData } from "../jobs/mail-send";

async function processDelayedSend(data: MailSendJobData) {
	const account = await db.query.emailAccounts.findFirst({
		where: eq(emailAccounts.id, data.emailAccountId),
	});
	if (!account || !account.active)
		throw new Error(`Account ${data.emailAccountId} not found or inactive`);

	const accessToken = await getValidAccessToken(account.id);
	if (!accessToken) throw new Error("Could not obtain access token");

	const provider = getProvider(account.provider);
	if (!provider) throw new Error(`Unknown provider: ${account.provider}`);

	if (data.type === "compose") {
		await provider.sendDraft(accessToken, {
			to: data.to,
			cc: data.cc,
			bcc: data.bcc,
			subject: data.subject,
			body: data.body,
		});
		console.log(`[mail-send] Sent new email to ${data.to.join(", ")}`);
		return;
	}

	const email = await db.query.emails.findFirst({
		where: eq(emails.id, data.emailId),
	});
	if (!email) throw new Error(`Email ${data.emailId} not found`);

	if (data.type === "reply") {
		await provider.sendDraft(accessToken, {
			to: [email.fromAddress ?? ""],
			cc: data.cc,
			subject: `Re: ${email.subject ?? ""}`,
			body: data.body,
			threadId: email.providerThreadId ?? undefined,
			inReplyTo: email.providerMessageId,
		});
	} else {
		await provider.sendDraft(accessToken, {
			to: data.to,
			subject: `Fwd: ${email.subject ?? ""}`,
			body: data.body,
			threadId: email.providerThreadId ?? undefined,
		});
	}

	console.log(`[mail-send] Sent ${data.type} for email ${data.emailId}`);
}

export function createMailSendWorker() {
	const worker = new Worker<MailSendJobData>(
		"mail-send",
		async (job) => {
			await processDelayedSend(job.data);
		},
		{ connection, concurrency: 3 },
	);

	worker.on("completed", (job) => {
		console.log(`[mail-send] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[mail-send] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
