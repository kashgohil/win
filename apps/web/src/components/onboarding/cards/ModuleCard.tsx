import { cn } from "@/lib/utils";
import { Check, getIcon } from "../icons";

export default function ModuleCard({
	icon,
	code,
	name,
	description,
	selected,
	onClick,
	style,
}: {
	icon: string;
	code: string;
	name: string;
	description: string;
	selected: boolean;
	onClick: () => void;
	style?: React.CSSProperties;
}) {
	const Icon = getIcon(icon);

	return (
		<button
			type="button"
			onClick={onClick}
			style={style}
			className={cn(
				"ob-card-in flex flex-col items-start gap-2.5 rounded-lg border p-4 text-left transition-all duration-200 cursor-pointer",
				selected
					? "border-accent-red bg-accent-red/[0.04] shadow-[0_0_0_1px_var(--color-accent-red)]"
					: "border-grey-4 bg-cream hover:-translate-y-0.5 hover:shadow-sm",
			)}
		>
			<div className="flex items-center justify-between w-full">
				<div className="flex items-center gap-2">
					{Icon && (
						<Icon
							size={16}
							className={selected ? "text-accent-red" : "text-grey-2"}
						/>
					)}
					<span className="font-display text-[0.9rem] text-ink font-medium">
						{name}
					</span>
				</div>
				<span className="font-mono text-[10px] text-grey-3 tracking-[0.08em]">
					{code}
				</span>
			</div>
			<p className="font-serif text-[0.8rem] text-grey-2 leading-snug">
				{description}
			</p>
			<div
				className={cn(
					"size-4 rounded border-2 flex items-center justify-center transition-colors duration-150 mt-auto",
					selected
						? "border-accent-red bg-accent-red"
						: "border-grey-4 bg-transparent",
				)}
			>
				{selected && <Check size={10} className="text-white" strokeWidth={3} />}
			</div>
		</button>
	);
}
