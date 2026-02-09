import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Briefcase,
	Calendar,
	CreditCard,
	Mail,
	MessageSquare,
	Minus,
	Newspaper,
	Plus,
	ShoppingBag,
	Smartphone,
} from "lucide-react";
import { useId, useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/tools/notification-audit")({
	component: NotificationAudit,
	head: () =>
		seo({
			title: "Notification Audit — How Much Noise Are You Drowning In? | Wingmnn",
			description:
				"Audit your daily notifications across every app. See how many actually matter, how many hours you lose, and where the noise is coming from. Free tool from Wingmnn.",
			path: "/tools/notification-audit",
		}),
});

/* ─── data ─── */

type Category = {
	id: string;
	name: string;
	icon: typeof Mail;
	dailyCount: number;
	urgentPct: number;
	enabled: boolean;
};

const defaultCategories: Category[] = [
	{ id: "email", name: "Email", icon: Mail, dailyCount: 40, urgentPct: 15, enabled: true },
	{ id: "messaging", name: "Messaging", icon: MessageSquare, dailyCount: 35, urgentPct: 20, enabled: true },
	{ id: "calendar", name: "Calendar", icon: Calendar, dailyCount: 8, urgentPct: 60, enabled: true },
	{ id: "social", name: "Social media", icon: Smartphone, dailyCount: 25, urgentPct: 5, enabled: true },
	{ id: "news", name: "News & feeds", icon: Newspaper, dailyCount: 18, urgentPct: 5, enabled: true },
	{ id: "finance", name: "Banking & finance", icon: CreditCard, dailyCount: 6, urgentPct: 40, enabled: true },
	{ id: "shopping", name: "Shopping & delivery", icon: ShoppingBag, dailyCount: 10, urgentPct: 10, enabled: true },
	{ id: "work", name: "Work tools", icon: Briefcase, dailyCount: 22, urgentPct: 25, enabled: true },
];

/* ─── component ─── */

