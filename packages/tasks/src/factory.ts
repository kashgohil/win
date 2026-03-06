import type { TaskProvider } from "./types";

const providers: Record<string, TaskProvider> = {};

export function registerProvider(provider: TaskProvider): void {
	providers[provider.name] = provider;
}

export function getTaskProvider(name: string): TaskProvider | null {
	return providers[name] ?? null;
}

export function getRegisteredProviders(): string[] {
	return Object.keys(providers);
}
