import { and, db, emails, eq, lte } from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { MailSnoozeJobData } from "../jobs/mail-snooze";

async function processSnoozeCheck() {
	const now = new Date();

	const unsnoozed = await db
		.update(emails)
		.set({
			triageStatus: null,
			snoozedUntil: null,
			isRead: false,
		})
		.where(
			and(lte(emails.snoozedUntil, now), eq(emails.triageStatus, "snoozed")),
		)
		.returning({ id: emails.id });

	if (unsnoozed.length > 0) {
		console.log(`[snooze] Re-surfaced ${unsnoozed.length} snoozed emails`);
	}
}

export function createMailSnoozeWorker() {
	const worker = new Worker<MailSnoozeJobData>(
		"mail-snooze",
		async () => {
			await processSnoozeCheck();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[snooze] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[snooze] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
