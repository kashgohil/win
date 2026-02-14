import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/health")({
	component: HealthModule,
});

function HealthModule() {
	return <ModulePage moduleKey="health" data={MODULE_DATA.health} />;
}
