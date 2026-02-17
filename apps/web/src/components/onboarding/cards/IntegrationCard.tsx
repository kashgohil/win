import { MOTION_CONSTANTS } from "@/components/constant";
import { motion } from "motion/react";
import { getIcon } from "../icons";

export default function IntegrationCard({
	icon,
	provider,
	description,
	style,
	index = 0,
}: {
	icon: string;
	provider: string;
	description: string;
	style?: React.CSSProperties;
	index?: number;
}) {
	const Icon = getIcon(icon);

	return (
		<motion.div
			style={style}
			initial={{ opacity: 0, y: 12, scale: 0.97 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{
				duration: 0.4,
				ease: MOTION_CONSTANTS.EASE,
				delay: index * MOTION_CONSTANTS.STAGGER_MS * 0.001,
			}}
			className="group flex items-center gap-4 rounded-lg border border-border bg-background p-4 text-left transition-colors duration-200 hover:border-grey-3"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-border/40 text-grey-2 transition-colors duration-200 group-hover:bg-border/60">
				{Icon && <Icon size={18} />}
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-display text-[0.9rem] text-foreground font-medium">
					{provider}
				</p>
				<p className="font-serif text-[0.78rem] text-grey-3 leading-snug">
					{description}
				</p>
			</div>
			<span className="shrink-0 font-mono text-[9px] text-grey-3 tracking-[0.06em] uppercase border border-border rounded-full px-2.5 py-1">
				Coming soon
			</span>
		</motion.div>
	);
}
