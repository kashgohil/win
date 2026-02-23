import { db, emails, eq, inArray, mailTriageItems } from "@wingmnn/db";
import { Worker } from "bullmq";
import { getAiEnv } from "../ai/env";
import { getAiProvider } from "../ai/factory";
import { CLASSIFY_SYSTEM_PROMPT, DRAFT_SYSTEM_PROMPT } from "../ai/prompts";
import { classifyByRules } from "../ai/rules";
import type {
	AiProvider,
	ClassificationResult,
	DraftInput,
	EmailInput,
} from "../ai/types";
import { connection } from "../connection";
import type { MailAiJobData } from "../jobs/mail-ai";
import { enqueueDraftResponse } from "../jobs/mail-ai";
import { enqueueAutoHandle } from "../jobs/mail-autohandle";

// ── Stub fallbacks (keyword-based, never fails) ──

function stubClassify(email: {
	subject: string | null;
	fromAddress: string | null;
	snippet: string | null;
}): ClassificationResult {
	const subject = (email.subject ?? "").toLowerCase();
	const from = (email.fromAddress ?? "").toLowerCase();

	if (subject.includes("unsubscribe") || from.includes("newsletter")) {
		return {
			category: "newsletter",
			priorityScore: 10,
			summary: "Newsletter email",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "archived",
		};
	}

	if (subject.includes("receipt") || subject.includes("order confirmation")) {
		return {
			category: "receipt",
			priorityScore: 15,
			summary: "Purchase receipt",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "labeled",
		};
	}

	if (subject.includes("confirm") || subject.includes("rsvp")) {
		return {
			category: "confirmation",
			priorityScore: 20,
			summary: "Confirmation email",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "labeled",
		};
	}

	if (
		subject.includes("sale") ||
		subject.includes("% off") ||
		subject.includes("promo")
	) {
		return {
			category: "promotional",
			priorityScore: 5,
			summary: "Promotional email",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "archived",
		};
	}

	if (
		subject.includes("urgent") ||
		subject.includes("asap") ||
		subject.includes("contract")
	) {
		return {
			category: "urgent",
			priorityScore: 90,
			summary: "Urgent email requiring attention",
			shouldTriage: true,
			shouldAutoHandle: false,
		};
	}

	return {
		category: "informational",
		priorityScore: 50,
		summary: "General email",
		shouldTriage: false,
		shouldAutoHandle: false,
	};
}

function stubGenerateDraft(email: {
	subject: string | null;
	fromName: string | null;
	fromAddress: string | null;
	snippet: string | null;
}): string {
	const senderName =
		email.fromName ?? email.fromAddress?.split("@")[0] ?? "there";
	const subject = (email.subject ?? "").toLowerCase();

	if (subject.includes("meeting") || subject.includes("schedule")) {
		return `Hi ${senderName},\n\nThank you for reaching out about scheduling. I've reviewed the details and will confirm my availability shortly.\n\nBest regards`;
	}

	if (subject.includes("contract") || subject.includes("agreement")) {
		return `Hi ${senderName},\n\nThank you for sending this over. I'll review the contract details carefully and get back to you with any questions or my confirmation.\n\nBest regards`;
	}

	if (subject.includes("invoice") || subject.includes("payment")) {
		return `Hi ${senderName},\n\nThank you for the invoice. I'll review the details and process it accordingly. I'll reach out if I have any questions.\n\nBest regards`;
	}

	if (
		subject.includes("urgent") ||
		subject.includes("asap") ||
		subject.includes("immediately")
	) {
		return `Hi ${senderName},\n\nThank you for flagging this. I'm looking into it now and will follow up with you shortly.\n\nBest regards`;
	}

	if (subject.includes("proposal") || subject.includes("quote")) {
		return `Hi ${senderName},\n\nThank you for the proposal. I'll review the details and get back to you with my thoughts.\n\nBest regards`;
	}

	if (subject.includes("question") || subject.includes("help")) {
		return `Hi ${senderName},\n\nThank you for reaching out. I've noted your question and will provide a detailed response shortly.\n\nBest regards`;
	}

	return `Hi ${senderName},\n\nThank you for your email regarding "${email.subject ?? "your message"}". I'll review this and get back to you shortly.\n\nBest regards`;
}

// ── Helpers ──

function toEmailInput(email: {
	subject: string | null;
	fromAddress: string | null;
	fromName: string | null;
	snippet: string | null;
	bodyPlain: string | null;
}): EmailInput {
	return {
		subject: email.subject ?? "",
		fromAddress: email.fromAddress ?? "",
		fromName: email.fromName ?? "",
		snippet: email.snippet ?? "",
		bodyPlain: email.bodyPlain ?? "",
	};
}

