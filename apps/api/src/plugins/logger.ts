import { Elysia } from "elysia";

type LogLevel = "info" | "warn" | "error";

function formatTimestamp(): string {
	return new Date().toISOString();
}

function formatLog(
	level: LogLevel,
	message: string,
	meta?: Record<string, unknown>,
): string {
	const timestamp = formatTimestamp();
	const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
	return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
}

function getColorForStatus(status: number): string {
	if (status >= 500) return "\x1b[31m"; // red
	if (status >= 400) return "\x1b[33m"; // yellow
	if (status >= 300) return "\x1b[36m"; // cyan
	return "\x1b[32m"; // green
}

function getColorForMethod(method: string): string {
	switch (method) {
		case "GET":
			return "\x1b[36m"; // cyan
		case "POST":
			return "\x1b[32m"; // green
		case "PUT":
		case "PATCH":
			return "\x1b[33m"; // yellow
		case "DELETE":
			return "\x1b[31m"; // red
		default:
			return "\x1b[37m"; // white
	}
}

const RESET = "\x1b[0m";

export const logger = new Elysia({ name: "logger" })
	.onRequest(({ request }) => {
		// Store start time on the request object for duration calculation
		(request as Request & { startTime?: number }).startTime = Date.now();
	})
	.onAfterResponse(({ request, response, set }) => {
		const startTime =
			(request as Request & { startTime?: number }).startTime ?? Date.now();
		const duration = Date.now() - startTime;
		const method = request.method;
		const path = new URL(request.url).pathname;
		const rawStatus =
			set.status ?? (response as Response | undefined)?.status ?? 200;
		const status = typeof rawStatus === "number" ? rawStatus : 200;
		const reqID =
			(set.headers?.["X-Request-ID"] as string | undefined) ?? "unknown";

		const methodColor = getColorForMethod(method);
		const statusColor = getColorForStatus(status);
		const durationStr =
			duration > 1000 ? `${(duration / 1000).toFixed(2)}s` : `${duration}ms`;

		// Format: METHOD path status duration (requestID)
		const logMessage = `${methodColor}${method}${RESET} ${path} ${statusColor}${status}${RESET} ${durationStr} (${reqID})`;

		if (status >= 500) {
			console.error(formatLog("error", logMessage));
		} else if (status >= 400) {
			console.warn(formatLog("warn", logMessage));
		} else {
			console.log(logMessage);
		}
	})
	.onError(({ error, request, set }) => {
		const path = new URL(request.url).pathname;
		const reqID =
			(set.headers?.["X-Request-ID"] as string | undefined) ?? "unknown";
		const rawStatus = set.status ?? 500;
		const status = typeof rawStatus === "number" ? rawStatus : 500;
		const err = error instanceof Error ? error : new Error(String(error));

		console.error(
			formatLog("error", `${request.method} ${path} ${status}`, {
				requestID: reqID,
				error: err.message,
				stack: err.stack,
			}),
		);
	});
