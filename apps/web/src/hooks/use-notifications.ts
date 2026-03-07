import { api } from "@/lib/api";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

/* ── Query keys ── */

export const notificationKeys = {
	all: ["notifications"] as const,
	list: () => [...notificationKeys.all, "list"] as const,
	unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
};

/* ── Types ── */

export type Notification = {
	id: string;
	type:
		| "task_reminder"
		| "task_due_soon"
		| "task_overdue"
		| "sync_failed"
		| "task_assigned"
		| "work_summary";
	title: string;
	body?: string | null;
	link?: string | null;
	read: boolean;
	taskId?: string | null;
	createdAt: string;
};

/* ── Queries ── */

export function useUnreadCount() {
	return useQuery({
		queryKey: notificationKeys.unreadCount(),
		queryFn: async () => {
			const { data, error } = await api.notifications["unread-count"].get();
			if (error) throw new Error("Failed to load unread count");
			return data;
		},
		refetchInterval: 30 * 1000,
	});
}

export function useNotifications(opts?: { enabled?: boolean }) {
	return useInfiniteQuery({
		queryKey: notificationKeys.list(),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.notifications.get({
				query: {
					limit: "20",
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load notifications");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
		enabled: opts?.enabled ?? true,
	});
}

/* ── Mutations ── */

export function useMarkRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.notifications({ id }).read.patch();
			if (error) throw new Error("Failed to mark as read");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: notificationKeys.all,
			});
		},
	});
}

export function useMarkAllRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data, error } = await api.notifications["mark-all-read"].post();
			if (error) throw new Error("Failed to mark all as read");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: notificationKeys.all,
			});
		},
	});
}

export function useDeleteNotification() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.notifications({ id }).delete();
			if (error) throw new Error("Failed to delete notification");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: notificationKeys.all,
			});
		},
	});
}
