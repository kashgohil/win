import { useCallback, useEffect, useRef } from "react";

const STORAGE_KEY = "compose-draft";
const SAVE_DEBOUNCE_MS = 3000;

export interface ComposeDraft {
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	accountId: string;
	savedAt: number;
}

function loadDraft(): ComposeDraft | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const draft = JSON.parse(raw) as ComposeDraft;
		// Expire after 24 hours
		if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
			localStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return draft;
	} catch {
		return null;
	}
}

function saveDraft(draft: ComposeDraft) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
	} catch {
		// Storage full or unavailable — ignore
	}
}

export function clearComposeDraft() {
	localStorage.removeItem(STORAGE_KEY);
}

export function getSavedDraft(): ComposeDraft | null {
	return loadDraft();
}

export function useComposeDraftAutoSave(state: {
	to: string[];
	cc: string[];
	bcc: string[];
	subject: string;
	body: string;
	accountId: string;
}) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const stateRef = useRef(state);
	stateRef.current = state;

	const save = useCallback(() => {
		const s = stateRef.current;
		const hasContent = s.to.length > 0 || s.subject.trim() || s.body.trim();
		if (hasContent) {
			saveDraft({ ...s, savedAt: Date.now() });
		} else {
			clearComposeDraft();
		}
	}, []);

	// Debounced auto-save on state changes
	useEffect(() => {
		if (timerRef.current) clearTimeout(timerRef.current);
		timerRef.current = setTimeout(save, SAVE_DEBOUNCE_MS);
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [
		state.to,
		state.cc,
		state.bcc,
		state.subject,
		state.body,
		state.accountId,
		save,
	]);
}
