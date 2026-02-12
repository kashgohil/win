import { redis } from "../client";
import { RedisCacheError } from "../errors";

const PREFIX = "ba:";

type BetterAuthStorage = {
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string, ttl?: number) => Promise<void>;
	delete: (key: string) => Promise<void>;
};

export function createBetterAuthStorage(): BetterAuthStorage {
	return {
		async get(key: string): Promise<string | null> {
			try {
				return await redis.client.get(`${PREFIX}${key}`);
			} catch (error) {
				throw new RedisCacheError("Failed to get session from Redis", {
					cause: error,
				});
			}
		},

		async set(key: string, value: string, ttl?: number): Promise<void> {
			try {
				const prefixedKey = `${PREFIX}${key}`;

				if (ttl && ttl > 0) {
					await redis.client.set(prefixedKey, value, "EX", ttl);
				} else {
					await redis.client.set(prefixedKey, value);
				}
			} catch (error) {
				throw new RedisCacheError("Failed to set session in Redis", {
					cause: error,
				});
			}
		},

		async delete(key: string): Promise<void> {
			try {
				await redis.client.del(`${PREFIX}${key}`);
			} catch (error) {
				throw new RedisCacheError("Failed to delete session from Redis", {
					cause: error,
				});
			}
		},
	};
}
