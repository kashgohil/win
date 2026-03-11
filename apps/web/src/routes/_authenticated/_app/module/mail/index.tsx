import { MOTION_CONSTANTS } from "@/components/constant";
import { AccountSelector } from "@/components/mail/AccountSelector";
import { ActionablesWidget } from "@/components/mail/ActionablesWidget";
import { CATEGORY_CONFIG } from "@/components/mail/category-colors";
import {
	KeyboardShortcutBar,
	MAIL_HUB_SHORTCUTS,
} from "@/components/mail/KeyboardShortcutBar";
import {
	MailAutoHandledCard,
	type MailAutoHandledItem,
} from "@/components/mail/MailAutoHandledCard";
import { SettingsSheet } from "@/components/mail/SettingsSheet";
import { AccountHealthWidget } from "@/components/mail/widgets/AccountHealthWidget";
import { RecentAttachmentsWidget } from "@/components/mail/widgets/RecentAttachmentsWidget";
import { RecentThreadsWidget } from "@/components/mail/widgets/RecentThreadsWidget";
import { SavedSearchesWidget } from "@/components/mail/widgets/SavedSearchesWidget";
import { VipSendersWidget } from "@/components/mail/widgets/VipSendersWidget";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openCompose } from "@/hooks/use-compose";
import { mailKeys, useMailEmailsInfinite } from "@/hooks/use-mail";
import {
	groupIntoRows,
	type MailWidgetEntry,
	type MailWidgetId,
	useMailWidgets,
	WIDGET_REGISTRY,
} from "@/hooks/use-mail-widgets";
import {
	mailAccountsCollection,
	mailAutoHandledCollection,
	mailBriefingCollection,
} from "@/lib/mail-collections";
import type { ModuleKey } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	type DragMoveEvent,
	DragOverlay,
	PointerSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailCategory } from "@wingmnn/types";
