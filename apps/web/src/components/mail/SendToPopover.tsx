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
import { toast } from "sonner";

const sendToOptions = [
	{
		label: "create task",
		icon: CheckSquare,
	},
	{
		label: "add to calendar",
		icon: CalendarPlus,
	},
	{
		label: "save contact",
		icon: UserPlus,
	},
	{
		label: "add note",
		icon: StickyNote,
	},
	{
		label: "track expense",
		icon: Receipt,
	},
] as const;

export function SendToPopover() {
	return (
		<Popover>
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
							key={opt.label}
							type="button"
							onClick={() => toast("Coming soon")}
							initial={{ opacity: 0, x: -4 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								duration: 0.2,
								delay: i * 0.03,
								ease: [0.22, 1, 0.36, 1],
							}}
							className="group/item flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer hover:bg-secondary/40"
						>
							<div className="size-7 rounded-md flex items-center justify-center bg-secondary/30 group-hover/item:bg-secondary/60 transition-colors duration-150">
								<opt.icon className="size-3.5 text-grey-2" />
							</div>
							<span className="font-body text-[13px] text-foreground/70 group-hover/item:text-foreground transition-colors duration-150">
								{opt.label}
							</span>
							<ChevronRight className="size-2.5 ml-auto text-grey-3/0 group-hover/item:text-grey-3 transition-all duration-150" />
						</motion.button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
