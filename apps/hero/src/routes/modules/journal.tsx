import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/journal")({
	component: JournalPage,
	head: () =>
		seo({
			title: "Journal Module — Wingmnn",
			description:
				"Wingmnn Journal offers daily prompts, mood tracking, pattern recognition, and total privacy — reflection that adapts to your life.",
			path: "/modules/journal",
		}),
});

/* ─── data ─── */

const capabilities = [
	{
		title: "Daily prompts",
		body: "Personalized questions based on what happened in your day — meetings attended, goals hit, challenges faced. Not generic prompts. Yours.",
	},
	{
		title: "Mood tracking",
		body: "Quick check-ins that build a picture over time. See how your mood correlates with sleep, workload, exercise, and social patterns.",
	},
	{
		title: "Pattern recognition",
		body: "Weekly and monthly insights surface what affects your wellbeing. Wingmnn spots trends you wouldn't notice yourself — and never judges.",
	},
	{
		title: "Private by default",
		body: "Journal entries are encrypted end-to-end. They don't inform other modules unless you explicitly allow it. This space is yours alone.",
	},
];

const steps = [
	{
		num: "01",
		title: "Start with a prompt",
		body: "Each evening, a prompt appears based on your day. Answer in a sentence or a paragraph — voice or text. There's no wrong length.",
	},
	{
		num: "02",
		title: "It finds patterns",
		body: "Over weeks, Wingmnn identifies what correlates with your best days and your worst. Insights surface gently, without prescribing solutions.",
	},
	{
		num: "03",
		title: "Reflection becomes routine",
		body: "The prompts get better. The insights get sharper. You build a record of your life that's searchable, private, and genuinely useful.",
	},
];

const crossDomain = [
	{
		title: "Your journal knows about your day",
		body: "Prompts reference actual events — the meeting that ran long, the flight you caught, the deadline you hit. Context makes reflection meaningful.",
	},
	{
		title: "Your journal knows about your wellness",
		body: "Sleep, activity, and mood data create a holistic picture. See how your physical state influences your mental state over time.",
	},
	{
		title: "Your journal knows about your patterns",
		body: "High-stress weeks, creative bursts, low-energy phases — your journal captures the rhythm of your life and helps you understand it.",
	},
];

const related = [
	{ id: "WELL", name: "Wellness", slug: "wellness" },
	{ id: "NOTE", name: "Notes", slug: "notes" },
	{ id: "CAL", name: "Schedule", slug: "schedule" },
];

/* ─── component ─── */

function JournalPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
						JRNL
					</span>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Journal
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Daily prompts, mood tracking, pattern recognition, and total privacy
						— reflection that adapts to your life.
					</p>
				</div>
			</section>

			{/* ── What it does ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						What it does
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Your inner world, organized.
					</h2>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{capabilities.map((c) => (
							<div key={c.title} className="bg-cream p-8">
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{c.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{c.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── How it works ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						How it works
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						From blank page to insight.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{steps.map((s) => (
							<div key={s.num} className="bg-cream p-8">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] block mb-4">
									{s.num}
								</span>
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{s.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{s.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Cross-domain ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Cross-domain intelligence
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-12">
						Connected to everything else.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-white/6 border border-white/6">
						{crossDomain.map((c) => (
							<div key={c.title} className="bg-ink p-8">
								<h3 className="font-serif font-semibold text-[1.1rem] text-cream mb-2">
									{c.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-cream/50">
									{c.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Related modules ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Related modules
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Works best with.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{related.map((r) => (
						<Link
							key={r.id}
							to={`/modules/${r.slug}` as string}
							className="bg-cream p-8 no-underline transition-colors duration-200 hover:bg-[#eeebe4]"
						>
							<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-2">
								{r.id}
							</span>
							<h3 className="font-serif font-semibold text-[1.1rem] text-ink">
								{r.name}
							</h3>
						</Link>
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
