import { api } from "@/lib/api";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

/* ── Query keys ── */

export const taskKeys = {
	all: ["tasks"] as const,
	list: (params?: {
		q?: string;
		statusKey?: string;
		projectId?: string;
		priority?: string;
		source?: string;
		dueBefore?: string;
		dueAfter?: string;
		sort?: string;
	}) => [...taskKeys.all, "list", params] as const,
	detail: (id: string) => [...taskKeys.all, "detail", id] as const,
	projects: () => [...taskKeys.all, "projects"] as const,
	integrations: () => [...taskKeys.all, "integrations"] as const,
};

/* ── Task type (inferred from API response) ── */

export type Task = {
	id: string;
	source: "native" | "external";
	provider?: string | null;
	externalId?: string | null;
	externalUrl?: string | null;
	title: string;
	description?: string | null;
	statusKey: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
	priority: "none" | "low" | "medium" | "high" | "urgent";
	priorityScore: number;
	dueAt?: string | null;
	assigneeUserId?: string | null;
	externalAssigneeName?: string | null;
	projectId?: string | null;
	sourceEmailId?: string | null;
	completedAt?: string | null;
	reminderAt?: string | null;
	snoozedUntil?: string | null;
	writeBackState?: string | null;
	items: { id: string; title: string; completed: boolean; position: number }[];
	createdAt: string;
	updatedAt: string;
};

export type Project = {
	id: string;
	name: string;
	description?: string | null;
	source: "native" | "external";
	externalId?: string | null;
	color?: string | null;
	archived: boolean;
	createdAt: string;
};

/* ── Queries ── */

export function useTasksInfinite(params?: {
	q?: string;
	statusKey?: string;
	projectId?: string;
	priority?: string;
	source?: string;
	dueBefore?: string;
	dueAfter?: string;
	sort?: string;
	limit?: number;
}) {
	const pageSize = params?.limit ?? 50;

	return useInfiniteQuery({
		queryKey: taskKeys.list({
			q: params?.q,
			statusKey: params?.statusKey,
			projectId: params?.projectId,
			priority: params?.priority,
			source: params?.source,
			dueBefore: params?.dueBefore,
			dueAfter: params?.dueAfter,
			sort: params?.sort,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.tasks.get({
				query: {
					q: params?.q,
					statusKey: params?.statusKey,
					projectId: params?.projectId,
					priority: params?.priority,
					source: params?.source,
					dueBefore: params?.dueBefore,
					dueAfter: params?.dueAfter,
					sort: params?.sort,
					limit: pageSize.toString(),
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load tasks");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useTaskDetail(id: string) {
	return useQuery({
		queryKey: taskKeys.detail(id),
		queryFn: async () => {
			const { data, error } = await api.tasks({ taskId: id }).get();
			if (error) throw new Error("Failed to load task");
			return data;
		},
		enabled: !!id,
	});
}

export function useProjects() {
	return useQuery({
		queryKey: taskKeys.projects(),
		queryFn: async () => {
			const { data, error } = await api.tasks.projects.get();
			if (error) throw new Error("Failed to load projects");
			return data;
		},
	});
}

export function useTaskStats() {
	return useQuery({
		queryKey: [...taskKeys.all, "stats"],
		queryFn: async () => {
			const { data, error } = await api.tasks.stats.get();
			if (error) throw new Error("Failed to load stats");
			return data;
		},
	});
}

/* ── Mutations ── */

export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			title: string;
			description?: string;
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
			dueAt?: string | null;
			projectId?: string | null;
			sourceEmailId?: string | null;
			reminderAt?: string | null;
		}) => {
			const { data, error } = await api.tasks.post(input);
			if (error) throw new Error("Failed to create task");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			title?: string;
			description?: string | null;
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
			dueAt?: string | null;
			projectId?: string | null;
			reminderAt?: string | null;
			snoozedUntil?: string | null;
		}) => {
			const { data, error } = await api.tasks({ taskId: id }).patch(input);
			if (error) throw new Error("Failed to update task");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: taskKeys.list() });
			queryClient.invalidateQueries({
				queryKey: taskKeys.detail(variables.id),
			});
		},
	});
}

export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.tasks({ taskId: id }).delete();
			if (error) throw new Error("Failed to delete task");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useCreateTaskItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			title,
		}: {
			taskId: string;
			title: string;
		}) => {
			const { data, error } = await api.tasks({ taskId }).items.post({ title });
			if (error) throw new Error("Failed to add subtask");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: taskKeys.detail(variables.taskId),
			});
			queryClient.invalidateQueries({ queryKey: taskKeys.list() });
		},
	});
}

