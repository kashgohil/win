import { Elysia, t } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	errorResponse,
	messageResponse,
	notificationListResponse,
	unreadCountResponse,
} from "./responses";
import { notificationService } from "./service";

export const notificationsRoutes = new Elysia({
	name: "notifications",
	prefix: "/notifications",
})
	.use(betterAuthPlugin)

	.get(
		"/",
		async ({ query, user, set }) => {
			const result = await notificationService.list(user.id, {
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
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: notificationListResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Notifications"],
				summary: "List notifications",
			},
		},
	)

	.get(
		"/unread-count",
		async ({ user, set }) => {
			const result = await notificationService.getUnreadCount(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: unreadCountResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Notifications"],
				summary: "Get unread notification count",
			},
		},
	)

	.patch(
		"/:id/read",
		async ({ params, user, set }) => {
			const result = await notificationService.markRead(user.id, params.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ id: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Notifications"],
				summary: "Mark notification as read",
			},
		},
	)

	.post(
		"/mark-all-read",
		async ({ user, set }) => {
			const result = await notificationService.markAllRead(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: messageResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Notifications"],
				summary: "Mark all notifications as read",
			},
		},
	)

	.delete(
		"/:id",
		async ({ params, user, set }) => {
			const result = await notificationService.deleteNotification(
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
			params: t.Object({ id: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Notifications"],
				summary: "Delete notification",
			},
		},
	);
