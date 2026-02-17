import { env } from "../../env";

const ALGORITHM = "SHA-256";
const TTL_MS = 10 * 60 * 1000; // 10 minutes

async function hmacSign(data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(env.BETTER_AUTH_SECRET),
		{ name: "HMAC", hash: ALGORITHM },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(data),
	);
	return Buffer.from(sig).toString("hex");
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
	const expected = await hmacSign(data);
	return expected === signature;
}

/**
 * Creates an HMAC-signed OAuth state parameter.
 * Format: `signature.timestamp.userId`
 */
export async function createOAuthState(userId: string): Promise<string> {
	const timestamp = Date.now().toString();
	const payload = `${timestamp}.${userId}`;
	const signature = await hmacSign(payload);
	return `${signature}.${payload}`;
}

/**
 * Verifies an OAuth state parameter and extracts the userId.
 * Returns null if the signature is invalid or the state has expired.
 */
export async function verifyOAuthState(state: string): Promise<string | null> {
	const firstDot = state.indexOf(".");
	if (firstDot === -1) return null;

	const signature = state.slice(0, firstDot);
	const payload = state.slice(firstDot + 1);

	const valid = await hmacVerify(payload, signature);
	if (!valid) return null;

	const secondDot = payload.indexOf(".");
	if (secondDot === -1) return null;

	const timestamp = Number(payload.slice(0, secondDot));
	const userId = payload.slice(secondDot + 1);

	if (Number.isNaN(timestamp) || Date.now() - timestamp > TTL_MS) {
		return null;
	}

	return userId;
}
