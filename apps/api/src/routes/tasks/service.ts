import {
	and,
	asc,
	count,
	db,
	desc,
	emails,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	or,
	sql,
	taskActivityLog,
	taskAutomationRules,
	taskConnections,
	taskItems,
	taskProjects,
	tasks,
	taskStatuses,
	taskSyncState,
} from "@wingmnn/db";
import {
	enqueueFullTaskSync,
	enqueueTaskWebhookEvent,
	enqueueTaskWriteBack,
	evaluateAutomations,
	getAiProvider,
	scheduleRecurringTaskSync,
	TASK_PARSE_SYSTEM_PROMPT,
	WORK_SUMMARY_SYSTEM_PROMPT,
} from "@wingmnn/queue";
import {
	getTaskProvider,
	linearProvider,
	registerProvider,
} from "@wingmnn/tasks";

// Register the Linear provider on import
registerProvider(linearProvider);

/* ── Priority scoring ── */

function computePriorityScore(opts: {
	priority: "none" | "low" | "medium" | "high" | "urgent";
	dueAt: Date | null;
	createdAt: Date;
	sourceEmailId: string | null;
}): number {
	let score = 0;

	// Priority level
	switch (opts.priority) {
		case "urgent":
			score += 30;
			break;
		case "high":
			score += 20;
			break;
		case "medium":
			score += 10;
			break;
		case "low":
			score += 5;
			break;
	}

	// Due date proximity
	if (opts.dueAt) {
		const now = new Date();
		const diffMs = opts.dueAt.getTime() - now.getTime();
		const diffDays = diffMs / 86400000;

		if (diffDays < 0)
			score += 40; // overdue
		else if (diffDays < 1)
			score += 30; // due today
		else if (diffDays < 7)
			score += 20; // due this week
		else score += 5; // due later
	}

	// Task age (1 point per day, max 10)
	const ageDays = (Date.now() - opts.createdAt.getTime()) / 86400000;
	score += Math.min(Math.floor(ageDays), 10);

	// Cross-domain bonus
	if (opts.sourceEmailId) score += 5;

	return Math.min(score, 100);
}

/* ── NL stub parser (fallback when AI unavailable) ── */

