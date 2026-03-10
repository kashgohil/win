import {
	type Notification,
	useDeleteNotification,
	useMarkAllRead,
	useMarkRead,
	useNotifications,
	useUnreadCount,
} from "@/hooks/use-notifications";
import { cn, relativeTime } from "@/lib/utils";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	AlertTriangle,
	BarChart3,
	Bell,
	Check,
	CheckCheck,
	Clock,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/notifications")({
	component: NotificationsPage,
});

/* ── Icon config ── */

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

/* ── Filters ── */

type FilterKey = "all" | "unread" | "read";

const filters: { key: FilterKey; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "unread", label: "Unread" },
	{ key: "read", label: "Read" },
];

/* ── Group notifications by date ── */

function groupByDate(
	notifications: Notification[],
): { label: string; items: Notification[] }[] {
	const groups: Map<string, Notification[]> = new Map();

	for (const n of notifications) {
		const d = new Date(n.createdAt);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const isYesterday = d.toDateString() === yesterday.toDateString();

		let label: string;
		if (isToday) {
			label = "Today";
		} else if (isYesterday) {
			label = "Yesterday";
		} else {
			label = d.toLocaleDateString("en-US", {
				weekday: "long",
				month: "short",
				day: "numeric",
			});
		}

		if (!groups.has(label)) {
			groups.set(label, []);
		}
		groups.get(label)!.push(n);
	}

	return Array.from(groups.entries()).map(([label, items]) => ({
		label,
		items,
	}));
}

/* ── Notification row ── */

function NotificationRow({
	notification,
	index,
}: {
	notification: Notification;
	index: number;
}) {
	const markRead = useMarkRead();
	const deleteNotification = useDeleteNotification();
	const navigate = useNavigate();

	const config = iconConfig[notification.type] ?? {
		icon: Bell,
		color: "text-grey-3",
		bg: "bg-secondary",
	};
	const Icon = config.icon;

	const handleClick = () => {
		if (!notification.read) {
			markRead.mutate(notification.id);
		}
		if (notification.link) {
			navigate({ to: notification.link });
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.25,
				delay: Math.min(index * 0.04, 0.4),
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			<div
				className={cn(
					"group flex items-start gap-3 px-4 py-3.5 rounded-lg transition-all duration-150",
					notification.link && "cursor-pointer",
					!notification.read
						? "bg-secondary/20 hover:bg-secondary/40"
						: "hover:bg-secondary/20",
				)}
				onClick={handleClick}
				onKeyDown={(e) => {
					if (e.key === "Enter") handleClick();
				}}
				tabIndex={0}
				role="button"
			>
				{/* Icon */}
				<div
					className={cn(
						"size-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
						config.bg,
					)}
				>
					<Icon className={cn("size-4", config.color)} />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2">
								<p
									className={cn(
										"font-body text-[14px] leading-snug",
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
								<p className="font-body text-[13px] text-grey-3 mt-0.5 line-clamp-2">
									{notification.body}
								</p>
							)}
						</div>
						<span className="font-mono text-[10px] text-grey-3/70 shrink-0 mt-0.5">
							{relativeTime(notification.createdAt)}
						</span>
					</div>
				</div>

				{/* Delete */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						deleteNotification.mutate(notification.id);
					}}
					className="mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-grey-3 hover:text-accent-red"
				>
					<Trash2 className="size-3.5" />
				</button>
			</div>
		</motion.div>
	);
}

/* ── Page ── */

