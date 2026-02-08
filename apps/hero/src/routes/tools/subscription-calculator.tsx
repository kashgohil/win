import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/tools/subscription-calculator")({
	component: SubscriptionCalculator,
	head: () =>
		seo({
			title: "Subscription Calculator — How Much Are You Spending? | Wingmnn",
			description:
				"Add up every subscription you pay for, see your real monthly and annual totals, and find hidden waste. Free tool from Wingmnn.",
			path: "/tools/subscription-calculator",
		}),
});

/* ─── hooks ─── */

function useReveal(threshold = 0.12) {
	const ref = useRef<HTMLDivElement>(null);
	const [vis, setVis] = useState(false);
	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const obs = new IntersectionObserver(
			([e]) => {
				if (e.isIntersecting) {
					setVis(true);
					obs.disconnect();
				}
			},
			{ threshold },
		);
		obs.observe(el);
		return () => obs.disconnect();
	}, [threshold]);
	return { ref, vis };
}

/* ─── helpers ─── */

const categories = [
	"Entertainment",
	"Productivity",
	"Fitness",
	"Food",
	"News",
	"Cloud",
	"Finance",
	"Other",
] as const;

type Sub = {
	id: number;
	name: string;
	amount: string;
	frequency: "monthly" | "annual";
	category: string;
};

let nextId = 1;
function makeSub(): Sub {
	return {
		id: nextId++,
		name: "",
		amount: "",
		frequency: "monthly",
		category: "Other",
	};
}

