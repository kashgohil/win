import { Elysia, redirect, t } from "elysia";
import { env } from "../../env";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	accountListResponse,
	composeBody,
	connectResponse,
	disconnectResponse,
	emailDetailResponse,
	emailListResponse,
	errorResponse,
	forwardBody,
	messageResponse,
	moduleDataResponse,
	toggleReadResponse,
	toggleStarResponse,
	triageActionBody,
	triageActionResponse,
} from "./responses";
import { mailService } from "./service";

export const mail = new Elysia({
	name: "mail",
	prefix: "/mail",
})
	.use(betterAuthPlugin)
	.get(
		"/accounts/callback/gmail",
		async ({ query }) => {
			const clientUrl = `${env.CLIENT_URL}/module/mail`;

			if (query.error) {
				return redirect(
					`${clientUrl}?error=${encodeURIComponent(query.error)}`,
				);
			}

			if (!query.code || !query.state) {
				return redirect(`${clientUrl}?error=missing_params`);
			}

			const result = await mailService.handleOAuthCallback(
				query.code,
				query.state,
			);

			if (!result.ok) {
				return redirect(
					`${clientUrl}?error=${encodeURIComponent(result.error)}`,
				);
			}

			return redirect(`${clientUrl}?connected=true`);
		},
		{
			query: t.Object({
				code: t.Optional(t.String()),
				state: t.Optional(t.String()),
				error: t.Optional(t.String()),
			}),
			detail: {
				summary: "Gmail OAuth callback",
				description: "Handles the redirect from Google after OAuth consent",
				tags: ["Mail"],
			},
		},
	)
	.get(
		"/data",
		async ({ user, set }) => {
			const result = await mailService.getModuleData(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			response: {
				200: moduleDataResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Get mail module data",
				description:
					"Returns briefing stats, triage items, and auto-handled items for the mail module",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/emails",
		async ({ user, query, set }) => {
			const result = await mailService.getEmails(user.id, {
				limit: query.limit ? Number(query.limit) : undefined,
				offset: query.offset ? Number(query.offset) : undefined,
				category: query.category ?? undefined,
				unreadOnly: query.unreadOnly === "true",
				readOnly: query.readOnly === "true",
			});

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
				category: t.Optional(t.String()),
				unreadOnly: t.Optional(t.String()),
				readOnly: t.Optional(t.String()),
			}),
			response: {
				200: emailListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List emails",
				description:
					"Returns paginated list of emails with optional category filter",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/emails/:id",
		async ({ user, params, set }) => {
			const result = await mailService.getEmailDetail(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { email: result.data };
		},
		{
			auth: true,
			response: {
				200: emailDetailResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Get email detail",
				description: "Returns full email including body content",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/accounts",
		async ({ user, set }) => {
			const result = await mailService.getAccounts(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { accounts: result.data };
		},
		{
			auth: true,
			response: {
				200: accountListResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List email accounts",
				description: "Returns all connected email accounts",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/link/:provider",
		async ({ user, params, set }) => {
			const result = await mailService.connectAccount(user.id, params.provider);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { url: result.url };
		},
		{
			auth: true,
			response: {
				200: connectResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Connect email account",
				description: "Returns OAuth URL to connect a Gmail or Outlook account",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/accounts/:id",
		async ({ user, params, set }) => {
			const result = await mailService.disconnectAccount(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			response: {
				200: disconnectResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Disconnect email account",
				description:
					"Disconnects and removes an email account and all associated data",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/emails/:id/star",
		async ({ user, params, set }) => {
			const result = await mailService.toggleStar(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			response: {
				200: toggleStarResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Toggle email star",
				description: "Toggles the starred status of an email",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/emails/:id/read",
		async ({ user, params, set }) => {
			const result = await mailService.toggleRead(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			response: {
				200: toggleReadResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Toggle email read status",
				description: "Toggles the read/unread status of an email",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/emails/:id/archive",
		async ({ user, params, set }) => {
			const result = await mailService.archiveEmail(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Archive email",
				description: "Archives an email and removes it from the inbox",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/emails/:id",
		async ({ user, params, set }) => {
			const result = await mailService.deleteEmail(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Delete email",
				description: "Moves an email to trash",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/emails/:id/reply",
		async ({ user, params, body, set }) => {
			const result = await mailService.replyToEmail(
				user.id,
				params.id,
				body.body,
				body.cc,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			body: composeBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Reply to email",
				description: "Sends a reply to the email sender",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/emails/:id/forward",
		async ({ user, params, body, set }) => {
			const result = await mailService.forwardEmail(
				user.id,
				params.id,
				body.to,
				body.body,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			body: forwardBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Forward email",
				description: "Forwards the email to specified recipients",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/triage/:id/action",
		async ({ user, params, body, set }) => {
			const result = await mailService.executeTriageAction(
				user.id,
				params.id,
				body.action,
				body.snoozeDuration,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { message: result.message };
		},
		{
			auth: true,
			body: triageActionBody,
			response: {
				200: triageActionResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Execute triage action",
				description:
					"Perform an action on a triage item (send draft, dismiss, archive, snooze)",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	);
