import { cn } from "@/lib/utils";
import { getIcon } from "../icons";

export default function RoleCard({
	icon,
	label,
	description,
	selected,
	onClick,
	style,
}: {
	icon: string;
	label: string;
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
				"ob-card-in flex flex-col items-start gap-3 rounded-lg border p-5 text-left transition-all duration-200 cursor-pointer bg-cream",
				selected
					? "border-accent-red shadow-[0_0_0_1px_var(--color-accent-red)]"
					: "border-grey-4 hover:-translate-y-0.5 hover:shadow-sm",
			)}
		>
			{Icon && (
				<Icon
					size={20}
					className={selected ? "text-accent-red" : "text-grey-2"}
				/>
			)}
			<div>
				<p className="font-display text-[1rem] text-ink font-medium">{label}</p>
				<p className="font-serif text-[0.85rem] text-grey-2 leading-snug mt-0.5">
					{description}
				</p>
			</div>
		</button>
	);
}
