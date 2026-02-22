import { cn } from "@/lib/utils";
import type { EmailProvider } from "@wingmnn/types";
import { ArrowRight, Mail } from "lucide-react";

export interface ProviderConfig {
	key: EmailProvider;
	name: string;
	description: string;
	accent: string;
	hoverAccent: string;
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
				"group relative w-full rounded-lg border border-dashed p-4 text-left transition-all duration-200",
				provider.accent,
				provider.enabled
					? cn(provider.hoverAccent, "cursor-pointer")
					: "opacity-40 cursor-not-allowed",
			)}
		>
			<div className="flex items-center gap-4">
				<div
					className={cn(
						"size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200",
						provider.iconBg,
					)}
				>
					<Mail className={cn("size-[18px]", provider.iconText)} />
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
					<ArrowRight className="size-4 text-grey-3 shrink-0 group-hover:text-foreground group-hover:translate-x-0.5 transition-all duration-200" />
				)}
			</div>
		</button>
	);
}
