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
