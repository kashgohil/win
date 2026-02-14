export interface TokenResult {
	accessToken: string;
	refreshToken: string;
	expiresAt: Date;
	email: string;
	scopes: string;
}

export interface RefreshResult {
	accessToken: string;
	expiresAt: Date;
}

export interface SyncedEmail {
	providerMessageId: string;
	providerThreadId: string | null;
	subject: string | null;
	fromAddress: string | null;
	fromName: string | null;
	toAddresses: string[];
	ccAddresses: string[];
	snippet: string | null;
	receivedAt: Date;
	isRead: boolean;
	isStarred: boolean;
	hasAttachments: boolean;
	labels: string[];
	bodyPlain: string | null;
	bodyHtml: string | null;
}

export interface SyncResult {
	emails: SyncedEmail[];
	newCursor: string | null;
	hasMore: boolean;
}

export interface SendParams {
	to: string[];
	cc?: string[];
	subject: string;
	body: string;
	threadId?: string;
	inReplyTo?: string;
}

export interface EmailProvider {
	getAuthUrl(state: string): string;
	exchangeCode(code: string): Promise<TokenResult>;
	refreshAccessToken(refreshToken: string): Promise<RefreshResult>;
	initialSync(accessToken: string, since: Date): Promise<SyncResult>;
	incrementalSync(accessToken: string, cursor: string): Promise<SyncResult>;
	sendDraft(accessToken: string, params: SendParams): Promise<void>;
	archive(accessToken: string, messageId: string): Promise<void>;
	markRead(accessToken: string, messageId: string): Promise<void>;
}
