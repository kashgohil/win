import ConnectStep from "@/components/onboarding/steps/ConnectStep";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/step3")({
	component: Step3Route,
});

function Step3Route() {
	const { data } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	return <ConnectStep enabledModules={data?.profile?.enabledModules} />;
}
