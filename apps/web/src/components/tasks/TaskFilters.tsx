import { cn } from "@/lib/utils";
import { LayoutGrid, List } from "lucide-react";

/* ── Status filter tabs ── */

const STATUS_TABS = [
	{ key: undefined, label: "All" },
	{ key: "todo", label: "To Do" },
	{ key: "in_progress", label: "In Progress" },
	{ key: "done", label: "Done" },
	{ key: "blocked", label: "Blocked" },
] as const;

export function TaskFilters({
	statusKey,
	onStatusChange,
	view,
	onViewChange,
}: {
	statusKey?: string;
	onStatusChange: (key?: string) => void;
	view: "list" | "board";
	onViewChange: (view: "list" | "board") => void;
}) {
	return (
		<div className="flex items-center justify-between gap-4">
			{/* Status tabs */}
			<div className="flex items-center gap-0.5">
				{STATUS_TABS.map((tab) => (
					<button
						key={tab.label}
						type="button"
						onClick={() => onStatusChange(tab.key)}
						className={cn(
							"font-mono text-[11px] tracking-wide px-2.5 py-1 rounded-md transition-colors cursor-pointer",
							statusKey === tab.key
								? "bg-foreground text-background"
								: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
						)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* View toggle */}
			<div className="flex items-center gap-0.5 border border-border/30 rounded-md p-0.5">
				<button
					type="button"
					onClick={() => onViewChange("list")}
					className={cn(
						"p-1 rounded transition-colors cursor-pointer",
						view === "list"
							? "bg-foreground text-background"
							: "text-grey-3 hover:text-foreground",
					)}
				>
					<List className="size-3.5" />
				</button>
				<button
					type="button"
					onClick={() => onViewChange("board")}
					className={cn(
						"p-1 rounded transition-colors cursor-pointer",
						view === "board"
							? "bg-foreground text-background"
							: "text-grey-3 hover:text-foreground",
					)}
				>
					<LayoutGrid className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
