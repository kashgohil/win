import { useEffect, useState } from "react";

export default function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 50);
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
				scrolled ? "bg-deep/80 backdrop-blur-xl border-b border-white/4" : ""
			}`}
		>
			<div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
				<a
					href="/"
					className="font-display text-xl font-semibold italic text-(--text-primary) hover:text-(--accent-amber) transition-colors"
				>
					wingmnn
				</a>

				<div className="flex items-center gap-8">
					<nav className="hidden md:flex items-center gap-8 font-serif">
						<a
							href="#capabilities"
							className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
						>
							Features
						</a>
						<a
							href="#modes"
							className="text-sm text-(--text-secondary) hover:text-(--text-primary) transition-colors"
						>
							How it works
						</a>
					</nav>
					<a
						href="#waitlist"
						className="font-serif text-sm px-5 py-2 rounded-full bg-(--accent-amber) text-(--bg-deep) font-semibold hover:bg-(--accent-gold) transition-all"
					>
						Get early access
					</a>
				</div>
			</div>
		</header>
	);
}
