import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";

import Footer from "../components/Footer";
import Header from "../components/Header";
import appCss from "../styles.css?url";

/* ─── SEO constants ─── */

const SITE_URL = "https://wingmnn.com";
const SITE_NAME = "Wingmnn";
const SITE_TITLE = "wingmnn — your digital twin";
const SITE_DESCRIPTION =
	"The personal assistant that manages your mail, projects, money, messages, feeds, journal, notes, travel, calendar, and wellness.";
const OG_IMAGE = `${SITE_URL}/og-image.png`;

const faqEntries = [
	{
		q: "What happens to my data if I cancel?",
		a: "Everything is exported to you in standard formats within 24 hours. After 30 days, all data is permanently deleted. No copies. No archives.",
	},
	{
		q: "Do I have to connect everything?",
		a: "No. Every module is independent. Connect only what you want. More connections mean better intelligence, but none are required.",
	},
	{
		q: "How is this different from [insert app]?",
		a: "Most tools solve one domain. Wingmnn is one intelligence across all of them. Your calendar knows about your finances. Your inbox knows about your projects. That cross-domain awareness is the whole point.",
	},
	{
		q: "Is my financial data safe?",
		a: "Financial connections are read-only through Plaid. We can't move money. Everything is encrypted at rest and in transit. We're SOC 2 Type II compliant.",
	},
	{
		q: 'What does "digital twin" actually mean?',
		a: "A persistent model of your preferences, patterns, and priorities. Not a chatbot you re-explain things to. Wingmnn remembers context and acts on your behalf — like a chief of staff who's been with you for years.",
	},
	{
		q: "How much does it cost?",
		a: "Pricing announced at launch. Straightforward monthly subscription. No per-module fees, no usage caps. The business model is your subscription, not your data.",
	},
];

const jsonLd = [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Wingmnn Systems Inc.",
		url: SITE_URL,
		logo: `${SITE_URL}/wingmnn.png`,
		email: "hello@wingmnn.com",
		address: {
			"@type": "PostalAddress",
			addressLocality: "Brooklyn",
			addressRegion: "NY",
			addressCountry: "US",
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: SITE_NAME,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		publisher: {
			"@type": "Organization",
			name: "Wingmnn Systems Inc.",
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: SITE_TITLE,
		url: SITE_URL,
		description: SITE_DESCRIPTION,
		about: {
			"@type": "SoftwareApplication",
			name: SITE_NAME,
			applicationCategory: "ProductivityApplication",
			operatingSystem: "Web, iOS, Android",
			offers: {
				"@type": "Offer",
				availability: "https://schema.org/PreOrder",
			},
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqEntries.map((f) => ({
			"@type": "Question",
			name: f.q,
			acceptedAnswer: {
				"@type": "Answer",
				text: f.a,
			},
		})),
	},
];

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: SITE_TITLE },
			{ name: "description", content: SITE_DESCRIPTION },
			{ name: "robots", content: "index, follow" },
			{ name: "theme-color", content: "#1a1a1a" },
			/* Open Graph */
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:title", content: SITE_TITLE },
			{ property: "og:description", content: SITE_DESCRIPTION },
			{ property: "og:url", content: SITE_URL },
			{ property: "og:image", content: OG_IMAGE },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: "Wingmnn — your digital twin" },
			{ property: "og:locale", content: "en_US" },
			/* Twitter Card */
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SITE_TITLE },
			{ name: "twitter:description", content: SITE_DESCRIPTION },
			{ name: "twitter:image", content: OG_IMAGE },
			{
				name: "twitter:image:alt",
				content: "Wingmnn — your digital twin",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "canonical", href: SITE_URL },
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
		scripts: jsonLd.map((entry) => ({
			type: "application/ld+json",
			children: JSON.stringify(entry),
		})),
	}),

	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				<Header />
				{children}
				<Footer />
				<Scripts />
			</body>
		</html>
	);
}
