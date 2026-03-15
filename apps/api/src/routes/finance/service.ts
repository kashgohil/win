import {
	and,
	db,
	desc,
	emails,
	eq,
	finRecurringExpenses,
	finTransactions,
	gte,
	ilike,
	lte,
	sql,
} from "@wingmnn/db";
import {
	RECEIPT_EXTRACT_SYSTEM_PROMPT,
	RECEIPT_SCAN_SYSTEM_PROMPT,
	getAiProvider,
	type ReceiptExtractResult,
} from "@wingmnn/queue";

/* ── Types ── */

type ServiceResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string; status: number };

interface ListTransactionsOptions {
	type?: string;
	category?: string;
	merchant?: string;
	dateFrom?: string;
	dateTo?: string;
	limit?: number;
	cursor?: string;
}

/* ── Helpers ── */

const BODY_LIMIT = 3000;

function serializeTransaction(txn: typeof finTransactions.$inferSelect) {
	return {
		id: txn.id,
		type: txn.type,
		source: txn.source,
		amount: txn.amount,
		currency: txn.currency,
		merchant: txn.merchant ?? null,
		description: txn.description ?? null,
		category: txn.category ?? null,
		transactedAt: txn.transactedAt.toISOString(),
		sourceEmailId: txn.sourceEmailId ?? null,
		recurringGroupId: txn.recurringGroupId ?? null,
		metadata: txn.metadata ?? null,
		createdAt: txn.createdAt.toISOString(),
		updatedAt: txn.updatedAt.toISOString(),
	};
}

function serializeRecurring(rec: typeof finRecurringExpenses.$inferSelect) {
	return {
		id: rec.id,
		merchant: rec.merchant,
		expectedAmount: rec.expectedAmount,
		currency: rec.currency,
		interval: rec.interval,
		category: rec.category ?? null,
		lastChargeAt: rec.lastChargeAt?.toISOString() ?? null,
		nextExpectedAt: rec.nextExpectedAt?.toISOString() ?? null,
		active: rec.active,
		createdAt: rec.createdAt.toISOString(),
		updatedAt: rec.updatedAt.toISOString(),
	};
}

function computeNextExpected(
	lastCharge: Date,
	interval: "weekly" | "monthly" | "quarterly" | "yearly",
): Date {
	const next = new Date(lastCharge);
	switch (interval) {
		case "weekly":
			next.setDate(next.getDate() + 7);
			break;
		case "monthly":
			next.setMonth(next.getMonth() + 1);
			break;
		case "quarterly":
			next.setMonth(next.getMonth() + 3);
			break;
		case "yearly":
			next.setFullYear(next.getFullYear() + 1);
			break;
	}
	return next;
}

/* ── List Transactions ── */

async function listTransactions(
	userId: string,
	options: ListTransactionsOptions,
): Promise<
	ServiceResult<{
		transactions: ReturnType<typeof serializeTransaction>[];
		total: number;
		hasMore: boolean;
		nextCursor?: string;
	}>
> {
	try {
		const limit = Math.min(options.limit ?? 50, 100);
		const conditions = [eq(finTransactions.userId, userId)];

		if (options.type === "expense" || options.type === "income") {
			conditions.push(eq(finTransactions.type, options.type));
		}
		if (options.category) {
			conditions.push(eq(finTransactions.category, options.category));
		}
		if (options.merchant) {
			conditions.push(ilike(finTransactions.merchant, `%${options.merchant}%`));
		}
		if (options.dateFrom) {
			conditions.push(gte(finTransactions.transactedAt, new Date(options.dateFrom)));
		}
		if (options.dateTo) {
			conditions.push(lte(finTransactions.transactedAt, new Date(options.dateTo)));
		}
		if (options.cursor) {
			conditions.push(sql`${finTransactions.id} < ${options.cursor}`);
		}

		const where = and(...conditions);

		const [rows, countResult] = await Promise.all([
			db
				.select()
				.from(finTransactions)
				.where(where)
				.orderBy(desc(finTransactions.transactedAt), desc(finTransactions.id))
				.limit(limit + 1),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(finTransactions)
				.where(where),
		]);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;

		return {
			ok: true,
			data: {
				transactions: items.map(serializeTransaction),
				total: countResult[0]?.count ?? 0,
				hasMore,
				nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
			},
		};
	} catch (err) {
		console.error("listTransactions error:", err);
		return { ok: false, error: "Failed to list transactions", status: 500 };
	}
}