import {
	Activity,
	ArrowRight,
	Bookmark,
	ChevronDown,
	Compass,
	FileText,
	GripVertical,
	Inbox,
	LayoutGrid,
	Paperclip,
	Pen,
	Plus,
	Send,
	Sparkles,
	Users,
	X,
	Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

type MailSearch = {
	connected?: string;
	error?: string;
};

export const Route = createFileRoute("/_authenticated/_app/module/mail/")({
	component: MailHub,
	validateSearch: (search: Record<string, unknown>): MailSearch => ({
		connected: search.connected as string | undefined,
		error: search.error as string | undefined,
	}),
});

/* ── Widget icon map ── */

const WIDGET_ICONS: Record<MailWidgetId, React.ReactNode> = {
	actionables: <Zap className="size-3" />,
	category_breakdown: <LayoutGrid className="size-3" />,
	recent_threads: <Inbox className="size-3" />,
	vip_senders: <Users className="size-3" />,
	recent_attachments: <Paperclip className="size-3" />,
	auto_handled: <Sparkles className="size-3" />,
	saved_searches: <Bookmark className="size-3" />,
	account_health: <Activity className="size-3" />,
	quick_nav: <Compass className="size-3" />,
};

/* ── Drop indicator type ── */

type DropIndicator = {
	targetId: MailWidgetId;
	position: "before" | "after" | "left" | "right";
};

/* ── Main component ── */

function MailHub() {
	const { data: autoHandled, isLoading: autoLoading } = useLiveQuery(
		mailAutoHandledCollection,
	);
	const { data: briefing, isLoading: briefingLoading } = useLiveQuery(
		mailBriefingCollection,
	);
	const {
		data: accounts,
		isLoading: accountsLoading,
		isError: accountsError,
	} = useLiveQuery(mailAccountsCollection);
	const { data: unreadData } = useMailEmailsInfinite({
		unreadOnly: true,
		limit: 100,
	});

	const isPending = autoLoading || briefingLoading || accountsLoading;

	const { connected, error } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeId, setActiveId] = useState<MailWidgetId | null>(null);
	const [showAddTray, setShowAddTray] = useState(false);

	const { layout, enabledIds, toggleWidget, updateLayout, updateWidths } =
		useMailWidgets();
	const [removingId, setRemovingId] = useState<MailWidgetId | null>(null);

	const handleRemove = useCallback(
		(id: MailWidgetId) => {
			setRemovingId(id);
			setTimeout(() => {
				toggleWidget(id);
				setRemovingId(null);
			}, 250);
		},
		[toggleWidget],
	);

	/* ── DnD ── */
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
	);

	const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(
		null,
	);
	const dropIndicatorRef = useRef<DropIndicator | null>(null);
	dropIndicatorRef.current = dropIndicator;
	const [activeWidth, setActiveWidth] = useState(0);

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const { over, activatorEvent, delta } = event;
			if (!over || over.id === event.active.id) {
				setDropIndicator(null);
				return;
			}

			const startEvent = activatorEvent as PointerEvent;
			if (!startEvent) {
				setDropIndicator(null);
				return;
			}

			const pointerX = startEvent.clientX + delta.x;
			const pointerY = startEvent.clientY + delta.y;

			const el = document.querySelector(`[data-widget-id="${over.id}"]`);
			if (!el) {
				setDropIndicator(null);
				return;
			}

			const rect = el.getBoundingClientRect();
			const relX = (pointerX - rect.left) / rect.width;
			const relY = (pointerY - rect.top) / rect.height;

			let position: DropIndicator["position"];
			// Top/bottom edges always trigger vertical placement
			if (relY < 0.25) position = "before";
			else if (relY > 0.75) position = "after";
			// Middle band: check horizontal edges for side drops
			else if (relX < 0.3) position = "left";
			else if (relX > 0.7) position = "right";
			// Center fallback: split by vertical half
			else if (relY < 0.5) position = "before";
			else position = "after";

			// Suppress indicators that would drop the widget back in its original spot
			const activeIdx = layout.findIndex((e) => e.id === event.active.id);
			const targetIdx = layout.findIndex(
				(e) => e.id === (over.id as MailWidgetId),
			);
			if (activeIdx !== -1 && targetIdx !== -1) {
				// "after" on the widget right before → same position
				if (position === "after" && targetIdx === activeIdx - 1) {
					setDropIndicator(null);
					return;
				}
				// "before" on the widget right after → same position
				if (position === "before" && targetIdx === activeIdx + 1) {
					setDropIndicator(null);
					return;
				}
			}

			setDropIndicator((prev) => {
				if (
					prev?.targetId === (over.id as MailWidgetId) &&
					prev?.position === position
				)
					return prev;
				return { targetId: over.id as MailWidgetId, position };
			});
		},
		[layout],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active } = event;
			setActiveId(null);

			const indicator = dropIndicatorRef.current;
			setDropIndicator(null);

			if (!indicator || active.id === indicator.targetId) return;

			const activeIdx = layout.findIndex((e) => e.id === active.id);
			if (activeIdx === -1) return;

			const newLayout = [...layout];
			const [moved] = newLayout.splice(activeIdx, 1);

			const targetIdx = newLayout.findIndex((e) => e.id === indicator.targetId);
			if (targetIdx === -1) return;

			if (indicator.position === "before" || indicator.position === "left") {
				newLayout.splice(targetIdx, 0, moved);
			} else {
				newLayout.splice(targetIdx + 1, 0, moved);
			}

			const movedNewIdx = newLayout.findIndex((e) => e.id === moved.id);

			if (indicator.position === "left" || indicator.position === "right") {
				// Side drop: set both to 0.5 so they share a row
				const targetNewIdx = newLayout.findIndex(
					(e) => e.id === indicator.targetId,
				);
				const movedDef = WIDGET_REGISTRY.find((w) => w.id === moved.id);
				const targetDef = WIDGET_REGISTRY.find(
					(w) => w.id === indicator.targetId,
				);
				const movedMin = movedDef?.minWidth ?? 0.2;
				const targetMin = targetDef?.minWidth ?? 0.2;

				newLayout[movedNewIdx] = {
					...newLayout[movedNewIdx],
					width: Math.max(0.5, movedMin),
				};
				newLayout[targetNewIdx] = {
					...newLayout[targetNewIdx],
					width: Math.max(0.5, targetMin),
				};

				// Ensure the pair starts on a new row by filling any partial row before them
				const pairStartIdx = Math.min(movedNewIdx, targetNewIdx);
				if (pairStartIdx > 0) {
					let rowSum = 0;
					for (let i = 0; i < pairStartIdx; i++) {
						if (rowSum + newLayout[i].width > 1.01) {
							rowSum = newLayout[i].width;
						} else {
							rowSum += newLayout[i].width;
						}
					}
					// If the last row before the pair has leftover space,
					// it would pull the first pair member in — expand to fill
					if (rowSum > 0 && rowSum < 0.99) {
						newLayout[pairStartIdx - 1] = {
							...newLayout[pairStartIdx - 1],
							width: newLayout[pairStartIdx - 1].width + (1 - rowSum),
						};
					}
				}
			} else {
				// Vertical drop: set moved widget to full width so it gets its own row
				newLayout[movedNewIdx] = {
					...newLayout[movedNewIdx],
					width: 1,
				};
			}

			updateLayout(newLayout);
		},
		[layout, updateLayout],
	);

	useEffect(() => {
		if (connected) {
			toast.success("Gmail connected — syncing your inbox...");
			queryClient.invalidateQueries({ queryKey: mailKeys.accounts() });
			navigate({ replace: true });
		} else if (error) {
			const message =
				error === "access_denied"
					? "Access was denied. Please try again."
					: `Connection failed: ${error}`;
			toast.error(message);
			navigate({ replace: true });
		}
	}, [connected, error, navigate, queryClient]);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey
			) {
				return;
			}
			switch (e.key) {
				case "c":
					e.preventDefault();
					openCompose({ mode: "compose" });
					break;
				case "i":
					e.preventDefault();
					navigate({
						to: "/module/mail/inbox",
						search: {
							view: undefined,
							starred: undefined,
							attachment: undefined,
						},
					});
					break;
				case "s":
					e.preventDefault();
					navigate({
						to: "/module/mail/sent",
						search: { starred: undefined, attachment: undefined },
					});
					break;
				case "a":
					e.preventDefault();
					navigate({ to: "/module/mail/attachments" });
					break;
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [navigate]);

	const handleViewEmail = (emailId: string) => {
		navigate({
			to: "/module/mail/inbox/$emailId",
			params: { emailId },
			search: { view: undefined, category: undefined },
		});
	};

	const hasAccounts = !accountsError && accounts && accounts.length > 0;

	const categoryPulse = useMemo(() => {
		const allEmails = unreadData?.pages?.flatMap((p) => p?.emails ?? []) ?? [];
		const counts: Partial<Record<EmailCategory, number>> = {};
		for (const email of allEmails) {
			if (email.category) {
				counts[email.category] = (counts[email.category] ?? 0) + 1;
			}
		}
		return Object.entries(counts)
			.map(([cat, count]) => ({
				category: cat as EmailCategory,
				count: count as number,
			}))
			.sort((a, b) => b.count - a.count);
	}, [unreadData]);

	const autoHandledItems: MailAutoHandledItem[] = (autoHandled ?? []).map(
		(a) => ({
			...a,
			linkedModule: a.linkedModule as ModuleKey | undefined,
		}),
	);

	const unreadStat = briefing?.find(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === "unread",
	);
	const autoHandledStat = briefing?.find(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === "autohandled",
	);
	const unreadCount = Number(unreadStat?.value ?? 0);
	const autoHandledCount = Number(autoHandledStat?.value ?? 0);

	const availableWidgets = WIDGET_REGISTRY.filter((w) => !enabledIds.has(w.id));

	const rows = useMemo(() => groupIntoRows(layout), [layout]);

	const activeEntry = activeId ? layout.find((e) => e.id === activeId) : null;

	/* ── No account connected ── */
	if (!isPending && !hasAccounts) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<MailHeader />
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: 0.15,
							duration: 0.5,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="mt-16 flex flex-col items-center text-center"
					>
						<div className="size-14 rounded-full bg-foreground/5 flex items-center justify-center mb-5">
							<Inbox className="size-6 text-foreground/30" />
						</div>
						<h2 className="font-display text-[20px] text-foreground tracking-[0.01em]">
							Connect your email
						</h2>
						<p className="font-body text-[14px] text-grey-2 mt-2 max-w-sm leading-relaxed">
							Link your Gmail or Outlook account to get started. We'll sync your
							inbox, categorize emails, and surface what needs your attention.
						</p>
						<button
							type="button"
							onClick={() => setSettingsOpen(true)}
							className="mt-6 font-mono text-[12px] tracking-[0.04em] uppercase px-5 py-2.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
						>
							Connect account
						</button>
						<SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
					</motion.div>
				</div>
			</ScrollArea>
		);
	}

	/* ── Loading state ── */
	if (isPending) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<MailHeader />
					<div className="animate-pulse mt-10 space-y-8">
						<div className="h-5 w-72 bg-secondary/30 rounded" />
						<div className="space-y-3">
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

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto pb-32">
					<MailHeader
						hasAvailableWidgets={availableWidgets.length > 0}
						onToggleAddTray={() => setShowAddTray((p) => !p)}
					/>

					{/* Briefing sentence */}
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
						<BriefingSentence
							unread={unreadCount}
							autoHandled={autoHandledCount}
						/>
					</motion.div>

					{/* Widget grid with DnD */}
					<DndContext
						sensors={sensors}
						collisionDetection={closestCorners}
						onDragStart={(e) => {
							setActiveId(e.active.id as MailWidgetId);
							const el = document.querySelector(
								`[data-widget-id="${e.active.id}"]`,
							);
							if (el) setActiveWidth(el.getBoundingClientRect().width);
						}}
						onDragMove={handleDragMove}
						onDragEnd={handleDragEnd}
						onDragCancel={() => {
							setActiveId(null);
							setDropIndicator(null);
						}}
					>
						<div className="mt-8 flex flex-col gap-8">
							{rows.map((row) => {
								const rowTotal = row.reduce((s, e) => s + e.width, 0);
								const rowKey = row.map((e) => e.id).join("|");

								// Check for vertical drop targets in this row
								const hasBefore =
									activeId &&
									row.some(
										(e) =>
											dropIndicator?.targetId === e.id &&
											dropIndicator?.position === "before",
									);
								const hasAfter =
									activeId &&
									row.some(
										(e) =>
											dropIndicator?.targetId === e.id &&
											dropIndicator?.position === "after",
									);

								return (
									<Fragment key={rowKey}>
										{/* Vertical placeholder above row */}
										{hasBefore && activeId && (
											<DropPlaceholder widgetId={activeId} />
										)}

										<div
											className="flex items-stretch"
											style={{ gap: 24 }}
											data-widget-row
										>
											{row.map((entry, colIdx) => {
												const hasRightNeighbor = colIdx < row.length - 1;
												const isLeftTarget =
													activeId &&
													dropIndicator?.targetId === entry.id &&
													dropIndicator?.position === "left";
												const isRightTarget =
													activeId &&
													dropIndicator?.targetId === entry.id &&
													dropIndicator?.position === "right";

												return (
													<Fragment key={entry.id}>
														{/* Side placeholder on left */}
														{isLeftTarget && activeId && (
															<div
																className="min-w-0"
																style={{ flex: "1 1 0%" }}
															>
																<DropPlaceholder widgetId={activeId} />
															</div>
														)}

														<div
															className="relative min-w-0"
															style={{
																flex: `${entry.width / rowTotal} 1 0%`,
															}}
														>
															<WidgetShell
																entry={entry}
																delay={
																	0.1 +
																	layout.findIndex((e) => e.id === entry.id) *
																		0.06
																}
																collapsible={entry.id === "auto_handled"}
																count={
																	entry.id === "auto_handled"
																		? autoHandledItems.length
																		: undefined
																}
																removing={removingId === entry.id}
																onRemove={() => handleRemove(entry.id)}
															>
																<WidgetContent
																	widgetId={entry.id}
																	categoryPulse={categoryPulse}
																	autoHandledItems={autoHandledItems}
																	handleViewEmail={handleViewEmail}
																/>
															</WidgetShell>

															{/* Resize handle between side-by-side widgets */}
															{hasRightNeighbor && (
																<WidgetResizeHandle
																	entryId={entry.id}
																	entryWidth={entry.width}
																	rightNeighborId={row[colIdx + 1].id}
																	rightNeighborWidth={row[colIdx + 1].width}
																	onWidthsChange={updateWidths}
																/>
															)}
														</div>

														{/* Side placeholder on right */}
														{isRightTarget && activeId && (
															<div
																className="min-w-0"
																style={{ flex: "1 1 0%" }}
															>
																<DropPlaceholder widgetId={activeId} />
															</div>
														)}
													</Fragment>
												);
											})}
										</div>

										{/* Vertical placeholder below row */}
										{hasAfter && activeId && (
											<DropPlaceholder widgetId={activeId} />
										)}
									</Fragment>
								);
							})}
						</div>

						{/* Drag overlay — shows actual widget content */}
						<DragOverlay dropAnimation={null}>
							{activeEntry ? (
								<div
									style={{ width: activeWidth || "auto" }}
									className="rounded-xl border border-border/50 bg-background/95 backdrop-blur-sm shadow-xl opacity-95 overflow-hidden"
								>
									<WidgetHeader
										widgetId={activeEntry.id}
										count={
											activeEntry.id === "auto_handled"
												? autoHandledItems.length
												: undefined
										}
									/>
									<div className="max-h-[300px] overflow-hidden pointer-events-none">
										<WidgetContent
											widgetId={activeEntry.id}
											categoryPulse={categoryPulse}
											autoHandledItems={autoHandledItems}
											handleViewEmail={handleViewEmail}
										/>
									</div>
								</div>
							) : null}
						</DragOverlay>
					</DndContext>

					{/* Add widget button */}
					{availableWidgets.length > 0 && (
						<div className="mt-6">
							<button
								type="button"
								onClick={() => setShowAddTray((p) => !p)}
								className="inline-flex items-center gap-1.5 font-mono text-[11px] text-grey-3 hover:text-foreground tracking-[0.03em] transition-colors cursor-pointer"
							>
								<Plus className="size-3" />
								{showAddTray ? "Hide widgets" : "Add widget"}
							</button>

							<AnimatePresence>
								{showAddTray && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{
											opacity: 1,
											height: "auto",
										}}
										exit={{ opacity: 0, height: 0 }}
										transition={{
											duration: 0.25,
											ease: MOTION_CONSTANTS.EASE,
										}}
										className="overflow-hidden"
									>
										<div className="grid grid-cols-2 gap-3 mt-3">
											{availableWidgets.map((widget) => (
												<button
													key={widget.id}
													type="button"
													onClick={() => toggleWidget(widget.id)}
													className="text-left rounded-lg border border-dashed border-border/40 hover:border-border/70 px-4 py-3 transition-colors cursor-pointer group col-span-2 md:col-span-1"
												>
													<div className="flex items-center gap-2">
														<div className="size-6 rounded-md bg-foreground/4 flex items-center justify-center shrink-0">
															<Plus className="size-3 text-grey-3 group-hover:text-foreground transition-colors" />
														</div>
														<div className="min-w-0">
															<p className="font-body text-[13px] text-foreground/60 group-hover:text-foreground transition-colors">
																{widget.label}
															</p>
															<p className="font-body text-[11px] text-grey-3/60 truncate">
																{widget.description}
															</p>
														</div>
													</div>
												</button>
											))}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					)}
				</div>
			</ScrollArea>

			<KeyboardShortcutBar shortcuts={MAIL_HUB_SHORTCUTS} />
		</>
	);
}

