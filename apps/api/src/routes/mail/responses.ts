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
});

/* ── Auto-handled ── */

const autoHandledItemSchema = t.Object({
	id: t.String(),
	text: t.String(),
	subject: t.Optional(t.String()),
	sender: t.Optional(t.String()),
	actionType: t.String(),
	emailId: t.Optional(t.String()),
	linkedModule: t.Optional(t.String()),
	category: t.Optional(t.String()),
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
	relatedTaskId: t.Optional(t.Nullable(t.String())),
	relatedTaskReason: t.Optional(t.Nullable(t.String())),
});

export const attachmentSchema = t.Object({
	id: t.String({ format: "uuid" }),
	filename: t.String(),
	mimeType: t.String(),
	size: t.Number(),
});

export const emailDetailSchema = t.Intersect([
	emailSchema,
	t.Object({
		bodyPlain: t.Union([t.String(), t.Null()]),
		bodyHtml: t.Union([t.String(), t.Null()]),
		attachments: t.Array(attachmentSchema),
	}),
]);

export const emailListResponse = t.Object({
	emails: t.Array(emailSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

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

/* ── Attachments list ── */

export const attachmentWithContextSchema = t.Object({
	id: t.String({ format: "uuid" }),
	filename: t.String(),
	mimeType: t.String(),
	size: t.Number(),
	emailId: t.String({ format: "uuid" }),
	emailSubject: t.Union([t.String(), t.Null()]),
	fromName: t.Union([t.String(), t.Null()]),
	fromAddress: t.Union([t.String(), t.Null()]),
	receivedAt: t.String({ format: "date-time" }),
	category: emailCategoryLiteral,
});

export const attachmentListResponse = t.Object({
	attachments: t.Array(attachmentWithContextSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
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

/* ── Senders ── */

const senderSchema = t.Object({
	name: t.Union([t.String(), t.Null()]),
	address: t.String(),
	count: t.Number(),
});

export const senderListResponse = t.Object({
	senders: t.Array(senderSchema),
});

/* ── Thread ── */

const threadParticipantSchema = t.Object({
	address: t.String(),
	name: t.Union([t.String(), t.Null()]),
});

export const threadSchema = t.Object({
	threadId: t.String(),
	subject: t.Union([t.String(), t.Null()]),
	snippet: t.Union([t.String(), t.Null()]),
	latestReceivedAt: t.String({ format: "date-time" }),
	messageCount: t.Number(),
	unreadCount: t.Number(),
	hasAttachments: t.Boolean(),
	isStarred: t.Boolean(),
	category: emailCategoryLiteral,
	priorityScore: t.Number(),
	aiSummary: t.Union([t.String(), t.Null()]),
	latestMessage: t.Object({
		id: t.String(),
		fromAddress: t.Union([t.String(), t.Null()]),
		fromName: t.Union([t.String(), t.Null()]),
		toAddresses: t.Union([t.Array(t.String()), t.Null()]),
	}),
	participants: t.Array(threadParticipantSchema),
});

export const threadListResponse = t.Object({
	threads: t.Array(threadSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

export const threadDetailResponse = t.Object({
	threadId: t.String(),
	subject: t.Union([t.String(), t.Null()]),
	messages: t.Array(emailDetailSchema),
	isMerged: t.Boolean(),
});

export const mergeThreadsBody = t.Object({
	threadIds: t.Array(t.String(), { minItems: 2 }),
});

export const mergeThreadsResponse = t.Object({
	threadId: t.String(),
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

/* ── Snooze ── */

export const snoozeBody = t.Object({
	snoozedUntil: t.String({ format: "date-time" }),
});

/* ── Draft review ── */

export const draftItemSchema = t.Object({
	id: t.String({ format: "uuid" }),
	subject: t.Union([t.String(), t.Null()]),
	fromAddress: t.Union([t.String(), t.Null()]),
	fromName: t.Union([t.String(), t.Null()]),
	snippet: t.Union([t.String(), t.Null()]),
	draftResponse: t.Union([t.String(), t.Null()]),
	receivedAt: t.String({ format: "date-time" }),
	aiSummary: t.Union([t.String(), t.Null()]),
});

export const draftListResponse = t.Object({
	drafts: t.Array(draftItemSchema),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

export const updateDraftBody = t.Object({
	draftResponse: t.String(),
});

/* ── Delayed send ── */

export const delayedComposeBody = t.Object({
	body: t.String(),
	cc: t.Optional(t.Array(t.String())),
	delayed: t.Optional(t.Boolean()),
});

export const delayedForwardBody = t.Object({
	to: t.Array(t.String()),
	body: t.String(),
	delayed: t.Optional(t.Boolean()),
});

export const delayedSendResponse = t.Object({
	jobId: t.String(),
	message: t.String(),
});

/* ── Sender mute / VIP ── */

export const muteSenderBody = t.Object({
	senderAddress: t.String(),
	muted: t.Boolean(),
});

export const muteSenderResponse = t.Object({
	message: t.String(),
	archivedCount: t.Number(),
});

export const vipSenderBody = t.Object({
	senderAddress: t.String(),
	vip: t.Boolean(),
});

/* ── Unsubscribe ── */

export const unsubscribeResponse = t.Object({
	message: t.String(),
	method: t.Union([
		t.Literal("one-click"),
		t.Literal("link"),
		t.Literal("failed"),
	]),
});

/* ── Follow-up ── */

export const followUpBody = t.Object({
	followUpAt: t.String({ format: "date-time" }),
});

export const followUpItemSchema = t.Object({
	id: t.String({ format: "uuid" }),
	subject: t.Union([t.String(), t.Null()]),
	fromAddress: t.Union([t.String(), t.Null()]),
	fromName: t.Union([t.String(), t.Null()]),
	followUpAt: t.String({ format: "date-time" }),
	receivedAt: t.String({ format: "date-time" }),
	daysWaiting: t.Number(),
});

export const followUpListResponse = t.Object({
	followUps: t.Array(followUpItemSchema),
});
