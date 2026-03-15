import { AddTransactionDialog } from "@/components/finance/AddTransactionDialog";
import { RecurringCard } from "@/components/finance/RecurringCard";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { useFinanceRecurring } from "@/hooks/use-finance";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/fin/recurring/",
)({
	component: RecurringList,
});

const SHORTCUTS = [
	[
		{ keys: ["["], label: "back" },
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

function RecurringList() {
	const navigate = useNavigate();
	const { data, isLoading } = useFinanceRecurring();
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

	const recurring = data?.recurring ?? [];
	const active = recurring.filter((r) => r.active);
	const inactive = recurring.filter((r) => !r.active);

	// Monthly burn from active subscriptions
	const monthlyBurn = useMemo(() => {
		return active.reduce((sum, r) => {
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
	}, [active]);

	return (
		<>
			<div className="px-(--page-px) max-w-5xl mx-auto pb-16">
				{/* Header */}
				<div className="flex items-center justify-between py-6">
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => navigate({ to: "/module/fin" })}
							className="text-grey-3 hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-4" />
						</button>
						<h1 className="font-display text-[1.5rem] text-foreground">
							Recurring expenses
						</h1>
					</div>
				</div>

				{/* Monthly burn */}
				{active.length > 0 && (
					<div className="rounded-lg border border-border/40 px-4 py-3 mb-6">
						<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
							Estimated monthly burn
						</div>
						<div className="font-display text-[1.5rem] text-foreground mt-1 tabular-nums">
							{formatCents(monthlyBurn)}
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className="rounded-lg border border-border/40 px-4 py-3.5"
							>
								<div className="h-4 w-32 bg-secondary/20 rounded animate-pulse" />
								<div className="h-3 w-20 bg-secondary/20 rounded animate-pulse mt-2" />
							</div>
						))}
					</div>
				) : recurring.length === 0 ? (
					<div className="text-center py-16">
						<p className="font-body text-[14px] text-grey-3">
							No recurring expenses detected
						</p>
						<p className="font-mono text-[11px] text-grey-3 mt-1">
							They&apos;ll appear here as receipt emails are processed
						</p>
					</div>
				) : (
					<>
						{/* Active */}
						{active.length > 0 && (
							<div>
								<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
									Active ({active.length})
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{active.map((r) => (
										<RecurringCard key={r.id} item={r} />
									))}
								</div>
							</div>
						)}

						{/* Inactive */}
						{inactive.length > 0 && (
							<div className="mt-8">
								<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
									Paused ({inactive.length})
								</h3>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
									{inactive.map((r) => (
										<RecurringCard key={r.id} item={r} />
									))}
								</div>
							</div>
						)}
					</>
				)}
			</div>

			<AddTransactionDialog open={addOpen} onOpenChange={setAddOpen} />
			<KeyboardShortcutBar shortcuts={SHORTCUTS} />
		</>
	);
}
