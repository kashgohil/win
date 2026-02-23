import { ConfirmButton } from "@/components/ui/confirm-button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { mailKeys } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
import { SendToPopover } from "./SendToPopover";

interface EmailActionsProps {
	emailId: string;
	isStarred: boolean;
	isRead: boolean;
	onReply: () => void;
	onForward: () => void;
	onNavigateBack: () => void;
}

function updateEmailInPages(old: any, emailId: string, patch: object) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			emails: page.emails.map((e: any) =>
				e.id === emailId ? { ...e, ...patch } : e,
			),
		})),
	};
}

function removeEmailFromPages(old: any, emailId: string) {
	if (!old?.pages) return old;
	return {
		...old,
		pages: old.pages.map((page: any) => ({
			...page,
			emails: page.emails.filter((e: any) => e.id !== emailId),
			total: Math.max(0, (page.total ?? 0) - 1),
		})),
	};
}

export function EmailActions({
	emailId,
	isStarred,
	isRead,
	onReply,
	onForward,
	onNavigateBack,
}: EmailActionsProps) {
	const queryClient = useQueryClient();

	const handleStar = () => {
		const patch = { isStarred: !isStarred };
		queryClient.setQueriesData({ queryKey: ["mail", "emails"] }, (old: any) =>
			updateEmailInPages(old, emailId, patch),
		);
		queryClient.setQueryData(mailKeys.email(emailId), (old: any) => {
			if (!old?.email) return old;
			return { ...old, email: { ...old.email, ...patch } };
		});
		api.mail.emails({ id: emailId }).star.patch();
	};

	const handleToggleRead = () => {
		const patch = { isRead: !isRead };
		queryClient.setQueriesData({ queryKey: ["mail", "emails"] }, (old: any) =>
			updateEmailInPages(old, emailId, patch),
		);
		queryClient.setQueryData(mailKeys.email(emailId), (old: any) => {
			if (!old?.email) return old;
			return { ...old, email: { ...old.email, ...patch } };
		});
		api.mail.emails({ id: emailId }).read.patch();
	};

	const handleArchive = () => {
		queryClient.setQueriesData({ queryKey: ["mail", "emails"] }, (old: any) =>
			removeEmailFromPages(old, emailId),
		);
		toast("Email archived");
		onNavigateBack();
		api.mail.emails({ id: emailId }).archive.post();
	};

	const handleDelete = () => {
		queryClient.setQueriesData({ queryKey: ["mail", "emails"] }, (old: any) =>
			removeEmailFromPages(old, emailId),
		);
		toast("Email deleted");
		onNavigateBack();
		api.mail.emails({ id: emailId }).delete();
	};

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
					<TooltipContent side="bottom">Reply</TooltipContent>
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
					<TooltipContent side="bottom">Forward</TooltipContent>
				</Tooltip>

				<Separator />

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={handleStar}
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
					<TooltipContent side="bottom">
						{isStarred ? "Unstar" : "Star"}
					</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={handleToggleRead}
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
					<TooltipContent side="bottom">
						{isRead ? "Mark as unread" : "Mark as read"}
					</TooltipContent>
				</Tooltip>

				<Separator />

				<Tooltip>
					<TooltipTrigger asChild>
						<motion.button
							type="button"
							onClick={handleArchive}
							whileTap={{ scale: 0.85 }}
							className="size-8 rounded-full flex items-center justify-center text-grey-3 hover:text-foreground/60 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer"
						>
							<Archive className="size-3.5" />
							<span className="sr-only">Archive</span>
						</motion.button>
					</TooltipTrigger>
					<TooltipContent side="bottom">Archive</TooltipContent>
				</Tooltip>

				<Tooltip>
					<TooltipTrigger asChild>
						<ConfirmButton
							title="Delete email"
							description="This email will be moved to trash. This action cannot be undone."
							confirmLabel="Delete"
							onConfirm={handleDelete}
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
					</TooltipTrigger>
					<TooltipContent side="bottom">Delete</TooltipContent>
				</Tooltip>

				<Separator />

				<SendToPopover />
			</div>
		</TooltipProvider>
	);
}

function Separator() {
	return <span className="w-px h-4 bg-border/60 mx-1.5" aria-hidden />;
}
