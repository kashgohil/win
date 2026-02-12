import { useCallback, useEffect, useState } from "react";

export default function CookieSettings({
	open,
	onClose,
}: { open: boolean; onClose: () => void }) {
	const [analytics, setAnalytics] = useState(() => {
		if (typeof window === "undefined") return false;
		return localStorage.getItem("cookie-analytics") === "true";
	});

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	const save = useCallback(() => {
		localStorage.setItem("cookie-analytics", String(analytics));
		onClose();
	}, [analytics, onClose]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-200 flex items-center justify-center p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" />
			<div className="relative w-full max-w-[440px] bg-cream border border-grey-4 rounded-xl p-7 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
				<h2 className="font-serif font-bold text-[1.2rem] text-ink mb-1">
					Cookie settings
				</h2>
				<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2 mb-6">
					We use cookies to improve your experience and understand how our
					site is used.
				</p>

				<div className="flex flex-col gap-4 mb-7">
					{/* Essential */}
					<div className="flex items-center justify-between gap-4 py-3 px-4 border border-grey-4 rounded-lg">
						<div>
							<span className="font-mono text-[11px] font-semibold text-ink tracking-[0.02em] block mb-0.5">
								Essential cookies
							</span>
							<span className="font-serif text-[0.82rem] text-grey-2 leading-[1.5]">
								Required for the site to function.
							</span>
						</div>
						<div className="w-10 h-[22px] rounded-full bg-green-500 relative shrink-0 cursor-not-allowed opacity-60">
							<div className="absolute top-[3px] right-[3px] w-4 h-4 rounded-full bg-white" />
						</div>
					</div>

					{/* Analytics */}
					<div className="flex items-center justify-between gap-4 py-3 px-4 border border-grey-4 rounded-lg">
						<div>
							<span className="font-mono text-[11px] font-semibold text-ink tracking-[0.02em] block mb-0.5">
								Analytics cookies
							</span>
							<span className="font-serif text-[0.82rem] text-grey-2 leading-[1.5]">
								Help us understand how visitors use the site.
							</span>
						</div>
						<button
							type="button"
							onClick={() => setAnalytics(!analytics)}
							className={`w-10 h-[22px] rounded-full relative shrink-0 cursor-pointer border-none transition-colors duration-200 ${analytics ? "bg-green-500" : "bg-grey-4"}`}
							aria-label={`Analytics cookies ${analytics ? "enabled" : "disabled"}`}
						>
							<div
								className={`absolute top-[3px] w-4 h-4 rounded-full bg-white transition-[left] duration-200 ${analytics ? "left-[21px]" : "left-[3px]"}`}
							/>
						</button>
					</div>
				</div>

				<button
					type="button"
					onClick={save}
					className="w-full font-mono text-[12px] font-semibold text-white bg-ink py-3 rounded-md border-none cursor-pointer transition-colors duration-150 hover:bg-[#333]"
				>
					Save preferences
				</button>
			</div>
		</div>
	);
}