/* ── Resize handle between two side-by-side widgets ── */

function WidgetResizeHandle({
	entryId,
	entryWidth,
	rightNeighborId,
	rightNeighborWidth,
	onWidthsChange,
}: {
	entryId: MailWidgetId;
	entryWidth: number;
	rightNeighborId: MailWidgetId;
	rightNeighborWidth: number;
	onWidthsChange: (
		leftId: MailWidgetId,
		leftW: number,
		rightId: MailWidgetId,
		rightW: number,
	) => void;
}) {
	const [dragging, setDragging] = useState(false);
	const stateRef = useRef({
		startX: 0,
		entryW: 0,
		neighborW: 0,
		containerW: 1,
	});
	const rafRef = useRef(0);

	const entryMin =
		WIDGET_REGISTRY.find((w) => w.id === entryId)?.minWidth ?? 0.2;
	const neighborMin =
		WIDGET_REGISTRY.find((w) => w.id === rightNeighborId)?.minWidth ?? 0.2;

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			e.preventDefault();
			e.stopPropagation();
			(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
			setDragging(true);

			const rowEl = (e.currentTarget as HTMLElement).closest(
				"[data-widget-row]",
			) as HTMLElement | null;

			stateRef.current = {
				startX: e.clientX,
				entryW: entryWidth,
				neighborW: rightNeighborWidth,
				containerW: rowEl?.offsetWidth ?? 1,
			};

			const onMove = (me: PointerEvent) => {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = requestAnimationFrame(() => {
					const { startX, entryW, neighborW, containerW } = stateRef.current;
					const deltaPx = me.clientX - startX;
					const deltaFrac = containerW > 0 ? deltaPx / containerW : 0;

					const total = entryW + neighborW;
					let newLeft = entryW + deltaFrac;
					let newRight = neighborW - deltaFrac;

					if (newLeft < entryMin) {
						newLeft = entryMin;
						newRight = total - entryMin;
					}
					if (newRight < neighborMin) {
						newRight = neighborMin;
						newLeft = total - neighborMin;
					}

					onWidthsChange(entryId, newLeft, rightNeighborId, newRight);
				});
			};

			const onUp = () => {
				cancelAnimationFrame(rafRef.current);
				setDragging(false);
				document.removeEventListener("pointermove", onMove);
				document.removeEventListener("pointerup", onUp);
			};

			document.addEventListener("pointermove", onMove);
			document.addEventListener("pointerup", onUp);
		},
		[
			entryWidth,
			rightNeighborWidth,
			entryId,
			rightNeighborId,
			entryMin,
			neighborMin,
			onWidthsChange,
		],
	);

	return (
		<div
			onPointerDown={handlePointerDown}
			className="absolute top-0 bottom-0 -right-[9px] w-[2px] cursor-col-resize z-20 group/resize"
		>
			{/* Wide invisible hit area */}
			<div className="absolute inset-y-0 -left-[7px] -right-[7px]" />
			{/* Visible line — only on hover or drag */}
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-[2px] rounded-full transition-opacity duration-150",
					"bg-foreground/30 opacity-0 group-hover/resize:opacity-100",
					dragging && "opacity-100! bg-foreground/40!",
				)}
			/>
		</div>
	);
}

