import type * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<input
			type={type}
			data-slot="input"
			className={cn(
				"w-full min-w-0 h-12.5 rounded-sm border border-input bg-transparent px-[18px] font-mono text-[13px] text-foreground placeholder:text-grey-3 outline-none transition-colors focus:border-grey-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
				"file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
				"aria-invalid:border-destructive",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
