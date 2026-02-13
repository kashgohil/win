import Logo from "@/components/Logo";
import { useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect } from "react";

export default function LaunchAnimation() {
	const navigate = useNavigate();

	useEffect(() => {
		const timer = setTimeout(() => {
			navigate({ to: "/" });
		}, 2500);
		return () => clearTimeout(timer);
	}, [navigate]);

	return (
		<div className="fixed inset-0 z-50 bg-ink flex flex-col items-center justify-center overflow-hidden">
			{/* Radial glow */}
			<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,57,43,0.06)_0%,transparent_60%)]" />

			<div className="relative z-10 flex flex-col items-center">
				{/* Logo + rings */}
				<div className="relative flex items-center justify-center">
					<motion.div
						initial={{ scale: 0.8, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						transition={{
							duration: 0.6,
							ease: [0.22, 1, 0.36, 1],
						}}
					>
						<Logo className="size-14 text-cream ob-launch-pulse" />
					</motion.div>
					<div className="absolute size-28 rounded-full border border-accent-red/30 ob-launch-expand" />
					<div
						className="absolute size-28 rounded-full border border-cream/10 ob-launch-expand"
						style={{ animationDelay: "200ms" }}
					/>
				</div>

				{/* Title */}
				<motion.p
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						delay: 0.6,
						duration: 0.6,
						ease: [0.22, 1, 0.36, 1],
					}}
					className="font-display text-[clamp(1.4rem,3.5vw,1.8rem)] text-cream tracking-[0.02em] mt-12"
				>
					Your Wingmnn is ready.
				</motion.p>

				{/* Subtitle */}
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 1.0, duration: 0.5 }}
					className="font-mono text-[11px] text-cream/30 tracking-[0.04em] mt-4"
				>
					works while you live.
				</motion.p>
			</div>
		</div>
	);
}
