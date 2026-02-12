import { RedisRateLimitContext } from "@wingmnn/redis";
import { rateLimit, type Context, type Options } from "elysia-rate-limit";

type RateLimitOptions = Partial<Options>;

const defaults = {
	scoping: "scoped",
	headers: true,
	context: new RedisRateLimitContext() as Context,
} satisfies RateLimitOptions;

/** Strict: 10 req / 60s — auth, sensitive endpoints */
export const strictLimit = (overrides?: RateLimitOptions) =>
	rateLimit({ ...defaults, max: 10, duration: 60_000, ...overrides });

/** Standard: 60 req / 60s — general API routes */
export const standardLimit = (overrides?: RateLimitOptions) =>
	rateLimit({ ...defaults, max: 60, duration: 60_000, ...overrides });

/** Lenient: 120 req / 60s — read-heavy, low-risk routes */
export const lenientLimit = (overrides?: RateLimitOptions) =>
	rateLimit({ ...defaults, max: 120, duration: 60_000, ...overrides });
