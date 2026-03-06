import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import { AiSummary } from "@/components/mail/AiSummary";
import { AttachmentList } from "@/components/mail/AttachmentList";
import { ComposeSheet } from "@/components/mail/ComposeSheet";
import { EmailActions } from "@/components/mail/EmailActions";
import { EmailBody } from "@/components/mail/EmailBody";
import {
	EMAIL_DETAIL_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import { MessageMetadata } from "@/components/mail/MessageMetadata";
import { useEmailDetailKeyboard } from "@/hooks/use-email-detail-keyboard";
import { mailKeys, useMailThreadDetail } from "@/hooks/use-mail";
import { recordThreadVisit } from "@/hooks/use-merge-suggestions";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { SerializedEmailDetail } from "@wingmnn/types";
import { ArrowLeft, ChevronRight, Unlink } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const detailSearchSchema = z.object({
	category: z.string().optional(),
	view: z
		.string()
		.optional()
		.transform((v) => (v === "read" ? ("read" as const) : undefined)),
	source: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/inbox/$emailId",
)({
	component: EmailDetail,
	validateSearch: (search) => detailSearchSchema.parse(search),
});

function EmailDetail() {
	const { emailId } = Route.useParams();
	const { category, view, source } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const inboxSearch = {
		view: view ?? undefined,
		starred: undefined,
		attachment: undefined,
		...(category ? { category } : {}),
	};
	const { data, isPending } = useMailThreadDetail(emailId);
	const [composeMode, setComposeMode] = useState<"reply" | "forward" | null>(
		null,
	);
	const [composeEmailId, setComposeEmailId] = useState<string | null>(null);
	const autoMarkedRef = useRef<string | null>(null);

	const messages = data?.messages ?? [];
	const isSingleMessage = messages.length <= 1;
	const threadSubject = data?.subject;
	const isMerged = data?.isMerged ?? false;
	const latestMessage = messages[messages.length - 1];

	// Record visit for merge suggestions
	useEffect(() => {
		recordThreadVisit(emailId);
	}, [emailId]);

	// Update document title
	useEffect(() => {
		if (threadSubject) {
			document.title = threadSubject;
		}
		return () => {
			document.title = "wingmnn";
		};
	}, [threadSubject]);

	// Mark all unread messages as read
	useEffect(() => {
		if (!data?.messages || autoMarkedRef.current === emailId) return;
		const hasUnread = data.messages.some((m) => !m.isRead);
		if (!hasUnread) return;

		autoMarkedRef.current = emailId;

		// Update thread detail cache
		queryClient.setQueryData(mailKeys.thread(emailId), (old: any) => {
			if (!old?.messages) return old;
			return {
				...old,
				messages: old.messages.map((m: any) => ({ ...m, isRead: true })),
			};
		});
		// Remove from unread thread list caches
		queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: any) => {
			if (!old?.pages) return old;
			return {
				...old,
				pages: old.pages.map((page: any) => ({
					...page,
					threads: page.threads
						? page.threads.filter((t: any) => t.threadId !== emailId)
						: page.threads,
					emails: page.emails
						? page.emails.filter((e: any) => e.id !== emailId)
						: page.emails,
					total: Math.max(0, (page.total ?? 0) - 1),
				})),
			};
		});
		queryClient.invalidateQueries({ queryKey: ["mail", "threads"] });
		api.mail.threads({ threadId: emailId }).read.patch();
	}, [data?.messages, emailId, queryClient]);

	// ── Action handlers ──

	const navigateBack = useCallback(
		() =>
			source === "sent"
				? navigate({
						to: "/module/mail/sent",
						search: { starred: undefined, attachment: undefined },
					})
				: navigate({ to: "/module/mail/inbox", search: inboxSearch }),
		[navigate, inboxSearch, source],
	);

	const handleStar = useCallback(() => {
		if (!latestMessage) return;
		queryClient.setQueriesData(
			{ queryKey: ["mail", "threads"] },
			(old: any) => {
				if (!old?.pages) return old;
				return {
					...old,
					pages: old.pages.map((page: any) => ({
						...page,
						threads: page.threads?.map((t: any) =>
							t.threadId === emailId ? { ...t, isStarred: !t.isStarred } : t,
						),
					})),
				};
			},
		);
		api.mail.threads({ threadId: emailId }).star.patch();
	}, [latestMessage, emailId, queryClient]);

	const handleToggleRead = useCallback(() => {
		api.mail.threads({ threadId: emailId }).read.patch();
	}, [emailId]);

	const handleArchive = useCallback(() => {
		queryClient.setQueriesData(
			{ queryKey: ["mail", "threads"] },
			(old: any) => {
				if (!old?.pages) return old;
				return {
					...old,
					pages: old.pages.map((page: any) => ({
						...page,
						threads: page.threads?.filter((t: any) => t.threadId !== emailId),
						total: Math.max(0, (page.total ?? 0) - 1),
					})),
				};
			},
		);
		toast("Thread archived");
		navigateBack();
		api.mail.threads({ threadId: emailId }).archive.post();
	}, [emailId, queryClient, navigateBack]);

	const handleDelete = useCallback(() => {
		queryClient.setQueriesData(
			{ queryKey: ["mail", "threads"] },
			(old: any) => {
				if (!old?.pages) return old;
				return {
					...old,
					pages: old.pages.map((page: any) => ({
						...page,
						threads: page.threads?.filter((t: any) => t.threadId !== emailId),
						total: Math.max(0, (page.total ?? 0) - 1),
					})),
				};
			},
		);
		toast("Thread deleted");
		navigateBack();
		api.mail.threads({ threadId: emailId }).delete();
	}, [emailId, queryClient, navigateBack]);

	const handleReply = useCallback(() => {
		setComposeEmailId(latestMessage?.id ?? null);
		setComposeMode("reply");
	}, [latestMessage]);

	const handleForward = useCallback(() => {
		setComposeEmailId(latestMessage?.id ?? null);
		setComposeMode("forward");
	}, [latestMessage]);

	const handleNavigateAttachments = useCallback(
		() => navigate({ to: "/module/mail/attachments" }),
		[navigate],
	);

	const handleUnmerge = useCallback(() => {
		api.mail.threads({ threadId: emailId }).unmerge.post();
		toast("Thread unmerged");
		queryClient.invalidateQueries({ queryKey: mailKeys.all });
		navigateBack();
	}, [emailId, queryClient, navigateBack]);

	useEmailDetailKeyboard({
		disabled: composeMode !== null,
		onReply: handleReply,
		onForward: handleForward,
		onStar: handleStar,
		onToggleRead: handleToggleRead,
		onArchive: handleArchive,
		onDelete: handleDelete,
		onBack: navigateBack,
		onNavigateAttachments: handleNavigateAttachments,
	});

	if (isPending) {
		return <DetailSkeleton />;
	}

	if (!data || messages.length === 0) {
		return (
			<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
				<Link
					to="/module/mail/inbox"
					search={inboxSearch}
					className="inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-3" />
					Back to inbox
				</Link>
				<div className="py-16 flex flex-col items-center gap-2">
					<p className="font-serif text-[15px] text-grey-2 italic">
						Email not found.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto pb-16">
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
				className="flex items-center justify-between"
			>
				<Link
					to="/module/mail/inbox"
					search={inboxSearch}
					className="group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-3" />
					Back to inbox
				</Link>

				<AccountSelector />
			</motion.div>

			{/* Subject header */}
			<motion.header
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.5,
					delay: 0.06,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-6"
			>
				<div className="flex items-start justify-between gap-4">
					<h2 className="font-display text-[clamp(1.25rem,2.5vw,1.75rem)] text-foreground leading-tight lowercase">
						{threadSubject || "(no subject)"}
					</h2>
					{!isSingleMessage && (
						<span className="shrink-0 inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded-full bg-foreground/8 text-grey-2 font-mono text-[11px] font-medium mt-1">
							{messages.length}
						</span>
					)}
				</div>
			</motion.header>

			{/* Action bar */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.4,
					delay: 0.1,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-4 flex items-center gap-2"
			>
				<EmailActions
					isStarred={latestMessage?.isStarred ?? false}
					isRead={latestMessage?.isRead ?? true}
					fromAddress={latestMessage?.fromAddress ?? null}
					category={latestMessage?.category ?? "uncategorized"}
					emailId={latestMessage?.id ?? emailId}
					onReply={handleReply}
					onForward={handleForward}
					onStar={handleStar}
					onToggleRead={handleToggleRead}
					onArchive={handleArchive}
					onDelete={handleDelete}
				/>
				{isMerged && (
					<button
						type="button"
						onClick={handleUnmerge}
						className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border/40 bg-secondary/10 hover:bg-secondary/25 text-grey-2 hover:text-foreground font-body text-[12px] transition-colors cursor-pointer"
					>
						<Unlink className="size-3" />
						Unmerge
					</button>
				)}
			</motion.div>

			<div className="my-6 h-px bg-border/30" />

			{/* Messages */}
			{isSingleMessage ? (
				<SingleMessageView email={messages[0]!} />
			) : (
				<ConversationView
					messages={messages}
					onReplyTo={(msgId) => {
						setComposeEmailId(msgId);
						setComposeMode("reply");
					}}
				/>
			)}

			<ComposeSheet
				open={composeMode !== null}
				onOpenChange={(open) => {
					if (!open) {
						setComposeMode(null);
						setComposeEmailId(null);
					}
				}}
				mode={composeMode ?? "reply"}
				emailId={composeEmailId ?? latestMessage?.id ?? emailId}
				fromAddress={
					(composeEmailId
						? messages.find((m) => m.id === composeEmailId)?.fromAddress
						: latestMessage?.fromAddress) ?? null
				}
				subject={threadSubject ?? null}
				originalBody={
					(composeEmailId
						? messages.find((m) => m.id === composeEmailId)?.bodyPlain
						: latestMessage?.bodyPlain) ?? null
				}
			/>

			<KeyboardShortcutBar
				shortcuts={EMAIL_DETAIL_SHORTCUTS}
				visible={composeMode === null}
			/>
		</div>
	);
}

/* ── Single message (same as original detail view) ── */

function SingleMessageView({ email }: { email: SerializedEmailDetail }) {
	return (
		<>
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.45,
					delay: 0.08,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="rounded-lg border border-border/40 bg-secondary/10 overflow-hidden"
			>
				<MessageMetadata email={email} />
				{email.aiSummary && <AiSummary summary={email.aiSummary} />}
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.5,
					delay: 0.12,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-6"
			>
				<EmailBody html={email.bodyHtml} plain={email.bodyPlain} />
			</motion.div>

			{email.attachments && email.attachments.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.4,
						delay: 0.14,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className="mt-6"
				>
					<AttachmentList attachments={email.attachments} />
				</motion.div>
			)}
		</>
	);
}

/* ── Conversation view (multi-message) ── */

function ConversationView({
	messages,
}: {
	messages: SerializedEmailDetail[];
	onReplyTo: (emailId: string) => void;
}) {
	// Latest message expanded by default, older ones collapsed
	const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
		const last = messages[messages.length - 1];
		return new Set(last ? [last.id] : []);
	});

	const toggleExpanded = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	return (
		<div className="space-y-1">
			{messages.map((msg, i) => {
				const isExpanded = expandedIds.has(msg.id);

				return (
					<motion.div
						key={msg.id}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.35,
							delay: Math.min(i * 0.04, 0.3),
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="rounded-lg border border-border/40 bg-secondary/5 overflow-hidden"
					>
						{/* Collapsed header */}
						<button
							type="button"
							onClick={() => toggleExpanded(msg.id)}
							className={cn(
								"w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-secondary/15 transition-colors",
								isExpanded && "border-b border-border/30",
							)}
						>
							<div
								className={cn(
									"size-6 rounded-full flex items-center justify-center shrink-0 font-mono text-[9px] font-semibold",
									msg.isRead
										? "bg-secondary/50 text-grey-2"
										: "bg-foreground text-background",
								)}
							>
								{(msg.fromName || msg.fromAddress || "?")
									.match(/[a-zA-Z0-9]/)?.[0]
									?.toUpperCase() ?? "?"}
							</div>

							<div className="flex-1 min-w-0">
								<span className="font-body text-[13px] text-foreground font-medium truncate block">
									{msg.fromName || msg.fromAddress || "Unknown"}
								</span>
								{!isExpanded && msg.snippet && (
									<span className="font-body text-[12px] text-grey-3 truncate block mt-0.5">
										{msg.snippet}
									</span>
								)}
							</div>

							<span className="font-mono text-[11px] text-grey-3 shrink-0">
								{formatDate(msg.receivedAt)}
							</span>

							<motion.div
								animate={{ rotate: isExpanded ? 90 : 0 }}
								transition={{
									duration: 0.2,
									ease: MOTION_CONSTANTS.EASE,
								}}
							>
								<ChevronRight className="size-3.5 text-grey-3" />
							</motion.div>
						</button>

						{/* Expanded content */}
						<AnimatePresence initial={false}>
							{isExpanded && (
								<motion.div
									initial={{ height: 0, opacity: 0 }}
									animate={{ height: "auto", opacity: 1 }}
									exit={{ height: 0, opacity: 0 }}
									transition={{
										height: {
											duration: 0.3,
											ease: MOTION_CONSTANTS.EASE,
										},
										opacity: {
											duration: 0.2,
											ease: "easeInOut",
										},
									}}
									className="overflow-hidden"
								>
									<MessageMetadata email={msg} />

									{msg.aiSummary && (
										<div className="px-4">
											<AiSummary summary={msg.aiSummary} />
										</div>
									)}

									<div className="px-4 py-4">
										<EmailBody html={msg.bodyHtml} plain={msg.bodyPlain} />
									</div>

									{msg.attachments && msg.attachments.length > 0 && (
										<div className="px-4 pb-4">
											<AttachmentList attachments={msg.attachments} />
										</div>
									)}
								</motion.div>
							)}
						</AnimatePresence>
					</motion.div>
				);
			})}
		</div>
	);
}

