import Logo from "./Logo";

export default function Footer() {
	return (
		<footer className="pt-[72px] px-(--page-px) pb-10 bg-ink text-cream">
			<div className="max-w-[1200px] mx-auto mb-12 grid grid-cols-[1.4fr_1fr] max-md:grid-cols-1 gap-20 max-md:gap-12 items-start">
				<div className="max-w-[380px]">
					<div className="flex items-center gap-2.5 font-display text-[1.8rem] text-cream tracking-[0.03em] lowercase mb-4">
						<Logo className="size-5 shrink-0" />
						wingmnn
					</div>
					<p className="font-serif text-base leading-[1.7] text-cream/45">
						A single intelligence that learns how you operate — then operates
						for you. Built with care in Brooklyn, NY.
					</p>
				</div>
				<div className="grid grid-cols-3 max-[500px]:grid-cols-1 gap-8 max-[500px]:gap-8">
					<div>
						<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
							Product
						</h4>
						<a
							href="#how"
							className="block font-serif text-[0.92rem] text-cream/55 no-underline leading-8 cursor-pointer transition-colors duration-150 hover:text-cream"
						>
							How it works
						</a>
						<a
							href="#modules"
							className="block font-serif text-[0.92rem] text-cream/55 no-underline leading-8 cursor-pointer transition-colors duration-150 hover:text-cream"
						>
							Modules
						</a>
						<a
							href="#join"
							className="block font-serif text-[0.92rem] text-cream/55 no-underline leading-8 cursor-pointer transition-colors duration-150 hover:text-cream"
						>
							Get early access
						</a>
					</div>
					<div>
						<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
							Company
						</h4>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							About
						</span>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							Blog
						</span>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							Careers
						</span>
					</div>
					<div>
						<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
							Connect
						</h4>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							Twitter
						</span>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							LinkedIn
						</span>
						<span className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream">
							hello@wingmnn.com
						</span>
					</div>
				</div>
			</div>
			<div className="max-w-[1200px] mx-auto pt-6 border-t border-white/8 font-mono text-xs text-cream/25 flex max-[500px]:flex-col justify-between max-[500px]:items-start items-center gap-3 max-[500px]:gap-3">
				<span>&copy; {new Date().getFullYear()} Wingmnn Systems Inc.</span>
				<div className="flex gap-5">
					<span className="font-mono text-xs text-cream/30 cursor-pointer transition-colors duration-150 hover:text-cream/60">
						Privacy
					</span>
					<span className="font-mono text-xs text-cream/30 cursor-pointer transition-colors duration-150 hover:text-cream/60">
						Terms
					</span>
				</div>
			</div>
		</footer>
	);
}
