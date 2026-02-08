import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/travel")({
	component: TravelPage,
	head: () =>
		seo({
			title: "Travel Module — Wingmnn",
			description:
				"Wingmnn Travel tracks flights, watches prices, builds itineraries, and syncs everything to your calendar — so trips plan themselves.",
			path: "/modules/travel",
		}),
});

/* ─── data ─── */

const capabilities = [
	{
		title: "Flight tracking",
		body: "Gate changes, delays, cancellations — all surfaced before you check the airline app. Boarding passes stored. Alternative routes pre-calculated.",
	},
	{
		title: "Price alerts",
		body: "Watching flights you're interested in. When prices drop, you know immediately. Lock in deals without refreshing search engines.",
	},
	{
		title: "Itinerary building",
		body: "Flights, hotels, restaurants, and activities organized into a single timeline. Shared with travel companions automatically. Updated in real-time.",
	},
	{
		title: "Calendar sync",
		body: "Travel plans flow into your calendar with time zones adjusted. Buffer time added around flights. Meetings blocked during transit.",
	},
];

const steps = [
	{
		num: "01",
		title: "Forward a confirmation",
		body: "Send a booking email to Wingmnn or connect your travel accounts. Itineraries are built automatically from confirmation details.",
	},
	{
		num: "02",
		title: "It watches everything",
		body: "Price changes, schedule updates, weather alerts, visa requirements. Your trip is monitored continuously so you don't have to be.",
	},
	{
		num: "03",
		title: "Travel days run themselves",
		body: "Day-of briefings with everything you need. Gate info, check-in times, local currency notes. You just follow the plan.",
	},
];

const crossDomain = [
	{
		title: "Your travel knows about your calendar",
		body: "Meetings are blocked during transit. Time zone changes adjust your schedule. Jet lag recovery time is factored into your first day back.",
	},
	{
		title: "Your travel knows about your finances",
		body: "Trip budgets are tracked in real-time. Foreign transactions are expected, not flagged. Expense summaries are ready when you return.",
	},
	{
		title: "Your travel knows about your wellness",
		body: "Sleep schedule adjustments for time zone changes. Activity suggestions at your destination. Hydration reminders on long flights.",
	},
];

const related = [
	{ id: "CAL", name: "Schedule", slug: "schedule" },
	{ id: "FIN", name: "Finances", slug: "finances" },
	{ id: "WELL", name: "Wellness", slug: "wellness" },
];

/* ─── component ─── */

function TravelPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
						TRVL
					</span>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Travel
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Flight tracking, price alerts, itinerary building, and calendar sync
						— so your trips plan themselves.
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
						Travel that handles itself.
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
						From booking to boarding.
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
