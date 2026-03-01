import type { EmailCategory } from "@wingmnn/types";

const EMAIL_CATEGORIES: EmailCategory[] = [
	"urgent",
	"actionable",
	"informational",
	"newsletter",
	"receipt",
	"confirmation",
	"promotional",
	"spam",
	"uncategorized",
];

const VALID_CATEGORIES: ReadonlySet<string> = new Set(EMAIL_CATEGORIES);

export type ParsedSearch = {
	q?: string;
	from?: string;
	to?: string;
	cc?: string;
	subject?: string;
	label?: string;
	category?: EmailCategory;
	starred?: boolean;
	unread?: boolean;
	attachment?: boolean;
	after?: string;
	before?: string;
};

const OPERATOR_RE =
	/(?:from|to|cc|subject|after|before|has|is|category|label):"[^"]*"|(?:from|to|cc|subject|after|before|has|is|category|label):\S+/gi;

/**
 * Parse a Gmail-style query string into structured search filters.
 *
 * Supported operators:
 *   from:value  to:value  cc:value  subject:value (or quoted "multi word")
 *   after:YYYY-MM-DD  before:YYYY-MM-DD
 *   has:attachment
 *   is:starred  is:unread  is:read
 *   category:value  label:value
 *
 * Everything else (including "quoted phrases") becomes the free-text `q`.
 */
export function parseSearchQuery(raw: string): ParsedSearch {
	const result: ParsedSearch = {};

	// Extract all operator:value tokens
	const remaining = raw.replace(OPERATOR_RE, (match) => {
		const colonIdx = match.indexOf(":");
		const key = match.slice(0, colonIdx).toLowerCase();
		let value = match.slice(colonIdx + 1);

		// Strip surrounding quotes
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		}

		switch (key) {
			case "from":
				result.from = value;
				break;
			case "to":
				result.to = value;
				break;
			case "cc":
				result.cc = value;
				break;
			case "subject":
				result.subject = value;
				break;
			case "after":
				result.after = value;
				break;
			case "before":
				result.before = value;
				break;
			case "category":
				if (VALID_CATEGORIES.has(value))
					result.category = value as EmailCategory;
				break;
			case "label":
				result.label = value;
				break;
			case "has":
				if (value === "attachment") result.attachment = true;
				break;
			case "is":
				if (value === "starred") result.starred = true;
				else if (value === "unread") result.unread = true;
				else if (value === "read") result.unread = false;
				break;
		}

		return ""; // Remove matched operator from remaining text
	});

	const trimmed = remaining.replace(/\s+/g, " ").trim();
	if (trimmed) result.q = trimmed;

	return result;
}
