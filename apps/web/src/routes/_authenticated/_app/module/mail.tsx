import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/mail")({
	component: MailModule,
});

function MailModule() {
	return <ModulePage moduleKey="mail" data={MODULE_DATA.mail} />;
}
