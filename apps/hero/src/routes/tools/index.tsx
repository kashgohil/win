import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Calculator, Bell, CreditCard } from "lucide-react";

export const Route = createFileRoute("/tools/")({
	component: ToolsIndexPage,
	head: () => ({
		meta: [
			{ title: "Free Tools — Wingmnn" },
			{
				name: "description",
				content:
					"Free tools from Wingmnn to help you understand where your time and money go — no account required.",
			},
		],
	}),
});

/* ─── data ─── */

const tools = [
	{
		icon: CreditCard,
		name: "Subscription calculator",
		desc: "See what your recurring subscriptions actually cost per year. Paste your bank statement or add them manually — get the real number in seconds.",
		href: "/tools/subscription-calculator",
	},
	{
		icon: Calculator,
		name: "Meeting cost calculator",
		desc: "Calculate the real cost of your meetings based on attendee salaries and duration. Find out which meetings are worth it and which aren't.",
		href: "/tools/meeting-cost-calculator",
	},
	{
		icon: Bell,
		name: "Notification audit",
		desc: "Audit your notification sources and see how much time you lose to interruptions each week. Get a personalized plan to take back your focus.",
		href: "/tools/notification-audit",
	},
];

/* ─── component ─── */

function ToolsIndexPage() {
	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Free tools
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						See where your time
						<br />
						and money go.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Free tools from Wingmnn to help you understand the hidden costs of
						how you work. No account required. No data collected.
					</p>
				</div>
			</section>

			{/* ── Tools grid ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{tools.map((t) => {
							const Icon = t.icon;
							return (
								<div
									key={t.name}
									className="bg-cream p-8 flex flex-col transition-colors duration-150 hover:bg-[#eeebe4]"
								>
									<Icon
										size={24}
										className="text-accent-red mb-5"
										strokeWidth={1.5}
									/>
									<h3 className="font-serif font-semibold text-[1.15rem] text-ink mb-2">
										{t.name}
									</h3>
									<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 flex-1 mb-6">
										{t.desc}
									</p>
									<a
										href={t.href}
										className="inline-flex items-center gap-2 font-mono text-[12px] font-semibold text-accent-red no-underline tracking-[0.02em] transition-colors duration-150 hover:text-red-dark"
									>
										Try it <ArrowRight size={14} />
									</a>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Want the full picture?
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						These tools scratch the surface. Wingmnn connects all your
						systems into one intelligence that works for you.
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
