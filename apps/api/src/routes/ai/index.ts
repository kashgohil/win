import { Elysia } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	briefingResponse,
	completeComposeBody,
	completeComposeResponse,
	draftBody,
	draftResponse,
	errorResponse,
	summarizeBody,
	summarizeResponse,
} from "./responses";
import { aiService } from "./service";

export const aiRoutes = new Elysia({
	name: "ai",
	prefix: "/ai",
})
	.use(betterAuthPlugin)

	/* ── Daily briefing ── */

	.get(
		"/briefing",
		async ({ user, set }) => {
			const result = await aiService.getDailyBriefing(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: briefingResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["AI"],
				summary: "Get daily briefing with AI summary",
			},
		},
	)

	/* ── Summarize thread ── */

	.post(
		"/summarize",
		async ({ body, set }) => {
			const result = await aiService.summarizeThread(body.messages);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { summary: result.data };
		},
		{
			auth: true,
			body: summarizeBody,
			response: {
				200: summarizeResponse,
				500: errorResponse,
				503: errorResponse,
			},
			detail: {
				tags: ["AI"],
				summary: "Summarize an email thread",
			},
		},
	)

	/* ── Complete compose ── */

	.post(
		"/complete-compose",
		async ({ body, set }) => {
			const result = await aiService.completeCompose(
				body.body,
				body.subject,
				body.recipient,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { suggestion: result.data };
		},
		{
			auth: true,
			body: completeComposeBody,
			response: {
				200: completeComposeResponse,
				500: errorResponse,
				503: errorResponse,
			},
			detail: {
				tags: ["AI"],
				summary: "Get AI completion suggestion for email compose",
			},
		},
	)

	/* ── Generate draft reply ── */

	.post(
		"/draft",
		async ({ body, set }) => {
			const result = await aiService.generateDraft(body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { draft: result.data };
		},
		{
			auth: true,
			body: draftBody,
			response: {
				200: draftResponse,
				500: errorResponse,
				503: errorResponse,
			},
			detail: {
				tags: ["AI"],
				summary: "Generate a draft reply to an email",
			},
		},
	);
