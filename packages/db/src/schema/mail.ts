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

/* ── Enums ── */

export const emailProviderEnum = pgEnum("email_provider", ["gmail", "outlook"]);

export const syncStatusEnum = pgEnum("sync_status", [
	"pending",
	"syncing",
	"synced",
	"error",
]);

export const emailCategoryEnum = pgEnum("email_category", [
	"urgent",
	"actionable",
	"informational",
	"newsletter",
	"receipt",
	"confirmation",
	"promotional",
	"spam",
	"uncategorized",
]);

export const triageStatusEnum = pgEnum("triage_status", [
	"pending",
	"acted",
	"dismissed",
	"snoozed",
]);

export const autoHandleActionEnum = pgEnum("auto_handle_action", [
	"archived",
	"labeled",
	"forwarded",
	"auto-replied",
	"filtered",
]);

/* ── Email Accounts ── */

export const emailAccounts = pgTable(
	"email_accounts",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		provider: emailProviderEnum().notNull(),
		email: varchar({ length: 255 }).notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
		scopes: text(),
		syncStatus: syncStatusEnum("sync_status").default("pending").notNull(),
		lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
		syncCursor: text("sync_cursor"),
		syncError: text("sync_error"),
		webhookChannelId: varchar("webhook_channel_id", { length: 255 }),
		webhookExpiry: timestamp("webhook_expiry", { withTimezone: true }),
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
		index("email_accounts_user_id_idx").on(table.userId),
		uniqueIndex("email_accounts_user_provider_email_idx").on(
			table.userId,
			table.provider,
			table.email,
		),
	],
);

/* ── Emails ── */

export const emails = pgTable(
	"emails",
	{
		id: uuid().primaryKey().defaultRandom(),
		emailAccountId: uuid("email_account_id")
			.notNull()
			.references(() => emailAccounts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		providerMessageId: varchar("provider_message_id", {
			length: 255,
		}).notNull(),
		providerThreadId: varchar("provider_thread_id", { length: 255 }),
		subject: text(),
		fromAddress: varchar("from_address", { length: 255 }),
		fromName: varchar("from_name", { length: 255 }),
		toAddresses: text("to_addresses").array(),
		ccAddresses: text("cc_addresses").array(),
		snippet: text(),
		receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
		isRead: boolean("is_read").default(false).notNull(),
		isStarred: boolean("is_starred").default(false).notNull(),
		hasAttachments: boolean("has_attachments").default(false).notNull(),
		labels: text().array(),
		category: emailCategoryEnum().default("uncategorized").notNull(),
		priorityScore: integer("priority_score").default(0).notNull(),
		aiSummary: text("ai_summary"),
		bodyPlain: text("body_plain"),
		bodyHtml: text("body_html"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("emails_user_received_at_idx").on(table.userId, table.receivedAt),
		uniqueIndex("emails_account_provider_msg_idx").on(
			table.emailAccountId,
			table.providerMessageId,
		),
		index("emails_user_category_idx").on(table.userId, table.category),
		index("emails_user_priority_idx").on(table.userId, table.priorityScore),
	],
);

/* ── Mail Triage Items ── */

export const mailTriageItems = pgTable(
	"mail_triage_items",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		emailId: uuid("email_id").references(() => emails.id, {
			onDelete: "set null",
		}),
		title: text().notNull(),
		subtitle: text(),
		urgent: boolean().default(false).notNull(),
		sourceModule: varchar("source_module", { length: 20 }),
		actions:
			jsonb().$type<
				{ label: string; variant?: "default" | "outline" | "ghost" }[]
			>(),
		status: triageStatusEnum().default("pending").notNull(),
		draftResponse: text("draft_response"),
		snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
		actedAt: timestamp("acted_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("triage_user_status_idx").on(table.userId, table.status),
		index("triage_user_created_idx").on(table.userId, table.createdAt),
	],
);

/* ── Mail Auto-Handled ── */

export const mailAutoHandled = pgTable(
	"mail_auto_handled",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		emailId: uuid("email_id").references(() => emails.id, {
			onDelete: "set null",
		}),
		text: text().notNull(),
		linkedModule: varchar("linked_module", { length: 20 }),
		actionType: autoHandleActionEnum("action_type").notNull(),
		metadata: jsonb(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("auto_handled_user_created_idx").on(table.userId, table.createdAt),
	],
);

/* ── Relations ── */

export const emailAccountsRelations = relations(
	emailAccounts,
	({ one, many }) => ({
		user: one(users, {
			fields: [emailAccounts.userId],
			references: [users.id],
		}),
		emails: many(emails),
	}),
);

export const emailsRelations = relations(emails, ({ one }) => ({
	emailAccount: one(emailAccounts, {
		fields: [emails.emailAccountId],
		references: [emailAccounts.id],
	}),
	user: one(users, {
		fields: [emails.userId],
		references: [users.id],
	}),
}));

export const mailTriageItemsRelations = relations(
	mailTriageItems,
	({ one }) => ({
		user: one(users, {
			fields: [mailTriageItems.userId],
			references: [users.id],
		}),
		email: one(emails, {
			fields: [mailTriageItems.emailId],
			references: [emails.id],
		}),
	}),
);

export const mailAutoHandledRelations = relations(
	mailAutoHandled,
	({ one }) => ({
		user: one(users, {
			fields: [mailAutoHandled.userId],
			references: [users.id],
		}),
		email: one(emails, {
			fields: [mailAutoHandled.emailId],
			references: [emails.id],
		}),
	}),
);
