import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Bell,
	Calendar,
	CheckCircle,
	CreditCard,
	DollarSign,
	Image,
	Mail,
	MessageSquare,
	Mic,
	Moon,
	Plane,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { seo } from "@/lib/seo";

const faqEntries = [
	{
		q: "What happens to my data if I cancel?",
		a: "Everything is exported to you in standard formats within 24 hours. After 30 days, all data is permanently deleted. No copies. No archives.",
	},
	{
		q: "Do I have to connect everything?",
		a: "No. Every module is independent. Connect only what you want. More connections mean better intelligence, but none are required.",
	},
	{
		q: "How is this different from [insert app]?",
		a: "Most tools solve one domain. Wingmnn is one intelligence across all of them. Your calendar knows about your finances. Your inbox knows about your projects. That cross-domain awareness is the whole point.",
	},
	{
		q: "Is my financial data safe?",
		a: "Financial connections are read-only through Plaid. We can't move money. Everything is encrypted at rest and in transit. We're SOC 2 Type II compliant.",
	},
	{
		q: "What makes Wingmnn a partner-in-crime?",
		a: "A persistent model of your preferences, patterns, and priorities. Not a chatbot you re-explain things to. Wingmnn remembers context and acts on your behalf — like a chief of staff who's been with you for years.",
	},
	{
		q: "How much does it cost?",
		a: "Pricing announced at launch. Straightforward monthly subscription. No per-module fees, no usage caps. The business model is your subscription, not your data.",
	},
];

