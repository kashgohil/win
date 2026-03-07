import {
	type Task,
	useTaskSuggestions,
	useUpdateTask,
} from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	AlarmClock,
	AlertTriangle,
	CalendarDays,
	Flag,
	Loader2,
} from "lucide-react";

/* ── Section ── */

function SuggestionSection({
	icon: Icon,
	label,
	tasks,
	iconColor,
	onComplete,
}: {
	icon: typeof AlertTriangle;
	label: string;
	tasks: Task[];
	iconColor: string;
	onComplete: (id: string) => void;
}) {
	if (tasks.length === 0) return null;

	return (
		<div>
			<div className="flex items-center gap-2 mb-2">
				<Icon className={cn("size-3.5", iconColor)} />
				<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
					{label}
				</span>
				<span className="font-mono text-[10px] tabular-nums text-grey-3 ml-auto">
					{tasks.length}
				</span>
			</div>
			<div className="space-y-1">
				{tasks.map((task) => (
					<div
						key={task.id}
						className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 hover:bg-secondary/30 transition-colors"
					>
						<button
							type="button"
							onClick={() => onComplete(task.id)}
							className={cn(
								"size-3.5 rounded-full border shrink-0 transition-colors cursor-pointer",
								task.statusKey === "done"
									? "bg-emerald-500 border-emerald-500"
									: "border-grey-3 hover:border-foreground/50",
							)}
						/>
						<span
							className={cn(
								"font-body text-[13px] truncate flex-1",
								task.statusKey === "done"
									? "text-grey-3 line-through"
									: "text-foreground",
							)}
						>
							{task.title}
						</span>
						{task.dueAt && (
							<span className="font-mono text-[10px] tabular-nums text-grey-3">
								{new Date(task.dueAt).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								})}
							</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

/* ── Main ── */

export function TaskSuggestions() {
	const { data, isLoading } = useTaskSuggestions();
	const updateTask = useUpdateTask();

	const handleComplete = (id: string) => {
		updateTask.mutate({ id, statusKey: "done" });
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-4 text-grey-3 animate-spin" />
			</div>
		);
	}

	if (!data) return null;

	const hasAnySuggestions =
		(data.overdue?.length ?? 0) > 0 ||
		(data.dueToday?.length ?? 0) > 0 ||
		(data.highPriority?.length ?? 0) > 0 ||
		(data.recentlyUnsnoozed?.length ?? 0) > 0;

	if (!hasAnySuggestions) {
		return (
			<div className="rounded-lg border border-border/30 p-6 text-center">
				<p className="font-serif text-[14px] text-grey-2 italic">
					You're all caught up — no urgent tasks right now.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-5">
			<SuggestionSection
				icon={AlertTriangle}
				label="Overdue"
				tasks={(data.overdue as Task[]) ?? []}
				iconColor="text-red-500"
				onComplete={handleComplete}
			/>
			<SuggestionSection
				icon={CalendarDays}
				label="Due today"
				tasks={(data.dueToday as Task[]) ?? []}
				iconColor="text-amber-500"
				onComplete={handleComplete}
			/>
			<SuggestionSection
				icon={Flag}
				label="High priority"
				tasks={(data.highPriority as Task[]) ?? []}
				iconColor="text-orange-500"
				onComplete={handleComplete}
			/>
			<SuggestionSection
				icon={AlarmClock}
				label="Back from snooze"
				tasks={(data.recentlyUnsnoozed as Task[]) ?? []}
				iconColor="text-blue-400"
				onComplete={handleComplete}
			/>
		</div>
	);
}
