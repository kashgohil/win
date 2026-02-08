import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BookOpen,
	Code,
	CreditCard,
	Layers,
	Plug,
	Plus,
	Shield,
} from "lucide-react";
import { useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/help")({
	component: HelpPage,
	head: () =>
		seo({
			title: "Help Center — Wingmnn",
			description:
				"Find answers, learn the basics, and get support for Wingmnn. Browse knowledge base articles and frequently asked questions.",
			path: "/help",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: faqSections.flatMap((section) =>
						section.items.map((item) => ({
							"@type": "Question",
							name: item.q,
							acceptedAnswer: {
								"@type": "Answer",
								text: item.a,
							},
						})),
					),
				},
			],
		}),
});

/* ─── data ─── */

const categories = [
	{
		icon: BookOpen,
		title: "Getting Started",
		desc: "Connect your accounts, configure modules, and get your first briefing in minutes.",
		articles: 8,
	},
	{
		icon: Layers,
		title: "Modules",
		desc: "Deep dives into each of the 10 modules — what they do, how to configure them, and tips for power users.",
		articles: 12,
	},
	{
		icon: Plug,
		title: "Integrations",
		desc: "Supported services, connection troubleshooting, and how to manage third-party access.",
		articles: 6,
	},
	{
		icon: CreditCard,
		title: "Account & Billing",
		desc: "Manage your subscription, update payment methods, and understand your invoice.",
		articles: 5,
	},
	{
		icon: Shield,
		title: "Privacy & Security",
		desc: "How your data is stored, encrypted, and protected. Permissions, exports, and deletion.",
		articles: 7,
	},
	{
		icon: Code,
		title: "API",
		desc: "REST endpoints, authentication, rate limits, and examples for building on your digital twin.",
		articles: 4,
	},
];

const faqSections = [
	{
		label: "Getting Started",
		items: [
			{
				q: "How do I connect my first account?",
				a: "Head to Settings > Connections and choose the service you want to link. Most integrations use OAuth, so you'll authorize access in a few clicks. Wingmnn ingests up to 90 days of history and builds your first status report within hours.",
			},
			{
				q: "How long does it take to set up?",
				a: "Most people are fully connected in under 10 minutes. The system starts learning immediately, and you'll receive your first briefing within 24 hours. By day three, it's already anticipating your patterns.",
			},
			{
				q: "Can I use Wingmnn on my phone?",
				a: "Yes. Wingmnn is available on iOS and Android with full feature parity. The mobile experience is voice-first — you can talk to it like you'd talk to a person sitting next to you.",
			},
		],
	},
	{
		label: "Modules & Features",
		items: [
			{
				q: "Can I use only some modules?",
				a: "Absolutely. Every module is independent — connect only what you want. More connections mean better cross-domain intelligence, but none are required. You can enable or disable modules at any time.",
			},
			{
				q: "How does cross-domain intelligence work?",
				a: "When modules are connected, they share context. Your calendar knows about your flights, your inbox knows about your deadlines, and your finances know about your subscriptions. This cross-referencing is what makes Wingmnn different from single-purpose tools.",
			},
			{
				q: "What happens when modules conflict?",
				a: "Wingmnn surfaces conflicts for your review rather than making assumptions. For example, if a meeting overlaps with a flight, it flags both and suggests a resolution. You always have the final say.",
			},
		],
	},
	{
		label: "Privacy & Security",
		items: [
			{
				q: "Who can see my data?",
				a: "Only you. Wingmnn employees cannot access your personal data. Everything is encrypted at rest and in transit. We don't train on your data, sell it, or share it with third parties.",
			},
			{
				q: "Is my financial data safe?",
				a: "Financial connections are read-only through Plaid. We can never move money or initiate transactions. All financial data is encrypted with AES-256 and we're SOC 2 Type II compliant.",
			},
			{
				q: "Can I export or delete my data?",
				a: "Yes to both. You can export everything in standard formats at any time. Account deletion is one click — all data is permanently purged within 30 days. No hidden archives, no backups we conveniently forget about.",
			},
		],
	},
	{
		label: "Account & Billing",
		items: [
			{
				q: "How much does Wingmnn cost?",
				a: "Pricing will be announced at launch. It's a straightforward monthly subscription with no per-module fees and no usage caps. Our business model is your subscription, not your data.",
			},
			{
				q: "Can I cancel anytime?",
				a: "Yes. No contracts, no cancellation fees, no hoops to jump through. Cancel from your account settings and your subscription ends at the next billing cycle. Your data is exported and then deleted.",
			},
			{
				q: "Is there a free trial?",
				a: "We're planning a generous trial period so you can experience the full system before committing. Details will be shared with early access members before launch.",
			},
		],
	},
];

/* ─── component ─── */

function HelpPage() {
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Support
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Help Center
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Find answers, learn the basics, and get support.
					</p>
				</div>
			</section>

			{/* ── Knowledge base categories ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Knowledge base
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Browse by topic.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{categories.map((cat) => {
							const Icon = cat.icon;
							return (
								<div key={cat.title} className="bg-cream p-8">
									<Icon
										size={24}
										strokeWidth={1.5}
										className="text-accent-red mb-4"
									/>
									<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
										{cat.title}
									</h3>
									<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 mb-4">
										{cat.desc}
									</p>
									<span className="font-mono text-[11px] text-grey-3 tracking-[0.04em]">
										{cat.articles} articles
									</span>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ── FAQ ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto mb-10">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						FAQ
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink">
						Frequently asked questions.
					</h2>
				</div>
				<div className="max-w-[720px] mx-auto">
					{faqSections.map((section) => (
						<div key={section.label} className="mb-10 last:mb-0">
							<h3 className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] uppercase mb-4">
								{section.label}
							</h3>
							{section.items.map((item) => {
								const globalIndex = faqSections
									.flatMap((s) => s.items)
									.indexOf(item);
								const open = openFaq === globalIndex;
								return (
									<div
										key={item.q}
										className="border-b border-grey-4 last:border-b-0"
									>
										<button
											type="button"
											className="w-full flex items-center justify-between gap-4 py-5 bg-transparent border-none cursor-pointer text-left font-inherit group"
											onClick={() =>
												setOpenFaq(open ? null : globalIndex)
											}
											aria-expanded={open}
										>
											<span className="font-serif text-[1.05rem] font-semibold text-grey-1 transition-colors duration-150 group-hover:text-ink">
												{item.q}
											</span>
											<Plus
												size={18}
												className={`shrink-0 text-grey-3 transition-[transform,color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "rotate-45 text-accent-red" : ""}`}
											/>
										</button>
										<div
											className={`overflow-hidden transition-[max-height] duration-400 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "max-h-[300px]" : "max-h-0"}`}
										>
											<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 pb-5">
												{item.a}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					))}
				</div>
			</section>

			{/* ── Still need help? CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Still need help?
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Can't find what you're looking for? Reach out directly and
						we'll get back to you within 24 hours.
					</p>
					<Link
						to="/contact"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Contact support <ArrowRight size={16} />
					</Link>
				</div>
			</section>
		</main>
	);
}
