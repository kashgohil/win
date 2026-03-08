import { Elysia, redirect, t } from "elysia";
import { env } from "../../env";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	accountListResponse,
	connectResponse,
	createEventBody,
	disconnectResponse,
	errorResponse,
	eventDetailResponse,
	eventListResponse,
	moduleDataResponse,
	mutateEventResponse,
	updateEventBody,
} from "./responses";
import { calendarService } from "./service";

export const calendarRoutes = new Elysia({
	name: "calendar",
	prefix: "/calendar",
})
	.use(betterAuthPlugin)

	/* ── Webhook (public — called by Google) ── */

	.post(
		"/webhook",
		async ({ request }) => {
			const channelId = request.headers.get("x-goog-channel-id");
			const resourceId = request.headers.get("x-goog-resource-id");
			const resourceState = request.headers.get("x-goog-resource-state");

			if (!channelId || !resourceId) {
				return new Response("Missing headers", { status: 400 });
			}

			// Google sends "sync" on initial verification — ignore it
			if (resourceState === "sync") {
				return new Response("OK", { status: 200 });
			}

			await calendarService.handleWebhookNotification(channelId, resourceId);
			return new Response("OK", { status: 200 });
		},
		{
			detail: {
				summary: "Google Calendar webhook",
				description:
					"Receives push notifications from Google Calendar when events change",
				tags: ["Calendar"],
			},
		},
	)

	/* ── OAuth callbacks (public — no auth required) ── */

	.get(
		"/accounts/callback/google",
		async ({ query }) => {
			const clientUrl = `${env.CLIENT_URL}/module/cal`;

			if (query.error) {
				return redirect(
					`${clientUrl}?error=${encodeURIComponent(query.error)}`,
				);
			}

			if (!query.code || !query.state) {
				return redirect(`${clientUrl}?error=missing_params`);
			}

			const result = await calendarService.handleOAuthCallback(
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
				summary: "Google Calendar OAuth callback",
				description:
					"Handles the redirect from Google after Calendar OAuth consent",
				tags: ["Calendar"],
			},
		},
	)

	/* ── Account management ── */

	.get(
		"/accounts",
		async ({ user }) => {
			const result = await calendarService.getAccounts(user.id);
			if (!result.ok) {
				return { accounts: [] };
			}
			return { accounts: result.data };
		},
		{
			auth: true,
			response: { 200: accountListResponse },
			detail: {
				summary: "List calendar accounts",
				tags: ["Calendar"],
			},
		},
	)

	.post(
		"/link/:provider",
		async ({ user, params, set }) => {
			const result = await calendarService.connectAccount(
				user.id,
				params.provider,
			);
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
				summary: "Connect calendar account",
				description: "Returns OAuth URL to connect a Google Calendar account",
				tags: ["Calendar"],
			},
		},
	)

	/* ── Events ── */

	.get(
		"/events",
		async ({ user, query }) => {
			const result = await calendarService.listEvents(user.id, {
				startAfter: query.startAfter,
				startBefore: query.startBefore,
				accountId: query.accountId,
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor,
			});
			if (!result.ok) {
				return { events: [], hasMore: false };
			}
			return result.data;
		},
		{
			auth: true,
			query: t.Object({
				startAfter: t.Optional(t.String()),
				startBefore: t.Optional(t.String()),
				accountId: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: { 200: eventListResponse },
			detail: {
				summary: "List calendar events",
				tags: ["Calendar"],
			},
		},
	)

	.get(
		"/events/:eventId",
		async ({ user, params, set }) => {
			const result = await calendarService.getEvent(user.id, params.eventId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ eventId: t.String() }),
			response: {
				200: eventDetailResponse,
				404: errorResponse,
			},
			detail: {
				summary: "Get calendar event",
				tags: ["Calendar"],
			},
		},
	)

	.get(
		"/data",
		async ({ user }) => {
			const result = await calendarService.getModuleData(user.id);
			if (!result.ok) {
				return {
					nextEvent: null,
					minutesUntilNext: null,
					todayCount: 0,
					conflictCount: 0,
					conflicts: [],
				};
			}
			return result.data;
		},
		{
			auth: true,
			response: { 200: moduleDataResponse },
			detail: {
				summary: "Calendar module briefing data",
				tags: ["Calendar"],
			},
		},
	)

	/* ── Event mutations ── */

	.post(
		"/events",
		async ({ user, body, set }) => {
			const result = await calendarService.createEvent(user.id, body);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: createEventBody,
			response: {
				200: mutateEventResponse,
				400: errorResponse,
				404: errorResponse,
				502: errorResponse,
			},
			detail: {
				summary: "Create calendar event",
				description: "Creates an event in Google Calendar and stores locally",
				tags: ["Calendar"],
			},
		},
	)

	.patch(
		"/events/:eventId",
		async ({ user, params, body, set }) => {
			const result = await calendarService.updateEvent(
				user.id,
				params.eventId,
				body,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ eventId: t.String() }),
			body: updateEventBody,
			response: {
				200: mutateEventResponse,
				404: errorResponse,
				502: errorResponse,
			},
			detail: {
				summary: "Update calendar event",
				description: "Patches an event in Google Calendar and updates locally",
				tags: ["Calendar"],
			},
		},
	)

	.delete(
		"/events/:eventId",
		async ({ user, params, set }) => {
			const result = await calendarService.deleteEvent(user.id, params.eventId);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			params: t.Object({ eventId: t.String() }),
			response: {
				200: disconnectResponse,
				404: errorResponse,
				502: errorResponse,
			},
			detail: {
				summary: "Delete calendar event",
				description: "Deletes an event from Google Calendar and local DB",
				tags: ["Calendar"],
			},
		},
	)

	.delete(
		"/accounts/:id",
		async ({ user, params, set }) => {
			const result = await calendarService.disconnectAccount(
				user.id,
				params.id,
			);
			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return { message: result.message };
		},
		{
			auth: true,
			params: t.Object({ id: t.String() }),
			response: {
				200: disconnectResponse,
				404: errorResponse,
			},
			detail: {
				summary: "Disconnect calendar account",
				tags: ["Calendar"],
			},
		},
	);
