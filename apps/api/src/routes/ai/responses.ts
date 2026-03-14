import { t } from "elysia";

export const summarizeBody = t.Object({
	messages: t.Array(
		t.Object({
			from: t.String(),
			body: t.String(),
			date: t.Optional(t.String()),
		}),
		{ minItems: 1 },
	),
});

export const summarizeResponse = t.Object({
	summary: t.String(),
});

export const draftBody = t.Object({
	subject: t.String(),
	fromAddress: t.String(),
	fromName: t.String(),
	snippet: t.String(),
	bodyPlain: t.String(),
	toAddresses: t.Array(t.String()),
	aiSummary: t.Optional(t.String()),
});

export const draftResponse = t.Object({
	draft: t.String(),
});

export const briefingResponse = t.Object({
	events: t.Array(
		t.Object({
			time: t.String(),
			title: t.String(),
			detail: t.Nullable(t.String()),
		}),
	),
	overdueTasks: t.Array(
		t.Object({
			id: t.String(),
			title: t.String(),
		}),
	),
	todayTasks: t.Array(
		t.Object({
			id: t.String(),
			title: t.String(),
		}),
	),
	unreadCount: t.Number(),
	triageCount: t.Number(),
	aiSummary: t.Nullable(t.String()),
});

export const completeComposeBody = t.Object({
	body: t.String({ minLength: 10 }),
	subject: t.Optional(t.String()),
	recipient: t.Optional(t.String()),
});

export const completeComposeResponse = t.Object({
	suggestion: t.String(),
});

export const enhanceBody = t.Object({
	text: t.String({ minLength: 1 }),
	action: t.Union([
		t.Literal("more-formal"),
		t.Literal("more-friendly"),
		t.Literal("more-concise"),
		t.Literal("more-detailed"),
		t.Literal("fix-grammar"),
		t.Literal("improve-clarity"),
		t.Literal("translate"),
		t.Literal("shorten"),
		t.Literal("expand"),
	]),
	language: t.Optional(t.String()),
	context: t.Optional(t.String()),
});

export const enhanceResponse = t.Object({
	result: t.String(),
});

export const errorResponse = t.Object({
	error: t.String(),
});
