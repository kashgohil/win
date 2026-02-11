import { Elysia, t } from "elysia";

import { emailSchema } from "@/schemas/email";
import { waitlistService } from "./service";

export const waitlist = new Elysia({ name: "waitlist" }).post(
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
			source: t.String().optional(),
			referrer: t.String().optional(),
		}),
	},
);
