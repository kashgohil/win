import { api } from "@/lib/api";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

/* ── Query keys ── */

export const contactKeys = {
	all: ["contacts"] as const,
	list: (params?: {
		q?: string;
		starred?: boolean;
		archived?: boolean;
		tagId?: string;
		company?: string;
		sort?: string;
	}) => [...contactKeys.all, "list", params] as const,
	detail: (id: string) => [...contactKeys.all, "detail", id] as const,
	interactions: (id: string) =>
		[...contactKeys.all, "interactions", id] as const,
	emails: (id: string) => [...contactKeys.all, "emails", id] as const,
	events: (id: string) => [...contactKeys.all, "events", id] as const,
	tags: () => [...contactKeys.all, "tags"] as const,
	followUps: (params?: { type?: string }) =>
		[...contactKeys.all, "follow-ups", params] as const,
	data: () => [...contactKeys.all, "data"] as const,
	suggestions: () => [...contactKeys.all, "suggestions"] as const,
	meetingPrep: (eventId: string) =>
		[...contactKeys.all, "meeting-prep", eventId] as const,
};

/* ── Types ── */

export type Contact = {
	id: string;
	name: string | null;
	primaryEmail: string;
	company: string | null;
	jobTitle: string | null;
	phone: string | null;
	notes: string | null;
	starred: boolean;
	archived: boolean;
	relationshipScore: number;
	lastInteractionAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ContactDetail = Contact & {
	tags: { id: string; name: string; color: string | null }[];
	recentInteractions: {
		id: string;
		type: string;
		title: string;
		occurredAt: string;
	}[];
	avgResponseTimeMins: number | null;
};

export type ContactTag = {
	id: string;
	name: string;
	color: string | null;
	contactCount: number;
};

export type ContactFollowUp = {
	id: string;
	contactId: string;
	contactName: string | null;
	contactEmail: string | null;
	type: string;
	title: string;
	context: string | null;
	dueAt: string | null;
	status: string;
	createdAt: string;
};

/* ── Queries ── */

export function useContacts(params?: {
	q?: string;
	starred?: boolean;
	archived?: boolean;
	tagId?: string;
	company?: string;
	sort?: string;
	limit?: number;
}) {
	const pageSize = params?.limit ?? 50;

	return useInfiniteQuery({
		queryKey: contactKeys.list({
			q: params?.q,
			starred: params?.starred,
			archived: params?.archived,
			tagId: params?.tagId,
			company: params?.company,
			sort: params?.sort,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.contacts.get({
				query: {
					q: params?.q,
					starred: params?.starred ? "true" : undefined,
					archived: params?.archived ? "true" : undefined,
					tagId: params?.tagId,
					company: params?.company,
					sort: params?.sort,
					limit: pageSize.toString(),
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load contacts");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useContactDetail(id: string) {
	return useQuery({
		queryKey: contactKeys.detail(id),
		queryFn: async () => {
			const { data, error } = await api.contacts({ contactId: id }).get();
			if (error) throw new Error("Failed to load contact");
			return data;
		},
		enabled: !!id,
	});
}

export function useContactInteractions(
	contactId: string,
	params?: { limit?: number },
) {
	const pageSize = params?.limit ?? 20;

	return useInfiniteQuery({
		queryKey: contactKeys.interactions(contactId),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api
				.contacts({ contactId })
				.interactions.get({
					query: {
						limit: pageSize.toString(),
						cursor: pageParam,
					},
				});
			if (error) throw new Error("Failed to load interactions");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
		enabled: !!contactId,
	});
}

export function useContactEmails(
	contactId: string,
	params?: { limit?: number; offset?: number },
) {
	return useQuery({
		queryKey: [...contactKeys.emails(contactId), params?.offset],
		queryFn: async () => {
			const { data, error } = await api.contacts({ contactId }).emails.get({
				query: {
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			});
			if (error) throw new Error("Failed to load contact emails");
			return data;
		},
		enabled: !!contactId,
	});
}

export function useContactEvents(
	contactId: string,
	params?: { limit?: number; offset?: number },
) {
	return useQuery({
		queryKey: [...contactKeys.events(contactId), params?.offset],
		queryFn: async () => {
			const { data, error } = await api.contacts({ contactId }).events.get({
				query: {
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			});
			if (error) throw new Error("Failed to load contact events");
			return data;
		},
		enabled: !!contactId,
	});
}

export function useContactTags() {
	return useQuery({
		queryKey: contactKeys.tags(),
		queryFn: async () => {
			const { data, error } = await api.contacts.tags.get();
			if (error) throw new Error("Failed to load tags");
			return data.tags;
		},
	});
}

export function useFollowUps(params?: { type?: string }) {
	return useInfiniteQuery({
		queryKey: contactKeys.followUps(params),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.contacts["follow-ups"].get({
				query: {
					type: params?.type,
					limit: "20",
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load follow-ups");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useContactModuleData() {
	return useQuery({
		queryKey: contactKeys.data(),
		queryFn: async () => {
			const { data, error } = await api.contacts.data.get();
			if (error) throw new Error("Failed to load contacts data");
			return data;
		},
	});
}

export function useContactSuggestions() {
	return useQuery({
		queryKey: contactKeys.suggestions(),
		queryFn: async () => {
			const { data, error } = await api.contacts.suggestions.get();
			if (error) throw new Error("Failed to load suggestions");
			return data;
		},
		refetchInterval: 5 * 60 * 1000,
	});
}

export function useMeetingPrep(eventId: string) {
	return useQuery({
		queryKey: contactKeys.meetingPrep(eventId),
		queryFn: async () => {
			const { data, error } = await api.contacts["meeting-prep"]({
				eventId,
			}).get();
			if (error) throw new Error("Failed to load meeting prep");
			return data;
		},
		enabled: !!eventId,
	});
}

/* ── Contact Mutations ── */

export function useCreateContact() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			name?: string;
			primaryEmail: string;
			company?: string;
			jobTitle?: string;
			phone?: string;
			notes?: string;
		}) => {
			const { data, error } = await api.contacts.post(input);
			if (error) throw new Error("Failed to create contact");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}

export function useUpdateContact() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			name?: string;
			company?: string;
			jobTitle?: string;
			phone?: string;
			notes?: string;
		}) => {
			const { data, error } = await api
				.contacts({ contactId: id })
				.patch(input);
			if (error) throw new Error("Failed to update contact");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: contactKeys.list() });
			queryClient.invalidateQueries({
				queryKey: contactKeys.detail(variables.id),
			});
		},
	});
}

export function useDeleteContact() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.contacts({ contactId: id }).delete();
			if (error) throw new Error("Failed to delete contact");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}

export function useStarContact() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.contacts({ contactId: id }).star.post();
			if (error) throw new Error("Failed to toggle star");
			return data;
		},
		onMutate: async (id) => {
			await queryClient.cancelQueries({ queryKey: contactKeys.all });

			const listQueries = queryClient.getQueriesData<{
				pages: { contacts: Contact[] }[];
			}>({ queryKey: contactKeys.list() });

			for (const [key, data] of listQueries) {
				if (!data?.pages) continue;
				queryClient.setQueryData(key, {
					...data,
					pages: data.pages.map((page) => ({
						...page,
						contacts: page.contacts.map((c: Contact) =>
							c.id === id ? { ...c, starred: !c.starred } : c,
						),
					})),
				});
			}

			return { listQueries };
		},
		onError: (_err, _id, context) => {
			if (context?.listQueries) {
				for (const [key, data] of context.listQueries) {
					queryClient.setQueryData(key, data);
				}
			}
		},
		onSettled: (_data, _error, id) => {
			queryClient.invalidateQueries({ queryKey: contactKeys.list() });
			queryClient.invalidateQueries({
				queryKey: contactKeys.detail(id),
			});
		},
	});
}

export function useArchiveContact() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api
				.contacts({ contactId: id })
				.archive.post();
			if (error) throw new Error("Failed to toggle archive");
			return data;
		},
		onSuccess: (_data, id) => {
			queryClient.invalidateQueries({ queryKey: contactKeys.list() });
			queryClient.invalidateQueries({
				queryKey: contactKeys.detail(id),
			});
			queryClient.invalidateQueries({ queryKey: contactKeys.data() });
		},
	});
}

