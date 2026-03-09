import {
	and,
	calendarEvents,
	contactFollowUps,
	contactInteractions,
	contactMergeDismissals,
	contacts,
	contactTagAssignments,
	contactTags,
	db,
	desc,
	emails,
	eq,
	gte,
	ilike,
	or,
	sql,
} from "@wingmnn/db";
import { enqueueContactFullScan } from "@wingmnn/queue";

/* ── Types ── */

type ServiceResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string; status: number };

interface ListContactsOptions {
	q?: string;
	starred?: string;
	archived?: string;
	tagId?: string;
	company?: string;
	sort?: string;
	limit?: number;
	cursor?: string;
}

/* ── Helpers ── */

function serializeContact(
	contact: typeof contacts.$inferSelect & {
		tags?: { id: string; name: string; color: string | null }[];
	},
) {
	return {
		id: contact.id,
		primaryEmail: contact.primaryEmail,
		additionalEmails: contact.additionalEmails ?? [],
		name: contact.name ?? null,
		company: contact.company ?? null,
		jobTitle: contact.jobTitle ?? null,
		phone: contact.phone ?? null,
		avatarUrl: contact.avatarUrl ?? null,
		notes: contact.notes ?? null,
		starred: contact.starred,
		archived: contact.archived,
		source: contact.source,
		lastInteractionAt: contact.lastInteractionAt?.toISOString() ?? null,
		interactionCount: contact.interactionCount,
		relationshipScore: contact.relationshipScore,
		avgInteractionGapDays: contact.avgInteractionGapDays ?? null,
		tags: contact.tags ?? [],
		createdAt: contact.createdAt.toISOString(),
		updatedAt: contact.updatedAt.toISOString(),
	};
}

/* ── List Contacts ── */

async function listContacts(
	userId: string,
	options: ListContactsOptions,
): Promise<
	ServiceResult<{
		contacts: ReturnType<typeof serializeContact>[];
		total: number;
		hasMore: boolean;
		nextCursor?: string;
	}>
