import { MOTION_CONSTANTS } from "@/components/constant";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type Contact,
	useArchiveContact,
	useContacts,
	useContactTags,
	useStarContact,
} from "@/hooks/use-contacts";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import {
	Archive,
	ArchiveRestore,
	ArrowUpDown,
	Search,
	Star,
	Users,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ── Route ── */

type ContactSearch = {
	q?: string;
	starred?: boolean;
	archived?: boolean;
	tagId?: string;
	company?: string;
	sort?: string;
};

export const Route = createFileRoute("/_authenticated/_app/module/crm/list/")({
	component: ContactListPage,
	validateSearch: (search: Record<string, unknown>): ContactSearch => ({
		q: search.q as string | undefined,
		starred: search.starred === true || search.starred === "true" || undefined,
		archived:
			search.archived === true || search.archived === "true" || undefined,
		tagId: search.tagId as string | undefined,
		company: search.company as string | undefined,
		sort: search.sort as string | undefined,
	}),
});

/* ── Keyboard shortcuts ── */

const CONTACT_LIST_SHORTCUTS = [
	[
		{ keys: ["/"], label: "search" },
		{ keys: ["\u23CE"], label: "open" },
		{ keys: ["S"], label: "star" },
		{ keys: ["E"], label: "archive" },
	],
	[
		{ keys: ["J/K"], label: "navigate" },
		{ keys: ["["], label: "back" },
	],
];

/* ── Component ── */

function ContactListPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();

	const sort = search.sort ?? "recent";

	const { data, isLoading, fetchNextPage, hasNextPage } = useContacts({
		q: search.q,
		starred: search.starred,
		archived: search.archived,
		tagId: search.tagId,
		company: search.company,
		sort,
	});
	const starContact = useStarContact();
	const archiveContact = useArchiveContact();
	const { data: tags } = useContactTags();

	const allContacts: Contact[] =
		data?.pages.flatMap((page) => (page?.contacts as Contact[]) ?? []) ?? [];

	// Tag lookup
	const tagMap = useMemo(() => {
		const map = new Map<string, string>();
		if (tags) {
			for (const t of tags) map.set(t.id, t.name);
		}
		return map;
	}, [tags]);

	// Focus + selection state
	const [focusIndex, setFocusIndex] = useState(0);
	const focusRefs = useRef<Map<number, HTMLElement>>(new Map());

	// Search state — debounced
	const [searchInput, setSearchInput] = useState(search.q ?? "");
	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [showSearch, setShowSearch] = useState(!!search.q);
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	const handleSearchChange = useCallback(
		(q: string) => {
			setSearchInput(q);
			if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
			searchTimerRef.current = setTimeout(() => {
				navigate({
					search: { ...search, q: q || undefined },
				});
			}, 300);
		},
		[navigate, search],
	);

	// Keyboard navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;

			if (target === searchInputRef.current && e.key === "Escape") {
				e.preventDefault();
				searchInputRef.current?.blur();
				if (!searchInput) setShowSearch(false);
				return;
			}

			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;

			switch (e.key) {
				case "j":
				case "ArrowDown":
					e.preventDefault();
					setFocusIndex((i) => Math.min(i + 1, allContacts.length - 1));
					break;
				case "k":
				case "ArrowUp":
					e.preventDefault();
					setFocusIndex((i) => Math.max(i - 1, 0));
					break;
				case "Enter": {
					e.preventDefault();
					const contact = allContacts[focusIndex];
					if (contact) {
						navigate({
							to: "/module/crm/$contactId",
							params: { contactId: contact.id },
						});
					}
					break;
				}
				case "s": {
					e.preventDefault();
					const contact = allContacts[focusIndex];
					if (contact) starContact.mutate(contact.id);
					break;
				}
				case "e": {
					e.preventDefault();
					const contact = allContacts[focusIndex];
					if (contact) archiveContact.mutate(contact.id);
					break;
				}
				case "/":
					e.preventDefault();
					setShowSearch(true);
					setTimeout(() => searchInputRef.current?.focus(), 0);
					break;
				case "[":
					e.preventDefault();
					navigate({ to: "/module/crm" });
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		allContacts,
		focusIndex,
		navigate,
		searchInput,
		starContact,
		archiveContact,
	]);

	// Scroll focused item into view
	useEffect(() => {
		focusRefs.current.get(focusIndex)?.scrollIntoView({
			block: "nearest",
			behavior: "smooth",
		});
	}, [focusIndex]);

	// Page title
	const title = search.starred
		? "starred"
		: search.archived
			? "archived"
			: search.tagId
				? (tagMap.get(search.tagId) ?? "contacts")
				: "contacts";

	return (
		<>
			<ScrollArea className="h-[calc(100dvh)] md:h-dvh">
				<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
					{/* Header */}
					<motion.header
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.5, ease: MOTION_CONSTANTS.EASE }}
					>
						<h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] text-foreground tracking-[0.01em] leading-[1.08] lowercase mt-2">
							{title}
						</h1>
						<p className="font-mono text-[12px] text-grey-2 tracking-[0.02em] mt-1">
							{search.archived
								? "Contacts you've archived."
								: search.starred
									? "Your most important contacts."
									: "All your contacts in one place."}
						</p>
					</motion.header>

					{/* Filters bar */}
					<motion.div
						className="mt-6 flex items-center gap-2 flex-wrap"
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.08,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{/* Search */}
						{showSearch ? (
							<div className="relative flex-1 min-w-[200px]">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-grey-3" />
								<Input
									ref={searchInputRef}
									value={searchInput}
									onChange={(e) => handleSearchChange(e.target.value)}
									placeholder="Search contacts..."
									className="pl-9 pr-8 h-8 font-mono text-[12px]"
									autoFocus
								/>
								{searchInput && (
									<button
										type="button"
										onClick={() => {
											handleSearchChange("");
											setShowSearch(false);
										}}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-3 hover:text-foreground cursor-pointer"
									>
										<X className="size-3.5" />
									</button>
								)}
							</div>
						) : (
							<button
								type="button"
								onClick={() => {
									setShowSearch(true);
									setTimeout(() => searchInputRef.current?.focus(), 0);
								}}
								className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:border-border/60 text-grey-3 hover:text-foreground transition-all text-[12px] font-mono cursor-pointer"
							>
								<Search className="size-3" />
								Search
							</button>
						)}

						{/* Sort */}
						<SortButton
							value={sort}
							onChange={(s) =>
								navigate({ search: { ...search, sort: s || undefined } })
							}
						/>

						{/* Active filters */}
						{search.starred && (
							<FilterPill
								label="Starred"
								onClear={() =>
									navigate({ search: { ...search, starred: undefined } })
								}
							/>
						)}
						{search.archived && (
							<FilterPill
								label="Archived"
								onClear={() =>
									navigate({ search: { ...search, archived: undefined } })
								}
							/>
						)}
						{search.tagId && (
							<FilterPill
								label={`Tag: ${tagMap.get(search.tagId) ?? search.tagId}`}
								onClear={() =>
									navigate({ search: { ...search, tagId: undefined } })
								}
							/>
						)}
						{search.company && (
							<FilterPill
								label={`Company: ${search.company}`}
								onClear={() =>
									navigate({ search: { ...search, company: undefined } })
								}
							/>
						)}
					</motion.div>

					{/* Content */}
					<motion.div
						className="mt-6 pb-16"
						initial={{ opacity: 0, y: 16 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.18,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						{isLoading ? (
							<div className="animate-pulse space-y-3 mt-4">
								{[0, 1, 2, 3, 4].map((i) => (
									<div
										key={i}
										className="rounded-lg border border-border/20 p-3.5"
									>
										<div className="flex items-center gap-3">
											<div className="size-8 rounded-full bg-secondary/30" />
											<div>
												<div className="h-4 w-36 bg-secondary/30 rounded" />
												<div className="h-3 w-48 bg-secondary/20 rounded mt-1" />
											</div>
											<div className="h-3 w-12 bg-secondary/20 rounded ml-auto" />
										</div>
									</div>
								))}
							</div>
						) : allContacts.length === 0 ? (
							<div className="py-16 flex flex-col items-center gap-3">
								<div className="size-10 rounded-full bg-foreground/5 flex items-center justify-center">
									<Users className="size-4 text-foreground/40" />
								</div>
								<p className="font-serif text-[15px] text-grey-2 italic text-center">
									{search.q
										? "No contacts match your search."
										: search.starred || search.archived || search.tagId
											? "No contacts match these filters."
											: "No contacts yet — run discovery to get started."}
								</p>
							</div>
						) : (
							<div>
								{allContacts.map((contact, i) => (
									<ContactRow
										key={contact.id}
										contact={contact}
										isFocused={i === focusIndex}
										focusRef={(el) => {
											if (el) focusRefs.current.set(i, el);
											else focusRefs.current.delete(i);
										}}
										onClick={() =>
											navigate({
												to: "/module/crm/$contactId",
												params: { contactId: contact.id },
											})
										}
										onStar={() => starContact.mutate(contact.id)}
										onArchive={() => archiveContact.mutate(contact.id)}
									/>
								))}
								{hasNextPage && (
									<button
										type="button"
										onClick={() => fetchNextPage()}
										className="w-full py-4 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										Load more
									</button>
								)}
							</div>
						)}
					</motion.div>
				</div>
			</ScrollArea>

			<KeyboardShortcutBar shortcuts={CONTACT_LIST_SHORTCUTS} />
		</>
	);
}

