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

export const taskProviderEnum = pgEnum("task_provider", ["linear", "jira"]);

export const taskSourceEnum = pgEnum("task_source", ["native", "external"]);

export const taskStatusKeyEnum = pgEnum("task_status_key", [
	"todo",
	"in_progress",
	"done",
	"blocked",
	"cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
	"none",
	"low",
	"medium",
	"high",
	"urgent",
]);

export const taskWriteBackStateEnum = pgEnum("task_write_back_state", [
	"synced",
	"pending",
	"failed",
	"conflict",
]);

export const taskConnectionStatusEnum = pgEnum("task_connection_status", [
	"active",
	"disconnected",
	"error",
]);

export const taskActivityActionEnum = pgEnum("task_activity_action", [
	"created",
	"updated",
	"deleted",
	"synced",
	"write_back",
	"write_back_failed",
	"conflict_detected",
	"conflict_resolved",
]);

/* ── Task Connections ── */

export const taskConnections = pgTable(
	"task_connections",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		provider: taskProviderEnum().notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
		scopes: text(),
		externalWorkspaceId: varchar("external_workspace_id", { length: 255 }),
		externalWorkspaceName: varchar("external_workspace_name", { length: 255 }),
		status: taskConnectionStatusEnum().default("active").notNull(),
		readWrite: boolean("read_write").default(false).notNull(),
		lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
		syncError: text("sync_error"),
		webhookId: varchar("webhook_id", { length: 255 }),
		webhookSecret: text("webhook_secret"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("task_connections_user_id_idx").on(table.userId),
		uniqueIndex("task_connections_user_provider_workspace_idx").on(
			table.userId,
			table.provider,
			table.externalWorkspaceId,
		),
	],
);

/* ── Task Projects ── */

export const taskProjects = pgTable(
	"task_projects",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		connectionId: uuid("connection_id").references(() => taskConnections.id, {
			onDelete: "cascade",
		}),
		name: varchar({ length: 255 }).notNull(),
		description: text(),
		source: taskSourceEnum().default("native").notNull(),
		externalId: varchar("external_id", { length: 255 }),
		externalUrl: text("external_url"),
		color: varchar({ length: 20 }),
		archived: boolean().default(false).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		index("task_projects_user_id_idx").on(table.userId),
		uniqueIndex("task_projects_connection_external_idx").on(
			table.connectionId,
			table.externalId,
		),
	],
);

/* ── Task Statuses ── */

export const taskStatuses = pgTable(
	"task_statuses",
	{
		id: uuid().primaryKey().defaultRandom(),
		connectionId: uuid("connection_id").references(() => taskConnections.id, {
			onDelete: "cascade",
		}),
		projectId: uuid("project_id").references(() => taskProjects.id, {
			onDelete: "cascade",
		}),
		name: varchar({ length: 255 }).notNull(),
		statusKey: taskStatusKeyEnum("status_key").notNull(),
		externalId: varchar("external_id", { length: 255 }),
		position: integer().default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("task_statuses_project_id_idx").on(table.projectId),
		uniqueIndex("task_statuses_connection_external_idx").on(
			table.connectionId,
			table.externalId,
		),
	],
);

/* ── Tasks ── */

export const tasks = pgTable(
	"tasks",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		projectId: uuid("project_id").references(() => taskProjects.id, {
			onDelete: "set null",
		}),
		connectionId: uuid("connection_id").references(() => taskConnections.id, {
			onDelete: "set null",
		}),
		source: taskSourceEnum().default("native").notNull(),
		externalId: varchar("external_id", { length: 255 }),
		externalUrl: text("external_url"),

		// core content
		title: varchar({ length: 500 }).notNull(),
		description: text(),
		statusKey: taskStatusKeyEnum("status_key").default("todo").notNull(),
		priority: taskPriorityEnum().default("none").notNull(),
		priorityScore: integer("priority_score").default(0).notNull(),
		dueAt: timestamp("due_at", { withTimezone: true }),

		// assignee
		assigneeUserId: text("assignee_user_id"),
		externalAssigneeRef: varchar("external_assignee_ref", { length: 255 }),
		externalAssigneeName: varchar("external_assignee_name", { length: 255 }),

		// cross-domain
		sourceEmailId: uuid("source_email_id").references(() => emails.id, {
			onDelete: "set null",
		}),

		// time
		completedAt: timestamp("completed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),

		// reminders
		reminderAt: timestamp("reminder_at", { withTimezone: true }),
		snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),

		// sync metadata
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
		syncHash: varchar("sync_hash", { length: 64 }),
		lastProviderUpdatedAt: timestamp("last_provider_updated_at", {
			withTimezone: true,
		}),
		writeBackState: taskWriteBackStateEnum("write_back_state"),
	},
	(table) => [
		index("tasks_user_status_idx").on(table.userId, table.statusKey),
		index("tasks_user_project_idx").on(table.userId, table.projectId),
		index("tasks_user_due_at_idx").on(table.userId, table.dueAt),
		index("tasks_user_priority_idx").on(table.userId, table.priorityScore),
		index("tasks_user_created_at_idx").on(table.userId, table.createdAt),
		uniqueIndex("tasks_connection_external_idx").on(
			table.connectionId,
			table.externalId,
		),
	],
);

