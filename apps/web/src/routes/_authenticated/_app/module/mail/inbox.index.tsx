import { MOTION_CONSTANTS } from "@/components/constant";
import { CategoryFilter } from "@/components/mail/CategoryFilter";
import { EmailRow, groupEmailsByTime } from "@/components/mail/EmailRow";
import {
	hasActiveFilters,
	SearchCommand,
	SearchFilterChips,
	type SearchFilters,
} from "@/components/mail/SearchBar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMailEmailsInfinite } from "@/hooks/use-mail";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const PAGE_SIZE = 30;

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
		after,
		before,
	} = Route.useSearch();
	const navigate = useNavigate();
	const activeView = view ?? "unread";
	const sentinelRef = useRef<HTMLDivElement>(null);
	const [searchOpen, setSearchOpen] = useState(false);

	const activeCategory = category ?? null;

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
			after,
			before,
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

	const switchView = (v: "unread" | "read") => {
		navigate({
			to: "/module/mail/inbox",
			search: toInboxSearch(searchFilters, {
				view: v === "unread" ? undefined : v,
			}),
			replace: true,
		});
	};

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
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
				className="mb-6 flex items-center justify-between"
			>
				<Link
					to="/module/mail"
					className="group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-3 hover:text-foreground transition-colors duration-150"
				>
					<ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
					Mail
				</Link>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => setSearchOpen(true)}
						className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer"
					>
						<Search className="size-3" />
						<span className="font-body text-[12px]">Search</span>
						<kbd className="font-mono text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded ml-1">
							{navigator.platform?.includes("Mac") ? "\u2318K" : "Ctrl+K"}
						</kbd>
					</button>

					<Tabs
						value={activeView}
						onValueChange={(v) => switchView(v as "unread" | "read")}
					>
						<TabsList size="sm">
							<TabsTrigger size="sm" value="unread">
								Unread
							</TabsTrigger>
							<TabsTrigger size="sm" value="read">
								Read
							</TabsTrigger>
						</TabsList>
					</Tabs>
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
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: MOTION_CONSTANTS.EASE }}
			>
				<CategoryFilter
					value={activeCategory}
					onChange={handleCategoryChange}
					total={total}
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
					{groupEmailsByTime(emails).map((cluster) => (
						<div key={cluster.label ?? "today"}>
							{cluster.label && (
								<div className="pt-6 pb-2">
									<span className="font-body text-[13px] text-grey-3">
										{cluster.label}
									</span>
								</div>
							)}
							{cluster.emails.map((email) => (
								<EmailRow
									key={email.id}
									email={email}
									highlightTerms={searchTerms}
								/>
							))}
						</div>
					))}

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
		</div>
	);
}

function InboxSkeleton() {
	return (
		<div className="animate-pulse mt-4">
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="flex items-start gap-3 py-3.5">
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
