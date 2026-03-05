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
import type { EmailCategory, SerializedThread } from "@wingmnn/types";
import { Archive, Mail, MailOpen, Paperclip, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CATEGORY_CONFIG } from "./category-colors";

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
	const raw = name || email || "";
	const match = raw.match(/[a-zA-Z0-9]/);
	return match ? match[0].toUpperCase() : "?";
}

/* ── Time clustering ── */

type TimeCluster = {
	label: string | null;
	threads: SerializedThread[];
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

export function groupThreadsByTime(threads: SerializedThread[]): TimeCluster[] {
	const now = new Date();
	const today: SerializedThread[] = [];
	const yesterday: SerializedThread[] = [];
	const thisWeek: SerializedThread[] = [];
	const earlier: SerializedThread[] = [];

	for (const thread of threads) {
		const date = new Date(thread.latestReceivedAt);
		if (isToday(date, now)) {
			today.push(thread);
		} else if (isYesterday(date, now)) {
			yesterday.push(thread);
		} else if (isThisWeek(date, now)) {
			thisWeek.push(thread);
		} else {
			earlier.push(thread);
		}
	}

	const clusters: TimeCluster[] = [];
	if (today.length > 0) clusters.push({ label: null, threads: today });
	if (yesterday.length > 0)
		clusters.push({ label: "Yesterday", threads: yesterday });
	if (thisWeek.length > 0)
		clusters.push({ label: "This week", threads: thisWeek });
	if (earlier.length > 0) clusters.push({ label: "Earlier", threads: earlier });

	return clusters;
}

/* ── Cache helpers ── */

function updateThreadInPages(old: any, threadId: string, patch: object) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			threads: page.threads.map((t: any) =>
				t.threadId === threadId ? { ...t, ...patch } : t,
			),
		})),
	};
}

function removeThreadFromPages(old: any, threadId: string) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			threads: page.threads.filter((t: any) => t.threadId !== threadId),
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

/* ── Thread row component ── */

