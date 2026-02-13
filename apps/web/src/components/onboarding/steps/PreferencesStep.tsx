import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { onboardingQueryKey } from "@/hooks/use-onboarding";
import { api } from "@/lib/api";
import {
	NOTIFICATION_OPTIONS,
	PROACTIVITY_OPTIONS,
} from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
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
			await queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
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
			<motion.div
				className="text-center"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			>
				<h1 className="font-display text-[clamp(1.6rem,4vw,2.2rem)] text-foreground tracking-[0.01em]">
					Set the rules
				</h1>
			</motion.div>

			<div className="mt-8 text-center">
				<Label className="block mb-4">AI Proactivity</Label>
				<div className="flex flex-col gap-3">
					{PROACTIVITY_OPTIONS.map((opt, i) => (
						<RadioCard
							key={opt.key}
							icon={opt.icon}
							label={opt.label}
							description={opt.description}
							selected={proactivity === opt.key}
							onClick={() => setProactivity(opt.key)}
							index={i}
						/>
					))}
				</div>
			</div>

			<div className="mt-10 text-center">
				<Label className="block mb-4">Notification Style</Label>
				<div className="flex flex-col gap-3">
					{NOTIFICATION_OPTIONS.map((opt, i) => (
						<RadioCard
							key={opt.key}
							icon={opt.icon}
							label={opt.label}
							description={opt.description}
							selected={notification === opt.key}
							onClick={() => setNotification(opt.key)}
							index={i + 3}
						/>
					))}
				</div>
			</div>

			<Button
				variant="auth"
				size="auth"
				disabled={saving}
				onClick={handleLaunch}
				className="mt-10 cursor-pointer tracking-[0.02em] bg-accent-red"
			>
				{saving ? "Launching…" : "Launch Wingmnn"}
			</Button>
		</OnboardingShell>
	);
}
