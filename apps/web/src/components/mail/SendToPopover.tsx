import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	CalendarPlus,
	CheckSquare,
	ChevronRight,
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
		accent: "bg-foreground/5 text-foreground/70",
	},
	{
		label: "add to calendar",
		icon: CalendarPlus,
		accent: "bg-foreground/5 text-foreground/70",
	},
	{
		label: "save contact",
		icon: UserPlus,
		accent: "bg-foreground/5 text-foreground/70",
	},
	{
		label: "add note",
		icon: StickyNote,
		accent: "bg-foreground/5 text-foreground/70",
	},
	{
		label: "track expense",
		icon: Receipt,
		accent: "bg-foreground/5 text-foreground/70",
	},
] as const;

export function SendToPopover() {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="group inline-flex items-center gap-1 font-body text-[11px] text-grey-3 hover:text-grey-2 transition-colors duration-200 cursor-pointer"
				>
					<span className="uppercase tracking-widest">route to</span>
					<ChevronRight className="size-2.5 transition-transform duration-200 group-hover:translate-x-0.5 group-data-[state=open]:rotate-90" />
				</button>
			</PopoverTrigger>
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
