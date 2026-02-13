import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

const listeners = new Set<() => void>();
let currentTheme: Theme = "light";

if (typeof window !== "undefined") {
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === "dark" || stored === "light") {
		currentTheme = stored;
	} else {
		currentTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light";
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function getSnapshot(): Theme {
	return currentTheme;
}

function getServerSnapshot(): Theme {
	return "light";
}

function setTheme(theme: Theme) {
	currentTheme = theme;
	localStorage.setItem(STORAGE_KEY, theme);
	document.documentElement.classList.toggle("dark", theme === "dark");
	for (const listener of listeners) listener();
}

export function useTheme() {
	const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

	const toggle = useCallback((e?: { clientX: number; clientY: number }) => {
		const next = currentTheme === "dark" ? "light" : "dark";

		if (
			typeof document !== "undefined" &&
			"startViewTransition" in document &&
			typeof document.startViewTransition === "function"
		) {
			const x = e?.clientX ?? window.innerWidth / 2;
			const y = e?.clientY ?? window.innerHeight / 2;
			const root = document.documentElement;
			root.style.setProperty("--reveal-x", `${x}px`);
			root.style.setProperty("--reveal-y", `${y}px`);
			document.startViewTransition(() => setTheme(next));
		} else {
			setTheme(next);
		}
	}, []);

	return { theme, toggle } as const;
}
