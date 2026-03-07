import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { TaskIntegrations } from "@/components/tasks/TaskIntegrations";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KanbanSquare, List } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { z } from "zod";

const taskSearchSchema = z.object({
	connected: z.string().optional(),
	error: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/_app/module/task/")({
	component: TaskModule,
	validateSearch: (search) => taskSearchSchema.parse(search),
});

const TASK_HUB_SHORTCUTS = [
	[
		{ keys: ["L"], label: "list view" },
		{ keys: ["B"], label: "board view" },
	],
];

function TaskModule() {
	const navigate = useNavigate();
	const { connected, error } = Route.useSearch();

	useEffect(() => {
		if (connected) {
			toast.success(`${connected} connected`, {
				description: "You can now sync your tasks",
			});
			navigate({ to: "/module/task", search: {}, replace: true });
		} else if (error) {
			toast.error("Connection failed", { description: error });
			navigate({ to: "/module/task", search: {}, replace: true });
		}
	}, [connected, error, navigate]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;

			switch (e.key) {
				case "l":
					e.preventDefault();
					navigate({ to: "/module/task/list" });
					break;
				case "b":
					e.preventDefault();
					navigate({ to: "/module/task/list", search: { view: "board" } });
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);

	return (
		<>
			<ModulePage moduleKey="task" data={MODULE_DATA.task}>
				<div className="px-(--page-px) max-w-5xl mx-auto pb-16">
					<div className="grid grid-cols-2 gap-3">
						<Link
							to="/module/task/list"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<List className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									All tasks
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/module/task/list"
							search={{ view: "board" }}
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<KanbanSquare className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Board view
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
					</div>

					{/* Integrations */}
					<div className="mt-8">
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Integrations
						</h3>
						<TaskIntegrations />
					</div>
				</div>
			</ModulePage>

			<KeyboardShortcutBar shortcuts={TASK_HUB_SHORTCUTS} />
		</>
	);
}
