import { useState } from "react";
import { Linkedin, Mail, Twitter } from "lucide-react";
import CookieSettings from "./CookieSettings";
import Logo from "./Logo";

const linkCls =
	"block font-serif text-[0.92rem] text-cream/55 no-underline leading-8 cursor-pointer transition-colors duration-150 hover:text-cream whitespace-nowrap";
const placeholderCls =
	"block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-default whitespace-nowrap";

export default function Footer() {
	const [cookieOpen, setCookieOpen] = useState(false);

	return (
		<>
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
					<div className="grid grid-cols-3 max-[500px]:grid-cols-2 gap-x-10 gap-y-8">
						{/* Product */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Product
							</h4>
							<a href="/how-it-works" className={linkCls}>
								How it works
							</a>
							<a href="#modules" className={linkCls}>
								Modules
							</a>
							<span className={placeholderCls}>Pricing</span>
							<span className={placeholderCls}>Integrations</span>
						</div>

						{/* Use Cases */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Use Cases
							</h4>
							<a href="/use-cases/founders" className={linkCls}>
								For Founders
							</a>
							<a href="/use-cases/freelancers" className={linkCls}>
								For Freelancers
							</a>
							<a href="/use-cases/busy-parents" className={linkCls}>
								For Busy Parents
							</a>
							<a href="/use-cases/executives" className={linkCls}>
								For Executives
							</a>
						</div>

						{/* Resources */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Resources
							</h4>
							<span className={placeholderCls}>Blog</span>
							<span className={placeholderCls}>Help Center</span>
							<span className={placeholderCls}>Changelog</span>
							<a href="/tools" className={linkCls}>
								Free Tools
							</a>
						</div>

						{/* Company */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Company
							</h4>
							<a href="/about" className={linkCls}>
								About
							</a>
							<span className={placeholderCls}>Careers</span>
							<span className={placeholderCls}>Contact</span>
						</div>

						{/* Legal */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Legal
							</h4>
							<a href="/privacy" className={linkCls}>
								Privacy
							</a>
							<a href="/terms" className={linkCls}>
								Terms
							</a>
							<button
								type="button"
								onClick={() => setCookieOpen(true)}
								className="block font-serif text-[0.92rem] text-cream/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-cream bg-transparent border-none p-0 text-left whitespace-nowrap"
							>
								Cookie settings
							</button>
						</div>
					</div>
				</div>
				<div className="max-w-[1200px] mx-auto pt-6 border-t border-white/8 font-mono text-xs text-cream/25 flex max-[500px]:flex-col justify-between max-[500px]:items-start items-center gap-3 max-[500px]:gap-3">
					<span>&copy; {new Date().getFullYear()} Wingmnn Systems Inc.</span>
					<div className="flex items-center gap-5">
						<a
							href="/privacy"
							className="font-mono text-xs text-cream/30 no-underline cursor-pointer transition-colors duration-150 hover:text-cream/60"
						>
							Privacy
						</a>
						<a
							href="/terms"
							className="font-mono text-xs text-cream/30 no-underline cursor-pointer transition-colors duration-150 hover:text-cream/60"
						>
							Terms
						</a>
						<span className="w-px h-3 bg-white/10" />
						<div className="flex items-center gap-3.5">
							<span className="text-cream/30 cursor-pointer transition-colors duration-150 hover:text-cream/60">
								<Twitter size={14} />
							</span>
							<span className="text-cream/30 cursor-pointer transition-colors duration-150 hover:text-cream/60">
								<Linkedin size={14} />
							</span>
							<span className="text-cream/30 cursor-pointer transition-colors duration-150 hover:text-cream/60">
								<Mail size={14} />
							</span>
						</div>
					</div>
				</div>
			</footer>
			<CookieSettings open={cookieOpen} onClose={() => setCookieOpen(false)} />
		</>
	);
}