async function classifyEmail(
	email: {
		subject: string | null;
		fromAddress: string | null;
		fromName: string | null;
		snippet: string | null;
		bodyPlain: string | null;
	},
	aiProvider: AiProvider | null,
): Promise<ClassificationResult> {
	const input = toEmailInput(email);

	// 1. Try keyword rules first (free, instant)
	const rulesResult = classifyByRules(input);
	if (rulesResult) {
		console.log(
			`[mail-ai] Rules engine classified "${email.subject}" as ${rulesResult.category}`,
		);
		return rulesResult;
	}

	// 2. Try AI provider
	if (aiProvider) {
		try {
			const aiResult = await aiProvider.classify(input, CLASSIFY_SYSTEM_PROMPT);
			console.log(
				`[mail-ai] AI classified "${email.subject}" as ${aiResult.category} (score: ${aiResult.priorityScore})`,
			);
			return aiResult;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(
				`[mail-ai] AI classification failed for "${email.subject}", falling back to stub:`,
				message,
			);
		}
	}

	// 3. Stub fallback (always succeeds)
	return stubClassify(email);
}

// ── Process classify batch ──

async function processClassify(
	emailIds: string[],
	userId: string,
): Promise<void> {
	if (emailIds.length === 0) return;

	const aiProvider = getAiProvider();
	const { maxConcurrency } = getAiEnv();

	const emailRows = await db.query.emails.findMany({
		where: inArray(emails.id, emailIds),
	});

	// Process with concurrency limit
	const results: {
		email: (typeof emailRows)[number];
		result: ClassificationResult;
	}[] = [];
	for (let i = 0; i < emailRows.length; i += maxConcurrency) {
		const batch = emailRows.slice(i, i + maxConcurrency);
		const batchResults = await Promise.all(
			batch.map(async (email) => ({
				email,
				result: await classifyEmail(email, aiProvider),
			})),
		);
		results.push(...batchResults);
	}

	for (const { email, result } of results) {
		await db
			.update(emails)
			.set({
				category: result.category,
				priorityScore: result.priorityScore,
				aiSummary: result.summary,
			})
			.where(eq(emails.id, email.id));

		if (result.shouldTriage) {
			const actions: {
				label: string;
				variant?: "default" | "outline" | "ghost";
			}[] = [
				{ label: "Reply", variant: "default" },
				{ label: "Archive", variant: "outline" },
				{ label: "Dismiss", variant: "ghost" },
			];

			const [triageItem] = await db
				.insert(mailTriageItems)
				.values({
					userId,
					emailId: email.id,
					title: email.subject ?? "No subject",
					subtitle: result.summary,
					urgent: result.category === "urgent",
					sourceModule: "mail",
					actions,
					status: "pending",
				})
				.returning();

			if (triageItem && result.category === "urgent") {
				try {
					await enqueueDraftResponse(email.id, triageItem.id, userId);
				} catch (err) {
					console.error(
						`[mail-ai] Failed to enqueue draft-response for email ${email.id}:`,
						err,
					);
				}
			}
		}

		if (result.shouldAutoHandle && result.autoHandleAction) {
			try {
				await enqueueAutoHandle({
					type: "auto-handle",
					emailId: email.id,
					userId,
					emailAccountId: email.emailAccountId,
					action: result.autoHandleAction,
					category: result.category,
				});
			} catch (err) {
				console.error(
					`[mail-ai] Failed to enqueue auto-handle for email ${email.id}:`,
					err,
				);
			}
		}
	}
}

// ── Process draft response ──

async function processDraftResponse(
	emailId: string,
	triageItemId: string,
	_userId: string,
): Promise<void> {
	const email = await db.query.emails.findFirst({
		where: eq(emails.id, emailId),
	});

	if (!email) return;

	let draft: string;

	const aiProvider = getAiProvider();
	if (aiProvider) {
		try {
			const draftInput: DraftInput = {
				subject: email.subject ?? "",
				fromAddress: email.fromAddress ?? "",
				fromName: email.fromName ?? "",
				snippet: email.snippet ?? "",
				bodyPlain: email.bodyPlain ?? "",
				toAddresses: email.toAddresses ?? [],
				aiSummary: email.aiSummary ?? "",
			};
			draft = await aiProvider.generateDraft(draftInput, DRAFT_SYSTEM_PROMPT);
			console.log(`[mail-ai] AI generated draft for "${email.subject}"`);
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(
				`[mail-ai] AI draft generation failed for "${email.subject}", falling back to stub:`,
				message,
			);
			draft = stubGenerateDraft(email);
		}
	} else {
		draft = stubGenerateDraft(email);
	}

	await db
		.update(mailTriageItems)
		.set({
			draftResponse: draft,
			subtitle: "Reply drafted — needs your review before sending",
		})
		.where(eq(mailTriageItems.id, triageItemId));
}

// ── Worker setup ──

export function createMailAiWorker() {
	const worker = new Worker<MailAiJobData>(
		"mail-ai",
		async (job) => {
			console.log(`[mail-ai] Processing job ${job.id}: ${job.data.type}`);

			switch (job.data.type) {
				case "classify":
					await processClassify(job.data.emailIds, job.data.userId);
					break;
				case "draft-response":
					await processDraftResponse(
						job.data.emailId,
						job.data.triageItemId,
						job.data.userId,
					);
					break;
			}
		},
		{ connection, concurrency: 2 },
	);

	worker.on("completed", (job) => {
		console.log(`[mail-ai] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[mail-ai] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
