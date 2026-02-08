import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/how-it-works")({
	component: HowItWorksPage,
	head: () =>
		seo({
			title: "How It Works — Wingmnn",
			description:
				"Connect your accounts, let Wingmnn learn your patterns, and watch it act on your behalf. 10 modules, one intelligence across every domain of your life.",
			path: "/how-it-works",
		}),
});

/* ─── data ─── */

const steps = [
	{
		num: "01",
		title: "Connect",
		body: "Link the accounts you want — email, calendar, bank, messaging, travel. Each connection takes under a minute. Wingmnn ingests up to 90 days of history and starts building your profile immediately.",
	},
	{
		num: "02",
		title: "Learn",
		body: "Within 48 hours, Wingmnn understands your patterns — when you respond to email, how you prioritize meetings, what spending looks normal. It builds a model of your preferences without you filling out a single form.",
	},
	{
		num: "03",
		title: "Act",
		body: "Drafts appear in your review queue. Conflicts get flagged. Anomalies surface before they become problems. You stay in control — approving, adjusting, or overriding — while the system handles the rest.",
	},
];

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		connects: "Gmail, Outlook, IMAP",
		does: "Priority triage, auto-drafted replies, follow-up tracking, newsletter filtering",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "CAL",
		name: "Schedule",
		connects: "Google Calendar, Outlook Calendar",
		does: "Conflict detection, meeting prep, smart rescheduling, time-block optimization",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "FIN",
		name: "Finances",
		connects: "Bank accounts via Plaid (read-only)",
		does: "Spending tracking, bill reminders, anomaly detection, subscription monitoring",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "PROJ",
		name: "Projects",
		connects: "Notion, Linear, Asana, Todoist",
		does: "Deadline tracking, workload analysis, status rollups, nudges when things slip",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "MSG",
		name: "Messages",
		connects: "iMessage, WhatsApp, Slack, Telegram",
		does: "Thread summaries, response drafting, priority flagging, conversation search",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "TRVL",
		name: "Travel",
		connects: "Email confirmations, airline APIs",
		does: "Itinerary assembly, price monitoring, boarding pass storage, timezone adjustment",
		status: "Live",
		statusColor: "bg-green-500 text-[#052e16]",
	},
	{
		id: "JRNL",
		name: "Journal",
		connects: "Built-in",
		does: "Evening prompts, reflection tracking, pattern analysis, searchable archive",
		status: "Ready",
		statusColor: "bg-[#e5e2dc] text-[#666]",
	},
	{
		id: "WELL",
		name: "Wellness",
		connects: "Apple Health, Fitbit, Oura",
		does: "Sleep tracking, activity nudges, pattern correlation, weekly health summaries",
		status: "Tracking",
		statusColor: "bg-yellow-400 text-[#422006]",
	},
	{
		id: "NOTE",
		name: "Notes",
		connects: "Built-in, voice memos",
		does: "Voice transcription, smart tagging, cross-reference with other modules, search",
		status: "Ready",
		statusColor: "bg-[#e5e2dc] text-[#666]",
	},
	{
		id: "FEED",
		name: "Feed",
		connects: "RSS, newsletters, saved links",
		does: "Noise filtering, topic clustering, daily digest, relevance scoring",
		status: "Ready",
		statusColor: "bg-[#e5e2dc] text-[#666]",
	},
];

const crossDomain = [
	{
		title: "Your calendar knows about your flights",
		body: "When a flight is booked, your calendar adjusts automatically — travel time blocked, meetings near departure flagged, timezone changes applied to the next day's schedule.",
	},
	{
		title: "Your inbox knows about your deadlines",
		body: "An email from a client gets higher priority when their project deadline is this week. Follow-up reminders accelerate as due dates approach. Context isn't siloed anymore.",
	},
	{
		title: "Your finances know about your subscriptions",
		body: "Recurring charges are tracked and correlated with actual usage. If you haven't opened an app in 60 days but you're still paying for it, Wingmnn flags it.",
	},
	{
		title: "Your wellness knows about your schedule",
		body: "Back-to-back meetings for three days? Sleep trending down? Wingmnn connects the dots and suggests lighter scheduling — or at minimum, makes you aware of the pattern.",
	},
];

/* ─── component ─── */

function HowItWorksPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						How it works
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						One intelligence.
						<br />
						Every domain.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Wingmnn connects the tools you already use into a single system that
						learns your patterns and acts on your behalf. Here's how the pieces
						fit together.
					</p>
				</div>
			</section>

			{/* ── 3-step flow ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						The onboarding arc
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Three steps to a system
						<br />
						that runs itself.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{steps.map((s) => (
							<div key={s.num} className="bg-cream p-8">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] block mb-4">
									{s.num}
								</span>
								<h3 className="font-serif font-bold text-[1.3rem] text-ink mb-3">
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

			{/* ── 10 modules deep-dive ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						10 modules, one brain
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Everything it keeps track of.
					</h2>
					<div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] max-[400px]:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{modules.map((m) => (
							<div key={m.id} className="bg-cream p-6">
								<div className="flex items-center justify-between mb-3">
									<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em]">
										{m.id}
									</span>
									<span
										className={`font-mono text-[9px] font-semibold py-0.5 px-2 tracking-[0.04em] uppercase ${m.statusColor}`}
									>
										{m.status}
									</span>
								</div>
								<h3 className="font-serif font-semibold text-[1.15rem] text-ink mb-2">
									{m.name}
								</h3>
								<div className="mb-3">
									<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase block mb-1">
										Connects to
									</span>
									<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2">
										{m.connects}
									</p>
								</div>
								<div>
									<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase block mb-1">
										What it does
									</span>
									<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2">
										{m.does}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── Cross-domain intelligence ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						The differentiator
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-4">
						Cross-domain intelligence.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mb-12">
						Most tools solve one domain. The value of Wingmnn is what happens
						when modules talk to each other — connections no single app can
						make.
					</p>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-6">
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
						See it in action.
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
