import { calendarSyncQueue } from "../queues";

export type CalendarSyncJobData =
	| {
			type: "initial-sync";
			calendarAccountId: string;
			userId: string;
	  }
	| {
			type: "incremental-sync";
			calendarAccountId: string;
			userId: string;
	  }
	| {
			type: "renew-webhooks";
	  };

export async function enqueueCalendarInitialSync(
	calendarAccountId: string,
	userId: string,
) {
	return calendarSyncQueue.add("initial-sync", {
		type: "initial-sync",
		calendarAccountId,
		userId,
	});
}

export async function enqueueCalendarIncrementalSync(
	calendarAccountId: string,
	userId: string,
) {
	return calendarSyncQueue.add("incremental-sync", {
		type: "incremental-sync",
		calendarAccountId,
		userId,
	});
}

export async function scheduleRecurringCalendarSync(
	calendarAccountId: string,
	userId: string,
) {
	return calendarSyncQueue.add(
		`recurring-sync:${calendarAccountId}`,
		{
			type: "incremental-sync",
			calendarAccountId,
			userId,
		},
		{
			repeat: { every: 5 * 60 * 1000 },
			jobId: `recurring-calendar-sync:${calendarAccountId}`,
		},
	);
}

export async function scheduleWebhookRenewal() {
	return calendarSyncQueue.add(
		"renew-webhooks",
		{ type: "renew-webhooks" },
		{
			repeat: { every: 12 * 60 * 60 * 1000 }, // every 12 hours
			jobId: "calendar-webhook-renewal",
		},
	);
}
