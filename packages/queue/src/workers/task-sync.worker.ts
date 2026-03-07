import {
	and,
	db,
	eq,
	taskActivityLog,
	taskConnections,
	taskProjects,
	taskStatuses,
	taskSyncState,
	tasks,
} from "@wingmnn/db";
import {
	getTaskProvider,
	linearProvider,
	registerProvider,
} from "@wingmnn/tasks";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { TaskSyncJobData } from "../jobs/task-sync";

// Register providers
registerProvider(linearProvider);

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