/* ── Get Transaction ── */

async function getTransaction(
	userId: string,
	id: string,
): Promise<ServiceResult<ReturnType<typeof serializeTransaction>>> {
	try {
		const [txn] = await db
			.select()
			.from(finTransactions)
			.where(and(eq(finTransactions.id, id), eq(finTransactions.userId, userId)))
			.limit(1);

		if (!txn) {
			return { ok: false, error: "Transaction not found", status: 404 };
		}
		return { ok: true, data: serializeTransaction(txn) };
	} catch (err) {
		console.error("getTransaction error:", err);
		return { ok: false, error: "Failed to get transaction", status: 500 };
	}
}

/* ── Create Manual Transaction ── */

async function createTransaction(
	userId: string,
	input: {
		type: "expense" | "income";
		amount: number;
		currency?: string;
		merchant?: string;
		description?: string;
		category?: string;
		transactedAt: string;
	},
): Promise<ServiceResult<ReturnType<typeof serializeTransaction>>> {
	try {
		const [txn] = await db
			.insert(finTransactions)
			.values({
				userId,
				type: input.type,
				source: "manual",
				amount: input.amount,
				currency: input.currency ?? "USD",
				merchant: input.merchant,
				description: input.description,
				category: input.category,
				transactedAt: new Date(input.transactedAt),
			})
			.returning();

		if (!txn) {
			return { ok: false, error: "Failed to create transaction", status: 500 };
		}
		return { ok: true, data: serializeTransaction(txn) };
	} catch (err) {
		console.error("createTransaction error:", err);
		return { ok: false, error: "Failed to create transaction", status: 500 };
	}
}

/* ── Update Transaction ── */

async function updateTransaction(
	userId: string,
	id: string,
	input: {
		description?: string | null;
		category?: string | null;
		merchant?: string | null;
		amount?: number;
		type?: "expense" | "income";
	},
): Promise<ServiceResult<ReturnType<typeof serializeTransaction>>> {
	try {
		const updates: Record<string, unknown> = {};
		if (input.description !== undefined) updates.description = input.description;
		if (input.category !== undefined) updates.category = input.category;
		if (input.merchant !== undefined) updates.merchant = input.merchant;
		if (input.amount !== undefined) updates.amount = input.amount;
		if (input.type !== undefined) updates.type = input.type;

		if (Object.keys(updates).length === 0) {
			return { ok: false, error: "No fields to update", status: 400 };
		}

		const [txn] = await db
			.update(finTransactions)
			.set(updates)
			.where(and(eq(finTransactions.id, id), eq(finTransactions.userId, userId)))
			.returning();

		if (!txn) {
			return { ok: false, error: "Transaction not found", status: 404 };
		}
		return { ok: true, data: serializeTransaction(txn) };
	} catch (err) {
		console.error("updateTransaction error:", err);
		return { ok: false, error: "Failed to update transaction", status: 500 };
	}
}

/* ── Delete Transaction ── */

async function deleteTransaction(
	userId: string,
	id: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const [deleted] = await db
			.delete(finTransactions)
			.where(and(eq(finTransactions.id, id), eq(finTransactions.userId, userId)))
			.returning({ id: finTransactions.id });

		if (!deleted) {
			return { ok: false, error: "Transaction not found", status: 404 };
		}
		return { ok: true, data: { message: "Transaction deleted" } };
	} catch (err) {
		console.error("deleteTransaction error:", err);
		return { ok: false, error: "Failed to delete transaction", status: 500 };
	}
}

/* ── Stats ── */

async function getStats(
	userId: string,
): Promise<
	ServiceResult<{
		totalExpenses: number;
		totalIncome: number;
		netBalance: number;
		recurringMonthly: number;
		byCategory: { category: string; total: number; count: number }[];
		byMonth: { month: string; expenses: number; income: number }[];
	}>
