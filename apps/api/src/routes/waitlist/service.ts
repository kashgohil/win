import { db, waitlist } from "@wingmnn/db";

export type JoinInput = {
	email: string;
	source?: string;
	referrer?: string;
};

export type JoinResult =
	| { ok: true; created: true }
	| { ok: true; created: false; message: string }
	| { ok: false; error: string; status: 400 | 500 };

class WaitlistService {
	async join(input: JoinInput): Promise<JoinResult> {
		const { email, source = "website", referrer } = input;

		const normalizedEmail = email.trim().toLowerCase();

		try {
			const result = await db
				.insert(waitlist)
				.values({
					email: normalizedEmail,
					source: source.slice(0, 50),
					referrer: referrer ?? null,
				})
				.onConflictDoNothing({ target: waitlist.email })
				.returning({ id: waitlist.id });

			if (result.length === 0) {
				return {
					ok: true,
					created: false,
					message: "You're already on the waitlist. We'll be in touch soon.",
				};
			}

			return { ok: true, created: true };
		} catch (err) {
			console.error("[waitlist] join failed:", err);
			return {
				ok: false,
				error: "Something went wrong. Please try again later.",
				status: 500,
			};
		}
	}
}

export const waitlistService = new WaitlistService();
