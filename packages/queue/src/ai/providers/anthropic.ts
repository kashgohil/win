import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type {
	AiProvider,
	ClassificationResult,
	DraftInput,
	EmailInput,
} from "../types";

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
}

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
