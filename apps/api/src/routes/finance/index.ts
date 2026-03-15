import { Elysia, t } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	backfillResponse,
	createTransactionBody,
	errorResponse,
	messageResponse,
	recurringListResponse,
	recurringResponse,
	scanReceiptBody,
	scanReceiptResponse,
	statsResponse,
	transactionListResponse,
	transactionResponse,
	updateRecurringBody,
	updateTransactionBody,
} from "./responses";
import { financeService } from "./service";

export const financeRoutes = new Elysia({
	name: "finance",
	prefix: "/finance",
})
	.use(betterAuthPlugin)

	/* ── List Transactions ── */

	.get(
		"/",
		async ({ query, user, set }) => {
			const result = await financeService.listTransactions(user.id, {
				type: query.type,
				category: query.category,
				merchant: query.merchant,
				dateFrom: query.dateFrom,
				dateTo: query.dateTo,
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor,
			});

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			query: t.Object({
				type: t.Optional(t.String()),
				category: t.Optional(t.String()),
				merchant: t.Optional(t.String()),
				dateFrom: t.Optional(t.String()),
				dateTo: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: transactionListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "List transactions" },
		},
	)

	/* ── Stats ── */

	.get(
		"/stats",
		async ({ user, set }) => {
			const result = await financeService.getStats(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: statsResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "Get financial stats" },
		},
	)

	/* ── Recurring ── */

	.get(
		"/recurring",
		async ({ user, set }) => {
			const result = await financeService.listRecurring(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: recurringListResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "List recurring expenses" },
		},
	)

	/* ── Scan Receipt ── */

	.post(
		"/scan-receipt",
		async ({ body, set }) => {
			const result = await financeService.scanReceipt(
				body.image,
				body.mimeType,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: scanReceiptBody,
			response: {
				200: scanReceiptResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Finance"],
				summary: "Scan receipt image and extract transaction data",
			},
		},
	)

	/* ── Backfill ── */

	.post(
		"/backfill",
		async ({ user, set }) => {
			const result = await financeService.backfillReceipts(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: backfillResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Finance"],
				summary: "Backfill transactions from receipt emails",
			},
		},
	)

	/* ── Create Manual Transaction ── */

	.post(
		"/",
		async ({ body, user, set }) => {
			const result = await financeService.createTransaction(user.id, body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			set.status = 201;
			return result.data;
		},
		{
			auth: true,
			body: createTransactionBody,
			response: {
				201: transactionResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "Create manual transaction" },
		},
	)

	/* ── Extract from Email ── */

	.post(
		"/from-email/:emailId",
		async ({ params, user, set }) => {
			const result = await financeService.extractFromEmail(
				user.id,
				params.emailId,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			set.status = 201;
			return result.data;
		},
		{
			auth: true,
			params: t.Object({
				emailId: t.String(),
			}),
			response: {
				201: transactionResponse,
				404: errorResponse,
				409: errorResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Finance"],
				summary: "Extract transaction from receipt email",
			},
		},
	)

	/* ── Get Transaction ── */

	.get(
		"/:id",
		async ({ params, user, set }) => {
			const result = await financeService.getTransaction(user.id, params.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
			response: {
				200: transactionResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "Get transaction detail" },
		},
	)

	/* ── Update Transaction ── */

	.patch(
		"/:id",
		async ({ params, body, user, set }) => {
			const result = await financeService.updateTransaction(
				user.id,
				params.id,
				body,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
			body: updateTransactionBody,
			response: {
				200: transactionResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "Update transaction" },
		},
	)

	/* ── Delete Transaction ── */

	.delete(
		"/:id",
		async ({ params, user, set }) => {
			const result = await financeService.deleteTransaction(
				user.id,
				params.id,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Finance"], summary: "Delete transaction" },
		},
	)

	/* ── Update Recurring ── */

	.patch(
		"/recurring/:id",
		async ({ params, body, user, set }) => {
			const result = await financeService.updateRecurring(
				user.id,
				params.id,
				body,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({
				id: t.String(),
			}),
			body: updateRecurringBody,
			response: {
				200: recurringResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Finance"],
				summary: "Update recurring expense",
			},
		},
	);
