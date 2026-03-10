import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import {
	KeyboardShortcutBar,
	SENT_INLINE_SHORTCUTS,
	SENT_SHORTCUTS,
} from "@/components/mail/KeyboardShortcutBar";
import { ReadingPane } from "@/components/mail/ReadingPane";
import { ResizeHandle } from "@/components/mail/ResizeHandle";
import {
	hasActiveFilters,
	SearchCommand,
	SearchFilterChips,
	type SearchFilters,
} from "@/components/mail/SearchBar";
import { ThreadPreview } from "@/components/mail/ThreadPreview";
import { groupThreadsByTime, ThreadRow } from "@/components/mail/ThreadRow";
import { Kbd } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mailKeys, useMailThreadsInfinite } from "@/hooks/use-mail";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { useMailViewMode } from "@/hooks/use-mail-view-mode";
import { useSidepanelWidth } from "@/hooks/use-sidepanel-width";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Columns2,
	Inbox,
	Paperclip,
	Rows2,
	Search,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 30;

const sentSearchSchema = z.object({
	q: z.string().optional(),
	to: z.string().optional(),
	subject: z.string().optional(),
	starred: z
		.union([z.literal("true"), z.literal("false"), z.boolean()])
		.optional()
		.transform((v) =>
			v === true || v === "true"
				? true
				: v === false || v === "false"
					? false
					: undefined,
		),
	attachment: z
		.union([z.literal("true"), z.literal("false"), z.boolean()])
		.optional()
		.transform((v) =>
			v === true || v === "true"
				? true
				: v === false || v === "false"
					? false
					: undefined,
		),
	after: z.string().optional(),
	before: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/module/mail/sent/")({
	component: SentPage,
	validateSearch: (search) => sentSearchSchema.parse(search),
});

type ThreadPageData = {
	threads: Array<{ threadId: string; [key: string]: unknown }>;
	total?: number;
};

type PaginatedThreadData = {
	pages: ThreadPageData[];
};

function removeThreadFromPages(old: unknown, threadId: string): unknown {
	const data = old as PaginatedThreadData | undefined;
	if (!data?.pages) return old;
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			threads: page.threads.filter((t) => t.threadId !== threadId),
			total: Math.max(0, (page.total ?? 0) - 1),
		})),
	};
}

function updateThreadInPages(
	old: unknown,
	threadId: string,
	patch: object,
): unknown {
	const data = old as PaginatedThreadData | undefined;
	if (!data?.pages) return old;
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			threads: page.threads.map((t) =>
				t.threadId === threadId ? { ...t, ...patch } : t,
			),
		})),
	};
}

