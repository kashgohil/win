import { useCreateTask, useParseTaskInput } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { CalendarDays, Flag, FolderOpen, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
	urgent: "text-red-500",
	high: "text-orange-500",
	medium: "text-yellow-500",
	low: "text-blue-400",
};

/* ── Quick capture input ── */

export function QuickCapture({
	autoFocus,
	onCreated,
}: {
	autoFocus?: boolean;
	onCreated?: () => void;
}) {
	const [value, setValue] = useState("");
	const [expanded, setExpanded] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const createTask = useCreateTask();
	const parseTask = useParseTaskInput();

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);

	// Debounced NL parsing
	const handleChange = (text: string) => {
		setValue(text);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (text.trim().length < 3) {
			parseTask.reset();
			return;
		}
		debounceRef.current = setTimeout(() => {
			parseTask.mutate(text.trim());
		}, 400);
	};

	const handleSubmit = () => {
		const title = value.trim();
		if (!title) return;

		// Use parsed fields if available, otherwise just the raw title
		const parsed = parseTask.data;
		const input = parsed
			? {
					title: parsed.title,
					priority: parsed.priority !== "none" ? parsed.priority : undefined,
					dueAt: parsed.dueAt,
				}
			: { title };

		createTask.mutate(input, {
			onSuccess: () => {
				setValue("");
				parseTask.reset();
				toast("Task created");
				onCreated?.();
			},
		});
	};

	const parsed = parseTask.data;
	const showPreview =
		expanded &&
		parsed &&
		(parsed.dueAt || parsed.priority !== "none" || parsed.projectName);

	return (
		<div
			className={cn(
				"rounded-lg border border-border/40 bg-background transition-all duration-200",
				expanded && "border-foreground/20 shadow-sm",
			)}
		>
			<div className="flex items-center gap-2 px-3 py-2">
				<Plus className="size-4 text-grey-3 shrink-0" />
				<input
					ref={inputRef}
					value={value}
					onChange={(e) => handleChange(e.target.value)}
					onFocus={() => setExpanded(true)}
					onBlur={() => {
						if (!value.trim()) {
							setExpanded(false);
							parseTask.reset();
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSubmit();
						}
						if (e.key === "Escape") {
							setValue("");
							setExpanded(false);
							parseTask.reset();
							inputRef.current?.blur();
						}
					}}
					placeholder='Add a task... (try: "Review PR by Friday #work high priority")'
					className="flex-1 font-body text-[14px] bg-transparent border-none outline-none placeholder:text-grey-3"
				/>
				{value.trim() && (
					<button
						type="button"
						onClick={handleSubmit}
						disabled={createTask.isPending}
						className="font-mono text-[11px] text-foreground bg-foreground/10 hover:bg-foreground/20 rounded px-2 py-0.5 transition-colors cursor-pointer"
					>
						{createTask.isPending ? "..." : "Add"}
					</button>
				)}
			</div>

			{/* NL parse preview */}
			{showPreview && (
				<div className="flex items-center gap-3 px-3 pb-2 pt-0.5">
					<Sparkles className="size-3 text-grey-3 shrink-0" />
					<div className="flex items-center gap-2.5 flex-wrap">
						{parsed.priority !== "none" && (
							<span
								className={cn(
									"flex items-center gap-1 font-mono text-[10px]",
									PRIORITY_COLORS[parsed.priority] ?? "text-grey-2",
								)}
							>
								<Flag className="size-2.5" />
								{parsed.priority}
							</span>
						)}
						{parsed.dueAt && (
							<span className="flex items-center gap-1 font-mono text-[10px] text-grey-2">
								<CalendarDays className="size-2.5" />
								{new Date(parsed.dueAt).toLocaleDateString("en-US", {
									weekday: "short",
									month: "short",
									day: "numeric",
								})}
							</span>
						)}
						{parsed.projectName && (
							<span className="flex items-center gap-1 font-mono text-[10px] text-grey-2">
								<FolderOpen className="size-2.5" />
								{parsed.projectName}
							</span>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
