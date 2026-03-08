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
import { useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/module/cal/week/")({
	component: WeekView,
});

/* ── Helpers ── */

function startOfWeek(date: Date): Date {
	const d = new Date(date);
	d.setDate(d.getDate() - d.getDay());
	d.setHours(0, 0, 0, 0);
	return d;
}

function addDays(date: Date, days: number): Date {
	const d = new Date(date);
	d.setDate(d.getDate() + days);
	return d;
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

function formatWeekRange(start: Date) {
	const end = addDays(start, 6);
	const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
	const startStr = start.toLocaleDateString("en-US", opts);
	const endStr = end.toLocaleDateString("en-US", {
		...opts,
		year: "numeric",
	});
	return `${startStr} \u2013 ${endStr}`;
}

function formatTime(iso: string) {
	return new Date(iso).toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
	});
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // px per hour
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const EVENT_COLORS = [
	"bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
	"bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
	"bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30",
	"bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
	"bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
];

function getEventColor(event: CalendarEvent) {
	let hash = 0;
	for (const c of event.calendarAccountId) {
		hash = c.charCodeAt(0) + ((hash << 5) - hash);
	}
	return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length] ?? EVENT_COLORS[0];
}

function getEventPosition(event: CalendarEvent) {
	const start = new Date(event.startTime);
	const end = new Date(event.endTime);
	const startMinutes = start.getHours() * 60 + start.getMinutes();
	const endMinutes = end.getHours() * 60 + end.getMinutes();
	const duration = Math.max(endMinutes - startMinutes, 15); // min 15 min height

	return {
		top: (startMinutes / 60) * HOUR_HEIGHT,
		height: (duration / 60) * HOUR_HEIGHT,
	};
}

/* ── Component ── */

