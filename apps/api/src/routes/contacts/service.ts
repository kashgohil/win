import {
	and,
	contactInteractions,
	contacts,
	contactTagAssignments,
	contactTags,
	db,
	desc,
	eq,
	ilike,
	or,
	sql,
} from "@wingmnn/db";

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

export const contactService = {
	listContacts,
	getContact,
	createContact,
	updateContact,
	deleteContact,
	toggleStar,
	toggleArchive,
};