> {
	try {
		const [totals, byCategory, byMonth, recurringResult] = await Promise.all([
			db
				.select({
					type: finTransactions.type,
					total: sql<number>`coalesce(sum(${finTransactions.amount}), 0)::int`,
				})
				.from(finTransactions)
				.where(eq(finTransactions.userId, userId))
				.groupBy(finTransactions.type),
			db
				.select({
					category: sql<string>`coalesce(${finTransactions.category}, 'other')`,
					total: sql<number>`coalesce(sum(${finTransactions.amount}), 0)::int`,
					count: sql<number>`count(*)::int`,
				})
				.from(finTransactions)
				.where(
					and(
						eq(finTransactions.userId, userId),
						eq(finTransactions.type, "expense"),
					),
				)
				.groupBy(finTransactions.category)
				.orderBy(sql`sum(${finTransactions.amount}) desc`),
			db
				.select({
					month: sql<string>`to_char(${finTransactions.transactedAt}, 'YYYY-MM')`,
					type: finTransactions.type,
					total: sql<number>`coalesce(sum(${finTransactions.amount}), 0)::int`,
				})
				.from(finTransactions)
				.where(eq(finTransactions.userId, userId))
				.groupBy(
					sql`to_char(${finTransactions.transactedAt}, 'YYYY-MM')`,
					finTransactions.type,
				)
				.orderBy(sql`to_char(${finTransactions.transactedAt}, 'YYYY-MM') desc`)
				.limit(24),
			db
				.select({
					total: sql<number>`coalesce(sum(
						case ${finRecurringExpenses.interval}
							when 'weekly' then ${finRecurringExpenses.expectedAmount} * 4
							when 'monthly' then ${finRecurringExpenses.expectedAmount}
							when 'quarterly' then ${finRecurringExpenses.expectedAmount} / 3
							when 'yearly' then ${finRecurringExpenses.expectedAmount} / 12
						end
					), 0)::int`,
				})
				.from(finRecurringExpenses)
				.where(
					and(
						eq(finRecurringExpenses.userId, userId),
						eq(finRecurringExpenses.active, true),
					),
				),
		]);

		const totalExpenses =
			totals.find((t) => t.type === "expense")?.total ?? 0;
		const totalIncome = totals.find((t) => t.type === "income")?.total ?? 0;

		// Merge byMonth rows into { month, expenses, income }
		const monthMap = new Map<
			string,
			{ expenses: number; income: number }
		>();
		for (const row of byMonth) {
			const existing = monthMap.get(row.month) ?? {
				expenses: 0,
				income: 0,
			};
			if (row.type === "expense") existing.expenses = row.total;
			else existing.income = row.total;
			monthMap.set(row.month, existing);
		}

		return {
			ok: true,
			data: {
				totalExpenses,
				totalIncome,
				netBalance: totalIncome - totalExpenses,
				recurringMonthly: recurringResult[0]?.total ?? 0,
				byCategory: byCategory.map((c) => ({
					category: c.category,
					total: c.total,
					count: c.count,
				})),
				byMonth: Array.from(monthMap.entries()).map(([month, data]) => ({
					month,
					...data,
				})),
			},
		};
	} catch (err) {
		console.error("getStats error:", err);
		return { ok: false, error: "Failed to get stats", status: 500 };
	}
}

/* ── Recurring Expenses ── */

async function listRecurring(
	userId: string,
): Promise<
	ServiceResult<{
		recurring: ReturnType<typeof serializeRecurring>[];
	}>
> {
	try {
		const rows = await db
			.select()
			.from(finRecurringExpenses)
			.where(eq(finRecurringExpenses.userId, userId))
			.orderBy(
				desc(finRecurringExpenses.active),
				desc(finRecurringExpenses.lastChargeAt),
			);

		return {
			ok: true,
			data: { recurring: rows.map(serializeRecurring) },
		};
	} catch (err) {
		console.error("listRecurring error:", err);
		return { ok: false, error: "Failed to list recurring expenses", status: 500 };
	}
}

