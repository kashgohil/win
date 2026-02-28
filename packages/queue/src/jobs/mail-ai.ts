import { mailAiQueue } from "../queues";

export type MailAiJobData =
	| {
			type: "classify";
			emailIds: string[];
			userId: string;
	  }
	| {
			type: "draft-response";
			emailId: string;
			userId: string;
	  };

export async function enqueueClassify(emailIds: string[], userId: string) {
	return mailAiQueue.add("classify", {
		type: "classify",
		emailIds,
		userId,
	});
}

export async function enqueueDraftResponse(emailId: string, userId: string) {
	return mailAiQueue.add("draft-response", {
		type: "draft-response",
		emailId,
		userId,
	});
}