> {
	try {
		const limit = Math.min(options.limit ?? 50, 100);
		const conditions = [eq(contacts.userId, userId)];

		// Filters
		if (options.starred === "true") {
			conditions.push(eq(contacts.starred, true));
		}
		if (options.archived === "true") {
			conditions.push(eq(contacts.archived, true));
		} else if (options.archived !== "all") {
			// Default: exclude archived
			conditions.push(eq(contacts.archived, false));
		}
		if (options.company) {
			conditions.push(eq(contacts.company, options.company));
		}
		if (options.q) {
			const search = `%${options.q}%`;
			conditions.push(
				or(
					ilike(contacts.name, search),
					ilike(contacts.primaryEmail, search),
					ilike(contacts.company, search),
				)!,
			);
		}
		if (options.cursor) {
			conditions.push(sql`${contacts.id} < ${options.cursor}`);
		}

		// Tag filter — subquery
		if (options.tagId) {
			conditions.push(
				sql`${contacts.id} IN (SELECT ${contactTagAssignments.contactId} FROM ${contactTagAssignments} WHERE ${contactTagAssignments.tagId} = ${options.tagId})`,
			);
		}

		// Sort
		let orderBy;
		switch (options.sort) {
			case "name":
				orderBy = sql`${contacts.name} ASC NULLS LAST, ${contacts.id} DESC`;
				break;
			case "score":
				orderBy = sql`${contacts.relationshipScore} DESC, ${contacts.id} DESC`;
				break;
			case "recent":
				orderBy = sql`${contacts.lastInteractionAt} DESC NULLS LAST, ${contacts.id} DESC`;
				break;
			default:
				orderBy = sql`${contacts.lastInteractionAt} DESC NULLS LAST, ${contacts.id} DESC`;
		}

		const where = and(...conditions);

		const [rows, countResult] = await Promise.all([
			db
				.select()
				.from(contacts)
				.where(where)
				.orderBy(orderBy)
				.limit(limit + 1),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contacts)
				.where(where),
		]);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;
		const total = countResult[0]?.count ?? 0;

		// Fetch tags for all contacts
		const contactIds = items.map((c) => c.id);
		const tagRows =
			contactIds.length > 0
				? await db
						.select({
							contactId: contactTagAssignments.contactId,
							id: contactTags.id,
							name: contactTags.name,
							color: contactTags.color,
						})
						.from(contactTagAssignments)
						.innerJoin(
							contactTags,
							eq(contactTagAssignments.tagId, contactTags.id),
						)
						.where(
							sql`${contactTagAssignments.contactId} IN (${sql.join(
								contactIds.map((id) => sql`${id}`),
								sql`, `,
							)})`,
						)
				: [];

		const tagsByContact = new Map<
			string,
			{ id: string; name: string; color: string | null }[]
		>();
		for (const row of tagRows) {
			const list = tagsByContact.get(row.contactId) ?? [];
			list.push({ id: row.id, name: row.name, color: row.color ?? null });
			tagsByContact.set(row.contactId, list);
		}

		const serialized = items.map((c) =>
			serializeContact({ ...c, tags: tagsByContact.get(c.id) ?? [] }),
		);

		return {
			ok: true,
			data: {
				contacts: serialized,
				total,
				hasMore,
				nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to list contacts";
		console.error("[contacts] listContacts error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Get Contact Detail ── */

async function getContact(
	userId: string,
	contactId: string,
): Promise<
	ServiceResult<
		ReturnType<typeof serializeContact> & {
			avgResponseTimeMins: number | null;
			avgYourResponseTimeMins: number | null;
			introducedBy: string | null;
			introducedByName: string | null;
			introducedAt: string | null;
			recentInteractions: {
				id: string;
				type: string;
				title: string;
				occurredAt: string;
			}[];
		}
	>
> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		// Fetch tags
		const tagRows = await db
			.select({
				id: contactTags.id,
				name: contactTags.name,
				color: contactTags.color,
			})
			.from(contactTagAssignments)
			.innerJoin(contactTags, eq(contactTagAssignments.tagId, contactTags.id))
			.where(eq(contactTagAssignments.contactId, contactId));

		// Fetch recent interactions
		const recentInteractions = await db
			.select({
				id: contactInteractions.id,
				type: contactInteractions.type,
				title: contactInteractions.title,
				occurredAt: contactInteractions.occurredAt,
			})
			.from(contactInteractions)
			.where(eq(contactInteractions.contactId, contactId))
			.orderBy(desc(contactInteractions.occurredAt))
			.limit(5);

		// Fetch introducer name if present
		let introducedByName: string | null = null;
		if (contact.introducedBy) {
			const introducer = await db.query.contacts.findFirst({
				where: eq(contacts.id, contact.introducedBy),
				columns: { name: true, primaryEmail: true },
			});
			introducedByName = introducer?.name ?? introducer?.primaryEmail ?? null;
		}

		const base = serializeContact({
			...contact,
			tags: tagRows.map((t) => ({
				id: t.id,
				name: t.name,
				color: t.color ?? null,
			})),
		});

		return {
			ok: true,
			data: {
				...base,
				avgResponseTimeMins: contact.avgResponseTimeMins ?? null,
				avgYourResponseTimeMins: contact.avgYourResponseTimeMins ?? null,
				introducedBy: contact.introducedBy ?? null,
				introducedByName,
				introducedAt: contact.introducedAt?.toISOString() ?? null,
				recentInteractions: recentInteractions.map((i) => ({
					id: i.id,
					type: i.type,
					title: i.title,
					occurredAt: i.occurredAt.toISOString(),
				})),
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get contact";
		console.error("[contacts] getContact error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Create Contact ── */

async function createContact(
	userId: string,
	body: {
		primaryEmail: string;
		name?: string;
		company?: string;
		jobTitle?: string;
		phone?: string;
		notes?: string;
		starred?: boolean;
	},
): Promise<ServiceResult<ReturnType<typeof serializeContact>>> {
	try {
		const existing = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.userId, userId),
				eq(contacts.primaryEmail, body.primaryEmail.toLowerCase().trim()),
			),
		});

		if (existing) {
			return {
				ok: false,
				error: "A contact with this email already exists",
				status: 409,
			};
		}

		const result = await db
			.insert(contacts)
			.values({
				userId,
				primaryEmail: body.primaryEmail.toLowerCase().trim(),
				name: body.name ?? null,
				company: body.company ?? null,
				jobTitle: body.jobTitle ?? null,
				phone: body.phone ?? null,
				notes: body.notes ?? null,
				starred: body.starred ?? false,
				source: "manual",
			})
			.returning();

		const contact = result[0];
		if (!contact) {
			return { ok: false, error: "Failed to create contact", status: 500 };
		}

		return { ok: true, data: serializeContact({ ...contact, tags: [] }) };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to create contact";
		console.error("[contacts] createContact error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Update Contact ── */

async function updateContact(
	userId: string,
	contactId: string,
	body: {
		name?: string | null;
		company?: string | null;
		jobTitle?: string | null;
		phone?: string | null;
		avatarUrl?: string | null;
		notes?: string | null;
		starred?: boolean;
		archived?: boolean;
		additionalEmails?: string[];
	},
): Promise<ServiceResult<ReturnType<typeof serializeContact>>> {
	try {
		const existing = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
		});

		if (!existing) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const updateFields: Record<string, unknown> = {};
		if (body.name !== undefined) updateFields.name = body.name;
		if (body.company !== undefined) updateFields.company = body.company;
		if (body.jobTitle !== undefined) updateFields.jobTitle = body.jobTitle;
		if (body.phone !== undefined) updateFields.phone = body.phone;
		if (body.avatarUrl !== undefined) updateFields.avatarUrl = body.avatarUrl;
		if (body.notes !== undefined) updateFields.notes = body.notes;
		if (body.starred !== undefined) updateFields.starred = body.starred;
		if (body.archived !== undefined) updateFields.archived = body.archived;
		if (body.additionalEmails !== undefined)
			updateFields.additionalEmails = body.additionalEmails;

		if (Object.keys(updateFields).length === 0) {
			return { ok: false, error: "No fields to update", status: 400 };
		}

		const result = await db
			.update(contacts)
			.set(updateFields)
			.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
			.returning();

		const contact = result[0];
		if (!contact) {
			return { ok: false, error: "Failed to update contact", status: 500 };
		}

		// Fetch tags
		const tagRows = await db
			.select({
				id: contactTags.id,
				name: contactTags.name,
				color: contactTags.color,
			})
			.from(contactTagAssignments)
			.innerJoin(contactTags, eq(contactTagAssignments.tagId, contactTags.id))
			.where(eq(contactTagAssignments.contactId, contactId));

		return {
			ok: true,
			data: serializeContact({
				...contact,
				tags: tagRows.map((t) => ({
					id: t.id,
					name: t.name,
					color: t.color ?? null,
				})),
			}),
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to update contact";
		console.error("[contacts] updateContact error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Delete Contact ── */

async function deleteContact(
	userId: string,
	contactId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const result = await db
			.delete(contacts)
			.where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
			.returning({ id: contacts.id });

		if (result.length === 0) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		return { ok: true, data: { message: "Contact deleted" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to delete contact";
		console.error("[contacts] deleteContact error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Toggle Star ── */

async function toggleStar(
	userId: string,
	contactId: string,
): Promise<ServiceResult<{ starred: boolean }>> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true, starred: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const newStarred = !contact.starred;
		await db
			.update(contacts)
			.set({ starred: newStarred })
			.where(eq(contacts.id, contactId));

		return { ok: true, data: { starred: newStarred } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to toggle star";
		console.error("[contacts] toggleStar error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Toggle Archive ── */

async function toggleArchive(
	userId: string,
	contactId: string,
): Promise<ServiceResult<{ archived: boolean }>> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true, archived: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const newArchived = !contact.archived;
		await db
			.update(contacts)
			.set({ archived: newArchived })
			.where(eq(contacts.id, contactId));

		return { ok: true, data: { archived: newArchived } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to toggle archive";
		console.error("[contacts] toggleArchive error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: List ── */

async function listTags(userId: string): Promise<
	ServiceResult<{
		tags: {
			id: string;
			name: string;
			color: string | null;
			contactCount: number;
			createdAt: string;
		}[];
	}>
> {
	try {
		const rows = await db
			.select({
				id: contactTags.id,
				name: contactTags.name,
				color: contactTags.color,
				createdAt: contactTags.createdAt,
				contactCount: sql<number>`(SELECT count(*)::int FROM ${contactTagAssignments} WHERE ${contactTagAssignments.tagId} = ${contactTags.id})`,
			})
			.from(contactTags)
			.where(eq(contactTags.userId, userId))
			.orderBy(contactTags.name);

		return {
			ok: true,
			data: {
				tags: rows.map((r) => ({
					id: r.id,
					name: r.name,
					color: r.color ?? null,
					contactCount: r.contactCount,
					createdAt: r.createdAt.toISOString(),
				})),
			},
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to list tags";
		console.error("[contacts] listTags error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: Create ── */

async function createTag(
	userId: string,
	body: { name: string; color?: string },
): Promise<
	ServiceResult<{
		id: string;
		name: string;
		color: string | null;
		contactCount: number;
		createdAt: string;
	}>
> {
	try {
		const result = await db
			.insert(contactTags)
			.values({
				userId,
				name: body.name.trim(),
				color: body.color ?? null,
			})
			.onConflictDoNothing({
				target: [contactTags.userId, contactTags.name],
			})
			.returning();

		const tag = result[0];
		if (!tag) {
			return {
				ok: false,
				error: "A tag with this name already exists",
				status: 409,
			};
		}

		return {
			ok: true,
			data: {
				id: tag.id,
				name: tag.name,
				color: tag.color ?? null,
				contactCount: 0,
				createdAt: tag.createdAt.toISOString(),
			},
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to create tag";
		console.error("[contacts] createTag error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: Update ── */

async function updateTag(
	userId: string,
	tagId: string,
	body: { name?: string; color?: string | null },
): Promise<
	ServiceResult<{
		id: string;
		name: string;
		color: string | null;
		contactCount: number;
		createdAt: string;
	}>
> {
	try {
		const updateFields: Record<string, unknown> = {};
		if (body.name !== undefined) updateFields.name = body.name.trim();
		if (body.color !== undefined) updateFields.color = body.color;

		if (Object.keys(updateFields).length === 0) {
			return { ok: false, error: "No fields to update", status: 400 };
		}

		const result = await db
			.update(contactTags)
			.set(updateFields)
			.where(and(eq(contactTags.id, tagId), eq(contactTags.userId, userId)))
			.returning();

		const tag = result[0];
		if (!tag) {
			return { ok: false, error: "Tag not found", status: 404 };
		}

		const countResult = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(contactTagAssignments)
			.where(eq(contactTagAssignments.tagId, tagId));

		return {
			ok: true,
			data: {
				id: tag.id,
				name: tag.name,
				color: tag.color ?? null,
				contactCount: countResult[0]?.count ?? 0,
				createdAt: tag.createdAt.toISOString(),
			},
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to update tag";
		console.error("[contacts] updateTag error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: Delete ── */

async function deleteTag(
	userId: string,
	tagId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const result = await db
			.delete(contactTags)
			.where(and(eq(contactTags.id, tagId), eq(contactTags.userId, userId)))
			.returning({ id: contactTags.id });

		if (result.length === 0) {
			return { ok: false, error: "Tag not found", status: 404 };
		}

		return { ok: true, data: { message: "Tag deleted" } };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to delete tag";
		console.error("[contacts] deleteTag error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: Assign ── */

async function assignTag(
	userId: string,
	contactId: string,
	tagId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		// Verify ownership of both contact and tag
		const [contact, tag] = await Promise.all([
			db.query.contacts.findFirst({
				where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
				columns: { id: true },
			}),
			db.query.contactTags.findFirst({
				where: and(eq(contactTags.id, tagId), eq(contactTags.userId, userId)),
				columns: { id: true },
			}),
		]);

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}
		if (!tag) {
			return { ok: false, error: "Tag not found", status: 404 };
		}

		await db
			.insert(contactTagAssignments)
			.values({ contactId, tagId })
			.onConflictDoNothing();

		return { ok: true, data: { message: "Tag assigned" } };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to assign tag";
		console.error("[contacts] assignTag error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tags: Remove ── */

async function removeTag(
	userId: string,
	contactId: string,
	tagId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		// Verify contact ownership
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		await db
			.delete(contactTagAssignments)
			.where(
				and(
					eq(contactTagAssignments.contactId, contactId),
					eq(contactTagAssignments.tagId, tagId),
				),
			);

		return { ok: true, data: { message: "Tag removed" } };
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to remove tag";
		console.error("[contacts] removeTag error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Interactions: List ── */

async function listInteractions(
	userId: string,
	contactId: string,
	options: { limit?: number; cursor?: string },
): Promise<
	ServiceResult<{
		interactions: {
			id: string;
			type: string;
			referenceId: string | null;
			title: string;
			occurredAt: string;
			metadata: unknown;
			createdAt: string;
		}[];
		total: number;
		hasMore: boolean;
		nextCursor?: string;
	}>
> {
	try {
		// Verify contact ownership
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const limit = Math.min(options.limit ?? 20, 100);
		const conditions = [eq(contactInteractions.contactId, contactId)];

		if (options.cursor) {
			conditions.push(sql`${contactInteractions.id} < ${options.cursor}`);
		}

		const where = and(...conditions);

		const [rows, countResult] = await Promise.all([
			db
				.select()
				.from(contactInteractions)
				.where(where)
				.orderBy(desc(contactInteractions.occurredAt))
				.limit(limit + 1),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contactInteractions)
				.where(eq(contactInteractions.contactId, contactId)),
		]);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;

		return {
			ok: true,
			data: {
				interactions: items.map((i) => ({
					id: i.id,
					type: i.type,
					referenceId: i.referenceId,
					title: i.title,
					occurredAt: i.occurredAt.toISOString(),
					metadata: i.metadata,
					createdAt: i.createdAt.toISOString(),
				})),
				total: countResult[0]?.count ?? 0,
				hasMore,
				nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to list interactions";
		console.error("[contacts] listInteractions error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Cross-module: Emails ── */

async function getContactEmails(
	userId: string,
	contactId: string,
	options: { limit?: number; offset?: number },
): Promise<
	ServiceResult<{
		emails: {
			id: string;
			subject: string | null;
			fromAddress: string | null;
			fromName: string | null;
			receivedAt: string;
			snippet: string | null;
			isRead: boolean;
		}[];
		total: number;
		hasMore: boolean;
	}>
> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true, primaryEmail: true, additionalEmails: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const allEmails = [
			contact.primaryEmail,
			...(contact.additionalEmails ?? []),
		];
		const limit = Math.min(options.limit ?? 20, 100);
		const offset = options.offset ?? 0;

		// Find emails where this contact is sender or recipient
		const emailCondition = and(
			eq(emails.userId, userId),
			or(
				sql`${emails.fromAddress} IN (${sql.join(
					allEmails.map((e) => sql`${e}`),
					sql`, `,
				)})`,
				sql`${emails.toAddresses} && ARRAY[${sql.join(
					allEmails.map((e) => sql`${e}`),
					sql`, `,
				)}]::text[]`,
				sql`${emails.ccAddresses} && ARRAY[${sql.join(
					allEmails.map((e) => sql`${e}`),
					sql`, `,
				)}]::text[]`,
			),
		);

		const [rows, countResult] = await Promise.all([
			db
				.select({
					id: emails.id,
					subject: emails.subject,
					fromAddress: emails.fromAddress,
					fromName: emails.fromName,
					receivedAt: emails.receivedAt,
					snippet: emails.snippet,
					isRead: emails.isRead,
				})
				.from(emails)
				.where(emailCondition)
				.orderBy(desc(emails.receivedAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(emails)
				.where(emailCondition),
		]);

		return {
			ok: true,
			data: {
				emails: rows.map((e) => ({
					id: e.id,
					subject: e.subject,
					fromAddress: e.fromAddress,
					fromName: e.fromName,
					receivedAt: e.receivedAt.toISOString(),
					snippet: e.snippet,
					isRead: e.isRead,
				})),
				total: countResult[0]?.count ?? 0,
				hasMore: offset + limit < (countResult[0]?.count ?? 0),
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get contact emails";
		console.error("[contacts] getContactEmails error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Cross-module: Calendar Events ── */

async function getContactEvents(
	userId: string,
	contactId: string,
	options: { limit?: number; offset?: number },
): Promise<
	ServiceResult<{
		events: {
			id: string;
			title: string | null;
			startTime: string;
			endTime: string;
			location: string | null;
			status: string;
		}[];
		total: number;
		hasMore: boolean;
	}>
> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
			columns: { id: true, primaryEmail: true, additionalEmails: true },
		});

		if (!contact) {
			return { ok: false, error: "Contact not found", status: 404 };
		}

		const allEmails = [
			contact.primaryEmail,
			...(contact.additionalEmails ?? []),
		];
		const limit = Math.min(options.limit ?? 20, 100);
		const offset = options.offset ?? 0;

		// Search attendees JSONB for contact's email addresses
		const emailConditions = allEmails.map(
			(email) =>
				sql`${calendarEvents.attendees}::jsonb @> ${`[{"email":"${email}"}]`}::jsonb`,
		);
		const organizerConditions = allEmails.map(
			(email) =>
				sql`${calendarEvents.organizer}::jsonb @> ${`{"email":"${email}"}`}::jsonb`,
		);

		const eventCondition = and(
			eq(calendarEvents.userId, userId),
			or(...emailConditions, ...organizerConditions),
		);

		const [rows, countResult] = await Promise.all([
			db
				.select({
					id: calendarEvents.id,
					title: calendarEvents.title,
					startTime: calendarEvents.startTime,
					endTime: calendarEvents.endTime,
					location: calendarEvents.location,
					status: calendarEvents.status,
				})
				.from(calendarEvents)
				.where(eventCondition)
				.orderBy(desc(calendarEvents.startTime))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(calendarEvents)
				.where(eventCondition),
		]);

		return {
			ok: true,
			data: {
				events: rows.map((e) => ({
					id: e.id,
					title: e.title,
					startTime: e.startTime.toISOString(),
					endTime: e.endTime.toISOString(),
					location: e.location,
					status: e.status,
				})),
				total: countResult[0]?.count ?? 0,
				hasMore: offset + limit < (countResult[0]?.count ?? 0),
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get contact events";
		console.error("[contacts] getContactEvents error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Follow-ups: List ── */

async function listFollowUps(
	userId: string,
	options: { type?: string; limit?: number; cursor?: string },
): Promise<
	ServiceResult<{
		followUps: {
			id: string;
			contactId: string;
			contactName: string | null;
			contactEmail: string;
			type: string;
			title: string;
			context: string | null;
			sourceEmailId: string | null;
			dueAt: string | null;
			status: string;
			snoozedUntil: string | null;
			createdAt: string;
		}[];
		total: number;
		hasMore: boolean;
		nextCursor?: string;
	}>
> {
	try {
		const limit = Math.min(options.limit ?? 20, 100);
		const conditions = [
			eq(contactFollowUps.userId, userId),
			eq(contactFollowUps.status, "pending"),
		];

		if (options.type) {
			conditions.push(sql`${contactFollowUps.type} = ${options.type}`);
		}
		if (options.cursor) {
			conditions.push(sql`${contactFollowUps.id} < ${options.cursor}`);
		}

		const where = and(...conditions);

		const [rows, countResult] = await Promise.all([
			db
				.select({
					id: contactFollowUps.id,
					contactId: contactFollowUps.contactId,
					contactName: contacts.name,
					contactEmail: contacts.primaryEmail,
					type: contactFollowUps.type,
					title: contactFollowUps.title,
					context: contactFollowUps.context,
					sourceEmailId: contactFollowUps.sourceEmailId,
					dueAt: contactFollowUps.dueAt,
					status: contactFollowUps.status,
					snoozedUntil: contactFollowUps.snoozedUntil,
					createdAt: contactFollowUps.createdAt,
				})
				.from(contactFollowUps)
				.innerJoin(contacts, eq(contactFollowUps.contactId, contacts.id))
				.where(where)
				.orderBy(sql`${contactFollowUps.dueAt} ASC NULLS LAST`)
				.limit(limit + 1),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contactFollowUps)
				.where(where),
		]);

		const hasMore = rows.length > limit;
		const items = hasMore ? rows.slice(0, limit) : rows;

		return {
			ok: true,
			data: {
				followUps: items.map((f) => ({
					id: f.id,
					contactId: f.contactId,
					contactName: f.contactName,
					contactEmail: f.contactEmail,
					type: f.type,
					title: f.title,
					context: f.context,
					sourceEmailId: f.sourceEmailId ?? null,
					dueAt: f.dueAt?.toISOString() ?? null,
					status: f.status,
					snoozedUntil: f.snoozedUntil?.toISOString() ?? null,
					createdAt: f.createdAt.toISOString(),
				})),
				total: countResult[0]?.count ?? 0,
				hasMore,
				nextCursor: hasMore ? items[items.length - 1]?.id : undefined,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to list follow-ups";
		console.error("[contacts] listFollowUps error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Follow-ups: Complete ── */

async function completeFollowUp(
	userId: string,
	followUpId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const result = await db
			.update(contactFollowUps)
			.set({ status: "completed", completedAt: new Date() })
			.where(
				and(
					eq(contactFollowUps.id, followUpId),
					eq(contactFollowUps.userId, userId),
					eq(contactFollowUps.status, "pending"),
				),
			)
			.returning({ id: contactFollowUps.id });

		if (result.length === 0) {
			return {
				ok: false,
				error: "Follow-up not found or already resolved",
				status: 404,
			};
		}

		return { ok: true, data: { message: "Follow-up completed" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to complete follow-up";
		console.error("[contacts] completeFollowUp error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Follow-ups: Dismiss ── */

async function dismissFollowUp(
	userId: string,
	followUpId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const result = await db
			.update(contactFollowUps)
			.set({ status: "dismissed" })
			.where(
				and(
					eq(contactFollowUps.id, followUpId),
					eq(contactFollowUps.userId, userId),
					eq(contactFollowUps.status, "pending"),
				),
			)
			.returning({ id: contactFollowUps.id });

		if (result.length === 0) {
			return {
				ok: false,
				error: "Follow-up not found or already resolved",
				status: 404,
			};
		}

		return { ok: true, data: { message: "Follow-up dismissed" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to dismiss follow-up";
		console.error("[contacts] dismissFollowUp error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Follow-ups: Snooze ── */

async function snoozeFollowUp(
	userId: string,
	followUpId: string,
	until: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		const snoozedUntil = new Date(until);
		if (Number.isNaN(snoozedUntil.getTime())) {
			return { ok: false, error: "Invalid date", status: 400 };
		}

		const result = await db
			.update(contactFollowUps)
			.set({ status: "snoozed", snoozedUntil })
			.where(
				and(
					eq(contactFollowUps.id, followUpId),
					eq(contactFollowUps.userId, userId),
					eq(contactFollowUps.status, "pending"),
				),
			)
			.returning({ id: contactFollowUps.id });

		if (result.length === 0) {
			return {
				ok: false,
				error: "Follow-up not found or already resolved",
				status: 404,
			};
		}

		return { ok: true, data: { message: "Follow-up snoozed" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to snooze follow-up";
		console.error("[contacts] snoozeFollowUp error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Module Data (hub briefing) ── */

async function getModuleData(userId: string): Promise<
	ServiceResult<{
		contactsTouchedThisWeek: number;
		followUpsDue: number;
		coolingOff: number;
		totalContacts: number;
		starredContacts: number;
	}>
> {
	try {
		const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const [
			touchedResult,
			followUpResult,
			coolingResult,
			totalResult,
			starredResult,
		] = await Promise.all([
			// Contacts with interactions this week
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contacts)
				.where(
					and(
						eq(contacts.userId, userId),
						eq(contacts.archived, false),
						gte(contacts.lastInteractionAt, weekAgo),
					),
				),
			// Pending follow-ups due
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contactFollowUps)
				.where(
					and(
						eq(contactFollowUps.userId, userId),
						eq(contactFollowUps.status, "pending"),
					),
				),
			// Contacts "cooling off" (score < 30, not archived, has interactions)
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contacts)
				.where(
					and(
						eq(contacts.userId, userId),
						eq(contacts.archived, false),
						sql`${contacts.relationshipScore} < 30`,
						sql`${contacts.interactionCount} > 0`,
					),
				),
			// Total non-archived contacts
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contacts)
				.where(and(eq(contacts.userId, userId), eq(contacts.archived, false))),
			// Starred contacts
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contacts)
				.where(and(eq(contacts.userId, userId), eq(contacts.starred, true))),
		]);

		return {
			ok: true,
			data: {
				contactsTouchedThisWeek: touchedResult[0]?.count ?? 0,
				followUpsDue: followUpResult[0]?.count ?? 0,
				coolingOff: coolingResult[0]?.count ?? 0,
				totalContacts: totalResult[0]?.count ?? 0,
				starredContacts: starredResult[0]?.count ?? 0,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get module data";
		console.error("[contacts] getModuleData error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Suggestions (merge candidates + new contacts) ── */

async function getSuggestions(userId: string): Promise<
	ServiceResult<{
		mergeSuggestions: {
			contactA: {
				id: string;
				name: string | null;
				email: string;
				company: string | null;
				interactionCount: number;
			};
			contactB: {
				id: string;
				name: string | null;
				email: string;
				company: string | null;
				interactionCount: number;
			};
			reason: string;
		}[];
		newContactsThisWeek: number;
	}>
> {
	try {
		const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		// Get dismissed pairs to exclude
		const dismissed = await db
			.select({
				a: contactMergeDismissals.contactIdA,
				b: contactMergeDismissals.contactIdB,
			})
			.from(contactMergeDismissals)
			.where(eq(contactMergeDismissals.userId, userId));

		const dismissedPairs = new Set(
			dismissed.flatMap((d) => [`${d.a}:${d.b}`, `${d.b}:${d.a}`]),
		);

		type MergeSuggestion = {
			contactA: {
				id: string;
				name: string | null;
				email: string;
				company: string | null;
				interactionCount: number;
			};
			contactB: {
				id: string;
				name: string | null;
				email: string;
				company: string | null;
				interactionCount: number;
			};
			reason: string;
		};

		const suggestions: MergeSuggestion[] = [];
		const seenPairs = new Set<string>();

		const addSuggestion = (
			r: {
				id1: string;
				name1: string | null;
				email1: string;
				company1: string | null;
				count1: number;
				id2: string;
				name2: string | null;
				email2: string;
				company2: string | null;
				count2: number;
			},
			reason: string,
		) => {
			const key = r.id1 < r.id2 ? `${r.id1}:${r.id2}` : `${r.id2}:${r.id1}`;
			if (seenPairs.has(key) || dismissedPairs.has(key)) return;
			seenPairs.add(key);
			suggestions.push({
				contactA: {
					id: r.id1,
					name: r.name1,
					email: r.email1,
					company: r.company1,
					interactionCount: r.count1,
				},
				contactB: {
					id: r.id2,
					name: r.name2,
					email: r.email2,
					company: r.company2,
					interactionCount: r.count2,
				},
				reason,
			});
		};

		type DupeRow = {
			id1: string;
			name1: string | null;
			email1: string;
			company1: string | null;
			count1: number;
			id2: string;
			name2: string | null;
			email2: string;
			company2: string | null;
			count2: number;
		};

		// 1. Same name, different email
		const dupesByName = (await db.execute(sql`
			SELECT a.id AS id1, a.name AS name1, a.primary_email AS email1,
			       a.company AS company1, a.interaction_count AS count1,
			       b.id AS id2, b.name AS name2, b.primary_email AS email2,
			       b.company AS company2, b.interaction_count AS count2
			FROM contacts a
			JOIN contacts b ON a.user_id = b.user_id
			  AND lower(trim(a.name)) = lower(trim(b.name))
			  AND a.id < b.id
			  AND a.name IS NOT NULL AND b.name IS NOT NULL
			  AND length(trim(a.name)) > 2
			WHERE a.user_id = ${userId}
			  AND a.archived = false AND b.archived = false
			LIMIT 10
		`)) as unknown as DupeRow[];

		for (const r of dupesByName ?? []) {
			addSuggestion(r, "Same name, different email address");
		}

		// 2. Same email domain + similar name (fuzzy match)
		const dupesByDomain = (await db.execute(sql`
			SELECT a.id AS id1, a.name AS name1, a.primary_email AS email1,
			       a.company AS company1, a.interaction_count AS count1,
			       b.id AS id2, b.name AS name2, b.primary_email AS email2,
			       b.company AS company2, b.interaction_count AS count2
			FROM contacts a
			JOIN contacts b ON a.user_id = b.user_id
			  AND a.id < b.id
			  AND split_part(a.primary_email, '@', 2) = split_part(b.primary_email, '@', 2)
			  AND a.primary_email != b.primary_email
			  AND a.name IS NOT NULL AND b.name IS NOT NULL
			  AND similarity(lower(a.name), lower(b.name)) > 0.4
			WHERE a.user_id = ${userId}
			  AND a.archived = false AND b.archived = false
			LIMIT 10
		`)) as unknown as DupeRow[];

		for (const r of dupesByDomain ?? []) {
			addSuggestion(r, "Same domain with similar name");
		}

		// 3. One contact's email appears in the other's additionalEmails
		const dupesByAdditional = (await db.execute(sql`
			SELECT a.id AS id1, a.name AS name1, a.primary_email AS email1,
			       a.company AS company1, a.interaction_count AS count1,
			       b.id AS id2, b.name AS name2, b.primary_email AS email2,
			       b.company AS company2, b.interaction_count AS count2
			FROM contacts a
			JOIN contacts b ON a.user_id = b.user_id
			  AND a.id < b.id
			  AND (
			    a.primary_email = ANY(b.additional_emails)
			    OR b.primary_email = ANY(a.additional_emails)
			  )
			WHERE a.user_id = ${userId}
			  AND a.archived = false AND b.archived = false
			LIMIT 10
		`)) as unknown as DupeRow[];

		for (const r of dupesByAdditional ?? []) {
			addSuggestion(r, "Shared email address");
		}

		// New contacts this week
		const newResult = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(contacts)
			.where(
				and(eq(contacts.userId, userId), gte(contacts.createdAt, weekAgo)),
			);

		return {
			ok: true,
			data: {
				mergeSuggestions: suggestions.slice(0, 10),
				newContactsThisWeek: newResult[0]?.count ?? 0,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get suggestions";
		console.error("[contacts] getSuggestions error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Merge Contacts ── */

async function mergeContacts(
	userId: string,
	primaryContactId: string,
	mergeWithContactId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		if (primaryContactId === mergeWithContactId) {
			return {
				ok: false,
				error: "Cannot merge a contact with itself",
				status: 400,
			};
		}

		// Verify both contacts belong to the user
		const [primary, secondary] = await Promise.all([
			db.query.contacts.findFirst({
				where: and(
					eq(contacts.id, primaryContactId),
					eq(contacts.userId, userId),
				),
			}),
			db.query.contacts.findFirst({
				where: and(
					eq(contacts.id, mergeWithContactId),
					eq(contacts.userId, userId),
				),
			}),
		]);

		if (!primary || !secondary) {
			return {
				ok: false,
				error: "One or both contacts not found",
				status: 404,
			};
		}

		// Merge into primary contact:
		// - Collect all unique emails
		const allEmails = new Set([
			primary.primaryEmail,
			...primary.additionalEmails,
			secondary.primaryEmail,
			...secondary.additionalEmails,
		]);
		allEmails.delete(primary.primaryEmail); // remove primary from additional
		const additionalEmails = Array.from(allEmails);

		// - Pick best values (prefer primary, fall back to secondary)
		const mergedName = primary.name || secondary.name;
		const mergedCompany = primary.company || secondary.company;
		const mergedJobTitle = primary.jobTitle || secondary.jobTitle;
		const mergedPhone = primary.phone || secondary.phone;
		const mergedAvatarUrl = primary.avatarUrl || secondary.avatarUrl;
		const mergedNotes = [primary.notes, secondary.notes]
			.filter(Boolean)
			.join("\n\n");
		const mergedStarred = primary.starred || secondary.starred;
		const mergedInteractionCount =
			primary.interactionCount + secondary.interactionCount;
		const mergedScore = Math.max(
			primary.relationshipScore,
			secondary.relationshipScore,
		);
		const mergedLastInteraction =
			primary.lastInteractionAt && secondary.lastInteractionAt
				? primary.lastInteractionAt > secondary.lastInteractionAt
					? primary.lastInteractionAt
					: secondary.lastInteractionAt
				: primary.lastInteractionAt || secondary.lastInteractionAt;

		// Update primary contact with merged data
		await db
			.update(contacts)
			.set({
				additionalEmails,
				name: mergedName,
				company: mergedCompany,
				jobTitle: mergedJobTitle,
				phone: mergedPhone,
				avatarUrl: mergedAvatarUrl,
				notes: mergedNotes || null,
				starred: mergedStarred,
				interactionCount: mergedInteractionCount,
				relationshipScore: mergedScore,
				lastInteractionAt: mergedLastInteraction,
			})
			.where(eq(contacts.id, primaryContactId));

		// Reassign interactions from secondary to primary
		await db
			.update(contactInteractions)
			.set({ contactId: primaryContactId })
			.where(eq(contactInteractions.contactId, mergeWithContactId));

		// Reassign follow-ups from secondary to primary
		await db
			.update(contactFollowUps)
			.set({ contactId: primaryContactId })
			.where(eq(contactFollowUps.contactId, mergeWithContactId));

		// Merge tags: get secondary's tags and assign to primary (skip duplicates)
		const primaryTags = await db
			.select({ tagId: contactTagAssignments.tagId })
			.from(contactTagAssignments)
			.where(eq(contactTagAssignments.contactId, primaryContactId));
		const primaryTagIds = new Set(primaryTags.map((t) => t.tagId));

		const secondaryTags = await db
			.select({ tagId: contactTagAssignments.tagId })
			.from(contactTagAssignments)
			.where(eq(contactTagAssignments.contactId, mergeWithContactId));

		const newTags = secondaryTags.filter((t) => !primaryTagIds.has(t.tagId));
		if (newTags.length > 0) {
			await db.insert(contactTagAssignments).values(
				newTags.map((t) => ({
					contactId: primaryContactId,
					tagId: t.tagId,
				})),
			);
		}

		// Delete secondary contact (cascades interactions, tags, follow-ups remaining)
		await db.delete(contacts).where(eq(contacts.id, mergeWithContactId));

		// Clean up any dismissals referencing the deleted contact
		await db
			.delete(contactMergeDismissals)
			.where(
				or(
					eq(contactMergeDismissals.contactIdA, mergeWithContactId),
					eq(contactMergeDismissals.contactIdB, mergeWithContactId),
				),
			);

		console.log(
			`[contacts] Merged contact ${mergeWithContactId} into ${primaryContactId} for user ${userId}`,
		);

		return { ok: true, data: { message: "Contacts merged successfully" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to merge contacts";
		console.error("[contacts] mergeContacts error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Dismiss Merge Suggestion ── */

async function dismissMergeSuggestion(
	userId: string,
	contactIdA: string,
	contactIdB: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		// Always store with smaller ID first for consistency
		const [idA, idB] =
			contactIdA < contactIdB
				? [contactIdA, contactIdB]
				: [contactIdB, contactIdA];

		await db
			.insert(contactMergeDismissals)
			.values({ userId, contactIdA: idA, contactIdB: idB })
			.onConflictDoNothing();

		return { ok: true, data: { message: "Suggestion dismissed" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to dismiss suggestion";
		console.error("[contacts] dismissMergeSuggestion error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Discover (trigger full scan) ── */

async function triggerDiscover(
	userId: string,
): Promise<ServiceResult<{ message: string }>> {
	try {
		await enqueueContactFullScan(userId);
		return { ok: true, data: { message: "Contact discovery started" } };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to start discovery";
		console.error("[contacts] triggerDiscover error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Meeting Prep Brief ── */

async function getMeetingPrep(
	userId: string,
	eventId: string,
): Promise<
	ServiceResult<{
		eventId: string;
		eventTitle: string | null;
		startTime: string;
		attendees: {
			contactId: string | null;
			email: string;
			name: string | null;
			relationshipScore: number | null;
			lastInteractionAt: string | null;
			lastInteractionTitle: string | null;
			recentEmailSubjects: string[];
			notes: string | null;
		}[];
	}>
> {
	try {
		const event = await db.query.calendarEvents.findFirst({
			where: and(
				eq(calendarEvents.id, eventId),
				eq(calendarEvents.userId, userId),
			),
		});

		if (!event) {
			return { ok: false, error: "Event not found", status: 404 };
		}

		// Collect attendee emails
		const attendeeEmails: { email: string; name: string | null }[] = [];
		if (event.organizer?.email) {
			attendeeEmails.push({
				email: event.organizer.email.toLowerCase(),
				name: event.organizer.displayName ?? null,
			});
		}
		for (const a of event.attendees ?? []) {
			if (a.email) {
				attendeeEmails.push({
					email: a.email.toLowerCase(),
					name: a.displayName ?? null,
				});
			}
		}

		const result: {
			contactId: string | null;
			email: string;
			name: string | null;
			relationshipScore: number | null;
			lastInteractionAt: string | null;
			lastInteractionTitle: string | null;
			recentEmailSubjects: string[];
			notes: string | null;
		}[] = [];

		for (const attendee of attendeeEmails) {
			const contact = await db.query.contacts.findFirst({
				where: and(
					eq(contacts.userId, userId),
					eq(contacts.primaryEmail, attendee.email),
				),
			});

			if (!contact) {
				result.push({
					contactId: null,
					email: attendee.email,
					name: attendee.name,
					relationshipScore: null,
					lastInteractionAt: null,
					lastInteractionTitle: null,
					recentEmailSubjects: [],
					notes: null,
				});
				continue;
			}

			// Last interaction
			const lastInteraction = await db
				.select({
					title: contactInteractions.title,
					occurredAt: contactInteractions.occurredAt,
				})
				.from(contactInteractions)
				.where(eq(contactInteractions.contactId, contact.id))
				.orderBy(desc(contactInteractions.occurredAt))
				.limit(1);

			// Recent email subjects
			const recentEmails = await db
				.select({ subject: emails.subject })
				.from(emails)
				.where(
					and(
						eq(emails.userId, userId),
						or(
							eq(emails.fromAddress, contact.primaryEmail),
							sql`${emails.toAddresses} @> ARRAY[${contact.primaryEmail}]::text[]`,
						),
					),
				)
				.orderBy(desc(emails.receivedAt))
				.limit(5);

			result.push({
				contactId: contact.id,
				email: contact.primaryEmail,
				name: contact.name ?? attendee.name,
				relationshipScore: contact.relationshipScore,
				lastInteractionAt:
					lastInteraction[0]?.occurredAt?.toISOString() ?? null,
				lastInteractionTitle: lastInteraction[0]?.title ?? null,
				recentEmailSubjects: recentEmails
					.map((e) => e.subject)
					.filter((s): s is string => s !== null),
				notes: contact.notes,
			});
		}

		return {
			ok: true,
			data: {
				eventId: event.id,
				eventTitle: event.title,
				startTime: event.startTime.toISOString(),
				attendees: result,
			},
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get meeting prep";
		console.error("[contacts] getMeetingPrep error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Tag suggestions ── */

async function getTagSuggestions(userId: string): Promise<
	ServiceResult<
		{
			name: string;
			reason: string;
			contactIds: string[];
			contacts: { id: string; name: string | null; email: string }[];
		}[]
	>
> {
	try {
		// Get existing tag names so we don't suggest duplicates
		const existingTags = await db
			.select({ name: contactTags.name })
			.from(contactTags)
			.where(eq(contactTags.userId, userId));
		const existingNames = new Set(
			existingTags.map((t) => t.name.toLowerCase()),
		);

		// Get already-tagged contact IDs so we skip them
		const taggedRows = await db
			.selectDistinct({ contactId: contactTagAssignments.contactId })
			.from(contactTagAssignments)
			.innerJoin(contactTags, eq(contactTags.id, contactTagAssignments.tagId))
			.where(eq(contactTags.userId, userId));
		const taggedIds = new Set(taggedRows.map((r) => r.contactId));

		// Domain-based: group contacts by email domain (min 2 per domain)
		type DomainRow = {
			domain: string;
			contact_ids: string[];
			names: (string | null)[];
			primary_emails: string[];
		};
		const domainGroups = (await db.execute(sql`
			SELECT
				split_part(c.primary_email, '@', 2) AS domain,
				array_agg(c.id) AS contact_ids,
				array_agg(c.name) AS names,
				array_agg(c.primary_email) AS primary_emails
			FROM contacts c
			WHERE c.user_id = ${userId}
				AND c.archived = false
				AND c.primary_email IS NOT NULL
				AND split_part(c.primary_email, '@', 2) NOT IN (
					'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
					'icloud.com', 'aol.com', 'protonmail.com', 'mail.com'
				)
			GROUP BY split_part(c.primary_email, '@', 2)
			HAVING count(*) >= 2
			ORDER BY count(*) DESC
			LIMIT 10
		`)) as unknown as DomainRow[];

		const suggestions: {
			name: string;
			reason: string;
			contactIds: string[];
			contacts: { id: string; name: string | null; email: string }[];
		}[] = [];

		for (const group of domainGroups) {
			// Derive tag name from domain (e.g. "acme.com" → "Acme")
			const domainParts = group.domain.split(".");
			const rawName =
				(domainParts.length > 1 ? domainParts[0] : group.domain) ?? "";
			const tagName = rawName.charAt(0).toUpperCase() + rawName.slice(1);

			if (existingNames.has(tagName.toLowerCase())) continue;

			// Filter out already-tagged contacts
			const contactIds = group.contact_ids.filter((id) => !taggedIds.has(id));
			if (contactIds.length < 2) continue;

			const contactList = contactIds.map((id) => ({
				id,
				name: group.names[group.contact_ids.indexOf(id)] ?? null,
				email: group.primary_emails[group.contact_ids.indexOf(id)] ?? "",
			}));

			suggestions.push({
				name: tagName,
				reason: `${contactIds.length} contacts share @${group.domain}`,
				contactIds,
				contacts: contactList.slice(0, 5),
			});
		}

		return { ok: true, data: suggestions.slice(0, 8) };
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to get tag suggestions";
		console.error("[contacts] getTagSuggestions error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Suggest CC ── */

type SuggestedContact = {
	id: string;
	name: string | null;
	email: string;
};

async function suggestCc(
	userId: string,
	toEmail: string,
): Promise<ServiceResult<SuggestedContact[]>> {
	try {
		// Find contacts frequently CC'd alongside this recipient
		type CcRow = {
			contact_id: string;
			name: string | null;
			email: string;
			co_count: number;
		};

		const results = (await db.execute(sql`
			WITH target_threads AS (
				SELECT DISTINCT e.provider_thread_id
				FROM emails e
				WHERE e.user_id = ${userId}
					AND e.provider_thread_id IS NOT NULL
					AND (
						${toEmail} = ANY(e.to_addresses)
						OR ${toEmail} = ANY(e.cc_addresses)
						OR lower(e.from_address) = lower(${toEmail})
					)
				LIMIT 200
			),
			co_participants AS (
				SELECT unnest(e.to_addresses) AS addr
				FROM emails e
				INNER JOIN target_threads tt ON e.provider_thread_id = tt.provider_thread_id
				WHERE e.user_id = ${userId}
				UNION ALL
				SELECT unnest(e.cc_addresses)
				FROM emails e
				INNER JOIN target_threads tt ON e.provider_thread_id = tt.provider_thread_id
				WHERE e.user_id = ${userId}
			)
			SELECT
				c.id AS contact_id,
				c.name,
				c.primary_email AS email,
				count(*)::int AS co_count
			FROM co_participants cp
			INNER JOIN contacts c ON lower(c.primary_email) = lower(cp.addr) AND c.user_id = ${userId}
			WHERE lower(cp.addr) != lower(${toEmail})
				AND c.archived = false
			GROUP BY c.id, c.name, c.primary_email
			HAVING count(*) >= 2
			ORDER BY count(*) DESC
			LIMIT 5
		`)) as unknown as CcRow[];

		return {
			ok: true,
			data: results.map((r) => ({
				id: r.contact_id,
				name: r.name,
				email: r.email,
			})),
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Failed to suggest CC";
		console.error("[contacts] suggestCc error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Suggest attendees ── */

async function suggestAttendees(
	userId: string,
	topic: string,
): Promise<ServiceResult<SuggestedContact[]>> {
	try {
		// Find contacts from past meetings with similar subjects
		type AttendeeRow = {
			contact_id: string;
			name: string | null;
			email: string;
			relevance: number;
		};

		const searchTerm = `%${topic.replace(/[%_]/g, "")}%`;

		const results = (await db.execute(sql`
			SELECT
				c.id AS contact_id,
				c.name,
				c.primary_email AS email,
				count(*)::int AS relevance
			FROM contact_interactions ci
			INNER JOIN contacts c ON c.id = ci.contact_id
			WHERE ci.user_id = ${userId}
				AND ci.type = 'meeting'
				AND ci.title ILIKE ${searchTerm}
				AND c.archived = false
			GROUP BY c.id, c.name, c.primary_email
			ORDER BY count(*) DESC
			LIMIT 8
		`)) as unknown as AttendeeRow[];

		return {
			ok: true,
			data: results.map((r) => ({
				id: r.contact_id,
				name: r.name,
				email: r.email,
			})),
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to suggest attendees";
		console.error("[contacts] suggestAttendees error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

/* ── Suggest assignee ── */

async function suggestAssignee(
	userId: string,
	context: string,
): Promise<ServiceResult<SuggestedContact[]>> {
	try {
		// Find contacts from email threads matching context
		type AssigneeRow = {
			contact_id: string;
			name: string | null;
			email: string;
			relevance: number;
		};

		const searchTerm = `%${context.replace(/[%_]/g, "")}%`;

		const results = (await db.execute(sql`
			SELECT
				c.id AS contact_id,
				c.name,
				c.primary_email AS email,
				count(*)::int AS relevance
			FROM contact_interactions ci
			INNER JOIN contacts c ON c.id = ci.contact_id
			WHERE ci.user_id = ${userId}
				AND ci.type IN ('email_sent', 'email_received')
				AND ci.title ILIKE ${searchTerm}
				AND c.archived = false
			GROUP BY c.id, c.name, c.primary_email
			ORDER BY count(*) DESC
			LIMIT 5
		`)) as unknown as AssigneeRow[];

		return {
			ok: true,
			data: results.map((r) => ({
				id: r.contact_id,
				name: r.name,
				email: r.email,
			})),
		};
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "Failed to suggest assignee";
		console.error("[contacts] suggestAssignee error:", message);
		return { ok: false, error: message, status: 500 };
	}
}

async function lookupByEmail(
	userId: string,
	email: string,
): Promise<ServiceResult<ReturnType<typeof serializeContact> | null>> {
	try {
		const contact = await db.query.contacts.findFirst({
			where: and(
				eq(contacts.userId, userId),
				or(
					eq(contacts.primaryEmail, email.toLowerCase()),
					sql`${email.toLowerCase()} = ANY(${contacts.additionalEmails})`,
				),
			),
		});

		if (!contact) {
			return { ok: true, data: null };
		}

		const tagRows = await db
			.select({
				id: contactTags.id,
				name: contactTags.name,
				color: contactTags.color,
			})
			.from(contactTagAssignments)
			.innerJoin(contactTags, eq(contactTagAssignments.tagId, contactTags.id))
			.where(eq(contactTagAssignments.contactId, contact.id));

		return {
			ok: true,
			data: serializeContact({
				...contact,
				tags: tagRows.map((t) => ({
					id: t.id,
					name: t.name,
					color: t.color ?? null,
				})),
			}),
		};
	} catch (err) {
		console.error("[contacts] lookupByEmail failed:", err);
		return { ok: false, error: "Failed to lookup contact", status: 500 };
	}
}

export const contactService = {
	listContacts,
	lookupByEmail,
	getContact,
	createContact,
	updateContact,
	deleteContact,
	toggleStar,
	toggleArchive,
	listTags,
	createTag,
	updateTag,
	deleteTag,
	assignTag,
	removeTag,
	listInteractions,
	getContactEmails,
	getContactEvents,
	listFollowUps,
	completeFollowUp,
	dismissFollowUp,
	snoozeFollowUp,
	getModuleData,
	getSuggestions,
	mergeContacts,
	dismissMergeSuggestion,
	triggerDiscover,
	getMeetingPrep,
	getTagSuggestions,
	suggestCc,
	suggestAttendees,
	suggestAssignee,
};
