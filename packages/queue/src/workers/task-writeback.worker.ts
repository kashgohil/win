import {
	and,
	db,
	eq,
	taskActivityLog,
	taskConnections,
	tasks,
} from "@wingmnn/db";
import {
	getTaskProvider,
	linearProvider,
	registerProvider,
} from "@wingmnn/tasks";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { TaskWriteBackJobData } from "../jobs/task-writeback";

// Register providers
registerProvider(linearProvider);

async function processWriteBack(data: TaskWriteBackJobData) {
	const conn = await db.query.taskConnections.findFirst({
		where: and(
			eq(taskConnections.id, data.connectionId),
			eq(taskConnections.userId, data.userId),
		),
	});

	if (!conn?.accessToken || conn.status !== "active") {
		console.log(
			`[task-writeback] Skipping write-back for ${data.connectionId}: inactive or no token`,
		);
		return;
	}

	if (!conn.readWrite) {
		console.log(
			`[task-writeback] Skipping write-back for ${data.connectionId}: read-only`,
		);
		return;
	}

	const provider = getTaskProvider(conn.provider);
	if (!provider) {
		console.error(`[task-writeback] Unknown provider: ${conn.provider}`);
		return;
	}

	// Resolve status external ID if statusKey changed
	let statusExternalId: string | undefined;
	if (data.updates.statusExternalId) {
		statusExternalId = data.updates.statusExternalId;
	}

	try {
		await provider.updateTask(conn.accessToken, data.externalId, {
			title: data.updates.title,
			description: data.updates.description,
			statusExternalId,
			priority: data.updates.priority,
			dueAt:
				data.updates.dueAt !== undefined
					? data.updates.dueAt
						? new Date(data.updates.dueAt)
						: null
					: undefined,
		});

		// Mark task as synced
		await db
			.update(tasks)
			.set({ writeBackState: "synced" })
			.where(eq(tasks.id, data.taskId));

		await db.insert(taskActivityLog).values({
			userId: data.userId,
			taskId: data.taskId,
			connectionId: data.connectionId,
			action: "write_back",
			details: { fields: Object.keys(data.updates) },
		});

		console.log(
			`[task-writeback] Wrote back task ${data.externalId} to ${conn.provider}`,
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error(`[task-writeback] Failed to write back: ${message}`);

		// Mark task as failed
		await db
			.update(tasks)
			.set({ writeBackState: "failed" })
			.where(eq(tasks.id, data.taskId));

		throw err; // Let BullMQ handle retries
	}
}

export function createTaskWriteBackWorker() {
	const worker = new Worker<TaskWriteBackJobData>(
		"task-write-back",
		async (job) => {
			await processWriteBack(job.data);
		},
		{ connection, concurrency: 3 },
	);

	worker.on("failed", (job, err) => {
		console.error(`[task-writeback] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
