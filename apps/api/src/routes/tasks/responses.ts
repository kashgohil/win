import { t } from "elysia";

/* ── Shared ── */

export const errorResponse = t.Object({
	error: t.String(),
});

/* ── Task ── */

const taskItemSchema = t.Object({
	id: t.String(),
	title: t.String(),
	completed: t.Boolean(),
	position: t.Number(),
});

const taskSchema = t.Object({
	id: t.String(),
	source: t.Union([t.Literal("native"), t.Literal("external")]),
	provider: t.Optional(t.Nullable(t.String())),
	externalId: t.Optional(t.Nullable(t.String())),
	externalUrl: t.Optional(t.Nullable(t.String())),
	title: t.String(),
	description: t.Optional(t.Nullable(t.String())),
	statusKey: t.Union([
		t.Literal("todo"),
		t.Literal("in_progress"),
		t.Literal("done"),
		t.Literal("blocked"),
		t.Literal("cancelled"),
	]),
	priority: t.Union([
		t.Literal("none"),
		t.Literal("low"),
		t.Literal("medium"),
		t.Literal("high"),
		t.Literal("urgent"),
	]),
	priorityScore: t.Number(),
	dueAt: t.Optional(t.Nullable(t.String())),
	assigneeUserId: t.Optional(t.Nullable(t.String())),
	externalAssigneeName: t.Optional(t.Nullable(t.String())),
	projectId: t.Optional(t.Nullable(t.String())),
	sourceEmailId: t.Optional(t.Nullable(t.String())),
	completedAt: t.Optional(t.Nullable(t.String())),
	reminderAt: t.Optional(t.Nullable(t.String())),
	snoozedUntil: t.Optional(t.Nullable(t.String())),
	writeBackState: t.Optional(t.Nullable(t.String())),
	items: t.Array(taskItemSchema),
	createdAt: t.String(),
	updatedAt: t.String(),
});

/* ── Task list ── */

export const taskListResponse = t.Object({
	tasks: t.Array(taskSchema),
	total: t.Number(),
	hasMore: t.Boolean(),
	nextCursor: t.Optional(t.String()),
});

/* ── Single task ── */

export const taskDetailResponse = taskSchema;

/* ── Create / Update ── */

export const createTaskBody = t.Object({
	title: t.String({ minLength: 1 }),
	description: t.Optional(t.String()),
	statusKey: t.Optional(
		t.Union([
			t.Literal("todo"),
			t.Literal("in_progress"),
			t.Literal("done"),
			t.Literal("blocked"),
			t.Literal("cancelled"),
		]),
	),
	priority: t.Optional(
		t.Union([
			t.Literal("none"),
			t.Literal("low"),
			t.Literal("medium"),
			t.Literal("high"),
			t.Literal("urgent"),
		]),
	),
	dueAt: t.Optional(t.Nullable(t.String())),
	projectId: t.Optional(t.Nullable(t.String())),
	sourceEmailId: t.Optional(t.Nullable(t.String())),
	reminderAt: t.Optional(t.Nullable(t.String())),
});

export const updateTaskBody = t.Object({
	title: t.Optional(t.String({ minLength: 1 })),
	description: t.Optional(t.Nullable(t.String())),
	statusKey: t.Optional(
		t.Union([
			t.Literal("todo"),
			t.Literal("in_progress"),
			t.Literal("done"),
			t.Literal("blocked"),
			t.Literal("cancelled"),
		]),
	),
	priority: t.Optional(
		t.Union([
			t.Literal("none"),
			t.Literal("low"),
			t.Literal("medium"),
			t.Literal("high"),
			t.Literal("urgent"),
		]),
	),
	dueAt: t.Optional(t.Nullable(t.String())),
	projectId: t.Optional(t.Nullable(t.String())),
	reminderAt: t.Optional(t.Nullable(t.String())),
	snoozedUntil: t.Optional(t.Nullable(t.String())),
});

/* ── Subtask items ── */

export const createTaskItemBody = t.Object({
	title: t.String({ minLength: 1 }),
});

export const updateTaskItemBody = t.Object({
	title: t.Optional(t.String({ minLength: 1 })),
	completed: t.Optional(t.Boolean()),
});

export const taskItemResponse = taskItemSchema;

/* ── Message ── */

export const messageResponse = t.Object({
	message: t.String(),
});

/* ── Projects ── */

const projectSchema = t.Object({
	id: t.String(),
	name: t.String(),
	description: t.Optional(t.Nullable(t.String())),
	source: t.Union([t.Literal("native"), t.Literal("external")]),
	externalId: t.Optional(t.Nullable(t.String())),
	color: t.Optional(t.Nullable(t.String())),
	archived: t.Boolean(),
	createdAt: t.String(),
});

export const projectListResponse = t.Array(projectSchema);

export const projectDetailResponse = projectSchema;

export const createProjectBody = t.Object({
	name: t.String({ minLength: 1 }),
	description: t.Optional(t.String()),
	color: t.Optional(t.String()),
});

/* ── Connections ── */

const connectionSchema = t.Object({
	id: t.String(),
	provider: t.String(),
	externalWorkspaceName: t.Optional(t.Nullable(t.String())),
	status: t.String(),
	readWrite: t.Boolean(),
	lastSyncAt: t.Optional(t.Nullable(t.String())),
	createdAt: t.String(),
});

export const connectionListResponse = t.Array(connectionSchema);

export const connectResponse = t.Object({
	url: t.String(),
});

export const callbackResponse = t.Object({
	connectionId: t.String(),
	workspaceName: t.Optional(t.Nullable(t.String())),
});

export const syncResponse = t.Object({
	imported: t.Number(),
	projects: t.Number(),
});

/* ── Task parse ── */

export const suggestionsResponse = t.Object({
	overdue: t.Array(taskSchema),
	dueToday: t.Array(taskSchema),
	highPriority: t.Array(taskSchema),
	recentlyUnsnoozed: t.Array(taskSchema),
});

export const parseTaskBody = t.Object({
	input: t.String({ minLength: 1 }),
});

export const parseTaskResponse = t.Object({
	title: t.String(),
	dueAt: t.Nullable(t.String()),
	priority: t.Union([
		t.Literal("none"),
		t.Literal("low"),
		t.Literal("medium"),
		t.Literal("high"),
		t.Literal("urgent"),
	]),
	projectName: t.Nullable(t.String()),
});
