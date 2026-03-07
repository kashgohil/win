import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useProjects } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
	ArrowUpDown,
	Calendar,
	ChevronDown,
	Flag,
	FolderOpen,
	LayoutGrid,
	List,
	Search,
	X,
} from "lucide-react";

/* ── Status filter tabs ── */

const STATUS_TABS = [
	{ key: undefined, label: "All" },
	{ key: "todo", label: "To Do" },
	{ key: "in_progress", label: "In Progress" },
	{ key: "done", label: "Done" },
	{ key: "blocked", label: "Blocked" },
	{ key: "cancelled", label: "Cancelled" },
] as const;

const SORT_OPTIONS = [
	{ key: "smart", label: "Smart" },
	{ key: "created_at", label: "Newest" },
	{ key: "due_at", label: "Due date" },
	{ key: "priority", label: "Priority" },
] as const;

const PRIORITY_OPTIONS = [
	{ key: undefined, label: "Any" },
	{ key: "urgent", label: "Urgent" },
	{ key: "high", label: "High" },
	{ key: "medium", label: "Medium" },
	{ key: "low", label: "Low" },
	{ key: "none", label: "None" },
] as const;

const DUE_PRESETS = [
	{ key: undefined, label: "Any" },
	{ key: "overdue", label: "Overdue" },
	{ key: "today", label: "Today" },
	{ key: "week", label: "This week" },
] as const;

