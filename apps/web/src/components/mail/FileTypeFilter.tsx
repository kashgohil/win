import { MOTION_CONSTANTS } from "@/components/constant";
import { type FileCategory, FILE_CATEGORY_CONFIG } from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const FILE_TYPES: { value: FileCategory; label: string }[] = [
	{ value: "image", label: "Images" },
	{ value: "pdf", label: "PDFs" },
	{ value: "document", label: "Docs" },
	{ value: "spreadsheet", label: "Sheets" },
	{ value: "presentation", label: "Slides" },
	{ value: "video", label: "Videos" },
	{ value: "audio", label: "Audio" },
	{ value: "archive", label: "Archives" },
	{ value: "code", label: "Code" },
];

export function FileTypeFilter({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (filetype: string | null) => void;
}) {
	const containerRef = useRef<HTMLFieldSetElement>(null);
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

	return (
		<fieldset
			ref={containerRef}
			className="relative flex flex-wrap items-center gap-1.5 border-none m-0 p-0"
		>
			<legend className="sr-only">Filter by file type</legend>

			{/* Animated highlighter */}
			{rect && (
				<motion.div
					className={cn(
						"absolute rounded-full h-full",
						isAll ? "bg-foreground" : "bg-foreground/8",
					)}
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
					"has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
					isAll
						? "text-background"
						: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
				)}
			>
				<input
					type="radio"
					name="filetype-filter"
					checked={isAll}
					onChange={() => onChange(null)}
					className="sr-only"
				/>
				<span className="relative z-1">All</span>
			</label>

			{/* File type chips */}
			{FILE_TYPES.map((ft) => {
				const active = value === ft.value;
				const config = FILE_CATEGORY_CONFIG[ft.value];
				const Icon = config.icon;
				return (
					<label
						key={ft.value}
						ref={(el) => {
							if (el) labelRefs.current.set(ft.value, el);
						}}
						className={cn(
							"relative inline-flex items-center gap-1.5 font-body text-[12px] px-2.5 py-1 rounded-full shrink-0 cursor-pointer transition-colors duration-150",
							"has-focus-visible:ring-2 has-focus-visible:ring-ring/50",
							active
								? config.accent
								: "text-grey-2 hover:text-foreground hover:bg-secondary/50",
						)}
					>
						<input
							type="radio"
							name="filetype-filter"
							checked={active}
							onChange={() => onChange(active ? null : ft.value)}
							className="sr-only"
						/>
						<Icon
							className={cn(
								"relative z-1 size-3",
								active ? "opacity-100" : "opacity-50",
							)}
						/>
						<span className="relative z-1">{ft.label}</span>
					</label>
				);
			})}
		</fieldset>
	);
}
