import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/messages")({
	component: MessagesPage,
	head: () =>
		seo({
			title: "Messages Module — Wingmnn",
			description:
				"Wingmnn Messages unifies threads across platforms, sorts by priority, drafts smart replies, and cuts through the noise.",
			path: "/modules/messages",
		}),
});

/* ─── data ─── */

const capabilities = [
	{
		title: "Cross-platform threads",
		body: "Slack, iMessage, WhatsApp, Teams — all in one priority view. No more checking five apps to see if someone needs you.",
	},
	{
		title: "Priority sorting",
		body: "Messages from key people and about active projects surface first. Group chats and low-signal threads are tucked away until you want them.",
	},
	{
		title: "Smart replies",
		body: "Quick responses drafted in your voice. Acknowledge, confirm, or defer — one tap. Save your typing for conversations that matter.",
	},
	{
		title: "Noise reduction",
		body: "Memes, reactions, and low-value notifications are filtered. You see the conversations, not the clutter.",
	},
];

const steps = [
	{
		num: "01",
		title: "Connect your platforms",
		body: "Link Slack, Teams, or messaging accounts. Wingmnn unifies everything into a single priority feed without replacing your apps.",
	},
	{
		num: "02",
		title: "It learns what matters",
		body: "Who you respond to quickly, which groups you care about, what threads you ignore. Your priority model builds itself from your behavior.",
	},
	{
		num: "03",
		title: "Signal rises, noise falls",
		body: "Important threads surface. Quick replies are drafted. Low-value notifications disappear. You stay connected without being overwhelmed.",
	},
];

const crossDomain = [
	{
		title: "Your messages know about your projects",
		body: "Team conversations about active work are prioritized. Decisions made in chat are captured and linked to the relevant project context.",
	},
	{
		title: "Your messages know about your calendar",
		body: "Messages about upcoming meetings surface before the meeting. Post-meeting follow-ups are tracked and drafted.",
	},
	{
		title: "Your messages know about your inbox",
		body: "When someone emails and messages you about the same thing, Wingmnn connects the dots. No duplicate responses, no missed context.",
	},
];

const related = [
	{ id: "MAIL", name: "Inbox", slug: "inbox" },
	{ id: "PROJ", name: "Projects", slug: "projects" },
	{ id: "CAL", name: "Schedule", slug: "schedule" },
];

/* ─── component ─── */

function MessagesPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
						MSG
					</span>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Messages
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Cross-platform threads, priority sorting, smart replies, and noise
						reduction — stay connected without being overwhelmed.
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
						Every conversation, one priority view.
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
						From five apps to one view.
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
