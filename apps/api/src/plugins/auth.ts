import { Elysia } from "elysia";

import { auth as betterAuth } from "@/auth";

export const auth = new Elysia({ name: "auth" }).macro({
	auth: {
		async resolve({ status, request }) {
			const session = await betterAuth.api.getSession({
				headers: request.headers,
			});
			if (!session) return status(401, "Unauthorized");
			return { user: session.user, session: session.session };
		},
	},
});
