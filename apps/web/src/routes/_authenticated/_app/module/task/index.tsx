import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KanbanSquare, List } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/_app/module/task/")({
	component: TaskModule,
});

const TASK_HUB_SHORTCUTS = [
	[
		{ keys: ["L"], label: "list view" },
		{ keys: ["B"], label: "board view" },
	],
];

function TaskModule() {
	const navigate = useNavigate();

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
				</div>
			</ModulePage>

			<KeyboardShortcutBar shortcuts={TASK_HUB_SHORTCUTS} />
		</>
	);
}
