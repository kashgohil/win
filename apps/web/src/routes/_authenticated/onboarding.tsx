import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/onboarding")({
	component: OnboardingLayout,
});

function OnboardingLayout() {
	const navigate = useNavigate();

	const { data: profileData, isPending } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	useEffect(() => {
		if (isPending) return;
		if (profileData?.profile?.onboardingCompletedAt) {
			navigate({ to: "/", replace: true });
		}
	}, [profileData, isPending, navigate]);

	if (isPending) {
		return (
			<div className="min-h-dvh bg-cream flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading…
				</p>
			</div>
		);
	}

	return <Outlet />;
}
