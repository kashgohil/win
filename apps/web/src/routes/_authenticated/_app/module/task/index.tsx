import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { TaskAutomations } from "@/components/tasks/TaskAutomations";
import { TaskIntegrations } from "@/components/tasks/TaskIntegrations";
import { TaskSuggestions } from "@/components/tasks/TaskSuggestions";
import { useProjects, useTaskStats, useWorkSummary } from "@/hooks/use-tasks";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Calendar,
	CheckCircle2,
	Flame,
	FolderOpen,
	KanbanSquare,
	List,
} from "lucide-react";
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
		{ keys: ["C"], label: "calendar" },
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
				case "c":
					e.preventDefault();
					navigate({ to: "/module/task/calendar" });
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
					<div className="grid grid-cols-3 gap-3">
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
						<Link
							to="/module/task/calendar"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Calendar className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Calendar
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
					</div>

					{/* This week */}
					<WeeklySummary />

					{/* Stats */}
					<TaskStatsBar />

					{/* Needs attention */}
					<div className="mt-8">
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Needs attention
						</h3>
						<TaskSuggestions />
					</div>

					{/* Projects */}
					<ProjectsList />

					{/* Automations */}
					<div className="mt-8">
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Automations
						</h3>
						<TaskAutomations />
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

function TaskStatsBar() {
	const { data: stats, isLoading } = useTaskStats();

	if (isLoading || !stats) return null;

	const items = [
		{ label: "Total", value: stats.total },
		{ label: "To do", value: stats.byStatus?.todo ?? 0 },
		{ label: "In progress", value: stats.byStatus?.in_progress ?? 0 },
		{ label: "Done", value: stats.byStatus?.done ?? 0 },
		{ label: "Overdue", value: stats.overdue, highlight: stats.overdue > 0 },
		{ label: "Done (7d)", value: stats.completedLast7Days },
	];

	return (
		<div className="mt-6">
			<div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
				{items.map((item) => (
					<div
						key={item.label}
						className="rounded-lg border border-border/40 px-3 py-2.5 text-center"
					>
						<div
							className={`font-display text-[1.25rem] leading-none ${
								item.highlight ? "text-red-500" : "text-foreground"
							}`}
						>
							{item.value}
						</div>
						<div className="font-mono text-[10px] text-grey-3 mt-1">
							{item.label}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function WeeklySummary() {
	const { data: summary, isLoading } = useWorkSummary(7);

	if (isLoading || !summary) return null;

	const completedCount = summary.completed?.length ?? 0;
	if (completedCount === 0 && (summary.created ?? 0) === 0) return null;

	return (
		<div className="mt-6">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				This week
			</h3>
			<div className="rounded-lg border border-border/40 px-4 py-3.5">
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<CheckCircle2 className="size-4 text-emerald-500" />
						<span className="font-body text-[14px] text-foreground">
							{completedCount} completed
						</span>
					</div>
					{(summary.overdue ?? 0) > 0 && (
						<div className="flex items-center gap-2">
							<span className="font-body text-[14px] text-red-500">
								{summary.overdue} overdue
							</span>
						</div>
					)}
					{(summary.streak ?? 0) > 1 && (
						<div className="flex items-center gap-2">
							<Flame className="size-4 text-orange-500" />
							<span className="font-body text-[14px] text-foreground">
								{summary.streak} day streak
							</span>
						</div>
					)}
				</div>
				{summary.topProjects && summary.topProjects.length > 0 && (
					<div className="mt-2 flex items-center gap-2 flex-wrap">
						{summary.topProjects.map((p) => (
							<span
								key={p.name}
								className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 font-mono text-[10px] text-grey-3"
							>
								{p.name}
								<span className="text-foreground">{p.completed}</span>
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ProjectsList() {
	const { data: projects, isLoading } = useProjects();

	if (isLoading || !projects || projects.length === 0) return null;

	const active = projects.filter((p) => !p.archived);
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