async function updateRecurring(
	userId: string,
	id: string,
	input: { active?: boolean; category?: string | null },
): Promise<ServiceResult<ReturnType<typeof serializeRecurring>>> {
	try {
		const updates: Record<string, unknown> = {};
		if (input.active !== undefined) updates.active = input.active;
		if (input.category !== undefined) updates.category = input.category;

		if (Object.keys(updates).length === 0) {
			return { ok: false, error: "No fields to update", status: 400 };
		}

		const [rec] = await db
			.update(finRecurringExpenses)
			.set(updates)
			.where(
				and(
					eq(finRecurringExpenses.id, id),
					eq(finRecurringExpenses.userId, userId),
				),
			)
			.returning();

		if (!rec) {
			return { ok: false, error: "Recurring expense not found", status: 404 };
		}
		return { ok: true, data: serializeRecurring(rec) };
	} catch (err) {
		console.error("updateRecurring error:", err);
		return { ok: false, error: "Failed to update recurring expense", status: 500 };
	}
}

/* ── Extract From Email ── */

async function extractFromEmail(
	userId: string,
	emailId: string,
): Promise<ServiceResult<ReturnType<typeof serializeTransaction>>> {
	try {
		// Check for existing extraction
		const [existing] = await db
			.select({ id: finTransactions.id })
			.from(finTransactions)
			.where(
				and(
					eq(finTransactions.userId, userId),
					eq(finTransactions.sourceEmailId, emailId),
				),
			)
			.limit(1);

		if (existing) {
			return { ok: false, error: "Already extracted from this email", status: 409 };
		}

		// Fetch email
		const [email] = await db
			.select()
			.from(emails)
			.where(and(eq(emails.id, emailId), eq(emails.userId, userId)))
			.limit(1);

		if (!email) {
			return { ok: false, error: "Email not found", status: 404 };
		}

		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not available", status: 503 };
		}

		const body = (email.bodyPlain ?? email.snippet ?? "").slice(0, BODY_LIMIT);
		const userMessage = `Subject: ${email.subject ?? "(no subject)"}
From: ${email.fromName ?? ""} <${email.fromAddress ?? ""}>
Date: ${email.receivedAt?.toISOString() ?? "unknown"}
Body:
${body}`;

		const raw = await provider.complete(
			RECEIPT_EXTRACT_SYSTEM_PROMPT,
			userMessage,
		);

		// Parse JSON from response (handle markdown code blocks)
		let jsonStr = raw.trim();
		if (jsonStr.startsWith("```")) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
		}

		let parsed: ReceiptExtractResult;
		try {
			parsed = JSON.parse(jsonStr);
		} catch {
			console.error("Failed to parse receipt extraction:", jsonStr);
			return { ok: false, error: "Failed to parse AI response", status: 500 };
		}

		// Link or create recurring expense if applicable
		let recurringGroupId: string | undefined;
		if (parsed.isRecurring && parsed.recurringInterval && parsed.merchant) {
			const [existingRecurring] = await db
				.select()
				.from(finRecurringExpenses)
				.where(
					and(
						eq(finRecurringExpenses.userId, userId),
						ilike(finRecurringExpenses.merchant, parsed.merchant),
					),
				)
				.limit(1);

			const chargeDate = new Date(parsed.transactedAt);

			if (existingRecurring) {
				recurringGroupId = existingRecurring.id;
				// Update last charge and next expected
				await db
					.update(finRecurringExpenses)
					.set({
						lastChargeAt: chargeDate,
						nextExpectedAt: computeNextExpected(
							chargeDate,
							parsed.recurringInterval,
						),
						expectedAmount: parsed.amount,
					})
					.where(eq(finRecurringExpenses.id, existingRecurring.id));
			} else {
				const [newRecurring] = await db
					.insert(finRecurringExpenses)
					.values({
						userId,
						merchant: parsed.merchant,
						expectedAmount: parsed.amount,
						currency: parsed.currency || "USD",
						interval: parsed.recurringInterval,
						category: parsed.category,
						lastChargeAt: chargeDate,
						nextExpectedAt: computeNextExpected(
							chargeDate,
							parsed.recurringInterval,
						),
					})
					.returning();
				recurringGroupId = newRecurring?.id;
			}
		}

		// Create transaction
		const [txn] = await db
			.insert(finTransactions)
			.values({
				userId,
				type: "expense",
				source: "email",
				amount: parsed.amount,
				currency: parsed.currency || "USD",
				merchant: parsed.merchant,
				description: parsed.description,
				category: parsed.category,
				transactedAt: new Date(parsed.transactedAt),
				sourceEmailId: emailId,
				recurringGroupId,
				metadata: {
					lineItems: parsed.lineItems ?? undefined,
					tax: parsed.tax ?? undefined,
					orderNumber: parsed.orderNumber ?? undefined,
				},
			})
			.returning();

		if (!txn) {
			return { ok: false, error: "Failed to create transaction", status: 500 };
		}
		return { ok: true, data: serializeTransaction(txn) };
	} catch (err) {
		console.error("extractFromEmail error:", err);
		return { ok: false, error: "Failed to extract from email", status: 500 };
	}
}

