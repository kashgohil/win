import { z } from "zod";

const envSchema = z.object({
	REDIS_URL: z.string().default("redis://localhost:6379"),
});

export const env = envSchema.parse(process.env);