/* ── Contact row ── */

function ContactRow({
	contact,
	isFocused,
	focusRef,
	onClick,
	onStar,
	onArchive,
}: {
	contact: Contact;
	isFocused: boolean;
	focusRef: (el: HTMLElement | null) => void;
	onClick: () => void;
	onStar: () => void;
	onArchive: () => void;
}) {
	const initials = getInitials(contact.name, contact.primaryEmail);

	return (
		<div
			ref={focusRef}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === "Enter") onClick();
			}}
			role="button"
			tabIndex={0}
			className={cn(
				"group flex items-center gap-3 rounded-lg border px-4 py-3 mb-1.5 transition-colors duration-150 cursor-pointer",
				isFocused
					? "border-border/70 bg-secondary/10"
					: "border-border/30 hover:border-border/60",
			)}
		>
			{/* Avatar */}
			<div className="size-8 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
				<span className="font-mono text-[10px] text-grey-2 uppercase">
					{initials}
				</span>
			</div>

			{/* Info */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-body text-[14px] text-foreground tracking-[0.01em] truncate">
						{contact.name ?? contact.primaryEmail}
					</span>
					{contact.starred && (
						<Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
					)}
				</div>
				<div className="flex items-center gap-2 mt-0.5">
					{contact.name && (
						<span className="font-mono text-[11px] text-grey-3 truncate">
							{contact.primaryEmail}
						</span>
					)}
					{contact.company && (
						<>
							{contact.name && (
								<span className="font-mono text-[11px] text-grey-3">·</span>
							)}
							<span className="font-mono text-[11px] text-grey-3 truncate">
								{contact.company}
							</span>
						</>
					)}
				</div>
			</div>

			{/* Score */}
			<div className="shrink-0 text-right hidden sm:block">
				<ScoreBadge score={contact.relationshipScore} />
			</div>

			{/* Actions */}
			<div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onStar();
					}}
					className="p-1 rounded hover:bg-secondary/30 transition-colors cursor-pointer"
					title={contact.starred ? "Unstar" : "Star"}
				>
					<Star
						className={cn(
							"size-3.5",
							contact.starred ? "text-amber-500 fill-amber-500" : "text-grey-3",
						)}
					/>
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onArchive();
					}}
					className="p-1 rounded hover:bg-secondary/30 transition-colors cursor-pointer"
					title={contact.archived ? "Unarchive" : "Archive"}
				>
					{contact.archived ? (
						<ArchiveRestore className="size-3.5 text-grey-3" />
					) : (
						<Archive className="size-3.5 text-grey-3" />
					)}
				</button>
			</div>
		</div>
	);
}

