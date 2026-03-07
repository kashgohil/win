import { workSummaryQueue } from "../queues";

export type WorkSummaryJobData = {
	type: "daily-digest";
	userId: string;
};

export async function scheduleWorkSummaryDigest() {
	return workSummaryQueue.add(
		"work-summary-digest",
		{ type: "daily-digest", userId: "all" },
		{
			repeat: { pattern: "0 8 * * *" }, // 8am UTC daily
			jobId: "work-summary-digest",
		},
	);
}
