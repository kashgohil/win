import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/fin")({
	component: FinModule,
});

function FinModule() {
	return <ModulePage moduleKey="fin" data={MODULE_DATA.fin} />;
}
