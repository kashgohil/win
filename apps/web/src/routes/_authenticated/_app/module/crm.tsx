import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/crm")({
	component: CrmLayout,
});

function CrmLayout() {
	return <Outlet />;
}
