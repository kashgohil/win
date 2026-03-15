import {
	Link,
	createRootRoute,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import Footer from "../components/Footer";
import Header from "../components/Header";
import { SITE_NAME, SITE_URL } from "../lib/seo";
import appCss from "../styles.css?url";

/* ─── Site-wide JSON-LD (Organization + WebSite) ─── */

const globalJsonLd = [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Wingmnn Systems Inc.",
		url: SITE_URL,
		logo: `${SITE_URL}/wingmnn.png`,
		email: "hello@wingmnn.com",
		sameAs: [],
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
		description:
			"The personal assistant that manages your mail, projects, money, messages, feeds, journal, notes, travel, calendar, and wellness.",
		publisher: {
			"@type": "Organization",
			name: "Wingmnn Systems Inc.",
		},
	},
];

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ name: "robots", content: "index, follow" },
			{ name: "theme-color", content: "#1a1a1a" },
			/* Global OG defaults (page-specific tags override via child routes) */
			{ property: "og:type", content: "website" },
			{ property: "og:site_name", content: SITE_NAME },
			{ property: "og:image:width", content: "1200" },
			{ property: "og:image:height", content: "630" },
			{ property: "og:image:alt", content: "Wingmnn — your partner-in-crime" },
			{ property: "og:locale", content: "en_US" },
			/* Twitter Card (global) */
			{ name: "twitter:card", content: "summary_large_image" },
			{
				name: "twitter:image:alt",
				content: "Wingmnn — your partner-in-crime",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "manifest", href: "/site.webmanifest" },
		],
		scripts: globalJsonLd.map((entry) => ({
			type: "application/ld+json",
			children: JSON.stringify(entry),
		})),
	}),

	shellComponent: RootDocument,
	notFoundComponent: NotFound,
});

function NotFound() {
	return (
		<main>
			<section className="min-h-[calc(100vh-180px)] flex items-center justify-center px-(--page-px) bg-ink">
				<div className="max-w-[480px] text-center">
					<p className="font-mono text-xs font-semibold tracking-widest text-accent-red uppercase mb-4">
						404
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Page not found.
					</h1>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-10">
						The page you're looking for doesn't exist or has been moved.
					</p>
					<Link
						to="/"
						className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-white bg-accent-red py-3.5 px-6 rounded-[5px] cursor-pointer transition-colors duration-200 hover:bg-red-dark"
					>
						Back to home <ArrowRight size={15} />
					</Link>
				</div>
			</section>
		</main>
	);
}

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
