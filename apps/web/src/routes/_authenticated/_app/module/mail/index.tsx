import {
	Kbd,
	KeyboardShortcutBar,
	MAIL_HUB_SHORTCUTS,
} from "@/components/mail/KeyboardShortcutBar";
import {
	MailAutoHandledCard,
	type MailAutoHandledItem,
} from "@/components/mail/MailAutoHandledCard";
import {
	getProviderStyle,
	getSyncIndicator,
} from "@/components/mail/provider-utils";
import { SettingsSheet } from "@/components/mail/SettingsSheet";
import ModulePage from "@/components/module/ModulePage";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mailKeys } from "@/hooks/use-mail";
import { useMailAccountFilter } from "@/hooks/use-mail-account-filter";
import { api } from "@/lib/api";
import {
	mailAccountsCollection,
	mailAutoHandledCollection,
	mailBriefingCollection,
	mailTriageCollection,
} from "@/lib/mail-collections";
import type { ModuleData } from "@/lib/module-data";
import { MODULE_DATA } from "@/lib/module-data";
import type { ModuleKey } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import { useLiveQuery } from "@tanstack/react-db";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { TriageAction } from "@wingmnn/types";
import { ArrowRight, Inbox, Paperclip, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type MailSearch = {
	connected?: string;
	error?: string;
};

export const Route = createFileRoute("/_authenticated/_app/module/mail/")({
	component: MailModule,
	validateSearch: (search: Record<string, unknown>): MailSearch => ({
		connected: search.connected as string | undefined,
		error: search.error as string | undefined,
	}),
});

const ACTION_MAP: Record<string, TriageAction> = {
	Reply: "send_draft",
	Archive: "archive",
	Dismiss: "dismiss",
	Snooze: "snooze",
};

function MailModule() {
	const {
		data: triage,
		isLoading: triageLoading,
		isError: triageError,
	} = useLiveQuery(mailTriageCollection);

	const { data: autoHandled, isLoading: autoLoading } = useLiveQuery(
		mailAutoHandledCollection,
	);

	const { data: briefing, isLoading: briefingLoading } = useLiveQuery(
		mailBriefingCollection,
	);

	const isPending = triageLoading || autoLoading || briefingLoading;

	const { connected, error } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

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

	// Keyboard shortcuts for mail hub
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
				case "a":
					e.preventDefault();
					navigate({ to: "/module/mail/attachments" });
					break;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [navigate]);

	const handleAction = (itemId: string, actionLabel: string) => {
		const action = ACTION_MAP[actionLabel] ?? "dismiss";

		mailTriageCollection.utils.writeDelete(itemId);
		api.mail.triage({ id: itemId }).action.post({ action });
	};

	const handleDismiss = (itemId: string) => {
		mailTriageCollection.utils.writeDelete(itemId);
		api.mail.triage({ id: itemId }).action.post({ action: "dismiss" });
	};

	const handleViewEmail = (emailId: string) => {
		navigate({
			to: "/module/mail/inbox/$emailId",
			params: { emailId },
			search: { view: undefined, category: undefined },
		});
	};

	const moduleData: ModuleData<MailAutoHandledItem> | undefined =
		!isPending && !triageError
			? {
					briefing,
					triage,
					autoHandled: autoHandled.map((a) => ({
						...a,
						linkedModule: a.linkedModule as ModuleKey | undefined,
					})),
				}
			: undefined;

	return (
		<>
			<ModulePage
				moduleKey="mail"
				data={moduleData ?? MODULE_DATA.mail}
				onAction={handleAction}
				onDismiss={handleDismiss}
				renderAutoHandledCard={(item, i) => (
					<MailAutoHandledCard
						key={item.id}
						item={item}
						index={i}
						onViewEmail={handleViewEmail}
					/>
				)}
				isLoading={isPending}
				headerActions={<MailHeaderActions />}
			>
				<div className="px-(--page-px) max-w-5xl mx-auto pb-16 space-y-2">
					<Link
						to="/module/mail/inbox"
						search={{
							view: undefined,
							starred: undefined,
							attachment: undefined,
						}}
						className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 bg-secondary/5 hover:bg-secondary/15 px-5 py-4 transition-colors duration-200"
					>
						<div className="flex items-center gap-3">
							<Inbox className="size-4 text-grey-2 group-hover:text-foreground transition-colors duration-200" />
							<span className="font-body text-[14px] text-foreground/80 group-hover:text-foreground transition-colors duration-200">
								View all emails
							</span>
						</div>
						<ArrowRight className="size-3.5 text-grey-3 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
					</Link>

					<Link
						to="/module/mail/attachments"
						className="group flex items-center justify-between rounded-lg border border-border/40 hover:border-border/70 bg-secondary/5 hover:bg-secondary/15 px-5 py-4 transition-colors duration-200"
					>
						<div className="flex items-center gap-3">
							<Paperclip className="size-4 text-grey-2 group-hover:text-foreground transition-colors duration-200" />
							<span className="font-body text-[14px] text-foreground/80 group-hover:text-foreground transition-colors duration-200">
								All attachments
							</span>
						</div>
						<ArrowRight className="size-3.5 text-grey-3 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
					</Link>
				</div>
			</ModulePage>

			<KeyboardShortcutBar shortcuts={MAIL_HUB_SHORTCUTS} />
		</>
	);
}

function MailHeaderActions() {
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
			if (num >= 1 && num <= accounts.length) {
				e.preventDefault();
				toggle(accounts[num - 1]!.id);
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

	if (isLoading) {
		return (
			<div className="h-6 w-28 rounded-full bg-secondary/30 animate-pulse" />
		);
	}

	if (accounts.length === 0) {
		return (
			<>
				<button
					type="button"
					onClick={() => setSettingsOpen(true)}
					className="font-mono text-[11px] text-accent-red tracking-[0.02em] hover:text-accent-red/80 transition-colors cursor-pointer"
				>
					connect email →
				</button>
				<SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
			</>
		);
	}

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
				toggle(accounts[index]!.id);
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
			<div className="flex items-center gap-3">
				<Link
					to="/module/mail/inbox"
					search={{
						view: undefined,
						starred: undefined,
						attachment: undefined,
					}}
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
				>
					<Inbox className="size-3" />
					<span className="font-body text-[12px]">Inbox</span>
					<Kbd>I</Kbd>
				</Link>

				<Link
					to="/module/mail/attachments"
					className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150"
				>
					<Paperclip className="size-3" />
					<span className="font-body text-[12px]">Attachments</span>
					<Kbd>A</Kbd>
				</Link>

				<div className="w-px h-3.5 bg-border/40" />

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
			</div>
			<SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
		</>
	);
}
