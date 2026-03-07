import type { Task } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { useState } from "react";
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

/* ── Board card content (shared between sortable + overlay) ── */

function CardContent({
	task,
	isDragging,
}: {
	task: Task;
	isDragging?: boolean;
}) {
	const due = task.dueAt ? formatDue(task.dueAt) : null;
	const dot = PRIORITY_DOT[task.priority];
	const completedItems = task.items.filter((i) => i.completed).length;
	const totalItems = task.items.length;

	return (
		<div
			className={cn(
				"rounded-lg border border-border/30 bg-background p-3 cursor-grab active:cursor-grabbing",
				isDragging
					? "shadow-lg border-foreground/20 opacity-90"
					: "hover:border-border/60",
				"transition-colors",
			)}
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
		</div>
	);
}

/* ── Sortable board card ── */

function SortableBoardCard({
	task,
	onClick,
}: {
	task: Task;
	onClick?: () => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: task.id, data: { task } });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.4 : 1,
	};

	return (
		<button
			type="button"
			ref={setNodeRef}
			style={style}
			{...attributes}
			{...listeners}
			onClick={onClick}
			className="w-full text-left"
		>
			<CardContent task={task} />
		</button>
	);
}

/* ── Droppable column ── */

function DroppableColumn({
	colKey,
	label,
	color,
	tasks,
	onTaskClick,
}: {
	colKey: string;
	label: string;
	color: string;
	tasks: Task[];
	onTaskClick?: (taskId: string) => void;
}) {
	const { setNodeRef, isOver } = useDroppable({ id: colKey });

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"min-h-[200px] rounded-lg p-2 -m-2 transition-colors",
				isOver && "bg-foreground/5",
			)}
		>
			<div className="flex items-center gap-2 mb-3">
				<span className={cn("size-2 rounded-full", color)} />
				<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
					{label}
				</span>
				<span className="font-mono text-[10px] tabular-nums text-grey-3 ml-auto">
					{tasks.length}
				</span>
			</div>
			<SortableContext
				items={tasks.map((t) => t.id)}
				strategy={verticalListSortingStrategy}
			>
				<div className="space-y-2">
					{tasks.map((task) => (
						<SortableBoardCard
							key={task.id}
							task={task}
							onClick={() => onTaskClick?.(task.id)}
						/>
					))}
					{tasks.length === 0 && (
						<div className="rounded-lg border border-dashed border-border/30 py-8 text-center">
							<span className="font-mono text-[10px] text-grey-3">
								No tasks
							</span>
						</div>
					)}
				</div>
			</SortableContext>
		</div>
	);
}

/* ── Board view ── */

export function BoardView({
	tasks,
	onTaskClick,
	onStatusChange,
}: {
	tasks: Task[];
	onTaskClick?: (taskId: string) => void;
	onStatusChange?: (taskId: string, statusKey: string) => void;
}) {
	const [activeTask, setActiveTask] = useState<Task | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	const handleDragStart = (event: DragStartEvent) => {
		const task = tasks.find((t) => t.id === event.active.id);
		if (task) setActiveTask(task);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveTask(null);
		const { active, over } = event;
		if (!over) return;

		const taskId = active.id as string;
		const task = tasks.find((t) => t.id === taskId);
		if (!task) return;

		// Determine target column from the over element
		let targetStatus: string | null = null;

		// If dropped on another task, use that task's column
		const overTask = tasks.find((t) => t.id === over.id);
		if (overTask) {
			targetStatus = overTask.statusKey;
		} else {
			// Dropped on column container — over.id might be the column key
			const colKey = COLUMNS.find((c) => c.key === over.id);
			if (colKey) targetStatus = colKey.key;
		}

		if (targetStatus && targetStatus !== task.statusKey) {
			onStatusChange?.(taskId, targetStatus);
		}
	};

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<motion.div
				className="grid grid-cols-4 gap-4"
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: MOTION_CONSTANTS.EASE }}
			>
				{COLUMNS.map((col) => {
					const colTasks = tasks.filter((t) => t.statusKey === col.key);
					return (
						<DroppableColumn
							key={col.key}
							colKey={col.key}
							label={col.label}
							color={col.color}
							tasks={colTasks}
							onTaskClick={onTaskClick}
						/>
					);
				})}
			</motion.div>

			<DragOverlay>
				{activeTask ? <CardContent task={activeTask} isDragging /> : null}
			</DragOverlay>
		</DndContext>
	);
}
