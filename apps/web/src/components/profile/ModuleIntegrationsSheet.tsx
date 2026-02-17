import { getIcon } from "@/components/onboarding/icons";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import type { Integration, Module } from "@/lib/onboarding-data";
import { motion } from "motion/react";
import { MOTION_CONSTANTS } from "../constant";

function IntegrationRow({
	integration,
	index,
}: {
	integration: Integration;
	index: number;
}) {
	const Icon = getIcon(integration.icon);
	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.4,
				ease: MOTION_CONSTANTS.EASE,
				delay: index * 0.06,
			}}
			className="flex items-center gap-3 rounded-md border border-border/60 bg-background px-4 py-3"
		>
			{Icon && <Icon size={15} className="text-accent-red shrink-0" />}
			<div className="flex-1 min-w-0">
				<p className="font-display text-[0.875rem] font-medium text-foreground leading-tight">
					{integration.provider}
				</p>
				<p className="font-serif text-[0.8rem] text-grey-2 leading-snug">
					{integration.description}
				</p>
			</div>
			<span className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.08em] shrink-0">
				Soon
			</span>
		</motion.div>
	);
}

export default function ModuleIntegrationsSheet({
	module,
	integrations,
	open,
	onOpenChange,
}: {
	module: Module | null;
	integrations: Integration[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const Icon = module ? getIcon(module.icon) : undefined;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:w-[400px] sm:max-w-[440px] p-0 overflow-y-auto"
			>
				{/* Accent top-line */}
				<div className="h-[2px] bg-accent-red/60 shrink-0" />

				{/* Header */}
				<div className="px-6 pt-6 pb-4">
					<div className="flex items-center gap-3">
						{Icon && (
							<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
								<Icon size={18} />
							</div>
						)}
						<div>
							<SheetTitle className="font-display text-[1.1rem] font-medium tracking-[0.01em] lowercase">
								{module?.name}
							</SheetTitle>
							<span className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.12em]">
								{module?.code}
							</span>
						</div>
					</div>
					<SheetDescription className="font-serif text-[0.85rem] text-grey-2 mt-3 leading-relaxed">
						{module?.description}
					</SheetDescription>
				</div>

				{/* Divider */}
				<div className="mx-6 h-px bg-border/50" />

				{/* Integrations list */}
				<div className="px-6 pt-5 pb-8">
					<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
						Available integrations
					</span>

					{integrations.length > 0 ? (
						<div className="mt-4 space-y-2">
							{integrations.map((ig, i) => (
								<IntegrationRow key={ig.provider} integration={ig} index={i} />
							))}
						</div>
					) : (
						<p className="font-serif text-[0.85rem] text-grey-3 italic mt-4">
							No integrations available yet
						</p>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
