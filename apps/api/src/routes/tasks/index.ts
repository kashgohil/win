import { Elysia, t } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	connectionListResponse,
	createProjectBody,
	createTaskBody,
	createTaskItemBody,
	errorResponse,
	messageResponse,
	projectDetailResponse,
	projectListResponse,
	taskDetailResponse,
	taskItemResponse,
	taskListResponse,
	updateTaskBody,
	updateTaskItemBody,
} from "./responses";
import { taskService } from "./service";

export const tasksRoutes = new Elysia({
	name: "tasks",
	prefix: "/tasks",
})
	.use(betterAuthPlugin)

	/* ── Task CRUD ── */

	.get(
		"/",
		async ({ query, user, set }) => {
			const result = await taskService.listTasks(user.id, {
				statusKey: query.statusKey,
				projectId: query.projectId,
				priority: query.priority,
				source: query.source,
				dueBefore: query.dueBefore,
				dueAfter: query.dueAfter,
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor,
				sort: query.sort,
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
				statusKey: t.Optional(t.String()),
				projectId: t.Optional(t.String()),
				priority: t.Optional(t.String()),
				source: t.Optional(t.String()),
				dueBefore: t.Optional(t.String()),
				dueAfter: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
				sort: t.Optional(t.String()),
			}),
			response: {
				200: taskListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "List tasks" },
		},
	)

	.get(
		"/:taskId",
		async ({ params, user, set }) => {
			const result = await taskService.getTask(user.id, params.taskId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String() }),
			response: {
				200: taskDetailResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Get task detail" },
		},
	)

	.post(
		"/",
		async ({ body, user, set }) => {
			const result = await taskService.createTask(user.id, body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: createTaskBody,
			response: {
				200: taskDetailResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Create task" },
		},
	)

	.patch(
		"/:taskId",
		async ({ params, body, user, set }) => {
			const result = await taskService.updateTask(user.id, params.taskId, body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String() }),
			body: updateTaskBody,
			response: {
				200: taskDetailResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Update task" },
		},
	)

	.delete(
		"/:taskId",
		async ({ params, user, set }) => {
			const result = await taskService.deleteTask(user.id, params.taskId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String() }),
			response: {
				200: messageResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Delete task" },
		},
	)

	/* ── Subtask items ── */

	.post(
		"/:taskId/items",
		async ({ params, body, user, set }) => {
			const result = await taskService.addTaskItem(
				user.id,
				params.taskId,
				body.title,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String() }),
			body: createTaskItemBody,
			response: {
				200: taskItemResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Add subtask item" },
		},
	)

	.patch(
		"/:taskId/items/:itemId",
		async ({ params, body, user, set }) => {
			const result = await taskService.updateTaskItem(
				user.id,
				params.taskId,
				params.itemId,
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
			params: t.Object({ taskId: t.String(), itemId: t.String() }),
			body: updateTaskItemBody,
			response: {
				200: taskItemResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Update subtask item" },
		},
	)

	.delete(
		"/:taskId/items/:itemId",
		async ({ params, user, set }) => {
			const result = await taskService.deleteTaskItem(
				user.id,
				params.taskId,
				params.itemId,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String(), itemId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Delete subtask item" },
		},
	)

	/* ── Snooze ── */

	.post(
		"/:taskId/snooze",
		async ({ params, body, user, set }) => {
			const result = await taskService.snoozeTask(
				user.id,
				params.taskId,
				body.snoozedUntil,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ taskId: t.String() }),
			body: t.Object({ snoozedUntil: t.String() }),
			response: {
				200: taskDetailResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Snooze task" },
		},
	)

	/* ── Projects ── */

	.get(
		"/projects",
		async ({ user, set }) => {
			const result = await taskService.listProjects(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: { 200: projectListResponse, 500: errorResponse },
			detail: { tags: ["Tasks"], summary: "List projects" },
		},
	)

	.post(
		"/projects",
		async ({ body, user, set }) => {
			const result = await taskService.createProject(user.id, body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: createProjectBody,
			response: {
				200: projectDetailResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Create project" },
		},
	)

	/* ── Connections ── */

	.get(
		"/integrations",
		async ({ user, set }) => {
			const result = await taskService.listConnections(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: { 200: connectionListResponse, 500: errorResponse },
			detail: { tags: ["Tasks"], summary: "List task integrations" },
		},
	);
