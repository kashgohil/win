import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { Button } from "@/components/ui/button";
import {
	useCalendarAccounts,
	useCalendarData,
	useConnectCalendar,
	useDisconnectCalendar,
} from "@/hooks/use-calendar";
import { MODULE_DATA } from "@/lib/module-data";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	Calendar,
	CalendarDays,
	Check,
	Clock,
	Loader2,
	Plug,
	Trash2,
	Unplug,
	Video,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

const calSearchSchema = z.object({
	connected: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/module/cal/")({
	component: CalModule,
	validateSearch: (search) => calSearchSchema.parse(search),
});

const CAL_HUB_SHORTCUTS = [
	[
		{ keys: ["M"], label: "month view" },
		{ keys: ["W"], label: "week view" },
	],
];

function CalModule() {
	const navigate = useNavigate();
	const { connected, error } = Route.useSearch();

	useEffect(() => {
		if (connected) {
			toast.success("Google Calendar connected", {
				description: "Syncing your events now",
			});
			navigate({ to: "/module/cal", search: {}, replace: true });
		} else if (error) {
			toast.error("Connection failed", { description: error });
			navigate({ to: "/module/cal", search: {}, replace: true });
		}
	}, [connected, error, navigate]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;

			switch (e.key) {
				case "m":
					e.preventDefault();
					navigate({ to: "/module/cal/month" });
					break;
				case "w":
					e.preventDefault();
					navigate({ to: "/module/cal/week" });
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);

	return (
		<>
			<ModulePage moduleKey="cal" data={MODULE_DATA.cal}>
				<div className="px-(--page-px) max-w-5xl mx-auto pb-16">
					<div className="grid grid-cols-2 gap-3">
						<Link
							to="/module/cal/month"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<CalendarDays className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Month view
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/module/cal/week"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Calendar className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Week view
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
					</div>

					{/* Today's briefing */}
					<CalendarBriefing />

					{/* Connected accounts */}
					<div className="mt-8">
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Connected calendars
						</h3>
						<CalendarAccounts />
					</div>
				</div>
			</ModulePage>

			<KeyboardShortcutBar shortcuts={CAL_HUB_SHORTCUTS} />
		</>
	);
}

function CalendarBriefing() {
	const { data, isLoading } = useCalendarData();

	if (isLoading || !data) return null;

	return (
		<div className="mt-6">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Today
			</h3>
			<div className="grid grid-cols-3 gap-3">
				<div className="rounded-lg border border-border/40 px-3 py-2.5 text-center">
					<div className="font-display text-[1.25rem] leading-none text-foreground">
						{data.todayCount}
					</div>
					<div className="font-mono text-[10px] text-grey-3 mt-1">Events</div>
				</div>
				<div className="rounded-lg border border-border/40 px-3 py-2.5 text-center">
					<div
						className={cn(
							"font-display text-[1.25rem] leading-none",
							data.conflictCount > 0 ? "text-red-500" : "text-foreground",
						)}
					>
						{data.conflictCount}
					</div>
					<div className="font-mono text-[10px] text-grey-3 mt-1">
						Conflicts
					</div>
				</div>
				<div className="rounded-lg border border-border/40 px-3 py-2.5 text-center">
					<div className="font-display text-[1.25rem] leading-none text-foreground">
						{data.minutesUntilNext != null
							? data.minutesUntilNext < 60
								? `${data.minutesUntilNext}m`
								: `${Math.round(data.minutesUntilNext / 60)}h`
							: "--"}
					</div>
					<div className="font-mono text-[10px] text-grey-3 mt-1">
						Next event
					</div>
				</div>
			</div>

			{data.nextEvent && (
				<div className="mt-3 rounded-lg border border-border/40 bg-secondary/5 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="size-8 rounded-md flex items-center justify-center bg-blue-500/10 text-blue-500">
							{data.nextEvent.meetingLink ? (
								<Video className="size-4" />
							) : (
								<Clock className="size-4" />
							)}
						</div>
						<div className="min-w-0 flex-1">
							<span className="font-body text-[14px] text-foreground font-medium block truncate">
								{data.nextEvent.title ?? "Untitled event"}
							</span>
							<span className="font-mono text-[10px] text-grey-3">
								{formatEventTime(
									data.nextEvent.startTime,
									data.nextEvent.endTime,
									data.nextEvent.isAllDay,
								)}
								{data.nextEvent.location &&
									` \u00b7 ${data.nextEvent.location}`}
							</span>
						</div>
						{data.nextEvent.meetingLink && (
							<a
								href={data.nextEvent.meetingLink}
								target="_blank"
								rel="noopener noreferrer"
								className="shrink-0"
							>
								<Button
									variant="outline"
									size="sm"
									className="font-mono text-[11px] gap-1.5"
								>
									<Video className="size-3" />
									Join
								</Button>
							</a>
						)}
					</div>
				</div>
			)}

			{data.conflictCount > 0 && (
				<div className="mt-3 space-y-2">
					<div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5 flex items-center gap-2">
						<AlertTriangle className="size-4 text-red-500 shrink-0" />
						<span className="font-body text-[13px] text-red-500">
							{data.conflictCount} overlapping{" "}
							{data.conflictCount === 1 ? "event" : "events"} today
						</span>
					</div>
					{data.conflicts.map((conflict) => (
						<div
							key={`${conflict.event1.id}-${conflict.event2.id}`}
							className="rounded-lg border border-red-500/10 bg-red-500/[0.03] px-4 py-2.5"
						>
							<div className="flex items-center gap-2 font-body text-[12px]">
								<span className="text-foreground font-medium truncate">
									{conflict.event1.title ?? "Untitled"}
								</span>
								<span className="font-mono text-[10px] text-grey-3 shrink-0">
									{formatEventTime(
										conflict.event1.startTime,
										conflict.event1.endTime,
										conflict.event1.isAllDay,
									)}
								</span>
							</div>
							<div className="flex items-center gap-2 font-body text-[12px] mt-1">
								<span className="text-foreground font-medium truncate">
									{conflict.event2.title ?? "Untitled"}
								</span>
								<span className="font-mono text-[10px] text-grey-3 shrink-0">
									{formatEventTime(
										conflict.event2.startTime,
										conflict.event2.endTime,
										conflict.event2.isAllDay,
									)}
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function CalendarAccounts() {
	const { data: accounts, isLoading } = useCalendarAccounts();
	const connectCalendar = useConnectCalendar();
	const disconnectCalendar = useDisconnectCalendar();

	const handleConnect = () => {
		connectCalendar.mutate("google", {
			onSuccess: (data) => {
				if (data?.url) {
					window.location.href = data.url;
				}
			},
			onError: () => toast.error("Failed to connect Google Calendar"),
		});
	};

	const handleDisconnect = (accountId: string) => {
		disconnectCalendar.mutate(accountId, {
			onSuccess: () => toast("Calendar disconnected"),
			onError: () => toast.error("Failed to disconnect"),
		});
	};

	if (isLoading) {
		return <div className="h-16 rounded-lg bg-secondary/20 animate-pulse" />;
	}

	const connected = accounts?.filter((a) => a.active) ?? [];

	return (
		<div className="space-y-3">
			{connected.map((account) => (
				<div
					key={account.id}
					className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-secondary/5 px-4 py-3"
				>
					<div className="flex items-center gap-3 min-w-0">
						<div className="size-8 rounded-md flex items-center justify-center bg-emerald-500/10 text-emerald-500">
							<Plug className="size-4" />
						</div>
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<span className="font-body text-[14px] text-foreground font-medium">
									Google Calendar
								</span>
								<span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-500">
									<Check className="size-2.5" />
									Connected
								</span>
							</div>
							<span className="font-body text-[12px] text-grey-3 block truncate">
								{account.email}
							</span>
							{account.syncError && (
								<span className="font-mono text-[10px] text-red-500 block truncate">
									Sync error: {account.syncError}
								</span>
							)}
						</div>
					</div>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => handleDisconnect(account.id)}
						disabled={disconnectCalendar.isPending}
						className="font-mono text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
					>
						<Trash2 className="size-3" />
					</Button>
				</div>
			))}

			{connected.length === 0 && (
				<div className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-secondary/5 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="size-8 rounded-md flex items-center justify-center bg-secondary/30 text-grey-3">
							<Unplug className="size-4" />
						</div>
						<div>
							<span className="font-body text-[14px] text-foreground font-medium block">
								Google Calendar
							</span>
							<span className="font-body text-[12px] text-grey-3">
								Connect to sync your events
							</span>
						</div>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={handleConnect}
						disabled={connectCalendar.isPending}
						className="font-mono text-[11px] gap-1.5"
					>
						{connectCalendar.isPending ? (
							<Loader2 className="size-3 animate-spin" />
						) : (
							<Plug className="size-3" />
						)}
						Connect
					</Button>
				</div>
			)}
		</div>
	);
}

function formatEventTime(
	startTime: string,
	endTime: string,
	isAllDay: boolean,
): string {
	if (isAllDay) return "All day";

	const start = new Date(startTime);
	const end = new Date(endTime);
	const opts: Intl.DateTimeFormatOptions = {
		hour: "numeric",
		minute: "2-digit",
	};

	return `${start.toLocaleTimeString(undefined, opts)} \u2013 ${end.toLocaleTimeString(undefined, opts)}`;
}
