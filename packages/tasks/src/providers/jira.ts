import type {
	RefreshResult,
	TaskProvider,
	TaskProviderProject,
	TaskProviderStatus,
	TaskProviderTask,
	TaskProviderUser,
	TaskSyncResult,
	TaskUpdateParams,
	TokenResult,
	WebhookEvent,
} from "../types";

const JIRA_AUTH = "https://auth.atlassian.com";
const JIRA_API_VERSION = "3";

const CLIENT_ID = process.env.JIRA_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.JIRA_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.JIRA_REDIRECT_URI ?? "";

/* ── REST helper ── */

async function jiraFetch<T>(
	cloudId: string,
	accessToken: string,
	path: string,
	options?: { method?: string; body?: unknown },
): Promise<T> {
	const url = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/${JIRA_API_VERSION}${path}`;
	const res = await fetch(url, {
		method: options?.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
			Accept: "application/json",
		},
		body: options?.body ? JSON.stringify(options.body) : undefined,
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Jira API error ${res.status}: ${text}`);
	}

	const text = await res.text();
	if (!text) return {} as T;
	return JSON.parse(text) as T;
}

/* ── Get accessible resources (cloud ID) ── */

async function getAccessibleResources(
	accessToken: string,
): Promise<{ id: string; name: string; url: string }[]> {
	const res = await fetch(
		"https://api.atlassian.com/oauth/token/accessible-resources",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/json",
			},
		},
	);

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Jira accessible-resources error ${res.status}: ${text}`);
	}

	return (await res.json()) as { id: string; name: string; url: string }[];
}

/* ── Priority mapping ── */

function mapPriority(
	jiraPriority: string | null,
): "none" | "low" | "medium" | "high" | "urgent" {
	if (!jiraPriority) return "none";
	const name = jiraPriority.toLowerCase();
	if (name === "highest" || name === "blocker" || name === "critical")
		return "urgent";
	if (name === "high") return "high";
	if (name === "medium") return "medium";
	if (name === "low") return "low";
	if (name === "lowest" || name === "trivial") return "none";
	return "none";
}

function unmapPriority(
	priority: "none" | "low" | "medium" | "high" | "urgent",
): string {
	switch (priority) {
		case "urgent":
			return "Highest";
		case "high":
			return "High";
		case "medium":
			return "Medium";
		case "low":
			return "Low";
		default:
			return "Lowest";
	}
}

/* ── Status category mapping ── */

function mapStatusCategory(
	categoryKey: string,
): "todo" | "in_progress" | "done" | "blocked" | "cancelled" {
	// Jira status categories: "new", "indeterminate", "done"
	switch (categoryKey) {
		case "done":
			return "done";
		case "indeterminate":
			return "in_progress";
		default:
			return "todo";
	}
}

/* ── Issue → TaskProviderTask mapper ── */

interface JiraIssue {
	id: string;
	key: string;
	self: string;
	fields: {
		summary: string;
		description?: unknown;
		status?: { id: string; statusCategory?: { key: string } };
		priority?: { name: string };
		duedate?: string | null;
		assignee?: { accountId: string; displayName: string } | null;
		project?: { id: string; key: string };
		created: string;
		updated: string;
		resolutiondate?: string | null;
	};
}

function mapIssue(issue: JiraIssue, siteUrl: string): TaskProviderTask {
	const f = issue.fields;
	const categoryKey = f.status?.statusCategory?.key ?? "new";

	return {
		externalId: issue.id,
		title: f.summary,
		description: typeof f.description === "string" ? f.description : null,
		statusExternalId: f.status?.id ?? null,
		statusKey: mapStatusCategory(categoryKey),
		priority: mapPriority(f.priority?.name ?? null),
		dueAt: f.duedate ? new Date(f.duedate) : null,
		assigneeExternalId: f.assignee?.accountId ?? null,
		assigneeName: f.assignee?.displayName ?? null,
		projectExternalId: f.project?.id ?? null,
		url: `${siteUrl}/browse/${issue.key}`,
		completedAt: f.resolutiondate ? new Date(f.resolutiondate) : null,
		createdAt: new Date(f.created),
		updatedAt: new Date(f.updated),
	};
}

/* ── Provider ── */

export const jiraProvider: TaskProvider = {
	name: "jira",

	getAuthUrl(state: string): string {
		const params = new URLSearchParams({
			audience: "api.atlassian.com",
			client_id: CLIENT_ID,
			scope:
				"read:jira-work write:jira-work read:jira-user manage:jira-webhook offline_access",
			redirect_uri: REDIRECT_URI,
			state,
			response_type: "code",
			prompt: "consent",
		});
		return `${JIRA_AUTH}/authorize?${params}`;
	},

	async exchangeCode(code: string): Promise<TokenResult> {
		const res = await fetch(`${JIRA_AUTH}/oauth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				grant_type: "authorization_code",
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				code,
				redirect_uri: REDIRECT_URI,
			}),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Jira token exchange failed: ${text}`);
		}

		const json = (await res.json()) as {
			access_token: string;
			refresh_token: string;
			expires_in: number;
			scope: string;
		};

		// Get the cloud site info
		const resources = await getAccessibleResources(json.access_token);
		const site = resources[0];

		if (!site) {
			throw new Error("No accessible Jira sites found");
		}

		return {
			accessToken: json.access_token,
			refreshToken: json.refresh_token,
			expiresAt: new Date(Date.now() + json.expires_in * 1000),
			scopes: json.scope,
			workspaceId: site.id, // cloud ID
			workspaceName: site.name,
		};
	},

	async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
		const res = await fetch(`${JIRA_AUTH}/oauth/token`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				grant_type: "refresh_token",
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				refresh_token: refreshToken,
			}),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Jira token refresh failed: ${text}`);
		}

		const json = (await res.json()) as {
			access_token: string;
			expires_in: number;
		};

		return {
			accessToken: json.access_token,
			expiresAt: new Date(Date.now() + json.expires_in * 1000),
		};
	},

	async listProjects(accessToken: string): Promise<TaskProviderProject[]> {
		// We need cloudId — extract from stored workspaceId via accessible resources
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) return [];

		const data = await jiraFetch<{
			values: {
				id: string;
				key: string;
				name: string;
				description: string | null;
				style: string;
			}[];
		}>(site.id, accessToken, "/project/search?maxResults=100");

		return data.values.map((p) => ({
			externalId: p.id,
			name: `${p.key} — ${p.name}`,
			description: p.description,
			url: `${site.url}/browse/${p.key}`,
			color: null,
		}));
	},

	async listStatuses(
		accessToken: string,
		projectExternalId?: string,
	): Promise<TaskProviderStatus[]> {
		if (!projectExternalId) return [];

		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) return [];

		const data = await jiraFetch<
			{
				id: string;
				name: string;
				statusCategory: { key: string };
			}[]
		>(site.id, accessToken, `/project/${projectExternalId}/statuses`);

		// Jira returns statuses grouped by issue type — flatten and dedupe
		const seen = new Set<string>();
		const statuses: TaskProviderStatus[] = [];
		let position = 0;

		// data is an array of issue types, each with statuses
		const issueTypes = data as unknown as {
			id: string;
			name: string;
			statuses: {
				id: string;
				name: string;
				statusCategory: { key: string };
			}[];
		}[];

		for (const issueType of issueTypes) {
			for (const s of issueType.statuses) {
				if (seen.has(s.id)) continue;
				seen.add(s.id);
				statuses.push({
					externalId: s.id,
					name: s.name,
					statusKey: mapStatusCategory(s.statusCategory.key),
					position: position++,
					projectExternalId,
				});
			}
		}

		return statuses;
	},

	async listUsers(accessToken: string): Promise<TaskProviderUser[]> {
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) return [];

		const data = await jiraFetch<
			{
				accountId: string;
				displayName: string;
				emailAddress?: string;
				avatarUrls?: { "48x48"?: string };
				accountType: string;
			}[]
		>(site.id, accessToken, "/users/search?maxResults=200");

		return data
			.filter((u) => u.accountType === "atlassian")
			.map((u) => ({
				externalId: u.accountId,
				name: u.displayName,
				email: u.emailAddress ?? null,
				avatarUrl: u.avatarUrls?.["48x48"] ?? null,
			}));
	},

	async listTasks(
		accessToken: string,
		projectExternalId?: string,
		cursor?: string,
	): Promise<TaskSyncResult> {
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) return { tasks: [], cursor: null, hasMore: false };

		const PAGE_SIZE = 50;
		const startAt = cursor ? Number.parseInt(cursor, 10) : 0;

		// Build JQL
		const jqlParts: string[] = [];
		if (projectExternalId) {
			jqlParts.push(`project = ${projectExternalId}`);
		}
		jqlParts.push("ORDER BY updated DESC");

		const jql = jqlParts.join(" ");
		const params = new URLSearchParams({
			jql,
			startAt: String(startAt),
			maxResults: String(PAGE_SIZE),
			fields:
				"summary,description,status,priority,duedate,assignee,project,created,updated,resolutiondate",
		});

		const data = await jiraFetch<{
			issues: JiraIssue[];
			total: number;
			startAt: number;
			maxResults: number;
		}>(site.id, accessToken, `/search?${params}`);

		const nextStart = startAt + data.issues.length;
		const hasMore = nextStart < data.total;

		return {
			tasks: data.issues.map((issue) => mapIssue(issue, site.url)),
			cursor: hasMore ? String(nextStart) : null,
			hasMore,
		};
	},

	async updateTask(
		accessToken: string,
		taskExternalId: string,
		params: TaskUpdateParams,
	): Promise<TaskProviderTask> {
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) throw new Error("No accessible Jira site");

		const fields: Record<string, unknown> = {};
		if (params.title !== undefined) fields.summary = params.title;
		if (params.description !== undefined) {
			fields.description = params.description
				? {
						type: "doc",
						version: 1,
						content: [
							{
								type: "paragraph",
								content: [{ type: "text", text: params.description }],
							},
						],
					}
				: null;
		}
		if (params.priority !== undefined) {
			fields.priority = { name: unmapPriority(params.priority) };
		}
		if (params.dueAt !== undefined) {
			fields.duedate = params.dueAt
				? params.dueAt.toISOString().split("T")[0]
				: null;
		}
		if (params.assigneeExternalId !== undefined) {
			fields.assignee = params.assigneeExternalId
				? { accountId: params.assigneeExternalId }
				: null;
		}

		// Update fields
		if (Object.keys(fields).length > 0) {
			await jiraFetch(site.id, accessToken, `/issue/${taskExternalId}`, {
				method: "PUT",
				body: { fields },
			});
		}

		// Handle status transition separately
		if (params.statusExternalId) {
			// Get available transitions
			const transitions = await jiraFetch<{
				transitions: { id: string; to: { id: string } }[];
			}>(site.id, accessToken, `/issue/${taskExternalId}/transitions`);

			const target = transitions.transitions.find(
				(t) => t.to.id === params.statusExternalId,
			);
			if (target) {
				await jiraFetch(
					site.id,
					accessToken,
					`/issue/${taskExternalId}/transitions`,
					{
						method: "POST",
						body: { transition: { id: target.id } },
					},
				);
			}
		}

		// Fetch updated issue
		const issue = await jiraFetch<JiraIssue>(
			site.id,
			accessToken,
			`/issue/${taskExternalId}?fields=summary,description,status,priority,duedate,assignee,project,created,updated,resolutiondate`,
		);

		return mapIssue(issue, site.url);
	},

	verifyWebhook(
		headers: Record<string, string>,
		_body: string,
		secret?: string,
	): boolean {
		// Jira Cloud webhooks registered via REST API include a user-defined secret
		// passed as a query param or header. We verify via the shared secret approach.
		const webhookSecret =
			headers["x-hub-secret"] ?? headers["x-atlassian-webhook-identifier"];
		if (!secret) return true; // No secret configured, accept
		if (!webhookSecret) return false;
		return webhookSecret === secret;
	},

	parseWebhookEvent(
		_headers: Record<string, string>,
		body: string,
	): WebhookEvent | null {
		try {
			const payload = JSON.parse(body) as {
				webhookEvent: string;
				issue?: JiraIssue;
				issue_event_type_name?: string;
			};

			if (!payload.issue) return null;

			const eventType = payload.webhookEvent;
			let action: "created" | "updated" | "deleted";

			if (eventType === "jira:issue_created") {
				action = "created";
			} else if (eventType === "jira:issue_deleted") {
				action = "deleted";
			} else if (
				eventType === "jira:issue_updated" ||
				eventType?.startsWith("jira:issue_")
			) {
				action = "updated";
			} else {
				return null;
			}

			// We need the site URL for building browse links — use a placeholder
			// since webhooks don't include it. The sync will update with correct URL.
			const siteUrl = "";

			return {
				action,
				taskExternalId: payload.issue.id,
				projectExternalId: payload.issue.fields.project?.id ?? null,
				data: action === "deleted" ? null : mapIssue(payload.issue, siteUrl),
			};
		} catch {
			return null;
		}
	},

	async createWebhook(
		accessToken: string,
		url: string,
	): Promise<{ webhookId: string; secret: string }> {
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) throw new Error("No accessible Jira site");

		const secret = crypto.randomUUID();

		const data = await jiraFetch<{
			webhookRegistrationResult: { createdWebhookId: number }[];
		}>(site.id, accessToken, "/webhook", {
			method: "POST",
			body: {
				url: `${url}?secret=${secret}`,
				webhooks: [
					{
						events: [
							"jira:issue_created",
							"jira:issue_updated",
							"jira:issue_deleted",
						],
						jqlFilter: "project is not EMPTY",
					},
				],
			},
		});

		const result = data.webhookRegistrationResult?.[0];
		if (!result?.createdWebhookId) {
			throw new Error("Failed to create Jira webhook");
		}

		return {
			webhookId: String(result.createdWebhookId),
			secret,
		};
	},

	async deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
		const resources = await getAccessibleResources(accessToken);
		const site = resources[0];
		if (!site) return;

		await jiraFetch(site.id, accessToken, `/webhook`, {
			method: "DELETE",
			body: { webhookIds: [Number.parseInt(webhookId, 10)] },
		});
	},
};
