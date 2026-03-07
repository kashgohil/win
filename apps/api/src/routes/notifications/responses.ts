import { t } from "elysia";

/* ── Shared ── */

export const errorResponse = t.Object({
	error: t.String(),
});

export const messageResponse = t.Object({
	message: t.String(),
});

/* ── Notification ── */

const notificationSchema = t.Object({
	id: t.String(),
	type: t.Union([
		t.Literal("task_reminder"),
		t.Literal("task_due_soon"),
		t.Literal("task_overdue"),
		t.Literal("sync_failed"),
		t.Literal("task_assigned"),
	]),
	title: t.String(),
	body: t.Nullable(t.String()),
	link: t.Nullable(t.String()),
	read: t.Boolean(),
	taskId: t.Nullable(t.String()),
	createdAt: t.String(),
});

export const notificationListResponse = t.Object({
	notifications: t.Array(notificationSchema),
	nextCursor: t.Nullable(t.String()),
});

export const unreadCountResponse = t.Object({
	count: t.Number(),
});
