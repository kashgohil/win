import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { getIcon } from "../icons";

export default function RoleCard({
	icon,
	label,
	description,
	selected,
	onClick,
	style,
	index = 0,
}: {
	icon: string;
	label: string;
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
				"group relative flex items-center gap-4 rounded-lg border p-5 text-left cursor-pointer transition-colors duration-200 bg-background w-full overflow-hidden border-l-4",
				selected
					? "border-accent-red/50 border-l-accent-red bg-accent-red/3"
					: "border-border hover:border-grey-3",
			)}
		>
			<div
				className={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-md transition-colors duration-200",
					selected
						? "bg-accent-red/10 text-accent-red"
						: "bg-border/50 text-grey-2 group-hover:bg-border/80",
				)}
			>
				{Icon && <Icon size={18} />}
			</div>

			<div className="flex-1 min-w-0">
				<p className="font-display text-[1rem] text-foreground font-medium leading-tight">
					{label}
				</p>
				<p className="font-serif text-[0.83rem] text-grey-2 leading-snug mt-0.5">
					{description}
				</p>
			</div>
		</motion.button>
	);
}
