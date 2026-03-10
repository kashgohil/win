import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Relative time string for a date. Handles past and future.
 * compact: "5m", "3h", "2d" — verbose: "5m ago", "in 3h"
 */
export function relativeTime(
	dateStr: string | Date,
	opts?: { compact?: boolean },
): string {
	const now = Date.now();
	const then =
		dateStr instanceof Date ? dateStr.getTime() : new Date(dateStr).getTime();
	const diffMs = now - then;
	const isFuture = diffMs < 0;
	const absDiffMin = Math.floor(Math.abs(diffMs) / 60_000);
	const compact = opts?.compact ?? false;

	const suffix = compact ? "" : " ago";
	const prefix = isFuture && !compact ? "in " : "";

	if (absDiffMin < 1) return "just now";

	const absDiffHr = Math.floor(absDiffMin / 60);
	const absDiffDay = Math.floor(absDiffHr / 24);

	if (absDiffMin < 60)
		return isFuture ? `${prefix}${absDiffMin}m` : `${absDiffMin}m${suffix}`;
	if (absDiffHr < 24)
		return isFuture ? `${prefix}${absDiffHr}h` : `${absDiffHr}h${suffix}`;
	if (absDiffDay < 7)
		return isFuture ? `${prefix}${absDiffDay}d` : `${absDiffDay}d${suffix}`;

	return new Date(then).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	});
}

export function formatDate(dateStr: Date | string) {
	const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}
