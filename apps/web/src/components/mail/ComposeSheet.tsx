import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	useCancelSend,
	useForwardDelayed,
	useReplyDelayed,
} from "@/hooks/use-mail";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

import { MOTION_CONSTANTS } from "@/components/constant";
import { useSuggestCc } from "@/hooks/use-contacts";

interface ComposeSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "reply" | "forward";
	emailId: string;
	fromAddress: string | null;
	subject: string | null;
	originalBody: string | null;
}

export function ComposeSheet({
	open,
	onOpenChange,
	mode,
	emailId,
	fromAddress,
	subject,
	originalBody,
}: ComposeSheetProps) {
	const [to, setTo] = useState("");
	const [body, setBody] = useState("");
	const [cc, setCc] = useState<string[]>([]);
	const [showOriginal, setShowOriginal] = useState(false);
	const { data: ccSuggestions } = useSuggestCc(
		mode === "reply" ? fromAddress : null,
	);

	const reply = useReplyDelayed();
	const forward = useForwardDelayed();
	const cancelSend = useCancelSend();

	const isPending = reply.isPending || forward.isPending;

	const handleSend = async () => {
		if (mode === "reply") {
			reply.mutate(
				{ id: emailId, body, cc: cc.length > 0 ? cc : undefined },
				{
					onSuccess: (data) => {
						resetAndClose();
						const jobId = data?.jobId;
						if (jobId) {
							toast("Reply sent", {
								duration: 10500,
								action: {
									label: "Undo",
									onClick: () => {
										cancelSend.mutate(jobId, {
											onSuccess: () => toast("Send cancelled"),
											onError: () =>
												toast.error("Could not undo — already sent"),
										});
									},
								},
							});
						} else {
							toast("Reply sent");
						}
					},
					onError: () => toast.error("Failed to send reply"),
				},
			);
		} else {
			const recipients = to
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			if (recipients.length === 0) {
				toast.error("Please enter at least one recipient");
				return;
			}
			forward.mutate(
				{ id: emailId, to: recipients, body },
				{
					onSuccess: (data) => {
						resetAndClose();
						const jobId = data?.jobId;
						if (jobId) {
							toast("Email forwarded", {
								duration: 10500,
								action: {
									label: "Undo",
									onClick: () => {
										cancelSend.mutate(jobId, {
											onSuccess: () => toast("Send cancelled"),
											onError: () =>
												toast.error("Could not undo — already sent"),
										});
									},
								},
							});
						} else {
							toast("Email forwarded");
						}
					},
					onError: () => toast.error("Failed to forward email"),
				},
			);
		}
	};

	const resetAndClose = () => {
		setTo("");
		setBody("");
		setCc([]);
		setShowOriginal(false);
		onOpenChange(false);
	};

	const title =
		mode === "reply" ? `Re: ${subject ?? ""}` : `Fwd: ${subject ?? ""}`;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex flex-col sm:max-w-md">
				<SheetHeader>
					<SheetTitle className="font-display text-[15px] lowercase">
						{title}
					</SheetTitle>
					<SheetDescription className="sr-only">
						{mode === "reply" ? "Reply to email" : "Forward email"}
					</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-3 flex-1 px-4 overflow-y-auto">
					{mode === "reply" ? (
						<div>
							<div className="font-body text-[13px]">
								<span className="text-grey-2">To: </span>
								<span className="text-foreground">{fromAddress ?? ""}</span>
							</div>
							{cc.length > 0 && (
								<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
									<span className="font-body text-[12px] text-grey-2">Cc:</span>
									{cc.map((email) => (
										<span
											key={email}
											className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 font-mono text-[10px] text-foreground"
										>
											{email}
											<button
												type="button"
												className="hover:text-red-500 cursor-pointer"
												onClick={() =>
													setCc((prev) => prev.filter((e) => e !== email))
												}
											>
												×
											</button>
										</span>
									))}
								</div>
							)}
							{ccSuggestions &&
								ccSuggestions.length > 0 &&
								ccSuggestions.some((s) => !cc.includes(s.email)) && (
									<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
										<span className="font-mono text-[10px] text-grey-3">
											Add Cc:
										</span>
										{ccSuggestions
											.filter((s) => !cc.includes(s.email))
											.map((s) => (
												<button
													key={s.id}
													type="button"
													className="inline-flex items-center gap-1 rounded-full border border-border/40 hover:border-border/70 px-2 py-0.5 font-mono text-[10px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
													onClick={() => setCc((prev) => [...prev, s.email])}
												>
													+ {s.name || s.email}
												</button>
											))}
									</div>
								)}
						</div>
					) : (
						<div>
							<label
								htmlFor="forward-to"
								className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
							>
								To
							</label>
							<input
								id="forward-to"
								type="text"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								placeholder="recipient@example.com"
								className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
							/>
						</div>
					)}

					<textarea
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Write your message..."
						rows={8}
						className="w-full flex-1 min-h-[120px] resize-none rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
					/>

					{originalBody && (
						<div>
							<button
								type="button"
								onClick={() => setShowOriginal((o) => !o)}
								className="flex items-center gap-1.5 font-body text-[12px] text-grey-2 hover:text-foreground cursor-pointer select-none"
							>
								<motion.div
									animate={{ rotate: showOriginal ? 180 : 0 }}
									transition={{
										duration: 0.25,
										ease: MOTION_CONSTANTS.EASE,
									}}
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
										transition={{
											height: {
												duration: 0.3,
												ease: MOTION_CONSTANTS.EASE,
											},
											opacity: { duration: 0.2 },
										}}
										className="overflow-hidden"
									>
										<div className="mt-2 rounded-md border border-border/30 bg-secondary/5 p-3 font-mono text-[11px] text-grey-2 whitespace-pre-wrap max-h-48 overflow-y-auto">
											{originalBody}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					)}
				</div>

				<div className="p-4 border-t border-border/30">
					<Button
						onClick={handleSend}
						disabled={isPending || !body.trim()}
						className="w-full"
						size="sm"
					>
						{isPending
							? "Sending..."
							: mode === "reply"
								? "Send reply"
								: "Forward"}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
