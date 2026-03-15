import { t } from "elysia";

/* ── Shared ── */

export const errorResponse = t.Object({
	error: t.String(),
});

export const messageResponse = t.Object({
	message: t.String(),
});

/* ── Transaction ── */

const transactionSchema = t.Object({
	id: t.String(),
	type: t.Union([t.Literal("expense"), t.Literal("income")]),
	source: t.Union([t.Literal("email"), t.Literal("manual")]),
	amount: t.Number(),
	currency: t.String(),
	merchant: t.Nullable(t.String()),
	description: t.Nullable(t.String()),
	category: t.Nullable(t.String()),
	transactedAt: t.String(),
	sourceEmailId: t.Nullable(t.String()),
	recurringGroupId: t.Nullable(t.String()),
	metadata: t.Nullable(t.Any()),
	createdAt: t.String(),
	updatedAt: t.String(),
});

/* ── List ── */

export const transactionListResponse = t.Object({
	transactions: t.Array(transactionSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

/* ── Single ── */

export const transactionResponse = transactionSchema;

/* ── Stats ── */

export const statsResponse = t.Object({
	totalExpenses: t.Number(),
	totalIncome: t.Number(),
	netBalance: t.Number(),
	recurringMonthly: t.Number(),
	byCategory: t.Array(
		t.Object({
			category: t.String(),
			total: t.Number(),
			count: t.Number(),
		}),
	),
	byMonth: t.Array(
		t.Object({
			month: t.String(),
			expenses: t.Number(),
			income: t.Number(),
		}),
	),
});

/* ── Recurring ── */

const recurringSchema = t.Object({
	id: t.String(),
	merchant: t.String(),
	expectedAmount: t.Number(),
	currency: t.String(),
	interval: t.Union([
		t.Literal("weekly"),
		t.Literal("monthly"),
		t.Literal("quarterly"),
		t.Literal("yearly"),
	]),
	category: t.Nullable(t.String()),
	lastChargeAt: t.Nullable(t.String()),
	nextExpectedAt: t.Nullable(t.String()),
	active: t.Boolean(),
	createdAt: t.String(),
	updatedAt: t.String(),
});

export const recurringListResponse = t.Object({
	recurring: t.Array(recurringSchema),
});

export const recurringResponse = recurringSchema;

/* ── Create / Update ── */

export const createTransactionBody = t.Object({
	type: t.Union([t.Literal("expense"), t.Literal("income")]),
	amount: t.Number({ minimum: 1 }),
	currency: t.Optional(t.String()),
	merchant: t.Optional(t.String()),
	description: t.Optional(t.String()),
	category: t.Optional(t.String()),
	transactedAt: t.String(),
});

export const updateTransactionBody = t.Object({
	description: t.Optional(t.Nullable(t.String())),
	category: t.Optional(t.Nullable(t.String())),
	merchant: t.Optional(t.Nullable(t.String())),
	amount: t.Optional(t.Number({ minimum: 1 })),
	type: t.Optional(t.Union([t.Literal("expense"), t.Literal("income")])),
});

export const updateRecurringBody = t.Object({
	active: t.Optional(t.Boolean()),
	category: t.Optional(t.Nullable(t.String())),
});

/* ── Receipt Scan ── */

export const scanReceiptBody = t.Object({
	image: t.String({ description: "Base64-encoded image data" }),
	mimeType: t.String(),
});

export const scanReceiptResponse = t.Object({
	merchant: t.Nullable(t.String()),
	amount: t.Nullable(t.Number()),
	currency: t.String(),
	category: t.Nullable(t.String()),
	transactedAt: t.Nullable(t.String()),
	description: t.Nullable(t.String()),
	type: t.Union([t.Literal("expense"), t.Literal("income")]),
});

/* ── Backfill ── */

export const backfillResponse = t.Object({
	processed: t.Number(),
	created: t.Number(),
	skipped: t.Number(),
	errors: t.Number(),
});
