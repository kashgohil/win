import { MOTION_CONSTANTS } from "@/components/constant";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type Task,
	useCreateTask,
	useTasksInfinite,
	useUpdateTask,
} from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, List, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useMemo, useRef, useState } from "react";

/* ── Route ── */

export const Route = createFileRoute(
	"/_authenticated/_app/module/task/calendar/",
)({
	component: TaskCalendarPage,
});

/* ── Helpers ── */

function getMonthDays(year: number, month: number) {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startDow = firstDay.getDay(); // 0=Sun

	const days: { date: Date; inMonth: boolean }[] = [];

	// Fill leading days from previous month
	for (let i = startDow - 1; i >= 0; i--) {
		const d = new Date(year, month, -i);
		days.push({ date: d, inMonth: false });
	}

	// Current month days
	for (let d = 1; d <= lastDay.getDate(); d++) {
		days.push({ date: new Date(year, month, d), inMonth: true });
	}

	// Fill trailing days to complete the grid (6 rows)
	while (days.length < 42) {
		const d = new Date(
			year,
			month + 1,
			days.length - startDow - lastDay.getDate() + 1,
		);
		days.push({ date: d, inMonth: false });
	}

	return days;
}

function isSameDay(a: Date, b: Date) {
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

function formatMonthYear(year: number, month: number) {
	return new Date(year, month).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

/** Set time to noon to avoid timezone edge issues */
function toNoonISO(date: Date) {
	const d = new Date(date);
	d.setHours(12, 0, 0, 0);
	return d.toISOString();
}

const PRIORITY_DOT: Record<string, string> = {
	urgent: "bg-red-500",
	high: "bg-orange-500",
	medium: "bg-yellow-500",
	low: "bg-blue-400",
	none: "bg-grey-3/30",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Component ── */

function TaskCalendarPage() {
	const today = useMemo(() => new Date(), []);
	const [year, setYear] = useState(today.getFullYear());
	const [month, setMonth] = useState(today.getMonth());
	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [expandedDay, setExpandedDay] = useState<string | null>(null);
	const [activeTask, setActiveTask] = useState<Task | null>(null);

	const updateTask = useUpdateTask();

	// Fetch tasks for the visible month range (with padding for leading/trailing days)
	const { dueAfter, dueBefore } = useMemo(() => {
		const start = new Date(year, month, -6); // padding for leading days
		const end = new Date(year, month + 1, 7); // padding for trailing days
		return {
			dueAfter: start.toISOString(),
			dueBefore: end.toISOString(),
		};
	}, [year, month]);

	const { data, isLoading } = useTasksInfinite({
		dueAfter,
		dueBefore,
		limit: 200,
	});

	const allTasks: Task[] =
		data?.pages.flatMap((page) => (page?.tasks as Task[]) ?? []) ?? [];

	// Group tasks by date string
	const tasksByDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const task of allTasks) {
			if (!task.dueAt) continue;
			const dateKey = new Date(task.dueAt).toDateString();
			const existing = map.get(dateKey);
			if (existing) {
				existing.push(task);
			} else {
				map.set(dateKey, [task]);
			}
		}
		return map;
	}, [allTasks]);

	const days = useMemo(() => getMonthDays(year, month), [year, month]);

	const goToday = useCallback(() => {
		setYear(today.getFullYear());
		setMonth(today.getMonth());
	}, [today]);

	const goPrev = useCallback(() => {
		setMonth((m) => {
			if (m === 0) {
				setYear((y) => y - 1);
				return 11;
			}
			return m - 1;
		});
	}, []);

	const goNext = useCallback(() => {
		setMonth((m) => {
			if (m === 11) {
				setYear((y) => y + 1);
				return 0;
			}
			return m + 1;
		});
	}, []);

	// Drag-and-drop
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const taskId = event.active.id as string;
			const task = allTasks.find((t) => t.id === taskId);
			if (task) setActiveTask(task);
		},
		[allTasks],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			setActiveTask(null);
			const { active, over } = event;
			if (!over) return;

			const taskId = active.id as string;
			const targetDateStr = over.id as string;

			// over.id is the dateKey (date.toDateString())
			const task = allTasks.find((t) => t.id === taskId);
			if (!task?.dueAt) return;

			const currentDateKey = new Date(task.dueAt).toDateString();
			if (currentDateKey === targetDateStr) return; // same day, no-op

			const targetDate = new Date(targetDateStr);
			if (Number.isNaN(targetDate.getTime())) return;

			updateTask.mutate({
				id: taskId,
				dueAt: toNoonISO(targetDate),
			});
		},
		[allTasks, updateTask],
	);

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Header */}
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<div className="flex items-center justify-between gap-4">
							<div className="flex items-center gap-3">
								<h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-tight lowercase">
									{formatMonthYear(year, month)}
								</h1>
							</div>
							<div className="flex items-center gap-1.5">
								<button
									type="button"
									onClick={goToday}
									className="font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-secondary/30"
								>
									Today
								</button>
								<button
									type="button"
									onClick={goPrev}
									className="size-7 rounded flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-secondary/30 transition-colors"
								>
									<ChevronLeft className="size-4" />
								</button>
								<button
									type="button"
									onClick={goNext}
									className="size-7 rounded flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-secondary/30 transition-colors"
								>
									<ChevronRight className="size-4" />
								</button>
								<div className="w-px h-4 bg-border/50 mx-1" />
								<Link
									to="/module/task/list"
									className="size-7 rounded flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-secondary/30 transition-colors"
								>
									<List className="size-3.5" />
								</Link>
							</div>
						</div>
					</motion.header>

					{/* Calendar grid */}
					<motion.div
						className="mt-6"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{/* Weekday headers */}
						<div className="grid grid-cols-7 gap-px mb-1">
							{WEEKDAYS.map((day) => (
								<div
									key={day}
									className="text-center font-mono text-[10px] uppercase tracking-[0.12em] text-grey-3 py-2"
								>
									{day}
								</div>
							))}
						</div>

						{/* Day grid with DnD */}
						<DndContext
							sensors={sensors}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<div className="grid grid-cols-7 gap-px bg-border/20 rounded-lg overflow-hidden border border-border/30">
								{days.map(({ date, inMonth }) => {
									const dateKey = date.toDateString();
									const dayTasks = tasksByDate.get(dateKey) ?? [];
									const isToday = isSameDay(date, today);
									const isExpanded = expandedDay === dateKey;
									const isPast = date < today && !isSameDay(date, today);

									return (
										<DroppableDayCell
											key={dateKey}
											dateKey={dateKey}
											date={date}
											tasks={dayTasks}
											inMonth={inMonth}
											isToday={isToday}
											isPast={isPast}
											isExpanded={isExpanded}
											isLoading={isLoading}
											onToggleExpand={() =>
												setExpandedDay(isExpanded ? null : dateKey)
											}
											onSelectTask={setSelectedTaskId}
										/>
									);
								})}
							</div>

							<DragOverlay dropAnimation={null}>
								{activeTask ? (
									<div className="rounded bg-background border border-border/60 shadow-lg px-1.5 py-1 flex items-center gap-1 max-w-[160px]">
										<span
											className={cn(
												"size-1.5 rounded-full shrink-0",
												PRIORITY_DOT[activeTask.priority] ?? PRIORITY_DOT.none,
											)}
										/>
										<span className="font-body text-[11px] leading-snug truncate text-foreground">
											{activeTask.title}
										</span>
									</div>
								) : null}
							</DragOverlay>
						</DndContext>
					</motion.div>
				</div>
			</ScrollArea>

			{/* Task detail drawer */}
			{selectedTaskId && (
				<TaskDetailDrawer
					taskId={selectedTaskId}
					open={!!selectedTaskId}
					onClose={() => setSelectedTaskId(null)}
				/>
			)}
		</>
	);
}

