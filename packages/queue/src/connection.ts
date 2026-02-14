import type { ConnectionOptions } from "bullmq";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const parsed = new URL(redisUrl);

export const connection: ConnectionOptions = {
	host: parsed.hostname,
	port: Number(parsed.port) || 6379,
	password: parsed.password || undefined,
	username: parsed.username || undefined,
};
