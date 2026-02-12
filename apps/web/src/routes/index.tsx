import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Index });

function Index() {
	return (
		<div className="min-h-screen flex items-center justify-center px-(--page-px)">
			<h1 className="font-display text-[clamp(3rem,8vw,5rem)] text-ink tracking-[0.02em] lowercase">
				Win
			</h1>
		</div>
	);
}
