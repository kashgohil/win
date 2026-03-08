import { relations } from "drizzle-orm";
import {
	boolean,
	index,
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

export const calendarProviderEnum = pgEnum("calendar_provider", [
	"google",
	"outlook",
]);

export const calendarSyncStatusEnum = pgEnum("calendar_sync_status", [
	"pending",
	"syncing",
	"synced",
	"error",
]);

export const calendarEventStatusEnum = pgEnum("calendar_event_status", [
	"confirmed",
	"tentative",
	"cancelled",
]);

/* ── Calendar Accounts ── */

export const calendarAccounts = pgTable(
	"calendar_accounts",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		provider: calendarProviderEnum().notNull(),
		email: varchar({ length: 255 }).notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
		scopes: text(),
		syncStatus: calendarSyncStatusEnum("sync_status")
			.default("pending")
			.notNull(),
		lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
		syncToken: text("sync_token"),
		syncError: text("sync_error"),
		webhookChannelId: varchar("webhook_channel_id", { length: 255 }),
		webhookResourceId: varchar("webhook_resource_id", { length: 255 }),
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
		index("calendar_accounts_user_id_idx").on(table.userId),
		uniqueIndex("calendar_accounts_user_provider_email_idx").on(
			table.userId,
			table.provider,
			table.email,
		),
	],
);

/* ── Calendar Events ── */

export const calendarEvents = pgTable(
	"calendar_events",
	{
		id: uuid().primaryKey().defaultRandom(),
		calendarAccountId: uuid("calendar_account_id")
			.notNull()
			.references(() => calendarAccounts.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		externalId: varchar("external_id", { length: 1024 }).notNull(),
		title: text(),
		description: text(),
		location: text(),
		startTime: timestamp("start_time", { withTimezone: true }).notNull(),
		endTime: timestamp("end_time", { withTimezone: true }).notNull(),
		isAllDay: boolean("is_all_day").default(false).notNull(),
		status: calendarEventStatusEnum().default("confirmed").notNull(),
		organizer: jsonb().$type<{ email: string; displayName?: string }>(),
		attendees: jsonb()
			.$type<
				{ email: string; displayName?: string; responseStatus?: string }[]
			>()
			.default([]),
		recurrenceRule: text("recurrence_rule"),
		recurringEventId: varchar("recurring_event_id", { length: 1024 }),
		htmlLink: text("html_link"),
		meetingLink: text("meeting_link"),
		reminders: jsonb().$type<{ method: string; minutes: number }[]>(),
		source: varchar({ length: 20 }).default("external").notNull(),
		syncedAt: timestamp("synced_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("calendar_events_user_id_idx").on(table.userId),
		index("calendar_events_account_id_idx").on(table.calendarAccountId),
		index("calendar_events_start_time_idx").on(table.userId, table.startTime),
		index("calendar_events_end_time_idx").on(table.userId, table.endTime),
		uniqueIndex("calendar_events_account_external_idx").on(
			table.calendarAccountId,
			table.externalId,
		),
	],
);

/* ── Relations ── */

export const calendarAccountsRelations = relations(
	calendarAccounts,
	({ one, many }) => ({
		user: one(users, {
			fields: [calendarAccounts.userId],
			references: [users.id],
		}),
		events: many(calendarEvents),
	}),
);

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
	user: one(users, {
		fields: [calendarEvents.userId],
		references: [users.id],
	}),
	calendarAccount: one(calendarAccounts, {
		fields: [calendarEvents.calendarAccountId],
		references: [calendarAccounts.id],
	}),
}));
