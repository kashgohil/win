import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useMailSenders } from "@/hooks/use-mail";
import { parseSearchQuery } from "@/lib/parse-search-query";
import { cn } from "@/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
	filename?: string;
	filetype?: string;
	after?: string;
	before?: string;
};

type SavedSearch = {
	name: string;
	filters: SearchFilters;
};

type SearchChip = {
	id: string;
	raw: string;
	operator: string;
	value: string;
};

const BOOLEAN_OPS = ["has:attachment", "is:starred", "is:unread"];

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
		filters.filename ||
		filters.filetype ||
		filters.after ||
		filters.before
	);
}

function parseCategoryFromRecent(query: string) {
	const match = query.match(/^category:(\w+)$/);
	if (!match) return null;
	const config = CATEGORY_CONFIG[match[1] as keyof typeof CATEGORY_CONFIG];
	return config ? { value: match[1], ...config } : null;
}

/** Convert a SearchFilters object into displayable operator pairs */
function filtersToOperators(
	f: SearchFilters,
): { operator: string; value: string }[] {
	const ops: { operator: string; value: string }[] = [];
	if (f.from) ops.push({ operator: "from", value: f.from });
	if (f.to) ops.push({ operator: "to", value: f.to });
	if (f.cc) ops.push({ operator: "cc", value: f.cc });
	if (f.subject) ops.push({ operator: "subject", value: f.subject });
	if (f.label) ops.push({ operator: "label", value: f.label });
	if (f.category) ops.push({ operator: "category", value: f.category });
	if (f.starred) ops.push({ operator: "is", value: "starred" });
	if (f.attachment) ops.push({ operator: "has", value: "attachment" });
	if (f.filename) ops.push({ operator: "filename", value: f.filename });
	if (f.filetype) ops.push({ operator: "filetype", value: f.filetype });
	if (f.after) ops.push({ operator: "after", value: f.after });
	if (f.before) ops.push({ operator: "before", value: f.before });
	return ops;
}

