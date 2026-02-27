import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCategorizeSender } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import { Check, Tag } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORIES } from "./category-colors";

interface CategorizeSenderPopoverProps {
	fromAddress: string;
	category: EmailCategory;
}

export function CategorizeSenderPopover({
	fromAddress,
	category,
}: CategorizeSenderPopoverProps) {
	const [open, setOpen] = useState(false);
	const categorizeSender = useCategorizeSender();

	const handleSelect = (selected: EmailCategory) => {
		if (selected === category) return;

		categorizeSender.mutate(
			{ senderAddress: fromAddress, category: selected },
			{
				onSuccess: (data) => {
					const label =
						CATEGORIES.find((c) => c.value === selected)?.label ?? selected;
					const count = data?.updatedCount ?? 0;
					toast(
						`All emails from ${fromAddress} moved to ${label}${count > 0 ? ` (${count} updated)` : ""}`,
					);
					setOpen(false);
				},
				onError: () => {
					toast.error("Failed to set sender rule");
				},
			},
		);
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<Tooltip>
				<TooltipTrigger asChild>
					<PopoverTrigger asChild>
						<motion.button
							type="button"
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<Tag className="size-3.5" />
							<span className="sr-only">Categorize sender</span>
						</motion.button>
					</PopoverTrigger>
				</TooltipTrigger>
				<TooltipContent side="bottom">Categorize sender</TooltipContent>
			</Tooltip>
			<PopoverContent align="end" sideOffset={8} className="w-48 p-2">
				<div className="space-y-0.5">
					{CATEGORIES.map((cat, i) => {
						const isActive = cat.value === category;
						return (
							<motion.button
								key={cat.value}
								type="button"
								onClick={() => handleSelect(cat.value)}
								disabled={categorizeSender.isPending}
								initial={{ opacity: 0, x: -4 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{
									duration: 0.2,
									delay: i * 0.02,
									ease: [0.22, 1, 0.36, 1],
								}}
								className="group/item flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer hover:bg-secondary/40 disabled:opacity-50"
							>
								<span className={cn("size-2 rounded-full shrink-0", cat.dot)} />
								<span
									className={cn(
										"font-body text-[13px] transition-colors duration-150",
										isActive
											? `${cat.text} font-medium`
											: "text-foreground/70 group-hover/item:text-foreground",
									)}
								>
									{cat.label}
								</span>
								{isActive && (
									<Check className="size-3 ml-auto text-foreground/50" />
								)}
							</motion.button>
						);
					})}
				</div>
			</PopoverContent>
		</Popover>
	);
}
