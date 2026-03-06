import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { BellRing } from "lucide-react";
import { useState } from "react";

interface FollowUpPopoverProps {
	onSetFollowUp: (followUpAt: string) => void;
	children?: React.ReactNode;
}

function getPresets() {
	const now = new Date();

	const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
	const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
	const in1Week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

	return [
		{ label: "In 1 day", date: in1Day },
		{ label: "In 3 days", date: in3Days },
		{ label: "In 1 week", date: in1Week },
	];
}

export function FollowUpPopover({
	onSetFollowUp,
	children,
}: FollowUpPopoverProps) {
	const [open, setOpen] = useState(false);
	const [customDate, setCustomDate] = useState("");
	const presets = getPresets();

	const handlePreset = (date: Date) => {
		onSetFollowUp(date.toISOString());
		setOpen(false);
	};

	const handleCustom = () => {
		if (!customDate) return;
		const date = new Date(customDate);
		date.setHours(9, 0, 0, 0);
		onSetFollowUp(date.toISOString());
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				{children ?? (
					<button
						type="button"
						className="h-8 rounded-full flex items-center gap-1.5 px-2.5 text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
					>
						<BellRing className="size-3.5" />
						<span className="sr-only">Follow up</span>
					</button>
				)}
			</PopoverTrigger>
			<PopoverContent align="start" className="w-52 p-2">
				<div className="flex flex-col gap-0.5">
					{presets.map((preset) => (
						<button
							key={preset.label}
							type="button"
							onClick={() => handlePreset(preset.date)}
							className="w-full text-left px-2.5 py-1.5 rounded-md font-body text-[13px] text-foreground hover:bg-secondary/40 transition-colors cursor-pointer"
						>
							{preset.label}
						</button>
					))}
					<div className="border-t border-border/30 my-1" />
					<div className="px-2.5 py-1.5 flex flex-col gap-2">
						<span className="font-body text-[11px] uppercase tracking-wider text-grey-3">
							Custom date
						</span>
						<input
							type="date"
							value={customDate}
							onChange={(e) => setCustomDate(e.target.value)}
							className="w-full rounded-md border border-border/50 bg-secondary/10 px-2 py-1 font-body text-[12px] text-foreground outline-none focus:border-ring"
						/>
						<Button
							size="sm"
							onClick={handleCustom}
							disabled={!customDate}
							className="w-full text-[12px]"
						>
							Set reminder
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
