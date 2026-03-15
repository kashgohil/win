import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/fin")({
	component: FinLayout,
});

function FinLayout() {
	return <Outlet />;
}
