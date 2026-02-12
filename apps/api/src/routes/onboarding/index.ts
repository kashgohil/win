import { Elysia, t } from "elysia";

import { auth as authPlugin } from "../../plugins/auth";
import {
	errorResponse,
	profileResponse,
	stepSuccessResponse,
} from "./responses";
import { onboardingService } from "./service";

export const onboarding = new Elysia({
	name: "onboarding",
	prefix: "/onboarding",
})
	.use(authPlugin)
	.get(
		"/",
		async ({ user, set }) => {
			const result = await onboardingService.getOrCreateProfile(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return { profile: result.profile };
		},
		{
			auth: true,
			response: {
				200: profileResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Get onboarding profile",
				description:
					"Returns the user's onboarding profile, creating one if it doesn't exist",
				tags: ["Onboarding"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/step/1",
		async ({ user, body, set }) => {
			const result = await onboardingService.updateStep1(user.id, body);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return {
				message: result.message,
				step: result.step,
				profile: result.profile,
			};
		},
		{
			auth: true,
			body: t.Object({
				timezone: t.String({ minLength: 1 }),
				role: t.String({ minLength: 1 }),
			}),
			response: {
				200: stepSuccessResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Save profile (step 1)",
				description: "Save timezone and role selection",
				tags: ["Onboarding"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/step/2",
		async ({ user, body, set }) => {
			const result = await onboardingService.updateStep2(user.id, body);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return {
				message: result.message,
				step: result.step,
				profile: result.profile,
			};
		},
		{
			auth: true,
			body: t.Object({
				modules: t.Array(t.String(), { minItems: 1 }),
			}),
			response: {
				200: stepSuccessResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Save modules (step 2)",
				description: "Save selected module preferences",
				tags: ["Onboarding"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/step/3",
		async ({ user, set }) => {
			const result = await onboardingService.updateStep3(user.id);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return {
				message: result.message,
				step: result.step,
				profile: result.profile,
			};
		},
		{
			auth: true,
			response: {
				200: stepSuccessResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Advance past integrations (step 3)",
				description: "Mark integrations step as complete",
				tags: ["Onboarding"],
				security: [{ bearerAuth: [] }],
			},
		},
	)
	.patch(
		"/step/4",
		async ({ user, body, set }) => {
			const result = await onboardingService.updateStep4(user.id, body);

			if (!result.ok) {
				set.status = result.status;
				return { error: result.error };
			}

			return {
				message: result.message,
				step: result.step,
				profile: result.profile,
			};
		},
		{
			auth: true,
			body: t.Object({
				aiProactivity: t.String({ minLength: 1 }),
				notificationStyle: t.String({ minLength: 1 }),
			}),
			response: {
				200: stepSuccessResponse,
				400: errorResponse,
				500: errorResponse,
			},
			detail: {
				summary: "Save preferences (step 4)",
				description:
					"Save AI proactivity and notification preferences, completing onboarding",
				tags: ["Onboarding"],
				security: [{ bearerAuth: [] }],
			},
		},
	);
