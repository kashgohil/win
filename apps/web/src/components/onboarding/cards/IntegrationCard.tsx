import { getIcon } from "../icons";

export default function IntegrationCard({
	icon,
	provider,
	description,
	style,
}: {
	icon: string;
	provider: string;
	description: string;
	style?: React.CSSProperties;
}) {
	const Icon = getIcon(icon);

	return (
		<div
			style={style}
			className="ob-card-in flex items-center gap-4 rounded-lg border border-grey-4 bg-cream p-4"
		>
			<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-grey-4/50">
				{Icon && <Icon size={18} className="text-grey-2" />}
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-display text-[0.9rem] text-ink font-medium">
					{provider}
				</p>
				<p className="font-serif text-[0.78rem] text-grey-3 leading-snug">
					{description}
				</p>
			</div>
			<span className="shrink-0 font-mono text-[10px] text-grey-3 tracking-[0.04em] border border-grey-4 rounded-full px-2.5 py-1">
				Coming soon
			</span>
		</div>
	);
}
