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
		category?: string;
		limit?: number;
		unreadOnly?: boolean;
		readOnly?: boolean;
		q?: string;
		from?: string;
		subject?: string;
		to?: string;
		cc?: string;
		label?: string;
		starred?: boolean;
		attachment?: boolean;
		after?: string;
		before?: string;
	}) => [...mailKeys.all, "emails", params] as const,
	email: (id: string) => [...mailKeys.all, "email", id] as const,
	accounts: () => [...mailKeys.all, "accounts"] as const,
	senders: (q?: string) => [...mailKeys.all, "senders", q] as const,
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
	category?: string;
	limit?: number;
	unreadOnly?: boolean;
	readOnly?: boolean;
	q?: string;
	from?: string;
	subject?: string;
	to?: string;
	cc?: string;
	label?: string;
	starred?: boolean;
	attachment?: boolean;
	after?: string;
	before?: string;
}) {
	const pageSize = params?.limit ?? 30;

	return useInfiniteQuery({
		queryKey: mailKeys.emails({
			category: params?.category,
			unreadOnly: params?.unreadOnly,
			readOnly: params?.readOnly,
			q: params?.q,
			from: params?.from,
			subject: params?.subject,
			to: params?.to,
			cc: params?.cc,
			label: params?.label,
			starred: params?.starred,
			attachment: params?.attachment,
			after: params?.after,
			before: params?.before,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.mail.emails.get({
				query: {
					category: params?.category,
					limit: pageSize.toString(),
					cursor: pageParam,
					unreadOnly: params?.unreadOnly ? "true" : undefined,
					readOnly: params?.readOnly ? "true" : undefined,
					q: params?.q,
					from: params?.from,
					subject: params?.subject,
					to: params?.to,
					cc: params?.cc,
					label: params?.label,
					starred: params?.starred ? "true" : undefined,
					attachment: params?.attachment ? "true" : undefined,
					after: params?.after,
					before: params?.before,
				},
			});
			if (error) throw new Error("Failed to load emails");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useMailSenders(q: string) {
	return useQuery({
		queryKey: mailKeys.senders(q),
		queryFn: async () => {
			const { data, error } = await api.mail.senders.get({
				query: { q: q || undefined },
			});
			if (error) throw new Error("Failed to load senders");
			return data;
		},
		enabled: q.length >= 1,
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

export function useCategorizeSender() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			senderAddress,
			category,
		}: {
			senderAddress: string;
			category: EmailCategory;
		}) => {
			const { data, error } = await api.mail["sender-rules"].post({
				senderAddress,
				category,
			});
			if (error) throw new Error("Failed to create sender rule");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["mail", "emails"] });
			queryClient.invalidateQueries({ queryKey: mailKeys.data() });
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
