import { cn } from "@/lib/utils";

const STEPS = ["Profile", "Modules", "Connect", "Preferences"];

export default function ProgressIndicator({ current }: { current: number }) {
	return (
		<div className="flex items-center justify-center gap-0 py-6">
			{STEPS.map((label, i) => {
				const step = i + 1;
				const isActive = step === current;
				const isCompleted = step < current;

				return (
					<div key={label} className="flex items-center">
						{i > 0 && (
							<div
								className={cn(
									"w-8 h-px transition-colors duration-300",
									isCompleted || isActive ? "bg-ink" : "bg-grey-4",
								)}
							/>
						)}
						<div className="flex flex-col items-center gap-1.5">
							<div
								className={cn(
									"size-2.5 rounded-full transition-all duration-300",
									isActive && "bg-accent-red scale-125",
									isCompleted && "bg-ink",
									!isActive && !isCompleted && "bg-grey-4",
								)}
							/>
							<span
								className={cn(
									"font-mono text-[10px] tracking-[0.04em]",
									isActive
										? "text-ink font-medium"
										: isCompleted
											? "text-grey-2"
											: "text-grey-3",
								)}
							>
								{label}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
