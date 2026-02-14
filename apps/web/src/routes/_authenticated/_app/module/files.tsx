import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/files")({
	component: FilesModule,
});

function FilesModule() {
	return <ModulePage moduleKey="files" data={MODULE_DATA.files} />;
}
