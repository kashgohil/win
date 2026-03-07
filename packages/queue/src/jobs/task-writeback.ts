import { taskWriteBackQueue } from "../queues";

export type TaskWriteBackJobData = {
	taskId: string;
	connectionId: string;
	userId: string;
	externalId: string;
	updates: {
		title?: string;
		description?: string;
		statusExternalId?: string;
		priority?: "none" | "low" | "medium" | "high" | "urgent";
		dueAt?: string | null;
	};
};

export async function enqueueTaskWriteBack(data: TaskWriteBackJobData) {
	return taskWriteBackQueue.add(`write-back:${data.taskId}`, data, {
		// Deduplicate rapid updates to the same task
		jobId: `write-back:${data.taskId}`,
	});
}
