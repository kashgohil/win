import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/crm")({
	component: CrmModule,
});

function CrmModule() {
	return <ModulePage moduleKey="crm" data={MODULE_DATA.crm} />;
}
