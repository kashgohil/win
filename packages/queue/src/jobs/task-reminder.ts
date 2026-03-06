import { taskReminderQueue } from "../queues";

export type TaskReminderJobData = {
	type: "check-reminders";
};

export async function scheduleTaskReminderCheck() {
	return taskReminderQueue.add(
		"task-reminder-check",
		{ type: "check-reminders" },
		{
			repeat: { every: 60 * 1000 },
			jobId: "task-reminder-check",
		},
	);
}
