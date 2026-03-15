import type { Transaction } from "@/hooks/use-finance";
import { Link } from "@tanstack/react-router";
import { Mail, PenLine } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
	software: "bg-blue-500",
	subscription: "bg-violet-500",
	food: "bg-orange-500",
	travel: "bg-cyan-500",
	utilities: "bg-yellow-500",
	shopping: "bg-pink-500",
	entertainment: "bg-rose-500",
	education: "bg-indigo-500",
	health: "bg-green-500",
	housing: "bg-amber-500",
	transport: "bg-teal-500",
	business: "bg-slate-500",
	other: "bg-zinc-400",
};

function formatAmount(amount: number, currency: string, type: string) {
	const value = (amount / 100).toLocaleString("en-US", {
		style: "currency",
		currency,
	});
	return type === "income" ? `+${value}` : `-${value}`;
}

export function TransactionRow({ txn }: { txn: Transaction }) {
	const date = new Date(txn.transactedAt).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
	const catColor = CATEGORY_COLORS[txn.category ?? "other"] ?? "bg-zinc-400";

	return (
		<div className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-b-0 hover:bg-secondary/5 transition-colors">
			<span className="font-mono text-[11px] text-grey-3 w-14 shrink-0">
				{date}
			</span>
			<span
				className={`size-2 rounded-full shrink-0 ${catColor}`}
				title={txn.category ?? "other"}
			/>
			<div className="flex-1 min-w-0">
				<span className="font-body text-[13px] text-foreground tracking-[0.01em] truncate block">
					{txn.merchant ?? txn.description ?? "Unknown"}
				</span>
				{txn.description && txn.merchant && (
					<span className="font-mono text-[10px] text-grey-3 truncate block">
						{txn.description}
					</span>
				)}
			</div>
			<div className="flex items-center gap-2 shrink-0">
				{txn.source === "email" ? (
					<Mail className="size-3 text-grey-3" />
				) : (
					<PenLine className="size-3 text-grey-3" />
				)}
				<span
					className={`font-mono text-[13px] tabular-nums ${
						txn.type === "income" ? "text-green-500" : "text-foreground"
					}`}
				>
					{formatAmount(txn.amount, txn.currency, txn.type)}
				</span>
			</div>
			{txn.sourceEmailId && (
				<Link
					to="/module/mail/inbox/$emailId"
					params={{ emailId: txn.sourceEmailId }}
					search={{ view: undefined }}
					className="text-grey-3 hover:text-foreground transition-colors"
					title="View source email"
				>
					<Mail className="size-3" />
				</Link>
			)}
		</div>
	);
}
