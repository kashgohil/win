import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/terms")({
	component: TermsPage,
	head: () =>
		seo({
			title: "Terms of Service — Wingmnn",
			description:
				"Terms of Service for Wingmnn. Read about our policies on data usage, account management, and user responsibilities.",
			path: "/terms",
		}),
});

/* ─── component ─── */

function TermsPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[80px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] sticky top-[120px] max-md:static">
							Terms of Service
						</p>
					</div>
					<div>
						<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-4">
							Terms of Service
						</h1>
						<p className="font-mono text-[11px] text-grey-3 tracking-[0.04em] mb-6">
							Effective February 2025
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px]">
							Plain-language terms for using Wingmnn. No legalese traps, no
							buried clauses. If something here surprises you, we've failed.
						</p>
					</div>
				</div>
			</section>

			{/* ── Agreement ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							The agreement
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-5">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							By creating an account or using Wingmnn, you agree to these terms.
							If you don't agree, don't use the service — no hard feelings.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							Wingmnn is provided by Wingmnn Systems Inc., a company registered
							in Delaware and based in Brooklyn, NY. When we say "we," "us," or
							"Wingmnn," we mean the company and the service.
						</p>
					</div>
				</div>
			</section>

			{/* ── What you get ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							What you get
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-5">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							A personal account with access to the Wingmnn platform — web,
							mobile, and API (when available). You can connect external
							services, configure modules, and interact with the system through
							text or voice.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							We're actively building. Features may change, be added, or be
							removed as the product evolves. We'll notify you of material
							changes with reasonable notice.
						</p>
					</div>
				</div>
			</section>

			{/* ── Your account ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Your account
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-8">
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								One person, one account
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Wingmnn accounts are personal. You're responsible for keeping
								your credentials secure. Don't share your account or let others
								access your connected services through it.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Accurate information
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Provide accurate information when you sign up. If something
								changes, update it. We may need to verify your identity for
								security purposes.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Age requirement
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								You must be at least 18 years old to use Wingmnn. By creating
								an account, you confirm that you meet this requirement.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Your data ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Your data
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-5">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							You own your data. We don't claim any rights to the content you
							create, the information you connect, or the preferences you set.
							Our{" "}
							<Link
								to="/privacy"
								className="text-accent-red no-underline hover:underline"
							>
								Privacy Policy
							</Link>{" "}
							explains exactly what we collect and why.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							You grant us a limited license to process your data solely to
							provide the service — triage your inbox, track your spending,
							manage your calendar, and so on. This license ends when you delete
							your account.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							We never use your data to train models, sell to third parties, or
							build profiles for advertising. Full stop.
						</p>
					</div>
				</div>
			</section>

			{/* ── Acceptable use ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Acceptable use
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-5">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							Use Wingmnn for its intended purpose — managing your personal
							life. Don't use it to harm others, break laws, reverse-engineer
							the system, or overwhelm our infrastructure.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							We reserve the right to suspend accounts that violate these terms
							or put other users at risk. We'll tell you why and give you a
							chance to fix things before termination, except in cases of clear
							abuse.
						</p>
					</div>
				</div>
			</section>

			{/* ── Payment & cancellation ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Payment & cancellation
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-8">
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Pricing
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Pricing will be announced at launch. It will be a
								straightforward monthly subscription — no per-module fees, no
								usage caps, no surprise charges. Early access users may receive
								preferential pricing.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Cancellation
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Cancel anytime from your account settings. Your subscription
								runs until the end of the current billing period. After that,
								your data is exported and permanently deleted within 30 days.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Refunds
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								If you're unhappy within the first 30 days, we'll refund your
								payment in full. After that, no partial refunds for unused time,
								but you can always cancel before the next cycle.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Liability & disclaimers ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Liability & disclaimers
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-5">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							Wingmnn is a productivity tool, not a financial advisor, medical
							professional, or legal counsel. Suggestions and automations are
							based on patterns — always use your own judgment for important
							decisions.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							We do our best to keep the service reliable, but we can't
							guarantee 100% uptime or error-free operation. The service is
							provided "as is." Our total liability is limited to the amount
							you've paid us in the past 12 months.
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							Financial data is read-only through Plaid. We cannot and will
							never initiate transactions, move money, or modify your accounts.
						</p>
					</div>
				</div>
			</section>

			{/* ── Changes to terms ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Changes to terms
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2">
							We may update these terms as the product evolves. For material
							changes, we'll email you at least 30 days in advance. Continued
							use after the notice period means you accept the updated terms. If
							you disagree, you can cancel and export your data before they take
							effect.
						</p>
					</div>
				</div>
			</section>

			{/* ── Contact ── */}
			<section className="py-[100px] px-(--page-px)">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Contact
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 mb-6">
							Questions about these terms? We're happy to clarify.
						</p>
						<a
							href="mailto:hello@wingmnn.com"
							className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-ink hover:bg-[#333] no-underline"
						>
							hello@wingmnn.com
							<ArrowRight size={16} />
						</a>
					</div>
				</div>
			</section>
		</main>
	);
}
