import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/use-cases/freelancers")({
	component: FreelancersPage,
	head: () => ({
		meta: [
			{ title: "Wingmnn for Freelancers — Your Back Office" },
			{
				name: "description",
				content:
					"Wingmnn handles invoicing reminders, schedule juggling, project tracking, and client communication — so you can focus on the work you're actually hired to do.",
			},
		],
	}),
});

/* ─── data ─── */

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		desc: "Client emails triaged by project and urgency. Auto-drafted replies for scheduling requests, scope questions, and follow-ups you keep forgetting to send.",
	},
	{
		id: "FIN",
		name: "Finances",
		desc: "Invoice tracking, payment reminders, and expense categorization. Know who owes you what without opening a spreadsheet.",
	},
	{
		id: "PROJ",
		name: "Projects",
		desc: "Multi-client workload management. Deadlines tracked across every engagement. Nudges when a deliverable is at risk of slipping.",
	},
	{
		id: "CAL",
		name: "Schedule",
		desc: "Client calls, deep-work blocks, and personal time balanced automatically. Buffer time between context switches. No more triple-booking.",
	},
];

const crossDomain = [
	{
		title: "Your finances know about your projects",
		body: "When a project wraps, Wingmnn checks if the final invoice has been sent. Overdue payments surface automatically alongside active deliverables.",
	},
	{
		title: "Your inbox knows about your schedule",
		body: "A client asking 'are you free Thursday?' triggers a calendar check and a drafted reply with your actual availability — before you even open it.",
	},
	{
		title: "Your projects know about your email",
		body: "Scope change requests in email are flagged against your project timeline. You see the impact on deadlines before you say yes.",
	},
];

/* ─── component ─── */

function FreelancersPage() {
	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						For freelancers
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Your back office.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						You got into freelancing to do great work — not to spend half your
						week chasing invoices, juggling calendars, and managing admin.
						Wingmnn handles the business of freelancing so you can focus on the
						craft.
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
							Freelancers are the CEO, CFO, project manager, and secretary of
							a one-person company. Every client has different expectations,
							different communication styles, and different payment timelines.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5">
							The admin work that comes with independence eats into the
							billable hours that actually pay the bills.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold">
							You need a back office that runs itself — so you can run your
							business.
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
						Your business runs on
						<br />
						connections between things.
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[600px] mb-12">
						When your tools talk to each other, the admin work that used to
						take hours happens in the background.
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
						Do the work you love.
						<br />
						Let Wingmnn handle the rest.
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
