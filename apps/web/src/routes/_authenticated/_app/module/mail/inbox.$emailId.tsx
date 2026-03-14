import { MOTION_CONSTANTS } from "@/components/constant";
import { ContactCardLazy } from "@/components/contacts/ContactCard";
import { AccountSelector } from "@/components/mail/AccountSelector";
import { AiSummary } from "@/components/mail/AiSummary";
import { AttachmentList } from "@/components/mail/AttachmentList";
import { EmailActions } from "@/components/mail/EmailActions";
import { EmailBody } from "@/components/mail/EmailBody";
import {
	EMAIL_DETAIL_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import { MessageMetadata } from "@/components/mail/MessageMetadata";
import { QuickReplyForm } from "@/components/mail/QuickReplyForm";
import { useAiSummarize } from "@/hooks/use-ai";
import { openCompose } from "@/hooks/use-compose";
import { useEmailDetailKeyboard } from "@/hooks/use-email-detail-keyboard";
import { mailKeys, useMailThreadDetail } from "@/hooks/use-mail";
import { recordThreadVisit } from "@/hooks/use-merge-suggestions";
import { api } from "@/lib/api";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { cn, relativeTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useLiveQuery } from "@tanstack/react-db";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { SerializedEmailDetail } from "@wingmnn/types";
import {
	ArrowLeft,
	ArrowUpDown,
	Loader2,
	Reply,
	Sparkles,
	Unlink,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

	const handleReply = useCallback(
		(msgId?: string) => {
			const targetId = msgId ?? latestMessage?.id;
			const msg = targetId
				? (messages.find((m) => m.id === targetId) ?? latestMessage)
				: latestMessage;
			if (!msg) return;
			openCompose({
				mode: "reply",
				emailId: msg.id,
				fromAddress: msg.fromAddress ?? null,
				subject: threadSubject ?? null,
				originalBody: msg.bodyPlain ?? null,
			});
		},
		[latestMessage, messages, threadSubject],
	);

	const handleForward = useCallback(() => {
		if (!latestMessage) return;
		openCompose({
			mode: "forward",
			emailId: latestMessage.id,
			fromAddress: latestMessage.fromAddress ?? null,
			subject: threadSubject ?? null,
			originalBody: latestMessage.bodyPlain ?? null,
		});
	}, [latestMessage, threadSubject]);

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
		disabled: false,
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
					threadSubject={threadSubject ?? null}
					onReplyTo={(msgId) => handleReply(msgId)}
				/>
			)}

			{/* Thread AI summary — only for multi-message threads */}
			{!isSingleMessage && messages.length > 1 && (
				<ThreadSummaryButton messages={messages} />
			)}

			<KeyboardShortcutBar shortcuts={EMAIL_DETAIL_SHORTCUTS} />
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

/* ── Conversation view (chat-style multi-message) ── */

