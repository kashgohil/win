import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/cal")({
	component: CalModule,
});

function CalModule() {
	return <ModulePage moduleKey="cal" data={MODULE_DATA.cal} />;
}
