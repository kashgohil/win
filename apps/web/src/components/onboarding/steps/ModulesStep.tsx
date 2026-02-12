import { api } from "@/lib/api";
import type { ModuleKey } from "@/lib/onboarding-data";
import { MODULES, ROLE_MODULE_PRESETS } from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import OnboardingShell from "../OnboardingShell";
import ModuleCard from "../cards/ModuleCard";

export default function ModulesStep({
	role,
	initialModules,
}: {
	role?: string | null;
	initialModules?: string[] | null;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [saving, setSaving] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (initialized) return;
		if (initialModules && initialModules.length > 0) {
			setSelected(new Set(initialModules));
		} else if (role && ROLE_MODULE_PRESETS[role]) {
			setSelected(new Set(ROLE_MODULE_PRESETS[role]));
		}
		setInitialized(true);
	}, [role, initialModules, initialized]);

	function toggle(key: ModuleKey) {
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}
			return next;
		});
	}

	async function handleContinue() {
		if (selected.size === 0) return;
		setSaving(true);
		try {
			const { error } = await api.onboarding.step[2].patch({
				modules: [...selected],
			});
			if (error) {
				console.error("[onboarding] step 2 failed:", error);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
			navigate({ to: "/onboarding/step3" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<OnboardingShell
			step={2}
			wide
			onBack={() => navigate({ to: "/onboarding/step1" })}
		>
			<div className="ob-fade-up">
				<h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] text-ink tracking-[0.01em]">
					Pick your modules
				</h1>
				<p className="font-serif text-[1rem] text-grey-2 mt-2 leading-relaxed">
					Start with what matters. Add more anytime.
				</p>
			</div>

			<div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
				{MODULES.map((m, i) => (
					<ModuleCard
						key={m.key}
						icon={m.icon}
						code={m.code}
						name={m.name}
						description={m.description}
						selected={selected.has(m.key)}
						onClick={() => toggle(m.key)}
						style={{ "--card-i": i } as React.CSSProperties}
					/>
				))}
			</div>

			<button
				type="button"
				disabled={selected.size === 0 || saving}
				onClick={handleContinue}
				className="mt-10 w-full py-3.5 rounded-lg bg-ink text-cream font-mono text-[13px] font-semibold tracking-[0.02em] transition-all duration-200 hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				{saving
					? "Saving…"
					: `Continue with ${selected.size} module${selected.size !== 1 ? "s" : ""}`}
			</button>
		</OnboardingShell>
	);
}
