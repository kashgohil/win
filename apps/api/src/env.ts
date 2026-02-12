import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const envSchema = Type.Object({
	DATABASE_URL: Type.String(),
	BETTER_AUTH_SECRET: Type.String({ minLength: 32 }),
	BETTER_AUTH_URL: Type.Optional(Type.String()),
	GOOGLE_CLIENT_ID: Type.Optional(Type.String()),
	GOOGLE_CLIENT_SECRET: Type.Optional(Type.String()),
	GITHUB_CLIENT_ID: Type.Optional(Type.String()),
	GITHUB_CLIENT_SECRET: Type.Optional(Type.String()),
	REDIS_URL: Type.Optional(Type.String()),
	CLIENT_URL: Type.Optional(Type.String()),
});

const envWithDefaults = {
	...Bun.env,
	BETTER_AUTH_URL: Bun.env.BETTER_AUTH_URL ?? "http://localhost:8080",
	CLIENT_URL: Bun.env.CLIENT_URL ?? "http://localhost:3000",
};

if (!Value.Check(envSchema, envWithDefaults)) {
	const errors = [...Value.Errors(envSchema, envWithDefaults)];
	const messages = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
	throw new Error(`Invalid env: ${messages}`);
}

export const env = Value.Cast(envSchema, envWithDefaults);
