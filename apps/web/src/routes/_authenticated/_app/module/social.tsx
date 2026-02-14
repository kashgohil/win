import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/social")({
	component: SocialModule,
});

function SocialModule() {
	return <ModulePage moduleKey="social" data={MODULE_DATA.social} />;
}
