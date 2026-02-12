import { t } from "elysia";

export const profileSchema = t.Object({
	id: t.String({ format: "uuid" }),
	userId: t.String(),
	timezone: t.Union([t.String(), t.Null()]),
	role: t.Union([t.String(), t.Null()]),
	enabledModules: t.Union([t.Array(t.String()), t.Null()]),
	aiProactivity: t.Union([t.String(), t.Null()]),
	notificationStyle: t.Union([t.String(), t.Null()]),
	onboardingStep: t.Number(),
	onboardingCompletedAt: t.Union([t.String({ format: "date-time" }), t.Null()]),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});

export const profileResponse = t.Object({
	profile: profileSchema,
});

export const stepSuccessResponse = t.Object({
	message: t.String(),
	step: t.Number(),
	profile: profileSchema,
});

export const errorResponse = t.Object({
	error: t.String(),
});