function NotificationsPage() {
	const [filter, setFilter] = useState<FilterKey>("all");
	const { data: unreadData } = useUnreadCount();
	const { data, hasNextPage, fetchNextPage, isFetchingNextPage, isPending } =
		useNotifications();
	const markAllRead = useMarkAllRead();

	const unreadCount = unreadData?.count ?? 0;

	const allNotifications = useMemo(
		() => data?.pages.flatMap((p) => p?.notifications ?? []) ?? [],
		[data],
	);

	const filteredNotifications = useMemo(() => {
		const typed = allNotifications as Notification[];
		switch (filter) {
			case "unread":
				return typed.filter((n) => !n.read);
			case "read":
				return typed.filter((n) => n.read);
			default:
				return typed;
		}
	}, [allNotifications, filter]);

	const grouped = useMemo(
		() => groupByDate(filteredNotifications),
		[filteredNotifications],
	);

	return (
		<div className="max-w-5xl mx-auto px-(--page-px) py-10">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
			>
				<div className="flex items-end justify-between mb-8">
					<div>
						<h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
							Notifications
						</h1>
						<p className="font-body text-[14px] text-grey-3 mt-1">
							{unreadCount > 0
								? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
								: "You're all caught up"}
						</p>
					</div>

					{unreadCount > 0 && (
						<button
							type="button"
							onClick={() => markAllRead.mutate()}
							className="flex items-center gap-1.5 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors"
						>
							<CheckCheck className="size-3.5" />
							Mark all as read
						</button>
					)}
				</div>

				{/* Filters */}
				<div className="flex items-center gap-1 mb-6">
					{filters.map((f) => (
						<button
							key={f.key}
							type="button"
							onClick={() => setFilter(f.key)}
							className={cn(
								"font-mono text-[11px] px-3 py-1.5 rounded-md transition-all duration-150",
								filter === f.key
									? "bg-foreground text-background font-medium"
									: "text-grey-3 hover:text-foreground hover:bg-secondary/40",
							)}
						>
							{f.label}
							{f.key === "unread" && unreadCount > 0 && (
								<span className="ml-1.5 text-[10px] opacity-60">
									{unreadCount}
								</span>
							)}
						</button>
					))}
				</div>
			</motion.div>

			{/* Content */}
			{isPending ? (
				<div className="py-20 flex flex-col items-center gap-3">
					<div className="size-5 border-2 border-grey-3/30 border-t-grey-3 rounded-full animate-spin" />
					<p className="font-mono text-[11px] text-grey-3">
						Loading notifications...
					</p>
				</div>
			) : filteredNotifications.length === 0 ? (
				<motion.div
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
					className="py-20 flex flex-col items-center gap-3"
				>
					<div className="size-14 rounded-full bg-secondary/40 flex items-center justify-center">
						<Bell className="size-6 text-grey-3/40" />
					</div>
					<div className="text-center">
						<p className="font-body text-[15px] text-grey-3">
							{filter === "unread"
								? "No unread notifications"
								: filter === "read"
									? "No read notifications"
									: "No notifications yet"}
						</p>
						<p className="font-mono text-[11px] text-grey-3/50 mt-1">
							{filter === "unread"
								? "You're all caught up!"
								: "We'll notify you when something needs your attention"}
						</p>
					</div>
				</motion.div>
			) : (
				<div className="space-y-6">
					{grouped.map((group) => (
						<div key={group.label}>
							<div className="flex items-center gap-3 mb-2">
								<span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-grey-3/70">
									{group.label}
								</span>
								<div className="flex-1 h-px bg-border/40" />
							</div>
							<div className="space-y-0.5">
								<AnimatePresence mode="popLayout">
									{group.items.map((n, i) => (
										<NotificationRow key={n.id} notification={n} index={i} />
									))}
								</AnimatePresence>
							</div>
						</div>
					))}

					{/* Load more */}
					{hasNextPage && (
						<div className="flex justify-center pt-4 pb-8">
							<button
								type="button"
								onClick={() => fetchNextPage()}
								disabled={isFetchingNextPage}
								className={cn(
									"font-mono text-[11px] px-5 py-2 rounded-md border border-border/50 transition-all duration-150",
									isFetchingNextPage
										? "text-grey-3/50"
										: "text-grey-3 hover:text-foreground hover:border-border hover:bg-secondary/20",
								)}
							>
								{isFetchingNextPage ? "Loading..." : "Load more notifications"}
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
