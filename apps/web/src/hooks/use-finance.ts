import { api } from "@/lib/api";
import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

/* ── Query keys ── */

export const financeKeys = {
	all: ["finance"] as const,
	list: (params?: {
		type?: string;
		category?: string;
		merchant?: string;
		dateFrom?: string;
		dateTo?: string;
	}) => [...financeKeys.all, "list", params] as const,
	detail: (id: string) => [...financeKeys.all, "detail", id] as const,
	stats: () => [...financeKeys.all, "stats"] as const,
	recurring: () => [...financeKeys.all, "recurring"] as const,
};

/* ── Types ── */

export type Transaction = {
	id: string;
	type: "expense" | "income";
	source: "email" | "manual";
	amount: number;
	currency: string;
	merchant: string | null;
	description: string | null;
	category: string | null;
	transactedAt: string;
	sourceEmailId: string | null;
	recurringGroupId: string | null;
	metadata: unknown;
	createdAt: string;
	updatedAt: string;
};

export type FinanceStats = {
	totalExpenses: number;
	totalIncome: number;
	netBalance: number;
	recurringMonthly: number;
	byCategory: { category: string; total: number; count: number }[];
	byMonth: { month: string; expenses: number; income: number }[];
};

export type RecurringExpense = {
	id: string;
	merchant: string;
	expectedAmount: number;
	currency: string;
	interval: "weekly" | "monthly" | "quarterly" | "yearly";
	category: string | null;
	lastChargeAt: string | null;
	nextExpectedAt: string | null;
	active: boolean;
	createdAt: string;
	updatedAt: string;
};

/* ── Queries ── */

export function useFinanceTransactions(params?: {
	type?: string;
	category?: string;
	merchant?: string;
	dateFrom?: string;
	dateTo?: string;
	limit?: number;
}) {
	const pageSize = params?.limit ?? 50;

	return useInfiniteQuery({
		queryKey: financeKeys.list({
			type: params?.type,
			category: params?.category,
			merchant: params?.merchant,
			dateFrom: params?.dateFrom,
			dateTo: params?.dateTo,
		}),
		queryFn: async ({ pageParam }) => {
			const { data, error } = await api.finance.get({
				query: {
					type: params?.type,
					category: params?.category,
					merchant: params?.merchant,
					dateFrom: params?.dateFrom,
					dateTo: params?.dateTo,
					limit: String(pageSize),
					cursor: pageParam,
				},
			});
			if (error) throw new Error("Failed to load transactions");
			return data;
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage?.nextCursor ?? undefined,
	});
}

export function useFinanceStats() {
	return useQuery({
		queryKey: financeKeys.stats(),
		queryFn: async () => {
			const { data, error } = await api.finance.stats.get();
			if (error) throw new Error("Failed to load finance stats");
			return data as FinanceStats;
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function useFinanceRecurring() {
	return useQuery({
		queryKey: financeKeys.recurring(),
		queryFn: async () => {
			const { data, error } = await api.finance.recurring.get();
			if (error) throw new Error("Failed to load recurring expenses");
			return data;
		},
		staleTime: 5 * 60 * 1000,
	});
}

export function useTransactionDetail(id: string) {
	return useQuery({
		queryKey: financeKeys.detail(id),
		queryFn: async () => {
			const { data, error } = await api.finance({ id }).get();
			if (error) throw new Error("Failed to load transaction");
			return data as Transaction;
		},
		enabled: !!id,
	});
}

/* ── Mutations ── */

export function useCreateTransaction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			type: "expense" | "income";
			amount: number;
			currency?: string;
			merchant?: string;
			description?: string;
			category?: string;
			transactedAt: string;
		}) => {
			const { data, error } = await api.finance.post(input);
			if (error) throw new Error("Failed to create transaction");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.all });
		},
	});
}

export function useUpdateTransaction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			description?: string | null;
			category?: string | null;
			merchant?: string | null;
			amount?: number;
			type?: "expense" | "income";
		}) => {
			const { data, error } = await api.finance({ id }).patch(input);
			if (error) throw new Error("Failed to update transaction");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.all });
		},
	});
}

export function useDeleteTransaction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data, error } = await api.finance({ id }).delete();
			if (error) throw new Error("Failed to delete transaction");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.all });
		},
	});
}

export function useExtractFromEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (emailId: string) => {
			const { data, error } = await api.finance["from-email"]({
				emailId,
			}).post();
			if (error) throw new Error("Failed to extract transaction from email");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.all });
		},
	});
}

export function useBackfillReceipts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data, error } = await api.finance.backfill.post();
			if (error) throw new Error("Failed to backfill receipts");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.all });
		},
	});
}

export type ScanReceiptResult = {
	merchant: string | null;
	amount: number | null;
	currency: string;
	category: string | null;
	transactedAt: string | null;
	description: string | null;
	type: "expense" | "income";
};

export function useScanReceipt() {
	return useMutation({
		mutationFn: async (input: { image: string; mimeType: string }) => {
			const { data, error } = await api.finance["scan-receipt"].post(input);
			if (error) throw new Error("Failed to scan receipt");
			return data as ScanReceiptResult;
		},
	});
}

export function useUpdateRecurring() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			...input
		}: {
			id: string;
			active?: boolean;
			category?: string | null;
		}) => {
			const { data, error } = await api.finance.recurring({ id }).patch(input);
			if (error) throw new Error("Failed to update recurring expense");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: financeKeys.recurring() });
		},
	});
}
