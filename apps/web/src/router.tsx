import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { env } from "@/env";
import { queryClient } from "@/lib/query-client";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		context: { queryClient },
		...(env.VITE_TAURI ? {} : { ssr: {} }),
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};
