import { MOTION_CONSTANTS } from "@/components/constant";
import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { RecurringCard } from "@/components/finance/RecurringCard";
import { TransactionRow } from "@/components/finance/TransactionRow";
import {
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useBackfillReceipts,
	useFinanceRecurring,
	useFinanceStats,
	useFinanceTransactions,
} from "@/hooks/use-finance";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	DollarSign,
	List,
	Plus,
	Receipt,
	RefreshCw,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/module/fin/")({
	component: FinHub,
});

const FIN_HUB_SHORTCUTS = [
	[
		{ keys: ["T"], label: "transactions" },
		{ keys: ["R"], label: "recurring" },
		{ keys: ["N"], label: "new transaction" },
	],
];

function formatCents(cents: number) {
	return (cents / 100).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}

function FinHub() {
	const navigate = useNavigate();
	const { data: stats, isLoading: statsLoading } = useFinanceStats();
	const { data: recurringData, isLoading: recurringLoading } =
		useFinanceRecurring();
	const { data: txnData, isLoading: txnLoading } = useFinanceTransactions({
		limit: 10,
	});

	const isLoading = statsLoading || recurringLoading || txnLoading;

	const [addOpen, setAddOpen] = useState(false);

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
				case "t":
					e.preventDefault();
					navigate({ to: "/module/fin/transactions" });
					break;
				case "r":
					e.preventDefault();
					navigate({ to: "/module/fin/recurring" });
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

	const transactions = txnData?.pages?.flatMap((p) => p.transactions) ?? [];
	const recurring = recurringData?.recurring ?? [];
	const activeRecurring = recurring.filter((r) => r.active);

	const monthlyBurn = useMemo(() => {
		return activeRecurring.reduce((sum, r) => {
			switch (r.interval) {
				case "weekly":
					return sum + r.expectedAmount * 4;
				case "monthly":
					return sum + r.expectedAmount;
				case "quarterly":
					return sum + Math.round(r.expectedAmount / 3);
				case "yearly":
					return sum + Math.round(r.expectedAmount / 12);
				default:
					return sum;
			}
		}, 0);
	}, [activeRecurring]);

	/* ── Loading ── */
	if (isLoading) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<FinHeader onAdd={() => setAddOpen(true)} />
					<div className="animate-pulse mt-10 space-y-8">
						<div className="h-5 w-72 bg-secondary/30 rounded" />
						<div className="space-y-3">
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className="rounded-lg border border-border/20 p-4"
								>
									<div className="h-4 w-48 bg-secondary/30 rounded" />
									<div className="h-3 w-72 bg-secondary/20 rounded mt-2" />
								</div>
							))}
						</div>
					</div>
				</div>
			</ScrollArea>
		);
	}

	const hasData = transactions.length > 0 || stats;

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto pb-32">
					<FinHeader onAdd={() => setAddOpen(true)} />

					{/* Briefing sentence */}
					<motion.div
						className="mt-8"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<BriefingSentence
							stats={stats}
							transactionCount={transactions.length}
							recurringCount={activeRecurring.length}
							monthlyBurn={monthlyBurn}
						/>
					</motion.div>

					<div className="mt-8 flex flex-col gap-5">
						{/* Stats widget */}
						{stats && (
							<motion.div
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.5,
									delay: 0.12,
									ease: MOTION_CONSTANTS.EASE,
								}}
							>
								<StatsGrid stats={stats} monthlyBurn={monthlyBurn} />
							</motion.div>
						)}

						{/* Quick nav */}
						<motion.div
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.5,
								delay: 0.16,
								ease: MOTION_CONSTANTS.EASE,
							}}
						>
							<div className="flex items-center gap-2 flex-wrap">
								<QuickNavPill
									to="/module/fin/transactions"
									icon={<List className="size-3.5" />}
									label="Transactions"
									shortcut="T"
								/>
								<QuickNavPill
									to="/module/fin/recurring"
									icon={<RefreshCw className="size-3.5" />}
									label="Recurring"
									shortcut="R"
								/>
								<button
									type="button"
									onClick={() => setAddOpen(true)}
									className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/40 hover:border-border/70 bg-secondary/5 hover:bg-secondary/15 transition-all duration-150 cursor-pointer"
								>
									<Plus className="size-3.5 text-grey-2 group-hover:text-foreground transition-colors" />
									<span className="font-body text-[13px] text-foreground/70 group-hover:text-foreground transition-colors">
										Add
									</span>
									<span className="font-mono text-[10px] text-grey-3/60 border border-border/30 rounded px-1 py-px leading-none">
										N
									</span>
								</button>
							</div>
						</motion.div>

						{/* Category breakdown */}
						{stats && stats.byCategory.length > 0 && (
							<WidgetSection
								title="Spending by category"
								delay={0.2}
							>
								<CategoryBreakdown
									items={stats.byCategory}
									total={stats.totalExpenses}
								/>
							</WidgetSection>
						)}

						{/* Recent transactions */}
						{transactions.length > 0 && (
							<WidgetSection
								title="Recent transactions"
								delay={0.24}
								action={
									<Link
										to="/module/fin/transactions"
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors flex items-center gap-1"
									>
										View all
										<ArrowRight className="size-2.5" />
									</Link>
								}
							>
								<div className="rounded-lg border border-border/40 overflow-hidden -mx-5">
									{transactions.slice(0, 8).map((txn) => (
										<TransactionRow key={txn.id} txn={txn} />
									))}
								</div>
							</WidgetSection>
						)}

						{/* Recurring */}
						{activeRecurring.length > 0 && (
							<WidgetSection
								title={`Recurring expenses · ${formatCents(monthlyBurn)}/mo`}
								delay={0.28}
								action={
									<Link
										to="/module/fin/recurring"
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors flex items-center gap-1"
									>
										View all
										<ArrowRight className="size-2.5" />
									</Link>
								}
							>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 -mx-5 px-5">
									{activeRecurring.slice(0, 6).map((r) => (
										<RecurringCard key={r.id} item={r} />
									))}
								</div>
							</WidgetSection>
						)}
					</div>

					{/* Empty state */}
					{!hasData && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								delay: 0.15,
								duration: 0.5,
								ease: MOTION_CONSTANTS.EASE,
							}}
							className="mt-16 flex flex-col items-center text-center"
						>
							<div className="size-14 rounded-full bg-foreground/5 flex items-center justify-center mb-5">
								<Receipt className="size-6 text-foreground/30" />
							</div>
							<h2 className="font-display text-[20px] text-foreground tracking-[0.01em]">
								No transactions yet
							</h2>
							<p className="font-body text-[14px] text-grey-2 mt-2 max-w-sm leading-relaxed">
								Add a transaction manually, upload a receipt, or
								backfill from your receipt emails to get started.
							</p>
							<div className="flex items-center gap-4 mt-6">
								<button
									type="button"
									onClick={() => setAddOpen(true)}
									className="font-mono text-[11px] tracking-[0.02em] hover:text-foreground transition-colors cursor-pointer flex items-center gap-1.5 text-grey-3"
								>
									<Plus className="size-3" />
									add transaction →
								</button>
								<BackfillButton />
							</div>
						</motion.div>
					)}
				</div>
			</ScrollArea>

			<AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} />
			<KeyboardShortcutBar shortcuts={FIN_HUB_SHORTCUTS} />
		</>
	);
}

