import { db, eq, userProfiles } from "@wingmnn/db";

type Profile = typeof userProfiles.$inferSelect;

type SerializedProfile = Omit<
	Profile,
	"onboardingCompletedAt" | "createdAt" | "updatedAt"
> & {
	onboardingCompletedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

function serialize(p: Profile): SerializedProfile {
	return {
		...p,
		onboardingCompletedAt: p.onboardingCompletedAt?.toISOString() ?? null,
		createdAt: p.createdAt.toISOString(),
		updatedAt: p.updatedAt.toISOString(),
	};
}

type GetResult =
	| { ok: true; profile: SerializedProfile }
	| { ok: false; error: string; status: 500 };

type StepResult =
	| { ok: true; message: string; step: number; profile: SerializedProfile }
	| { ok: false; error: string; status: 400 | 500 };

type UpdateProfileData = {
	timezone?: string;
	role?: string;
	enabledModules?: string[];
	aiProactivity?: string;
	notificationStyle?: string;
};

type UpdateResult =
	| { ok: true; profile: SerializedProfile }
	| { ok: false; error: string; status: 400 | 500 };

class OnboardingService {
	async getOrCreateProfile(userId: string): Promise<GetResult> {
		try {
			const existing = await db.query.userProfiles.findFirst({
				where: eq(userProfiles.userId, userId),
			});

			if (existing) {
				return { ok: true, profile: serialize(existing) };
			}

			const [created] = await db
				.insert(userProfiles)
				.values({ userId })
				.returning();

			return { ok: true, profile: serialize(created!) };
		} catch (err) {
			console.error("[onboarding] getOrCreateProfile failed:", err);
			return { ok: false, error: "Failed to load profile", status: 500 };
		}
	}

	async updateStep1(
		userId: string,
		data: { timezone: string; role: string },
	): Promise<StepResult> {
		try {
			const [updated] = await db
				.update(userProfiles)
				.set({
					timezone: data.timezone,
					role: data.role,
					onboardingStep: 2,
				})
				.where(eq(userProfiles.userId, userId))
				.returning();

			if (!updated) {
				return { ok: false, error: "Profile not found", status: 400 };
			}

			return {
				ok: true,
				message: "Profile saved",
				step: 2,
				profile: serialize(updated),
			};
		} catch (err) {
			console.error("[onboarding] updateStep1 failed:", err);
			return { ok: false, error: "Failed to save profile", status: 500 };
		}
	}

	async updateStep2(
		userId: string,
		data: { modules: string[] },
	): Promise<StepResult> {
		if (data.modules.length === 0) {
			return {
				ok: false,
				error: "Select at least one module",
				status: 400,
			};
		}

		try {
			const [updated] = await db
				.update(userProfiles)
				.set({
					enabledModules: data.modules,
					onboardingStep: 3,
				})
				.where(eq(userProfiles.userId, userId))
				.returning();

			if (!updated) {
				return { ok: false, error: "Profile not found", status: 400 };
			}

			return {
				ok: true,
				message: "Modules saved",
				step: 3,
				profile: serialize(updated),
			};
		} catch (err) {
			console.error("[onboarding] updateStep2 failed:", err);
			return { ok: false, error: "Failed to save modules", status: 500 };
		}
	}

	async updateStep3(userId: string): Promise<StepResult> {
		try {
			const [updated] = await db
				.update(userProfiles)
				.set({ onboardingStep: 4 })
				.where(eq(userProfiles.userId, userId))
				.returning();

			if (!updated) {
				return { ok: false, error: "Profile not found", status: 400 };
			}

			return {
				ok: true,
				message: "Integrations step completed",
				step: 4,
				profile: serialize(updated),
			};
		} catch (err) {
			console.error("[onboarding] updateStep3 failed:", err);
			return { ok: false, error: "Failed to advance step", status: 500 };
		}
	}

	async updateStep4(
		userId: string,
		data: { aiProactivity: string; notificationStyle: string },
	): Promise<StepResult> {
		try {
			const [updated] = await db
				.update(userProfiles)
				.set({
					aiProactivity: data.aiProactivity,
					notificationStyle: data.notificationStyle,
					onboardingCompletedAt: new Date(),
				})
				.where(eq(userProfiles.userId, userId))
				.returning();

			if (!updated) {
				return { ok: false, error: "Profile not found", status: 400 };
			}

			return {
				ok: true,
				message: "Onboarding complete",
				step: 4,
				profile: serialize(updated),
			};
		} catch (err) {
			console.error("[onboarding] updateStep4 failed:", err);
			return {
				ok: false,
				error: "Failed to save preferences",
				status: 500,
			};
		}
	}
	async updateProfile(
		userId: string,
		data: UpdateProfileData,
	): Promise<UpdateResult> {
		if (data.enabledModules && data.enabledModules.length === 0) {
			return {
				ok: false,
				error: "Select at least one module",
				status: 400,
			};
		}

		try {
			const [updated] = await db
				.update(userProfiles)
				.set(data)
				.where(eq(userProfiles.userId, userId))
				.returning();

			if (!updated) {
				return { ok: false, error: "Profile not found", status: 400 };
			}

			return { ok: true, profile: serialize(updated) };
		} catch (err) {
			console.error("[onboarding] updateProfile failed:", err);
			return { ok: false, error: "Failed to update profile", status: 500 };
		}
	}
}

export const onboardingService = new OnboardingService();
