import { MOTION_CONSTANTS } from "@/components/constant";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useCompleteFollowUp,
	useDismissFollowUp,
	useFollowUps,
	useSnoozeFollowUp,
} from "@/hooks/use-contacts";
import { cn, relativeTime } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Bell,
	Calendar,
	Check,
	Clock,
	ExternalLink,
	HandshakeIcon,
	Users,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/crm/follow-ups/",
)({
	component: FollowUpsPage,
});

const FOLLOWUP_SHORTCUTS = [[{ keys: ["["], label: "back" }]];

type FollowUp = {
	id: string;
	contactId: string;
	contactName: string | null;
	contactEmail: string | null;
	type: string;
	title: string;
	context: string | null;
	sourceEmailId: string | null;
	dueAt: string | null;
	status: string;
	createdAt: string;
};

function FollowUpsPage() {
	const { data, isLoading, fetchNextPage, hasNextPage } = useFollowUps();
	const completeFollowUp = useCompleteFollowUp();
	const dismissFollowUp = useDismissFollowUp();
	const snoozeFollowUp = useSnoozeFollowUp();

	const allFollowUps =
		data?.pages.flatMap((p) => (p?.followUps ?? []) as FollowUp[]) ?? [];

	const [filter, setFilter] = useState<
		"all" | "cadence_nudge" | "meeting_prep" | "commitment"
	>("all");
	const filtered =
		filter === "all"
			? allFollowUps
			: allFollowUps.filter((f) => f.type === filter);

	const handleSnooze = (followUpId: string) => {
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 1);
		tomorrow.setHours(9, 0, 0, 0);
		snoozeFollowUp.mutate({ followUpId, until: tomorrow.toISOString() });
	};

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Back link */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}
					>
						<Link
							to="/module/crm"
							className="inline-flex items-center gap-1.5 font-mono text-[12px] text-grey-3 hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-3" />
							Back to contacts
						</Link>
					</motion.div>

					{/* Header */}
					<motion.header
						className="mt-6"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
							follow-ups
						</h1>
						<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
							Nudges, commitments, and meeting prep briefs that need your
							attention.
						</p>
					</motion.header>

					{/* Filter tabs */}
					<motion.div
						className="mt-6 flex items-center gap-1"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{(
							[
								{ key: "all", label: "All", icon: Bell },
								{ key: "cadence_nudge", label: "Nudges", icon: Clock },
								{
									key: "commitment",
									label: "Commitments",
									icon: HandshakeIcon,
								},
								{ key: "meeting_prep", label: "Meeting prep", icon: Calendar },
							] as const
						).map((tab) => (
							<button
								key={tab.key}
								type="button"
								onClick={() => setFilter(tab.key)}
								className={cn(
									"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-[11px] tracking-[0.02em] transition-colors cursor-pointer",
									filter === tab.key
										? "bg-foreground text-background"
										: "text-grey-3 hover:text-foreground hover:bg-secondary/20",
								)}
							>
								<tab.icon className="size-3" />
								{tab.label}
							</button>
						))}
					</motion.div>

					{/* Content */}
					<motion.div
						className="mt-6 pb-16"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.15,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{isLoading ? (
							<div className="animate-pulse space-y-3">
								{[0, 1, 2].map((i) => (
									<div
										key={i}
										className="rounded-lg border border-border/20 p-4"
									>
										<div className="h-4 w-48 bg-secondary/30 rounded" />
										<div className="h-3 w-72 bg-secondary/20 rounded mt-2" />
									</div>
								))}
							</div>
						) : filtered.length === 0 ? (
							<div className="py-16 flex flex-col items-center gap-3">
								<div className="size-10 rounded-full bg-foreground/5 flex items-center justify-center">
									<Check className="size-4 text-foreground/40" />
								</div>
								<p className="font-serif text-[15px] text-grey-2 italic text-center">
									All clear — no pending follow-ups.
								</p>
							</div>
						) : (
							<div className="space-y-2">
								{filtered.map((fu) => (
									<FollowUpCard
										key={fu.id}
										followUp={fu}
										onComplete={() => completeFollowUp.mutate(fu.id)}
										onSnooze={() => handleSnooze(fu.id)}
										onDismiss={() => dismissFollowUp.mutate(fu.id)}
										isCompletePending={completeFollowUp.isPending}
										isSnoozePending={snoozeFollowUp.isPending}
										isDismissPending={dismissFollowUp.isPending}
									/>
								))}
								{hasNextPage && (
									<button
										type="button"
										onClick={() => fetchNextPage()}
										className="w-full py-4 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										Load more
									</button>
								)}
							</div>
						)}
					</motion.div>
				</div>
			</ScrollArea>

			<KeyboardShortcutBar shortcuts={FOLLOWUP_SHORTCUTS} />
		</>
	);
}

