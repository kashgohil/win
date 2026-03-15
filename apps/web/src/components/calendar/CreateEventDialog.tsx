import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	useCalendarAccounts,
	useCreateCalendarEvent,
} from "@/hooks/use-calendar";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function toLocalDateTimeString(date: Date) {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CreateEventDialog({ defaultDate }: { defaultDate?: Date }) {
	const [open, setOpen] = useState(false);
	const { data: accounts } = useCalendarAccounts();
	const createEvent = useCreateCalendarEvent();

	const defaultStart = defaultDate ?? new Date();
	const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

	const [title, setTitle] = useState("");
	const [startTime, setStartTime] = useState(
		toLocalDateTimeString(defaultStart),
	);
	const [endTime, setEndTime] = useState(toLocalDateTimeString(defaultEnd));
	const [isAllDay, setIsAllDay] = useState(false);
	const [description, setDescription] = useState("");
	const [location, setLocation] = useState("");

	const activeAccounts = accounts?.filter((a) => a.active) ?? [];
	const accountId = activeAccounts[0]?.id;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!title.trim() || !accountId) return;

		const start = isAllDay
			? new Date(startTime).toISOString()
			: new Date(startTime).toISOString();
		const end = isAllDay
			? new Date(endTime).toISOString()
			: new Date(endTime).toISOString();

		createEvent.mutate(
			{
				accountId,
				title: title.trim(),
				startTime: start,
				endTime: end,
				isAllDay,
				...(description.trim() && { description: description.trim() }),
				...(location.trim() && { location: location.trim() }),
			},
			{
				onSuccess: () => {
					toast("Event created");
					setOpen(false);
					setTitle("");
					setDescription("");
					setLocation("");
				},
				onError: () => {
					toast.error("Failed to create event");
				},
			},
		);
	};

	if (activeAccounts.length === 0) return null;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className="font-mono text-[11px] gap-1.5"
				>
					<Plus className="size-3.5" />
					New event
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[440px]">
				<DialogHeader>
					<DialogTitle className="font-body text-[15px]">
						Create event
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-3 mt-2">
					<Input
						placeholder="Event title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className="font-body text-[13px]"
						autoFocus
					/>

					<button
						type="button"
						onClick={() => setIsAllDay(!isAllDay)}
						className="flex items-center gap-2"
					>
						<div
							className={cn(
								"size-3.5 rounded border border-input flex items-center justify-center",
								isAllDay && "bg-primary border-primary",
							)}
						>
							{isAllDay && (
								<Check className="size-2.5 text-primary-foreground" />
							)}
						</div>
						<span className="font-mono text-[11px] text-grey-3">All day</span>
					</button>

					<div className="grid grid-cols-2 gap-2">
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-1 block">
								Start
							</span>
							<Input
								type={isAllDay ? "date" : "datetime-local"}
								value={isAllDay ? startTime.slice(0, 10) : startTime}
								onChange={(e) => setStartTime(e.target.value)}
								className="font-mono text-[11px]"
							/>
						</div>
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 mb-1 block">
								End
							</span>
							<Input
								type={isAllDay ? "date" : "datetime-local"}
								value={isAllDay ? endTime.slice(0, 10) : endTime}
								onChange={(e) => setEndTime(e.target.value)}
								className="font-mono text-[11px]"
							/>
						</div>
					</div>

					<Input
						placeholder="Location (optional)"
						value={location}
						onChange={(e) => setLocation(e.target.value)}
						className="font-body text-[13px]"
					/>

					<textarea
						placeholder="Description (optional)"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-body text-[13px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-none"
					/>

					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setOpen(false)}
							className="font-mono text-[11px]"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							size="sm"
							disabled={!title.trim() || createEvent.isPending}
							className="font-mono text-[11px] gap-1.5"
						>
							{createEvent.isPending && (
								<Loader2 className="size-3 animate-spin" />
							)}
							Create
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
