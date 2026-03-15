import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { TransactionRow } from "@/components/finance/TransactionRow";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFinanceTransactions } from "@/hooks/use-finance";
import { MOTION_CONSTANTS } from "@/components/constant";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/fin/transactions/",
)({
	component: TransactionsList,
});

const CATEGORIES = [
	"all",
	"software",
	"subscription",
	"food",
	"travel",
	"utilities",
	"shopping",
	"entertainment",
	"education",
	"health",
	"housing",
	"transport",
	"business",
	"other",
];

const SHORTCUTS = [
	[
		{ keys: ["["], label: "back" },
		{ keys: ["N"], label: "new" },
	],
];

function TransactionsList() {
	const navigate = useNavigate();
	const [type, setType] = useState<string | undefined>();
	const [category, setCategory] = useState<string | undefined>();
	const [merchant, setMerchant] = useState("");
	const [addOpen, setAddOpen] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useFinanceTransactions({
			type,
			category,
			merchant: merchant || undefined,
		});

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey
			)
				return;

			switch (e.key) {
				case "[":
					e.preventDefault();
					navigate({ to: "/module/fin" });
					break;
				case "n":
					e.preventDefault();
					setAddOpen(true);
					break;
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [navigate]);

	// Infinite scroll
	useEffect(() => {
		if (!bottomRef.current || !hasNextPage) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(bottomRef.current);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const transactions = data?.pages?.flatMap((p) => p.transactions) ?? [];
	const total = data?.pages?.[0]?.total ?? 0;

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
			<div className="px-(--page-px) max-w-5xl mx-auto pb-32 py-10">
				{/* Header */}
				<motion.div
					className="flex items-center justify-between"
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
				>
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate({ to: "/module/fin" })}
							className="text-grey-3 hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4" />
						</button>
						<h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase">
							transactions
						</h1>
						{!isLoading && (
							<span className="font-mono text-[11px] text-grey-3">
								{total}
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={() => setAddOpen(true)}
						className="font-mono text-[11px] text-grey-3 tracking-[0.02em] hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5"
					>
						<Plus className="size-3" />
						add
					</button>
				</motion.div>

				{/* Filters */}
				<motion.div
					className="flex flex-wrap items-center gap-2 mb-4 mt-8"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.08, ease: MOTION_CONSTANTS.EASE }}
				>
					{/* Type filter */}
					<Tabs
						value={type ?? "all"}
						onValueChange={(v) =>
							setType(v === "all" ? undefined : v)
						}
					>
						<TabsList size="sm">
							<TabsTrigger size="sm" value="all">
								All
							</TabsTrigger>
							<TabsTrigger size="sm" value="expense">
								Expense
							</TabsTrigger>
							<TabsTrigger size="sm" value="income">
								Income
							</TabsTrigger>
						</TabsList>
					</Tabs>

					{/* Category filter */}
					<Select
						value={category ?? "all"}
						onValueChange={(v) =>
							setCategory(v === "all" ? undefined : v)
						}
					>
						<SelectTrigger size="sm">
							<SelectValue placeholder="Category" />
						</SelectTrigger>
						<SelectContent>
							{CATEGORIES.map((c) => (
								<SelectItem key={c} value={c}>
									{c.charAt(0).toUpperCase() + c.slice(1)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>

					{/* Merchant search */}
					<Input
						placeholder="Search merchant..."
						value={merchant}
						onChange={(e) => setMerchant(e.target.value)}
						className="max-w-48 h-8 font-mono text-[11px]"
					/>
				</motion.div>

				{/* List */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, delay: 0.14, ease: MOTION_CONSTANTS.EASE }}
				>
					{isLoading ? (
						<div className="rounded-lg border border-border/40 overflow-hidden">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									key={i}
									className="flex items-center gap-3 px-4 py-3 border-b border-border/20"
								>
									<div className="h-3 w-12 bg-secondary/20 rounded animate-pulse" />
									<div className="size-2 bg-secondary/20 rounded-full animate-pulse" />
									<div className="h-3 flex-1 bg-secondary/20 rounded animate-pulse" />
									<div className="h-3 w-16 bg-secondary/20 rounded animate-pulse" />
								</div>
							))}
						</div>
					) : transactions.length === 0 ? (
						<div className="text-center py-16">
							<p className="font-body text-[14px] text-grey-3">
								No transactions yet
							</p>
							<p className="font-mono text-[11px] text-grey-3 mt-1">
								Add one manually or backfill from receipt emails
							</p>
						</div>
					) : (
						<div className="rounded-lg border border-border/40 overflow-hidden">
							{transactions.map((txn) => (
								<TransactionRow key={txn.id} txn={txn} />
							))}
						</div>
					)}

					{/* Infinite scroll trigger */}
					<div ref={bottomRef} className="h-8" />
					{isFetchingNextPage && (
						<div className="text-center py-4">
							<span className="font-mono text-[11px] text-grey-3">
								Loading more...
							</span>
						</div>
					)}
				</motion.div>
			</div>
			</ScrollArea>

			<AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} />
			<KeyboardShortcutBar shortcuts={SHORTCUTS} />
		</>
	);
}
