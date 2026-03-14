import { api } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";

interface ThreadMessage {
	from: string;
	body: string;
	date?: string;
}

export function useAiSummarize() {
	return useMutation({
		mutationFn: async (messages: ThreadMessage[]) => {
			const { data, error } = await api.ai.summarize.post({ messages });
			if (error) {
				const msg =
					typeof error.value === "object" &&
					error.value &&
					"error" in error.value
						? error.value.error
						: "Summarization failed";
				throw new Error(msg);
			}
			return data;
		},
	});
}

interface DraftInput {
	subject: string;
	fromAddress: string;
	fromName: string;
	snippet: string;
	bodyPlain: string;
	toAddresses: string[];
	aiSummary?: string;
}

export function useDailyBriefing() {
	return useQuery({
		queryKey: ["ai", "briefing"],
		queryFn: async () => {
			const { data, error } = await api.ai.briefing.get();
			if (error) throw new Error("Failed to load briefing");
			return data;
		},
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
	});
}

interface ComposeCompleteInput {
	body: string;
	subject?: string;
	recipient?: string;
}

export function useAiCompose() {
	return useMutation({
		mutationFn: async (input: ComposeCompleteInput) => {
			const { data, error } = await api.ai["complete-compose"].post(input);
			if (error) {
				const msg =
					typeof error.value === "object" &&
					error.value &&
					"error" in error.value
						? error.value.error
						: "Compose completion failed";
				throw new Error(msg);
			}
			return data;
		},
	});
}

export type EnhanceAction =
	| "more-formal"
	| "more-friendly"
	| "more-concise"
	| "more-detailed"
	| "fix-grammar"
	| "improve-clarity"
	| "translate"
	| "shorten"
	| "expand";

interface EnhanceInput {
	text: string;
	action: EnhanceAction;
	language?: string;
	context?: string;
}

export function useAiEnhance() {
	return useMutation({
		mutationFn: async (input: EnhanceInput) => {
			const { data, error } = await api.ai.enhance.post(input);
			if (error) {
				const msg =
					typeof error.value === "object" &&
					error.value &&
					"error" in error.value
						? error.value.error
						: "Enhancement failed";
				throw new Error(msg);
			}
			return data;
		},
	});
}

export function useAiDraft() {
	return useMutation({
		mutationFn: async (input: DraftInput) => {
			const { data, error } = await api.ai.draft.post(input);
			if (error) {
				const msg =
					typeof error.value === "object" &&
					error.value &&
					"error" in error.value
						? error.value.error
						: "Draft generation failed";
				throw new Error(msg);
			}
			return data;
		},
	});
}
