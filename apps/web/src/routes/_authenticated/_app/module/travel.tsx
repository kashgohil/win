import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/travel")({
	component: TravelModule,
});

function TravelModule() {
	return <ModulePage moduleKey="travel" data={MODULE_DATA.travel} />;
}
