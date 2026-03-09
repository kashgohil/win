import type {
	autoHandleActionEnum,
	emailCategoryEnum,
	emailProviderEnum,
	syncStatusEnum,
	triageStatusEnum,
} from "@wingmnn/db";

/* ── Enum value types ── */

export type EmailCategory = (typeof emailCategoryEnum.enumValues)[number];
export type EmailProvider = (typeof emailProviderEnum.enumValues)[number];
export type SyncStatus = (typeof syncStatusEnum.enumValues)[number];
export type TriageStatus = (typeof triageStatusEnum.enumValues)[number];
export type AutoHandleAction = (typeof autoHandleActionEnum.enumValues)[number];

/* ── Triage action (what the user can do) ── */

export type TriageAction = "send_draft" | "dismiss" | "archive" | "snooze";

/* ── Serialized shapes (match API responses) ── */

export type BriefingStat = {
	label: string;
	value: string | number;
	trend?: "up" | "down" | "neutral";
	accent?: boolean;
};

export type TriageActionButton = {
	label: string;
	variant?: "default" | "outline" | "ghost";
};

export type TriageItem = {
	id: string;
	title: string;
	subtitle?: string;
	timestamp: string;
	urgent?: boolean;
	actions: TriageActionButton[];
};

export type AutoHandledItem = {
	id: string;
	text: string;
	subject?: string;
	sender?: string;
	actionType: string;
	emailId?: string;
	linkedModule?: string;
	category?: string;
	timestamp: string;
};

export type MailModuleData = {
	briefing: BriefingStat[];
	triage: TriageItem[];
	autoHandled: AutoHandledItem[];
};

export type SerializedEmail = {
	id: string;
	emailAccountId: string;
	subject: string | null;
	fromAddress: string | null;
	fromName: string | null;
	toAddresses: string[] | null;
	ccAddresses: string[] | null;
	snippet: string | null;
	receivedAt: string;
	isRead: boolean;
	isStarred: boolean;
	hasAttachments: boolean;
	labels: string[] | null;
	category: EmailCategory;
	priorityScore: number;
	aiSummary: string | null;
	relatedTaskId?: string | null;
	relatedTaskReason?: string | null;
};

export type SerializedAttachment = {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
};

export type SerializedAttachmentWithContext = SerializedAttachment & {
	emailId: string;
	emailSubject: string | null;
	fromName: string | null;
	fromAddress: string | null;
	receivedAt: string;
	category: EmailCategory;
};

export type SerializedEmailDetail = SerializedEmail & {
	bodyPlain: string | null;
	bodyHtml: string | null;
	attachments: SerializedAttachment[];
};

export type SerializedAccount = {
	id: string;
	provider: EmailProvider;
	email: string;
	syncStatus: SyncStatus;
	lastSyncAt: string | null;
	active: boolean;
	signature: string | null;
	createdAt: string;
};

/* ── Thread types ── */

export type SerializedThread = {
	threadId: string;
	subject: string | null;
	snippet: string | null;
	latestReceivedAt: string;
	messageCount: number;
	unreadCount: number;
	hasAttachments: boolean;
	isStarred: boolean;
	category: EmailCategory;
	priorityScore: number;
	aiSummary: string | null;
	latestMessage: {
		id: string;
		fromAddress: string | null;
		fromName: string | null;
		toAddresses: string[] | null;
	};
	participants: Array<{ address: string; name: string | null }>;
};

export type SerializedThreadDetail = {
	threadId: string;
	subject: string | null;
	messages: SerializedEmailDetail[];
	isMerged: boolean;
};
