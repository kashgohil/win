import { MOTION_CONSTANTS } from "@/components/constant";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { BoardView } from "@/components/tasks/BoardView";
import { ConfirmDialog } from "@/components/tasks/ConfirmDialog";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { TaskDetailDrawer } from "@/components/tasks/TaskDetailDrawer";
import { TaskFilters } from "@/components/tasks/TaskFilters";
import { TaskRow } from "@/components/tasks/TaskRow";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type Task,
	useBulkDeleteTasks,
	useBulkUpdateTasks,
	useProjects,
	useTasksInfinite,
	useUpdateTask,
} from "@/hooks/use-tasks";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── Route ── */

type TaskSearch = {
	status?: string;
	view?: "list" | "board";
	sort?: string;
	q?: string;
	projectId?: string;
	priority?: string;
	due?: string;
};

export const Route = createFileRoute("/_authenticated/_app/module/task/list/")({
	component: TaskListPage,
	validateSearch: (search: Record<string, unknown>): TaskSearch => ({
		status: search.status as string | undefined,
		view: (search.view as "list" | "board") ?? undefined,
		sort: search.sort as string | undefined,
		q: search.q as string | undefined,
		projectId: search.projectId as string | undefined,
		priority: search.priority as string | undefined,
		due: search.due as string | undefined,
	}),
});

/* ── Keyboard shortcuts ── */

