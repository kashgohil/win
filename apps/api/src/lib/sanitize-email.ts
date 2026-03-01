import sanitizeHtml from "sanitize-html";

const DANGEROUS_CSS_PATTERN =
	/expression\s*\(|(?:-moz-binding|-webkit-binding|behavior)\s*:/i;
const CSS_IMPORT_PATTERN = /@import\b/gi;
const BODY_STYLE_PATTERN = /<body[^>]*\sstyle\s*=\s*"([^"]*)"/i;

const config: sanitizeHtml.IOptions = {
	// Style tags are needed for email rendering — we strip @import and
	// dangerous CSS expressions (expression(), -moz-binding, behavior) separately.
	allowVulnerableTags: true,
	allowedTags: [
		// Structure
		"div",
		"span",
		"p",
		"br",
		"hr",
		// Headings
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",
		// Text formatting
		"b",
		"i",
		"em",
		"strong",
		"u",
		"s",
		"strike",
		"del",
		"ins",
		"sub",
		"sup",
		"small",
		"big",
		"mark",
		"abbr",
		"cite",
		"code",
		"pre",
		"blockquote",
		// Lists
		"ul",
		"ol",
		"li",
		"dl",
		"dt",
		"dd",
		// Tables (critical for email layout)
		"table",
		"thead",
		"tbody",
		"tfoot",
		"tr",
		"td",
		"th",
		"caption",
		"colgroup",
		"col",
		// Links & media
		"a",
		"img",
		// Email-specific
		"center",
		"font",
		// Style blocks
		"style",
		// Semantic
		"article",
		"section",
		"header",
		"footer",
		"nav",
		"aside",
		"main",
		"figure",
		"figcaption",
		"details",
		"summary",
		"address",
		"time",
		"wbr",
	],
	// Strip these tags AND their content (not just the tags)
	exclusiveFilter: (frame) => {
		const stripped = [
			"script",
			"noscript",
			"iframe",
			"embed",
			"object",
			"applet",
			"form",
			"input",
			"textarea",
			"select",
			"button",
			"base",
			"meta",
			"link",
			"xml",
		];
		return stripped.includes(frame.tag);
	},
	allowedAttributes: {
		"*": ["class", "id", "style", "dir", "lang", "title"],
		a: ["href", "target", "rel", "name"],
		img: ["src", "alt", "width", "height"],
		table: [
			"width",
			"height",
			"align",
			"bgcolor",
			"cellpadding",
			"cellspacing",
			"border",
			"role",
		],
		td: ["width", "height", "colspan", "rowspan", "align", "valign", "bgcolor"],
		th: [
			"width",
			"height",
			"colspan",
			"rowspan",
			"align",
			"valign",
			"bgcolor",
			"scope",
		],
		tr: ["align", "valign", "bgcolor"],
		col: ["width", "span", "align"],
		colgroup: ["width", "span", "align"],
		font: ["color", "face", "size"],
	},
	allowedSchemes: ["http", "https", "mailto"],
	allowedSchemesByTag: {
		img: ["http", "https", "data", "cid"],
	},
	allowedSchemesAppliedToAttributes: ["href", "src"],
	transformTags: {
		a: (tagName, attribs) => {
			return {
				tagName,
				attribs: {
					...attribs,
					target: "_blank",
					rel: "noopener noreferrer",
				},
			};
		},
	},
	// No allowedStyles — inline CSS is safe inside sandboxed iframe.
	// Dangerous patterns (expression(), -moz-binding) are stripped in post-processing.
};

function stripDangerousCss(css: string): string {
	if (DANGEROUS_CSS_PATTERN.test(css)) {
		return css
			.replace(/expression\s*\([^)]*\)/gi, "")
			.replace(/(?:-moz-binding|-webkit-binding|behavior)\s*:[^;]*/gi, "");
	}
	return css;
}

/**
 * Sanitizes email HTML for safe rendering in the client.
 * Strips dangerous tags (script, iframe, form, etc.), event handlers,
 * and unsafe URL schemes while preserving email layout (tables, inline styles).
 */
export function sanitizeEmailHtml(html: string): string {
	// Extract <body> inline styles before sanitization (the body tag gets stripped
	// since it's not in allowedTags, losing its style attribute).
	const bodyStyleMatch = html.match(BODY_STYLE_PATTERN);
	const bodyStyle = bodyStyleMatch?.[1];

	// Strip @import rules before parsing (sanitize-html doesn't handle these)
	const withoutImports = html.replace(CSS_IMPORT_PATTERN, "/* removed */");

	let result = sanitizeHtml(withoutImports, config);

	// Post-process: strip dangerous CSS patterns from inline style attributes
	result = result.replace(
		/style="([^"]*)"/gi,
		(_match: string, styleContent: string) => {
			const cleaned = stripDangerousCss(styleContent);
			return `style="${cleaned}"`;
		},
	);

	// Wrap in a div with the original body styles so spacing/typography is preserved
	if (bodyStyle) {
		const cleanedBodyStyle = stripDangerousCss(bodyStyle);
		result = `<div style="${cleanedBodyStyle}">${result}</div>`;
	}

	return result;
}
