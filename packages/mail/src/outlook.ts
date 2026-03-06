import { getOutlookConfig } from "./env";
import type {
	EmailProvider,
	RefreshResult,
	SendParams,
	SyncedAttachment,
	SyncedEmail,
	SyncResult,
	TokenResult,
} from "./types";

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const AUTH_BASE = "https://login.microsoftonline.com/common/oauth2/v2.0";
const SCOPES = "openid email profile Mail.ReadWrite Mail.Send offline_access";

export class OutlookProvider implements EmailProvider {
	getAuthUrl(state: string): string {
		const config = getOutlookConfig();
		const params = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: "code",
			scope: SCOPES,
			response_mode: "query",
			state,
		});
		return `${AUTH_BASE}/authorize?${params}`;
	}

	async exchangeCode(code: string): Promise<TokenResult> {
		const config = getOutlookConfig();
		const res = await fetch(`${AUTH_BASE}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: config.clientId,
				client_secret: config.clientSecret,
				redirect_uri: config.redirectUri,
				grant_type: "authorization_code",
				scope: SCOPES,
			}).toString(),
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Outlook token exchange failed: ${res.status} ${body}`);
		}

		const data = (await res.json()) as {
			access_token: string;
			refresh_token: string;
			expires_in: number;
			scope: string;
		};

		const profile = await this.getProfile(data.access_token);

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			expiresAt: new Date(Date.now() + data.expires_in * 1000),
			email: profile.email,
			scopes: data.scope,
		};
	}

	async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
		const config = getOutlookConfig();
		const res = await fetch(`${AUTH_BASE}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				refresh_token: refreshToken,
				client_id: config.clientId,
				client_secret: config.clientSecret,
				grant_type: "refresh_token",
				scope: SCOPES,
			}).toString(),
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Outlook token refresh failed: ${res.status} ${body}`);
		}

		const data = (await res.json()) as {
			access_token: string;
			expires_in: number;
		};

		return {
			accessToken: data.access_token,
			expiresAt: new Date(Date.now() + data.expires_in * 1000),
		};
	}

	async initialSync(accessToken: string, since: Date): Promise<SyncResult> {
		const sinceIso = since.toISOString();
		const allEmails: SyncedEmail[] = [];
		let nextLink: string | undefined =
			`${GRAPH_API}/me/messages?$filter=receivedDateTime ge ${sinceIso}&$orderby=receivedDateTime desc&$top=100&$expand=attachments&$select=id,conversationId,subject,from,toRecipients,ccRecipients,bodyPreview,receivedDateTime,isRead,flag,hasAttachments,body,internetMessageId,internetMessageHeaders`;

		do {
			const res = await this.graphFetch(accessToken, nextLink);
			if (!res.ok) {
				throw new Error(`Outlook list messages failed: ${res.status}`);
			}

			const data = (await res.json()) as {
				value: OutlookMessage[];
				"@odata.nextLink"?: string;
			};

			for (const msg of data.value) {
				allEmails.push(parseOutlookMessage(msg));
			}

			nextLink = data["@odata.nextLink"];
		} while (nextLink);

		// Get a delta token for future incremental syncs
		let deltaLink: string | null = null;
		try {
			let deltaUrl: string | undefined =
				`${GRAPH_API}/me/mailFolders/inbox/messages/delta?$top=1`;
			while (deltaUrl) {
				const deltaRes = await this.graphFetch(accessToken, deltaUrl);
				if (!deltaRes.ok) break;
				const deltaData = (await deltaRes.json()) as {
					"@odata.nextLink"?: string;
					"@odata.deltaLink"?: string;
				};
				deltaUrl = deltaData["@odata.nextLink"];
				if (deltaData["@odata.deltaLink"]) {
					deltaLink = deltaData["@odata.deltaLink"];
				}
			}
		} catch {
			// Non-fatal: we can still return emails without a delta cursor
		}

		return {
			emails: allEmails,
			newCursor: deltaLink,
			hasMore: false,
		};
	}

	async incrementalSync(
		accessToken: string,
		cursor: string,
	): Promise<SyncResult> {
		const emails: SyncedEmail[] = [];
		let nextLink: string | undefined = cursor;
		let newDeltaLink: string | null = null;

		try {
			while (nextLink) {
				const res = await this.graphFetch(accessToken, nextLink);

				if (!res.ok) {
					if (res.status === 410) {
						// Delta token expired — caller should trigger full re-sync
						return { emails: [], newCursor: null, hasMore: false };
					}
					throw new Error(`Outlook incremental sync failed: ${res.status}`);
				}

				const data = (await res.json()) as {
					value: OutlookMessage[];
					"@odata.nextLink"?: string;
					"@odata.deltaLink"?: string;
				};

				for (const msg of data.value) {
					emails.push(parseOutlookMessage(msg));
				}

				nextLink = data["@odata.nextLink"];
				if (data["@odata.deltaLink"]) {
					newDeltaLink = data["@odata.deltaLink"];
				}
			}
		} catch (err) {
			if (err instanceof Error && err.message.includes("410")) {
				return { emails: [], newCursor: null, hasMore: false };
			}
			throw err;
		}

		return {
			emails,
			newCursor: newDeltaLink ?? cursor,
			hasMore: false,
		};
	}

	async sendDraft(accessToken: string, params: SendParams): Promise<void> {
		if (params.inReplyTo) {
			// Reply to existing message
			const res = await this.graphFetch(
				accessToken,
				`${GRAPH_API}/me/messages/${params.inReplyTo}/reply`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						comment: params.body,
					}),
				},
			);

			if (!res.ok) {
				throw new Error(`Outlook reply failed: ${res.status}`);
			}
		} else {
			// Send new message
			const message: Record<string, unknown> = {
				subject: params.subject,
				body: {
					contentType: "Text",
					content: params.body,
				},
				toRecipients: params.to.map((addr) => ({
					emailAddress: { address: addr },
				})),
			};

			if (params.cc?.length) {
				message.ccRecipients = params.cc.map((addr) => ({
					emailAddress: { address: addr },
				}));
			}

			const res = await this.graphFetch(
				accessToken,
				`${GRAPH_API}/me/sendMail`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ message }),
				},
			);

			if (!res.ok) {
				throw new Error(`Outlook send failed: ${res.status}`);
			}
		}
	}

	async archive(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}/move`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ destinationId: "archive" }),
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook archive failed: ${res.status}`);
		}
	}

	async markRead(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isRead: true }),
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook markRead failed: ${res.status}`);
		}
	}

	async markUnread(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ isRead: false }),
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook markUnread failed: ${res.status}`);
		}
	}

	async star(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ flag: { flagStatus: "flagged" } }),
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook star failed: ${res.status}`);
		}
	}

	async unstar(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ flag: { flagStatus: "notFlagged" } }),
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook unstar failed: ${res.status}`);
		}
	}

	async trash(accessToken: string, messageId: string): Promise<void> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}`,
			{
				method: "DELETE",
			},
		);

		if (!res.ok) {
			throw new Error(`Outlook trash failed: ${res.status}`);
		}
	}

	async getAttachmentContent(
		accessToken: string,
		messageId: string,
		attachmentId: string,
	): Promise<{ data: Uint8Array } | null> {
		const res = await this.graphFetch(
			accessToken,
			`${GRAPH_API}/me/messages/${messageId}/attachments/${attachmentId}`,
		);

		if (!res.ok) return null;

		const json = (await res.json()) as { contentBytes: string };
		const bytes = Uint8Array.from(atob(json.contentBytes), (c) =>
			c.charCodeAt(0),
		);
		return { data: bytes };
	}

	private async getProfile(accessToken: string): Promise<{ email: string }> {
		const res = await this.graphFetch(accessToken, `${GRAPH_API}/me`);

		if (!res.ok) {
			throw new Error(`Outlook profile failed: ${res.status}`);
		}

		const data = (await res.json()) as {
			mail?: string;
			userPrincipalName: string;
		};

		return { email: data.mail || data.userPrincipalName };
	}

	private async graphFetch(
		accessToken: string,
		url: string,
		init?: RequestInit,
	): Promise<Response> {
		const res = await fetch(url, {
			...init,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				...init?.headers,
			},
		});

		// Respect Retry-After for rate limiting
		if (res.status === 429) {
			const retryAfter = res.headers.get("Retry-After");
			const waitMs = retryAfter ? Number(retryAfter) * 1000 : 5000;
			await new Promise((resolve) => setTimeout(resolve, waitMs));
			return fetch(url, {
				...init,
				headers: {
					Authorization: `Bearer ${accessToken}`,
					...init?.headers,
				},
			});
		}

		return res;
	}
}

/* ── Outlook message types ── */

interface OutlookEmailAddress {
	emailAddress: {
		name: string;
		address: string;
	};
}

interface OutlookAttachment {
	id: string;
	name: string;
	contentType: string;
	size: number;
	contentId?: string;
	isInline: boolean;
}

interface OutlookMessage {
	id: string;
	conversationId: string;
	subject: string | null;
	from: OutlookEmailAddress;
	toRecipients: OutlookEmailAddress[];
	ccRecipients: OutlookEmailAddress[];
	bodyPreview: string;
	receivedDateTime: string;
	isRead: boolean;
	flag: { flagStatus: string };
	hasAttachments: boolean;
	body: {
		contentType: string;
		content: string;
	};
	internetMessageId?: string;
	internetMessageHeaders?: { name: string; value: string }[];
	attachments?: OutlookAttachment[];
}

/* ── Message parsing ── */

function parseOutlookListUnsubscribe(
	headers: { name: string; value: string }[] | undefined,
): string | null {
	if (!headers) return null;
	const header = headers.find(
		(h) => h.name.toLowerCase() === "list-unsubscribe",
	);
	if (!header) return null;
	const httpMatch = header.value.match(/<(https?:\/\/[^>]+)>/);
	return httpMatch ? httpMatch[1]! : null;
}

function parseOutlookMessage(msg: OutlookMessage): SyncedEmail {
	const attachments: SyncedAttachment[] = [];
	if (msg.attachments) {
		for (const att of msg.attachments) {
			if (att.name) {
				attachments.push({
					filename: att.name,
					mimeType: att.contentType,
					size: att.size,
					providerAttachmentId: att.id,
					contentId: att.contentId ?? null,
				});
			}
		}
	}

	const isHtml = msg.body.contentType.toLowerCase() === "html";

	return {
		providerMessageId: msg.id,
		providerThreadId: msg.conversationId,
		subject: msg.subject,
		fromAddress: msg.from?.emailAddress?.address ?? null,
		fromName: msg.from?.emailAddress?.name ?? null,
		toAddresses: msg.toRecipients.map((r) => r.emailAddress.address),
		ccAddresses: msg.ccRecipients.map((r) => r.emailAddress.address),
		snippet: msg.bodyPreview,
		receivedAt: new Date(msg.receivedDateTime),
		isRead: msg.isRead,
		isStarred: msg.flag?.flagStatus === "flagged",
		hasAttachments: msg.hasAttachments || attachments.length > 0,
		attachments,
		labels: [],
		bodyHtml: isHtml ? msg.body.content : null,
		bodyPlain: isHtml ? null : msg.body.content,
		unsubscribeUrl: parseOutlookListUnsubscribe(msg.internetMessageHeaders),
	};
}
