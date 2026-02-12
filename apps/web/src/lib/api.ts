import { treaty } from "@elysiajs/eden";
import type { App } from "@wingmnn/types";

import { env } from "@/env";

export const api = treaty<App>(env.VITE_API_URL, {
	fetch: { credentials: "include" },
});
