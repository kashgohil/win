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
import {
	buildMailStats,
	StatsWidget,
} from "@/components/mail/widgets/StatsWidget";
import { VipSendersWidget } from "@/components/mail/widgets/VipSendersWidget";
import { ScrollArea } from "@/components/ui/scroll-area";
import { openCompose } from "@/hooks/use-compose";
import { mailKeys, useMailEmailsInfinite } from "@/hooks/use-mail";
import {
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
	closestCenter,
	DndContext,
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { EmailCategory } from "@wingmnn/types";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Bookmark,
	BookOpen,
	ChevronDown,
	Clock,
	Compass,
	FileText,
	GripVertical,
	Inbox,
	LayoutGrid,
	Paperclip,
	Plus,
	Reply,
	Send,
	Sparkles,
	Tag,
	Users,
	X,
	Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
	stats: <Activity className="size-3" />,
	actionables: <Zap className="size-3" />,
	category_breakdown: <LayoutGrid className="size-3" />,
	recent_threads: <Inbox className="size-3" />,
	vip_senders: <Users className="size-3" />,
	recent_attachments: <Paperclip className="size-3" />,
	auto_handled: <Sparkles className="size-3" />,
	saved_searches: <Bookmark className="size-3" />,
	account_health: <Activity className="size-3" />,
	quick_nav: <Compass className="size-3" />,
	response_time: <Clock className="size-3" />,
	email_volume: <BarChart3 className="size-3" />,
	follow_ups: <Reply className="size-3" />,
	labels_overview: <Tag className="size-3" />,
	read_later: <BookOpen className="size-3" />,
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

	const { layout, enabledIds, toggleWidget, updateLayout, registry } =
		useMailWidgets();
	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

	const getBriefingStat = useCallback(
		(key: string) =>
			briefing?.find(
				(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === key,
			),
		[briefing],
	);

	const unreadCount = Number(getBriefingStat("unread")?.value ?? 0);
	const needsAttentionCount = Number(getBriefingStat("needyou")?.value ?? 0);
	const autoHandledCount = Number(getBriefingStat("autohandled")?.value ?? 0);

	const mailStats = useMemo(
		() =>
			buildMailStats({
				unread: unreadCount,
				needsAttention: needsAttentionCount,
				autoHandled: autoHandledCount,
				starred: 4,
				sent: 7,
				drafts: 2,
				avgResponseTime: "23m",
				streakDays: 3,
			}),
		[unreadCount, needsAttentionCount, autoHandledCount],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;
			if (over && active.id !== over.id) {
				const oldIdx = layout.findIndex((e) => e.id === active.id);
				const newIdx = layout.findIndex((e) => e.id === over.id);
				if (oldIdx !== -1 && newIdx !== -1) {
					updateLayout(arrayMove(layout, oldIdx, newIdx));
				}
			}
		},
		[layout, updateLayout],
	);

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
					<MailHeader />

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

					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={layout.map((e) => e.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="mt-8 flex flex-col gap-5">
								{layout.map((entry) => (
									<WidgetShell
										key={entry.id}
										entry={entry}
										collapsible={entry.id === "auto_handled"}
										count={
											entry.id === "auto_handled"
												? autoHandledItems.length
												: undefined
										}
										onRemove={() => toggleWidget(entry.id)}
										bare={entry.id === "stats"}
									>
										<WidgetContent
											widgetId={entry.id}
											categoryPulse={categoryPulse}
											autoHandledItems={autoHandledItems}
											handleViewEmail={handleViewEmail}
											mailStats={mailStats}
										/>
									</WidgetShell>
								))}
							</div>
						</SortableContext>
					</DndContext>

					{/* Add widget */}
					<AddWidgetButton
						registry={registry}
						enabledIds={enabledIds}
						onToggle={toggleWidget}
					/>
				</div>
			</ScrollArea>

			<KeyboardShortcutBar shortcuts={MAIL_HUB_SHORTCUTS} />
		</>
	);
}

/* ══════════════════════════════════════════════════════
   Widget components
   ══════════════════════════════════════════════════════ */

/* ── Widget shell (draggable) ── */

function WidgetShell({
	entry,
	collapsible,
	count,
	onRemove,
	bare,
	children,
}: {
	entry: MailWidgetEntry;
	collapsible?: boolean;
	count?: number;
	onRemove?: () => void;
	bare?: boolean;
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
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: entry.id });

	const style = {
		transform: CSS.Translate.toString(transform),
		transition,
		zIndex: isDragging ? 10 : undefined,
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"relative group/widget flex flex-col",
				!bare && "rounded-xl border border-border/40 bg-background",
				isDragging && "shadow-xl ring-1 ring-border",
			)}
		>
			{/* Header */}
			<div className={cn("flex items-center py-4", !bare && "px-5")}>
				{/* Drag handle — slides in */}
				<div
					className="cursor-grab active:cursor-grabbing w-0 overflow-hidden opacity-0 group-hover/widget:w-3 flex items-center justify-center group-hover/widget:ml-0 group-hover/widget:opacity-100 transition-all duration-200 shrink-0 group-hover/widget:mr-3"
					{...listeners}
					{...attributes}
				>
					<GripVertical className="size-3.5 text-grey-3" />
				</div>

				{icon && <span className="text-grey-3 mr-3">{icon}</span>}
				<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
					{title}
				</span>

				{count !== undefined && (
					<span className="font-mono text-[10px] text-grey-2/60 tabular-nums">
						{count}
					</span>
				)}

				<div className="flex-1" />

				{collapsible && (
					<button
						type="button"
						onClick={() => setCollapsed((prev) => !prev)}
						className="p-1 cursor-pointer text-grey-3 hover:text-foreground transition-colors"
					>
						<motion.div
							animate={{ rotate: collapsed ? 0 : 180 }}
							transition={{ duration: 0.2 }}
						>
							<ChevronDown className="size-3" />
						</motion.div>
					</button>
				)}

				{/* Remove button — slides in */}
				{!pinned && onRemove && (
					<button
						type="button"
						onClick={onRemove}
						className="p-1 -mr-5 w-0 overflow-hidden opacity-0 group-hover/widget:w-5 group-hover/widget:mr-0 group-hover/widget:opacity-100 transition-all duration-200 text-grey-3 hover:text-accent-red cursor-pointer shrink-0"
						title="Remove widget"
					>
						<X className="size-3" />
					</button>
				)}
			</div>

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
							className="overflow-hidden flex-1"
						>
							<div className={cn(!bare && "px-5", "pb-4")}>{children}</div>
						</motion.div>
					)}
				</AnimatePresence>
			) : (
				<div className={cn(!bare && "px-5", "pb-4 flex-1")}>{children}</div>
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
	mailStats,
}: {
	widgetId: MailWidgetId;
	categoryPulse: { category: EmailCategory; count: number }[];
	autoHandledItems: MailAutoHandledItem[];
	handleViewEmail: (id: string) => void;
	mailStats: import("@/components/mail/widgets/StatsWidget").MailStat[];
}) {
	switch (widgetId) {
		case "stats":
			return <StatsWidget stats={mailStats} />;
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
						className="group flex items-center gap-2.5 rounded-md px-2 py-1.5 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer overflow-hidden"
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
						<ArrowRight className="size-3 text-grey-3 shrink-0 -mr-5 group-hover:mr-0 opacity-0 group-hover:opacity-100 transition-all duration-200" />
					</Link>
				);
			})}
		</div>
	);
}

