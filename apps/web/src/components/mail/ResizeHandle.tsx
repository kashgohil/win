import { cn } from "@/lib/utils";
import { useCallback, useRef, useState } from "react";

interface ResizeHandleProps {
	onResize: (width: number) => void;
	minWidth: number;
	maxWidth: number;
}

export function ResizeHandle({
	onResize,
	minWidth,
	maxWidth,
}: ResizeHandleProps) {
	const [isDragging, setIsDragging] = useState(false);
	const rafRef = useRef<number>(0);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			const target = e.currentTarget as HTMLElement;
			target.setPointerCapture(e.pointerId);
			setIsDragging(true);

			const panel = target.parentElement?.querySelector(
				"[data-sidepanel-list]",
			) as HTMLElement | null;
			if (!panel) return;

			const startX = e.clientX;
			const startWidth = panel.getBoundingClientRect().width;

			const onMove = (me: PointerEvent) => {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(() => {
					const delta = me.clientX - startX;
					const newWidth = Math.max(
						minWidth,
						Math.min(maxWidth, startWidth + delta),
					);
					onResize(newWidth);
				});
			};

			const onUp = () => {
				cancelAnimationFrame(rafRef.current);
				setIsDragging(false);
				document.removeEventListener("pointermove", onMove);
				document.removeEventListener("pointerup", onUp);
			};

			document.addEventListener("pointermove", onMove);
			document.addEventListener("pointerup", onUp);
		},
		[onResize, minWidth, maxWidth],
	);

	return (
		<div
			onPointerDown={handlePointerDown}
			className={cn(
				"shrink-0 w-px cursor-col-resize relative group",
				"bg-border/60",
			)}
		>
			{/* Wide invisible hit area for easy grabbing */}
			<div className="absolute inset-y-0 -left-1.5 -right-1.5 z-10" />
			{/* Accent line — visible on hover/drag */}
			<div
				className={cn(
					"absolute inset-y-0 -left-px w-0.5 transition-opacity duration-150",
					"bg-foreground/20 opacity-0",
					"group-hover:opacity-100",
					isDragging && "opacity-100 bg-foreground/30",
				)}
			/>
		</div>
	);
}
