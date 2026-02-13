import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

import AuthPage from "@/components/auth/AuthPage";
import { authClient } from "@/lib/auth-client";

const searchSchema = z.object({
	tab: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
	validateSearch: (search) => searchSchema.parse(search),
	component: AuthRoute,
});

function AuthRoute() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && session?.user) {
			navigate({ to: "/", replace: true });
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="min-h-dvh bg-background flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading...
				</p>
			</div>
		);
	}

	if (session?.user) {
		return null;
	}

	return <AuthPage tab={tab} />;
}
