import { cn } from "@/lib/utils";
import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	ArrowDown,
	ArrowUp,
	Clock,
	FileText,
	Flame,
	GripVertical,
	Inbox,
	type LucideIcon,
	Minus,
	Send,
	Sparkles,
	Star,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";

export interface MailStat {
	id: string;
	label: string;
	value: number | string;
	icon: LucideIcon;
	trend?: "up" | "down" | "neutral";
	trendLabel?: string;
	accent?: "red" | "amber" | "emerald" | "blue";
}

export function StatsWidget({
	stats,
	onRemoveStat,
}: {
	stats: MailStat[];
	onRemoveStat?: (id: string) => void;
}) {
	const [order, setOrder] = useState<string[]>(() => stats.map((s) => s.id));

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
	);

	// Keep order in sync if stats list changes
	const orderedStats = order
		.map((id) => stats.find((s) => s.id === id))
		.filter(Boolean) as MailStat[];
	for (const s of stats) {
		if (!order.includes(s.id)) orderedStats.push(s);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event;
		if (over && active.id !== over.id) {
			setOrder((prev) => {
				const ids = prev.length ? prev : stats.map((s) => s.id);
				const oldIdx = ids.indexOf(active.id as string);
				const newIdx = ids.indexOf(over.id as string);
				if (oldIdx === -1 || newIdx === -1) return prev;
				return arrayMove(ids, oldIdx, newIdx);
			});
		}
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
		>
			<SortableContext
				items={orderedStats.map((s) => s.id)}
				strategy={rectSortingStrategy}
			>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
					{orderedStats.map((stat) => (
						<SortableStatCard
							key={stat.id}
							stat={stat}
							onRemove={onRemoveStat}
						/>
					))}
				</div>
			</SortableContext>
		</DndContext>
	);
}

function SortableStatCard({
	stat,
	onRemove,
}: {
	stat: MailStat;
	onRemove?: (id: string) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: stat.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		zIndex: isDragging ? 10 : undefined,
	};

	return (
		<div ref={setNodeRef} style={style}>
			<StatCardContent
				stat={stat}
				isDragging={isDragging}
				dragHandleProps={{ ...listeners, ...attributes }}
				onRemove={onRemove}
			/>
		</div>
	);
}

function StatCardContent({
	stat,
	isDragging,
	dragHandleProps,
	onRemove,
}: {
	stat: MailStat;
	isDragging?: boolean;
	dragHandleProps?: Record<string, unknown>;
	onRemove?: (id: string) => void;
}) {
	return (
		<div
			className={cn(
				"relative rounded-lg border border-border/40 bg-background px-3 py-2.5 min-w-0 group/stat flex items-center gap-3",
				isDragging && "shadow-xl ring-1 ring-border",
			)}
		>
			<div
				className={cn(
					"size-6 rounded-md flex items-center justify-center shrink-0",
					stat.accent === "red" && "bg-accent-red/10 text-accent-red",
					stat.accent === "amber" && "bg-amber-500/10 text-amber-500",
					stat.accent === "emerald" && "bg-emerald-500/10 text-emerald-500",
					stat.accent === "blue" && "bg-blue-500/10 text-blue-500",
					!stat.accent && "bg-foreground/5 text-grey-3",
				)}
			>
				<stat.icon className="size-3" />
			</div>

			<div className="flex-1 min-w-0 flex items-baseline gap-2">
				<span className="font-display text-[18px] leading-none text-foreground tracking-tight tabular-nums">
					{stat.value}
				</span>
				<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase truncate">
					{stat.label}
				</span>
			</div>

			{stat.trend && (
				<div
					className={cn(
						"flex items-center gap-0.5 font-mono text-[10px] shrink-0",
						stat.trend === "up" && "text-emerald-500",
						stat.trend === "down" && "text-accent-red",
						stat.trend === "neutral" && "text-grey-3",
					)}
				>
					{stat.trend === "up" && <ArrowUp className="size-2.5" />}
					{stat.trend === "down" && <ArrowDown className="size-2.5" />}
					{stat.trend === "neutral" && <Minus className="size-2.5" />}
					{stat.trendLabel && <span>{stat.trendLabel}</span>}
				</div>
			)}

			{/* Grab handle + X, slide in on hover */}
			<div className="absolute right-0 top-0 bottom-0 flex items-center gap-0.5 pr-2 translate-x-1 opacity-0 group-hover/stat:translate-x-0 group-hover/stat:opacity-100 transition-all duration-200">
				<div
					className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-foreground/5"
					{...(dragHandleProps ?? {})}
				>
					<GripVertical className="size-3 text-grey-3" />
				</div>
				{onRemove && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onRemove(stat.id);
						}}
						className="p-0.5 rounded hover:bg-foreground/5 text-grey-3 hover:text-foreground transition-colors"
					>
						<X className="size-3" />
					</button>
				)}
			</div>
		</div>
	);
}

/* ── Stat builder helpers ── */

export function buildMailStats({
	unread,
	needsAttention,
	autoHandled,
	starred,
	sent,
	drafts,
	avgResponseTime,
	streakDays,
}: {
	unread: number;
	needsAttention: number;
	autoHandled: number;
	starred?: number;
	sent?: number;
	drafts?: number;
	avgResponseTime?: string;
	streakDays?: number;
}): MailStat[] {
	const stats: MailStat[] = [
		{
			id: "unread",
			label: "Unread",
			value: unread,
			icon: Inbox,
			accent: unread > 0 ? "blue" : undefined,
		},
		{
			id: "needs_attention",
			label: "Needs you",
			value: needsAttention,
			icon: Zap,
			accent: needsAttention > 0 ? "red" : undefined,
		},
		{
			id: "auto_handled",
			label: "Auto-handled",
			value: autoHandled,
			icon: Sparkles,
			accent: autoHandled > 0 ? "emerald" : undefined,
		},
	];

	if (sent !== undefined) {
		stats.push({
			id: "sent",
			label: "Sent today",
			value: sent,
			icon: Send,
		});
	}

	if (drafts !== undefined) {
		stats.push({
			id: "drafts",
			label: "Drafts",
			value: drafts,
			icon: FileText,
			accent: drafts > 0 ? "amber" : undefined,
		});
	}

	if (starred !== undefined) {
		stats.push({
			id: "starred",
			label: "Starred",
			value: starred,
			icon: Star,
		});
	}

	if (avgResponseTime !== undefined) {
		stats.push({
			id: "response_time",
			label: "Avg response",
			value: avgResponseTime,
			icon: Clock,
		});
	}

	if (streakDays !== undefined) {
		stats.push({
			id: "streak",
			label: "Inbox zero streak",
			value: `${streakDays}d`,
			icon: Flame,
			accent: streakDays > 0 ? "amber" : undefined,
		});
	}

	return stats;
}
