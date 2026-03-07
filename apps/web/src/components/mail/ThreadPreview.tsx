import { AiSummary } from "@/components/mail/AiSummary";
import { AttachmentList } from "@/components/mail/AttachmentList";
import { EmailActions } from "@/components/mail/EmailActions";
import { EmailBody } from "@/components/mail/EmailBody";
import { MessageMetadata } from "@/components/mail/MessageMetadata";
import { QuickReplyForm } from "@/components/mail/QuickReplyForm";
import { useMailThreadDetail } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import type { SerializedThread } from "@wingmnn/types";
import { ArrowRight, Sparkles } from "lucide-react";

interface ThreadPreviewProps {
	threadId: string;
	thread: SerializedThread;
	variant: "inline" | "sidepanel";
	onOpenDetail: () => void;
}

export function ThreadPreview({
	threadId,
	thread,
	variant,
	onOpenDetail,
}: ThreadPreviewProps) {
	const { data, isPending } = useMailThreadDetail(threadId);
	const latestMessage = data?.messages?.[data.messages.length - 1];

	if (isPending) {
		return <PreviewSkeleton variant={variant} />;
	}

	if (!data || !latestMessage) {
		return (
			<div className="px-4 py-6">
				<p className="font-serif text-[13px] text-grey-3 italic">
					Could not load preview.
				</p>
			</div>
		);
	}

	if (variant === "inline") {
		return (
			<div className="px-4 py-3 space-y-3">
				{/* AI Summary — shown immediately from thread data */}
				{thread.aiSummary && (
					<div className="flex items-start gap-2">
						<Sparkles className="size-3.5 text-grey-3 shrink-0 mt-0.5" />
						<p className="font-serif text-[13px] text-foreground/70 italic leading-relaxed">
							{thread.aiSummary}
						</p>
					</div>
				)}

				{/* Metadata */}
				<div className="rounded-lg border border-border/40 bg-secondary/10 overflow-hidden">
					<MessageMetadata email={latestMessage} />
				</div>

				{/* Full HTML body */}
				<EmailBody
					html={latestMessage.bodyHtml}
					plain={latestMessage.bodyPlain}
				/>

				{/* Show full email link */}
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onOpenDetail();
					}}
					className="inline-flex items-center gap-1.5 font-body text-[12px] text-grey-2 hover:text-foreground transition-colors cursor-pointer"
				>
					Show full email
					<ArrowRight className="size-3" />
				</button>

				{/* Quick reply */}
				<QuickReplyForm
					emailId={latestMessage.id}
					fromAddress={latestMessage.fromAddress}
					subject={thread.subject}
				/>
			</div>
		);
	}

	// Sidepanel variant — full experience
	return (
		<div className="flex flex-col h-full">
			{/* Subject */}
			<div className="px-5 pt-5 pb-3">
				<h3 className="font-display text-[18px] text-foreground leading-tight lowercase">
					{thread.subject || "(no subject)"}
				</h3>
				{data.messages.length > 1 && (
					<span className="mt-1 inline-flex items-center justify-center min-w-[20px] h-4 px-1.5 rounded-full bg-foreground/8 text-grey-2 font-mono text-[10px] font-medium">
						{data.messages.length}
					</span>
				)}
			</div>

			{/* Action bar */}
			<div className="px-5 pb-3">
				<EmailActions
					isStarred={latestMessage.isStarred}
					isRead={latestMessage.isRead}
					fromAddress={latestMessage.fromAddress}
					category={latestMessage.category}
					onReply={() => {}}
					onForward={() => {}}
					onStar={() => {}}
					onToggleRead={() => {}}
					onArchive={() => {}}
					onDelete={() => {}}
				/>
			</div>

			<div className="h-px bg-border/30" />

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto">
				<div className="rounded-lg border border-border/40 bg-secondary/10 mx-5 mt-4 overflow-hidden">
					<MessageMetadata email={latestMessage} />
					{latestMessage.aiSummary && (
						<AiSummary summary={latestMessage.aiSummary} />
					)}
				</div>

				<div className="px-5 py-4">
					<EmailBody
						html={latestMessage.bodyHtml}
						plain={latestMessage.bodyPlain}
					/>
				</div>

				{latestMessage.attachments && latestMessage.attachments.length > 0 && (
					<div className="px-5 pb-4">
						<AttachmentList attachments={latestMessage.attachments} />
					</div>
				)}
			</div>

			{/* Quick reply — pinned to bottom */}
			<QuickReplyForm
				emailId={latestMessage.id}
				fromAddress={latestMessage.fromAddress}
				subject={thread.subject}
			/>
		</div>
	);
}

function PreviewSkeleton({ variant }: { variant: "inline" | "sidepanel" }) {
	if (variant === "inline") {
		return (
			<div className="px-4 py-3 animate-pulse space-y-2">
				<div className="h-3 w-3/4 bg-secondary/30 rounded" />
				<div className="h-3 w-full bg-secondary/25 rounded" />
				<div className="h-3 w-2/3 bg-secondary/20 rounded" />
			</div>
		);
	}

	return (
		<div className="px-5 pt-5 animate-pulse space-y-4">
			<div className="h-5 w-48 bg-secondary/40 rounded" />
			<div className="h-px bg-border/30" />
			<div className="space-y-2">
				<div className="h-3 w-32 bg-secondary/30 rounded" />
				<div className="h-3 w-48 bg-secondary/25 rounded" />
			</div>
			<div className="space-y-2 mt-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className={cn(
							"h-3 bg-secondary/25 rounded",
							i % 2 === 0 ? "w-full" : "w-3/4",
						)}
					/>
				))}
			</div>
		</div>
	);
}