/* ── Widget shell with drag + drop ── */

function WidgetShell({
	entry,
	delay,
	collapsible,
	count,
	removing,
	onRemove,
	children,
}: {
	entry: MailWidgetEntry;
	delay: number;
	collapsible?: boolean;
	count?: number;
	removing?: boolean;
	onRemove: () => void;
	children: React.ReactNode;
}) {
	const [collapsed, setCollapsed] = useState(collapsible ? true : false);
	const def = WIDGET_REGISTRY.find((w) => w.id === entry.id);
	const pinned = def?.pinned;
	const title = def?.label ?? entry.id;
	const icon = WIDGET_ICONS[entry.id];

	const {
		attributes,
		listeners,
		setNodeRef: setDragRef,
		isDragging,
	} = useDraggable({ id: entry.id });
	const { setNodeRef: setDropRef } = useDroppable({ id: entry.id });

	const mergedRef = useCallback(
		(node: HTMLElement | null) => {
			setDragRef(node);
			setDropRef(node);
		},
		[setDragRef, setDropRef],
	);

	// Placeholder when being dragged
	// if (isDragging) {
	// 	return (
	// 		<div
	// 			ref={mergedRef}
	// 			data-widget-id={entry.id}
	// 			className="rounded-xl border-2 border-dashed border-border/50 bg-secondary/5 flex items-center justify-center gap-2 h-full min-h-[60px]"
	// 		>
	// 			{icon && <span className="text-grey-3/50">{icon}</span>}
	// 			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3/50">
	// 				{title}
	// 			</span>
	// 		</div>
	// 	);
	// }

	return (
		<motion.section
			ref={mergedRef}
			data-widget-id={entry.id}
			initial={{ opacity: 0, y: 16 }}
			animate={{
				opacity: removing ? 0 : 1,
				y: removing ? -8 : 0,
				scale: removing ? 0.97 : 1,
			}}
			transition={{
				duration: removing ? 0.25 : 0.5,
				delay: removing ? 0 : delay,
				ease: MOTION_CONSTANTS.EASE,
			}}
			className={cn(
				"group/widget relative",
				isDragging &&
					"border border-dashed border-border/50 bg-secondary/5 overflow-hidden rounded-lg",
			)}
		>
			{isDragging && (
				<div className="absolute inset-0 flex items-center justify-center z-1 bg-background gap-3">
					{icon && <span className="text-grey-3/50">{icon}</span>}
					<span className="font-mono text-lg font-medium uppercase tracking-[0.14em] text-grey-3/50">
						{title}
					</span>
				</div>
			)}
			{/* Header — actions slide in on hover */}
			{collapsible ? (
				<div className="flex items-center mb-3">
					{/* Drag handle — slides in from left */}
					<div
						className="w-0 opacity-0 group-hover/widget:w-5 group-hover/widget:opacity-100 overflow-hidden transition-all duration-200 ease-out shrink-0"
						{...listeners}
						{...attributes}
					>
						<GripVertical className="size-3 text-grey-3 cursor-grab active:cursor-grabbing" />
					</div>

					<button
						type="button"
						onClick={() => setCollapsed((prev) => !prev)}
						className="flex-1 flex items-center gap-3 cursor-pointer min-w-0"
					>
						{icon && <span className="text-grey-3">{icon}</span>}
						<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
							{title}
						</span>
						<div className="flex-1 h-px bg-border/50" />
						{count !== undefined && (
							<span className="font-mono text-[10px] text-grey-2 tabular-nums">
								{count}
							</span>
						)}
						<motion.div
							animate={{ rotate: collapsed ? 0 : 180 }}
							transition={{ duration: 0.2 }}
						>
							<ChevronDown className="size-3 text-grey-3" />
						</motion.div>
					</button>

					{!pinned && (
						<div className="w-0 opacity-0 group-hover/widget:w-5 group-hover/widget:opacity-100 overflow-hidden transition-all duration-200 ease-out shrink-0 flex justify-end">
							<button
								type="button"
								onClick={onRemove}
								className="p-0.5 text-grey-3 hover:text-accent-red cursor-pointer"
								title="Remove widget"
							>
								<X className="size-3" />
							</button>
						</div>
					)}
				</div>
			) : (
				<div className="flex items-center mb-3">
					{/* Drag handle — slides in from left */}
					<div
						className="w-0 opacity-0 group-hover/widget:w-5 group-hover/widget:opacity-100 overflow-hidden transition-all duration-200 ease-out shrink-0"
						{...listeners}
						{...attributes}
					>
						<GripVertical className="size-3 text-grey-3 cursor-grab active:cursor-grabbing" />
					</div>

					<div className="flex-1 flex items-center gap-3 min-w-0">
						{icon && <span className="text-grey-3">{icon}</span>}
						<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
							{title}
						</span>
						<div className="flex-1 h-px bg-border/50" />
						{count !== undefined && (
							<span className="font-mono text-[10px] text-grey-2 tabular-nums">
								{count}
							</span>
						)}
					</div>

					{!pinned && (
						<div className="w-0 opacity-0 group-hover/widget:w-5 group-hover/widget:opacity-100 overflow-hidden transition-all duration-200 ease-out shrink-0 flex justify-end">
							<button
								type="button"
								onClick={onRemove}
								className="p-0.5 text-grey-3 hover:text-accent-red cursor-pointer"
								title="Remove widget"
							>
								<X className="size-3" />
							</button>
						</div>
					)}
				</div>
			)}

			{/* Content */}
			{collapsible ? (
				<AnimatePresence>
					{!collapsed && (
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
							{children}
						</motion.div>
					)}
				</AnimatePresence>
			) : (
				children
			)}
		</motion.section>
	);
}

