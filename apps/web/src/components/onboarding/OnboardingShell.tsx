import Logo from "@/components/Logo";
import { cn } from "@/lib/utils";

import ProgressIndicator from "./ProgressIndicator";

export default function OnboardingShell({
	step,
	wide,
	children,
	onBack,
}: {
	step: number;
	wide?: boolean;
	children: React.ReactNode;
	onBack?: () => void;
}) {
	return (
		<div className="min-h-dvh bg-background flex flex-col items-center px-6 sm:px-10 pb-16 pt-12">
			{/* Logo + wordmark */}
			<div className="flex items-center gap-2.5">
				<Logo className="size-5 shrink-0 text-foreground" />
				<span className="font-display text-[1.3rem] text-foreground tracking-[0.03em] lowercase">
					wingmnn
				</span>
			</div>

			{/* Progress */}
			<ProgressIndicator current={step} />

			{/* Content */}
			<div
				className={cn("w-full mt-8", wide ? "max-w-[780px]" : "max-w-[640px]")}
			>
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="mb-6 font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors duration-150 cursor-pointer bg-transparent border-none p-0 tracking-[0.02em]"
					>
						&larr; Back
					</button>
				)}

				{children}
			</div>
		</div>
	);
}
