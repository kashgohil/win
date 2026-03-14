import { Elysia, redirect, t } from "elysia";
import { env } from "../../env";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	accountListResponse,
	attachmentListResponse,
	composeBody,
	composeNewBody,
	connectResponse,
	createSenderRuleBody,
	createSenderRuleResponse,
	delayedComposeBody,
	delayedForwardBody,
	delayedSendResponse,
	disconnectResponse,
	draftListResponse,
	emailDetailResponse,
	emailListResponse,
	errorResponse,
	followUpListResponse,
	forwardBody,
	mergeThreadsBody,
	mergeThreadsResponse,
	messageResponse,
	moduleDataResponse,
	muteSenderBody,
	muteSenderResponse,
	senderListResponse,
	senderRuleListResponse,
	snoozeBody,
	threadDetailResponse,
	threadListResponse,
	toggleReadResponse,
	toggleStarResponse,
	triageActionBody,
	triageActionResponse,
	unsubscribeResponse,
	updateDraftBody,
	updateSignatureBody,
	vipSenderBody,
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
				"gmail",
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
		"/accounts/callback/outlook",
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
				"outlook",
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
				error_description: t.Optional(t.String()),
			}),
			detail: {
				summary: "Outlook OAuth callback",
				description: "Handles the redirect from Microsoft after OAuth consent",
				tags: ["Mail"],
			},
		},
	)
	.get(
		"/data",
		async ({ user, query, set }) => {
			const accountIds = query.accountIds
				? query.accountIds.split(",").filter(Boolean)
				: undefined;
			const result = await mailService.getModuleData(user.id, accountIds);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			query: t.Object({
				accountIds: t.Optional(t.String()),
			}),
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
				cursor: query.cursor ?? undefined,
				category: query.category ?? undefined,
				unreadOnly: query.unreadOnly === "true",
				readOnly: query.readOnly === "true",
				q: query.q ?? undefined,
				from: query.from ?? undefined,
				subject: query.subject ?? undefined,
				to: query.to ?? undefined,
				cc: query.cc ?? undefined,
				label: query.label ?? undefined,
				starred: query.starred === "true",
				attachment: query.attachment === "true",
				filename: query.filename ?? undefined,
				filetype: query.filetype ?? undefined,
				after: query.after ?? undefined,
				before: query.before ?? undefined,
				accountIds: query.accountIds
					? query.accountIds.split(",").filter(Boolean)
					: undefined,
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
				cursor: t.Optional(t.String()),
				category: t.Optional(t.String()),
				unreadOnly: t.Optional(t.String()),
				readOnly: t.Optional(t.String()),
				q: t.Optional(t.String()),
				from: t.Optional(t.String()),
				subject: t.Optional(t.String()),
				to: t.Optional(t.String()),
				cc: t.Optional(t.String()),
				label: t.Optional(t.String()),
				starred: t.Optional(t.String()),
				attachment: t.Optional(t.String()),
				filename: t.Optional(t.String()),
				filetype: t.Optional(t.String()),
				after: t.Optional(t.String()),
				before: t.Optional(t.String()),
				accountIds: t.Optional(t.String()),
			}),
			response: {
				200: emailListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List emails",
				description:
					"Returns paginated list of emails with optional category, search, and date filters",
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
	/* ── Thread routes ── */
	.get(
		"/threads",
		async ({ user, query, set }) => {
			const result = await mailService.getThreads(user.id, {
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor ?? undefined,
				category: query.category ?? undefined,
				unreadOnly: query.unreadOnly === "true",
				readOnly: query.readOnly === "true",
				q: query.q ?? undefined,
				from: query.from ?? undefined,
				subject: query.subject ?? undefined,
				to: query.to ?? undefined,
				cc: query.cc ?? undefined,
				label: query.label ?? undefined,
				starred: query.starred === "true",
				attachment: query.attachment === "true",
				filename: query.filename ?? undefined,
				filetype: query.filetype ?? undefined,
				after: query.after ?? undefined,
				before: query.before ?? undefined,
				accountIds: query.accountIds
					? query.accountIds.split(",").filter(Boolean)
					: undefined,
				sentOnly: query.sentOnly === "true",
				archivedOnly: query.archivedOnly === "true",
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
				cursor: t.Optional(t.String()),
				category: t.Optional(t.String()),
				unreadOnly: t.Optional(t.String()),
				readOnly: t.Optional(t.String()),
				q: t.Optional(t.String()),
				from: t.Optional(t.String()),
				subject: t.Optional(t.String()),
				to: t.Optional(t.String()),
				cc: t.Optional(t.String()),
				label: t.Optional(t.String()),
				starred: t.Optional(t.String()),
				attachment: t.Optional(t.String()),
				filename: t.Optional(t.String()),
				filetype: t.Optional(t.String()),
				after: t.Optional(t.String()),
				before: t.Optional(t.String()),
				accountIds: t.Optional(t.String()),
				sentOnly: t.Optional(t.String()),
				archivedOnly: t.Optional(t.String()),
			}),
			response: {
				200: threadListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List email threads",
				description:
					"Returns paginated list of email threads grouped by conversation",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/threads/:threadId",
		async ({ user, params, set }) => {
			const result = await mailService.getThreadDetail(
				user.id,
				params.threadId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			response: {
				200: threadDetailResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Get thread detail",
				description: "Returns all messages in a thread ordered chronologically",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/threads/:threadId/archive",
		async ({ user, params, set }) => {
			const result = await mailService.archiveThread(user.id, params.threadId);

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
				summary: "Archive thread",
				description: "Archives all emails in a thread",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/threads/:threadId",
		async ({ user, params, set }) => {
			const result = await mailService.deleteThread(user.id, params.threadId);

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
				summary: "Delete thread",
				description: "Trashes all emails in a thread",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/threads/:threadId/star",
		async ({ user, params, set }) => {
			const result = await mailService.toggleStarThread(
				user.id,
				params.threadId,
			);

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
				summary: "Toggle thread star",
				description: "Toggles starred status for all emails in a thread",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/threads/:threadId/read",
		async ({ user, params, set }) => {
			const result = await mailService.markThreadRead(user.id, params.threadId);

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
				summary: "Mark thread as read",
				description: "Marks all emails in a thread as read",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/threads/merge",
		async ({ user, body, set }) => {
			const result = await mailService.mergeThreads(user.id, body.threadIds);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { threadId: result.threadId };
		},
		{
			auth: true,
			body: mergeThreadsBody,
			response: {
				200: mergeThreadsResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Merge threads",
				description: "Combines multiple threads into a single conversation",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/threads/:threadId/unmerge",
		async ({ user, params, set }) => {
			const result = await mailService.unmergeThread(user.id, params.threadId);

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
				summary: "Unmerge thread",
				description:
					"Restores a manually-merged thread to its original grouping",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/attachments",
		async ({ user, query, set }) => {
			const result = await mailService.getAttachments(user.id, {
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor ?? undefined,
				q: query.q ?? undefined,
				filetype: query.filetype ?? undefined,
				category: query.category ?? undefined,
				from: query.from ?? undefined,
				after: query.after ?? undefined,
				before: query.before ?? undefined,
				accountIds: query.accountIds
					? query.accountIds.split(",").filter(Boolean)
					: undefined,
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
				cursor: t.Optional(t.String()),
				q: t.Optional(t.String()),
				filetype: t.Optional(t.String()),
				category: t.Optional(t.String()),
				from: t.Optional(t.String()),
				after: t.Optional(t.String()),
				before: t.Optional(t.String()),
				accountIds: t.Optional(t.String()),
			}),
			response: {
				200: attachmentListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List attachments",
				description:
					"Returns paginated list of attachments with email context, filterable by filename, type, sender, and date",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/attachments/:id/download",
		async ({ user, params, set }) => {
			const result = await mailService.downloadAttachment(user.id, params.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return new Response(result.data.buffer as ArrayBuffer, {
				headers: {
					"Content-Type": result.mimeType,
					"Content-Disposition": `attachment; filename="${result.filename.replace(/"/g, '\\"')}"`,
					"Content-Length": result.data.byteLength.toString(),
				},
			});
		},
		{
			auth: true,
			detail: {
				summary: "Download attachment",
				description: "Downloads the file content of an email attachment",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/senders",
		async ({ user, query, set }) => {
			const result = await mailService.getSenders(
				user.id,
				query.q ?? undefined,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { senders: result.data };
		},
		{
			auth: true,
			query: t.Object({
				q: t.Optional(t.String()),
			}),
			response: {
				200: senderListResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List senders",
				description:
					"Returns distinct senders for the authenticated user, optionally filtered by query",
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
		"/accounts/:id/signature",
		async ({ user, params, body, set }) => {
			const result = await mailService.updateSignature(
				user.id,
				params.id,
				body.signature,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: updateSignatureBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Update email signature",
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
	.get(
		"/sender-rules",
		async ({ user, set }) => {
			const result = await mailService.getSenderRules(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { rules: result.data };
		},
		{
			auth: true,
			response: {
				200: senderRuleListResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List sender rules",
				description:
					"Returns all sender category rules for the authenticated user",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/sender-rules",
		async ({ user, body, set }) => {
			const result = await mailService.createSenderRule(
				user.id,
				body.senderAddress,
				body.category,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return result.data;
		},
		{
			auth: true,
			body: createSenderRuleBody,
			response: {
				200: createSenderRuleResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Create or update sender rule",
				description:
					"Sets a category rule for a sender address and bulk-updates existing emails",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/sender-rules/:id",
		async ({ user, params, set }) => {
			const result = await mailService.deleteSenderRule(user.id, params.id);

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
				summary: "Delete sender rule",
				description:
					"Removes a sender category rule (does not revert already-categorized emails)",
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
	)
	/* ── Feature 1: Snooze ── */
	.post(
		"/emails/:id/snooze",
		async ({ user, params, body, set }) => {
			const result = await mailService.snoozeEmail(
				user.id,
				params.id,
				body.snoozedUntil,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: snoozeBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Snooze email",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/threads/:threadId/snooze",
		async ({ user, params, body, set }) => {
			const result = await mailService.snoozeThread(
				user.id,
				params.threadId,
				body.snoozedUntil,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: snoozeBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Snooze thread",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/emails/:id/snooze",
		async ({ user, params, set }) => {
			const result = await mailService.unsnoozeEmail(user.id, params.id);
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
				summary: "Unsnooze email",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	/* ── Feature 2: Draft Review ── */
	.get(
		"/drafts",
		async ({ user, query, set }) => {
			const result = await mailService.getDrafts(user.id, {
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor ?? undefined,
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
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: draftListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "List AI drafts",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/emails/:id/draft",
		async ({ user, params, body, set }) => {
			const result = await mailService.updateDraft(
				user.id,
				params.id,
				body.draftResponse,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: updateDraftBody,
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Update draft response",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	/* ── Feature 3: Delayed send / Undo ── */
	.post(
		"/emails/:id/reply-delayed",
		async ({ user, params, body, set }) => {
			const result = await mailService.replyToEmailDelayed(
				user.id,
				params.id,
				body.body,
				body.cc,
				body.attachments,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { jobId: result.jobId, message: result.message };
		},
		{
			auth: true,
			body: delayedComposeBody,
			response: {
				200: delayedSendResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Reply with undo delay",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/emails/:id/forward-delayed",
		async ({ user, params, body, set }) => {
			const result = await mailService.forwardEmailDelayed(
				user.id,
				params.id,
				body.to,
				body.body,
				body.attachments,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { jobId: result.jobId, message: result.message };
		},
		{
			auth: true,
			body: delayedForwardBody,
			response: {
				200: delayedSendResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Forward with undo delay",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/compose-delayed",
		async ({ user, body, set }) => {
			const result = await mailService.composeEmailDelayed(
				user.id,
				body.accountId,
				body.to,
				body.subject,
				body.body,
				body.cc,
				body.bcc,
				body.attachments,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { jobId: result.jobId, message: result.message };
		},
		{
			auth: true,
			body: composeNewBody,
			response: {
				200: delayedSendResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Compose and send new email with undo delay",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/send/:jobId",
		async ({ params, set }) => {
			const result = await mailService.cancelDelayedSend(params.jobId);
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
				410: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Cancel delayed send",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	/* ── Feature 4: Sender Mute / VIP ── */
	.post(
		"/sender-rules/mute",
		async ({ user, body, set }) => {
			const result = await mailService.muteSender(
				user.id,
				body.senderAddress,
				body.muted,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message, archivedCount: result.archivedCount };
		},
		{
			auth: true,
			body: muteSenderBody,
			response: { 200: muteSenderResponse, 500: errorResponse },
			detail: {
				summary: "Mute/unmute sender",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.post(
		"/sender-rules/vip",
		async ({ user, body, set }) => {
			const result = await mailService.vipSender(
				user.id,
				body.senderAddress,
				body.vip,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: vipSenderBody,
			response: { 200: messageResponse, 500: errorResponse },
			detail: {
				summary: "Set/unset VIP sender",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	/* ── Feature 5: Unsubscribe ── */
	.post(
		"/emails/:id/unsubscribe",
		async ({ user, params, set }) => {
			const result = await mailService.unsubscribeEmail(user.id, params.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message, method: result.method };
		},
		{
			auth: true,
			response: {
				200: unsubscribeResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "One-click unsubscribe",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	/* ── Feature 6: Follow-up ── */
	.post(
		"/emails/:id/follow-up",
		async ({ user, params, body, set }) => {
			const result = await mailService.setFollowUp(
				user.id,
				params.id,
				body.followUpAt,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			body: t.Object({ followUpAt: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Set follow-up reminder",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.delete(
		"/emails/:id/follow-up",
		async ({ user, params, set }) => {
			const result = await mailService.clearFollowUp(user.id, params.id);
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
				summary: "Clear follow-up reminder",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.get(
		"/follow-ups",
		async ({ user, set }) => {
			const result = await mailService.getFollowUps(user.id);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { followUps: result.data };
		},
		{
			auth: true,
			response: { 200: followUpListResponse, 500: errorResponse },
			detail: {
				summary: "List due follow-ups",
				tags: ["Mail"],
				security: [{ bearerAuth: [] }],
			},
		},
	);
