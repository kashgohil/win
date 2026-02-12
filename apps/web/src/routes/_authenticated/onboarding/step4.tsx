import PreferencesStep from "@/components/onboarding/steps/PreferencesStep";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step4")({
	component: Step4Route,
});

function Step4Route() {
	const { data } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	return (
		<PreferencesStep
			initialProactivity={data?.profile?.aiProactivity}
			initialNotification={data?.profile?.notificationStyle}
		/>
	);
}
