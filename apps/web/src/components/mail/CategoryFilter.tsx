import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_CONFIG } from "./category-colors";

function ChipCount({
	count,
	className,
}: {
	count: number;
	className?: string;
}) {
	return (
		<motion.span
			initial={{ width: 0, opacity: 0 }}
			animate={{ width: "auto", opacity: 1 }}
			exit={{ width: 0, opacity: 0 }}
			transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
			className="overflow-hidden whitespace-nowrap"
		>
			<span className={cn("pl-1 tabular-nums", className)}>{count}</span>
		</motion.span>
	);
}

export function CategoryFilter({
	value,
	onChange,
	total,
}: {
	value: EmailCategory | null;
	onChange: (category: EmailCategory | null) => void;
	total?: number;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
	const [rect, setRect] = useState<{ left: number; width: number } | null>(
		null,
	);

	const activeKey = value ?? "all";
	const isAll = value === null;

	const measure = useCallback(() => {
		const container = containerRef.current;
		const button = buttonRefs.current.get(activeKey);
		if (!container || !button) return;

		const cr = container.getBoundingClientRect();
		const br = button.getBoundingClientRect();
		setRect({ left: br.left - cr.left, width: br.width });
	}, [activeKey]);

	useEffect(() => {
		measure();

		// Re-measure as the active button resizes (count animating in/out)
		const button = buttonRefs.current.get(activeKey);
		if (!button) return;

		const ro = new ResizeObserver(measure);
		ro.observe(button);
		return () => ro.disconnect();
	}, [measure, activeKey]);

	const bgClass = isAll
		? "bg-foreground"
		: CATEGORY_CONFIG[value].bg;

	return (
		<div
			ref={containerRef}
			className="relative flex flex-wrap items-center gap-1.5"
		>
			{/* Animated highlighter */}
			{rect && (
				<motion.div
					className={cn("absolute rounded-full h-full", bgClass)}
					animate={{ x: rect.left, width: rect.width }}
					transition={{
						duration: 0.35,
						ease: MOTION_CONSTANTS.EASE,
					}}
				/>
			)}

			{/* All chip */}
			<button
				ref={(el) => {
					if (el) buttonRefs.current.set("all", el);
				}}
				type="button"
				onClick={() => onChange(null)}
				className={cn(
					"relative inline-flex items-center font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
					isAll
						? "text-background"
						: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
				)}
			>
				<span className="relative z-1 inline-flex items-center">
					<span>All</span>
					<AnimatePresence mode="popLayout">
						{isAll && total !== undefined && (
							<ChipCount count={total} className="text-background/60" />
						)}
					</AnimatePresence>
				</span>
			</button>

			{/* Category chips */}
			{CATEGORIES.map((cat) => {
				const active = value === cat.value;
				return (
					<button
						key={cat.value}
						ref={(el) => {
							if (el) buttonRefs.current.set(cat.value, el);
						}}
						type="button"
						onClick={() => onChange(active ? null : cat.value)}
						className={cn(
							"relative inline-flex items-center gap-1.5 font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
							active
								? cat.text
								: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
						)}
					>
						<span
							className={cn(
								"relative z-1 size-1.5 rounded-full shrink-0 transition-opacity",
								cat.dot,
								active ? "opacity-100" : "opacity-40",
							)}
						/>
						<span className="relative z-1 inline-flex items-center">
							<span>{cat.label}</span>
							<AnimatePresence mode="popLayout">
								{active && total !== undefined && (
									<ChipCount count={total} className="opacity-60" />
								)}
							</AnimatePresence>
						</span>
					</button>
				);
			})}
		</div>
	);
}