export function ThreadRow({
	thread,
	highlightTerms,
	isFocused,
	focusRef,
	isSelected,
	onSelect,
	onDragStartThread,
	onDropThread,
	variant = "inbox",
	linkSearch,
}: {
	thread: SerializedThread;
	highlightTerms?: string[];
	isFocused?: boolean;
	focusRef?: (el: HTMLElement | null) => void;
	isSelected?: boolean;
	onSelect?: (threadId: string) => void;
	onDragStartThread?: (threadId: string) => void;
	onDropThread?: (targetThreadId: string) => void;
	variant?: "inbox" | "sent";
	linkSearch?: Record<string, unknown>;
}) {
	const { fromName, fromAddress, toAddresses } = thread.latestMessage;
	const isSent = variant === "sent";
	const displayName = isSent
		? (toAddresses?.[0] ?? "Unknown recipient")
		: fromName || fromAddress || "Unknown";
	const senderDisplay = isSent
		? `To: ${displayName}`
		: fromName || fromAddress || "Unknown";
	const initial = isSent
		? getInitial(null, toAddresses?.[0] ?? null)
		: getInitial(fromName, fromAddress);
	const isUrgent = thread.category === "urgent";
	const isUnread = thread.unreadCount > 0;
	const queryClient = useQueryClient();
	const { category, view } = useSearch({ strict: false }) as {
		category?: EmailCategory;
		view?: "read";
	};

	const handleArchive = () => {
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			removeThreadFromPages(old, thread.threadId),
		);
		toast("Thread archived");
		api.mail.threads({ threadId: thread.threadId }).archive.post();
	};

	const handleStar = () => {
		const patch = { isStarred: !thread.isStarred };
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			updateThreadInPages(old, thread.threadId, patch),
		);
		api.mail.threads({ threadId: thread.threadId }).star.patch();
	};

	const handleToggleRead = () => {
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) =>
			removeThreadFromPages(old, thread.threadId),
		);
		api.mail.threads({ threadId: thread.threadId }).read.patch();
	};

	const handleCheckboxClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		onSelect?.(thread.threadId);
	};

	return (
		<motion.div
			ref={focusRef}
			initial="idle"
			whileHover="hovered"
			animate={isFocused ? "hovered" : undefined}
			draggable={!!onDragStartThread}
			onDragStart={(e) => {
				if (onDragStartThread) {
					(e as any).dataTransfer?.setData("text/plain", thread.threadId);
					onDragStartThread(thread.threadId);
				}
			}}
			onDragOver={(e) => {
				if (onDropThread) {
					(e as any).preventDefault?.();
				}
			}}
			onDrop={(e) => {
				if (onDropThread) {
					(e as any).preventDefault?.();
					const sourceId = (e as any).dataTransfer?.getData("text/plain");
					if (sourceId && sourceId !== thread.threadId) {
						onDropThread(thread.threadId);
					}
				}
			}}
			className={cn(
				"group -mx-2 rounded-lg border-b border-border/15 last:border-0",
				"hover:bg-secondary/30 transition-colors duration-150",
				isUnread && "bg-foreground/2",
				isUrgent && isUnread && "bg-accent-red/3",
				isFocused && "bg-secondary/30 ring-1 ring-foreground/10 ring-inset",
				isSelected && "bg-foreground/5 ring-1 ring-foreground/20 ring-inset",
			)}
		>
			<Link
				to="/module/mail/inbox/$emailId"
				params={{ emailId: thread.threadId }}
				search={{
					view: view ?? undefined,
					category: category ?? undefined,
					...linkSearch,
				}}
				className="flex items-start gap-3 py-3.5 px-2 cursor-pointer"
			>
				{/* Avatar / selection toggle */}
				<motion.div
					role={onSelect ? "checkbox" : undefined}
					aria-checked={onSelect ? isSelected : undefined}
					tabIndex={-1}
					onClick={onSelect ? handleCheckboxClick : undefined}
					animate={isSelected ? { scale: [1, 1.15, 1] } : { scale: 1 }}
					transition={{ duration: 0.25, ease: MOTION_CONSTANTS.EASE }}
					className={cn(
						"size-7 rounded-full flex items-center justify-center shrink-0 font-mono text-[10px] font-semibold mt-0.5 transition-colors duration-150 overflow-hidden",
						isSelected
							? "bg-foreground text-background cursor-pointer"
							: !isUnread
								? "bg-secondary/50 text-grey-2"
								: "bg-foreground text-background",
						onSelect && !isSelected && "cursor-pointer",
					)}
				>
					<AnimatePresence mode="wait" initial={false}>
						{isSelected ? (
							<motion.svg
								key="check"
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								transition={{ duration: 0.15, ease: MOTION_CONSTANTS.EASE }}
								className="size-3 text-background"
								viewBox="0 0 12 12"
								fill="none"
							>
								<path
									d="M2 6l3 3 5-5"
									stroke="currentColor"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</motion.svg>
						) : (
							<motion.span
								key="initial"
								initial={{ scale: 0, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0, opacity: 0 }}
								transition={{ duration: 0.15, ease: MOTION_CONSTANTS.EASE }}
							>
								{initial}
							</motion.span>
						)}
					</AnimatePresence>
				</motion.div>

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
									!isUnread ? "text-grey-2" : "text-foreground font-medium",
								)}
							>
								{senderDisplay}
							</span>
							{thread.messageCount > 1 && (
								<span className="inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full bg-foreground/8 text-grey-2 font-mono text-[10px] font-medium shrink-0">
									{thread.messageCount}
								</span>
							)}
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
								{thread.hasAttachments && (
									<Paperclip className="size-3 text-grey-3" />
								)}
								{thread.isStarred && (
									<Star className="size-3 text-foreground/50 fill-foreground/50" />
								)}
								<span className="font-mono text-[11px] text-grey-3 tabular-nums">
									{formatTimestamp(thread.latestReceivedAt)}
								</span>
								{thread.category && CATEGORY_CONFIG[thread.category] && (
									<span
										className={cn(
											"size-1.5 rounded-full shrink-0",
											CATEGORY_CONFIG[thread.category].dot,
										)}
									/>
								)}
							</motion.div>

							{/* Actions — animate in on hover */}
							<TooltipProvider>
								<div className="col-start-1 row-start-1 flex items-center gap-0.5 pointer-events-none group-hover:pointer-events-auto">
									<RowAction label="Archive" onClick={handleArchive}>
										<Archive className="size-3" />
									</RowAction>
									<RowAction
										label={thread.isStarred ? "Unstar" : "Star"}
										onClick={handleStar}
										active={thread.isStarred}
										delay={0.03}
									>
										<Star
											className={cn(
												"size-3",
												thread.isStarred && "fill-amber-400",
											)}
										/>
									</RowAction>
									<RowAction
										label={isUnread ? "Mark as read" : "Mark as unread"}
										onClick={handleToggleRead}
										delay={0.06}
									>
										{isUnread ? (
											<MailOpen className="size-3" />
										) : (
											<Mail className="size-3" />
										)}
									</RowAction>
								</div>
							</TooltipProvider>
						</div>
					</div>
					<p
						className={cn(
							"font-body text-[13px] truncate mt-0.5",
							!isUnread ? "text-grey-3" : "text-foreground/60",
						)}
					>
						<span className={cn(isUnread && "text-foreground/70")}>
							<HighlightMatches
								text={thread.subject || "(no subject)"}
								terms={highlightTerms}
							/>
						</span>
						{thread.snippet && (
							<span className="text-grey-3">
								{" — "}
								<HighlightMatches
									text={thread.snippet}
									terms={highlightTerms}
								/>
							</span>
						)}
					</p>
				</div>
			</Link>
		</motion.div>
	);
}