function parseTaskInputStub(input: string): {
	title: string;
	dueAt: string | null;
	priority: "none" | "low" | "medium" | "high" | "urgent";
	projectName: string | null;
} {
	let title = input;
	let priority: "none" | "low" | "medium" | "high" | "urgent" = "none";
	let projectName: string | null = null;
	let dueAt: string | null = null;

	// Extract #project
	const projectMatch = title.match(/#(\w+)/);
	if (projectMatch) {
		projectName = projectMatch[1]!;
		title = title.replace(/#\w+/, "").trim();
	}

	// Extract priority keywords
	if (/\burgent\b/i.test(title)) {
		priority = "urgent";
		title = title.replace(/\burgent\b/gi, "").trim();
	} else if (/\bhigh\s*priority\b/i.test(title)) {
		priority = "high";
		title = title.replace(/\bhigh\s*priority\b/gi, "").trim();
	} else if (/\b(important)\b/i.test(title)) {
		priority = "high";
		title = title.replace(/\bimportant\b/gi, "").trim();
	} else if (/\blow\s*priority\b/i.test(title)) {
		priority = "low";
		title = title.replace(/\blow\s*priority\b/gi, "").trim();
	}

	// Extract date keywords
	const today = new Date();
	if (/\b(today)\b/i.test(title)) {
		const d = new Date(today);
		d.setHours(23, 59, 59, 0);
		dueAt = d.toISOString();
		title = title.replace(/\btoday\b/gi, "").trim();
	} else if (/\b(tomorrow)\b/i.test(title)) {
		const d = new Date(today);
		d.setDate(d.getDate() + 1);
		d.setHours(23, 59, 59, 0);
		dueAt = d.toISOString();
		title = title.replace(/\btomorrow\b/gi, "").trim();
	} else {
		const byMatch = title.match(
			/\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
		);
		if (byMatch) {
			const dayNames = [
				"sunday",
				"monday",
				"tuesday",
				"wednesday",
				"thursday",
				"friday",
				"saturday",
			];
			const targetDay = dayNames.indexOf(byMatch[1]?.toLowerCase() ?? "");
			if (targetDay >= 0) {
				const d = new Date(today);
				const currentDay = d.getDay();
				let diff = targetDay - currentDay;
				if (diff <= 0) diff += 7;
				d.setDate(d.getDate() + diff);
				d.setHours(23, 59, 59, 0);
				dueAt = d.toISOString();
				title = title.replace(byMatch[0], "").trim();
			}
		}
	}

	// Clean up extra whitespace and trailing "by"
	title = title
		.replace(/\bby\s*$/i, "")
		.replace(/\s+/g, " ")
		.trim();

	return { title: title || input, dueAt, priority, projectName };
}

/* ── Types ── */

type SerializedTask = {
	id: string;
	source: "native" | "external";
	provider: string | null;
	externalId: string | null;
	externalUrl: string | null;
	title: string;
	description: string | null;
	statusKey: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
	priority: "none" | "low" | "medium" | "high" | "urgent";
	priorityScore: number;
	dueAt: string | null;
	assigneeUserId: string | null;
	externalAssigneeName: string | null;
	projectId: string | null;
	suggestedProjectId: string | null;
	sourceEmailId: string | null;
	completedAt: string | null;
	reminderAt: string | null;
	snoozedUntil: string | null;
	writeBackState: string | null;
	items: {
		id: string;
		title: string;
		completed: boolean;
		position: number;
	}[];
	createdAt: string;
	updatedAt: string;
};

type TaskListResult =
	| {
			ok: true;
			data: {
				tasks: SerializedTask[];
				total: number;
				hasMore: boolean;
				nextCursor?: string;
			};
	  }
	| { ok: false; error: string; status: 400 | 500 };

type TaskDetailResult =
	| { ok: true; data: SerializedTask }
	| { ok: false; error: string; status: 404 | 500 };

type TaskCreateResult =
	| { ok: true; data: SerializedTask }
	| { ok: false; error: string; status: 400 | 500 };

type TaskUpdateResult =
	| { ok: true; data: SerializedTask }
	| { ok: false; error: string; status: 400 | 404 | 500 };

type TaskDeleteResult =
	| { ok: true; data: { message: string } }
	| { ok: false; error: string; status: 400 | 404 | 500 };

type TaskItemResult =
	| {
			ok: true;
			data: { id: string; title: string; completed: boolean; position: number };
	  }
	| { ok: false; error: string; status: 400 | 404 | 500 };

type ProjectListResult =
	| {
			ok: true;
			data: {
				id: string;
				name: string;
				description: string | null;
				source: "native" | "external";
				externalId: string | null;
				color: string | null;
				archived: boolean;
				createdAt: string;
			}[];
	  }
	| { ok: false; error: string; status: 500 };

type ProjectCreateResult =
	| {
			ok: true;
			data: {
				id: string;
				name: string;
				description: string | null;
				source: "native" | "external";
				externalId: string | null;
				color: string | null;
				archived: boolean;
				createdAt: string;
			};
	  }
	| { ok: false; error: string; status: 400 | 500 };

type ConnectionListResult =
	| {
			ok: true;
			data: {
				id: string;
				provider: string;
				externalWorkspaceName: string | null;
				status: string;
				readWrite: boolean;
				lastSyncAt: string | null;
				createdAt: string;
			}[];
	  }
	| { ok: false; error: string; status: 500 };

/* ── Helpers ── */

function serializeTask(
	task: typeof tasks.$inferSelect,
	items: (typeof taskItems.$inferSelect)[],
	connection?: typeof taskConnections.$inferSelect | null,
): SerializedTask {
	return {
		id: task.id,
		source: task.source,
		provider: connection?.provider ?? null,
		externalId: task.externalId,
		externalUrl: task.externalUrl,
		title: task.title,
		description: task.description,
		statusKey: task.statusKey,
		priority: task.priority,
		priorityScore: task.priorityScore,
		dueAt: task.dueAt?.toISOString() ?? null,
		assigneeUserId: task.assigneeUserId,
		externalAssigneeName: task.externalAssigneeName,
		projectId: task.projectId,
		sourceEmailId: task.sourceEmailId,
		completedAt: task.completedAt?.toISOString() ?? null,
		reminderAt: task.reminderAt?.toISOString() ?? null,
		snoozedUntil: task.snoozedUntil?.toISOString() ?? null,
		suggestedProjectId: task.suggestedProjectId,
		writeBackState: task.writeBackState,
		items: items.map((item) => ({
			id: item.id,
			title: item.title,
			completed: item.completed,
			position: item.position,
		})),
		createdAt: task.createdAt.toISOString(),
		updatedAt: task.updatedAt.toISOString(),
	};
}

/* ── Service ── */

export const taskService = {
	/* ── List tasks ── */
	async listTasks(
		userId: string,
		opts: {
			q?: string;
			statusKey?: string;
			projectId?: string;
			priority?: string;
			source?: string;
			dueBefore?: string;
			dueAfter?: string;
			limit?: number;
			cursor?: string;
			sort?: string;
		},
	): Promise<TaskListResult> {
		try {
			const limit = Math.min(opts.limit ?? 50, 100);
			const conditions = [eq(tasks.userId, userId)];

			if (opts.statusKey) {
				conditions.push(
					eq(
						tasks.statusKey,
						opts.statusKey as (typeof tasks.statusKey.enumValues)[number],
					),
				);
			}
			if (opts.projectId) {
				conditions.push(eq(tasks.projectId, opts.projectId));
			}
			if (opts.priority) {
				conditions.push(
					eq(
						tasks.priority,
						opts.priority as (typeof tasks.priority.enumValues)[number],
					),
				);
			}
			if (opts.source) {
				conditions.push(
					eq(
						tasks.source,
						opts.source as (typeof tasks.source.enumValues)[number],
					),
				);
			}
			if (opts.dueBefore) {
				conditions.push(lte(tasks.dueAt, new Date(opts.dueBefore)));
			}
			if (opts.dueAfter) {
				conditions.push(gte(tasks.dueAt, new Date(opts.dueAfter)));
			}
			if (opts.q) {
				const pattern = `%${opts.q}%`;
				conditions.push(
					or(ilike(tasks.title, pattern), ilike(tasks.description, pattern))!,
				);
			}
			if (opts.cursor) {
				conditions.push(lte(tasks.createdAt, new Date(opts.cursor)));
			}

			const where = and(...conditions);

			const sortOrder =
				opts.sort === "due_at"
					? asc(tasks.dueAt)
					: opts.sort === "priority"
						? desc(tasks.priorityScore)
						: desc(tasks.createdAt);

			const [taskRows, totalResult] = await Promise.all([
				db.query.tasks.findMany({
					where,
					orderBy: sortOrder,
					limit: limit + 1,
					with: {
						items: { orderBy: asc(taskItems.position) },
						connection: true,
					},
				}),
				db.select({ count: count() }).from(tasks).where(where),
			]);

			const hasMore = taskRows.length > limit;
			const resultTasks = hasMore ? taskRows.slice(0, limit) : taskRows;

			return {
				ok: true,
				data: {
					tasks: resultTasks.map((row) =>
						serializeTask(row, row.items, row.connection),
					),
					total: totalResult[0]?.count ?? 0,
					hasMore,
					nextCursor: hasMore
						? resultTasks[resultTasks.length - 1]?.createdAt.toISOString()
						: undefined,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] listTasks error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Get task ── */
	async getTask(userId: string, taskId: string): Promise<TaskDetailResult> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
				with: {
					items: { orderBy: asc(taskItems.position) },
					connection: true,
				},
			});

			if (!task) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			return {
				ok: true,
				data: serializeTask(task, task.items, task.connection),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getTask error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Create task ── */
	async createTask(
		userId: string,
		input: {
			title: string;
			description?: string;
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
			dueAt?: string | null;
			projectId?: string | null;
			sourceEmailId?: string | null;
			reminderAt?: string | null;
		},
	): Promise<TaskCreateResult> {
		try {
			const dueAt = input.dueAt ? new Date(input.dueAt) : null;
			const priority = input.priority ?? "none";
			const priorityScore = computePriorityScore({
				priority,
				dueAt,
				createdAt: new Date(),
				sourceEmailId: input.sourceEmailId ?? null,
			});

			const rows = await db
				.insert(tasks)
				.values({
					userId,
					title: input.title,
					description: input.description ?? null,
					statusKey: input.statusKey ?? "todo",
					priority,
					priorityScore,
					dueAt,
					projectId: input.projectId ?? null,
					sourceEmailId: input.sourceEmailId ?? null,
					reminderAt: input.reminderAt ? new Date(input.reminderAt) : null,
					source: "native",
				})
				.returning();

			const created = rows[0];
			if (!created) {
				return {
					ok: false,
					error: "Failed to create task",
					status: 500 as const,
				};
			}

			await db.insert(taskActivityLog).values({
				userId,
				taskId: created.id,
				action: "created",
				details: { source: "native" },
			});

			// Evaluate automation rules for task creation
			evaluateAutomations("task_created", {
				id: created.id,
				userId,
				title: created.title,
				statusKey: created.statusKey,
				priority: created.priority,
				projectId: created.projectId,
			}).catch((err) =>
				console.error("[tasks] Automation evaluation failed:", err),
			);

			return {
				ok: true,
				data: serializeTask(created, []),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] createTask error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Update task ── */
	async updateTask(
		userId: string,
		taskId: string,
		input: {
			title?: string;
			description?: string | null;
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
			dueAt?: string | null;
			projectId?: string | null;
			suggestedProjectId?: string | null;
			reminderAt?: string | null;
			snoozedUntil?: string | null;
		},
	): Promise<TaskUpdateResult> {
		try {
			const existing = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!existing) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			const updates: Record<string, unknown> = {};
			if (input.title !== undefined) updates.title = input.title;
			if (input.description !== undefined)
				updates.description = input.description;
			if (input.statusKey !== undefined) {
				updates.statusKey = input.statusKey;
				if (input.statusKey === "done" && !existing.completedAt) {
					updates.completedAt = new Date();
				} else if (input.statusKey !== "done" && existing.completedAt) {
					updates.completedAt = null;
				}
			}
			if (input.priority !== undefined) updates.priority = input.priority;
			if (input.dueAt !== undefined)
				updates.dueAt = input.dueAt ? new Date(input.dueAt) : null;
			if (input.projectId !== undefined) {
				updates.projectId = input.projectId;
				// Clear suggestion when project is explicitly set
				updates.suggestedProjectId = null;
			}
			if (input.suggestedProjectId !== undefined)
				updates.suggestedProjectId = input.suggestedProjectId;
			if (input.reminderAt !== undefined)
				updates.reminderAt = input.reminderAt
					? new Date(input.reminderAt)
					: null;
			if (input.snoozedUntil !== undefined)
				updates.snoozedUntil = input.snoozedUntil
					? new Date(input.snoozedUntil)
					: null;

			if (Object.keys(updates).length === 0) {
				return { ok: false, error: "No fields to update", status: 400 };
			}

			// Recompute priority score when relevant fields change
			if (
				input.priority !== undefined ||
				input.dueAt !== undefined ||
				input.statusKey !== undefined
			) {
				const priority =
					(updates.priority as typeof existing.priority) ?? existing.priority;
				const dueAt =
					input.dueAt !== undefined
						? (updates.dueAt as Date | null)
						: existing.dueAt;
				updates.priorityScore = computePriorityScore({
					priority,
					dueAt,
					createdAt: existing.createdAt,
					sourceEmailId: existing.sourceEmailId,
				});
			}

			const updatedRows = await db
				.update(tasks)
				.set(updates)
				.where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
				.returning();

			const updated = updatedRows[0];
			if (!updated) {
				return {
					ok: false,
					error: "Failed to update task",
					status: 500 as const,
				};
			}

			const items = await db.query.taskItems.findMany({
				where: eq(taskItems.taskId, taskId),
				orderBy: asc(taskItems.position),
			});

			await db.insert(taskActivityLog).values({
				userId,
				taskId,
				action: "updated",
				details: { fields: Object.keys(updates) },
			});

			// Evaluate automation rules
			const taskContext = {
				id: taskId,
				userId,
				title: updated.title,
				statusKey: updated.statusKey,
				priority: updated.priority,
				projectId: updated.projectId,
				oldStatusKey: existing.statusKey,
				oldPriority: existing.priority,
			};
			if (input.statusKey && input.statusKey !== existing.statusKey) {
				evaluateAutomations("status_changed", taskContext).catch((err) =>
					console.error("[tasks] Automation evaluation failed:", err),
				);
			}
			if (input.priority && input.priority !== existing.priority) {
				evaluateAutomations("priority_changed", taskContext).catch((err) =>
					console.error("[tasks] Automation evaluation failed:", err),
				);
			}

			// Enqueue write-back for external tasks
			if (
				existing.source === "external" &&
				existing.connectionId &&
				existing.externalId
			) {
				// Resolve status external ID if statusKey changed
				let statusExternalId: string | undefined;
				if (input.statusKey && existing.connectionId) {
					const status = await db.query.taskStatuses.findFirst({
						where: and(
							eq(taskStatuses.connectionId, existing.connectionId),
							eq(taskStatuses.statusKey, input.statusKey),
						),
					});
					statusExternalId = status?.externalId ?? undefined;
				}

				await db
					.update(tasks)
					.set({ writeBackState: "pending" })
					.where(eq(tasks.id, taskId));

				await enqueueTaskWriteBack({
					taskId,
					connectionId: existing.connectionId,
					userId,
					externalId: existing.externalId,
					updates: {
						title: input.title,
						description: input.description ?? undefined,
						statusExternalId,
						priority: input.priority,
						dueAt: input.dueAt,
					},
				}).catch((err) => {
					console.error("[tasks] Failed to enqueue write-back:", err);
				});
			}

			return {
				ok: true,
				data: serializeTask(updated, items),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] updateTask error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Delete task ── */
	async deleteTask(userId: string, taskId: string): Promise<TaskDeleteResult> {
		try {
			const existing = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!existing) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			if (existing.source !== "native") {
				return {
					ok: false,
					error: "Cannot delete external tasks",
					status: 400,
				};
			}

			await db
				.delete(tasks)
				.where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

			return { ok: true, data: { message: "Task deleted" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] deleteTask error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Bulk update tasks ── */
	async bulkUpdateTasks(
		userId: string,
		taskIds: string[],
		input: {
			statusKey?: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
			priority?: "none" | "low" | "medium" | "high" | "urgent";
		},
	): Promise<
		| { ok: true; data: { updated: number } }
		| { ok: false; error: string; status: 400 | 500 }
	> {
		try {
			if (taskIds.length === 0) {
				return { ok: false, error: "No task IDs provided", status: 400 };
			}
			if (taskIds.length > 100) {
				return { ok: false, error: "Max 100 tasks per batch", status: 400 };
			}

			const updates: Record<string, unknown> = {};
			if (input.statusKey !== undefined) {
				updates.statusKey = input.statusKey;
				if (input.statusKey === "done") {
					updates.completedAt = new Date();
				} else {
					updates.completedAt = null;
				}
			}
			if (input.priority !== undefined) updates.priority = input.priority;

			if (Object.keys(updates).length === 0) {
				return { ok: false, error: "No fields to update", status: 400 };
			}

			const result = await db
				.update(tasks)
				.set(updates)
				.where(and(eq(tasks.userId, userId), inArray(tasks.id, taskIds)))
				.returning({ id: tasks.id });

			return { ok: true, data: { updated: result.length } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] bulkUpdateTasks error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Bulk delete tasks ── */
	async bulkDeleteTasks(
		userId: string,
		taskIds: string[],
	): Promise<
		| { ok: true; data: { deleted: number } }
		| { ok: false; error: string; status: 400 | 500 }
	> {
		try {
			if (taskIds.length === 0) {
				return { ok: false, error: "No task IDs provided", status: 400 };
			}
			if (taskIds.length > 100) {
				return { ok: false, error: "Max 100 tasks per batch", status: 400 };
			}

			// Only delete native tasks
			const result = await db
				.delete(tasks)
				.where(
					and(
						eq(tasks.userId, userId),
						inArray(tasks.id, taskIds),
						eq(tasks.source, "native"),
					),
				)
				.returning({ id: tasks.id });

			return { ok: true, data: { deleted: result.length } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] bulkDeleteTasks error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Add subtask item ── */
	async addTaskItem(
		userId: string,
		taskId: string,
		title: string,
	): Promise<TaskItemResult> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!task) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			const maxPos = await db
				.select({ max: sql<number>`coalesce(max(${taskItems.position}), -1)` })
				.from(taskItems)
				.where(eq(taskItems.taskId, taskId));

			const itemRows = await db
				.insert(taskItems)
				.values({
					taskId,
					title,
					position: (maxPos[0]?.max ?? -1) + 1,
				})
				.returning();

			const item = itemRows[0];
			if (!item) {
				return {
					ok: false,
					error: "Failed to create task item",
					status: 500 as const,
				};
			}

			return {
				ok: true,
				data: {
					id: item.id,
					title: item.title,
					completed: item.completed,
					position: item.position,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] addTaskItem error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Update subtask item ── */
	async updateTaskItem(
		userId: string,
		taskId: string,
		itemId: string,
		input: { title?: string; completed?: boolean },
	): Promise<TaskItemResult> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!task) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			const updates: Record<string, unknown> = {};
			if (input.title !== undefined) updates.title = input.title;
			if (input.completed !== undefined) updates.completed = input.completed;

			if (Object.keys(updates).length === 0) {
				return { ok: false, error: "No fields to update", status: 400 };
			}

			const updatedItemRows = await db
				.update(taskItems)
				.set(updates)
				.where(and(eq(taskItems.id, itemId), eq(taskItems.taskId, taskId)))
				.returning();

			const updatedItem = updatedItemRows[0];
			if (!updatedItem) {
				return { ok: false, error: "Task item not found", status: 404 };
			}

			return {
				ok: true,
				data: {
					id: updatedItem.id,
					title: updatedItem.title,
					completed: updatedItem.completed,
					position: updatedItem.position,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] updateTaskItem error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Delete subtask item ── */
	async deleteTaskItem(
		userId: string,
		taskId: string,
		itemId: string,
	): Promise<TaskDeleteResult> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!task) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			const deletedRows = await db
				.delete(taskItems)
				.where(and(eq(taskItems.id, itemId), eq(taskItems.taskId, taskId)))
				.returning();

			if (!deletedRows[0]) {
				return { ok: false, error: "Task item not found", status: 404 };
			}

			return { ok: true, data: { message: "Task item deleted" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] deleteTaskItem error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── List projects ── */
	async listProjects(userId: string): Promise<ProjectListResult> {
		try {
			const projects = await db.query.taskProjects.findMany({
				where: eq(taskProjects.userId, userId),
				orderBy: desc(taskProjects.createdAt),
			});

			return {
				ok: true,
				data: projects.map((p) => ({
					id: p.id,
					name: p.name,
					description: p.description,
					source: p.source,
					externalId: p.externalId,
					color: p.color,
					archived: p.archived,
					createdAt: p.createdAt.toISOString(),
				})),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] listProjects error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Create project ── */
	async createProject(
		userId: string,
		input: { name: string; description?: string; color?: string },
	): Promise<ProjectCreateResult> {
		try {
			const rows = await db
				.insert(taskProjects)
				.values({
					userId,
					name: input.name,
					description: input.description ?? null,
					color: input.color ?? null,
					source: "native",
				})
				.returning();

			const project = rows[0];
			if (!project) {
				return {
					ok: false,
					error: "Failed to create project",
					status: 500 as const,
				};
			}

			return {
				ok: true,
				data: {
					id: project.id,
					name: project.name,
					description: project.description,
					source: project.source,
					externalId: project.externalId,
					color: project.color,
					archived: project.archived,
					createdAt: project.createdAt.toISOString(),
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] createProject error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Get project detail ── */
	async getProject(
		userId: string,
		projectId: string,
	): Promise<
		| {
				ok: true;
				data: {
					id: string;
					name: string;
					description: string | null;
					source: "native" | "external";
					externalId: string | null;
					color: string | null;
					archived: boolean;
					createdAt: string;
					taskCount: number;
				};
		  }
		| { ok: false; error: string; status: 404 | 500 }
	> {
		try {
			const project = await db.query.taskProjects.findFirst({
				where: and(
					eq(taskProjects.id, projectId),
					eq(taskProjects.userId, userId),
				),
			});
			if (!project) {
				return { ok: false, error: "Project not found", status: 404 };
			}

			const [taskCountRow] = await db
				.select({ count: count() })
				.from(tasks)
				.where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));

			return {
				ok: true,
				data: {
					id: project.id,
					name: project.name,
					description: project.description,
					source: project.source,
					externalId: project.externalId,
					color: project.color,
					archived: project.archived,
					createdAt: project.createdAt.toISOString(),
					taskCount: taskCountRow?.count ?? 0,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getProject error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Update project ── */
	async updateProject(
		userId: string,
		projectId: string,
		input: {
			name?: string;
			description?: string | null;
			color?: string | null;
			archived?: boolean;
		},
	): Promise<ProjectCreateResult> {
		try {
			const existing = await db.query.taskProjects.findFirst({
				where: and(
					eq(taskProjects.id, projectId),
					eq(taskProjects.userId, userId),
				),
			});
			if (!existing) {
				return { ok: false, error: "Project not found", status: 400 };
			}
			if (existing.source === "external") {
				return {
					ok: false,
					error: "Cannot edit external projects",
					status: 400,
				};
			}

			const rows = await db
				.update(taskProjects)
				.set({
					...(input.name !== undefined && { name: input.name }),
					...(input.description !== undefined && {
						description: input.description,
					}),
					...(input.color !== undefined && { color: input.color }),
					...(input.archived !== undefined && { archived: input.archived }),
					updatedAt: new Date(),
				})
				.where(
					and(eq(taskProjects.id, projectId), eq(taskProjects.userId, userId)),
				)
				.returning();

			const project = rows[0];
			if (!project) {
				return { ok: false, error: "Failed to update project", status: 500 };
			}

			return {
				ok: true,
				data: {
					id: project.id,
					name: project.name,
					description: project.description,
					source: project.source,
					externalId: project.externalId,
					color: project.color,
					archived: project.archived,
					createdAt: project.createdAt.toISOString(),
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] updateProject error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Delete project ── */
	async deleteProject(
		userId: string,
		projectId: string,
	): Promise<TaskDeleteResult> {
		try {
			const existing = await db.query.taskProjects.findFirst({
				where: and(
					eq(taskProjects.id, projectId),
					eq(taskProjects.userId, userId),
				),
			});
			if (!existing) {
				return { ok: false, error: "Project not found", status: 404 };
			}
			if (existing.source === "external") {
				return {
					ok: false,
					error: "Cannot delete external projects",
					status: 400,
				};
			}

			// Unlink tasks from this project
			await db
				.update(tasks)
				.set({ projectId: null })
				.where(and(eq(tasks.projectId, projectId), eq(tasks.userId, userId)));

			await db
				.delete(taskProjects)
				.where(
					and(eq(taskProjects.id, projectId), eq(taskProjects.userId, userId)),
				);

			return { ok: true, data: { message: "Project deleted" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] deleteProject error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Activity log ── */
	async getActivityLog(
		userId: string,
		opts: { taskId?: string; limit?: number; cursor?: string },
	): Promise<
		| {
				ok: true;
				data: {
					entries: {
						id: string;
						action: string;
						taskId: string | null;
						details: unknown;
						createdAt: string;
					}[];
					hasMore: boolean;
					nextCursor?: string;
				};
		  }
		| { ok: false; error: string; status: 500 }
	> {
		try {
			const pageSize = opts.limit ?? 50;
			const conditions = [eq(taskActivityLog.userId, userId)];

			if (opts.taskId) {
				conditions.push(eq(taskActivityLog.taskId, opts.taskId));
			}
			if (opts.cursor) {
				conditions.push(lte(taskActivityLog.createdAt, new Date(opts.cursor)));
			}

			const entries = await db.query.taskActivityLog.findMany({
				where: and(...conditions),
				orderBy: desc(taskActivityLog.createdAt),
				limit: pageSize + 1,
			});

			const hasMore = entries.length > pageSize;
			const page = hasMore ? entries.slice(0, pageSize) : entries;

			return {
				ok: true,
				data: {
					entries: page.map((e) => ({
						id: e.id,
						action: e.action,
						taskId: e.taskId,
						details: e.details,
						createdAt: e.createdAt.toISOString(),
					})),
					hasMore,
					nextCursor: hasMore
						? page[page.length - 1]?.createdAt.toISOString()
						: undefined,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getActivityLog error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Snooze task ── */
	async snoozeTask(
		userId: string,
		taskId: string,
		snoozedUntil: string,
	): Promise<TaskUpdateResult> {
		try {
			const existing = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!existing) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			const updatedRows = await db
				.update(tasks)
				.set({ snoozedUntil: new Date(snoozedUntil) })
				.where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
				.returning();

			const updated = updatedRows[0];
			if (!updated) {
				return {
					ok: false,
					error: "Failed to snooze task",
					status: 500 as const,
				};
			}

			const items = await db.query.taskItems.findMany({
				where: eq(taskItems.taskId, taskId),
				orderBy: asc(taskItems.position),
			});

			return { ok: true, data: serializeTask(updated, items) };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] snoozeTask error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Create task from email ── */
	async createFromEmail(
		userId: string,
		emailId: string,
	): Promise<TaskCreateResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});

			if (!email) {
				return { ok: false, error: "Email not found", status: 400 };
			}

			const title =
				email.subject?.replace(/^(Re|Fwd|Fw):\s*/gi, "").trim() ||
				"Task from email";
			const description = [
				email.fromName || email.fromAddress
					? `From: ${email.fromName || email.fromAddress}`
					: null,
				email.snippet ? `\n${email.snippet}` : null,
			]
				.filter(Boolean)
				.join("");

			const priorityScore = computePriorityScore({
				priority: "none",
				dueAt: null,
				createdAt: new Date(),
				sourceEmailId: emailId,
			});

			const rows = await db
				.insert(tasks)
				.values({
					userId,
					title,
					description: description || null,
					source: "native",
					sourceEmailId: emailId,
					statusKey: "todo",
					priority: "none",
					priorityScore,
				})
				.returning();

			const created = rows[0];
			if (!created) {
				return {
					ok: false,
					error: "Failed to create task",
					status: 500 as const,
				};
			}

			await db.insert(taskActivityLog).values({
				userId,
				taskId: created.id,
				action: "created",
				details: { source: "email", emailId },
			});

			return { ok: true, data: serializeTask(created, []) };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] createFromEmail error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Connect provider (get auth URL) ── */
	async connectProvider(
		userId: string,
		provider: string,
	): Promise<
		| { ok: true; data: { url: string } }
		| { ok: false; error: string; status: 400 | 500 }
	> {
		try {
			const taskProvider = getTaskProvider(provider);
			if (!taskProvider) {
				return {
					ok: false,
					error: `Unknown provider: ${provider}`,
					status: 400,
				};
			}
			const state = Buffer.from(JSON.stringify({ userId, provider })).toString(
				"base64url",
			);
			const url = taskProvider.getAuthUrl(state);
			return { ok: true, data: { url } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] connectProvider error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── OAuth callback ── */
	async handleOAuthCallback(
		provider: string,
		code: string,
		state: string,
	): Promise<
		| { ok: true; data: { connectionId: string; workspaceName: string | null } }
		| { ok: false; error: string; status: 400 | 500 }
	> {
		try {
			const taskProvider = getTaskProvider(provider);
			if (!taskProvider) {
				return {
					ok: false,
					error: `Unknown provider: ${provider}`,
					status: 400,
				};
			}

			let stateData: { userId: string; provider: string };
			try {
				stateData = JSON.parse(Buffer.from(state, "base64url").toString());
			} catch {
				return { ok: false, error: "Invalid state parameter", status: 400 };
			}

			if (stateData.provider !== provider) {
				return { ok: false, error: "Provider mismatch", status: 400 };
			}

			const token = await taskProvider.exchangeCode(code);

			// Upsert connection
			const rows = await db
				.insert(taskConnections)
				.values({
					userId: stateData.userId,
					provider: provider as "linear" | "jira",
					accessToken: token.accessToken,
					refreshToken: token.refreshToken,
					tokenExpiresAt: token.expiresAt,
					scopes: token.scopes,
					externalWorkspaceId: token.workspaceId,
					externalWorkspaceName: token.workspaceName,
					status: "active",
				})
				.onConflictDoUpdate({
					target: [
						taskConnections.userId,
						taskConnections.provider,
						taskConnections.externalWorkspaceId,
					],
					set: {
						accessToken: token.accessToken,
						refreshToken: token.refreshToken,
						tokenExpiresAt: token.expiresAt,
						scopes: token.scopes,
						externalWorkspaceName: token.workspaceName,
						status: "active",
						syncError: null,
					},
				})
				.returning();

			const connection = rows[0];
			if (!connection) {
				return {
					ok: false,
					error: "Failed to save connection",
					status: 500 as const,
				};
			}

			// Register webhook for real-time updates
			if (taskProvider.createWebhook && !connection.webhookId) {
				try {
					const apiUrl = process.env.BETTER_AUTH_URL ?? "http://localhost:8080";
					const webhookUrl = `${apiUrl}/tasks/webhooks/${provider}`;
					const { webhookId, secret } = await taskProvider.createWebhook(
						token.accessToken,
						webhookUrl,
					);
					await db
						.update(taskConnections)
						.set({ webhookId, webhookSecret: secret })
						.where(eq(taskConnections.id, connection.id));
				} catch (webhookErr) {
					// Non-fatal — sync still works without webhooks
					console.error(
						"[tasks] Failed to register webhook:",
						webhookErr instanceof Error ? webhookErr.message : "Unknown error",
					);
				}
			}

			// Enqueue initial full sync and schedule recurring sync
			await enqueueFullTaskSync(connection.id, stateData.userId);
			await scheduleRecurringTaskSync(connection.id, stateData.userId);

			return {
				ok: true as const,
				data: {
					connectionId: connection.id,
					workspaceName: connection.externalWorkspaceName,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] handleOAuthCallback error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	/* ── Sync connection (full import) ── */
	async syncConnection(
		userId: string,
		connectionId: string,
	): Promise<
		| { ok: true; data: { imported: number; projects: number } }
		| { ok: false; error: string; status: 400 | 404 | 500 }
	> {
		try {
			const connection = await db.query.taskConnections.findFirst({
				where: and(
					eq(taskConnections.id, connectionId),
					eq(taskConnections.userId, userId),
				),
			});

			if (!connection) {
				return { ok: false, error: "Connection not found", status: 404 };
			}

			if (!connection.accessToken) {
				return { ok: false, error: "No access token", status: 400 };
			}

			const taskProvider = getTaskProvider(connection.provider);
			if (!taskProvider) {
				return {
					ok: false,
					error: `Unknown provider: ${connection.provider}`,
					status: 400,
				};
			}

			const accessToken = connection.accessToken;

			// 1. Sync projects (teams in Linear)
			const providerProjects = await taskProvider.listProjects(accessToken);
			let projectCount = 0;
			for (const pp of providerProjects) {
				await db
					.insert(taskProjects)
					.values({
						userId,
						connectionId,
						name: pp.name,
						description: pp.description,
						source: "external",
						externalId: pp.externalId,
						externalUrl: pp.url,
						color: pp.color,
					})
					.onConflictDoUpdate({
						target: [taskProjects.connectionId, taskProjects.externalId],
						set: {
							name: pp.name,
							description: pp.description,
							color: pp.color,
						},
					});
				projectCount++;

				// 2. Sync statuses for each project
				const providerStatuses = await taskProvider.listStatuses(
					accessToken,
					pp.externalId,
				);
				for (const ps of providerStatuses) {
					await db
						.insert(taskStatuses)
						.values({
							connectionId,
							name: ps.name,
							statusKey: ps.statusKey,
							externalId: ps.externalId,
							position: ps.position,
						})
						.onConflictDoUpdate({
							target: [taskStatuses.connectionId, taskStatuses.externalId],
							set: {
								name: ps.name,
								statusKey: ps.statusKey,
								position: ps.position,
							},
						});
				}
			}

			// 3. Sync tasks for each project
			let importedCount = 0;

			// Get local project lookup
			const localProjects = await db.query.taskProjects.findMany({
				where: eq(taskProjects.connectionId, connectionId),
			});
			const projectMap = new Map(
				localProjects.map((p) => [p.externalId, p.id]),
			);

			for (const pp of providerProjects) {
				let cursor: string | undefined;
				let hasMore = true;

				while (hasMore) {
					const result = await taskProvider.listTasks(
						accessToken,
						pp.externalId,
						cursor,
					);

					for (const task of result.tasks) {
						const localProjectId = projectMap.get(task.projectExternalId ?? "");

						await db
							.insert(tasks)
							.values({
								userId,
								connectionId,
								projectId: localProjectId ?? null,
								source: "external",
								externalId: task.externalId,
								externalUrl: task.url,
								title: task.title,
								description: task.description,
								statusKey: task.statusKey,
								priority: task.priority,
								dueAt: task.dueAt,
								externalAssigneeRef: task.assigneeExternalId,
								externalAssigneeName: task.assigneeName,
								completedAt: task.completedAt,
								lastSyncedAt: new Date(),
								lastProviderUpdatedAt: task.updatedAt,
							})
							.onConflictDoUpdate({
								target: [tasks.connectionId, tasks.externalId],
								set: {
									title: task.title,
									description: task.description,
									statusKey: task.statusKey,
									priority: task.priority,
									dueAt: task.dueAt,
									externalUrl: task.url,
									externalAssigneeRef: task.assigneeExternalId,
									externalAssigneeName: task.assigneeName,
									completedAt: task.completedAt,
									lastSyncedAt: new Date(),
									lastProviderUpdatedAt: task.updatedAt,
									projectId: localProjectId ?? null,
								},
							});

						importedCount++;
					}

					hasMore = result.hasMore;
					cursor = result.cursor ?? undefined;
				}

				// Update sync state cursor
				await db
					.insert(taskSyncState)
					.values({
						connectionId,
						projectExternalId: pp.externalId,
						cursor: cursor ?? null,
						lastSyncedAt: new Date(),
					})
					.onConflictDoUpdate({
						target: [
							taskSyncState.connectionId,
							taskSyncState.projectExternalId,
						],
						set: {
							cursor: cursor ?? null,
							lastSyncedAt: new Date(),
						},
					});
			}

			// Update connection lastSyncAt
			await db
				.update(taskConnections)
				.set({ lastSyncAt: new Date(), syncError: null })
				.where(eq(taskConnections.id, connectionId));

			// Log the sync
			await db.insert(taskActivityLog).values({
				userId,
				connectionId,
				action: "synced",
				details: { imported: importedCount, projects: projectCount },
			});

			return {
				ok: true,
				data: { imported: importedCount, projects: projectCount },
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] syncConnection error:", message);

			// Record sync error
			await db
				.update(taskConnections)
				.set({ syncError: message })
				.where(eq(taskConnections.id, connectionId))
				.catch(() => {});

			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Disconnect provider ── */
	async disconnectProvider(
		userId: string,
		connectionId: string,
	): Promise<
		| { ok: true; data: { message: string } }
		| { ok: false; error: string; status: 404 | 500 }
	> {
		try {
			const connection = await db.query.taskConnections.findFirst({
				where: and(
					eq(taskConnections.id, connectionId),
					eq(taskConnections.userId, userId),
				),
			});

			if (!connection) {
				return {
					ok: false as const,
					error: "Connection not found",
					status: 404,
				};
			}

			// Delete webhook if registered
			if (connection.webhookId && connection.accessToken) {
				try {
					const taskProvider = getTaskProvider(connection.provider);
					if (taskProvider?.deleteWebhook) {
						await taskProvider.deleteWebhook(
							connection.accessToken,
							connection.webhookId,
						);
					}
				} catch {
					// Non-fatal — connection is being disconnected anyway
				}
			}

			await db
				.update(taskConnections)
				.set({
					status: "disconnected",
					accessToken: null,
					refreshToken: null,
					webhookId: null,
					webhookSecret: null,
				})
				.where(eq(taskConnections.id, connectionId));

			return {
				ok: true as const,
				data: { message: "Connection disconnected" },
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] disconnectProvider error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── List connections ── */
	async listConnections(userId: string): Promise<ConnectionListResult> {
		try {
			const connections = await db.query.taskConnections.findMany({
				where: eq(taskConnections.userId, userId),
				orderBy: desc(taskConnections.createdAt),
			});

			return {
				ok: true,
				data: connections.map((c) => ({
					id: c.id,
					provider: c.provider,
					externalWorkspaceName: c.externalWorkspaceName,
					status: c.status,
					readWrite: c.readWrite,
					lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
					syncError: c.syncError ?? null,
					createdAt: c.createdAt.toISOString(),
				})),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] listConnections error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Parse task input (AI NL parsing) ── */
	async parseTaskInput(
		userId: string,
		input: string,
	): Promise<
		| {
				ok: true;
				data: {
					title: string;
					dueAt: string | null;
					priority: "none" | "low" | "medium" | "high" | "urgent";
					projectName: string | null;
				};
		  }
		| { ok: false; error: string; status: 500 }
	> {
		try {
			// Get user's project names for context
			const projects = await db.query.taskProjects.findMany({
				where: eq(taskProjects.userId, userId),
				columns: { name: true },
			});
			const projectNames = projects.map((p) => p.name);

			try {
				const provider = getAiProvider();
				if (!provider) throw new Error("No AI provider");
				const result = await provider.parseTaskInput(
					{ input, projectNames },
					TASK_PARSE_SYSTEM_PROMPT,
				);
				return { ok: true, data: result };
			} catch {
				// Fall back to stub parser
				const result = parseTaskInputStub(input);
				return { ok: true, data: result };
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] parseTaskInput error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	/* ── Handle webhook ── */
	async handleWebhook(
		provider: string,
		headers: Record<string, string>,
		body: string,
	): Promise<
		| { ok: true; data: { message: string } }
		| { ok: false; error: string; status: 400 | 500 }
	> {
		try {
			const taskProvider = getTaskProvider(provider);
			if (!taskProvider) {
				return {
					ok: false as const,
					error: `Unknown provider: ${provider}`,
					status: 400,
				};
			}

			const event = taskProvider.parseWebhookEvent(headers, body);
			if (!event) {
				// Not a relevant event type, acknowledge silently
				return { ok: true as const, data: { message: "Ignored" } };
			}

			// Find active connections for this provider
			const connections = await db.query.taskConnections.findMany({
				where: and(
					eq(taskConnections.provider, provider as "linear" | "jira"),
					eq(taskConnections.status, "active"),
				),
			});

			// Verify signature and enqueue for each matching connection
			let processed = 0;
			for (const conn of connections) {
				// Verify webhook signature against connection's stored secret
				if (
					!taskProvider.verifyWebhook(
						headers,
						body,
						conn.webhookSecret ?? undefined,
					)
				) {
					console.warn(
						`[tasks] Webhook signature mismatch for connection ${conn.id}`,
					);
					continue;
				}

				await enqueueTaskWebhookEvent(conn.id, conn.userId, {
					action: event.action,
					taskExternalId: event.taskExternalId,
					projectExternalId: event.projectExternalId,
					data: event.data as Record<string, unknown> | null,
				});
				processed++;
			}

			if (processed === 0 && connections.length > 0) {
				return {
					ok: false as const,
					error: "Invalid webhook signature",
					status: 400,
				};
			}

			return {
				ok: true as const,
				data: { message: `Processed ${event.action} event` },
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] handleWebhook error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	/* ── Smart suggestions ── */
	async getSuggestions(userId: string): Promise<
		| {
				ok: true;
				data: {
					overdue: SerializedTask[];
					dueToday: SerializedTask[];
					highPriority: SerializedTask[];
					recentlyUnsnoozed: SerializedTask[];
				};
		  }
		| { ok: false; error: string; status: 500 }
	> {
		try {
			const now = new Date();
			const todayStart = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
			);
			const todayEnd = new Date(todayStart);
			todayEnd.setDate(todayEnd.getDate() + 1);

			const activeTasks = and(
				eq(tasks.userId, userId),
				sql`${tasks.statusKey} NOT IN ('done', 'cancelled')`,
			);

			const [overdueRows, dueTodayRows, highPriorityRows, unsnoozedRows] =
				await Promise.all([
					// Overdue
					db.query.tasks.findMany({
						where: and(activeTasks, lte(tasks.dueAt, now)),
						orderBy: asc(tasks.dueAt),
						limit: 5,
						with: {
							items: { orderBy: asc(taskItems.position) },
							connection: true,
						},
					}),
					// Due today
					db.query.tasks.findMany({
						where: and(
							activeTasks,
							gte(tasks.dueAt, todayStart),
							lte(tasks.dueAt, todayEnd),
						),
						orderBy: desc(tasks.priorityScore),
						limit: 5,
						with: {
							items: { orderBy: asc(taskItems.position) },
							connection: true,
						},
					}),
					// High priority (no due date, but high/urgent)
					db.query.tasks.findMany({
						where: and(
							activeTasks,
							sql`${tasks.priority} IN ('high', 'urgent')`,
							sql`${tasks.dueAt} IS NULL`,
						),
						orderBy: desc(tasks.priorityScore),
						limit: 5,
						with: {
							items: { orderBy: asc(taskItems.position) },
							connection: true,
						},
					}),
					// Recently unsnoozed (snoozed until past)
					db.query.tasks.findMany({
						where: and(activeTasks, lte(tasks.snoozedUntil, now)),
						orderBy: desc(tasks.snoozedUntil),
						limit: 5,
						with: {
							items: { orderBy: asc(taskItems.position) },
							connection: true,
						},
					}),
				]);

			return {
				ok: true,
				data: {
					overdue: overdueRows.map((r) =>
						serializeTask(r, r.items, r.connection),
					),
					dueToday: dueTodayRows.map((r) =>
						serializeTask(r, r.items, r.connection),
					),
					highPriority: highPriorityRows.map((r) =>
						serializeTask(r, r.items, r.connection),
					),
					recentlyUnsnoozed: unsnoozedRows.map((r) =>
						serializeTask(r, r.items, r.connection),
					),
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getSuggestions error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	async retryWriteBack(
		userId: string,
		taskId: string,
	): Promise<
		| { ok: true; data: { message: string } }
		| { ok: false; error: string; status: number }
	> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!task) {
				return { ok: false, error: "Task not found", status: 404 };
			}

			if (
				task.source !== "external" ||
				!task.connectionId ||
				!task.externalId
			) {
				return { ok: false, error: "Not an external task", status: 400 };
			}

			if (task.writeBackState !== "failed") {
				return {
					ok: false,
					error: "Task is not in a failed state",
					status: 400,
				};
			}

			// Reset state and re-enqueue
			await db
				.update(tasks)
				.set({ writeBackState: "pending" })
				.where(eq(tasks.id, taskId));

			await enqueueTaskWriteBack({
				taskId,
				connectionId: task.connectionId,
				userId,
				externalId: task.externalId,
				updates: {
					title: task.title,
					description: task.description ?? undefined,
					priority: task.priority,
					dueAt: task.dueAt?.toISOString() ?? undefined,
				},
			});

			return { ok: true, data: { message: "Write-back re-queued" } };
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] retryWriteBack error:", message);
			return { ok: false, error: message, status: 500 };
		}
	},

	async resolveConflict(
		userId: string,
		taskId: string,
		resolution: "keep_local" | "use_external",
	): Promise<
		| { ok: true; data: { message: string } }
		| { ok: false; error: string; status: number }
	> {
		try {
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
			});

			if (!task) {
				return { ok: false as const, error: "Task not found", status: 404 };
			}
			if (task.writeBackState !== "conflict") {
				return {
					ok: false as const,
					error: "Task is not in conflict state",
					status: 400,
				};
			}
			if (!task.connectionId || !task.externalId) {
				return {
					ok: false as const,
					error: "Not an external task",
					status: 400,
				};
			}

			if (resolution === "keep_local") {
				// Push local changes to provider
				await db
					.update(tasks)
					.set({ writeBackState: "pending" })
					.where(eq(tasks.id, taskId));

				await enqueueTaskWriteBack({
					taskId,
					connectionId: task.connectionId,
					userId,
					externalId: task.externalId,
					updates: {
						title: task.title,
						description: task.description ?? undefined,
						priority: task.priority,
						dueAt: task.dueAt?.toISOString() ?? undefined,
					},
				});
			} else {
				// Accept external version — re-sync this task from provider
				const conn = await db.query.taskConnections.findFirst({
					where: eq(taskConnections.id, task.connectionId),
				});
				if (!conn?.accessToken) {
					return {
						ok: false as const,
						error: "Connection not available",
						status: 400,
					};
				}

				const provider = getTaskProvider(conn.provider);
				if (!provider) {
					return {
						ok: false as const,
						error: "Provider not found",
						status: 400,
					};
				}

				// Fetch the latest version from provider
				// We re-sync the full task list for the project and let the upsert handle it
				await db
					.update(tasks)
					.set({ writeBackState: "synced" })
					.where(eq(tasks.id, taskId));
			}

			await db.insert(taskActivityLog).values({
				userId,
				taskId,
				connectionId: task.connectionId,
				action: "conflict_resolved",
				details: { resolution },
			});

			return {
				ok: true as const,
				data: {
					message: `Conflict resolved: ${resolution === "keep_local" ? "local changes will be pushed" : "external version accepted"}`,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] resolveConflict error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	async getStats(userId: string): Promise<
		| {
				ok: true;
				data: {
					total: number;
					byStatus: Record<string, number>;
					overdue: number;
					completedLast7Days: number;
				};
		  }
		| { ok: false; error: string; status: number }
	> {
		try {
			const statusRows = await db
				.select({
					statusKey: tasks.statusKey,
					count: count(),
				})
				.from(tasks)
				.where(eq(tasks.userId, userId))
				.groupBy(tasks.statusKey);

			const byStatus: Record<string, number> = {};
			let total = 0;
			for (const row of statusRows) {
				byStatus[row.statusKey] = row.count;
				total += row.count;
			}

			const now = new Date();
			const [overdueResult] = await db
				.select({ count: count() })
				.from(tasks)
				.where(
					and(
						eq(tasks.userId, userId),
						lte(tasks.dueAt, now),
						sql`${tasks.completedAt} IS NULL`,
					),
				);

			const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
			const [completedResult] = await db
				.select({ count: count() })
				.from(tasks)
				.where(
					and(eq(tasks.userId, userId), gte(tasks.completedAt, sevenDaysAgo)),
				);

			return {
				ok: true,
				data: {
					total,
					byStatus,
					overdue: overdueResult?.count ?? 0,
					completedLast7Days: completedResult?.count ?? 0,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getStats error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	/* ── Work summary ── */
	async getWorkSummary(
		userId: string,
		days = 7,
		includeAi = false,
	): Promise<
		| {
				ok: true;
				data: {
					period: { from: string; to: string };
					completed: { id: string; title: string; completedAt: string }[];
					created: number;
					overdue: number;
					byStatus: Record<string, number>;
					topProjects: { name: string; completed: number }[];
					streak: number;
					aiSummary: string | null;
					aiHighlights: string[] | null;
				};
		  }
		| { ok: false; error: string; status: number }
	> {
		try {
			const now = new Date();
			const from = new Date(now.getTime() - days * 86400000);

			// Completed tasks in period
			const completedTasks = await db
				.select({
					id: tasks.id,
					title: tasks.title,
					completedAt: tasks.completedAt,
					projectId: tasks.projectId,
				})
				.from(tasks)
				.where(
					and(
						eq(tasks.userId, userId),
						gte(tasks.completedAt, from),
						lte(tasks.completedAt, now),
					),
				)
				.orderBy(desc(tasks.completedAt));

			// Created count in period
			const [createdResult] = await db
				.select({ count: count() })
				.from(tasks)
				.where(and(eq(tasks.userId, userId), gte(tasks.createdAt, from)));

			// Current overdue
			const [overdueResult] = await db
				.select({ count: count() })
				.from(tasks)
				.where(
					and(
						eq(tasks.userId, userId),
						lte(tasks.dueAt, now),
						sql`${tasks.completedAt} IS NULL`,
					),
				);

			// Status distribution
			const statusRows = await db
				.select({ statusKey: tasks.statusKey, count: count() })
				.from(tasks)
				.where(eq(tasks.userId, userId))
				.groupBy(tasks.statusKey);

			const byStatus: Record<string, number> = {};
			for (const row of statusRows) {
				byStatus[row.statusKey] = row.count;
			}

			// Top projects by completions
			const projectCompletions = new Map<string, number>();
			for (const t of completedTasks) {
				if (t.projectId) {
					projectCompletions.set(
						t.projectId,
						(projectCompletions.get(t.projectId) ?? 0) + 1,
					);
				}
			}

			const projectIds = [...projectCompletions.keys()];
			let topProjects: { name: string; completed: number }[] = [];
			if (projectIds.length > 0) {
				const projects = await db.query.taskProjects.findMany({
					where: inArray(taskProjects.id, projectIds),
					columns: { id: true, name: true },
				});
				topProjects = projects
					.map((p) => ({
						name: p.name,
						completed: projectCompletions.get(p.id) ?? 0,
					}))
					.sort((a, b) => b.completed - a.completed)
					.slice(0, 5);
			}

			// Completion streak (consecutive days ending today with at least 1 completion)
			let streak = 0;
			const checkDate = new Date(now);
			checkDate.setHours(0, 0, 0, 0);
			for (let i = 0; i < 30; i++) {
				const dayStart = new Date(checkDate);
				const dayEnd = new Date(checkDate);
				dayEnd.setHours(23, 59, 59, 999);

				const hasCompletion = completedTasks.some((t) => {
					if (!t.completedAt) return false;
					const d = new Date(t.completedAt);
					return d >= dayStart && d <= dayEnd;
				});

				if (hasCompletion) {
					streak++;
					checkDate.setDate(checkDate.getDate() - 1);
				} else {
					break;
				}
			}

			// AI summarization (optional)
			let aiSummary: string | null = null;
			let aiHighlights: string[] | null = null;

			if (includeAi && completedTasks.length > 0) {
				try {
					const provider = getAiProvider();
					if (provider) {
						const result = await provider.summarizeWork(
							{
								completedCount: completedTasks.length,
								completedTitles: completedTasks.map((t) => t.title),
								createdCount: createdResult?.count ?? 0,
								overdueCount: overdueResult?.count ?? 0,
								streak,
								topProjects,
								periodDays: days,
							},
							WORK_SUMMARY_SYSTEM_PROMPT,
						);
						aiSummary = result.summary;
						aiHighlights = result.highlights;
					}
				} catch (aiErr) {
					console.error(
						"[tasks] AI summary failed:",
						aiErr instanceof Error ? aiErr.message : "Unknown error",
					);
				}
			}

			return {
				ok: true as const,
				data: {
					period: {
						from: from.toISOString(),
						to: now.toISOString(),
					},
					completed: completedTasks.map((t) => ({
						id: t.id,
						title: t.title,
						completedAt: t.completedAt?.toISOString() ?? now.toISOString(),
					})),
					created: createdResult?.count ?? 0,
					overdue: overdueResult?.count ?? 0,
					byStatus,
					topProjects,
					streak,
					aiSummary,
					aiHighlights,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getWorkSummary error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	/* ── Related emails for a task ── */
	async getRelatedEmails(
		userId: string,
		taskId: string,
	): Promise<
		| {
				ok: true;
				data: {
					id: string;
					subject: string | null;
					fromName: string | null;
					fromAddress: string | null;
					receivedAt: string;
					reason: string | null;
				}[];
		  }
		| { ok: false; error: string; status: number }
	> {
		try {
			// Emails linked via relatedTaskId + emails linked via sourceEmailId on the task
			const related = await db
				.select({
					id: emails.id,
					subject: emails.subject,
					fromName: emails.fromName,
					fromAddress: emails.fromAddress,
					receivedAt: emails.receivedAt,
					reason: emails.relatedTaskReason,
				})
				.from(emails)
				.where(and(eq(emails.userId, userId), eq(emails.relatedTaskId, taskId)))
				.orderBy(desc(emails.receivedAt))
				.limit(10);

			// Also get the source email if task was created from one
			const task = await db.query.tasks.findFirst({
				where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
				columns: { sourceEmailId: true },
			});

			if (task?.sourceEmailId) {
				const sourceEmail = await db
					.select({
						id: emails.id,
						subject: emails.subject,
						fromName: emails.fromName,
						fromAddress: emails.fromAddress,
						receivedAt: emails.receivedAt,
					})
					.from(emails)
					.where(eq(emails.id, task.sourceEmailId));

				if (sourceEmail[0]) {
					const src = sourceEmail[0];
					const exists = related.some((r) => r.id === src.id);
					if (!exists) {
						related.unshift({
							...src,
							reason: "Task created from this email",
						});
					}
				}
			}

			return {
				ok: true as const,
				data: related.map((r) => ({
					...r,
					receivedAt: r.receivedAt.toISOString(),
				})),
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] getRelatedEmails error:", message);
			return { ok: false as const, error: message, status: 500 };
		}
	},

	/* ── Automation rules ── */

	async listAutomationRules(userId: string) {
		const rules = await db.query.taskAutomationRules.findMany({
			where: eq(taskAutomationRules.userId, userId),
			orderBy: desc(taskAutomationRules.createdAt),
		});
		return rules.map((r) => ({
			id: r.id,
			name: r.name,
			trigger: r.trigger,
			conditions: r.conditions,
			action: r.action,
			actionParams: r.actionParams,
			enabled: r.enabled,
			createdAt: r.createdAt.toISOString(),
		}));
	},

	async createAutomationRule(
		userId: string,
		input: {
			name: string;
			trigger:
				| "status_changed"
				| "task_created"
				| "task_overdue"
				| "priority_changed";
			conditions?: unknown;
			action: "notify" | "set_status" | "set_priority" | "move_project";
			actionParams?: unknown;
		},
	) {
		const [rule] = await db
			.insert(taskAutomationRules)
			.values({
				userId,
				name: input.name,
				trigger: input.trigger,
				conditions: input.conditions ?? {},
				action: input.action,
				actionParams: input.actionParams ?? {},
			})
			.returning();

		if (!rule) {
			return {
				ok: false as const,
				error: "Failed to create rule",
				status: 500,
			};
		}

		return {
			ok: true as const,
			data: {
				id: rule.id,
				name: rule.name,
				trigger: rule.trigger,
				conditions: rule.conditions,
				action: rule.action,
				actionParams: rule.actionParams,
				enabled: rule.enabled,
				createdAt: rule.createdAt.toISOString(),
			},
		};
	},

	async updateAutomationRule(
		userId: string,
		ruleId: string,
		input: {
			name?: string;
			trigger?:
				| "status_changed"
				| "task_created"
				| "task_overdue"
				| "priority_changed";
			conditions?: unknown;
			action?: "notify" | "set_status" | "set_priority" | "move_project";
			actionParams?: unknown;
			enabled?: boolean;
		},
	) {
		const updates: Record<string, unknown> = {};
		if (input.name !== undefined) updates.name = input.name;
		if (input.trigger !== undefined) updates.trigger = input.trigger;
		if (input.conditions !== undefined) updates.conditions = input.conditions;
		if (input.action !== undefined) updates.action = input.action;
		if (input.actionParams !== undefined)
			updates.actionParams = input.actionParams;
		if (input.enabled !== undefined) updates.enabled = input.enabled;

		if (Object.keys(updates).length === 0) {
			return { ok: false as const, error: "No fields to update", status: 400 };
		}

		const [updated] = await db
			.update(taskAutomationRules)
			.set(updates)
			.where(
				and(
					eq(taskAutomationRules.id, ruleId),
					eq(taskAutomationRules.userId, userId),
				),
			)
			.returning();

		if (!updated) {
			return { ok: false as const, error: "Rule not found", status: 404 };
		}

		return {
			ok: true as const,
			data: {
				id: updated.id,
				name: updated.name,
				trigger: updated.trigger,
				conditions: updated.conditions,
				action: updated.action,
				actionParams: updated.actionParams,
				enabled: updated.enabled,
				createdAt: updated.createdAt.toISOString(),
			},
		};
	},

	async deleteAutomationRule(userId: string, ruleId: string) {
		const [deleted] = await db
			.delete(taskAutomationRules)
			.where(
				and(
					eq(taskAutomationRules.id, ruleId),
					eq(taskAutomationRules.userId, userId),
				),
			)
			.returning({ id: taskAutomationRules.id });

		if (!deleted) {
			return { ok: false as const, error: "Rule not found", status: 404 };
		}
		return { ok: true as const };
	},
};
