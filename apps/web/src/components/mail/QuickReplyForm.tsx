import { useReplyToEmail } from "@/hooks/use-mail";
import { Send } from "lucide-react";
import { useState } from "react";
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
	const reply = useReplyToEmail();

	const handleSend = () => {
		if (!body.trim()) return;
		reply.mutate(
			{ id: emailId, body },
			{
				onSuccess: () => {
					toast("Reply sent");
					setBody("");
					onSent?.();
				},
				onError: () => toast.error("Failed to send reply"),
			},
		);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSend();
		}
		// Stop propagation so keyboard shortcuts don't fire while typing
		e.stopPropagation();
	};

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
				<textarea
					data-quick-reply
					value={body}
					onChange={(e) => setBody(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Quick reply..."
					rows={2}
					disabled={reply.isPending}
					className="flex-1 resize-none rounded-md border border-border/40 bg-secondary/10 px-3 py-2 font-body text-[13px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 disabled:opacity-50"
				/>
				<button
					type="button"
					onClick={handleSend}
					disabled={reply.isPending || !body.trim()}
					className="self-end shrink-0 inline-flex items-center justify-center size-8 rounded-md bg-foreground text-background hover:bg-foreground/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
				>
					<Send className="size-3.5" />
				</button>
			</div>
		</div>
	);
}
