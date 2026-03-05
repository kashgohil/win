import { MOTION_CONSTANTS } from "@/components/constant";
import { Merge, X } from "lucide-react";
import { motion } from "motion/react";

type MergeSuggestion = {
	threadIds: [string, string];
	subjects: [string | null, string | null];
	reason: string;
};

const REASON_LABELS: Record<string, string> = {
	similar_subject: "similar subject",
	shared_participants: "shared participants",
};

export function MergeSuggestionPill({
	suggestion,
	onMerge,
	onDismiss,
	isMerging,
}: {
	suggestion: MergeSuggestion;
	onMerge: () => void;
	onDismiss: () => void;
	isMerging: boolean;
}) {
	const reasonLabel = REASON_LABELS[suggestion.reason] ?? suggestion.reason;

	return (
		<motion.div
			initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
			animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
			exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
			transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
			className="mt-4 flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/10 px-3 py-2"
		>
			<Merge className="size-3.5 text-grey-2 shrink-0" />

			<span className="font-body text-[13px] text-grey-2/75 min-w-0 truncate">
				2 related threads detected ({reasonLabel})
			</span>

			<button
				type="button"
				onClick={onMerge}
				disabled={isMerging}
				className="ml-auto shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-foreground/8 hover:bg-foreground/15 text-foreground font-body text-[12px] font-medium transition-colors duration-150 cursor-pointer disabled:opacity-50"
			>
				{isMerging ? "Merging..." : "Merge"}
			</button>

			<button
				type="button"
				onClick={onDismiss}
				className="shrink-0 size-6 rounded-md flex items-center justify-center text-grey-3 hover:text-foreground hover:bg-foreground/5 transition-colors duration-150 cursor-pointer"
			>
				<X className="size-3" />
			</button>
		</motion.div>
	);
}
