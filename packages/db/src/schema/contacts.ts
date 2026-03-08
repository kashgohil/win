import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { calendarEvents } from "./calendar";
import { emails } from "./mail";

/* ── Enums ── */

export const contactSourceEnum = pgEnum("contact_source", [
	"discovered",
	"manual",
	"imported",
]);

export const contactInteractionTypeEnum = pgEnum("contact_interaction_type", [
	"email_sent",
	"email_received",
	"meeting",
	"task_assigned",
	"task_completed",
]);

export const contactFollowUpTypeEnum = pgEnum("contact_follow_up_type", [
	"commitment",
	"cadence_nudge",
	"meeting_prep",
]);

export const contactFollowUpStatusEnum = pgEnum("contact_follow_up_status", [
	"pending",
	"completed",
	"dismissed",
	"snoozed",
]);

/* ── Contacts ── */

export const contacts = pgTable(
	"contacts",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		primaryEmail: varchar("primary_email", { length: 255 }).notNull(),
		additionalEmails: text("additional_emails").array().default([]).notNull(),
		name: varchar({ length: 255 }),
		company: varchar({ length: 255 }),
		jobTitle: varchar("job_title", { length: 255 }),
		phone: varchar({ length: 50 }),
		avatarUrl: text("avatar_url"),
		notes: text(),
		starred: boolean().default(false).notNull(),
		archived: boolean().default(false).notNull(),
		source: contactSourceEnum().default("discovered").notNull(),
		lastInteractionAt: timestamp("last_interaction_at", {
			withTimezone: true,
		}),
		interactionCount: integer("interaction_count").default(0).notNull(),
		relationshipScore: integer("relationship_score").default(0).notNull(),
		avgInteractionGapDays: integer("avg_interaction_gap_days"),
		avgResponseTimeMins: integer("avg_response_time_mins"),
		avgYourResponseTimeMins: integer("avg_your_response_time_mins"),
		introducedBy: uuid("introduced_by"),
		introducedAt: timestamp("introduced_at", { withTimezone: true }),
		lastScoreComputedAt: timestamp("last_score_computed_at", {
			withTimezone: true,
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("contacts_user_email_idx").on(table.userId, table.primaryEmail),
		index("contacts_user_name_idx").on(table.userId, table.name),
		index("contacts_user_last_interaction_idx").on(
			table.userId,
			table.lastInteractionAt,
		),
		index("contacts_user_starred_idx").on(table.userId, table.starred),
		index("contacts_user_score_idx").on(table.userId, table.relationshipScore),
		index("contacts_user_company_idx").on(table.userId, table.company),
	],
);

/* ── Contact Interactions ── */

export const contactInteractions = pgTable(
	"contact_interactions",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		type: contactInteractionTypeEnum().notNull(),
		referenceId: text("reference_id"),
		title: varchar({ length: 500 }).notNull(),
		occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
		metadata: jsonb().default({}).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("contact_interactions_contact_occurred_idx").on(
			table.contactId,
			table.occurredAt,
		),
		index("contact_interactions_user_idx").on(table.userId),
		uniqueIndex("contact_interactions_reference_idx").on(
			table.contactId,
			table.type,
			table.referenceId,
		),
	],
);

/* ── Contact Tags ── */

export const contactTags = pgTable(
	"contact_tags",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: varchar({ length: 100 }).notNull(),
		color: varchar({ length: 20 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("contact_tags_user_name_idx").on(table.userId, table.name),
	],
);

/* ── Contact Tag Assignments ── */

export const contactTagAssignments = pgTable(
	"contact_tag_assignments",
	{
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		tagId: uuid("tag_id")
			.notNull()
			.references(() => contactTags.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.contactId, table.tagId] })],
);

/* ── Contact Follow-Ups ── */

export const contactFollowUps = pgTable(
	"contact_follow_ups",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		type: contactFollowUpTypeEnum().notNull(),
		title: varchar({ length: 500 }).notNull(),
		context: text(),
		sourceEmailId: uuid("source_email_id").references(() => emails.id, {
			onDelete: "set null",
		}),
		sourceEventId: uuid("source_event_id").references(() => calendarEvents.id, {
			onDelete: "set null",
		}),
		dueAt: timestamp("due_at", { withTimezone: true }),
		status: contactFollowUpStatusEnum().default("pending").notNull(),
		snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("contact_follow_ups_user_status_due_idx").on(
			table.userId,
			table.status,
			table.dueAt,
		),
		index("contact_follow_ups_contact_idx").on(table.contactId),
	],
);

/* ── Merge Dismissals ── */

export const contactMergeDismissals = pgTable(
	"contact_merge_dismissals",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		contactIdA: uuid("contact_id_a")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		contactIdB: uuid("contact_id_b")
			.notNull()
			.references(() => contacts.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		uniqueIndex("contact_merge_dismissals_pair_idx").on(
			table.userId,
			table.contactIdA,
			table.contactIdB,
		),
	],
);

/* ── Relations ── */

export const contactsRelations = relations(contacts, ({ one, many }) => ({
	user: one(users, {
		fields: [contacts.userId],
		references: [users.id],
	}),
	introducedByContact: one(contacts, {
		fields: [contacts.introducedBy],
		references: [contacts.id],
	}),
	interactions: many(contactInteractions),
	tagAssignments: many(contactTagAssignments),
	followUps: many(contactFollowUps),
}));

export const contactInteractionsRelations = relations(
	contactInteractions,
	({ one }) => ({
		user: one(users, {
			fields: [contactInteractions.userId],
			references: [users.id],
		}),
		contact: one(contacts, {
			fields: [contactInteractions.contactId],
			references: [contacts.id],
		}),
	}),
);

export const contactTagsRelations = relations(contactTags, ({ one, many }) => ({
	user: one(users, {
		fields: [contactTags.userId],
		references: [users.id],
	}),
	assignments: many(contactTagAssignments),
}));

export const contactTagAssignmentsRelations = relations(
	contactTagAssignments,
	({ one }) => ({
		contact: one(contacts, {
			fields: [contactTagAssignments.contactId],
			references: [contacts.id],
		}),
		tag: one(contactTags, {
			fields: [contactTagAssignments.tagId],
			references: [contactTags.id],
		}),
	}),
);

export const contactFollowUpsRelations = relations(
	contactFollowUps,
	({ one }) => ({
		user: one(users, {
			fields: [contactFollowUps.userId],
			references: [users.id],
		}),
		contact: one(contacts, {
			fields: [contactFollowUps.contactId],
			references: [contacts.id],
		}),
		sourceEmail: one(emails, {
			fields: [contactFollowUps.sourceEmailId],
			references: [emails.id],
		}),
		sourceEvent: one(calendarEvents, {
			fields: [contactFollowUps.sourceEventId],
			references: [calendarEvents.id],
		}),
	}),
);
