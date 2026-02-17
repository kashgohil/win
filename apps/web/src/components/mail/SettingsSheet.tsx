import { AccountCard } from "@/components/mail/AccountCard";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	useConnectAccount,
	useDisconnectAccount,
	useMailAccounts,
} from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import type { EmailProvider } from "@wingmnn/types";
import { ArrowRight, Mail } from "lucide-react";

const PROVIDERS: {
	key: EmailProvider;
	name: string;
	description: string;
	accent: string;
	hoverAccent: string;
	iconBg: string;
	iconText: string;
	enabled: boolean;
}[] = [
	{
		key: "gmail",
		name: "gmail",
		description: "Google Workspace & personal accounts",
		accent: "border-accent-red/20",
		hoverAccent: "hover:border-accent-red/40 hover:bg-accent-red/[0.02]",
		iconBg: "bg-accent-red/10",
		iconText: "text-accent-red",
		enabled: true,
	},
	{
		key: "outlook",
		name: "outlook",
		description: "Microsoft 365 & personal accounts",
		accent: "border-[#0078d4]/15",
		hoverAccent: "hover:border-[#0078d4]/30 hover:bg-[#0078d4]/[0.02]",
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
	const { data, isPending } = useMailAccounts();
	const connectAccount = useConnectAccount();
	const disconnectAccount = useDisconnectAccount();

	const handleConnect = async (provider: EmailProvider) => {
		const result = await connectAccount.mutateAsync(provider);
		if (result?.url) {
			window.location.href = result.url;
		}
	};

	const accounts = data?.accounts ?? [];
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
											onDisconnect={() => disconnectAccount.mutate(account.id)}
											isDisconnecting={disconnectAccount.isPending}
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
								<button
									key={provider.key}
									type="button"
									onClick={() =>
										provider.enabled && handleConnect(provider.key)
									}
									disabled={!provider.enabled || connectAccount.isPending}
									className={cn(
										"group relative w-full rounded-lg border p-4 text-left transition-all duration-200",
										provider.accent,
										provider.enabled
											? cn(provider.hoverAccent, "cursor-pointer")
											: "opacity-50 cursor-not-allowed",
									)}
								>
									<div className="flex items-start gap-3">
										<div
											className={cn(
												"size-10 rounded-full flex items-center justify-center shrink-0",
												provider.iconBg,
											)}
										>
											<Mail className={cn("size-4", provider.iconText)} />
										</div>
										<div className="flex-1 min-w-0">
											<p className="font-display text-[16px] text-foreground lowercase leading-tight">
												{provider.name}
											</p>
											<p className="font-mono text-[10px] text-grey-2 mt-0.5 tracking-[0.02em]">
												{provider.description}
											</p>
											{!provider.enabled && (
												<span className="inline-block font-mono text-[9px] text-grey-3 uppercase tracking-widest mt-1.5">
													Coming soon
												</span>
											)}
										</div>
										{provider.enabled && (
											<ArrowRight className="size-4 text-grey-3 shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform duration-200" />
										)}
									</div>
								</button>
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
					className="rounded-lg border border-border/30 p-4 animate-pulse"
				>
					<div className="flex items-start gap-3">
						<div className="size-10 rounded-full bg-secondary/40" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-40 bg-secondary/40 rounded" />
							<div className="h-2.5 w-16 bg-secondary/25 rounded" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
