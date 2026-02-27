import type { EmailCategory } from "@wingmnn/types";

type CategoryConfig = {
	label: string;
	text: string;
	bg: string;
	dot: string;
};

export const CATEGORY_CONFIG: Record<EmailCategory, CategoryConfig> = {
	urgent: {
		label: "Urgent",
		text: "text-red-700 dark:text-red-400",
		bg: "bg-red-500/10",
		dot: "bg-red-500",
	},
	actionable: {
		label: "Actionable",
		text: "text-amber-700 dark:text-amber-400",
		bg: "bg-amber-500/10",
		dot: "bg-amber-500",
	},
	informational: {
		label: "Info",
		text: "text-blue-700 dark:text-blue-400",
		bg: "bg-blue-500/10",
		dot: "bg-blue-500",
	},
	newsletter: {
		label: "Newsletter",
		text: "text-violet-700 dark:text-violet-400",
		bg: "bg-violet-500/10",
		dot: "bg-violet-500",
	},
	receipt: {
		label: "Receipt",
		text: "text-emerald-700 dark:text-emerald-400",
		bg: "bg-emerald-500/10",
		dot: "bg-emerald-500",
	},
	confirmation: {
		label: "Confirmation",
		text: "text-cyan-700 dark:text-cyan-400",
		bg: "bg-cyan-500/10",
		dot: "bg-cyan-500",
	},
	promotional: {
		label: "Promo",
		text: "text-pink-700 dark:text-pink-400",
		bg: "bg-pink-500/10",
		dot: "bg-pink-500",
	},
	spam: {
		label: "Spam",
		text: "text-stone-500 dark:text-stone-400",
		bg: "bg-stone-500/10",
		dot: "bg-stone-400",
	},
	uncategorized: {
		label: "Other",
		text: "text-grey-3",
		bg: "bg-foreground/5",
		dot: "bg-grey-3",
	},
};

export const CATEGORIES = (
	Object.entries(CATEGORY_CONFIG) as [EmailCategory, CategoryConfig][]
).map(([value, config]) => ({ value, ...config }));
