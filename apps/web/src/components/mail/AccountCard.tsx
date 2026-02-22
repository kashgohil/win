import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { SerializedAccount } from "@wingmnn/types";
import { Unplug } from "lucide-react";
import { getProviderStyle, getSyncIndicator } from "./provider-utils";

function formatLastSync(iso: string | null): string {
	if (!iso) return "Never synced";
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "Just now";
	if (diffMin < 60) return `${diffMin}m ago`;

	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `${diffH}h ago`;

	const diffD = Math.floor(diffH / 24);
	return `${diffD}d ago`;
}

export function AccountCard({
	account,
	onDisconnect,
}: {
	account: SerializedAccount;
	onDisconnect: () => void;
}) {
	const sync = getSyncIndicator(account.syncStatus);
	const provider = getProviderStyle(account.provider);

	return (
		<div className="group relative flex overflow-hidden rounded-lg bg-secondary/40 transition-colors duration-150 hover:bg-secondary/60">
			{/* Left accent bar — the "connected" indicator */}
			<div className={cn("w-1 shrink-0", provider.solidBg)} />

			{/* Content */}
			<div className="flex flex-1 items-center gap-3 px-3 py-2.5 min-w-0">
				{/* Provider badge */}
				<div
					className={cn(
						"size-8 rounded-full flex items-center justify-center font-mono text-[11px] font-semibold shrink-0",
						provider.bg,
						provider.text,
					)}
				>
					{provider.initial}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<p className="font-body text-[13px] text-foreground tracking-[0.01em] truncate">
						{account.email}
					</p>
					<div className="flex items-center gap-2 mt-0.5">
						<span
							className={cn(
								"size-1.5 rounded-full shrink-0",
								sync.color,
								sync.animate && "animate-pulse",
							)}
						/>
						<span className="font-mono text-[9px] text-grey-3 uppercase tracking-widest">
							{sync.label}
						</span>
						<span className="text-border text-[6px]">&middot;</span>
						<span className="font-mono text-[9px] text-grey-3">
							{formatLastSync(account.lastSyncAt)}
						</span>
					</div>
				</div>

				{/* Disconnect */}
				<TooltipProvider>
					<Tooltip>
						<ConfirmButton
							title="disconnect account"
							description={`This will remove ${account.email} and all synced emails. This action cannot be undone.`}
							confirmLabel="Disconnect"
							onConfirm={onDisconnect}
						>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="size-7 text-grey-3 opacity-0 group-hover:opacity-100 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-150 shrink-0"
								>
									<Unplug className="size-3.5" />
								</Button>
							</TooltipTrigger>
						</ConfirmButton>
						<TooltipContent side="left" sideOffset={4}>
							Disconnect
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
		</div>
	);
}
