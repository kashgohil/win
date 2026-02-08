import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { useId, useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/tools/meeting-cost-calculator")({
	component: MeetingCostCalculator,
	head: () =>
		seo({
			title: "Meeting Cost Calculator — What Do Meetings Really Cost? | Wingmnn",
			description:
				"Calculate the true cost of your meetings based on attendees, salaries, duration, and frequency. See annual impact in dollars and hours. Free tool from Wingmnn.",
			path: "/tools/meeting-cost-calculator",
		}),
});

/* ─── helpers ─── */

const salaryPresets = [60_000, 85_000, 120_000, 150_000];
const durations = [15, 30, 45, 60, 90];
const frequencies = [
	{ label: "Weekly", value: "weekly" as const, perYear: 52 },
	{ label: "Biweekly", value: "biweekly" as const, perYear: 26 },
	{ label: "Monthly", value: "monthly" as const, perYear: 12 },
];

function fmtDollars(n: number): string {
	if (n >= 1_000_000)
		return `$${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 10_000) return `$${Math.round(n).toLocaleString()}`;
	return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtHours(n: number): string {
	if (n >= 1000) return `${Math.round(n).toLocaleString()}`;
	return n.toFixed(0);
}

/* ─── component ─── */

function MeetingCostCalculator() {
	const [attendees, setAttendees] = useState(5);
	const [avgSalary, setAvgSalary] = useState(85_000);
	const [duration, setDuration] = useState(60);
	const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly">("weekly");
	const [showResults, setShowResults] = useState(false);
	const resultsId = useId();

	const clampAttendees = (v: number) => Math.max(2, Math.min(50, v));

	/* calculations */
	const hourlyRate = avgSalary / 2080;
	const costPerMeeting = hourlyRate * attendees * (duration / 60);
	const meetingsPerYear = frequencies.find((f) => f.value === frequency)!.perYear;
	const annualCost = costPerMeeting * meetingsPerYear;
	const monthlyCost = annualCost / 12;
	const hoursPerYear = (duration / 60) * attendees * meetingsPerYear;
	const ftEquivalent = hoursPerYear / 2080;
	const perAttendeeHours = hoursPerYear / attendees;

	const handleCalculate = () => {
		setShowResults(true);
		setTimeout(() => {
			document.getElementById(resultsId)?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 100);
	};

	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Free tool
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Meeting cost
						<br />
						calculator.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Meetings feel free but they're not. Enter a few numbers and see
						what that recurring sync actually costs your team in dollars and
						hours every year.
					</p>
				</div>
			</section>

			{/* ── Tool ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[640px] mx-auto">
					<div className="grid grid-cols-2 max-sm:grid-cols-1 gap-8">
						{/* Attendees */}
						<div>
							<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-2">
								Attendees
							</label>
							<div className="flex items-center gap-0">
								<button
									type="button"
									onClick={() => {
										setAttendees((v) => clampAttendees(v - 1));
										setShowResults(false);
									}}
									className="flex items-center justify-center w-10 h-[42px] border border-grey-4 border-r-0 bg-white rounded-l-[5px] cursor-pointer text-grey-3 hover:text-ink hover:bg-grey-4/30 transition-colors"
								>
									<Minus size={14} />
								</button>
								<input
									type="number"
									min={2}
									max={50}
									value={attendees}
									onChange={(e) => {
										setAttendees(clampAttendees(Number(e.target.value) || 2));
										setShowResults(false);
									}}
									className="w-full font-mono text-[13px] text-center border-y border-grey-4 bg-white px-2 py-2.5 outline-none focus:border-accent-red transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								/>
								<button
									type="button"
									onClick={() => {
										setAttendees((v) => clampAttendees(v + 1));
										setShowResults(false);
									}}
									className="flex items-center justify-center w-10 h-[42px] border border-grey-4 border-l-0 bg-white rounded-r-[5px] cursor-pointer text-grey-3 hover:text-ink hover:bg-grey-4/30 transition-colors"
								>
									<Plus size={14} />
								</button>
							</div>
						</div>

						{/* Average salary */}
						<div>
							<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-2">
								Average salary
							</label>
							<div className="relative mb-2">
								<span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-grey-3">
									$
								</span>
								<input
									type="number"
									min={0}
									value={avgSalary}
									onChange={(e) => {
										setAvgSalary(Number(e.target.value) || 0);
										setShowResults(false);
									}}
									className="w-full font-mono text-[13px] border border-grey-4 bg-white pl-7 pr-3 py-2.5 rounded-[5px] outline-none focus:border-accent-red transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
								/>
							</div>
							<div className="flex flex-wrap gap-1.5">
								{salaryPresets.map((s) => (
									<button
										key={s}
										type="button"
										onClick={() => {
											setAvgSalary(s);
											setShowResults(false);
										}}
										className={`font-mono text-[11px] py-1 px-2.5 rounded-[4px] cursor-pointer transition-colors border ${
											avgSalary === s
												? "bg-accent-red text-white border-accent-red"
												: "bg-white border-grey-4 text-grey-1 hover:border-grey-3"
										}`}
									>
										${(s / 1000).toFixed(0)}k
									</button>
								))}
							</div>
						</div>

						{/* Duration */}
						<div>
							<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-2">
								Duration
							</label>
							<div className="flex flex-wrap gap-1.5">
								{durations.map((d) => (
									<button
										key={d}
										type="button"
										onClick={() => {
											setDuration(d);
											setShowResults(false);
										}}
										className={`font-mono text-[12px] py-2 px-3.5 rounded-[5px] cursor-pointer transition-colors border ${
											duration === d
												? "bg-accent-red text-white border-accent-red"
												: "bg-white border-grey-4 text-grey-1 hover:border-grey-3"
										}`}
									>
										{d}m
									</button>
								))}
							</div>
						</div>

						{/* Frequency */}
						<div>
							<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-2">
								Frequency
							</label>
							<div className="flex flex-wrap gap-1.5">
								{frequencies.map((f) => (
									<button
										key={f.value}
										type="button"
										onClick={() => {
											setFrequency(f.value);
											setShowResults(false);
										}}
										className={`font-mono text-[12px] py-2 px-3.5 rounded-[5px] cursor-pointer transition-colors border ${
											frequency === f.value
												? "bg-accent-red text-white border-accent-red"
												: "bg-white border-grey-4 text-grey-1 hover:border-grey-3"
										}`}
									>
										{f.label}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="mt-10">
						<button
							type="button"
							onClick={handleCalculate}
							className="inline-flex items-center gap-2 font-mono font-semibold text-sm text-white bg-accent-red hover:bg-red-dark py-3.5 px-7 rounded-md cursor-pointer transition-colors"
						>
							Calculate
						</button>
					</div>
				</div>
			</section>

			{/* ── Results ── */}
			{showResults && (
				<section
					id={resultsId}
					className="py-[100px] px-(--page-px) bg-ink text-cream"
					style={{
						animation: "fadeInUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
					}}
				>
					<style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>
					<div className="max-w-[720px] mx-auto">
						<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
							Your results
						</p>
						<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-10">
							That meeting costs more
							<br />
							than you think.
						</h2>

						{/* hero stat */}
						<div className="bg-white/4 border border-white/7 rounded-xl p-7 mb-6 text-center">
							<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-3">
								Cost per meeting
							</div>
							<div className="font-display text-[clamp(2.5rem,5vw,3.5rem)] text-cream leading-none">
								{fmtDollars(costPerMeeting)}
							</div>
						</div>

						{/* 3-stat row */}
						<div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 mb-10">
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Monthly cost
								</div>
								<div className="font-display text-[1.6rem] text-cream leading-none">
									{fmtDollars(monthlyCost)}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Annual cost
								</div>
								<div className="font-display text-[1.6rem] text-cream leading-none">
									{fmtDollars(annualCost)}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Hours / year
								</div>
								<div className="font-display text-[1.6rem] text-cream leading-none">
									{fmtHours(hoursPerYear)}
								</div>
							</div>
						</div>

						{/* context cards */}
						<h3 className="font-mono text-[11px] font-semibold text-cream/40 tracking-[0.04em] uppercase mb-5">
							In perspective
						</h3>
						<div className="flex flex-col gap-4">
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<p className="font-serif text-[1rem] text-cream/70">
									This meeting consumes the equivalent of{" "}
									<span className="text-cream font-semibold">
										{ftEquivalent.toFixed(1)} full-time
										employee{ftEquivalent >= 1.05 ? "s" : ""}
									</span>{" "}
									per year in collective time.
								</p>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<p className="font-serif text-[1rem] text-cream/70">
									Each attendee spends{" "}
									<span className="text-cream font-semibold">
										{fmtHours(perAttendeeHours)} hours/year
									</span>{" "}
									in this meeting —{" "}
									{((perAttendeeHours / 2080) * 100).toFixed(1)}% of
									their total working hours.
								</p>
							</div>
							<div className="bg-white/4 border border-amber-500/15 rounded-xl p-5">
								<p className="font-serif text-[1rem] text-cream/70">
									At {fmtDollars(annualCost)}/yr, this single recurring
									meeting costs as much as{" "}
									<span className="text-amber-400 font-semibold">
										{annualCost >= avgSalary
											? `${(annualCost / avgSalary).toFixed(1)}x an average salary`
											: `${((annualCost / avgSalary) * 100).toFixed(0)}% of an average salary`}
									</span>{" "}
									on your team.
								</p>
							</div>
						</div>
					</div>
				</section>
			)}

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink border-t border-white/10">
				<div className="max-w-[620px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Schedule module
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Reclaim your calendar.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Wingmnn's Schedule module analyzes your meeting patterns, identifies
						time sinks, and suggests optimizations — so your calendar works for
						you instead of against you.
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
