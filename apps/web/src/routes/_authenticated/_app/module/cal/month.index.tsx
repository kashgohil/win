import { CalendarEventPanel } from "@/components/calendar/CalendarEventPanel";
import { CreateEventDialog } from "@/components/calendar/CreateEventDialog";
import { Button } from "@/components/ui/button";
import { type CalendarEvent, useCalendarEvents } from "@/hooks/use-calendar";
import { type Task, useTasksForDateRange } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/module/cal/month/")({
	component: MonthView,
});

/* ── Helpers ── */

function getMonthDays(year: number, month: number) {
	const firstDay = new Date(year, month, 1);
	const lastDay = new Date(year, month + 1, 0);
	const startDow = firstDay.getDay();

	const days: { date: Date; inMonth: boolean }[] = [];

	for (let i = startDow - 1; i >= 0; i--) {
		days.push({ date: new Date(year, month, -i), inMonth: false });
	}
	for (let d = 1; d <= lastDay.getDate(); d++) {
		days.push({ date: new Date(year, month, d), inMonth: true });
	}
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

function isToday(date: Date) {
	return isSameDay(date, new Date());
}

function formatMonthYear(year: number, month: number) {
	return new Date(year, month).toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
	"bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
	"bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
	"bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
	"bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
	"bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/20",
];

function getEventColor(event: CalendarEvent) {
	// Hash the calendarAccountId to get a consistent color per account
	let hash = 0;
	for (const c of event.calendarAccountId) {
		hash = c.charCodeAt(0) + ((hash << 5) - hash);
	}
	return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length] ?? EVENT_COLORS[0];
}

/* ── Component ── */

function MonthView() {
	const now = new Date();
	const [year, setYear] = useState(now.getFullYear());
	const [month, setMonth] = useState(now.getMonth());
	const navigate = useNavigate();
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);

	const days = useMemo(() => getMonthDays(year, month), [year, month]);

	const firstDay = days[0];
	const lastDayEntry = days[days.length - 1];
	const startAfter = firstDay?.date.toISOString() ?? "";
	const lastDay = lastDayEntry?.date ?? new Date();
	const startBefore = new Date(
		lastDay.getFullYear(),
		lastDay.getMonth(),
		lastDay.getDate() + 1,
	).toISOString();

	const { data, isLoading } = useCalendarEvents({
		startAfter,
		startBefore,
		limit: 500,
	});

	const { data: tasks } = useTasksForDateRange(startAfter, startBefore);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, CalendarEvent[]>();
		if (!data?.events) return map;

		for (const event of data.events) {
			const key = new Date(event.startTime).toDateString();
			const arr = map.get(key) ?? [];
			arr.push(event);
			map.set(key, arr);
		}
		return map;
	}, [data?.events]);

	const tasksByDay = useMemo(() => {
		const map = new Map<string, Task[]>();
		if (!tasks) return map;

		for (const task of tasks) {
			if (!task.dueAt) continue;
			const key = new Date(task.dueAt).toDateString();
			const arr = map.get(key) ?? [];
			arr.push(task);
			map.set(key, arr);
		}
		return map;
	}, [tasks]);

	const prevMonth = () => {
		if (month === 0) {
			setYear(year - 1);
			setMonth(11);
		} else {
			setMonth(month - 1);
		}
	};

	const nextMonth = () => {
		if (month === 11) {
			setYear(year + 1);
			setMonth(0);
		} else {
			setMonth(month + 1);
		}
	};

	const goToday = () => {
		setYear(now.getFullYear());
		setMonth(now.getMonth());
	};

	return (
		<div className="px-(--page-px) max-w-5xl mx-auto py-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-5">
				<div className="flex items-center gap-3">
					<Link to="/module/cal">
						<Button variant="ghost" size="sm" className="gap-1.5">
							<ArrowLeft className="size-3.5" />
						</Button>
					</Link>
					<h2 className="font-display text-[1.25rem] text-foreground">
						{formatMonthYear(year, month)}
					</h2>
				</div>
				<div className="flex items-center gap-1">
					<CreateEventDialog />
					<Button
						variant="ghost"
						size="sm"
						onClick={goToday}
						className="font-mono text-[11px]"
					>
						Today
					</Button>
					<Button variant="ghost" size="sm" onClick={prevMonth}>
						<ChevronLeft className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={nextMonth}>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			</div>

			{/* Weekday headers */}
			<div className="grid grid-cols-7 mb-1">
				{WEEKDAYS.map((d) => (
					<div
						key={d}
						className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 text-center py-1"
					>
						{d}
					</div>
				))}
			</div>

			{/* Calendar grid */}
			<div className="grid grid-cols-7 border-t border-l border-border/30">
				{days.map(({ date, inMonth }) => {
					const dayEvents = eventsByDay.get(date.toDateString()) ?? [];
					const dayTasks = tasksByDay.get(date.toDateString()) ?? [];
					const today = isToday(date);
					const totalItems = dayEvents.length + dayTasks.length;
					const maxShow = 3;

					return (
						<div
							key={date.toISOString()}
							className={cn(
								"border-r border-b border-border/30 min-h-[100px] p-1",
								!inMonth && "bg-secondary/5",
							)}
						>
							<div
								className={cn(
									"font-mono text-[11px] w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
									today
										? "bg-blue-500 text-white"
										: inMonth
											? "text-foreground"
											: "text-grey-3/50",
								)}
							>
								{date.getDate()}
							</div>

							{isLoading
								? inMonth && (
										<div className="h-4 rounded bg-secondary/20 animate-pulse mt-0.5" />
									)
								: dayEvents.slice(0, maxShow).map((event) => (
										<button
											type="button"
											key={event.id}
											onClick={() => setSelectedEvent(event)}
											className={cn(
												"w-full text-left rounded px-1 py-0.5 mb-0.5 border truncate",
												"font-body text-[10px] leading-tight cursor-pointer",
												"hover:opacity-80 transition-opacity",
												getEventColor(event),
											)}
											title={event.title ?? "Untitled"}
										>
											{event.isAllDay
												? (event.title ?? "Untitled")
												: `${formatTime(event.startTime)} ${event.title ?? ""}`}
										</button>
									))}

							{/* Tasks with due dates */}
							{dayEvents.length < maxShow &&
								dayTasks.slice(0, maxShow - dayEvents.length).map((task) => (
									<button
										type="button"
										key={task.id}
										onClick={() => navigate({ to: "/module/task" })}
										className={cn(
											"w-full text-left rounded px-1 py-0.5 mb-0.5 border truncate",
											"font-body text-[10px] leading-tight cursor-pointer",
											"hover:opacity-80 transition-opacity",
											task.statusKey === "done"
												? "bg-secondary/10 text-grey-3 border-border/20 line-through"
												: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
										)}
										title={task.title}
									>
										<CheckCircle2 className="size-2.5 inline mr-0.5 -mt-px" />
										{task.title}
									</button>
								))}

							{totalItems > maxShow && (
								<button
									type="button"
									onClick={() => {
										const ev = dayEvents[maxShow];
										if (ev) setSelectedEvent(ev);
									}}
									className="font-mono text-[9px] text-grey-3 hover:text-foreground transition-colors px-1 cursor-pointer"
								>
									+{totalItems - maxShow} more
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Event detail panel */}
			<CalendarEventPanel
				event={selectedEvent}
				open={selectedEvent !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedEvent(null);
				}}
			/>
		</div>
	);
}
