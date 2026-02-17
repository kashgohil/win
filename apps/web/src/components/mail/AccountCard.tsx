import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SerializedAccount, SyncStatus } from "@wingmnn/types";
import { RefreshCw, Unplug } from "lucide-react";

function formatLastSync(iso: string | null): string {
	if (!iso) return "Never synced";
	const date = new Date(iso);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "Synced just now";
	if (diffMin < 60) return `Synced ${diffMin}m ago`;

	const diffH = Math.floor(diffMin / 60);
	if (diffH < 24) return `Synced ${diffH}h ago`;

	const diffD = Math.floor(diffH / 24);
	return `Synced ${diffD}d ago`;
}

function formatConnectedDate(iso: string): string {
	return new Date(iso).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

function getSyncIndicator(status: SyncStatus) {
	switch (status) {
		case "syncing":
			return { color: "bg-foreground/50", animate: true, label: "Syncing" };
		case "synced":
			return { color: "bg-green-600/70", animate: false, label: "Active" };
		case "error":
			return { color: "bg-accent-red", animate: false, label: "Error" };
		default:
			return { color: "bg-grey-3", animate: false, label: "Pending" };
	}
}

function getProviderStyle(provider: string) {
	switch (provider) {
		case "gmail":
			return {
				accent: "border-accent-red/25",
				bg: "bg-accent-red/[0.06]",
				text: "text-accent-red",
				initial: "G",
			};
		case "outlook":
			return {
				accent: "border-[#0078d4]/25",
				bg: "bg-[#0078d4]/[0.06]",
				text: "text-[#0078d4]",
				initial: "O",
			};
		default:
			return {
				accent: "border-border/40",
				bg: "bg-secondary/50",
				text: "text-foreground",
				initial: "?",
			};
	}
}

export function AccountCard({
	account,
	onDisconnect,
	isDisconnecting,
}: {
	account: SerializedAccount;
	onDisconnect: () => void;
	isDisconnecting: boolean;
}) {
	const sync = getSyncIndicator(account.syncStatus);
	const provider = getProviderStyle(account.provider);

	return (
		<div
			className={cn(
				"group rounded-lg border p-4 transition-all duration-200 hover:border-border/60",
				provider.accent,
			)}
		>
			<div className="flex items-start gap-4">
				{/* Provider avatar */}
				<div
					className={cn(
						"size-11 rounded-full flex items-center justify-center font-mono text-[15px] font-semibold shrink-0",
						provider.bg,
						provider.text,
					)}
				>
					{provider.initial}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<p className="font-body text-[15px] text-foreground font-medium tracking-[0.01em] truncate">
						{account.email}
					</p>
					<div className="flex items-center gap-2 mt-1.5">
						<span
							className={cn(
								"size-1.5 rounded-full shrink-0",
								sync.color,
								sync.animate && "animate-pulse",
							)}
						/>
						<span className="font-mono text-[10px] text-grey-2 uppercase tracking-widest">
							{sync.label}
						</span>
					</div>
					<div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border/20">
						<div className="flex items-center gap-1.5">
							<RefreshCw className="size-3 text-grey-3" />
							<span className="font-mono text-[10px] text-grey-3">
								{formatLastSync(account.lastSyncAt)}
							</span>
						</div>
						<span className="text-grey-3 text-[8px]">&middot;</span>
						<span className="font-mono text-[10px] text-grey-3">
							Connected {formatConnectedDate(account.createdAt)}
						</span>
					</div>
				</div>

				{/* Actions */}
				<Button
					variant="ghost"
					size="sm"
					onClick={onDisconnect}
					disabled={isDisconnecting}
					className="font-mono text-[11px] text-grey-3 hover:text-accent-red h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0"
				>
					<Unplug className="size-3 mr-1" />
					{isDisconnecting ? "..." : "Disconnect"}
				</Button>
			</div>
		</div>
	);
}
