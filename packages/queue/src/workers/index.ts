import { createMailAiWorker } from "./mail-ai.worker";
import { createMailAutoHandleWorker } from "./mail-autohandle.worker";
import { createMailFollowUpWorker } from "./mail-followup.worker";
import { createMailSendWorker } from "./mail-send.worker";
import { createMailSnoozeWorker } from "./mail-snooze.worker";
import { createMailSyncWorker } from "./mail-sync.worker";
import { createTaskReminderWorker } from "./task-reminder.worker";

console.log("[workers] Starting workers...");

const mailSyncWorker = createMailSyncWorker();
const mailAiWorker = createMailAiWorker();
const mailAutoHandleWorker = createMailAutoHandleWorker();
const mailSnoozeWorker = createMailSnoozeWorker();
const mailSendWorker = createMailSendWorker();
const mailFollowUpWorker = createMailFollowUpWorker();
const taskReminderWorker = createTaskReminderWorker();

console.log("[workers] All workers started");

async function shutdown() {
	console.log("[workers] Shutting down gracefully...");
	await Promise.all([
		mailSyncWorker.close(),
		mailAiWorker.close(),
		mailAutoHandleWorker.close(),
		mailSnoozeWorker.close(),
		mailSendWorker.close(),
		mailFollowUpWorker.close(),
		taskReminderWorker.close(),
	]);
	console.log("[workers] All workers stopped");
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
