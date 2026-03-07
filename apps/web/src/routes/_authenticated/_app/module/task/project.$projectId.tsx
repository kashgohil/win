import { MOTION_CONSTANTS } from "@/components/constant";
import { ConfirmDialog } from "@/components/tasks/ConfirmDialog";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type Task,
	useDeleteProject,
	useProjectDetail,
	useTasksInfinite,
	useUpdateProject,
	useUpdateTask,
} from "@/hooks/use-tasks";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	ArrowLeft,
	Pencil,
	Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/task/project/$projectId",
)({
	component: ProjectDetailPage,
});

function ProjectDetailPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();
	const { data: project, isLoading } = useProjectDetail(projectId);
	const { data: taskData } = useTasksInfinite({ projectId });
	const updateProject = useUpdateProject();
	const deleteProject = useDeleteProject();
	const updateTask = useUpdateTask();

	const [editing, setEditing] = useState(false);
	const [editName, setEditName] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const editNameRef = useRef<HTMLInputElement | null>(null);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		if (editing) editNameRef.current?.focus();
	}, [editing]);

	const allTasks: Task[] =
		taskData?.pages.flatMap((page) => (page?.tasks as Task[]) ?? []) ?? [];

	const startEdit = useCallback(() => {
		if (!project) return;
		setEditName(project.name);
		setEditDescription(project.description ?? "");
		setEditing(true);
	}, [project]);

	const saveEdit = useCallback(() => {
		updateProject.mutate(
			{
				id: projectId,
				name: editName,
				description: editDescription || null,
			},
			{ onSuccess: () => setEditing(false) },
		);
	}, [projectId, editName, editDescription, updateProject]);

	const handleToggleArchive = useCallback(() => {
		if (!project) return;
		updateProject.mutate({
			id: projectId,
			archived: !project.archived,
		});
	}, [project, projectId, updateProject]);

	const handleDelete = useCallback(() => {
		deleteProject.mutate(projectId, {
			onSuccess: () => navigate({ to: "/module/task" }),
		});
	}, [projectId, deleteProject, navigate]);

	const handleToggleStatus = useCallback(
		(task: Task) => {
			updateTask.mutate({
				id: task.id,
				statusKey: task.statusKey === "done" ? "todo" : "done",
			});
		},
		[updateTask],
	);

	if (isLoading) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<div className="animate-pulse space-y-4">
						<div className="h-8 w-48 bg-secondary/30 rounded" />
						<div className="h-4 w-64 bg-secondary/20 rounded" />
					</div>
				</div>
			</ScrollArea>
		);
	}

	if (!project) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<p className="text-grey-2 font-mono text-[12px]">
						Project not found.
					</p>
				</div>
			</ScrollArea>
		);
	}

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Back button */}
					<button
						type="button"
						onClick={() => navigate({ to: "/module/task" })}
						className="inline-flex items-center gap-1.5 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer mb-6"
					>
						<ArrowLeft className="size-3" />
						Back
					</button>

					{/* Header */}
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						{editing ? (
							<div className="space-y-3">
								<input
									ref={editNameRef}
									type="text"
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-[1.08] bg-transparent border-b border-foreground/20 outline-none w-full"
								/>
								<input
									type="text"
									value={editDescription}
									onChange={(e) => setEditDescription(e.target.value)}
									placeholder="Description (optional)"
									className="font-mono text-[12px] text-grey-2 bg-transparent border-b border-border/30 outline-none w-full py-1"
								/>
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={saveEdit}
										className="font-mono text-[11px] px-3 py-1 rounded-md bg-foreground text-background cursor-pointer"
									>
										Save
									</button>
									<button
										type="button"
										onClick={() => setEditing(false)}
										className="font-mono text-[11px] px-3 py-1 rounded-md text-grey-3 hover:text-foreground cursor-pointer"
									>
										Cancel
									</button>
								</div>
							</div>
						) : (
							<div>
								<div className="flex items-center gap-3">
									{project.color && (
										<span
											className="size-3 rounded-full shrink-0"
											style={{ backgroundColor: project.color }}
										/>
									)}
									<h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-[1.08]">
										{project.name}
									</h1>
									{project.archived && (
										<span className="font-mono text-[9px] uppercase tracking-widest text-amber-500 border border-amber-500/30 rounded px-1.5 py-0.5">
											Archived
										</span>
									)}
								</div>
								{project.description && (
									<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
										{project.description}
									</p>
								)}
								<div className="flex items-center gap-3 mt-2">
									<span className="font-mono text-[11px] text-grey-3">
										{project.taskCount} task
										{project.taskCount === 1 ? "" : "s"}
									</span>
									{project.source === "native" && (
										<>
											<button
												type="button"
												onClick={startEdit}
												className="inline-flex items-center gap-1 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
											>
												<Pencil className="size-3" />
												Edit
											</button>
											<button
												type="button"
												onClick={handleToggleArchive}
												className="inline-flex items-center gap-1 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
											>
												{project.archived ? (
													<>
														<ArchiveRestore className="size-3" />
														Unarchive
													</>
												) : (
													<>
														<Archive className="size-3" />
														Archive
													</>
												)}
											</button>
											<button
												type="button"
												onClick={() => setConfirmDelete(true)}
												className="inline-flex items-center gap-1 font-mono text-[11px] text-red-500 hover:text-red-400 transition-colors cursor-pointer"
											>
												<Trash2 className="size-3" />
												Delete
											</button>
										</>
									)}
									{project.source === "external" && (
										<span className="font-mono text-[9px] uppercase tracking-widest text-grey-3 border border-border/40 rounded px-1 py-0">
											External
										</span>
									)}
								</div>
							</div>
						)}
					</motion.header>

					{/* Tasks in this project */}
					<motion.div
						className="mt-8 pb-16"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.1,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
							Tasks
						</h3>
						{allTasks.length === 0 ? (
							<p className="font-serif text-[15px] text-grey-2 italic py-8 text-center">
								No tasks in this project yet.
							</p>
						) : (
							<div>
								{allTasks.map((task) => (
									<TaskRow
										key={task.id}
										task={task}
										onToggleStatus={() => handleToggleStatus(task)}
									/>
								))}
							</div>
						)}
					</motion.div>
				</div>
			</ScrollArea>

			<ConfirmDialog
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title="delete project"
				description="This will delete the project and unlink all its tasks. The tasks themselves will not be deleted. This action cannot be undone."
				actionLabel="Delete"
				destructive
				onConfirm={handleDelete}
			/>
		</>
	);
}
