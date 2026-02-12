import { Elysia } from "elysia";

import { betterAuthHandler } from "../auth";

export const betterAuthPlugin = new Elysia({ name: "auth" }).macro({
	auth: {
		async resolve({ status, request }) {
			const session = await betterAuthHandler.api.getSession({
				headers: request.headers,
			});
			if (!session) return status(401, "Unauthorized");
			return { user: session.user, session: session.session };
		},
	},
});
