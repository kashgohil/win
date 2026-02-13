import WelcomeStep from "@/components/onboarding/steps/WelcomeStep";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { authClient } from "@/lib/auth-client";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step1")({
	component: Step1Route,
});

function Step1Route() {
	const { data: session } = authClient.useSession();

	const { data } = useOnboardingProfile();

	return (
		<WelcomeStep
			userName={session?.user?.name}
			initialTimezone={data?.profile?.timezone}
			initialRole={data?.profile?.role}
		/>
	);
}
