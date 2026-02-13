import AppShell from "@/components/app-shell/AppShell";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { authClient } from "@/lib/auth-client";
import { getActiveModules } from "@/lib/onboarding-data";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_app")({
	component: AppLayout,
});

function AppLayout() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const { data: profileData, isPending } = useOnboardingProfile();

	useEffect(() => {
		if (isPending) return;
		if (profileData?.profile && !profileData.profile.onboardingCompletedAt) {
			navigate({ to: "/onboarding", replace: true });
		}
	}, [profileData, isPending, navigate]);

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/auth", replace: true, search: { tab: "signin" } });
	};

	if (isPending) {
		return (
			<div className="min-h-dvh bg-background flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading…
				</p>
			</div>
		);
	}

	if (!profileData?.profile || !session?.user) {
		return (
			<div className="min-h-dvh bg-background flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Something went wrong. Please try again.
				</p>
			</div>
		);
	}

	const activeModules = getActiveModules(profileData.profile.enabledModules);
	const userName = session.user.name ?? session.user.email ?? "";

	return (
		<AppShell
			modules={activeModules}
			userName={userName}
			onSignOut={handleSignOut}
		>
			<Outlet />
		</AppShell>
	);
}
