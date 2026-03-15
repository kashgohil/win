export { getAiProvider } from "./src/ai/factory";
export {
	COMMITMENT_EXTRACT_SYSTEM_PROMPT,
	DRAFT_SYSTEM_PROMPT,
	EMAIL_TASK_MATCH_SYSTEM_PROMPT,
	RECEIPT_EXTRACT_SYSTEM_PROMPT,
	RECEIPT_SCAN_SYSTEM_PROMPT,
	TASK_CATEGORIZE_SYSTEM_PROMPT,
	TASK_PARSE_SYSTEM_PROMPT,
	THREAD_SUMMARY_SYSTEM_PROMPT,
	WORK_SUMMARY_SYSTEM_PROMPT,
} from "./src/ai/prompts";
export type {
	CommitmentExtractInput,
	CommitmentExtractResult,
	EmailTaskMatchInput,
	EmailTaskMatchResult,
	ReceiptExtractResult,
	TaskCategorizeInput,
	TaskCategorizeResult,
	TaskParseInput,
	TaskParseResult,
	WorkSummaryInput,
	WorkSummaryResult,
} from "./src/ai/types";
export { evaluateAutomations } from "./src/automation";
export {
	enqueueCalendarIncrementalSync,
	enqueueCalendarInitialSync,
	scheduleRecurringCalendarSync,
	scheduleWebhookRenewal,
	type CalendarSyncJobData,
} from "./src/jobs/calendar-sync";
export {
	enqueueContactExtractFromEmails,
	enqueueContactExtractFromEvents,
	enqueueContactFullScan,
	type ContactDiscoveryJobData,
} from "./src/jobs/contact-discovery";
export {
	scheduleMeetingPrepCheck,
	type ContactMeetingPrepJobData,
} from "./src/jobs/contact-meeting-prep";
export {
	scheduleContactScoring,
	type ContactScoreJobData,
} from "./src/jobs/contact-score";
export {
	enqueueClassify,
	enqueueDraftResponse,
	type MailAiJobData,
} from "./src/jobs/mail-ai";
export {
	enqueueAutoHandle,
	type MailAutoHandleJobData,
} from "./src/jobs/mail-autohandle";
export {
	scheduleFollowUpCheck,
	type MailFollowUpJobData,
} from "./src/jobs/mail-followup";
export {
	cancelDelayedSend,
	enqueueDelayedSend,
	type MailSendJobData,
} from "./src/jobs/mail-send";
export {
	scheduleSnoozeCheck,
	type MailSnoozeJobData,
} from "./src/jobs/mail-snooze";
export {
	enqueueIncrementalSync,
	enqueueInitialSync,
	enqueueWebhookPush,
	scheduleRecurringSync,
	type MailSyncJobData,
} from "./src/jobs/mail-sync";
export {
	scheduleTaskReminderCheck,
	type TaskReminderJobData,
} from "./src/jobs/task-reminder";
export {
	enqueueFullSync as enqueueFullTaskSync,
	enqueueIncrementalTaskSync,
	enqueueWebhookEvent as enqueueTaskWebhookEvent,
	scheduleRecurringTaskSync,
	type TaskSyncJobData,
} from "./src/jobs/task-sync";
export {
	enqueueTaskWriteBack,
	type TaskWriteBackJobData,
} from "./src/jobs/task-writeback";
export {
	scheduleWorkSummaryDigest,
	type WorkSummaryJobData,
} from "./src/jobs/work-summary";
export {
	calendarSyncQueue,
	contactDiscoveryQueue,
	contactMeetingPrepQueue,
	contactScoreQueue,
	mailAiQueue,
	mailAutoHandleQueue,
	mailFollowUpQueue,
	mailSendQueue,
	mailSnoozeQueue,
	mailSyncQueue,
	taskReminderQueue,
	taskSyncQueue,
	taskWriteBackQueue,
	workSummaryQueue,
} from "./src/queues";
