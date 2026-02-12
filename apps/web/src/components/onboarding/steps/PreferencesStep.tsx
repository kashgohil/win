import { api } from "@/lib/api";
import {
	NOTIFICATION_OPTIONS,
	PROACTIVITY_OPTIONS,
} from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import OnboardingShell from "../OnboardingShell";
import RadioCard from "../cards/RadioCard";

export default function PreferencesStep({
	initialProactivity,
	initialNotification,
}: {
	initialProactivity?: string | null;
	initialNotification?: string | null;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [proactivity, setProactivity] = useState(
		initialProactivity || "advisor",
	);
	const [notification, setNotification] = useState(
		initialNotification || "balanced",
	);
	const [saving, setSaving] = useState(false);

	async function handleLaunch() {
		setSaving(true);
		try {
			const { error } = await api.onboarding.step[4].patch({
				aiProactivity: proactivity,
				notificationStyle: notification,
			});
			if (error) {
				console.error("[onboarding] step 4 failed:", error);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
			navigate({ to: "/onboarding/launch" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<OnboardingShell
			step={4}
			onBack={() => navigate({ to: "/onboarding/step3" })}
		>
			<div className="ob-fade-up">
				<h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] text-ink tracking-[0.01em]">
					Set the rules
				</h1>
			</div>

			<div className="mt-8 ob-fade-up" style={{ animationDelay: "100ms" }}>
				<label className="font-mono text-[11px] text-grey-2 tracking-[0.04em] uppercase block mb-4">
					AI Proactivity
				</label>
				<div className="flex flex-col gap-3">
					{PROACTIVITY_OPTIONS.map((opt, i) => (
						<RadioCard
							key={opt.key}
							icon={opt.icon}
							label={opt.label}
							description={opt.description}
							selected={proactivity === opt.key}
							onClick={() => setProactivity(opt.key)}
							style={{ "--card-i": i } as React.CSSProperties}
						/>
					))}
				</div>
			</div>

			<div className="mt-10 ob-fade-up" style={{ animationDelay: "200ms" }}>
				<label className="font-mono text-[11px] text-grey-2 tracking-[0.04em] uppercase block mb-4">
					Notification Style
				</label>
				<div className="flex flex-col gap-3">
					{NOTIFICATION_OPTIONS.map((opt, i) => (
						<RadioCard
							key={opt.key}
							icon={opt.icon}
							label={opt.label}
							description={opt.description}
							selected={notification === opt.key}
							onClick={() => setNotification(opt.key)}
							style={{ "--card-i": i + 3 } as React.CSSProperties}
						/>
					))}
				</div>
			</div>

			<button
				type="button"
				disabled={saving}
				onClick={handleLaunch}
				className="mt-10 w-full py-3.5 rounded-lg bg-accent-red text-cream font-mono text-[13px] font-semibold tracking-[0.02em] transition-all duration-200 hover:bg-red-dark disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				{saving ? "Launching…" : "Launch Wingmnn"}
			</button>
		</OnboardingShell>
	);
}
