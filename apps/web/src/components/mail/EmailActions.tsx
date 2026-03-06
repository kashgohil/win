import { ConfirmButton } from "@/components/ui/confirm-button";
import { Kbd } from "@/components/ui/kbd";
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
	Crown,
	Forward,
	Mail,
	MailOpen,
	MailX,
	Reply,
	Star,
	Trash2,
	VolumeX,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { CategorizeSenderPopover } from "./CategorizeSenderPopover";
import { FollowUpPopover } from "./FollowUpPopover";
import { SendToPopover } from "./SendToPopover";
import { SnoozePopover } from "./SnoozePopover";

interface EmailActionsProps {
	isStarred: boolean;
	isRead: boolean;
	fromAddress: string | null;
	category: EmailCategory;
	hasUnsubscribeUrl?: boolean;
	onReply: () => void;
	onForward: () => void;
	onStar: () => void;
	onToggleRead: () => void;
	onArchive: () => void;
	onDelete: () => void;
	onSnooze?: (snoozedUntil: string) => void;
	onMuteSender?: () => void;
	onVipSender?: () => void;
	onUnsubscribe?: () => void;
	onSetFollowUp?: (followUpAt: string) => void;
}

export function EmailActions({
	isStarred,
	isRead,
	fromAddress,
	category,
	hasUnsubscribeUrl,
	onReply,
	onForward,
	onStar,
	onToggleRead,
	onArchive,
	onDelete,
	onSnooze,
	onMuteSender,
	onVipSender,
	onUnsubscribe,
	onSetFollowUp,
}: EmailActionsProps) {
	return (
		<TooltipProvider sliding>
			<div className="flex items-center gap-1 py-2">
				<ActionButton onClick={onReply} label="Reply" shortcut="Q">
					<Reply className="size-3.5" />
				</ActionButton>

				<ActionButton onClick={onForward} label="Forward">
					<Forward className="size-3.5" />
				</ActionButton>

				<Separator />

				<motion.button
					type="button"
					onClick={onStar}
					whileTap={{ scale: 0.85 }}
					className={cn(
						"relative h-8 rounded-full flex items-center gap-1.5 px-2.5 transition-colors duration-300 cursor-pointer",
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
					<Kbd>F</Kbd>
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

				<motion.button
					type="button"
					onClick={onToggleRead}
					whileTap={{ scale: 0.85 }}
					className={cn(
						"h-8 rounded-full flex items-center gap-1.5 px-2.5 transition-colors duration-200 cursor-pointer",
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
					<Kbd>U</Kbd>
					<span className="sr-only">
						{isRead ? "Mark as unread" : "Mark as read"}
					</span>
				</motion.button>

				<Separator />

				{onSnooze && <SnoozePopover onSnooze={onSnooze} />}

				<ActionButton onClick={onArchive} label="Archive" shortcut="E">
					<Archive className="size-3.5" />
				</ActionButton>

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
					<TooltipContent side="bottom">Delete</TooltipContent>
				</Tooltip>

				<div className="flex-1" />

				{onSetFollowUp && <FollowUpPopover onSetFollowUp={onSetFollowUp} />}

				{hasUnsubscribeUrl && onUnsubscribe && (
					<Tooltip>
						<TooltipTrigger asChild>
							<motion.button
								type="button"
								onClick={onUnsubscribe}
								whileTap={{ scale: 0.85 }}
								className="h-8 rounded-full flex items-center gap-1.5 px-2.5 text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
							>
								<MailX className="size-3.5" />
								<span className="font-body text-[11px]">Unsubscribe</span>
							</motion.button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							Unsubscribe from sender
						</TooltipContent>
					</Tooltip>
				)}

				<SendToPopover />

				{fromAddress && (
					<>
						<Separator />

						{onMuteSender && (
							<Tooltip>
								<TooltipTrigger asChild>
									<motion.button
										type="button"
										onClick={onMuteSender}
										whileTap={{ scale: 0.85 }}
										className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
									>
										<VolumeX className="size-3.5" />
										<span className="sr-only">Mute sender</span>
									</motion.button>
								</TooltipTrigger>
								<TooltipContent side="bottom">Mute sender</TooltipContent>
							</Tooltip>
						)}

						{onVipSender && (
							<Tooltip>
								<TooltipTrigger asChild>
									<motion.button
										type="button"
										onClick={onVipSender}
										whileTap={{ scale: 0.85 }}
										className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-amber-500 hover:bg-amber-400/10 transition-colors duration-200 cursor-pointer"
									>
										<Crown className="size-3.5" />
										<span className="sr-only">VIP sender</span>
									</motion.button>
								</TooltipTrigger>
								<TooltipContent side="bottom">Mark as VIP</TooltipContent>
							</Tooltip>
						)}

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

function ActionButton({
	onClick,
	label,
	shortcut,
	children,
}: {
	onClick: () => void;
	label: string;
	shortcut?: string;
	children: React.ReactNode;
}) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<motion.button
					type="button"
					onClick={onClick}
					whileTap={{ scale: 0.85 }}
					className="h-8 rounded-full flex items-center gap-1.5 px-2.5 text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
				>
					{children}
					{shortcut && <Kbd>{shortcut}</Kbd>}
					<span className="sr-only">{label}</span>
				</motion.button>
			</TooltipTrigger>
			<TooltipContent side="bottom">{label}</TooltipContent>
		</Tooltip>
	);
}
