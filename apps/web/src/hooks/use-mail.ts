import { api } from "@/lib/api";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type {
	EmailCategory,
	EmailProvider,
	TriageAction,
} from "@wingmnn/types";

/* ── Query keys ── */

export const mailKeys = {
	all: ["mail"] as const,
	data: () => [...mailKeys.all, "data"] as const,
	emails: (params?: {
		category?: EmailCategory;
		limit?: number;
		offset?: number;
		unreadOnly?: boolean;
	}) => [...mailKeys.all, "emails", params] as const,
	email: (id: string) => [...mailKeys.all, "email", id] as const,
	accounts: () => [...mailKeys.all, "accounts"] as const,
};

/* ── Queries ── */

export function useMailData() {
	return useQuery({
		queryKey: mailKeys.data(),
		queryFn: async () => {
			const { data, error } = await api.mail.data.get();
			if (error) throw new Error("Failed to load mail data");
			return data;
		},
	});
}

export function useMailEmailsInfinite(params?: {
	category?: EmailCategory;
	limit?: number;
	unreadOnly?: boolean;
}) {
	const pageSize = params?.limit ?? 30;

	return useInfiniteQuery({
		queryKey: mailKeys.emails({
			category: params?.category,
			unreadOnly: params?.unreadOnly,
		}),
		queryFn: async ({ pageParam = 0 }) => {
			const { data, error } = await api.mail.emails.get({
				query: {
					category: params?.category,
					limit: pageSize.toString(),
					offset: pageParam.toString(),
					unreadOnly: params?.unreadOnly ? "true" : undefined,
				},
			});
			if (error) throw new Error("Failed to load emails");
			return data;
		},
		initialPageParam: 0,
		getNextPageParam: (lastPage, _allPages, lastPageParam) =>
			lastPage?.hasMore ? lastPageParam + pageSize : undefined,
	});
}

export function useMailEmailDetail(id: string) {
	return useQuery({
		queryKey: mailKeys.email(id),
		queryFn: async () => {
			const { data, error } = await api.mail.emails({ id }).get();
			if (error) throw new Error("Failed to load email");
			return data;
		},
		enabled: !!id,
	});
}

export function useMailAccounts() {
	return useQuery({
		queryKey: mailKeys.accounts(),
		queryFn: async () => {
			const { data, error } = await api.mail.accounts.get();
			if (error) throw new Error("Failed to load accounts");
			return data;
		},
	});
}

/* ── Mutations ── */

export function useTriageAction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			action,
			snoozeDuration,
		}: {
			id: string;
			action: TriageAction;
			snoozeDuration?: number;
		}) => {
			const { data, error } = await api.mail.triage({ id }).action.post({
				action,
				snoozeDuration,
			});
			if (error) throw new Error("Failed to execute triage action");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.data() });
		},
	});
}

export function useConnectAccount() {
	return useMutation({
		mutationFn: async (provider: EmailProvider) => {
			const { data, error } = await api.mail.link({ provider }).post();
			if (error) throw new Error("Failed to connect account");
			return data;
		},
	});
}

export function useReplyToEmail() {
	return useMutation({
		mutationFn: async ({
			id,
			body,
			cc,
		}: {
			id: string;
			body: string;
			cc?: string[];
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				.reply.post({ body, cc });
			if (error) throw new Error("Failed to send reply");
			return data;
		},
	});
}

export function useForwardEmail() {
	return useMutation({
		mutationFn: async ({
			id,
			to,
			body,
		}: {
			id: string;
			to: string[];
			body: string;
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				.forward.post({ to, body });
			if (error) throw new Error("Failed to forward email");
			return data;
		},
	});
}
