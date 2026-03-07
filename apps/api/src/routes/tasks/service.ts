import {
	and,
	asc,
	count,
	db,
	desc,
	emails,
	eq,
	gte,
	lte,
	sql,
	taskActivityLog,
	taskConnections,
	taskItems,
	taskProjects,
	taskStatuses,
	taskSyncState,
	tasks,
} from "@wingmnn/db";
import {
	TASK_PARSE_SYSTEM_PROMPT,
	enqueueFullTaskSync,
	enqueueTaskWebhookEvent,
	enqueueTaskWriteBack,
	getAiProvider,
	scheduleRecurringTaskSync,
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
			const targetDay = dayNames.indexOf(byMatch[1]!.toLowerCase());
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
			if (input.projectId !== undefined) updates.projectId = input.projectId;
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

			// Enqueue initial full sync and schedule recurring sync
			await enqueueFullTaskSync(connection.id, stateData.userId);
			await scheduleRecurringTaskSync(connection.id, stateData.userId);

			return {
				ok: true,
				data: {
					connectionId: connection.id,
					workspaceName: connection.externalWorkspaceName,
				},
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] handleOAuthCallback error:", message);
			return { ok: false, error: message, status: 500 };
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
				return { ok: false, error: "Connection not found", status: 404 };
			}

			await db
				.update(taskConnections)
				.set({ status: "disconnected", accessToken: null, refreshToken: null })
				.where(eq(taskConnections.id, connectionId));

			return { ok: true, data: { message: "Connection disconnected" } };
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
					ok: false,
					error: `Unknown provider: ${provider}`,
					status: 400,
				};
			}

			if (!taskProvider.verifyWebhook(headers, body)) {
				return { ok: false, error: "Invalid webhook signature", status: 400 };
			}

			const event = taskProvider.parseWebhookEvent(headers, body);
			if (!event) {
				// Not a relevant event type, acknowledge silently
				return { ok: true, data: { message: "Ignored" } };
			}

			// Find the connection for this provider that has this task's project
			// We look for any active connection of this provider type
			const connections = await db.query.taskConnections.findMany({
				where: and(
					eq(taskConnections.provider, provider as "linear" | "jira"),
					eq(taskConnections.status, "active"),
				),
			});

			// Enqueue the webhook event for each matching connection
			for (const conn of connections) {
				await enqueueTaskWebhookEvent(conn.id, conn.userId, {
					action: event.action,
					taskExternalId: event.taskExternalId,
					projectExternalId: event.projectExternalId,
					data: event.data as Record<string, unknown> | null,
				});
			}

			return {
				ok: true,
				data: { message: `Processed ${event.action} event` },
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Unknown error";
			console.error("[tasks] handleWebhook error:", message);
			return { ok: false, error: message, status: 500 };
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
};
