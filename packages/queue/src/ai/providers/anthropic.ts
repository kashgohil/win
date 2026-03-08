import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
	AiProvider,
	ClassificationResult,
	CommitmentExtractInput,
	CommitmentExtractResult,
	DraftInput,
	EmailInput,
	EmailTaskMatchInput,
	EmailTaskMatchResult,
	TaskCategorizeInput,
	TaskCategorizeResult,
	TaskParseInput,
	TaskParseResult,
	WorkSummaryInput,
	WorkSummaryResult,
} from "../types";

const TaskParseSchema = z.object({
	title: z.string(),
	dueAt: z.string().nullable(),
	priority: z.enum(["none", "low", "medium", "high", "urgent"]),
	projectName: z.string().nullable(),
});

const ClassificationSchema = z.object({
	category: z.enum([
		"urgent",
		"actionable",
		"informational",
		"newsletter",
		"receipt",
		"confirmation",
		"promotional",
		"spam",
		"uncategorized",
	]),
	priorityScore: z.number().int().min(0).max(100),
	summary: z.string(),
	shouldTriage: z.boolean(),
	triageReason: z.string().nullable(),
	shouldAutoHandle: z.boolean(),
	autoHandleAction: z
		.enum(["archived", "labeled", "forwarded", "auto-replied", "filtered"])
		.nullable(),
});

const CLASSIFY_BODY_LIMIT = 2000;
const DRAFT_BODY_LIMIT = 3000;

export class AnthropicProvider implements AiProvider {
	private client: Anthropic;
	private model: string;

	constructor(apiKey: string, model?: string | null) {
		this.client = new Anthropic({ apiKey });
		this.model = model ?? "claude-haiku-4-5-20251001";
	}

	async classify(
		email: EmailInput,
		systemPrompt: string,
	): Promise<ClassificationResult> {
		const body = email.bodyPlain.slice(0, CLASSIFY_BODY_LIMIT);

		const userMessage = [
			`Subject: ${email.subject}`,
			`From: ${email.fromName} <${email.fromAddress}>`,
			`Preview: ${email.snippet}`,
			"",
			"Body:",
			body,
		].join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 512,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: userMessage }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		const result = ClassificationSchema.parse(parsed);

