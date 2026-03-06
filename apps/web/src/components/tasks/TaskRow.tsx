import { MOTION_CONSTANTS } from "@/components/constant";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Task } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Circle,
	ExternalLink,
	Loader2,
} from "lucide-react";
import { motion } from "motion/react";

/* ── Priority config ── */

const PRIORITY_CONFIG: Record<
	string,
	{ dot: string; label: string; order: number }
> = {
	urgent: { dot: "bg-red-500", label: "Urgent", order: 4 },
	high: { dot: "bg-orange-500", label: "High", order: 3 },
	medium: { dot: "bg-yellow-500", label: "Medium", order: 2 },
	low: { dot: "bg-blue-400", label: "Low", order: 1 },
	none: { dot: "bg-transparent", label: "None", order: 0 },
};

/* ── Status icons ── */

function StatusIcon({
	statusKey,
	className,
}: {
	statusKey: Task["statusKey"];
	className?: string;
}) {
	switch (statusKey) {
		case "done":
			return (
				<CheckCircle2 className={cn("size-4 text-emerald-500", className)} />
			);
		case "in_progress":
			return <Loader2 className={cn("size-4 text-blue-500", className)} />;
		case "blocked":
			return <AlertTriangle className={cn("size-4 text-red-500", className)} />;
		default:
			return <Circle className={cn("size-4 text-grey-3", className)} />;
	}
}

/* ── Due date formatting ── */

function formatDueDate(iso: string): { text: string; overdue: boolean } {
	const due = new Date(iso);
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
	const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / 86400000);

	if (diffDays < 0)
		return { text: `${Math.abs(diffDays)}d overdue`, overdue: true };
	if (diffDays === 0) return { text: "Today", overdue: false };
	if (diffDays === 1) return { text: "Tomorrow", overdue: false };
	if (diffDays < 7) return { text: `${diffDays}d`, overdue: false };

	return {
		text: due.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
		overdue: false,
	};
}

/* ── Component ── */

export function TaskRow({
	task,
	isFocused,
	focusRef,
	onToggleStatus,
	onClick,
}: {
	task: Task;
	isFocused?: boolean;
	focusRef?: (el: HTMLElement | null) => void;
	onToggleStatus?: () => void;
	onClick?: () => void;
}) {
	const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.none;
	const due = task.dueAt ? formatDueDate(task.dueAt) : null;
	const isDone = task.statusKey === "done";
	const completedItems = task.items.filter((i) => i.completed).length;
	const totalItems = task.items.length;

	return (
		<motion.div
			ref={focusRef}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
			className={cn(
				"group -mx-2 rounded-lg border-b border-border/15 last:border-0",
				"hover:bg-secondary/30 transition-colors duration-150",
				isFocused && "bg-secondary/30 ring-1 ring-foreground/10 ring-inset",
			)}
		>
			<div
				role="button"
				tabIndex={0}
				onClick={onClick}
				onKeyDown={(e) => {
					if (e.key === "Enter") onClick?.();
				}}
				className="flex items-start gap-3 py-3 px-2 cursor-pointer"
			>
				{/* Status toggle */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onToggleStatus?.();
					}}
					className="mt-0.5 shrink-0 cursor-pointer"
				>
					<StatusIcon statusKey={task.statusKey} />
				</button>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-baseline justify-between gap-3">
						<div className="flex items-center gap-1.5 min-w-0">
							{priority.order >= 3 && (
								<span
									className={cn("size-1.5 rounded-full shrink-0", priority.dot)}
								/>
							)}
							<span
								className={cn(
									"font-body text-[14px] tracking-[0.01em] truncate",
									isDone ? "text-grey-3 line-through" : "text-foreground",
								)}
							>
								{task.title}
							</span>
						</div>

						{/* Right side metadata */}
						<div className="shrink-0 flex items-center gap-2">
							{task.source === "external" && task.externalUrl && (
								<TooltipProvider>
									<Tooltip>
										<TooltipTrigger asChild>
											<a
												href={task.externalUrl}
												target="_blank"
												rel="noopener noreferrer"
												onClick={(e) => e.stopPropagation()}
												className="text-grey-3 hover:text-foreground transition-colors"
											>
												<ExternalLink className="size-3" />
											</a>
										</TooltipTrigger>
										<TooltipContent>Open in {task.provider}</TooltipContent>
									</Tooltip>
								</TooltipProvider>
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
							{due && (
								<span
									className={cn(
										"inline-flex items-center gap-1 font-mono text-[11px] tabular-nums",
										due.overdue ? "text-red-500" : "text-grey-3",
									)}
								>
									<Calendar className="size-3" />
									{due.text}
								</span>
							)}
							{task.source === "external" && (
								<span className="font-mono text-[9px] uppercase tracking-widest text-grey-3 border border-border/40 rounded px-1 py-0">
									{task.provider}
								</span>
							)}
						</div>
					</div>

					{/* Description snippet */}
					{task.description && !isDone && (
						<p className="font-body text-[13px] text-grey-3 truncate mt-0.5">
							{task.description}
						</p>
					)}
				</div>
			</div>
		</motion.div>
	);
}
