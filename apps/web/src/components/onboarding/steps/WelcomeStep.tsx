import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { onboardingQueryKey } from "@/hooks/use-onboarding";
import { api } from "@/lib/api";
import { ROLES } from "@/lib/onboarding-data";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";

import OnboardingShell from "../OnboardingShell";
import TimezoneCombobox from "../TimezoneCombobox";
import RoleCard from "../cards/RoleCard";

export default function WelcomeStep({
	userName,
	initialTimezone,
	initialRole,
}: {
	userName?: string | null;
	initialTimezone?: string | null;
	initialRole?: string | null;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;

	const [timezone, setTimezone] = useState(initialTimezone || detectedTz);
	const [role, setRole] = useState(initialRole || "");
	const [saving, setSaving] = useState(false);

	const firstName = userName?.split(" ")[0] || "there";

	async function handleContinue() {
		if (!role) return;
		setSaving(true);
		try {
			const { error } = await api.onboarding.step[1].patch({
				timezone,
				role,
			});
			if (error) {
				console.error("[onboarding] step 1 failed:", error);
				return;
			}
			await queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
			navigate({ to: "/onboarding/step2" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<OnboardingShell step={1}>
			<motion.div
				className="text-center"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			>
				<h1 className="font-display text-[clamp(1.8rem,5vw,2.6rem)] text-foreground tracking-[0.01em]">
					Welcome, {firstName}.
				</h1>
				<p className="font-serif text-[1rem] text-grey-2 mt-2 leading-relaxed">
					Let's set up your Wingmnn. This will take only a moment.
				</p>
			</motion.div>

			<motion.div
				className="mt-8 flex flex-col items-center"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			>
				<Label className="block mb-2">Timezone</Label>
				<TimezoneCombobox value={timezone} onChange={setTimezone} />
			</motion.div>

			<motion.div
				className="mt-10 text-center"
				initial={{ opacity: 0, y: 10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			>
				<Label className="block mb-4">Who are you?</Label>
				<div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
					{ROLES.map((r, i) => (
						<RoleCard
							key={r.key}
							icon={r.icon}
							label={r.label}
							description={r.description}
							selected={role === r.key}
							onClick={() => setRole(r.key)}
							index={i}
						/>
					))}
				</div>
			</motion.div>

			<Button
				variant="auth"
				size="auth"
				disabled={!role || saving}
				onClick={handleContinue}
				className="mt-10 cursor-pointer tracking-[0.02em]"
			>
				{saving ? "Saving…" : "Continue"}
			</Button>
		</OnboardingShell>
	);
}
