import type { BriefingStat } from "@wingmnn/types";

function getStatByLabel(
	stats: BriefingStat[],
	label: string,
): BriefingStat | undefined {
	return stats.find(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === label,
	);
}

export function BriefingStrip({
	stats,
	onStatClick,
}: {
	stats: BriefingStat[];
	onStatClick?: (index: number) => void;
}) {
	const unread = getStatByLabel(stats, "unread");
	const needYou = getStatByLabel(stats, "needyou");
	const autoHandled = getStatByLabel(stats, "autohandled");

	const needYouCount = Number(needYou?.value ?? 0);
	const autoHandledCount = Number(autoHandled?.value ?? 0);
	const unreadCount = Number(unread?.value ?? 0);

	const needYouIdx = stats.findIndex(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === "needyou",
	);
	const autoHandledIdx = stats.findIndex(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === "autohandled",
	);
	const unreadIdx = stats.findIndex(
		(s) => s.label.toLowerCase().replace(/[^a-z]/g, "") === "unread",
	);

	if (needYouCount === 0 && autoHandledCount === 0 && unreadCount === 0) {
		return (
			<p className="font-serif text-[15px] text-foreground/50 italic leading-relaxed">
				Nothing needs your attention right now.
			</p>
		);
	}

	return (
		<p className="font-serif text-[16px] text-foreground/60 leading-relaxed">
			{needYouCount > 0 ? (
				<>
					<StatButton
						value={needYouCount}
						onClick={
							onStatClick && needYouIdx >= 0
								? () => onStatClick(needYouIdx)
								: undefined
						}
						className="text-accent-red"
					/>{" "}
					{needYouCount === 1 ? "thing needs" : "things need"} your attention.
				</>
			) : (
				<>Nothing needs your attention right now.</>
			)}{" "}
			{autoHandledCount > 0 && (
				<>
					<StatButton
						value={autoHandledCount}
						onClick={
							onStatClick && autoHandledIdx >= 0
								? () => onStatClick(autoHandledIdx)
								: undefined
						}
					/>{" "}
					{autoHandledCount === 1 ? "email was" : "emails were"} handled while
					you were away.{" "}
				</>
			)}
			{unreadCount > 0 && (
				<>
					<StatButton
						value={unreadCount}
						onClick={
							onStatClick && unreadIdx >= 0
								? () => onStatClick(unreadIdx)
								: undefined
						}
					/>{" "}
					unread.
				</>
			)}
		</p>
	);
}

function StatButton({
	value,
	onClick,
	className,
}: {
	value: number;
	onClick?: () => void;
	className?: string;
}) {
	if (onClick) {
		return (
			<button
				type="button"
				onClick={onClick}
				className={`font-serif font-medium underline-offset-2 hover:underline cursor-pointer ${className ?? "text-foreground"}`}
			>
				{value}
			</button>
		);
	}
	return (
		<span
			className={`font-serif font-medium ${className ?? "text-foreground"}`}
		>
			{value}
		</span>
	);
}