/* ── Score badge ── */

function ScoreBadge({ score }: { score: number }) {
	const color =
		score >= 70
			? "text-emerald-500"
			: score >= 40
				? "text-amber-500"
				: "text-grey-3";

	return (
		<div className="flex flex-col items-center">
			<span className={cn("font-display text-[15px] leading-none", color)}>
				{score}
			</span>
			<span className="font-mono text-[8px] text-grey-3 mt-0.5">score</span>
		</div>
	);
}

/* ── Sort button ── */

function SortButton({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const options = [
		{ value: "recent", label: "Recent" },
		{ value: "name", label: "Name" },
		{ value: "score", label: "Score" },
	];

	const currentIdx = options.findIndex((o) => o.value === value);

	return (
		<button
			type="button"
			onClick={() => {
				const nextIdx = (currentIdx + 1) % options.length;
				onChange(options[nextIdx]!.value);
			}}
			className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 hover:border-border/60 text-grey-3 hover:text-foreground transition-all text-[12px] font-mono cursor-pointer"
		>
			<ArrowUpDown className="size-3" />
			{options[currentIdx]?.label ?? "Recent"}
		</button>
	);
}

/* ── Filter pill ── */

function FilterPill({
	label,
	onClear,
}: {
	label: string;
	onClear: () => void;
}) {
	return (
		<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary/20 font-mono text-[11px] text-grey-2">
			{label}
			<button
				type="button"
				onClick={onClear}
				className="hover:text-foreground transition-colors cursor-pointer"
			>
				<X className="size-3" />
			</button>
		</span>
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
