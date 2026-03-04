import { cn } from "@/lib/utils";
import type { EmailProvider } from "@wingmnn/types";
import { ArrowRight, Mail } from "lucide-react";

export interface ProviderConfig {
	key: EmailProvider;
	name: string;
	description: string;
	iconBg: string;
	iconText: string;
	enabled: boolean;
}

export function ProviderCard({
	provider,
	loading,
	onConnect,
}: {
	provider: ProviderConfig;
	loading?: boolean;
	onConnect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={() => provider.enabled && onConnect()}
			disabled={!provider.enabled || loading}
			className={cn(
				"group relative w-full rounded-lg border bg-background p-4 text-left transition-all duration-200",
				provider.enabled
					? "border-border/40 hover:border-border/70 hover:bg-secondary/10 cursor-pointer"
					: "border-border/20 opacity-50 cursor-not-allowed",
			)}
		>
			<div className="flex items-center gap-3.5">
				<div
					className={cn(
						"size-9 rounded-md flex items-center justify-center shrink-0 transition-colors duration-200",
						provider.iconBg,
					)}
				>
					<Mail className={cn("size-4", provider.iconText)} />
				</div>

				<div className="flex-1 min-w-0">
					<p className="font-display text-[15px] text-foreground lowercase leading-tight">
						{provider.name}
					</p>
					<p className="font-mono text-[10px] text-grey-3 mt-0.5 tracking-[0.02em]">
						{provider.description}
					</p>
				</div>

				{provider.enabled ? (
					<ArrowRight className="size-3.5 text-grey-3 shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
				) : (
					<span className="font-mono text-[9px] text-grey-3 uppercase tracking-[0.08em] shrink-0">
						Soon
					</span>
				)}
			</div>
		</button>
	);
}
