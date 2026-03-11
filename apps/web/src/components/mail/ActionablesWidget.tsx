import { MOTION_CONSTANTS } from "@/components/constant";
import {
	mailKeys,
	useClearFollowUp,
	useDrafts,
	useFollowUps,
	useMailEmailsInfinite,
	useSendDraft,
} from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { mailTriageCollection } from "@/lib/mail-collections";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import type { TriageAction } from "@wingmnn/types";
import {
	AlertTriangle,
	Archive,
	ArrowRight,
	BellOff,
	Check,
	Clock,
	FileText,
	Forward,
	MessageSquare,
	Send,
	Star,
	StarOff,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/* ── Unified actionable item type ── */

type ActionableType =
	| "triage"
	| "draft"
	| "follow_up"
	| "starred_forgotten"
	| "waiting_reply";

interface ActionableItem {
	id: string;
	type: ActionableType;
	title: string;
	subtitle: string | null;
	timestamp: string;
	urgent?: boolean;
	emailId: string;
	/** Extra data per type */
	meta?: {
		draftResponse?: string | null;
		triageActions?: { label: string; variant?: string }[];
		daysWaiting?: number;
		snippet?: string | null;
		fromAddress?: string | null;
		fromName?: string | null;
	};
}

const TYPE_CONFIG: Record<
	ActionableType,
	{
		label: string;
		icon: typeof Clock;
		color: string;
		dotColor: string;
	}
> = {
	triage: {
		label: "Needs you",
		icon: AlertTriangle,
		color: "text-red-600 dark:text-red-400",
		dotColor: "bg-red-500",
	},
	draft: {
		label: "Draft ready",
		icon: FileText,
		color: "text-blue-600 dark:text-blue-400",
		dotColor: "bg-blue-500",
	},
	follow_up: {
		label: "Follow up",
		icon: Clock,
		color: "text-amber-600 dark:text-amber-400",
		dotColor: "bg-amber-500",
	},
	starred_forgotten: {
		label: "Starred",
		icon: Star,
		color: "text-violet-600 dark:text-violet-400",
		dotColor: "bg-violet-500",
	},
	waiting_reply: {
		label: "Waiting",
		icon: MessageSquare,
		color: "text-emerald-600 dark:text-emerald-400",
		dotColor: "bg-emerald-500",
	},
};

const ACTION_MAP: Record<string, TriageAction> = {
	Reply: "send_draft",
	Archive: "archive",
	Dismiss: "dismiss",
	Snooze: "snooze",
};

/* ── Hook: merge all actionable sources ── */

export function useActionables() {
	const { data: triage, isLoading: triageLoading } =
		useLiveQuery(mailTriageCollection);

	const { data: draftsData, isLoading: draftsLoading } = useDrafts({
		limit: 10,
	});
	const { data: followUpsData, isLoading: followUpsLoading } = useFollowUps();

	// Starred emails that haven't been opened recently (proxy: starred + read + older than 3 days)
	const { data: starredData, isLoading: starredLoading } =
		useMailEmailsInfinite({
			starred: true,
			readOnly: true,
			limit: 10,
		});

	const items = useMemo(() => {
		const all: ActionableItem[] = [];

		// Triage items
		for (const t of triage ?? []) {
			all.push({
				id: `triage:${t.id}`,
				type: "triage",
				title: t.subtitle ?? t.title,
				subtitle: t.subtitle ? t.title : null,
				timestamp: t.timestamp,
				urgent: t.urgent,
				emailId: t.id,
				meta: {
					triageActions: t.actions,
				},
			});
		}

		// Draft responses
		const drafts = draftsData?.pages?.flatMap((p) => p?.drafts ?? []) ?? [];
		for (const d of drafts) {
			all.push({
				id: `draft:${d.id}`,
				type: "draft",
				title: d.subject ?? "(no subject)",
				subtitle: d.fromName ?? d.fromAddress,
				timestamp: d.receivedAt,
				emailId: d.id,
				meta: {
					draftResponse: d.draftResponse,
					snippet: d.snippet,
					fromAddress: d.fromAddress,
					fromName: d.fromName,
				},
			});
		}

		// Follow-ups due
		const followUps = followUpsData?.followUps ?? [];
		for (const fu of followUps) {
			all.push({
				id: `follow_up:${fu.id}`,
				type: "follow_up",
				title: fu.subject ?? "(no subject)",
				subtitle: fu.fromName ?? fu.fromAddress,
				timestamp: fu.receivedAt,
				emailId: fu.id,
				meta: {
					daysWaiting: fu.daysWaiting,
					fromAddress: fu.fromAddress,
					fromName: fu.fromName,
				},
			});
		}

		// Starred & forgotten (starred, read, older than 3 days)
		const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
		const starredEmails =
			starredData?.pages?.flatMap((p) => p?.emails ?? []) ?? [];
		for (const e of starredEmails) {
			if (new Date(e.receivedAt).getTime() < threeDaysAgo) {
				all.push({
					id: `starred:${e.id}`,
					type: "starred_forgotten",
					title: e.subject ?? "(no subject)",
					subtitle: e.fromName ?? e.fromAddress,
					timestamp: e.receivedAt,
					emailId: e.id,
					meta: {
						fromAddress: e.fromAddress,
						fromName: e.fromName,
					},
				});
			}
		}

		// Sort: urgent first, then by type priority, then by time
		const typePriority: Record<ActionableType, number> = {
			triage: 0,
			draft: 1,
			follow_up: 2,
			starred_forgotten: 3,
			waiting_reply: 4,
		};

		all.sort((a, b) => {
			if (a.urgent && !b.urgent) return -1;
			if (!a.urgent && b.urgent) return 1;
			const pa = typePriority[a.type];
			const pb = typePriority[b.type];
			if (pa !== pb) return pa - pb;
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});

		return all;
	}, [triage, draftsData, followUpsData, starredData]);

	const isLoading =
		triageLoading || draftsLoading || followUpsLoading || starredLoading;

	return { items, isLoading };
}

/* ── Main widget ── */

export function ActionablesWidget() {
	const { items, isLoading } = useActionables();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const visibleItems = items.filter((i) => !dismissed.has(i.id));

	const handleViewEmail = (emailId: string) => {
		navigate({
			to: "/module/mail/inbox/$emailId",
			params: { emailId },
			search: { view: undefined, category: undefined },
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[0, 1, 2].map((i) => (
					<div
						key={i}
						className="animate-pulse rounded-lg border border-border/20 p-4"
					>
						<div className="flex items-center gap-3">
							<div className="size-5 rounded-full bg-secondary/30" />
							<div className="flex-1 space-y-2">
								<div className="h-3.5 w-48 bg-secondary/30 rounded" />
								<div className="h-3 w-32 bg-secondary/20 rounded" />
							</div>
						</div>
					</div>
				))}
			</div>
		);
	}

	if (visibleItems.length === 0) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{
					duration: 0.4,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="py-10 flex flex-col items-center gap-3"
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 20,
						delay: 0.1,
					}}
					className="size-10 rounded-full bg-foreground/5 flex items-center justify-center"
				>
					<Check className="size-4 text-foreground/40" />
				</motion.div>
				<p className="font-serif text-[15px] text-grey-2 italic text-center">
					All clear — nothing needs your attention.
				</p>
			</motion.div>
		);
	}

	// Group by type for the filter tabs
	const typeCounts = visibleItems.reduce(
		(acc, item) => {
			acc[item.type] = (acc[item.type] ?? 0) + 1;
			return acc;
		},
		{} as Partial<Record<ActionableType, number>>,
	);

	return (
		<div>
			{/* Type summary pills */}
			<div className="flex items-center gap-2 mb-4 flex-wrap">
				{(Object.entries(typeCounts) as [ActionableType, number][]).map(
					([type, count]) => {
						const config = TYPE_CONFIG[type];
						return (
							<span
								key={type}
								className={cn(
									"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
									"font-mono text-[10px] tracking-[0.04em] uppercase",
									"bg-foreground/3 border border-border/30",
								)}
							>
								<span
									className={cn("size-1.5 rounded-full", config.dotColor)}
								/>
								<span className="text-grey-2">
									{count} {config.label}
								</span>
							</span>
						);
					},
				)}
			</div>

			{/* Actionable items list */}
			<div className="space-y-1.5">
				<AnimatePresence mode="popLayout">
					{visibleItems.map((item, i) => (
						<ActionableRow
							key={item.id}
							item={item}
							index={i}
							onView={() => handleViewEmail(item.emailId)}
							onDismiss={() => {
								setDismissed((prev) => new Set([...prev, item.id]));
								// If it's a triage item, also dismiss on server
								if (item.type === "triage") {
									mailTriageCollection.utils.writeDelete(item.emailId);
									api.mail
										.triage({ id: item.emailId })
										.action.post({ action: "dismiss" });
								}
							}}
							onAction={(action) => {
								if (item.type === "triage") {
									const mapped = ACTION_MAP[action] ?? "dismiss";
									mailTriageCollection.utils.writeDelete(item.emailId);
									api.mail
										.triage({ id: item.emailId })
										.action.post({ action: mapped });
									setDismissed((prev) => new Set([...prev, item.id]));
								}
							}}
							onSendDraft={() => {
								setDismissed((prev) => new Set([...prev, item.id]));
							}}
							onClearFollowUp={() => {
								setDismissed((prev) => new Set([...prev, item.id]));
							}}
							queryClient={queryClient}
						/>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}

/* ── Single actionable row ── */

function ActionableRow({
	item,
	index,
	onView,
	onDismiss,
	onAction,
	onSendDraft,
	onClearFollowUp,
	queryClient,
}: {
	item: ActionableItem;
	index: number;
	onView: () => void;
	onDismiss: () => void;
	onAction: (action: string) => void;
	onSendDraft: () => void;
	onClearFollowUp: () => void;
	queryClient: ReturnType<typeof useQueryClient>;
}) {
	const config = TYPE_CONFIG[item.type];
	const sendDraft = useSendDraft();
	const clearFollowUp = useClearFollowUp();
	const [expanded, setExpanded] = useState(false);

	const handleSendDraft = () => {
		const draftText = item.meta?.draftResponse;
		if (!draftText) return;

		sendDraft.mutate(item.emailId, {
			onSuccess: () => {
				toast("Draft sent");
				queryClient.invalidateQueries({
					queryKey: [...mailKeys.all, "drafts"],
				});
				queryClient.invalidateQueries({
					queryKey: ["mail", "data"],
				});
				onSendDraft();
			},
			onError: () => toast.error("Failed to send draft"),
		});
	};

	const handleClearFollowUp = () => {
		clearFollowUp.mutate(item.emailId, {
			onSuccess: () => {
				toast("Follow-up cleared");
				queryClient.invalidateQueries({
					queryKey: [...mailKeys.all, "follow-ups"],
				});
				onClearFollowUp();
			},
		});
	};

	const timeAgo = formatRelativeTime(item.timestamp);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 10, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				x: -40,
				scale: 0.96,
				transition: { duration: 0.2, ease: MOTION_CONSTANTS.EASE },
			}}
			transition={{
				delay: index * 0.03,
				duration: 0.35,
				ease: MOTION_CONSTANTS.EASE,
				layout: { type: "spring", stiffness: 350, damping: 30 },
			}}
		>
			<div
				className={cn(
					"group rounded-lg border transition-colors duration-150",
					item.urgent
						? "border-red-500/20 bg-red-500/2"
						: "border-border/30 hover:border-border/50",
				)}
			>
				{/* Main row */}
				<div className="flex items-center gap-3 px-3.5 py-3 min-w-0">
					{/* Type indicator */}
					<div className="shrink-0 flex items-center justify-center">
						<span
							className={cn("size-1.5 rounded-full shrink-0", config.dotColor)}
						/>
					</div>

					{/* Content — clickable to view */}
					<button
						type="button"
						onClick={onView}
						className="flex-1 min-w-0 text-left cursor-pointer"
					>
						<div className="flex items-center gap-2 min-w-0">
							<span
								className={cn(
									"font-mono text-[9px] tracking-[0.06em] uppercase shrink-0",
									config.color,
								)}
							>
								{config.label}
							</span>
							{item.meta?.daysWaiting != null && item.meta.daysWaiting > 0 && (
								<span className="font-mono text-[9px] text-grey-3 tabular-nums">
									{item.meta.daysWaiting}d
								</span>
							)}
						</div>
						<p className="font-body text-[13px] text-foreground/80 truncate mt-0.5 group-hover:text-foreground transition-colors">
							{item.title}
						</p>
						{item.subtitle && (
							<p className="font-body text-[11px] text-grey-3 truncate">
								{item.subtitle}
							</p>
						)}
					</button>

					{/* Time + actions */}
					<div className="shrink-0 flex items-center gap-2">
						<span className="font-mono text-[10px] text-grey-3 tabular-nums">
							{timeAgo}
						</span>

						{/* Inline quick actions */}
						<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
							{item.type === "triage" &&
								item.meta?.triageActions?.map((action) =>
									action.variant === "ghost" ? null : (
										<button
											key={action.label}
											type="button"
											onClick={() => onAction(action.label)}
											className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
											title={action.label}
										>
											{action.label === "Reply" && (
												<Forward className="size-3" />
											)}
											{action.label === "Archive" && (
												<Archive className="size-3" />
											)}
										</button>
									),
								)}

							{item.type === "draft" && (
								<button
									type="button"
									onClick={handleSendDraft}
									disabled={sendDraft.isPending}
									className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									title="Send draft"
								>
									<Send className="size-3" />
								</button>
							)}

							{item.type === "follow_up" && (
								<button
									type="button"
									onClick={handleClearFollowUp}
									disabled={clearFollowUp.isPending}
									className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									title="Clear follow-up"
								>
									<BellOff className="size-3" />
								</button>
							)}

							{item.type === "starred_forgotten" && (
								<button
									type="button"
									onClick={onDismiss}
									className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									title="Dismiss"
								>
									<StarOff className="size-3" />
								</button>
							)}

							{/* Dismiss X for all */}
							<button
								type="button"
								onClick={onDismiss}
								className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground/50 transition-colors cursor-pointer"
								title="Dismiss"
							>
								<X className="size-3" />
							</button>
						</div>

						{/* Expand for drafts */}
						{item.type === "draft" && item.meta?.draftResponse && (
							<button
								type="button"
								onClick={() => setExpanded((prev) => !prev)}
								className="p-1 rounded hover:bg-secondary/30 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
							>
								<motion.div
									animate={{
										rotate: expanded ? 180 : 0,
									}}
									transition={{ duration: 0.2 }}
								>
									<ArrowRight className="size-3 rotate-90" />
								</motion.div>
							</button>
						)}
					</div>
				</div>

				{/* Expandable draft preview */}
				<AnimatePresence initial={false}>
					{expanded && item.type === "draft" && item.meta?.draftResponse && (
						<motion.div
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{
								height: {
									duration: 0.25,
									ease: MOTION_CONSTANTS.EASE,
								},
								opacity: { duration: 0.15 },
							}}
							className="overflow-hidden"
						>
							<div className="px-3.5 pb-3 pt-0">
								<div className="rounded-md border border-border/30 bg-secondary/5 p-2.5 font-body text-[12px] text-foreground/70 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
									{item.meta.draftResponse}
								</div>
								<div className="flex items-center gap-2 mt-2">
									<button
										type="button"
										onClick={handleSendDraft}
										disabled={sendDraft.isPending}
										className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-foreground text-background font-mono text-[10px] tracking-[0.03em] hover:bg-foreground/90 transition-colors cursor-pointer"
									>
										<Send className="size-2.5" />
										Send
									</button>
									<button
										type="button"
										onClick={onView}
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={onDismiss}
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										Dismiss
									</button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/* ── Helpers ── */

function formatRelativeTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return "now";
	if (mins < 60) return `${mins}m`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d`;
	const weeks = Math.floor(days / 7);
	return `${weeks}w`;
}
