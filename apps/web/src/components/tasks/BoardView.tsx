import type { Task } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { MOTION_CONSTANTS } from "../constant";

/* ── Column config ── */

const COLUMNS = [
	{ key: "todo", label: "To Do", color: "bg-grey-3" },
	{ key: "in_progress", label: "In Progress", color: "bg-blue-500" },
	{ key: "done", label: "Done", color: "bg-emerald-500" },
	{ key: "blocked", label: "Blocked", color: "bg-red-500" },
] as const;

/* ── Priority dot ── */

const PRIORITY_DOT: Record<string, string> = {
	urgent: "bg-red-500",
	high: "bg-orange-500",
	medium: "bg-yellow-500",
	low: "bg-blue-400",
};

/* ── Due date ── */

function formatDue(iso: string): { text: string; overdue: boolean } {
	const due = new Date(iso);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	const diff = Math.floor((dueDay.getTime() - today.getTime()) / 86400000);

	if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, overdue: true };
	if (diff === 0) return { text: "Today", overdue: false };
	if (diff === 1) return { text: "Tomorrow", overdue: false };
	if (diff < 7) return { text: `${diff}d`, overdue: false };
	return {
		text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
		overdue: false,
	};
}

/* ── Board card ── */

function BoardCard({ task, onClick }: { task: Task; onClick?: () => void }) {
	const due = task.dueAt ? formatDue(task.dueAt) : null;
	const dot = PRIORITY_DOT[task.priority];
	const completedItems = task.items.filter((i) => i.completed).length;
	const totalItems = task.items.length;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.96 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.25, ease: MOTION_CONSTANTS.EASE }}
			onClick={onClick}
			className="rounded-lg border border-border/30 bg-background hover:border-border/60 transition-colors p-3 cursor-pointer"
		>
			<div className="flex items-start gap-2">
				{dot && (
					<span className={cn("size-1.5 rounded-full mt-1.5 shrink-0", dot)} />
				)}
				<span
					className={cn(
						"font-body text-[13px] leading-snug",
						task.statusKey === "done"
							? "text-grey-3 line-through"
							: "text-foreground",
					)}
				>
					{task.title}
				</span>
			</div>

			{(due || totalItems > 0 || task.source === "external") && (
				<div className="flex items-center gap-2 mt-2">
					{due && (
						<span
							className={cn(
								"font-mono text-[10px] tabular-nums",
								due.overdue ? "text-red-500" : "text-grey-3",
							)}
						>
							{due.text}
						</span>
					)}
					{totalItems > 0 && (
						<span
							className={cn(
								"font-mono text-[10px] tabular-nums",
								completedItems === totalItems
									? "text-emerald-500"
									: "text-grey-3",
							)}
						>
							{completedItems}/{totalItems}
						</span>
					)}
					{task.source === "external" && (
						<span className="font-mono text-[8px] uppercase tracking-widest text-grey-3 border border-border/40 rounded px-1 py-0 ml-auto">
							{task.provider}
						</span>
					)}
				</div>
			)}
		</motion.div>
	);
}

/* ── Board view ── */

export function BoardView({
	tasks,
	onTaskClick,
}: {
	tasks: Task[];
	onTaskClick?: (taskId: string) => void;
}) {
	return (
		<div className="grid grid-cols-4 gap-4">
			{COLUMNS.map((col) => {
				const colTasks = tasks.filter((t) => t.statusKey === col.key);
				return (
					<div key={col.key} className="min-h-[200px]">
						<div className="flex items-center gap-2 mb-3">
							<span className={cn("size-2 rounded-full", col.color)} />
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
								{col.label}
							</span>
							<span className="font-mono text-[10px] tabular-nums text-grey-3 ml-auto">
								{colTasks.length}
							</span>
						</div>
						<div className="space-y-2">
							{colTasks.map((task) => (
								<BoardCard
									key={task.id}
									task={task}
									onClick={() => onTaskClick?.(task.id)}
								/>
							))}
							{colTasks.length === 0 && (
								<div className="rounded-lg border border-dashed border-border/30 py-8 text-center">
									<span className="font-mono text-[10px] text-grey-3">
										No tasks
									</span>
								</div>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
