import { taskSyncQueue } from "../queues";

export type TaskSyncJobData =
	| {
			type: "full-sync";
			connectionId: string;
			userId: string;
	  }
	| {
			type: "incremental-sync";
			connectionId: string;
			userId: string;
	  }
	| {
			type: "webhook-event";
			connectionId: string;
			userId: string;
			event: {
				action: "created" | "updated" | "deleted";
				taskExternalId: string;
				projectExternalId: string | null;
				data: Record<string, unknown> | null;
			};
	  };

export async function enqueueFullSync(connectionId: string, userId: string) {
	return taskSyncQueue.add("full-sync", {
		type: "full-sync",
		connectionId,
		userId,
	});
}

export async function enqueueIncrementalTaskSync(
	connectionId: string,
	userId: string,
) {
	return taskSyncQueue.add("incremental-sync", {
		type: "incremental-sync",
		connectionId,
		userId,
	});
}

export async function enqueueWebhookEvent(
	connectionId: string,
	userId: string,
	event: TaskSyncJobData & { type: "webhook-event" } extends { event: infer E }
		? E
		: never,
) {
	return taskSyncQueue.add("webhook-event", {
		type: "webhook-event",
		connectionId,
		userId,
		event,
	});
}

export async function scheduleRecurringTaskSync(
	connectionId: string,
	userId: string,
) {
	return taskSyncQueue.add(
		`recurring-task-sync:${connectionId}`,
		{
			type: "incremental-sync",
			connectionId,
			userId,
		},
		{
			repeat: { every: 10 * 60 * 1000 }, // every 10 minutes
			jobId: `recurring-task-sync:${connectionId}`,
		},
	);
}
