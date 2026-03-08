import { and, count, db, desc, eq, lt, notifications } from "@wingmnn/db";

type NotificationType =
	| "task_reminder"
	| "task_due_soon"
	| "task_overdue"
	| "sync_failed"
	| "task_assigned"
	| "work_summary"
	| "contact_follow_up"
	| "contact_meeting_prep";

type ServiceResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string; status: number };

export const notificationService = {
	async list(userId: string, opts: { limit?: number; cursor?: string }) {
		try {
			const pageSize = opts.limit ?? 30;
			const conditions = [eq(notifications.userId, userId)];

			if (opts.cursor) {
				conditions.push(lt(notifications.createdAt, new Date(opts.cursor)));
			}

			const rows = await db
				.select()
				.from(notifications)
				.where(and(...conditions))
				.orderBy(desc(notifications.createdAt))
				.limit(pageSize + 1);

			const hasMore = rows.length > pageSize;
			const page = hasMore ? rows.slice(0, pageSize) : rows;
			const lastItem = page[page.length - 1];
			const nextCursor =
				hasMore && lastItem ? lastItem.createdAt.toISOString() : null;

			return {
				ok: true as const,
				data: {
					notifications: page.map((n) => ({
						...n,
						createdAt: n.createdAt.toISOString(),
					})),
					nextCursor,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] list error:", message);
			return {
				ok: false as const,
				error: "Failed to list notifications",
				status: 500,
			};
		}
	},

	async getUnreadCount(
		userId: string,
	): Promise<ServiceResult<{ count: number }>> {
		try {
			const [result] = await db
				.select({ value: count() })
				.from(notifications)
				.where(
					and(eq(notifications.userId, userId), eq(notifications.read, false)),
				);

			return { ok: true as const, data: { count: Number(result?.value ?? 0) } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] unread count error:", message);
			return {
				ok: false as const,
				error: "Failed to get unread count",
				status: 500,
			};
		}
	},

	async markRead(
		userId: string,
		notificationId: string,
	): Promise<ServiceResult<{ message: string }>> {
		try {
			const [updated] = await db
				.update(notifications)
				.set({ read: true })
				.where(
					and(
						eq(notifications.id, notificationId),
						eq(notifications.userId, userId),
					),
				)
				.returning({ id: notifications.id });

			if (!updated) {
				return {
					ok: false as const,
					error: "Notification not found",
					status: 404,
				};
			}

			return { ok: true as const, data: { message: "Marked as read" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] mark read error:", message);
			return {
				ok: false as const,
				error: "Failed to mark as read",
				status: 500,
			};
		}
	},

	async markAllRead(
		userId: string,
	): Promise<ServiceResult<{ message: string }>> {
		try {
			await db
				.update(notifications)
				.set({ read: true })
				.where(
					and(eq(notifications.userId, userId), eq(notifications.read, false)),
				);

			return {
				ok: true as const,
				data: { message: "All notifications marked as read" },
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] mark all read error:", message);
			return {
				ok: false as const,
				error: "Failed to mark all as read",
				status: 500,
			};
		}
	},

	async deleteNotification(
		userId: string,
		notificationId: string,
	): Promise<ServiceResult<{ message: string }>> {
		try {
			const [deleted] = await db
				.delete(notifications)
				.where(
					and(
						eq(notifications.id, notificationId),
						eq(notifications.userId, userId),
					),
				)
				.returning({ id: notifications.id });

			if (!deleted) {
				return {
					ok: false as const,
					error: "Notification not found",
					status: 404,
				};
			}

			return { ok: true as const, data: { message: "Notification deleted" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] delete error:", message);
			return {
				ok: false as const,
				error: "Failed to delete notification",
				status: 500,
			};
		}
	},

	async create(
		userId: string,
		input: {
			type: NotificationType;
			title: string;
			body?: string | null;
			link?: string | null;
			taskId?: string | null;
		},
	): Promise<ServiceResult<typeof notifications.$inferSelect>> {
		try {
			const [row] = await db
				.insert(notifications)
				.values({
					userId,
					type: input.type,
					title: input.title,
					body: input.body,
					link: input.link,
					taskId: input.taskId,
				})
				.returning();

			if (!row) {
				return {
					ok: false as const,
					error: "Failed to create notification",
					status: 500,
				};
			}

			return { ok: true as const, data: row };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[notifications] create error:", message);
			return {
				ok: false as const,
				error: "Failed to create notification",
				status: 500,
			};
		}
	},
};
