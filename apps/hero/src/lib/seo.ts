const SITE_URL = "https://wingmnn.com";
const SITE_NAME = "Wingmnn";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Generate a full SEO head config for a route.
 *
 * Merges with the global meta in __root.tsx (charset, viewport, robots,
 * theme-color, og:type, og:site_name, og:locale, twitter:card, favicons).
 */
export function seo({
	title,
	description,
	path = "",
	jsonLd,
}: {
	title: string;
	description: string;
	/** Path without domain, e.g. "/about" or "/modules/inbox" */
	path?: string;
	/** Optional JSON-LD objects to inject as scripts */
	jsonLd?: Record<string, unknown>[];
}) {
	const url = `${SITE_URL}${path}`;

	return {
		meta: [
			{ title },
			{ name: "description", content: description },
			/* Open Graph */
			{ property: "og:title", content: title },
			{ property: "og:description", content: description },
			{ property: "og:url", content: url },
			{ property: "og:image", content: OG_IMAGE },
			/* Twitter */
			{ name: "twitter:title", content: title },
			{ name: "twitter:description", content: description },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [{ rel: "canonical", href: url }],
		...(jsonLd?.length && {
			scripts: jsonLd.map((entry) => ({
				type: "application/ld+json",
				children: JSON.stringify(entry),
			})),
		}),
	};
}

export { SITE_URL, SITE_NAME, OG_IMAGE };
