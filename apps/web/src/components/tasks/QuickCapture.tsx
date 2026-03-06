import { useCreateTask } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
	const createTask = useCreateTask();

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);

	const handleSubmit = () => {
		const title = value.trim();
		if (!title) return;

		createTask.mutate(
			{ title },
			{
				onSuccess: () => {
					setValue("");
					toast("Task created");
					onCreated?.();
				},
			},
		);
	};

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
					onChange={(e) => setValue(e.target.value)}
					onFocus={() => setExpanded(true)}
					onBlur={() => {
						if (!value.trim()) setExpanded(false);
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							handleSubmit();
						}
						if (e.key === "Escape") {
							setValue("");
							setExpanded(false);
							inputRef.current?.blur();
						}
					}}
					placeholder="Add a task..."
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
		</div>
	);
}
