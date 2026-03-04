import { AccountCard } from "@/components/mail/AccountCard";
import {
	ProviderCard,
	type ProviderConfig,
} from "@/components/mail/ProviderCard";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { useConnectAccount } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { useLiveQuery } from "@tanstack/react-db";
import type { EmailProvider } from "@wingmnn/types";
import { Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { MOTION_CONSTANTS } from "../constant";

const PROVIDERS: ProviderConfig[] = [
	{
		key: "gmail",
		name: "gmail",
		description: "Google Workspace & personal accounts",
		iconBg: "bg-accent-red/10",
		iconText: "text-accent-red",
		enabled: true,
	},
	{
		key: "outlook",
		name: "outlook",
		description: "Microsoft 365 & personal accounts",
		iconBg: "bg-[#0078d4]/10",
		iconText: "text-[#0078d4]",
		enabled: false,
	},
];

export function SettingsSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: accounts, isLoading: isPending } = useLiveQuery(
		mailAccountsCollection,
	);
	const connectAccount = useConnectAccount();

	const handleConnect = async (provider: EmailProvider) => {
		const result = await connectAccount.mutateAsync(provider);
		if (result?.url) {
			window.location.href = result.url;
		}
	};

	const handleDisconnect = (accountId: string) => {
		mailAccountsCollection.utils.writeDelete(accountId);
		api.mail.accounts({ id: accountId }).delete();
	};

	const hasAccounts = accounts.length > 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:w-[400px] sm:max-w-[440px] p-0 overflow-y-auto"
			>
				{/* Header */}
				<div className="px-6 pt-6 pb-4">
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
							<Settings2 size={18} />
						</div>
						<div>
							<SheetTitle className="font-display text-[1.1rem] font-medium tracking-[0.01em] lowercase">
								mail settings
							</SheetTitle>
							<span className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.12em]">
								accounts
							</span>
						</div>
					</div>
					<SheetDescription className="font-serif text-[0.85rem] text-grey-2 mt-3 leading-relaxed">
						Connect and manage your email accounts. Wingmnn syncs your inbox to
						organize, triage, and surface what matters.
					</SheetDescription>
				</div>

				{/* Connected accounts */}
				{(hasAccounts || isPending) && (
					<div className="px-6 pt-5 pb-2">
						<div className="flex items-center gap-3">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Connected
							</span>
							<div className="flex-1 h-px bg-border/50" />
							{hasAccounts && (
								<span className="font-mono text-[10px] text-grey-2 tabular-nums">
									{accounts.length}
								</span>
							)}
						</div>

						<div className="mt-4 space-y-2">
							{isPending ? (
								<SettingsSkeleton />
							) : (
								accounts.map((account, i) => (
									<motion.div
										key={account.id}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.4,
											ease: MOTION_CONSTANTS.EASE,
											delay: i * 0.06,
										}}
									>
										<AccountCard
											account={account}
											onDisconnect={() => handleDisconnect(account.id)}
										/>
									</motion.div>
								))
							)}
						</div>
					</div>
				)}

				{/* Add provider */}
				<div className="px-6 pt-5 pb-8">
					{!hasAccounts && !isPending ? (
						<>
							<p className="font-serif text-[0.85rem] text-grey-2 italic mb-5">
								Link your first email account to get started.
							</p>
						</>
					) : (
						<div className="flex items-center gap-3 mb-4">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Add provider
							</span>
							<div className="flex-1 h-px bg-border/50" />
						</div>
					)}

					<div className="space-y-2">
						{PROVIDERS.map((provider, i) => (
							<motion.div
								key={provider.key}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.4,
									ease: MOTION_CONSTANTS.EASE,
									delay: (hasAccounts ? accounts.length : 0) * 0.06 + i * 0.06,
								}}
							>
								<ProviderCard
									provider={provider}
									loading={connectAccount.isPending}
									onConnect={() => handleConnect(provider.key)}
								/>
							</motion.div>
						))}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function SettingsSkeleton() {
	return (
		<div className="space-y-2">
			{[0, 1].map((i) => (
				<div
					key={i}
					className="rounded-lg border border-border/40 bg-background animate-pulse"
				>
					<div className="flex items-start gap-3.5 px-4 py-3.5">
						<div className="size-9 rounded-md bg-secondary/40 shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-40 bg-secondary/40 rounded" />
							<div className="h-2.5 w-16 bg-secondary/25 rounded" />
							<div className="h-2 w-24 bg-secondary/20 rounded mt-1" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
