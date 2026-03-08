import { t } from "elysia";

/* ── Shared ── */

export const errorResponse = t.Object({
	error: t.String(),
});

export const messageResponse = t.Object({
	message: t.String(),
});

/* ── Contact ── */

const contactTagSchema = t.Object({
	id: t.String(),
	name: t.String(),
	color: t.Nullable(t.String()),
});

const contactSchema = t.Object({
	id: t.String(),
	primaryEmail: t.String(),
	additionalEmails: t.Array(t.String()),
	name: t.Nullable(t.String()),
	company: t.Nullable(t.String()),
	jobTitle: t.Nullable(t.String()),
	phone: t.Nullable(t.String()),
	avatarUrl: t.Nullable(t.String()),
	notes: t.Nullable(t.String()),
	starred: t.Boolean(),
	archived: t.Boolean(),
	source: t.Union([
		t.Literal("discovered"),
		t.Literal("manual"),
		t.Literal("imported"),
	]),
	lastInteractionAt: t.Nullable(t.String()),
	interactionCount: t.Number(),
	relationshipScore: t.Number(),
	avgInteractionGapDays: t.Nullable(t.Number()),
	tags: t.Array(contactTagSchema),
	createdAt: t.String(),
	updatedAt: t.String(),
});

const contactDetailSchema = t.Object({
	...contactSchema.properties,
	avgResponseTimeMins: t.Nullable(t.Number()),
	avgYourResponseTimeMins: t.Nullable(t.Number()),
	introducedBy: t.Nullable(t.String()),
	introducedAt: t.Nullable(t.String()),
	recentInteractions: t.Array(
		t.Object({
			id: t.String(),
			type: t.String(),
			title: t.String(),
			occurredAt: t.String(),
		}),
	),
});

/* ── List ── */

export const contactListResponse = t.Object({
	contacts: t.Array(contactSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

/* ── Single contact (create/update) ── */

export const contactResponse = contactSchema;

/* ── Detail ── */

export const contactDetailResponse = contactDetailSchema;

/* ── Tags ── */

export const tagResponse = t.Object({
	id: t.String(),
	name: t.String(),
	color: t.Nullable(t.String()),
	contactCount: t.Number(),
	createdAt: t.String(),
});

export const tagListResponse = t.Object({
	tags: t.Array(tagResponse),
});

export const createTagBody = t.Object({
	name: t.String({ minLength: 1, maxLength: 100 }),
	color: t.Optional(t.String()),
});

export const updateTagBody = t.Object({
	name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
	color: t.Optional(t.Nullable(t.String())),
});

/* ── Interactions ── */

const interactionSchema = t.Object({
	id: t.String(),
	type: t.String(),
	referenceId: t.Nullable(t.String()),
	title: t.String(),
	occurredAt: t.String(),
	metadata: t.Any(),
	createdAt: t.String(),
});

export const interactionListResponse = t.Object({
	interactions: t.Array(interactionSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

/* ── Cross-module: Emails ── */

const contactEmailSchema = t.Object({
	id: t.String(),
	subject: t.Nullable(t.String()),
	fromAddress: t.Nullable(t.String()),
	fromName: t.Nullable(t.String()),
	receivedAt: t.String(),
	snippet: t.Nullable(t.String()),
	isRead: t.Boolean(),
});

export const contactEmailsResponse = t.Object({
	emails: t.Array(contactEmailSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
});

/* ── Cross-module: Events ── */

const contactEventSchema = t.Object({
	id: t.String(),
	title: t.Nullable(t.String()),
	startTime: t.String(),
	endTime: t.String(),
	location: t.Nullable(t.String()),
	status: t.String(),
});

export const contactEventsResponse = t.Object({
	events: t.Array(contactEventSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
});

/* ── Follow-ups ── */

const followUpSchema = t.Object({
	id: t.String(),
	contactId: t.String(),
	contactName: t.Nullable(t.String()),
	contactEmail: t.String(),
	type: t.String(),
	title: t.String(),
	context: t.Nullable(t.String()),
	dueAt: t.Nullable(t.String()),
	status: t.String(),
	snoozedUntil: t.Nullable(t.String()),
	createdAt: t.String(),
});

export const followUpListResponse = t.Object({
	followUps: t.Array(followUpSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

export const snoozeBody = t.Object({
	until: t.String(),
});

/* ── Module Data ── */

export const moduleDataResponse = t.Object({
	contactsTouchedThisWeek: t.Number(),
	followUpsDue: t.Number(),
	coolingOff: t.Number(),
	totalContacts: t.Number(),
	starredContacts: t.Number(),
});

/* ── Suggestions ── */

export const suggestionsResponse = t.Object({
	mergeSuggestions: t.Array(
		t.Object({
			contactA: t.Object({
				id: t.String(),
				name: t.Nullable(t.String()),
				email: t.String(),
			}),
			contactB: t.Object({
				id: t.String(),
				name: t.Nullable(t.String()),
				email: t.String(),
			}),
			reason: t.String(),
		}),
	),
	newContactsThisWeek: t.Number(),
});

/* ── Meeting Prep ── */

export const meetingPrepResponse = t.Object({
	eventId: t.String(),
	eventTitle: t.Nullable(t.String()),
	startTime: t.String(),
	attendees: t.Array(
		t.Object({
			contactId: t.Nullable(t.String()),
			email: t.String(),
			name: t.Nullable(t.String()),
			relationshipScore: t.Nullable(t.Number()),
			lastInteractionAt: t.Nullable(t.String()),
			lastInteractionTitle: t.Nullable(t.String()),
			recentEmailSubjects: t.Array(t.String()),
			notes: t.Nullable(t.String()),
		}),
	),
});

/* ── Create / Update ── */

export const createContactBody = t.Object({
	primaryEmail: t.String({ format: "email" }),
	name: t.Optional(t.String()),
	company: t.Optional(t.String()),
	jobTitle: t.Optional(t.String()),
	phone: t.Optional(t.String()),
	notes: t.Optional(t.String()),
	starred: t.Optional(t.Boolean()),
});

export const updateContactBody = t.Object({
	name: t.Optional(t.Nullable(t.String())),
	company: t.Optional(t.Nullable(t.String())),
	jobTitle: t.Optional(t.Nullable(t.String())),
	phone: t.Optional(t.Nullable(t.String())),
	avatarUrl: t.Optional(t.Nullable(t.String())),
	notes: t.Optional(t.Nullable(t.String())),
	starred: t.Optional(t.Boolean()),
	archived: t.Optional(t.Boolean()),
	additionalEmails: t.Optional(t.Array(t.String())),
});
