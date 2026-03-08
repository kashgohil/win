import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/* ── Query keys ── */

export const calendarKeys = {
	all: ["calendar"] as const,
	accounts: () => [...calendarKeys.all, "accounts"] as const,
	events: (params?: {
		startAfter?: string;
		startBefore?: string;
		accountId?: string;
	}) => [...calendarKeys.all, "events", params] as const,
	event: (id: string) => [...calendarKeys.all, "event", id] as const,
	data: () => [...calendarKeys.all, "data"] as const,
};

/* ── Types ── */

export type CalendarAccount = {
	id: string;
	provider: "google" | "outlook";
	email: string;
	syncStatus: "pending" | "syncing" | "synced" | "error";
	lastSyncAt?: string | null;
	syncError?: string | null;
	active: boolean;
	createdAt: string;
};

export type CalendarEvent = {
	id: string;
	calendarAccountId: string;
	externalId: string;
	title: string | null;
	description: string | null;
	location: string | null;
	startTime: string;
	endTime: string;
	isAllDay: boolean;
	status: "confirmed" | "tentative" | "cancelled";
	organizer: { email: string; displayName?: string } | null;
	attendees: {
		email: string;
		displayName?: string;
		responseStatus?: string;
	}[];
	recurrenceRule: string | null;
	recurringEventId: string | null;
	htmlLink: string | null;
	meetingLink: string | null;
	source: string;
	createdAt: string;
};

export type CalendarModuleData = {
	nextEvent: CalendarEvent | null;
	minutesUntilNext: number | null;
	todayCount: number;
	conflictCount: number;
};

/* ── Queries ── */

export function useCalendarAccounts() {
	return useQuery({
		queryKey: calendarKeys.accounts(),
		queryFn: async () => {
			const { data, error } = await api.calendar.accounts.get();
			if (error) throw new Error("Failed to load calendar accounts");
			return (data as { accounts: CalendarAccount[] }).accounts;
		},
	});
}

export function useCalendarEvents(params?: {
	startAfter?: string;
	startBefore?: string;
	accountId?: string;
	limit?: number;
}) {
	return useQuery({
		queryKey: calendarKeys.events({
			startAfter: params?.startAfter,
			startBefore: params?.startBefore,
			accountId: params?.accountId,
		}),
		queryFn: async () => {
			const { data, error } = await api.calendar.events.get({
				query: {
					startAfter: params?.startAfter,
					startBefore: params?.startBefore,
					accountId: params?.accountId,
					limit: params?.limit?.toString(),
				},
			});
			if (error) throw new Error("Failed to load events");
			return data as {
				events: CalendarEvent[];
				hasMore: boolean;
				nextCursor?: string;
			};
		},
		enabled:
			params?.startAfter !== undefined || params?.startBefore !== undefined,
	});
}

export function useCalendarEvent(eventId: string) {
	return useQuery({
		queryKey: calendarKeys.event(eventId),
		queryFn: async () => {
			const { data, error } = await api.calendar.events({ eventId }).get();
			if (error) throw new Error("Failed to load event");
			return data as CalendarEvent;
		},
		enabled: !!eventId,
	});
}

export function useCalendarData() {
	return useQuery({
		queryKey: calendarKeys.data(),
		queryFn: async () => {
			const { data, error } = await api.calendar.data.get();
			if (error) throw new Error("Failed to load calendar data");
			return data as CalendarModuleData;
		},
		refetchInterval: 60 * 1000,
	});
}

/* ── Mutations ── */

export function useConnectCalendar() {
	return useMutation({
		mutationFn: async (provider: string) => {
			const { data, error } = await api.calendar.link({ provider }).post();
			if (error) throw new Error("Failed to connect");
			return data as { url: string };
		},
	});
}

export function useDisconnectCalendar() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (accountId: string) => {
			const { data, error } = await api.calendar
				.accounts({ id: accountId })
				.delete();
			if (error) throw new Error("Failed to disconnect");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: calendarKeys.all });
		},
	});
}

export function useCreateCalendarEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			accountId: string;
			title: string;
			startTime: string;
			endTime: string;
			isAllDay?: boolean;
			description?: string;
			location?: string;
		}) => {
			const { data, error } = await api.calendar.events.post(input);
			if (error) throw new Error("Failed to create event");
			return data as CalendarEvent;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: calendarKeys.all });
		},
	});
}

export function useUpdateCalendarEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			eventId,
			...input
		}: {
			eventId: string;
			title?: string;
			startTime?: string;
			endTime?: string;
			isAllDay?: boolean;
			description?: string;
			location?: string;
		}) => {
			const { data, error } = await api.calendar
				.events({ eventId })
				.patch(input);
			if (error) throw new Error("Failed to update event");
			return data as CalendarEvent;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: calendarKeys.all });
		},
	});
}

export function useDeleteCalendarEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (eventId: string) => {
			const { data, error } = await api.calendar.events({ eventId }).delete();
			if (error) throw new Error("Failed to delete event");
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: calendarKeys.all });
		},
	});
}
