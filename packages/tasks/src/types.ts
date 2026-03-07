/* ── Provider adapter interface ── */

export interface TaskProviderProject {
	externalId: string;
	name: string;
	description: string | null;
	url: string | null;
	color: string | null;
}

export interface TaskProviderStatus {
	externalId: string;
	name: string;
	statusKey: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
	position: number;
	projectExternalId: string | null;
}

export interface TaskProviderUser {
	externalId: string;
	name: string;
	email: string | null;
	avatarUrl: string | null;
}

export interface TaskProviderTask {
	externalId: string;
	title: string;
	description: string | null;
	statusExternalId: string | null;
	statusKey: "todo" | "in_progress" | "done" | "blocked" | "cancelled";
	priority: "none" | "low" | "medium" | "high" | "urgent";
	dueAt: Date | null;
	assigneeExternalId: string | null;
	assigneeName: string | null;
	projectExternalId: string | null;
	url: string | null;
	completedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface TaskSyncResult {
	tasks: TaskProviderTask[];
	cursor: string | null;
	hasMore: boolean;
}

export interface TaskUpdateParams {
	title?: string;
	description?: string;
	statusExternalId?: string;
	priority?: "none" | "low" | "medium" | "high" | "urgent";
	dueAt?: Date | null;
	assigneeExternalId?: string | null;
}

export interface TokenResult {
	accessToken: string;
	refreshToken: string | null;
	expiresAt: Date | null;
	scopes: string;
	workspaceId: string | null;
	workspaceName: string | null;
}

export interface RefreshResult {
	accessToken: string;
	expiresAt: Date | null;
}

export interface WebhookEvent {
	action: "created" | "updated" | "deleted";
	taskExternalId: string;
	projectExternalId: string | null;
	data: TaskProviderTask | null;
}

export interface TaskProvider {
	readonly name: string;

	// auth
	getAuthUrl(state: string): string;
	exchangeCode(code: string): Promise<TokenResult>;
	refreshAccessToken(refreshToken: string): Promise<RefreshResult>;

	// read
	listProjects(accessToken: string): Promise<TaskProviderProject[]>;
	listStatuses(
		accessToken: string,
		projectExternalId?: string,
	): Promise<TaskProviderStatus[]>;
	listUsers(accessToken: string): Promise<TaskProviderUser[]>;
	listTasks(
		accessToken: string,
		projectExternalId?: string,
		cursor?: string,
	): Promise<TaskSyncResult>;

	// write
	updateTask(
		accessToken: string,
		taskExternalId: string,
		params: TaskUpdateParams,
	): Promise<TaskProviderTask>;

	// webhooks
	verifyWebhook(
		headers: Record<string, string>,
		body: string,
		secret?: string,
	): boolean;
	parseWebhookEvent(
		headers: Record<string, string>,
		body: string,
	): WebhookEvent | null;

	// webhook management (optional)
	createWebhook?(
		accessToken: string,
		url: string,
		teamId?: string,
	): Promise<{ webhookId: string; secret: string }>;
	deleteWebhook?(accessToken: string, webhookId: string): Promise<void>;
}
