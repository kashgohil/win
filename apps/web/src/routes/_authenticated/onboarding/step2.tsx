import ModulesStep from "@/components/onboarding/steps/ModulesStep";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step2")({
	component: Step2Route,
});

function Step2Route() {
	const { data } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	return (
		<ModulesStep
			role={data?.profile?.role}
			initialModules={data?.profile?.enabledModules}
		/>
	);
}