/* ── Drop placeholder ── */

function DropPlaceholder({ widgetId }: { widgetId: MailWidgetId }) {
	const def = WIDGET_REGISTRY.find((w) => w.id === widgetId);
	const title = def?.label ?? widgetId;
	const icon = WIDGET_ICONS[widgetId];

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.15, ease: MOTION_CONSTANTS.EASE }}
			className="rounded-xl border-2 border-dashed border-foreground/15 bg-foreground/3 flex items-center justify-center gap-2 py-8 h-full min-h-[60px]"
		>
			{icon && <span className="text-grey-3/50">{icon}</span>}
			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3/50">
				{title}
			</span>
		</motion.div>
	);
}

/* ── Static widget header (used in drag overlay) ── */

function WidgetHeader({
	widgetId,
	count,
}: {
	widgetId: MailWidgetId;
	count?: number;
}) {
	const def = WIDGET_REGISTRY.find((w) => w.id === widgetId);
	const title = def?.label ?? widgetId;
	const icon = WIDGET_ICONS[widgetId];

	return (
		<div className="flex items-center gap-3 mb-3 px-0">
			{icon && <span className="text-grey-3">{icon}</span>}
			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
				{title}
			</span>
			<div className="flex-1 h-px bg-border/50" />
			{count !== undefined && (
				<span className="font-mono text-[10px] text-grey-2 tabular-nums">
					{count}
				</span>
			)}
		</div>
	);
}