const TASK_LIST_SHORTCUTS = [
	[
		{ keys: ["N"], label: "new task" },
		{ keys: ["/"], label: "search" },
		{ keys: ["\u23CE"], label: "open" },
		{ keys: ["D"], label: "toggle done" },
	],
	[
		{ keys: ["X"], label: "select" },
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

	// Convert due preset to date range params
	const { dueBefore, dueAfter } = useMemo(() => {
		const due = search.due;
		if (!due) return {};
		const now = new Date();
		if (due === "overdue") {
			return { dueBefore: now.toISOString() };
		}
		if (due === "today") {
			const start = new Date(now);
			start.setHours(0, 0, 0, 0);
			const end = new Date(now);
			end.setHours(23, 59, 59, 999);
			return { dueAfter: start.toISOString(), dueBefore: end.toISOString() };
		}
		if (due === "week") {
			const end = new Date(now);
			end.setDate(end.getDate() + 7);
			return { dueBefore: end.toISOString() };
		}
		return {};
	}, [search.due]);

	const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
	const [focusIndex, setFocusIndex] = useState(0);
	const focusRefs = useRef<Map<number, HTMLElement>>(new Map());
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	// Search state — debounced
	const [searchInput, setSearchInput] = useState(search.q ?? "");
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [showSearch, setShowSearch] = useState(!!search.q);

	// Selection state
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

	const { data, isLoading, fetchNextPage, hasNextPage } = useTasksInfinite({
		q: search.q,
		statusKey,
		sort: backendSort,
		projectId: search.projectId,
		priority: search.priority,
		dueBefore,
		dueAfter,
	});
	const updateTask = useUpdateTask();
	const bulkUpdate = useBulkUpdateTasks();
	const bulkDelete = useBulkDeleteTasks();
	const { data: projects } = useProjects();

	const projectMap = useMemo(() => {
		const map = new Map<string, { name: string; color?: string | null }>();
		if (projects) {
			for (const p of projects as {
				id: string;
				name: string;
				color?: string | null;
			}[]) {
				map.set(p.id, { name: p.name, color: p.color });
			}
		}
		return map;
	}, [projects]);

	const allTasks: Task[] =
		data?.pages.flatMap((page) => (page?.tasks as Task[]) ?? []) ?? [];

	const handleSearchChange = useCallback(
		(q: string) => {
			setSearchInput(q);
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			searchTimerRef.current = setTimeout(() => {
				navigate({ search: { ...search, q: q || undefined } });
			}, 300);
		},
		[navigate, search],
	);

	const toggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds(new Set());
	}, []);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;

			// Allow Escape from search input
			if (target === searchInputRef.current && e.key === "Escape") {
				e.preventDefault();
				searchInputRef.current?.blur();
				if (!searchInput) setShowSearch(false);
				return;
			}

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
				case "/": {
					e.preventDefault();
					setShowSearch(true);
					setTimeout(() => searchInputRef.current?.focus(), 0);
					break;
				}
				case "x": {
					e.preventDefault();
					const task = allTasks[focusIndex];
					if (task) toggleSelect(task.id);
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
					if (selectedIds.size > 0) {
						clearSelection();
					} else if (selectedTaskId) {
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
		selectedIds,
		updateTask,
		view,
		navigate,
		search,
		searchInput,
		toggleSelect,
		clearSelection,
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

	const handleProjectChange = useCallback(
		(id?: string) => {
			navigate({ search: { ...search, projectId: id } });
			setFocusIndex(0);
		},
		[navigate, search],
	);

	const handlePriorityChange = useCallback(
		(p?: string) => {
			navigate({ search: { ...search, priority: p } });
			setFocusIndex(0);
		},
		[navigate, search],
	);

	const handleDuePresetChange = useCallback(
		(d?: string) => {
			navigate({ search: { ...search, due: d } });
			setFocusIndex(0);
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
							searchQuery={showSearch ? searchInput : undefined}
							onSearchChange={handleSearchChange}
							searchInputRef={searchInputRef}
							projectId={search.projectId}
							onProjectChange={handleProjectChange}
							priority={search.priority}
							onPriorityChange={handlePriorityChange}
							duePreset={search.due}
							onDuePresetChange={handleDuePresetChange}
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
										selectable={selectedIds.size > 0}
										selected={selectedIds.has(task.id)}
										onSelect={toggleSelect}
										projectName={
											task.projectId
												? projectMap.get(task.projectId)?.name
												: undefined
										}
										projectColor={
											task.projectId
												? projectMap.get(task.projectId)?.color
												: undefined
										}
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

			{/* Bulk action bar */}
			{selectedIds.size > 0 && (
				<div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-foreground text-background rounded-lg px-4 py-2 shadow-lg">
					<span className="font-mono text-[11px]">
						{selectedIds.size} selected
					</span>
					<div className="w-px h-4 bg-background/20" />
					<button
						type="button"
						onClick={() => {
							bulkUpdate.mutate(
								{
									taskIds: [...selectedIds],
									statusKey: "done",
								},
								{ onSuccess: clearSelection },
							);
						}}
						className="font-mono text-[11px] px-2 py-1 rounded hover:bg-background/20 transition-colors cursor-pointer"
					>
						Mark done
					</button>
					<button
						type="button"
						onClick={() => {
							bulkUpdate.mutate(
								{
									taskIds: [...selectedIds],
									statusKey: "todo",
								},
								{ onSuccess: clearSelection },
							);
						}}
						className="font-mono text-[11px] px-2 py-1 rounded hover:bg-background/20 transition-colors cursor-pointer"
					>
						Mark todo
					</button>
					<button
						type="button"
						onClick={() => setConfirmBulkDelete(true)}
						className="font-mono text-[11px] px-2 py-1 rounded hover:bg-red-500/80 transition-colors cursor-pointer inline-flex items-center gap-1"
					>
						<Trash2 className="size-3" />
						Delete
					</button>
					<div className="w-px h-4 bg-background/20" />
					<button
						type="button"
						onClick={clearSelection}
						className="font-mono text-[11px] px-2 py-1 rounded hover:bg-background/20 transition-colors cursor-pointer"
					>
						Cancel
					</button>
				</div>
			)}

			<ConfirmDialog
				open={confirmBulkDelete}
				onOpenChange={setConfirmBulkDelete}
				title="delete tasks"
				description={`This will permanently delete ${selectedIds.size} selected task${selectedIds.size === 1 ? "" : "s"}. This action cannot be undone.`}
				actionLabel="Delete"
				destructive
				onConfirm={() => {
					bulkDelete.mutate([...selectedIds], {
						onSuccess: clearSelection,
					});
				}}
			/>

			{/* Keyboard shortcut bar */}
			<KeyboardShortcutBar shortcuts={TASK_LIST_SHORTCUTS} />
		</>
	);
}