function ConversationView({
	messages,
	threadSubject,
	onReplyTo,
}: {
	messages: SerializedEmailDetail[];
	threadSubject: string | null;
	onReplyTo: (emailId: string) => void;
}) {
	const { data: accounts } = useLiveQuery(mailAccountsCollection);
	const ownEmails = useMemo(
		() => new Set(accounts.map((a) => a.email.toLowerCase())),
		[accounts],
	);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
	const bottomRef = useRef<HTMLDivElement>(null);

	const isOwn = useCallback(
		(addr: string | null) =>
			!!addr && ownEmails.has(addr.toLowerCase()),
		[ownEmails],
	);

	const sortedMessages = useMemo(() => {
		if (sortOrder === "asc") return messages;
		return [...messages].reverse();
	}, [messages, sortOrder]);

	const latestMessage = messages[messages.length - 1];

	return (
		<div className="flex flex-col gap-0.5">
			{/* Sort toggle */}
			<div className="flex items-center justify-end mb-2">
				<button
					type="button"
					onClick={() =>
						setSortOrder((o) => (o === "asc" ? "desc" : "asc"))
					}
					className="inline-flex items-center gap-1.5 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
				>
					{sortOrder === "asc" ? "oldest first" : "newest first"}
					<ArrowUpDown className="size-3" />
				</button>
			</div>

			{sortedMessages.map((msg, i) => {
				const sent = isOwn(msg.fromAddress);
				const prevMsg = i > 0 ? sortedMessages[i - 1] : null;
				const sameSenderAsPrev =
					prevMsg?.fromAddress === msg.fromAddress;

				// Show time separator if >1 hour gap
				const showTimeSep =
					prevMsg &&
					Math.abs(
						new Date(msg.receivedAt).getTime() -
							new Date(prevMsg.receivedAt).getTime(),
					) >
						60 * 60 * 1000;

				const isDetailExpanded = expandedId === msg.id;
				const hasAttachments =
					msg.attachments && msg.attachments.length > 0;

				return (
					<div key={msg.id}>
						{/* Time separator */}
						{showTimeSep && (
							<div className="flex items-center gap-3 py-3">
								<div className="flex-1 h-px bg-border/20" />
								<span className="font-mono text-[10px] text-grey-3 uppercase tracking-wider">
									{new Date(msg.receivedAt).toLocaleString("en-US", {
										weekday: "short",
										month: "short",
										day: "numeric",
										hour: "numeric",
										minute: "2-digit",
									})}
								</span>
								<div className="flex-1 h-px bg-border/20" />
							</div>
						)}

						{/* Message bubble */}
						<motion.div
							initial={{ opacity: 0, y: 6 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.3,
								delay: Math.min(i * 0.03, 0.25),
								ease: MOTION_CONSTANTS.EASE,
							}}
							className={cn(
								"flex flex-col gap-1",
								sent ? "items-end" : "items-start",
								!sameSenderAsPrev && i > 0 && "mt-4",
							)}
						>
							{/* Sender name — only when sender changes */}
							{!sameSenderAsPrev && (
								<div
									className={cn(
										"flex items-center gap-2 px-1",
										sent && "flex-row-reverse",
									)}
								>
									{/* Avatar */}
									<div
										className={cn(
											"size-6 rounded-full flex items-center justify-center shrink-0 font-mono text-[9px] font-semibold",
											sent
												? "bg-foreground text-background"
												: "bg-secondary/60 text-grey-2",
										)}
									>
										{(msg.fromName || msg.fromAddress || "?")
											.match(/[a-zA-Z0-9]/)?.[0]
											?.toUpperCase() ?? "?"}
									</div>

									<div className="flex items-baseline gap-2">
										{msg.fromAddress ? (
											<ContactCardLazy
												email={msg.fromAddress}
												side="bottom"
												align={sent ? "end" : "start"}
											>
												<span className="font-body text-[12px] text-grey-2 font-medium hover:text-foreground transition-colors cursor-pointer">
													{sent
														? "You"
														: msg.fromName ||
															msg.fromAddress}
												</span>
											</ContactCardLazy>
										) : (
											<span className="font-body text-[12px] text-grey-2 font-medium">
												Unknown
											</span>
										)}
										<span className="font-mono text-[10px] text-grey-3">
											{relativeTime(msg.receivedAt)}
										</span>
									</div>
								</div>
							)}

							{/* Bubble */}
							<div
								className={cn(
									"group relative w-[95%]",
									sent ? "pr-8" : "pl-8",
								)}
							>
								<div
									className={cn(
										"rounded-2xl overflow-hidden transition-colors",
										sent
											? "bg-foreground/[0.06] rounded-tr-md"
											: "bg-secondary/10 border border-border/30 rounded-tl-md",
									)}
								>
									{/* Message body */}
									<div className="px-4 py-3">
										<EmailBody
											html={msg.bodyHtml}
											plain={msg.bodyPlain}
										/>
									</div>

									{/* Inline attachments */}
									{hasAttachments && (
										<div className="px-3 pb-3">
											<AttachmentList
												attachments={msg.attachments}
											/>
										</div>
									)}

									{/* AI summary (collapsed by default) */}
									{msg.aiSummary && (
										<AiSummary summary={msg.aiSummary} />
									)}
								</div>

								{/* Timestamp + actions on hover */}
								<div
									className={cn(
										"flex items-center gap-2 mt-1 px-1",
										sent ? "justify-end" : "justify-start",
									)}
								>
									{sameSenderAsPrev && (
										<span className="font-mono text-[10px] text-grey-3/70">
											{relativeTime(msg.receivedAt)}
										</span>
									)}

									{/* Quick reply to this specific message */}
									<button
										type="button"
										onClick={() => onReplyTo(msg.id)}
										className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 font-body text-[10px] text-grey-3 hover:text-foreground transition-all cursor-pointer"
									>
										<Reply className="size-3" />
										reply
									</button>

									{/* Expand full metadata */}
									<button
										type="button"
										onClick={() =>
											setExpandedId(
												isDetailExpanded ? null : msg.id,
											)
										}
										className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-grey-3 hover:text-foreground transition-all cursor-pointer"
									>
										{isDetailExpanded ? "less" : "more"}
									</button>
								</div>

								{/* Expanded metadata panel */}
								<AnimatePresence initial={false}>
									{isDetailExpanded && (
										<motion.div
											initial={{ height: 0, opacity: 0 }}
											animate={{
												height: "auto",
												opacity: 1,
											}}
											exit={{ height: 0, opacity: 0 }}
											transition={{
												height: {
													duration: 0.25,
													ease: MOTION_CONSTANTS.EASE,
												},
												opacity: {
													duration: 0.15,
													ease: "easeInOut",
												},
											}}
											className="overflow-hidden"
										>
											<div className="mt-1 rounded-lg border border-border/30 bg-secondary/5 overflow-hidden">
												<MessageMetadata email={msg} />
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</div>
						</motion.div>
					</div>
				);
			})}

			{/* Quick reply at bottom */}
			{latestMessage && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.3,
						delay: 0.15,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className="mt-4 rounded-2xl border border-border/30 bg-secondary/5 overflow-hidden"
				>
					<QuickReplyForm
						emailId={latestMessage.id}
						fromAddress={latestMessage.fromAddress}
						subject={threadSubject}
					/>
				</motion.div>
			)}

			<div ref={bottomRef} />
		</div>
	);
}

/* ── Thread AI summary button ── */

function ThreadSummaryButton({
	messages,
}: {
	messages: SerializedEmailDetail[];
}) {
	const summarize = useAiSummarize();
	const [summary, setSummary] = useState<string | null>(null);

	const handleSummarize = useCallback(() => {
		summarize.mutate(
			messages.map((m) => ({
				from: m.fromName || m.fromAddress || "Unknown",
				body: m.bodyPlain ?? m.snippet ?? "",
				date: m.receivedAt,
			})),
			{
				onSuccess: (data) => setSummary(data.summary),
				onError: () => toast.error("Failed to summarize thread"),
			},
		);
	}, [messages, summarize]);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.3, delay: 0.2 }}
			className="mt-6"
		>
			{summary ? (
				<div className="rounded-lg border border-border/40 bg-secondary/5 overflow-hidden">
					<div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
						<Sparkles className="size-3.5 text-foreground/80" />
						<span className="font-body text-[12px] text-grey-2">
							Thread summary
						</span>
					</div>
					<div className="px-4 py-4">
						<p className="font-serif text-[14px] text-foreground/75 italic leading-relaxed border-l-2 border-grey-4/60 pl-3">
							{summary}
						</p>
					</div>
				</div>
			) : (
				<button
					type="button"
					onClick={handleSummarize}
					disabled={summarize.isPending}
					className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border/40 bg-secondary/10 hover:bg-secondary/25 text-grey-2 hover:text-foreground font-body text-[12px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
				>
					{summarize.isPending ? (
						<Loader2 className="size-3.5 animate-spin" />
					) : (
						<Sparkles className="size-3.5" />
					)}
					{summarize.isPending ? "Summarizing…" : "Summarize thread"}
				</button>
			)}
		</motion.div>
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
