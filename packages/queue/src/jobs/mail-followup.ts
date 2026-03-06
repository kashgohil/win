import { mailFollowUpQueue } from "../queues";

export type MailFollowUpJobData = {
	type: "check-followups";
};

export async function scheduleFollowUpCheck() {
	return mailFollowUpQueue.add(
		"followup-check",
		{ type: "check-followups" },
		{
			repeat: { every: 5 * 60 * 1000 },
			jobId: "followup-check",
		},
	);
}
