import { ContactCardLazy } from "@/components/contacts/ContactCard";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	type CalendarEvent,
	useDeleteCalendarEvent,
} from "@/hooks/use-calendar";
import { useMeetingPrep } from "@/hooks/use-contacts";
import { useCreateTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	Calendar,
	CheckSquare,
	ChevronDown,
	ExternalLink,
	Loader2,
	Mail,
	MapPin,
	Sparkles,
	Trash2,
	Users,
	Video,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/* ── Helpers ── */

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

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString(undefined, {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});
}

function formatDuration(start: string, end: string) {
	const ms = new Date(end).getTime() - new Date(start).getTime();
	const minutes = Math.round(ms / 60_000);
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const rem = minutes % 60;
	return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}

/* ── Component ── */

export function CalendarEventPanel({
	event,
	open,
	onOpenChange,
}: {
	event: CalendarEvent | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createTask = useCreateTask();
	const deleteEvent = useDeleteCalendarEvent();
	const [taskCreated, setTaskCreated] = useState(false);

	const handleCreateTask = () => {
		if (!event) return;

		const timeInfo = event.isAllDay
			? "All day"
			: `${formatTime(event.startTime)} \u2013 ${formatTime(event.endTime)}`;
		const dateInfo = formatDate(event.startTime);
		const parts = [`${dateInfo}, ${timeInfo}`];
		if (event.location) parts.push(`Location: ${event.location}`);
		if (event.meetingLink) parts.push(`Meeting: ${event.meetingLink}`);

		createTask.mutate(
			{
				title: event.title ?? "Calendar event",
				description: parts.join("\n"),
				dueAt: event.startTime,
			},
			{
				onSuccess: () => {
					setTaskCreated(true);
					toast("Task created from event");
				},
				onError: () => {
					toast.error("Failed to create task");
				},
			},
		);
	};

	// Reset taskCreated when event changes
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) setTaskCreated(false);
		onOpenChange(nextOpen);
	};

	if (!event) return null;

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent side="right" className="w-[400px] sm:w-[440px] p-0">
				<SheetHeader className="px-5 pt-5 pb-3 border-b border-border/30">
					<SheetTitle className="font-body text-[16px] text-foreground font-medium leading-snug text-left">
						{event.title ?? "Untitled event"}
					</SheetTitle>
				</SheetHeader>

				<div className="px-5 py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)]">
					{/* Time */}
					<div className="space-y-1">
						<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
							When
						</div>
						<div className="font-body text-[13px] text-foreground">
							{formatDate(event.startTime)}
						</div>
						<div className="font-mono text-[12px] text-grey-3">
							{formatTimeRange(event.startTime, event.endTime, event.isAllDay)}
							{!event.isAllDay && (
								<span className="ml-2 text-grey-3/60">
									({formatDuration(event.startTime, event.endTime)})
								</span>
							)}
						</div>
					</div>

					{/* Location */}
					{event.location && (
						<div className="space-y-1">
							<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
								Location
							</div>
							<div className="flex items-start gap-2 font-body text-[13px] text-foreground">
								<MapPin className="size-3.5 shrink-0 mt-0.5 text-grey-3" />
								<span>{event.location}</span>
							</div>
						</div>
					)}

					{/* Meeting link */}
					{event.meetingLink && (
						<a
							href={event.meetingLink}
							target="_blank"
							rel="noopener noreferrer"
						>
							<Button
								variant="outline"
								size="sm"
								className="font-mono text-[11px] gap-1.5 w-full mt-1"
							>
								<Video className="size-3.5" />
								Join meeting
							</Button>
						</a>
					)}

					{/* Attendees */}
					{event.attendees.length > 0 && (
						<div className="space-y-1.5">
							<div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
								<Users className="size-3" />
								{event.attendees.length} attendee
								{event.attendees.length !== 1 && "s"}
							</div>
							<div className="space-y-1 max-h-[180px] overflow-y-auto">
								{event.attendees.map((a) => (
									<div
										key={a.email}
										className="flex items-center justify-between font-body text-[12px] py-0.5"
									>
										<div className="min-w-0">
											<ContactCardLazy
												email={a.email}
												side="left"
												align="start"
											>
												<span className="text-foreground block truncate">
													{a.displayName ?? a.email}
												</span>
											</ContactCardLazy>
											{a.displayName && (
												<span className="text-grey-3 text-[11px] block truncate">
													{a.email}
												</span>
											)}
										</div>
										{a.responseStatus && (
											<span
												className={cn(
													"font-mono text-[9px] shrink-0 ml-2 px-1.5 py-0.5 rounded-full",
													a.responseStatus === "accepted"
														? "bg-emerald-500/10 text-emerald-500"
														: a.responseStatus === "declined"
															? "bg-red-500/10 text-red-500"
															: a.responseStatus === "tentative"
																? "bg-amber-500/10 text-amber-500"
																: "bg-secondary/30 text-grey-3",
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

					{/* Meeting prep */}
					{event.attendees.length > 0 && (
						<MeetingPrepSection eventId={event.id} />
					)}

					{/* Description */}
					{event.description && (
						<div className="space-y-1">
							<div className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
								Description
							</div>
							<p className="font-body text-[12px] text-grey-3 whitespace-pre-wrap leading-relaxed">
								{event.description}
							</p>
						</div>
					)}

					{/* Actions */}
					<div className="pt-2 space-y-2 border-t border-border/30">
						<Button
							variant="outline"
							size="sm"
							className="font-mono text-[11px] gap-1.5 w-full"
							onClick={handleCreateTask}
							disabled={createTask.isPending || taskCreated}
						>
							{createTask.isPending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<CheckSquare className="size-3.5" />
							)}
							{taskCreated ? "Task created" : "Create task from event"}
						</Button>

						<Button
							variant="ghost"
							size="sm"
							className="font-mono text-[11px] gap-1.5 w-full text-red-500 hover:text-red-600 hover:bg-red-500/10"
							onClick={() => {
								deleteEvent.mutate(event.id, {
									onSuccess: () => {
										toast("Event deleted");
										handleOpenChange(false);
									},
									onError: () => {
										toast.error("Failed to delete event");
									},
								});
							}}
							disabled={deleteEvent.isPending}
						>
							{deleteEvent.isPending ? (
								<Loader2 className="size-3.5 animate-spin" />
							) : (
								<Trash2 className="size-3.5" />
							)}
							Delete event
						</Button>

						{event.htmlLink && (
							<a
								href={event.htmlLink}
								target="_blank"
								rel="noopener noreferrer"
								className="block"
							>
								<Button
									variant="ghost"
									size="sm"
									className="font-mono text-[11px] gap-1.5 w-full text-grey-3"
								>
									<ExternalLink className="size-3.5" />
									Open in Google Calendar
								</Button>
							</a>
						)}
					</div>

					{/* Status badge */}
					{event.status !== "confirmed" && (
						<div className="flex items-center gap-1.5">
							<Calendar className="size-3 text-grey-3" />
							<span
								className={cn(
									"font-mono text-[10px] px-1.5 py-0.5 rounded-full",
									event.status === "tentative"
										? "bg-amber-500/10 text-amber-500"
										: "bg-red-500/10 text-red-500",
								)}
							>
								{event.status}
							</span>
						</div>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

/* ── Meeting prep section ── */

function MeetingPrepSection({ eventId }: { eventId: string }) {
	const [expanded, setExpanded] = useState(false);
	const { data: prep, isPending } = useMeetingPrep(eventId);

	if (!expanded) {
		return (
			<button
				type="button"
				onClick={() => setExpanded(true)}
				className="flex items-center gap-2 w-full px-3 py-2 rounded-md border border-border/30 bg-secondary/10 hover:bg-secondary/25 font-mono text-[11px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
			>
				<Sparkles className="size-3" />
				Meeting prep
				<ChevronDown className="size-3 ml-auto" />
			</button>
		);
	}

	if (isPending) {
		return (
			<div className="space-y-2 animate-pulse">
				<div className="h-3 w-24 bg-secondary/30 rounded" />
				<div className="h-10 w-full bg-secondary/20 rounded" />
				<div className="h-10 w-full bg-secondary/20 rounded" />
			</div>
		);
	}

	if (!prep?.attendees || prep.attendees.length === 0) {
		return (
			<div className="rounded-md border border-border/30 bg-secondary/5 px-3 py-2">
				<div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
					<Sparkles className="size-3" />
					Meeting prep
				</div>
				<p className="font-body text-[12px] text-grey-3 mt-1.5 italic">
					No contact data available for attendees.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-md border border-border/30 bg-secondary/5 overflow-hidden">
			<div className="flex items-center gap-1.5 px-3 py-2 border-b border-border/20">
				<Sparkles className="size-3 text-grey-3" />
				<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
					Meeting prep
				</span>
			</div>
			<div className="divide-y divide-border/15">
				{prep.attendees.map((attendee) => (
					<div key={attendee.email} className="px-3 py-2.5 space-y-1">
						<div className="flex items-center justify-between">
							<ContactCardLazy email={attendee.email} side="left" align="start">
								<span className="font-body text-[13px] text-foreground font-medium">
									{attendee.name ?? attendee.email}
								</span>
							</ContactCardLazy>
							{attendee.relationshipScore != null &&
								attendee.relationshipScore > 0 && (
									<span className="font-mono text-[9px] text-grey-3 px-1.5 py-0.5 rounded-full bg-secondary/30">
										{attendee.relationshipScore}
									</span>
								)}
						</div>

						{attendee.lastInteractionTitle && (
							<div className="font-body text-[11px] text-grey-3">
								Last: {attendee.lastInteractionTitle}
								{attendee.lastInteractionAt && (
									<span className="text-grey-3/60">
										{" "}
										·{" "}
										{new Date(attendee.lastInteractionAt).toLocaleDateString()}
									</span>
								)}
							</div>
						)}

						{attendee.recentEmailSubjects &&
							attendee.recentEmailSubjects.length > 0 && (
								<div className="flex items-start gap-1.5 mt-1">
									<Mail className="size-3 text-grey-3 shrink-0 mt-0.5" />
									<div className="space-y-0.5">
										{attendee.recentEmailSubjects.slice(0, 3).map((subject) => (
											<div
												key={subject}
												className="font-body text-[11px] text-grey-3 truncate max-w-[280px]"
											>
												{subject}
											</div>
										))}
									</div>
								</div>
							)}

						{attendee.notes && (
							<p className="font-body text-[11px] text-grey-3/80 italic mt-1">
								{attendee.notes}
							</p>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
