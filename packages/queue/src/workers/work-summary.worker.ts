import {
	and,
	count,
	db,
	eq,
	gte,
	lte,
	notifications,
	sql,
	tasks,
	users,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { getAiProvider } from "../ai/factory";
import { WORK_SUMMARY_SYSTEM_PROMPT } from "../ai/prompts";
import { connection } from "../connection";
import type { WorkSummaryJobData } from "../jobs/work-summary";

async function processDigest() {
	const now = new Date();
	const from = new Date(now.getTime() - 86400000); // last 24h

	// Get all users who have at least one task
	const allUsers = await db
		.selectDistinct({ id: users.id })
		.from(users)
		.innerJoin(tasks, eq(tasks.userId, users.id));

	console.log(
		`[work-summary] Processing daily digest for ${allUsers.length} users`,
	);

	let created = 0;
	for (const user of allUsers) {
		try {
			const sent = await processUserDigest(user.id, from, now);
			if (sent) created++;
		} catch (err) {
			console.error(
				`[work-summary] Failed for user ${user.id}:`,
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	}

	console.log(
		`[work-summary] Created ${created} digest notifications for ${allUsers.length} users`,
	);
}

async function processUserDigest(userId: string, from: Date, now: Date) {
	// Completed tasks in last 24h
	const completedTasks = await db
		.select({ id: tasks.id, title: tasks.title })
		.from(tasks)
		.where(
			and(
				eq(tasks.userId, userId),
				gte(tasks.completedAt, from),
				lte(tasks.completedAt, now),
			),
		);

	// Created count
	const [createdResult] = await db
		.select({ count: count() })
		.from(tasks)
		.where(and(eq(tasks.userId, userId), gte(tasks.createdAt, from)));

	// Overdue count
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

	const completedCount = completedTasks.length;
	const createdCount = createdResult?.count ?? 0;
	const overdueCount = overdueResult?.count ?? 0;

	// Skip if no activity
	if (completedCount === 0 && createdCount === 0) return false;

	// Try AI summary
	let body = `Completed ${completedCount} task${completedCount !== 1 ? "s" : ""} yesterday.`;
	if (overdueCount > 0) {
		body += ` ${overdueCount} task${overdueCount !== 1 ? "s" : ""} overdue.`;
	}

	try {
		const provider = getAiProvider();
		if (provider && completedCount > 0) {
			const result = await provider.summarizeWork(
				{
					completedCount,
					completedTitles: completedTasks.map((t) => t.title),
					createdCount,
					overdueCount,
					streak: 0,
					topProjects: [],
					periodDays: 1,
				},
				WORK_SUMMARY_SYSTEM_PROMPT,
			);
			body = result.summary;
		}
	} catch {
		// Fall back to simple body
	}

	await db.insert(notifications).values({
		userId,
		type: "work_summary" as const,
		title: "Daily Work Summary",
		body,
		link: "/module/task",
	});

	return true;
}

export function createWorkSummaryWorker() {
	const worker = new Worker<WorkSummaryJobData>(
		"work-summary",
		async () => {
			await processDigest();
		},
		{ connection, concurrency: 1 },
	);

	worker.on("completed", (job) => {
		console.log(`[work-summary] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[work-summary] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
