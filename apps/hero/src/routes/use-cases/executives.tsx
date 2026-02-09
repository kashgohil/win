import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/use-cases/executives")({
	component: ExecutivesPage,
	head: () =>
		seo({
			title: "Wingmnn for Executives — Your Chief of Staff at Scale",
			description:
				"Wingmnn manages your inbox, schedule, travel, and information flow — so you can focus on the decisions that actually matter.",
			path: "/use-cases/executives",
		}),
});

/* ─── data ─── */

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		desc: "Hundreds of emails distilled to the dozen that need you. Priority triage based on sender importance, deadline proximity, and organizational context.",
	},
	{
		id: "CAL",
		name: "Schedule",
		desc: "Meeting prep with context from every module. Conflict resolution across time zones. Travel time blocked. Strategic time protected.",
	},
	{
		id: "TRVL",
		name: "Travel",
		desc: "Multi-city itineraries assembled from email confirmations. Boarding passes stored. Timezone adjustments applied to your schedule automatically.",
	},
	{
		id: "FEED",
		name: "Feed",
		desc: "Industry news filtered by relevance. Competitive moves surfaced. Board-ready summaries from the noise of newsletters and alerts.",
	},
];

const crossDomain = [
	{
		title: "Your inbox knows about your schedule",
		body: "An email from a board member gets flagged urgent when the board meeting is this week. Prep materials are auto-surfaced alongside the calendar event.",
	},
	{
		title: "Your travel knows about your meetings",
		body: "When flights change, your meeting schedule adjusts. Travel time buffers are recalculated. Your EA gets notified — or Wingmnn handles it directly.",
	},
	{
		title: "Your feed knows about your strategy",
		body: "Competitive intelligence is filtered through the lens of your current priorities. Only signal, never noise. Ready for the decisions only you can make.",
	},
];

/* ─── component ─── */

function ExecutivesPage() {
	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						For executives
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Your chief of staff at scale.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						At the executive level, every minute has a cost. Wingmnn filters
						the noise, preps your context, manages your logistics, and ensures
						you spend your time on the decisions that move the organization —
						not the overhead that slows it down.
					</p>
				</div>
			</section>

			{/* ── The challenge ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] sticky top-[120px] max-md:static">
							The challenge
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							Executives operate at the intersection of strategy and
							logistics. Your inbox gets 200+ emails a day. Your calendar is
							managed by multiple people. Your travel schedule spans time zones
							and continents. Your information diet determines the quality of
							your decisions.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							Even with an EA, the cognitive overhead of context-switching
							between domains drains the mental energy you need for the work
							that matters.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold">
							You need a system that manages the machine — so you can lead the
							organization.
						</p>
					</div>
				</div>
			</section>

			{/* ── Relevant modules ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						How Wingmnn helps
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						The modules that matter most.
					</h2>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{modules.map((m) => (
							<div key={m.id} className="bg-cream p-8">
								<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
									{m.id}
								</span>
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{m.name}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{m.desc}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Cross-domain value ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Cross-domain intelligence
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-4">
						Intelligence that compounds
						<br />
						across every domain.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mb-12">
						The value multiplies when your modules work together — creating
						context that no standalone tool can provide.
					</p>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-6">
						{crossDomain.map((c) => (
							<div
								key={c.title}
								className="p-7 border border-white/8 rounded-lg bg-white/3"
							>
								<h3 className="font-serif font-semibold text-[1.05rem] text-cream mb-2">
									{c.title}
								</h3>
								<p className="font-serif text-[0.9rem] leading-[1.75] text-cream/50">
									{c.body}
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
						Lead the organization.
						<br />
						Let Wingmnn manage the machine.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. Drop your email and we'll let you
						know when it's your turn.
					</p>
					<Link
						to="/early-access"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Get early access <ArrowRight size={16} />
					</Link>
				</div>
			</section>
		</main>
	);
}
