import { calendarAccounts, db, eq } from "@wingmnn/db";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function getValidCalendarToken(
	accountId: string,
): Promise<string | null> {
	const account = await db.query.calendarAccounts.findFirst({
		where: eq(calendarAccounts.id, accountId),
	});

	if (!account || !account.active || !account.accessToken) {
		return null;
	}

	if (
		account.tokenExpiresAt &&
		account.tokenExpiresAt.getTime() > Date.now() + TOKEN_REFRESH_BUFFER_MS
	) {
		return account.accessToken;
	}

	if (!account.refreshToken) {
		console.error(`[calendar-token] No refresh token for account ${accountId}`);
		return null;
	}

	try {
		const clientId = process.env.GOOGLE_CLIENT_ID;
		const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
		if (!clientId || !clientSecret) {
			console.error("[calendar-token] Missing Google OAuth credentials");
			return null;
		}

		const res = await fetch(GOOGLE_TOKEN_URL, {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				refresh_token: account.refreshToken,
				grant_type: "refresh_token",
			}).toString(),
		});

		if (!res.ok) {
			throw new Error(`Token refresh returned ${res.status}`);
		}

		const data = (await res.json()) as {
			access_token: string;
			expires_in: number;
		};

		const expiresAt = new Date(Date.now() + data.expires_in * 1000);

		await db
			.update(calendarAccounts)
			.set({
				accessToken: data.access_token,
				tokenExpiresAt: expiresAt,
			})
			.where(eq(calendarAccounts.id, accountId));

		return data.access_token;
	} catch (err) {
		console.error(
			`[calendar-token] Token refresh failed for account ${accountId}:`,
			err,
		);
		await db
			.update(calendarAccounts)
			.set({
				syncStatus: "error",
				syncError: "Token refresh failed",
			})
			.where(eq(calendarAccounts.id, accountId));
		return null;
	}
}
