import {
	and,
	db,
	eq,
	isNull,
	taskActivityLog,
	taskConnections,
	taskProjects,
	taskStatuses,
	taskSyncState,
	tasks,
} from "@wingmnn/db";
import {
	getTaskProvider,
	jiraProvider,
	linearProvider,
	registerProvider,
} from "@wingmnn/tasks";
import { Worker } from "bullmq";
import { getAiProvider } from "../ai/factory";
import { TASK_CATEGORIZE_SYSTEM_PROMPT } from "../ai/prompts";
import { connection } from "../connection";
import type { TaskSyncJobData } from "../jobs/task-sync";

// Register providers
registerProvider(linearProvider);
registerProvider(jiraProvider);

async function processFullSync(connectionId: string, userId: string) {
	const conn = await db.query.taskConnections.findFirst({
		where: and(
			eq(taskConnections.id, connectionId),
			eq(taskConnections.userId, userId),
		),
	});

	if (!conn?.accessToken || conn.status !== "active") {
		console.log(
			`[task-sync] Skipping sync for ${connectionId}: inactive or no token`,
		);
		return;
	}

	const provider = getTaskProvider(conn.provider);
	if (!provider) {
		console.error(`[task-sync] Unknown provider: ${conn.provider}`);
		return;
	}

	const accessToken = conn.accessToken;

	// 1. Sync projects
	const providerProjects = await provider.listProjects(accessToken);
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
				set: { name: pp.name, description: pp.description, color: pp.color },
			});

		// Sync statuses per project
		const providerStatuses = await provider.listStatuses(
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

	// 2. Build project lookup
	const localProjects = await db.query.taskProjects.findMany({
		where: eq(taskProjects.connectionId, connectionId),
	});
	const projectMap = new Map(localProjects.map((p) => [p.externalId, p.id]));

	// 3. Sync tasks per project
	let importedCount = 0;
	for (const pp of providerProjects) {
		let cursor: string | undefined;
		let hasMore = true;

		while (hasMore) {
			const result = await provider.listTasks(
				accessToken,
				pp.externalId,
				cursor,
			);

			for (const task of result.tasks) {
				const localProjectId = projectMap.get(task.projectExternalId ?? "");

				// Check for conflict: if task exists locally with pending write-back
				const existing = await db.query.tasks.findFirst({
					where: and(
						eq(tasks.connectionId, connectionId),
						eq(tasks.externalId, task.externalId),
					),
					columns: {
						id: true,
						writeBackState: true,
						updatedAt: true,
					},
				});

				if (existing?.writeBackState === "pending") {
					// Conflict: local changes pending, provider also changed
					await db
						.update(tasks)
						.set({
							writeBackState: "conflict",
							lastSyncedAt: new Date(),
							lastProviderUpdatedAt: task.updatedAt,
						})
						.where(eq(tasks.id, existing.id));

					await db.insert(taskActivityLog).values({
						userId,
						taskId: existing.id,
						connectionId,
						action: "conflict_detected",
						details: {
							providerUpdatedAt: task.updatedAt.toISOString(),
							localUpdatedAt: existing.updatedAt.toISOString(),
						},
					});
					importedCount++;
					continue;
				}

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

		// Update sync state
		await db
			.insert(taskSyncState)
			.values({
				connectionId,
				projectExternalId: pp.externalId,
				cursor: cursor ?? null,
				lastSyncedAt: new Date(),
			})
			.onConflictDoUpdate({
				target: [taskSyncState.connectionId, taskSyncState.projectExternalId],
				set: { cursor: cursor ?? null, lastSyncedAt: new Date() },
			});
	}

	// Update connection
	await db
		.update(taskConnections)
		.set({ lastSyncAt: new Date(), syncError: null })
		.where(eq(taskConnections.id, connectionId));

	await db.insert(taskActivityLog).values({
		userId,
		connectionId,
		action: "synced",
		details: { type: "full", imported: importedCount },
	});

	console.log(
		`[task-sync] Full sync complete for ${connectionId}: ${importedCount} tasks`,
	);

	// Auto-categorize tasks without a project
	await categorizeTasks(userId);
}

async function categorizeTasks(userId: string) {
	const provider = getAiProvider();
	if (!provider) return;

	// Get user's projects
	const userProjects = await db
		.select({ id: taskProjects.id, name: taskProjects.name })
		.from(taskProjects)
		.where(eq(taskProjects.userId, userId));

	if (userProjects.length === 0) return;

	// Get tasks without a project and without an existing suggestion
	const uncategorized = await db
		.select({
			id: tasks.id,
			title: tasks.title,
			description: tasks.description,
		})
		.from(tasks)
		.where(
			and(
				eq(tasks.userId, userId),
				isNull(tasks.projectId),
				isNull(tasks.suggestedProjectId),
			),
		)
		.limit(20);

	if (uncategorized.length === 0) return;

	let categorized = 0;
	for (const task of uncategorized) {
		try {
			const result = await provider.categorizeTask(
				{
					title: task.title,
					description: task.description,
					projects: userProjects,
				},
				TASK_CATEGORIZE_SYSTEM_PROMPT,
			);

			if (result.projectId && result.confidence >= 0.8) {
				// High confidence — auto-assign
				await db
					.update(tasks)
					.set({ projectId: result.projectId })
					.where(eq(tasks.id, task.id));
				categorized++;
			} else if (result.projectId && result.confidence >= 0.5) {
				// Medium confidence — suggest
				await db
					.update(tasks)
					.set({ suggestedProjectId: result.projectId })
					.where(eq(tasks.id, task.id));
				categorized++;
			}
		} catch (err) {
			console.error(
				`[task-sync] Categorization failed for task ${task.id}:`,
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	}

	if (categorized > 0) {
		console.log(
			`[task-sync] Auto-categorized ${categorized}/${uncategorized.length} tasks for user ${userId}`,
		);
	}
}

async function processWebhookEvent(
	connectionId: string,
	userId: string,
	event: {
		action: "created" | "updated" | "deleted";
		taskExternalId: string;
		projectExternalId: string | null;
		data: Record<string, unknown> | null;
	},
) {
	if (event.action === "deleted") {
		// Remove the task from our DB
		const deleted = await db
			.delete(tasks)
			.where(
				and(
					eq(tasks.connectionId, connectionId),
					eq(tasks.externalId, event.taskExternalId),
				),
			)
			.returning({ id: tasks.id });

		if (deleted.length > 0) {
			console.log(
				`[task-sync] Deleted task ${event.taskExternalId} via webhook`,
			);
		}
		return;
	}

	// For created/updated, we need the data
	if (!event.data) return;

	const data = event.data as {
		title: string;
		description: string | null;
		statusKey: string;
		priority: string;
		dueAt: string | null;
		assigneeExternalId: string | null;
		assigneeName: string | null;
		projectExternalId: string | null;
		url: string | null;
		completedAt: string | null;
		updatedAt: string;
	};

	// Resolve local project
	let localProjectId: string | null = null;
	if (event.projectExternalId) {
		const project = await db.query.taskProjects.findFirst({
			where: and(
				eq(taskProjects.connectionId, connectionId),
				eq(taskProjects.externalId, event.projectExternalId),
			),
		});
		localProjectId = project?.id ?? null;
	}

	// Check for conflict on update: if task has pending local changes
	if (event.action === "updated") {
		const existing = await db.query.tasks.findFirst({
			where: and(
				eq(tasks.connectionId, connectionId),
				eq(tasks.externalId, event.taskExternalId),
			),
			columns: { id: true, writeBackState: true },
		});

		if (existing?.writeBackState === "pending") {
			await db
				.update(tasks)
				.set({
					writeBackState: "conflict",
					lastSyncedAt: new Date(),
					lastProviderUpdatedAt: data.updatedAt
						? new Date(data.updatedAt)
						: new Date(),
				})
				.where(eq(tasks.id, existing.id));

			await db.insert(taskActivityLog).values({
				userId,
				taskId: existing.id,
				connectionId,
				action: "conflict_detected",
				details: {
					source: "webhook",
					providerUpdatedAt: data.updatedAt,
				},
			});

			console.log(
				`[task-sync] Conflict detected for task ${event.taskExternalId}`,
			);
			return;
		}
	}

	await db
		.insert(tasks)
		.values({
			userId,
			connectionId,
			projectId: localProjectId,
			source: "external",
			externalId: event.taskExternalId,
			externalUrl: data.url,
			title: data.title,
			description: data.description,
			statusKey: data.statusKey as
				| "todo"
				| "in_progress"
				| "done"
				| "blocked"
				| "cancelled",
			priority: data.priority as "none" | "low" | "medium" | "high" | "urgent",
			dueAt: data.dueAt ? new Date(data.dueAt) : null,
			externalAssigneeRef: data.assigneeExternalId,
			externalAssigneeName: data.assigneeName,
			completedAt: data.completedAt ? new Date(data.completedAt) : null,
			lastSyncedAt: new Date(),
			lastProviderUpdatedAt: data.updatedAt
				? new Date(data.updatedAt)
				: new Date(),
		})
		.onConflictDoUpdate({
			target: [tasks.connectionId, tasks.externalId],
			set: {
				title: data.title,
				description: data.description,
				statusKey: data.statusKey as
					| "todo"
					| "in_progress"
					| "done"
					| "blocked"
					| "cancelled",
				priority: data.priority as
					| "none"
					| "low"
					| "medium"
					| "high"
					| "urgent",
				dueAt: data.dueAt ? new Date(data.dueAt) : null,
				externalUrl: data.url,
				externalAssigneeRef: data.assigneeExternalId,
				externalAssigneeName: data.assigneeName,
				completedAt: data.completedAt ? new Date(data.completedAt) : null,
				lastSyncedAt: new Date(),
				lastProviderUpdatedAt: data.updatedAt
					? new Date(data.updatedAt)
					: new Date(),
				projectId: localProjectId,
			},
		});

	console.log(
		`[task-sync] Webhook ${event.action} task ${event.taskExternalId}`,
	);
}

export function createTaskSyncWorker() {
	const worker = new Worker<TaskSyncJobData>(
		"task-sync",
		async (job) => {
			switch (job.data.type) {
				case "full-sync":
				case "incremental-sync":
					// Both use the same full sync logic for now
					// Incremental could use cursors from taskSyncState in the future
					await processFullSync(job.data.connectionId, job.data.userId);
					break;
				case "webhook-event":
					await processWebhookEvent(
						job.data.connectionId,
						job.data.userId,
						job.data.event,
					);
					break;
			}
		},
		{ connection, concurrency: 2 },
	);

	worker.on("failed", (job, err) => {
		console.error(`[task-sync] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