/* ── Follow-up card ── */

function FollowUpCard({
	followUp: fu,
	onComplete,
	onSnooze,
	onDismiss,
	isCompletePending,
	isSnoozePending,
	isDismissPending,
}: {
	followUp: FollowUp;
	onComplete: () => void;
	onSnooze: () => void;
	onDismiss: () => void;
	isCompletePending: boolean;
	isSnoozePending: boolean;
	isDismissPending: boolean;
}) {
	const isCommitment = fu.type === "commitment";

	// Format commitment title: "You told [Name] you'd [commitment]"
	const displayTitle = isCommitment ? formatCommitmentTitle(fu) : fu.title;

	return (
		<div
			className={cn(
				"rounded-lg border px-4 py-3.5 transition-colors",
				isCommitment
					? "border-l-4 border-l-blue-500/50 border-border/30"
					: fu.type === "meeting_prep"
						? "border-l-4 border-l-amber-500/50 border-border/30"
						: "border-border/30",
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						{isCommitment ? (
							<HandshakeIcon className="size-3.5 text-blue-500 shrink-0" />
						) : fu.type === "meeting_prep" ? (
							<Calendar className="size-3.5 text-amber-500 shrink-0" />
						) : (
							<Clock className="size-3.5 text-grey-3 shrink-0" />
						)}
						<span className="font-body text-[14px] text-foreground tracking-[0.01em] truncate">
							{displayTitle}
						</span>
					</div>
					{(fu.contactName || fu.contactEmail) && (
						<Link
							to="/module/crm/$contactId"
							params={{ contactId: fu.contactId }}
							className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors"
						>
							<Users className="size-3" />
							{fu.contactName ?? fu.contactEmail}
						</Link>
					)}
					{!isCommitment && fu.context && (
						<p className="font-body text-[12px] text-grey-2 mt-1.5 line-clamp-2">
							{fu.context}
						</p>
					)}
					{/* Source email link for commitments */}
					{isCommitment && fu.sourceEmailId && (
						<Link
							to="/module/mail/sent"
							search={{
								starred: undefined,
								attachment: undefined,
							}}
							className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-blue-500/70 hover:text-blue-500 transition-colors"
						>
							<ExternalLink className="size-3" />
							View original email
						</Link>
					)}
					{/* Deadline for commitments */}
					{isCommitment && fu.dueAt && (
						<p className="font-mono text-[11px] text-grey-2 mt-1">
							Deadline:{" "}
							<span
								className={cn(
									isPastDue(fu.dueAt) ? "text-red-500" : "text-foreground",
								)}
							>
								{new Date(fu.dueAt).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}
							</span>
						</p>
					)}
				</div>
				<span className="font-mono text-[10px] text-grey-3 shrink-0">
					{fu.dueAt ? relativeTime(fu.dueAt) : relativeTime(fu.createdAt)}
				</span>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 mt-3">
				<Button
					size="sm"
					className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 bg-foreground text-background hover:bg-foreground/90"
					onClick={onComplete}
					disabled={isCompletePending}
				>
					<Check className="size-3 mr-1" />
					{isCommitment ? "I did it" : "Done"}
				</Button>
				<Button
					variant="outline"
					size="sm"
					className="font-mono text-[11px] tracking-[0.02em] h-7 px-3"
					onClick={onSnooze}
					disabled={isSnoozePending}
				>
					<Clock className="size-3 mr-1" />
					Tomorrow
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 text-grey-3"
					onClick={onDismiss}
					disabled={isDismissPending}
				>
					<X className="size-3 mr-1" />
					Dismiss
				</Button>
			</div>
		</div>
	);
}

/* ── Helpers ── */

function formatCommitmentTitle(fu: FollowUp): string {
	// The worker stores title as "Commitment: <text>" and context as the raw text
	const commitmentText = fu.context ?? fu.title.replace(/^Commitment:\s*/i, "");
	const name = fu.contactName ?? fu.contactEmail ?? "someone";
	return `You told ${name} you'd ${commitmentText}`;
}

function isPastDue(dateStr: string): boolean {
	return new Date(dateStr) < new Date();
}
