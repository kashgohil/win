import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Check, Shield, Users, Zap } from "lucide-react";
import { useCallback, useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/early-access")({
	component: EarlyAccessPage,
	head: () =>
		seo({
			title: "Early Access — Wingmnn",
			description:
				"Get early access to Wingmnn. Join the waitlist and be among the first to use the intelligence layer for your life.",
			path: "/early-access",
		}),
});

/* ─── data ─── */

const valueProps = [
	{
		icon: Zap,
		title: "Priority access",
		body: "Be among the first to use Wingmnn. Early adopters get access weeks before general availability.",
	},
	{
		icon: Users,
		title: "Shape the product",
		body: "Direct line to the team. Your feedback influences what we build next. Weekly founder updates.",
	},
	{
		icon: Shield,
		title: "Locked-in pricing",
		body: "Early access members keep their introductory rate — even after we raise prices at general launch.",
	},
];

const stats = [
	{ number: "2,847+", label: "on the waitlist" },
	{ number: "10", label: "modules at launch" },
	{ number: "Brooklyn, NY", label: "where we build" },
];

/* ─── component ─── */

function EarlyAccessPage() {
	const [email, setEmail] = useState("");
	const [formErr, setFormErr] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			setFormErr("");
			const t = email.trim();
			if (!t) {
				setFormErr("Enter your email.");
				return;
			}
			if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) {
				setFormErr("That doesn't look right.");
				return;
			}
			// TODO: wire to API
			setSubmitted(true);
		},
		[email],
	);

	return (
		<main>
			{/* ── Hero ── */}
			<section className="pt-[180px] pb-[100px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					{submitted ? (
						<div className="py-5">
							<h1 className="font-serif font-bold text-[2.5rem] text-cream mb-3">
								You're in.
							</h1>
							<p className="font-serif text-[1.05rem] leading-[1.7] text-cream/50">
								We'll let you know when your account is ready.
							</p>
						</div>
					) : (
						<>
							<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
								Get early access to Wingmnn.
							</h1>
							<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
								We're rolling out access to a small group of early adopters. Drop
								your email and we'll let you know when it's your turn.
							</p>
							<form
								onSubmit={handleSubmit}
								className="flex max-[500px]:flex-col gap-0 max-[500px]:gap-2.5 max-w-[480px] mx-auto items-start"
								noValidate
							>
								<div className="flex-1 flex flex-col">
									<input
										type="email"
										placeholder="you@email.com"
										className={`w-full font-mono text-[13px] h-12.5 px-[18px] border border-grey-1 max-[500px]:border-r max-[500px]:rounded-[5px] border-r-0 rounded-l-[5px] rounded-r-none bg-[#2a2a2a] text-cream outline-none transition-colors duration-150 placeholder:text-[#666] focus:border-accent-red ${formErr ? "border-accent-red" : ""}`}
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											if (formErr) setFormErr("");
										}}
									/>
									{formErr && (
										<span className="font-mono text-[10px] text-accent-red text-left mt-1.5">
											{formErr}
										</span>
									)}
								</div>
								<button
									type="submit"
									className="inline-flex items-center gap-2 font-mono text-xs font-semibold text-white bg-accent-red py-4 h-12.5 px-6 border border-accent-red rounded-r-[5px] max-[500px]:rounded-[5px] max-[500px]:justify-center rounded-l-none cursor-pointer transition-colors duration-200 whitespace-nowrap hover:bg-red-dark"
								>
									Get early access <ArrowRight size={15} />
								</button>
							</form>
						</>
					)}
				</div>
			</section>

			{/* ── Value props ── */}
			<section className="py-[100px] px-(--page-px) border-t border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						What you get
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-ink mb-12">
						More than a spot on a list.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{valueProps.map((v) => {
							const Icon = v.icon;
							return (
								<div key={v.title} className="bg-cream p-8">
									<Icon
										size={24}
										strokeWidth={1.5}
										className="text-accent-red mb-4"
									/>
									<h3 className="font-serif font-semibold text-[1.1rem] text-ink mb-2">
										{v.title}
									</h3>
									<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
										{v.body}
									</p>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ── Social proof / numbers ── */}
			<section className="py-[80px] px-(--page-px) bg-ink">
				<div className="max-w-[800px] mx-auto grid grid-cols-3 max-md:grid-cols-1 gap-10 text-center">
					{stats.map((s) => (
						<div key={s.label}>
							<div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-cream leading-none">
								{s.number}
							</div>
							<div className="font-mono text-[11px] text-cream/40 mt-2 tracking-[0.02em]">
								{s.label}
							</div>
						</div>
					))}
				</div>
			</section>
		</main>
	);
}
