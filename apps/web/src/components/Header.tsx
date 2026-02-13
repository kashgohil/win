import { env } from "@/env";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import Logo from "./Logo";

export default function Header() {
	const [scrolled, setScrolled] = useState(false);

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 400);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	return (
		<header
			className={`fixed inset-x-0 top-0 z-100 bg-background/92 backdrop-blur-md border-b border-border transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
				scrolled ? "translate-y-0" : "-translate-y-full pointer-events-none"
			}`}
		>
			<div className="max-w-[1200px] mx-auto px-(--page-px) flex items-center justify-between h-[52px]">
				<Link
					to="/"
					className="flex items-center gap-2 font-display text-[1.15rem] text-foreground no-underline tracking-[0.03em] lowercase"
				>
					<Logo className="size-4 shrink-0" />
					wingmnn
				</Link>
				<nav aria-label="Main navigation" className="flex items-center gap-7">
					<a
						href={`${env.VITE_HERO_URL}/how-it-works`}
						className="max-sm:hidden font-mono text-[11px] text-grey-2 no-underline tracking-[0.02em] transition-colors duration-150 hover:text-foreground"
					>
						How it works
					</a>
					<a
						href={`${env.VITE_HERO_URL}/modules`}
						className="max-sm:hidden font-mono text-[11px] text-grey-2 no-underline tracking-[0.02em] transition-colors duration-150 hover:text-foreground"
					>
						Modules
					</a>
					<a
						href={`${env.VITE_HERO_URL}/about`}
						className="max-sm:hidden font-mono text-[11px] text-grey-2 no-underline tracking-[0.02em] transition-colors duration-150 hover:text-foreground"
					>
						About
					</a>
					<a
						href={`${env.VITE_HERO_URL}/early-access`}
						className="font-mono text-[11px] font-semibold text-background bg-foreground py-[7px] px-[18px] no-underline rounded transition-colors duration-150 hover:bg-[#333]"
					>
						Get early access
					</a>
				</nav>
			</div>
		</header>
	);
}
