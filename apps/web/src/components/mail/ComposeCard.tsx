import { MOTION_CONSTANTS } from "@/components/constant";
import { RecipientInput } from "@/components/mail/RecipientInput";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	AiDropdown,
	RichTextEditor,
	type RichTextEditorRef,
} from "@/components/ui/rich-text-editor";
import {
	type EnhanceAction,
	useAiCompose,
	useAiDraft,
	useAiEnhance,
} from "@/hooks/use-ai";
import type { ComposePayload } from "@/hooks/use-compose";
import {
	clearComposeDraft,
	getSavedDraft,
	useComposeDraftAutoSave,
} from "@/hooks/use-compose-draft";
import { useSuggestCc } from "@/hooks/use-contacts";
import {
	type SendAttachmentInput,
	useCancelSend,
	useComposeDelayed,
	useForwardDelayed,
	useMailAccounts,
	useReplyDelayed,
} from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import {
	ChevronDown,
	Loader2,
	Maximize2,
	Minimize2,
	Paperclip,
	PenSquare,
	Send,
	Sparkles,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type ViewState = "card" | "full";

interface ComposeCardProps {
	visible: boolean;
	payload: ComposePayload | null;
	onClose: () => void;
	onOpen: () => void;
}

export function ComposeCard({
	visible,
	payload,
	onClose,
	onOpen,
}: ComposeCardProps) {
	const mode = payload?.mode ?? "compose";

	const [viewState, setViewState] = useState<ViewState>("card");
	const [to, setTo] = useState<string[]>([]);
	const [body, setBody] = useState("");
	const [cc, setCc] = useState<string[]>([]);
	const [bcc, setBcc] = useState<string[]>([]);
	const [composeSubject, setComposeSubject] = useState("");
	const [attachments, setAttachments] = useState<SendAttachmentInput[]>([]);
	const [showBcc, setShowBcc] = useState(false);
	const [showOriginal, setShowOriginal] = useState(false);
	const [selectedAccountId, setSelectedAccountId] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	const bodyRef = useRef<RichTextEditorRef>(null);
	const prevPayloadRef = useRef<ComposePayload | null>(null);

	const { data: accountsData } = useMailAccounts();
	const accounts = accountsData?.accounts ?? [];

	// Auto-select first account
	useEffect(() => {
		if (!selectedAccountId && accounts.length > 0) {
			setSelectedAccountId(accounts[0].id);
		}
	}, [accounts, selectedAccountId]);

	// Reset state when a new payload arrives
	useEffect(() => {
		if (!payload || payload === prevPayloadRef.current) return;
		prevPayloadRef.current = payload;

		// Reset fields
		setTo([]);
		setCc([]);
		setBcc([]);
		setBody("");
		setComposeSubject("");
		setAttachments([]);
		setShowBcc(false);
		setShowOriginal(false);
		setViewState("card");

		if (payload.mode === "compose") {
			const saved = getSavedDraft();
			if (saved) {
				setTo(saved.to);
				setCc(saved.cc);
				setBcc(saved.bcc);
				setComposeSubject(saved.subject);
				setBody(saved.body);
				if (saved.accountId) setSelectedAccountId(saved.accountId);
				if (saved.bcc.length > 0) setShowBcc(true);
			}
			if (payload.defaultAccountId) {
				setSelectedAccountId(payload.defaultAccountId);
			}
		}

		// Focus body after a tick
		setTimeout(() => bodyRef.current?.focus(), 200);
	}, [payload]);

	// Auto-save compose draft
	useComposeDraftAutoSave(
		mode === "compose"
			? {
					to,
					cc,
					bcc,
					subject: composeSubject,
					body,
					accountId: selectedAccountId,
				}
			: { to: [], cc: [], bcc: [], subject: "", body: "", accountId: "" },
	);

	const { data: ccSuggestions } = useSuggestCc(
		mode === "reply" && payload?.mode === "reply"
			? (payload.fromAddress ?? null)
			: null,
	);

	const reply = useReplyDelayed();
	const forward = useForwardDelayed();
	const compose = useComposeDelayed();
	const cancelSend = useCancelSend();

	const aiEnhance = useAiEnhance();
	const isPending = reply.isPending || forward.isPending || compose.isPending;

	const handleEnhanceAll = useCallback(
		(action: EnhanceAction, language?: string) => {
			const html = bodyRef.current?.getHTML() ?? body;
			const text = bodyRef.current?.getText() ?? body;
			if (!text.trim()) return;
			aiEnhance.mutate(
				{ text: html, action, language },
				{
					onSuccess: (data) => setBody(data.result),
				},
			);
		},
		[body, aiEnhance],
	);

	const MAX_TOTAL_SIZE = 10 * 1024 * 1024;

	const handleFileSelect = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files) return;

			const currentSize = attachments.reduce(
				(sum, a) => sum + a.content.length * 0.75,
				0,
			);
			const newAttachments: SendAttachmentInput[] = [];

			for (const file of files) {
				if (currentSize + file.size > MAX_TOTAL_SIZE) {
					toast.error("Total attachment size exceeds 10MB limit");
					break;
				}
				const buffer = await file.arrayBuffer();
				const bytes = new Uint8Array(buffer);
				let binary = "";
				for (let i = 0; i < bytes.length; i++) {
					binary += String.fromCharCode(bytes[i]);
				}
				newAttachments.push({
					filename: file.name,
					mimeType: file.type || "application/octet-stream",
					content: btoa(binary),
				});
			}

			setAttachments((prev) => [...prev, ...newAttachments]);
			e.target.value = "";
		},
		[attachments],
	);

	const removeAttachment = useCallback((index: number) => {
		setAttachments((prev) => prev.filter((_, i) => i !== index));
	}, []);

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

	const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
	const signature = selectedAccount?.signature ?? null;

	const resetAndClose = useCallback(() => {
		(document.activeElement as HTMLElement)?.blur();
		setTo([]);
		setBody("");
		setCc([]);
		setBcc([]);
		setAttachments([]);
		setComposeSubject("");
		setShowBcc(false);
		setShowOriginal(false);
		clearComposeDraft();
		prevPayloadRef.current = null;
		onClose();
	}, [onClose]);

	const handleSend = async () => {
		if (mode === "compose") {
			if (to.length === 0) {
				toast.error("Please enter at least one recipient");
				return;
			}
			if (!selectedAccountId) {
				toast.error("Please select an account");
				return;
			}
			const bodyWithSig = signature ? `${body}\n\n--\n${signature}` : body;
			compose.mutate(
				{
					accountId: selectedAccountId,
					to,
					cc: cc.length > 0 ? cc : undefined,
					bcc: bcc.length > 0 ? bcc : undefined,
					subject: composeSubject,
					body: bodyWithSig,
					attachments: attachments.length > 0 ? attachments : undefined,
				},
				{
					onSuccess: (data) => {
						resetAndClose();
						showUndoToast("Email sent", data?.jobId);
					},
					onError: () => toast.error("Failed to send email"),
				},
			);
		} else if (mode === "reply" && payload?.mode === "reply") {
			reply.mutate(
				{
					id: payload.emailId,
					body,
					cc: cc.length > 0 ? cc : undefined,
					attachments: attachments.length > 0 ? attachments : undefined,
				},
				{
					onSuccess: (data) => {
						resetAndClose();
						showUndoToast("Reply sent", data?.jobId);
					},
					onError: () => toast.error("Failed to send reply"),
				},
			);
		} else if (mode === "forward" && payload?.mode === "forward") {
			if (to.length === 0) {
				toast.error("Please enter at least one recipient");
				return;
			}
			forward.mutate(
				{
					id: payload.emailId,
					to,
					body,
					attachments: attachments.length > 0 ? attachments : undefined,
				},
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

	// Keyboard shortcuts
	useEffect(() => {
		if (!visible) return;
		const handler = (e: KeyboardEvent) => {
			// Escape: shrink or close
			if (e.key === "Escape") {
				e.preventDefault();
				if (viewState === "full") {
					setViewState("card");
				} else {
					resetAndClose();
				}
			}
			// Cmd+Enter: send
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				if (body.trim()) handleSend();
			}
			// Cmd+Shift+F: toggle fullscreen
			if (e.key === "f" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
				e.preventDefault();
				setViewState((s) => (s === "full" ? "card" : "full"));
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [visible, viewState, body, resetAndClose]);

	const title =
		mode === "compose"
			? composeSubject || "New message"
			: mode === "reply"
				? `Re: ${payload?.mode !== "compose" ? (payload?.subject ?? "") : ""}`
				: `Fwd: ${payload?.mode !== "compose" ? (payload?.subject ?? "") : ""}`;

	const sendLabel =
		mode === "compose" ? "Send" : mode === "reply" ? "Reply" : "Forward";

	const recipientForSuggestion =
		mode === "compose" || mode === "forward"
			? (to[0] ?? null)
			: payload?.mode !== "compose"
				? (payload?.fromAddress ?? null)
				: null;

	const subjectForSuggestion =
		mode === "compose"
			? composeSubject
			: payload?.mode !== "compose"
				? (payload?.subject ?? null)
				: null;

	const springTransition = {
		type: "spring" as const,
		stiffness: 380,
		damping: 34,
		mass: 0.8,
	};

	return (
		<>
			{/* Backdrop for fullscreen mode */}
			<AnimatePresence>
				{visible && viewState === "full" && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="fixed inset-0 z-60 bg-black/20 backdrop-blur-[2px]"
						onClick={() => setViewState("card")}
					/>
				)}
			</AnimatePresence>

			{/* Single morphing element */}
			<motion.div
				onClick={!visible ? onOpen : undefined}
				initial={{
					width: 44,
					height: 44,
					borderRadius: 22,
					bottom: 20,
					right: 20,
				}}
				animate={
					!visible
						? {
								width: 44,
								height: 44,
								borderRadius: 22,
								bottom: 20,
								right: 20,
							}
						: viewState === "full"
							? {
									width: "92vw",
									height: "92vh",
									borderRadius: 16,
									bottom: 20,
									right: 20,
								}
							: {
									width: 480,
									height: 480,
									borderRadius: 12,
									bottom: 20,
									right: 20,
								}
				}
				transition={springTransition}
				className={cn(
					"fixed z-[63] overflow-hidden border flex flex-col",
					"transition-[background-color,border-color,box-shadow] duration-300 ease-out",
					visible
						? "bg-background border-border/60 compose-card-shadow"
						: "bg-accent-red border-transparent shadow-lg shadow-accent-red/20 hover:shadow-accent-red/30 cursor-pointer",
				)}
			>
				{/* Pen icon — absolutely positioned, visible when collapsed */}
				<div
					className={cn(
						"absolute inset-0 flex items-center justify-center text-white transition-opacity duration-200 z-10",
						visible ? "opacity-0 pointer-events-none" : "opacity-100",
					)}
				>
					<PenSquare className="size-4" />
				</div>

				{/* Card content — in normal flow, fills container */}
				<div
					className={cn(
						"flex flex-col w-full flex-1 min-h-0 transition-opacity duration-200",
						visible ? "opacity-100 delay-75" : "opacity-0 pointer-events-none",
					)}
				>
					{/* Header bar */}
					<div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-secondary/5 shrink-0">
						<div className="flex items-center gap-2 min-w-0">
							<div className="size-2 rounded-full bg-accent-red shrink-0" />
							<span className="font-display text-[14px] text-foreground truncate lowercase">
								{title}
							</span>
						</div>
						<div className="flex items-center gap-1.5">
							<KbdGroup className="hidden sm:flex text-grey-3/50">
								{viewState === "card" ? (
									<>
										<Kbd>⌘</Kbd>
										<Kbd>⇧</Kbd>
										<Kbd>F</Kbd>
									</>
								) : (
									<Kbd>Esc</Kbd>
								)}
							</KbdGroup>
							<button
								type="button"
								onClick={() =>
									setViewState((s) => (s === "full" ? "card" : "full"))
								}
								className="size-7 flex items-center justify-center rounded-md text-grey-3 hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
								title={viewState === "full" ? "Exit fullscreen" : "Fullscreen"}
							>
								{viewState === "full" ? (
									<Minimize2 className="size-3.5" />
								) : (
									<Maximize2 className="size-3.5" />
								)}
							</button>
							<button
								type="button"
								onClick={resetAndClose}
								className="size-7 flex items-center justify-center rounded-md text-grey-3 hover:text-foreground hover:bg-secondary/40 transition-colors shrink-0"
								title="Close"
							>
								<X className="size-3.5" />
							</button>
						</div>
					</div>

					{/* Form body */}
					<div className="flex-1 overflow-y-auto min-h-0">
						{/* Recipients & subject zone */}
						<div className="px-4 pt-3 pb-2 space-y-0.5">
							{/* From selector (compose mode, multiple accounts) */}
							{mode === "compose" && accounts.length > 1 && (
								<div className="flex items-center gap-2 py-1.5 border-b border-border/10">
									<span className="font-body text-[12px] text-grey-3 shrink-0">
										From
									</span>
									<select
										value={selectedAccountId}
										onChange={(e) => setSelectedAccountId(e.target.value)}
										className="flex-1 bg-transparent font-body text-[13px] text-foreground outline-none cursor-pointer"
									>
										{accounts.map((a) => (
											<option key={a.id} value={a.id}>
												{a.email}
											</option>
										))}
									</select>
								</div>
							)}

							{/* Reply: static To */}
							{mode === "reply" && payload?.mode === "reply" && (
								<>
									<div className="flex items-center gap-2 py-1.5 border-b border-border/10">
										<span className="font-body text-[12px] text-grey-3 shrink-0">
											To
										</span>
										<span className="font-body text-[13px] text-foreground">
											{payload.fromAddress ?? ""}
										</span>
									</div>
									{cc.length > 0 && (
										<div className="flex items-center gap-2 py-1.5 border-b border-border/10 flex-wrap">
											<span className="font-body text-[12px] text-grey-3 shrink-0">
												Cc
											</span>
											{cc.map((email) => (
												<span
													key={email}
													className="inline-flex items-center gap-1 rounded-full bg-secondary/30 px-2.5 py-0.5 font-mono text-[11px] text-foreground"
												>
													{email}
													<button
														type="button"
														className="hover:text-accent-red cursor-pointer"
														onClick={() =>
															setCc((prev) => prev.filter((e) => e !== email))
														}
													>
														<X className="size-2.5" />
													</button>
												</span>
											))}
										</div>
									)}
									{ccSuggestions &&
										ccSuggestions.length > 0 &&
										ccSuggestions.some((s) => !cc.includes(s.email)) && (
											<div className="flex items-center gap-1.5 flex-wrap py-1">
												<span className="font-body text-[11px] text-grey-3">
													Add cc:
												</span>
												{ccSuggestions
													.filter((s) => !cc.includes(s.email))
													.map((s) => (
														<button
															key={s.id}
															type="button"
															className="inline-flex items-center gap-1 rounded-full bg-secondary/15 hover:bg-secondary/30 px-2.5 py-0.5 font-body text-[11px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
															onClick={() =>
																setCc((prev) => [...prev, s.email])
															}
														>
															+ {s.name || s.email}
														</button>
													))}
											</div>
										)}
								</>
							)}

							{/* Forward / Compose: To input */}
							{(mode === "forward" || mode === "compose") && (
								<RecipientInput label="To" values={to} onChange={setTo} />
							)}

							{/* Compose: Cc/Bcc */}
							{mode === "compose" && (
								<>
									<RecipientInput
										label="Cc"
										values={cc}
										onChange={setCc}
										placeholder="cc@example.com"
									/>
									{!showBcc && bcc.length === 0 ? (
										<button
											type="button"
											onClick={() => setShowBcc(true)}
											className="font-body text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer py-0.5"
										>
											+ Bcc
										</button>
									) : (
										<RecipientInput
											label="Bcc"
											values={bcc}
											onChange={setBcc}
											placeholder="bcc@example.com"
										/>
									)}
								</>
							)}
						</div>

						{/* Subject — prominent, display font */}
						{mode === "compose" && (
							<div className="px-4 pt-1 pb-3">
								<input
									type="text"
									value={composeSubject}
									onChange={(e) => setComposeSubject(e.target.value)}
									placeholder="Subject"
									className="w-full bg-transparent font-display text-[20px] font-semibold text-foreground placeholder:text-grey-3/30 outline-none lowercase tracking-tight"
								/>
							</div>
						)}

						{/* Body area */}
						<div className="px-4 pb-3 space-y-3">
							{/* AI Draft button for reply */}
							{mode === "reply" &&
								!body.trim() &&
								payload?.mode === "reply" && (
									<AiDraftButton
										subject={payload.subject}
										fromAddress={payload.fromAddress}
										originalBody={payload.originalBody}
										onDraft={setBody}
									/>
								)}

							{/* Body editor with AI suggestions */}
							<ComposeBody
								ref={bodyRef}
								body={body}
								onBodyChange={setBody}
								subject={subjectForSuggestion}
								recipient={recipientForSuggestion}
								viewState={viewState}
							/>

							{/* Signature */}
							{mode === "compose" && signature && (
								<div className="rounded-md border border-border/20 bg-secondary/5 px-3 py-2">
									<span className="font-mono text-[9px] text-grey-3/60 uppercase tracking-wider block mb-1">
										Signature
									</span>
									<p className="font-body text-[11px] text-grey-3 whitespace-pre-wrap">
										{signature}
									</p>
								</div>
							)}

							{/* Original message (reply/forward) */}
							{mode !== "compose" &&
								payload?.mode !== "compose" &&
								payload?.originalBody && (
									<div>
										<button
											type="button"
											onClick={() => setShowOriginal((o) => !o)}
											className="flex items-center gap-1.5 font-body text-[12px] text-grey-3 hover:text-foreground cursor-pointer select-none transition-colors"
										>
											<motion.div
												animate={{
													rotate: showOriginal ? 180 : 0,
												}}
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
													animate={{
														height: "auto",
														opacity: 1,
													}}
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
													<div className="mt-2 rounded-md border border-border/20 bg-secondary/5 p-3 font-mono text-[11px] text-grey-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
														{payload.originalBody}
													</div>
												</motion.div>
											)}
										</AnimatePresence>
									</div>
								)}
						</div>
					</div>

					{/* Footer: attachments + actions */}
					<div className="border-t border-border/40 px-4 py-3 space-y-2.5 shrink-0 bg-secondary/[0.02]">
						{/* Attachment list */}
						{attachments.length > 0 && (
							<div className="flex flex-wrap gap-1.5">
								{attachments.map((att, i) => (
									<div
										key={`${att.filename}-${i}`}
										className="inline-flex items-center gap-1.5 rounded-md bg-secondary/15 border border-border/30 px-2 py-1"
									>
										<Paperclip className="size-2.5 text-grey-3 shrink-0" />
										<span className="font-body text-[11px] text-foreground truncate max-w-[140px]">
											{att.filename}
										</span>
										<span className="font-mono text-[9px] text-grey-3">
											{formatFileSize(att.content.length * 0.75)}
										</span>
										<button
											type="button"
											onClick={() => removeAttachment(i)}
											className="text-grey-3 hover:text-accent-red cursor-pointer"
										>
											<X className="size-2.5" />
										</button>
									</div>
								))}
							</div>
						)}

						{/* Action bar */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-1">
								<input
									ref={fileInputRef}
									type="file"
									multiple
									className="hidden"
									onChange={handleFileSelect}
								/>
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									className="size-8 flex items-center justify-center rounded-md text-grey-3 hover:text-foreground hover:bg-secondary/30 transition-colors"
									title="Attach files"
								>
									<Paperclip className="size-3.5" />
								</button>
							</div>

							<div className="flex items-center gap-2">
								<AiDropdown
									onAction={handleEnhanceAll}
									isPending={aiEnhance.isPending}
									scope="message"
								/>
								<Button
									onClick={handleSend}
									disabled={isPending || !body.trim()}
									size="sm"
									className="gap-2 px-3"
								>
									{isPending ? (
										<>
											<Loader2 className="size-3 animate-spin" />
											Sending...
										</>
									) : (
										<>
											<Send className="size-3" />
											<KbdGroup>
												<Kbd className="bg-black/20 text-inherit border-0">
													⌘
												</Kbd>
												<Kbd className="bg-black/20 text-inherit border-0">
													↵
												</Kbd>
											</KbdGroup>
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</motion.div>
		</>
	);
}

/* ── Body editor with AI suggestions ── */

import { forwardRef } from "react";

const ComposeBody = forwardRef<
	RichTextEditorRef,
	{
		body: string;
		onBodyChange: (text: string) => void;
		subject: string | null;
		recipient: string | null;
		viewState: ViewState;
	}
>(function ComposeBody(
	{ body, onBodyChange, subject, recipient, viewState },
	ref,
) {
	const aiCompose = useAiCompose();
	const [suggestion, setSuggestion] = useState<string | null>(null);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastBodyRef = useRef(body);
	const mutateRef = useRef(aiCompose.mutate);
	mutateRef.current = aiCompose.mutate;
	const internalRef = useRef<RichTextEditorRef>(null);

	// Merge forwarded ref and internal ref
	const setRefs = useCallback(
		(instance: RichTextEditorRef | null) => {
			internalRef.current = instance;
			if (typeof ref === "function") ref(instance);
			else if (ref)
				(ref as React.MutableRefObject<RichTextEditorRef | null>).current =
					instance;
		},
		[ref],
	);

	const plainText = internalRef.current?.getText() ?? body;

	useEffect(() => {
		lastBodyRef.current = plainText;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		setSuggestion(null);

		if (plainText.trim().length < 10) return;

		debounceRef.current = setTimeout(() => {
			if (lastBodyRef.current !== plainText) return;
			mutateRef.current(
				{
					body: plainText,
					subject: subject ?? undefined,
					recipient: recipient ?? undefined,
				},
				{
					onSuccess: (data) => {
						if (lastBodyRef.current === plainText && data.suggestion) {
							setSuggestion(data.suggestion);
						}
					},
				},
			);
		}, 1500);

		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [plainText, subject, recipient]);

	const acceptSuggestion = useCallback(() => {
		if (suggestion) {
			const separator = body.endsWith(" ") || body.endsWith("\n") ? "" : " ";
			onBodyChange(body + separator + suggestion);
			setSuggestion(null);
		}
	}, [suggestion, body, onBodyChange]);

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Tab" && suggestion) {
				e.preventDefault();
				acceptSuggestion();
			}
		},
		[suggestion, acceptSuggestion],
	);

	return (
		<div className="relative flex-1 min-h-0">
			<RichTextEditor
				ref={setRefs}
				value={body}
				onChange={onBodyChange}
				placeholder="Write your message..."
				onKeyDown={handleKeyDown}
				containerClassName="p-0!"
				className="border-0 bg-transparent focus-within:ring-0 focus-within:border-0"
				editorClassName={
					viewState === "full" ? "min-h-[300px]" : "min-h-[120px]"
				}
			/>
			<AnimatePresence>
				{suggestion && (
					<motion.div
						initial={{ opacity: 0, y: 4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 4 }}
						transition={{ duration: 0.2, ease: MOTION_CONSTANTS.EASE }}
						className="mt-1"
					>
						<button
							type="button"
							onClick={acceptSuggestion}
							className="flex items-start gap-2 w-full text-left rounded-md bg-secondary/20 border border-border/20 px-3 py-2 cursor-pointer hover:bg-secondary/35 transition-colors group"
						>
							<Sparkles className="size-3 text-grey-3 shrink-0 mt-0.5" />
							<span className="font-body text-[12px] text-grey-3 leading-relaxed flex-1 line-clamp-2">
								{suggestion}
							</span>
							<span className="font-mono text-[9px] text-grey-3/60 shrink-0 mt-0.5 px-1.5 py-0.5 rounded bg-secondary/30 border border-border/20 group-hover:text-foreground transition-colors">
								Tab
							</span>
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
});

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
			className="inline-flex items-center gap-1.5 self-start px-2.5 py-1.5 rounded-md border border-border/30 bg-secondary/10 hover:bg-secondary/25 text-grey-3 hover:text-foreground font-body text-[12px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{draft.isPending ? (
				<Loader2 className="size-3 animate-spin" />
			) : (
				<Sparkles className="size-3" />
			)}
			{draft.isPending ? "Drafting..." : "Draft with AI"}
		</button>
	);
}

/* ── Helpers ── */

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
