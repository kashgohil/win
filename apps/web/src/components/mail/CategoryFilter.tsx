import type { EmailCategory } from "@wingmnn/types";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MOTION_CONSTANTS } from "@/components/constant";
import { cn } from "@/lib/utils";
import { CATEGORIES, CATEGORY_CONFIG } from "./category-colors";

const ALL_KEYS = ["all", ...CATEGORIES.map((c) => c.value)] as const;

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
	const containerRef = useRef<HTMLFieldSetElement>(null);
	const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
	const labelRefs = useRef<Map<string, HTMLLabelElement>>(new Map());
	const [rect, setRect] = useState<{ left: number; width: number } | null>(
		null,
	);

	const activeKey = value ?? "all";
	const isAll = value === null;

	const measure = useCallback(() => {
		const container = containerRef.current;
		const label = labelRefs.current.get(activeKey);
		if (!container || !label) return;

		const cr = container.getBoundingClientRect();
		const lr = label.getBoundingClientRect();
		setRect({ left: lr.left - cr.left, width: lr.width });
	}, [activeKey]);

	useEffect(() => {
		measure();

		const label = labelRefs.current.get(activeKey);
		if (!label) return;

		const ro = new ResizeObserver(measure);
		ro.observe(label);
		return () => ro.disconnect();
	}, [measure, activeKey]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		const currentIndex = ALL_KEYS.indexOf(activeKey);
		let nextIndex: number | null = null;

		switch (e.key) {
			case "ArrowRight":
				e.preventDefault();
				nextIndex = (currentIndex + 1) % ALL_KEYS.length;
				break;
			case "ArrowLeft":
				e.preventDefault();
				nextIndex = (currentIndex - 1 + ALL_KEYS.length) % ALL_KEYS.length;
				break;
			case "Home":
				e.preventDefault();
				nextIndex = 0;
				break;
			case "End":
				e.preventDefault();
				nextIndex = ALL_KEYS.length - 1;
				break;
			default:
				return;
		}

		const nextKey = ALL_KEYS[nextIndex];
		onChange(nextKey === "all" ? null : (nextKey as EmailCategory));
		inputRefs.current.get(nextKey)?.focus();
	};

	const bgClass = isAll ? "bg-foreground" : CATEGORY_CONFIG[value].bg;

	return (
		<fieldset
			ref={containerRef}
			onKeyDown={handleKeyDown}
			className="relative flex flex-wrap items-center gap-1.5 border-none m-0 p-0"
		>
			<legend className="sr-only">Filter by category</legend>

			{/* Animated highlighter */}
			{rect && (
				<motion.div
					className={cn("absolute rounded-full h-full", bgClass)}
					animate={{ x: rect.left, width: rect.width }}
					transition={{
						duration: 0.35,
						ease: MOTION_CONSTANTS.EASE,
					}}
					aria-hidden="true"
				/>
			)}

			{/* All chip */}
			<label
				ref={(el) => {
					if (el) labelRefs.current.set("all", el);
				}}
				className={cn(
					"relative inline-flex items-center font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
					"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
					isAll
						? "text-background"
						: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
				)}
			>
				<input
					ref={(el) => {
						if (el) inputRefs.current.set("all", el);
					}}
					type="radio"
					name="category-filter"
					checked={isAll}
					tabIndex={isAll ? 0 : -1}
					onChange={() => onChange(null)}
					className="sr-only"
				/>
				<span className="relative z-1 inline-flex items-center">
					<span>All</span>
					<AnimatePresence mode="popLayout">
						{isAll && total !== undefined && (
							<ChipCount count={total} className="text-background/60" />
						)}
					</AnimatePresence>
				</span>
			</label>

			{/* Category chips */}
			{CATEGORIES.map((cat) => {
				const active = value === cat.value;
				return (
					<label
						key={cat.value}
						ref={(el) => {
							if (el) labelRefs.current.set(cat.value, el);
						}}
						className={cn(
							"relative inline-flex items-center gap-1.5 font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
							"has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50",
							active
								? cat.text
								: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
						)}
					>
						<input
							ref={(el) => {
								if (el) inputRefs.current.set(cat.value, el);
							}}
							type="radio"
							name="category-filter"
							checked={active}
							tabIndex={active ? 0 : -1}
							onChange={() => onChange(active ? null : cat.value)}
							className="sr-only"
						/>
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
					</label>
				);
			})}
		</fieldset>
	);
}
