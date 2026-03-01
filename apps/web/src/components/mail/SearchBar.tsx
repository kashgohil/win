import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useMailSenders } from "@/hooks/use-mail";
import { parseSearchQuery } from "@/lib/parse-search-query";
import { cn } from "@/lib/utils";
import {
	AtSign,
	Bookmark,
	BookmarkPlus,
	Calendar,
	Clock,
	Mail,
	Paperclip,
	Search,
	Star,
	Tag,
	Type,
	User,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, CATEGORY_CONFIG } from "./category-colors";

const RECENT_SEARCHES_KEY = "mail-recent-searches";
const SAVED_SEARCHES_KEY = "mail-saved-searches";
const MAX_RECENT = 5;
const MAX_SAVED = 10;

export type SearchFilters = {
	q?: string;
	from?: string;
	subject?: string;
	to?: string;
	cc?: string;
	label?: string;
	category?: string;
	starred?: boolean;
	attachment?: boolean;
	after?: string;
	before?: string;
};

type SavedSearch = {
	name: string;
	filters: SearchFilters;
};

type SearchCommandProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: SearchFilters;
	onFiltersChange: (filters: SearchFilters) => void;
	activeCategory?: string | null;
};

function getRecentSearches(): string[] {
	try {
		const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function saveRecentSearch(query: string) {
	const recent = getRecentSearches().filter((s) => s !== query);
	recent.unshift(query);
	localStorage.setItem(
		RECENT_SEARCHES_KEY,
		JSON.stringify(recent.slice(0, MAX_RECENT)),
	);
}

function getSavedSearches(): SavedSearch[] {
	try {
		const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

function addSavedSearch(entry: SavedSearch) {
	const saved = getSavedSearches().filter((s) => s.name !== entry.name);
	saved.unshift(entry);
	localStorage.setItem(
		SAVED_SEARCHES_KEY,
		JSON.stringify(saved.slice(0, MAX_SAVED)),
	);
}

function removeSavedSearch(name: string) {
	const saved = getSavedSearches().filter((s) => s.name !== name);
	localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(saved));
}

export function hasActiveFilters(filters: SearchFilters): boolean {
	return !!(
		filters.q ||
		filters.from ||
		filters.subject ||
		filters.to ||
		filters.cc ||
		filters.label ||
		filters.starred ||
		filters.attachment ||
		filters.after ||
		filters.before
	);
}

const OPERATOR_HINTS = [
	{ value: "from:", label: "from:", description: "Filter by sender" },
	{ value: "to:", label: "to:", description: "Filter by recipient" },
	{ value: "cc:", label: "cc:", description: "Filter by CC" },
	{
		value: "subject:",
		label: "subject:",
		description: "Filter by subject line",
	},
	{ value: "label:", label: "label:", description: "Filter by label" },
	{
		value: "category:",
		label: "category:",
		description: "Filter by category",
	},
	{
		value: "has:attachment",
		label: "has:attachment",
		description: "Has attachments",
	},
	{ value: "is:starred", label: "is:starred", description: "Starred emails" },
	{ value: "is:unread", label: "is:unread", description: "Unread emails" },
	{
		value: "after:",
		label: "after:YYYY-MM-DD",
		description: "Received after date",
	},
	{
		value: "before:",
		label: "before:YYYY-MM-DD",
		description: "Received before date",
	},
];

export function SearchCommand({
	open,
	onOpenChange,
	filters,
	onFiltersChange,
}: SearchCommandProps) {
	const [inputValue, setInputValue] = useState("");
	const [senderQuery, setSenderQuery] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [saveInput, setSaveInput] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const saveInputRef = useRef<HTMLInputElement>(null);

	const { data: sendersData } = useMailSenders(senderQuery);
	const senders = sendersData?.senders ?? [];

	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

	// Load recent/saved on open, reset input
	useEffect(() => {
		if (open) {
			setRecentSearches(getRecentSearches());
			setSavedSearches(getSavedSearches());
			setInputValue(filters.q ?? "");
			setSavingName(false);
			setSaveInput("");
		}
	}, [open, filters.q]);

	const close = useCallback(() => onOpenChange(false), [onOpenChange]);

	const submitSearch = useCallback(
		(raw: string) => {
			const trimmed = raw.trim();
			if (trimmed) saveRecentSearch(trimmed);

			const parsed = parseSearchQuery(trimmed);

			const merged: SearchFilters = {};
			if (parsed.q) merged.q = parsed.q;
			if (parsed.from) merged.from = parsed.from;
			else if (filters.from) merged.from = filters.from;
			if (parsed.subject) merged.subject = parsed.subject;
			else if (filters.subject) merged.subject = filters.subject;
			if (parsed.to) merged.to = parsed.to;
			else if (filters.to) merged.to = filters.to;
			if (parsed.cc) merged.cc = parsed.cc;
			else if (filters.cc) merged.cc = filters.cc;
			if (parsed.label) merged.label = parsed.label;
			else if (filters.label) merged.label = filters.label;
			if (parsed.category) merged.category = parsed.category;
			if (parsed.starred) merged.starred = parsed.starred;
			else if (filters.starred) merged.starred = filters.starred;
			if (parsed.attachment) merged.attachment = parsed.attachment;
			else if (filters.attachment) merged.attachment = filters.attachment;
			if (parsed.after) merged.after = parsed.after;
			else if (filters.after) merged.after = filters.after;
			if (parsed.before) merged.before = parsed.before;
			else if (filters.before) merged.before = filters.before;

			onFiltersChange(merged);
			close();
		},
		[filters, onFiltersChange, close],
	);

	const handleInputChange = (value: string) => {
		setInputValue(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSenderQuery(value);
		}, 300);
	};

	const setFilter = (key: keyof SearchFilters, value: unknown) => {
		onFiltersChange({ ...filters, [key]: value });
		close();
	};

	const selectSender = (address: string) => {
		onFiltersChange({ ...filters, q: undefined, from: address });
		close();
	};

	const selectRecentSearch = (query: string) => {
		submitSearch(query);
	};

	const insertOperator = (op: string) => {
		setInputValue((prev) => (prev ? `${prev} ${op}` : op));
		requestAnimationFrame(() => inputRef.current?.focus());
	};

	const applySavedSearch = (saved: SavedSearch) => {
		onFiltersChange(saved.filters);
		close();
	};

	const handleSaveSearch = () => {
		const name = saveInput.trim();
		if (!name) return;
		addSavedSearch({ name, filters });
		setSavedSearches(getSavedSearches());
		setSavingName(false);
		setSaveInput("");
	};

	const handleDeleteSaved = (name: string, e: React.MouseEvent) => {
		e.stopPropagation();
		removeSavedSearch(name);
		setSavedSearches(getSavedSearches());
	};

	const showSaveButton = hasActiveFilters(filters) && !savingName;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="p-0 gap-0 overflow-hidden sm:max-w-lg top-[20%] translate-y-0"
			>
				<DialogTitle className="sr-only">Search emails</DialogTitle>
				<Command shouldFilter={false} loop>
					<div className="flex items-center border-b px-3">
						<CommandInput
							ref={inputRef}
							value={inputValue}
							onValueChange={handleInputChange}
							placeholder="Search emails..."
							className="flex-1 h-11 px-3 font-body text-[13px] text-foreground placeholder:text-grey-3 bg-transparent outline-none"
							wrapperClassName="flex-1 border-none pl-0"
							autoFocus
						/>
						{showSaveButton && (
							<button
								type="button"
								onClick={() => {
									setSavingName(true);
									requestAnimationFrame(() => saveInputRef.current?.focus());
								}}
								aria-label="Save current search"
								className="text-grey-3 hover:text-foreground transition-colors cursor-pointer p-1"
							>
								<BookmarkPlus className="size-3.5" />
							</button>
						)}
						<Kbd className="ml-2 shrink-0 text-grey-3">esc</Kbd>
					</div>

					{savingName && (
						<div className="flex items-center gap-2 px-3 py-2 border-b">
							<input
								ref={saveInputRef}
								type="text"
								value={saveInput}
								onChange={(e) => setSaveInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleSaveSearch();
									if (e.key === "Escape") {
										setSavingName(false);
										setSaveInput("");
									}
								}}
								placeholder="Name this search..."
								className="flex-1 font-body text-[12px] text-foreground placeholder:text-grey-3 bg-transparent outline-none"
							/>
							<button
								type="button"
								onClick={handleSaveSearch}
								disabled={!saveInput.trim()}
								className="font-body text-[12px] text-foreground hover:text-foreground/80 disabled:text-grey-3 disabled:cursor-not-allowed cursor-pointer transition-colors"
							>
								Save
							</button>
							<button
								type="button"
								onClick={() => {
									setSavingName(false);
									setSaveInput("");
								}}
								className="font-body text-[12px] text-grey-3 hover:text-foreground cursor-pointer transition-colors"
							>
								Cancel
							</button>
						</div>
					)}

					<CommandList className="max-h-72">
						<CommandEmpty className="py-8 text-center font-body text-[13px] text-grey-3">
							No results
						</CommandEmpty>

						{inputValue ? (
							<>
								<CommandGroup heading="Search">
									<CommandItem
										value={inputValue}
										onSelect={() => submitSearch(inputValue)}
										className="gap-2 cursor-pointer"
									>
										<Search className="size-3 shrink-0 text-grey-3" />
										<span className="font-body text-[13px] truncate">
											Search for "{inputValue}"
										</span>
									</CommandItem>
								</CommandGroup>
								{senders.length > 0 && (
									<CommandGroup heading="Senders">
										{senders.slice(0, 5).map((sender) => (
											<CommandItem
												key={sender.address}
												value={`sender:${sender.address}`}
												onSelect={() => selectSender(sender.address)}
												className="gap-2 cursor-pointer"
											>
												<Mail className="size-3 shrink-0 text-grey-3" />
												<div className="flex-1 min-w-0">
													{sender.name && (
														<span className="font-body text-[13px] truncate block">
															{sender.name}
														</span>
													)}
													<span className="font-body text-[11px] text-grey-3 truncate block">
														{sender.address}
													</span>
												</div>
												<span className="font-mono text-[10px] text-grey-3 shrink-0">
													{sender.count}
												</span>
											</CommandItem>
										))}
									</CommandGroup>
								)}
								<CommandGroup heading="Filters">
									<CommandItem
										value="filter:starred"
										onSelect={() =>
											setFilter("starred", !filters.starred || undefined)
										}
										className="gap-2 cursor-pointer"
									>
										<Star className="size-3 shrink-0 text-grey-3" />
										<span className="font-body text-[13px]">Starred only</span>
									</CommandItem>
									<CommandItem
										value="filter:attachment"
										onSelect={() =>
											setFilter("attachment", !filters.attachment || undefined)
										}
										className="gap-2 cursor-pointer"
									>
										<Paperclip className="size-3 shrink-0 text-grey-3" />
										<span className="font-body text-[13px]">
											Has attachments
										</span>
									</CommandItem>
								</CommandGroup>
								<CommandSeparator />
								<CommandGroup heading="Operators">
									{OPERATOR_HINTS.map((op) => (
										<CommandItem
											key={op.value}
											value={`op:${op.value}`}
											onSelect={() => insertOperator(op.value)}
											className="gap-2 cursor-pointer"
										>
											<span className="font-mono text-[11px] text-grey-3 shrink-0 w-28 truncate">
												{op.label}
											</span>
											<span className="font-body text-[11px] text-grey-3">
												{op.description}
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						) : (
							<>
								{recentSearches.length > 0 && (
									<CommandGroup heading="Recent">
										{recentSearches.map((query) => (
											<CommandItem
												key={query}
												value={`recent:${query}`}
												onSelect={() => selectRecentSearch(query)}
												className="gap-2 cursor-pointer"
											>
												<Clock className="size-3 shrink-0 text-grey-3" />
												<span className="font-body text-[13px] truncate">
													{query}
												</span>
											</CommandItem>
										))}
									</CommandGroup>
								)}
								{savedSearches.length > 0 && (
									<CommandGroup heading="Saved searches">
										{savedSearches.map((saved) => (
											<CommandItem
												key={saved.name}
												value={`saved:${saved.name}`}
												onSelect={() => applySavedSearch(saved)}
												className="gap-2 cursor-pointer group/saved"
											>
												<Bookmark className="size-3 shrink-0 text-grey-3" />
												<span className="font-body text-[13px] truncate flex-1">
													{saved.name}
												</span>
												<button
													type="button"
													onClick={(e) => handleDeleteSaved(saved.name, e)}
													aria-label={`Delete saved search "${saved.name}"`}
													className="opacity-0 group-hover/saved:opacity-100 text-grey-3 hover:text-foreground focus-visible:opacity-100 focus-visible:text-foreground focus-visible:outline-none rounded-sm transition-all cursor-pointer p-0.5"
												>
													<X className="size-2.5" />
												</button>
											</CommandItem>
										))}
									</CommandGroup>
								)}
								<CommandGroup heading="Quick filters">
									<CommandItem
										value="filter:starred"
										onSelect={() =>
											setFilter("starred", !filters.starred || undefined)
										}
										className="gap-2 cursor-pointer"
									>
										<Star className="size-3 shrink-0 text-grey-3" />
										<span className="font-body text-[13px]">Starred</span>
									</CommandItem>
									<CommandItem
										value="filter:attachment"
										onSelect={() =>
											setFilter("attachment", !filters.attachment || undefined)
										}
										className="gap-2 cursor-pointer"
									>
										<Paperclip className="size-3 shrink-0 text-grey-3" />
										<span className="font-body text-[13px]">
											Has attachments
										</span>
									</CommandItem>
								</CommandGroup>
								<CommandGroup heading="Categories">
									{CATEGORIES.map((cat) => (
										<CommandItem
											key={cat.value}
											value={`category:${cat.value}`}
											onSelect={() => submitSearch(`category:${cat.value}`)}
											className="gap-2 cursor-pointer"
										>
											<span
												className={cn("size-2 rounded-full shrink-0", cat.dot)}
											/>
											<span className="font-body text-[13px]">{cat.label}</span>
										</CommandItem>
									))}
								</CommandGroup>
								<CommandSeparator />
								<CommandGroup heading="Operators">
									{OPERATOR_HINTS.map((op) => (
										<CommandItem
											key={op.value}
											value={`op:${op.value}`}
											onSelect={() => insertOperator(op.value)}
											className="gap-2 cursor-pointer"
										>
											<span className="font-mono text-[11px] text-grey-3 shrink-0 w-28 truncate">
												{op.label}
											</span>
											<span className="font-body text-[11px] text-grey-3">
												{op.description}
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</DialogContent>
		</Dialog>
	);
}

/* ── Filter chips (rendered inline by the inbox) ── */

export function SearchFilterChips({
	filters,
	onRemoveFilter,
	onClearAll,
	activeCategory,
}: {
	filters: SearchFilters;
	onRemoveFilter: (key: keyof SearchFilters) => void;
	onClearAll: () => void;
	activeCategory?: string | null;
}) {
	if (!hasActiveFilters(filters) && !activeCategory) return null;

	return (
		<ul
			className="flex flex-wrap items-center gap-1.5 list-none m-0 p-0"
			aria-label="Active search filters"
		>
			{filters.q && (
				<FilterChip
					icon={<Search className="size-3" />}
					label={filters.q}
					onRemove={() => onRemoveFilter("q")}
				/>
			)}
			{filters.from && (
				<FilterChip
					icon={<User className="size-3" />}
					label={`from: ${filters.from}`}
					onRemove={() => onRemoveFilter("from")}
				/>
			)}
			{filters.to && (
				<FilterChip
					icon={<AtSign className="size-3" />}
					label={`to: ${filters.to}`}
					onRemove={() => onRemoveFilter("to")}
				/>
			)}
			{filters.cc && (
				<FilterChip
					icon={<AtSign className="size-3" />}
					label={`cc: ${filters.cc}`}
					onRemove={() => onRemoveFilter("cc")}
				/>
			)}
			{filters.subject && (
				<FilterChip
					icon={<Type className="size-3" />}
					label={`subject: ${filters.subject}`}
					onRemove={() => onRemoveFilter("subject")}
				/>
			)}
			{filters.label && (
				<FilterChip
					icon={<Tag className="size-3" />}
					label={`label: ${filters.label}`}
					onRemove={() => onRemoveFilter("label")}
				/>
			)}
			{filters.starred && (
				<FilterChip
					icon={<Star className="size-3" />}
					label="starred"
					onRemove={() => onRemoveFilter("starred")}
				/>
			)}
			{filters.attachment && (
				<FilterChip
					icon={<Paperclip className="size-3" />}
					label="has attachment"
					onRemove={() => onRemoveFilter("attachment")}
				/>
			)}
			{filters.after && (
				<FilterChip
					icon={<Calendar className="size-3" />}
					label={`after: ${new Date(filters.after).toLocaleDateString()}`}
					onRemove={() => onRemoveFilter("after")}
				/>
			)}
			{filters.before && (
				<FilterChip
					icon={<Calendar className="size-3" />}
					label={`before: ${new Date(filters.before).toLocaleDateString()}`}
					onRemove={() => onRemoveFilter("before")}
				/>
			)}
			{activeCategory && (
				<li>
					<Badge
						variant="secondary"
						className="gap-1 font-body text-[11px] py-0.5 px-2"
					>
						<span
							className={cn(
								"size-1.5 rounded-full shrink-0",
								CATEGORY_CONFIG[activeCategory as keyof typeof CATEGORY_CONFIG]
									?.dot,
							)}
						/>
						{activeCategory}
					</Badge>
				</li>
			)}
			{hasActiveFilters(filters) && (
				<li>
					<button
						type="button"
						onClick={onClearAll}
						className="font-body text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer ml-1"
					>
						Clear all
					</button>
				</li>
			)}
		</ul>
	);
}

/* ── Subcomponents ── */

function FilterChip({
	icon,
	label,
	onRemove,
}: {
	icon: React.ReactNode;
	label: string;
	onRemove: () => void;
}) {
	return (
		<li>
			<Badge
				variant="secondary"
				className="gap-1.5 font-body text-[11px] py-0.5 px-2 cursor-default"
			>
				{icon}
				{label}
				<button
					type="button"
					onClick={onRemove}
					aria-label={`Remove ${label} filter`}
					className="ml-0.5 text-grey-3 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm transition-colors cursor-pointer"
				>
					<X className="size-2.5" />
				</button>
			</Badge>
		</li>
	);
}
