import { contactScoreQueue } from "../queues";

export type ContactScoreJobData = {
	type: "score-all";
};

export async function scheduleContactScoring() {
	return contactScoreQueue.add(
		"contact-score",
		{ type: "score-all" },
		{
			repeat: { pattern: "0 */6 * * *" }, // Every 6 hours
			jobId: "contact-score-recurring",
		},
	);
}
