import { create } from "zustand";

type AccountFilterState = {
	activeAccountIds: "all" | Set<string>;
	toggle: (accountId: string) => void;
	resetToAll: () => void;
	/** Returns undefined when "all" (no filter), or array of active IDs */
	getAccountIds: () => string[] | undefined;
};

export const useMailAccountFilter = create<AccountFilterState>((set, get) => ({
	activeAccountIds: "all",

	toggle: (accountId: string) => {
		const current = get().activeAccountIds;

		if (current === "all") {
			// Switch from "all" to filtering with only this account
			set({ activeAccountIds: new Set([accountId]) });
			return;
		}

		const next = new Set(current);
		if (next.has(accountId)) {
			next.delete(accountId);
			// If removing the last one, revert to "all"
			set({ activeAccountIds: next.size === 0 ? "all" : next });
		} else {
			next.add(accountId);
			set({ activeAccountIds: next });
		}
	},

	resetToAll: () => {
		set({ activeAccountIds: "all" });
	},

	getAccountIds: () => {
		const { activeAccountIds } = get();
		if (activeAccountIds === "all") return undefined;
		return Array.from(activeAccountIds);
	},
}));
