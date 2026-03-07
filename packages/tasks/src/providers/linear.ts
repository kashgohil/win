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

const LINEAR_API = "https://api.linear.app/graphql";
const LINEAR_OAUTH = "https://linear.app/oauth";

const CLIENT_ID = process.env.LINEAR_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET ?? "";
const REDIRECT_URI = process.env.LINEAR_REDIRECT_URI ?? "";

/* ── GraphQL helper ── */

async function gql<T>(
	accessToken: string,
	query: string,
	variables?: Record<string, unknown>,
): Promise<T> {
	const res = await fetch(LINEAR_API, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: accessToken,
		},
		body: JSON.stringify({ query, variables }),
	});

	if (!res.ok) {
		const text = await res.text();
		throw new Error(`Linear API error ${res.status}: ${text}`);
	}

	const json = (await res.json()) as {
		data?: T;
		errors?: { message: string }[];
	};
	if (json.errors?.length) {
		throw new Error(`Linear GraphQL: ${json.errors[0]?.message}`);
	}
	if (!json.data) {
		throw new Error("Linear GraphQL: no data returned");
	}
	return json.data;
}

/* ── Priority mapping ── */

function mapPriority(
	linearPriority: number,
): "none" | "low" | "medium" | "high" | "urgent" {
	// Linear: 0=none, 1=urgent, 2=high, 3=medium, 4=low
	switch (linearPriority) {
		case 1:
			return "urgent";
		case 2:
			return "high";
		case 3:
			return "medium";
		case 4:
			return "low";
		default:
			return "none";
	}
}

function unmapPriority(
	priority: "none" | "low" | "medium" | "high" | "urgent",
): number {
	switch (priority) {
		case "urgent":
			return 1;
		case "high":
			return 2;
		case "medium":
			return 3;
		case "low":
			return 4;
		default:
			return 0;
	}
}

/* ── Status key mapping ── */

function mapStatusType(
	type: string,
): "todo" | "in_progress" | "done" | "blocked" | "cancelled" {
	switch (type) {
		case "completed":
			return "done";
		case "cancelled":
			return "cancelled";
		case "started":
			return "in_progress";
		default:
			return "todo";
	}
}

/* ── Provider ── */

