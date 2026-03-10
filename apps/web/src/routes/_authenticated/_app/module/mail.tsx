import { ComposeCard } from "@/components/mail/ComposeCard";
import { openCompose, useComposeListener } from "@/hooks/use-compose";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/mail")({
	component: MailLayout,
});

function MailLayout() {
	const { visible, payload, close } = useComposeListener();

	return (
		<div className="h-dvh flex flex-col overflow-hidden">
			<div className="flex-1 overflow-y-auto">
				<Outlet />
			</div>
			<ComposeCard
				visible={visible}
				payload={payload}
				onClose={close}
				onOpen={() => openCompose({ mode: "compose" })}
			/>
		</div>
	);
}
