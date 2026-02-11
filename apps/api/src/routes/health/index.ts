import { Elysia } from "elysia";

import { healthResponse } from "./responses";

export const health = new Elysia({
	name: "health",
	prefix: "/health",
}).get("/", () => ({ health: "This API is healthy" }), {
	response: healthResponse,
	detail: {
		summary: "Health check",
		description: "Returns API liveness status",
		tags: ["Health"],
	},
});
