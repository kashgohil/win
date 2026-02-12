import { Elysia, t } from "elysia";

import { emailSchema } from "../../schemas/email";
import { waitlistErrorResponse, waitlistSuccessResponse } from "./responses";
import { waitlistService } from "./service";

export const waitlist = new Elysia({
	name: "waitlist",
	prefix: "/waitlist",
}).post(
	"/",
	async ({ body, set }) => {
		const result = await waitlistService.join(body);

		if (!result.ok) {
			set.status = result.status;
			return { error: result.error };
		}

		if (result.created) {
			set.status = 201;
			return {
				message:
					"We have received your request to join the waitlist. We will get back to you soon.",
			};
		}

		return { message: result.message };
	},
	{
		body: t.Object({
			email: emailSchema,
			source: t.Optional(t.String()),
			referrer: t.Optional(t.String()),
		}),
		response: {
			200: waitlistSuccessResponse,
			201: waitlistSuccessResponse,
			400: waitlistErrorResponse,
			500: waitlistErrorResponse,
		},
		detail: {
			summary: "Join waitlist",
			description:
				"Submit email to join the waitlist. Returns success message or error.",
			tags: ["Waitlist"],
			responses: {
				200: { description: "Already on waitlist" },
				201: { description: "Successfully joined waitlist" },
				400: { description: "Invalid email" },
				500: { description: "Server error" },
			},
		},
	},
);
