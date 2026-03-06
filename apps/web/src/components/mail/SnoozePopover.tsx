import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Clock } from "lucide-react";
import { useState } from "react";

interface SnoozePopoverProps {
	onSnooze: (snoozedUntil: string) => void;
}

function getPresets() {
	const now = new Date();

	// Later today: 3 hours from now
	const laterToday = new Date(now.getTime() + 3 * 60 * 60 * 1000);

	// Tomorrow 9am
	const tomorrow9am = new Date(now);
	tomorrow9am.setDate(tomorrow9am.getDate() + 1);
	tomorrow9am.setHours(9, 0, 0, 0);

	// Next Monday 9am
	const nextMonday = new Date(now);
	const dayOfWeek = nextMonday.getDay();
	const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
	nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
	nextMonday.setHours(9, 0, 0, 0);

	return [
		{ label: "Later today", date: laterToday },
		{ label: "Tomorrow 9am", date: tomorrow9am },
		{ label: "Next Monday 9am", date: nextMonday },
	];
}

export function SnoozePopover({ onSnooze }: SnoozePopoverProps) {
	const [open, setOpen] = useState(false);
	const [customDate, setCustomDate] = useState("");
	const [customTime, setCustomTime] = useState("09:00");
	const presets = getPresets();

	const handlePreset = (date: Date) => {
		onSnooze(date.toISOString());
		setOpen(false);
	};

	const handleCustom = () => {
		if (!customDate) return;
		const [hours, minutes] = customTime.split(":").map(Number);
		const date = new Date(customDate);
		date.setHours(hours!, minutes!, 0, 0);
		onSnooze(date.toISOString());
		setOpen(false);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					className="h-8 rounded-full flex items-center gap-1.5 px-2.5 text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
				>
					<Clock className="size-3.5" />
					<Kbd>H</Kbd>
					<span className="sr-only">Snooze</span>
				</button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-56 p-2">
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
							Custom
						</span>
						<input
							type="date"
							value={customDate}
							onChange={(e) => setCustomDate(e.target.value)}
							className="w-full rounded-md border border-border/50 bg-secondary/10 px-2 py-1 font-body text-[12px] text-foreground outline-none focus:border-ring"
						/>
						<input
							type="time"
							value={customTime}
							onChange={(e) => setCustomTime(e.target.value)}
							className="w-full rounded-md border border-border/50 bg-secondary/10 px-2 py-1 font-body text-[12px] text-foreground outline-none focus:border-ring"
						/>
						<Button
							size="sm"
							onClick={handleCustom}
							disabled={!customDate}
							className="w-full text-[12px]"
						>
							Snooze
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
