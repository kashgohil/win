import { redis } from "../client";

const PREFIX = "rl:";

/**
 * Redis-backed rate limit context for elysia-rate-limit.
 *
 * Implements the `Context` interface from elysia-rate-limit using
 * INCR + EXPIRE for sliding window counters.
 */
export class RedisRateLimitContext {
	private duration = 60_000;

	init(options: { duration: number }): void {
		this.duration = options.duration;
	}

	async increment(key: string): Promise<{ count: number; nextReset: Date }> {
		const prefixedKey = `${PREFIX}${key}`;
		const ttlSeconds = Math.ceil(this.duration / 1000);

		const count = await redis.client.incr(prefixedKey);

		if (count === 1) {
			await redis.client.expire(prefixedKey, ttlSeconds);
		}

		const ttl = await redis.client.ttl(prefixedKey);
		const nextReset =
			ttl > 0
				? new Date(Date.now() + ttl * 1000)
				: new Date(Date.now() + this.duration);

		return { count, nextReset };
	}

	async decrement(key: string): Promise<void> {
		const prefixedKey = `${PREFIX}${key}`;

		const count = await redis.client.decr(prefixedKey);

		if (count <= 0) {
			await redis.client.del(prefixedKey);
		}
	}

	async reset(key?: string): Promise<void> {
		if (key) {
			await redis.client.del(`${PREFIX}${key}`);
		} else {
			const keys = await redis.client.keys(`${PREFIX}*`);
			if (keys.length > 0) {
				await redis.client.del(...keys);
			}
		}
	}

	async kill(): Promise<void> {
		await this.reset();
	}
}
