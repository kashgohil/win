import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () =>
		seo({
			title: "Privacy — Wingmnn",
			description:
				"Your data is yours. We don't train on it, sell it, or share it. Full encryption, SOC 2 compliance, and one-click deletion.",
			path: "/privacy",
		}),
});

/* ─── data ─── */

const principles = [
	{
		title: "We don't train on your data",
		body: "Your information is never used to improve our models. Your patterns, preferences, and history belong to you — not our training pipeline.",
	},
	{
		title: "We don't sell it",
		body: "No data brokers. No ad networks. No \"anonymized\" datasets sold to third parties. Your subscription is our business model.",
	},
	{
		title: "We don't share it",
		body: "No partner integrations that leak your information. No analytics vendors that receive PII. What's yours stays yours.",
	},
	{
		title: "You can delete everything",
		body: "One click. Full account deletion. All data purged within 30 days — no hidden archives, no backups we conveniently forget about.",
	},
];

const dataCategories = [
	{
		category: "Communications",
		what: "Email metadata, message content, contact frequency",
		why: "Inbox triage, draft generation, priority ranking",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Calendar",
		what: "Events, attendees, scheduling patterns",
		why: "Conflict detection, meeting prep, schedule optimization",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Finances",
		what: "Transaction data, balances, account metadata (via Plaid)",
		why: "Spending tracking, anomaly detection, bill reminders",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Projects",
		what: "Task names, deadlines, status updates",
		why: "Deadline tracking, workload analysis, nudges",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Messages",
		what: "Thread metadata, message content across platforms",
		why: "Conversation summaries, response drafting",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Travel",
		what: "Itineraries, bookings, loyalty program IDs",
		why: "Trip management, price monitoring, document storage",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Wellness",
		what: "Sleep, steps, activity data (from connected devices)",
		why: "Pattern tracking, gentle nudges, weekly summaries",
		retention: "Active account + 30 days after deletion",
	},
	{
		category: "Journal & Notes",
		what: "Free-form text, voice transcriptions",
		why: "Searchable archive, prompt generation, reflection",
		retention: "Active account + 30 days after deletion",
	},
];

/* ─── component ─── */

function PrivacyPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[80px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] sticky top-[120px] max-md:static">
							Privacy Policy
						</p>
					</div>
					<div>
						<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-4">
							Privacy
						</h1>
						<p className="font-mono text-[11px] text-grey-3 tracking-[0.04em] mb-6">
							Effective February 2025
						</p>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px]">
							Your data is yours. This page explains exactly what that means —
							what we collect, why, how we protect it, and how you stay in
							control.
						</p>
					</div>
				</div>
			</section>

			{/* ── Our principles ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Our principles
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Four commitments we don't break.
					</h2>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{principles.map((p) => (
							<div key={p.title} className="bg-cream p-8">
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
									{p.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									{p.body}
								</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* ── What we collect ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-8">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							What we collect
						</p>
					</div>
					<div>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mb-10">
							We only collect what's necessary to make each module work. Here's
							a complete breakdown by category.
						</p>
						<div className="flex flex-col gap-px bg-grey-4 border border-grey-4">
							{dataCategories.map((d) => (
								<div
									key={d.category}
									className="bg-cream p-6 grid grid-cols-[140px_1fr_1fr_160px] max-lg:grid-cols-1 gap-4 max-lg:gap-2"
								>
									<div className="font-mono text-[11px] font-semibold text-ink tracking-[0.04em] pt-0.5">
										{d.category}
									</div>
									<div>
										<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase block mb-1 lg:hidden">
											What
										</span>
										<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2">
											{d.what}
										</p>
									</div>
									<div>
										<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase block mb-1 lg:hidden">
											Why
										</span>
										<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2">
											{d.why}
										</p>
									</div>
									<div>
										<span className="font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase block mb-1 lg:hidden">
											Retention
										</span>
										<p className="font-mono text-[10px] leading-[1.65] text-grey-3">
											{d.retention}
										</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ── How we protect it ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							How we protect it
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-8">
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Encryption everywhere
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								All data is encrypted at rest (AES-256) and in transit (TLS
								1.3). Your information is unreadable without the decryption
								keys, which are managed through a dedicated key management
								service.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								SOC 2 Type II compliant
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Our infrastructure and processes are audited annually by an
								independent third party. We meet the Trust Services Criteria for
								security, availability, and confidentiality.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Read-only financial access
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Financial connections use Plaid with read-only permissions. We
								can see transaction data but can never move money, initiate
								transfers, or modify your accounts.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Infrastructure
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Hosted on SOC 2-certified cloud infrastructure in the United
								States. Network-level isolation, automated vulnerability
								scanning, and 24/7 monitoring. No data ever leaves secure,
								audited environments.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Your controls ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Your controls
						</p>
					</div>
					<div className="max-w-[600px] flex flex-col gap-8">
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Granular permissions
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Every module can be connected or disconnected independently.
								Revoke access to any data source at any time — the associated
								data is deleted within 24 hours.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								Full data export
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Request a complete export of your data in standard, portable
								formats at any time. No lock-in. No proprietary formats. Your
								data leaves when you do.
							</p>
						</div>
						<div>
							<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-2">
								One-click account deletion
							</h3>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Delete your account and all associated data with a single
								action. Everything is permanently purged within 30 days. No
								archives, no backups, no "we'll keep it just in case."
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Third parties ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Third parties
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 mb-6">
							We work with the minimum number of third parties necessary to
							operate.
						</p>
						<div className="flex flex-col gap-6">
							<div>
								<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-1">
									Plaid
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									Used exclusively for the Finances module. Read-only bank
									account connections. Plaid's own security practices are
									SOC 2 Type II certified.
								</p>
							</div>
							<div>
								<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-1">
									Cloud infrastructure
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
									SOC 2-certified hosting provider. Data encrypted at rest
									and in transit. No PII is shared with the provider beyond
									what's required for hosting.
								</p>
							</div>
						</div>
						<div className="mt-8 p-6 bg-ink rounded-lg">
							<p className="font-serif text-[0.92rem] leading-[1.75] text-cream/60">
								No ad networks. No analytics vendors that receive PII. No data
								brokers. No social login providers that track you. The list above
								is complete.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* ── Contact ── */}
			<section className="py-[100px] px-(--page-px)">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3 sticky top-[120px] max-md:static">
							Contact
						</p>
					</div>
					<div className="max-w-[600px]">
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 mb-6">
							Questions about your data or this policy? We respond to every
							inquiry.
						</p>
						<a
							href="mailto:hello@wingmnn.com"
							className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-ink hover:bg-[#333] no-underline"
						>
							hello@wingmnn.com
							<ArrowRight size={16} />
						</a>
					</div>
				</div>
			</section>
		</main>
	);
}
