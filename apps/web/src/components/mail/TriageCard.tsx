import { cn } from "@/lib/utils";
import type { TriageItem } from "@wingmnn/types";
import { ArrowLeft } from "lucide-react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";

export function TriageCard({
	item,
	index,
	onAction,
	onDismiss,
}: {
	item: TriageItem;
	index: number;
	onAction: (actionLabel: string) => void;
	onDismiss: () => void;
}) {
	const x = useMotionValue(0);
	const opacity = useTransform(x, [-200, 0], [0, 1]);
	const scale = useTransform(x, [-200, 0], [0.95, 1]);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 16, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				x: -60,
				scale: 0.95,
				transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
			}}
			transition={{
				delay: index * 0.06,
				duration: 0.4,
				ease: [0.22, 1, 0.36, 1],
				layout: { type: "spring", stiffness: 350, damping: 30 },
			}}
			style={{ x, opacity, scale }}
			drag="x"
			dragConstraints={{ left: 0, right: 0 }}
			dragElastic={0.15}
			onDragEnd={(_, info) => {
				if (info.offset.x < -120) {
					onDismiss();
				}
			}}
			className="group"
		>
			<div
				className={cn(
					"relative py-4 -mx-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors duration-150",
					item.urgent && "bg-accent-red/4",
				)}
			>
				{item.urgent && (
					<div className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-accent-red" />
				)}

				<div className="flex items-start justify-between gap-4">
					<div className="flex-1 min-w-0">
						{item.subtitle && (
							<p className="font-body text-[15px] text-foreground/80 leading-snug tracking-[0.01em]">
								{item.subtitle}
							</p>
						)}
						<div className="flex items-center gap-2 mt-0.5">
							{item.urgent && (
								<span className="size-1.5 rounded-full bg-accent-red shrink-0" />
							)}
							<h3 className="font-body text-[13px] text-foreground/50 leading-snug">
								{item.title}
							</h3>
						</div>
					</div>
					<span className="font-body text-[11px] text-grey-3 shrink-0 mt-0.5">
						{item.timestamp}
					</span>
				</div>

				<div className="flex items-center gap-4 mt-3">
					{item.actions.map((action) => (
						<button
							key={action.label}
							type="button"
							onClick={() => {
								if (action.variant === "ghost") {
									onDismiss();
								} else {
									onAction(action.label);
								}
							}}
							className={cn(
								"font-body text-[13px] hover:underline underline-offset-2 cursor-pointer transition-colors duration-150",
								action.variant === "ghost"
									? "text-grey-3 hover:text-foreground/60"
									: "text-foreground/70 hover:text-foreground",
							)}
						>
							{action.label} &rsaquo;
						</button>
					))}
				</div>

				{/* Swipe hint on first card */}
				{index === 0 && <SwipeHint />}
			</div>
		</motion.div>
	);
}

function SwipeHint() {
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setVisible(false), 1500);
		return () => clearTimeout(timer);
	}, []);

	if (!visible) return null;

	return (
		<motion.div
			initial={{ opacity: 0.6 }}
			animate={{ opacity: 0 }}
			transition={{ delay: 1.5, duration: 0.5 }}
			className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-grey-3 pointer-events-none"
		>
			<ArrowLeft className="size-3" />
			<span className="font-body text-[10px]">swipe</span>
		</motion.div>
	);
}