function WeekView() {
	const now = new Date();
	const [weekStart, setWeekStart] = useState(() => startOfWeek(now));
	const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
		null,
	);
	const scrollRef = useRef<HTMLDivElement>(null);

	const weekDays = useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
		[weekStart],
	);

	const startAfter = weekStart.toISOString();
	const startBefore = addDays(weekStart, 7).toISOString();

	const navigate = useNavigate();

	const { data, isLoading } = useCalendarEvents({
		startAfter,
		startBefore,
		limit: 500,
	});

	const { data: tasks } = useTasksForDateRange(startAfter, startBefore);

	const { eventsByDay, allDayByDay } = useMemo(() => {
		const byDay = new Map<string, CalendarEvent[]>();
		const allDay = new Map<string, CalendarEvent[]>();
		if (!data?.events) return { eventsByDay: byDay, allDayByDay: allDay };

		for (const event of data.events) {
			const key = new Date(event.startTime).toDateString();
			const target = event.isAllDay ? allDay : byDay;
			const arr = target.get(key) ?? [];
			arr.push(event);
			target.set(key, arr);
		}
		return { eventsByDay: byDay, allDayByDay: allDay };
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

	// Scroll to 7am on mount
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = 7 * HOUR_HEIGHT;
		}
	}, []);

	const prevWeek = () => setWeekStart(addDays(weekStart, -7));
	const nextWeek = () => setWeekStart(addDays(weekStart, 7));
	const goToday = () => setWeekStart(startOfWeek(new Date()));

	const hasAnyTopRow = weekDays.some(
		(d) =>
			(allDayByDay.get(d.toDateString()) ?? []).length > 0 ||
			(tasksByDay.get(d.toDateString()) ?? []).length > 0,
	);

	return (
		<div className="px-(--page-px) max-w-5xl mx-auto py-6 flex flex-col h-[calc(100vh-100px)]">
			{/* Header */}
			<div className="flex items-center justify-between mb-4 shrink-0">
				<div className="flex items-center gap-3">
					<Link to="/module/cal">
						<Button variant="ghost" size="sm" className="gap-1.5">
							<ArrowLeft className="size-3.5" />
						</Button>
					</Link>
					<h2 className="font-display text-[1.25rem] text-foreground">
						{formatWeekRange(weekStart)}
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
					<Button variant="ghost" size="sm" onClick={prevWeek}>
						<ChevronLeft className="size-4" />
					</Button>
					<Button variant="ghost" size="sm" onClick={nextWeek}>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			</div>

			{/* Day headers */}
			<div
				className="grid shrink-0"
				style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
			>
				<div />
				{weekDays.map((day) => {
					const today = isToday(day);
					return (
						<div key={day.toISOString()} className="text-center pb-2">
							<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
								{WEEKDAYS_SHORT[day.getDay()]}
							</div>
							<div
								className={cn(
									"font-mono text-[18px] w-8 h-8 flex items-center justify-center rounded-full mx-auto",
									today ? "bg-blue-500 text-white" : "text-foreground",
								)}
							>
								{day.getDate()}
							</div>
						</div>
					);
				})}
			</div>

			{/* All-day events & tasks row */}
			{hasAnyTopRow && (
				<div
					className="grid border-b border-border/30 shrink-0"
					style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
				>
					<div className="font-mono text-[9px] text-grey-3 pr-2 text-right pt-1">
						ALL DAY
					</div>
					{weekDays.map((day) => {
						const events = allDayByDay.get(day.toDateString()) ?? [];
						const dayTasks = tasksByDay.get(day.toDateString()) ?? [];
						return (
							<div
								key={day.toISOString()}
								className="border-l border-border/30 px-0.5 pb-1 min-h-[28px]"
							>
								{events.map((event) => (
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
									>
										{event.title ?? "Untitled"}
									</button>
								))}
								{dayTasks.map((task) => (
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
									>
										<CheckCircle2 className="size-2.5 inline mr-0.5 -mt-px" />
										{task.title}
									</button>
								))}
							</div>
						);
					})}
				</div>
			)}

			{/* Time grid */}
			<div ref={scrollRef} className="overflow-y-auto flex-1 min-h-0">
				<div
					className="grid relative"
					style={{
						gridTemplateColumns: "48px repeat(7, 1fr)",
						height: `${24 * HOUR_HEIGHT}px`,
					}}
				>
					{/* Hour labels */}
					<div className="relative">
						{HOURS.map((hour) => (
							<div
								key={hour}
								className="absolute right-2 font-mono text-[10px] text-grey-3 -translate-y-1/2"
								style={{ top: `${hour * HOUR_HEIGHT}px` }}
							>
								{hour === 0
									? ""
									: new Date(2000, 0, 1, hour).toLocaleTimeString(undefined, {
											hour: "numeric",
										})}
							</div>
						))}
					</div>

					{/* Day columns */}
					{weekDays.map((day) => {
						const dayEvents = eventsByDay.get(day.toDateString()) ?? [];
						const today = isToday(day);

						return (
							<div
								key={day.toISOString()}
								className={cn(
									"relative border-l border-border/30",
									today && "bg-blue-500/[0.03]",
								)}
							>
								{/* Hour lines */}
								{HOURS.map((hour) => (
									<div
										key={hour}
										className="absolute w-full border-t border-border/20"
										style={{ top: `${hour * HOUR_HEIGHT}px` }}
									/>
								))}

								{/* Current time indicator */}
								{today && <CurrentTimeIndicator />}

								{/* Events */}
								{isLoading
									? ["skeleton-a", "skeleton-b"].map((id, i) => (
											<div
												key={id}
												className="absolute left-0.5 right-0.5 rounded bg-secondary/20 animate-pulse"
												style={{
													top: `${(9 + i * 2) * HOUR_HEIGHT}px`,
													height: `${HOUR_HEIGHT}px`,
												}}
											/>
										))
									: dayEvents.map((event) => {
											const pos = getEventPosition(event);
											return (
												<button
													type="button"
													key={event.id}
													onClick={() => setSelectedEvent(event)}
													className={cn(
														"absolute left-0.5 right-0.5 rounded border px-1.5 py-0.5 overflow-hidden",
														"font-body text-[10px] leading-tight cursor-pointer text-left",
														"hover:opacity-80 transition-opacity",
														getEventColor(event),
													)}
													style={{
														top: `${pos.top}px`,
														height: `${pos.height}px`,
														minHeight: "18px",
													}}
												>
													<div className="font-medium truncate">
														{event.title ?? "Untitled"}
													</div>
													{pos.height > 30 && (
														<div className="font-mono text-[9px] opacity-70 truncate">
															{formatTime(event.startTime)}
														</div>
													)}
												</button>
											);
										})}
							</div>
						);
					})}
				</div>
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

function CurrentTimeIndicator() {
	const [now, setNow] = useState(new Date());

	useEffect(() => {
		const interval = setInterval(() => setNow(new Date()), 60_000);
		return () => clearInterval(interval);
	}, []);

	const minutes = now.getHours() * 60 + now.getMinutes();
	const top = (minutes / 60) * HOUR_HEIGHT;

	return (
		<div
			className="absolute left-0 right-0 z-10 pointer-events-none"
			style={{ top: `${top}px` }}
		>
			<div className="relative">
				<div className="absolute -left-1 -top-[4px] size-2 rounded-full bg-red-500" />
				<div className="h-[1.5px] bg-red-500 w-full" />
			</div>
		</div>
	);
}
