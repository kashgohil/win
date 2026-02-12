import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { env } from "@/env";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
			},
		},
	});

	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		context: { queryClient },
		...(env.VITE_TAURI ? {} : { ssr: {} }),
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};
