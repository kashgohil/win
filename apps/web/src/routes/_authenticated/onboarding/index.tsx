import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/onboarding/")({
	component: OnboardingIndex,
});

function OnboardingIndex() {
	const navigate = useNavigate();

	const { data } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	useEffect(() => {
		if (!data?.profile) return;
		const step = data.profile.onboardingStep;
		navigate({
			to: `/onboarding/step${step}` as "/onboarding/step1",
			replace: true,
		});
	}, [data, navigate]);

	return (
		<div className="min-h-dvh bg-cream flex items-center justify-center">
			<p className="font-mono text-[12px] text-grey-3 animate-pulse">
				Loading…
			</p>
		</div>
	);
}
