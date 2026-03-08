import { scheduleWebhookRenewal } from "../jobs/calendar-sync";
import { createCalendarSyncWorker } from "./calendar-sync.worker";
import { createMailAiWorker } from "./mail-ai.worker";
import { createMailAutoHandleWorker } from "./mail-autohandle.worker";
import { createMailFollowUpWorker } from "./mail-followup.worker";
import { createMailSendWorker } from "./mail-send.worker";
import { createMailSnoozeWorker } from "./mail-snooze.worker";
import { createMailSyncWorker } from "./mail-sync.worker";
import { createTaskReminderWorker } from "./task-reminder.worker";
import { createTaskSyncWorker } from "./task-sync.worker";
import { createTaskWriteBackWorker } from "./task-writeback.worker";
import { createWorkSummaryWorker } from "./work-summary.worker";

console.log("[workers] Starting workers...");

const calendarSyncWorker = createCalendarSyncWorker();
const mailSyncWorker = createMailSyncWorker();
const mailAiWorker = createMailAiWorker();
const mailAutoHandleWorker = createMailAutoHandleWorker();
const mailSnoozeWorker = createMailSnoozeWorker();
const mailSendWorker = createMailSendWorker();
const mailFollowUpWorker = createMailFollowUpWorker();
const taskReminderWorker = createTaskReminderWorker();
const taskSyncWorker = createTaskSyncWorker();
const taskWriteBackWorker = createTaskWriteBackWorker();
const workSummaryWorker = createWorkSummaryWorker();

// Schedule recurring jobs
scheduleWebhookRenewal().catch((err) =>
	console.error("[workers] Failed to schedule webhook renewal:", err),
);

console.log("[workers] All workers started");

async function shutdown() {
	console.log("[workers] Shutting down gracefully...");
	await Promise.all([
		calendarSyncWorker.close(),
		mailSyncWorker.close(),
		mailAiWorker.close(),
		mailAutoHandleWorker.close(),
		mailSnoozeWorker.close(),
		mailSendWorker.close(),
		mailFollowUpWorker.close(),
		taskReminderWorker.close(),
		taskSyncWorker.close(),
		taskWriteBackWorker.close(),
		workSummaryWorker.close(),
	]);
	console.log("[workers] All workers stopped");
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
