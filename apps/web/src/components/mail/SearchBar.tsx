import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverAnchor,
	PopoverContent,
} from "@/components/ui/popover";
import { useMailSenders } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { Command as CommandPrimitive } from "cmdk";
import {
	Calendar,
	Clock,
	Mail,
	Paperclip,
	Search,
	Star,
	User,
	X,
} from "lucide-react";
import { type Ref, useCallback, useEffect, useRef, useState } from "react";
import { CATEGORY_CONFIG } from "./category-colors";

const RECENT_SEARCHES_KEY = "mail-recent-searches";
const MAX_RECENT = 5;

type SearchFilters = {
	q?: string;
	from?: string;
	starred?: boolean;
	attachment?: boolean;
	after?: string;
	before?: string;
};

type SearchBarProps = {
	filters: SearchFilters;
	onFiltersChange: (filters: SearchFilters) => void;
	activeCategory?: EmailCategory | null;
	inputRef?: Ref<HTMLInputElement>;
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

function hasActiveFilters(filters: SearchFilters): boolean {
	return !!(
		filters.q ||
		filters.from ||
		filters.starred ||
		filters.attachment ||
		filters.after ||
		filters.before
	);
}

export function SearchBar({
	filters,
	onFiltersChange,
	activeCategory,
	inputRef: externalRef,
}: SearchBarProps) {
	const [inputValue, setInputValue] = useState(filters.q ?? "");
	const [open, setOpen] = useState(false);
	const [senderQuery, setSenderQuery] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
	const internalRef = useRef<HTMLInputElement>(null);

	// Merge external and internal refs
	const setRef = useCallback(
		(el: HTMLInputElement | null) => {
			internalRef.current = el;
			if (typeof externalRef === "function") externalRef(el);
			else if (externalRef && typeof externalRef === "object")
				(
					externalRef as React.MutableRefObject<HTMLInputElement | null>
				).current = el;
		},
		[externalRef],
	);

	const { data: sendersData } = useMailSenders(senderQuery);
	const senders = sendersData?.senders ?? [];

	const [recentSearches, setRecentSearches] = useState<string[]>([]);
	useEffect(() => {
		if (open) setRecentSearches(getRecentSearches());
	}, [open]);

	// Sync external filter changes to input value
	useEffect(() => {
		setInputValue(filters.q ?? "");
	}, [filters.q]);

	const submitSearch = useCallback(
		(q: string) => {
			const trimmed = q.trim();
			if (trimmed) saveRecentSearch(trimmed);
			onFiltersChange({ ...filters, q: trimmed || undefined });
			setOpen(false);
		},
		[filters, onFiltersChange],
	);

	const handleInputChange = (value: string) => {
		setInputValue(value);
		if (!open) setOpen(true);

		// Debounce sender autocomplete only — not the email search
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSenderQuery(value);
		}, 300);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			if (open) {
				setOpen(false);
			} else {
				internalRef.current?.blur();
			}
		}
		// Submit search on Enter (cmdk handles Enter for item selection
		// when an item is highlighted — this fires when none is)
		if (e.key === "Enter") {
			submitSearch(inputValue);
		}
	};

	const clearSearch = () => {
		setInputValue("");
		setSenderQuery("");
		if (debounceRef.current) clearTimeout(debounceRef.current);
		onFiltersChange({});
		internalRef.current?.focus();
	};

	const setFilter = (key: keyof SearchFilters, value: unknown) => {
		onFiltersChange({ ...filters, [key]: value });
		setOpen(false);
		internalRef.current?.focus();
	};

	const removeFilter = (key: keyof SearchFilters) => {
		const next = { ...filters };
		delete next[key];
		onFiltersChange(next);
	};

	const selectSender = (address: string) => {
		setInputValue("");
		setSenderQuery("");
		onFiltersChange({ ...filters, q: undefined, from: address });
		setOpen(false);
		internalRef.current?.focus();
	};

	const selectRecentSearch = (query: string) => {
		setInputValue(query);
		submitSearch(query);
		internalRef.current?.focus();
	};

	const showActive = hasActiveFilters(filters);

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen}>
				<Command shouldFilter={false} className="bg-transparent" loop>
					<PopoverAnchor asChild>
						<div className="relative">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-grey-3 pointer-events-none"
								aria-hidden="true"
							/>
							<CommandPrimitive.Input
								ref={setRef}
								value={inputValue}
								onValueChange={handleInputChange}
								onFocus={() => setOpen(true)}
								onKeyDown={handleKeyDown}
								placeholder="Search emails..."
								aria-label="Search emails"
								className={cn(
									"w-full pl-9 pr-9 py-2 rounded-lg border border-border/60 bg-secondary/20",
									"font-body text-[13px] text-foreground placeholder:text-grey-3",
									"outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-border focus-visible:bg-secondary/30",
									"transition-colors duration-150",
								)}
							/>
							{(inputValue || showActive) && (
								<button
									type="button"
									onClick={clearSearch}
									aria-label="Clear search"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-3 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm transition-colors cursor-pointer"
								>
									<X className="size-3.5" />
								</button>
							)}
						</div>
					</PopoverAnchor>

					<PopoverContent
						align="start"
						sideOffset={6}
						className="w-[var(--radix-popover-trigger-width)] p-0"
						onOpenAutoFocus={(e) => e.preventDefault()}
						onCloseAutoFocus={(e) => e.preventDefault()}
					>
						<CommandList>
							<CommandEmpty className="py-4 text-center font-body text-[13px] text-grey-3">
								No suggestions
							</CommandEmpty>

							{inputValue ? (
								<>
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
											<span className="font-body text-[13px]">
												Starred only
											</span>
										</CommandItem>
										<CommandItem
											value="filter:attachment"
											onSelect={() =>
												setFilter(
													"attachment",
													!filters.attachment || undefined,
												)
											}
											className="gap-2 cursor-pointer"
										>
											<Paperclip className="size-3 shrink-0 text-grey-3" />
											<span className="font-body text-[13px]">
												Has attachments
											</span>
										</CommandItem>
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
												setFilter(
													"attachment",
													!filters.attachment || undefined,
												)
											}
											className="gap-2 cursor-pointer"
										>
											<Paperclip className="size-3 shrink-0 text-grey-3" />
											<span className="font-body text-[13px]">
												Has attachments
											</span>
										</CommandItem>
									</CommandGroup>
								</>
							)}
						</CommandList>
					</PopoverContent>
				</Command>
			</Popover>

			{/* Active filter chips */}
			{showActive && (
				<ul
					className="flex flex-wrap items-center gap-1.5 list-none m-0 p-0"
					aria-label="Active search filters"
				>
					{filters.from && (
						<FilterChip
							icon={<User className="size-3" />}
							label={`from: ${filters.from}`}
							onRemove={() => removeFilter("from")}
						/>
					)}
					{filters.starred && (
						<FilterChip
							icon={<Star className="size-3" />}
							label="starred"
							onRemove={() => removeFilter("starred")}
						/>
					)}
					{filters.attachment && (
						<FilterChip
							icon={<Paperclip className="size-3" />}
							label="has attachment"
							onRemove={() => removeFilter("attachment")}
						/>
					)}
					{filters.after && (
						<FilterChip
							icon={<Calendar className="size-3" />}
							label={`after: ${new Date(filters.after).toLocaleDateString()}`}
							onRemove={() => removeFilter("after")}
						/>
					)}
					{filters.before && (
						<FilterChip
							icon={<Calendar className="size-3" />}
							label={`before: ${new Date(filters.before).toLocaleDateString()}`}
							onRemove={() => removeFilter("before")}
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
										CATEGORY_CONFIG[activeCategory]?.dot,
									)}
								/>
								{activeCategory}
							</Badge>
						</li>
					)}
				</ul>
			)}
		</div>
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
