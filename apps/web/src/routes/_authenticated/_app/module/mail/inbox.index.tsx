import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import { CATEGORIES } from "@/components/mail/category-colors";
import { CategoryFilter } from "@/components/mail/CategoryFilter";
import { ComposeSheet } from "@/components/mail/ComposeSheet";
import {
	INBOX_INLINE_SHORTCUTS,
	INBOX_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import { MergeSuggestionPill } from "@/components/mail/MergeSuggestionPill";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInboxKeyboard } from "@/hooks/use-inbox-keyboard";
import {
	mailKeys,
	useMailThreadsInfinite,
	useMergeThreads,
} from "@/hooks/use-mail";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { useMailViewMode } from "@/hooks/use-mail-view-mode";
import { useMergeSuggestions } from "@/hooks/use-merge-suggestions";
import { useSidepanelWidth } from "@/hooks/use-sidepanel-width";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArrowLeft,
	Columns2,
	Mail,
	MailOpen,
	Merge,
	Paperclip,
	PenSquare,
	Rows2,
	Search,
	Send,
	Star,
	Trash2,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 30;
const HEADER_ITEMS = ["back", "attachments", "sent", "search", "view"] as const;

/* ── Cache helpers ── */

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

const inboxSearchSchema = z.object({
	view: z
		.string()
		.optional()
		.transform((v) => (v === "read" ? ("read" as const) : undefined)),
	category: z.string().optional(),
	q: z.string().optional(),
	from: z.string().optional(),
	subject: z.string().optional(),
	to: z.string().optional(),
	cc: z.string().optional(),
	label: z.string().optional(),
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
	filename: z.string().optional(),
	filetype: z.string().optional(),
	after: z.string().optional(),
	before: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/module/mail/inbox/")(
	{
		component: MailInbox,
		validateSearch: (search) => inboxSearchSchema.parse(search),
	},
);

function MailInbox() {
	const {
		view,
		category,
		q,
		from,
		subject,
		to,
		cc,
		label,
		starred,
		attachment,
		filename,
		filetype,
		after,
		before,
	} = Route.useSearch();
	const navigate = useNavigate();
	const activeView = view ?? "unread";
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [searchOpen, setSearchOpen] = useState(false);
	const [selectedThreads, setSelectedThreads] = useState<Set<string>>(
		new Set(),
	);
	const [dragSourceId, setDragSourceId] = useState<string | null>(null);
	const { mode: viewMode, toggle: toggleViewMode } = useMailViewMode();
	const {
		width: panelWidth,
		onResize: onPanelResize,
		minWidth: panelMinWidth,
		maxWidth: panelMaxWidth,
	} = useSidepanelWidth();
	const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
	const [peekedThreadId, setPeekedThreadId] = useState<string | null>(null);
	const [composeOpen, setComposeOpen] = useState(false);

	const activeCategory = category ?? null;
	const activeAccountIds = useMailAccountFilter((s) => s.activeAccountIds);
	const accountIds = useMemo(
		() =>
			activeAccountIds === "all" ? undefined : Array.from(activeAccountIds),
		[activeAccountIds],
	);

	const searchFilters: SearchFilters = useMemo(
		() => ({
			q,
			from,
			subject,
			to,
			cc,
			label,
			category,
			starred,
			attachment,
			filename,
			filetype,
			after,
			before,
		}),
		[
			q,
			from,
			subject,
			to,
			cc,
			label,
			category,
			starred,
			attachment,
			filename,
			filetype,
			after,
			before,
		],
	);

	const isSearching = hasActiveFilters(searchFilters);

	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMailThreadsInfinite({
			category: activeCategory ?? undefined,
			limit: PAGE_SIZE,
			unreadOnly: activeView === "unread",
			readOnly: activeView === "read",
			q,
			from,
			subject,
			to,
			cc,
			label,
			starred,
			attachment,
			filename,
			filetype,
			after,
			before,
			accountIds,
		});

	// IntersectionObserver to auto-fetch next page
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
			// Escape clears selection
			if (e.key === "Escape" && selectedThreads.size > 0) {
				setSelectedThreads(new Set());
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [selectedThreads.size]);

	const queryClient = useQueryClient();
	const threads = data?.pages.flatMap((page) => page?.threads ?? []) ?? [];
	const total = data?.pages[0]?.total;

	const { suggestion, dismiss: dismissSuggestion } =
		useMergeSuggestions(threads);

	const searchTerms = useMemo(
		() => (q ? q.split(/\s+/).filter(Boolean) : []),
		[q],
	);

	const toInboxSearch = useCallback(
		(
			filters: SearchFilters,
			overrides?: { view?: "read"; category?: string | null },
		) => ({
			view:
				overrides && "view" in overrides ? overrides.view : (view ?? undefined),
			starred: filters.starred ?? undefined,
			attachment: filters.attachment ?? undefined,
			filename: filters.filename,
			filetype: filters.filetype,
			category:
				overrides && "category" in overrides
					? (overrides.category ?? undefined)
					: (filters.category ?? category ?? undefined),
			q: filters.q,
			from: filters.from,
			subject: filters.subject,
			to: filters.to,
			cc: filters.cc,
			label: filters.label,
			after: filters.after,
			before: filters.before,
		}),
		[view, category],
	);

	const handleFiltersChange = useCallback(
		(filters: SearchFilters) => {
			navigate({
				to: "/module/mail/inbox",
				search: toInboxSearch({
					...filters,
					category: filters.category ?? category ?? undefined,
				}),
				replace: true,
			});
		},
		[navigate, toInboxSearch, category],
	);

	const handleCategoryChange = useCallback(
		(cat: string | null) => {
			navigate({
				to: "/module/mail/inbox",
				search: toInboxSearch(searchFilters, { category: cat }),
				replace: true,
			});
		},
		[navigate, searchFilters, toInboxSearch],
	);

	// ── Keyboard navigation ──

	const switchView = useCallback(
		(v: "unread" | "read") => {
			navigate({
				to: "/module/mail/inbox",
				search: toInboxSearch(searchFilters, {
					view: v === "unread" ? undefined : v,
				}),
				replace: true,
			});
		},
		[navigate, toInboxSearch, searchFilters],
	);

	const headerCount = HEADER_ITEMS.length;
	const categoryCount = CATEGORIES.length + 1; // +1 for "All"

	const handleActivateHeader = useCallback(
		(index: number) => {
			const item = HEADER_ITEMS[index];
			if (item === "back") {
				navigate({ to: "/module/mail" });
			} else if (item === "attachments") {
				navigate({ to: "/module/mail/attachments" });
			} else if (item === "sent") {
				navigate({
					to: "/module/mail/sent",
					search: { starred: undefined, attachment: undefined },
				});
			} else if (item === "search") {
				setSearchOpen(true);
			} else if (item === "view") {
				switchView(activeView === "unread" ? "read" : "unread");
			}
		},
		[navigate, activeView, switchView],
	);

	const handleKeyboardSelectCategory = useCallback(
		(index: number) => {
			if (index === 0) {
				handleCategoryChange(null);
			} else {
				const cat = CATEGORIES[index - 1];
				if (cat) handleCategoryChange(cat.value);
			}
		},
		[handleCategoryChange],
	);

	const handleKeyboardOpenEmail = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (thread) {
				navigate({
					to: "/module/mail/inbox/$emailId",
					params: { emailId: thread.threadId },
					search: {
						view: view ?? undefined,
						category: category ?? undefined,
					},
				});
			}
		},
		[threads, navigate, view, category],
	);

	const handleKeyboardArchive = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeThreadFromPages(old, thread.threadId),
			);
			toast("Thread archived");
			api.mail.threads({ threadId: thread.threadId }).archive.post();
		},
		[threads, queryClient],
	);

	const handleKeyboardStar = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;
			const patch = { isStarred: !thread.isStarred };
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				updateThreadInPages(old, thread.threadId, patch),
			);
			api.mail.threads({ threadId: thread.threadId }).star.patch();
		},
		[threads, queryClient],
	);

	const handleKeyboardToggleRead = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeThreadFromPages(old, thread.threadId),
			);
			api.mail.threads({ threadId: thread.threadId }).read.patch();
		},
		[threads, queryClient],
	);

	const handleSelectThread = useCallback((threadId: string) => {
		setSelectedThreads((prev) => {
			const next = new Set(prev);
			if (next.has(threadId)) {
				next.delete(threadId);
			} else {
				next.add(threadId);
			}
			return next;
		});
	}, []);

	const handleKeyboardSelectThread = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;
			handleSelectThread(thread.threadId);
		},
		[threads, handleSelectThread],
	);

	const handleOpenSearch = useCallback(() => {
		setSearchOpen(true);
	}, []);

	const handleGoBack = useCallback(() => {
		navigate({ to: "/module/mail" });
	}, [navigate]);

	const handleNavigateAttachments = useCallback(() => {
		navigate({ to: "/module/mail/attachments" });
	}, [navigate]);

	const handleNavigateSent = useCallback(() => {
		navigate({
			to: "/module/mail/sent",
			search: { starred: undefined, attachment: undefined },
		});
	}, [navigate]);

	const handleToggleView = useCallback(() => {
		switchView(activeView === "unread" ? "read" : "unread");
	}, [activeView, switchView]);

	const handleToggleExpand = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;
			setExpandedThreadId((prev) =>
				prev === thread.threadId ? null : thread.threadId,
			);
		},
		[threads],
	);

	const handleCollapseExpand = useCallback(() => {
		setExpandedThreadId(null);
	}, []);

	const handlePeekEmail = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (thread) {
				setPeekedThreadId(thread.threadId);
			}
		},
		[threads],
	);

	const handleQuickReply = useCallback(
		(index: number) => {
			const thread = threads[index];
			if (!thread) return;

			const focusReply = () => {
				requestAnimationFrame(() => {
					const el =
						document.querySelector<HTMLTextAreaElement>("[data-quick-reply]");
					if (el) {
						el.focus({ preventScroll: true });
					}
				});
			};

			if (viewMode === "sidepanel") {
				setPeekedThreadId(thread.threadId);
				focusReply();
			} else {
				setExpandedThreadId(thread.threadId);
				focusReply();
			}
		},
		[threads, viewMode],
	);

	const keyboard = useInboxKeyboard({
		emailCount: threads.length,
		categoryCount,
		headerCount,
		disabled: searchOpen,
		onSelectCategory: handleKeyboardSelectCategory,
		onOpenEmail: handleKeyboardOpenEmail,
		onArchiveEmail: handleKeyboardArchive,
		onStarEmail: handleKeyboardStar,
		onToggleReadEmail: handleKeyboardToggleRead,
		onSelectEmail: handleKeyboardSelectThread,
		onActivateHeader: handleActivateHeader,
		onOpenSearch: handleOpenSearch,
		onCompose: useCallback(() => setComposeOpen(true), []),
		onNavigateAttachments: handleNavigateAttachments,
		onNavigateSent: handleNavigateSent,
		onToggleView: handleToggleView,
		onToggleViewMode: toggleViewMode,
		onGoBack: handleGoBack,
		viewMode,
		expandedThreadId,
		onToggleExpand: handleToggleExpand,
		onCollapseExpand: handleCollapseExpand,
		onPeekEmail: handlePeekEmail,
		onQuickReply: handleQuickReply,
	});

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

	// ── Multi-select & merge ──

	const mergeThreads = useMergeThreads();

	const handleSuggestedMerge = useCallback(() => {
		if (!suggestion) return;
		mergeThreads.mutate(Array.from(suggestion.threadIds), {
			onSuccess: () => {
				toast("Threads merged");
				dismissSuggestion();
				queryClient.invalidateQueries({ queryKey: mailKeys.all });
			},
			onError: () => {
				toast.error("Failed to merge threads");
			},
		});
	}, [suggestion, mergeThreads, queryClient, dismissSuggestion]);

	const handleMergeSelected = useCallback(() => {
		if (selectedThreads.size < 2) return;
		const ids = Array.from(selectedThreads);
		mergeThreads.mutate(ids, {
			onSuccess: (result) => {
				toast("Threads merged");
				setSelectedThreads(new Set());
				queryClient.invalidateQueries({ queryKey: mailKeys.all });
				if (result?.threadId) {
					navigate({
						to: "/module/mail/inbox/$emailId",
						params: { emailId: result.threadId },
						search: {
							view: view ?? undefined,
							category: category ?? undefined,
						},
					});
				}
			},
			onError: () => {
				toast.error("Failed to merge threads");
			},
		});
	}, [selectedThreads, mergeThreads, queryClient, navigate]);

	const handleBulkArchive = useCallback(() => {
		if (selectedThreads.size === 0) return;
		const ids = Array.from(selectedThreads);
		for (const threadId of ids) {
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeThreadFromPages(old, threadId),
			);
			api.mail.threads({ threadId }).archive.post();
		}
		toast(`${ids.length} thread${ids.length > 1 ? "s" : ""} archived`);
		setSelectedThreads(new Set());
	}, [selectedThreads, queryClient]);

	const handleBulkDelete = useCallback(() => {
		if (selectedThreads.size === 0) return;
		const ids = Array.from(selectedThreads);
		for (const threadId of ids) {
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeThreadFromPages(old, threadId),
			);
			api.mail.threads({ threadId }).delete();
		}
		toast(`${ids.length} thread${ids.length > 1 ? "s" : ""} deleted`);
		setSelectedThreads(new Set());
	}, [selectedThreads, queryClient]);

	const handleBulkToggleRead = useCallback(() => {
		if (selectedThreads.size === 0) return;
		const ids = Array.from(selectedThreads);
		for (const threadId of ids) {
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeThreadFromPages(old, threadId),
			);
			api.mail.threads({ threadId }).read.patch();
		}
		toast(
			`${ids.length} thread${ids.length > 1 ? "s" : ""} marked as ${activeView === "unread" ? "read" : "unread"}`,
		);
		setSelectedThreads(new Set());
	}, [selectedThreads, queryClient, activeView]);

	const handleBulkStar = useCallback(() => {
		if (selectedThreads.size === 0) return;
		const ids = Array.from(selectedThreads);
		for (const threadId of ids) {
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				updateThreadInPages(old, threadId, { isStarred: true }),
			);
			api.mail.threads({ threadId }).star.patch();
		}
		toast(`${ids.length} thread${ids.length > 1 ? "s" : ""} starred`);
		setSelectedThreads(new Set());
	}, [selectedThreads, queryClient]);

	// ── Drag-and-drop merge ──

	const handleDragStart = useCallback((threadId: string) => {
		setDragSourceId(threadId);
	}, []);

	const handleDrop = useCallback(
		(targetThreadId: string) => {
			if (!dragSourceId || dragSourceId === targetThreadId) return;
			mergeThreads.mutate([dragSourceId, targetThreadId], {
				onSuccess: () => {
					toast("Threads merged");
					setDragSourceId(null);
					queryClient.invalidateQueries({ queryKey: mailKeys.all });
				},
				onError: () => {
					toast.error("Failed to merge threads");
					setDragSourceId(null);
				},
			});
		},
		[dragSourceId, mergeThreads, queryClient],
	);

	const emptyMessage = isSearching
		? "No emails matching your search."
		: activeView === "read"
			? "No read emails yet."
			: "No unread emails.";

	const peekedThread =
		threads.find((t) => t.threadId === peekedThreadId) ?? null;

	const handleOpenPeekedDetail = useCallback(() => {
		if (!peekedThreadId) return;
		navigate({
			to: "/module/mail/inbox/$emailId",
			params: { emailId: peekedThreadId },
			search: { view: view ?? undefined, category: category ?? undefined },
		});
	}, [peekedThreadId, navigate, view, category]);

	const selectionRail = (
		<AnimatePresence>
			{selectedThreads.size > 0 && (
				<TooltipProvider sliding>
					<motion.div
						layout
						initial={{ opacity: 0, x: 8 }}
						animate={{ opacity: 1, x: 0 }}
						exit={{ opacity: 0, x: 8 }}
						transition={{
							duration: 0.2,
							ease: MOTION_CONSTANTS.EASE,
							layout: {
								duration: 0.2,
								ease: MOTION_CONSTANTS.EASE,
							},
						}}
						className={cn(
							"sticky top-8 z-20 w-10 flex-col items-center gap-1",
							viewMode === "sidepanel"
								? "flex mt-2"
								: "float-left -ml-15 mt-6 hidden xl:flex",
						)}
					>
						<motion.span
							layout
							className="font-mono text-[11px] font-semibold text-grey-2 mb-1 inline-flex tabular-nums overflow-hidden"
						>
							{String(selectedThreads.size)
								.split("")
								.map((char, i) => (
									<AnimatePresence mode="popLayout" key={i}>
										<motion.span
											key={char}
											initial={{ y: 10, opacity: 0 }}
											animate={{ y: 0, opacity: 1 }}
											exit={{ y: -10, opacity: 0 }}
											transition={{
												duration: 0.3,
												ease: MOTION_CONSTANTS.EASE,
											}}
											className="inline-block"
										>
											{char}
										</motion.span>
									</AnimatePresence>
								))}
						</motion.span>
						{selectedThreads.size >= 2 && (
							<motion.div
								layout
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: "auto" }}
								exit={{ opacity: 0, height: 0 }}
								transition={{
									duration: 0.2,
									ease: MOTION_CONSTANTS.EASE,
								}}
								className="overflow-hidden"
							>
								<Tooltip>
									<TooltipTrigger asChild>
										<button
											type="button"
											onClick={handleMergeSelected}
											disabled={mergeThreads.isPending}
											className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-foreground/5 transition-colors duration-150 cursor-pointer disabled:opacity-50"
										>
											<Merge className="size-3.5" />
										</button>
									</TooltipTrigger>
									<TooltipContent side="left">Merge threads</TooltipContent>
								</Tooltip>
							</motion.div>
						)}
						<motion.div layout>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={handleBulkArchive}
										className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-foreground/5 transition-colors duration-150 cursor-pointer"
									>
										<Archive className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left">Archive</TooltipContent>
							</Tooltip>
						</motion.div>
						<motion.div layout>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={handleBulkStar}
										className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-amber-500 hover:bg-amber-500/5 transition-colors duration-150 cursor-pointer"
									>
										<Star className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left">Star</TooltipContent>
							</Tooltip>
						</motion.div>
						<motion.div layout>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={handleBulkToggleRead}
										className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-foreground/5 transition-colors duration-150 cursor-pointer"
									>
										{activeView === "unread" ? (
											<MailOpen className="size-3.5" />
										) : (
											<Mail className="size-3.5" />
										)}
									</button>
								</TooltipTrigger>
								<TooltipContent side="left">
									{activeView === "unread" ? "Mark as read" : "Mark as unread"}
								</TooltipContent>
							</Tooltip>
						</motion.div>
						<motion.div layout>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={handleBulkDelete}
										className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-accent-red hover:bg-accent-red/5 transition-colors duration-150 cursor-pointer"
									>
										<Trash2 className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left">Delete</TooltipContent>
							</Tooltip>
						</motion.div>
						<motion.div layout>
							<Tooltip>
								<TooltipTrigger asChild>
									<button
										type="button"
										onClick={() => setSelectedThreads(new Set())}
										className="size-8 rounded-lg flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-foreground/5 transition-colors duration-150 cursor-pointer"
									>
										<X className="size-3.5" />
									</button>
								</TooltipTrigger>
								<TooltipContent side="left">Clear selection</TooltipContent>
							</Tooltip>
						</motion.div>
					</motion.div>
				</TooltipProvider>
			)}
		</AnimatePresence>
	);

	const threadListContent = (
		<>
			{viewMode !== "sidepanel" && selectionRail}
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
										highlightTerms={searchTerms}
										isFocused={
											keyboard.isActive &&
											keyboard.activeSection === "emails" &&
											keyboard.focusedEmailIndex === idx
										}
										focusRef={(el) => keyboard.emailRowRef(idx, el)}
										isSelected={selectedThreads.has(thread.threadId)}
										onSelect={handleSelectThread}
										onDragStartThread={handleDragStart}
										onDropThread={handleDrop}
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
															params: {
																emailId: thread.threadId,
															},
															search: {
																view: view ?? undefined,
																category: category ?? undefined,
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
		</>
	);

	return (
		<div
			className={cn(
				viewMode === "sidepanel"
					? "h-[calc(100dvh)] overflow-hidden flex flex-col"
					: "px-(--page-px) py-8 max-w-5xl mx-auto",
			)}
		>
			{/* Header — back link + search trigger + view toggle */}
			<motion.div
				ref={keyboard.headerRef}
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
					className={cn(
						"group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-3 hover:text-foreground transition-all duration-150 rounded-lg px-2 py-1 -mx-2",
						keyboard.isActive &&
							keyboard.activeSection === "header" &&
							keyboard.focusedHeaderIndex === 0 &&
							"ring-2 ring-foreground/30 text-foreground",
					)}
				>
					<ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
					Mail
				</Link>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={() => setComposeOpen(true)}
						className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-accent-red/40 bg-accent-red/10 hover:bg-accent-red/20 hover:border-accent-red/60 text-accent-red transition-all duration-150 cursor-pointer"
					>
						<PenSquare className="size-3" />
						<Kbd>C</Kbd>
					</button>

					<div className="w-px h-3.5 bg-border/40" />

					<Link
						to="/module/mail/attachments"
						className={cn(
							"inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 1 &&
								"ring-2 ring-foreground/30 text-foreground",
						)}
					>
						<Paperclip className="size-3" />
						<Kbd>A</Kbd>
					</Link>

					<Link
						to="/module/mail/sent"
						search={{ starred: undefined, attachment: undefined }}
						className={cn(
							"inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 2 &&
								"ring-2 ring-foreground/30 text-foreground",
						)}
					>
						<Send className="size-3" />
						<Kbd>S</Kbd>
					</Link>

					<button
						type="button"
						onClick={() => setSearchOpen(true)}
						className={cn(
							"inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 3 &&
								"ring-2 ring-foreground/30 text-foreground",
						)}
					>
						<Search className="size-3" />
						<Kbd>/</Kbd>
					</button>

					<div
						className={cn(
							"rounded-lg transition-all duration-150",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 4 &&
								"ring-2 ring-foreground/30",
						)}
					>
						<Tabs
							value={activeView}
							onValueChange={(v) => switchView(v as "unread" | "read")}
						>
							<TabsList size="sm">
								<TabsTrigger size="sm" value="unread">
									Unread
									{activeView === "read" && (
										<span className="ml-1">
											<Kbd>V</Kbd>
										</span>
									)}
								</TabsTrigger>
								<TabsTrigger size="sm" value="read">
									Read
									{activeView === "unread" && (
										<span className="ml-1">
											<Kbd>V</Kbd>
										</span>
									)}
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<button
									type="button"
									onClick={toggleViewMode}
									className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer"
								>
									{viewMode === "inline" ? (
										<Columns2 className="size-3.5" />
									) : (
										<Rows2 className="size-3.5" />
									)}
									<Kbd>P</Kbd>
								</button>
							</TooltipTrigger>
							<TooltipContent>
								{viewMode === "inline"
									? "Switch to side panel"
									: "Switch to inline"}
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					<div className="w-px h-3 bg-border/40" />

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

			{/* Category chips — always visible */}
			<motion.div
				ref={keyboard.categoriesRef}
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: MOTION_CONSTANTS.EASE }}
				className={cn(viewMode === "sidepanel" && "shrink-0 px-(--page-px)")}
			>
				<CategoryFilter
					value={activeCategory}
					onChange={handleCategoryChange}
					total={total}
					keyboardFocusIndex={
						keyboard.isActive && keyboard.activeSection === "categories"
							? keyboard.focusedCategoryIndex
							: undefined
					}
				/>
			</motion.div>

			{/* Merge suggestion pill */}
			<AnimatePresence>
				{suggestion && (
					<MergeSuggestionPill
						suggestion={suggestion}
						onMerge={handleSuggestedMerge}
						onDismiss={dismissSuggestion}
						isMerging={mergeThreads.isPending}
					/>
				)}
			</AnimatePresence>

			{/* Result count when searching */}
			{isSearching && !isPending && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="mt-3 font-mono text-[11px] text-grey-3"
				>
					{total === 1 ? "1 result" : `${total ?? 0} results`}
				</motion.p>
			)}

			{/* Thread list */}
			{isPending ? (
				<InboxSkeleton />
			) : threads.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="py-16 flex flex-col items-center gap-2"
				>
					<p className="font-serif text-[15px] text-grey-2 italic text-center">
						{emptyMessage}
					</p>
				</motion.div>
			) : viewMode === "sidepanel" ? (
				<div className="relative flex flex-1 overflow-hidden mt-4 px-(--page-px)">
					{/* Selection rail — absolutely positioned so it doesn't consume width */}
					<div
						className="absolute top-6 z-20"
						style={{ left: "calc(var(--page-px) - 52px)" }}
					>
						{selectionRail}
					</div>
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
							variant="inbox"
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
				activeCategory={activeCategory}
			/>

			<KeyboardShortcutBar
				shortcuts={
					viewMode === "inline" && expandedThreadId
						? INBOX_INLINE_SHORTCUTS
						: INBOX_SHORTCUTS
				}
				visible={!searchOpen}
			/>
			<ComposeSheet
				mode="compose"
				open={composeOpen}
				onOpenChange={setComposeOpen}
			/>
		</div>
	);
}

const SKELETON_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

function InboxSkeleton() {
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
