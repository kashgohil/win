import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/integrations")({
	component: IntegrationsPage,
	head: () =>
		seo({
			title: "Integrations — Wingmnn",
			description:
				"Connects the tools you already use — no switching, no exporting, no copy-pasting. See every integration Wingmnn supports at launch and beyond.",
			path: "/integrations",
		}),
});

/* ─── data ─── */

interface Integration {
	name: string;
	launch: boolean;
}

interface Category {
	name: string;
	items: Integration[];
}

const categories: Category[] = [
	{
		name: "Communication",
		items: [
			{ name: "Gmail", launch: true },
			{ name: "Outlook", launch: true },
			{ name: "Slack", launch: true },
			{ name: "Teams", launch: true },
			{ name: "Discord", launch: false },
			{ name: "WhatsApp", launch: false },
			{ name: "Telegram", launch: false },
			{ name: "iMessage", launch: false },
		],
	},
	{
		name: "Calendar & Scheduling",
		items: [
			{ name: "Google Calendar", launch: true },
			{ name: "Outlook Calendar", launch: true },
			{ name: "Apple Calendar", launch: true },
			{ name: "Calendly", launch: false },
			{ name: "Cal.com", launch: false },
			{ name: "Doodle", launch: false },
		],
	},
	{
		name: "Finance",
		items: [
			{ name: "Plaid (bank accounts)", launch: true },
			{ name: "Stripe", launch: true },
			{ name: "PayPal", launch: false },
			{ name: "QuickBooks", launch: false },
			{ name: "Venmo", launch: false },
			{ name: "Wise", launch: false },
			{ name: "Coinbase", launch: false },
			{ name: "Robinhood", launch: false },
		],
	},
	{
		name: "Travel",
		items: [
			{ name: "Google Flights", launch: true },
			{ name: "Google Maps", launch: true },
			{ name: "Uber", launch: false },
			{ name: "Lyft", launch: false },
			{ name: "Kayak", launch: false },
			{ name: "Airbnb", launch: false },
			{ name: "Booking.com", launch: false },
			{ name: "Amtrak", launch: false },
		],
	},
	{
		name: "Productivity & Projects",
		items: [
			{ name: "Notion", launch: false },
			{ name: "Linear", launch: false },
			{ name: "GitHub", launch: false },
			{ name: "Google Drive", launch: false },
			{ name: "Jira", launch: false },
			{ name: "Asana", launch: false },
			{ name: "Trello", launch: false },
			{ name: "Todoist", launch: false },
		],
	},
	{
		name: "Notes & Writing",
		items: [
			{ name: "Apple Notes", launch: true },
			{ name: "Obsidian", launch: false },
			{ name: "Evernote", launch: false },
			{ name: "Google Keep", launch: false },
			{ name: "Bear", launch: false },
			{ name: "Day One", launch: false },
		],
	},
	{
		name: "News & Content",
		items: [
			{ name: "RSS feeds", launch: true },
			{ name: "X / Twitter", launch: false },
			{ name: "Reddit", launch: false },
			{ name: "Substack", launch: false },
			{ name: "YouTube", launch: false },
			{ name: "Pocket", launch: false },
		],
	},
	{
		name: "Health & Wellness",
		items: [
			{ name: "Apple Health", launch: true },
			{ name: "Fitbit", launch: false },
			{ name: "Strava", launch: false },
			{ name: "Oura", launch: false },
			{ name: "Whoop", launch: false },
			{ name: "Garmin", launch: false },
			{ name: "Peloton", launch: false },
			{ name: "MyFitnessPal", launch: false },
		],
	},
];

/* ─── component ─── */

function IntegrationsPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Integrations
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Integrations
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Connects the tools you already use — no switching, no exporting,
						no copy-pasting.
					</p>
				</div>
			</section>

			{/* ── Integration categories ── */}
			{categories.map((category) => (
				<section
					key={category.name}
					className="py-[100px] px-(--page-px) border-b border-grey-4"
				>
					<div className="max-w-[1200px] mx-auto">
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
							{category.name}
						</p>
						<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
							{category.name}
						</h2>
						<div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
							{category.items.map((item) => (
								<div key={item.name} className="bg-cream p-8">
									<div className="flex items-center justify-between mb-4">
										<span
											className={`font-mono text-[9px] font-semibold py-0.5 px-2 tracking-[0.04em] ${
												item.launch
													? "bg-green-500 text-[#052e16]"
													: "bg-grey-4 text-grey-2"
											}`}
										>
											{item.launch ? "At launch" : "Coming soon"}
										</span>
									</div>
									<h3 className="font-serif font-semibold text-[1.1rem] text-ink">
										{item.name}
									</h3>
								</div>
							))}
						</div>
					</div>
				</section>
			))}

			{/* ── Don't see your tool? ── */}
			<section className="py-[100px] px-(--page-px) border-b border-white/10 bg-ink text-cream">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Missing something?
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-6">
						Don't see your tool?
					</h2>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-cream/50 max-w-[560px] mx-auto mb-9">
						We're adding integrations based on what our users need most. If
						the tool you rely on isn't listed yet, let us know — it helps us
						prioritize what to build next.
					</p>
					<Link
						to="/contact"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-cream border border-white/15 py-3.5 px-7 rounded-md transition-colors duration-200 hover:bg-white/5 no-underline"
					>
						Request an integration <ArrowRight size={16} />
					</Link>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Join the waitlist.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. We'll let you know when it's
						your turn.
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
