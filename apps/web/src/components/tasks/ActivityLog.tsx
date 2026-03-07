import { useActivityLog } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	ArrowDownUp,
	CheckCircle2,
	Clock,
	Edit,
	Plus,
	RefreshCw,
	Trash2,
} from "lucide-react";

const ACTION_CONFIG: Record<
	string,
	{ icon: typeof Plus; label: string; color: string }
> = {
	created: { icon: Plus, label: "Created", color: "text-emerald-500" },
	updated: { icon: Edit, label: "Updated", color: "text-blue-500" },
	deleted: { icon: Trash2, label: "Deleted", color: "text-red-500" },
	synced: { icon: RefreshCw, label: "Synced", color: "text-grey-3" },
	write_back: {
		icon: ArrowDownUp,
		label: "Synced back",
		color: "text-emerald-500",
	},
	write_back_failed: {
		icon: AlertTriangle,
		label: "Sync failed",
		color: "text-red-500",
	},
	conflict_detected: {
		icon: AlertTriangle,
		label: "Conflict",
		color: "text-amber-500",
	},
	conflict_resolved: {
		icon: CheckCircle2,
		label: "Resolved",
		color: "text-emerald-500",
	},
};

function formatRelative(iso: string): string {
	const now = Date.now();
	const then = new Date(iso).getTime();
	const diff = Math.floor((now - then) / 1000);

	if (diff < 60) return "just now";
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
	if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function ActivityLog({ taskId }: { taskId?: string }) {
	const { data, isLoading, hasNextPage, fetchNextPage } = useActivityLog({
		taskId,
	});

	const entries = data?.pages.flatMap((page) => page?.entries ?? []) ?? [];

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-3">
				{[0, 1, 2].map((i) => (
					<div key={i} className="flex items-center gap-3">
						<div className="size-4 rounded-full bg-secondary/30" />
						<div className="h-3 w-32 bg-secondary/20 rounded" />
					</div>
				))}
			</div>
		);
	}

	if (entries.length === 0) {
		return (
			<p className="font-mono text-[11px] text-grey-3 py-4 text-center">
				No activity yet.
			</p>
		);
	}

	return (
		<div className="space-y-1">
			{entries.map((entry) => {
				const config = ACTION_CONFIG[entry.action] ?? {
					icon: Clock,
					label: entry.action,
					color: "text-grey-3",
				};
				const Icon = config.icon;
				const details = entry.details as Record<string, unknown> | null;
				const detailTitle =
					details?.title && typeof details.title === "string"
						? details.title
						: null;

				return (
					<div key={entry.id} className="flex items-start gap-2.5 py-1.5">
						<Icon className={cn("size-3.5 mt-0.5 shrink-0", config.color)} />
						<div className="flex-1 min-w-0">
							<span className="font-mono text-[11px] text-foreground">
								{config.label}
							</span>
							{detailTitle && (
								<span className="font-mono text-[11px] text-grey-3 ml-1">
									— {detailTitle}
								</span>
							)}
						</div>
						<span className="font-mono text-[10px] text-grey-3 tabular-nums shrink-0">
							{formatRelative(entry.createdAt)}
						</span>
					</div>
				);
			})}
			{hasNextPage && (
				<button
					type="button"
					onClick={() => fetchNextPage()}
					className="w-full py-2 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
				>
					Load more
				</button>
			)}
		</div>
	);
}
