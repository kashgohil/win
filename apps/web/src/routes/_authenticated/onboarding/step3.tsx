import ConnectStep from "@/components/onboarding/steps/ConnectStep";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step3")({
	component: Step3Route,
});

function Step3Route() {
	const { data } = useOnboardingProfile();

	return <ConnectStep enabledModules={data?.profile?.enabledModules} />;
}
