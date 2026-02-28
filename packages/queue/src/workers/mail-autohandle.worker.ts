import { db, emailAccounts, emails, eq, mailAutoHandled } from "@wingmnn/db";
import { getProvider, getValidAccessToken } from "@wingmnn/mail";
import { Worker } from "bullmq";
import { connection } from "../connection";
import type { MailAutoHandleJobData } from "../jobs/mail-autohandle";

const ACTION_VERB_MAP: Record<string, Record<string, string>> = {
	newsletter: { archived: "Archived newsletter" },
	receipt: { labeled: "Labeled receipt" },
	confirmation: { labeled: "Labeled confirmation" },
	promotional: { archived: "Filtered promotional email" },
	spam: { filtered: "Filtered spam" },
};

const MODULE_LINK_MAP: Record<string, string | undefined> = {
	receipt: "fin",
	confirmation: "cal",
};

async function processAutoHandle(data: MailAutoHandleJobData): Promise<void> {
	const email = await db.query.emails.findFirst({
		where: eq(emails.id, data.emailId),
	});

	// Execute provider action (archive/filter)
	if (data.action === "archived" || data.action === "filtered") {
		try {
			if (email) {
				const account = await db.query.emailAccounts.findFirst({
					where: eq(emailAccounts.id, data.emailAccountId),
				});
				const accessToken = await getValidAccessToken(data.emailAccountId);
				if (accessToken && account) {
					const provider = getProvider(account.provider);
					if (provider) {
						await provider.archive(accessToken, email.providerMessageId);
					}
				}
			}
		} catch (err) {
			console.error(
				`[mail-auto-handle] Provider action failed for email ${data.emailId}, continuing:`,
				err,
			);
		}
	} else {
		console.log(
			`[mail-auto-handle] Action '${data.action}' for email ${data.emailId} (${data.category}) — not yet implemented`,
		);
	}

	// Build descriptive text with sender/subject context
	const verbs = ACTION_VERB_MAP[data.category];
	const verb = verbs?.[data.action] ?? `Email ${data.action}`;
	const linkedModule = MODULE_LINK_MAP[data.category];

	const sender =
		email?.fromName || email?.fromAddress?.split("@")[0] || "unknown sender";
	const subject = email?.subject;
	const text = subject
		? `${verb} from ${sender} — "${subject}"`
		: `${verb} from ${sender}`;

	await db.insert(mailAutoHandled).values({
		userId: data.userId,
		emailId: data.emailId,
		text,
		linkedModule: linkedModule ?? null,
		actionType: data.action,
		metadata: { category: data.category, emailAccountId: data.emailAccountId },
	});

	console.log(
		`[mail-auto-handle] ${data.action} email ${data.emailId} (${data.category})`,
	);
}

export function createMailAutoHandleWorker() {
	const worker = new Worker<MailAutoHandleJobData>(
		"mail-auto-handle",
		async (job) => {
			console.log(`[mail-auto-handle] Processing job ${job.id}`);
			await processAutoHandle(job.data);
		},
		{ connection, concurrency: 5 },
	);

	worker.on("completed", (job) => {
		console.log(`[mail-auto-handle] Job ${job.id} completed`);
	});

	worker.on("failed", (job, err) => {
		console.error(`[mail-auto-handle] Job ${job?.id} failed:`, err.message);
	});

	return worker;
}
