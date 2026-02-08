import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/use-cases/founders")({
	component: FoundersPage,
	head: () =>
		seo({
			title: "Wingmnn for Founders — Your AI Chief of Staff",
			description:
				"Wingmnn connects your inbox, schedule, projects, and finances into one intelligence — so you can focus on building, not administrating.",
			path: "/use-cases/founders",
		}),
});

/* ─── data ─── */

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		desc: "Priority triage across investor updates, customer emails, and team threads. Auto-drafted replies for the routine stuff so you focus on what moves the needle.",
	},
	{
		id: "CAL",
		name: "Schedule",
		desc: "Conflict resolution across time zones. Meeting prep with context from your inbox and projects. Protects deep-work blocks automatically.",
	},
	{
		id: "PROJ",
		name: "Projects",
		desc: "Deadline tracking across every workstream. Status rollups without asking your team. Nudges when things slip before they become problems.",
	},
	{
		id: "FIN",
		name: "Finances",
		desc: "Burn rate visibility, subscription monitoring, and anomaly detection. Know your runway without opening a spreadsheet.",
	},
];

const crossDomain = [
	{
		title: "Your inbox knows about your deadlines",
		body: "An email from your lead investor gets higher priority when board prep is this week. Fundraising threads surface automatically during active rounds.",
	},
	{
		title: "Your calendar protects your build time",
		body: "When project deadlines are tight, Wingmnn blocks focus time and pushes non-critical meetings. Your schedule adapts to what actually matters.",
	},
	{
		title: "Your finances know about your contracts",
		body: "New revenue from a signed deal updates your runway projections. Subscription costs are cross-referenced with actual team usage.",
	},
];

/* ─── component ─── */

function FoundersPage() {
	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						For founders
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Your AI chief of staff.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						You're building a company and running your life at the same time.
						Wingmnn handles the operational overhead — triaging your inbox,
						protecting your calendar, tracking your burn rate — so you can focus
						on the work that only you can do.
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
							Founders context-switch between fundraising, product, hiring,
							ops, and personal life — all day, every day. Your inbox is a
							warzone. Your calendar is a negotiation. Your finances live in
							three different dashboards.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							The cognitive overhead of managing all of it is a tax on the
							creative work that actually builds your company.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold">
							You need a system that handles the noise so you can focus on the
							signal.
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
						Connections only a unified
						<br />
						system can make.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mb-12">
						When your modules talk to each other, your operations become
						smarter without you doing anything extra.
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
						Build the company.
						<br />
						Let Wingmnn run the rest.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. Drop your email and we'll let you
						know when it's your turn.
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
