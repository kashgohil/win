import {
	getProviderStyle,
	getSyncIndicator,
} from "@/components/mail/provider-utils";
import { SettingsSheet } from "@/components/mail/SettingsSheet";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "@tanstack/react-db";
import { Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function AccountSelector() {
	const { data: accounts, isLoading } = useLiveQuery(mailAccountsCollection);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { activeAccountIds, toggle, resetToAll } = useMailAccountFilter();
	const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
	const avatarRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const isFiltered = activeAccountIds !== "all";
	const isAccountActive = useCallback(
		(id: string) => activeAccountIds === "all" || activeAccountIds.has(id),
		[activeAccountIds],
	);

	// Keyboard navigation for account avatars
	useEffect(() => {
		if (accounts.length < 2) return;

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

			// Number keys: 1-9 toggle accounts, 0 resets to all
			if (e.key === "0") {
				e.preventDefault();
				resetToAll();
				setFocusedIndex(null);
				return;
			}

			const num = Number.parseInt(e.key, 10);
			const account = accounts[num - 1];
			if (num >= 1 && account) {
				e.preventDefault();
				toggle(account.id);
				setFocusedIndex(num - 1);
				return;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [accounts, toggle, resetToAll]);

	// Focus avatar button when focusedIndex changes
	useEffect(() => {
		if (focusedIndex !== null) {
			avatarRefs.current[focusedIndex]?.focus();
		}
	}, [focusedIndex]);

	if (isLoading || accounts.length === 0) return null;

	const activeCount = isFiltered ? activeAccountIds.size : accounts.length;
	const filterLabel = isFiltered
		? `${activeCount} of ${accounts.length}`
		: "all";

	const handleAvatarKeyDown = (e: React.KeyboardEvent, index: number) => {
		switch (e.key) {
			case "ArrowLeft": {
				e.preventDefault();
				const prev = index > 0 ? index - 1 : accounts.length - 1;
				setFocusedIndex(prev);
				break;
			}
			case "ArrowRight": {
				e.preventDefault();
				const next = index < accounts.length - 1 ? index + 1 : 0;
				setFocusedIndex(next);
				break;
			}
			case "Enter":
			case " ": {
				e.preventDefault();
				const acc = accounts[index];
				if (acc) toggle(acc.id);
				break;
			}
			case "Home": {
				e.preventDefault();
				setFocusedIndex(0);
				break;
			}
			case "End": {
				e.preventDefault();
				setFocusedIndex(accounts.length - 1);
				break;
			}
			case "Escape": {
				e.preventDefault();
				setFocusedIndex(null);
				(e.target as HTMLElement).blur();
				break;
			}
		}
	};

	return (
		<>
			<div className="flex items-center gap-1.5">
				{accounts.length > 1 && (
					<span className="font-mono text-[10px] uppercase text-grey-3 tracking-wider select-none">
						{filterLabel}
					</span>
				)}
				<TooltipProvider>
					<div
						className="flex items-center -space-x-2"
						role="toolbar"
						aria-label="Account filter"
					>
						{accounts.map((account, i) => {
							const provider = getProviderStyle(account.provider);
							const sync = getSyncIndicator(account.syncStatus);
							const active = isAccountActive(account.id);
							const focused = focusedIndex === i;

							return (
								<Tooltip key={account.id}>
									<TooltipTrigger asChild>
										<button
											ref={(el) => {
												avatarRefs.current[i] = el;
											}}
											type="button"
											onClick={() => {
												if (accounts.length > 1) toggle(account.id);
											}}
											onKeyDown={(e) => handleAvatarKeyDown(e, i)}
											tabIndex={focused ? 0 : -1}
											className={cn(
												"relative size-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 border-background transition-all duration-150 cursor-pointer",
												provider.bg,
												provider.text,
												// Active states
												active && !isFiltered && "hover:z-10 hover:scale-110",
												active &&
													isFiltered &&
													`ring-2 ${provider.ring} scale-105 z-10`,
												// Inactive (dimmed) state
												!active &&
													"opacity-35 grayscale scale-95 hover:opacity-60 hover:grayscale-50",
												// Keyboard focus
												focused && "ring-2 ring-foreground/30 z-20",
											)}
											style={{
												zIndex: focused
													? 20
													: active && isFiltered
														? 10
														: accounts.length - i,
											}}
										>
											{provider.initial}
											<span
												className={cn(
													"absolute -bottom-px -right-px size-2 rounded-full ring-2 ring-background",
													sync.color,
													sync.animate && "animate-pulse",
												)}
											/>
										</button>
									</TooltipTrigger>
									<TooltipContent side="bottom" sideOffset={8}>
										<div className="flex flex-col gap-0.5">
											<span className="font-medium capitalize">
												{account.provider}
											</span>
											<span className="opacity-70">{account.email}</span>
											{accounts.length > 1 && (
												<span className="font-mono text-[10px] opacity-50">
													{active ? "click to remove" : "click to add"}
												</span>
											)}
										</div>
									</TooltipContent>
								</Tooltip>
							);
						})}
					</div>
				</TooltipProvider>
				<button
					type="button"
					onClick={() => setSettingsOpen(true)}
					className="size-7 rounded-full border border-dashed border-border/60 flex items-center justify-center text-grey-3 hover:text-foreground hover:border-border transition-colors cursor-pointer"
				>
					<Plus className="size-3.5" />
				</button>
			</div>
			<SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
		</>
	);
}