/* ── Droppable day cell ── */

function DroppableDayCell({
	dateKey,
	date,
	tasks,
	inMonth,
	isToday,
	isPast,
	isExpanded,
	isLoading,
	onToggleExpand,
	onSelectTask,
}: {
	dateKey: string;
	date: Date;
	tasks: Task[];
	inMonth: boolean;
	isToday: boolean;
	isPast: boolean;
	isExpanded: boolean;
	isLoading: boolean;
	onToggleExpand: () => void;
	onSelectTask: (id: string) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: dateKey });
	const dayNum = date.getDate();
	const maxVisible = isExpanded ? tasks.length : 3;
	const visibleTasks = tasks.slice(0, maxVisible);
	const overflowCount = tasks.length - maxVisible;

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"bg-background min-h-[100px] p-1.5 transition-colors duration-150",
				!inMonth && "bg-secondary/5",
				isToday && "bg-blue-500/5",
				isOver && "bg-blue-500/10 ring-1 ring-inset ring-blue-500/30",
			)}
		>
			{/* Day number + quick add */}
			<div className="flex items-center justify-between mb-1">
				<span
					className={cn(
						"font-mono text-[11px] tabular-nums leading-none",
						!inMonth && "text-grey-3/40",
						inMonth && isPast && "text-grey-3",
						inMonth && !isPast && "text-foreground",
						isToday &&
							"bg-blue-500 text-white rounded-full size-5 flex items-center justify-center text-[10px] font-bold",
					)}
				>
					{dayNum}
				</span>
				<div className="flex items-center gap-1">
					{tasks.length > 0 && !isLoading && (
						<span className="font-mono text-[9px] text-grey-3 tabular-nums">
							{tasks.length}
						</span>
					)}
					<QuickAddButton date={date} />
				</div>
			</div>

			{/* Task previews */}
			<div className="space-y-0.5">
				{visibleTasks.map((task) => (
					<DraggableTaskChip
						key={task.id}
						task={task}
						isPast={isPast}
						onSelect={() => onSelectTask(task.id)}
					/>
				))}
			</div>

			{/* Overflow / collapse */}
			{overflowCount > 0 && !isExpanded && (
				<button
					type="button"
					onClick={onToggleExpand}
					className="mt-0.5 font-mono text-[9px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
				>
					+{overflowCount} more
				</button>
			)}
			{isExpanded && tasks.length > 3 && (
				<button
					type="button"
					onClick={onToggleExpand}
					className="mt-0.5 font-mono text-[9px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
				>
					show less
				</button>
			)}
		</div>
	);
}

