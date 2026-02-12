import { z } from "zod";

const envSchema = z.object({
	VITE_API_URL: z
		.string()
		.url()
		.optional()
		.default(
			import.meta.env.DEV ? "http://localhost:8080" : "https://api.wingmnn.com",
		),
	VITE_TAURI: z.string().optional(),
	VITE_HERO_URL: z
		.url()
		.optional()
		.default(
			import.meta.env.DEV ? "http://localhost:4000" : "https://wingmnn.com",
		),
});

export const env = envSchema.parse({
	VITE_API_URL: import.meta.env.VITE_API_URL,
	VITE_TAURI: import.meta.env.VITE_TAURI,
	VITE_HERO_URL: import.meta.env.VITE_HERO_URL,
});
