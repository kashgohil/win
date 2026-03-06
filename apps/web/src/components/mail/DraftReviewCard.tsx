import { Button } from "@/components/ui/button";
import { useSendDraft, useUpdateDraft } from "@/hooks/use-mail";
import { ChevronDown, Send, SkipForward, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { MOTION_CONSTANTS } from "@/components/constant";
import { useTriageAction } from "@/hooks/use-mail";

interface DraftReviewCardProps {
	id: string;
	subject: string | null;
	fromAddress: string | null;
	fromName: string | null;
	snippet: string | null;
	draftResponse: string | null;
	receivedAt: string;
	onDone: () => void;
}

export function DraftReviewCard({
	id,
	subject,
	fromAddress,
	fromName,
	snippet,
	draftResponse,
	onDone,
}: DraftReviewCardProps) {
	const [draft, setDraft] = useState(draftResponse ?? "");
	const [showOriginal, setShowOriginal] = useState(false);

	const sendDraft = useSendDraft();
	const updateDraft = useUpdateDraft();
	const dismiss = useTriageAction();

	const handleSend = () => {
		if (draft !== draftResponse) {
			updateDraft.mutate(
				{ id, draftResponse: draft },
				{
					onSuccess: () => {
						sendDraft.mutate(id, {
							onSuccess: () => {
								toast("Draft sent");
								onDone();
							},
							onError: () => toast.error("Failed to send draft"),
						});
					},
				},
			);
		} else {
			sendDraft.mutate(id, {
				onSuccess: () => {
					toast("Draft sent");
					onDone();
				},
				onError: () => toast.error("Failed to send draft"),
			});
		}
	};

	const handleDismiss = () => {
		dismiss.mutate(
			{ id, action: "dismiss" },
			{
				onSuccess: () => {
					toast("Draft dismissed");
					onDone();
				},
			},
		);
	};

	const isPending = sendDraft.isPending || updateDraft.isPending;
	const sender = fromName || fromAddress || "Unknown";

	return (
		<div className="rounded-lg border border-border/40 bg-card p-4">
			<div className="flex items-start justify-between gap-3 mb-3">
				<div className="min-w-0">
					<p className="font-body text-[13px] font-medium text-foreground truncate">
						{subject ?? "(no subject)"}
					</p>
					<p className="font-body text-[12px] text-grey-2 truncate">
						From: {sender}
					</p>
				</div>
			</div>

			{snippet && (
				<div>
					<button
						type="button"
						onClick={() => setShowOriginal((o) => !o)}
						className="flex items-center gap-1 font-body text-[11px] text-grey-3 hover:text-foreground cursor-pointer select-none mb-1"
					>
						<motion.div
							animate={{ rotate: showOriginal ? 180 : 0 }}
							transition={{ duration: 0.25, ease: MOTION_CONSTANTS.EASE }}
						>
							<ChevronDown className="size-3" />
						</motion.div>
						Original message
					</button>
					<AnimatePresence initial={false}>
						{showOriginal && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								className="overflow-hidden"
							>
								<div className="rounded-md border border-border/30 bg-secondary/5 p-2.5 font-mono text-[11px] text-grey-2 whitespace-pre-wrap max-h-32 overflow-y-auto mb-3">
									{snippet}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			)}

			<textarea
				value={draft}
				onChange={(e) => setDraft(e.target.value)}
				rows={4}
				className="w-full resize-none rounded-md border border-border/40 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 mb-3"
			/>

			<div className="flex items-center gap-2">
				<Button
					size="sm"
					onClick={handleSend}
					disabled={isPending || !draft.trim()}
					className="gap-1.5"
				>
					<Send className="size-3" />
					Send
				</Button>
				<Button
					size="sm"
					variant="ghost"
					onClick={handleDismiss}
					disabled={dismiss.isPending}
				>
					<X className="size-3 mr-1" />
					Dismiss
				</Button>
				<Button size="sm" variant="ghost" onClick={onDone}>
					<SkipForward className="size-3 mr-1" />
					Skip
				</Button>
			</div>
		</div>
	);
}