/** Split a raw query into operator tokens and free text for display */
const OPERATOR_TOKEN_RE = /(\w+:(?:"[^"]*"|[^\s]+))/g;

function tokenizeQuery(query: string): {
	operators: { operator: string; value: string }[];
	freeText: string;
} {
	const operators: { operator: string; value: string }[] = [];
	const freeText = query
		.replace(OPERATOR_TOKEN_RE, (match) => {
			const colonIdx = match.indexOf(":");
			const op = match.substring(0, colonIdx);
			const val = match.substring(colonIdx + 1).replace(/^"|"$/g, "");
			operators.push({ operator: op, value: val });
			return "";
		})
		.replace(/\s+/g, " ")
		.trim();
	return { operators, freeText };
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
	{
		value: "filename:",
		label: "filename:",
		description: "Search by attachment name",
	},
	{
		value: "filetype:",
		label: "filetype:",
		description: "Search by file type (e.g. pdf)",
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

	const [chips, setChips] = useState<SearchChip[]>([]);
	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

	// Load recent/saved on open, restore filters as chips
	useEffect(() => {
		if (open) {
			const restored: SearchChip[] = [];
			const add = (operator: string, value: string) =>
				restored.push({
					id: crypto.randomUUID(),
					raw: `${operator}:${value}`,
					operator,
					value,
				});
			if (filters.from) add("from", filters.from);
			if (filters.to) add("to", filters.to);
			if (filters.cc) add("cc", filters.cc);
			if (filters.subject) add("subject", filters.subject);
			if (filters.label) add("label", filters.label);
			if (filters.category) add("category", filters.category);
			if (filters.starred) add("is", "starred");
			if (filters.attachment) add("has", "attachment");
			if (filters.filename) add("filename", filters.filename);
			if (filters.filetype) add("filetype", filters.filetype);
			if (filters.after) add("after", filters.after);
			if (filters.before) add("before", filters.before);
			setChips(restored);
			setRecentSearches(getRecentSearches());
			setSavedSearches(getSavedSearches());
			setInputValue(filters.q ?? "");
			setSavingName(false);
			setSaveInput("");
		}
	}, [open, filters]);

	const close = useCallback(() => onOpenChange(false), [onOpenChange]);

	const submitSearch = useCallback(
		(raw: string) => {
			const chipParts = chips.map((c) => c.raw);
			const fullQuery = [...chipParts, raw.trim()].filter(Boolean).join(" ");
			if (fullQuery) saveRecentSearch(fullQuery);

			const parsed = parseSearchQuery(fullQuery);

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
			if (parsed.filename) merged.filename = parsed.filename;
			else if (filters.filename) merged.filename = filters.filename;
			if (parsed.filetype) merged.filetype = parsed.filetype;
			else if (filters.filetype) merged.filetype = filters.filetype;
			if (parsed.after) merged.after = parsed.after;
			else if (filters.after) merged.after = filters.after;
			if (parsed.before) merged.before = parsed.before;
			else if (filters.before) merged.before = filters.before;

			setChips([]);
			onFiltersChange(merged);
			close();
		},
		[chips, filters, onFiltersChange, close],
	);

	// Ghost text suggestion based on current input
	const ghostSuggestion = useMemo(() => {
		const words = inputValue.split(/\s+/);
		const lastWord = (words[words.length - 1] || "").toLowerCase();
		if (lastWord.length < 2) return null;

		const match = OPERATOR_HINTS.find(
			(op) =>
				op.value.toLowerCase().startsWith(lastWord) &&
				op.value.toLowerCase() !== lastWord,
		);
		if (!match) return null;
		return {
			ghost: match.value.slice(lastWord.length),
			full: match.value,
		};
	}, [inputValue]);

	const createChip = useCallback((text: string, precedingWords: string[]) => {
		const colonIndex = text.indexOf(":");
		const newChip: SearchChip = {
			id: crypto.randomUUID(),
			raw: text,
			operator: text.substring(0, colonIndex),
			value: text.substring(colonIndex + 1),
		};
		setChips((prev) => [...prev, newChip]);
		const remaining = precedingWords.join(" ");
		setInputValue(remaining ? `${remaining} ` : "");
	}, []);

	const removeChip = useCallback((id: string) => {
		setChips((prev) => prev.filter((c) => c.id !== id));
	}, []);

	const handleInputChange = (value: string) => {
		// Detect chip creation on space after operator:value
		if (value.endsWith(" ") && value.length > 1) {
			const trimmed = value.trimEnd();
			const words = trimmed.split(/\s+/);
			const lastWord = words[words.length - 1];

			const operatorMatch = lastWord.match(/^(\w+):(.+)$/);
			if (BOOLEAN_OPS.includes(lastWord)) {
				createChip(lastWord, words.slice(0, -1));
				return;
			}
			if (
				operatorMatch &&
				OPERATOR_HINTS.some((op) => op.value.startsWith(`${operatorMatch[1]}:`))
			) {
				createChip(lastWord, words.slice(0, -1));
				return;
			}
		}

		setInputValue(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSenderQuery(value);
		}, 300);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Tab") {
			if (!ghostSuggestion) return;
			e.preventDefault();
			const words = inputValue.split(/\s+/);
			const completed = ghostSuggestion.full;
			words[words.length - 1] = completed;

			// Boolean operators become chips immediately
			if (BOOLEAN_OPS.includes(completed)) {
				createChip(completed, words.slice(0, -1));
			} else {
				setInputValue(words.join(" "));
			}
			return;
		}

		if (e.key === "Backspace" && !inputValue && chips.length > 0) {
			e.preventDefault();
			setChips((prev) => prev.slice(0, -1));
		}
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
		if (BOOLEAN_OPS.includes(op)) {
			const colonIndex = op.indexOf(":");
			const newChip: SearchChip = {
				id: crypto.randomUUID(),
				raw: op,
				operator: op.substring(0, colonIndex),
				value: op.substring(colonIndex + 1),
			};
			setChips((prev) => [...prev, newChip]);
		} else {
			setInputValue((prev) => (prev ? `${prev} ${op}` : op));
		}
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
				className="p-0 gap-0 overflow-hidden sm:max-w-2xl w-full top-[18%] translate-y-0"
			>
				<DialogTitle className="sr-only">Search emails</DialogTitle>
				<Command shouldFilter={false} loop>
					<div className="flex items-center flex-wrap gap-1.5 border-b border-border/25 px-3 min-h-[44px] py-1.5">
						<Search className="size-3.5 shrink-0 text-muted-foreground/50" />

						{chips.map((chip) => (
							<span
								key={chip.id}
								className="inline-flex items-center gap-0.5 bg-secondary/60 font-mono text-[11px] pl-2 pr-1 py-0.5 rounded-md animate-in fade-in slide-in-from-left-1 duration-150"
							>
								<span className="text-muted-foreground">{chip.operator}:</span>
								<span className="text-foreground">{chip.value}</span>
								<button
									type="button"
									tabIndex={-1}
									onClick={() => removeChip(chip.id)}
									aria-label={`Remove ${chip.operator} filter`}
									className="text-grey-3 hover:text-foreground transition-colors cursor-pointer p-0.5"
								>
									<X className="size-2.5" />
								</button>
							</span>
						))}

						<div className="relative flex-1 min-w-[100px]">
							<CommandPrimitive.Input
								ref={inputRef}
								value={inputValue}
								onValueChange={handleInputChange}
								onKeyDown={handleKeyDown}
								placeholder={chips.length ? "" : "Search emails..."}
								className="w-full h-8 font-body text-[13px] text-foreground placeholder:text-grey-3 bg-transparent outline-none"
								autoFocus
							/>
							{ghostSuggestion && (
								<div className="absolute inset-y-0 left-0 flex items-center pointer-events-none overflow-hidden w-full">
									<span className="font-body text-[13px] whitespace-pre text-transparent">
										{inputValue}
									</span>
									<span className="font-body text-[13px] text-muted-foreground/35">
										{ghostSuggestion.ghost}
									</span>
								</div>
							)}
						</div>

						<div className="flex items-center gap-1.5 shrink-0 ml-auto">
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
							<Kbd className="text-grey-3">esc</Kbd>
						</div>
					</div>

					{savingName && (
						<div className="flex items-center gap-2 px-3 py-2 border-b border-border/25">
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

					<CommandList className="max-h-96 [&_[cmdk-group]+[cmdk-group]]:border-t [&_[cmdk-group]+[cmdk-group]]:border-border/20">
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
								<CommandGroup heading="Operators">
									{OPERATOR_HINTS.map((op) => (
										<CommandItem
											key={op.value}
											value={`op:${op.value}`}
											onSelect={() => insertOperator(op.value)}
											className="gap-2 cursor-pointer"
										>
											<code className="font-mono text-[11px] text-muted-foreground shrink-0 w-28 truncate">
												{op.label}
											</code>
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
										{recentSearches.map((query) => {
											const cat = parseCategoryFromRecent(query);
											if (cat) {
												return (
													<CommandItem
														key={query}
														value={`recent:${query}`}
														onSelect={() => selectRecentSearch(query)}
														className="gap-2 cursor-pointer"
													>
														<Clock className="size-3 shrink-0 text-grey-3/50" />
														<span
															className={cn(
																"size-2 rounded-full shrink-0",
																cat.dot,
															)}
														/>
														<span className="font-body text-[13px]">
															{cat.label}
														</span>
													</CommandItem>
												);
											}
											const tokens = tokenizeQuery(query);
											return (
												<CommandItem
													key={query}
													value={`recent:${query}`}
													onSelect={() => selectRecentSearch(query)}
													className="gap-2 cursor-pointer"
												>
													<Clock className="size-3 shrink-0 text-grey-3/50" />
													<span className="inline-flex items-center gap-1.5 flex-wrap min-w-0">
														{tokens.operators.map((op) => (
															<span
																key={`${op.operator}:${op.value}`}
																className="inline-flex items-center gap-0.5 bg-secondary/60 font-mono text-[10px] px-1.5 py-px rounded"
															>
																<span className="text-muted-foreground">
																	{op.operator}:
																</span>
																<span className="text-foreground">
																	{op.value}
																</span>
															</span>
														))}
														{tokens.freeText && (
															<span className="font-body text-[12px] text-muted-foreground truncate">
																{tokens.freeText}
															</span>
														)}
													</span>
												</CommandItem>
											);
										})}
									</CommandGroup>
								)}
								{savedSearches.length > 0 && (
									<CommandGroup heading="Saved searches">
										{savedSearches.map((saved) => {
											const ops = filtersToOperators(saved.filters);
											return (
												<CommandItem
													key={saved.name}
													value={`saved:${saved.name}`}
													onSelect={() => applySavedSearch(saved)}
													className="gap-2 cursor-pointer group/saved"
												>
													<Bookmark className="size-3 shrink-0 text-grey-3" />
													<span className="flex-1 min-w-0 inline-flex items-center gap-1.5 flex-wrap">
														<span className="font-body text-[13px] text-foreground">
															{saved.name}
														</span>
														{ops.length > 0 && (
															<span className="inline-flex items-center gap-1 flex-wrap">
																{ops.map((op) => (
																	<span
																		key={`${op.operator}:${op.value}`}
																		className="inline-flex items-center gap-0.5 bg-secondary/60 font-mono text-[10px] px-1.5 py-px rounded"
																	>
																		<span className="text-muted-foreground">
																			{op.operator}:
																		</span>
																		<span className="text-foreground">
																			{op.value}
																		</span>
																	</span>
																))}
															</span>
														)}
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
											);
										})}
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
								<CommandGroup heading="Operators">
									{OPERATOR_HINTS.map((op) => (
										<CommandItem
											key={op.value}
											value={`op:${op.value}`}
											onSelect={() => insertOperator(op.value)}
											className="gap-2 cursor-pointer"
										>
											<code className="font-mono text-[11px] text-muted-foreground shrink-0 w-28 truncate">
												{op.label}
											</code>
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
			{filters.filename && (
				<FilterChip
					icon={<Paperclip className="size-3" />}
					label={`filename: ${filters.filename}`}
					onRemove={() => onRemoveFilter("filename")}
				/>
			)}
			{filters.filetype && (
				<FilterChip
					icon={<Paperclip className="size-3" />}
					label={`filetype: ${filters.filetype}`}
					onRemove={() => onRemoveFilter("filetype")}
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
