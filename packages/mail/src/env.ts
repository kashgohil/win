export function getMailConfig() {
	const clientId = Bun.env.GMAIL_CLIENT_ID;
	const clientSecret = Bun.env.GMAIL_CLIENT_SECRET;
	const redirectUri =
		Bun.env.GMAIL_REDIRECT_URI ??
		`${Bun.env.BETTER_AUTH_URL ?? "http://localhost:8080"}/mail/accounts/callback/gmail`;

	if (!clientId || !clientSecret) {
		throw new Error("Gmail OAuth credentials not configured");
	}

	return { clientId, clientSecret, redirectUri };
}