export function TaskFilters({
	statusKey,
	onStatusChange,
	view,
	onViewChange,
	sort,
	onSortChange,
	searchQuery,
	onSearchChange,
	searchInputRef,
	projectId,
	onProjectChange,
	priority,
	onPriorityChange,
	duePreset,
	onDuePresetChange,
}: {
	statusKey?: string;
	onStatusChange: (key?: string) => void;
	view: "list" | "board";
	onViewChange: (view: "list" | "board") => void;
	sort?: string;
	onSortChange: (sort: string) => void;
	searchQuery?: string;
	onSearchChange: (q: string) => void;
	searchInputRef?: React.RefObject<HTMLInputElement | null>;
	projectId?: string;
	onProjectChange: (id?: string) => void;
	priority?: string;
	onPriorityChange: (p?: string) => void;
	duePreset?: string;
	onDuePresetChange: (d?: string) => void;
}) {
	const currentSort = sort ?? "smart";
	const { data: projects } = useProjects();
	const activeProjects = projects?.filter((p) => !p.archived);

	const hasActiveFilters = !!projectId || !!priority || !!duePreset;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-4">
				{/* Status tabs */}
				<div className="flex items-center gap-0.5 overflow-x-auto">
					{STATUS_TABS.map((tab) => (
						<button
							key={tab.label}
							type="button"
							onClick={() => onStatusChange(tab.key)}
							className={cn(
								"font-mono text-[11px] tracking-wide px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap",
								statusKey === tab.key
									? "bg-foreground text-background"
									: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
							)}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="flex items-center gap-2 shrink-0">
					{/* Sort selector */}
					<div className="flex items-center gap-1 border border-border/30 rounded-md p-0.5">
						<ArrowUpDown className="size-3 text-grey-3 ml-1.5" />
						{SORT_OPTIONS.map((opt) => (
							<button
								key={opt.key}
								type="button"
								onClick={() => onSortChange(opt.key)}
								className={cn(
									"font-mono text-[10px] tracking-wide px-2 py-1 rounded transition-colors cursor-pointer",
									currentSort === opt.key
										? "bg-foreground text-background"
										: "text-grey-3 hover:text-foreground",
								)}
							>
								{opt.label}
							</button>
						))}
					</div>

					{/* View toggle */}
					<div className="flex items-center gap-0.5 border border-border/30 rounded-md p-0.5">
						<button
							type="button"
							onClick={() => onViewChange("list")}
							className={cn(
								"p-1 rounded transition-colors cursor-pointer",
								view === "list"
									? "bg-foreground text-background"
									: "text-grey-3 hover:text-foreground",
							)}
						>
							<List className="size-3.5" />
						</button>
						<button
							type="button"
							onClick={() => onViewChange("board")}
							className={cn(
								"p-1 rounded transition-colors cursor-pointer",
								view === "board"
									? "bg-foreground text-background"
									: "text-grey-3 hover:text-foreground",
							)}
						>
							<LayoutGrid className="size-3.5" />
						</button>
					</div>
				</div>
			</div>

			{/* Advanced filters row */}
			<div className="flex items-center gap-2">
				{/* Project filter */}
				{activeProjects && activeProjects.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className={cn(
									"inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer",
									projectId
										? "border-foreground/30 text-foreground bg-secondary/30"
										: "border-border/30 text-grey-3 hover:text-foreground",
								)}
							>
								<FolderOpen className="size-3" />
								{projectId
									? (activeProjects.find((p) => p.id === projectId)?.name ??
										"Project")
									: "Project"}
								<ChevronDown className="size-3" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="start" className="w-48 p-1">
							<button
								type="button"
								onClick={() => onProjectChange(undefined)}
								className={cn(
									"w-full text-left px-3 py-1.5 rounded font-mono text-[11px] transition-colors cursor-pointer",
									!projectId
										? "bg-foreground text-background"
										: "text-foreground hover:bg-secondary/50",
								)}
							>
								All projects
							</button>
							{activeProjects.map((p) => (
								<button
									key={p.id}
									type="button"
									onClick={() => onProjectChange(p.id)}
									className={cn(
										"w-full text-left px-3 py-1.5 rounded font-mono text-[11px] transition-colors cursor-pointer inline-flex items-center gap-2",
										projectId === p.id
											? "bg-foreground text-background"
											: "text-foreground hover:bg-secondary/50",
									)}
								>
									{p.color && (
										<span
											className="size-2 rounded-full shrink-0"
											style={{ backgroundColor: p.color }}
										/>
									)}
									<span className="truncate">{p.name}</span>
								</button>
							))}
						</PopoverContent>
					</Popover>
				)}

				{/* Priority filter */}
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer",
								priority
									? "border-foreground/30 text-foreground bg-secondary/30"
									: "border-border/30 text-grey-3 hover:text-foreground",
							)}
						>
							<Flag className="size-3" />
							{priority
								? (PRIORITY_OPTIONS.find((o) => o.key === priority)?.label ??
									"Priority")
								: "Priority"}
							<ChevronDown className="size-3" />
						</button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-36 p-1">
						{PRIORITY_OPTIONS.map((opt) => (
							<button
								key={opt.label}
								type="button"
								onClick={() => onPriorityChange(opt.key)}
								className={cn(
									"w-full text-left px-3 py-1.5 rounded font-mono text-[11px] transition-colors cursor-pointer",
									priority === opt.key
										? "bg-foreground text-background"
										: "text-foreground hover:bg-secondary/50",
								)}
							>
								{opt.label}
							</button>
						))}
					</PopoverContent>
				</Popover>

				{/* Due date filter */}
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className={cn(
								"inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer",
								duePreset
									? "border-foreground/30 text-foreground bg-secondary/30"
									: "border-border/30 text-grey-3 hover:text-foreground",
							)}
						>
							<Calendar className="size-3" />
							{duePreset
								? (DUE_PRESETS.find((o) => o.key === duePreset)?.label ?? "Due")
								: "Due"}
							<ChevronDown className="size-3" />
						</button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-36 p-1">
						{DUE_PRESETS.map((opt) => (
							<button
								key={opt.label}
								type="button"
								onClick={() => onDuePresetChange(opt.key)}
								className={cn(
									"w-full text-left px-3 py-1.5 rounded font-mono text-[11px] transition-colors cursor-pointer",
									duePreset === opt.key
										? "bg-foreground text-background"
										: "text-foreground hover:bg-secondary/50",
								)}
							>
								{opt.label}
							</button>
						))}
					</PopoverContent>
				</Popover>

				{/* Clear filters */}
				{hasActiveFilters && (
					<button
						type="button"
						onClick={() => {
							onProjectChange(undefined);
							onPriorityChange(undefined);
							onDuePresetChange(undefined);
						}}
						className="inline-flex items-center gap-1 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
					>
						<X className="size-3" />
						Clear
					</button>
				)}
			</div>

			{/* Search input */}
			{searchQuery !== undefined && (
				<div className="relative">
					<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-grey-3" />
					<input
						ref={searchInputRef}
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="Search tasks…"
						className="w-full pl-8 pr-8 py-1.5 font-mono text-[12px] text-foreground placeholder:text-grey-3 bg-transparent border border-border/30 rounded-md outline-none focus:border-foreground/30 transition-colors"
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchChange("")}
							className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
						>
							<X className="size-3.5" />
						</button>
					)}
				</div>
			)}
		</div>
	);
}
