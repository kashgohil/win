import { useCallback, useSyncExternalStore } from "react";

type MailViewMode = "inline" | "sidepanel";

const STORAGE_KEY = "mail-view-mode";

const listeners = new Set<() => void>();
let currentMode: MailViewMode = "inline";

if (typeof window !== "undefined") {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "inline" || stored === "sidepanel") {
		currentMode = stored;
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): MailViewMode {
	return currentMode;
}

function getServerSnapshot(): MailViewMode {
	return "inline";
}

function setModeInternal(mode: MailViewMode) {
	currentMode = mode;
	localStorage.setItem(STORAGE_KEY, mode);
	for (const listener of listeners) listener();
}

export function useMailViewMode() {
	const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const toggle = useCallback(() => {
		setModeInternal(currentMode === "inline" ? "sidepanel" : "inline");
	}, []);

	const setMode = useCallback((mode: MailViewMode) => {
		setModeInternal(mode);
	}, []);

	return { mode, toggle, setMode } as const;
}