/* ── Widget content resolver ── */

function WidgetContent({
	widgetId,
	categoryPulse,
	autoHandledItems,
	handleViewEmail,
}: {
	widgetId: MailWidgetId;
	categoryPulse: { category: EmailCategory; count: number }[];
	autoHandledItems: MailAutoHandledItem[];
	handleViewEmail: (id: string) => void;
}) {
	switch (widgetId) {
		case "actionables":
			return <ActionablesWidget />;
		case "category_breakdown":
			return categoryPulse.length > 0 ? (
				<CategoryBreakdown items={categoryPulse} />
			) : (
				<p className="font-body text-[13px] text-grey-3 italic py-2">
					No unread emails.
				</p>
			);
		case "recent_threads":
			return <RecentThreadsWidget />;
		case "vip_senders":
			return <VipSendersWidget />;
		case "recent_attachments":
			return <RecentAttachmentsWidget />;
		case "auto_handled":
			return autoHandledItems.length > 0 ? (
				<div className="space-y-0">
					{autoHandledItems.map((item, i) => (
						<MailAutoHandledCard
							key={item.id}
							item={item}
							index={i}
							onViewEmail={handleViewEmail}
						/>
					))}
				</div>
			) : (
				<p className="font-body text-[13px] text-grey-3 italic py-2">
					No auto-handled emails yet.
				</p>
			);
		case "saved_searches":
			return <SavedSearchesWidget />;
		case "account_health":
			return <AccountHealthWidget />;
		case "quick_nav":
			return (
				<div className="flex items-center gap-2 flex-wrap">
					<QuickNavPill
						to="/module/mail/inbox"
						search={{
							view: undefined,
							starred: undefined,
							attachment: undefined,
						}}
						icon={<Inbox className="size-3.5" />}
						label="Inbox"
						shortcut="I"
					/>
					<QuickNavPill
						to="/module/mail/sent"
						search={{
							starred: undefined,
							attachment: undefined,
						}}
						icon={<Send className="size-3.5" />}
						label="Sent"
						shortcut="S"
					/>
					<QuickNavPill
						to="/module/mail/attachments"
						icon={<Paperclip className="size-3.5" />}
						label="Files"
						shortcut="A"
					/>
					<QuickNavPill
						to="/module/mail/drafts"
						icon={<FileText className="size-3.5" />}
						label="Drafts"
					/>
				</div>
			);
		default:
			return null;
	}
}

