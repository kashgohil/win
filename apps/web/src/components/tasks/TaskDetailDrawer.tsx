import { ContactCardLazy } from "@/components/contacts/ContactCard";
import { ActivityLog } from "@/components/tasks/ActivityLog";
import { ConfirmDialog } from "@/components/tasks/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	useCreateTaskItem,
	useDeleteTask,
	useDeleteTaskItem,
	useProjects,
	useRelatedEmails,
	useResolveConflict,
	useRetrySync,
	useSnoozeTask,
	useTaskDetail,
	useUpdateTask,
	useUpdateTaskItem,
} from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	AlarmClock,
	AlertTriangle,
	Calendar,
	CheckCircle2,
	Circle,
	ExternalLink,
	Flag,
	FolderOpen,
	Loader2,
	Mail,
	Plus,
	RefreshCw,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ── Status options ── */

const STATUS_OPTIONS = [
	{ key: "todo", label: "To Do", icon: Circle },
	{ key: "in_progress", label: "In Progress", icon: Loader2 },
	{ key: "done", label: "Done", icon: CheckCircle2 },
	{ key: "blocked", label: "Blocked", icon: AlertTriangle },
] as const;

const PRIORITY_OPTIONS = [
	{ key: "none", label: "None", color: "text-grey-3" },
	{ key: "low", label: "Low", color: "text-blue-400" },
	{ key: "medium", label: "Medium", color: "text-yellow-500" },
	{ key: "high", label: "High", color: "text-orange-500" },
	{ key: "urgent", label: "Urgent", color: "text-red-500" },
] as const;

/* ── Component ── */

