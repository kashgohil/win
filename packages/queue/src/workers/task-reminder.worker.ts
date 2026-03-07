import {
	and,
	db,
	inArray,
	isNotNull,
	isNull,
	lte,
	notifications,
	tasks,
	userProfiles,
} from "@wingmnn/db";
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
		.returning({
			id: tasks.id,
			userId: tasks.userId,
			title: tasks.title,
			priority: tasks.priority,
		});

	if (dueReminders.length > 0) {
		console.log(
			`[task-reminder] Triggered ${dueReminders.length} task reminders`,
		);
		await createReminderNotifications(dueReminders);
	}
}

async function createReminderNotifications(
	reminders: {
		id: string;
		userId: string;
		title: string;
		priority: string;
	}[],
) {
	// Get unique user IDs and fetch their notification preferences
	const userIds = [...new Set(reminders.map((r) => r.userId))];
	const profiles = await db
		.select({
			userId: userProfiles.userId,
			notificationStyle: userProfiles.notificationStyle,
		})
		.from(userProfiles)
		.where(inArray(userProfiles.userId, userIds));

	const prefMap = new Map(profiles.map((p) => [p.userId, p.notificationStyle]));

	const toInsert = reminders.filter((r) => {
		const style = prefMap.get(r.userId) ?? "realtime";
		// quiet = daily digest only, no in-app notifications
		if (style === "quiet") return false;
		// balanced = only urgent/high priority alerts
		if (style === "balanced") {
			return r.priority === "high" || r.priority === "urgent";
		}
		// realtime (default) = all notifications
		return true;
	});

	if (toInsert.length === 0) return;

	await db.insert(notifications).values(
		toInsert.map((r) => ({
			userId: r.userId,
			type: "task_reminder" as const,
			title: `Reminder: ${r.title}`,
			link: `/module/task/list?taskId=${r.id}`,
			taskId: r.id,
		})),
	);

	console.log(
		`[task-reminder] Created ${toInsert.length} notifications (${reminders.length - toInsert.length} filtered by preferences)`,
	);
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
