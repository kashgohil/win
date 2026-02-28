export interface EmailInput {
	subject: string;
	fromAddress: string;
	fromName: string;
	snippet: string;
	bodyPlain: string;
}

export interface DraftInput extends EmailInput {
	toAddresses: string[];
	aiSummary: string;
}

export type EmailCategory =
	| "urgent"
	| "actionable"
	| "informational"
	| "newsletter"
	| "receipt"
	| "confirmation"
	| "promotional"
	| "spam"
	| "uncategorized";

export type AutoHandleAction =
	| "archived"
	| "labeled"
	| "forwarded"
	| "auto-replied"
	| "filtered";

export interface ClassificationResult {
	category: EmailCategory;
	priorityScore: number;
	summary: string;
	shouldTriage: boolean;
	triageReason?: string;
	shouldAutoHandle: boolean;
	autoHandleAction?: AutoHandleAction;
}

export interface AiProvider {
	classify(
		email: EmailInput,
		systemPrompt: string,
	): Promise<ClassificationResult>;
	generateDraft(email: DraftInput, systemPrompt: string): Promise<string>;
}
