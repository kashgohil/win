import { Elysia, t } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	contactDetailResponse,
	contactListResponse,
	contactResponse,
	createContactBody,
	errorResponse,
	messageResponse,
	updateContactBody,
} from "./responses";
import { contactService } from "./service";

export const contactsRoutes = new Elysia({
	name: "contacts",
	prefix: "/contacts",
})
	.use(betterAuthPlugin)

	/* ── List ── */

	.get(
		"/",
		async ({ query, user, set }) => {
			const result = await contactService.listContacts(user.id, {
				q: query.q,
				starred: query.starred,
				archived: query.archived,
				tagId: query.tagId,
				company: query.company,
				sort: query.sort,
				limit: query.limit ? Number(query.limit) : undefined,
				cursor: query.cursor,
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
				q: t.Optional(t.String()),
				starred: t.Optional(t.String()),
				archived: t.Optional(t.String()),
				tagId: t.Optional(t.String()),
				company: t.Optional(t.String()),
				sort: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: contactListResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "List contacts" },
		},
	)

	/* ── Detail ── */

	.get(
		"/:contactId",
		async ({ params, user, set }) => {
			const result = await contactService.getContact(user.id, params.contactId);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String() }),
			response: {
				200: contactDetailResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Get contact detail" },
		},
	)

	/* ── Create ── */

	.post(
		"/",
		async ({ body, user, set }) => {
			const result = await contactService.createContact(user.id, body);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			set.status = 201;
			return result.data;
		},
		{
			auth: true,
			body: createContactBody,
			response: {
				201: contactResponse,
				409: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Create contact" },
		},
	)

	/* ── Update ── */

	.patch(
		"/:contactId",
		async ({ params, body, user, set }) => {
			const result = await contactService.updateContact(
				user.id,
				params.contactId,
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
			params: t.Object({ contactId: t.String() }),
			body: updateContactBody,
			response: {
				200: contactResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Update contact" },
		},
	)

	/* ── Delete ── */

	.delete(
		"/:contactId",
		async ({ params, user, set }) => {
			const result = await contactService.deleteContact(
				user.id,
				params.contactId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Delete contact" },
		},
	)

	/* ── Toggle Star ── */

	.post(
		"/:contactId/star",
		async ({ params, user, set }) => {
			const result = await contactService.toggleStar(user.id, params.contactId);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String() }),
			response: {
				200: t.Object({ starred: t.Boolean() }),
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Toggle contact star" },
		},
	)

	/* ── Toggle Archive ── */

	.post(
		"/:contactId/archive",
		async ({ params, user, set }) => {
			const result = await contactService.toggleArchive(
				user.id,
				params.contactId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String() }),
			response: {
				200: t.Object({ archived: t.Boolean() }),
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Toggle contact archive" },
		},
	);
