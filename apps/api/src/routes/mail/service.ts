import {
	and,
	asc,
	count,
	db,
	desc,
	emailAccounts,
	emailAttachments,
	emailCategoryEnum,
	emailProviderEnum,
	emails,
	eq,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	mailAutoHandled,
	mailSenderRules,
	not,
	or,
	sql,
	syncStatusEnum,
} from "@wingmnn/db";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { enqueueInitialSync, scheduleRecurringSync } from "@wingmnn/queue";
import { cacheable, invalidateCache } from "@wingmnn/redis";
import { sanitizeEmailHtml } from "../../lib/sanitize-email";
import { createOAuthState, verifyOAuthState } from "./oauth-state";

/* ── Types ── */

type BriefingStat = {
	label: string;
	value: string | number;
	trend?: "up" | "down" | "neutral";
	accent?: boolean;
};

type TriageItem = {
	id: string;
	title: string;
	subtitle?: string;
	timestamp: string;
	urgent?: boolean;
	actions: { label: string; variant?: "default" | "outline" | "ghost" }[];
};

type AutoHandledItem = {
	id: string;
	text: string;
	subject?: string;
	sender?: string;
	actionType: string;
	emailId?: string;
	linkedModule?: string;
	timestamp: string;
};

type ModuleData = {
	briefing: BriefingStat[];
	triage: TriageItem[];
	autoHandled: AutoHandledItem[];
};

type DataResult =
	| { ok: true; data: ModuleData }
	| { ok: false; error: string; status: 500 };

type EmailListResult =
	| {
			ok: true;
			data: {
				emails: SerializedEmail[];
				total: number;
				hasMore: boolean;
				nextCursor?: string;
			};
	  }
	| { ok: false; error: string; status: 400 | 500 };

type EmailDetailResult =
	| { ok: true; data: SerializedEmailDetail }
	| { ok: false; error: string; status: 404 | 500 };

type AccountListResult =
	| { ok: true; data: SerializedAccount[] }
	| { ok: false; error: string; status: 500 };

type ConnectResult =
	| { ok: true; url: string }
	| { ok: false; error: string; status: 400 | 500 };

type OAuthCallbackResult =
	| { ok: true; accountId: string }
	| { ok: false; error: string; status: 400 | 500 };

type DisconnectResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type TriageActionResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 400 | 404 | 500 };

type ToggleStarResult =
	| { ok: true; data: { isStarred: boolean } }
	| { ok: false; error: string; status: 404 | 500 };

type ToggleReadResult =
	| { ok: true; data: { isRead: boolean } }
	| { ok: false; error: string; status: 404 | 500 };

type ActionResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type ReplyResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type ForwardResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type SerializedSenderRule = {
	id: string;
	senderAddress: string;
	category: (typeof emailCategoryEnum.enumValues)[number];
	createdAt: string;
};

type CreateSenderRuleResult =
	| { ok: true; data: { rule: SerializedSenderRule; updatedCount: number } }
	| { ok: false; error: string; status: 400 | 500 };

type DeleteSenderRuleResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type GetSenderRulesResult =
	| { ok: true; data: SerializedSenderRule[] }
	| { ok: false; error: string; status: 500 };

type SerializedThread = {
	threadId: string;
	subject: string | null;
	snippet: string | null;
	latestReceivedAt: string;
	messageCount: number;
	unreadCount: number;
	hasAttachments: boolean;
	isStarred: boolean;
	category: (typeof emailCategoryEnum.enumValues)[number];
	priorityScore: number;
	aiSummary: string | null;
	latestMessage: {
		id: string;
		fromAddress: string | null;
		fromName: string | null;
		toAddresses: string[] | null;
	};
	participants: Array<{ address: string; name: string | null }>;
};

type ThreadListResult =
	| {
			ok: true;
			data: {
				threads: SerializedThread[];
				total: number;
				hasMore: boolean;
				nextCursor?: string;
			};
	  }
	| { ok: false; error: string; status: 400 | 500 };

type ThreadDetailResult =
	| {
			ok: true;
			data: {
				threadId: string;
				subject: string | null;
				messages: SerializedEmailDetail[];
				isMerged: boolean;
			};
	  }
	| { ok: false; error: string; status: 404 | 500 };

type MergeResult =
	| { ok: true; threadId: string }
	| { ok: false; error: string; status: 400 | 500 };

type UnmergeResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type SenderEntry = {
	name: string | null;
	address: string;
	count: number;
};

type SenderListResult =
	| { ok: true; data: SenderEntry[] }
	| { ok: false; error: string; status: 500 };

type SerializedEmail = {
	id: string;
	emailAccountId: string;
	subject: string | null;
	fromAddress: string | null;
	fromName: string | null;
	toAddresses: string[] | null;
	ccAddresses: string[] | null;
	snippet: string | null;
	receivedAt: string;
	isRead: boolean;
	isStarred: boolean;
	hasAttachments: boolean;
	labels: string[] | null;
	category: (typeof emailCategoryEnum.enumValues)[number];
	priorityScore: number;
	aiSummary: string | null;
};

type SerializedAttachment = {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
};

type SerializedEmailDetail = SerializedEmail & {
	bodyPlain: string | null;
	bodyHtml: string | null;
	attachments: SerializedAttachment[];
};

type SerializedAttachmentWithContext = SerializedAttachment & {
	emailId: string;
	emailSubject: string | null;
	fromName: string | null;
	fromAddress: string | null;
	receivedAt: string;
	category: (typeof emailCategoryEnum.enumValues)[number];
};

type AttachmentListResult =
	| {
			ok: true;
			data: {
				attachments: SerializedAttachmentWithContext[];
				total: number;
				hasMore: boolean;
				nextCursor?: string;
			};
	  }
	| { ok: false; error: string; status: 400 | 500 };

type DownloadAttachmentResult =
	| { ok: true; data: Uint8Array; filename: string; mimeType: string }
	| { ok: false; error: string; status: 403 | 404 | 500 };

type SerializedAccount = {
	id: string;
	provider: (typeof emailProviderEnum.enumValues)[number];
	email: string;
	syncStatus: (typeof syncStatusEnum.enumValues)[number];
	lastSyncAt: string | null;
	active: boolean;
	createdAt: string;
};

/* ── Provider helpers ── */

async function getEmailProviderContext(emailId: string) {
	const email = await db.query.emails.findFirst({
		where: eq(emails.id, emailId),
	});

	if (!email) return { ok: false as const, error: "Email not found" };

	const account = await db.query.emailAccounts.findFirst({
		where: eq(emailAccounts.id, email.emailAccountId),
	});

	if (!account || !account.active) {
		return {
			ok: false as const,
			error: "Email account not found or inactive",
		};
	}

	const accessToken = await getValidAccessToken(account.id);
	if (!accessToken) {
		return { ok: false as const, error: "Could not obtain access token" };
	}

	const provider = getProvider(account.provider);
	if (!provider) {
		return {
			ok: false as const,
			error: `Unknown provider: ${account.provider}`,
		};
	}

	return { ok: true as const, email, account, accessToken, provider };
}

/* ── Helpers ── */

function timeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "just now";
	if (diffMin < 60) return `${diffMin}min ago`;

	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}h ago`;

	const diffD = Math.floor(diffH / 24);
	if (diffD === 1) return "yesterday";
	return `${diffD}d ago`;
}

function serializeEmail(e: typeof emails.$inferSelect): SerializedEmail {
	return {
		id: e.id,
		emailAccountId: e.emailAccountId,
		subject: e.subject,
		fromAddress: e.fromAddress,
		fromName: e.fromName,
		toAddresses: e.toAddresses,
		ccAddresses: e.ccAddresses,
		snippet: e.snippet,
		receivedAt: e.receivedAt.toISOString(),
		isRead: e.isRead,
		isStarred: e.isStarred,
		hasAttachments: e.hasAttachments,
		labels: e.labels,
		category: e.category,
		priorityScore: e.priorityScore,
		aiSummary: e.aiSummary,
	};
}

function serializeAccount(
	a: typeof emailAccounts.$inferSelect,
): SerializedAccount {
	return {
		id: a.id,
		provider: a.provider,
		email: a.email,
		syncStatus: a.syncStatus,
		lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
		active: a.active,
		createdAt: a.createdAt.toISOString(),
	};
}

/* ── Filter builder (shared by getEmails + getThreads) ── */

type FilterOptions = {
	category?: string;
	unreadOnly?: boolean;
	readOnly?: boolean;
	q?: string;
	from?: string;
	subject?: string;
	to?: string;
	cc?: string;
	label?: string;
	starred?: boolean;
	attachment?: boolean;
	filename?: string;
	filetype?: string;
	after?: string;
	before?: string;
	accountIds?: string[];
	sentOnly?: boolean;
};

function buildFilterConditions(
	userId: string,
	options: FilterOptions,
):
	| { ok: true; conditions: ReturnType<typeof and>[] }
	| { ok: false; error: string; status: 400 } {
	const conditions: any[] = [eq(emails.userId, userId)];
	// Exclude snoozed emails from normal listings
	conditions.push(
		or(isNull(emails.triageStatus), not(eq(emails.triageStatus, "snoozed")))!,
	);
	if (options.accountIds && options.accountIds.length > 0) {
		conditions.push(inArray(emails.emailAccountId, options.accountIds));
	}
	if (options.category) {
		const validCategories = emailCategoryEnum.enumValues as readonly string[];
		if (!validCategories.includes(options.category)) {
			return {
				ok: false,
				error: `Invalid category: ${options.category}`,
				status: 400,
			};
		}
		conditions.push(
			eq(
				emails.category,
				options.category as (typeof emails.category.enumValues)[number],
			),
		);
	}
	if (options.unreadOnly) {
		conditions.push(eq(emails.isRead, false));
	}
	if (options.readOnly) {
		conditions.push(eq(emails.isRead, true));
	}
	if (options.q) {
		const pattern = `%${options.q}%`;
		conditions.push(
			or(
				ilike(emails.subject, pattern),
				ilike(emails.snippet, pattern),
				ilike(emails.fromName, pattern),
				ilike(emails.fromAddress, pattern),
				ilike(emails.bodyPlain, pattern),
			)!,
		);
	}
	if (options.subject) {
		conditions.push(ilike(emails.subject, `%${options.subject}%`));
	}
	if (options.to) {
		conditions.push(
			sql`${emails.toAddresses}::text[] @> ARRAY[${options.to}]::text[]`,
		);
	}
	if (options.cc) {
		conditions.push(
			sql`${emails.ccAddresses}::text[] @> ARRAY[${options.cc}]::text[]`,
		);
	}
	if (options.label) {
		conditions.push(
			sql`${emails.labels}::text[] @> ARRAY[${options.label}]::text[]`,
		);
	}
	if (options.from) {
		const fromPattern = `%${options.from}%`;
		conditions.push(
			or(
				ilike(emails.fromAddress, fromPattern),
				ilike(emails.fromName, fromPattern),
			)!,
		);
	}
	if (options.starred) {
		conditions.push(eq(emails.isStarred, true));
	}
	if (options.attachment) {
		conditions.push(eq(emails.hasAttachments, true));
	}
	if (options.filename) {
		conditions.push(
			sql`EXISTS (SELECT 1 FROM email_attachments WHERE email_attachments.email_id = ${emails.id} AND email_attachments.filename ILIKE ${"%" + options.filename + "%"})`,
		);
	}
	if (options.filetype) {
		const ft = options.filetype;
		conditions.push(
			sql`EXISTS (SELECT 1 FROM email_attachments WHERE email_attachments.email_id = ${emails.id} AND (email_attachments.mime_type ILIKE ${"%" + ft + "%"} OR email_attachments.filename ILIKE ${"%" + "." + ft}))`,
		);
	}
	if (options.after) {
		conditions.push(gte(emails.receivedAt, new Date(options.after)));
	}
	if (options.before) {
		conditions.push(lte(emails.receivedAt, new Date(options.before)));
	}
	if (options.sentOnly) {
		conditions.push(
			sql`${emails.fromAddress} IN (SELECT ${emailAccounts.email} FROM ${emailAccounts} WHERE ${emailAccounts.userId} = ${userId})`,
		);
	}
	return { ok: true, conditions };
}

/* ── Thread grouping key expression ── */

const threadKeyExpr = sql<string>`COALESCE(
	${emails.threadGroupId}::text,
	${emails.emailAccountId}::text || ':' || ${emails.providerThreadId},
	${emails.id}::text
)`;

/* ── Service ── */

class MailService {
	async getModuleData(
		userId: string,
		accountIds?: string[],
	): Promise<DataResult> {
		try {
			const [briefing, triage, autoHandledItems] = await Promise.all([
				this.getBriefing(userId, accountIds),
				this.getTriageItems(userId, accountIds),
				this.getAutoHandledItems(userId, accountIds),
			]);

			return {
				ok: true,
				data: {
					briefing,
					triage,
					autoHandled: autoHandledItems,
				},
			};
		} catch (err) {
			console.error("[mail] getModuleData failed:", err);
			return { ok: false, error: "Failed to load mail data", status: 500 };
		}
	}

	private async getBriefing(
		userId: string,
		accountIds?: string[],
	): Promise<BriefingStat[]> {
		const cacheKey = accountIds
			? `mail:briefing:${userId}:${accountIds.sort().join(",")}`
			: `mail:briefing:${userId}`;
		return cacheable(
			cacheKey,
			async () => {
				const unreadConds = [
					eq(emails.userId, userId),
					eq(emails.isRead, false),
				];
				if (accountIds)
					unreadConds.push(inArray(emails.emailAccountId, accountIds));
				const [unreadResult] = await db
					.select({ value: count() })
					.from(emails)
					.where(and(...unreadConds));

				const triageConds = [
					eq(emails.userId, userId),
					eq(emails.triageStatus, "pending"),
				];
				if (accountIds)
					triageConds.push(inArray(emails.emailAccountId, accountIds));
				const [triageResult] = await db
					.select({ value: count() })
					.from(emails)
					.where(and(...triageConds));

				const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				const autoHandledConds = [
					eq(mailAutoHandled.userId, userId),
					gte(mailAutoHandled.createdAt, twentyFourHoursAgo),
				];
				if (accountIds) {
					autoHandledConds.push(
						sql`${mailAutoHandled.emailId} IN (SELECT ${emails.id} FROM ${emails} WHERE ${inArray(emails.emailAccountId, accountIds)})`,
					);
				}
				const [autoHandledResult] = await db
					.select({ value: count() })
					.from(mailAutoHandled)
					.where(and(...autoHandledConds));

				return [
					{ label: "unread", value: unreadResult?.value ?? 0 },
					{
						label: "need you",
						value: triageResult?.value ?? 0,
						accent: true,
					},
					{
						label: "auto-handled",
						value: autoHandledResult?.value ?? 0,
					},
				];
			},
			{ ttl: 60 },
		);
	}

	private async getTriageItems(
		userId: string,
		accountIds?: string[],
	): Promise<TriageItem[]> {
		const conditions = [
			eq(emails.userId, userId),
			eq(emails.triageStatus, "pending"),
		];
		if (accountIds) conditions.push(inArray(emails.emailAccountId, accountIds));
		const items = await db.query.emails.findMany({
			where: and(...conditions),
			orderBy: [
				desc(sql`(${emails.category} = 'urgent')`),
				desc(emails.receivedAt),
			],
			limit: 20,
		});

		const actions: TriageItem["actions"] = [
			{ label: "Reply", variant: "default" },
			{ label: "Archive", variant: "outline" },
			{ label: "Dismiss", variant: "ghost" },
		];

		return items.map((item) => ({
			id: item.id,
			title: item.subject ?? "No subject",
			subtitle: item.triageReason ?? undefined,
			timestamp: timeAgo(item.receivedAt),
			urgent: item.category === "urgent" || undefined,
			actions,
		}));
	}

	private async getAutoHandledItems(
		userId: string,
		accountIds?: string[],
	): Promise<AutoHandledItem[]> {
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const conditions = [
			eq(mailAutoHandled.userId, userId),
			gte(mailAutoHandled.createdAt, twentyFourHoursAgo),
		];
		if (accountIds) {
			conditions.push(
				sql`${mailAutoHandled.emailId} IN (SELECT ${emails.id} FROM ${emails} WHERE ${inArray(emails.emailAccountId, accountIds)})`,
			);
		}

		const items = await db.query.mailAutoHandled.findMany({
			where: and(...conditions),
			orderBy: [desc(mailAutoHandled.createdAt)],
			limit: 20,
		});

		// Batch-fetch linked emails for subject/sender context
		const emailIds = items
			.map((item) => item.emailId)
			.filter((id): id is string => id !== null);
		const emailRows =
			emailIds.length > 0
				? await db.query.emails.findMany({
						where: inArray(emails.id, emailIds),
						columns: {
							id: true,
							subject: true,
							fromName: true,
							fromAddress: true,
						},
					})
				: [];
		const emailMap = new Map(emailRows.map((e) => [e.id, e]));

		return items.map((item) => {
			const email = item.emailId ? emailMap.get(item.emailId) : undefined;
			const metadata = item.metadata as {
				category?: string;
				emailAccountId?: string;
			} | null;
			return {
				id: item.id,
				text: item.text,
				subject: email?.subject ?? undefined,
				sender:
					email?.fromName || email?.fromAddress?.split("@")[0] || undefined,
				actionType: item.actionType,
				emailId: item.emailId ?? undefined,
				linkedModule: item.linkedModule ?? undefined,
				category: metadata?.category ?? undefined,
				timestamp: timeAgo(item.createdAt),
			};
		});
	}

	async getAttachments(
		userId: string,
		options: {
			limit?: number;
			cursor?: string;
			q?: string;
			filetype?: string;
			category?: string;
			from?: string;
			after?: string;
			before?: string;
			accountIds?: string[];
		},
	): Promise<AttachmentListResult> {
		const limit = options.limit ?? 30;

		try {
			const conditions = [eq(emails.userId, userId)];
			if (options.accountIds && options.accountIds.length > 0) {
				conditions.push(inArray(emails.emailAccountId, options.accountIds));
			}

			if (options.q) {
				conditions.push(ilike(emailAttachments.filename, `%${options.q}%`));
			}

			if (options.filetype) {
				const ft = options.filetype;
				const mimePatterns: Record<string, string[]> = {
					image: ["image/%"],
					pdf: ["application/pdf"],
					document: ["%document%", "%msword%", "text/plain", "%rtf%"],
					spreadsheet: ["%spreadsheet%", "%excel%"],
					presentation: ["%presentation%", "%powerpoint%"],
					video: ["video/%"],
					audio: ["audio/%"],
					archive: ["%zip%", "%compressed%", "%archive%", "%tar%", "%gzip%"],
					code: ["%javascript%", "%json%", "%xml%", "%html%"],
				};

				const patterns = mimePatterns[ft];
				if (patterns) {
					const mimeConditions = patterns.map((p) =>
						ilike(emailAttachments.mimeType, p),
					);
					conditions.push(or(...mimeConditions)!);
				} else {
					conditions.push(
						or(
							ilike(emailAttachments.mimeType, `%${ft}%`),
							ilike(emailAttachments.filename, `%.${ft}`),
						)!,
					);
				}
			}

			if (options.category) {
				conditions.push(
					eq(
						emails.category,
						options.category as (typeof emailCategoryEnum.enumValues)[number],
					),
				);
			}

			if (options.from) {
				const fromPattern = `%${options.from}%`;
				conditions.push(
					or(
						ilike(emails.fromAddress, fromPattern),
						ilike(emails.fromName, fromPattern),
					)!,
				);
			}

			if (options.after) {
				conditions.push(gte(emails.receivedAt, new Date(options.after)));
			}
			if (options.before) {
				conditions.push(lte(emails.receivedAt, new Date(options.before)));
			}

			const baseConditions = [...conditions];

			if (options.cursor) {
				try {
					const decoded = JSON.parse(atob(options.cursor)) as {
						receivedAt: string;
						id: string;
					};
					const cursorDate = new Date(decoded.receivedAt);
					conditions.push(
						or(
							lt(emails.receivedAt, cursorDate),
							and(
								eq(emails.receivedAt, cursorDate),
								lt(emailAttachments.id, decoded.id),
							),
						)!,
					);
				} catch {
					return { ok: false, error: "Invalid cursor", status: 400 };
				}
			}

			const [rows, totalResult] = await Promise.all([
				db
					.select({
						id: emailAttachments.id,
						filename: emailAttachments.filename,
						mimeType: emailAttachments.mimeType,
						size: emailAttachments.size,
						emailId: emails.id,
						emailSubject: emails.subject,
						fromName: emails.fromName,
						fromAddress: emails.fromAddress,
						receivedAt: emails.receivedAt,
						category: emails.category,
					})
					.from(emailAttachments)
					.innerJoin(emails, eq(emailAttachments.emailId, emails.id))
					.where(and(...conditions))
					.orderBy(desc(emails.receivedAt), desc(emailAttachments.id))
					.limit(limit + 1),
				db
					.select({ value: count() })
					.from(emailAttachments)
					.innerJoin(emails, eq(emailAttachments.emailId, emails.id))
					.where(and(...baseConditions))
					.then((r) => r[0]?.value ?? 0),
			]);

			const hasMore = rows.length > limit;
			const trimmed = hasMore ? rows.slice(0, limit) : rows;

			let nextCursor: string | undefined;
			if (hasMore && trimmed.length > 0) {
				const last = trimmed[trimmed.length - 1]!;
				nextCursor = btoa(
					JSON.stringify({
						receivedAt: last.receivedAt.toISOString(),
						id: last.id,
					}),
				);
			}

			return {
				ok: true,
				data: {
					attachments: trimmed.map((r) => ({
						id: r.id,
						filename: r.filename,
						mimeType: r.mimeType,
						size: r.size,
						emailId: r.emailId,
						emailSubject: r.emailSubject,
						fromName: r.fromName,
						fromAddress: r.fromAddress,
						receivedAt: r.receivedAt.toISOString(),
						category: r.category,
					})),
					total: totalResult,
					hasMore,
					nextCursor,
				},
			};
		} catch (err) {
			console.error("[mail] getAttachments failed:", err);
			return { ok: false, error: "Failed to load attachments", status: 500 };
		}
	}

	async getEmails(
		userId: string,
		options: FilterOptions & { limit?: number; cursor?: string },
	): Promise<EmailListResult> {
		const limit = options.limit ?? 50;

		try {
			const filterResult = buildFilterConditions(userId, options);
			if (!filterResult.ok) return filterResult;
			const conditions = [...filterResult.conditions];

			// Base conditions (without cursor) — used for count query
			const baseConditions = [...conditions];

			// Decode cursor for keyset pagination
			if (options.cursor) {
				try {
					const decoded = JSON.parse(atob(options.cursor)) as {
						receivedAt: string;
						id: string;
					};
					const cursorDate = new Date(decoded.receivedAt);
					conditions.push(
						or(
							lt(emails.receivedAt, cursorDate),
							and(eq(emails.receivedAt, cursorDate), lt(emails.id, decoded.id)),
						)!,
					);
				} catch {
					return {
						ok: false,
						error: "Invalid cursor",
						status: 400,
					};
				}
			}

			const [emailRows, totalResult] = await Promise.all([
				db.query.emails.findMany({
					where: and(...conditions),
					orderBy: [desc(emails.receivedAt), desc(emails.id)],
					limit: limit + 1,
				}),
				db
					.select({ value: count() })
					.from(emails)
					.where(and(...baseConditions))
					.then((r) => r[0]?.value ?? 0),
			]);

			const hasMore = emailRows.length > limit;
			const trimmed = hasMore ? emailRows.slice(0, limit) : emailRows;

			// Build next cursor from last row
			let nextCursor: string | undefined;
			if (hasMore && trimmed.length > 0) {
				const last = trimmed[trimmed.length - 1]!;
				nextCursor = btoa(
					JSON.stringify({
						receivedAt: last.receivedAt.toISOString(),
						id: last.id,
					}),
				);
			}

			return {
				ok: true,
				data: {
					emails: trimmed.map(serializeEmail),
					total: totalResult,
					hasMore,
					nextCursor,
				},
			};
		} catch (err) {
			console.error("[mail] getEmails failed:", err);
			return { ok: false, error: "Failed to load emails", status: 500 };
		}
	}

	async getSenders(userId: string, q?: string): Promise<SenderListResult> {
		try {
			const conditions = [eq(emails.userId, userId)];
			if (q) {
				const pattern = `%${q}%`;
				conditions.push(
					or(
						ilike(emails.fromAddress, pattern),
						ilike(emails.fromName, pattern),
					)!,
				);
			}

			const rows = await db
				.select({
					address: emails.fromAddress,
					name: emails.fromName,
					count: count(),
				})
				.from(emails)
				.where(and(...conditions))
				.groupBy(emails.fromAddress, emails.fromName)
				.orderBy(desc(count()))
				.limit(10);

			return {
				ok: true,
				data: rows
					.filter((r) => r.address !== null)
					.map((r) => ({
						name: r.name,
						address: r.address!,
						count: r.count,
					})),
			};
		} catch (err) {
			console.error("[mail] getSenders failed:", err);
			return { ok: false, error: "Failed to load senders", status: 500 };
		}
	}

	async getEmailDetail(
		userId: string,
		emailId: string,
	): Promise<EmailDetailResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
				with: { attachments: true },
			});

			if (!email) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			return {
				ok: true,
				data: {
					...serializeEmail(email),
					bodyPlain: email.bodyPlain,
					bodyHtml: email.bodyHtml ? sanitizeEmailHtml(email.bodyHtml) : null,
					attachments: (email.attachments ?? []).map((a) => ({
						id: a.id,
						filename: a.filename,
						mimeType: a.mimeType,
						size: a.size,
					})),
				},
			};
		} catch (err) {
			console.error("[mail] getEmailDetail failed:", err);
			return { ok: false, error: "Failed to load email", status: 500 };
		}
	}

	async downloadAttachment(
		userId: string,
		attachmentId: string,
	): Promise<DownloadAttachmentResult> {
		try {
			const attachment = await db.query.emailAttachments.findFirst({
				where: eq(emailAttachments.id, attachmentId),
				with: { email: true },
			});

			if (!attachment) {
				return { ok: false, error: "Attachment not found", status: 404 };
			}

			if (attachment.email.userId !== userId) {
				return { ok: false, error: "Forbidden", status: 403 };
			}

			const ctx = await getEmailProviderContext(attachment.email.id);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			const content = await ctx.provider.getAttachmentContent(
				ctx.accessToken,
				attachment.email.providerMessageId,
				attachment.providerAttachmentId,
			);

			if (!content) {
				return {
					ok: false,
					error: "Failed to fetch attachment content",
					status: 500,
				};
			}

			return {
				ok: true,
				data: content.data,
				filename: attachment.filename,
				mimeType: attachment.mimeType,
			};
		} catch (err) {
			console.error("[mail] downloadAttachment failed:", err);
			return {
				ok: false,
				error: "Failed to download attachment",
				status: 500,
			};
		}
	}

	async getAccounts(userId: string): Promise<AccountListResult> {
		try {
			const accounts = await db.query.emailAccounts.findMany({
				where: eq(emailAccounts.userId, userId),
				orderBy: [desc(emailAccounts.createdAt)],
			});

			return { ok: true, data: accounts.map(serializeAccount) };
		} catch (err) {
			console.error("[mail] getAccounts failed:", err);
			return { ok: false, error: "Failed to load accounts", status: 500 };
		}
	}

	async connectAccount(
		userId: string,
		provider: string,
	): Promise<ConnectResult> {
		if (provider !== "gmail" && provider !== "outlook") {
			return {
				ok: false,
				error: `Unsupported provider: ${provider}`,
				status: 400,
			};
		}

		try {
			const emailProvider = getProvider(provider);
			if (!emailProvider) {
				return {
					ok: false,
					error: `Provider '${provider}' not available`,
					status: 400,
				};
			}
			const state = await createOAuthState(userId);
			const url = emailProvider.getAuthUrl(state);
			return { ok: true, url };
		} catch (err) {
			console.error("[mail] connectAccount failed:", err);
			return {
				ok: false,
				error: "Failed to generate auth URL",
				status: 500,
			};
		}
	}

	async handleOAuthCallback(
		code: string,
		state: string,
		providerName: "gmail" | "outlook" = "gmail",
	): Promise<OAuthCallbackResult> {
		const userId = await verifyOAuthState(state);
		if (!userId) {
			return {
				ok: false,
				error: "Invalid or expired OAuth state",
				status: 400,
			};
		}

		try {
			const provider = getProvider(providerName);
			if (!provider) {
				return {
					ok: false,
					error: `${providerName} provider not available`,
					status: 500,
				};
			}

			const tokens = await provider.exchangeCode(code);

			// Upsert: update tokens if same user+provider+email already exists.
			// Google only returns refresh_token on the first authorization.
			// On re-auth it's undefined — preserve the existing one.
			const conflictSet: Record<string, unknown> = {
				accessToken: tokens.accessToken,
				tokenExpiresAt: tokens.expiresAt,
				scopes: tokens.scopes,
				syncStatus: "pending" as const,
				active: true,
				syncError: null,
			};
			if (tokens.refreshToken) {
				conflictSet.refreshToken = tokens.refreshToken;
			}

			const rows = await db
				.insert(emailAccounts)
				.values({
					userId,
					provider: providerName,
					email: tokens.email,
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					tokenExpiresAt: tokens.expiresAt,
					scopes: tokens.scopes,
					syncStatus: "pending",
					active: true,
				})
				.onConflictDoUpdate({
					target: [
						emailAccounts.userId,
						emailAccounts.provider,
						emailAccounts.email,
					],
					set: conflictSet,
				})
				.returning();

			const account = rows[0];
			if (!account) {
				return {
					ok: false,
					error: "Failed to create email account",
					status: 500,
				};
			}

			await enqueueInitialSync(account.id, userId);
			await scheduleRecurringSync(account.id, userId);

			return { ok: true, accountId: account.id };
		} catch (err) {
			console.error("[mail] handleOAuthCallback failed:", err);
			return {
				ok: false,
				error: "Failed to complete OAuth connection",
				status: 500,
			};
		}
	}

	async disconnectAccount(
		userId: string,
		accountId: string,
	): Promise<DisconnectResult> {
		try {
			const [deleted] = await db
				.delete(emailAccounts)
				.where(
					and(
						eq(emailAccounts.id, accountId),
						eq(emailAccounts.userId, userId),
					),
				)
				.returning();

			if (!deleted) {
				return {
					ok: false,
					error: "Account not found",
					status: 404,
				};
			}

			return { ok: true, message: "Account disconnected" };
		} catch (err) {
			console.error("[mail] disconnectAccount failed:", err);
			return {
				ok: false,
				error: "Failed to disconnect account",
				status: 500,
			};
		}
	}

	async toggleStar(userId: string, emailId: string): Promise<ToggleStarResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});

			if (!email) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			const newStarred = !email.isStarred;
			if (newStarred) {
				await ctx.provider.star(ctx.accessToken, email.providerMessageId);
			} else {
				await ctx.provider.unstar(ctx.accessToken, email.providerMessageId);
			}

			await db
				.update(emails)
				.set({ isStarred: newStarred })
				.where(eq(emails.id, emailId));

			return { ok: true, data: { isStarred: newStarred } };
		} catch (err) {
			console.error("[mail] toggleStar failed:", err);
			return { ok: false, error: "Failed to toggle star", status: 500 };
		}
	}

	async toggleRead(userId: string, emailId: string): Promise<ToggleReadResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});

			if (!email) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			const newIsRead = !email.isRead;
			if (newIsRead) {
				await ctx.provider.markRead(ctx.accessToken, email.providerMessageId);
			} else {
				await ctx.provider.markUnread(ctx.accessToken, email.providerMessageId);
			}

			await db
				.update(emails)
				.set({ isRead: newIsRead })
				.where(eq(emails.id, emailId));

			return { ok: true, data: { isRead: newIsRead } };
		} catch (err) {
			console.error("[mail] toggleRead failed:", err);
			return { ok: false, error: "Failed to toggle read status", status: 500 };
		}
	}

	async archiveEmail(userId: string, emailId: string): Promise<ActionResult> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			if (ctx.email.userId !== userId) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			await ctx.provider.archive(ctx.accessToken, ctx.email.providerMessageId);
			await db.delete(emails).where(eq(emails.id, emailId));
			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, message: "Email archived" };
		} catch (err) {
			console.error("[mail] archiveEmail failed:", err);
			return { ok: false, error: "Failed to archive email", status: 500 };
		}
	}

	async deleteEmail(userId: string, emailId: string): Promise<ActionResult> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			if (ctx.email.userId !== userId) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			await ctx.provider.trash(ctx.accessToken, ctx.email.providerMessageId);
			await db.delete(emails).where(eq(emails.id, emailId));
			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, message: "Email deleted" };
		} catch (err) {
			console.error("[mail] deleteEmail failed:", err);
			return { ok: false, error: "Failed to delete email", status: 500 };
		}
	}

	async replyToEmail(
		userId: string,
		emailId: string,
		body: string,
		cc?: string[],
	): Promise<ReplyResult> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			if (ctx.email.userId !== userId) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			await ctx.provider.sendDraft(ctx.accessToken, {
				to: [ctx.email.fromAddress ?? ""],
				cc,
				subject: `Re: ${ctx.email.subject ?? ""}`,
				body,
				threadId: ctx.email.providerThreadId ?? undefined,
				inReplyTo: ctx.email.providerMessageId,
			});

			return { ok: true, message: "Reply sent" };
		} catch (err) {
			console.error("[mail] replyToEmail failed:", err);
			return { ok: false, error: "Failed to send reply", status: 500 };
		}
	}

	async forwardEmail(
		userId: string,
		emailId: string,
		to: string[],
		body: string,
	): Promise<ForwardResult> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) {
				return { ok: false, error: ctx.error, status: 500 };
			}

			if (ctx.email.userId !== userId) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			const originalBody = ctx.email.bodyPlain ?? "";
			const quotedBody = `${body}\n\n---------- Forwarded message ----------\nFrom: ${ctx.email.fromAddress ?? ""}\nSubject: ${ctx.email.subject ?? ""}\n\n${originalBody}`;

			await ctx.provider.sendDraft(ctx.accessToken, {
				to,
				subject: `Fwd: ${ctx.email.subject ?? ""}`,
				body: quotedBody,
			});

			return { ok: true, message: "Email forwarded" };
		} catch (err) {
			console.error("[mail] forwardEmail failed:", err);
			return { ok: false, error: "Failed to forward email", status: 500 };
		}
	}

	async createSenderRule(
		userId: string,
		senderAddress: string,
		category: string,
	): Promise<CreateSenderRuleResult> {
		const validCategories = emailCategoryEnum.enumValues as readonly string[];
		if (!validCategories.includes(category)) {
			return {
				ok: false,
				error: `Invalid category: ${category}`,
				status: 400,
			};
		}

		const typedCategory =
			category as (typeof emailCategoryEnum.enumValues)[number];

		try {
			const [rule] = await db
				.insert(mailSenderRules)
				.values({
					userId,
					senderAddress: senderAddress.toLowerCase(),
					category: typedCategory,
				})
				.onConflictDoUpdate({
					target: [mailSenderRules.userId, mailSenderRules.senderAddress],
					set: { category: typedCategory },
				})
				.returning();

			if (!rule) {
				return {
					ok: false,
					error: "Failed to create sender rule",
					status: 500,
				};
			}

			// Bulk-update all existing emails from this sender
			const updated = await db
				.update(emails)
				.set({ category: typedCategory })
				.where(
					and(
						eq(emails.userId, userId),
						sql`lower(${emails.fromAddress}) = ${senderAddress.toLowerCase()}`,
					),
				)
				.returning({ id: emails.id });

			const updatedCount = updated.length;

			await invalidateCache(`mail:briefing:${userId}`);

			return {
				ok: true,
				data: {
					rule: {
						id: rule.id,
						senderAddress: rule.senderAddress,
						category: rule.category,
						createdAt: rule.createdAt.toISOString(),
					},
					updatedCount,
				},
			};
		} catch (err) {
			console.error("[mail] createSenderRule failed:", err);
			return {
				ok: false,
				error: "Failed to create sender rule",
				status: 500,
			};
		}
	}

	async deleteSenderRule(
		userId: string,
		ruleId: string,
	): Promise<DeleteSenderRuleResult> {
		try {
			const [deleted] = await db
				.delete(mailSenderRules)
				.where(
					and(
						eq(mailSenderRules.id, ruleId),
						eq(mailSenderRules.userId, userId),
					),
				)
				.returning();

			if (!deleted) {
				return {
					ok: false,
					error: "Sender rule not found",
					status: 404,
				};
			}

			return { ok: true, message: "Sender rule deleted" };
		} catch (err) {
			console.error("[mail] deleteSenderRule failed:", err);
			return {
				ok: false,
				error: "Failed to delete sender rule",
				status: 500,
			};
		}
	}

	async getSenderRules(userId: string): Promise<GetSenderRulesResult> {
		try {
			const rules = await db.query.mailSenderRules.findMany({
				where: eq(mailSenderRules.userId, userId),
				orderBy: [desc(mailSenderRules.createdAt)],
			});

			return {
				ok: true,
				data: rules.map((r) => ({
					id: r.id,
					senderAddress: r.senderAddress,
					category: r.category,
					createdAt: r.createdAt.toISOString(),
				})),
			};
		} catch (err) {
			console.error("[mail] getSenderRules failed:", err);
			return {
				ok: false,
				error: "Failed to load sender rules",
				status: 500,
			};
		}
	}

	/* ── Thread methods ── */

	async getThreads(
		userId: string,
		options: FilterOptions & { limit?: number; cursor?: string },
	): Promise<ThreadListResult> {
		const limit = options.limit ?? 30;

		try {
			const filterResult = buildFilterConditions(userId, options);
			if (!filterResult.ok) return filterResult;
			const conditions = filterResult.conditions;

			const threadKey = threadKeyExpr;

			// Build the aggregated thread query using raw SQL for GROUP BY
			const baseQuery = db
				.select({
					threadId: threadKey.as("thread_id"),
					latestReceivedAt: sql<Date>`MAX(${emails.receivedAt})`.as(
						"latest_received_at",
					),
					messageCount: sql<number>`COUNT(*)::int`.as("message_count"),
					unreadCount:
						sql<number>`SUM(CASE WHEN NOT ${emails.isRead} THEN 1 ELSE 0 END)::int`.as(
							"unread_count",
						),
					hasAttachments: sql<boolean>`BOOL_OR(${emails.hasAttachments})`.as(
						"has_attachments",
					),
					isStarred: sql<boolean>`BOOL_OR(${emails.isStarred})`.as(
						"is_starred",
					),
					maxPriority: sql<number>`MAX(${emails.priorityScore})`.as(
						"max_priority",
					),
				})
				.from(emails)
				.where(and(...conditions))
				.groupBy(threadKey);

			// Wrap in a subquery for cursor pagination and ordering
			const threadsSq = baseQuery.as("threads_sq");

			// Count total threads (without cursor)
			const totalPromise = db
				.select({ value: sql<number>`COUNT(*)::int` })
				.from(baseQuery.as("count_sq"))
				.then((r) => r[0]?.value ?? 0);

			// Apply cursor pagination
			const paginationConditions: any[] = [];
			if (options.cursor) {
				try {
					const decoded = JSON.parse(atob(options.cursor)) as {
						receivedAt: string;
						threadId: string;
					};
					const cursorDate = new Date(decoded.receivedAt);
					paginationConditions.push(
						or(
							lt(threadsSq.latestReceivedAt, cursorDate),
							and(
								eq(threadsSq.latestReceivedAt, cursorDate),
								lt(threadsSq.threadId, decoded.threadId),
							),
						)!,
					);
				} catch {
					return { ok: false, error: "Invalid cursor", status: 400 };
				}
			}

			const threadRows = await db
				.select()
				.from(threadsSq)
				.where(
					paginationConditions.length > 0
						? and(...paginationConditions)
						: undefined,
				)
				.orderBy(desc(threadsSq.latestReceivedAt), desc(threadsSq.threadId))
				.limit(limit + 1);

			const [totalResult] = await Promise.all([totalPromise]);

			const hasMore = threadRows.length > limit;
			const trimmed = hasMore ? threadRows.slice(0, limit) : threadRows;

			let nextCursor: string | undefined;
			if (hasMore && trimmed.length > 0) {
				const last = trimmed[trimmed.length - 1]!;
				nextCursor = btoa(
					JSON.stringify({
						receivedAt: last.latestReceivedAt.toISOString(),
						threadId: last.threadId,
					}),
				);
			}

			if (trimmed.length === 0) {
				return {
					ok: true,
					data: { threads: [], total: totalResult, hasMore: false },
				};
			}

			// Batch-fetch latest message + participants for each thread
			const threadIds = trimmed.map((t) => t.threadId);

			// Get latest message per thread for subject/snippet/from/category/aiSummary
			const latestMessages = await db
				.select({
					threadId: threadKey.as("thread_id"),
					id: emails.id,
					subject: emails.subject,
					snippet: emails.snippet,
					fromAddress: emails.fromAddress,
					fromName: emails.fromName,
					toAddresses: emails.toAddresses,
					category: emails.category,
					aiSummary: emails.aiSummary,
					receivedAt: emails.receivedAt,
				})
				.from(emails)
				.where(
					and(
						eq(emails.userId, userId),
						sql`${threadKey} IN (${sql.join(
							threadIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					),
				)
				.orderBy(desc(emails.receivedAt), desc(emails.id));

			// Deduplicate to get latest per thread
			const latestByThread = new Map<string, (typeof latestMessages)[number]>();
			for (const msg of latestMessages) {
				if (!latestByThread.has(msg.threadId)) {
					latestByThread.set(msg.threadId, msg);
				}
			}

			// Collect participants per thread from the same query
			const participantsByThread = new Map<
				string,
				Array<{ address: string; name: string | null }>
			>();
			for (const msg of latestMessages) {
				if (!participantsByThread.has(msg.threadId)) {
					participantsByThread.set(msg.threadId, []);
				}
				if (msg.fromAddress) {
					const list = participantsByThread.get(msg.threadId)!;
					if (!list.some((p) => p.address === msg.fromAddress)) {
						list.push({
							address: msg.fromAddress,
							name: msg.fromName,
						});
					}
				}
			}

			const threads: SerializedThread[] = trimmed.map((t) => {
				const latest = latestByThread.get(t.threadId);
				return {
					threadId: t.threadId,
					subject: latest?.subject ?? null,
					snippet: latest?.snippet ?? null,
					latestReceivedAt: t.latestReceivedAt.toISOString(),
					messageCount: t.messageCount,
					unreadCount: t.unreadCount,
					hasAttachments: t.hasAttachments,
					isStarred: t.isStarred,
					category: latest?.category ?? "uncategorized",
					priorityScore: t.maxPriority,
					aiSummary: latest?.aiSummary ?? null,
					latestMessage: {
						id: latest?.id ?? "",
						fromAddress: latest?.fromAddress ?? null,
						fromName: latest?.fromName ?? null,
						toAddresses: latest?.toAddresses ?? null,
					},
					participants: participantsByThread.get(t.threadId) ?? [],
				};
			});

			return {
				ok: true,
				data: { threads, total: totalResult, hasMore, nextCursor },
			};
		} catch (err) {
			console.error("[mail] getThreads failed:", err);
			return { ok: false, error: "Failed to load threads", status: 500 };
		}
	}

	async getThreadDetail(
		userId: string,
		threadId: string,
	): Promise<ThreadDetailResult> {
		try {
			// Find all emails matching this thread grouping key
			const threadEmails = await db.query.emails.findMany({
				where: and(
					eq(emails.userId, userId),
					sql`${threadKeyExpr} = ${threadId}`,
				),
				orderBy: [asc(emails.receivedAt), asc(emails.id)],
				with: { attachments: true },
			});

			if (threadEmails.length === 0) {
				// Fallback: try direct email ID lookup (for standalone emails)
				const singleEmail = await db.query.emails.findFirst({
					where: and(eq(emails.id, threadId), eq(emails.userId, userId)),
					with: { attachments: true },
				});

				if (!singleEmail) {
					return { ok: false, error: "Thread not found", status: 404 };
				}

				return {
					ok: true,
					data: {
						threadId,
						subject: singleEmail.subject,
						messages: [
							{
								...serializeEmail(singleEmail),
								bodyPlain: singleEmail.bodyPlain,
								bodyHtml: singleEmail.bodyHtml
									? sanitizeEmailHtml(singleEmail.bodyHtml)
									: null,
								attachments: (singleEmail.attachments ?? []).map((a) => ({
									id: a.id,
									filename: a.filename,
									mimeType: a.mimeType,
									size: a.size,
								})),
							},
						],
						isMerged: false,
					},
				};
			}

			const isMerged = threadEmails.some((e) => e.threadGroupId !== null);

			return {
				ok: true,
				data: {
					threadId,
					subject: threadEmails[threadEmails.length - 1]!.subject,
					messages: threadEmails.map((e) => ({
						...serializeEmail(e),
						bodyPlain: e.bodyPlain,
						bodyHtml: e.bodyHtml ? sanitizeEmailHtml(e.bodyHtml) : null,
						attachments: (e.attachments ?? []).map((a) => ({
							id: a.id,
							filename: a.filename,
							mimeType: a.mimeType,
							size: a.size,
						})),
					})),
					isMerged,
				},
			};
		} catch (err) {
			console.error("[mail] getThreadDetail failed:", err);
			return { ok: false, error: "Failed to load thread", status: 500 };
		}
	}

	async mergeThreads(
		userId: string,
		threadIds: string[],
	): Promise<MergeResult> {
		if (threadIds.length < 2) {
			return {
				ok: false,
				error: "At least 2 threads required to merge",
				status: 400,
			};
		}

		try {
			const newGroupId = crypto.randomUUID();

			// Find all emails belonging to the given thread keys
			const emailRows = await db
				.select({ id: emails.id })
				.from(emails)
				.where(
					and(
						eq(emails.userId, userId),
						sql`${threadKeyExpr} IN (${sql.join(
							threadIds.map((id) => sql`${id}`),
							sql`, `,
						)})`,
					),
				);

			if (emailRows.length === 0) {
				return {
					ok: false,
					error: "No emails found for the given threads",
					status: 400,
				};
			}

			await db
				.update(emails)
				.set({ threadGroupId: newGroupId })
				.where(
					inArray(
						emails.id,
						emailRows.map((r) => r.id),
					),
				);

			return { ok: true, threadId: newGroupId };
		} catch (err) {
			console.error("[mail] mergeThreads failed:", err);
			return { ok: false, error: "Failed to merge threads", status: 500 };
		}
	}

	async unmergeThread(
		userId: string,
		threadId: string,
	): Promise<UnmergeResult> {
		try {
			const updated = await db
				.update(emails)
				.set({ threadGroupId: null })
				.where(
					and(eq(emails.userId, userId), eq(emails.threadGroupId, threadId)),
				)
				.returning({ id: emails.id });

			if (updated.length === 0) {
				return {
					ok: false,
					error: "No merged thread found",
					status: 404,
				};
			}

			return { ok: true, message: "Thread unmerged" };
		} catch (err) {
			console.error("[mail] unmergeThread failed:", err);
			return { ok: false, error: "Failed to unmerge thread", status: 500 };
		}
	}

	async archiveThread(userId: string, threadId: string): Promise<ActionResult> {
		try {
			const threadEmails = await db.query.emails.findMany({
				where: and(
					eq(emails.userId, userId),
					sql`${threadKeyExpr} = ${threadId}`,
				),
			});

			if (threadEmails.length === 0) {
				return { ok: false, error: "Thread not found", status: 404 };
			}

			for (const email of threadEmails) {
				const ctx = await getEmailProviderContext(email.id);
				if (ctx.ok) {
					await ctx.provider.archive(ctx.accessToken, email.providerMessageId);
				}
			}

			await db.delete(emails).where(
				inArray(
					emails.id,
					threadEmails.map((e) => e.id),
				),
			);
			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, message: "Thread archived" };
		} catch (err) {
			console.error("[mail] archiveThread failed:", err);
			return {
				ok: false,
				error: "Failed to archive thread",
				status: 500,
			};
		}
	}

	async deleteThread(userId: string, threadId: string): Promise<ActionResult> {
		try {
			const threadEmails = await db.query.emails.findMany({
				where: and(
					eq(emails.userId, userId),
					sql`${threadKeyExpr} = ${threadId}`,
				),
			});

			if (threadEmails.length === 0) {
				return { ok: false, error: "Thread not found", status: 404 };
			}

			for (const email of threadEmails) {
				const ctx = await getEmailProviderContext(email.id);
				if (ctx.ok) {
					await ctx.provider.trash(ctx.accessToken, email.providerMessageId);
				}
			}

			await db.delete(emails).where(
				inArray(
					emails.id,
					threadEmails.map((e) => e.id),
				),
			);
			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, message: "Thread deleted" };
		} catch (err) {
			console.error("[mail] deleteThread failed:", err);
			return { ok: false, error: "Failed to delete thread", status: 500 };
		}
	}

	async toggleStarThread(
		userId: string,
		threadId: string,
	): Promise<ToggleStarResult> {
		try {
			const threadEmails = await db.query.emails.findMany({
				where: and(
					eq(emails.userId, userId),
					sql`${threadKeyExpr} = ${threadId}`,
				),
			});

			if (threadEmails.length === 0) {
				return { ok: false, error: "Thread not found", status: 404 };
			}

			// If any is starred, unstar all; otherwise star all
			const anyStarred = threadEmails.some((e) => e.isStarred);
			const newStarred = !anyStarred;

			for (const email of threadEmails) {
				const ctx = await getEmailProviderContext(email.id);
				if (ctx.ok) {
					if (newStarred) {
						await ctx.provider.star(ctx.accessToken, email.providerMessageId);
					} else {
						await ctx.provider.unstar(ctx.accessToken, email.providerMessageId);
					}
				}
			}

			await db
				.update(emails)
				.set({ isStarred: newStarred })
				.where(
					inArray(
						emails.id,
						threadEmails.map((e) => e.id),
					),
				);

			return { ok: true, data: { isStarred: newStarred } };
		} catch (err) {
			console.error("[mail] toggleStarThread failed:", err);
			return {
				ok: false,
				error: "Failed to toggle thread star",
				status: 500,
			};
		}
	}

	async markThreadRead(
		userId: string,
		threadId: string,
	): Promise<ToggleReadResult> {
		try {
			const threadEmails = await db.query.emails.findMany({
				where: and(
					eq(emails.userId, userId),
					sql`${threadKeyExpr} = ${threadId}`,
				),
			});

			if (threadEmails.length === 0) {
				return { ok: false, error: "Thread not found", status: 404 };
			}

			const unreadEmails = threadEmails.filter((e) => !e.isRead);

			for (const email of unreadEmails) {
				const ctx = await getEmailProviderContext(email.id);
				if (ctx.ok) {
					await ctx.provider.markRead(ctx.accessToken, email.providerMessageId);
				}
			}

			if (unreadEmails.length > 0) {
				await db
					.update(emails)
					.set({ isRead: true })
					.where(
						inArray(
							emails.id,
							unreadEmails.map((e) => e.id),
						),
					);
			}

			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, data: { isRead: true } };
		} catch (err) {
			console.error("[mail] markThreadRead failed:", err);
			return {
				ok: false,
				error: "Failed to mark thread as read",
				status: 500,
			};
		}
	}

	async executeTriageAction(
		userId: string,
		emailId: string,
		action: "send_draft" | "dismiss" | "archive" | "snooze",
		snoozeDuration?: number,
	): Promise<TriageActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});

			if (!email) {
				return {
					ok: false,
					error: "Email not found",
					status: 404,
				};
			}

			if (email.triageStatus !== "pending") {
				return {
					ok: false,
					error: "Triage item already handled",
					status: 400,
				};
			}

			switch (action) {
				case "send_draft": {
					if (!email.draftResponse) {
						return {
							ok: false,
							error: "No draft response to send",
							status: 400,
						};
					}

					const sendCtx = await getEmailProviderContext(emailId);
					if (!sendCtx.ok) {
						console.error(`[mail] send_draft context failed: ${sendCtx.error}`);
						return { ok: false, error: sendCtx.error, status: 500 };
					}

					await sendCtx.provider.sendDraft(sendCtx.accessToken, {
						to: [email.fromAddress ?? ""],
						subject: `Re: ${email.subject ?? ""}`,
						body: email.draftResponse,
						threadId: email.providerThreadId ?? undefined,
						inReplyTo: email.providerMessageId,
					});

					await db
						.update(emails)
						.set({ triageStatus: "acted", triageActedAt: new Date() })
						.where(eq(emails.id, emailId));
					break;
				}

				case "dismiss": {
					await db
						.update(emails)
						.set({ triageStatus: "dismissed", triageActedAt: new Date() })
						.where(eq(emails.id, emailId));
					break;
				}

				case "archive": {
					const archiveCtx = await getEmailProviderContext(emailId);
					if (!archiveCtx.ok) {
						console.error(`[mail] archive context failed: ${archiveCtx.error}`);
						return { ok: false, error: archiveCtx.error, status: 500 };
					}

					await archiveCtx.provider.archive(
						archiveCtx.accessToken,
						email.providerMessageId,
					);

					await db
						.update(emails)
						.set({ triageStatus: "acted", triageActedAt: new Date() })
						.where(eq(emails.id, emailId));
					break;
				}

				case "snooze": {
					const until = new Date(Date.now() + (snoozeDuration ?? 3600) * 1000);
					await db
						.update(emails)
						.set({ triageStatus: "snoozed", snoozedUntil: until })
						.where(eq(emails.id, emailId));
					break;
				}
			}

			await invalidateCache(`mail:briefing:${userId}`);

			return { ok: true, message: `Triage action '${action}' executed` };
		} catch (err) {
			console.error("[mail] executeTriageAction failed:", err);
			return {
				ok: false,
				error: "Failed to execute triage action",
				status: 500,
			};
		}
	}

	/* ── Feature 1: Snooze ── */

	async snoozeEmail(
		userId: string,
		emailId: string,
		snoozedUntil: string,
	): Promise<ActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };

			await db
				.update(emails)
				.set({
					triageStatus: "snoozed",
					snoozedUntil: new Date(snoozedUntil),
					isRead: true,
				})
				.where(eq(emails.id, emailId));

			await invalidateCache(`mail:briefing:${userId}`);
			return { ok: true, message: "Email snoozed" };
		} catch (err) {
			console.error("[mail] snoozeEmail failed:", err);
			return { ok: false, error: "Failed to snooze email", status: 500 };
		}
	}

	async snoozeThread(
		userId: string,
		threadId: string,
		snoozedUntil: string,
	): Promise<ActionResult> {
		try {
			const threadEmails = await db
				.select({ id: emails.id })
				.from(emails)
				.where(
					and(eq(emails.userId, userId), sql`${threadKeyExpr} = ${threadId}`),
				);
			if (threadEmails.length === 0)
				return { ok: false, error: "Thread not found", status: 404 };

			await db
				.update(emails)
				.set({
					triageStatus: "snoozed",
					snoozedUntil: new Date(snoozedUntil),
					isRead: true,
				})
				.where(
					inArray(
						emails.id,
						threadEmails.map((e) => e.id),
					),
				);

			await invalidateCache(`mail:briefing:${userId}`);
			return { ok: true, message: "Thread snoozed" };
		} catch (err) {
			console.error("[mail] snoozeThread failed:", err);
			return { ok: false, error: "Failed to snooze thread", status: 500 };
		}
	}

	async unsnoozeEmail(userId: string, emailId: string): Promise<ActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };

			await db
				.update(emails)
				.set({ triageStatus: null, snoozedUntil: null })
				.where(eq(emails.id, emailId));

			await invalidateCache(`mail:briefing:${userId}`);
			return { ok: true, message: "Email unsnoozed" };
		} catch (err) {
			console.error("[mail] unsnoozeEmail failed:", err);
			return { ok: false, error: "Failed to unsnooze email", status: 500 };
		}
	}

	/* ── Feature 2: Draft Review Queue ── */

	async getDrafts(
		userId: string,
		options: { limit?: number; cursor?: string },
	) {
		const limit = options.limit ?? 20;
		try {
			const conditions: any[] = [
				eq(emails.userId, userId),
				isNotNull(emails.draftResponse),
				eq(emails.triageStatus, "pending"),
			];

			if (options.cursor) {
				try {
					const decoded = JSON.parse(atob(options.cursor)) as {
						receivedAt: string;
						id: string;
					};
					conditions.push(
						or(
							lt(emails.receivedAt, new Date(decoded.receivedAt)),
							and(
								eq(emails.receivedAt, new Date(decoded.receivedAt)),
								lt(emails.id, decoded.id),
							),
						)!,
					);
				} catch {
					return {
						ok: false as const,
						error: "Invalid cursor",
						status: 400 as const,
					};
				}
			}

			const rows = await db
				.select({
					id: emails.id,
					subject: emails.subject,
					fromAddress: emails.fromAddress,
					fromName: emails.fromName,
					snippet: emails.snippet,
					draftResponse: emails.draftResponse,
					receivedAt: emails.receivedAt,
					aiSummary: emails.aiSummary,
				})
				.from(emails)
				.where(and(...conditions))
				.orderBy(desc(emails.receivedAt), desc(emails.id))
				.limit(limit + 1);

			const hasMore = rows.length > limit;
			const trimmed = hasMore ? rows.slice(0, limit) : rows;

			let nextCursor: string | undefined;
			if (hasMore && trimmed.length > 0) {
				const last = trimmed[trimmed.length - 1]!;
				nextCursor = btoa(
					JSON.stringify({
						receivedAt: last.receivedAt.toISOString(),
						id: last.id,
					}),
				);
			}

			return {
				ok: true as const,
				data: {
					drafts: trimmed.map((d) => ({
						...d,
						receivedAt: d.receivedAt.toISOString(),
					})),
					hasMore,
					nextCursor,
				},
			};
		} catch (err) {
			console.error("[mail] getDrafts failed:", err);
			return {
				ok: false as const,
				error: "Failed to load drafts",
				status: 500 as const,
			};
		}
	}

	async updateDraft(
		userId: string,
		emailId: string,
		draftResponse: string,
	): Promise<ActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };

			await db
				.update(emails)
				.set({ draftResponse })
				.where(eq(emails.id, emailId));

			return { ok: true, message: "Draft updated" };
		} catch (err) {
			console.error("[mail] updateDraft failed:", err);
			return { ok: false, error: "Failed to update draft", status: 500 };
		}
	}

	/* ── Feature 3: Delayed Send ── */

	async replyToEmailDelayed(
		userId: string,
		emailId: string,
		body: string,
		cc?: string[],
	): Promise<
		| { ok: true; jobId: string; message: string }
		| { ok: false; error: string; status: 404 | 500 }
	> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) return { ok: false, error: ctx.error, status: 500 };
			if (ctx.email.userId !== userId)
				return { ok: false, error: "Email not found", status: 404 };

			const { enqueueDelayedSend } = await import("@wingmnn/queue");
			const jobId = await enqueueDelayedSend({
				type: "reply",
				emailId,
				userId,
				emailAccountId: ctx.email.emailAccountId,
				body,
				cc,
			});

			return { ok: true, jobId, message: "Queued" };
		} catch (err) {
			console.error("[mail] replyToEmailDelayed failed:", err);
			return { ok: false, error: "Failed to queue reply", status: 500 };
		}
	}

	async forwardEmailDelayed(
		userId: string,
		emailId: string,
		to: string[],
		body: string,
	): Promise<
		| { ok: true; jobId: string; message: string }
		| { ok: false; error: string; status: 404 | 500 }
	> {
		try {
			const ctx = await getEmailProviderContext(emailId);
			if (!ctx.ok) return { ok: false, error: ctx.error, status: 500 };
			if (ctx.email.userId !== userId)
				return { ok: false, error: "Email not found", status: 404 };

			const { enqueueDelayedSend } = await import("@wingmnn/queue");
			const jobId = await enqueueDelayedSend({
				type: "forward",
				emailId,
				userId,
				emailAccountId: ctx.email.emailAccountId,
				to,
				body,
			});

			return { ok: true, jobId, message: "Queued" };
		} catch (err) {
			console.error("[mail] forwardEmailDelayed failed:", err);
			return { ok: false, error: "Failed to queue forward", status: 500 };
		}
	}

	async cancelDelayedSend(
		jobId: string,
	): Promise<
		| { ok: true; message: string }
		| { ok: false; error: string; status: 410 | 500 }
	> {
		try {
			const { cancelDelayedSend: cancel } = await import("@wingmnn/queue");
			const cancelled = await cancel(jobId);
			if (!cancelled) return { ok: false, error: "Already sent", status: 410 };
			return { ok: true, message: "Send cancelled" };
		} catch (err) {
			console.error("[mail] cancelDelayedSend failed:", err);
			return { ok: false, error: "Failed to cancel send", status: 500 };
		}
	}

	/* ── Feature 4: Sender Mute / VIP ── */

	async muteSender(
		userId: string,
		senderAddress: string,
		muted: boolean,
	): Promise<
		| { ok: true; message: string; archivedCount: number }
		| { ok: false; error: string; status: 500 }
	> {
		try {
			await db
				.insert(mailSenderRules)
				.values({
					userId,
					senderAddress,
					category: "spam",
					muted,
				})
				.onConflictDoUpdate({
					target: [mailSenderRules.userId, mailSenderRules.senderAddress],
					set: { muted },
				});

			let archivedCount = 0;
			if (muted) {
				const result = await db
					.update(emails)
					.set({ isRead: true })
					.where(
						and(
							eq(emails.userId, userId),
							eq(emails.fromAddress, senderAddress),
							eq(emails.isRead, false),
						),
					)
					.returning({ id: emails.id });
				archivedCount = result.length;

				for (const row of result) {
					try {
						const ctx = await getEmailProviderContext(row.id);
						if (ctx.ok) {
							await ctx.provider.archive(
								ctx.accessToken,
								ctx.email.providerMessageId,
							);
						}
					} catch {
						// Best-effort archive
					}
				}
			}

			await invalidateCache(`mail:briefing:${userId}`);
			return {
				ok: true,
				message: muted ? `Muted ${senderAddress}` : `Unmuted ${senderAddress}`,
				archivedCount,
			};
		} catch (err) {
			console.error("[mail] muteSender failed:", err);
			return { ok: false, error: "Failed to mute sender", status: 500 };
		}
	}

	async vipSender(
		userId: string,
		senderAddress: string,
		vip: boolean,
	): Promise<ActionResult> {
		try {
			await db
				.insert(mailSenderRules)
				.values({
					userId,
					senderAddress,
					category: "urgent",
					vip,
				})
				.onConflictDoUpdate({
					target: [mailSenderRules.userId, mailSenderRules.senderAddress],
					set: { vip },
				});

			return {
				ok: true,
				message: vip
					? `${senderAddress} marked as VIP`
					: `${senderAddress} removed from VIP`,
			};
		} catch (err) {
			console.error("[mail] vipSender failed:", err);
			return { ok: false, error: "Failed to update VIP status", status: 500 };
		}
	}

	/* ── Feature 5: One-Click Unsubscribe ── */

	async unsubscribeEmail(
		userId: string,
		emailId: string,
	): Promise<
		| {
				ok: true;
				message: string;
				method: "one-click" | "link" | "failed";
		  }
		| { ok: false; error: string; status: 404 | 500 }
	> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };
			if (!email.unsubscribeUrl)
				return {
					ok: false,
					error: "No unsubscribe URL available",
					status: 404,
				};

			let method: "one-click" | "link" | "failed" = "failed";

			try {
				const postRes = await fetch(email.unsubscribeUrl, {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: "List-Unsubscribe=One-Click",
				});
				if (postRes.ok || postRes.status === 204) {
					method = "one-click";
				}
			} catch {
				// POST failed, try GET
			}

			if (method === "failed") {
				try {
					const getRes = await fetch(email.unsubscribeUrl, {
						method: "GET",
						redirect: "follow",
					});
					if (getRes.ok) {
						method = "link";
					}
				} catch {
					// GET also failed
				}
			}

			if (email.fromAddress) {
				await db
					.insert(mailSenderRules)
					.values({
						userId,
						senderAddress: email.fromAddress,
						category: email.category,
						unsubscribed: true,
					})
					.onConflictDoUpdate({
						target: [mailSenderRules.userId, mailSenderRules.senderAddress],
						set: { unsubscribed: true },
					});
			}

			return {
				ok: true,
				message:
					method !== "failed"
						? `Unsubscribed from ${email.fromAddress}`
						: "Unsubscribe request sent (may take time to process)",
				method,
			};
		} catch (err) {
			console.error("[mail] unsubscribeEmail failed:", err);
			return { ok: false, error: "Failed to unsubscribe", status: 500 };
		}
	}

	/* ── Feature 6: Follow-Up Reminders ── */

	async setFollowUp(
		userId: string,
		emailId: string,
		followUpAt: string,
	): Promise<ActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };

			await db
				.update(emails)
				.set({ followUpAt: new Date(followUpAt), followUpDismissed: false })
				.where(eq(emails.id, emailId));

			return { ok: true, message: "Follow-up set" };
		} catch (err) {
			console.error("[mail] setFollowUp failed:", err);
			return { ok: false, error: "Failed to set follow-up", status: 500 };
		}
	}

	async clearFollowUp(userId: string, emailId: string): Promise<ActionResult> {
		try {
			const email = await db.query.emails.findFirst({
				where: and(eq(emails.id, emailId), eq(emails.userId, userId)),
			});
			if (!email) return { ok: false, error: "Email not found", status: 404 };

			await db
				.update(emails)
				.set({ followUpAt: null, followUpDismissed: false })
				.where(eq(emails.id, emailId));

			return { ok: true, message: "Follow-up cleared" };
		} catch (err) {
			console.error("[mail] clearFollowUp failed:", err);
			return { ok: false, error: "Failed to clear follow-up", status: 500 };
		}
	}

	async getFollowUps(userId: string) {
		try {
			const now = new Date();
			const dueEmails = await db
				.select({
					id: emails.id,
					subject: emails.subject,
					fromAddress: emails.fromAddress,
					fromName: emails.fromName,
					followUpAt: emails.followUpAt,
					receivedAt: emails.receivedAt,
					providerThreadId: emails.providerThreadId,
					threadGroupId: emails.threadGroupId,
					emailAccountId: emails.emailAccountId,
				})
				.from(emails)
				.where(
					and(
						eq(emails.userId, userId),
						lte(emails.followUpAt, now),
						eq(emails.followUpDismissed, false),
						isNotNull(emails.followUpAt),
					),
				)
				.orderBy(asc(emails.followUpAt))
				.limit(50);

			const followUps = [];
			for (const email of dueEmails) {
				const threadKey = email.threadGroupId
					? email.threadGroupId
					: email.providerThreadId
						? `${email.emailAccountId}:${email.providerThreadId}`
						: email.id;

				const reply = await db
					.select({ id: emails.id })
					.from(emails)
					.where(
						and(
							eq(emails.userId, userId),
							sql`${threadKeyExpr} = ${threadKey}`,
							gte(emails.receivedAt, email.receivedAt),
							sql`${emails.fromAddress} != ${email.fromAddress}`,
						),
					)
					.limit(1);

				if (reply.length > 0) {
					await db
						.update(emails)
						.set({ followUpAt: null })
						.where(eq(emails.id, email.id));
					continue;
				}

				const daysWaiting = Math.floor(
					(now.getTime() - email.receivedAt.getTime()) / (1000 * 60 * 60 * 24),
				);

				followUps.push({
					id: email.id,
					subject: email.subject,
					fromAddress: email.fromAddress,
					fromName: email.fromName,
					followUpAt: email.followUpAt!.toISOString(),
					receivedAt: email.receivedAt.toISOString(),
					daysWaiting,
				});
			}

			return { ok: true as const, data: followUps };
		} catch (err) {
			console.error("[mail] getFollowUps failed:", err);
			return {
				ok: false as const,
				error: "Failed to load follow-ups",
				status: 500 as const,
			};
		}
	}
}

export const mailService = new MailService();
