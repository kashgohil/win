import { MOTION_CONSTANTS } from "@/components/constant";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "@tanstack/react-db";
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

const STATUS_CONFIG = {
	synced: {
		icon: CheckCircle,
		label: "Synced",
		color: "text-emerald-600 dark:text-emerald-400",
		dotColor: "bg-emerald-500",
	},
	syncing: {
		icon: RefreshCw,
		label: "Syncing",
		color: "text-blue-600 dark:text-blue-400",
		dotColor: "bg-blue-500",
	},
	pending: {
		icon: Loader2,
		label: "Pending",
		color: "text-amber-600 dark:text-amber-400",
		dotColor: "bg-amber-500",
	},
	error: {
		icon: AlertCircle,
		label: "Error",
		color: "text-red-600 dark:text-red-400",
		dotColor: "bg-red-500",
	},
} as const;

export function AccountHealthWidget() {
	const { data: accounts, isLoading } = useLiveQuery(mailAccountsCollection);

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-3 py-2">
				<div className="flex items-center gap-3">
					<div className="size-4 rounded-full bg-secondary/20" />
					<div className="h-3 w-40 bg-secondary/20 rounded" />
				</div>
			</div>
		);
	}

	if (!accounts || accounts.length === 0) {
		return (
			<p className="font-body text-[13px] text-grey-3 italic py-4">
				No accounts connected.
			</p>
		);
	}

	return (
		<div className="space-y-2">
			{accounts.map((account, i) => {
				const status =
					STATUS_CONFIG[account.syncStatus as keyof typeof STATUS_CONFIG] ??
					STATUS_CONFIG.pending;
				const StatusIcon = status.icon;

				return (
					<motion.div
						key={account.id}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.03,
							duration: 0.3,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="flex items-center gap-3 py-1.5"
					>
						<span
							className={cn("size-1.5 rounded-full shrink-0", status.dotColor)}
						/>
						<div className="flex-1 min-w-0">
							<p className="font-body text-[13px] text-foreground/80 truncate">
								{account.email}
							</p>
							<div className="flex items-center gap-2 mt-0.5">
								<StatusIcon
									className={cn("size-3", status.color, {
										"animate-spin": account.syncStatus === "syncing",
									})}
								/>
								<span
									className={cn(
										"font-mono text-[10px] tracking-[0.03em]",
										status.color,
									)}
								>
									{status.label}
								</span>
								{account.lastSyncAt && (
									<span className="font-mono text-[10px] text-grey-3 tabular-nums">
										{formatSyncTime(account.lastSyncAt)}
									</span>
								)}
							</div>
						</div>
						<span className="font-mono text-[10px] text-grey-3/60 uppercase tracking-wider">
							{account.provider}
						</span>
					</motion.div>
				);
			})}
		</div>
	);
}

function formatSyncTime(iso: string): string {
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}
