import { and, db, isNotNull, isNull, lte, tasks } from "@wingmnn/db";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { TaskReminderJobData } from "../jobs/task-reminder";

async function processReminderCheck() {
	const now = new Date();

	// Un-snooze tasks whose snooze period has elapsed
	const unsnoozed = await db
		.update(tasks)
		.set({ snoozedUntil: null })
		.where(and(isNotNull(tasks.snoozedUntil), lte(tasks.snoozedUntil, now)))
		.returning({ id: tasks.id });

	if (unsnoozed.length > 0) {
		console.log(`[task-reminder] Un-snoozed ${unsnoozed.length} tasks`);
	}

	// Find tasks with reminders that are due (not yet completed)
	const dueReminders = await db
		.update(tasks)
		.set({ reminderAt: null })
		.where(
			and(
				isNotNull(tasks.reminderAt),
				lte(tasks.reminderAt, now),
				isNull(tasks.completedAt),
			),
		)
		.returning({ id: tasks.id, userId: tasks.userId, title: tasks.title });

	if (dueReminders.length > 0) {
		console.log(
			`[task-reminder] Triggered ${dueReminders.length} task reminders`,
		);
		// TODO: Send in-app notifications for each reminder
	}
}

export function createTaskReminderWorker() {
	const worker = new Worker<TaskReminderJobData>(
		"task-reminder",
		async () => {
			await processReminderCheck();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[task-reminder] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[task-reminder] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
