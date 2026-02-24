import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { SlidersHorizontal } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MOTION_CONSTANTS } from "../constant";

const CATEGORIES: { value: EmailCategory; label: string }[] = [
	{ value: "urgent", label: "Urgent" },
	{ value: "actionable", label: "Actionable" },
	{ value: "informational", label: "Info" },
	{ value: "newsletter", label: "Newsletter" },
	{ value: "receipt", label: "Receipt" },
	{ value: "confirmation", label: "Confirmation" },
	{ value: "promotional", label: "Promo" },
	{ value: "spam", label: "Spam" },
	{ value: "uncategorized", label: "Other" },
];

export function CategoryFilter({
	value,
	onChange,
	total,
}: {
	value: EmailCategory[];
	onChange: (categories: EmailCategory[]) => void;
	total?: number;
}) {
	const [expanded, setExpanded] = useState(value.length > 0);
	const containerRef = useRef<HTMLDivElement>(null);

	// Close on click outside
	useEffect(() => {
		if (!expanded) return;
		const handleClick = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setExpanded(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [expanded]);

	const selected = new Set(value);

	const toggleCategory = (cat: EmailCategory) => {
		if (selected.has(cat)) {
			onChange([]);
		} else {
			onChange([cat]);
		}
	};

	return (
		<div ref={containerRef}>
			{/* Header with integrated filter trigger */}
			<div className="flex items-center gap-3">
				{total !== undefined && (
					<span className="font-body text-[13px] text-grey-3">
						{total} email{total !== 1 ? "s" : ""}
					</span>
				)}
				<div className="flex-1" />

				<button
					type="button"
					onClick={() => setExpanded((p) => !p)}
					className={cn(
						"inline-flex items-center gap-1.5 font-body text-[12px] cursor-pointer transition-colors duration-150",
						selected.size > 0
							? "px-2.5 py-0.5 rounded-full bg-foreground text-background"
							: "text-grey-3 hover:text-foreground",
					)}
				>
					<SlidersHorizontal className="size-3" />
					{selected.size > 0
						? `${[...selected].map((s) => CATEGORIES.find((c) => c.value === s)?.label).join("")}`
						: "Filter"}
				</button>
			</div>

			{/* Expandable chip palette */}
			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{
							height: { duration: 0.25, ease: MOTION_CONSTANTS.EASE },
							opacity: { duration: 0.15 },
						}}
						className="overflow-hidden"
					>
						<div className="flex flex-wrap items-center gap-1.5 pt-3">
							{CATEGORIES.map((cat) => {
								const active = selected.has(cat.value);
								return (
									<button
										key={cat.value}
										type="button"
										onClick={() => toggleCategory(cat.value)}
										className={cn(
											"relative font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
											active
												? "text-background"
												: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
										)}
									>
										{active && (
											<motion.span
												layoutId="category-filter-bg"
												className="absolute inset-0 rounded-full bg-foreground"
												transition={{
													type: "spring",
													bounce: 0.15,
													duration: 0.4,
												}}
											/>
										)}
										<span className="relative z-10">{cat.label}</span>
									</button>
								);
							})}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
