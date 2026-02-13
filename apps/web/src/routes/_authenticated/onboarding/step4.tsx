import PreferencesStep from "@/components/onboarding/steps/PreferencesStep";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step4")({
	component: Step4Route,
});

function Step4Route() {
	const { data } = useOnboardingProfile();

	return (
		<PreferencesStep
			initialProactivity={data?.profile?.aiProactivity}
			initialNotification={data?.profile?.notificationStyle}
		/>
	);
}
