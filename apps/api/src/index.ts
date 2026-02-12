import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { redis } from "@wingmnn/redis";
import { Elysia } from "elysia";
import { lenientLimit, strictLimit } from "./plugins/rate-limit";
import { requestID } from "./plugins/request-id";

import { auth } from "./auth";
import { auth as authPlugin } from "./plugins/auth";
import { health } from "./routes/health";
import { me } from "./routes/me";
import { onboarding } from "./routes/onboarding";
import { waitlist } from "./routes/waitlist";

const app = new Elysia({ name: "wingmnn-api" })
	.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:4000"],
			credentials: true,
		}),
	)
	.use(requestID())
	.use(
		openapi({
			documentation: {
				info: {
					title: "Wingmnn API",
					version: "1.0.0",
					description: "Backend API for Wingmnn",
				},
				tags: [
					{ name: "Health", description: "Liveness and readiness" },
					{ name: "Auth", description: "Authentication (better-auth)" },
					{ name: "User", description: "Authenticated user endpoints" },
					{ name: "Waitlist", description: "Waitlist signup" },
					{ name: "Onboarding", description: "User onboarding flow" },
				],
				components: {
					securitySchemes: {
						bearerAuth: {
							type: "http",
							scheme: "bearer",
							bearerFormat: "Cookie",
						},
					},
				},
			},
			exclude: {
				paths: ["/auth/*"],
			},
		}),
	)
	.use(authPlugin)
	.use(health)
	.use(strictLimit())
	.all("/auth/*", ({ request }) => auth.handler(request))
	.use(lenientLimit())
	.use(me)
	.use(onboarding)
	.use(waitlist)
	.listen(8080);

export type App = typeof app;

console.log(`Listening on ${app.server!.url}`);

function shutdown() {
	console.log("Shutting down...");
	redis.close();
	app.stop();
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
