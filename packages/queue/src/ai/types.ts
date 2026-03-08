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

export interface TaskParseInput {
	input: string;
	projectNames: string[];
}

export interface TaskParseResult {
	title: string;
	dueAt: string | null;
	priority: "none" | "low" | "medium" | "high" | "urgent";
	projectName: string | null;
}

export interface WorkSummaryInput {
	completedCount: number;
	completedTitles: string[];
	createdCount: number;
	overdueCount: number;
	streak: number;
	topProjects: { name: string; completed: number }[];
	periodDays: number;
}

export interface WorkSummaryResult {
	summary: string;
	highlights: string[];
}

export interface TaskCategorizeInput {
	title: string;
	description: string | null;
	projects: { id: string; name: string }[];
}

export interface TaskCategorizeResult {
	projectId: string | null;
	confidence: number;
}

export interface EmailTaskMatchInput {
	emailSubject: string;
	emailSnippet: string;
	emailFrom: string;
	tasks: { id: string; title: string }[];
}

export interface EmailTaskMatchResult {
	matches: { taskId: string; confidence: number; reason: string }[];
}

export interface CommitmentExtractInput {
	subject: string;
	fromAddress: string;
	toAddresses: string[];
	bodyPlain: string;
}

export interface CommitmentExtractResult {
	commitments: {
		text: string;
		deadline: string | null;
		confidence: number;
		recipientEmail: string | null;
	}[];
}

export interface AiProvider {
	classify(
		email: EmailInput,
		systemPrompt: string,
	): Promise<ClassificationResult>;
	generateDraft(email: DraftInput, systemPrompt: string): Promise<string>;
	parseTaskInput(
		input: TaskParseInput,
		systemPrompt: string,
	): Promise<TaskParseResult>;
	summarizeWork(
		input: WorkSummaryInput,
		systemPrompt: string,
	): Promise<WorkSummaryResult>;
	categorizeTask(
		input: TaskCategorizeInput,
		systemPrompt: string,
	): Promise<TaskCategorizeResult>;
	matchEmailToTasks(
		input: EmailTaskMatchInput,
		systemPrompt: string,
	): Promise<EmailTaskMatchResult>;
	extractCommitments(
		input: CommitmentExtractInput,
		systemPrompt: string,
	): Promise<CommitmentExtractResult>;
}
