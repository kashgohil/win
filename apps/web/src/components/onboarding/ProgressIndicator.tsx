import { cn } from "@/lib/utils";
import { Fragment } from "react";

const STEPS = ["Profile", "Modules", "Connect", "Preferences"];

export default function ProgressIndicator({ current }: { current: number }) {
	return (
		<nav className="w-full max-w-[440px] mx-auto pt-8 pb-2">
			<div className="flex items-start">
				{STEPS.map((label, i) => {
					const step = i + 1;
					const isActive = step === current;
					const isCompleted = step < current;
					const isPast = step <= current;

					return (
						<Fragment key={label}>
							{i > 0 && (
								<div
									className={cn(
										"flex-1 h-px mt-[4px] transition-colors duration-300",
										isPast ? "bg-foreground" : "bg-border",
									)}
								/>
							)}
							<div className="flex flex-col items-center gap-2.5">
								<div
									className={cn(
										"size-[9px] rounded-full shrink-0 transition-all duration-300",
										isActive &&
											"bg-accent-red shadow-[0_0_0_4px_rgba(192,57,43,0.08)]",
										isCompleted && "bg-foreground",
										!isActive && !isCompleted && "bg-border",
									)}
								/>
								<span
									className={cn(
										"font-mono text-[10px] tracking-[0.04em] whitespace-nowrap",
										isActive
											? "text-foreground font-medium"
											: isCompleted
												? "text-grey-2"
												: "text-grey-3",
									)}
								>
									{label}
								</span>
							</div>
						</Fragment>
					);
				})}
			</div>
		</nav>
	);
}
