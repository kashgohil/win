import {
	and,
	count,
	db,
	desc,
	emailAccounts,
	emailCategoryEnum,
	emailProviderEnum,
	emails,
	eq,
	gte,
	ilike,
	inArray,
	lte,
	mailAutoHandled,
	mailSenderRules,
	or,
	sql,
	syncStatusEnum,
} from "@wingmnn/db";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { enqueueInitialSync, scheduleRecurringSync } from "@wingmnn/queue";
import { cacheable, invalidateCache } from "@wingmnn/redis";
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

type SerializedEmailDetail = SerializedEmail & {
	bodyPlain: string | null;
	bodyHtml: string | null;
};

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

/* ── Service ── */

class MailService {
	async getModuleData(userId: string): Promise<DataResult> {
		try {
			const [briefing, triage, autoHandledItems] = await Promise.all([
				this.getBriefing(userId),
				this.getTriageItems(userId),
				this.getAutoHandledItems(userId),
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

	private async getBriefing(userId: string): Promise<BriefingStat[]> {
		return cacheable(
			`mail:briefing:${userId}`,
			async () => {
				const [unreadResult] = await db
					.select({ value: count() })
					.from(emails)
					.where(and(eq(emails.userId, userId), eq(emails.isRead, false)));

				const [triageResult] = await db
					.select({ value: count() })
					.from(emails)
					.where(
						and(eq(emails.userId, userId), eq(emails.triageStatus, "pending")),
					);

				const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
				const [autoHandledResult] = await db
					.select({ value: count() })
					.from(mailAutoHandled)
					.where(
						and(
							eq(mailAutoHandled.userId, userId),
							gte(mailAutoHandled.createdAt, twentyFourHoursAgo),
						),
					);

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

	private async getTriageItems(userId: string): Promise<TriageItem[]> {
		const items = await db.query.emails.findMany({
			where: and(eq(emails.userId, userId), eq(emails.triageStatus, "pending")),
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
	): Promise<AutoHandledItem[]> {
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

		const items = await db.query.mailAutoHandled.findMany({
			where: and(
				eq(mailAutoHandled.userId, userId),
				gte(mailAutoHandled.createdAt, twentyFourHoursAgo),
			),
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

	async getEmails(
		userId: string,
		options: {
			limit?: number;
			offset?: number;
			category?: string;
			unreadOnly?: boolean;
			readOnly?: boolean;
			q?: string;
			from?: string;
			starred?: boolean;
			attachment?: boolean;
			after?: string;
			before?: string;
		},
	): Promise<EmailListResult> {
		const limit = options.limit ?? 50;
		const offset = options.offset ?? 0;

		try {
			const conditions = [eq(emails.userId, userId)];
			if (options.category) {
				const validCategories =
					emailCategoryEnum.enumValues as readonly string[];
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
					)!,
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
			if (options.after) {
				conditions.push(gte(emails.receivedAt, new Date(options.after)));
			}
			if (options.before) {
				conditions.push(lte(emails.receivedAt, new Date(options.before)));
			}

			const [emailRows, [totalResult]] = await Promise.all([
				db.query.emails.findMany({
					where: and(...conditions),
					orderBy: [desc(emails.receivedAt)],
					limit: limit + 1,
					offset,
				}),
				db
					.select({ value: count() })
					.from(emails)
					.where(and(...conditions)),
			]);

			const hasMore = emailRows.length > limit;
			const trimmed = hasMore ? emailRows.slice(0, limit) : emailRows;

			return {
				ok: true,
				data: {
					emails: trimmed.map(serializeEmail),
					total: totalResult?.value ?? 0,
					hasMore,
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
			});

			if (!email) {
				return { ok: false, error: "Email not found", status: 404 };
			}

			return {
				ok: true,
				data: {
					...serializeEmail(email),
					bodyPlain: email.bodyPlain,
					bodyHtml: email.bodyHtml,
				},
			};
		} catch (err) {
			console.error("[mail] getEmailDetail failed:", err);
			return { ok: false, error: "Failed to load email", status: 500 };
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

		if (provider === "outlook") {
			return {
				ok: false,
				error: "Outlook is not yet supported",
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
			const provider = getProvider("gmail");
			if (!provider) {
				return {
					ok: false,
					error: "Gmail provider not available",
					status: 500,
				};
			}

			const tokens = await provider.exchangeCode(code);

			// Upsert: update tokens if same user+provider+email already exists
			const rows = await db
				.insert(emailAccounts)
				.values({
					userId,
					provider: "gmail",
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
					set: {
						accessToken: tokens.accessToken,
						refreshToken: tokens.refreshToken,
						tokenExpiresAt: tokens.expiresAt,
						scopes: tokens.scopes,
						syncStatus: "pending",
						active: true,
						syncError: null,
					},
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
}

export const mailService = new MailService();
