import { api } from "@/lib/api";
import { ROLES } from "@/lib/onboarding-data";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import OnboardingShell from "../OnboardingShell";
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
	const [editingTz, setEditingTz] = useState(false);

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
			await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
			navigate({ to: "/onboarding/step2" });
		} finally {
			setSaving(false);
		}
	}

	return (
		<OnboardingShell step={1}>
			<div className="ob-fade-up">
				<h1 className="font-display text-[clamp(1.8rem,5vw,2.6rem)] text-ink tracking-[0.01em]">
					Welcome, {firstName}.
				</h1>
				<p className="font-serif text-[1rem] text-grey-2 mt-2 leading-relaxed">
					Let's set up your Wingmnn. This takes about 90 seconds.
				</p>
			</div>

			<div className="mt-8 ob-fade-up" style={{ animationDelay: "100ms" }}>
				<label className="font-mono text-[11px] text-grey-2 tracking-[0.04em] uppercase block mb-2">
					Timezone
				</label>
				{editingTz ? (
					<input
						type="text"
						value={timezone}
						onChange={(e) => setTimezone(e.target.value)}
						onBlur={() => setEditingTz(false)}
						autoFocus
						className="font-serif text-[0.95rem] text-ink bg-transparent border-b border-grey-4 pb-1 outline-none w-full max-w-[320px] focus:border-ink transition-colors"
					/>
				) : (
					<button
						type="button"
						onClick={() => setEditingTz(true)}
						className="font-serif text-[0.95rem] text-ink bg-transparent border-none p-0 cursor-pointer hover:text-accent-red transition-colors"
					>
						{timezone}{" "}
						<span className="font-mono text-[10px] text-grey-3 ml-1">
							edit
						</span>
					</button>
				)}
			</div>

			<div className="mt-10 ob-fade-up" style={{ animationDelay: "200ms" }}>
				<label className="font-mono text-[11px] text-grey-2 tracking-[0.04em] uppercase block mb-4">
					I'm a…
				</label>
				<div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
					{ROLES.map((r, i) => (
						<RoleCard
							key={r.key}
							icon={r.icon}
							label={r.label}
							description={r.description}
							selected={role === r.key}
							onClick={() => setRole(r.key)}
							style={{ "--card-i": i } as React.CSSProperties}
						/>
					))}
				</div>
			</div>

			<button
				type="button"
				disabled={!role || saving}
				onClick={handleContinue}
				className="mt-10 w-full py-3.5 rounded-lg bg-ink text-cream font-mono text-[13px] font-semibold tracking-[0.02em] transition-all duration-200 hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
			>
				{saving ? "Saving…" : "Continue"}
			</button>
		</OnboardingShell>
	);
}
