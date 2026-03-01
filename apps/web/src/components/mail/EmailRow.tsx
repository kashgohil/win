import { MOTION_CONSTANTS } from "@/components/constant";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mailKeys } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { HighlightMatches } from "@/lib/highlight-text";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useSearch } from "@tanstack/react-router";
import type { EmailCategory, SerializedEmail } from "@wingmnn/types";
import { Archive, Mail, MailOpen, Paperclip, Star } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

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

/* ── Cache helpers ── */

function updateEmailInPages(old: any, emailId: string, patch: object) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			emails: page.emails.map((e: any) =>
				e.id === emailId ? { ...e, ...patch } : e,
			),
		})),
	};
}

function removeEmailFromPages(old: any, emailId: string) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			emails: page.emails.filter((e: any) => e.id !== emailId),
			total: Math.max(0, (page.total ?? 0) - 1),
		})),
	};
}

/* ── Inline action button ── */

function RowAction({
	label,
	onClick,
	active,
	delay = 0,
	children,
}: {
	label: string;
	onClick: () => void;
	active?: boolean;
	delay?: number;
	children: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<motion.span
					role="button"
					tabIndex={-1}
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						onClick();
					}}
					variants={{
						idle: { opacity: 0, x: 4, scale: 0.92 },
						hovered: { opacity: 1, x: 0, scale: 1 },
					}}
					transition={{
						duration: 0.2,
						ease: MOTION_CONSTANTS.EASE,
						delay,
					}}
					className={cn(
						"p-1 rounded-md cursor-pointer transition-colors duration-150",
						active
							? "text-amber-500"
							: "text-grey-3 hover:text-foreground hover:bg-foreground/5",
					)}
				>
					{children}
				</motion.span>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}

/* ── Email row component ── */

export function EmailRow({
	email,
	highlightTerms,
}: {
	email: SerializedEmail;
	highlightTerms?: string[];
}) {
	const initial = getInitial(email.fromName, email.fromAddress);
	const senderDisplay = email.fromName || email.fromAddress || "Unknown";
	const isUrgent = email.category === "urgent";
	const queryClient = useQueryClient();
	const { category, view } = useSearch({ strict: false }) as {
		category?: EmailCategory;
		view?: "read";
	};

	const handleArchive = () => {
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			removeEmailFromPages(old, email.id),
		);
		toast("Email archived");
		api.mail.emails({ id: email.id }).archive.post();
	};

	const handleStar = () => {
		const patch = { isStarred: !email.isStarred };
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			updateEmailInPages(old, email.id, patch),
		);
		api.mail.emails({ id: email.id }).star.patch();
	};

	const handleToggleRead = () => {
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			removeEmailFromPages(old, email.id),
		);
		api.mail.emails({ id: email.id }).read.patch();
	};

	return (
		<motion.div
			initial="idle"
			whileHover="hovered"
			className={cn(
				"group -mx-2 rounded-lg border-b border-border/15 last:border-0",
				"hover:bg-secondary/30 transition-colors duration-150",
				!email.isRead && "bg-foreground/2",
				isUrgent && !email.isRead && "bg-accent-red/3",
			)}
		>
			<Link
				to="/module/mail/inbox/$emailId"
				params={{ emailId: email.id }}
				search={{
					view: view ?? undefined,
					category: category ?? undefined,
				}}
				className="flex items-start gap-3 py-3.5 px-2 cursor-pointer"
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

						{/* Right side — metadata ↔ actions share a grid cell */}
						<div className="shrink-0 grid items-center justify-items-end self-center">
							{/* Metadata — fades out on hover */}
							<motion.div
								variants={{
									idle: { opacity: 1 },
									hovered: { opacity: 0 },
								}}
								transition={{
									duration: 0.15,
									ease: MOTION_CONSTANTS.EASE,
								}}
								className="col-start-1 row-start-1 flex items-center gap-2 pointer-events-none"
							>
								{email.hasAttachments && (
									<Paperclip className="size-3 text-grey-3" />
								)}
								{email.isStarred && (
									<Star className="size-3 text-foreground/50 fill-foreground/50" />
								)}
								<span className="font-mono text-[11px] text-grey-3 tabular-nums">
									{formatTimestamp(email.receivedAt)}
								</span>
							</motion.div>

							{/* Actions — animate in on hover */}
							<TooltipProvider>
								<div className="col-start-1 row-start-1 flex items-center gap-0.5 pointer-events-none group-hover:pointer-events-auto">
									<RowAction label="Archive" onClick={handleArchive}>
										<Archive className="size-3" />
									</RowAction>
									<RowAction
										label={email.isStarred ? "Unstar" : "Star"}
										onClick={handleStar}
										active={email.isStarred}
										delay={0.03}
									>
										<Star
											className={cn(
												"size-3",
												email.isStarred && "fill-amber-400",
											)}
										/>
									</RowAction>
									<RowAction
										label={email.isRead ? "Mark as unread" : "Mark as read"}
										onClick={handleToggleRead}
										delay={0.06}
									>
										{email.isRead ? (
											<Mail className="size-3" />
										) : (
											<MailOpen className="size-3" />
										)}
									</RowAction>
								</div>
							</TooltipProvider>
						</div>
					</div>
					<p
						className={cn(
							"font-body text-[13px] truncate mt-0.5",
							email.isRead ? "text-grey-3" : "text-foreground/60",
						)}
					>
						<span className={cn(!email.isRead && "text-foreground/70")}>
							<HighlightMatches
								text={email.subject || "(no subject)"}
								terms={highlightTerms}
							/>
						</span>
						{email.snippet && (
							<span className="text-grey-3">
								{" — "}
								<HighlightMatches text={email.snippet} terms={highlightTerms} />
							</span>
						)}
					</p>
				</div>
			</Link>
		</motion.div>
	);
}
