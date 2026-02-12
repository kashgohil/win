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
		<div className="min-h-dvh bg-cream flex flex-col items-center px-6 pb-16 pt-10">
			<div className="flex items-center gap-2 font-display text-[1.3rem] text-ink tracking-[0.03em] lowercase mb-2">
				<Logo className="size-4 shrink-0" />
				wingmnn
			</div>

			<ProgressIndicator current={step} />

			<div
				className={cn(
					"w-full mt-4",
					wide ? "max-w-[780px]" : "max-w-[640px]",
				)}
			>
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						className="mb-4 font-mono text-[11px] text-grey-2 hover:text-ink transition-colors duration-150 cursor-pointer bg-transparent border-none p-0"
					>
						&larr; Back
					</button>
				)}

				{children}
			</div>
		</div>
	);
}
