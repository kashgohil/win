function formatCents(cents: number) {
	return (cents / 100).toLocaleString("en-US", {
		style: "currency",
		currency: "USD",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	});
}

interface CategoryRow {
	category: string;
	total: number;
	count: number;
}

export function BalanceSheet({
	byCategory,
	totalExpenses,
}: {
	byCategory: CategoryRow[];
	totalExpenses: number;
}) {
	if (byCategory.length === 0) return null;

	return (
		<div className="mt-6">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Expenses by category
			</h3>
			<div className="space-y-1.5">
				{byCategory.map((cat) => {
					const pct = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
					return (
						<div key={cat.category} className="flex items-center gap-3">
							<span className="font-body text-[13px] text-foreground tracking-[0.01em] w-24 truncate capitalize">
								{cat.category}
							</span>
							<div className="flex-1 h-2 bg-secondary/10 rounded-full overflow-hidden">
								<div
									className="h-full bg-foreground/20 rounded-full transition-all"
									style={{ width: `${Math.min(pct, 100)}%` }}
								/>
							</div>
							<span className="font-mono text-[11px] text-grey-3 w-16 text-right tabular-nums">
								{formatCents(cat.total)}
							</span>
							<span className="font-mono text-[10px] text-grey-3 w-10 text-right">
								{pct.toFixed(0)}%
							</span>
						</div>
					);
				})}
			</div>
		</div>
	);
}
