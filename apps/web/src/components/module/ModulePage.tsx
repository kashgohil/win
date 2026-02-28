import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
	AutoHandledItem,
	ModuleData,
	TriageItem,
} from "@/lib/module-data";
import { MODULES, type Module, type ModuleKey } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import { ArrowRight, Check, ChevronDown, Sparkles } from "lucide-react";
import {
	AnimatePresence,
	motion,
	useMotionValue,
	useTransform,
} from "motion/react";
import { useState } from "react";
import { MOTION_CONSTANTS } from "../constant";

/* ── Props ── */

interface ModulePageProps<T extends AutoHandledItem = AutoHandledItem> {
	moduleKey: ModuleKey;
	data: ModuleData<T>;
	/** Called when a non-ghost triage action button is clicked */
	onAction?: (itemId: string, actionLabel: string) => void;
	/** Called when a triage item is dismissed (ghost button or swipe). Overrides local-only dismiss. */
	onDismiss?: (itemId: string) => void;
	/** Custom renderer for auto-handled cards (module-specific rendering) */
	renderAutoHandledCard?: (item: T, index: number) => React.ReactNode;
	/** Optional loading state — renders skeleton when true */
	isLoading?: boolean;
	/** Optional empty state rendered when provided and data has no content */
	emptyState?: React.ReactNode;
	/** Optional content rendered on the right side of the header title row */
	headerActions?: React.ReactNode;
	/** Optional content rendered at the bottom of the page, inside the scroll area */
	children?: React.ReactNode;
}

/* ── Helpers ── */

function getModule(key: ModuleKey): Module | undefined {
	return MODULES.find((m) => m.key === key);
}

function getModuleCode(key: ModuleKey): string {
	return MODULES.find((m) => m.key === key)?.code ?? key.toUpperCase();
}

/* ── Shared editorial section rule (consistent with dashboard) ── */

function SectionRule({
	label,
	count,
	accent,
}: {
	label: string;
	count?: number;
	accent?: boolean;
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
				{label}
			</span>
			<div className="flex-1 h-px bg-border/50" />
			{count !== undefined && (
				<span
					className={cn(
						"font-mono text-[10px] tabular-nums",
						accent ? "text-accent-red" : "text-grey-2",
					)}
				>
					{count}
				</span>
			)}
		</div>
	);
}

/* ── Main component ── */

export default function ModulePage<
	T extends AutoHandledItem = AutoHandledItem,
