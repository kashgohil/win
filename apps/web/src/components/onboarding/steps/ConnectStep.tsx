import { Button } from "@/components/ui/button";
import { onboardingQueryKey } from "@/hooks/use-onboarding";
import { api } from "@/lib/api";
import { INTEGRATIONS } from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";

import OnboardingShell from "../OnboardingShell";
import IntegrationCard from "../cards/IntegrationCard";

export default function ConnectStep({
	enabledModules,
}: {
	enabledModules?: string[] | null;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [saving, setSaving] = useState(false);

	const modules = new Set(enabledModules ?? []);
	const filtered = INTEGRATIONS.filter((ig) => modules.has(ig.module));

	async function handleContinue() {
		setSaving(true);
		try {
			const { error } = await api.onboarding.step[3].patch({});
			if (error) {
				console.error("[onboarding] step 3 failed:", error);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
			navigate({ to: "/onboarding/step4" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<OnboardingShell
			step={3}
			onBack={() => navigate({ to: "/onboarding/step2" })}
		>
			<motion.div
				className="text-center"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			>
				<h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] text-foreground tracking-[0.01em]">
					Connect your accounts
				</h1>
				<p className="font-serif text-[1rem] text-grey-2 mt-2 leading-relaxed">
					The more you connect, the smarter Wingmnn gets.
				</p>
			</motion.div>

			<div className="mt-8 flex flex-col gap-3">
				{filtered.map((ig, i) => (
					<IntegrationCard
						key={`${ig.module}-${ig.provider}`}
						icon={ig.icon}
						provider={ig.provider}
						description={ig.description}
						index={i}
					/>
				))}
			</div>

			{modules.has("mail") && modules.has("cal") && (
				<motion.div
					className="mt-6 rounded-lg border border-dashed border-border p-4"
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
				>
					<p className="font-serif text-[0.85rem] text-grey-2 leading-relaxed text-center">
						<span className="text-foreground font-medium">Pro tip:</span> Email
						+ Calendar together enables automatic meeting prep — Wingmnn will
						draft agendas from your inbox before every call.
					</p>
				</motion.div>
			)}

			<Button
				variant="auth"
				size="auth"
				disabled={saving}
				onClick={handleContinue}
				className="mt-10 cursor-pointer tracking-[0.02em]"
			>
				{saving ? "Saving…" : "Continue"}
			</Button>
		</OnboardingShell>
	);
}
