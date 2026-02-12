import { redis } from "@wingmnn/redis";
import { Elysia } from "elysia";

import { healthResponse } from "./responses";

export const health = new Elysia({
	name: "health",
	prefix: "/health",
}).get(
	"/",
	async () => {
		const redisHealth = await redis.checkHealth();

		return {
			health: "This API is healthy",
			redis: redisHealth,
		};
	},
	{
		response: healthResponse,
		detail: {
			summary: "Health check",
			description: "Returns API liveness and Redis health status",
			tags: ["Health"],
		},
	},
);
