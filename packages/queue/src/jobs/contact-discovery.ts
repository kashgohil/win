import { contactDiscoveryQueue } from "../queues";

export type ContactDiscoveryJobData =
	| {
			type: "full-scan";
			userId: string;
	  }
	| {
			type: "extract-from-emails";
			userId: string;
			emailIds: string[];
	  }
	| {
			type: "extract-from-events";
			userId: string;
			eventIds: string[];
	  };

export async function enqueueContactFullScan(userId: string) {
	return contactDiscoveryQueue.add("full-scan", {
		type: "full-scan",
		userId,
	});
}

export async function enqueueContactExtractFromEmails(
	userId: string,
	emailIds: string[],
) {
	if (emailIds.length === 0) return;
	return contactDiscoveryQueue.add("extract-from-emails", {
		type: "extract-from-emails",
		userId,
		emailIds,
	});
}

export async function enqueueContactExtractFromEvents(
	userId: string,
	eventIds: string[],
) {
	if (eventIds.length === 0) return;
	return contactDiscoveryQueue.add("extract-from-events", {
		type: "extract-from-events",
		userId,
		eventIds,
	});
}
