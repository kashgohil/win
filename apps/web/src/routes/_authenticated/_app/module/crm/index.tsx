import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import ModulePage from "@/components/module/ModulePage";
import { Button } from "@/components/ui/button";
import {
	useApplyTagSuggestion,
	useContactModuleData,
	useContactSuggestions,
	useContactTags,
	useDiscoverContacts,
	useDismissMergeSuggestion,
	useFollowUps,
	useMergeContacts,
	useTagSuggestions,
} from "@/hooks/use-contacts";
import type { BriefingStat, ModuleData, TriageItem } from "@/lib/module-data";
import { MODULE_DATA } from "@/lib/module-data";
import { relativeTime } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Bell,
	Check,
	GitMerge,
	Mail,
	Search,
	Star,
	Tags,
	UserPlus,
	Users,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
		return items.slice(0, 5).map((fu) => {
			const isCommitment = fu.type === "commitment";
			const commitmentText =
				fu.context ?? fu.title.replace(/^Commitment:\s*/i, "");
			const name = fu.contactName ?? fu.contactEmail ?? "someone";
			return {
				id: fu.id,
				title: isCommitment
					? `You told ${name} you'd ${commitmentText}`
					: fu.title,
				subtitle: isCommitment
					? fu.dueAt
						? `Due ${new Date(fu.dueAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
						: undefined
					: fu.contactName
						? `${fu.contactName}${fu.context ? ` — ${fu.context.slice(0, 80)}` : ""}`
						: fu.context?.slice(0, 100),
				timestamp: fu.dueAt
					? relativeTime(fu.dueAt)
					: relativeTime(fu.createdAt),
				urgent: fu.type === "meeting_prep",
				actions: [
					{
						label: isCommitment ? "I did it" : "Done",
						variant: "default" as const,
					},
					{ label: "Snooze", variant: "outline" as const },
					{ label: "Dismiss", variant: "ghost" as const },
				],
			};
		});
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

					{/* Merge suggestions */}
					<MergeSuggestions />

					{/* Tag suggestions */}
					<TagSuggestions />

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

/* ── Tag suggestions ── */

function TagSuggestions() {
	const { data: suggestions, isLoading } = useTagSuggestions();
	const applyTag = useApplyTagSuggestion();
	const [dismissed, setDismissed] = useState<Set<string>>(new Set());

	if (isLoading || !suggestions || suggestions.length === 0) return null;

	const visible = suggestions.filter((s) => !dismissed.has(s.name));
	if (visible.length === 0) return null;

	return (
		<div className="mt-6">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Suggested tags
			</h3>
			<div className="space-y-2">
				{visible.map((suggestion) => (
					<div
						key={suggestion.name}
						className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3"
					>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<Tags className="size-3.5 text-grey-3 shrink-0" />
								<span className="font-body text-[14px] text-foreground">
									{suggestion.name}
								</span>
								<span className="font-mono text-[10px] text-grey-3">
									{suggestion.contactIds.length} contacts
								</span>
							</div>
							<p className="mt-1 font-mono text-[11px] text-grey-3 truncate">
								{suggestion.contacts.map((c) => c.name || c.email).join(", ")}
							</p>
						</div>
						<div className="flex items-center gap-1.5 ml-3 shrink-0">
							<Button
								variant="ghost"
								size="sm"
								className="h-7 px-2 text-[12px]"
								onClick={() =>
									setDismissed((prev) => new Set(prev).add(suggestion.name))
								}
							>
								<X className="size-3" />
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="h-7 px-3 text-[12px] gap-1.5"
								disabled={applyTag.isPending}
								onClick={() =>
									applyTag.mutate(
										{
											name: suggestion.name,
											contactIds: suggestion.contactIds,
										},
										{
											onSuccess: () => {
												toast(`Tag "${suggestion.name}" created`);
												setDismissed((prev) =>
													new Set(prev).add(suggestion.name),
												);
											},
										},
									)
								}
							>
								<Check className="size-3" />
								Apply
							</Button>
						</div>
					</div>
				))}
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
							toast("Contact discovery started", {
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

/* ── Merge Suggestions ── */

type MergeSuggestionContact = {
	id: string;
	name: string | null;
	email: string;
	company: string | null;
	interactionCount: number;
};

function MergeSuggestions() {
	const { data } = useContactSuggestions();
	const mergeContacts = useMergeContacts();
	const dismissSuggestion = useDismissMergeSuggestion();
	const [confirmingMerge, setConfirmingMerge] = useState<{
		a: MergeSuggestionContact;
		b: MergeSuggestionContact;
	} | null>(null);

	const suggestions = data?.mergeSuggestions ?? [];

	if (suggestions.length === 0) return null;

	const handleMerge = (
		primary: MergeSuggestionContact,
		secondary: MergeSuggestionContact,
	) => {
		mergeContacts.mutate(
			{
				primaryContactId: primary.id,
				mergeWithContactId: secondary.id,
			},
			{
				onSuccess: () => {
					toast("Contacts merged", {
						description: `Merged into ${primary.name ?? primary.email}`,
					});
					setConfirmingMerge(null);
				},
				onError: () => toast.error("Failed to merge contacts"),
			},
		);
	};

	const handleDismiss = (
		a: MergeSuggestionContact,
		b: MergeSuggestionContact,
	) => {
		dismissSuggestion.mutate(
			{ contactIdA: a.id, contactIdB: b.id },
			{
				onError: () => toast.error("Failed to dismiss suggestion"),
			},
		);
	};

	return (
		<div className="mt-8">
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Possible duplicates
			</h3>
			<div className="space-y-2">
				{suggestions.map((s) => {
					const isConfirming =
						confirmingMerge &&
						((confirmingMerge.a.id === s.contactA.id &&
							confirmingMerge.b.id === s.contactB.id) ||
							(confirmingMerge.a.id === s.contactB.id &&
								confirmingMerge.b.id === s.contactA.id));

					return (
						<div
							key={`${s.contactA.id}-${s.contactB.id}`}
							className="rounded-lg border border-border/40 px-4 py-3.5"
						>
							{isConfirming ? (
								<MergeConfirmation
									primary={confirmingMerge.a}
									secondary={confirmingMerge.b}
									onConfirm={() =>
										handleMerge(confirmingMerge.a, confirmingMerge.b)
									}
									onCancel={() => setConfirmingMerge(null)}
									isPending={mergeContacts.isPending}
								/>
							) : (
								<>
									<div className="flex items-center gap-2 mb-2">
										<GitMerge className="size-3.5 text-grey-3" />
										<span className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.08em]">
											{s.reason}
										</span>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<ContactMiniCard contact={s.contactA} />
										<ContactMiniCard contact={s.contactB} />
									</div>
									<div className="flex items-center gap-2 mt-3">
										<Button
											size="sm"
											className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 bg-foreground text-background hover:bg-foreground/90"
											onClick={() =>
												setConfirmingMerge({
													a:
														s.contactA.interactionCount >=
														s.contactB.interactionCount
															? s.contactA
															: s.contactB,
													b:
														s.contactA.interactionCount >=
														s.contactB.interactionCount
															? s.contactB
															: s.contactA,
												})
											}
										>
											<GitMerge className="size-3 mr-1" />
											Merge
										</Button>
										<Button
											variant="ghost"
											size="sm"
											className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 text-grey-3"
											onClick={() => handleDismiss(s.contactA, s.contactB)}
											disabled={dismissSuggestion.isPending}
										>
											<X className="size-3 mr-1" />
											Not a match
										</Button>
									</div>
								</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function ContactMiniCard({ contact }: { contact: MergeSuggestionContact }) {
	return (
		<div className="rounded-md border border-border/20 bg-secondary/5 px-3 py-2.5">
			<div className="font-body text-[13px] text-foreground tracking-[0.01em] truncate">
				{contact.name ?? "Unknown"}
			</div>
			<div className="flex items-center gap-1 mt-0.5">
				<Mail className="size-3 text-grey-3 shrink-0" />
				<span className="font-mono text-[11px] text-grey-2 truncate">
					{contact.email}
				</span>
			</div>
			{contact.company && (
				<div className="font-mono text-[10px] text-grey-3 mt-0.5 truncate">
					{contact.company}
				</div>
			)}
			<div className="font-mono text-[10px] text-grey-3 mt-1">
				{contact.interactionCount} interaction
				{contact.interactionCount !== 1 ? "s" : ""}
			</div>
		</div>
	);
}

function MergeConfirmation({
	primary,
	secondary,
	onConfirm,
	onCancel,
	isPending,
}: {
	primary: MergeSuggestionContact;
	secondary: MergeSuggestionContact;
	onConfirm: () => void;
	onCancel: () => void;
	isPending: boolean;
}) {
	return (
		<div>
			<p className="font-body text-[13px] text-foreground mb-3">
				Merge{" "}
				<span className="font-medium">{secondary.name ?? secondary.email}</span>{" "}
				into{" "}
				<span className="font-medium">{primary.name ?? primary.email}</span>?
			</p>
			<div className="rounded-md border border-border/20 bg-secondary/5 px-3 py-2.5 mb-3">
				<div className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.08em] mb-1.5">
					Result
				</div>
				<div className="font-body text-[13px] text-foreground">
					{primary.name ?? secondary.name ?? "Unknown"}
				</div>
				<div className="font-mono text-[11px] text-grey-2 mt-0.5">
					{primary.email}
					{secondary.email !== primary.email && `, ${secondary.email}`}
				</div>
				{(primary.company || secondary.company) && (
					<div className="font-mono text-[10px] text-grey-3 mt-0.5">
						{primary.company ?? secondary.company}
					</div>
				)}
				<div className="font-mono text-[10px] text-grey-3 mt-1">
					{primary.interactionCount + secondary.interactionCount} total
					interactions
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 bg-foreground text-background hover:bg-foreground/90"
					onClick={onConfirm}
					disabled={isPending}
				>
					{isPending ? "Merging..." : "Confirm merge"}
				</Button>
				<Button
					variant="ghost"
					size="sm"
					className="font-mono text-[11px] tracking-[0.02em] h-7 px-3 text-grey-3"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}

/* ── Helpers ── */
