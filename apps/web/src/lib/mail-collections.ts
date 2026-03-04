import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { queryClient } from "@/lib/query-client";
import { queryCollectionOptions } from "@tanstack/query-db-collection";
import { createCollection } from "@tanstack/react-db";
import { api } from "./api";

async function fetchMailData() {
	const accountIds = useMailAccountFilter.getState().getAccountIds();
	const { data, error } = await api.mail.data.get({
		query: {
			accountIds: accountIds?.join(","),
		},
	});
	if (error) throw new Error("Failed to load mail data");
	return data;
}

export const mailTriageCollection = createCollection(
	queryCollectionOptions({
		id: "mail-triage",
		queryKey: ["mail", "data"] as const,
		queryFn: fetchMailData,
		select: (data) => data.triage,
		queryClient,
		getKey: (item) => item.id,
	}),
);

export const mailAutoHandledCollection = createCollection(
	queryCollectionOptions({
		id: "mail-auto-handled",
		queryKey: ["mail", "data"] as const,
		queryFn: fetchMailData,
		select: (data) => data.autoHandled,
		queryClient,
		getKey: (item) => item.id,
	}),
);

export const mailBriefingCollection = createCollection(
	queryCollectionOptions({
		id: "mail-briefing",
		queryKey: ["mail", "data"] as const,
		queryFn: fetchMailData,
		select: (data) => data.briefing,
		queryClient,
		getKey: (item) => item.label,
	}),
);

async function fetchMailAccounts() {
	const { data, error } = await api.mail.accounts.get();
	if (error) throw new Error("Failed to load accounts");
	return data;
}

export const mailAccountsCollection = createCollection(
	queryCollectionOptions({
		id: "mail-accounts",
		queryKey: ["mail", "accounts"] as const,
		queryFn: fetchMailAccounts,
		select: (data) => data.accounts,
		queryClient,
		getKey: (item) => item.id,
	}),
);

// Invalidate mail data queries when account filter changes
useMailAccountFilter.subscribe(() => {
	queryClient.invalidateQueries({ queryKey: ["mail", "data"] });
});
