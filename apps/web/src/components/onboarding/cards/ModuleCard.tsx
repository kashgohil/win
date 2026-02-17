import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { Check, getIcon } from "../icons";

export default function ModuleCard({
	icon,
	code,
	name,
	description,
	selected,
	onClick,
	style,
	index = 0,
}: {
	icon: string;
	code: string;
	name: string;
	description: string;
	selected: boolean;
	onClick: () => void;
	style?: React.CSSProperties;
	index?: number;
}) {
	const Icon = getIcon(icon);

	return (
		<motion.button
			type="button"
			onClick={onClick}
			style={style}
			initial={{ opacity: 0, y: 12, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{
				duration: 0.4,
				ease: MOTION_CONSTANTS.EASE,
				delay: index * MOTION_CONSTANTS.STAGGER_MS * 0.001,
			}}
			className={cn(
				"group relative flex flex-col items-start rounded-lg border p-4 text-left transition-colors duration-200 cursor-pointer",
				selected
					? "border-accent-red/50 bg-accent-red/3"
					: "border-border bg-background hover:border-grey-3",
			)}
		>
			{/* Top: code + checkbox */}
			<div className="flex items-center justify-between w-full mb-3">
				<span
					className={cn(
						"font-mono text-[10px] tracking-[0.08em] uppercase transition-colors duration-200",
						selected ? "text-accent-red" : "text-grey-3",
					)}
				>
					{code}
				</span>
				<div
					className={cn(
						"size-4 rounded border-[1.5px] flex items-center justify-center transition-all duration-150",
						selected
							? "border-accent-red bg-accent-red"
							: "border-border bg-transparent group-hover:border-grey-3",
					)}
				>
					{selected && (
						<Check size={10} className="text-white" strokeWidth={3} />
					)}
				</div>
			</div>

			{/* Icon + name */}
			<div className="flex items-center gap-2 mb-1.5">
				{Icon && (
					<Icon
						size={15}
						className={cn(
							"transition-colors duration-200",
							selected ? "text-accent-red" : "text-grey-2",
						)}
					/>
				)}
				<span className="font-display text-[0.9rem] text-foreground font-medium">
					{name}
				</span>
			</div>

			{/* Description */}
			<p className="font-serif text-[0.78rem] text-grey-2 leading-snug">
				{description}
			</p>
		</motion.button>
	);
}
