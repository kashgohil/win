import { env } from "@/env";
import { Linkedin, Mail, Twitter } from "lucide-react";
import { useState } from "react";
import CookieSettings from "./CookieSettings";
import Logo from "./Logo";

const linkCls =
	"block font-serif text-[0.92rem] text-background/55 no-underline leading-8 cursor-pointer transition-colors duration-150 hover:text-background whitespace-nowrap";
const placeholderCls =
	"block font-serif text-[0.92rem] text-background/55 leading-8 cursor-default whitespace-nowrap";

export default function Footer() {
	const [cookieOpen, setCookieOpen] = useState(false);

	return (
		<>
			<footer className="pt-[72px] px-(--page-px) pb-10 bg-foreground text-background">
				<div className="max-w-[1200px] mx-auto mb-12 grid grid-cols-[1.4fr_1fr] max-md:grid-cols-1 gap-20 max-md:gap-12 items-start">
					<div className="max-w-[380px]">
						<div className="flex items-center gap-2.5 font-display text-[1.8rem] text-background tracking-[0.03em] lowercase mb-4">
							<Logo className="size-5 shrink-0" />
							wingmnn
						</div>
						<p className="font-serif text-base leading-[1.7] text-background/45">
							A single intelligence that learns how you operate - then operates
							for you. Built with care.
						</p>
					</div>
					<div className="grid grid-cols-3 max-[500px]:grid-cols-2 gap-x-10 gap-y-8">
						{/* Product */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-background/30 tracking-[0.06em] uppercase mb-4">
								Product
							</h4>
							<a href={`${env.VITE_HERO_URL}/how-it-works`} className={linkCls}>
								How it works
							</a>
							<a href={`${env.VITE_HERO_URL}/modules`} className={linkCls}>
								Modules
							</a>
							<span className={placeholderCls}>Pricing</span>
							<a href={`${env.VITE_HERO_URL}/integrations`} className={linkCls}>
								Integrations
							</a>
						</div>

						{/* Use Cases */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-background/30 tracking-[0.06em] uppercase mb-4">
								Use Cases
							</h4>
							<a
								href={`${env.VITE_HERO_URL}/use-cases/founders`}
								className={linkCls}
							>
								For Founders
							</a>
							<a
								href={`${env.VITE_HERO_URL}/use-cases/freelancers`}
								className={linkCls}
							>
								For Freelancers
							</a>
							<a
								href={`${env.VITE_HERO_URL}/use-cases/busy-parents`}
								className={linkCls}
							>
								For Busy Parents
							</a>
							<a
								href={`${env.VITE_HERO_URL}/use-cases/executives`}
								className={linkCls}
							>
								For Executives
							</a>
						</div>

						{/* Resources */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-background/30 tracking-[0.06em] uppercase mb-4">
								Resources
							</h4>
							<a href={`${env.VITE_HERO_URL}/blog`} className={linkCls}>
								Blog
							</a>
							<a href={`${env.VITE_HERO_URL}/help`} className={linkCls}>
								Help Center
							</a>
							<span className={placeholderCls}>Changelog</span>
							<a href={`${env.VITE_HERO_URL}/tools`} className={linkCls}>
								Free Tools
							</a>
						</div>

						{/* Company */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-background/30 tracking-[0.06em] uppercase mb-4">
								Company
							</h4>
							<a href={`${env.VITE_HERO_URL}/about`} className={linkCls}>
								About
							</a>
							<span className={placeholderCls}>Careers</span>
							<a href={`${env.VITE_HERO_URL}/contact`} className={linkCls}>
								Contact
							</a>
						</div>

						{/* Legal */}
						<div>
							<h4 className="font-mono text-[11px] font-semibold text-background/30 tracking-[0.06em] uppercase mb-4">
								Legal
							</h4>
							<a href={`${env.VITE_HERO_URL}/privacy`} className={linkCls}>
								Privacy
							</a>
							<a href={`${env.VITE_HERO_URL}/terms`} className={linkCls}>
								Terms
							</a>
							<button
								type="button"
								onClick={() => setCookieOpen(true)}
								className="block font-serif text-[0.92rem] text-background/55 leading-8 cursor-pointer transition-colors duration-150 hover:text-background bg-transparent border-none p-0 text-left whitespace-nowrap"
							>
								Cookie settings
							</button>
						</div>
					</div>
				</div>
				<div className="max-w-[1200px] mx-auto pt-6 border-t border-white/8 font-mono text-xs text-background/25 flex max-[500px]:flex-col justify-between max-[500px]:items-start items-center gap-3 max-[500px]:gap-3">
					<span>&copy; {new Date().getFullYear()} Wingmnn Systems Inc.</span>
					<div className="flex items-center gap-3.5">
						<a
							href="https://x.com/wingmnn"
							target="_blank"
							rel="noopener noreferrer"
							className="text-background/30 transition-colors duration-150 hover:text-background/60"
							aria-label="Twitter"
						>
							<Twitter size={14} />
						</a>
						<a
							href="https://linkedin.com/company/wingmnn"
							target="_blank"
							rel="noopener noreferrer"
							className="text-background/30 transition-colors duration-150 hover:text-background/60"
							aria-label="LinkedIn"
						>
							<Linkedin size={14} />
						</a>
						<a
							href="mailto:hello@wingmnn.com"
							className="text-background/30 transition-colors duration-150 hover:text-background/60"
							aria-label="Email"
						>
							<Mail size={14} />
						</a>
					</div>
				</div>
			</footer>
			<CookieSettings open={cookieOpen} onClose={() => setCookieOpen(false)} />
		</>
	);
}
