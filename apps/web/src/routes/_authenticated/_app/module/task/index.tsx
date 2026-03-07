import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { TaskIntegrations } from "@/components/tasks/TaskIntegrations";
import { TaskSuggestions } from "@/components/tasks/TaskSuggestions";
import { useProjects } from "@/hooks/use-tasks";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, FolderOpen, KanbanSquare, List } from "lucide-react";
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

					{/* Needs attention */}
					<div className="mt-8">
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Needs attention
						</h3>
						<TaskSuggestions />
					</div>

					{/* Projects */}
					<ProjectsList />

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

function ProjectsList() {
	const { data: projects, isLoading } = useProjects();

	if (isLoading || !projects || projects.length === 0) return null;

	const active = (
		projects as {
			id: string;
			name: string;
			color?: string | null;
			archived: boolean;
			source: string;
		}[]
	).filter((p) => !p.archived);
	if (active.length === 0) return null;

	return (
		<div className="mt-8">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Projects
			</h3>
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{active.map((project) => (
					<Link
						key={project.id}
						to="/module/task/project/$projectId"
						params={{ projectId: project.id }}
						className="group flex items-center gap-2.5 rounded-lg border border-border/40 hover:border-border/70 transition-colors px-3 py-2.5"
					>
						{project.color ? (
							<span
								className="size-2.5 rounded-full shrink-0"
								style={{ backgroundColor: project.color }}
							/>
						) : (
							<FolderOpen className="size-3.5 text-grey-3" />
						)}
						<span className="font-body text-[13px] text-foreground tracking-[0.01em] truncate">
							{project.name}
						</span>
						<ArrowRight className="size-3 text-grey-3 group-hover:translate-x-0.5 transition-transform ml-auto shrink-0" />
					</Link>
				))}
			</div>
		</div>
	);
}
