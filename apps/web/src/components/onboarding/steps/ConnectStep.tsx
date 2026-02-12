import { api } from "@/lib/api";
import { INTEGRATIONS } from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
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
			await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
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
			<div className="ob-fade-up">
				<h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] text-ink tracking-[0.01em]">
					Connect your accounts
				</h1>
				<p className="font-serif text-[1rem] text-grey-2 mt-2 leading-relaxed">
					The more you connect, the smarter Wingmnn gets.
				</p>
			</div>

			<div className="mt-8 flex flex-col gap-3">
				{filtered.map((ig, i) => (
					<IntegrationCard
						key={`${ig.module}-${ig.provider}`}
						icon={ig.icon}
						provider={ig.provider}
						description={ig.description}
						style={{ "--card-i": i } as React.CSSProperties}
					/>
				))}
			</div>

			{modules.has("mail") && modules.has("cal") && (
				<div
					className="mt-6 rounded-lg border border-dashed border-grey-4 p-4 ob-fade-up"
					style={{ animationDelay: "300ms" }}
				>
					<p className="font-serif text-[0.85rem] text-grey-2 leading-relaxed">
						<span className="text-ink font-medium">Pro tip:</span> Email +
						Calendar together enables automatic meeting prep — Wingmnn will
						draft agendas from your inbox before every call.
					</p>
				</div>
			)}

			<button
				type="button"
				disabled={saving}
				onClick={handleContinue}
				className="mt-10 w-full py-3.5 rounded-lg bg-ink text-cream font-mono text-[13px] font-semibold tracking-[0.02em] transition-all duration-200 hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				{saving ? "Saving…" : "Continue"}
			</button>
		</OnboardingShell>
	);
}
