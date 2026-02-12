import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";

import AuthPage from "@/components/auth/AuthPage";
import { authClient } from "@/lib/auth-client";
import { api } from "@/lib/api";

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

	const { data: profileData, isPending: isProfilePending } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
		enabled: !!session?.user,
	});

	useEffect(() => {
		if (!isPending && session?.user && !isProfilePending) {
			// If profile exists and onboarding is not completed, redirect to onboarding
			// If profile doesn't exist yet or onboarding is completed, redirect to home
			if (profileData?.profile && !profileData.profile.onboardingCompletedAt) {
				navigate({ to: "/onboarding", replace: true });
			} else {
				navigate({ to: "/", replace: true });
			}
		}
	}, [session, isPending, isProfilePending, profileData, navigate]);

	if (isPending) {
		return (
			<div className="min-h-dvh bg-cream flex items-center justify-center">
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