export function TaskDetailDrawer({
	taskId,
	open,
	onClose,
}: {
	taskId: string;
	open: boolean;
	onClose: () => void;
}) {
	const { data: task, isLoading } = useTaskDetail(taskId);
	const updateTask = useUpdateTask();
	const deleteTask = useDeleteTask();
	const retrySync = useRetrySync();
	const resolveConflict = useResolveConflict();
	const { data: allProjects } = useProjects();
	const { data: relatedEmails } = useRelatedEmails(taskId);
	const snoozeTask = useSnoozeTask();
	const createItem = useCreateTaskItem();
	const updateItem = useUpdateTaskItem();
	const deleteItem = useDeleteTaskItem();

	const [editingTitle, setEditingTitle] = useState(false);
	const [titleValue, setTitleValue] = useState("");
	const [descriptionValue, setDescriptionValue] = useState("");
	const [newItemTitle, setNewItemTitle] = useState("");
	const [addingItem, setAddingItem] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);
	const titleRef = useRef<HTMLInputElement>(null);
	const newItemRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (task) {
			setTitleValue(task.title);
			setDescriptionValue(task.description ?? "");
		}
	}, [task]);

	useEffect(() => {
		if (editingTitle) titleRef.current?.focus();
	}, [editingTitle]);

	useEffect(() => {
		if (addingItem) newItemRef.current?.focus();
	}, [addingItem]);

	const handleTitleSave = () => {
		if (!task || !titleValue.trim() || titleValue === task.title) {
			setEditingTitle(false);
			return;
		}
		updateTask.mutate({ id: task.id, title: titleValue.trim() });
		setEditingTitle(false);
	};

	const handleStatusChange = (
		statusKey: "todo" | "in_progress" | "done" | "blocked",
	) => {
		if (!task) return;
		updateTask.mutate({ id: task.id, statusKey });
	};

	const handlePriorityChange = (
		priority: "none" | "low" | "medium" | "high" | "urgent",
	) => {
		if (!task) return;
		updateTask.mutate({ id: task.id, priority });
	};

	const handleDelete = () => {
		if (!task) return;
		deleteTask.mutate(task.id, {
			onSuccess: () => {
				toast("Task deleted");
				onClose();
			},
		});
	};

	const handleAddItem = () => {
		if (!task || !newItemTitle.trim()) return;
		createItem.mutate(
			{ taskId: task.id, title: newItemTitle.trim() },
			{
				onSuccess: () => {
					setNewItemTitle("");
					newItemRef.current?.focus();
				},
			},
		);
	};

	const handleToggleItem = (itemId: string, completed: boolean) => {
		if (!task) return;
		updateItem.mutate({ taskId: task.id, itemId, completed: !completed });
	};

	const handleDeleteItem = (itemId: string) => {
		if (!task) return;
		deleteItem.mutate({ taskId: task.id, itemId });
	};

	const handleSnooze = (snoozedUntil: string) => {
		if (!task) return;
		snoozeTask.mutate(
			{ id: task.id, snoozedUntil },
			{ onSuccess: () => toast("Task snoozed") },
		);
	};

	const handleUnsnooze = () => {
		if (!task) return;
		updateTask.mutate(
			{ id: task.id, snoozedUntil: null },
			{ onSuccess: () => toast("Snooze removed") },
		);
	};

	if (!open) return null;

	return (
		<Sheet open={open} onOpenChange={(v) => !v && onClose()}>
			<SheetContent className="w-full sm:max-w-lg overflow-y-auto">
				<SheetHeader className="pb-4">
					<SheetTitle className="sr-only">Task Detail</SheetTitle>
				</SheetHeader>

				{isLoading || !task ? (
					<div className="animate-pulse space-y-4 mt-4">
						<div className="h-6 w-64 bg-secondary/30 rounded" />
						<div className="h-4 w-48 bg-secondary/20 rounded" />
						<div className="h-20 w-full bg-secondary/20 rounded" />
					</div>
				) : (
					<div className="space-y-6 mt-2">
						{/* Title */}
						{editingTitle ? (
							<Input
								ref={titleRef}
								value={titleValue}
								onChange={(e) => setTitleValue(e.target.value)}
								onBlur={handleTitleSave}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleTitleSave();
									if (e.key === "Escape") {
										setTitleValue(task.title);
										setEditingTitle(false);
									}
								}}
								className="font-body text-lg border-none px-0 focus-visible:ring-0 shadow-none"
							/>
						) : task.source === "native" ? (
							<button
								type="button"
								onClick={() => setEditingTitle(true)}
								className={cn(
									"font-body text-lg text-foreground leading-snug text-left w-full cursor-text hover:bg-secondary/30 rounded px-1 -mx-1 transition-colors",
									task.statusKey === "done" && "line-through text-grey-3",
								)}
							>
								{task.title}
							</button>
						) : (
							<h2
								className={cn(
									"font-body text-lg text-foreground leading-snug",
									task.statusKey === "done" && "line-through text-grey-3",
								)}
							>
								{task.title}
							</h2>
						)}

						{/* External badge */}
						{task.source === "external" && task.externalUrl && (
							<div className="flex items-center gap-3">
								<a
									href={task.externalUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 font-mono text-[11px] text-grey-2 hover:text-foreground transition-colors"
								>
									<ExternalLink className="size-3" />
									Open in {task.provider}
								</a>
								{task.writeBackState === "pending" && (
									<span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-500">
										<Loader2 className="size-3 animate-spin" />
										Syncing…
									</span>
								)}
								{task.writeBackState === "failed" && (
									<>
										<span className="inline-flex items-center gap-1 font-mono text-[10px] text-red-500">
											<AlertTriangle className="size-3" />
											Sync failed
										</span>
										<button
											type="button"
											onClick={() => retrySync.mutate(task.id)}
											disabled={retrySync.isPending}
											className="inline-flex items-center gap-1 font-mono text-[10px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
										>
											{retrySync.isPending ? (
												<Loader2 className="size-3 animate-spin" />
											) : (
												<RefreshCw className="size-3" />
											)}
											Retry
										</button>
									</>
								)}
								{task.writeBackState === "conflict" && (
									<div className="flex flex-col gap-1.5">
										<span className="inline-flex items-center gap-1 font-mono text-[10px] text-amber-500">
											<AlertTriangle className="size-3" />
											Conflict — changed locally and externally
										</span>
										<div className="flex items-center gap-1.5">
											<button
												type="button"
												onClick={() =>
													resolveConflict.mutate(
														{
															taskId: task.id,
															resolution: "keep_local",
														},
														{
															onSuccess: () =>
																toast.success("Local changes will be pushed"),
														},
													)
												}
												disabled={resolveConflict.isPending}
												className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-500 hover:text-blue-400 transition-colors cursor-pointer"
											>
												Keep mine
											</button>
											<span className="text-grey-3 text-[10px]">·</span>
											<button
												type="button"
												onClick={() =>
													resolveConflict.mutate(
														{
															taskId: task.id,
															resolution: "use_external",
														},
														{
															onSuccess: () =>
																toast.success("External version accepted"),
														},
													)
												}
												disabled={resolveConflict.isPending}
												className="inline-flex items-center gap-1 font-mono text-[10px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
											>
												Use external
											</button>
										</div>
									</div>
								)}
								{task.writeBackState === "synced" && (
									<span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-500">
										<CheckCircle2 className="size-3" />
										Synced
									</span>
								)}
							</div>
						)}

						{/* Project suggestion */}
						{task.suggestedProjectId &&
							!task.projectId &&
							(() => {
								const suggested = allProjects?.find(
									(p) => p.id === task.suggestedProjectId,
								);
								if (!suggested) return null;
								return (
									<div className="rounded-md border border-violet-500/30 bg-violet-500/5 px-3 py-2.5">
										<div className="flex items-center gap-2 mb-1.5">
											<FolderOpen className="size-3 text-violet-500" />
											<span className="font-mono text-[10px] text-violet-500">
												Suggested project
											</span>
										</div>
										<p className="font-body text-[13px] text-foreground mb-2">
											{suggested.name}
										</p>
										<div className="flex items-center gap-2">
											<button
												type="button"
												onClick={() =>
													updateTask.mutate(
														{
															id: task.id,
															projectId: suggested.id,
														},
														{
															onSuccess: () =>
																toast.success(`Moved to ${suggested.name}`),
														},
													)
												}
												className="font-mono text-[10px] text-violet-500 hover:text-violet-400 transition-colors cursor-pointer"
											>
												Accept
											</button>
											<span className="text-grey-3 text-[10px]">·</span>
											<button
												type="button"
												onClick={() =>
													updateTask.mutate({
														id: task.id,
														suggestedProjectId: null,
													})
												}
												className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
											>
												Dismiss
											</button>
										</div>
									</div>
								);
							})()}

						{/* Status */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Status
							</span>
							<div className="flex gap-1.5 flex-wrap">
								{STATUS_OPTIONS.map((opt) => {
									const Icon = opt.icon;
									const active = task.statusKey === opt.key;
									return (
										<button
											key={opt.key}
											type="button"
											onClick={() => handleStatusChange(opt.key)}
											className={cn(
												"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] tracking-wide transition-colors cursor-pointer",
												active
													? "bg-foreground text-background"
													: "bg-secondary/40 text-grey-2 hover:bg-secondary/70",
											)}
										>
											<Icon className="size-3" />
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Priority */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Priority
							</span>
							<div className="flex gap-1.5 flex-wrap">
								{PRIORITY_OPTIONS.map((opt) => {
									const active = task.priority === opt.key;
									return (
										<button
											key={opt.key}
											type="button"
											onClick={() => handlePriorityChange(opt.key)}
											className={cn(
												"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] tracking-wide transition-colors cursor-pointer",
												active
													? "bg-foreground text-background"
													: "bg-secondary/40 text-grey-2 hover:bg-secondary/70",
											)}
										>
											<Flag className={cn("size-3", !active && opt.color)} />
											{opt.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Due date */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Due date
							</span>
							<div className="flex items-center gap-2">
								<Popover>
									<PopoverTrigger asChild>
										<button
											type="button"
											className={cn(
												"inline-flex items-center gap-2 font-mono text-[12px] border border-border/40 rounded px-2 py-1 transition-colors cursor-pointer hover:border-foreground/30",
												task.dueAt ? "text-foreground" : "text-grey-3",
											)}
										>
											<Calendar className="size-3.5" />
											{task.dueAt
												? new Date(task.dueAt).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})
												: "Set due date"}
										</button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<DateCalendar
											mode="single"
											selected={task.dueAt ? new Date(task.dueAt) : undefined}
											onSelect={(date) => {
												if (date) {
													const d = new Date(date);
													d.setHours(23, 59, 59, 999);
													updateTask.mutate({
														id: task.id,
														dueAt: d.toISOString(),
													});
												}
											}}
										/>
									</PopoverContent>
								</Popover>
								{task.dueAt && (
									<button
										type="button"
										onClick={() =>
											updateTask.mutate({
												id: task.id,
												dueAt: null,
											})
										}
										className="text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										<X className="size-3" />
									</button>
								)}
							</div>
						</div>

						{/* Snooze */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Snooze
							</span>
							{task.snoozedUntil ? (
								<div className="flex items-center gap-2">
									<AlarmClock className="size-3.5 text-amber-500" />
									<span className="font-mono text-[12px] text-amber-500">
										Until{" "}
										{new Date(task.snoozedUntil).toLocaleDateString(undefined, {
											month: "short",
											day: "numeric",
											hour: "numeric",
											minute: "2-digit",
										})}
									</span>
									<button
										type="button"
										onClick={handleUnsnooze}
										className="text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										<X className="size-3" />
									</button>
								</div>
							) : (
								<div className="flex gap-1.5 flex-wrap">
									{[
										{
											label: "Later today",
											getDate: () => {
												const d = new Date();
												d.setHours(d.getHours() + 3);
												return d.toISOString();
											},
										},
										{
											label: "Tomorrow",
											getDate: () => {
												const d = new Date();
												d.setDate(d.getDate() + 1);
												d.setHours(9, 0, 0, 0);
												return d.toISOString();
											},
										},
										{
											label: "Next week",
											getDate: () => {
												const d = new Date();
												d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
												d.setHours(9, 0, 0, 0);
												return d.toISOString();
											},
										},
									].map((opt) => (
										<button
											key={opt.label}
											type="button"
											onClick={() => handleSnooze(opt.getDate())}
											className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono text-[11px] tracking-wide bg-secondary/40 text-grey-2 hover:bg-secondary/70 transition-colors cursor-pointer"
										>
											<AlarmClock className="size-3" />
											{opt.label}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Description */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Description
							</span>
							<textarea
								value={descriptionValue}
								onChange={(e) => {
									setDescriptionValue(e.target.value);
								}}
								onBlur={() => {
									const val = descriptionValue.trim() || null;
									if (val !== (task.description ?? null)) {
										updateTask.mutate({
											id: task.id,
											description: val,
										});
									}
								}}
								placeholder="Add a description..."
								rows={3}
								className="w-full font-body text-[13px] text-foreground bg-transparent border border-border/40 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-foreground/20 placeholder:text-grey-3"
							/>
						</div>

						{/* Subtasks */}
						<div>
							<div className="flex items-center justify-between mb-2">
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3">
									Subtasks
									{task.items.length > 0 && (
										<span className="ml-1.5 tabular-nums">
											{task.items.filter((i) => i.completed).length}/
											{task.items.length}
										</span>
									)}
								</span>
								<button
									type="button"
									onClick={() => setAddingItem(true)}
									className="text-grey-3 hover:text-foreground transition-colors cursor-pointer"
								>
									<Plus className="size-3.5" />
								</button>
							</div>

							<div className="space-y-0.5">
								{task.items.map((item) => (
									<div
										key={item.id}
										className="group/item flex items-center gap-2 py-1.5 px-1 rounded hover:bg-secondary/30 transition-colors"
									>
										<button
											type="button"
											onClick={() => handleToggleItem(item.id, item.completed)}
											className="shrink-0 cursor-pointer"
										>
											{item.completed ? (
												<CheckCircle2 className="size-3.5 text-emerald-500" />
											) : (
												<Circle className="size-3.5 text-grey-3" />
											)}
										</button>
										<span
											className={cn(
												"flex-1 font-body text-[13px]",
												item.completed
													? "text-grey-3 line-through"
													: "text-foreground",
											)}
										>
											{item.title}
										</span>
										<button
											type="button"
											onClick={() => handleDeleteItem(item.id)}
											className="opacity-0 group-hover/item:opacity-100 text-grey-3 hover:text-red-500 transition-all cursor-pointer"
										>
											<Trash2 className="size-3" />
										</button>
									</div>
								))}

								{addingItem && (
									<div className="flex items-center gap-2 py-1 px-1">
										<Circle className="size-3.5 text-grey-3 shrink-0" />
										<input
											ref={newItemRef}
											value={newItemTitle}
											onChange={(e) => setNewItemTitle(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === "Enter") handleAddItem();
												if (e.key === "Escape") {
													setAddingItem(false);
													setNewItemTitle("");
												}
											}}
											onBlur={() => {
												if (newItemTitle.trim()) {
													handleAddItem();
												}
												setAddingItem(false);
												setNewItemTitle("");
											}}
											placeholder="Add subtask..."
											className="flex-1 font-body text-[13px] bg-transparent border-none outline-none placeholder:text-grey-3"
										/>
									</div>
								)}
							</div>
						</div>

						{/* Related emails */}
						{relatedEmails && relatedEmails.length > 0 && (
							<div>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
									Related emails
								</span>
								<div className="space-y-1.5">
									{relatedEmails.map((email) => (
										<a
											key={email.id}
											href={`/module/mail?emailId=${email.id}`}
											className="group flex items-start gap-2 rounded-md border border-border/30 px-3 py-2 hover:border-border/60 transition-colors"
										>
											<Mail className="size-3.5 text-grey-3 mt-0.5 shrink-0" />
											<div className="min-w-0 flex-1">
												<p className="font-body text-[13px] text-foreground truncate">
													{email.subject ?? "(no subject)"}
												</p>
												<p className="font-mono text-[10px] text-grey-3 truncate">
													{email.fromAddress ? (
														<ContactCardLazy
															email={email.fromAddress}
															side="bottom"
															align="start"
														>
															<span>{email.fromName ?? email.fromAddress}</span>
														</ContactCardLazy>
													) : (
														(email.fromName ?? "Unknown")
													)}
													{email.reason && (
														<>
															{" · "}
															{email.reason}
														</>
													)}
												</p>
											</div>
										</a>
									))}
								</div>
							</div>
						)}

						{/* Activity log */}
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-2">
								Activity
							</span>
							<ActivityLog taskId={task.id} />
						</div>

						{/* Delete (native only) */}
						{task.source === "native" && (
							<div className="pt-4 border-t border-border/30">
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setConfirmDelete(true)}
									className="text-red-500 hover:text-red-600 hover:bg-red-500/10 font-mono text-[11px]"
								>
									<Trash2 className="size-3 mr-1.5" />
									Delete task
								</Button>
							</div>
						)}
					</div>
				)}
			</SheetContent>

			<ConfirmDialog
				open={confirmDelete}
				onOpenChange={setConfirmDelete}
				title="delete task"
				description="This will permanently delete this task and its subtasks. This action cannot be undone."
				actionLabel="Delete"
				destructive
				onConfirm={handleDelete}
			/>
		</Sheet>
	);
}
