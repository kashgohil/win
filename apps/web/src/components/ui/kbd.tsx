import type * as React from "react";

import { cn } from "@/lib/utils";

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				"inline-flex items-center justify-center font-mono text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded",
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