/* ── Header ── */

function FinHeader({ onAdd }: { onAdd: () => void }) {
	return (
		<motion.header
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase">
						finances
					</h1>
					<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-0.5">
						Track expenses, income, and recurring charges
					</p>
				</div>
				<div className="shrink-0 mt-3 flex items-center gap-4">
					<BackfillButton />
					<Button
						variant="outline"
						size="sm"
						onClick={onAdd}
						className="gap-1.5"
					>
						<Plus className="size-3" />
						<Kbd>N</Kbd>
					</Button>
				</div>
			</div>
		</motion.header>
	);
}

/* ── Backfill button ── */

function BackfillButton() {
	const backfill = useBackfillReceipts();

	return (
		<button
			type="button"
			onClick={() => {
				backfill.mutate(undefined, {
					onSuccess: (data) =>
						toast("Backfill complete", {
							description: `${data.created} transactions extracted, ${data.skipped} already existed`,
						}),
					onError: () => toast.error("Backfill failed"),
				});
			}}
			disabled={backfill.isPending}
			className="font-mono text-[11px] text-grey-3 tracking-[0.02em] hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
		>
			<DollarSign className="size-3" />
			{backfill.isPending ? "Processing..." : "Backfill receipts"}
		</button>
	);
}

/* ── Briefing sentence ── */

function BriefingSentence({
	stats,
	transactionCount,
	recurringCount,
	monthlyBurn,
}: {
	stats:
		| {
				totalExpenses: number;
				totalIncome: number;
				netBalance: number;
		  }
		| undefined;
	transactionCount: number;
	recurringCount: number;
	monthlyBurn: number;
}) {
	if (!stats && transactionCount === 0) {
		return (
			<p className="font-serif text-[15px] text-foreground/50 italic leading-relaxed">
				No financial data yet. Add your first transaction to get started.
			</p>
		);
	}

	return (
		<p className="font-serif text-[16px] text-foreground/60 leading-relaxed">
			{stats && stats.netBalance !== 0 && (
				<>
					Net balance is{" "}
					<span
						className={cn(
							"font-medium",
							stats.netBalance >= 0
								? "text-green-500"
								: "text-red-500",
						)}
					>
						{formatCents(stats.netBalance)}
					</span>
					.{" "}
				</>
			)}
			{stats && stats.totalExpenses > 0 && (
				<>
					<span className="font-medium text-foreground">
						{formatCents(stats.totalExpenses)}
					</span>{" "}
					spent across{" "}
					<span className="font-medium text-foreground">
						{transactionCount}
					</span>{" "}
					transactions.{" "}
				</>
			)}
			{recurringCount > 0 && (
				<>
					<span className="font-medium text-foreground">
						{recurringCount}
					</span>{" "}
					active subscriptions at{" "}
					<span className="font-medium text-foreground">
						{formatCents(monthlyBurn)}
					</span>
					/mo.
				</>
			)}
		</p>
	);
}

