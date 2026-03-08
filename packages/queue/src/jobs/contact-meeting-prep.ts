import { contactMeetingPrepQueue } from "../queues";

export type ContactMeetingPrepJobData = {
	type: "check-upcoming";
};

export async function scheduleMeetingPrepCheck() {
	return contactMeetingPrepQueue.add(
		"meeting-prep-check",
		{ type: "check-upcoming" },
		{
			repeat: { pattern: "*/5 * * * *" }, // Every 5 minutes
			jobId: "meeting-prep-recurring",
		},
	);
}