function NotificationAudit() {
	const [cats, setCats] = useState<Category[]>(defaultCategories);
	const [showResults, setShowResults] = useState(false);
	const resultsId = useId();

	const handleAudit = () => {
		setShowResults(true);
		// Smooth scroll to results
		setTimeout(() => {
			document.getElementById(resultsId)?.scrollIntoView({ behavior: "smooth", block: "start" });
		}, 100);
	};

	const updateCat = (id: string, patch: Partial<Category>) => {
		setCats((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
		setShowResults(false);
	};

	const stepCount = (id: string, delta: number) => {
		setCats((prev) =>
			prev.map((c) =>
				c.id === id ? { ...c, dailyCount: Math.max(0, c.dailyCount + delta) } : c,
			),
		);
		setShowResults(false);
	};

	const stepUrgent = (id: string, delta: number) => {
		setCats((prev) =>
			prev.map((c) =>
				c.id === id
					? { ...c, urgentPct: Math.max(0, Math.min(100, c.urgentPct + delta)) }
					: c,
			),
		);
		setShowResults(false);
	};

	/* calculations */
	const enabled = cats.filter((c) => c.enabled);
	const dailyTotal = enabled.reduce((acc, c) => acc + c.dailyCount, 0);
	const dailyUrgent = enabled.reduce(
		(acc, c) => acc + Math.round(c.dailyCount * (c.urgentPct / 100)),
		0,
	);
	const dailyNoise = dailyTotal - dailyUrgent;
	const noiseRatio = dailyTotal > 0 ? (dailyNoise / dailyTotal) * 100 : 0;
	const signalRatio = 100 - noiseRatio;

	// 5 seconds per glance + 25% chance of 25s context switch
	const minutesPerDay = (dailyTotal * 5 + dailyTotal * 0.25 * 25) / 60;
	const hoursPerYear = (minutesPerDay * 365) / 60;

	const noiseByCategory = enabled
		.map((c) => ({
			...c,
			noise: c.dailyCount - Math.round(c.dailyCount * (c.urgentPct / 100)),
		}))
		.sort((a, b) => b.noise - a.noise);

	const maxNoise = Math.max(...noiseByCategory.map((c) => c.noise), 1);

	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Free tool
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Notification
						<br />
						audit.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						How many notifications do you actually need? Adjust the numbers
						below to match your typical day and see how much noise you're
						drowning in — and how many hours it costs you every year.
					</p>
				</div>
			</section>

			{/* ── Tool ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[720px] mx-auto">
					<div className="flex flex-col gap-3">
						{cats.map((cat) => {
							const Icon = cat.icon;
							return (
								<div
									key={cat.id}
									className={`grid grid-cols-[1fr_160px_160px_48px] max-md:grid-cols-[1fr_1fr] gap-3 items-center border border-grey-4 rounded-lg px-4 py-3 transition-opacity ${
										cat.enabled ? "opacity-100" : "opacity-40"
									}`}
								>
									{/* name */}
									<div className="flex items-center gap-3 max-md:col-span-2">
										<Icon size={16} className="text-grey-2 shrink-0" />
										<span className="font-serif text-[0.95rem] text-ink">
											{cat.name}
										</span>
									</div>

									{/* daily count */}
									<div className="flex items-center gap-0">
										<button
											type="button"
											onClick={() => stepCount(cat.id, -5)}
											disabled={!cat.enabled}
											className="flex items-center justify-center w-8 h-8 border border-grey-4 border-r-0 bg-white rounded-l-[4px] cursor-pointer text-grey-3 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<Minus size={12} />
										</button>
										<div className="flex-1 h-8 flex items-center justify-center border-y border-grey-4 bg-white font-mono text-[12px] text-ink min-w-[60px]">
											{cat.dailyCount}/day
										</div>
										<button
											type="button"
											onClick={() => stepCount(cat.id, 5)}
											disabled={!cat.enabled}
											className="flex items-center justify-center w-8 h-8 border border-grey-4 border-l-0 bg-white rounded-r-[4px] cursor-pointer text-grey-3 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<Plus size={12} />
										</button>
									</div>

									{/* urgent pct */}
									<div className="flex items-center gap-0">
										<button
											type="button"
											onClick={() => stepUrgent(cat.id, -5)}
											disabled={!cat.enabled}
											className="flex items-center justify-center w-8 h-8 border border-grey-4 border-r-0 bg-white rounded-l-[4px] cursor-pointer text-grey-3 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<Minus size={12} />
										</button>
										<div className="flex-1 h-8 flex items-center justify-center border-y border-grey-4 bg-white font-mono text-[12px] text-ink min-w-[60px]">
											{cat.urgentPct}% urgent
										</div>
										<button
											type="button"
											onClick={() => stepUrgent(cat.id, 5)}
											disabled={!cat.enabled}
											className="flex items-center justify-center w-8 h-8 border border-grey-4 border-l-0 bg-white rounded-r-[4px] cursor-pointer text-grey-3 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
										>
											<Plus size={12} />
										</button>
									</div>

									{/* toggle */}
									<div className="flex items-center justify-center max-md:col-start-2 max-md:justify-end">
										<button
											type="button"
											onClick={() => {
												updateCat(cat.id, { enabled: !cat.enabled });
											}}
											className={`relative w-10 h-[22px] rounded-full cursor-pointer transition-colors ${
												cat.enabled ? "bg-accent-red" : "bg-grey-4"
											}`}
										>
											<span
												className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow-sm transition-[left] duration-200 ${
													cat.enabled ? "left-[21px]" : "left-[3px]"
												}`}
											/>
										</button>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-8">
						<button
							type="button"
							onClick={handleAudit}
							disabled={enabled.length === 0}
							className="inline-flex items-center gap-2 font-mono font-semibold text-sm text-white bg-accent-red hover:bg-red-dark py-3.5 px-7 rounded-md cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Audit my notifications
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
							{dailyTotal} notifications a day.
							<br />
							Only {dailyUrgent} actually matter.
						</h2>

						{/* 3-stat row */}
						<div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 mb-10">
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Daily noise
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									{dailyNoise}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Minutes lost / day
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									{Math.round(minutesPerDay)}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Hours lost / year
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									{Math.round(hoursPerYear)}
								</div>
							</div>
						</div>

						{/* signal-to-noise bar */}
						<div className="mb-10">
							<h3 className="font-mono text-[11px] font-semibold text-cream/40 tracking-[0.04em] uppercase mb-4">
								Signal vs. noise
							</h3>
							<div className="h-6 bg-white/6 rounded-full overflow-hidden flex">
								<div
									className="h-full bg-green-500 transition-[width] duration-700 ease-out flex items-center justify-center"
									style={{ width: `${Math.max(signalRatio, 2)}%` }}
								>
									{signalRatio >= 12 && (
										<span className="font-mono text-[10px] text-[#052e16] font-semibold">
											{signalRatio.toFixed(0)}% signal
										</span>
									)}
								</div>
								<div
									className="h-full bg-red-500/70 transition-[width] duration-700 ease-out flex items-center justify-center"
									style={{ width: `${Math.max(noiseRatio, 2)}%` }}
								>
									{noiseRatio >= 12 && (
										<span className="font-mono text-[10px] text-white font-semibold">
											{noiseRatio.toFixed(0)}% noise
										</span>
									)}
								</div>
							</div>
						</div>

						{/* category breakdown */}
						<div>
							<h3 className="font-mono text-[11px] font-semibold text-cream/40 tracking-[0.04em] uppercase mb-5">
								Noise by category
							</h3>
							<div className="flex flex-col gap-4">
								{noiseByCategory.map((c) => {
									const Icon = c.icon;
									const barPct = maxNoise > 0 ? (c.noise / maxNoise) * 100 : 0;
									return (
										<div key={c.id}>
											<div className="flex items-center justify-between mb-1.5">
												<div className="flex items-center gap-2.5">
													<Icon size={14} className="text-cream/30" />
													<span className="font-serif text-[0.92rem] text-cream/70">
														{c.name}
													</span>
												</div>
												<span className="font-mono text-[12px] text-cream/50">
													{c.noise} noise/day
													<span className="text-cream/30 ml-2">
														of {c.dailyCount}
													</span>
												</span>
											</div>
											<div className="h-2 bg-white/6 rounded-full overflow-hidden">
												<div
													className="h-full bg-red-500/60 rounded-full transition-[width] duration-700 ease-out"
													style={{
														width: `${barPct}%`,
													}}
												/>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					</div>
				</section>
			)}

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink border-t border-white/10">
				<div className="max-w-[620px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Intelligent briefings
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Cut through the noise.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Wingmnn consolidates everything into a single intelligent briefing
						— filtering noise, surfacing what matters, and letting you start
						each day with clarity instead of chaos.
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
