import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/onboarding")({
	component: OnboardingLayout,
});

function OnboardingLayout() {
	const navigate = useNavigate();

	const { data: profileData, isPending } = useOnboardingProfile();

	useEffect(() => {
		if (isPending) return;
		if (profileData?.profile?.onboardingCompletedAt) {
			navigate({ to: "/", replace: true });
		}
	}, [profileData, isPending, navigate]);

	if (isPending) {
		return (
			<div className="min-h-dvh bg-background flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading…
				</p>
			</div>
		);
	}

	return <Outlet />;
}
