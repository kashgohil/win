import { Elysia, redirect, t } from "elysia";
import { env } from "../../env";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	accountListResponse,
	connectResponse,
	disconnectResponse,
	errorResponse,
	eventDetailResponse,
	eventListResponse,
	moduleDataResponse,
} from "./responses";
import { calendarService } from "./service";

export const calendarRoutes = new Elysia({
	name: "calendar",
	prefix: "/calendar",
})
	.use(betterAuthPlugin)

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