function fmt(n: number): string {
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── component ─── */

function SubscriptionCalculator() {
	const { ref: resultsRef, vis: resultsVis } = useReveal(0.05);

	const [subs, setSubs] = useState<Sub[]>([makeSub()]);
	const [showResults, setShowResults] = useState(false);

	const updateSub = (id: number, patch: Partial<Sub>) => {
		setSubs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
		setShowResults(false);
	};

	const addSub = () => {
		setSubs((prev) => [...prev, makeSub()]);
		setShowResults(false);
	};

	const removeSub = (id: number) => {
		setSubs((prev) => {
			if (prev.length <= 1) return prev;
			return prev.filter((s) => s.id !== id);
		});
		setShowResults(false);
	};

	/* calculations */
	const parsed = subs
		.filter((s) => s.amount && Number(s.amount) > 0)
		.map((s) => {
			const raw = Number(s.amount);
			const monthly = s.frequency === "annual" ? raw / 12 : raw;
			return { ...s, monthly };
		});

	const monthlyTotal = parsed.reduce((acc, s) => acc + s.monthly, 0);
	const annualTotal = monthlyTotal * 12;

	const categoryMap = new Map<string, number>();
	for (const s of parsed) {
		categoryMap.set(s.category, (categoryMap.get(s.category) || 0) + s.monthly);
	}
	const categoryBreakdown = [...categoryMap.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([cat, amount]) => ({
			category: cat,
			amount,
			pct: monthlyTotal > 0 ? (amount / monthlyTotal) * 100 : 0,
		}));

	const mostExpensive = parsed.length
		? parsed.reduce((a, b) => (a.monthly > b.monthly ? a : b))
		: null;

	const microSubs = parsed.filter((s) => s.monthly < 5);
	const microTotal = microSubs.reduce((acc, s) => acc + s.monthly, 0);

	const handleCalculate = () => {
		if (parsed.length === 0) return;
		setShowResults(true);
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
						Subscription audit
						<br />
						calculator.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Add every subscription you pay for — streaming, software, gym,
						delivery, everything. See your real monthly burn, find the
						categories eating your budget, and spot the micro-charges that
						quietly add up.
					</p>
				</div>
			</section>

			{/* ── Tool ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[720px] mx-auto">
					<div className="flex flex-col gap-3">
						{subs.map((sub, i) => (
							<div
								key={sub.id}
								className="grid grid-cols-[1fr_120px_120px_120px_40px] max-md:grid-cols-[1fr_1fr] gap-2.5 items-end"
							>
								<div className="max-md:col-span-2">
									{i === 0 && (
										<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-1.5">
											Name
										</label>
									)}
									<input
										type="text"
										placeholder="e.g. Netflix"
										value={sub.name}
										onChange={(e) =>
											updateSub(sub.id, { name: e.target.value })
										}
										className="w-full font-mono text-[13px] border border-grey-4 bg-white px-3 py-2.5 rounded-[5px] outline-none focus:border-accent-red transition-colors"
									/>
								</div>
								<div>
									{i === 0 && (
										<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-1.5">
											Amount
										</label>
									)}
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-grey-3">
											$
										</span>
										<input
											type="number"
											min="0"
											step="0.01"
											placeholder="0.00"
											value={sub.amount}
											onChange={(e) =>
												updateSub(sub.id, { amount: e.target.value })
											}
											className="w-full font-mono text-[13px] border border-grey-4 bg-white pl-7 pr-3 py-2.5 rounded-[5px] outline-none focus:border-accent-red transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
										/>
									</div>
								</div>
								<div>
									{i === 0 && (
										<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-1.5">
											Billing
										</label>
									)}
									<select
										value={sub.frequency}
										onChange={(e) =>
											updateSub(sub.id, {
												frequency: e.target.value as Sub["frequency"],
											})
										}
										className="w-full font-mono text-[13px] border border-grey-4 bg-white px-3 py-2.5 rounded-[5px] outline-none focus:border-accent-red transition-colors cursor-pointer"
									>
										<option value="monthly">Monthly</option>
										<option value="annual">Annual</option>
									</select>
								</div>
								<div>
									{i === 0 && (
										<label className="block font-mono text-[10px] text-grey-3 tracking-[0.04em] uppercase mb-1.5">
											Category
										</label>
									)}
									<select
										value={sub.category}
										onChange={(e) =>
											updateSub(sub.id, { category: e.target.value })
										}
										className="w-full font-mono text-[13px] border border-grey-4 bg-white px-3 py-2.5 rounded-[5px] outline-none focus:border-accent-red transition-colors cursor-pointer"
									>
										{categories.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</div>
								<div className="flex items-center justify-center">
									<button
										type="button"
										onClick={() => removeSub(sub.id)}
										disabled={subs.length <= 1}
										className="p-2 rounded-[5px] text-grey-3 hover:text-accent-red hover:bg-red-50 transition-colors disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer"
									>
										<Trash2 size={15} />
									</button>
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center gap-3 mt-6">
						<button
							type="button"
							onClick={addSub}
							className="inline-flex items-center gap-2 font-mono text-[12px] font-medium text-grey-2 border border-grey-4 bg-white py-2.5 px-4 rounded-[5px] cursor-pointer transition-colors hover:border-grey-3 hover:text-ink"
						>
							<Plus size={14} /> Add subscription
						</button>
						<button
							type="button"
							onClick={handleCalculate}
							disabled={parsed.length === 0}
							className="inline-flex items-center gap-2 font-mono font-semibold text-sm text-white bg-accent-red hover:bg-red-dark py-2.5 px-7 rounded-md cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Calculate
						</button>
					</div>
				</div>
			</section>

			{/* ── Results ── */}
			{showResults && (
				<section className="py-[100px] px-(--page-px) bg-ink text-cream">
					<div
						ref={resultsRef}
						className={`max-w-[720px] mx-auto transition-[opacity,transform] duration-600 ease-out ${resultsVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
					>
						<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
							Your results
						</p>
						<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-cream mb-10">
							Here's what your subscriptions
							<br />
							actually cost.
						</h2>

						{/* stat summary */}
						<div className="grid grid-cols-3 max-sm:grid-cols-1 gap-4 mb-10">
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Monthly total
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									${fmt(monthlyTotal)}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Annual total
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									${fmt(annualTotal)}
								</div>
							</div>
							<div className="bg-white/4 border border-white/7 rounded-xl p-5">
								<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
									Subscriptions
								</div>
								<div className="font-display text-[2rem] text-cream leading-none">
									{parsed.length}
								</div>
							</div>
						</div>

						{/* category breakdown */}
						{categoryBreakdown.length > 0 && (
							<div className="mb-10">
								<h3 className="font-mono text-[11px] font-semibold text-cream/40 tracking-[0.04em] uppercase mb-5">
									By category
								</h3>
								<div className="flex flex-col gap-4">
									{categoryBreakdown.map((c) => (
										<div key={c.category}>
											<div className="flex justify-between items-baseline mb-1.5">
												<span className="font-serif text-[0.92rem] text-cream/70">
													{c.category}
												</span>
												<span className="font-mono text-[12px] text-cream/50">
													${fmt(c.amount)}/mo
													<span className="text-cream/30 ml-2">
														{c.pct.toFixed(0)}%
													</span>
												</span>
											</div>
											<div className="h-2 bg-white/6 rounded-full overflow-hidden">
												<div
													className="h-full bg-accent-red rounded-full transition-[width] duration-700 ease-out"
													style={{ width: `${c.pct}%` }}
												/>
											</div>
										</div>
									))}
								</div>
							</div>
						)}

						{/* highlights */}
						<div className="flex flex-col gap-4">
							{mostExpensive && (
								<div className="bg-white/4 border border-white/7 rounded-xl p-5">
									<div className="font-mono text-[10px] text-cream/35 tracking-[0.04em] uppercase mb-2">
										Most expensive
									</div>
									<p className="font-serif text-[1rem] text-cream/70">
										<span className="text-cream font-semibold">
											{mostExpensive.name || "Unnamed"}
										</span>{" "}
										at ${fmt(mostExpensive.monthly)}/mo
									</p>
								</div>
							)}
							{microSubs.length > 0 && (
								<div className="bg-white/4 border border-amber-500/15 rounded-xl p-5">
									<div className="font-mono text-[10px] text-amber-400/70 tracking-[0.04em] uppercase mb-2">
										Micro-subscriptions (under $5/mo)
									</div>
									<p className="font-serif text-[1rem] text-cream/70">
										{microSubs.length} subscription
										{microSubs.length !== 1 ? "s" : ""} under $5/mo
										adding up to{" "}
										<span className="text-amber-400 font-semibold">
											${fmt(microTotal)}/mo
										</span>{" "}
										— that's ${fmt(microTotal * 12)}/yr in
										near-invisible charges.
									</p>
								</div>
							)}
						</div>
					</div>
				</section>
			)}

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Finances module
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Track this automatically.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Wingmnn's Finances module monitors your subscriptions in real-time
						— flagging price increases, forgotten trials, and duplicate charges
						before they hit your account.
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
