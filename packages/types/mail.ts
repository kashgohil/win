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
};

export type SerializedEmailDetail = SerializedEmail & {
	bodyPlain: string | null;
	bodyHtml: string | null;
};

export type SerializedAccount = {
	id: string;
	provider: EmailProvider;
	email: string;
	syncStatus: SyncStatus;
	lastSyncAt: string | null;
	active: boolean;
	createdAt: string;
};
