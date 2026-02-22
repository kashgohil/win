import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

export function useMailEmails(params?: {
	category?: EmailCategory;
	limit?: number;
	offset?: number;
}) {
	return useQuery({
		queryKey: mailKeys.emails(params),
		queryFn: async () => {
			const { data, error } = await api.mail.emails.get({
				query: {
					category: params?.category,
					limit: params?.limit?.toString(),
					offset: params?.offset?.toString(),
				},
			});
			if (error) throw new Error("Failed to load emails");
			return data;
		},
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
