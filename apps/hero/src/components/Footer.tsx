import { Link } from "@tanstack/react-router";
import { Linkedin, Mail, Twitter } from "lucide-react";
import { useState } from "react";
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
							for you. Built with care.
						</p>
					</div>
					<div className="grid grid-cols-3 max-[500px]:grid-cols-2 gap-x-10 gap-y-8">
						{/* Product */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Product
							</h4>
							<Link to="/how-it-works" className={linkCls}>
								How it works
							</Link>
							<Link to="/modules" className={linkCls}>
								Modules
							</Link>
							<span className={placeholderCls}>Pricing</span>
							<Link to="/integrations" className={linkCls}>
								Integrations
							</Link>
						</div>

						{/* Use Cases */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Use Cases
							</h4>
							<Link to="/use-cases/founders" className={linkCls}>
								For Founders
							</Link>
							<Link to="/use-cases/freelancers" className={linkCls}>
								For Freelancers
							</Link>
							<Link to="/use-cases/busy-parents" className={linkCls}>
								For Busy Parents
							</Link>
							<Link to="/use-cases/executives" className={linkCls}>
								For Executives
							</Link>
						</div>

						{/* Resources */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Resources
							</h4>
							<Link to="/blog" className={linkCls}>
								Blog
							</Link>
							<Link to="/help" className={linkCls}>
								Help Center
							</Link>
							<span className={placeholderCls}>Changelog</span>
							<Link to="/tools" className={linkCls}>
								Free Tools
							</Link>
						</div>

						{/* Company */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Company
							</h4>
							<Link to="/about" className={linkCls}>
								About
							</Link>
							<span className={placeholderCls}>Careers</span>
							<Link to="/contact" className={linkCls}>
								Contact
							</Link>
						</div>

						{/* Legal */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-4">
								Legal
							</h4>
							<Link to="/privacy" className={linkCls}>
								Privacy
							</Link>
							<Link to="/terms" className={linkCls}>
								Terms
							</Link>
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
						<Link
							to="/privacy"
							className="font-mono text-xs text-cream/30 no-underline cursor-pointer transition-colors duration-150 hover:text-cream/60"
						>
							Privacy
						</Link>
						<Link
							to="/terms"
							className="font-mono text-xs text-cream/30 no-underline cursor-pointer transition-colors duration-150 hover:text-cream/60"
						>
							Terms
						</Link>
						<span className="w-px h-3 bg-white/10" />
						<div className="flex items-center gap-3.5">
							<a
								href="https://x.com/wingmnn"
								target="_blank"
								rel="noopener noreferrer"
								className="text-cream/30 transition-colors duration-150 hover:text-cream/60"
								aria-label="Twitter"
							>
								<Twitter size={14} />
							</a>
							<a
								href="https://linkedin.com/company/wingmnn"
								target="_blank"
								rel="noopener noreferrer"
								className="text-cream/30 transition-colors duration-150 hover:text-cream/60"
								aria-label="LinkedIn"
							>
								<Linkedin size={14} />
							</a>
							<a
								href="mailto:hello@wingmnn.com"
								className="text-cream/30 transition-colors duration-150 hover:text-cream/60"
								aria-label="Email"
							>
								<Mail size={14} />
							</a>
						</div>
					</div>
				</div>
			</footer>
			<CookieSettings open={cookieOpen} onClose={() => setCookieOpen(false)} />
		</>
	);
}
