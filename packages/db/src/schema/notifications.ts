import { relations } from "drizzle-orm";
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";
import { tasks } from "./tasks";

/* ── Enums ── */

export const notificationTypeEnum = pgEnum("notification_type", [
	"task_reminder",
	"task_due_soon",
	"task_overdue",
	"sync_failed",
	"task_assigned",
	"work_summary",
]);

/* ── Notifications ── */

export const notifications = pgTable(
	"notifications",
	{
		id: uuid().primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: notificationTypeEnum().notNull(),
		title: varchar({ length: 500 }).notNull(),
		body: text(),
		link: text(),
		read: boolean().default(false).notNull(),
		taskId: uuid("task_id").references(() => tasks.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("notifications_user_unread_idx").on(
			table.userId,
			table.read,
			table.createdAt,
		),
		index("notifications_user_created_idx").on(table.userId, table.createdAt),
	],
);

/* ── Relations ── */

export const notificationsRelations = relations(notifications, ({ one }) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id],
	}),
	task: one(tasks, {
		fields: [notifications.taskId],
		references: [tasks.id],
	}),
}));
