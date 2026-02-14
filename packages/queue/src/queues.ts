import { Queue } from "bullmq";
import { connection } from "./connection";
import type { MailAiJobData } from "./jobs/mail-ai";
import type { MailAutoHandleJobData } from "./jobs/mail-autohandle";
import type { MailSyncJobData } from "./jobs/mail-sync";

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
