import { lenientLimit, strictLimit } from "@/plugins/rate-limit";
import { requestID } from "@/plugins/request-id";
import cors from "@elysiajs/cors";
import openapi from "@elysiajs/openapi";
import { Elysia } from "elysia";

import { auth } from "@/auth";
import { auth as authPlugin } from "@/plugins/auth";
import { waitlist } from "@/routes/waitlist";

const app = new Elysia({ name: "wingmnn-api" })
	.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:4000"],
			credentials: true,
		}),
	)
	.use(requestID())
	.use(openapi())
	.use(authPlugin)
	.get("/health", () => ({ hello: "Bun👋" }))

	.use(strictLimit())
	.all("/auth/*", ({ request }) => auth.handler(request))

	.use(lenientLimit())
	.get("/me", ({ user }) => user, { auth: true })
	.use(waitlist)
	.listen(8080);

console.log(`Listening on ${app.server!.url}`);
