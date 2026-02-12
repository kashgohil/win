import Logo from "@/components/Logo";
import { useNavigate } from "@tanstack/react-router";
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
		<div className="fixed inset-0 z-50 bg-ink flex flex-col items-center justify-center">
			<div className="relative flex items-center justify-center">
				<Logo className="size-12 text-cream ob-launch-pulse" />
				<div className="absolute size-24 rounded-full border border-accent-red/40 ob-launch-expand" />
			</div>
			<p
				className="font-display text-[clamp(1.2rem,3vw,1.6rem)] text-cream tracking-[0.02em] mt-10 ob-fade-up"
				style={{ animationDelay: "600ms" }}
			>
				Your Wingmnn is ready.
			</p>
		</div>
	);
}
