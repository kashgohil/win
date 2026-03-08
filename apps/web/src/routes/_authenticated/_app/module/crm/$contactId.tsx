import { MOTION_CONSTANTS } from "@/components/constant";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useArchiveContact,
	useAssignTag,
	useContactDetail,
	useContactEmails,
	useContactEvents,
	useContactInteractions,
	useContactTags,
	useDeleteContact,
	useRemoveTag,
	useStarContact,
	useUpdateContact,
} from "@/hooks/use-contacts";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	ArrowLeft,
	Building2,
	Calendar,
	Edit2,
	Mail,
	Phone,
	Star,
	StickyNote,
	Tag,
	Trash2,
	UserPlus,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
	"/_authenticated/_app/module/crm/$contactId",
)({
	component: ContactDetailPage,
});

const DETAIL_SHORTCUTS = [
	[
		{ keys: ["S"], label: "star" },
		{ keys: ["E"], label: "archive" },
		{ keys: ["["], label: "back" },
	],
];

function ContactDetailPage() {
	const { contactId } = Route.useParams();
	const navigate = useNavigate();
	const { data: contact, isLoading } = useContactDetail(contactId);
	const starContact = useStarContact();
	const archiveContact = useArchiveContact();
	const deleteContact = useDeleteContact();

	const [activeTab, setActiveTab] = useState<
		"overview" | "emails" | "events" | "interactions"
	>("overview");
	const [editing, setEditing] = useState(false);
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey
			)
				return;

			switch (e.key) {
				case "s":
					e.preventDefault();
					starContact.mutate(contactId);
					break;
				case "e":
					e.preventDefault();
					archiveContact.mutate(contactId);
					break;
				case "[":
					e.preventDefault();
					navigate({ to: "/module/crm/list" });
					break;
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [contactId, navigate, starContact, archiveContact]);

	if (isLoading) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<div className="animate-pulse">
						<div className="h-4 w-20 bg-secondary/30 rounded" />
						<div className="mt-6 flex items-center gap-4">
							<div className="size-16 rounded-full bg-secondary/30" />
							<div>
								<div className="h-6 w-48 bg-secondary/30 rounded" />
								<div className="h-4 w-64 bg-secondary/20 rounded mt-2" />
							</div>
						</div>
						<div className="mt-8 space-y-4">
							{[0, 1, 2].map((i) => (
								<div key={i} className="h-16 bg-secondary/20 rounded-lg" />
							))}
						</div>
					</div>
				</div>
			</ScrollArea>
		);
	}

	if (!contact) {
		return (
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					<Link
						to="/module/crm/list"
						className="inline-flex items-center gap-1.5 font-mono text-[12px] text-grey-3 hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-3" />
						Back to contacts
					</Link>
					<div className="py-16 flex flex-col items-center gap-3">
						<p className="font-serif text-[15px] text-grey-2 italic">
							Contact not found.
						</p>
					</div>
				</div>
			</ScrollArea>
		);
	}

	const handleDelete = () => {
		deleteContact.mutate(contactId, {
			onSuccess: () => {
				toast.success("Contact deleted");
				navigate({ to: "/module/crm/list" });
			},
			onError: () => toast.error("Failed to delete contact"),
		});
	};

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Back link */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}
					>
						<Link
							to="/module/crm/list"
							className="inline-flex items-center gap-1.5 font-mono text-[12px] text-grey-3 hover:text-foreground transition-colors"
						>
							<ArrowLeft className="size-3" />
							Back to contacts
						</Link>
					</motion.div>

					{/* Header */}
					<motion.header
						className="mt-6"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<div className="flex items-start gap-4">
							{/* Avatar */}
							<div className="size-16 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
								<span className="font-mono text-[18px] text-grey-2 uppercase">
									{getInitials(
										contact.name as string | null,
										contact.primaryEmail as string,
									)}
								</span>
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-tight truncate">
										{(contact.name as string) ??
											(contact.primaryEmail as string)}
									</h1>
									{contact.starred && (
										<Star className="size-4 text-amber-500 fill-amber-500 shrink-0" />
									)}
								</div>
								<div className="flex items-center gap-3 mt-1 flex-wrap">
									<span className="font-mono text-[12px] text-grey-2">
										{contact.primaryEmail as string}
									</span>
									{contact.company && (
										<span className="font-mono text-[11px] text-grey-3 flex items-center gap-1">
											<Building2 className="size-3" />
											{contact.company as string}
										</span>
									)}
									{contact.jobTitle && (
										<span className="font-mono text-[11px] text-grey-3">
											{contact.jobTitle as string}
										</span>
									)}
								</div>

								{/* Introduced by */}
								{contact.introducedBy && (
									<div className="flex items-center gap-1.5 mt-2">
										<UserPlus className="size-3 text-grey-3" />
										<span className="font-mono text-[11px] text-grey-3">
											Introduced by{" "}
											<Link
												to="/module/crm/$contactId"
												params={{
													contactId: contact.introducedBy as string,
												}}
												className="text-foreground hover:underline"
											>
												{(contact.introducedByName as string) ?? "someone"}
											</Link>
											{contact.introducedAt && (
												<>
													{" "}
													on{" "}
													{new Date(
														contact.introducedAt as string,
													).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</>
											)}
										</span>
									</div>
								)}

								{/* Tags */}
								{contact.tags && (contact.tags as any[]).length > 0 && (
									<div className="flex items-center gap-1.5 mt-2 flex-wrap">
										{(
											contact.tags as {
												id: string;
												name: string;
												color: string | null;
											}[]
										).map((tag) => (
											<span
												key={tag.id}
												className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 font-mono text-[10px] text-grey-2"
											>
												{tag.color && (
													<span
														className="size-1.5 rounded-full"
														style={{ backgroundColor: tag.color }}
													/>
												)}
												{tag.name}
											</span>
										))}
									</div>
								)}
							</div>

							{/* Actions */}
							<div className="flex items-center gap-1.5 shrink-0">
								<button
									type="button"
									onClick={() => starContact.mutate(contactId)}
									className="p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
									title={contact.starred ? "Unstar" : "Star"}
								>
									<Star
										className={cn(
											"size-4",
											contact.starred
												? "text-amber-500 fill-amber-500"
												: "text-grey-3",
										)}
									/>
								</button>
								<button
									type="button"
									onClick={() => archiveContact.mutate(contactId)}
									className="p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
									title={contact.archived ? "Unarchive" : "Archive"}
								>
									{contact.archived ? (
										<ArchiveRestore className="size-4 text-grey-3" />
									) : (
										<Archive className="size-4 text-grey-3" />
									)}
								</button>
								<button
									type="button"
									onClick={() => setEditing(true)}
									className="p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer"
									title="Edit"
								>
									<Edit2 className="size-4 text-grey-3" />
								</button>
								<button
									type="button"
									onClick={() => setConfirmDelete(true)}
									className="p-2 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
									title="Delete"
								>
									<Trash2 className="size-4 text-grey-3 hover:text-red-500" />
								</button>
							</div>
						</div>
					</motion.header>

					{/* Score + Meta strip */}
					<motion.div
						className="mt-6 grid grid-cols-4 gap-px bg-border/30 rounded-lg overflow-hidden border border-border/30"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<div className="bg-background px-4 py-3 flex flex-col items-center text-center">
							<span
								className={cn(
									"font-display text-[1.5rem] leading-none",
									(contact.relationshipScore as number) >= 70
										? "text-emerald-500"
										: (contact.relationshipScore as number) >= 40
											? "text-amber-500"
											: "text-grey-3",
								)}
							>
								{contact.relationshipScore as number}
							</span>
							<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50 mt-1">
								Score
							</span>
						</div>
						<div className="bg-background px-4 py-3 flex flex-col items-center text-center">
							<span className="font-display text-[1.5rem] leading-none text-foreground">
								{contact.avgResponseTimeMins != null
									? formatResponseTime(contact.avgResponseTimeMins as number)
									: "—"}
							</span>
							<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50 mt-1">
								Their reply
							</span>
						</div>
						<div className="bg-background px-4 py-3 flex flex-col items-center text-center">
							<span className="font-display text-[1.5rem] leading-none text-foreground">
								{contact.avgYourResponseTimeMins != null
									? formatResponseTime(
											contact.avgYourResponseTimeMins as number,
										)
									: "—"}
							</span>
							<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50 mt-1">
								Your reply
							</span>
						</div>
						<div className="bg-background px-4 py-3 flex flex-col items-center text-center">
							<span className="font-display text-[1.5rem] leading-none text-foreground">
								{contact.lastInteractionAt
									? formatDaysAgo(contact.lastInteractionAt as string)
									: "—"}
							</span>
							<span className="font-mono text-[9px] uppercase tracking-[0.16em] text-foreground/50 mt-1">
								Last contact
							</span>
						</div>
					</motion.div>

					{/* Tabs */}
					<motion.div
						className="mt-8"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.15,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<div className="flex items-center gap-1 border-b border-border/30">
							{(["overview", "emails", "events", "interactions"] as const).map(
								(tab) => (
									<button
										key={tab}
										type="button"
										onClick={() => setActiveTab(tab)}
										className={cn(
											"px-3 py-2 font-mono text-[11px] tracking-[0.02em] transition-colors cursor-pointer border-b-2 -mb-px",
											activeTab === tab
												? "border-foreground text-foreground"
												: "border-transparent text-grey-3 hover:text-foreground",
										)}
									>
										{tab.charAt(0).toUpperCase() + tab.slice(1)}
									</button>
								),
							)}
						</div>

						<div className="mt-6 pb-16">
							{activeTab === "overview" && <OverviewTab contact={contact} />}
							{activeTab === "emails" && <EmailsTab contactId={contactId} />}
							{activeTab === "events" && <EventsTab contactId={contactId} />}
							{activeTab === "interactions" && (
								<InteractionsTab contactId={contactId} />
							)}
						</div>
					</motion.div>
				</div>
			</ScrollArea>

			{/* Edit sheet */}
			{editing && (
				<EditContactSheet
					contact={contact}
					contactId={contactId}
					onClose={() => setEditing(false)}
				/>
			)}

			{/* Delete confirmation */}
			{confirmDelete && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
					<div className="bg-background rounded-lg border border-border/40 p-6 max-w-sm mx-4">
						<h3 className="font-display text-[1.1rem] text-foreground">
							Delete contact?
						</h3>
						<p className="font-body text-[13px] text-grey-2 mt-2">
							This will permanently delete this contact and all associated data.
						</p>
						<div className="flex items-center justify-end gap-2 mt-4">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setConfirmDelete(false)}
							>
								Cancel
							</Button>
							<Button variant="destructive" size="sm" onClick={handleDelete}>
								Delete
							</Button>
						</div>
					</div>
				</div>
			)}

			<KeyboardShortcutBar shortcuts={DETAIL_SHORTCUTS} />
		</>
	);
}

