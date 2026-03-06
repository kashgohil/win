import { mailSnoozeQueue } from "../queues";

export type MailSnoozeJobData = {
	type: "check-snoozed";
};

export async function scheduleSnoozeCheck() {
	return mailSnoozeQueue.add(
		"snooze-check",
		{ type: "check-snoozed" },
		{
			repeat: { every: 60 * 1000 },
			jobId: "snooze-check",
		},
	);
}
