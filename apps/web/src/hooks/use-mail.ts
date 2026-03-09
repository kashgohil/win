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
	data: (accountIds?: string[]) =>
		[...mailKeys.all, "data", accountIds] as const,
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
		filename?: string;
		filetype?: string;
		after?: string;
		before?: string;
		accountIds?: string[];
	}) => [...mailKeys.all, "emails", params] as const,
	email: (id: string) => [...mailKeys.all, "email", id] as const,
	threads: (params?: {
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
		filename?: string;
		filetype?: string;
		after?: string;
		before?: string;
		accountIds?: string[];
		sentOnly?: boolean;
	}) => [...mailKeys.all, "threads", params] as const,
	thread: (id: string) => [...mailKeys.all, "thread", id] as const,
	accounts: () => [...mailKeys.all, "accounts"] as const,
	senders: (q?: string) => [...mailKeys.all, "senders", q] as const,
	attachments: (params?: {
		q?: string;
		filetype?: string;
		category?: string;
		from?: string;
		after?: string;
		before?: string;
		accountIds?: string[];
	}) => [...mailKeys.all, "attachments", params] as const,
};

/* ── Queries ── */

export function useMailData(accountIds?: string[]) {
	return useQuery({
		queryKey: mailKeys.data(accountIds),
		queryFn: async () => {
			const { data, error } = await api.mail.data.get({
				query: {
					accountIds: accountIds?.join(","),
				},
			});
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
	filename?: string;
	filetype?: string;
	after?: string;
	before?: string;
	accountIds?: string[];
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
			filename: params?.filename,
			filetype: params?.filetype,
			after: params?.after,
			before: params?.before,
			accountIds: params?.accountIds,
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
					filename: params?.filename,
					filetype: params?.filetype,
					after: params?.after,
					before: params?.before,
					accountIds: params?.accountIds?.join(","),
				},
			});
			if (error) throw new Error("Failed to load emails");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useMailAttachmentsInfinite(params?: {
	q?: string;
	filetype?: string;
	category?: string;
	from?: string;
	after?: string;
	before?: string;
	accountIds?: string[];
}) {
	const pageSize = 30;

	return useInfiniteQuery({
		queryKey: mailKeys.attachments({
			q: params?.q,
			filetype: params?.filetype,
			category: params?.category,
			from: params?.from,
			after: params?.after,
			before: params?.before,
			accountIds: params?.accountIds,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.mail.attachments.get({
				query: {
					limit: pageSize.toString(),
					cursor: pageParam,
					q: params?.q,
					filetype: params?.filetype,
					category: params?.category,
					from: params?.from,
					after: params?.after,
					before: params?.before,
					accountIds: params?.accountIds?.join(","),
				},
			});
			if (error) throw new Error("Failed to load attachments");
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

export function useMailThreadsInfinite(params?: {
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
	filename?: string;
	filetype?: string;
	after?: string;
	before?: string;
	accountIds?: string[];
	sentOnly?: boolean;
}) {
	const pageSize = params?.limit ?? 30;

	return useInfiniteQuery({
		queryKey: mailKeys.threads({
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
			filename: params?.filename,
			filetype: params?.filetype,
			after: params?.after,
			before: params?.before,
			accountIds: params?.accountIds,
			sentOnly: params?.sentOnly,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.mail.threads.get({
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
					filename: params?.filename,
					filetype: params?.filetype,
					after: params?.after,
					before: params?.before,
					accountIds: params?.accountIds?.join(","),
					sentOnly: params?.sentOnly ? "true" : undefined,
				},
			});
			if (error) throw new Error("Failed to load threads");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useMailThreadDetail(threadId: string) {
	return useQuery({
		queryKey: mailKeys.thread(threadId),
		queryFn: async () => {
			const { data, error } = await api.mail.threads({ threadId }).get();
			if (error) throw new Error("Failed to load thread");
			return data;
		},
		enabled: !!threadId,
	});
}

export function useMergeThreads() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (threadIds: string[]) => {
			const { data, error } = await api.mail.threads.merge.post({
				threadIds,
			});
			if (error) throw new Error("Failed to merge threads");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
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

/* ── Feature 1: Snooze ── */

export function useSnoozeEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			snoozedUntil,
		}: {
			id: string;
			snoozedUntil: string;
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				.snooze.post({ snoozedUntil });
			if (error) throw new Error("Failed to snooze email");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

export function useSnoozeThread() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			threadId,
			snoozedUntil,
		}: {
			threadId: string;
			snoozedUntil: string;
		}) => {
			const { data, error } = await api.mail
				.threads({ threadId })
				.snooze.post({ snoozedUntil });
			if (error) throw new Error("Failed to snooze thread");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

export function useUnsnoozeEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.mail.emails({ id }).snooze.delete();
			if (error) throw new Error("Failed to unsnooze email");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

/* ── Feature 2: Draft Review ── */

export function useDrafts(params?: { limit?: number }) {
	return useInfiniteQuery({
		queryKey: [...mailKeys.all, "drafts"] as const,
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.mail.drafts.get({
				query: {
					limit: (params?.limit ?? 20).toString(),
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load drafts");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useUpdateDraft() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			draftResponse,
		}: {
			id: string;
			draftResponse: string;
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				.draft.patch({ draftResponse });
			if (error) throw new Error("Failed to update draft");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...mailKeys.all, "drafts"],
			});
		},
	});
}

export function useSendDraft() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.mail
				.triage({ id })
				.action.post({ action: "send_draft" });
			if (error) throw new Error("Failed to send draft");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [...mailKeys.all, "drafts"],
			});
			queryClient.invalidateQueries({ queryKey: mailKeys.data() });
		},
	});
}

/* ── Feature 3: Delayed Send (Undo) ── */

export type SendAttachmentInput = {
	filename: string;
	mimeType: string;
	content: string;
};

export function useReplyDelayed() {
	return useMutation({
		mutationFn: async ({
			id,
			body,
			cc,
			attachments,
		}: {
			id: string;
			body: string;
			cc?: string[];
			attachments?: SendAttachmentInput[];
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				["reply-delayed"].post({ body, cc, attachments });
			if (error) throw new Error("Failed to queue reply");
			return data;
		},
	});
}

export function useForwardDelayed() {
	return useMutation({
		mutationFn: async ({
			id,
			to,
			body,
			attachments,
		}: {
			id: string;
			to: string[];
			body: string;
			attachments?: SendAttachmentInput[];
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				["forward-delayed"].post({ to, body, attachments });
			if (error) throw new Error("Failed to queue forward");
			return data;
		},
	});
}

export function useComposeDelayed() {
	return useMutation({
		mutationFn: async (input: {
			accountId: string;
			to: string[];
			cc?: string[];
			bcc?: string[];
			subject: string;
			body: string;
			attachments?: SendAttachmentInput[];
		}) => {
			const { data, error } = await api.mail["compose-delayed"].post(input);
			if (error) throw new Error("Failed to queue email");
			return data;
		},
	});
}

export function useCancelSend() {
	return useMutation({
		mutationFn: async (jobId: string) => {
			const { data, error } = await api.mail.send({ jobId }).delete();
			if (error) throw new Error("Failed to cancel send");
			return data;
		},
	});
}

/* ── Feature: Signature ── */

export function useUpdateSignature() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			accountId,
			signature,
		}: {
			accountId: string;
			signature: string | null;
		}) => {
			const { data, error } = await api.mail
				.accounts({ id: accountId })
				.signature.patch({ signature });
			if (error) throw new Error("Failed to update signature");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.accounts() });
		},
	});
}