/* ── Overview Tab ── */

function OverviewTab({ contact }: { contact: Record<string, unknown> }) {
	const fields = [
		{
			icon: Phone,
			label: "Phone",
			value: contact.phone as string | null,
		},
		{
			icon: StickyNote,
			label: "Notes",
			value: contact.notes as string | null,
		},
	];

	const interactions = (contact.recentInteractions ?? []) as {
		id: string;
		type: string;
		title: string;
		occurredAt: string;
	}[];

	return (
		<div className="space-y-6">
			{/* Contact info */}
			<div className="space-y-3">
				{fields.map(
					(f) =>
						f.value && (
							<div key={f.label} className="flex items-start gap-3">
								<f.icon className="size-4 text-grey-3 mt-0.5 shrink-0" />
								<div>
									<span className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
										{f.label}
									</span>
									<p className="font-body text-[13px] text-foreground mt-0.5 whitespace-pre-wrap">
										{f.value}
									</p>
								</div>
							</div>
						),
				)}
			</div>

			{/* Recent interactions */}
			{interactions.length > 0 && (
				<div>
					<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
						Recent interactions
					</h3>
					<div className="space-y-2">
						{interactions.map((i) => (
							<div
								key={i.id}
								className="flex items-center gap-3 rounded-lg border border-border/30 px-3 py-2.5"
							>
								<InteractionIcon type={i.type} />
								<div className="flex-1 min-w-0">
									<span className="font-body text-[13px] text-foreground truncate block">
										{i.title}
									</span>
								</div>
								<span className="font-mono text-[10px] text-grey-3 shrink-0">
									{formatDaysAgo(i.occurredAt)}
								</span>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Tag management */}
			<TagManager contactId={contact.id as string} />
		</div>
	);
}

/* ── Emails Tab ── */

function EmailsTab({ contactId }: { contactId: string }) {
	const { data, isLoading } = useContactEmails(contactId, { limit: 20 });
	const emails = (data?.emails ?? []) as {
		id: string;
		subject: string | null;
		fromAddress: string;
		receivedAt: string;
		snippet: string | null;
	}[];

	if (isLoading) {
		return <TabSkeleton />;
	}

	if (emails.length === 0) {
		return (
			<EmptyTab icon={Mail} message="No emails found involving this contact." />
		);
	}

	return (
		<div className="space-y-2">
			{emails.map((email) => (
				<Link
					key={email.id}
					to="/module/mail/inbox/$emailId"
					params={{ emailId: email.id }}
					search={{ view: undefined, category: undefined, source: undefined }}
					className="flex items-start gap-3 rounded-lg border border-border/30 hover:border-border/60 px-4 py-3 transition-colors"
				>
					<Mail className="size-4 text-grey-3 mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<span className="font-body text-[13px] text-foreground truncate block">
							{email.subject ?? "(no subject)"}
						</span>
						{email.snippet && (
							<span className="font-body text-[12px] text-grey-3 truncate block mt-0.5">
								{email.snippet}
							</span>
						)}
					</div>
					<span className="font-mono text-[10px] text-grey-3 shrink-0">
						{formatDaysAgo(email.receivedAt)}
					</span>
				</Link>
			))}
		</div>
	);
}

/* ── Events Tab ── */

function EventsTab({ contactId }: { contactId: string }) {
	const { data, isLoading } = useContactEvents(contactId, { limit: 20 });
	const events = (data?.events ?? []) as {
		id: string;
		title: string | null;
		startTime: string;
		endTime: string | null;
	}[];

	if (isLoading) {
		return <TabSkeleton />;
	}

	if (events.length === 0) {
		return (
			<EmptyTab
				icon={Calendar}
				message="No calendar events found involving this contact."
			/>
		);
	}

	return (
		<div className="space-y-2">
			{events.map((event) => (
				<div
					key={event.id}
					className="flex items-start gap-3 rounded-lg border border-border/30 px-4 py-3"
				>
					<Calendar className="size-4 text-grey-3 mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<span className="font-body text-[13px] text-foreground truncate block">
							{event.title ?? "(no title)"}
						</span>
						<span className="font-mono text-[11px] text-grey-3 mt-0.5 block">
							{formatDateTime(event.startTime)}
						</span>
					</div>
				</div>
			))}
		</div>
	);
}

/* ── Interactions Tab ── */

function InteractionsTab({ contactId }: { contactId: string }) {
	const { data, isLoading, fetchNextPage, hasNextPage } =
		useContactInteractions(contactId);
	const interactions =
		data?.pages.flatMap(
			(p) =>
				(p?.interactions ?? []) as {
					id: string;
					type: string;
					title: string;
					occurredAt: string;
				}[],
		) ?? [];

	if (isLoading) {
		return <TabSkeleton />;
	}

	if (interactions.length === 0) {
		return <EmptyTab icon={Tag} message="No interactions recorded yet." />;
	}

	return (
		<div className="space-y-2">
			{interactions.map((i) => (
				<div
					key={i.id}
					className="flex items-center gap-3 rounded-lg border border-border/30 px-4 py-3"
				>
					<InteractionIcon type={i.type} />
					<div className="flex-1 min-w-0">
						<span className="font-body text-[13px] text-foreground truncate block">
							{i.title}
						</span>
					</div>
					<span className="font-mono text-[10px] text-grey-3 shrink-0">
						{formatDaysAgo(i.occurredAt)}
					</span>
				</div>
			))}
			{hasNextPage && (
				<button
					type="button"
					onClick={() => fetchNextPage()}
					className="w-full py-3 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
				>
					Load more
				</button>
			)}
		</div>
	);
}

/* ── Tag Manager ── */

function TagManager({ contactId }: { contactId: string }) {
	const { data: detail } = useContactDetail(contactId);
	const { data: allTags } = useContactTags();
	const assignTag = useAssignTag();
	const removeTag = useRemoveTag();

	const contactTags = (detail?.tags ?? []) as {
		id: string;
		name: string;
		color: string | null;
	}[];
	const contactTagIds = new Set(contactTags.map((t) => t.id));
	const availableTags = (allTags ?? []).filter((t) => !contactTagIds.has(t.id));

	const [showPicker, setShowPicker] = useState(false);

	return (
		<div>
			<h3 className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-3">
				Tags
			</h3>
			<div className="flex items-center gap-1.5 flex-wrap">
				{contactTags.map((tag) => (
					<span
						key={tag.id}
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/20 font-mono text-[11px] text-grey-2"
					>
						{tag.color && (
							<span
								className="size-1.5 rounded-full"
								style={{ backgroundColor: tag.color }}
							/>
						)}
						{tag.name}
						<button
							type="button"
							onClick={() => removeTag.mutate({ contactId, tagId: tag.id })}
							className="ml-0.5 hover:text-foreground cursor-pointer"
						>
							<X className="size-3" />
						</button>
					</span>
				))}
				{availableTags.length > 0 && (
					<div className="relative">
						<button
							type="button"
							onClick={() => setShowPicker(!showPicker)}
							className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-dashed border-border/40 hover:border-border/70 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
						>
							<Tag className="size-3" />
							Add tag
						</button>
						{showPicker && (
							<div className="absolute top-full mt-1 left-0 z-10 bg-background border border-border/40 rounded-lg shadow-lg py-1 min-w-[140px]">
								{availableTags.map((tag) => (
									<button
										key={tag.id}
										type="button"
										onClick={() => {
											assignTag.mutate({ contactId, tagId: tag.id });
											setShowPicker(false);
										}}
										className="w-full px-3 py-1.5 text-left font-mono text-[11px] text-foreground hover:bg-secondary/20 transition-colors cursor-pointer flex items-center gap-2"
									>
										{tag.color && (
											<span
												className="size-2 rounded-full"
												style={{ backgroundColor: tag.color }}
											/>
										)}
										{tag.name}
									</button>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/* ── Edit Contact Sheet ── */

function EditContactSheet({
	contact,
	contactId,
	onClose,
}: {
	contact: Record<string, unknown>;
	contactId: string;
	onClose: () => void;
}) {
	const updateContact = useUpdateContact();
	const [name, setName] = useState((contact.name as string) ?? "");
	const [company, setCompany] = useState((contact.company as string) ?? "");
	const [jobTitle, setJobTitle] = useState((contact.jobTitle as string) ?? "");
	const [phone, setPhone] = useState((contact.phone as string) ?? "");
	const [notes, setNotes] = useState((contact.notes as string) ?? "");

	const handleSave = () => {
		updateContact.mutate(
			{
				id: contactId,
				name: name || undefined,
				company: company || undefined,
				jobTitle: jobTitle || undefined,
				phone: phone || undefined,
				notes: notes || undefined,
			},
			{
				onSuccess: () => {
					toast.success("Contact updated");
					onClose();
				},
				onError: () => toast.error("Failed to update contact"),
			},
		);
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
			<div className="bg-background rounded-lg border border-border/40 p-6 max-w-md w-full mx-4">
				<div className="flex items-center justify-between mb-4">
					<h3 className="font-display text-[1.1rem] text-foreground">
						Edit contact
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="p-1 hover:bg-secondary/30 rounded cursor-pointer"
					>
						<X className="size-4 text-grey-3" />
					</button>
				</div>
				<div className="space-y-3">
					<div>
						<label className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
							Name
						</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
							Company
						</label>
						<Input
							value={company}
							onChange={(e) => setCompany(e.target.value)}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
							Job Title
						</label>
						<Input
							value={jobTitle}
							onChange={(e) => setJobTitle(e.target.value)}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
							Phone
						</label>
						<Input
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							className="mt-1"
						/>
					</div>
					<div>
						<label className="font-mono text-[10px] text-grey-3 uppercase tracking-widest">
							Notes
						</label>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							className="mt-1 w-full rounded-md border border-border/40 bg-background px-3 py-2 font-body text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20 resize-none"
						/>
					</div>
				</div>
				<div className="flex items-center justify-end gap-2 mt-5">
					<Button variant="outline" size="sm" onClick={onClose}>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSave}
						disabled={updateContact.isPending}
					>
						Save
					</Button>
				</div>
			</div>
		</div>
	);
}

/* ── Shared sub-components ── */

function InteractionIcon({ type }: { type: string }) {
	switch (type) {
		case "email_sent":
		case "email_received":
			return <Mail className="size-4 text-grey-3 shrink-0" />;
		case "meeting":
			return <Calendar className="size-4 text-grey-3 shrink-0" />;
		default:
			return <Tag className="size-4 text-grey-3 shrink-0" />;
	}
}

function TabSkeleton() {
	return (
		<div className="animate-pulse space-y-3">
			{[0, 1, 2].map((i) => (
				<div key={i} className="rounded-lg border border-border/20 p-3.5">
					<div className="flex items-center gap-3">
						<div className="size-4 rounded bg-secondary/30" />
						<div className="h-4 w-48 bg-secondary/30 rounded" />
						<div className="h-3 w-16 bg-secondary/20 rounded ml-auto" />
					</div>
				</div>
			))}
		</div>
	);
}

function EmptyTab({
	icon: Icon,
	message,
}: {
	icon: typeof Mail;
	message: string;
}) {
	return (
		<div className="py-12 flex flex-col items-center gap-3">
			<div className="size-10 rounded-full bg-foreground/5 flex items-center justify-center">
				<Icon className="size-4 text-foreground/40" />
			</div>
			<p className="font-serif text-[15px] text-grey-2 italic text-center">
				{message}
			</p>
		</div>
	);
}

/* ── Helpers ── */

function getInitials(name: string | null, email: string): string {
	if (name) {
		const parts = name.split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0]![0]}${parts[parts.length - 1]![0]}`;
		}
		return name.slice(0, 2);
	}
	return email.slice(0, 2);
}

function formatDaysAgo(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return "today";
	if (diffDays === 1) return "1d ago";
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
	return date.toLocaleDateString();
}

function formatResponseTime(mins: number): string {
	if (mins < 60) return `${Math.round(mins)}m`;
	if (mins < 1440) return `${Math.round(mins / 60)}h`;
	return `${Math.round(mins / 1440)}d`;
}

function formatDateTime(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}
