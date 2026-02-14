import { db, emailAccounts, eq } from "@wingmnn/db";
import { getProvider } from "./factory";

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getValidAccessToken(
	accountId: string,
): Promise<string | null> {
	const account = await db.query.emailAccounts.findFirst({
		where: eq(emailAccounts.id, accountId),
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
		console.error(`[token-manager] No refresh token for account ${accountId}`);
		return null;
	}

	const provider = getProvider(account.provider);
	if (!provider) {
		console.error(`[token-manager] Unknown provider: ${account.provider}`);
		return null;
	}

	try {
		const result = await provider.refreshAccessToken(account.refreshToken);

		await db
			.update(emailAccounts)
			.set({
				accessToken: result.accessToken,
				tokenExpiresAt: result.expiresAt,
			})
			.where(eq(emailAccounts.id, accountId));

		return result.accessToken;
	} catch (err) {
		console.error(
			`[token-manager] Token refresh failed for account ${accountId}:`,
			err,
		);
		await db
			.update(emailAccounts)
			.set({
				syncStatus: "error",
				syncError: "Token refresh failed",
			})
			.where(eq(emailAccounts.id, accountId));
		return null;
	}
}
