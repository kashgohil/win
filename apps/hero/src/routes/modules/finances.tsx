import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/finances")({
	component: FinancesPage,
	head: () =>
		seo({
			title: "Finances Module — Wingmnn",
			description:
				"Wingmnn Finances tracks spending, monitors subscriptions, detects anomalies, and reminds you about bills — all read-only, all encrypted.",
			path: "/modules/finances",
		}),
});

/* ─── data ─── */

const capabilities = [
	{
		title: "Spending tracking",
		body: "Every transaction categorized automatically. Daily and weekly summaries without opening a spreadsheet. Know where your money goes without thinking about it.",
	},
	{
		title: "Bill reminders",
		body: "Upcoming payments surfaced before they're due. No more late fees from forgetting. Auto-scheduled reminders based on your cash flow patterns.",
	},
	{
		title: "Anomaly detection",
		body: "Unusual charges flagged immediately. Duplicate subscriptions caught. Price increases on recurring services surfaced before the next billing cycle.",
	},
	{
		title: "Subscription monitoring",
		body: "Every recurring charge tracked in one place. Free trials flagged before they convert. Annual renewals surfaced a week in advance.",
	},
];

const steps = [
	{
		num: "01",
		title: "Connect via Plaid",
		body: "Link your bank accounts through Plaid — read-only, always. Wingmnn can see transactions but can never move money.",
	},
	{
		num: "02",
		title: "It learns your patterns",
		body: "Regular bills, typical spending, subscription cadences. Within a week, Wingmnn knows what's normal for you and what's not.",
	},
	{
		num: "03",
		title: "Anomalies surface automatically",
		body: "Unusual charges get flagged. Bills get reminders. Subscriptions get tracked. You stay informed without watching every transaction.",
	},
];

const crossDomain = [
	{
		title: "Your finances know about your travel",
		body: "Foreign transactions during a trip are expected, not flagged. Travel expenses are grouped and summarized automatically when you return.",
	},
	{
		title: "Your finances know about your inbox",
		body: "Invoice emails are matched to actual charges. Subscription confirmation emails update your recurring payment tracking instantly.",
	},
	{
		title: "Your finances know about your calendar",
		body: "Upcoming events with costs — dinners, conferences, flights — are factored into your weekly spending forecast automatically.",
	},
];

const related = [
	{ id: "TRVL", name: "Travel", slug: "travel" },
	{ id: "MAIL", name: "Inbox", slug: "inbox" },
	{ id: "PROJ", name: "Projects", slug: "projects" },
];

/* ─── component ─── */

function FinancesPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
						FIN
					</span>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Finances
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Spending tracking, bill reminders, anomaly detection, and
						subscription monitoring — all read-only, all encrypted.
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
						Your money, always visible.
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
						Read-only. Always encrypted.
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
