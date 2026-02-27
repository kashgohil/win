import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { CATEGORIES } from "./category-colors";

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
	const isAll = value === null;

	return (
		<LayoutGroup>
			<div className="relative flex flex-wrap items-center gap-1.5">
				{/* All chip */}
				<motion.button
					layout
					type="button"
					onClick={() => onChange(null)}
					transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
					className={cn(
						"relative inline-flex items-center font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
						isAll
							? "text-background"
							: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
					)}
				>
					<AnimatePresence>
						{isAll && (
							<motion.span
								layoutId="category-chip-bg"
								className="absolute inset-0 rounded-full bg-foreground"
								transition={{
									duration: 0.35,
									ease: MOTION_CONSTANTS.EASE,
								}}
							/>
						)}
					</AnimatePresence>
					<span className="relative z-[1] inline-flex items-center">
						<span>All</span>
						<AnimatePresence>
							{isAll && total !== undefined && (
								<ChipCount count={total} className="text-background/60" />
							)}
						</AnimatePresence>
					</span>
				</motion.button>

				{/* Category chips */}
				{CATEGORIES.map((cat) => {
					const active = value === cat.value;
					return (
						<motion.button
							key={cat.value}
							layout
							type="button"
							onClick={() => onChange(active ? null : cat.value)}
							transition={{
								duration: 0.3,
								ease: MOTION_CONSTANTS.EASE,
							}}
							className={cn(
								"relative inline-flex items-center gap-1.5 font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
								active
									? cat.text
									: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
							)}
						>
							<AnimatePresence>
								{active && (
									<motion.span
										layoutId="category-chip-bg"
										className={cn("absolute inset-0 rounded-full", cat.bg)}
										transition={{
											duration: 0.35,
											ease: MOTION_CONSTANTS.EASE,
										}}
									/>
								)}
							</AnimatePresence>
							<span
								className={cn(
									"relative z-[1] size-1.5 rounded-full shrink-0 transition-opacity",
									cat.dot,
									active ? "opacity-100" : "opacity-40",
								)}
							/>
							<span className="relative z-[1] inline-flex items-center">
								<span>{cat.label}</span>
								<AnimatePresence>
									{active && total !== undefined && (
										<ChipCount count={total} className="opacity-60" />
									)}
								</AnimatePresence>
							</span>
						</motion.button>
					);
				})}
			</div>
		</LayoutGroup>
	);
}
