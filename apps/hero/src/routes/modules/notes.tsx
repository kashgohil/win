import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/notes")({
	component: NotesPage,
	head: () =>
		seo({
			title: "Notes Module — Wingmnn",
			description:
				"Wingmnn Notes captures anything — text, voice, links — auto-organizes it, and makes everything searchable. Never lose a thought.",
			path: "/modules/notes",
		}),
});

/* ─── data ─── */

const capabilities = [
	{
		title: "Capture anything",
		body: "Text, voice memos, links, images. Drop it in from any device, any context. No formatting required. Wingmnn handles the organization.",
	},
	{
		title: "Auto-organize",
		body: "Notes are tagged, grouped, and linked automatically based on content and context. Related notes surface together without manual folder management.",
	},
	{
		title: "Full-text search",
		body: "Every note is instantly searchable — including transcribed voice memos. Find anything with a few words, even if you don't remember when you captured it.",
	},
	{
		title: "Voice transcription",
		body: "Speak your thoughts and they're transcribed, timestamped, and searchable. Capture ideas in the moment without stopping to type.",
	},
];

const steps = [
	{
		num: "01",
		title: "Capture a thought",
		body: "Type it, say it, or forward it. Notes can come from any input — a quick text, a voice memo, a forwarded email, a screenshot.",
	},
	{
		num: "02",
		title: "It organizes itself",
		body: "Tags, topics, and connections are applied automatically. Your notes form a knowledge graph that gets smarter as it grows.",
	},
	{
		num: "03",
		title: "Nothing gets lost",
		body: "Search finds everything. Related notes surface when relevant. Ideas you captured months ago reappear when the context is right.",
	},
];

const crossDomain = [
	{
		title: "Your notes know about your meetings",
		body: "Notes taken during a calendar event are automatically linked to that meeting. Pre-meeting context and post-meeting action items are connected.",
	},
	{
		title: "Your notes know about your projects",
		body: "Project-related thoughts are grouped with the right workstream. Ideas captured at random are matched to active projects when relevant.",
	},
	{
		title: "Your notes know about your journal",
		body: "Reflections and insights from your journal surface alongside related notes. Your thinking evolves across both spaces.",
	},
];

const related = [
	{ id: "JRNL", name: "Journal", slug: "journal" },
	{ id: "PROJ", name: "Projects", slug: "projects" },
	{ id: "FEED", name: "Feed", slug: "feed" },
];

/* ─── component ─── */

function NotesPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] block mb-3">
						NOTE
					</span>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Notes
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Capture anything, auto-organize everything, search it all. Never
						lose a thought again.
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
						Your second brain, always on.
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
						Capture, organize, find.
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
