import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import type { SerializedEmail } from "@wingmnn/types";
import { Paperclip, Star } from "lucide-react";

function formatTimestamp(iso: string): string {
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "now";
	if (diffMin < 60) return `${diffMin}m`;

	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}h`;

	const diffD = Math.floor(diffH / 24);
	if (diffD === 1) return "1d";
	if (diffD < 7) return `${diffD}d`;

	return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitial(name: string | null, email: string | null): string {
	if (name) return name.charAt(0).toUpperCase();
	if (email) return email.charAt(0).toUpperCase();
	return "?";
}

/* ── Time clustering ── */

type TimeCluster = {
	label: string | null;
	emails: SerializedEmail[];
};

function isToday(date: Date, now: Date): boolean {
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate()
	);
}

function isYesterday(date: Date, now: Date): boolean {
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);
	return (
		date.getFullYear() === yesterday.getFullYear() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getDate() === yesterday.getDate()
	);
}

function isThisWeek(date: Date, now: Date): boolean {
	const weekAgo = new Date(now);
	weekAgo.setDate(weekAgo.getDate() - 7);
	return date >= weekAgo;
}

export function groupEmailsByTime(emails: SerializedEmail[]): TimeCluster[] {
	const now = new Date();
	const today: SerializedEmail[] = [];
	const yesterday: SerializedEmail[] = [];
	const thisWeek: SerializedEmail[] = [];
	const earlier: SerializedEmail[] = [];

	for (const email of emails) {
		const date = new Date(email.receivedAt);
		if (isToday(date, now)) {
			today.push(email);
		} else if (isYesterday(date, now)) {
			yesterday.push(email);
		} else if (isThisWeek(date, now)) {
			thisWeek.push(email);
		} else {
			earlier.push(email);
		}
	}

	const clusters: TimeCluster[] = [];
	if (today.length > 0) clusters.push({ label: null, emails: today });
	if (yesterday.length > 0)
		clusters.push({ label: "Yesterday", emails: yesterday });
	if (thisWeek.length > 0)
		clusters.push({ label: "This week", emails: thisWeek });
	if (earlier.length > 0) clusters.push({ label: "Earlier", emails: earlier });

	return clusters;
}

/* ── Email row component ── */

export function EmailRow({ email }: { email: SerializedEmail }) {
	const initial = getInitial(email.fromName, email.fromAddress);
	const senderDisplay = email.fromName || email.fromAddress || "Unknown";
	const isUrgent = email.category === "urgent";

	return (
		<Link
			to="/module/mail/inbox/$emailId"
			params={{ emailId: email.id }}
			className={cn(
				"group flex items-start gap-3 py-3.5 -mx-2 px-2 rounded-lg hover:bg-secondary/30 transition-colors duration-150 cursor-pointer border-b border-border/15 last:border-0",
				!email.isRead && "bg-foreground/2",
				isUrgent && !email.isRead && "bg-accent-red/3",
			)}
		>
			{/* Sender initial */}
			<div
				className={cn(
					"size-7 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px] font-semibold mt-0.5",
					email.isRead
						? "bg-secondary/50 text-grey-2"
						: "bg-foreground text-background",
				)}
			>
				{initial}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline justify-between gap-3">
					<div className="flex items-center gap-1.5 min-w-0">
						{isUrgent && (
							<span className="size-2 rounded-full bg-accent-red shrink-0" />
						)}
						<span
							className={cn(
								"font-body text-[14px] tracking-[0.01em] truncate",
								email.isRead ? "text-grey-2" : "text-foreground font-medium",
							)}
						>
							{senderDisplay}
						</span>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						{email.hasAttachments && (
							<Paperclip className="size-3 text-grey-3" />
						)}
						{email.isStarred && (
							<Star className="size-3 text-foreground/50 fill-foreground/50" />
						)}
						<span className="font-mono text-[11px] text-grey-3 tabular-nums">
							{formatTimestamp(email.receivedAt)}
						</span>
					</div>
				</div>
				<p
					className={cn(
						"font-body text-[13px] truncate mt-0.5",
						email.isRead ? "text-grey-3" : "text-foreground/60",
					)}
				>
					<span className={cn(!email.isRead && "text-foreground/70")}>
						{email.subject || "(no subject)"}
					</span>
					{email.snippet && (
						<span className="text-grey-3"> — {email.snippet}</span>
					)}
				</p>
			</div>
		</Link>
	);
}
