import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { Slot, Tooltip as TooltipPrimitive } from "radix-ui";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";

type Side = "top" | "right" | "bottom" | "left";

/* ═══════════════════════════════════════════════════════
   Sliding-tooltip internals
   ═══════════════════════════════════════════════════════ */

interface SlidingState {
	content: ReactNode;
	side: Side;
	x: number;
	y: number;
}

interface SlidingContextValue {
	show: (
		content: ReactNode,
		trigger: HTMLElement,
		side: Side,
		sideOffset: number,
	) => void;
	hide: () => void;
}

const SlidingContext = createContext<SlidingContextValue | null>(null);

interface TooltipItemData {
	content: ReactNode;
	side: Side;
	sideOffset: number;
}

const TooltipItemContext =
	createContext<React.RefObject<TooltipItemData> | null>(null);

/** Grace period (ms) before the tooltip unmounts — keeps it alive while
 *  the pointer travels between adjacent triggers so the spring can slide. */
const HIDE_GRACE_MS = 150;

/* ─── Position math ─── */

function calcPosition(
	rect: DOMRect,
	side: Side,
	offset: number,
): { x: number; y: number } {
	switch (side) {
		case "right":
			return { x: rect.right + offset, y: rect.top + rect.height / 2 };
		case "left":
			return { x: rect.left - offset, y: rect.top + rect.height / 2 };
		case "top":
			return { x: rect.left + rect.width / 2, y: rect.top - offset };
		case "bottom":
		default:
			return { x: rect.left + rect.width / 2, y: rect.bottom + offset };
	}
}

const SLIDE_PX = 4;

function withEntryOffset(side: Side, pos: { x: number; y: number }) {
	switch (side) {
		case "right":
			return { x: pos.x - SLIDE_PX, y: pos.y };
		case "left":
			return { x: pos.x + SLIDE_PX, y: pos.y };
		case "top":
			return { x: pos.x, y: pos.y + SLIDE_PX };
		case "bottom":
			return { x: pos.x, y: pos.y - SLIDE_PX };
	}
}

/* ─── Shared floating element ─── */

function SlidingFloat({
	state,
	lastPos,
}: {
	state: SlidingState | null;
	lastPos: { x: number; y: number };
}) {
	const side = state?.side ?? "right";
	const vertical = side === "right" || side === "left";

	return (
		<AnimatePresence>
			{state && (
				<motion.div
					key="sliding-tooltip"
					role="tooltip"
					className="fixed top-0 left-0 pointer-events-none z-50"
					initial={{ opacity: 0, ...withEntryOffset(side, state) }}
					animate={{ opacity: 1, x: state.x, y: state.y }}
					exit={{ opacity: 0, ...withEntryOffset(side, lastPos) }}
					transition={{
						...(vertical
							? {
									y: { type: "spring", stiffness: 500, damping: 30 },
									x: { duration: 0.15 },
								}
							: {
									x: { type: "spring", stiffness: 500, damping: 30 },
									y: { duration: 0.15 },
								}),
						opacity: { duration: 0.15 },
					}}
				>
					<div
						className={cn(
							side === "right" && "-translate-y-1/2",
							side === "left" && "-translate-x-full -translate-y-1/2",
							side === "top" && "-translate-x-1/2 -translate-y-full",
							side === "bottom" && "-translate-x-1/2",
						)}
					>
						<div className="bg-foreground text-background rounded-md px-3 py-1.5 text-xs whitespace-nowrap text-balance">
							{state.content}
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

/* ─── Internal provider for sliding mode ─── */

function SlidingProvider({ children }: { children: ReactNode }) {
	const [state, setState] = useState<SlidingState | null>(null);
	const lastPos = useRef({ x: 0, y: 0 });
	const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
		undefined,
	);
	const active = useRef(false);

	useEffect(() => () => clearTimeout(hideTimer.current), []);

	const show = useCallback(
		(
			content: ReactNode,
			trigger: HTMLElement,
			side: Side,
			sideOffset: number,
		) => {
			active.current = true;
			clearTimeout(hideTimer.current);
			const pos = calcPosition(
				trigger.getBoundingClientRect(),
				side,
				sideOffset,
			);
			lastPos.current = pos;
			setState({ content, side, ...pos });
		},
		[],
	);

	const hide = useCallback(() => {
		active.current = false;
		hideTimer.current = setTimeout(() => {
			if (!active.current) setState(null);
		}, HIDE_GRACE_MS);
	}, []);

	const ctx = useMemo(() => ({ show, hide }), [show, hide]);

	return (
		<SlidingContext.Provider value={ctx}>
			{children}
			<SlidingFloat state={state} lastPos={lastPos.current} />
		</SlidingContext.Provider>
	);
}

/* ═══════════════════════════════════════════════════════
   Public API — drop-in compatible with shadcn / Radix
   ═══════════════════════════════════════════════════════ */

function TooltipProvider({
	sliding,
	delayDuration = 0,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & {
	sliding?: boolean;
}) {
	if (sliding) {
		return <SlidingProvider>{props.children}</SlidingProvider>;
	}

	return (
		<TooltipPrimitive.Provider
			data-slot="tooltip-provider"
			delayDuration={delayDuration}
			{...props}
		/>
	);
}

function Tooltip({
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
	const sliding = useContext(SlidingContext);
	const dataRef = useRef<TooltipItemData>({
		content: null,
		side: "top",
		sideOffset: 6,
	});

	if (sliding) {
		return (
			<TooltipItemContext.Provider value={dataRef}>
				{children}
			</TooltipItemContext.Provider>
		);
	}

	return (
		<TooltipPrimitive.Root data-slot="tooltip" {...props}>
			{children}
		</TooltipPrimitive.Root>
	);
}

function TooltipTrigger({
	children,
	asChild,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
	const sliding = useContext(SlidingContext);
	const item = useContext(TooltipItemContext);

	if (sliding && item) {
		const onPointerEnter = (e: React.PointerEvent) => {
			const d = item.current;
			sliding.show(
				d.content,
				e.currentTarget as HTMLElement,
				d.side,
				d.sideOffset,
			);
		};
		const onPointerLeave = () => sliding.hide();
		const onFocus = (e: React.FocusEvent) => {
			const d = item.current;
			sliding.show(
				d.content,
				e.currentTarget as HTMLElement,
				d.side,
				d.sideOffset,
			);
		};
		const onBlur = () => sliding.hide();

		const merged = {
			"data-slot": "tooltip-trigger",
			...props,
			onPointerEnter,
			onPointerLeave,
			onFocus,
			onBlur,
		};

		if (asChild) {
			return <Slot.Root {...merged}>{children}</Slot.Root>;
		}

		return (
			<button type="button" {...merged}>
				{children}
			</button>
		);
	}

	return (
		<TooltipPrimitive.Trigger
			data-slot="tooltip-trigger"
			asChild={asChild}
			{...props}
		>
			{children}
		</TooltipPrimitive.Trigger>
	);
}

function TooltipContent({
	className,
	sideOffset = 6,
	side = "top",
	children,
	...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
	const sliding = useContext(SlidingContext);
	const item = useContext(TooltipItemContext);

	// In sliding mode, stash data for the trigger and render nothing —
	// the shared SlidingFloat handles the visual.
	if (sliding && item) {
		item.current = { content: children, side: side as Side, sideOffset };
		return null;
	}

	return (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				data-slot="tooltip-content"
				sideOffset={sideOffset}
				side={side}
				className={cn(
					"bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance",
					className,
				)}
				{...props}
			>
				{children}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
