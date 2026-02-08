import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/modules/")({
	component: ModulesPage,
	head: () =>
		seo({
			title: "Modules — Wingmnn",
			description:
				"10 modules, one intelligence. Each module handles a domain of your life — together they form a single system that understands context across everything.",
			path: "/modules",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "CollectionPage",
					name: "Wingmnn Modules",
					url: "https://wingmnn.com/modules",
					description:
						"10 modules, one intelligence. Each module handles a domain of your life — together they form a single system that understands context across everything.",
				},
			],
		}),
});

/* ─── data ─── */

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		slug: "inbox",
		desc: "Reads, triages, and drafts. Priority queue. Auto-replies. Follow-up tracking.",
	},
	{
		id: "CAL",
		name: "Schedule",
		slug: "schedule",
		desc: "Conflict resolution. Meeting prep. Time-block protection. Smart rescheduling.",
	},
	{
		id: "FIN",
		name: "Finances",
		slug: "finances",
		desc: "Spending tracking. Bill reminders. Anomaly detection. Subscription monitoring.",
	},
	{
		id: "PROJ",
		name: "Projects",
		slug: "projects",
		desc: "Deadline tracking. Status rollups. Dependency awareness. Nothing slips.",
	},
	{
		id: "MSG",
		name: "Messages",
		slug: "messages",
		desc: "Cross-platform threads. Priority sorting. Smart replies. Noise reduction.",
	},
	{
		id: "TRVL",
		name: "Travel",
		slug: "travel",
		desc: "Flight tracking. Price alerts. Itinerary building. Calendar sync.",
	},
	{
		id: "JRNL",
		name: "Journal",
		slug: "journal",
		desc: "Daily prompts. Mood tracking. Pattern recognition. Private by default.",
	},
	{
		id: "WELL",
		name: "Wellness",
		slug: "wellness",
		desc: "Sleep tracking. Activity monitoring. Gentle nudges. No guilt trips.",
	},
	{
		id: "NOTE",
		name: "Notes",
		slug: "notes",
		desc: "Capture anything. Auto-organize. Full-text search. Never lose a thought.",
	},
	{
		id: "FEED",
		name: "Feed",
		slug: "feed",
		desc: "Content curation. Noise filtering. Signal extraction. Stay informed, not overwhelmed.",
	},
];

/* ─── component ─── */

function ModulesPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						10 modules, one intelligence
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Modules
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Each module handles a domain of your life. Together, they form a
						single intelligence that understands context across everything.
					</p>
				</div>
			</section>

			{/* ── Modules grid ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-px bg-grey-4 border border-grey-4">
						{modules.map((m) => (
							<Link
								key={m.id}
								to={"/modules/" + m.slug}
								className="bg-cream p-6 flex flex-col no-underline transition-colors duration-150 hover:bg-[#eeebe4]"
							>
								<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em] mb-3">
									{m.id}
								</span>
								<h3 className="font-serif font-semibold text-[1.15rem] text-ink mb-2">
									{m.name}
								</h3>
								<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2 flex-1 mb-5">
									{m.desc}
								</p>
								<span className="inline-flex items-center gap-2 font-mono text-[11px] text-accent-red tracking-[0.02em]">
									Explore <ArrowRight size={13} />
								</span>
							</Link>
						))}
					</div>
				</div>
			</section>

			{/* ── Cross-domain intelligence ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Cross-domain intelligence
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-6">
						The whole is greater than the sum.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mx-auto">
						Your calendar knows about your flights. Your inbox knows about your
						deadlines. Your finances know about your subscriptions. That
						cross-domain awareness — the ability to connect information across
						every module — is what makes Wingmnn fundamentally different from
						using ten separate apps.
					</p>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Join the waitlist.
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
