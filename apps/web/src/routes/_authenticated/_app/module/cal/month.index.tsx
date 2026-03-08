import { Button } from "@/components/ui/button";
import { type CalendarEvent, useCalendarEvents } from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	MapPin,
	Users,
	Video,
	X,
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

function formatTimeRange(start: string, end: string, isAllDay: boolean) {
	if (isAllDay) return "All day";
	return `${formatTime(start)} \u2013 ${formatTime(end)}`;
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
					const today = isToday(date);
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

							{dayEvents.length > maxShow && (
								<button
									type="button"
									onClick={() => {
										const ev = dayEvents[maxShow];
										if (ev) setSelectedEvent(ev);
									}}
									className="font-mono text-[9px] text-grey-3 hover:text-foreground transition-colors px-1 cursor-pointer"
								>
									+{dayEvents.length - maxShow} more
								</button>
							)}
						</div>
					);
				})}
			</div>

			{/* Event detail panel */}
			{selectedEvent && (
				<EventDetailPanel
					event={selectedEvent}
					onClose={() => setSelectedEvent(null)}
				/>
			)}
		</div>
	);
}

function EventDetailPanel({
	event,
	onClose,
}: {
	event: CalendarEvent;
	onClose: () => void;
}) {
	return (
		<div className="fixed bottom-4 right-4 w-[360px] rounded-lg border border-border/60 bg-background shadow-lg z-50">
			<div className="flex items-center justify-between px-4 pt-3 pb-2">
				<h3 className="font-body text-[14px] text-foreground font-medium truncate pr-2">
					{event.title ?? "Untitled event"}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="text-grey-3 hover:text-foreground transition-colors shrink-0"
				>
					<X className="size-4" />
				</button>
			</div>

			<div className="px-4 pb-4 space-y-2.5">
				<div className="font-mono text-[11px] text-grey-3">
					{formatTimeRange(event.startTime, event.endTime, event.isAllDay)}
					{!event.isAllDay && (
						<span className="ml-1.5">
							{new Date(event.startTime).toLocaleDateString(undefined, {
								weekday: "short",
								month: "short",
								day: "numeric",
							})}
						</span>
					)}
				</div>

				{event.location && (
					<div className="flex items-center gap-1.5 font-body text-[12px] text-grey-3">
						<MapPin className="size-3 shrink-0" />
						<span className="truncate">{event.location}</span>
					</div>
				)}

				{event.meetingLink && (
					<a href={event.meetingLink} target="_blank" rel="noopener noreferrer">
						<Button
							variant="outline"
							size="sm"
							className="font-mono text-[11px] gap-1.5 w-full"
						>
							<Video className="size-3" />
							Join meeting
						</Button>
					</a>
				)}

				{event.attendees.length > 0 && (
					<div>
						<div className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-1">
							<Users className="size-3" />
							{event.attendees.length} attendee
							{event.attendees.length !== 1 && "s"}
						</div>
						<div className="space-y-0.5 max-h-[120px] overflow-y-auto">
							{event.attendees.map((a) => (
								<div
									key={a.email}
									className="flex items-center justify-between font-body text-[11px]"
								>
									<span className="text-foreground truncate">
										{a.displayName ?? a.email}
									</span>
									{a.responseStatus && (
										<span
											className={cn(
												"font-mono text-[9px] shrink-0 ml-2",
												a.responseStatus === "accepted"
													? "text-emerald-500"
													: a.responseStatus === "declined"
														? "text-red-500"
														: "text-grey-3",
											)}
										>
											{a.responseStatus}
										</span>
									)}
								</div>
							))}
						</div>
					</div>
				)}

				{event.description && (
					<p className="font-body text-[12px] text-grey-3 line-clamp-4 whitespace-pre-wrap">
						{event.description}
					</p>
				)}

				{event.htmlLink && (
					<a
						href={event.htmlLink}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors"
					>
						<ExternalLink className="size-3" />
						Open in Google Calendar
					</a>
				)}
			</div>
		</div>
	);
}
