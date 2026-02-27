import { t } from "elysia";

/* ── Shared schemas ── */

export const errorResponse = t.Object({
	error: t.String(),
});

/* ── Briefing ── */

const briefingStatSchema = t.Object({
	label: t.String(),
	value: t.Union([t.String(), t.Number()]),
	trend: t.Optional(
		t.Union([t.Literal("up"), t.Literal("down"), t.Literal("neutral")]),
	),
	accent: t.Optional(t.Boolean()),
});

/* ── Triage ── */

const triageActionSchema = t.Object({
	label: t.String(),
	variant: t.Optional(
		t.Union([t.Literal("default"), t.Literal("outline"), t.Literal("ghost")]),
	),
});

const triageItemSchema = t.Object({
	id: t.String(),
	title: t.String(),
	subtitle: t.Optional(t.String()),
	timestamp: t.String(),
	urgent: t.Optional(t.Boolean()),
	actions: t.Array(triageActionSchema),
	sourceModule: t.Optional(t.String()),
});

/* ── Auto-handled ── */

const autoHandledItemSchema = t.Object({
	id: t.String(),
	text: t.String(),
	linkedModule: t.Optional(t.String()),
	timestamp: t.String(),
});

/* ── Module data ── */

export const moduleDataResponse = t.Object({
	briefing: t.Array(briefingStatSchema),
	triage: t.Array(triageItemSchema),
	autoHandled: t.Array(autoHandledItemSchema),
});

/* ── Email ── */

export const emailSchema = t.Object({
	id: t.String({ format: "uuid" }),
	emailAccountId: t.String({ format: "uuid" }),
	subject: t.Union([t.String(), t.Null()]),
	fromAddress: t.Union([t.String(), t.Null()]),
	fromName: t.Union([t.String(), t.Null()]),
	toAddresses: t.Union([t.Array(t.String()), t.Null()]),
	ccAddresses: t.Union([t.Array(t.String()), t.Null()]),
	snippet: t.Union([t.String(), t.Null()]),
	receivedAt: t.String({ format: "date-time" }),
	isRead: t.Boolean(),
	isStarred: t.Boolean(),
	hasAttachments: t.Boolean(),
	labels: t.Union([t.Array(t.String()), t.Null()]),
	category: t.Union([
		t.Literal("urgent"),
		t.Literal("actionable"),
		t.Literal("informational"),
		t.Literal("newsletter"),
		t.Literal("receipt"),
		t.Literal("confirmation"),
		t.Literal("promotional"),
		t.Literal("spam"),
		t.Literal("uncategorized"),
	]),
	priorityScore: t.Number(),
	aiSummary: t.Union([t.String(), t.Null()]),
});

export const emailDetailSchema = t.Intersect([
	emailSchema,
	t.Object({
		bodyPlain: t.Union([t.String(), t.Null()]),
		bodyHtml: t.Union([t.String(), t.Null()]),
	}),
]);

export const emailListResponse = t.Object({
	emails: t.Array(emailSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
});

export const emailDetailResponse = t.Object({
	email: emailDetailSchema,
});

/* ── Email account ── */

export const emailAccountSchema = t.Object({
	id: t.String({ format: "uuid" }),
	provider: t.Union([t.Literal("gmail"), t.Literal("outlook")]),
	email: t.String(),
	syncStatus: t.Union([
		t.Literal("pending"),
		t.Literal("syncing"),
		t.Literal("synced"),
		t.Literal("error"),
	]),
	lastSyncAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	active: t.Boolean(),
	createdAt: t.String({ format: "date-time" }),
});

export const accountListResponse = t.Object({
	accounts: t.Array(emailAccountSchema),
});

export const connectResponse = t.Object({
	url: t.String(),
});

export const disconnectResponse = t.Object({
	message: t.String(),
});

/* ── Email actions ── */

export const toggleStarResponse = t.Object({
	isStarred: t.Boolean(),
});

export const toggleReadResponse = t.Object({
	isRead: t.Boolean(),
});

export const messageResponse = t.Object({
	message: t.String(),
});

export const composeBody = t.Object({
	body: t.String(),
	cc: t.Optional(t.Array(t.String())),
});

export const forwardBody = t.Object({
	to: t.Array(t.String()),
	body: t.String(),
});

/* ── Sender rules ── */

export const emailCategoryLiteral = t.Union([
	t.Literal("urgent"),
	t.Literal("actionable"),
	t.Literal("informational"),
	t.Literal("newsletter"),
	t.Literal("receipt"),
	t.Literal("confirmation"),
	t.Literal("promotional"),
	t.Literal("spam"),
	t.Literal("uncategorized"),
]);

export const senderRuleSchema = t.Object({
	id: t.String({ format: "uuid" }),
	senderAddress: t.String(),
	category: emailCategoryLiteral,
	createdAt: t.String({ format: "date-time" }),
});

export const createSenderRuleBody = t.Object({
	senderAddress: t.String(),
	category: emailCategoryLiteral,
});

export const createSenderRuleResponse = t.Object({
	rule: senderRuleSchema,
	updatedCount: t.Number(),
});

export const senderRuleListResponse = t.Object({
	rules: t.Array(senderRuleSchema),
});

/* ── Triage action ── */

export const triageActionBody = t.Object({
	action: t.Union([
		t.Literal("send_draft"),
		t.Literal("dismiss"),
		t.Literal("archive"),
		t.Literal("snooze"),
	]),
	snoozeDuration: t.Optional(t.Number()),
});

export const triageActionResponse = t.Object({
	message: t.String(),
});
