import {
	and,
	calendarAccounts,
	calendarEvents,
	db,
	emails,
	eq,
	gte,
	lt,
	lte,
	sql,
	tasks,
} from "@wingmnn/db";
import {
	DRAFT_SYSTEM_PROMPT,
	THREAD_SUMMARY_SYSTEM_PROMPT,
	getAiProvider,
} from "@wingmnn/queue";

const BODY_LIMIT = 3000;

interface ThreadMessage {
	from: string;
	body: string;
	date?: string;
}

interface DraftInput {
	subject: string;
	fromAddress: string;
	fromName: string;
	snippet: string;
	bodyPlain: string;
	toAddresses: string[];
	aiSummary?: string;
}

export const aiService = {
	async summarizeThread(
		messages: ThreadMessage[],
	): Promise<
		{ ok: true; data: string } | { ok: false; error: string; status: number }
	> {
		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not configured", status: 503 };
		}

		const formatted = messages
			.map((m) => {
				const date = m.date ? ` (${m.date})` : "";
				const body = m.body.slice(0, BODY_LIMIT);
				return `From: ${m.from}${date}\n${body}`;
			})
			.join("\n---\n");

		try {
			const summary = await provider.complete(
				THREAD_SUMMARY_SYSTEM_PROMPT,
				formatted,
			);
			return { ok: true, data: summary };
		} catch (err) {
			console.error(
				"[ai] Thread summarization failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
			return { ok: false, error: "AI summarization failed", status: 500 };
		}
	},

	async getDailyBriefing(userId: string): Promise<
		| {
				ok: true;
				data: {
					events: { time: string; title: string; detail: string | null }[];
					overdueTasks: { id: string; title: string }[];
					todayTasks: { id: string; title: string }[];
					unreadCount: number;
					triageCount: number;
					aiSummary: string | null;
				};
		  }
		| { ok: false; error: string; status: number }
	> {
		const now = new Date();
		const todayStart = new Date(now);
		todayStart.setHours(0, 0, 0, 0);
		const todayEnd = new Date(now);
		todayEnd.setHours(23, 59, 59, 999);

		try {
			// Parallel queries for all briefing data
			const [events, overdueTasks, todayTasks, unreadResult, triageResult] =
				await Promise.all([
					// Today's calendar events
					db
						.select({
							title: calendarEvents.title,
							startTime: calendarEvents.startTime,
							endTime: calendarEvents.endTime,
							location: calendarEvents.location,
						})
						.from(calendarEvents)
						.innerJoin(
							calendarAccounts,
							eq(calendarEvents.calendarAccountId, calendarAccounts.id),
						)
						.where(
							and(
								eq(calendarAccounts.userId, userId),
								gte(calendarEvents.startTime, todayStart),
								lt(calendarEvents.startTime, todayEnd),
							),
						)
						.orderBy(calendarEvents.startTime)
						.limit(10),

					// Overdue tasks
					db
						.select({
							id: tasks.id,
							title: tasks.title,
						})
						.from(tasks)
						.where(
							and(
								eq(tasks.userId, userId),
								lt(tasks.dueAt, now),
								sql`${tasks.completedAt} IS NULL`,
							),
						)
						.limit(5),

					// Today's tasks (due today)
					db
						.select({
							id: tasks.id,
							title: tasks.title,
						})
						.from(tasks)
						.where(
							and(
								eq(tasks.userId, userId),
								gte(tasks.dueAt, todayStart),
								lte(tasks.dueAt, todayEnd),
								sql`${tasks.completedAt} IS NULL`,
							),
						)
						.limit(10),

					// Unread email count
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(emails)
						.where(and(eq(emails.userId, userId), eq(emails.isRead, false))),

					// Triage count (pending items)
					db
						.select({ count: sql<number>`count(*)::int` })
						.from(emails)
						.where(
							and(
								eq(emails.userId, userId),
								eq(emails.triageStatus, "pending"),
							),
						),
				]);

			const formattedEvents = events.map((e) => {
				const start = new Date(e.startTime);
				const end = e.endTime ? new Date(e.endTime) : null;
				const time = start.toLocaleTimeString("en-US", {
					hour: "numeric",
					minute: "2-digit",
					hour12: true,
				});
				const duration = end
					? `${Math.round((end.getTime() - start.getTime()) / 60000)} min`
					: null;
				const detail = [duration, e.location].filter(Boolean).join(" · ");
				return { time, title: e.title ?? "(untitled)", detail: detail || null };
			});

			const unreadCount = unreadResult[0]?.count ?? 0;
			const triageCount = triageResult[0]?.count ?? 0;

			// Generate AI summary if provider is available
			let aiSummary: string | null = null;
			const provider = getAiProvider();
			if (
				provider &&
				(formattedEvents.length > 0 ||
					overdueTasks.length > 0 ||
					unreadCount > 0)
			) {
				try {
					const lines = [
						`Today's date: ${now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}`,
						`Meetings today: ${formattedEvents.length}`,
						...formattedEvents.map(
							(e) =>
								`  - ${e.time}: ${e.title}${e.detail ? ` (${e.detail})` : ""}`,
						),
						`Overdue tasks: ${overdueTasks.length}`,
						...overdueTasks.map((t) => `  - ${t.title}`),
						`Tasks due today: ${todayTasks.length}`,
						...todayTasks.map((t) => `  - ${t.title}`),
						`Unread emails: ${unreadCount}`,
						`Emails needing attention: ${triageCount}`,
					].join("\n");

					aiSummary = await provider.complete(DAILY_BRIEFING_PROMPT, lines);
				} catch (err) {
					console.error(
						"[ai] Daily briefing failed:",
						err instanceof Error ? err.message : "Unknown error",
					);
				}
			}

			return {
				ok: true,
				data: {
					events: formattedEvents,
					overdueTasks,
					todayTasks,
					unreadCount,
					triageCount,
					aiSummary,
				},
			};
		} catch (err) {
			console.error(
				"[ai] Briefing data fetch failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
			return { ok: false, error: "Failed to fetch briefing data", status: 500 };
		}
	},

	async completeCompose(
		body: string,
		subject?: string,
		recipient?: string,
	): Promise<
		{ ok: true; data: string } | { ok: false; error: string; status: number }
	> {
		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not configured", status: 503 };
		}

		const context = [
			subject ? `Subject: ${subject}` : null,
			recipient ? `To: ${recipient}` : null,
		]
			.filter(Boolean)
			.join("\n");

		const userMessage = context ? `${context}\n\nEmail so far:\n${body}` : body;

		try {
			const suggestion = await provider.complete(
				COMPOSE_COMPLETE_PROMPT,
				userMessage,
			);
			return { ok: true, data: suggestion };
		} catch (err) {
			console.error(
				"[ai] Compose completion failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
			return { ok: false, error: "AI completion failed", status: 500 };
		}
	},

	async generateDraft(
		input: DraftInput,
	): Promise<
		{ ok: true; data: string } | { ok: false; error: string; status: number }
	> {
		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not configured", status: 503 };
		}

		try {
			const draft = await provider.generateDraft(
				{
					subject: input.subject,
					fromAddress: input.fromAddress,
					fromName: input.fromName,
					snippet: input.snippet,
					bodyPlain: input.bodyPlain,
					toAddresses: input.toAddresses,
					aiSummary: input.aiSummary ?? input.snippet,
				},
				DRAFT_SYSTEM_PROMPT,
			);
			return { ok: true, data: draft };
		} catch (err) {
			console.error(
				"[ai] Draft generation failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
			return { ok: false, error: "AI draft generation failed", status: 500 };
		}
	},

	async enhanceText(
		text: string,
		action: string,
		language?: string,
		context?: string,
	): Promise<
		{ ok: true; data: string } | { ok: false; error: string; status: number }
	> {
		const provider = getAiProvider();
		if (!provider) {
			return { ok: false, error: "AI provider not configured", status: 503 };
		}

		const prompt = ENHANCE_PROMPTS[action];
		if (!prompt) {
			return { ok: false, error: "Unknown enhancement action", status: 400 };
		}

		const userMessage = [
			context ? `Context: ${context}` : null,
			action === "translate" && language ? `Target language: ${language}` : null,
			`Text:\n${text.slice(0, BODY_LIMIT)}`,
		]
			.filter(Boolean)
			.join("\n");

		try {
			const result = await provider.complete(prompt, userMessage);
			return { ok: true, data: result };
		} catch (err) {
			console.error(
				"[ai] Text enhancement failed:",
				err instanceof Error ? err.message : "Unknown error",
			);
			return { ok: false, error: "AI enhancement failed", status: 500 };
		}
	},
};

const ENHANCE_BASE = `You are an email writing assistant. Rewrite the given text according to the instructions below.

## Rules
- Output ONLY the rewritten text — no quotes, no labels, no explanation
- Preserve the original meaning and key information
- If the text contains HTML tags, preserve the HTML structure
- Keep the same general length unless the action requires changing it`;

const ENHANCE_PROMPTS: Record<string, string> = {
	"more-formal": `${ENHANCE_BASE}

## Action: Make more formal
- Use professional language and tone
- Remove colloquialisms and casual phrasing
- Use complete sentences and proper structure`,

	"more-friendly": `${ENHANCE_BASE}

## Action: Make more friendly
- Use warm, conversational tone
- Add personal touches where appropriate
- Keep it professional but approachable`,

	"more-concise": `${ENHANCE_BASE}

## Action: Make more concise
- Cut unnecessary words and filler
- Get to the point quickly
- Reduce length by roughly 30-50%`,

	"more-detailed": `${ENHANCE_BASE}

## Action: Make more detailed
- Expand on key points
- Add specifics and elaboration
- Increase length by roughly 30-50%`,

	"fix-grammar": `${ENHANCE_BASE}

## Action: Fix grammar and spelling
- Correct grammatical errors, spelling mistakes, and punctuation
- Do NOT change the tone, style, or meaning
- Make minimal changes — only fix what's wrong`,

	"improve-clarity": `${ENHANCE_BASE}

## Action: Improve clarity
- Restructure for better readability
- Break up long sentences
- Make the message easier to understand`,

	"translate": `${ENHANCE_BASE}

## Action: Translate
- Translate the text to the target language specified
- Preserve tone and formality level
- If no target language is specified, translate to English`,

	"shorten": `${ENHANCE_BASE}

## Action: Shorten aggressively
- Cut to roughly half the original length
- Keep only the essential message
- Remove pleasantries and filler`,

	"expand": `${ENHANCE_BASE}

## Action: Expand
- Flesh out the message with more detail
- Add appropriate context and transitions
- Roughly double the length while keeping it natural`,
};

const COMPOSE_COMPLETE_PROMPT = `You are an email writing assistant. Continue the user's email naturally.

## Rules

- Output ONLY the suggested continuation text — no quotes, no labels, no explanation
- Write 1-2 sentences max
- Match the tone and formality of what's already written
- Don't repeat what's already written
- If the email seems complete, return an empty string
- Keep it concise and natural`;

const DAILY_BRIEFING_PROMPT = `You are a personal productivity assistant. Generate a brief, natural morning briefing based on the user's schedule and task data.

## Guidelines

- Write 2-3 sentences max
- Be specific — reference actual meeting names and task titles
- Mention overdue tasks gently but clearly
- Note the shape of the day (busy, light, focused)
- Warm, professional tone — like a chief of staff giving a morning summary
- Do NOT use bullet points or markdown — just plain text

## Output

Return ONLY the briefing text, no JSON wrapping.`;
