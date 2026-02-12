export class RedisConnectionError extends Error {
	readonly code = "REDIS_CONNECTION_ERROR" as const;

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "RedisConnectionError";
	}
}

export class RedisCacheError extends Error {
	readonly code = "REDIS_CACHE_ERROR" as const;

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = "RedisCacheError";
	}
}
