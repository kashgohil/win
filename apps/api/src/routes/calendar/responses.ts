import { t } from "elysia";

/* ── Shared ── */

export const errorResponse = t.Object({
	error: t.String(),
});

export const messageResponse = t.Object({
	message: t.String(),
});

/* ── Account ── */

const calendarAccountSchema = t.Object({
	id: t.String(),
	provider: t.Union([t.Literal("google"), t.Literal("outlook")]),
	email: t.String(),
	syncStatus: t.Union([
		t.Literal("pending"),
		t.Literal("syncing"),
		t.Literal("synced"),
		t.Literal("error"),
	]),
	lastSyncAt: t.Optional(t.Nullable(t.String())),
	syncError: t.Optional(t.Nullable(t.String())),
	active: t.Boolean(),
	createdAt: t.String(),
});

export const accountListResponse = t.Object({
	accounts: t.Array(calendarAccountSchema),
});

export const connectResponse = t.Object({
	url: t.String(),
});

export const disconnectResponse = t.Object({
	message: t.String(),
});

/* ── Event ── */

const attendeeSchema = t.Object({
	email: t.String(),
	displayName: t.Optional(t.String()),
	responseStatus: t.Optional(t.String()),
});

const organizerSchema = t.Object({
	email: t.String(),
	displayName: t.Optional(t.String()),
});

const calendarEventSchema = t.Object({
	id: t.String(),
	calendarAccountId: t.String(),
	externalId: t.String(),
	title: t.Nullable(t.String()),
	description: t.Nullable(t.String()),
	location: t.Nullable(t.String()),
	startTime: t.String(),
	endTime: t.String(),
	isAllDay: t.Boolean(),
	status: t.Union([
		t.Literal("confirmed"),
		t.Literal("tentative"),
		t.Literal("cancelled"),
	]),
	organizer: t.Nullable(organizerSchema),
	attendees: t.Array(attendeeSchema),
	recurrenceRule: t.Nullable(t.String()),
	recurringEventId: t.Nullable(t.String()),
	htmlLink: t.Nullable(t.String()),
	meetingLink: t.Nullable(t.String()),
	source: t.String(),
	createdAt: t.String(),
});

export const eventListResponse = t.Object({
	events: t.Array(calendarEventSchema),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

export const eventDetailResponse = calendarEventSchema;

/* ── Create/Update event ── */

export const createEventBody = t.Object({
	accountId: t.String(),
	title: t.String(),
	startTime: t.String(),
	endTime: t.String(),
	isAllDay: t.Optional(t.Boolean()),
	description: t.Optional(t.String()),
	location: t.Optional(t.String()),
});

export const updateEventBody = t.Object({
	title: t.Optional(t.String()),
	startTime: t.Optional(t.String()),
	endTime: t.Optional(t.String()),
	isAllDay: t.Optional(t.Boolean()),
	description: t.Optional(t.String()),
	location: t.Optional(t.String()),
});

export const mutateEventResponse = calendarEventSchema;

/* ── Module data ── */

export const moduleDataResponse = t.Object({
	nextEvent: t.Nullable(calendarEventSchema),
	minutesUntilNext: t.Nullable(t.Number()),
	todayCount: t.Number(),
	conflictCount: t.Number(),
});