/* ── Stats grid ── */

function StatsGrid({
	stats,
	monthlyBurn,
}: {
	stats: {
		totalExpenses: number;
		totalIncome: number;
		netBalance: number;
	};
	monthlyBurn: number;
}) {
	const items = [
		{
			label: "Expenses",
			value: formatCents(stats.totalExpenses),
			icon: TrendingDown,
			accent: false,
		},
		{
			label: "Income",
			value: formatCents(stats.totalIncome),
			icon: TrendingUp,
			accent: false,
		},
		{
			label: "Net",
			value: formatCents(stats.netBalance),
			icon: DollarSign,
			accent: stats.netBalance < 0,
		},
		{
			label: "Recurring/mo",
			value: formatCents(monthlyBurn),
			icon: RefreshCw,
			accent: false,
		},
	];

	return (
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
			{items.map((item) => (
				<div
					key={item.label}
					className="rounded-xl border border-border/40 bg-background px-4 py-3.5"
				>
					<div className="flex items-center gap-2 mb-2">
						<item.icon className="size-3 text-grey-3" />
						<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
							{item.label}
						</span>
					</div>
					<div
						className={cn(
							"font-display text-[1.35rem] leading-none tabular-nums",
							item.accent ? "text-red-500" : "text-foreground",
						)}
					>
						{item.value}
					</div>
				</div>
			))}
		</div>
	);
}

/* ── Widget section ── */

function WidgetSection({
	title,
	delay,
	action,
	children,
}: {
	title: string;
	delay: number;
	action?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<motion.div
			className="mt-8 rounded-xl border border-border/40 bg-background"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.5,
				delay,
				ease: MOTION_CONSTANTS.EASE,
			}}
		>
			<div className="flex items-center justify-between px-5 py-4">
				<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
					{title}
				</span>
				{action}
			</div>
			<div className="px-5 pb-4">{children}</div>
		</motion.div>
	);
}

/* ── Category breakdown ── */

function CategoryBreakdown({
	items,
	total,
}: {
	items: { category: string; total: number; count: number }[];
	total: number;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			{items.slice(0, 8).map((item) => {
				const pct = total > 0 ? (item.total / total) * 100 : 0;
				return (
					<Link
						key={item.category}
						to="/module/fin/transactions"
						search={{ category: item.category } as any}
						className="group flex items-center gap-3 rounded-md px-2 py-1.5 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
					>
						<span className="font-body text-[13px] text-foreground tracking-[0.01em] w-24 truncate capitalize">
							{item.category}
						</span>
						<div className="flex-1 h-1.5 bg-secondary/10 rounded-full overflow-hidden">
							<div
								className="h-full bg-foreground/20 rounded-full transition-all"
								style={{
									width: `${Math.min(pct, 100)}%`,
								}}
							/>
						</div>
						<span className="font-mono text-[11px] text-grey-3 tabular-nums w-16 text-right">
							{formatCents(item.total)}
						</span>
						<span className="font-mono text-[10px] text-foreground/40 tabular-nums w-8 text-right">
							{pct.toFixed(0)}%
						</span>
						<ArrowRight className="size-3 text-grey-3 shrink-0 -mr-5 group-hover:mr-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
					</Link>
				);
			})}
		</div>
	);
}

/* ── Quick nav pill ── */

function QuickNavPill({
	to,
	icon,
	label,
	shortcut,
}: {
	to: string;
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
}) {
	return (
		<Link
			to={to}
			className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/40 hover:border-border/70 bg-secondary/5 hover:bg-secondary/15 transition-all duration-150"
		>
			<span className="text-grey-2 group-hover:text-foreground transition-colors">
				{icon}
			</span>
			<span className="font-body text-[13px] text-foreground/70 group-hover:text-foreground transition-colors">
				{label}
			</span>
			{shortcut && (
				<span className="font-mono text-[10px] text-grey-3/60 border border-border/30 rounded px-1 py-px leading-none">
					{shortcut}
				</span>
			)}
		</Link>
	);
}
