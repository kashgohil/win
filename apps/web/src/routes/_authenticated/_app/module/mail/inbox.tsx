import { CategoryFilter } from "@/components/mail/CategoryFilter";
import { EmailRow, groupEmailsByTime } from "@/components/mail/EmailRow";
import { useMailEmails } from "@/hooks/use-mail";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailCategory } from "@wingmnn/types";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

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
	category?: EmailCategory;
	offset?: number;
};

export const Route = createFileRoute("/_authenticated/_app/module/mail/inbox")({
	component: MailInbox,
	validateSearch: (search: Record<string, unknown>): InboxSearch => ({
		category:
			typeof search.category === "string" &&
			VALID_CATEGORIES.has(search.category)
				? (search.category as EmailCategory)
				: undefined,
		offset: typeof search.offset === "number" ? search.offset : undefined,
	}),
});

function MailInbox() {
	const { category, offset } = Route.useSearch();
	const navigate = useNavigate();

	const { data, isPending } = useMailEmails({
		category,
		limit: PAGE_SIZE,
		offset: offset ?? 0,
	});

	const handleCategoryChange = (cat: EmailCategory | undefined) => {
		navigate({
			to: "/module/mail/inbox",
			search: { category: cat, offset: undefined },
			replace: true,
		});
	};

	const handleLoadMore = () => {
		navigate({
			to: "/module/mail/inbox",
			search: { category, offset: (offset ?? 0) + PAGE_SIZE },
			replace: true,
		});
	};

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
			{/* Back link */}
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
				className="mb-6"
			>
				<Link
					to="/module/mail"
					className="group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-3 hover:text-foreground transition-colors duration-150"
				>
					<ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
					Mail
				</Link>
			</motion.div>

			{/* Section rule with integrated filter */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
			>
				<CategoryFilter
					value={category}
					onChange={handleCategoryChange}
					total={data?.total}
				/>
			</motion.div>

			{/* Email list */}
			{isPending ? (
				<InboxSkeleton />
			) : !data || data.emails.length === 0 ? (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="py-16 flex flex-col items-center gap-2"
				>
					<p className="font-serif text-[15px] text-grey-2 italic text-center">
						{category ? `No emails in ${category}.` : "No emails yet."}
					</p>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.08,
						ease: [0.22, 1, 0.36, 1],
					}}
					className="mt-4"
				>
					{groupEmailsByTime(data.emails).map((cluster) => (
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

					{/* Load more */}
					{data.hasMore && (
						<div className="flex justify-center pt-6 pb-8">
							<button
								type="button"
								onClick={handleLoadMore}
								className="font-body text-[13px] text-grey-2 hover:text-foreground px-4 py-2 rounded-full border border-border/40 hover:border-border/60 transition-colors duration-150 cursor-pointer"
							>
								Load more
							</button>
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
