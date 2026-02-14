import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/_app/module/notes")({
	component: NotesModule,
});

function NotesModule() {
	return <ModulePage moduleKey="notes" data={MODULE_DATA.notes} />;
}
