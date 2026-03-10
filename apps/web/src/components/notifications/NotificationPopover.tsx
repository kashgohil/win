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
import { cn, relativeTime } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowRight,
	BarChart3,
	Bell,
	Check,
	CheckCheck,
	Clock,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/* ── Type icon mapping ── */

const iconConfig: Record<
	string,
	{ icon: typeof Clock; color: string; bg: string }
> = {
	task_reminder: {
		icon: Clock,
		color: "text-blue-500",
		bg: "bg-blue-500/10 dark:bg-blue-500/15",
	},
	task_due_soon: {
		icon: Clock,
		color: "text-amber-500",
		bg: "bg-amber-500/10 dark:bg-amber-500/15",
	},
	task_overdue: {
		icon: AlertTriangle,
		color: "text-red-500",
		bg: "bg-red-500/10 dark:bg-red-500/15",
	},
	sync_failed: {
		icon: AlertTriangle,
		color: "text-red-500",
		bg: "bg-red-500/10 dark:bg-red-500/15",
	},
	task_assigned: {
		icon: Check,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
	},
	work_summary: {
		icon: BarChart3,
		color: "text-violet-500",
		bg: "bg-violet-500/10 dark:bg-violet-500/15",
	},
};

function NotificationIcon({ type }: { type: Notification["type"] }) {
	const config = iconConfig[type] ?? {
		icon: Bell,
		color: "text-grey-3",
		bg: "bg-secondary",
	};
	const Icon = config.icon;
	return (
		<div
			className={cn(
				"size-7 rounded-full flex items-center justify-center shrink-0",
				config.bg,
			)}
		>
			<Icon className={cn("size-3.5", config.color)} />
		</div>
	);
}

/* ── Notification item ── */

function NotificationItem({
	notification,
	onNavigate,
	index,
}: {
	notification: Notification;
	onNavigate: (link: string) => void;
	index: number;
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
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2, delay: index * 0.03 }}
		>
			<div
				className={cn(
					"group flex items-start gap-2.5 px-3 py-2.5 transition-colors duration-150 rounded-md mx-1",
					notification.link && "cursor-pointer",
					!notification.read
						? "hover:bg-secondary/60"
						: "hover:bg-secondary/30",
				)}
			>
				<button
					type="button"
					onClick={handleClick}
					className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
				>
					{/* Icon */}
					<NotificationIcon type={notification.type} />

					{/* Content */}
					<div className="flex-1 min-w-0 pt-0.5">
						<div className="flex items-center gap-2">
							<p
								className={cn(
									"font-body text-[13px] leading-snug truncate",
									notification.read
										? "text-grey-3"
										: "text-foreground font-medium",
								)}
							>
								{notification.title}
							</p>
							{!notification.read && (
								<span className="size-1.5 rounded-full bg-accent-red shrink-0" />
							)}
						</div>
						{notification.body && (
							<p className="font-body text-[12px] text-grey-3 line-clamp-2 mt-0.5">
								{notification.body}
							</p>
						)}
						<span className="font-mono text-[10px] text-grey-3/70 mt-1 block">
							{relativeTime(notification.createdAt, { compact: true })}
						</span>
					</div>
				</button>

				{/* Delete button */}
				<button
					type="button"
					onClick={() => deleteNotification.mutate(notification.id)}
					className="mt-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-grey-3 hover:text-accent-red"
				>
					<Trash2 className="size-3" />
				</button>
			</div>
		</motion.div>
	);
}

/* ── Infinite scroll sentinel ── */

function InfiniteScrollSentinel({
	onIntersect,
	loading,
}: {
	onIntersect: () => void;
	loading: boolean;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && !loading) {
					onIntersect();
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(el);
		return () => observer.disconnect();
	}, [onIntersect, loading]);

	return (
		<div ref={ref} className="flex items-center justify-center py-2">
			{loading && (
				<span className="font-mono text-[10px] text-grey-3 animate-pulse">
					Loading...
				</span>
			)}
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
					<AnimatePresence>
						{unreadCount > 0 && (
							<motion.span
								initial={{ scale: 0 }}
								animate={{ scale: 1 }}
								exit={{ scale: 0 }}
								transition={{
									type: "spring",
									stiffness: 500,
									damping: 25,
								}}
								className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-accent-red flex items-center justify-center"
							>
								<span className="font-mono text-[8px] font-bold text-white leading-none">
									{unreadCount > 9 ? "9+" : unreadCount}
								</span>
							</motion.span>
						)}
					</AnimatePresence>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side="right"
				align="end"
				className="w-[340px] p-0 overflow-hidden flex flex-col max-h-[min(480px,70vh)]"
				sideOffset={8}
			>
				{/* Header */}
				<div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 shrink-0">
					<div className="flex items-center gap-2">
						<span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-foreground">
							Notifications
						</span>
						{unreadCount > 0 && (
							<span className="font-mono text-[10px] text-grey-3 bg-secondary rounded-full px-1.5 py-0.5 leading-none">
								{unreadCount}
							</span>
						)}
					</div>
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
				<ScrollArea className="flex-1 min-h-0 overflow-y-auto">
					<div className="py-1">
						{allNotifications.length === 0 ? (
							<div className="py-12 flex flex-col items-center gap-2.5">
								<div className="size-10 rounded-full bg-secondary/50 flex items-center justify-center">
									<Bell className="size-4 text-grey-3/50" />
								</div>
								<div className="text-center">
									<p className="font-body text-[13px] text-grey-3">
										No notifications yet
									</p>
									<p className="font-mono text-[10px] text-grey-3/60 mt-0.5">
										We'll let you know when something happens
									</p>
								</div>
							</div>
						) : (
							<>
								{allNotifications.map((n, i) => (
									<NotificationItem
										key={n.id}
										notification={n as Notification}
										onNavigate={handleNavigate}
										index={i}
									/>
								))}
							</>
						)}

						{/* Infinite scroll sentinel */}
						{hasNextPage && (
							<InfiniteScrollSentinel
								onIntersect={fetchNextPage}
								loading={isFetchingNextPage}
							/>
						)}
					</div>
				</ScrollArea>

				{/* Footer — View all link */}
				<div className="border-t border-border/50 px-3 py-2 bg-background shrink-0">
					<Link
						to="/notifications"
						onClick={() => setOpen(false)}
						className="group flex items-center justify-center gap-1.5 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors py-0.5"
					>
						View all notifications
						<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
					</Link>
				</div>
			</PopoverContent>
		</Popover>
	);
}
