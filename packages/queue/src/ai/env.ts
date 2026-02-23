export type AiProviderName = "anthropic" | "openai" | "gemini" | "stub";

export interface AiEnv {
	provider: AiProviderName;
	apiKey: string | null;
	model: string | null;
	maxConcurrency: number;
}

const DEFAULT_MODELS: Record<Exclude<AiProviderName, "stub">, string> = {
	anthropic: "claude-haiku-4-5-20251001",
	openai: "gpt-4o-mini",
	gemini: "gemini-2.0-flash",
};

export function getAiEnv(): AiEnv {
	const raw = (process.env.AI_PROVIDER ?? "stub") as AiProviderName;
	const provider = ["anthropic", "openai", "gemini", "stub"].includes(raw)
		? raw
		: "stub";

	if (provider === "stub") {
		return { provider, apiKey: null, model: null, maxConcurrency: 5 };
	}

	const apiKey =
		process.env.AI_API_KEY ?? getProviderSpecificKey(provider) ?? null;

	if (!apiKey) {
		throw new Error(
			`[ai] AI_PROVIDER="${provider}" but no API key found. ` +
				`Set AI_API_KEY or ${getProviderKeyEnvName(provider)}.`,
		);
	}

	const model = process.env.AI_MODEL ?? DEFAULT_MODELS[provider] ?? null;
	const maxConcurrency = Math.max(
		1,
		Number.parseInt(process.env.AI_MAX_CONCURRENCY ?? "5", 10) || 5,
	);

	return { provider, apiKey, model, maxConcurrency };
}

function getProviderSpecificKey(provider: AiProviderName): string | undefined {
	switch (provider) {
		case "anthropic":
			return process.env.ANTHROPIC_API_KEY;
		case "openai":
			return process.env.OPENAI_API_KEY;
		case "gemini":
			return process.env.GEMINI_API_KEY;
		default:
			return undefined;
	}
}

function getProviderKeyEnvName(provider: AiProviderName): string {
	switch (provider) {
		case "anthropic":
			return "ANTHROPIC_API_KEY";
		case "openai":
			return "OPENAI_API_KEY";
		case "gemini":
			return "GEMINI_API_KEY";
		default:
			return "AI_API_KEY";
	}
}
