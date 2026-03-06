import {
	and,
	asc,
	db,
	emails,
	eq,
	gte,
	isNotNull,
	lte,
	sql,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { MailFollowUpJobData } from "../jobs/mail-followup";

const threadKeyExpr = sql<string>`COALESCE(
	${emails.threadGroupId}::text,
	${emails.emailAccountId}::text || ':' || ${emails.providerThreadId},
	${emails.id}::text
)`;

async function processFollowUpCheck() {
	const now = new Date();

	const dueEmails = await db
		.select({
			id: emails.id,
			fromAddress: emails.fromAddress,
			receivedAt: emails.receivedAt,
			providerThreadId: emails.providerThreadId,
			threadGroupId: emails.threadGroupId,
			emailAccountId: emails.emailAccountId,
			userId: emails.userId,
		})
		.from(emails)
		.where(
			and(
				lte(emails.followUpAt, now),
				eq(emails.followUpDismissed, false),
				isNotNull(emails.followUpAt),
			),
		)
		.orderBy(asc(emails.followUpAt))
		.limit(100);

	let cleared = 0;
	for (const email of dueEmails) {
		const threadKey = email.threadGroupId
			? email.threadGroupId
			: email.providerThreadId
				? `${email.emailAccountId}:${email.providerThreadId}`
				: email.id;

		const reply = await db
			.select({ id: emails.id })
			.from(emails)
			.where(
				and(
					eq(emails.userId, email.userId),
					sql`${threadKeyExpr} = ${threadKey}`,
					gte(emails.receivedAt, email.receivedAt),
					sql`${emails.fromAddress} != ${email.fromAddress}`,
				),
			)
			.limit(1);

		if (reply.length > 0) {
			await db
				.update(emails)
				.set({ followUpAt: null })
				.where(eq(emails.id, email.id));
			cleared++;
		}
	}

	if (cleared > 0) {
		console.log(`[follow-up] Auto-cleared ${cleared} follow-ups (reply found)`);
	}
}

export function createMailFollowUpWorker() {
	const worker = new Worker<MailFollowUpJobData>(
		"mail-follow-up",
		async () => {
			await processFollowUpCheck();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[follow-up] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[follow-up] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
