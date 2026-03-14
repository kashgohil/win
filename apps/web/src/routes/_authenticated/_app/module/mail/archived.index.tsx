import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import {
	ARCHIVED_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import { groupThreadsByTime, ThreadRow } from "@/components/mail/ThreadRow";
import { Kbd } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMailThreadsInfinite } from "@/hooks/use-mail";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Inbox, Paperclip, Send } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { z } from "zod";

const PAGE_SIZE = 30;

const archivedSearchSchema = z.object({
	starred: z.coerce.boolean().optional(),
	attachment: z.coerce.boolean().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/archived/",
)({
	component: ArchivedPage,
	validateSearch: (search) => archivedSearchSchema.parse(search),
});

function ArchivedPage() {
	const { starred, attachment } = Route.useSearch();
	const navigate = useNavigate();
	const { getAccountIds } = useMailAccountFilter();
	const accountIds = getAccountIds() ?? undefined;

	const { data, isPending, isFetchingNextPage, hasNextPage, fetchNextPage } =
		useMailThreadsInfinite({
			limit: PAGE_SIZE,
			starred,
			attachment,
			accountIds,
			archivedOnly: true,
		});

	const threads = data?.pages?.flatMap((p) => p?.threads ?? []) ?? [];
	const clusters = groupThreadsByTime(threads);

	// Infinite scroll sentinel
	const sentinelRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Keyboard: "i" for inbox, Escape to go back
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const t = e.target as HTMLElement;
			if (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.isContentEditable
			)
				return;

			switch (e.key) {
				case "i":
					e.preventDefault();
					navigate({ to: "/module/mail/inbox" });
					return;
				case "s":
					e.preventDefault();
					navigate({
						to: "/module/mail/sent",
						search: { starred: undefined, attachment: undefined },
					});
					return;
				case "a":
					e.preventDefault();
					navigate({ to: "/module/mail/attachments" });
					return;
				case "[":
				case "Escape":
					e.preventDefault();
					navigate({ to: "/module/mail" });
					return;
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [navigate]);

	// ── Render ──

	const threadList = (
		<>
			{isPending ? (
				<div className="space-y-1 mt-4">
					{Array.from({ length: 8 }).map((_, i) => (
						<div
							key={i}
							className="flex items-center gap-3 py-3.5 px-2 animate-pulse"
						>
							<div className="size-7 rounded-full bg-secondary/30" />
							<div className="flex-1 space-y-1.5">
								<div className="h-3.5 w-40 bg-secondary/25 rounded" />
								<div className="h-3 w-64 bg-secondary/20 rounded" />
							</div>
						</div>
					))}
				</div>
			) : threads.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.1 }}
					className="py-20 flex flex-col items-center gap-2"
				>
					<p className="font-serif text-[15px] text-grey-2 italic">
						No archived threads.
					</p>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
					className="mt-2"
				>
					{clusters.map((cluster) => (
						<div key={cluster.label ?? "today"}>
							{cluster.label && (
								<div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-background/80 backdrop-blur-sm">
									<span className="font-mono text-[10px] text-grey-3 uppercase tracking-wider">
										{cluster.label}
									</span>
								</div>
							)}
							{cluster.threads.map((thread) => (
								<ThreadRow
									key={thread.threadId}
									thread={thread}
									linkSearch={{ source: "archived" }}
								/>
							))}
						</div>
					))}

					<div ref={sentinelRef} className="h-px" />

					{isFetchingNextPage && (
						<div className="flex justify-center py-6">
							<div className="size-5 border-2 border-border/60 border-t-foreground/60 rounded-full animate-spin" />
						</div>
					)}
				</motion.div>
			)}
		</>
	);

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
				className="mb-6 flex items-center justify-between"
			>
				<Link
					to="/module/mail"
					className="group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-3 hover:text-foreground transition-all duration-150 rounded-lg px-2 py-1 -mx-2"
				>
					<ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
					Mail
				</Link>

				<div className="flex items-center gap-3">
					<TooltipProvider sliding>
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									to="/module/mail/inbox"
									search={{
										view: undefined,
										starred: undefined,
										attachment: undefined,
									}}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
								>
									<Inbox className="size-3" />
									<Kbd>I</Kbd>
								</Link>
							</TooltipTrigger>
							<TooltipContent side="bottom">Inbox</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									to="/module/mail/attachments"
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
								>
									<Paperclip className="size-3" />
									<Kbd>A</Kbd>
								</Link>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								Attachments
							</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Link
									to="/module/mail/sent"
									search={{
										starred: undefined,
										attachment: undefined,
									}}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
								>
									<Send className="size-3" />
									<Kbd>S</Kbd>
								</Link>
							</TooltipTrigger>
							<TooltipContent side="bottom">Sent</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<div className="w-px h-3.5 bg-border/40" />

					<AccountSelector />
				</div>
			</motion.div>

			{/* Thread list */}
			{threadList}

			<KeyboardShortcutBar shortcuts={ARCHIVED_SHORTCUTS} />
		</div>
	);
}
