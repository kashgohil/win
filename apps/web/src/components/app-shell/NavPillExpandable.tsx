import Logo from "@/components/Logo";
import { getIcon } from "@/components/onboarding/icons";
import type { Module } from "@/lib/onboarding-data";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";

interface NavPillProps {
	modules: Module[];
}

const enterTransition = {
	width: { type: "spring" as const, stiffness: 400, damping: 30 },
	opacity: { duration: 0.2 },
};

const exitTransition = {
	width: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
	opacity: { duration: 0.2, ease: "easeOut" as const },
};

export default function NavPillExpandable({ modules }: NavPillProps) {
	const [expanded, setExpanded] = useState(false);
	const open = useCallback(() => setExpanded(true), []);
	const close = useCallback(() => setExpanded(false), []);

	if (modules.length === 0) return null;

	return (
		<div className="md:hidden fixed inset-x-0 bottom-0 z-50 pointer-events-none">
			<div className="flex justify-center pb-[calc(10px+env(safe-area-inset-bottom))] px-4">
				<nav className="pointer-events-auto nav-pill-enter flex items-center bg-foreground/90 backdrop-blur-2xl rounded-full shadow-[0_4px_30px_rgba(0,0,0,0.18)] border border-background/6 overflow-hidden">
					{/* Logo — tap to expand */}
					<motion.button
						type="button"
						aria-label={expanded ? "Home" : "Open navigation"}
						onClick={expanded ? undefined : open}
						whileTap={{ scale: 0.85 }}
						className="shrink-0 size-11 rounded-full flex items-center justify-center text-background/70 hover:text-background transition-colors duration-150 cursor-pointer"
					>
						<Logo className="size-[14px]" />
					</motion.button>

					{/* Expandable tray */}
					<AnimatePresence>
						{expanded && (
							<motion.div
								key="tray"
								initial={{ width: 0, opacity: 0 }}
								animate={{
									width: "auto",
									opacity: 1,
									transition: enterTransition,
								}}
								exit={{
									width: 0,
									opacity: 0,
									transition: exitTransition,
								}}
								className="flex items-center overflow-hidden"
							>
								{/* Divider */}
								<div className="w-px h-5 bg-background/8 shrink-0" />

								{/* Modules */}
								<div className="flex items-center gap-0.5 pl-1">
									{modules.map((mod, i) => {
										const Icon = getIcon(mod.icon);
										return (
											<motion.button
												key={mod.key}
												initial={{
													opacity: 0,
													scale: 0,
												}}
												animate={{
													opacity: 1,
													scale: 1,
												}}
												transition={{
													delay: i * 0.03,
													type: "spring",
													stiffness: 500,
													damping: 25,
												}}
												type="button"
												aria-label={mod.name}
												title={mod.name}
												whileTap={{ scale: 0.85 }}
												className="shrink-0 size-9 rounded-full flex items-center justify-center text-background/40 hover:text-background hover:bg-background/8 transition-colors duration-150 cursor-pointer"
											>
												{Icon && <Icon size={16} strokeWidth={1.5} />}
											</motion.button>
										);
									})}
								</div>

								{/* Close */}
								<motion.button
									initial={{ opacity: 0, scale: 0 }}
									animate={{ opacity: 1, scale: 1 }}
									transition={{
										delay: modules.length * 0.03 + 0.02,
										type: "spring",
										stiffness: 500,
										damping: 25,
									}}
									type="button"
									aria-label="Close navigation"
									onClick={close}
									whileTap={{ scale: 0.85 }}
									className="shrink-0 size-9 rounded-full flex items-center justify-center text-background/30 hover:text-background hover:bg-background/8 transition-colors duration-150 cursor-pointer mr-1"
								>
									<X size={14} strokeWidth={2} />
								</motion.button>
							</motion.div>
						)}
					</AnimatePresence>
				</nav>
			</div>
		</div>
	);
}
