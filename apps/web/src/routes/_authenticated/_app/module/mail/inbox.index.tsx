import { MOTION_CONSTANTS } from "@/components/constant";
import { CategoryFilter } from "@/components/mail/CategoryFilter";
import { EmailRow, groupEmailsByTime } from "@/components/mail/EmailRow";
import { useMailEmailsInfinite } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailCategory } from "@wingmnn/types";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";

const PAGE_SIZE = 30;

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

type InboxSearch = {
	categories?: EmailCategory[];
	view?: "read";
	showAll?: boolean;
};

function parseCategories(raw: unknown): EmailCategory[] | undefined {
	if (typeof raw === "string" && VALID_CATEGORIES.has(raw))
		return [raw as EmailCategory];
	if (Array.isArray(raw)) {
		const valid = raw.filter(
			(v): v is EmailCategory =>
				typeof v === "string" && VALID_CATEGORIES.has(v),
		);
		return valid.length > 0 ? valid : undefined;
	}
	return undefined;
}

export const Route = createFileRoute("/_authenticated/_app/module/mail/inbox/")(
	{
		component: MailInbox,
		validateSearch: (search: Record<string, unknown>): InboxSearch => ({
			categories: parseCategories(search.categories),
			view: search.view === "read" ? "read" : undefined,
			showAll:
				search.showAll === true || search.showAll === "true" ? true : undefined,
		}),
	},
);

function MailInbox() {
	const { categories = [], view, showAll } = Route.useSearch();
	const navigate = useNavigate();
	const activeView = view ?? "unread";
	const sentinelRef = useRef<HTMLDivElement>(null);

	// Default to urgent when no explicit selection
	const activeCategory: EmailCategory | null = showAll
		? null
		: categories.length > 0
			? categories[0]
			: "urgent";

	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMailEmailsInfinite({
			category: activeCategory ?? undefined,
			limit: PAGE_SIZE,
			unreadOnly: activeView === "unread",
			readOnly: activeView === "read",
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

	const emails = data?.pages.flatMap((page) => page?.emails ?? []) ?? [];
	const total = data?.pages[0]?.total;

	const handleCategoryChange = (cat: EmailCategory | null) => {
		navigate({
			to: "/module/mail/inbox",
			search: {
				...(cat === null ? { showAll: true } : { categories: [cat] }),
				...(view ? { view } : {}),
			},
			replace: true,
		});
	};

	const switchView = (v: "unread" | "read") => {
		navigate({
			to: "/module/mail/inbox",
			search: {
				...(activeCategory !== null
					? { categories: [activeCategory] }
					: { showAll: true }),
				view: v === "unread" ? undefined : v,
			},
			replace: true,
		});
	};

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
			{/* Header — back link + view toggle */}
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
				<div className="flex items-center gap-0.5 rounded-md bg-secondary/30 p-0.5">
					<button
						type="button"
						onClick={() => switchView("unread")}
						className={cn(
							"px-2.5 py-1 rounded-sm font-mono text-[11px] cursor-pointer transition-colors duration-150",
							activeView === "unread"
								? "bg-background text-foreground shadow-xs"
								: "text-grey-3 hover:text-grey-2",
						)}
					>
						Unread
					</button>
					<button
						type="button"
						onClick={() => switchView("read")}
						className={cn(
							"px-2.5 py-1 rounded-sm font-mono text-[11px] cursor-pointer transition-colors duration-150",
							activeView === "read"
								? "bg-background text-foreground shadow-xs"
								: "text-grey-3 hover:text-grey-2",
						)}
					>
						Read
					</button>
				</div>
			</motion.div>

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
						{activeCategory
							? "No emails matching filters."
							: activeView === "read"
								? "No read emails yet."
								: "No unread emails."}
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
								<EmailRow key={email.id} email={email} />
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
