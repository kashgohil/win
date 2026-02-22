import { AccountCard } from "@/components/mail/AccountCard";
import {
	ProviderCard,
	type ProviderConfig,
} from "@/components/mail/ProviderCard";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useConnectAccount } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { useLiveQuery } from "@tanstack/react-db";
import type { EmailProvider } from "@wingmnn/types";

const PROVIDERS: ProviderConfig[] = [
	{
		key: "gmail",
		name: "gmail",
		description: "Google Workspace & personal accounts",
		accent: "border-accent-red/30",
		hoverAccent: "hover:border-accent-red/50 hover:bg-accent-red/[0.03]",
		iconBg: "bg-accent-red/10",
		iconText: "text-accent-red",
		enabled: true,
	},
	{
		key: "outlook",
		name: "outlook",
		description: "Microsoft 365 & personal accounts",
		accent: "border-[#0078d4]/20",
		hoverAccent: "hover:border-[#0078d4]/40 hover:bg-[#0078d4]/[0.03]",
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
			<SheetContent side="right" className="overflow-y-auto">
				<SheetHeader>
					<SheetTitle className="font-display text-[20px] lowercase">
						settings
					</SheetTitle>
					<SheetDescription className="font-mono text-[11px] tracking-[0.02em]">
						Manage connected email accounts.
					</SheetDescription>
				</SheetHeader>

				<div className="px-4 pb-6">
					{/* Connected accounts */}
					{(hasAccounts || isPending) && (
						<section>
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

							<div className="mt-4 space-y-3">
								{isPending ? (
									<SettingsSkeleton />
								) : (
									accounts.map((account) => (
										<AccountCard
											key={account.id}
											account={account}
											onDisconnect={() => handleDisconnect(account.id)}
										/>
									))
								)}
							</div>
						</section>
					)}

					{/* Provider cards */}
					<section className={hasAccounts ? "mt-8" : ""}>
						{!hasAccounts && !isPending && (
							<div className="mb-6">
								<h3 className="font-display text-[18px] text-foreground leading-tight lowercase">
									connect a provider
								</h3>
								<p className="font-serif text-[14px] text-grey-2 italic mt-1">
									Link your email to let Wingmnn manage your inbox.
								</p>
							</div>
						)}

						{hasAccounts && (
							<div className="flex items-center gap-3 mb-4">
								<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
									Add provider
								</span>
								<div className="flex-1 h-px bg-border/50" />
							</div>
						)}

						<div className="space-y-3">
							{PROVIDERS.map((provider) => (
								<ProviderCard
									key={provider.key}
									provider={provider}
									loading={connectAccount.isPending}
									onConnect={() => handleConnect(provider.key)}
								/>
							))}
						</div>
					</section>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function SettingsSkeleton() {
	return (
		<div className="space-y-3">
			{[0, 1].map((i) => (
				<div
					key={i}
					className="flex overflow-hidden rounded-lg bg-secondary/40 animate-pulse"
				>
					<div className="w-1 shrink-0 bg-grey-3/30" />
					<div className="flex flex-1 items-center gap-3 px-3 py-2.5">
						<div className="size-8 rounded-full bg-secondary/60" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-40 bg-secondary/60 rounded" />
							<div className="h-2.5 w-20 bg-secondary/40 rounded" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
