import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
	{
		head: () => ({
			meta: [
				{ charSet: "utf-8" },
				{ name: "viewport", content: "width=device-width, initial-scale=1" },
				{ title: "Wingmnn - your partner-in-crime" },
				{ name: "theme-color", content: "#1a1a1a" },
			],
			links: [
				{ rel: "stylesheet", href: appCss },
				{ rel: "icon", href: "/favicon.ico", sizes: "48x48" },
				{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
				{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
				{ rel: "manifest", href: "/site.webmanifest" },
			],
		}),

		shellComponent: RootDocument,
		component: RootComponent,
		notFoundComponent: NotFoundComponent,
	},
);

function RootComponent() {
	return <Outlet />;
}

function NotFoundComponent() {
	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-4 px-(--page-px)">
			<h1 className="font-display text-[clamp(2.5rem,6vw,3.5rem)] text-foreground tracking-[0.02em] lowercase">
				Page not found
			</h1>
			<p className="text-foreground/60 text-center max-w-md">
				The page you&apos;re looking for doesn&apos;t exist or may have been
				moved.
			</p>
			<a
				href="/"
				className="inline-flex items-center justify-center rounded-full border border-border bg-elevated px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:bg-elevated/80"
			>
				Go back home
			</a>
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script
					dangerouslySetInnerHTML={{
						__html: `(function(){var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")})()`,
					}}
				/>
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