/* ── Backfill ── */

async function backfillReceipts(
	userId: string,
): Promise<
	ServiceResult<{
		processed: number;
		created: number;
		skipped: number;
		errors: number;
	}>
> {
	try {
		// Get all receipt emails for the user
		const receiptEmails = await db
			.select({ id: emails.id })
			.from(emails)
			.where(and(eq(emails.userId, userId), eq(emails.category, "receipt")));

		let created = 0;
		let skipped = 0;
		let errors = 0;

		for (const email of receiptEmails) {
			const result = await extractFromEmail(userId, email.id);
			if (result.ok) {
				created++;
			} else if (result.status === 409) {
				skipped++;
			} else {
				errors++;
			}
		}

		return {
			ok: true,
			data: {
				processed: receiptEmails.length,
				created,
				skipped,
				errors,
			},
		};
	} catch (err) {
		console.error("backfillReceipts error:", err);
		return { ok: false, error: "Failed to backfill receipts", status: 500 };
	}
}

/* ── Scan Receipt Image ── */

async function scanReceipt(
	image: string,
	mimeType: string,
): Promise<
	ServiceResult<{
		merchant: string | null;
		amount: number | null;
		currency: string;
		category: string | null;
		transactedAt: string | null;
		description: string | null;
		type: "expense" | "income";
	}>
> {
	try {
		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not available", status: 503 };
		}

		if (!provider.completeWithImage) {
			return {
				ok: false,
				error: "AI provider does not support image analysis",
				status: 501,
			};
		}

		const raw = await provider.completeWithImage(
			RECEIPT_SCAN_SYSTEM_PROMPT,
			"Parse this receipt/invoice image and extract the transaction details.",
			{ base64: image, mimeType },
		);

		let jsonStr = raw.trim();
		if (jsonStr.startsWith("```")) {
			jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
		}

		let parsed: {
			merchant?: string | null;
			amount?: number | null;
			currency?: string;
			category?: string | null;
			transactedAt?: string | null;
			description?: string | null;
			type?: "expense" | "income";
		};
		try {
			parsed = JSON.parse(jsonStr);
		} catch {
			console.error("Failed to parse receipt scan:", jsonStr);
			return { ok: false, error: "Failed to parse AI response", status: 500 };
		}

		return {
			ok: true,
			data: {
				merchant: parsed.merchant ?? null,
				amount: parsed.amount ?? null,
				currency: parsed.currency ?? "USD",
				category: parsed.category ?? null,
				transactedAt: parsed.transactedAt ?? null,
				description: parsed.description ?? null,
				type: parsed.type === "income" ? "income" : "expense",
			},
		};
	} catch (err) {
		console.error("scanReceipt error:", err);
		return { ok: false, error: "Failed to scan receipt", status: 500 };
	}
}

export const financeService = {
	listTransactions,
	getTransaction,
	createTransaction,
	updateTransaction,
	deleteTransaction,
	getStats,
	listRecurring,
	updateRecurring,
	extractFromEmail,
	backfillReceipts,
	scanReceipt,
};
