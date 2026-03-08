import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/cal")({
	component: CalLayout,
});

function CalLayout() {
	return <Outlet />;
}
