import { Elysia, redirect, t } from "elysia";
import { env } from "../../env";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	activityLogResponse,
	bulkDeleteBody,
	bulkDeleteResponse,
	bulkUpdateBody,
	bulkUpdateResponse,
	connectionListResponse,
	connectResponse,
	createProjectBody,
	createTaskBody,
	createTaskItemBody,
	errorResponse,
	messageResponse,
	parseTaskBody,
	parseTaskResponse,
	projectDetailResponse,
	projectDetailWithCountResponse,
	projectListResponse,
	suggestionsResponse,
	syncResponse,
	taskDetailResponse,
	taskItemResponse,
	taskListResponse,
	taskStatsResponse,
	updateProjectBody,
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
				q: query.q,
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
				q: t.Optional(t.String()),
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
		"/suggestions",
		async ({ user, set }) => {
			const result = await taskService.getSuggestions(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: { 200: suggestionsResponse, 500: errorResponse },
			detail: { tags: ["Tasks"], summary: "Get smart task suggestions" },
		},
	)

	.get(
		"/stats",
		async ({ user, set }) => {
			const result = await taskService.getStats(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: { 200: taskStatsResponse, 500: errorResponse },
			detail: { tags: ["Tasks"], summary: "Get task statistics" },
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

	/* ── Bulk operations ── */

	.post(
		"/bulk-update",
		async ({ body, user, set }) => {
			const result = await taskService.bulkUpdateTasks(user.id, body.taskIds, {
				statusKey: body.statusKey,
				priority: body.priority,
			});
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: bulkUpdateBody,
			response: {
				200: bulkUpdateResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Bulk update tasks" },
		},
	)

	.post(
		"/bulk-delete",
		async ({ body, user, set }) => {
			const result = await taskService.bulkDeleteTasks(user.id, body.taskIds);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: bulkDeleteBody,
			response: {
				200: bulkDeleteResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Bulk delete tasks" },
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

	/* ── Retry write-back ── */

	.post(
		"/:taskId/retry-sync",
		async ({ params, user, set }) => {
			const result = await taskService.retryWriteBack(user.id, params.taskId);
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
			detail: { tags: ["Tasks"], summary: "Retry failed write-back sync" },
		},
	)

	/* ── Resolve conflict ── */

	.post(
		"/:taskId/resolve-conflict",
		async ({ params, body, user, set }) => {
			const result = await taskService.resolveConflict(
				user.id,
				params.taskId,
				body.resolution,
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
			body: t.Object({
				resolution: t.Union([
					t.Literal("keep_local"),
					t.Literal("use_external"),
				]),
			}),
			response: {
				200: messageResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Resolve sync conflict" },
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

	/* ── Create from email ── */

	.post(
		"/from-email/:emailId",
		async ({ params, user, set }) => {
			const result = await taskService.createFromEmail(user.id, params.emailId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ emailId: t.String() }),
			response: {
				200: taskDetailResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Create task from email" },
		},
	)

	/* ── Parse (AI NL) ── */

	.post(
		"/parse",
		async ({ body, user, set }) => {
			const result = await taskService.parseTaskInput(user.id, body.input);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: parseTaskBody,
			response: {
				200: parseTaskResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Parse natural language task input" },
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

	.get(
		"/projects/:projectId",
		async ({ params, user, set }) => {
			const result = await taskService.getProject(user.id, params.projectId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ projectId: t.String() }),
			response: {
				200: projectDetailWithCountResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Get project detail" },
		},
	)

	.patch(
		"/projects/:projectId",
		async ({ params, body, user, set }) => {
			const result = await taskService.updateProject(
				user.id,
				params.projectId,
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
			params: t.Object({ projectId: t.String() }),
			body: updateProjectBody,
			response: {
				200: projectDetailResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Update project" },
		},
	)

	.delete(
		"/projects/:projectId",
		async ({ params, user, set }) => {
			const result = await taskService.deleteProject(user.id, params.projectId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ projectId: t.String() }),
			response: {
				200: messageResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Delete project" },
		},
	)

	/* ── Activity log ── */

	.get(
		"/activity",
		async ({ query, user, set }) => {
			const result = await taskService.getActivityLog(user.id, {
				taskId: query.taskId,
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
				taskId: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: activityLogResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Get activity log" },
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
	)

	.post(
		"/integrations/connect/:provider",
		async ({ params, user, set }) => {
			const result = await taskService.connectProvider(
				user.id,
				params.provider,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ provider: t.String() }),
			response: {
				200: connectResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Get OAuth URL for provider" },
		},
	)

	.get(
		"/integrations/callback/:provider",
		async ({ params, query }) => {
			const clientUrl = `${env.CLIENT_URL}/module/task`;

			if (query.error) {
				return redirect(
					`${clientUrl}?error=${encodeURIComponent(query.error)}`,
				);
			}

			if (!query.code || !query.state) {
				return redirect(`${clientUrl}?error=missing_params`);
			}

			const result = await taskService.handleOAuthCallback(
				params.provider,
				query.code,
				query.state,
			);

			if (!result.ok) {
				return redirect(
					`${clientUrl}?error=${encodeURIComponent(result.error)}`,
				);
			}

			return redirect(`${clientUrl}?connected=${params.provider}`);
		},
		{
			params: t.Object({ provider: t.String() }),
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
				error: t.Optional(t.String()),
			}),
			detail: { tags: ["Tasks"], summary: "OAuth callback" },
		},
	)

	.post(
		"/integrations/:connectionId/sync",
		async ({ params, user, set }) => {
			const result = await taskService.syncConnection(
				user.id,
				params.connectionId,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ connectionId: t.String() }),
			response: {
				200: syncResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Sync connection" },
		},
	)

	.delete(
		"/integrations/:connectionId",
		async ({ params, user, set }) => {
			const result = await taskService.disconnectProvider(
				user.id,
				params.connectionId,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ connectionId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Disconnect integration" },
		},
	)

	/* ── Webhooks ── */

	.post(
		"/webhooks/:provider",
		async ({ params, body: rawBody, request, set }) => {
			const bodyStr =
				typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody);
			const headers: Record<string, string> = {};
			request.headers.forEach((value, key) => {
				headers[key] = value;
			});

			const result = await taskService.handleWebhook(
				params.provider,
				headers,
				bodyStr,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			params: t.Object({ provider: t.String() }),
			response: {
				200: messageResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Tasks"], summary: "Provider webhook" },
		},
	);
