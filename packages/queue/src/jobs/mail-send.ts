import { mailSendQueue } from "../queues";

export type MailSendJobData =
	| {
			type: "reply";
			emailId: string;
			userId: string;
			emailAccountId: string;
			body: string;
			cc?: string[];
	  }
	| {
			type: "forward";
			emailId: string;
			userId: string;
			emailAccountId: string;
			to: string[];
			body: string;
	  };

const UNDO_DELAY_MS = 10_000;

export async function enqueueDelayedSend(
	data: MailSendJobData,
): Promise<string> {
	const job = await mailSendQueue.add("delayed-send", data, {
		delay: UNDO_DELAY_MS,
	});
	return job.id!;
}

export async function cancelDelayedSend(jobId: string): Promise<boolean> {
	const job = await mailSendQueue.getJob(jobId);
	if (!job) return false;

	const state = await job.getState();
	if (state !== "delayed" && state !== "waiting") return false;

	await job.remove();
	return true;
}
