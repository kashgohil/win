import { getMailConfig } from "./env";
import type {
	EmailProvider,
	RefreshResult,
	SendParams,
	SyncedEmail,
	SyncResult,
	TokenResult,
} from "./types";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const GOOGLE_OAUTH = "https://oauth2.googleapis.com";
const SCOPES = [
	"https://www.googleapis.com/auth/gmail.readonly",
	"https://www.googleapis.com/auth/gmail.modify",
	"https://www.googleapis.com/auth/gmail.send",
].join(" ");

export class GmailProvider implements EmailProvider {
	getAuthUrl(state: string): string {
		const config = getMailConfig();
		const params = new URLSearchParams({
			client_id: config.clientId,
			redirect_uri: config.redirectUri,
			response_type: "code",
			scope: SCOPES,
			access_type: "offline",
			prompt: "consent",
			state,
		});
		return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
	}

	async exchangeCode(code: string): Promise<TokenResult> {
		const config = getMailConfig();
		const res = await fetch(`${GOOGLE_OAUTH}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				code,
				client_id: config.clientId,
				client_secret: config.clientSecret,
				redirect_uri: config.redirectUri,
				grant_type: "authorization_code",
			}).toString(),
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Gmail token exchange failed: ${res.status} ${body}`);
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
			email: profile.emailAddress,
			scopes: data.scope,
		};
	}

	async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
		const config = getMailConfig();
		const res = await fetch(`${GOOGLE_OAUTH}/token`, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				refresh_token: refreshToken,
				client_id: config.clientId,
				client_secret: config.clientSecret,
				grant_type: "refresh_token",
			}).toString(),
		});

		if (!res.ok) {
			const body = await res.text();
			throw new Error(`Gmail token refresh failed: ${res.status} ${body}`);
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
		const after = Math.floor(since.getTime() / 1000);
		const query = `after:${after}`;
		const allMessageIds: string[] = [];
		let pageToken: string | undefined;

		do {
			const params = new URLSearchParams({
				q: query,
				maxResults: "100",
			});
			if (pageToken) params.set("pageToken", pageToken);

			const listRes = await fetch(`${GMAIL_API}/users/me/messages?${params}`, {
				headers: { Authorization: `Bearer ${accessToken}` },
			});

			if (!listRes.ok) {
				throw new Error(`Gmail list failed: ${listRes.status}`);
			}

			const listData = (await listRes.json()) as {
				messages?: { id: string; threadId: string }[];
				nextPageToken?: string;
			};

			if (listData.messages) {
				for (const msg of listData.messages) {
					allMessageIds.push(msg.id);
				}
			}

			pageToken = listData.nextPageToken;
		} while (pageToken);

		const emails = await this.getMessagesBatched(accessToken, allMessageIds);

		const profileRes = await fetch(`${GMAIL_API}/users/me/profile`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		const profile = (await profileRes.json()) as { historyId: string };

		return {
			emails,
			newCursor: profile.historyId,
			hasMore: false,
		};
	}

	async incrementalSync(
		accessToken: string,
		cursor: string,
	): Promise<SyncResult> {
		const res = await fetch(
			`${GMAIL_API}/users/me/history?startHistoryId=${cursor}&historyTypes=messageAdded`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (!res.ok) {
			if (res.status === 404) {
				return { emails: [], newCursor: cursor, hasMore: false };
			}
			throw new Error(`Gmail history failed: ${res.status}`);
		}

		const data = (await res.json()) as {
			history?: {
				messagesAdded?: { message: { id: string; threadId: string } }[];
			}[];
			historyId: string;
		};

		const messageIds = new Set<string>();
		if (data.history) {
			for (const h of data.history) {
				if (h.messagesAdded) {
					for (const ma of h.messagesAdded) {
						messageIds.add(ma.message.id);
					}
				}
			}
		}

		const emails = await this.getMessagesBatched(accessToken, [...messageIds]);

		return {
			emails,
			newCursor: data.historyId,
			hasMore: false,
		};
	}

	async sendDraft(accessToken: string, params: SendParams): Promise<void> {
		const to = params.to.join(", ");
		const cc = params.cc?.join(", ") ?? "";
		const lines = [
			`To: ${to}`,
			...(cc ? [`Cc: ${cc}`] : []),
			`Subject: ${params.subject}`,
			...(params.inReplyTo
				? [
						`In-Reply-To: ${params.inReplyTo}`,
						`References: ${params.inReplyTo}`,
					]
				: []),
			"Content-Type: text/plain; charset=utf-8",
			"",
			params.body,
		];

		const raw = btoa(lines.join("\r\n"))
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");

		const body: Record<string, string> = { raw };
		if (params.threadId) body.threadId = params.threadId;

		const res = await fetch(`${GMAIL_API}/users/me/messages/send`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify(body),
		});

		if (!res.ok) {
			throw new Error(`Gmail send failed: ${res.status}`);
		}
	}

	async archive(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ removeLabelIds: ["INBOX"] }),
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail archive failed: ${res.status}`);
		}
	}

	async markRead(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ removeLabelIds: ["UNREAD"] }),
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail markRead failed: ${res.status}`);
		}
	}

	async markUnread(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ addLabelIds: ["UNREAD"] }),
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail markUnread failed: ${res.status}`);
		}
	}

	async star(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ addLabelIds: ["STARRED"] }),
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail star failed: ${res.status}`);
		}
	}

	async unstar(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/modify`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ removeLabelIds: ["STARRED"] }),
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail unstar failed: ${res.status}`);
		}
	}

	async trash(accessToken: string, messageId: string): Promise<void> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}/trash`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			},
		);

		if (!res.ok) {
			throw new Error(`Gmail trash failed: ${res.status}`);
		}
	}

	private async getMessagesBatched(
		accessToken: string,
		messageIds: string[],
		concurrency = 10,
	): Promise<SyncedEmail[]> {
		const results: SyncedEmail[] = [];

		for (let i = 0; i < messageIds.length; i += concurrency) {
			const batch = messageIds.slice(i, i + concurrency);
			const fetched = await Promise.all(
				batch.map((id) => this.getMessage(accessToken, id)),
			);
			for (const email of fetched) {
				if (email) results.push(email);
			}
		}

		return results;
	}

	private async getProfile(
		accessToken: string,
	): Promise<{ emailAddress: string }> {
		const res = await fetch(`${GMAIL_API}/users/me/profile`, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		if (!res.ok) {
			throw new Error(`Gmail profile failed: ${res.status}`);
		}

		return (await res.json()) as { emailAddress: string };
	}

	private async getMessage(
		accessToken: string,
		messageId: string,
	): Promise<SyncedEmail | null> {
		const res = await fetch(
			`${GMAIL_API}/users/me/messages/${messageId}?format=full`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (!res.ok) return null;

		const msg = (await res.json()) as GmailMessage;
		return parseGmailMessage(msg);
	}
}

/* ── Gmail message parsing ── */

interface GmailMessage {
	id: string;
	threadId: string;
	labelIds: string[];
	snippet: string;
	internalDate: string;
	payload: {
		headers: { name: string; value: string }[];
		mimeType: string;
		body?: { data?: string; size: number };
		parts?: GmailPart[];
	};
}

interface GmailPart {
	mimeType: string;
	body?: { data?: string; size: number };
	parts?: GmailPart[];
}

function getHeader(msg: GmailMessage, name: string): string | null {
	const header = msg.payload.headers.find(
		(h) => h.name.toLowerCase() === name.toLowerCase(),
	);
	return header?.value ?? null;
}

function parseAddress(raw: string | null): {
	address: string;
	name: string | null;
} {
	if (!raw) return { address: "", name: null };
	const match = raw.match(/^(.+?)\s*<(.+?)>$/);
	if (match) return { address: match[2]!, name: match[1]!.trim() };
	return { address: raw, name: null };
}

function parseAddressList(raw: string | null): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((a) => a.trim())
		.filter(Boolean);
}

function decodeBase64Url(data: string): string {
	const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
	return atob(base64);
}

function extractBody(
	payload: GmailMessage["payload"],
	mimeType: string,
): string | null {
	if (payload.mimeType === mimeType && payload.body?.data) {
		return decodeBase64Url(payload.body.data);
	}

	if (payload.parts) {
		for (const part of payload.parts) {
			if (part.mimeType === mimeType && part.body?.data) {
				return decodeBase64Url(part.body.data);
			}
			if (part.parts) {
				for (const sub of part.parts) {
					if (sub.mimeType === mimeType && sub.body?.data) {
						return decodeBase64Url(sub.body.data);
					}
				}
			}
		}
	}

	return null;
}

function parseGmailMessage(msg: GmailMessage): SyncedEmail {
	const from = parseAddress(getHeader(msg, "From"));
	const hasAttachments =
		msg.payload.parts?.some(
			(p) =>
				p.mimeType.startsWith("application/") ||
				p.mimeType.startsWith("image/"),
		) ?? false;

	return {
		providerMessageId: msg.id,
		providerThreadId: msg.threadId,
		subject: getHeader(msg, "Subject"),
		fromAddress: from.address,
		fromName: from.name,
		toAddresses: parseAddressList(getHeader(msg, "To")),
		ccAddresses: parseAddressList(getHeader(msg, "Cc")),
		snippet: msg.snippet,
		receivedAt: new Date(Number(msg.internalDate)),
		isRead: !msg.labelIds.includes("UNREAD"),
		isStarred: msg.labelIds.includes("STARRED"),
		hasAttachments,
		labels: msg.labelIds,
		bodyPlain: extractBody(msg.payload, "text/plain"),
		bodyHtml: extractBody(msg.payload, "text/html"),
	};
}
