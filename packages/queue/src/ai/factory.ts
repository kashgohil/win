import { getAiEnv } from "./env";
import { AnthropicProvider } from "./providers/anthropic";
import type { AiProvider } from "./types";

let cachedProvider: AiProvider | null | undefined;

/**
 * Returns the configured AI provider, or null when AI_PROVIDER="stub" or unset.
 * Lazy singleton — created once on first call.
 */
export function getAiProvider(): AiProvider | null {
	if (cachedProvider !== undefined) return cachedProvider;

	const env = getAiEnv();

	if (env.provider === "stub" || !env.apiKey) {
		cachedProvider = null;
		return null;
	}

	switch (env.provider) {
		case "anthropic":
			cachedProvider = new AnthropicProvider(env.apiKey, env.model);
			break;
		default:
			console.warn(
				`[ai] Provider "${env.provider}" not yet implemented, falling back to stub`,
			);
			cachedProvider = null;
	}

	if (cachedProvider) {
		console.log(
			`[ai] Initialized ${env.provider} provider (model: ${env.model})`,
		);
	}

	return cachedProvider;
}
