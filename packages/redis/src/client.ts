import { RedisClient } from "bun";

import { env } from "./env";
import { RedisConnectionError } from "./errors";

export type RedisHealthStatus = {
	status: "healthy" | "unhealthy";
	latencyMs: number;
	error?: string;
};

class Redis {
	readonly client: RedisClient;

	constructor() {
		try {
			this.client = new RedisClient(env.REDIS_URL, {
				autoReconnect: true,
				enableOfflineQueue: true,
			});
		} catch (error) {
			throw new RedisConnectionError("Failed to create Redis client", {
				cause: error,
			});
		}
	}

	async checkHealth(): Promise<RedisHealthStatus> {
		const start = performance.now();

		try {
			await this.client.ping();
			const latencyMs = Math.round(performance.now() - start);
			return { status: "healthy", latencyMs };
		} catch (error) {
			const latencyMs = Math.round(performance.now() - start);
			const message =
				error instanceof RedisConnectionError
					? error.message
					: "Redis health check failed";
			return { status: "unhealthy", latencyMs, error: message };
		}
	}

	close(): void {
		try {
			this.client.close();
		} catch {
			// Already closed — safe to ignore
		}
	}
}

export const redis = new Redis();
