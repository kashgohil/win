import { accounts, db, sessions, users, verifications } from "@wingmnn/db";
import { createBetterAuthStorage } from "@wingmnn/redis";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { env } from "@/env";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		usePlural: true,
		schema: {
			user: users,
			session: sessions,
			account: accounts,
			verification: verifications,
		},
	}),
	basePath: "/auth",
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	emailAndPassword: {
		enabled: true,
	},
	socialProviders: {
		google: {
			clientId: env.GOOGLE_CLIENT_ID ?? "",
			clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
		},
	},
	user: {
		modelName: "users",
		fields: {
			image: "avatar_url",
		},
	},
	session: {
		modelName: "sessions",
	},
	secondaryStorage: createBetterAuthStorage(),
});