>({
	moduleKey,
	data,
	onAction,
	onDismiss: onDismissProp,
	renderAutoHandledCard,
	isLoading,
	emptyState,
	headerActions,
	children,
}: ModulePageProps<T>) {
	const mod = getModule(moduleKey);
	const [autoExpanded, setAutoExpanded] = useState(false);
	const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());

	const activeTriageItems = data.triage.filter(
		(item) => !dismissedItems.has(item.id),
	);
	const allClear = activeTriageItems.length === 0;

	const handleDismiss = (id: string) => {
		setDismissedItems((prev) => new Set([...prev, id]));
		onDismissProp?.(id);
	};

	if (isLoading) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<div className="flex items-start justify-between gap-4">
							<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
								{mod?.name}
							</h1>
							{headerActions && (
								<div className="shrink-0 mt-3">{headerActions}</div>
							)}
						</div>
						<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
							{mod?.description}
						</p>
					</motion.header>
					<div className="animate-pulse mt-8">
						<div className="grid grid-cols-3 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/30">
							{[0, 1, 2].map((i) => (
								<div
									key={i}
									className="bg-background px-4 py-4 flex flex-col items-center"
								>
									<div className="h-7 w-12 bg-secondary/30 rounded" />
									<div className="h-2 w-16 bg-secondary/20 rounded mt-2" />
								</div>
							))}
						</div>
						<div className="mt-10 space-y-3">
							{[0, 1, 2].map((i) => (
								<div key={i} className="rounded-lg border border-border/20 p-4">
									<div className="h-4 w-48 bg-secondary/30 rounded" />
									<div className="h-3 w-72 bg-secondary/20 rounded mt-2" />
								</div>
							))}
						</div>
					</div>
				</div>
			</ScrollArea>
		);
	}

	if (emptyState) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<div className="flex items-start justify-between gap-4">
							<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
								{mod?.name}
							</h1>
							{headerActions && (
								<div className="shrink-0 mt-3">{headerActions}</div>
							)}
						</div>
						<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
							{mod?.description}
						</p>
					</motion.header>
					{emptyState}
				</div>
			</ScrollArea>
		);
	}

	return (
		<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
			<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
				{/* ── Module header ── */}
				<motion.header
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
				>
					<div className="flex items-start justify-between gap-4">
						<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
							{mod?.name}
						</h1>
						{headerActions && (
							<div className="shrink-0 mt-3">{headerActions}</div>
						)}
					</div>
					<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
						{mod?.description}
					</p>
				</motion.header>

				{/* ── Briefing strip ── */}
				<motion.div
					className="mt-8"
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.08,
						ease: MOTION_CONSTANTS.EASE,
					}}
				>
					<BriefingStrip stats={data.briefing} />
				</motion.div>

				{/* ── Triage zone ── */}
				<motion.section
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.15,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className="mt-8"
				>
					<SectionRule
						label="Needs you"
						count={
							activeTriageItems.length > 0
								? activeTriageItems.length
								: undefined
						}
						accent
					/>

					<div className="mt-5">
						<AnimatePresence mode="popLayout">
							{allClear ? (
								<motion.div
									key="all-clear"
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										duration: 0.4,
										ease: MOTION_CONSTANTS.EASE,
									}}
									className="py-12 flex flex-col items-center gap-3"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{
											type: "spring",
											stiffness: 400,
											damping: 20,
											delay: 0.15,
										}}
										className="size-10 rounded-full bg-foreground/5 flex items-center justify-center"
									>
										<Check className="size-4 text-foreground/40" />
									</motion.div>
									<p className="font-serif text-[15px] text-grey-2 italic text-center">
										All clear — nothing needs your attention.
									</p>
								</motion.div>
							) : (
								activeTriageItems.map((item, i) => (
									<TriageCard
										key={item.id}
										item={item}
										index={i}
										onAction={
											onAction ? (label) => onAction(item.id, label) : undefined
										}
										onDismiss={() => handleDismiss(item.id)}
									/>
								))
							)}
						</AnimatePresence>
					</div>
				</motion.section>

				{/* ── Auto-handled zone ── */}
				<motion.section
					className={children ? "pb-4 mt-8" : "pb-16 mt-8"}
					initial={{ opacity: 0, y: 16 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.25,
						ease: MOTION_CONSTANTS.EASE,
					}}
				>
					<button
						type="button"
						onClick={() => setAutoExpanded((prev) => !prev)}
						className="w-full cursor-pointer"
					>
						<div className="flex items-center gap-3">
							<span className="flex items-center gap-1.5">
								<Sparkles className="size-3 text-grey-3" />
								<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
									Auto-handled
								</span>
							</span>
							<div className="flex-1 h-px bg-border/50" />
							<span className="font-mono text-[10px] text-grey-2 tabular-nums">
								{data.autoHandled.length}
							</span>
							<motion.div
								animate={{ rotate: autoExpanded ? 180 : 0 }}
								transition={{ duration: 0.2 }}
							>
								<ChevronDown className="size-3 text-grey-3" />
							</motion.div>
						</div>
					</button>

					<AnimatePresence>
						{autoExpanded && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{
									height: {
										duration: 0.3,
										ease: MOTION_CONSTANTS.EASE,
									},
									opacity: { duration: 0.2 },
								}}
								className="overflow-hidden"
							>
								<div className="mt-4 space-y-0">
									{data.autoHandled.map((item, i) =>
										renderAutoHandledCard ? (
											renderAutoHandledCard(item, i)
										) : (
											<DefaultAutoHandledCard
												key={item.id}
												item={item}
												index={i}
											/>
										),
									)}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.section>
			</div>
			{children}
		</ScrollArea>
	);
}

/* ── Briefing strip ── */

function BriefingStrip({ stats }: { stats: ModuleData["briefing"] }) {
	return (
		<div className="grid grid-cols-3 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/30">
			{stats.map((stat) => (
				<div
					key={stat.label}
					className="bg-background px-4 py-4 flex flex-col items-center text-center"
				>
					<span
						className={cn(
							"font-display text-[clamp(1.5rem,3vw,2rem)] leading-none tracking-tight",
							stat.accent ? "text-accent-red" : "text-foreground",
						)}
					>
						{stat.value}
					</span>
					<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50 mt-1.5">
						{stat.label}
					</span>
					{stat.trend && (
						<span
							className={cn(
								"font-mono text-[9px] mt-1",
								stat.trend === "up"
									? "text-accent-red"
									: stat.trend === "down"
										? "text-foreground/50"
										: "text-grey-3",
							)}
						>
							{stat.trend === "up"
								? "\u2191"
								: stat.trend === "down"
									? "\u2193"
									: "\u2014"}
						</span>
					)}
				</div>
			))}
		</div>
	);
}