/* ── Header ── */

function MailHeader() {
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
					{!isLoading && !isError && accounts.length > 0 && <AccountSelector />}
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

/* ── Add widget button ── */

function AddWidgetButton({
	registry,
	enabledIds,
	onToggle,
}: {
	registry: typeof WIDGET_REGISTRY;
	enabledIds: Set<MailWidgetId>;
	onToggle: (id: MailWidgetId) => void;
}) {
	const [open, setOpen] = useState(false);
	const available = registry.filter((w) => !w.pinned && !enabledIds.has(w.id));

	if (available.length === 0) return null;

	return (
		<div className="mt-6">
			<AnimatePresence mode="wait">
				{!open ? (
					<motion.button
						key="add-btn"
						type="button"
						onClick={() => setOpen(true)}
						className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border/40 hover:border-border/70 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{ duration: 0.2 }}
					>
						<Plus className="size-3.5" />
						<span className="font-mono text-[11px] tracking-[0.04em] uppercase">
							Add widget
						</span>
					</motion.button>
				) : (
					<motion.div
						key="add-panel"
						className="rounded-xl border border-border/40 bg-background overflow-hidden"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
					>
						<div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Available widgets
							</span>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="p-0.5 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
							>
								<X className="size-3" />
							</button>
						</div>
						<div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
							{available.map((w, i) => (
								<motion.button
									key={w.id}
									type="button"
									onClick={() => {
										onToggle(w.id);
										const remaining = available.filter(
											(a) => a.id !== w.id,
										);
										if (remaining.length === 0) setOpen(false);
									}}
									className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-secondary/15 transition-colors cursor-pointer text-left"
									initial={{ opacity: 0, y: 6 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.2, delay: i * 0.03 }}
								>
									<span className="text-grey-3 shrink-0">
										{WIDGET_ICONS[w.id]}
									</span>
									<div className="min-w-0">
										<p className="font-mono text-[11px] text-foreground tracking-[0.02em]">
											{w.label}
										</p>
										<p className="font-body text-[10px] text-grey-3 truncate mt-0.5">
											{w.description}
										</p>
									</div>
								</motion.button>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
