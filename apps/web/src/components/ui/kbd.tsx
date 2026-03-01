import type * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-flex items-center justify-center rounded border border-border/50 bg-secondary/40 px-1.5 py-0.5 font-mono text-[10px] font-medium text-foreground/80 shadow-[0_1px_0_0_var(--color-border)]",
				className,
			)}
			{...props}
		/>
	);
}

function KbdGroup({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="kbd-group"
			className={cn("inline-flex items-center gap-0.5", className)}
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