function SentPage() {
	const { q, to, subject, starred, attachment, after, before } =
		Route.useSearch();
	const navigate = useNavigate();
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const queryClient = useQueryClient();
	const { mode: viewMode, toggle: toggleViewMode } = useMailViewMode();
	const {
		width: panelWidth,
		onResize: onPanelResize,
		minWidth: panelMinWidth,
		maxWidth: panelMaxWidth,
	} = useSidepanelWidth();
	const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
	const [peekedThreadId, setPeekedThreadId] = useState<string | null>(null);

	const activeAccountIds = useMailAccountFilter((s) => s.activeAccountIds);
	const accountIds = useMemo(
		() =>
			activeAccountIds === "all" ? undefined : Array.from(activeAccountIds),
		[activeAccountIds],
	);

	const searchFilters: SearchFilters = useMemo(
		() => ({ q, to, subject, starred, attachment, after, before }),
		[q, to, subject, starred, attachment, after, before],
	);

	const isSearching = hasActiveFilters(searchFilters);

	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMailThreadsInfinite({
			sentOnly: true,
			limit: PAGE_SIZE,
			q,
			to,
			subject,
			starred,
			attachment,
			after,
			before,
			accountIds,
		});

	// IntersectionObserver for infinite scroll
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	// Cmd+K / Ctrl+K to open search
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const threads = data?.pages.flatMap((page) => page?.threads ?? []) ?? [];
	const total = data?.pages[0]?.total;

	const searchTerms = useMemo(
		() => (q ? q.split(/\s+/).filter(Boolean) : []),
		[q],
	);

	const toSentSearch = useCallback(
		(filters: SearchFilters) => ({
			starred: filters.starred ?? undefined,
			attachment: filters.attachment ?? undefined,
			q: filters.q,
			to: filters.to,
			subject: filters.subject,
			after: filters.after,
			before: filters.before,
		}),
		[],
	);

	const handleFiltersChange = useCallback(
		(filters: SearchFilters) => {
			navigate({
				to: "/module/mail/sent",
				search: toSentSearch(filters),
				replace: true,
			});
		},
		[navigate, toSentSearch],
	);

	const handleRemoveFilter = useCallback(
		(key: keyof SearchFilters) => {
			const next = { ...searchFilters };
			delete next[key];
			handleFiltersChange(next);
		},
		[searchFilters, handleFiltersChange],
	);

	const handleClearFilters = useCallback(() => {
		handleFiltersChange({});
	}, [handleFiltersChange]);

	// ── Keyboard shortcuts ──

	const [focusedIndex, setFocusedIndex] = useState(0);
	const emailRowRefs = useRef<Map<number, HTMLElement>>(new Map());
	const [kbActive, setKbActive] = useState(false);

	const scrollIntoView = useCallback((index: number) => {
		emailRowRefs.current.get(index)?.scrollIntoView({
			block: "nearest",
			behavior: "smooth",
		});
	}, []);

	useEffect(() => {
		if (!kbActive) return;
		const handler = () => setKbActive(false);
		document.addEventListener("mousemove", handler, { once: true });
		return () => document.removeEventListener("mousemove", handler);
	}, [kbActive]);

	useEffect(() => {
		if (searchOpen) return;

		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey
			) {
				return;
			}

			switch (e.key) {
				case "/":
					e.preventDefault();
					setSearchOpen(true);
					return;
				case "[":
					e.preventDefault();
					navigate({ to: "/module/mail" });
					return;
				case "i":
					e.preventDefault();
					navigate({
						to: "/module/mail/inbox",
						search: {
							view: undefined,
							starred: undefined,
							attachment: undefined,
						},
					});
					return;
				case "a":
					e.preventDefault();
					navigate({ to: "/module/mail/attachments" });
					return;
				case "p":
					e.preventDefault();
					toggleViewMode();
					return;
			}

			// Activate on first nav key
			if (
				!kbActive &&
				(e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "j")
			) {
				e.preventDefault();
				setKbActive(true);
				return;
			}

			if (!kbActive) return;

			if (e.key === "ArrowDown" || e.key === "j") {
				e.preventDefault();
				setFocusedIndex((prev) => {
					const next = Math.min(prev + 1, threads.length - 1);
					scrollIntoView(next);
					if (viewMode === "sidepanel") {
						const thread = threads[next];
						if (thread) setPeekedThreadId(thread.threadId);
					}
					return next;
				});
				return;
			}

			if (e.key === "ArrowUp" || e.key === "k") {
				e.preventDefault();
				setFocusedIndex((prev) => {
					const next = Math.max(prev - 1, 0);
					scrollIntoView(next);
					if (viewMode === "sidepanel") {
						const thread = threads[next];
						if (thread) setPeekedThreadId(thread.threadId);
					}
					return next;
				});
				return;
			}

			if (e.key === "Enter") {
				e.preventDefault();
				const thread = threads[focusedIndex];
				if (thread) {
					navigate({
						to: "/module/mail/inbox/$emailId",
						params: { emailId: thread.threadId },
						search: { view: undefined, source: "sent" },
					});
				}
				return;
			}

			if (e.key === " ") {
				e.preventDefault();
				if (viewMode === "inline") {
					const thread = threads[focusedIndex];
					if (thread) {
						setExpandedThreadId((prev) =>
							prev === thread.threadId ? null : thread.threadId,
						);
					}
				}
				return;
			}

			if (e.key === "q") {
				e.preventDefault();
				const thread = threads[focusedIndex];
				if (thread) {
					if (viewMode === "sidepanel") {
						setPeekedThreadId(thread.threadId);
					} else {
						setExpandedThreadId(thread.threadId);
					}
					requestAnimationFrame(() => {
						const el =
							document.querySelector<HTMLTextAreaElement>("[data-quick-reply]");
						if (el) {
							el.focus({ preventScroll: true });
						}
					});
				}
				return;
			}

			if (e.key === "f") {
				e.preventDefault();
				const thread = threads[focusedIndex];
				if (thread) {
					const patch = { isStarred: !thread.isStarred };
					queryClient.setQueriesData(
						{ queryKey: mailKeys.all },
						(old: unknown) => updateThreadInPages(old, thread.threadId, patch),
					);
					api.mail.threads({ threadId: thread.threadId }).star.patch();
				}
				return;
			}

			if (e.key === "e") {
				e.preventDefault();
				const thread = threads[focusedIndex];
				if (thread) {
					queryClient.setQueriesData(
						{ queryKey: mailKeys.all },
						(old: unknown) => removeThreadFromPages(old, thread.threadId),
					);
					toast("Thread archived");
					api.mail.threads({ threadId: thread.threadId }).archive.post();
				}
				return;
			}

			if (e.key === "Escape") {
				e.preventDefault();
				if (viewMode === "inline" && expandedThreadId) {
					setExpandedThreadId(null);
				} else {
					setKbActive(false);
				}
				return;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [
		searchOpen,
		kbActive,
		focusedIndex,
		threads,
		navigate,
		queryClient,
		scrollIntoView,
		viewMode,
		expandedThreadId,
	]);

	const emailRowRef = useCallback((index: number, el: HTMLElement | null) => {
		if (el) {
			emailRowRefs.current.set(index, el);
		} else {
			emailRowRefs.current.delete(index);
		}
	}, []);

	const peekedThread =
		threads.find((t) => t.threadId === peekedThreadId) ?? null;

	const handleOpenPeekedDetail = useCallback(() => {
		if (!peekedThreadId) return;
		navigate({
			to: "/module/mail/inbox/$emailId",
			params: { emailId: peekedThreadId },
			search: { view: undefined, source: "sent" },
		});
	}, [peekedThreadId, navigate]);

	const threadListContent = (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.5,
				delay: 0.08,
				ease: MOTION_CONSTANTS.EASE,
			}}
			className="mt-4"
		>
			{(() => {
				let flatIndex = 0;
				return groupThreadsByTime(threads).map((cluster) => (
					<div key={cluster.label ?? "today"}>
						{cluster.label && (
							<div className="pt-6 pb-2">
								<span className="font-body text-[13px] text-grey-3">
									{cluster.label}
								</span>
							</div>
						)}
						{cluster.threads.map((thread) => {
							const idx = flatIndex++;
							const isThisExpanded =
								viewMode === "inline" && expandedThreadId === thread.threadId;
							return (
								<ThreadRow
									key={thread.threadId}
									thread={thread}
									variant="sent"
									highlightTerms={searchTerms}
									isFocused={kbActive && focusedIndex === idx}
									focusRef={(el) => emailRowRef(idx, el)}
									linkSearch={{ source: "sent" }}
									compact={viewMode === "sidepanel"}
									isExpanded={isThisExpanded}
									onToggleExpand={
										viewMode === "inline"
											? () => {
													setExpandedThreadId((prev) =>
														prev === thread.threadId ? null : thread.threadId,
													);
												}
											: viewMode === "sidepanel"
												? () => {
														setPeekedThreadId(thread.threadId);
													}
												: undefined
									}
									expandedContent={
										isThisExpanded ? (
											<ThreadPreview
												threadId={thread.threadId}
												thread={thread}
												variant="inline"
												onOpenDetail={() => {
													navigate({
														to: "/module/mail/inbox/$emailId",
														params: { emailId: thread.threadId },
														search: {
															view: undefined,
															source: "sent",
														},
													});
												}}
											/>
										) : undefined
									}
								/>
							);
						})}
					</div>
				));
			})()}

			{/* Sentinel for infinite scroll */}
			<div ref={sentinelRef} className="h-px" />

			{isFetchingNextPage && (
				<div className="flex justify-center py-6">
					<div className="size-5 border-2 border-border/60 border-t-foreground/60 rounded-full animate-spin" />
				</div>
			)}
		</motion.div>
	);

	return (
		<div
			className={cn(
				viewMode === "sidepanel"
					? "h-[calc(100dvh)] overflow-hidden flex flex-col"
					: "px-(--page-px) py-8 max-w-5xl mx-auto",
			)}
		>
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
				className={cn(
					"mb-6 flex items-center justify-between",
					viewMode === "sidepanel" && "shrink-0 px-(--page-px) pt-8",
				)}
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
							<TooltipContent side="bottom">Attachments</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={() => setSearchOpen(true)}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer"
								>
									<Search className="size-3" />
									<Kbd>/</Kbd>
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">Search</TooltipContent>
						</Tooltip>

						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={toggleViewMode}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer"
								>
									{viewMode === "inline" ? (
										<Columns2 className="size-3.5" />
									) : (
										<Rows2 className="size-3.5" />
									)}
									<Kbd>P</Kbd>
								</button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								{viewMode === "inline"
									? "Switch to side panel"
									: "Switch to inline"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<div className="w-px h-3.5 bg-border/40" />

					<AccountSelector />
				</div>
			</motion.div>

			{/* Active filter chips */}
			{isSearching && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.35, ease: MOTION_CONSTANTS.EASE }}
					className={cn(
						"mb-4",
						viewMode === "sidepanel" && "shrink-0 px-(--page-px)",
					)}
				>
					<SearchFilterChips
						filters={searchFilters}
						onRemoveFilter={handleRemoveFilter}
						onClearAll={handleClearFilters}
					/>
				</motion.div>
			)}

			{/* Result count when searching */}
			{isSearching && !isPending && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className={cn(
						"mt-3 font-mono text-[11px] text-grey-3",
						viewMode === "sidepanel" && "px-(--page-px)",
					)}
				>
					{total === 1 ? "1 result" : `${total ?? 0} results`}
				</motion.p>
			)}

			{/* Title */}
			{!isSearching && (
				<motion.h2
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: MOTION_CONSTANTS.EASE }}
					className={cn(
						"font-serif text-[18px] text-foreground/80 mb-2",
						viewMode === "sidepanel" && "shrink-0 px-(--page-px)",
					)}
				>
					Sent
				</motion.h2>
			)}

			{/* Thread list */}
			{isPending ? (
				<SentSkeleton />
			) : threads.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="py-16 flex flex-col items-center gap-2"
				>
					<p className="font-serif text-[15px] text-grey-2 italic text-center">
						{isSearching
							? "No sent emails matching your search."
							: "No sent emails yet."}
					</p>
				</motion.div>
			) : viewMode === "sidepanel" ? (
				<div className="flex flex-1 overflow-hidden mt-4 px-(--page-px)">
					{/* Left column — compact thread list */}
					<div
						data-sidepanel-list
						style={{ width: panelWidth }}
						className="shrink-0 overflow-y-auto px-3"
					>
						{threadListContent}
					</div>
					<ResizeHandle
						onResize={onPanelResize}
						minWidth={panelMinWidth}
						maxWidth={panelMaxWidth}
					/>
					{/* Right column — reading pane */}
					<div className="flex-1 overflow-y-auto">
						<ReadingPane
							threadId={peekedThreadId}
							thread={peekedThread}
							onOpenDetail={handleOpenPeekedDetail}
							variant="sent"
						/>
					</div>
				</div>
			) : (
				threadListContent
			)}

			{/* Search command dialog */}
			<SearchCommand
				open={searchOpen}
				onOpenChange={setSearchOpen}
				filters={searchFilters}
				onFiltersChange={handleFiltersChange}
				activeCategory={null}
			/>

			<KeyboardShortcutBar
				shortcuts={
					viewMode === "inline" && expandedThreadId
						? SENT_INLINE_SHORTCUTS
						: SENT_SHORTCUTS
				}
				visible={!searchOpen}
			/>
		</div>
	);
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function SentSkeleton() {
	return (
		<div className="animate-pulse mt-4">
			{SKELETON_KEYS.map((key) => (
				<div key={key} className="flex items-start gap-3 py-3.5">
					<div className="size-7 rounded-full bg-secondary/40" />
					<div className="flex-1 space-y-1.5">
						<div className="h-3.5 w-32 bg-secondary/40 rounded" />
						<div className="h-3 w-64 bg-secondary/25 rounded" />
					</div>
					<div className="h-2.5 w-8 bg-secondary/25 rounded mt-1" />
				</div>
			))}
		</div>
	);
}
