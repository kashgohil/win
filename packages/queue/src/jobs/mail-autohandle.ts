import { mailAutoHandleQueue } from "../queues";

export type MailAutoHandleJobData = {
	type: "auto-handle";
	emailId: string;
	userId: string;
	emailAccountId: string;
	action: "archived" | "labeled" | "forwarded" | "auto-replied" | "filtered";
	category: string;
};

export async function enqueueAutoHandle(data: MailAutoHandleJobData) {
	return mailAutoHandleQueue.add("auto-handle", data);
}
