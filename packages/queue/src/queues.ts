import { Queue } from "bullmq";
import { connection } from "./connection";
import type { MailAiJobData } from "./jobs/mail-ai";
import type { MailAutoHandleJobData } from "./jobs/mail-autohandle";
import type { MailFollowUpJobData } from "./jobs/mail-followup";
import type { MailSendJobData } from "./jobs/mail-send";
import type { MailSnoozeJobData } from "./jobs/mail-snooze";
import type { MailSyncJobData } from "./jobs/mail-sync";
import type { TaskReminderJobData } from "./jobs/task-reminder";

export const mailSyncQueue = new Queue<MailSyncJobData>("mail-sync", {
	connection,
	defaultJobOptions: {
		attempts: 3,
		backoff: { type: "exponential", delay: 5000 },
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	},
});

export const mailAiQueue = new Queue<MailAiJobData>("mail-ai", {
	connection,
	defaultJobOptions: {
		attempts: 2,
		backoff: { type: "exponential", delay: 10000 },
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	},
});

export const mailAutoHandleQueue = new Queue<MailAutoHandleJobData>(
	"mail-auto-handle",
	{
		connection,
		defaultJobOptions: {
			attempts: 3,
			backoff: { type: "exponential", delay: 3000 },
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 5000 },
		},
	},
);

export const mailSnoozeQueue = new Queue<MailSnoozeJobData>("mail-snooze", {
	connection,
	defaultJobOptions: {
		attempts: 2,
		backoff: { type: "exponential", delay: 5000 },
		removeOnComplete: { count: 100 },
		removeOnFail: { count: 500 },
	},
});

export const mailSendQueue = new Queue<MailSendJobData>("mail-send", {
	connection,
	defaultJobOptions: {
		attempts: 1,
		removeOnComplete: { count: 1000 },
		removeOnFail: { count: 5000 },
	},
});

export const mailFollowUpQueue = new Queue<MailFollowUpJobData>(
	"mail-follow-up",
	{
		connection,
		defaultJobOptions: {
			attempts: 2,
			backoff: { type: "exponential", delay: 5000 },
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 500 },
		},
	},
);

export const taskReminderQueue = new Queue<TaskReminderJobData>(
	"task-reminder",
	{
		connection,
		defaultJobOptions: {
			attempts: 2,
			backoff: { type: "exponential", delay: 5000 },
			removeOnComplete: { count: 100 },
			removeOnFail: { count: 500 },
		},
	},
);
