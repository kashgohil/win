import Logo from "@/components/Logo";
import { motion } from "motion/react";
import { MOTION_CONSTANTS } from "../constant";

const modules = [
	{ code: "MAL", name: "Mail", status: "LIVE", color: "green" },
	{ code: "CAL", name: "Calendar", status: "WATCHING", color: "amber" },
	{ code: "FIN", name: "Finance", status: "TRACKING", color: "amber" },
	{ code: "TSK", name: "Tasks", status: "READY", color: "grey" },
	{ code: "NTS", name: "Notes", status: "IDLE", color: "grey" },
] as const;

const statusColors: Record<string, string> = {
	green: "bg-emerald-500/15 text-emerald-400",
	amber: "bg-amber-500/15 text-amber-400",
	grey: "bg-white/[0.06] text-cream/40",
};

export default function AuthBrandPanel() {
	return (
		<div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col items-center justify-center bg-ink overflow-hidden">
			{/* Subtle radial glow */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,57,43,0.04)_0%,transparent_70%)]" />

			<div className="relative z-10 flex flex-col items-center w-full max-w-[320px]">
				{/* Logo */}
				<motion.div
					animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
					transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
				>
					<Logo className="size-9 text-cream" />
				</motion.div>

				{/* Wordmark */}
				<motion.span
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						delay: 0.2,
						duration: 0.6,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className="mt-5 font-display text-[1.6rem] text-cream tracking-[0.03em] lowercase"
				>
					wingmnn
				</motion.span>

				{/* Accent label */}
				<motion.span
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4, duration: 0.5 }}
					className="mt-6 font-mono text-[11px] text-accent-red tracking-[0.08em] uppercase"
				>
					your digital twin
				</motion.span>

				{/* Separator */}
				<motion.div
					initial={{ scaleX: 0 }}
					animate={{ scaleX: 1 }}
					transition={{
						delay: 0.5,
						duration: 0.4,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className="mt-6 w-8 h-px bg-accent-red/40 origin-center"
				/>

				{/* Module status rows */}
				<div className="mt-8 w-full space-y-2">
					{modules.map((mod, i) => (
						<motion.div
							key={mod.code}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{
								delay: 0.6 + i * 0.12,
								duration: 0.5,
								ease: MOTION_CONSTANTS.EASE,
							}}
							className="flex items-center justify-between py-2.5 px-4 rounded-lg bg-white/3 border border-white/6"
						>
							<div className="flex items-center gap-3">
								<span className="font-mono text-[10px] text-cream/25 tracking-[0.06em]">
									{mod.code}
								</span>
								<span className="font-mono text-[12px] text-cream/60">
									{mod.name}
								</span>
							</div>
							<span
								className={`font-mono text-[9px] tracking-[0.08em] uppercase px-2 py-0.5 rounded-full ${statusColors[mod.color]}`}
							>
								{mod.status}
							</span>
						</motion.div>
					))}
				</div>

				{/* Closing tagline */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.4, duration: 0.6 }}
					className="mt-8 font-mono text-[11px] text-cream/25 tracking-[0.02em]"
				>
					works while you live.
				</motion.p>
			</div>
		</div>
	);
}
