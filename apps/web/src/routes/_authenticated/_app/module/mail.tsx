import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/mail")({
	component: MailLayout,
});

function MailLayout() {
	return (
		<div className="h-dvh flex flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
		</div>
	);
}