/* ── Category breakdown ── */

function CategoryBreakdown({
	items,
}: {
	items: { category: EmailCategory; count: number }[];
}) {
	return (
		<div className="flex flex-col gap-2">
			{items.map((item) => {
				const config = CATEGORY_CONFIG[item.category];
				return (
					<Link
						key={item.category}
						to="/module/mail/inbox"
						search={{
							category: item.category,
							view: undefined,
							starred: undefined,
							attachment: undefined,
						}}
						className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
					>
						<span className={cn("size-2 rounded-full shrink-0", config.dot)} />
						<span
							className={cn(
								"font-body text-[13px] tracking-[0.01em] flex-1",
								config.text,
							)}
						>
							{config.label}
						</span>
						<span className="font-mono text-[11px] text-foreground/40 tabular-nums">
							{item.count}
						</span>
						<ArrowRight className="size-3 text-grey-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
					</Link>
				);
			})}
		</div>
	);
}

/* ── Header ── */

function MailHeader({
	hasAvailableWidgets,
	onToggleAddTray,
}: {
	hasAvailableWidgets?: boolean;
	onToggleAddTray?: () => void;
}) {
	const {
		data: accounts,
		isLoading,
		isError,
	} = useLiveQuery(mailAccountsCollection);
	const [settingsOpen, setSettingsOpen] = useState(false);

	return (
		<motion.header
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase">
						mail
					</h1>
					<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-0.5">
						Drafts, sorts, and replies to emails on your behalf
					</p>
				</div>
				<div className="shrink-0 mt-3 flex items-center gap-2">
					{hasAvailableWidgets && onToggleAddTray && (
						<button
							type="button"
							onClick={onToggleAddTray}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 hover:border-border/80 hover:bg-secondary/10 transition-colors font-mono text-[11px] tracking-[0.03em] text-grey-2 hover:text-foreground cursor-pointer"
						>
							<Plus className="size-3" />
							Add widget
						</button>
					)}
					{!isLoading && !isError && accounts.length > 0 && (
						<>
							<button
								type="button"
								onClick={() => openCompose({ mode: "compose" })}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-mono text-[11px] tracking-[0.03em] cursor-pointer"
							>
								<Pen className="size-3" />
								Compose
							</button>
							<AccountSelector />
						</>
					)}
					{!isLoading && !isError && accounts.length === 0 && (
						<>
							<button
								type="button"
								onClick={() => setSettingsOpen(true)}
								className="font-mono text-[11px] text-accent-red tracking-[0.02em] hover:text-accent-red/80 transition-colors cursor-pointer"
							>
								connect email →
							</button>
							<SettingsSheet
								open={settingsOpen}
								onOpenChange={setSettingsOpen}
							/>
						</>
					)}
				</div>
			</div>
		</motion.header>
	);
}

