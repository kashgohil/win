import { MOTION_CONSTANTS } from "@/components/constant";
import { ComposeSheet } from "@/components/mail/ComposeSheet";
import { EmailActions } from "@/components/mail/EmailActions";
import { EmailBody } from "@/components/mail/EmailBody";
import { mailKeys, useMailEmailDetail } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailCategory } from "@wingmnn/types";
import { ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const VALID_CATEGORIES: Set<string> = new Set([
	"urgent",
	"actionable",
	"informational",
	"newsletter",
	"receipt",
	"confirmation",
	"promotional",
	"spam",
	"uncategorized",
]);

type DetailSearch = {
	category?: EmailCategory;
	view?: "read";
};

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/inbox/$emailId",
)({
	component: EmailDetail,
	validateSearch: (search: Record<string, unknown>): DetailSearch => ({
		category:
			typeof search.category === "string" &&
			VALID_CATEGORIES.has(search.category)
				? (search.category as EmailCategory)
				: undefined,
		view: search.view === "read" ? "read" : undefined,
	}),
});

function EmailDetail() {
	const { emailId } = Route.useParams();
	const { category, view } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const inboxSearch = {
		...(category ? { categories: [category] } : {}),
		...(view ? { view } : {}),
	};
	const { data, isPending } = useMailEmailDetail(emailId);
	const [composeMode, setComposeMode] = useState<"reply" | "forward" | null>(
		null,
	);
	const autoMarkedRef = useRef<string | null>(null);

	// Mark as read once when first loading an unread email
	useEffect(() => {
		if (!data?.email || data.email.isRead || autoMarkedRef.current === emailId)
			return;
		autoMarkedRef.current = emailId;

		const patch = { isRead: true };
		queryClient.setQueryData(mailKeys.email(emailId), (old: any) => {
			if (!old?.email) return old;
			return { ...old, email: { ...old.email, ...patch } };
		});
		// Remove from unread list caches
		queryClient.setQueriesData(
			{ queryKey: mailKeys.emails({ unreadOnly: true }) },
			(old: any) => {
				if (!old?.pages) return old;
				return {
					...old,
					pages: old.pages.map((page: any) => ({
						...page,
						emails: page.emails.filter((e: any) => e.id !== emailId),
					})),
				};
			},
		);
		// Invalidate read caches so newly-read email appears
		queryClient.invalidateQueries({
			queryKey: mailKeys.emails({ readOnly: true }),
		});
		api.mail.emails({ id: emailId }).read.patch();
	}, [data?.email?.id, data?.email?.isRead, emailId, queryClient]);

	if (isPending) {
		return <DetailSkeleton />;
	}

	if (!data?.email) {
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

	const email = data.email;
	const isUrgent = email.category === "urgent";
	const navigateBack = () =>
		navigate({ to: "/module/mail/inbox", search: inboxSearch });

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto pb-16">
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
			>
				<Link
					to="/module/mail/inbox"
					search={inboxSearch}
					className="group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-3" />
					Back to inbox
				</Link>
			</motion.div>

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
				<h2 className="font-display text-[clamp(1.25rem,2.5vw,1.75rem)] text-foreground leading-tight lowercase">
					{email.subject || "(no subject)"}
				</h2>
			</motion.header>

			{/* Metadata + AI summary as one block */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.45,
					delay: 0.08,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-4 rounded-lg border border-border/40 bg-secondary/10 overflow-hidden"
			>
				<dl className="px-4 py-3.5 space-y-2.5">
					<div className="flex gap-3 min-w-0">
						<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
							From
						</dt>
						<dd className="font-body text-[13px] text-foreground min-w-0">
							{email.fromName && (
								<span className="font-medium">{email.fromName}</span>
							)}
							{email.fromAddress && (
								<span className="text-grey-2 font-mono text-[12px]">
									{email.fromName ? " " : ""}
									&lt;{email.fromAddress}&gt;
								</span>
							)}
						</dd>
					</div>
					{email.toAddresses && email.toAddresses.length > 0 && (
						<div className="flex gap-3 min-w-0">
							<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
								To
							</dt>
							<dd className="font-mono text-[12px] text-grey-2 min-w-0 break-all">
								{email.toAddresses.join(", ")}
							</dd>
						</div>
					)}
					{email.ccAddresses && email.ccAddresses.length > 0 && (
						<div className="flex gap-3 min-w-0">
							<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
								Cc
							</dt>
							<dd className="font-mono text-[12px] text-grey-2 min-w-0 break-all">
								{email.ccAddresses.join(", ")}
							</dd>
						</div>
					)}
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0 pt-0.5">
						<dt className="sr-only">Date and category</dt>
						<dd className="font-body text-[12px] text-grey-2 flex flex-wrap items-center gap-x-2">
							<time dateTime={email.receivedAt}>
								{formatDate(email.receivedAt)}
							</time>
							<span className="text-grey-3">·</span>
							<span className="capitalize">{email.category}</span>
							{isUrgent && (
								<>
									<span className="text-grey-3">·</span>
									<span className="flex items-center gap-1 text-accent-red">
										<span
											className="size-1.5 rounded-full bg-accent-red"
											aria-hidden
										/>
										Urgent
									</span>
								</>
							)}
						</dd>
					</div>
				</dl>

				{email.aiSummary && <AiSummary summary={email.aiSummary} />}
			</motion.div>

			{/* Action bar */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.4,
					delay: 0.1,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-4"
			>
				<EmailActions
					emailId={emailId}
					isStarred={email.isStarred}
					isRead={email.isRead}
					onReply={() => setComposeMode("reply")}
					onForward={() => setComposeMode("forward")}
					onNavigateBack={navigateBack}
				/>
			</motion.div>

			<div className="my-6 h-px bg-border/30" />

			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.5,
					delay: 0.12,
					ease: MOTION_CONSTANTS.EASE,
				}}
			>
				<EmailBody html={email.bodyHtml} plain={email.bodyPlain} />
			</motion.div>

			<ComposeSheet
				open={composeMode !== null}
				onOpenChange={(open) => {
					if (!open) setComposeMode(null);
				}}
				mode={composeMode ?? "reply"}
				emailId={emailId}
				fromAddress={email.fromAddress}
				subject={email.subject}
				originalBody={email.bodyPlain}
			/>
		</div>
	);
}

function AiSummary({ summary }: { summary: string }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="border-t border-border/30 bg-secondary/5">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 px-4 py-2.5 font-body text-[12px] text-grey-2 hover:text-foreground cursor-pointer select-none"
			>
				<Sparkles
					className={cn(
						"size-3.5 shrink-0 transition-colors duration-200",
						open ? "text-foreground/80" : "text-grey-3",
					)}
				/>
				<span>AI summary</span>
				<motion.div
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.25, ease: MOTION_CONSTANTS.EASE }}
					className="ml-auto shrink-0"
				>
					<ChevronDown className="size-3 text-grey-3" />
				</motion.div>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{
							height: { duration: 0.3, ease: MOTION_CONSTANTS.EASE },
							opacity: { duration: 0.2, ease: "easeInOut" },
						}}
						className="overflow-hidden"
					>
						<div className="px-4 pb-4 pt-1">
							<p className="font-serif text-[14px] text-foreground/75 italic leading-relaxed border-l-2 border-grey-4/60 pl-3">
								{summary}
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

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
