import { Button } from "@/components/ui/button";
import type { RecurringExpense } from "@/hooks/use-finance";
import { useUpdateRecurring } from "@/hooks/use-finance";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

const INTERVAL_LABELS: Record<string, string> = {
	weekly: "/wk",
	monthly: "/mo",
	quarterly: "/qtr",
	yearly: "/yr",
};

function formatCents(cents: number, currency: string) {
	return (cents / 100).toLocaleString("en-US", {
		style: "currency",
		currency,
	});
}

export function RecurringCard({ item }: { item: RecurringExpense }) {
	const update = useUpdateRecurring();

	const nextCharge = item.nextExpectedAt
		? new Date(item.nextExpectedAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			})
		: null;

	return (
		<div
			className={`rounded-lg border px-4 py-3.5 ${
				item.active
					? "border-border/40"
					: "border-border/20 opacity-50"
			}`}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2 min-w-0">
					<RefreshCw className="size-3.5 text-grey-3 shrink-0" />
					<span className="font-body text-[14px] text-foreground tracking-[0.01em] truncate">
						{item.merchant}
					</span>
				</div>
				<span className="font-mono text-[13px] text-foreground tabular-nums shrink-0 ml-2">
					{formatCents(item.expectedAmount, item.currency)}
					<span className="text-grey-3 text-[10px]">
						{INTERVAL_LABELS[item.interval] ?? ""}
					</span>
				</span>
			</div>
			<div className="flex items-center justify-between mt-2">
				<div className="flex items-center gap-2">
					{item.category && (
						<span className="font-mono text-[10px] text-grey-3 capitalize">
							{item.category}
						</span>
					)}
					{nextCharge && (
						<span className="font-mono text-[10px] text-grey-3">
							Next: {nextCharge}
						</span>
					)}
				</div>
				<Button
					variant="ghost"
					size="sm"
					className="h-6 px-2 font-mono text-[10px] text-grey-3"
					onClick={() =>
						update.mutate(
							{ id: item.id, active: !item.active },
							{
								onSuccess: () =>
									toast(
										item.active ? "Paused" : "Resumed",
									),
								onError: () => toast.error("Failed to update"),
							},
						)
					}
					disabled={update.isPending}
				>
					{item.active ? "Pause" : "Resume"}
				</Button>
			</div>
		</div>
	);
}
