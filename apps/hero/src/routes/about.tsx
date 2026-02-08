import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/about")({
	component: AboutPage,
	head: () =>
		seo({
			title: "About — Wingmnn",
			description:
				"Wingmnn is a single intelligence that connects your email, calendar, finances, travel, projects, and wellness. Built in Brooklyn by a small, focused team.",
			path: "/about",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "AboutPage",
					name: "About Wingmnn",
					url: "https://wingmnn.com/about",
					description:
						"Wingmnn is a single intelligence that connects your email, calendar, finances, travel, projects, and wellness. Built in Brooklyn by a small, focused team.",
				},
			],
		}),
});

/* ─── data ─── */

const approach = [
	{
		num: "01",
		title: "Cross-domain intelligence",
		body: "Most tools solve one domain. Wingmnn connects all of them — so your calendar knows about your flights, your inbox knows about your deadlines, and your finances know about your subscriptions.",
	},
	{
		num: "02",
		title: "Learns from patterns",
		body: "It watches how you work, what you prioritize, and how you make decisions. Over time, it anticipates what you need before you ask. Not a chatbot you re-explain things to — a system that remembers.",
	},
	{
		num: "03",
		title: "Acts on your behalf",
		body: "Drafts replies. Reschedules conflicts. Flags anomalies. Surfaces what matters. Wingmnn doesn't just organize information — it takes action within the boundaries you set.",
	},
];

const values = [
	{
		title: "Privacy by default",
		body: "Your data is encrypted, never sold, never used for training. We built the architecture around the assumption that your information is none of our business.",
	},
	{
		title: "Opinionated simplicity",
		body: "Fewer settings, not more. We make strong defaults so you don't have to configure everything. When something works well, it should just work.",
	},
	{
		title: "Your data is yours",
		body: "Export everything. Delete everything. No lock-in, no proprietary formats, no retention after you leave. The relationship is simple: you pay us, we work for you.",
	},
	{
		title: "Built to disappear",
		body: "The best tool is one you forget is running. Wingmnn works in the background — surfacing only what needs your attention, handling everything else on its own.",
	},
];

/* ─── component ─── */

function AboutPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						About Wingmnn
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Built for people who
						<br />
						run on systems.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Wingmnn is a single intelligence that connects the tools you already
						use — email, calendar, finances, travel, projects, wellness — and
						turns fragmented information into coordinated action. It learns how
						you operate, then operates for you.
					</p>
				</div>
			</section>

			{/* ── The problem ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] sticky top-[120px] max-md:static">
							The problem
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							Your life runs across ten different apps that don't talk to each
							other. Your mail doesn't know about your calendar. Your calendar
							doesn't know about your flights. Your finances live in a
							spreadsheet you last opened in March.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							Every morning, you're the one stitching it all together — copying
							information between tools, mentally tracking what's urgent,
							context-switching between domains until the cognitive overhead
							becomes the job itself.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold">
							You are the integration layer for your own life. We think that's a
							solvable problem.
						</p>
					</div>
				</div>
			</section>

			{/* ── Our approach ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Our approach
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						One brain, not ten apps.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{approach.map((a) => (
							<div key={a.num} className="bg-cream p-8">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] block mb-4">
									{a.num}
								</span>
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{a.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{a.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Brooklyn ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Brooklyn, NY
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-6">
						Small team. Operator-backed.
						<br />
						Built with care.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[560px] mx-auto">
						We're a small, focused team based in Brooklyn building Wingmnn
						because we needed it ourselves. Backed by operators who've built and
						run real businesses — not observers writing trend reports. No hype
						cycles, no growth-at-all-costs. Just a product that works for people
						who take their time seriously.
					</p>
				</div>
			</section>

			{/* ── Values ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						What we believe
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Values that shape the product.
					</h2>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{values.map((v) => (
							<div key={v.title} className="bg-cream p-8">
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{v.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{v.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Join the waitlist.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. We'll let you know when it's your
						turn.
					</p>
					<Link
						to="/"
						hash="join"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Get early access <ArrowRight size={16} />
					</Link>
				</div>
			</section>
		</main>
	);
}
