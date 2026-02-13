import ModulesStep from "@/components/onboarding/steps/ModulesStep";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step2")({
	component: Step2Route,
});

function Step2Route() {
	const { data } = useOnboardingProfile();

	return (
		<ModulesStep
			role={data?.profile?.role}
			initialModules={data?.profile?.enabledModules}
		/>
	);
}
