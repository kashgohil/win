import { ConfirmButton } from "@/components/ui/confirm-button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EmailCategory } from "@wingmnn/types";
import {
	Archive,
	Forward,
	Mail,
	MailOpen,
	Reply,
	Star,
	Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CategorizeSenderPopover } from "./CategorizeSenderPopover";
import { SendToPopover } from "./SendToPopover";

interface EmailActionsProps {
	isStarred: boolean;
	isRead: boolean;
	fromAddress: string | null;
	category: EmailCategory;
	onReply: () => void;
	onForward: () => void;
	onStar: () => void;
	onToggleRead: () => void;
	onArchive: () => void;
	onDelete: () => void;
}

export function EmailActions({
	isStarred,
	isRead,
	fromAddress,
	category,
	onReply,
	onForward,
	onStar,
	onToggleRead,
	onArchive,
	onDelete,
}: EmailActionsProps) {
	return (
		<TooltipProvider sliding>
			<div className="flex items-center gap-1 py-2">
				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={onReply}
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<Reply className="size-3.5" />
							<span className="sr-only">Reply</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipWithShortcut label="Reply" shortcut="R" />
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={onForward}
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<Forward className="size-3.5" />
							<span className="sr-only">Forward</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipWithShortcut label="Forward" shortcut="F" />
				</Tooltip>

				<Separator />

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={onStar}
							whileTap={{ scale: 0.85 }}
							className={cn(
								"relative size-8 rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer",
								isStarred
									? "bg-amber-400/10 text-amber-500"
									: "text-grey-3 hover:text-foreground/60 hover:bg-secondary/30",
							)}
						>
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={isStarred ? "starred" : "unstarred"}
									initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
									animate={{ scale: 1, opacity: 1, rotate: 0 }}
									exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
									transition={{
										type: "spring",
										stiffness: 500,
										damping: 25,
									}}
								>
									<Star
										className={cn(
											"size-3.5",
											isStarred &&
												"fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]",
										)}
									/>
								</motion.div>
							</AnimatePresence>
							{isStarred && (
								<motion.div
									className="absolute inset-0 rounded-full border border-amber-400/40"
									initial={{ scale: 0.8, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ duration: 0.3 }}
								/>
							)}
							<span className="sr-only">{isStarred ? "Unstar" : "Star"}</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipWithShortcut
						label={isStarred ? "Unstar" : "Star"}
						shortcut="S"
					/>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={onToggleRead}
							whileTap={{ scale: 0.85 }}
							className={cn(
								"size-8 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer",
								!isRead
									? "bg-foreground/5 text-foreground/70"
									: "text-grey-3 hover:text-foreground/60 hover:bg-secondary/30",
							)}
						>
							<AnimatePresence mode="wait" initial={false}>
								<motion.div
									key={isRead ? "read" : "unread"}
									initial={{ rotateY: -90, opacity: 0 }}
									animate={{ rotateY: 0, opacity: 1 }}
									exit={{ rotateY: 90, opacity: 0 }}
									transition={{ duration: 0.2 }}
									style={{ perspective: 200 }}
								>
									{isRead ? (
										<MailOpen className="size-3.5" />
									) : (
										<Mail className="size-3.5" />
									)}
								</motion.div>
							</AnimatePresence>
							<span className="sr-only">
								{isRead ? "Mark as unread" : "Mark as read"}
							</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipWithShortcut
						label={isRead ? "Mark as unread" : "Mark as read"}
						shortcut="U"
					/>
				</Tooltip>

				<Separator />

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={onArchive}
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<Archive className="size-3.5" />
							<span className="sr-only">Archive</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipWithShortcut label="Archive" shortcut="E" />
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<div className="inline-flex">
							<ConfirmButton
								title="Delete email"
								description="This email will be moved to trash. This action cannot be undone."
								confirmLabel="Delete"
								onConfirm={onDelete}
							>
								<motion.button
									type="button"
									whileTap={{ scale: 0.85 }}
									className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-accent-red hover:bg-accent-red/5 transition-all duration-200 cursor-pointer"
								>
									<Trash2 className="size-3.5" />
									<span className="sr-only">Delete</span>
								</motion.button>
							</ConfirmButton>
						</div>
					</TooltipTrigger>
					<TooltipWithShortcut label="Delete" shortcut="#" />
				</Tooltip>

				<div className="flex-1" />

				<SendToPopover />

				{fromAddress && (
					<>
						<Separator />
						<CategorizeSenderPopover
							fromAddress={fromAddress}
							category={category}
						/>
					</>
				)}
			</div>
		</TooltipProvider>
	);
}

function Separator() {
	return <span className="w-px h-4 bg-border/60 mx-1.5" aria-hidden />;
}

function TooltipWithShortcut({
	label,
	shortcut,
}: {
	label: string;
	shortcut: string;
}) {
	return (
		<TooltipContent side="bottom">
			<span className="inline-flex items-center gap-2">
				{label}
				<kbd className="font-mono text-[10px] text-background/50 bg-background/10 border border-background/15 px-1 py-px rounded leading-none">
					{shortcut}
				</kbd>
			</span>
		</TooltipContent>
	);
}