/* ── Tag Mutations ── */

export function useCreateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: { name: string; color?: string }) => {
			const { data, error } = await api.contacts.tags.post(input);
			if (error) throw new Error("Failed to create tag");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.tags() });
		},
	});
}

export function useUpdateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			name?: string;
			color?: string;
		}) => {
			const { data, error } = await api.contacts
				.tags({ tagId: id })
				.patch(input);
			if (error) throw new Error("Failed to update tag");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.tags() });
		},
	});
}

export function useDeleteTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.contacts.tags({ tagId: id }).delete();
			if (error) throw new Error("Failed to delete tag");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.tags() });
			queryClient.invalidateQueries({ queryKey: contactKeys.list() });
		},
	});
}

export function useAssignTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			contactId,
			tagId,
		}: {
			contactId: string;
			tagId: string;
		}) => {
			const { data, error } = await api
				.contacts({ contactId })
				.tags({ tagId })
				.post();
			if (error) throw new Error("Failed to assign tag");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: contactKeys.detail(variables.contactId),
			});
			queryClient.invalidateQueries({ queryKey: contactKeys.tags() });
		},
	});
}

export function useRemoveTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			contactId,
			tagId,
		}: {
			contactId: string;
			tagId: string;
		}) => {
			const { data, error } = await api
				.contacts({ contactId })
				.tags({ tagId })
				.delete();
			if (error) throw new Error("Failed to remove tag");
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({
				queryKey: contactKeys.detail(variables.contactId),
			});
			queryClient.invalidateQueries({ queryKey: contactKeys.tags() });
		},
	});
}

/* ── Follow-up Mutations ── */

export function useCompleteFollowUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (followUpId: string) => {
			const { data, error } = await api.contacts["follow-ups"]({
				followUpId,
			}).complete.post();
			if (error) throw new Error("Failed to complete follow-up");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: contactKeys.followUps(),
			});
			queryClient.invalidateQueries({ queryKey: contactKeys.data() });
		},
	});
}

export function useDismissFollowUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (followUpId: string) => {
			const { data, error } = await api.contacts["follow-ups"]({
				followUpId,
			}).dismiss.post();
			if (error) throw new Error("Failed to dismiss follow-up");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: contactKeys.followUps(),
			});
			queryClient.invalidateQueries({ queryKey: contactKeys.data() });
		},
	});
}

export function useSnoozeFollowUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			followUpId,
			until,
		}: {
			followUpId: string;
			until: string;
		}) => {
			const { data, error } = await api.contacts["follow-ups"]({
				followUpId,
			}).snooze.post({ until });
			if (error) throw new Error("Failed to snooze follow-up");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: contactKeys.followUps(),
			});
		},
	});
}

/* ── Discovery ── */

export function useDiscoverContacts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data, error } = await api.contacts.discover.post();
			if (error) throw new Error("Failed to trigger discovery");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: contactKeys.all });
		},
	});
}