/* ── Skeleton ── */

function DetailSkeleton() {
	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto animate-pulse">
			<div className="h-3 w-24 bg-secondary/30 rounded" />
			<div className="mt-6">
				<div className="h-7 w-80 bg-secondary/40 rounded" />
				<div className="mt-4 rounded-lg border border-border/40 bg-secondary/10 px-4 py-3.5 space-y-2.5">
					<div className="flex gap-3">
						<div className="h-3 w-9 bg-secondary/30 rounded" />
						<div className="h-3.5 w-48 bg-secondary/40 rounded" />
					</div>
					<div className="flex gap-3">
						<div className="h-3 w-9 bg-secondary/25 rounded" />
						<div className="h-3 w-64 bg-secondary/30 rounded" />
					</div>
					<div className="h-3 w-36 bg-secondary/25 rounded pt-0.5" />
					<div className="h-6 w-24 bg-secondary/20 rounded border-t border-border/30 mt-2 pt-3" />
				</div>
			</div>
			<div className="my-6 h-px bg-border/30" />
			<div className="space-y-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<div
						key={i}
						className={cn(
							"h-3 bg-secondary/25 rounded",
							i % 3 === 0 ? "w-full" : "w-3/4",
						)}
					/>
				))}
			</div>
		</div>
	);
}
