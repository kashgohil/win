import { MOTION_CONSTANTS } from "@/components/constant";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { BoardView } from "@/components/tasks/BoardView";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Task, useTasksInfinite, useUpdateTask } from "@/hooks/use-tasks";
import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ── Route ── */

type TaskSearch = {
	status?: string;
	view?: "list" | "board";
	sort?: string;
};

export const Route = createFileRoute("/_authenticated/_app/module/task/list/")({
	component: TaskListPage,
	validateSearch: (search: Record<string, unknown>): TaskSearch => ({
		status: search.status as string | undefined,
		view: (search.view as "list" | "board") ?? undefined,
		sort: search.sort as string | undefined,
	}),
});

/* ── Keyboard shortcuts ── */

const TASK_LIST_SHORTCUTS = [
	[
		{ keys: ["N"], label: "new task" },
		{ keys: ["\u23CE"], label: "open" },
		{ keys: ["D"], label: "toggle done" },
	],
	[
		{ keys: ["P"], label: "priority" },
		{ keys: ["V"], label: "view" },
		{ keys: ["["], label: "back" },
	],
];

/* ── Component ── */

function TaskListPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const statusKey = search.status;
	const view = search.view ?? "list";
	const sort = search.sort ?? "smart";

	// Map frontend sort keys to backend sort params
	const backendSort =
		sort === "smart" || sort === "priority"
			? "priority"
			: sort === "due_at"
				? "due_at"
				: undefined;

	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [focusIndex, setFocusIndex] = useState(0);
	const focusRefs = useRef<Map<number, HTMLElement>>(new Map());

	const { data, isLoading, fetchNextPage, hasNextPage } = useTasksInfinite({
		statusKey,
		sort: backendSort,
	});
	const updateTask = useUpdateTask();

	const allTasks: Task[] =
		data?.pages.flatMap((page) => (page?.tasks as Task[]) ?? []) ?? [];

	// Keyboard navigation
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
				case "j":
				case "ArrowDown": {
					e.preventDefault();
					setFocusIndex((i) => Math.min(i + 1, allTasks.length - 1));
					break;
				}
				case "k":
				case "ArrowUp": {
					e.preventDefault();
					setFocusIndex((i) => Math.max(i - 1, 0));
					break;
				}
				case "Enter": {
					e.preventDefault();
					const task = allTasks[focusIndex];
					if (task) setSelectedTaskId(task.id);
					break;
				}
				case "d": {
					e.preventDefault();
					const task = allTasks[focusIndex];
					if (task) {
						updateTask.mutate({
							id: task.id,
							statusKey: task.statusKey === "done" ? "todo" : "done",
						});
					}
					break;
				}
				case "n": {
					e.preventDefault();
					const captureInput = document.querySelector<HTMLInputElement>(
						"[data-quick-capture] input",
					);
					captureInput?.focus();
					break;
				}
				case "v": {
					e.preventDefault();
					navigate({
						search: {
							...search,
							view: view === "list" ? "board" : "list",
						},
					});
					break;
				}
				case "Escape": {
					if (selectedTaskId) {
						setSelectedTaskId(null);
					}
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		allTasks,
		focusIndex,
		selectedTaskId,
		updateTask,
		view,
		navigate,
		search,
	]);

	// Scroll focused item into view
	useEffect(() => {
		focusRefs.current.get(focusIndex)?.scrollIntoView({
			block: "nearest",
			behavior: "smooth",
		});
	}, [focusIndex]);

	const handleStatusChange = useCallback(
		(key?: string) => {
			navigate({ search: { ...search, status: key } });
			setFocusIndex(0);
		},
		[navigate, search],
	);

	const handleViewChange = useCallback(
		(v: "list" | "board") => {
			navigate({ search: { ...search, view: v } });
		},
		[navigate, search],
	);

	const handleSortChange = useCallback(
		(s: string) => {
			navigate({ search: { ...search, sort: s } });
		},
		[navigate, search],
	);

	const handleToggleStatus = useCallback(
		(task: Task) => {
			updateTask.mutate({
				id: task.id,
				statusKey: task.statusKey === "done" ? "todo" : "done",
			});
		},
		[updateTask],
	);

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Header */}
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
							projects
						</h1>
						<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
							Track and manage your tasks across all projects.
						</p>
					</motion.header>

					{/* Quick capture */}
					<motion.div
						className="mt-6"
						data-quick-capture
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<QuickCapture />
					</motion.div>

					{/* Filters */}
					<motion.div
						className="mt-6"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.12,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<TaskFilters
							statusKey={statusKey}
							onStatusChange={handleStatusChange}
							view={view}
							onViewChange={handleViewChange}
							sort={sort}
							onSortChange={handleSortChange}
						/>
					</motion.div>

					{/* Content */}
					<motion.div
						className="mt-6 pb-16"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.18,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{isLoading ? (
							<div className="animate-pulse space-y-3 mt-4">
								{[0, 1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="rounded-lg border border-border/20 p-3.5"
									>
										<div className="flex items-center gap-3">
											<div className="size-4 rounded-full bg-secondary/30" />
											<div className="h-4 w-48 bg-secondary/30 rounded" />
											<div className="h-3 w-16 bg-secondary/20 rounded ml-auto" />
										</div>
									</div>
								))}
							</div>
						) : allTasks.length === 0 ? (
							<div className="py-16 flex flex-col items-center gap-3">
								<div className="size-10 rounded-full bg-foreground/5 flex items-center justify-center">
									<Check className="size-4 text-foreground/40" />
								</div>
								<p className="font-serif text-[15px] text-grey-2 italic text-center">
									{statusKey
										? "No tasks match this filter."
										: "No tasks yet — add one above."}
								</p>
							</div>
						) : view === "board" ? (
							<BoardView
								tasks={allTasks}
								onTaskClick={setSelectedTaskId}
								onStatusChange={(taskId, newStatus) => {
									updateTask.mutate({
										id: taskId,
										statusKey: newStatus as Task["statusKey"],
									});
								}}
							/>
						) : (
							<div>
								{allTasks.map((task, i) => (
									<TaskRow
										key={task.id}
										task={task}
										isFocused={i === focusIndex}
										focusRef={(el) => {
											if (el) focusRefs.current.set(i, el);
											else focusRefs.current.delete(i);
										}}
										onToggleStatus={() => handleToggleStatus(task)}
										onClick={() => setSelectedTaskId(task.id)}
									/>
								))}
								{hasNextPage && (
									<button
										type="button"
										onClick={() => fetchNextPage()}
										className="w-full py-4 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										Load more
									</button>
								)}
							</div>
						)}
					</motion.div>
				</div>
			</ScrollArea>

			{/* Detail drawer */}
			{selectedTaskId && (
				<TaskDetailDrawer
					taskId={selectedTaskId}
					open={!!selectedTaskId}
					onClose={() => setSelectedTaskId(null)}
				/>
			)}

			{/* Keyboard shortcut bar */}
			<KeyboardShortcutBar shortcuts={TASK_LIST_SHORTCUTS} />
		</>
	);
}