export function useUpdateTaskItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			itemId,
			...input
		}: {
			taskId: string;
			itemId: string;
			title?: string;
			completed?: boolean;
		}) => {
			const { data, error } = await api
				.tasks({ taskId })
				.items({ itemId })
				.patch(input);
			if (error) throw new Error("Failed to update subtask");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: taskKeys.detail(variables.taskId),
			});
			queryClient.invalidateQueries({ queryKey: taskKeys.list() });
		},
	});
}

export function useDeleteTaskItem() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			taskId,
			itemId,
		}: {
			taskId: string;
			itemId: string;
		}) => {
			const { data, error } = await api
				.tasks({ taskId })
				.items({ itemId })
				.delete();
			if (error) throw new Error("Failed to delete subtask");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: taskKeys.detail(variables.taskId),
			});
			queryClient.invalidateQueries({ queryKey: taskKeys.list() });
		},
	});
}

export function useSnoozeTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			snoozedUntil,
		}: {
			id: string;
			snoozedUntil: string;
		}) => {
			const { data, error } = await api
				.tasks({ taskId: id })
				.snooze.post({ snoozedUntil });
			if (error) throw new Error("Failed to snooze task");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: taskKeys.list() });
			queryClient.invalidateQueries({
				queryKey: taskKeys.detail(variables.id),
			});
		},
	});
}

export function useCreateTaskFromEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (emailId: string) => {
			const { data, error } = await api.tasks["from-email"]({
				emailId,
			}).post();
			if (error) throw new Error("Failed to create task from email");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useConnections() {
	return useQuery({
		queryKey: taskKeys.integrations(),
		queryFn: async () => {
			const { data, error } = await api.tasks.integrations.get();
			if (error) throw new Error("Failed to load integrations");
			return data;
		},
	});
}

export function useConnectProvider() {
	return useMutation({
		mutationFn: async (provider: string) => {
			const { data, error } = await api.tasks.integrations
				.connect({
					provider,
				})
				.post();
			if (error) throw new Error("Failed to connect");
			return data;
		},
	});
}

export function useSyncConnection() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (connectionId: string) => {
			const { data, error } = await api.tasks
				.integrations({
					connectionId,
				})
				.sync.post();
			if (error) throw new Error("Failed to sync");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useDisconnectProvider() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (connectionId: string) => {
			const { data, error } = await api.tasks
				.integrations({
					connectionId,
				})
				.delete();
			if (error) throw new Error("Failed to disconnect");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.integrations() });
		},
	});
}

export function useTaskSuggestions() {
	return useQuery({
		queryKey: [...taskKeys.all, "suggestions"],
		queryFn: async () => {
			const { data, error } = await api.tasks.suggestions.get();
			if (error) throw new Error("Failed to load suggestions");
			return data;
		},
		refetchInterval: 5 * 60 * 1000,
	});
}

export function useParseTaskInput() {
	return useMutation({
		mutationFn: async (input: string) => {
			const { data, error } = await api.tasks.parse.post({ input });
			if (error) throw new Error("Failed to parse task input");
			return data;
		},
	});
}

export function useBulkUpdateTasks() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			taskIds: string[];
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
		}) => {
			const { data, error } = await api.tasks["bulk-update"].post(input);
			if (error) throw new Error("Failed to bulk update tasks");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useBulkDeleteTasks() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (taskIds: string[]) => {
			const { data, error } = await api.tasks["bulk-delete"].post({
				taskIds,
			});
			if (error) throw new Error("Failed to bulk delete tasks");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useCreateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			name: string;
			description?: string;
			color?: string;
		}) => {
			const { data, error } = await api.tasks.projects.post(input);
			if (error) throw new Error("Failed to create project");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.projects() });
		},
	});
}

export function useProjectDetail(projectId: string) {
	return useQuery({
		queryKey: [...taskKeys.projects(), projectId],
		queryFn: async () => {
			const { data, error } = await api.tasks
				.projects({
					projectId,
				})
				.get();
			if (error) throw new Error("Failed to load project");
			return data;
		},
		enabled: !!projectId,
	});
}

export function useUpdateProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			name?: string;
			description?: string | null;
			color?: string | null;
			archived?: boolean;
		}) => {
			const { data, error } = await api.tasks
				.projects({
					projectId: id,
				})
				.patch(input);
			if (error) throw new Error("Failed to update project");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.projects() });
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useDeleteProject() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.tasks
				.projects({
					projectId: id,
				})
				.delete();
			if (error) throw new Error("Failed to delete project");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: taskKeys.projects() });
			queryClient.invalidateQueries({ queryKey: taskKeys.all });
		},
	});
}

export function useActivityLog(opts?: { taskId?: string }) {
	return useInfiniteQuery({
		queryKey: [...taskKeys.all, "activity", opts?.taskId],
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.tasks.activity.get({
				query: {
					taskId: opts?.taskId,
					cursor: pageParam,
					limit: "50",
				},
			});
			if (error) throw new Error("Failed to load activity log");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}
