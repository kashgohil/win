import { Elysia, t } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import {
	applyTagSuggestionBody,
	contactDetailResponse,
	contactEmailsResponse,
	contactEventsResponse,
	contactListResponse,
	contactResponse,
	createContactBody,
	createTagBody,
	dismissMergeBody,
	errorResponse,
	followUpListResponse,
	interactionListResponse,
	meetingPrepResponse,
	mergeContactBody,
	messageResponse,
	moduleDataResponse,
	snoozeBody,
	suggestionsResponse,
	tagListResponse,
	tagResponse,
	tagSuggestionsResponse,
	updateContactBody,
	updateTagBody,
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

	/* ── Tags (static routes before :contactId) ── */

	.get(
		"/tags",
		async ({ user, set }) => {
			const result = await contactService.listTags(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: tagListResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "List tags" },
		},
	)

	.post(
		"/tags",
		async ({ body, user, set }) => {
			const result = await contactService.createTag(user.id, body);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			set.status = 201;
			return result.data;
		},
		{
			auth: true,
			body: createTagBody,
			response: {
				201: tagResponse,
				409: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Create tag" },
		},
	)

	.patch(
		"/tags/:tagId",
		async ({ params, body, user, set }) => {
			const result = await contactService.updateTag(
				user.id,
				params.tagId,
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
			params: t.Object({ tagId: t.String() }),
			body: updateTagBody,
			response: {
				200: tagResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Update tag" },
		},
	)

	.delete(
		"/tags/:tagId",
		async ({ params, user, set }) => {
			const result = await contactService.deleteTag(user.id, params.tagId);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ tagId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Delete tag" },
		},
	)

	/* ── Follow-ups ── */

	.get(
		"/follow-ups",
		async ({ query, user, set }) => {
			const result = await contactService.listFollowUps(user.id, {
				type: query.type,
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
				type: t.Optional(t.String()),
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: followUpListResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "List pending follow-ups" },
		},
	)

	.post(
		"/follow-ups/:followUpId/complete",
		async ({ params, user, set }) => {
			const result = await contactService.completeFollowUp(
				user.id,
				params.followUpId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ followUpId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Complete follow-up" },
		},
	)

	.post(
		"/follow-ups/:followUpId/dismiss",
		async ({ params, user, set }) => {
			const result = await contactService.dismissFollowUp(
				user.id,
				params.followUpId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ followUpId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Dismiss follow-up" },
		},
	)

	.post(
		"/follow-ups/:followUpId/snooze",
		async ({ params, body, user, set }) => {
			const result = await contactService.snoozeFollowUp(
				user.id,
				params.followUpId,
				body.until,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ followUpId: t.String() }),
			body: snoozeBody,
			response: {
				200: messageResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Snooze follow-up" },
		},
	)

	/* ── Module Data ── */

	.get(
		"/data",
		async ({ user, set }) => {
			const result = await contactService.getModuleData(user.id);

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
			detail: { tags: ["Contacts"], summary: "Get contacts module data" },
		},
	)

	/* ── Suggestions ── */

	.get(
		"/suggestions",
		async ({ user, set }) => {
			const result = await contactService.getSuggestions(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: suggestionsResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Get contact suggestions" },
		},
	)

	/* ── Dismiss Merge Suggestion ── */

	.post(
		"/suggestions/dismiss",
		async ({ body, user, set }) => {
			const result = await contactService.dismissMergeSuggestion(
				user.id,
				body.contactIdA,
				body.contactIdB,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			body: dismissMergeBody,
			response: {
				200: messageResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Dismiss merge suggestion" },
		},
	)

	/* ── Tag Suggestions ── */

	.get(
		"/tag-suggestions",
		async ({ user, set }) => {
			const result = await contactService.getTagSuggestions(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: tagSuggestionsResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Get auto-tag suggestions" },
		},
	)

	.post(
		"/tag-suggestions/apply",
		async ({ body, user, set }) => {
			// Create the tag
			const tagResult = await contactService.createTag(user.id, {
				name: body.name,
				color: body.color,
			});
			if (!tagResult.ok) {
				set.status = tagResult.status;
				return { error: tagResult.error };
			}

			// Assign all contacts to the tag
			let assigned = 0;
			for (const contactId of body.contactIds) {
				const r = await contactService.assignTag(
					user.id,
					contactId,
					tagResult.data.id,
				);
				if (r.ok) assigned++;
			}

			return {
				message: `Created tag "${body.name}" with ${assigned} contacts`,
				tagId: tagResult.data.id,
			};
		},
		{
			auth: true,
			body: applyTagSuggestionBody,
			response: {
				200: t.Object({ message: t.String(), tagId: t.String() }),
				409: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Apply tag suggestion" },
		},
	)

	/* ── Discover ── */

	.post(
		"/discover",
		async ({ user, set }) => {
			const result = await contactService.triggerDiscover(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			response: {
				200: messageResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Trigger contact discovery" },
		},
	)

	/* ── Meeting Prep ── */

	.get(
		"/meeting-prep/:eventId",
		async ({ params, user, set }) => {
			const result = await contactService.getMeetingPrep(
				user.id,
				params.eventId,
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
			response: {
				200: meetingPrepResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Get meeting prep brief" },
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
	)

	/* ── Merge ── */

	.post(
		"/:contactId/merge",
		async ({ params, body, user, set }) => {
			const result = await contactService.mergeContacts(
				user.id,
				params.contactId,
				body.mergeWithContactId,
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
			body: mergeContactBody,
			response: {
				200: messageResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Merge two contacts" },
		},
	)

	/* ── Tag Assignment ── */

	.post(
		"/:contactId/tags/:tagId",
		async ({ params, user, set }) => {
			const result = await contactService.assignTag(
				user.id,
				params.contactId,
				params.tagId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String(), tagId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Assign tag to contact" },
		},
	)

	.delete(
		"/:contactId/tags/:tagId",
		async ({ params, user, set }) => {
			const result = await contactService.removeTag(
				user.id,
				params.contactId,
				params.tagId,
			);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}
			return result.data;
		},
		{
			auth: true,
			params: t.Object({ contactId: t.String(), tagId: t.String() }),
			response: {
				200: messageResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Remove tag from contact" },
		},
	)

	/* ── Interactions ── */

	.get(
		"/:contactId/interactions",
		async ({ params, query, user, set }) => {
			const result = await contactService.listInteractions(
				user.id,
				params.contactId,
				{
					limit: query.limit ? Number(query.limit) : undefined,
					cursor: query.cursor,
				},
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
			query: t.Object({
				limit: t.Optional(t.String()),
				cursor: t.Optional(t.String()),
			}),
			response: {
				200: interactionListResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "List contact interactions" },
		},
	)

	/* ── Cross-module: Emails ── */

	.get(
		"/:contactId/emails",
		async ({ params, query, user, set }) => {
			const result = await contactService.getContactEmails(
				user.id,
				params.contactId,
				{
					limit: query.limit ? Number(query.limit) : undefined,
					offset: query.offset ? Number(query.offset) : undefined,
				},
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
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
			response: {
				200: contactEmailsResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: { tags: ["Contacts"], summary: "Get emails involving contact" },
		},
	)

	/* ── Cross-module: Calendar Events ── */

	.get(
		"/:contactId/events",
		async ({ params, query, user, set }) => {
			const result = await contactService.getContactEvents(
				user.id,
				params.contactId,
				{
					limit: query.limit ? Number(query.limit) : undefined,
					offset: query.offset ? Number(query.offset) : undefined,
				},
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
			query: t.Object({
				limit: t.Optional(t.String()),
				offset: t.Optional(t.String()),
			}),
			response: {
				200: contactEventsResponse,
				404: errorResponse,
				500: errorResponse,
			},
			detail: {
				tags: ["Contacts"],
				summary: "Get calendar events involving contact",
			},
		},
	);
