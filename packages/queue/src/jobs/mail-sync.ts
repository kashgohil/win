import { mailSyncQueue } from "../queues";

export type MailSyncJobData =
	| {
			type: "initial-sync";
			emailAccountId: string;
			userId: string;
	  }
	| {
			type: "incremental-sync";
			emailAccountId: string;
			userId: string;
	  }
	| {
			type: "webhook-push";
			emailAccountId: string;
			userId: string;
			historyId: string;
	  };

export async function enqueueInitialSync(
	emailAccountId: string,
	userId: string,
) {
	return mailSyncQueue.add("initial-sync", {
		type: "initial-sync",
		emailAccountId,
		userId,
	});
}

export async function enqueueIncrementalSync(
	emailAccountId: string,
	userId: string,
) {
	return mailSyncQueue.add("incremental-sync", {
		type: "incremental-sync",
		emailAccountId,
		userId,
	});
}

export async function enqueueWebhookPush(
	emailAccountId: string,
	userId: string,
	historyId: string,
) {
	return mailSyncQueue.add("webhook-push", {
		type: "webhook-push",
		emailAccountId,
		userId,
		historyId,
	});
}

export async function scheduleRecurringSync(
	emailAccountId: string,
	userId: string,
) {
	return mailSyncQueue.add(
		`recurring-sync:${emailAccountId}`,
		{
			type: "incremental-sync",
			emailAccountId,
			userId,
		},
		{
			repeat: { every: 5 * 60 * 1000 },
			jobId: `recurring-sync:${emailAccountId}`,
		},
	);
}
