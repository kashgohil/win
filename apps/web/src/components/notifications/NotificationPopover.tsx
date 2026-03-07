import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type Notification,
	useDeleteNotification,
	useMarkAllRead,
	useMarkRead,
	useNotifications,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	BarChart3,
	Bell,
	Check,
	CheckCheck,
	Clock,
	Trash2,
} from "lucide-react";
import { useState } from "react";

/* ── Type icon mapping ── */

function NotificationIcon({ type }: { type: Notification["type"] }) {
	switch (type) {
		case "task_reminder":
			return <Clock className="size-3.5 text-blue-500" />;
		case "task_due_soon":
			return <Clock className="size-3.5 text-amber-500" />;
		case "task_overdue":
			return <AlertTriangle className="size-3.5 text-red-500" />;
		case "sync_failed":
			return <AlertTriangle className="size-3.5 text-red-500" />;
		case "task_assigned":
			return <Check className="size-3.5 text-emerald-500" />;
		case "work_summary":
			return <BarChart3 className="size-3.5 text-violet-500" />;
		default:
			return <Bell className="size-3.5 text-grey-3" />;
	}
}

/* ── Relative time ── */

function relativeTime(iso: string): string {
	const now = Date.now();
	const then = new Date(iso).getTime();
	const diffMs = now - then;
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}m`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}h`;
	const diffDay = Math.floor(diffHr / 24);
	if (diffDay < 7) return `${diffDay}d`;
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

/* ── Notification item ── */

function NotificationItem({
	notification,
	onNavigate,
}: {
	notification: Notification;
	onNavigate: (link: string) => void;
}) {
	const markRead = useMarkRead();
	const deleteNotification = useDeleteNotification();

	const handleClick = () => {
		if (!notification.read) {
			markRead.mutate(notification.id);
		}
		if (notification.link) {
			onNavigate(notification.link);
		}
	};

	return (
		<div
			className={cn(
				"group flex items-start gap-2.5 px-3 py-2.5 transition-colors duration-150",
				notification.link && "cursor-pointer hover:bg-secondary/30",
				!notification.read && "bg-secondary/15",
			)}
		>
			<button
				type="button"
				onClick={handleClick}
				className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
			>
				{/* Unread dot */}
				<div className="mt-1.5 shrink-0 w-1.5">
					{!notification.read && (
						<span className="block size-1.5 rounded-full bg-blue-500" />
					)}
				</div>

				{/* Icon */}
				<div className="mt-0.5 shrink-0">
					<NotificationIcon type={notification.type} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<p
						className={cn(
							"font-body text-[13px] leading-snug truncate",
							notification.read ? "text-grey-3" : "text-foreground",
						)}
					>
						{notification.title}
					</p>
					{notification.body && (
						<p className="font-body text-[12px] text-grey-3 truncate mt-0.5">
							{notification.body}
						</p>
					)}
					<span className="font-mono text-[10px] text-grey-3 mt-1 block">
						{relativeTime(notification.createdAt)}
					</span>
				</div>
			</button>

			{/* Delete button */}
			<button
				type="button"
				onClick={() => deleteNotification.mutate(notification.id)}
				className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-grey-3 hover:text-red-500"
			>
				<Trash2 className="size-3" />
			</button>
		</div>
	);
}

/* ── Main popover ── */

export function NotificationPopover({ unreadCount }: { unreadCount: number }) {
	const [open, setOpen] = useState(false);
	const { data, hasNextPage, fetchNextPage, isFetchingNextPage } =
		useNotifications({ enabled: open });
	const markAllRead = useMarkAllRead();
	const navigate = useNavigate();

	const allNotifications =
		data?.pages.flatMap((p) => p?.notifications ?? []) ?? [];

	const handleNavigate = (link: string) => {
		setOpen(false);
		navigate({ to: link });
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon-sm"
					className="relative text-grey-3 hover:text-foreground"
				>
					<Bell className="h-3.5 w-3.5" />
					{unreadCount > 0 && (
						<span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-accent-red flex items-center justify-center">
							<span className="font-mono text-[8px] font-bold text-white leading-none">
								{unreadCount > 9 ? "9+" : unreadCount}
							</span>
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side="right"
				align="end"
				className="w-80 p-0"
				sideOffset={8}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
					<span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-foreground">
						Notifications
					</span>
					{unreadCount > 0 && (
						<button
							type="button"
							onClick={() => markAllRead.mutate()}
							className="flex items-center gap-1 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors"
						>
							<CheckCheck className="size-3" />
							Mark all read
						</button>
					)}
				</div>

				{/* List */}
				<ScrollArea className="max-h-80">
					{allNotifications.length === 0 ? (
						<div className="py-10 flex flex-col items-center gap-2">
							<Bell className="size-5 text-grey-3/50" />
							<p className="font-body text-[13px] text-grey-3">
								No notifications
							</p>
						</div>
					) : (
						<div className="divide-y divide-border/30">
							{allNotifications.map((n) => (
								<NotificationItem
									key={n.id}
									notification={n as Notification}
									onNavigate={handleNavigate}
								/>
							))}
						</div>
					)}

					{/* Load more */}
					{hasNextPage && (
						<div className="px-3 py-2 border-t border-border/30">
							<button
								type="button"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
								className="w-full font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors text-center py-1"
							>
								{isFetchingNextPage ? "Loading..." : "Load more"}
							</button>
						</div>
					)}
				</ScrollArea>
			</PopoverContent>
		</Popover>
	);
}