/* ── Triage card ── */

function TriageCard({
	item,
	index,
	onAction,
	onDismiss,
}: {
	item: TriageItem;
	index: number;
	onAction?: (actionLabel: string) => void;
	onDismiss: () => void;
}) {
	const x = useMotionValue(0);
	const dragOpacity = useTransform(x, [-200, 0], [0, 1]);
	const dragScale = useTransform(x, [-200, 0], [0.95, 1]);

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 16, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			exit={{
				opacity: 0,
				x: -60,
				scale: 0.95,
				transition: { duration: 0.25, ease: MOTION_CONSTANTS.EASE },
			}}
			transition={{
				delay: index * 0.06,
				duration: 0.4,
				ease: MOTION_CONSTANTS.EASE,
				layout: { type: "spring", stiffness: 350, damping: 30 },
			}}
			className="group relative mb-3 last:mb-0"
		>
			<motion.div
				style={{ x, opacity: dragOpacity, scale: dragScale }}
				drag="x"
				dragConstraints={{ left: 0, right: 0 }}
				dragElastic={0.15}
				onDragEnd={(_, info) => {
					if (info.offset.x < -120) {
						onDismiss();
					}
				}}
			>
				<div
					className={cn(
						"relative rounded-lg border border-border/40 bg-background hover:border-border/70 transition-colors duration-200 overflow-hidden",
						item.urgent
							? "border-accent-red/50 border-l-4 hover:border-accent-red/70"
							: "border-border/40",
					)}
				>
					<div className="p-4 pl-5">
						{/* Header row */}
						<div className="flex items-start justify-between gap-3">
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									{item.urgent && (
										<span className="size-1.5 rounded-full bg-accent-red shrink-0" />
									)}
									<h3 className="font-body text-[15px] text-foreground tracking-[0.01em] leading-snug truncate">
										{item.title}
									</h3>
								</div>
								{item.subtitle && (
									<p className="font-body text-[13px] text-grey-2 leading-relaxed mt-1.5">
										{item.subtitle}
									</p>
								)}
							</div>
							<div className="flex items-center gap-2 shrink-0">
								{item.sourceModule && (
									<Badge
										variant="outline"
										className="font-mono text-[9px] tracking-widest uppercase border-border/40 text-grey-3 px-1.5 py-0"
									>
										<ArrowRight className="size-2.5" />
										{getModuleCode(item.sourceModule)}
									</Badge>
								)}
								<span className="font-mono text-[10px] text-grey-3">
									{item.timestamp}
								</span>
							</div>
						</div>

						{/* Action row */}
						<div className="flex items-center gap-2 mt-4">
							{item.actions.map((action) => (
								<Button
									key={action.label}
									variant={action.variant ?? "default"}
									size="sm"
									onClick={
										action.variant === "ghost"
											? onDismiss
											: onAction
												? () => onAction(action.label)
												: undefined
									}
									className={cn(
										"font-mono text-[11px] tracking-[0.02em] h-7 px-3",
										action.variant === "default" &&
											"bg-foreground text-background hover:bg-foreground/90",
										action.variant === "ghost" && "text-grey-3",
									)}
								>
									{action.label}
								</Button>
							))}
						</div>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}

/* ── Default auto-handled card (generic, module-agnostic) ── */

function DefaultAutoHandledCard({
	item,
	index,
}: {
	item: AutoHandledItem;
	index: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				delay: index * 0.04,
				duration: 0.3,
				ease: MOTION_CONSTANTS.EASE,
			}}
			className="mb-2 last:mb-0"
		>
			<div className="rounded-lg border border-border/30 hover:border-border/50 transition-colors duration-200 px-3.5 py-2.5">
				<div className="flex items-center gap-2 min-w-0">
					<Check className="size-3 text-foreground/25 shrink-0" />
					<span className="font-body text-[13px] text-foreground/70 tracking-[0.01em] truncate min-w-0">
						{item.text}
					</span>
					<span className="font-mono text-[10px] text-grey-3 tabular-nums shrink-0 ml-auto">
						{item.timestamp}
					</span>
				</div>
			</div>
		</motion.div>
	);
}
