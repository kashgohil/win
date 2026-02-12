import { redis } from "./client";

const PREFIX = "cache:";

type CacheableOptions = {
	ttl: number;
};

export async function cacheable<T>(
	key: string,
	fn: () => Promise<T>,
	options: CacheableOptions,
): Promise<T> {
	const prefixedKey = `${PREFIX}${key}`;

	try {
		const cached = await redis.client.get(prefixedKey);

		if (cached !== null) {
			return JSON.parse(cached) as T;
		}
	} catch {
		// Cache read failed — fall through to source
	}

	const result = await fn();

	try {
		await redis.client.set(
			prefixedKey,
			JSON.stringify(result),
			"EX",
			options.ttl,
		);
	} catch {
		// Cache write failed — non-fatal
	}

	return result;
}

export async function invalidateCache(key: string): Promise<void> {
	try {
		await redis.client.del(`${PREFIX}${key}`);
	} catch {
		// Cache invalidation failed — non-fatal
	}
}

export async function invalidateCacheMany(keys: string[]): Promise<void> {
	if (keys.length === 0) return;

	try {
		await redis.client.del(
			...keys.map((k) => `${PREFIX}${k}`),
		);
	} catch {
		// Cache invalidation failed — non-fatal
	}
}
