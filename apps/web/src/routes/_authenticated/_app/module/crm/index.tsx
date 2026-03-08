import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { Button } from "@/components/ui/button";
import {
	useContactModuleData,
	useContactTags,
	useDiscoverContacts,
	useFollowUps,
} from "@/hooks/use-contacts";
import type { BriefingStat, ModuleData, TriageItem } from "@/lib/module-data";
import { MODULE_DATA } from "@/lib/module-data";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Bell,
	Search,
	Star,
	Tags,
	UserPlus,
	Users,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/module/crm/")({
	component: CrmModule,
});

const CRM_HUB_SHORTCUTS = [
	[
		{ keys: ["A"], label: "all contacts" },
		{ keys: ["S"], label: "starred" },
		{ keys: ["F"], label: "follow-ups" },
	],
];

function CrmModule() {
	const navigate = useNavigate();
	const { data: moduleData, isLoading: dataLoading } = useContactModuleData();
	const { data: followUpsData, isLoading: followUpsLoading } = useFollowUps();

	const isLoading = dataLoading || followUpsLoading;

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
			)
				return;

			switch (e.key) {
				case "a":
					e.preventDefault();
					navigate({ to: "/module/crm/list" });
					break;
				case "s":
					e.preventDefault();
					navigate({ to: "/module/crm/list", search: { starred: true } });
					break;
				case "f":
					e.preventDefault();
					navigate({ to: "/module/crm/follow-ups" });
					break;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [navigate]);

	// Build live briefing from API data
	const briefing: BriefingStat[] = useMemo(() => {
		if (!moduleData) return MODULE_DATA.crm.briefing;
		return [
			{ label: "total contacts", value: moduleData.totalContacts },
			{
				label: "follow-ups due",
				value: moduleData.followUpsDue,
				accent: moduleData.followUpsDue > 0,
			},
			{ label: "starred", value: moduleData.starredContacts },
		];
	}, [moduleData]);

	// Build triage items from pending follow-ups
	const triageItems: TriageItem[] = useMemo(() => {
		if (!followUpsData?.pages) return [];
		const items = followUpsData.pages.flatMap((p) => p.followUps ?? []);
		return items.slice(0, 5).map((fu) => ({
			id: fu.id,
			title: fu.title,
			subtitle: fu.contactName
				? `${fu.contactName}${fu.context ? ` — ${fu.context.slice(0, 80)}` : ""}`
				: fu.context?.slice(0, 100),
			timestamp: fu.dueAt
				? formatRelative(fu.dueAt)
				: formatRelative(fu.createdAt),
			urgent: fu.type === "meeting_prep",
			actions: [
				{ label: "Done", variant: "default" as const },
				{ label: "Snooze", variant: "outline" as const },
				{ label: "Dismiss", variant: "ghost" as const },
			],
		}));
	}, [followUpsData]);

	const liveData: ModuleData = {
		briefing,
		triage: triageItems,
		autoHandled: MODULE_DATA.crm.autoHandled,
	};

	return (
		<>
			<ModulePage
				moduleKey="crm"
				data={isLoading ? MODULE_DATA.crm : liveData}
				isLoading={isLoading}
				headerActions={<CrmHeaderActions />}
			>
				<div className="px-(--page-px) max-w-5xl mx-auto pb-16">
					{/* Navigation links */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
						<Link
							to="/module/crm/list"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Users className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									All contacts
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/module/crm/list"
							search={{ starred: true }}
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Star className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Starred
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/module/crm/follow-ups"
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Bell className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Follow-ups
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
						<Link
							to="/module/crm/list"
							search={{ archived: true }}
							className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 transition-colors px-4 py-3.5"
						>
							<div className="flex items-center gap-2.5">
								<Tags className="size-4 text-grey-3" />
								<span className="font-body text-[14px] text-foreground tracking-[0.01em]">
									Archived
								</span>
							</div>
							<ArrowRight className="size-3.5 text-grey-3 group-hover:translate-x-0.5 transition-transform" />
						</Link>
					</div>

					{/* Stats bar */}
					{moduleData && <StatsBar data={moduleData} />}

					{/* Tags overview */}
					<TagsOverview />
				</div>
			</ModulePage>

			<KeyboardShortcutBar shortcuts={CRM_HUB_SHORTCUTS} />
		</>
	);
}

/* ── Stats bar ── */

function StatsBar({
	data,
}: {
	data: {
		totalContacts: number;
		starredContacts: number;
		followUpsDue: number;
		contactsTouchedThisWeek: number;
		coolingOff: number;
	};
}) {
	const items = [
		{ label: "Total", value: data.totalContacts },
		{ label: "Starred", value: data.starredContacts },
		{ label: "Cooling off", value: data.coolingOff },
		{
			label: "Follow-ups",
			value: data.followUpsDue,
			highlight: data.followUpsDue > 0,
		},
		{ label: "Interactions (7d)", value: data.contactsTouchedThisWeek },
	];

	return (
		<div className="mt-6">
			<div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
				{items.map((item) => (
					<div
						key={item.label}
						className="rounded-lg border border-border/40 px-3 py-2.5 text-center"
					>
						<div
							className={`font-display text-[1.25rem] leading-none ${
								item.highlight ? "text-red-500" : "text-foreground"
							}`}
						>
							{item.value}
						</div>
						<div className="font-mono text-[10px] text-grey-3 mt-1">
							{item.label}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/* ── Tags overview ── */

function TagsOverview() {
	const { data: tags } = useContactTags();

	if (!tags || tags.length === 0) return null;

	return (
		<div className="mt-8">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Tags
			</h3>
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
				{tags.map(
					(tag: {
						id: string;
						name: string;
						color: string | null;
						contactCount: number;
					}) => (
						<Link
							key={tag.id}
							to="/module/crm/list"
							search={{ tagId: tag.id }}
							className="group flex items-center gap-2.5 rounded-lg border border-border/40 hover:border-border/70 transition-colors px-3 py-2.5"
						>
							{tag.color ? (
								<span
									className="size-2.5 rounded-full shrink-0"
									style={{ backgroundColor: tag.color }}
								/>
							) : (
								<Tags className="size-3.5 text-grey-3" />
							)}
							<span className="font-body text-[13px] text-foreground tracking-[0.01em] truncate">
								{tag.name}
							</span>
							<span className="font-mono text-[10px] text-grey-3 ml-auto shrink-0">
								{tag.contactCount}
							</span>
						</Link>
					),
				)}
			</div>
		</div>
	);
}

/* ── Header actions ── */

function CrmHeaderActions() {
	const discover = useDiscoverContacts();

	return (
		<div className="flex items-center gap-2">
			<Link
				to="/module/crm/list"
				className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
			>
				<Search className="size-3" />
				<span className="font-body text-[12px]">Search</span>
			</Link>

			<Button
				variant="outline"
				size="sm"
				className="font-mono text-[11px] tracking-[0.02em] h-7 px-3"
				onClick={() => {
					discover.mutate(undefined, {
						onSuccess: () =>
							toast.success("Contact discovery started", {
								description:
									"Scanning your emails and calendar for new contacts",
							}),
						onError: () => toast.error("Failed to start discovery"),
					});
				}}
				disabled={discover.isPending}
			>
				<UserPlus className="size-3 mr-1" />
				Discover
			</Button>
		</div>
	);
}

/* ── Helpers ── */

function formatRelative(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.round(diffMs / 60_000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	const diffHours = Math.round(diffMins / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.round(diffHours / 24);
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}
