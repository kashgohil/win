import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useExtractFromEmail } from "@/hooks/use-finance";
import { useCreateTaskFromEmail } from "@/hooks/use-tasks";
import {
	CalendarPlus,
	CheckSquare,
	ChevronRight,
	CornerUpRight,
	Receipt,
	StickyNote,
	UserPlus,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

const sendToOptions = [
	{
		label: "create task",
		icon: CheckSquare,
		key: "task",
	},
	{
		label: "add to calendar",
		icon: CalendarPlus,
		key: "calendar",
	},
	{
		label: "save contact",
		icon: UserPlus,
		key: "contact",
	},
	{
		label: "add note",
		icon: StickyNote,
		key: "note",
	},
	{
		label: "track expense",
		icon: Receipt,
		key: "expense",
	},
] as const;

export function SendToPopover({ emailId }: { emailId?: string }) {
	const [open, setOpen] = useState(false);
	const createTaskFromEmail = useCreateTaskFromEmail();
	const extractExpense = useExtractFromEmail();

	const handleAction = (key: string) => {
		if (key === "task" && emailId) {
			createTaskFromEmail.mutate(emailId, {
				onSuccess: (data) => {
					toast("Task created", {
						description: data?.title,
					});
					setOpen(false);
				},
				onError: () => {
					toast.error("Failed to create task from email");
				},
			});
			return;
		}
		if (key === "expense" && emailId) {
			extractExpense.mutate(emailId, {
				onSuccess: (data) => {
					const txn = data as {
						merchant?: string | null;
						amount?: number;
						currency?: string;
					} | null;
					toast("Expense tracked", {
						description:
							txn?.merchant
								? `${txn.merchant} — ${((txn?.amount ?? 0) / 100).toLocaleString("en-US", { style: "currency", currency: txn?.currency ?? "USD" })}`
								: undefined,
					});
					setOpen(false);
				},
				onError: () => {
					toast.error("Failed to extract expense from email");
				},
			});
			return;
		}
		toast("Coming soon");
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<motion.button
							type="button"
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<CornerUpRight className="size-3.5" />
							<span className="sr-only">Route to</span>
						</motion.button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">Route to</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" sideOffset={8} className="w-52 p-2">
				<div className="space-y-0.5">
					{sendToOptions.map((opt, i) => (
						<motion.button
							key={opt.key}
							type="button"
							onClick={() => handleAction(opt.key)}
							disabled={
							(opt.key === "task" && createTaskFromEmail.isPending) ||
							(opt.key === "expense" && extractExpense.isPending)
						}
							initial={{ opacity: 0, x: -4 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								duration: 0.2,
								delay: i * 0.03,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="group/item flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer hover:bg-secondary/40 disabled:opacity-50"
						>
							<div className="size-7 rounded-md flex items-center justify-center bg-secondary/30 group-hover/item:bg-secondary/60 transition-colors duration-150">
								<opt.icon className="size-3.5 text-grey-2" />
							</div>
							<span className="font-body text-[13px] text-foreground/70 group-hover/item:text-foreground transition-colors duration-150">
								{opt.key === "task" && createTaskFromEmail.isPending
									? "Creating..."
									: opt.key === "expense" && extractExpense.isPending
										? "Extracting..."
										: opt.label}
							</span>
							<ChevronRight className="size-2.5 ml-auto text-grey-3/0 group-hover/item:text-grey-3 transition-all duration-150" />
						</motion.button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
