import { MOTION_CONSTANTS } from "@/components/constant";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useAiCompose, useAiDraft } from "@/hooks/use-ai";
import { useSuggestCc } from "@/hooks/use-contacts";
import {
	useCancelSend,
	useComposeDelayed,
	useForwardDelayed,
	useMailAccounts,
	useReplyDelayed,
} from "@/hooks/use-mail";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ComposeSheetProps =
	| {
			open: boolean;
			onOpenChange: (open: boolean) => void;
			mode: "reply" | "forward";
			emailId: string;
			fromAddress: string | null;
			subject: string | null;
			originalBody: string | null;
			defaultAccountId?: undefined;
	  }
	| {
			open: boolean;
			onOpenChange: (open: boolean) => void;
			mode: "compose";
			emailId?: undefined;
			fromAddress?: undefined;
			subject?: undefined;
			originalBody?: undefined;
			defaultAccountId?: string;
	  };

export function ComposeSheet(props: ComposeSheetProps) {
	const { open, onOpenChange, mode } = props;

	const [to, setTo] = useState("");
	const [body, setBody] = useState("");
	const [cc, setCc] = useState<string[]>([]);
	const [bcc, setBcc] = useState<string[]>([]);
	const [composeSubject, setComposeSubject] = useState("");
	const [showBcc, setShowBcc] = useState(false);
	const [showOriginal, setShowOriginal] = useState(false);
	const [selectedAccountId, setSelectedAccountId] = useState(
		props.defaultAccountId ?? "",
	);

	const { data: accountsData } = useMailAccounts();
	const accounts = accountsData?.accounts ?? [];

	// Auto-select first account when accounts load
	useEffect(() => {
		if (!selectedAccountId && accounts.length > 0) {
			setSelectedAccountId(accounts[0].id);
		}
	}, [accounts, selectedAccountId]);

	const { data: ccSuggestions } = useSuggestCc(
		mode === "reply" ? (props.fromAddress ?? null) : null,
	);

	const reply = useReplyDelayed();
	const forward = useForwardDelayed();
	const compose = useComposeDelayed();
	const cancelSend = useCancelSend();

	const isPending = reply.isPending || forward.isPending || compose.isPending;

	const showUndoToast = (label: string, jobId: string | undefined) => {
		if (jobId) {
			toast(label, {
				duration: 10500,
				action: {
					label: "Undo",
					onClick: () => {
						cancelSend.mutate(jobId, {
							onSuccess: () => toast("Send cancelled"),
							onError: () => toast.error("Could not undo — already sent"),
						});
					},
				},
			});
		} else {
			toast(label);
		}
	};

	const handleSend = async () => {
		if (mode === "compose") {
			const recipients = to
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			if (recipients.length === 0) {
				toast.error("Please enter at least one recipient");
				return;
			}
			if (!selectedAccountId) {
				toast.error("Please select an account");
				return;
			}
			compose.mutate(
				{
					accountId: selectedAccountId,
					to: recipients,
					cc: cc.length > 0 ? cc : undefined,
					bcc: bcc.length > 0 ? bcc : undefined,
					subject: composeSubject,
					body,
				},
				{
					onSuccess: (data) => {
						resetAndClose();
						showUndoToast("Email sent", data?.jobId);
					},
					onError: () => toast.error("Failed to send email"),
				},
			);
		} else if (mode === "reply") {
			reply.mutate(
				{
					id: props.emailId,
					body,
					cc: cc.length > 0 ? cc : undefined,
				},
				{
					onSuccess: (data) => {
						resetAndClose();
						showUndoToast("Reply sent", data?.jobId);
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
				{ id: props.emailId, to: recipients, body },
				{
					onSuccess: (data) => {
						resetAndClose();
						showUndoToast("Email forwarded", data?.jobId);
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
		setBcc([]);
		setComposeSubject("");
		setShowBcc(false);
		setShowOriginal(false);
		onOpenChange(false);
	};

	const title =
		mode === "compose"
			? "new message"
			: mode === "reply"
				? `Re: ${props.subject ?? ""}`
				: `Fwd: ${props.subject ?? ""}`;

	const description =
		mode === "compose"
			? "Compose a new email"
			: mode === "reply"
				? "Reply to email"
				: "Forward email";

	const sendLabel =
		mode === "compose" ? "Send" : mode === "reply" ? "Send reply" : "Forward";

	const recipientForSuggestion =
		mode === "compose" || mode === "forward" ? to : (props.fromAddress ?? null);

	const subjectForSuggestion =
		mode === "compose" ? composeSubject : (props.subject ?? null);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="flex flex-col sm:max-w-md">
				<SheetHeader>
					<SheetTitle className="font-display text-[15px] lowercase">
						{title}
					</SheetTitle>
					<SheetDescription className="sr-only">{description}</SheetDescription>
				</SheetHeader>

				<div className="flex flex-col gap-3 flex-1 px-4 overflow-y-auto">
					{/* From account selector (compose mode) */}
					{mode === "compose" && accounts.length > 1 && (
						<div>
							<label
								htmlFor="compose-from"
								className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
							>
								From
							</label>
							<select
								id="compose-from"
								value={selectedAccountId}
								onChange={(e) => setSelectedAccountId(e.target.value)}
								className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
							>
								{accounts.map((a) => (
									<option key={a.id} value={a.id}>
										{a.email}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Reply mode: show To as static text */}
					{mode === "reply" && (
						<div>
							<div className="font-body text-[13px]">
								<span className="text-grey-2">To: </span>
								<span className="text-foreground">
									{props.fromAddress ?? ""}
								</span>
							</div>
							{cc.length > 0 && (
								<RecipientChips
									label="Cc"
									values={cc}
									onRemove={(email) =>
										setCc((prev) => prev.filter((e) => e !== email))
									}
								/>
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
					)}

					{/* Forward / Compose: To input */}
					{(mode === "forward" || mode === "compose") && (
						<div>
							<label
								htmlFor="compose-to"
								className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
							>
								To
							</label>
							<input
								id="compose-to"
								type="text"
								value={to}
								onChange={(e) => setTo(e.target.value)}
								placeholder="recipient@example.com"
								className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
							/>
						</div>
					)}

					{/* Compose mode: Cc/Bcc toggle + fields */}
					{mode === "compose" && (
						<>
							<div className="flex items-center gap-2">
								{cc.length === 0 && !bcc.length && (
									<button
										type="button"
										onClick={() => setCc([])}
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										+ Cc
									</button>
								)}
								{!showBcc && bcc.length === 0 && (
									<button
										type="button"
										onClick={() => setShowBcc(true)}
										className="font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer"
									>
										+ Bcc
									</button>
								)}
							</div>
							{(cc.length > 0 || mode === "compose") && (
								<div>
									<label
										htmlFor="compose-cc"
										className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
									>
										Cc
									</label>
									<input
										id="compose-cc"
										type="text"
										placeholder="cc@example.com"
										className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
										onKeyDown={(e) => {
											if (
												(e.key === "Enter" || e.key === ",") &&
												e.currentTarget.value.trim()
											) {
												e.preventDefault();
												const val = e.currentTarget.value.trim();
												if (val && !cc.includes(val)) {
													setCc((prev) => [...prev, val]);
												}
												e.currentTarget.value = "";
											}
										}}
									/>
									{cc.length > 0 && (
										<RecipientChips
											label="Cc"
											values={cc}
											onRemove={(email) =>
												setCc((prev) => prev.filter((e) => e !== email))
											}
										/>
									)}
								</div>
							)}
							{showBcc && (
								<div>
									<label
										htmlFor="compose-bcc"
										className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
									>
										Bcc
									</label>
									<input
										id="compose-bcc"
										type="text"
										placeholder="bcc@example.com"
										className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
										onKeyDown={(e) => {
											if (
												(e.key === "Enter" || e.key === ",") &&
												e.currentTarget.value.trim()
											) {
												e.preventDefault();
												const val = e.currentTarget.value.trim();
												if (val && !bcc.includes(val)) {
													setBcc((prev) => [...prev, val]);
												}
												e.currentTarget.value = "";
											}
										}}
									/>
									{bcc.length > 0 && (
										<RecipientChips
											label="Bcc"
											values={bcc}
											onRemove={(email) =>
												setBcc((prev) => prev.filter((e) => e !== email))
											}
										/>
									)}
								</div>
							)}
						</>
					)}

					{/* Compose mode: Subject */}
					{mode === "compose" && (
						<div>
							<label
								htmlFor="compose-subject"
								className="font-body text-[11px] uppercase tracking-wider text-grey-3 mb-1 block"
							>
								Subject
							</label>
							<input
								id="compose-subject"
								type="text"
								value={composeSubject}
								onChange={(e) => setComposeSubject(e.target.value)}
								placeholder="Subject"
								className="w-full rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
							/>
						</div>
					)}

					{mode === "reply" && !body.trim() && (
						<AiDraftButton
							subject={props.subject}
							fromAddress={props.fromAddress}
							originalBody={props.originalBody}
							onDraft={setBody}
						/>
					)}

					<ComposeWithSuggestion
						body={body}
						onBodyChange={setBody}
						subject={subjectForSuggestion}
						recipient={recipientForSuggestion}
					/>

					{mode !== "compose" && props.originalBody && (
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
											{props.originalBody}
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
						{isPending ? "Sending..." : sendLabel}
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}

/* ── Recipient chips ── */

function RecipientChips({
	label,
	values,
	onRemove,
}: {
	label: string;
	values: string[];
	onRemove: (email: string) => void;
}) {
	return (
		<div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
			<span className="font-body text-[12px] text-grey-2">{label}:</span>
			{values.map((email) => (
				<span
					key={email}
					className="inline-flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 font-mono text-[10px] text-foreground"
				>
					{email}
					<button
						type="button"
						className="hover:text-red-500 cursor-pointer"
						onClick={() => onRemove(email)}
					>
						×
					</button>
				</span>
			))}
		</div>
	);
}

/* ── Compose with AI suggestion ── */

function ComposeWithSuggestion({
	body,
	onBodyChange,
	subject,
	recipient,
}: {
	body: string;
	onBodyChange: (text: string) => void;
	subject: string | null;
	recipient: string | null;
}) {
	const aiCompose = useAiCompose();
	const [suggestion, setSuggestion] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastBodyRef = useRef(body);
	const mutateRef = useRef(aiCompose.mutate);
	mutateRef.current = aiCompose.mutate;

	// Debounced AI completion — trigger after 1.5s pause with 10+ chars
	useEffect(() => {
		lastBodyRef.current = body;

		if (debounceRef.current) clearTimeout(debounceRef.current);
		setSuggestion(null);

		if (body.trim().length < 10) return;

		debounceRef.current = setTimeout(() => {
			if (lastBodyRef.current !== body) return;
			mutateRef.current(
				{
					body,
					subject: subject ?? undefined,
					recipient: recipient ?? undefined,
				},
				{
					onSuccess: (data) => {
						if (lastBodyRef.current === body && data.suggestion) {
							setSuggestion(data.suggestion);
						}
					},
				},
			);
		}, 1500);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [body, subject, recipient]);

	const acceptSuggestion = useCallback(() => {
		if (suggestion) {
			const separator = body.endsWith(" ") || body.endsWith("\n") ? "" : " ";
			onBodyChange(body + separator + suggestion);
			setSuggestion(null);
		}
	}, [suggestion, body, onBodyChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Tab" && suggestion) {
				e.preventDefault();
				acceptSuggestion();
			}
		},
		[suggestion, acceptSuggestion],
	);

	return (
		<div className="relative flex-1 min-h-[120px]">
			<textarea
				value={body}
				onChange={(e) => onBodyChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder="Write your message..."
				rows={8}
				className="w-full h-full min-h-[120px] resize-none rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
			/>
			<AnimatePresence>
				{suggestion && (
					<motion.div
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.2, ease: MOTION_CONSTANTS.EASE }}
						className="absolute bottom-2 left-2 right-2"
					>
						<button
							type="button"
							onClick={acceptSuggestion}
							className="flex items-start gap-2 w-full text-left rounded-md bg-secondary/40 backdrop-blur-sm border border-border/30 px-3 py-2 cursor-pointer hover:bg-secondary/60 transition-colors group"
						>
							<Sparkles className="size-3 text-grey-3 shrink-0 mt-0.5" />
							<span className="font-body text-[12px] text-grey-2 leading-relaxed flex-1 line-clamp-2">
								{suggestion}
							</span>
							<span className="font-mono text-[9px] text-grey-3 shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-secondary/50 border border-border/30 group-hover:text-foreground group-hover:border-border/60 transition-colors">
								Tab
							</span>
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

/* ── AI Draft Button ── */

function AiDraftButton({
	subject,
	fromAddress,
	originalBody,
	onDraft,
}: {
	subject: string | null;
	fromAddress: string | null;
	originalBody: string | null;
	onDraft: (text: string) => void;
}) {
	const draft = useAiDraft();

	const handleDraft = () => {
		draft.mutate(
			{
				subject: subject ?? "",
				fromAddress: fromAddress ?? "",
				fromName: fromAddress?.split("@")[0] ?? "",
				snippet: (originalBody ?? "").slice(0, 200),
				bodyPlain: originalBody ?? "",
				toAddresses: [],
			},
			{
				onSuccess: (data) => onDraft(data.draft),
				onError: () => toast.error("Failed to generate draft"),
			},
		);
	};

	return (
		<button
			type="button"
			onClick={handleDraft}
			disabled={draft.isPending}
			className="inline-flex items-center gap-1.5 self-start px-2.5 py-1.5 rounded-md border border-border/40 bg-secondary/10 hover:bg-secondary/25 text-grey-2 hover:text-foreground font-body text-[12px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{draft.isPending ? (
				<Loader2 className="size-3 animate-spin" />
			) : (
				<Sparkles className="size-3" />
			)}
			{draft.isPending ? "Drafting…" : "Draft with AI"}
		</button>
	);
}