		return {
			category: result.category,
			priorityScore: result.priorityScore,
			summary: result.summary,
			shouldTriage: result.shouldTriage,
			triageReason: result.triageReason ?? undefined,
			shouldAutoHandle: result.shouldAutoHandle,
			autoHandleAction: result.autoHandleAction ?? undefined,
		};
	}

	async generateDraft(
		email: DraftInput,
		systemPrompt: string,
	): Promise<string> {
		const body = email.bodyPlain.slice(0, DRAFT_BODY_LIMIT);

		const userMessage = [
			`Subject: ${email.subject}`,
			`From: ${email.fromName} <${email.fromAddress}>`,
			`Summary: ${email.aiSummary}`,
			"",
			"Email body:",
			body,
		].join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 1024,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: userMessage }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		return text.trim();
	}

	async parseTaskInput(
		input: TaskParseInput,
		systemPrompt: string,
	): Promise<TaskParseResult> {
		const today = new Date().toISOString().split("T")[0];
		const dayName = new Date().toLocaleDateString("en-US", {
			weekday: "long",
		});

		const userMessage = [
			`Today is ${dayName}, ${today}.`,
			input.projectNames.length > 0
				? `Known projects: ${input.projectNames.join(", ")}`
				: "",
			"",
			`Input: ${input.input}`,
		]
			.filter(Boolean)
			.join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 256,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: userMessage }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		return TaskParseSchema.parse(parsed);
	}

	async summarizeWork(
		input: WorkSummaryInput,
		systemPrompt: string,
	): Promise<WorkSummaryResult> {
		const lines = [
			`Period: last ${input.periodDays} days`,
			`Tasks completed: ${input.completedCount}`,
			`Tasks created: ${input.createdCount}`,
			`Currently overdue: ${input.overdueCount}`,
			`Completion streak: ${input.streak} day${input.streak !== 1 ? "s" : ""}`,
		];

		if (input.topProjects.length > 0) {
			lines.push(
				`Top projects: ${input.topProjects.map((p) => `${p.name} (${p.completed} done)`).join(", ")}`,
			);
		}

		if (input.completedTitles.length > 0) {
			const titles = input.completedTitles.slice(0, 15);
			lines.push("", "Completed tasks:", ...titles.map((t) => `- ${t}`));
		}

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 512,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: lines.join("\n") }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		const result = WorkSummarySchema.parse(parsed);
		return result;
	}
	async categorizeTask(
		input: TaskCategorizeInput,
		systemPrompt: string,
	): Promise<TaskCategorizeResult> {
		if (input.projects.length === 0) {
			return { projectId: null, confidence: 0 };
		}

		const lines = [
			`Task title: ${input.title}`,
			input.description
				? `Description: ${input.description.slice(0, 500)}`
				: "",
			"",
			"Projects:",
			...input.projects.map((p) => `- ${p.id}: ${p.name}`),
		]
			.filter(Boolean)
			.join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 128,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: lines }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		const result = TaskCategorizeSchema.parse(parsed);

		// Validate that returned projectId actually exists in input
		if (
			result.projectId &&
			!input.projects.some((p) => p.id === result.projectId)
		) {
			return { projectId: null, confidence: 0 };
		}

		return result;
	}

	async matchEmailToTasks(
		input: EmailTaskMatchInput,
		systemPrompt: string,
	): Promise<EmailTaskMatchResult> {
		if (input.tasks.length === 0) {
			return { matches: [] };
		}

		const lines = [
			`Email subject: ${input.emailSubject}`,
			`From: ${input.emailFrom}`,
			`Preview: ${input.emailSnippet}`,
			"",
			"Open tasks:",
			...input.tasks.map((t) => `- ${t.id}: ${t.title}`),
		].join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 256,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: lines }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		const result = EmailTaskMatchSchema.parse(parsed);

		// Validate taskIds exist in input and filter by confidence
		return {
			matches: result.matches.filter(
				(m) =>
					m.confidence >= 0.6 && input.tasks.some((t) => t.id === m.taskId),
			),
		};
	}
	async extractCommitments(
		input: CommitmentExtractInput,
		systemPrompt: string,
	): Promise<CommitmentExtractResult> {
		const body = input.bodyPlain.slice(0, CLASSIFY_BODY_LIMIT);

		const today = new Date().toISOString().split("T")[0];
		const dayName = new Date().toLocaleDateString("en-US", {
			weekday: "long",
		});

		const lines = [
			`Today is ${dayName}, ${today}.`,
			`Subject: ${input.subject}`,
			`From: ${input.fromAddress}`,
			`To: ${input.toAddresses.join(", ")}`,
			"",
			"Email body:",
			body,
		].join("\n");

		const response = await this.client.messages.create({
			model: this.model,
			max_tokens: 512,
			system: [
				{
					type: "text",
					text: systemPrompt,
					cache_control: { type: "ephemeral" },
				},
			],
			messages: [{ role: "user", content: lines }],
		});

		const text =
			response.content[0]?.type === "text" ? response.content[0].text : "";

		const parsed = parseJsonResponse(text);
		const result = CommitmentExtractSchema.parse(parsed);

		return {
			commitments: result.commitments.filter((c) => c.confidence >= 0.7),
		};
	}
}

const CommitmentExtractSchema = z.object({
	commitments: z.array(
		z.object({
			text: z.string(),
			deadline: z.string().nullable(),
			confidence: z.number().min(0).max(1),
			recipientEmail: z.string().nullable(),
		}),
	),
});

const EmailTaskMatchSchema = z.object({
	matches: z.array(
		z.object({
			taskId: z.string(),
			confidence: z.number().min(0).max(1),
			reason: z.string(),
		}),
	),
});

const TaskCategorizeSchema = z.object({
	projectId: z.string().nullable(),
	confidence: z.number().min(0).max(1),
});

const WorkSummarySchema = z.object({
	summary: z.string(),
	highlights: z.array(z.string()),
});

function parseJsonResponse(text: string): unknown {
	// Try direct parse first
	try {
		return JSON.parse(text);
	} catch {
		// Try extracting JSON from markdown code block
		const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (match?.[1]) {
			return JSON.parse(match[1].trim());
		}
		throw new Error(
			`Failed to parse AI response as JSON: ${text.slice(0, 200)}`,
		);
	}
}
