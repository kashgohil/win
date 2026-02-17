import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Clock, Inbox, Sparkles } from "lucide-react";

const PLACEHOLDER_STATS = [
	{
		icon: Clock,
		label: "Avg response time",
		value: "—",
		hint: "Tracks how quickly you reply",
	},
	{
		icon: Inbox,
		label: "Emails this week",
		value: "—",
		hint: "Incoming volume trends",
	},
	{
		icon: Sparkles,
		label: "Auto-handled rate",
		value: "—",
		hint: "Percentage handled without you",
	},
];

export function AnalyticsSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right">
				<SheetHeader>
					<SheetTitle className="font-display text-[20px] lowercase">
						analytics
					</SheetTitle>
					<SheetDescription className="font-mono text-[11px] tracking-[0.02em]">
						Mail insights and performance metrics.
					</SheetDescription>
				</SheetHeader>

				<div className="px-4 pb-6">
					<div className="py-10 flex flex-col items-center gap-3">
						<p className="font-serif text-[15px] text-grey-2 italic text-center">
							Analytics are on the way.
						</p>
						<p className="font-mono text-[10px] text-grey-3 tracking-[0.02em] text-center">
							We're building insights to help you understand your email
							patterns.
						</p>
					</div>

					<div className="space-y-1">
						{PLACEHOLDER_STATS.map((stat) => (
							<div
								key={stat.label}
								className="flex items-center gap-3 py-3 px-2 rounded-lg"
							>
								<div className="size-8 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
									<stat.icon className="size-3.5 text-grey-3" />
								</div>
								<div className="flex-1 min-w-0">
									<p className="font-mono text-[11px] text-grey-2 tracking-[0.02em]">
										{stat.label}
									</p>
									<p className="font-mono text-[9px] text-grey-3 tracking-[0.02em] mt-0.5">
										{stat.hint}
									</p>
								</div>
								<span className="font-display text-[18px] text-grey-3 tabular-nums">
									{stat.value}
								</span>
							</div>
						))}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
