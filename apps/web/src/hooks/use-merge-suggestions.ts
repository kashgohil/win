import type { SerializedThread } from "@wingmnn/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VISITS_KEY = "mail-thread-visits";
const DISMISSED_KEY = "mail-merge-dismissed";
const MAX_VISITS = 20;
const RAPID_SWITCH_WINDOW_MS = 60_000;
const AUTO_DISMISS_MS = 15_000;

type Visit = { threadId: string; timestamp: number };

type MergeSuggestion = {
	threadIds: [string, string];
	subjects: [string | null, string | null];
	reason: string;
};

/* ── Visit tracking ── */

function getVisits(): Visit[] {
	try {
		const raw = sessionStorage.getItem(VISITS_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveVisits(visits: Visit[]) {
	sessionStorage.setItem(VISITS_KEY, JSON.stringify(visits));
}

export function recordThreadVisit(threadId: string) {
	const visits = getVisits();
	visits.push({ threadId, timestamp: Date.now() });
	if (visits.length > MAX_VISITS) visits.splice(0, visits.length - MAX_VISITS);
	saveVisits(visits);
}

/* ── Pair key ── */

function pairKey(a: string, b: string): string {
	return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/* ── Rapid-switch detection ── */

function findRapidSwitchPairs(visits: Visit[]): [string, string][] {
	const seen = new Set<string>();
	const pairs: [string, string][] = [];

	for (let i = visits.length - 1; i > 0; i--) {
		const current = visits[i]!;
		const previous = visits[i - 1]!;

		if (
			current.threadId !== previous.threadId &&
			current.timestamp - previous.timestamp <= RAPID_SWITCH_WINDOW_MS
		) {
			const key = pairKey(current.threadId, previous.threadId);
			if (!seen.has(key)) {
				seen.add(key);
				pairs.push(
					current.threadId < previous.threadId
						? [current.threadId, previous.threadId]
						: [previous.threadId, current.threadId],
				);
			}
		}
	}

	return pairs;
}

/* ── Content similarity ── */

function normalizeSubject(subject: string | null): string {
	if (!subject) return "";
	return subject
		.replace(/^(re|fwd|fw)\s*:\s*/gi, "")
		.toLowerCase()
		.trim();
}

function checkContentSimilarity(
	a: SerializedThread,
	b: SerializedThread,
): string | null {
	// Check subjects
	const subA = normalizeSubject(a.subject);
	const subB = normalizeSubject(b.subject);

	if (subA && subB) {
		if (subA === subB || subA.includes(subB) || subB.includes(subA)) {
			return "similar_subject";
		}
	}

	// Check participants
	const addressesA = new Set(a.participants.map((p) => p.address));
	const addressesB = new Set(b.participants.map((p) => p.address));

	// Same sender
	if (
		a.latestMessage.fromAddress &&
		a.latestMessage.fromAddress === b.latestMessage.fromAddress
	) {
		return "shared_participants";
	}

	// Overlapping participants
	for (const addr of addressesA) {
		if (addressesB.has(addr)) return "shared_participants";
	}

	return null;
}

/* ── Hook ── */

export function useMergeSuggestions(threads: SerializedThread[]): {
	suggestion: MergeSuggestion | null;
	dismiss: () => void;
} {
	const [suggestion, setSuggestion] = useState<MergeSuggestion | null>(null);
	const dismissedRef = useRef<Set<string>>(new Set());
	const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load dismissed set from sessionStorage on mount
	useEffect(() => {
		try {
			const raw = sessionStorage.getItem(DISMISSED_KEY);
			if (raw) {
				dismissedRef.current = new Set(JSON.parse(raw));
			}
		} catch {
			// ignore
		}
	}, []);

	// Build thread lookup
	const threadMap = useMemo(() => {
		const map = new Map<string, SerializedThread>();
		for (const t of threads) map.set(t.threadId, t);
		return map;
	}, [threads]);

	// Detect suggestions
	useEffect(() => {
		const visits = getVisits();
		if (visits.length < 2) return;

		const pairs = findRapidSwitchPairs(visits);

		for (const [idA, idB] of pairs) {
			const key = pairKey(idA, idB);
			if (dismissedRef.current.has(key)) continue;

			const threadA = threadMap.get(idA);
			const threadB = threadMap.get(idB);
			if (!threadA || !threadB) continue;

			const reason = checkContentSimilarity(threadA, threadB);
			if (!reason) continue;

			setSuggestion({
				threadIds: [idA, idB],
				subjects: [threadA.subject, threadB.subject],
				reason,
			});
			return;
		}

		setSuggestion(null);
	}, [threadMap]);

	// Auto-dismiss after 15s
	useEffect(() => {
		if (!suggestion) {
			if (autoDismissTimer.current) {
				clearTimeout(autoDismissTimer.current);
				autoDismissTimer.current = null;
			}
			return;
		}

		autoDismissTimer.current = setTimeout(() => {
			const key = pairKey(suggestion.threadIds[0], suggestion.threadIds[1]);
			dismissedRef.current.add(key);
			sessionStorage.setItem(
				DISMISSED_KEY,
				JSON.stringify([...dismissedRef.current]),
			);
			setSuggestion(null);
		}, AUTO_DISMISS_MS);

		return () => {
			if (autoDismissTimer.current) {
				clearTimeout(autoDismissTimer.current);
				autoDismissTimer.current = null;
			}
		};
	}, [suggestion]);

	const dismiss = useCallback(() => {
		if (!suggestion) return;
		const key = pairKey(suggestion.threadIds[0], suggestion.threadIds[1]);
		dismissedRef.current.add(key);
		sessionStorage.setItem(
			DISMISSED_KEY,
			JSON.stringify([...dismissedRef.current]),
		);
		setSuggestion(null);
	}, [suggestion]);

	return { suggestion, dismiss };
}
