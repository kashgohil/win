import { ThreadPreview } from "@/components/mail/ThreadPreview";
import type { SerializedThread } from "@wingmnn/types";
import { Mail } from "lucide-react";

interface ReadingPaneProps {
	threadId: string | null;
	thread: SerializedThread | null;
	onOpenDetail: () => void;
	variant: "inbox" | "sent";
}

export function ReadingPane({
	threadId,
	thread,
	onOpenDetail,
}: ReadingPaneProps) {
	if (!threadId || !thread) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center text-center h-full">
				<Mail className="size-8 text-grey-4 mb-3" />
				<p className="font-serif text-[14px] text-grey-3 italic">
					Select an email to preview
				</p>
				<p className="font-body text-[12px] text-grey-4 mt-1">
					Use j/k to navigate
				</p>
			</div>
		);
	}

	return (
		<ThreadPreview
			threadId={threadId}
			thread={thread}
			variant="sidepanel"
			onOpenDetail={onOpenDetail}
		/>
	);
}
