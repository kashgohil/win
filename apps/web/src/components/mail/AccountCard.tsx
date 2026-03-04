import { ConfirmButton } from "@/components/ui/confirm-button";
import { cn } from "@/lib/utils";
import type { SerializedAccount } from "@wingmnn/types";
import { RefreshCw, Trash2 } from "lucide-react";
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
		<div className="group relative rounded-lg border border-border/40 bg-background hover:border-border/70 transition-colors duration-200">
			<div className="flex items-start gap-3.5 px-4 py-3.5">
				{/* Provider badge */}
				<div
					className={cn(
						"size-9 rounded-md flex items-center justify-center font-mono text-[12px] font-semibold shrink-0 mt-0.5",
						provider.bg,
						provider.text,
					)}
				>
					{provider.initial}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<p className="font-body text-[13px] text-foreground tracking-[0.01em] truncate leading-tight">
						{account.email}
					</p>
					<p className="font-mono text-[10px] text-grey-3 capitalize mt-0.5">
						{account.provider}
					</p>

					{/* Sync status row */}
					<div className="flex items-center gap-2 mt-2">
						<div className="flex items-center gap-1.5">
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
						</div>
						{account.lastSyncAt && (
							<>
								<span className="text-border text-[6px]">&middot;</span>
								<span className="inline-flex items-center gap-1 font-mono text-[9px] text-grey-3">
									<RefreshCw className="size-2.5" />
									{formatLastSync(account.lastSyncAt)}
								</span>
							</>
						)}
					</div>
				</div>

				{/* Disconnect */}
				<ConfirmButton
					title="disconnect account"
					description={`This will remove ${account.email} and all synced emails. This action cannot be undone.`}
					confirmLabel="Disconnect"
					onConfirm={onDisconnect}
				>
					<button
						type="button"
						className="size-7 rounded-md flex items-center justify-center text-grey-3 opacity-0 group-hover:opacity-100 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-150 shrink-0 cursor-pointer"
						aria-label="Disconnect account"
					>
						<Trash2 className="size-3.5" />
					</button>
				</ConfirmButton>
			</div>
		</div>
	);
}