export const Route = createFileRoute("/")({
	component: HomePage,
	head: () =>
		seo({
			title: "wingmnn — your partner-in-crime",
			description:
				"The personal assistant that manages your mail, projects, money, messages, feeds, journal, notes, travel, calendar, and wellness.",
			path: "/",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "WebPage",
					name: "wingmnn — your partner-in-crime",
					url: "https://wingmnn.com",
					description:
						"The personal assistant that manages your mail, projects, money, messages, feeds, journal, notes, travel, calendar, and wellness.",
					about: {
						"@type": "SoftwareApplication",
						name: "Wingmnn",
						applicationCategory: "ProductivityApplication",
						operatingSystem: "Web, iOS, Android",
						offers: {
							"@type": "Offer",
							availability: "https://schema.org/PreOrder",
						},
					},
				},
				{
					"@context": "https://schema.org",
					"@type": "FAQPage",
					mainEntity: faqEntries.map((f) => ({
						"@type": "Question",
						name: f.q,
						acceptedAnswer: {
							"@type": "Answer",
							text: f.a,
						},
					})),
				},
			],
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

function useCounter(target: number, duration: number, go: boolean) {
	const [v, setV] = useState(0);
	useEffect(() => {
		if (!go) return;
		let raf: number;
		const t0 = performance.now();
		const tick = (now: number) => {
			const p = Math.min((now - t0) / duration, 1);
			setV(Math.floor(p * target));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [target, duration, go]);
	return v;
}

/* ─── image placeholder ─── */

function ImagePlaceholder({
	label,
	className = "",
	dark = false,
}: {
	label: string;
	className?: string;
	dark?: boolean;
}) {
	return (
		<div
			className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed ${dark ? "border-white/12 bg-white/3" : "border-grey-4 bg-[#f5f3ee]"} ${className}`}
		>
			<Image
				size={28}
				strokeWidth={1.2}
				className={dark ? "text-cream/20" : "text-grey-3/50"}
			/>
			<span
				className={`font-mono text-[11px] tracking-[0.02em] ${dark ? "text-cream/25" : "text-grey-3"}`}
			>
				{label}
			</span>
		</div>
	);
}

/* ─── data ─── */

const modules = [
	{
		id: "MAIL",
		name: "Inbox",
		status: "LIVE",
		desc: "Reads, triages, drafts. 14 need you right now.",
	},
	{
		id: "CAL",
		name: "Schedule",
		status: "LIVE",
		desc: "5 tomorrow. 2 conflicts resolved while you slept.",
	},
	{
		id: "FIN",
		name: "Finances",
		status: "WATCHING",
		desc: "$4,821.07 liquid. Rent posted. No anomalies.",
	},
	{
		id: "PROJ",
		name: "Projects",
		status: "LIVE",
		desc: "3 in flight. Deadlines watched. Nothing slips.",
	},
	{
		id: "MSG",
		name: "Messages",
		status: "LIVE",
		desc: "2 threads need you. The rest, handled.",
	},
	{
		id: "TRVL",
		name: "Travel",
		status: "LIVE",
		desc: "Tokyo, Feb 18. Flights watched. Hotel confirmed.",
	},
	{
		id: "JRNL",
		name: "Journal",
		status: "READY",
		desc: "Prompt prepared. Waiting for your words.",
	},
	{
		id: "WELL",
		name: "Wellness",
		status: "TRACKING",
		desc: "7.2h sleep. 6,400 steps. You skipped lunch.",
	},
	{
		id: "NOTE",
		name: "Notes",
		status: "IDLE",
		desc: "12 captured this week. All searchable. None lost.",
	},
	{
		id: "FEED",
		name: "Feed",
		status: "IDLE",
		desc: "28 new items. Noise filtered. Signal kept.",
	},
];

const yourWeek = [
	{
		day: "Mon",
		title: "You connect your accounts.",
		body: "Email, calendar, banking. Wingmnn ingests 90 days of history and builds your first status report by midnight.",
	},
	{
		day: "Tue",
		title: "Your inbox gets lighter.",
		body: "Priority queue is live. Calendar conflicts flagged. You approve two auto-drafted replies — the rest are already handled.",
	},
	{
		day: "Wed",
		title: "You notice things surfacing.",
		body: "A subscription you forgot about. A flight price that dropped. A journal prompt at 9 PM that actually makes you pause.",
	},
	{
		day: "Thu",
		title: "Your week starts organizing itself.",
		body: "Project deadlines cross-referenced with your calendar. Two meetings reshuffled. A gentle nudge about sleep debt.",
	},
	{
		day: "Fri",
		title: "142 items become 7.",
		body: "Content filtered. Conversations summarized. A grocery list appears from the meal plan you half-mentioned on Tuesday.",
	},
	{
		day: "Sat",
		title: "It goes quiet.",
		body: "Low-intervention mode. Only urgent alerts. Trip itinerary finalized. Four voice notes transcribed without asking.",
	},
	{
		day: "Sun",
		title: "You get a weekly review you didn't write.",
		body: "Metrics compared. Next week pre-built from your patterns. The system is learning. You are doing less.",
	},
];

const chatConvo: {
	from: "you" | "wm";
	text: string;
	mode?: "typed" | "voice";
	remember?: boolean;
}[] = [
	{
		from: "you",
		text: "hey, I just got an email from my landlord about the lease renewal. what should I do?",
		mode: "typed",
	},
	{
		from: "wm",
		text: "I see it — they're offering a 2-year renewal at $2,850/mo, an 8% increase. Based on your budget and 3 comparable units nearby, I'd push back to $2,650. Want me to draft a response?",
	},
	{
		from: "you",
		text: "yeah do that, and remind me to call them if I don't hear back by friday",
		mode: "voice",
	},
	{
		from: "wm",
		text: "Done. Draft sent to your review queue. Reminder set for Friday at 10am — right after your standup so it doesn't interrupt.",
	},
	{
		from: "you",
		text: "oh and from now on, whenever I get emails from my landlord, flag them urgent",
		mode: "typed",
	},
	{
		from: "wm",
		text: "Got it, I'll remember that. All emails from Park Property Management will be flagged urgent and pinned going forward.",
		remember: true,
	},
];

const chatGroups = [
	{ label: "type it", start: 0, end: 2 },
	{ label: "say it", start: 2, end: 4 },
	{ label: "teach it", start: 4, end: 6 },
];

const notifItems = [
	{ icon: Mail, text: "3 unread", color: "#60a5fa", urgent: true },
	{ icon: Calendar, text: "Conflict", color: "#f97316", urgent: true },
	{ icon: CreditCard, text: "Due tomorrow", color: "#facc15", urgent: true },
	{ icon: Plane, text: "Price drop", color: "#22c55e", urgent: false },
	{ icon: MessageSquare, text: "2 DMs", color: "#a78bfa", urgent: false },
	{ icon: DollarSign, text: "$89 charge", color: "#f87171", urgent: true },
	{ icon: Calendar, text: "6 meetings", color: "#f97316", urgent: false },
	{ icon: Moon, text: "5.2h sleep", color: "#a78bfa", urgent: false },
	{ icon: Mail, text: "Invoice", color: "#60a5fa", urgent: false },
	{ icon: Bell, text: "Task overdue", color: "#f87171", urgent: true },
];

const orgGrid = [
	{ x: 0, y: 50 },
	{ x: 196, y: 50 },
	{ x: 0, y: 92 },
	{ x: 196, y: 92 },
	{ x: 0, y: 134 },
	{ x: 196, y: 134 },
	{ x: 0, y: 176 },
	{ x: 196, y: 176 },
	{ x: 0, y: 218 },
	{ x: 196, y: 218 },
];

const scatterOffsets = [
	{ x: 20, y: -40, r: -10 },
	{ x: 24, y: -45, r: 7 },
	{ x: 5, y: -22, r: -5 },
	{ x: 19, y: -27, r: 12 },
	{ x: 30, y: -4, r: -8 },
	{ x: 14, y: -9, r: 14 },
	{ x: 10, y: 19, r: -6 },
	{ x: 29, y: 14, r: 10 },
	{ x: 25, y: 42, r: -12 },
	{ x: 19, y: 42, r: 8 },
];

const faqItems = faqEntries;

/* ─── chat demo ─── */

function ChatDemo({ active }: { active: boolean }) {
	const [count, setCount] = useState(0);
	const [wmTyping, setWmTyping] = useState(false);
	const [inputText, setInputText] = useState("");
	const [inputMode, setInputMode] = useState<"idle" | "typing" | "voice">(
		"idle",
	);
	const messagesRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!active) return;
		const timers: number[] = [];
		const at = (ms: number, fn: () => void) => {
			timers.push(window.setTimeout(fn, ms));
		};
		const typeChars = (text: string, start: number) => {
			const per = Math.min(35, 1400 / text.length);
			for (let i = 1; i <= text.length; i++) {
				const s = text.slice(0, i);
				at(start + i * per, () => setInputText(s));
			}
			return start + text.length * per;
		};

		let t = 400;

		// msg 0: user types
		at(t, () => setInputMode("typing"));
		t = typeChars(chatConvo[0].text, t);
		t += 350;
		at(t, () => {
			setInputText("");
			setInputMode("idle");
			setCount(1);
		});
		t += 300;

		// msg 1: wm responds
		at(t, () => setWmTyping(true));
		t += 1200;
		at(t, () => {
			setWmTyping(false);
			setCount(2);
		});
		t += 500;

		// msg 2: user speaks (voice)
		at(t, () => setInputMode("voice"));
		t += 1800;
		at(t, () => {
			setInputMode("idle");
			setCount(3);
		});
		t += 300;

		// msg 3: wm responds
		at(t, () => setWmTyping(true));
		t += 1200;
		at(t, () => {
			setWmTyping(false);
			setCount(4);
		});
		t += 500;

		// msg 4: user types
		at(t, () => setInputMode("typing"));
		t = typeChars(chatConvo[4].text, t);
		t += 350;
		at(t, () => {
			setInputText("");
			setInputMode("idle");
			setCount(5);
		});
		t += 300;

		// msg 5: wm responds
		at(t, () => setWmTyping(true));
		t += 1200;
		at(t, () => {
			setWmTyping(false);
			setCount(6);
		});

		return () => timers.forEach(clearTimeout);
	}, [active]);

	useEffect(() => {
		const el = messagesRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [count, wmTyping]);

	return (
		<div className="w-[520px] h-[580px] max-[900px]:w-full max-[900px]:max-w-[520px] max-[900px]:h-[540px] max-[500px]:h-[480px] bg-ink rounded-2xl flex flex-col overflow-hidden border border-white/6 shadow-[0_24px_80px_rgba(0,0,0,0.12)]">
			<div className="flex items-center gap-2 py-3.5 px-5 shrink-0 border-b border-white/6">
				<div className="w-2 h-2 rounded-full bg-green-500" />
				<span className="font-display text-sm text-cream/70 tracking-[0.02em] lowercase">
					wingmnn
				</span>
				<span className="font-mono text-[10px] text-green-500/50 tracking-[0.02em]">
					online
				</span>
			</div>
			<div
				className="flex-1 overflow-y-auto px-5 scroll-smooth [&::-webkit-scrollbar]:w-0"
				ref={messagesRef}
			>
				<div className="min-h-full flex flex-col justify-end py-3">
					{chatGroups.map((g, gi) => {
						if (count < g.start + 1) return null;
						return (
							<div
								key={gi}
								className="flex flex-col gap-4 pb-1 animate-[cdFadeIn_0.3s_ease]"
							>
								<div className="font-mono text-[10px] font-medium text-cream/20 tracking-widest uppercase text-center pt-4 pb-1 animate-[cdFadeIn_0.4s_ease]">
									{g.label}
								</div>
								{chatConvo
									.slice(g.start, Math.min(count, g.end))
									.map((msg, i) => {
										const idx = g.start + i;
										const isYou = msg.from === "you";
										return (
											<div
												key={idx}
												className={`flex flex-col gap-1 animate-[cdMsgIn_0.4s_cubic-bezier(.22,1,.36,1)] ${isYou ? "items-end" : "items-start"}`}
											>
												<div className="flex items-center gap-1.5">
													<span
														className={`font-mono text-[10px] font-medium tracking-[0.06em] uppercase ${isYou ? "text-grey-3" : "text-accent-red/80"}`}
													>
														{isYou ? "You" : "Wingmnn"}
													</span>
													{msg.mode === "voice" && (
														<Mic size={11} className="text-grey-3" />
													)}
												</div>
												<p
													className={`font-serif text-[0.92rem] leading-[1.7] m-0 max-w-[420px] py-3 px-4 rounded-xl ${isYou ? "bg-[#2a2a2a] text-[#e0ddd6] rounded-br-sm" : "bg-[#1e1e1e] text-[#c8c4bc] rounded-bl-sm"} ${msg.remember ? "border border-green-500/15" : ""}`}
												>
													{msg.text}
												</p>
												{msg.remember && (
													<span className="font-mono text-[10px] text-green-500/60 tracking-[0.02em] mt-1">
														Preference saved
													</span>
												)}
											</div>
										);
									})}
							</div>
						);
					})}
					{wmTyping && (
						<div className="flex flex-col gap-1 items-start animate-[cdFadeIn_0.3s_ease]">
							<span className="font-mono text-[10px] font-medium tracking-[0.06em] uppercase text-accent-red/80">
								Wingmnn
							</span>
							<div className="flex gap-[5px] py-3.5 px-[18px] bg-[#1e1e1e] rounded-xl rounded-bl-sm">
								<span className="w-1.5 h-1.5 rounded-full bg-cream/25 animate-[cdBounce_1.2s_infinite_ease-in-out]" />
								<span className="w-1.5 h-1.5 rounded-full bg-cream/25 animate-[cdBounce_1.2s_infinite_ease-in-out] [animation-delay:0.15s]" />
								<span className="w-1.5 h-1.5 rounded-full bg-cream/25 animate-[cdBounce_1.2s_infinite_ease-in-out] [animation-delay:0.3s]" />
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="flex items-end justify-between gap-3 py-3.5 px-5 shrink-0 border-t border-white/6 bg-white/2">
				{inputMode === "voice" ? (
					<>
						<div className="flex items-center gap-2.5">
							<span className="w-2 h-2 rounded-full bg-accent-red animate-[cdPulse_1s_ease-in-out_infinite]" />
							<span className="font-mono text-xs leading-normal text-cream/40 tracking-[0.01em]">
								Listening...
							</span>
						</div>
						<Mic size={16} className="text-accent-red shrink-0 mb-px" />
					</>
				) : inputMode === "typing" ? (
					<>
						<span className="font-mono text-xs leading-normal text-cream/70 tracking-[0.01em] flex-1 min-w-0 wrap-break-word">
							{inputText}
							<span className="inline-block w-[1.5px] h-3.5 bg-cream/50 ml-px shrink-0 animate-[cdBlink_0.7s_step-end_infinite]" />
						</span>
						<Mic size={16} className="text-cream/15 shrink-0 mb-px" />
					</>
				) : (
					<>
						<span className="font-mono text-xs leading-normal text-cream/20 tracking-[0.01em]">
							Message wingmnn...
						</span>
						<Mic size={16} className="text-cream/15 shrink-0 mb-px" />
					</>
				)}
			</div>
		</div>
	);
}

/* ─── component ─── */

function HomePage() {
	const { ref: chatRef, vis: chatVis } = useReveal(0.1);
	const { ref: modRef, vis: modVis } = useReveal(0.05);
	const { ref: weekRef, vis: weekVis } = useReveal(0.05);
	const { ref: promRef, vis: promVis } = useReveal(0.1);
	const { ref: trustRef, vis: trustVis } = useReveal(0.1);
	const { ref: numRef, vis: numVis } = useReveal(0.1);
	const { ref: faqRef, vis: faqVis } = useReveal(0.05);

	const [email, setEmail] = useState("");
	const [formErr, setFormErr] = useState("");
	const [submitted, setSubmitted] = useState(false);
	const [openFaq, setOpenFaq] = useState<number | null>(null);

	const waitlist = useCounter(2847, 1600, numVis);

	const [visibleNotifs, setVisibleNotifs] = useState(0);
	const [phase, setPhase] = useState<
		"scatter" | "organize" | "merge" | "summary" | "done"
	>("scatter");
	useEffect(() => {
		if (phase === "scatter") {
			if (visibleNotifs < notifItems.length) {
				const delay = visibleNotifs === 0 ? 500 : 280 + Math.random() * 200;
				const timer = setTimeout(() => setVisibleNotifs((c) => c + 1), delay);
				return () => clearTimeout(timer);
			}
			const timer = setTimeout(() => setPhase("organize"), 1000);
			return () => clearTimeout(timer);
		}
		if (phase === "organize") {
			const timer = setTimeout(() => setPhase("merge"), 1800);
			return () => clearTimeout(timer);
		}
		if (phase === "merge") {
			const timer = setTimeout(() => setPhase("summary"), 1000);
			return () => clearTimeout(timer);
		}
		if (phase === "summary") {
			const timer = setTimeout(() => setPhase("done"), 1000);
			return () => clearTimeout(timer);
		}
	}, [phase, visibleNotifs]);

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
			{/* ── S1: hero ── */}
			<section
				id="top"
				className="min-h-screen flex flex-col justify-center items-center bg-ink relative overflow-hidden pt-20 max-[500px]:pt-[60px] px-(--page-px)"
			>
				<div className="grid grid-cols-2 max-[900px]:grid-cols-1 gap-12 max-[900px]:gap-8 max-w-[1200px] w-full mt-auto mx-auto items-center relative z-1">
					<div className="text-left max-[900px]:text-center">
						<p className="font-mono text-xs text-accent-red tracking-[0.08em] mb-7 uppercase">
							Your partner-in-crime
						</p>
						<h1 className="font-display text-[clamp(4rem,10vw,8rem)] leading-[0.88] text-cream mb-7 tracking-[0.02em] lowercase max-[900px]:text-center">
							wingmnn
						</h1>
						<p className="font-serif text-[clamp(1.05rem,1.5vw,1.2rem)] leading-[1.8] text-cream/50 max-w-[520px] mb-10 max-[900px]:mx-auto">
							One intelligence across your email, calendar, finances, travel,
							projects, and wellness — it learns how you operate, then operates
							for you.
						</p>
						<Link
							to="/early-access"
							className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark hover:-translate-y-px"
						>
							Get early access <ArrowRight size={16} />
						</Link>
					</div>
					<div className="flex justify-end items-center max-[900px]:justify-center">
						<div className="nf-stage relative w-[380px] h-[420px] max-[900px]:w-[340px] max-[900px]:h-[380px] max-[500px]:w-[300px] max-[500px]:h-[360px] max-[500px]:scale-[0.88] max-[500px]:origin-top">
							{phase !== "scatter" && (
								<div className="absolute top-1 left-0 z-20 flex items-center animate-[nfFadeUp_0.5s_cubic-bezier(.22,1,.36,1)]">
									<CheckCircle
										size={16}
										className={`text-green-500 shrink-0 overflow-hidden [transition:max-width_0.5s_cubic-bezier(.22,1,.36,1),opacity_0.4s_ease,margin-right_0.5s_cubic-bezier(.22,1,.36,1)] ${phase === "done" ? "max-w-6 opacity-100 mr-2" : "max-w-0 opacity-0 mr-0"}`}
									/>
									<span
										className={`font-display text-[16px] tracking-[0.02em] lowercase transition-colors duration-400 ${phase === "done" ? "text-cream/75" : "text-cream/50"} ${phase === "merge" ? "animate-[nfAbsorb_0.8s_ease]" : ""}`}
									>
										wingmnn
									</span>
									{phase === "done" && (
										<span className="font-mono text-[10px] text-green-500/60 tracking-[0.02em] ml-2 animate-[nfFadeUp_0.4s_ease_0.15s_both]">
											all caught up
										</span>
									)}
								</div>
							)}
							{notifItems.slice(0, visibleNotifs).map((n, i) => {
								const Icon = n.icon;
								return (
									<div
										key={i}
										className={`nf-pill${phase === "organize" ? " nf-pill--org" : ""}${phase === "merge" || phase === "summary" || phase === "done" ? " nf-pill--merge" : ""}`}
										style={
											{
												"--ox": `${orgGrid[i].x}px`,
												"--oy": `${orgGrid[i].y}px`,
												"--dx": `${scatterOffsets[i].x}px`,
												"--dy": `${scatterOffsets[i].y}px`,
												"--dr": `${scatterOffsets[i].r}deg`,
												"--i": i,
												zIndex: i + 1,
											} as React.CSSProperties
										}
									>
										<Icon size={14} color={n.color} />
										<span className="font-mono text-[11px] text-cream/70 tracking-[0.01em]">
											{n.text}
										</span>
										{n.urgent && (
											<span className="w-1.5 h-1.5 rounded-full bg-accent-red shrink-0 shadow-[0_0_6px_rgba(192,57,43,0.5)]" />
										)}
									</div>
								);
							})}
							{(phase === "summary" || phase === "done") && (
								<div className="absolute z-15 top-9 left-0 right-0 bg-white/4 border border-white/7 rounded-xl p-5 origin-top-left animate-[nfSummaryIn_0.7s_cubic-bezier(.22,1,.36,1)]">
									<div className="font-mono text-[10px] font-semibold text-cream/35 tracking-[0.06em] uppercase mb-4">
										Today&apos;s briefing
									</div>
									<div className="flex flex-col gap-2.5">
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<Mail size={13} className="text-cream/30 shrink-0" />
											<div className="flex flex-1 items-center justify-between">
												3 boss emails
												<em className="not-italic self-end text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded">
													reply drafted
												</em>
											</div>
										</div>
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<Calendar size={13} className="text-cream/30 shrink-0" />
											<div className="flex flex-1 items-center justify-between">
												Dentist conflicts with flight
												<em className="not-italic text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded">
													rescheduled
												</em>
											</div>
										</div>
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<CreditCard
												size={13}
												className="text-cream/30 shrink-0"
											/>
											<div className="flex flex-1 items-center justify-between">
												Card payment
												<em className="not-italic text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded">
													auto-scheduled
												</em>
											</div>
										</div>
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<Plane size={13} className="text-cream/30 shrink-0" />
											<div className="flex flex-1 items-center justify-between">
												NYC&rarr;TYO dropped $180
												<em className="not-italic text-green-400/90 bg-green-500/10 px-1.5 py-0.5 rounded">
													price locked
												</em>
											</div>
										</div>
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<DollarSign
												size={13}
												className="text-cream/30 shrink-0"
											/>
											<div className="flex flex-1 items-center justify-between">
												$89 Amex charge
												<em className="not-italic text-red-400/90 bg-red-500/10 px-1.5 py-0.5 rounded">
													flagged for review
												</em>
											</div>
										</div>
										<div className="nf-summary-row flex items-center gap-2.5 font-body text-[12.5px] leading-[1.4] text-cream/60">
											<Bell size={13} className="text-cream/30 shrink-0" />
											<div className="flex flex-1 items-center justify-between">
												Overdue task
												<em className="not-italic text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded">
													reminder sent
												</em>
											</div>
										</div>
									</div>
									<div className="h-px bg-white/6 my-3.5" />
									<div className="font-mono text-[10px] font-semibold text-cream/30 tracking-[0.06em] uppercase mb-2.5">
										Actions ready
									</div>
									<div className="flex flex-col gap-2">
										<div className="nf-summary-action flex items-center gap-2 font-mono text-[11px] text-cream/60 bg-white/3 px-2.5 py-1.5 rounded-md border border-white/5">
											<ArrowRight
												size={11}
												className="text-accent-amber shrink-0"
											/>
											<span>Review and send 3 drafted replies</span>
										</div>
										<div className="nf-summary-action flex items-center gap-2 font-mono text-[11px] text-cream/60 bg-white/3 px-2.5 py-1.5 rounded-md border border-white/5">
											<ArrowRight
												size={11}
												className="text-accent-amber shrink-0"
											/>
											<span>Confirm dentist moved to Feb 25</span>
										</div>
										<div className="nf-summary-action flex items-center gap-2 font-mono text-[11px] text-cream/60 bg-white/3 px-2.5 py-1.5 rounded-md border border-white/5">
											<ArrowRight
												size={11}
												className="text-accent-amber shrink-0"
											/>
											<span>Approve or dispute $89 charge</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="hero-ticker-wrap w-screen mt-auto pt-16 max-[500px]:pt-12 overflow-hidden relative mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
					<div className="flex gap-6 whitespace-nowrap pb-7 animate-[tickerScroll_40s_linear_infinite]">
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								MAIL
							</span>{" "}
							3 drafts auto-written, awaiting review
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-blue-500/15 text-blue-400">
								CAL
							</span>{" "}
							Dentist rescheduled — conflict with Tokyo flight
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-yellow-400/15 text-yellow-400">
								FIN
							</span>{" "}
							Rent posted, $4,821 liquid, no anomalies
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-blue-500/15 text-blue-400">
								PROJ
							</span>{" "}
							Acme deadline in 3 days — on track
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-violet-400/15 text-violet-400">
								WELL
							</span>{" "}
							7.2h sleep, 6,400 steps, lunch skipped
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								TRVL
							</span>{" "}
							NRT→JFK confirmed, boarding pass stored
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-white/8 text-cream/40">
								JRNL
							</span>{" "}
							Evening prompt ready
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								MSG
							</span>{" "}
							2 threads need you, 11 handled
						</div>
						{/* duplicate set for seamless loop */}
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								MAIL
							</span>{" "}
							3 drafts auto-written, awaiting review
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-blue-500/15 text-blue-400">
								CAL
							</span>{" "}
							Dentist rescheduled — conflict with Tokyo flight
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-yellow-400/15 text-yellow-400">
								FIN
							</span>{" "}
							Rent posted, $4,821 liquid, no anomalies
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-blue-500/15 text-blue-400">
								PROJ
							</span>{" "}
							Acme deadline in 3 days — on track
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-violet-400/15 text-violet-400">
								WELL
							</span>{" "}
							7.2h sleep, 6,400 steps, lunch skipped
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								TRVL
							</span>{" "}
							NRT→JFK confirmed, boarding pass stored
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-white/8 text-cream/40">
								JRNL
							</span>{" "}
							Evening prompt ready
						</div>
						<div className="inline-flex items-center gap-2.5 font-mono text-xs text-cream/35 shrink-0 tracking-[0.01em]">
							<span className="text-[9px] font-semibold py-0.5 px-[7px] rounded-sm tracking-[0.04em] bg-green-500/15 text-green-500">
								MSG
							</span>{" "}
							2 threads need you, 11 handled
						</div>
					</div>
				</div>
			</section>

			{/* ── Product screenshot placeholder ── */}
			<section className="py-[60px] px-(--page-px) border-t border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<ImagePlaceholder
						label="Product screenshot — dashboard overview"
						className="h-[400px] w-full"
					/>
				</div>
			</section>

			{/* ── S2: the feeling ── */}
			<section
				aria-label="The problem you already know"
				className="py-[100px] px-(--page-px) border-t border-grey-4"
			>
				<div className="max-w-[1200px] mx-auto grid grid-cols-[280px_1fr] max-md:grid-cols-1 gap-[60px] max-md:gap-5">
					<div>
						<p className="font-mono text-[11px] font-medium text-grey-3 tracking-[0.04em] sticky top-[120px] max-md:static">
							The problem you already know
						</p>
					</div>
					<div>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5 max-w-[600px]">
							Ten apps. Twenty tabs. A hundred notifications a day. Your mail
							doesn't talk to your calendar. Your calendar doesn't know about
							your flights. Your finances live in a spreadsheet you last opened
							in March.
						</p>
						<p className="font-serif text-[clamp(1.1rem,1.5vw,1.3rem)] leading-[1.85] text-grey-1 mb-5 max-w-[600px]">
							You are the integration layer for your own life.
						</p>
						<p className="font-serif text-[clamp(1.2rem,1.6vw,1.4rem)] leading-[1.85] text-ink font-semibold max-w-[600px]">
							Nobody else is going to fix that.
						</p>
					</div>
				</div>
			</section>

			{/* ── S3: conversation preview ── */}
			<section className="py-[100px] px-(--page-px) border-t border-grey-4">
				<div
					ref={chatRef}
					className="max-w-[1200px] mx-auto grid grid-cols-[1fr_520px] max-[900px]:grid-cols-1 gap-16 max-[900px]:gap-10 items-center"
				>
					<div>
						<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
							What it actually feels like
						</p>
						<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink">
							Interact with it like
							<br />a person.
						</h2>
						<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[440px] mt-4">
							No commands to memorize. No menus to navigate. Just say what you
							need — by typing, speaking, or showing it once how you want things
							done.
						</p>
						<div className="flex flex-col gap-7 mt-11">
							<div className="flex gap-4 items-start">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] min-w-6 pt-0.5">
									01
								</span>
								<div>
									<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-1">
										Type it
									</h3>
									<p className="font-serif text-[0.9rem] leading-[1.7] text-grey-2 max-w-[380px]">
										Ask questions, give instructions, think out loud. Wingmnn
										understands intent, not keywords — so you never have to
										learn a syntax.
									</p>
								</div>
							</div>
							<div className="flex gap-4 items-start">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] min-w-6 pt-0.5">
									02
								</span>
								<div>
									<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-1">
										Say it
									</h3>
									<p className="font-serif text-[0.9rem] leading-[1.7] text-grey-2 max-w-[380px]">
										Voice-first on mobile. Talk to it like you'd talk to a
										person sitting next to you. It transcribes, understands
										context, and acts.
									</p>
								</div>
							</div>
							<div className="flex gap-4 items-start">
								<span className="font-mono text-[11px] font-semibold text-accent-red tracking-[0.02em] min-w-6 pt-0.5">
									03
								</span>
								<div>
									<h3 className="font-serif font-semibold text-[1.05rem] text-ink mb-1">
										Teach it
									</h3>
									<p className="font-serif text-[0.9rem] leading-[1.7] text-grey-2 max-w-[380px]">
										Show it how you like things done — once. Your preferences
										are saved and applied automatically from that point forward.
										It gets sharper the more you use it.
									</p>
								</div>
							</div>
						</div>
					</div>
					<div>
						<ChatDemo active={chatVis} />
					</div>
				</div>
			</section>

			{/* ── S4: modules ── */}
			<section
				id="modules"
				className="py-[100px] px-(--page-px) border-t border-grey-4"
			>
				<div className="max-w-[1200px] mx-auto mb-12">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						10 modules, one brain
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink">
						Everything it keeps
						<br />
						track of for you.
					</h2>
				</div>
				<div
					ref={modRef}
					className="max-w-[1200px] mx-auto grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-px bg-grey-4 border border-grey-4"
				>
					{modules.map((m, i) => {
						const s = m.status.toLowerCase();
						const badgeColor =
							s === "live"
								? "bg-green-500 text-[#052e16]"
								: s === "watching" || s === "tracking"
									? "bg-yellow-400 text-[#422006]"
									: "bg-[#e5e2dc] text-[#666]";
						return (
							<div
								key={m.id}
								className={`bg-cream p-6 transition-[opacity,transform,background-color] duration-300 ease-out hover:bg-[#eeebe4] ${modVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}
								style={{ transitionDelay: `${i * 0.04}s` }}
							>
								<div className="flex items-center justify-between mb-2.5">
									<span className="font-mono text-[10px] font-semibold text-grey-3 tracking-[0.06em]">
										{m.id}
									</span>
									<span
										className={`font-mono text-[9px] font-semibold py-0.5 px-2 tracking-[0.04em] ${badgeColor}`}
									>
										{m.status}
									</span>
								</div>
								<h3 className="font-serif font-semibold text-[1.15rem] text-ink mb-1.5">
									{m.name}
								</h3>
								<p className="font-serif text-[0.88rem] leading-[1.65] text-grey-2">
									{m.desc}
								</p>
							</div>
						);
					})}
				</div>
			</section>

			{/* ── S5: your first week ── */}
			<section
				id="how"
				className="py-[100px] px-(--page-px) border-t border-grey-4 bg-ink text-cream"
			>
				<div className="max-w-[1200px] mx-auto mb-14">
					<p className="font-mono text-[11px] text-accent-red/70 tracking-[0.04em] mb-3">
						Your first week
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-cream">
						By Sunday, you'll wonder
						<br />
						how you lived without it.
					</h2>
				</div>
				<div ref={weekRef} className="max-w-[1200px] mx-auto grid grid-cols-1">
					{yourWeek.map((d, i) => (
						<div
							key={d.day}
							className={`grid grid-cols-[80px_1fr] max-sm:grid-cols-1 gap-8 max-sm:gap-1.5 py-7 border-b border-white/7 last:border-b-0 transition-[opacity,transform] duration-350 ease-out ${weekVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}
							style={{ transitionDelay: `${i * 0.06}s` }}
						>
							<div className="font-mono text-xs font-medium text-accent-red tracking-[0.04em] pt-[3px]">
								{d.day}
							</div>
							<div>
								<h3 className="font-serif font-semibold text-[1.1rem] text-cream mb-1.5">
									{d.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.7] text-cream/55">
									{d.body}
								</p>
							</div>
						</div>
					))}
				</div>
				<div className="max-w-[1200px] mx-auto mt-14 grid grid-cols-2 max-md:grid-cols-1 gap-6">
					<ImagePlaceholder
						label="Lifestyle photo — person using Wingmnn"
						className="h-[280px]"
						dark
					/>
					<ImagePlaceholder
						label="Product screenshot — weekly review"
						className="h-[280px]"
						dark
					/>
				</div>
			</section>

			{/* ── S6: promise ── */}
			<section className="py-[120px] px-(--page-px) border-t border-grey-4">
				<div
					ref={promRef}
					className={`max-w-[700px] mx-auto text-center transition-[opacity,transform] duration-600 ease-out ${promVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
				>
					<h2 className="font-serif font-bold text-[clamp(1.8rem,3.5vw,2.8rem)] leading-[1.3] text-ink mb-7">
						Your data is yours.
						<br />
						<span className="text-grey-2 font-normal">
							We don't train on it. We don't sell it. We don't share it.
						</span>
					</h2>
					<p className="font-serif text-base leading-[1.85] text-grey-2">
						Encrypted at rest. Encrypted in transit. Granular permissions per
						module. Revoke anything, anytime. Export everything. Delete your
						account in one click and it's actually gone. Our business model is
						your subscription — that alignment is by design.
					</p>
				</div>
			</section>

			{/* ── S7: platforms ── */}
			<section className="px-(--page-px) pb-[100px]">
				<div
					ref={trustRef}
					className="max-w-[1200px] mx-auto grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4"
				>
					{[
						{
							name: "Web",
							desc: "Full interface in your browser. No install required.",
							tag: "At launch",
							live: true,
						},
						{
							name: "Mobile",
							desc: "iOS & Android. Voice-first. Push notifications.",
							tag: "At launch",
							live: true,
						},
						{
							name: "API",
							desc: "Build on your twin. REST endpoints for every module.",
							tag: "Coming Q3",
							live: false,
						},
					].map((p, i) => (
						<div
							key={p.name}
							className={`bg-cream py-8 px-7 flex flex-col transition-[opacity,transform] duration-400 ease-out ${trustVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1.5"}`}
							style={{ transitionDelay: `${i * 0.06}s` }}
						>
							<h3 className="font-serif font-bold text-[1.3rem] text-ink mb-2">
								{p.name}
							</h3>
							<p className="font-serif text-[0.9rem] leading-[1.65] text-grey-2 flex-1 mb-4">
								{p.desc}
							</p>
							<span
								className={`font-mono text-[10px] font-semibold tracking-[0.04em] py-[3px] px-2.5 self-start ${p.live ? "bg-green-500 text-[#052e16]" : "bg-grey-4 text-grey-2"}`}
							>
								{p.tag}
							</span>
						</div>
					))}
				</div>
				<div className="max-w-[1200px] mx-auto mt-10 grid grid-cols-3 max-md:grid-cols-1 gap-6">
					<ImagePlaceholder label="Desktop mockup" className="h-[240px]" />
					<ImagePlaceholder label="iPhone mockup" className="h-[240px]" />
					<ImagePlaceholder label="Android mockup" className="h-[240px]" />
				</div>
			</section>

			{/* ── S8: numbers ── */}
			<section
				aria-label="Wingmnn by the numbers"
				className="py-20 px-(--page-px) border-t border-grey-4 text-center"
			>
				<div
					ref={numRef}
					className={`max-w-[800px] mx-auto mb-6 grid grid-cols-3 gap-10 transition-[opacity,transform] duration-500 ease-out ${numVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
				>
					<div>
						<div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-ink leading-none">
							{numVis ? waitlist.toLocaleString() : "0"}
						</div>
						<div className="font-mono text-[11px] text-grey-3 mt-2 tracking-[0.02em]">
							on the waitlist
						</div>
					</div>
					<div>
						<div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-ink leading-none">
							10
						</div>
						<div className="font-mono text-[11px] text-grey-3 mt-2 tracking-[0.02em]">
							modules at launch
						</div>
					</div>
					<div>
						<div className="font-display text-[clamp(2.5rem,5vw,4rem)] text-ink leading-none">
							99.9%
						</div>
						<div className="font-mono text-[11px] text-grey-3 mt-2 tracking-[0.02em]">
							uptime target
						</div>
					</div>
				</div>
				<p className="font-mono text-[11px] text-grey-3 tracking-[0.03em]">
					Built in Brooklyn. Backed by operators, not observers.
				</p>
			</section>

			{/* ── S9: FAQ ── */}
			<section className="py-[100px] px-(--page-px) border-t border-grey-4">
				<div className="max-w-[1200px] mx-auto mb-10">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Questions
					</p>
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink">
						Things people ask us.
					</h2>
				</div>
				<div ref={faqRef} className="max-w-[720px] mx-auto">
					{faqItems.map((item, i) => {
						const open = openFaq === i;
						return (
							<div
								key={i}
								className={`border-b border-grey-4 last:border-b-0 transition-[opacity,transform] duration-300 ease-out ${faqVis ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
								style={{ transitionDelay: `${i * 0.04}s` }}
							>
								<button
									type="button"
									className="w-full flex items-center justify-between gap-4 py-5 bg-transparent border-none cursor-pointer text-left font-inherit group"
									onClick={() => setOpenFaq(open ? null : i)}
									aria-expanded={open}
								>
									<span className="font-serif text-[1.05rem] font-semibold text-grey-1 transition-colors duration-150 group-hover:text-ink">
										{item.q}
									</span>
									<Plus
										size={18}
										className={`shrink-0 text-grey-3 transition-[transform,color] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "rotate-45 text-accent-red" : ""}`}
									/>
								</button>
								<div
									className={`overflow-hidden transition-[max-height] duration-400 ease-[cubic-bezier(.22,1,.36,1)] ${open ? "max-h-[300px]" : "max-h-0"}`}
								>
									<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 pb-5">
										{item.a}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* ── Brand illustration placeholder ── */}
			<section className="py-[80px] px-(--page-px) bg-ink">
				<div className="max-w-[1200px] mx-auto">
					<ImagePlaceholder
						label="Brand illustration — bringing it all together"
						className="h-[300px] w-full"
						dark
					/>
				</div>
			</section>

			{/* ── S10: CTA ── */}
			<section id="join" className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					{submitted ? (
						<div className="py-5">
							<h2 className="font-serif font-bold text-[2.5rem] text-cream mb-3">
								You're in.
							</h2>
							<p className="font-serif text-[1.05rem] leading-[1.7] text-cream/50">
								We'll let you know when your account is ready.
							</p>
						</div>
					) : (
						<>
							<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
								Stop managing your life
								<br />
								and start living it.
							</h2>
							<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
								Early access is rolling out now. Drop your email and we'll let
								you know when it's your turn.
							</p>
							<form
								onSubmit={handleSubmit}
								className="flex max-[500px]:flex-col gap-0 max-[500px]:gap-2.5 max-w-[480px] mx-auto items-center md:items-start"
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
		</main>
	);
}
