import {
	db,
	eq,
	notifications,
	taskActivityLog,
	taskAutomationRules,
	tasks,
} from "@wingmnn/db";

type TriggerType =
	| "status_changed"
	| "task_created"
	| "task_overdue"
	| "priority_changed";

type TaskContext = {
	id: string;
	userId: string;
	title: string;
	statusKey: string;
	priority: string;
	projectId: string | null;
	oldStatusKey?: string;
	oldPriority?: string;
};

export async function evaluateAutomations(
	trigger: TriggerType,
	task: TaskContext,
): Promise<void> {
	const rules = await db.query.taskAutomationRules.findMany({
		where: eq(taskAutomationRules.userId, task.userId),
	});

	const matchingRules = rules.filter((r) => r.enabled && r.trigger === trigger);

	if (matchingRules.length === 0) return;

	for (const rule of matchingRules) {
		try {
			if (!matchesConditions(rule.conditions, task, trigger)) continue;

			await executeAction(rule.action, rule.actionParams, task);

			await db.insert(taskActivityLog).values({
				userId: task.userId,
				taskId: task.id,
				action: "updated",
				details: {
					type: "automation_triggered",
					ruleName: rule.name,
					ruleId: rule.id,
					trigger,
					action: rule.action,
				},
			});

			console.log(
				`[automation] Rule "${rule.name}" triggered for task ${task.id}`,
			);
		} catch (err) {
			console.error(
				`[automation] Rule "${rule.name}" failed:`,
				err instanceof Error ? err.message : "Unknown error",
			);
		}
	}
}

function matchesConditions(
	conditions: unknown,
	task: TaskContext,
	trigger: TriggerType,
): boolean {
	if (!conditions || typeof conditions !== "object") return true;

	const cond = conditions as Record<string, unknown>;

	// Check status filter
	if (trigger === "status_changed" && cond.toStatus) {
		if (task.statusKey !== cond.toStatus) return false;
	}
	if (trigger === "status_changed" && cond.fromStatus) {
		if (task.oldStatusKey !== cond.fromStatus) return false;
	}

	// Check priority filter
	if (cond.priority && task.priority !== cond.priority) return false;

	// Check project filter
	if (cond.projectId && task.projectId !== cond.projectId) return false;

	return true;
}

async function executeAction(
	action: string,
	params: unknown,
	task: TaskContext,
): Promise<void> {
	const p = (params ?? {}) as Record<string, unknown>;

	switch (action) {
		case "notify": {
			const message =
				typeof p.message === "string"
					? p.message
					: `Automation triggered for: ${task.title}`;
			await db.insert(notifications).values({
				userId: task.userId,
				type: "task_reminder" as const,
				title: message,
				link: `/module/task/list?taskId=${task.id}`,
				taskId: task.id,
			});
			break;
		}

		case "set_status": {
			const status = p.status as string;
			if (status) {
				const updates: Record<string, unknown> = { statusKey: status };
				if (status === "done") updates.completedAt = new Date();
				await db.update(tasks).set(updates).where(eq(tasks.id, task.id));
			}
			break;
		}

		case "set_priority": {
			const priority = p.priority as string;
			if (priority) {
				await db
					.update(tasks)
					.set({
						priority: priority as "none" | "low" | "medium" | "high" | "urgent",
					})
					.where(eq(tasks.id, task.id));
			}
			break;
		}

		case "move_project": {
			const projectId = p.projectId as string;
			if (projectId) {
				await db.update(tasks).set({ projectId }).where(eq(tasks.id, task.id));
			}
			break;
		}
	}
}
