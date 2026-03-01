import type { ReactNode } from "react";

export function HighlightMatches({
	text,
	terms,
}: {
	text: string;
	terms?: string[];
}): ReactNode {
	if (!terms || terms.length === 0) return text;

	const escaped = terms
		.filter((t) => t.length > 0)
		.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	if (escaped.length === 0) return text;

	const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
	const parts = text.split(pattern);

	return parts.map((part, i) =>
		pattern.test(part) ? (
			<mark
				// biome-ignore lint/suspicious/noArrayIndexKey: stable text split — fragments never reorder
				key={i}
				className="bg-yellow-200/40 dark:bg-yellow-500/25 rounded-sm"
			>
				{part}
			</mark>
		) : (
			part
		),
	);
}