/* ── Draggable task chip ── */

function DraggableTaskChip({
	task,
	isPast,
	onSelect,
}: {
	task: Task;
	isPast: boolean;
	onSelect: () => void;
}) {
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: task.id,
		data: { task },
	});

	const isDone = task.statusKey === "done";
	const isOverdue = isPast && !isDone;
	const dotColor = PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.none;

	return (
		<button
			type="button"
			ref={setNodeRef}
			onClick={onSelect}
			className={cn(
				"group w-full flex items-center gap-1 rounded px-1 py-0.5 text-left transition-colors duration-100 cursor-grab active:cursor-grabbing",
				"hover:bg-secondary/40",
				isOverdue && "bg-red-500/5",
				isDragging && "opacity-30",
			)}
			{...attributes}
			{...listeners}
		>
			<span className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
			<span
				className={cn(
					"font-body text-[11px] leading-snug truncate flex-1",
					isDone && "line-through text-grey-3",
					isOverdue && "text-red-500",
					!isDone && !isOverdue && "text-foreground",
				)}
			>
				{task.title}
			</span>
		</button>
	);
}

/* ── Quick add button ── */

function QuickAddButton({ date }: { date: Date }) {
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const createTask = useCreateTask();

	const handleSubmit = useCallback(
		(value: string) => {
			const title = value.trim();
			if (!title) {
				setIsEditing(false);
				return;
			}
			createTask.mutate(
				{ title, dueAt: toNoonISO(date) },
				{ onSettled: () => setIsEditing(false) },
			);
		},
		[createTask, date],
	);

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				type="text"
				placeholder="task name..."
				className="font-body text-[11px] bg-transparent border-b border-border/60 outline-none text-foreground w-full max-w-[120px] px-0.5 py-0"
				onBlur={(e) => handleSubmit(e.currentTarget.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						handleSubmit(e.currentTarget.value);
					}
					if (e.key === "Escape") {
						setIsEditing(false);
					}
				}}
			/>
		);
	}

	return (
		<button
			type="button"
			onClick={() => setIsEditing(true)}
			className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity size-4 rounded flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-secondary/40"
		>
			<Plus className="size-3" />
		</button>
	);
}
