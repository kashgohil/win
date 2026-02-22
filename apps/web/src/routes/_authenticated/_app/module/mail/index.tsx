import { MOTION_CONSTANTS } from "@/components/constant";
import { EmailRow, groupEmailsByTime } from "@/components/mail/EmailRow";
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
import { mailKeys, useMailEmails } from "@/hooks/use-mail";
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
import { ArrowRight, CheckCircle, Plus, XCircle } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

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
	"Send as-is": "send_draft",
	"Send follow-up": "send_draft",
	"Reply with summary": "send_draft",
	Dismiss: "dismiss",
	Archive: "archive",
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
	const [status, setStatus] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	useEffect(() => {
		if (connected) {
			setStatus({
				type: "success",
				message: "Gmail connected successfully. Syncing your inbox...",
			});
			queryClient.invalidateQueries({ queryKey: mailKeys.accounts() });
			navigate({ replace: true });
		} else if (error) {
			const message =
				error === "access_denied"
					? "Access was denied. Please try again."
					: `Connection failed: ${error}`;
			setStatus({ type: "error", message });
			navigate({ replace: true });
		}
	}, [connected, error, navigate, queryClient]);

	useEffect(() => {
		if (!status) return;
		const timer = setTimeout(() => setStatus(null), 5000);
		return () => clearTimeout(timer);
	}, [status]);

	const handleAction = (itemId: string, actionLabel: string) => {
		const action = ACTION_MAP[actionLabel] ?? "dismiss";

		mailTriageCollection.utils.writeDelete(itemId);
		api.mail.triage({ id: itemId }).action.post({ action });
	};

	const handleDismiss = (itemId: string) => {
		mailTriageCollection.utils.writeDelete(itemId);
		api.mail.triage({ id: itemId }).action.post({ action: "dismiss" });
	};

	const moduleData: ModuleData | undefined =
		!isPending && !triageError
			? {
					briefing,
					triage:
						triage.length > 0
							? triage.map((t) => ({
									...t,
									sourceModule: t.sourceModule as ModuleKey | undefined,
								}))
							: MODULE_DATA.mail.triage,
					autoHandled: autoHandled.map((a) => ({
						...a,
						linkedModule: a.linkedModule as ModuleKey | undefined,
					})),
				}
			: undefined;

	const { data: recentEmails } = useMailEmails({ limit: 5 });
	const clusters = recentEmails?.emails
		? groupEmailsByTime(recentEmails.emails)
		: [];

	return (
		<>
			{status && (
				<motion.div
					initial={{ opacity: 0, y: -8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -8 }}
					className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-[13px] font-body ${
						status.type === "success"
							? "border-emerald-500/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
							: "border-red-500/20 bg-red-500/5 text-red-700 dark:text-red-400"
					}`}
				>
					{status.type === "success" ? (
						<CheckCircle className="size-4 shrink-0" />
					) : (
						<XCircle className="size-4 shrink-0" />
					)}
					{status.message}
				</motion.div>
			)}
			<ModulePage
				moduleKey="mail"
				data={moduleData ?? MODULE_DATA.mail}
				onAction={handleAction}
				onDismiss={handleDismiss}
				isLoading={isPending}
				headerActions={<MailHeaderActions />}
			>
				{/* Recent emails preview */}
				{clusters.length > 0 && (
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.15,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="px-(--page-px) max-w-5xl mx-auto pb-16"
					>
						<div className="flex items-center gap-3 mb-4">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Recent
							</span>
							<div className="flex-1 h-px bg-border/50" />
							<Link
								to="/module/mail/inbox"
								className="group inline-flex items-center gap-1 font-mono text-[11px] text-grey-2 hover:text-foreground transition-colors duration-150"
							>
								View inbox
								<ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform duration-150" />
							</Link>
						</div>

						{clusters.map((cluster) => (
							<div key={cluster.label ?? "today"}>
								{cluster.label && (
									<div className="pt-4 pb-1.5">
										<span className="font-body text-[13px] text-grey-3">
											{cluster.label}
										</span>
									</div>
								)}
								{cluster.emails.map((email) => (
									<EmailRow key={email.id} email={email} />
								))}
							</div>
						))}
					</motion.div>
				)}
			</ModulePage>
		</>
	);
}

function MailHeaderActions() {
	const { data: accounts, isLoading } = useLiveQuery(mailAccountsCollection);
	const [settingsOpen, setSettingsOpen] = useState(false);

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

	return (
		<>
			<div className="flex items-center gap-1.5">
				<TooltipProvider>
					<div className="flex items-center -space-x-2">
						{accounts.map((account, i) => {
							const provider = getProviderStyle(account.provider);
							const sync = getSyncIndicator(account.syncStatus);
							return (
								<Tooltip key={account.id}>
									<TooltipTrigger asChild>
										<button
											type="button"
											className={cn(
												"relative size-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 border-background cursor-default transition-transform hover:z-10 hover:scale-110",
												provider.bg,
												provider.text,
											)}
											style={{ zIndex: accounts.length - i }}
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