/* ── Briefing sentence ── */

function BriefingSentence({
	unread,
	autoHandled,
}: {
	unread: number;
	autoHandled: number;
}) {
	if (unread === 0 && autoHandled === 0) {
		return (
			<p className="font-serif text-[15px] text-foreground/50 italic leading-relaxed">
				Your inbox is clear. Nothing needs your attention.
			</p>
		);
	}

	return (
		<p className="font-serif text-[16px] text-foreground/60 leading-relaxed">
			{autoHandled > 0 && (
				<>
					<span className="font-medium text-foreground">{autoHandled}</span>{" "}
					{autoHandled === 1 ? "email" : "emails"} handled while you were
					away.{" "}
				</>
			)}
			{unread > 0 && (
				<>
					<span className="font-medium text-foreground">{unread}</span> unread.
				</>
			)}
		</p>
	);
}

/* ── Quick nav pill ── */

function QuickNavPill({
	to,
	search,
	icon,
	label,
	shortcut,
}: {
	to: string;
	search?: Record<string, unknown>;
	icon: React.ReactNode;
	label: string;
	shortcut?: string;
}) {
	return (
		<Link
			to={to}
			search={search as any}
			className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border/40 hover:border-border/70 bg-secondary/5 hover:bg-secondary/15 transition-all duration-150"
		>
			<span className="text-grey-2 group-hover:text-foreground transition-colors">
				{icon}
			</span>
			<span className="font-body text-[13px] text-foreground/70 group-hover:text-foreground transition-colors">
				{label}
			</span>
			{shortcut && (
				<span className="font-mono text-[10px] text-grey-3/60 border border-border/30 rounded px-1 py-px leading-none">
					{shortcut}
				</span>
			)}
		</Link>
	);
}
