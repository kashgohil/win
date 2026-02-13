import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export const onboardingQueryKey = ["onboarding"] as const;

export function useOnboardingProfile() {
	return useQuery({
		queryKey: onboardingQueryKey,
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});
}
