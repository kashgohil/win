import { DraftReviewCard } from "@/components/mail/DraftReviewCard";
import { KeyboardShortcutBar } from "@/components/mail/KeyboardShortcutBar";
import { useDrafts } from "@/hooks/use-mail";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { useCallback, useState } from "react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/drafts/",
)({
	component: DraftsPage,
});

function DraftsPage() {
	const { data, fetchNextPage, hasNextPage, isLoading } = useDrafts();
	const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

	const allDrafts =
		data?.pages
			.flatMap((p) => p?.drafts ?? [])
			.filter((d) => !dismissedIds.has(d.id)) ?? [];

	const handleDone = useCallback((id: string) => {
		setDismissedIds((prev) => new Set(prev).add(id));
	}, []);

	return (
		<div className="flex-1 overflow-y-auto">
			<div className="max-w-5xl mx-auto px-(--page-px) py-6">
				<div className="flex items-center gap-3 mb-6">
					<Link
						to="/module/mail"
						className="inline-flex items-center gap-1.5 font-body text-[12px] text-grey-3 hover:text-foreground transition-colors"
					>
						<ArrowLeft className="size-3.5" />
						Back to hub
					</Link>
				</div>

				<div className="flex items-center gap-2.5 mb-6">
					<FileText className="size-4 text-foreground/60" />
					<h1 className="font-display text-lg lowercase">draft review</h1>
					{allDrafts.length > 0 && (
						<span className="font-body text-[12px] text-grey-3 bg-secondary/30 rounded-full px-2 py-0.5">
							{allDrafts.length}
						</span>
					)}
				</div>

				{isLoading ? (
					<div className="font-body text-[13px] text-grey-3 py-8 text-center">
						Loading drafts...
					</div>
				) : allDrafts.length === 0 ? (
					<div className="font-body text-[13px] text-grey-3 py-8 text-center">
						No AI drafts to review
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{allDrafts.map((draft) => (
							<DraftReviewCard
								key={draft.id}
								id={draft.id}
								subject={draft.subject}
								fromAddress={draft.fromAddress}
								fromName={draft.fromName}
								snippet={draft.snippet}
								draftResponse={draft.draftResponse}
								receivedAt={draft.receivedAt}
								onDone={() => handleDone(draft.id)}
							/>
						))}
						{hasNextPage && (
							<button
								type="button"
								onClick={() => fetchNextPage()}
								className="font-body text-[12px] text-grey-3 hover:text-foreground py-2 text-center cursor-pointer"
							>
								Load more
							</button>
						)}
					</div>
				)}
			</div>
			<KeyboardShortcutBar shortcuts={[[{ keys: ["["], label: "back" }]]} />
		</div>
	);
}
