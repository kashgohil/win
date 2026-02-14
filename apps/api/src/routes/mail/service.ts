import {
	and,
	count,
	db,
	desc,
	emailAccounts,
	emailCategoryEnum,
	emails,
	eq,
	gte,
	mailAutoHandled,
	mailTriageItems,
} from "@wingmnn/db";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { cacheable, invalidateCache } from "@wingmnn/redis";

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
	sourceModule?: string;
};

type AutoHandledItem = {
	id: string;
	text: string;
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

type DisconnectResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 404 | 500 };

type TriageActionResult =
	| { ok: true; message: string }
	| { ok: false; error: string; status: 400 | 404 | 500 };

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
	category: string;
	priorityScore: number;
	aiSummary: string | null;
};

type SerializedEmailDetail = SerializedEmail & {
	bodyPlain: string | null;
	bodyHtml: string | null;
};

type SerializedAccount = {
	id: string;
	provider: string;
	email: string;
	syncStatus: string;
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
					.from(mailTriageItems)
					.where(
						and(
							eq(mailTriageItems.userId, userId),
							eq(mailTriageItems.status, "pending"),
						),
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
		const items = await db.query.mailTriageItems.findMany({
			where: and(
				eq(mailTriageItems.userId, userId),
				eq(mailTriageItems.status, "pending"),
			),
			orderBy: [desc(mailTriageItems.urgent), desc(mailTriageItems.createdAt)],
			limit: 20,
		});

		return items.map((item) => ({
			id: item.id,
			title: item.title,
			subtitle: item.subtitle ?? undefined,
			timestamp: timeAgo(item.createdAt),
			urgent: item.urgent || undefined,
			actions: (item.actions as TriageItem["actions"]) ?? [],
			sourceModule: item.sourceModule ?? undefined,
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

		return items.map((item) => ({
			id: item.id,
			text: item.text,
			linkedModule: item.linkedModule ?? undefined,
			timestamp: timeAgo(item.createdAt),
		}));
	}

	async getEmails(
		userId: string,
		options: {
			limit?: number;
			offset?: number;
			category?: string;
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
			const url = emailProvider.getAuthUrl(userId);
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

	async executeTriageAction(
		userId: string,
		triageItemId: string,
		action: "send_draft" | "dismiss" | "archive" | "snooze",
		snoozeDuration?: number,
	): Promise<TriageActionResult> {
		try {
			const item = await db.query.mailTriageItems.findFirst({
				where: and(
					eq(mailTriageItems.id, triageItemId),
					eq(mailTriageItems.userId, userId),
				),
			});

			if (!item) {
				return {
					ok: false,
					error: "Triage item not found",
					status: 404,
				};
			}

			if (item.status !== "pending") {
				return {
					ok: false,
					error: "Triage item already handled",
					status: 400,
				};
			}

			switch (action) {
				case "send_draft": {
					if (!item.emailId || !item.draftResponse) {
						return {
							ok: false,
							error: "No email or draft response to send",
							status: 400,
						};
					}

					const sendCtx = await getEmailProviderContext(item.emailId);
					if (!sendCtx.ok) {
						console.error(`[mail] send_draft context failed: ${sendCtx.error}`);
						return { ok: false, error: sendCtx.error, status: 500 };
					}

					await sendCtx.provider.sendDraft(sendCtx.accessToken, {
						to: [sendCtx.email.fromAddress ?? ""],
						subject: `Re: ${sendCtx.email.subject ?? ""}`,
						body: item.draftResponse,
						threadId: sendCtx.email.providerThreadId ?? undefined,
						inReplyTo: sendCtx.email.providerMessageId,
					});

					await db
						.update(mailTriageItems)
						.set({ status: "acted", actedAt: new Date() })
						.where(eq(mailTriageItems.id, triageItemId));
					break;
				}

				case "dismiss": {
					await db
						.update(mailTriageItems)
						.set({ status: "dismissed", actedAt: new Date() })
						.where(eq(mailTriageItems.id, triageItemId));
					break;
				}

				case "archive": {
					if (!item.emailId) {
						return {
							ok: false,
							error: "No email to archive",
							status: 400,
						};
					}

					const archiveCtx = await getEmailProviderContext(item.emailId);
					if (!archiveCtx.ok) {
						console.error(`[mail] archive context failed: ${archiveCtx.error}`);
						return { ok: false, error: archiveCtx.error, status: 500 };
					}

					await archiveCtx.provider.archive(
						archiveCtx.accessToken,
						archiveCtx.email.providerMessageId,
					);

					await db
						.update(mailTriageItems)
						.set({ status: "acted", actedAt: new Date() })
						.where(eq(mailTriageItems.id, triageItemId));
					break;
				}

				case "snooze": {
					const until = new Date(Date.now() + (snoozeDuration ?? 3600) * 1000);
					await db
						.update(mailTriageItems)
						.set({ status: "snoozed", snoozedUntil: until })
						.where(eq(mailTriageItems.id, triageItemId));
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
