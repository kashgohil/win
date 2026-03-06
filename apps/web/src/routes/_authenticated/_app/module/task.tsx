import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/task")({
	component: TaskLayout,
});

function TaskLayout() {
	return <Outlet />;
}
