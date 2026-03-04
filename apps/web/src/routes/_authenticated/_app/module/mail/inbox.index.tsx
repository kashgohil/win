import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import { CATEGORIES } from "@/components/mail/category-colors";
import { CategoryFilter } from "@/components/mail/CategoryFilter";
import { EmailRow, groupEmailsByTime } from "@/components/mail/EmailRow";
import {
	INBOX_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import {
	hasActiveFilters,
	SearchCommand,
	SearchFilterChips,
	type SearchFilters,
} from "@/components/mail/SearchBar";
import { Kbd } from "@/components/ui/kbd";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInboxKeyboard } from "@/hooks/use-inbox-keyboard";
import { mailKeys, useMailEmailsInfinite } from "@/hooks/use-mail";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Paperclip, Search } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const PAGE_SIZE = 30;
const HEADER_ITEMS = ["back", "attachments", "search", "view"] as const;

/* ── Cache helpers (shared with EmailRow) ── */

type EmailPageData = {
	emails: Array<{ id: string; [key: string]: unknown }>;
	total?: number;
};

type PaginatedEmailData = {
	pages: EmailPageData[];
};

function removeEmailFromPages(old: unknown, emailId: string): unknown {
	const data = old as PaginatedEmailData | undefined;
	if (!data?.pages) return old;
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			emails: page.emails.filter((e) => e.id !== emailId),
			total: Math.max(0, (page.total ?? 0) - 1),
		})),
	};
}

function updateEmailInPages(
	old: unknown,
	emailId: string,
	patch: object,
): unknown {
	const data = old as PaginatedEmailData | undefined;
	if (!data?.pages) return old;
	return {
		...data,
		pages: data.pages.map((page) => ({
			...page,
			emails: page.emails.map((e) =>
				e.id === emailId ? { ...e, ...patch } : e,
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
		useMailEmailsInfinite({
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
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const queryClient = useQueryClient();
	const emails = data?.pages.flatMap((page) => page?.emails ?? []) ?? [];
	const total = data?.pages[0]?.total;

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
			const email = emails[index];
			if (email) {
				navigate({
					to: "/module/mail/inbox/$emailId",
					params: { emailId: email.id },
					search: {
						view: view ?? undefined,
						category: category ?? undefined,
					},
				});
			}
		},
		[emails, navigate, view, category],
	);

	const handleKeyboardArchive = useCallback(
		(index: number) => {
			const email = emails[index];
			if (!email) return;
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeEmailFromPages(old, email.id),
			);
			toast("Email archived");
			api.mail.emails({ id: email.id }).archive.post();
		},
		[emails, queryClient],
	);

	const handleKeyboardStar = useCallback(
		(index: number) => {
			const email = emails[index];
			if (!email) return;
			const patch = { isStarred: !email.isStarred };
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				updateEmailInPages(old, email.id, patch),
			);
			api.mail.emails({ id: email.id }).star.patch();
		},
		[emails, queryClient],
	);

	const handleKeyboardToggleRead = useCallback(
		(index: number) => {
			const email = emails[index];
			if (!email) return;
			queryClient.setQueriesData({ queryKey: mailKeys.all }, (old: unknown) =>
				removeEmailFromPages(old, email.id),
			);
			api.mail.emails({ id: email.id }).read.patch();
		},
		[emails, queryClient],
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

	const handleToggleView = useCallback(() => {
		switchView(activeView === "unread" ? "read" : "unread");
	}, [activeView, switchView]);

	const keyboard = useInboxKeyboard({
		emailCount: emails.length,
		categoryCount,
		headerCount,
		disabled: searchOpen,
		onSelectCategory: handleKeyboardSelectCategory,
		onOpenEmail: handleKeyboardOpenEmail,
		onArchiveEmail: handleKeyboardArchive,
		onStarEmail: handleKeyboardStar,
		onToggleReadEmail: handleKeyboardToggleRead,
		onActivateHeader: handleActivateHeader,
		onOpenSearch: handleOpenSearch,
		onNavigateAttachments: handleNavigateAttachments,
		onToggleView: handleToggleView,
		onGoBack: handleGoBack,
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

	const emptyMessage = isSearching
		? "No emails matching your search."
		: activeView === "read"
			? "No read emails yet."
			: "No unread emails.";

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
			{/* Header — back link + search trigger + view toggle */}
			<motion.div
				ref={keyboard.headerRef}
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
				className="mb-6 flex items-center justify-between"
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

				<div className="flex items-center gap-3">
					<Link
						to="/module/mail/attachments"
						className={cn(
							"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 1 &&
								"ring-2 ring-foreground/30 text-foreground",
						)}
					>
						<Paperclip className="size-3" />
						<span className="font-body text-[12px]">Attachments</span>
						<Kbd>A</Kbd>
					</Link>

					<button
						type="button"
						onClick={() => setSearchOpen(true)}
						className={cn(
							"inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 2 &&
								"ring-2 ring-foreground/30 text-foreground",
						)}
					>
						<Search className="size-3" />
						<span className="font-body text-[12px]">Search</span>
						<Kbd>K</Kbd>
					</button>

					<div
						className={cn(
							"rounded-lg transition-all duration-150",
							keyboard.isActive &&
								keyboard.activeSection === "header" &&
								keyboard.focusedHeaderIndex === 3 &&
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
									{activeView === "read" && <Kbd>V</Kbd>}
								</TabsTrigger>
								<TabsTrigger size="sm" value="read">
									Read
									{activeView === "unread" && <Kbd>V</Kbd>}
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>

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
					className="mb-4"
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

			{/* Email list */}
			{isPending ? (
				<InboxSkeleton />
			) : emails.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="py-16 flex flex-col items-center gap-2"
				>
					<p className="font-serif text-[15px] text-grey-2 italic text-center">
						{emptyMessage}
					</p>
				</motion.div>
			) : (
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
						return groupEmailsByTime(emails).map((cluster) => (
							<div key={cluster.label ?? "today"}>
								{cluster.label && (
									<div className="pt-6 pb-2">
										<span className="font-body text-[13px] text-grey-3">
											{cluster.label}
										</span>
									</div>
								)}
								{cluster.emails.map((email) => {
									const idx = flatIndex++;
									return (
										<EmailRow
											key={email.id}
											email={email}
											highlightTerms={searchTerms}
											isFocused={
												keyboard.isActive &&
												keyboard.activeSection === "emails" &&
												keyboard.focusedEmailIndex === idx
											}
											focusRef={(el) => keyboard.emailRowRef(idx, el)}
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
			)}

			{/* Search command dialog */}
			<SearchCommand
				open={searchOpen}
				onOpenChange={setSearchOpen}
				filters={searchFilters}
				onFiltersChange={handleFiltersChange}
				activeCategory={activeCategory}
			/>

			<KeyboardShortcutBar shortcuts={INBOX_SHORTCUTS} visible={!searchOpen} />
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
