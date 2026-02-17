import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { SlidersHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { MOTION_CONSTANTS } from "../constant";

const CATEGORIES: { value: EmailCategory | undefined; label: string }[] = [
	{ value: undefined, label: "All" },
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

function getCategoryLabel(value: EmailCategory): string {
	return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function CategoryFilter({
	value,
	onChange,
	total,
}: {
	value: EmailCategory | undefined;
	onChange: (category: EmailCategory | undefined) => void;
	total?: number;
}) {
	const [expanded, setExpanded] = useState(false);
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

				{value ? (
					<button
						type="button"
						onClick={() => setExpanded((p) => !p)}
						className="inline-flex items-center gap-1.5 font-body text-[12px] px-2.5 py-0.5 rounded-full bg-foreground text-background cursor-pointer group transition-colors duration-150"
					>
						{getCategoryLabel(value)}
						<X
							className="size-3 opacity-50 group-hover:opacity-100 transition-opacity"
							onClick={(e) => {
								e.stopPropagation();
								onChange(undefined);
								setExpanded(false);
							}}
						/>
					</button>
				) : (
					<button
						type="button"
						onClick={() => setExpanded((p) => !p)}
						className="inline-flex items-center gap-1.5 font-body text-[12px] text-grey-3 hover:text-foreground cursor-pointer transition-colors duration-150"
					>
						<SlidersHorizontal className="size-3" />
						Filter
					</button>
				)}
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
								const active = value === cat.value;
								return (
									<button
										key={cat.label}
										type="button"
										onClick={() => {
											onChange(cat.value);
											setExpanded(false);
										}}
										className={cn(
											"font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 transition-colors duration-150 cursor-pointer",
											active
												? "bg-foreground text-background"
												: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
										)}
									>
										{cat.label}
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
