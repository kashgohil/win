import Logo from "@/components/Logo";
import { getIcon } from "@/components/onboarding/icons";
import type { Module } from "@/lib/onboarding-data";

interface NavPillProps {
	modules: Module[];
}

export default function NavPill({ modules }: NavPillProps) {
	if (modules.length === 0) return null;

	return (
		<div className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none">
			<div className="flex justify-center pb-[calc(10px+env(safe-area-inset-bottom))] px-4">
				<nav className="pointer-events-auto nav-pill-enter flex items-center bg-foreground/90 backdrop-blur-2xl rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.18)] border border-background/6">
					{/* Home */}
					<button
						type="button"
						aria-label="Home"
						className="shrink-0 size-11 rounded-full flex items-center justify-center text-background/70 hover:text-background active:scale-90 transition-all duration-150 cursor-pointer"
					>
						<Logo className="size-[14px]" />
					</button>

					{/* Divider */}
					<div className="w-px h-5 bg-background/8 shrink-0 -ml-0.5" />

					{/* Modules */}
					<div className="flex items-center gap-0.5 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] pr-1.5 pl-1">
						{modules.map((mod) => {
							const Icon = getIcon(mod.icon);
							return (
								<button
									key={mod.key}
									type="button"
									aria-label={mod.name}
									title={mod.name}
									className="shrink-0 size-9 rounded-full flex items-center justify-center text-background/40 hover:text-background hover:bg-background/8 active:scale-90 transition-all duration-150 cursor-pointer"
								>
									{Icon && <Icon size={16} strokeWidth={1.5} />}
								</button>
							);
						})}
					</div>
				</nav>
			</div>
		</div>
	);
}
