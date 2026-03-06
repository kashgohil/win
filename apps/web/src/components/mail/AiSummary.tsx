import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import { ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function AiSummary({ summary }: { summary: string }) {
	const [open, setOpen] = useState(false);

	return (
		<div className="border-t border-border/30 bg-secondary/5">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 px-4 py-2.5 font-body text-[12px] text-grey-2 hover:text-foreground cursor-pointer select-none"
			>
				<Sparkles
					className={cn(
						"size-3.5 shrink-0 transition-colors duration-200",
						open ? "text-foreground/80" : "text-grey-3",
					)}
				/>
				<span>AI summary</span>
				<motion.div
					animate={{ rotate: open ? 180 : 0 }}
					transition={{ duration: 0.25, ease: MOTION_CONSTANTS.EASE }}
					className="ml-auto shrink-0"
				>
					<ChevronDown className="size-3 text-grey-3" />
				</motion.div>
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{
							height: { duration: 0.3, ease: MOTION_CONSTANTS.EASE },
							opacity: { duration: 0.2, ease: "easeInOut" },
						}}
						className="overflow-hidden"
					>
						<div className="px-4 pb-4 pt-1">
							<p className="font-serif text-[14px] text-foreground/75 italic leading-relaxed border-l-2 border-grey-4/60 pl-3">
								{summary}
							</p>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
