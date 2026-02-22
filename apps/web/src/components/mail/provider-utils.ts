import type { SyncStatus } from "@wingmnn/types";

export function getSyncIndicator(status: SyncStatus) {
	switch (status) {
		case "syncing":
			return { color: "bg-foreground/50", animate: true, label: "Syncing" };
		case "synced":
			return { color: "bg-green-600/70", animate: false, label: "Active" };
		case "error":
			return { color: "bg-accent-red", animate: false, label: "Error" };
		default:
			return { color: "bg-grey-3", animate: false, label: "Pending" };
	}
}

export function getProviderStyle(provider: string) {
	switch (provider) {
		case "gmail":
			return {
				accent: "border-accent-red/25",
				bg: "bg-accent-red/[0.06]",
				text: "text-accent-red",
				initial: "G",
				solidBg: "bg-accent-red",
			};
		case "outlook":
			return {
				accent: "border-[#0078d4]/25",
				bg: "bg-[#0078d4]/[0.06]",
				text: "text-[#0078d4]",
				initial: "O",
				solidBg: "bg-[#0078d4]",
			};
		default:
			return {
				accent: "border-border/40",
				bg: "bg-secondary/50",
				text: "text-foreground",
				initial: "?",
				solidBg: "bg-grey-2",
			};
	}
}

export function truncateEmail(email: string, maxLen = 20): string {
	if (email.length <= maxLen) return email;
	const [local, domain] = email.split("@");
	if (!domain) return email.slice(0, maxLen);
	const keep = maxLen - domain.length - 2; // 2 for "…@"
	if (keep < 3) return `${email.slice(0, maxLen - 1)}…`;
	return `${local.slice(0, keep)}…@${domain}`;
}
