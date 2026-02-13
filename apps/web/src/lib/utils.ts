import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formatDate(dateStr: Date | string) {
	const date = dateStr instanceof Date ? dateStr : new Date(dateStr);
	return date.toLocaleDateString("en-US", {
		month: "long",
		year: "numeric",
	});
}
