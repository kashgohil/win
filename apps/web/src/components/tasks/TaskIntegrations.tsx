import { ConfirmDialog } from "@/components/tasks/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
	useConnections,
	useConnectProvider,
	useDisconnectProvider,
	useSyncConnection,
} from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plug, RefreshCw, Trash2, Unplug } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PROVIDERS = [
	{
		key: "linear",
		name: "Linear",
		description: "Import issues from your Linear workspace",
	},
] as const;

export function TaskIntegrations() {
	const { data: connections, isLoading } = useConnections();
	const connectProvider = useConnectProvider();
	const syncConnection = useSyncConnection();
	const disconnectProvider = useDisconnectProvider();
	const [disconnectId, setDisconnectId] = useState<string | null>(null);

	const handleConnect = (provider: string) => {
		connectProvider.mutate(provider, {
			onSuccess: (data) => {
				if (data?.url) {
					window.location.href = data.url;
				}
			},
			onError: () => toast.error("Failed to initiate connection"),
		});
	};

	const handleSync = (connectionId: string) => {
		syncConnection.mutate(connectionId, {
			onSuccess: (data) => {
				toast("Sync complete", {
					description: `Imported ${data?.imported ?? 0} tasks from ${data?.projects ?? 0} projects`,
				});
			},
			onError: () => toast.error("Sync failed"),
		});
	};

	const handleDisconnect = () => {
		if (!disconnectId) return;
		disconnectProvider.mutate(disconnectId, {
			onSuccess: () => {
				toast("Integration disconnected");
				setDisconnectId(null);
			},
			onError: () => toast.error("Failed to disconnect"),
		});
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="h-16 rounded-lg bg-secondary/20 animate-pulse"
					/>
				))}
			</div>
		);
	}

	const connectionsByProvider = new Map(
		(connections ?? []).map((c) => [c.provider, c]),
	);

	return (
		<div className="space-y-3">
			{PROVIDERS.map((provider) => {
				const connection = connectionsByProvider.get(provider.key);
				const isConnected = connection?.status === "active";

				return (
					<div
						key={provider.key}
						className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-secondary/5 px-4 py-3"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div
								className={cn(
									"size-8 rounded-md flex items-center justify-center",
									isConnected
										? "bg-emerald-500/10 text-emerald-500"
										: "bg-secondary/30 text-grey-3",
								)}
							>
								{isConnected ? (
									<Plug className="size-4" />
								) : (
									<Unplug className="size-4" />
								)}
							</div>
							<div className="min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-body text-[14px] text-foreground font-medium">
										{provider.name}
									</span>
									{isConnected && (
										<span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-500">
											<Check className="size-2.5" />
											Connected
										</span>
									)}
								</div>
								<span className="font-body text-[12px] text-grey-3 block truncate">
									{isConnected
										? (connection.externalWorkspaceName ?? provider.description)
										: provider.description}
								</span>
								{isConnected && connection.lastSyncAt && (
									<span className="font-mono text-[10px] text-grey-3">
										Last synced:{" "}
										{new Date(connection.lastSyncAt).toLocaleDateString(
											undefined,
											{
												month: "short",
												day: "numeric",
												hour: "numeric",
												minute: "2-digit",
											},
										)}
									</span>
								)}
							</div>
						</div>

						<div className="flex items-center gap-1.5 shrink-0">
							{isConnected ? (
								<>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleSync(connection.id)}
										disabled={syncConnection.isPending}
										className="font-mono text-[11px] gap-1.5"
									>
										{syncConnection.isPending ? (
											<Loader2 className="size-3 animate-spin" />
										) : (
											<RefreshCw className="size-3" />
										)}
										Sync
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setDisconnectId(connection.id)}
										disabled={disconnectProvider.isPending}
										className="font-mono text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1.5"
									>
										<Trash2 className="size-3" />
									</Button>
								</>
							) : (
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleConnect(provider.key)}
									disabled={connectProvider.isPending}
									className="font-mono text-[11px] gap-1.5"
								>
									{connectProvider.isPending ? (
										<Loader2 className="size-3 animate-spin" />
									) : (
										<Plug className="size-3" />
									)}
									Connect
								</Button>
							)}
						</div>
					</div>
				);
			})}

			<ConfirmDialog
				open={!!disconnectId}
				onOpenChange={(open) => !open && setDisconnectId(null)}
				title="disconnect integration"
				description="This will remove the connection and stop syncing tasks. Your imported tasks will remain but will no longer receive updates."
				actionLabel="Disconnect"
				destructive
				onConfirm={handleDisconnect}
			/>
		</div>
	);
}