export const linearProvider: TaskProvider = {
	name: "linear",

	getAuthUrl(state: string): string {
		const params = new URLSearchParams({
			client_id: CLIENT_ID,
			redirect_uri: REDIRECT_URI,
			response_type: "code",
			scope: "read,write",
			state,
			prompt: "consent",
		});
		return `${LINEAR_OAUTH}/authorize?${params}`;
	},

	async exchangeCode(code: string): Promise<TokenResult> {
		const res = await fetch(`${LINEAR_OAUTH}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				client_id: CLIENT_ID,
				client_secret: CLIENT_SECRET,
				redirect_uri: REDIRECT_URI,
			}).toString(),
		});

		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Linear token exchange failed: ${text}`);
		}

		const json = (await res.json()) as {
			access_token: string;
			token_type: string;
			expires_in?: number;
			scope: string;
		};

		// Fetch organization info
		const orgData = await gql<{
			organization: { id: string; name: string };
		}>(json.access_token, "{ organization { id name } }");

		return {
			accessToken: json.access_token,
			refreshToken: null, // Linear doesn't use refresh tokens
			expiresAt: json.expires_in
				? new Date(Date.now() + json.expires_in * 1000)
				: null,
			scopes: json.scope,
			workspaceId: orgData.organization.id,
			workspaceName: orgData.organization.name,
		};
	},

	async refreshAccessToken(): Promise<RefreshResult> {
		// Linear tokens don't expire/refresh in the standard OAuth way
		throw new Error("Linear does not support token refresh");
	},

	async listProjects(accessToken: string): Promise<TaskProviderProject[]> {
		const data = await gql<{
			teams: {
				nodes: {
					id: string;
					name: string;
					description: string | null;
					color: string | null;
				}[];
			};
		}>(
			accessToken,
			`{
				teams {
					nodes { id name description color }
				}
			}`,
		);

		return data.teams.nodes.map((t) => ({
			externalId: t.id,
			name: t.name,
			description: t.description,
			url: null,
			color: t.color,
		}));
	},

	async listStatuses(
		accessToken: string,
		projectExternalId?: string,
	): Promise<TaskProviderStatus[]> {
		if (!projectExternalId) return [];

		const data = await gql<{
			workflowStates: {
				nodes: {
					id: string;
					name: string;
					type: string;
					position: number;
					team: { id: string };
				}[];
			};
		}>(
			accessToken,
			`query($teamId: String!) {
				workflowStates(filter: { team: { id: { eq: $teamId } } }) {
					nodes { id name type position team { id } }
				}
			}`,
			{ teamId: projectExternalId },
		);

		return data.workflowStates.nodes.map((s) => ({
			externalId: s.id,
			name: s.name,
			statusKey: mapStatusType(s.type),
			position: s.position,
			projectExternalId: s.team.id,
		}));
	},

	async listUsers(accessToken: string): Promise<TaskProviderUser[]> {
		const data = await gql<{
			users: {
				nodes: {
					id: string;
					name: string;
					email: string;
					avatarUrl: string | null;
				}[];
			};
		}>(accessToken, `{ users { nodes { id name email avatarUrl } } }`);

		return data.users.nodes.map((u) => ({
			externalId: u.id,
			name: u.name,
			email: u.email,
			avatarUrl: u.avatarUrl,
		}));
	},

	async listTasks(
		accessToken: string,
		projectExternalId?: string,
		cursor?: string,
	): Promise<TaskSyncResult> {
		const PAGE_SIZE = 50;
		const filterParts: string[] = [];
		if (projectExternalId)
			filterParts.push(`team: { id: { eq: "${projectExternalId}" } }`);

		const filterStr = filterParts.length
			? `filter: { ${filterParts.join(", ")} },`
			: "";
		const afterStr = cursor ? `after: "${cursor}",` : "";

		const data = await gql<{
			issues: {
				nodes: {
					id: string;
					title: string;
					description: string | null;
					state: { id: string; type: string } | null;
					priority: number;
					dueDate: string | null;
					assignee: { id: string; name: string } | null;
					team: { id: string };
					url: string;
					completedAt: string | null;
					createdAt: string;
					updatedAt: string;
				}[];
				pageInfo: {
					hasNextPage: boolean;
					endCursor: string | null;
				};
			};
		}>(
			accessToken,
			`{
				issues(${filterStr} ${afterStr} first: ${PAGE_SIZE}, orderBy: updatedAt) {
					nodes {
						id title description
						state { id type }
						priority dueDate
						assignee { id name }
						team { id }
						url completedAt createdAt updatedAt
					}
					pageInfo { hasNextPage endCursor }
				}
			}`,
		);

		return {
			tasks: data.issues.nodes.map((issue) => ({
				externalId: issue.id,
				title: issue.title,
				description: issue.description,
				statusExternalId: issue.state?.id ?? null,
				statusKey: mapStatusType(issue.state?.type ?? "unstarted"),
				priority: mapPriority(issue.priority),
				dueAt: issue.dueDate ? new Date(issue.dueDate) : null,
				assigneeExternalId: issue.assignee?.id ?? null,
				assigneeName: issue.assignee?.name ?? null,
				projectExternalId: issue.team.id,
				url: issue.url,
				completedAt: issue.completedAt ? new Date(issue.completedAt) : null,
				createdAt: new Date(issue.createdAt),
				updatedAt: new Date(issue.updatedAt),
			})),
			cursor: data.issues.pageInfo.endCursor,
			hasMore: data.issues.pageInfo.hasNextPage,
		};
	},

	async updateTask(
		accessToken: string,
		taskExternalId: string,
		params: TaskUpdateParams,
	): Promise<TaskProviderTask> {
		const input: Record<string, unknown> = {};
		if (params.title !== undefined) input.title = params.title;
		if (params.description !== undefined)
			input.description = params.description;
		if (params.statusExternalId !== undefined)
			input.stateId = params.statusExternalId;
		if (params.priority !== undefined)
			input.priority = unmapPriority(params.priority);
		if (params.dueAt !== undefined)
			input.dueDate = params.dueAt
				? params.dueAt.toISOString().split("T")[0]
				: null;
		if (params.assigneeExternalId !== undefined)
			input.assigneeId = params.assigneeExternalId;

		const data = await gql<{
			issueUpdate: {
				issue: {
					id: string;
					title: string;
					description: string | null;
					state: { id: string; type: string } | null;
					priority: number;
					dueDate: string | null;
					assignee: { id: string; name: string } | null;
					team: { id: string };
					url: string;
					completedAt: string | null;
					createdAt: string;
					updatedAt: string;
				};
			};
		}>(
			accessToken,
			`mutation($id: String!, $input: IssueUpdateInput!) {
				issueUpdate(id: $id, input: $input) {
					issue {
						id title description
						state { id type }
						priority dueDate
						assignee { id name }
						team { id }
						url completedAt createdAt updatedAt
					}
				}
			}`,
			{ id: taskExternalId, input },
		);

		const issue = data.issueUpdate.issue;
		return {
			externalId: issue.id,
			title: issue.title,
			description: issue.description,
			statusExternalId: issue.state?.id ?? null,
			statusKey: mapStatusType(issue.state?.type ?? "unstarted"),
			priority: mapPriority(issue.priority),
			dueAt: issue.dueDate ? new Date(issue.dueDate) : null,
			assigneeExternalId: issue.assignee?.id ?? null,
			assigneeName: issue.assignee?.name ?? null,
			projectExternalId: issue.team.id,
			url: issue.url,
			completedAt: issue.completedAt ? new Date(issue.completedAt) : null,
			createdAt: new Date(issue.createdAt),
			updatedAt: new Date(issue.updatedAt),
		};
	},

	verifyWebhook(
		headers: Record<string, string>,
		body: string,
		secret?: string,
	): boolean {
		const signature = headers["linear-signature"];
		if (!signature) return false;
		if (!secret) return true; // no secret stored yet, accept if header present

		// Linear signs with HMAC-SHA256
		const hmac = new Bun.CryptoHasher("sha256", secret);
		hmac.update(body);
		const expected = hmac.digest("hex");
		// Constant-time comparison
		if (signature.length !== expected.length) return false;
		let mismatch = 0;
		for (let i = 0; i < signature.length; i++) {
			mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
		}
		return mismatch === 0;
	},

	async createWebhook(
		accessToken: string,
		url: string,
		teamId?: string,
	): Promise<{ webhookId: string; secret: string }> {
		const secret = crypto.randomUUID();
		const input: Record<string, unknown> = {
			url,
			secret,
			resourceTypes: ["Issue"],
			enabled: true,
		};
		if (teamId) input.teamId = teamId;

		const data = await gql<{
			webhookCreate: {
				success: boolean;
				webhook: { id: string; enabled: boolean };
			};
		}>(
			accessToken,
			`mutation($input: WebhookCreateInput!) {
				webhookCreate(input: $input) {
					success
					webhook { id enabled }
				}
			}`,
			{ input },
		);

		if (!data.webhookCreate.success) {
			throw new Error("Failed to create Linear webhook");
		}

		return {
			webhookId: data.webhookCreate.webhook.id,
			secret,
		};
	},

	async deleteWebhook(accessToken: string, webhookId: string): Promise<void> {
		await gql<{ webhookDelete: { success: boolean } }>(
			accessToken,
			`mutation($id: String!) {
				webhookDelete(id: $id) { success }
			}`,
			{ id: webhookId },
		);
	},

	parseWebhookEvent(
		_headers: Record<string, string>,
		body: string,
	): WebhookEvent | null {
		try {
			const payload = JSON.parse(body) as {
				action: string;
				type: string;
				data: {
					id: string;
					title: string;
					description: string | null;
					state: { id: string; type: string } | null;
					priority: number;
					dueDate: string | null;
					assignee: { id: string; name: string } | null;
					team: { id: string };
					url: string;
					completedAt: string | null;
					createdAt: string;
					updatedAt: string;
				};
			};

			if (payload.type !== "Issue") return null;

			const action =
				payload.action === "create"
					? "created"
					: payload.action === "remove"
						? "deleted"
						: "updated";

			const issue = payload.data;
			return {
				action,
				taskExternalId: issue.id,
				projectExternalId: issue.team?.id ?? null,
				data:
					action === "deleted"
						? null
						: {
								externalId: issue.id,
								title: issue.title,
								description: issue.description,
								statusExternalId: issue.state?.id ?? null,
								statusKey: mapStatusType(issue.state?.type ?? "unstarted"),
								priority: mapPriority(issue.priority),
								dueAt: issue.dueDate ? new Date(issue.dueDate) : null,
								assigneeExternalId: issue.assignee?.id ?? null,
								assigneeName: issue.assignee?.name ?? null,
								projectExternalId: issue.team?.id ?? null,
								url: issue.url,
								completedAt: issue.completedAt
									? new Date(issue.completedAt)
									: null,
								createdAt: new Date(issue.createdAt),
								updatedAt: new Date(issue.updatedAt),
							},
			};
		} catch {
			return null;
		}
	},
};
