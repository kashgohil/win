import { Elysia } from "elysia";

import { betterAuthPlugin } from "../../plugins/auth";
import { userResponse } from "./responses";

export const me = new Elysia({
	name: "me",
	prefix: "/me",
})
	.use(betterAuthPlugin)
	.get(
		"/",
		({ user }) => {
			return {
				...user,
				image: user.image ?? null,
				createdAt:
					user.createdAt instanceof Date
						? user.createdAt.toISOString()
						: user.createdAt,
				updatedAt:
					user.updatedAt instanceof Date
						? user.updatedAt.toISOString()
						: user.updatedAt,
			};
		},
		{
			auth: true,
			response: userResponse,
			detail: {
				summary: "Get current user",
				description: "Returns the authenticated user's profile",
				tags: ["User"],
				security: [{ bearerAuth: [] }],
			},
		},
	);