/* ── Task Items (Subtasks / Checklist) ── */

export const taskItems = pgTable(
	"task_items",
	{
		id: uuid().primaryKey().defaultRandom(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		title: varchar({ length: 500 }).notNull(),
		completed: boolean().default(false).notNull(),
		position: integer().default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("task_items_task_id_idx").on(table.taskId)],
);

/* ── Task Sync State ── */

export const taskSyncState = pgTable(
	"task_sync_state",
	{
		id: uuid().primaryKey().defaultRandom(),
		connectionId: uuid("connection_id")
			.notNull()
			.references(() => taskConnections.id, { onDelete: "cascade" }),
		projectExternalId: varchar("project_external_id", { length: 255 }),
		cursor: text(),
		lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("task_sync_state_connection_project_idx").on(
			table.connectionId,
			table.projectExternalId,
		),
	],
);

/* ── Task Activity Log ── */

export const taskActivityLog = pgTable(
	"task_activity_log",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		taskId: uuid("task_id").references(() => tasks.id, {
			onDelete: "set null",
		}),
		connectionId: uuid("connection_id").references(() => taskConnections.id, {
			onDelete: "set null",
		}),
		action: taskActivityActionEnum().notNull(),
		details: jsonb(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("task_activity_log_user_created_idx").on(
			table.userId,
			table.createdAt,
		),
		index("task_activity_log_task_id_idx").on(table.taskId),
	],
);

/* ── Relations ── */

export const taskConnectionsRelations = relations(
	taskConnections,
	({ one, many }) => ({
		user: one(users, {
			fields: [taskConnections.userId],
			references: [users.id],
		}),
		projects: many(taskProjects),
		tasks: many(tasks),
		syncStates: many(taskSyncState),
		activityLogs: many(taskActivityLog),
	}),
);

export const taskProjectsRelations = relations(
	taskProjects,
	({ one, many }) => ({
		user: one(users, {
			fields: [taskProjects.userId],
			references: [users.id],
		}),
		connection: one(taskConnections, {
			fields: [taskProjects.connectionId],
			references: [taskConnections.id],
		}),
		tasks: many(tasks),
		statuses: many(taskStatuses),
	}),
);

export const taskStatusesRelations = relations(taskStatuses, ({ one }) => ({
	connection: one(taskConnections, {
		fields: [taskStatuses.connectionId],
		references: [taskConnections.id],
	}),
	project: one(taskProjects, {
		fields: [taskStatuses.projectId],
		references: [taskProjects.id],
	}),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id],
	}),
	project: one(taskProjects, {
		fields: [tasks.projectId],
		references: [taskProjects.id],
	}),
	connection: one(taskConnections, {
		fields: [tasks.connectionId],
		references: [taskConnections.id],
	}),
	sourceEmail: one(emails, {
		fields: [tasks.sourceEmailId],
		references: [emails.id],
	}),
	items: many(taskItems),
	activityLogs: many(taskActivityLog),
}));

export const taskItemsRelations = relations(taskItems, ({ one }) => ({
	task: one(tasks, {
		fields: [taskItems.taskId],
		references: [tasks.id],
	}),
}));

export const taskSyncStateRelations = relations(taskSyncState, ({ one }) => ({
	connection: one(taskConnections, {
		fields: [taskSyncState.connectionId],
		references: [taskConnections.id],
	}),
}));

export const taskActivityLogRelations = relations(
	taskActivityLog,
	({ one }) => ({
		user: one(users, {
			fields: [taskActivityLog.userId],
			references: [users.id],
		}),
		task: one(tasks, {
			fields: [taskActivityLog.taskId],
			references: [tasks.id],
		}),
		connection: one(taskConnections, {
			fields: [taskActivityLog.connectionId],
			references: [taskConnections.id],
		}),
	}),
);
