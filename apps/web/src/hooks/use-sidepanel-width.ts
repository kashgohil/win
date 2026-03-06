import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "mail-sidepanel-width";
const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 280;
const MAX_WIDTH = 700;

const listeners = new Set<() => void>();
let currentWidth = DEFAULT_WIDTH;

if (typeof window !== "undefined") {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		const parsed = Number(stored);
		if (Number.isFinite(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
			currentWidth = parsed;
		}
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): number {
	return currentWidth;
}

function getServerSnapshot(): number {
	return DEFAULT_WIDTH;
}

function setWidth(width: number) {
	const clamped = Math.round(Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width)));
	if (clamped === currentWidth) return;
	currentWidth = clamped;
	localStorage.setItem(STORAGE_KEY, String(clamped));
	for (const listener of listeners) listener();
}

export function useSidepanelWidth() {
	const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const onResize = useCallback((w: number) => {
		setWidth(w);
	}, []);

	return { width, onResize, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH } as const;
}
