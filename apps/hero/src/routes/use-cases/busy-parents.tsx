import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/use-cases/busy-parents")({
	component: BusyParentsPage,
	head: () => ({
		meta: [
			{ title: "Wingmnn for Busy Parents — Keep the Plates Spinning" },
			{
				name: "description",
				content:
					"Wingmnn coordinates schedules, messages, travel, and wellness for parents juggling work and family — so nothing falls through the cracks.",
			},
		],
	}),
});

/* ─── data ─── */

const modules = [
	{
		id: "CAL",
		name: "Schedule",
		desc: "Family calendars merged with work calendars. School events, doctor appointments, and soccer practice — all visible, all conflict-checked, all accounted for.",
	},
	{
		id: "MSG",
		name: "Messages",
		desc: "Parent group chats summarized. School notifications prioritized. The important stuff surfaces — the noise doesn't.",
	},
	{
		id: "TRVL",
		name: "Travel",
		desc: "Family trip logistics assembled automatically. Flight options compared, hotel confirmations stored, timezone adjustments applied to the whole family's schedule.",
	},
	{
		id: "WELL",
		name: "Wellness",
		desc: "Sleep tracking, activity nudges, and pattern awareness. When you're running on empty, Wingmnn notices — and suggests a lighter day.",
	},
];

const crossDomain = [
	{
		title: "Your schedule knows about your messages",
		body: "When the school group chat announces a schedule change, your calendar updates automatically. No more discovering conflicts at the last minute.",
	},
	{
		title: "Your wellness knows about your schedule",
		body: "Back-to-back days of work plus activities? Sleep trending down? Wingmnn connects the dots and suggests where to create margin.",
	},
	{
		title: "Your travel knows about your calendar",
		body: "Planning a family trip? Wingmnn checks school schedules, work deadlines, and appointment conflicts before you book anything.",
	},
];

/* ─── component ─── */

function BusyParentsPage() {
	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						For busy parents
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Keep the plates spinning.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Work deadlines. School pickups. Meal planning. Family logistics.
						You're coordinating more than most project managers — without the
						team. Wingmnn becomes the system that holds it all together.
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
							Being a working parent means running two full-time operations
							simultaneously. Your work calendar competes with your family
							calendar. School group chats bury the important updates. Travel
							planning becomes a logistics puzzle across multiple schedules.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							The mental load of keeping track of everything is exhausting —
							and invisible.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold">
							You need a system that remembers everything so you don't have
							to.
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
						When everything is connected,
						<br />
						nothing falls through.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mb-12">
						The magic isn't in any single module — it's in what happens when
						they talk to each other.
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
						Be present, not panicked.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. Drop your email and we'll let you
						know when it's your turn.
					</p>
					<a
						href="/#join"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Get early access <ArrowRight size={16} />
					</a>
				</div>
			</section>
		</main>
	);
}
