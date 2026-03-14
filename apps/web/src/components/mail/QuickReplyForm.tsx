import {
	RichTextEditor,
	type RichTextEditorRef,
} from "@/components/ui/rich-text-editor";
import { useCancelSend, useReplyDelayed } from "@/hooks/use-mail";
import { Send } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface QuickReplyFormProps {
	emailId: string;
	fromAddress: string | null;
	subject: string | null;
	onSent?: () => void;
}

export function QuickReplyForm({
	emailId,
	fromAddress,
	subject,
	onSent,
}: QuickReplyFormProps) {
	const [body, setBody] = useState("");
	const reply = useReplyDelayed();
	const cancelSend = useCancelSend();
	const editorRef = useRef<RichTextEditorRef>(null);
	const previousFocusRef = useRef<Element | null>(null);

	const handleSend = useCallback(() => {
		const html = editorRef.current?.getHTML() ?? body;
		const text = editorRef.current?.getText() ?? body;
		if (!text.trim()) return;
		reply.mutate(
			{ id: emailId, body: html },
			{
				onSuccess: (data) => {
					setBody("");
					editorRef.current?.clear();
					onSent?.();
					const jobId = data?.jobId;
					if (jobId) {
						toast("Reply sent", {
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
						toast("Reply sent");
					}
				},
				onError: () => toast.error("Failed to send reply"),
			},
		);
	}, [emailId, body, reply, cancelSend, onSent]);

	const handleEditorKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleSend();
			}
			if (e.key === "Escape") {
				e.preventDefault();
				(document.activeElement as HTMLElement)?.blur();
				if (previousFocusRef.current instanceof HTMLElement) {
					previousFocusRef.current.focus();
				}
				previousFocusRef.current = null;
			}
			// Stop propagation so keyboard shortcuts don't fire while typing
			e.stopPropagation();
		},
		[handleSend],
	);

	const isEmpty = editorRef.current?.isEmpty() ?? !body.trim();

	return (
		<div className="border-t border-border/30 px-4 py-3">
			<div className="font-body text-[12px] text-grey-3 mb-2">
				<span>To: </span>
				<span className="text-grey-2">{fromAddress ?? "Unknown"}</span>
				{subject && (
					<>
						<span className="mx-1.5 text-grey-4">·</span>
						<span className="text-grey-3 italic">Re: {subject}</span>
					</>
				)}
			</div>
			<div className="flex gap-2">
				<div
					className="flex-1"
					onFocus={() => {
						previousFocusRef.current = document.activeElement;
					}}
				>
					<RichTextEditor
						ref={editorRef}
						value={body}
						onChange={setBody}
						placeholder="Quick reply..."
						minimal
						disabled={reply.isPending}
						onKeyDown={handleEditorKeyDown}
						editorClassName="min-h-[40px]"
					/>
				</div>
				<button
					type="button"
					onClick={handleSend}
					disabled={reply.isPending || isEmpty}
					className="self-end shrink-0 inline-flex items-center justify-center size-8 rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
				>
					<Send className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