/* ── Feature 4: Sender Mute / VIP ── */

export function useMuteSender() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			senderAddress,
			muted,
		}: {
			senderAddress: string;
			muted: boolean;
		}) => {
			const { data, error } = await api.mail["sender-rules"].mute.post({
				senderAddress,
				muted,
			});
			if (error) throw new Error("Failed to mute sender");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

export function useVipSender() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			senderAddress,
			vip,
		}: {
			senderAddress: string;
			vip: boolean;
		}) => {
			const { data, error } = await api.mail["sender-rules"].vip.post({
				senderAddress,
				vip,
			});
			if (error) throw new Error("Failed to update VIP status");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

/* ── Feature 5: Unsubscribe ── */

export function useUnsubscribe() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.mail.emails({ id }).unsubscribe.post();
			if (error) throw new Error("Failed to unsubscribe");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

/* ── Feature 6: Follow-Up ── */

export function useSetFollowUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			followUpAt,
		}: {
			id: string;
			followUpAt: string;
		}) => {
			const { data, error } = await api.mail
				.emails({ id })
				["follow-up"].post({ followUpAt });
			if (error) throw new Error("Failed to set follow-up");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

export function useClearFollowUp() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.mail
				.emails({ id })
				["follow-up"].delete();
			if (error) throw new Error("Failed to clear follow-up");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mailKeys.all });
		},
	});
}

export function useFollowUps() {
	return useQuery({
		queryKey: [...mailKeys.all, "follow-ups"] as const,
		queryFn: async () => {
			const { data, error } = await api.mail["follow-ups"].get();
			if (error) throw new Error("Failed to load follow-ups");
			return data;
		},
	});
}
