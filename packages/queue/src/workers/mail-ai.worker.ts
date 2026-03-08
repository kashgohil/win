import {
	and,
	db,
	emails,
	eq,
	inArray,
	isNull,
	mailSenderRules,
	notifications,
	sql,
	tasks,
} from "@wingmnn/db";
import { Worker } from "bullmq";
import { getAiEnv } from "../ai/env";
import { getAiProvider } from "../ai/factory";
import {
	CLASSIFY_SYSTEM_PROMPT,
	DRAFT_SYSTEM_PROMPT,
	EMAIL_TASK_MATCH_SYSTEM_PROMPT,
} from "../ai/prompts";
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
			shouldTriage: false,
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
	userId?: string,
): Promise<ClassificationResult> {
	// 0. Check user-defined sender rules (highest priority)
	if (userId && email.fromAddress) {
		const senderRule = await db.query.mailSenderRules.findFirst({
			where: and(
				eq(mailSenderRules.userId, userId),
				sql`${mailSenderRules.senderAddress} = lower(${email.fromAddress})`,
			),
		});
		if (senderRule) {
			console.log(
				`[mail-ai] Sender rule matched "${email.fromAddress}" → ${senderRule.category}`,
			);
			return {
				category: senderRule.category,
				priorityScore: senderRule.category === "urgent" ? 90 : 30,
				summary: `Categorized by sender rule`,
				shouldTriage: false,
				shouldAutoHandle: false,
			};
		}
	}

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
				result: await classifyEmail(email, aiProvider, userId),
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
			await db
				.update(emails)
				.set({
					triageStatus: "pending",
					triageReason: result.triageReason ?? result.summary,
				})
				.where(eq(emails.id, email.id));

			try {
				await enqueueDraftResponse(email.id, userId);
			} catch (err) {
				console.error(
					`[mail-ai] Failed to enqueue draft-response for email ${email.id}:`,
					err,
				);
			}
		}

		// Try email-task matching for actionable emails
		if (result.category === "urgent" || result.category === "actionable") {
			await matchEmailToTasks(email, userId, aiProvider);
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

// ── Match email to tasks ──

async function matchEmailToTasks(
	email: {
		id: string;
		subject: string | null;
		snippet: string | null;
		fromAddress: string | null;
		fromName: string | null;
	},
	userId: string,
	aiProvider: AiProvider | null,
): Promise<void> {
	if (!aiProvider) return;

	// Get user's open tasks (limit to 30 for token efficiency)
	const openTasks = await db
		.select({ id: tasks.id, title: tasks.title })
		.from(tasks)
		.where(and(eq(tasks.userId, userId), isNull(tasks.completedAt)))
		.limit(30);

	if (openTasks.length === 0) return;

	try {
		const result = await aiProvider.matchEmailToTasks(
			{
				emailSubject: email.subject ?? "",
				emailSnippet: email.snippet ?? "",
				emailFrom: `${email.fromName ?? ""} <${email.fromAddress ?? ""}>`,
				tasks: openTasks,
			},
			EMAIL_TASK_MATCH_SYSTEM_PROMPT,
		);

		if (result.matches.length > 0) {
			// Take the highest confidence match
			const best = result.matches.sort(
				(a, b) => b.confidence - a.confidence,
			)[0];
			if (best && best.confidence >= 0.7) {
				await db
					.update(emails)
					.set({
						relatedTaskId: best.taskId,
						relatedTaskReason: best.reason,
					})
					.where(eq(emails.id, email.id));

				// Create proactive alert notification
				const matchedTask = openTasks.find((t) => t.id === best.taskId);
				if (matchedTask) {
					await db.insert(notifications).values({
						userId,
						type: "task_reminder" as const,
						title: `Email related to: ${matchedTask.title}`,
						body: `"${email.subject ?? "(no subject)"}" from ${email.fromName ?? email.fromAddress ?? "unknown"} — ${best.reason}`,
						link: `/module/task/list?taskId=${best.taskId}`,
						taskId: best.taskId,
					});
				}

				console.log(
					`[mail-ai] Linked email "${email.subject}" to task ${best.taskId} (confidence: ${best.confidence})`,
				);
			}
		}
	} catch (err) {
		console.error(
			`[mail-ai] Email-task matching failed for "${email.subject}":`,
			err instanceof Error ? err.message : "Unknown error",
		);
	}
}

// ── Process draft response ──

async function processDraftResponse(
	emailId: string,
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
		.update(emails)
		.set({
			draftResponse: draft,
			triageReason: "Reply drafted — needs your review before sending",
		})
		.where(eq(emails.id, emailId));
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
					await processDraftResponse(job.data.emailId, job.data.userId);
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
