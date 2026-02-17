import type { AutoHandledItem } from "@wingmnn/types";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { MOTION_CONSTANTS } from "../constant";

export function AutoHandledList({
	items,
	expanded: expandedProp,
}: {
	items: AutoHandledItem[];
	expanded?: boolean;
}) {
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		if (expandedProp) {
			setExpanded(true);
		}
	}, [expandedProp]);

	return (
		<section>
			<button
				type="button"
				onClick={() => setExpanded((prev) => !prev)}
				className="w-full cursor-pointer"
			>
				<div className="flex items-center gap-2">
					<Sparkles className="size-3 text-grey-3" />
					<span className="font-body text-[14px] text-foreground/50">
						Handled for you
					</span>
					<span className="font-body text-[14px] text-foreground/35">
						({items.length})
					</span>
					<div className="flex-1" />
					<motion.div
						animate={{ rotate: expanded ? 180 : 0 }}
						transition={{ duration: 0.2 }}
					>
						<ChevronDown className="size-3 text-grey-3" />
					</motion.div>
				</div>
			</button>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{
							height: { duration: 0.3, ease: MOTION_CONSTANTS.EASE },
							opacity: { duration: 0.2 },
						}}
						className="overflow-hidden"
					>
						<div className="mt-4">
							{items.map((item, i) => (
								<motion.div
									key={item.id}
									initial={{ opacity: 0, x: -8 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{
										delay: i * 0.04,
										duration: 0.3,
										ease: MOTION_CONSTANTS.EASE,
									}}
									className="group flex items-baseline gap-3 py-2.5 hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors duration-150"
								>
									<Check className="size-3 text-foreground/20 shrink-0 relative top-px" />
									<span className="font-body text-[14px] text-foreground/55 tracking-[0.01em] flex-1 leading-snug">
										{item.text}
									</span>
									{item.linkedModule && (
										<span className="font-body text-[11px] text-grey-3 shrink-0">
											{item.linkedModule}
										</span>
									)}
									<span className="font-body text-[11px] text-grey-3 shrink-0">
										{item.timestamp}
									</span>
								</motion.div>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
