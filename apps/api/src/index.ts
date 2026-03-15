import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { redis } from "@wingmnn/redis";
import { Elysia } from "elysia";
import { logger } from "./plugins/logger";
import { lenientLimit, strictLimit } from "./plugins/rate-limit";
import { requestID } from "./plugins/request-id";

const isDev = process.env.NODE_ENV !== "production";

import { betterAuthHandler } from "./auth";
import { betterAuthPlugin } from "./plugins/auth";
import { aiRoutes } from "./routes/ai";
import { calendarRoutes } from "./routes/calendar";
import { contactsRoutes } from "./routes/contacts";
import { financeRoutes } from "./routes/finance";
import { health } from "./routes/health";
import { mail } from "./routes/mail";
import { me } from "./routes/me";
import { notificationsRoutes } from "./routes/notifications";
import { onboarding } from "./routes/onboarding";
import { tasksRoutes } from "./routes/tasks";
import { waitlist } from "./routes/waitlist";

const app = new Elysia({ name: "wingmnn-api" })
	.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:4000"],
			credentials: true,
		}),
	)
	.use(requestID())
	.use(logger)
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
					{
						name: "Mail",
						description: "Mail module — emails, triage, accounts",
					},
					{
						name: "Calendar",
						description: "Calendar module — events, scheduling",
					},
					{
						name: "Tasks",
						description: "Tasks module — tasks, projects, integrations",
					},
					{
						name: "Contacts",
						description: "Contacts module — CRM, relationships, interactions",
					},
					{
						name: "Finance",
						description:
							"Finance module — expenses, income, recurring charges",
					},
					{
						name: "Notifications",
						description: "In-app notifications",
					},
					{
						name: "AI",
						description: "AI-powered features — summarization, drafting",
					},
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
	.use(betterAuthPlugin)

	// auth routes
	.mount(betterAuthHandler.handler)
	.use(health)
	.use(isDev ? (app) => app : strictLimit())
	.use(isDev ? (app) => app : lenientLimit())
	.use(mail)
	.use(calendarRoutes)
	.use(tasksRoutes)
	.use(contactsRoutes)
	.use(financeRoutes)
	.use(aiRoutes)
	.use(notificationsRoutes)
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
