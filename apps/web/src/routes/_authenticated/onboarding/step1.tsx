import WelcomeStep from "@/components/onboarding/steps/WelcomeStep";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step1")({
	component: Step1Route,
});

function Step1Route() {
	const { data: session } = authClient.useSession();

	const { data } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	return (
		<WelcomeStep
			userName={session?.user?.name}
			initialTimezone={data?.profile?.timezone}
			initialRole={data?.profile?.role}
		/>
	);
}
