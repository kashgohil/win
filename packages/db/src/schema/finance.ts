import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { emails } from "./mail";

/* ── Enums ── */

export const finTransactionTypeEnum = pgEnum("fin_transaction_type", [
	"expense",
	"income",
]);

export const finTransactionSourceEnum = pgEnum("fin_transaction_source", [
	"email",
	"manual",
]);

export const finRecurrenceIntervalEnum = pgEnum("fin_recurrence_interval", [
	"weekly",
	"monthly",
	"quarterly",
	"yearly",
]);

/* ── Recurring Expenses ── */

export const finRecurringExpenses = pgTable(
	"fin_recurring_expenses",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		merchant: varchar({ length: 255 }).notNull(),
		expectedAmount: integer("expected_amount").notNull(),
		currency: varchar({ length: 3 }).default("USD").notNull(),
		interval: finRecurrenceIntervalEnum().notNull(),
		category: varchar({ length: 100 }),
		lastChargeAt: timestamp("last_charge_at", { withTimezone: true }),
		nextExpectedAt: timestamp("next_expected_at", { withTimezone: true }),
		active: boolean().default(true).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("fin_recurring_user_active_idx").on(table.userId, table.active),
		index("fin_recurring_user_merchant_idx").on(table.userId, table.merchant),
	],
);

/* ── Transactions ── */

export const finTransactions = pgTable(
	"fin_transactions",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: finTransactionTypeEnum().notNull(),
		source: finTransactionSourceEnum().default("email").notNull(),
		amount: integer().notNull(),
		currency: varchar({ length: 3 }).default("USD").notNull(),
		merchant: varchar({ length: 255 }),
		description: text(),
		category: varchar({ length: 100 }),
		transactedAt: timestamp("transacted_at", { withTimezone: true }).notNull(),
		sourceEmailId: uuid("source_email_id").references(() => emails.id, {
			onDelete: "set null",
		}),
		recurringGroupId: uuid("recurring_group_id").references(
			() => finRecurringExpenses.id,
			{ onDelete: "set null" },
		),
		metadata: jsonb().$type<{
			lineItems?: { name: string; amount: number; quantity?: number }[];
			tax?: number;
			orderNumber?: string;
			[key: string]: unknown;
		}>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("fin_txn_user_transacted_idx").on(table.userId, table.transactedAt),
		index("fin_txn_user_category_idx").on(table.userId, table.category),
		uniqueIndex("fin_txn_user_source_email_idx").on(
			table.userId,
			table.sourceEmailId,
		),
	],
);

/* ── Relations ── */

export const finTransactionsRelations = relations(
	finTransactions,
	({ one }) => ({
		user: one(users, {
			fields: [finTransactions.userId],
			references: [users.id],
		}),
		sourceEmail: one(emails, {
			fields: [finTransactions.sourceEmailId],
			references: [emails.id],
		}),
		recurringGroup: one(finRecurringExpenses, {
			fields: [finTransactions.recurringGroupId],
			references: [finRecurringExpenses.id],
		}),
	}),
);

export const finRecurringExpensesRelations = relations(
	finRecurringExpenses,
	({ one, many }) => ({
		user: one(users, {
			fields: [finRecurringExpenses.userId],
			references: [users.id],
		}),
		transactions: many(finTransactions),
	}),
);
