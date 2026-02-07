import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Bell,
	Calendar,
	CheckCircle,
	CreditCard,
	DollarSign,
	Mail,
	MessageSquare,
	Mic,
	Moon,
	Plane,
	Plus,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/")({ component: HomePage });

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

function useScrolled(px: number) {
	const [past, setPast] = useState(false);
	useEffect(() => {
		const h = () => setPast(window.scrollY > px);
		h();
		window.addEventListener("scroll", h, { passive: true });
		return () => window.removeEventListener("scroll", h);
	}, [px]);
	return past;
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

const faqItems = [
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
		q: 'What does "digital twin" actually mean?',
		a: "A persistent model of your preferences, patterns, and priorities. Not a chatbot you re-explain things to. Wingmnn remembers context and acts on your behalf — like a chief of staff who's been with you for years.",
	},
	{
		q: "How much does it cost?",
		a: "Pricing announced at launch. Straightforward monthly subscription. No per-module fees, no usage caps. The business model is your subscription, not your data.",
	},
];

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
		<div className="cd-window">
			<div className="cd-header">
				<div className="cd-header-dot" />
				<span className="cd-header-name">wingmnn</span>
				<span className="cd-header-status">online</span>
			</div>
			<div className="cd-messages" ref={messagesRef}>
				<div className="cd-messages-inner">
					{chatGroups.map((g, gi) => {
						if (count < g.start + 1) return null;
						return (
							<div key={gi} className="cd-group">
								<div className="cd-cap">{g.label}</div>
								{chatConvo
									.slice(g.start, Math.min(count, g.end))
									.map((msg, i) => {
										const idx = g.start + i;
										return (
											<div
												key={idx}
												className={`cd-msg cd-msg--${msg.from}${msg.remember ? " cd-msg--remember" : ""}`}
											>
												<div className="cd-meta">
													<span className="cd-who">
														{msg.from === "you" ? "You" : "Wingmnn"}
													</span>
													{msg.mode === "voice" && (
														<Mic size={11} className="cd-mode-icon" />
													)}
												</div>
												<p className="cd-text">{msg.text}</p>
												{msg.remember && (
													<span className="cd-remember-tag">
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
						<div className="cd-msg cd-msg--wm cd-typing-row">
							<span className="cd-who">Wingmnn</span>
							<div className="cd-typing">
								<span className="cd-dot" />
								<span className="cd-dot" />
								<span className="cd-dot" />
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="cd-input-bar">
				{inputMode === "voice" ? (
					<>
						<div className="cd-voice-ind">
							<span className="cd-voice-dot" />
							<span className="cd-voice-label">Listening...</span>
						</div>
						<Mic size={16} className="cd-input-mic cd-input-mic--active" />
					</>
				) : inputMode === "typing" ? (
					<>
						<span className="cd-input-text">
							{inputText}
							<span className="cd-cursor" />
						</span>
						<Mic size={16} className="cd-input-mic" />
					</>
				) : (
					<>
						<span className="cd-input-placeholder">Message wingmnn...</span>
						<Mic size={16} className="cd-input-mic" />
					</>
				)}
			</div>
		</div>
	);
}

/* ─── component ─── */

function HomePage() {
	const showNav = useScrolled(400);

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
			<style>{styles}</style>

			{/* ── nav ── */}
			<nav className={`nav ${showNav ? "nav--show" : ""}`}>
				<div className="nav-inner">
					<a href="#top" className="nav-logo">
						wingmnn
					</a>
					<div className="nav-right">
						<a href="#how" className="nav-link hide-mobile">
							How it works
						</a>
						<a href="#modules" className="nav-link hide-mobile">
							Modules
						</a>
						<a href="#join" className="nav-cta">
							Get early access
						</a>
					</div>
				</div>
			</nav>

			{/* ── S1: hero ── */}
			<section id="top" className="hero">
				<div className="hero-content">
					<div className="hero-left">
						<p className="hero-kicker">Your digital twin</p>
						<h1 className="hero-h1">wingmnn</h1>
						<p className="hero-sub">
							One intelligence across your email, calendar, finances, travel,
							projects, and wellness — it learns how you operate, then operates
							for you.
						</p>
						<a
							href="#join"
							className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark hover:-translate-y-px"
						>
							Get early access <ArrowRight size={16} />
						</a>
					</div>
					<div className="hero-right">
						<div className={`nf-stage nf-stage--${phase}`}>
							{phase !== "scatter" && (
								<div
									className={`nf-wm${phase === "merge" ? " nf-wm--absorb" : ""}${phase === "done" ? " nf-wm--done" : ""}`}
								>
									<CheckCircle size={16} className="nf-wm-check" />
									<span className="nf-wm-text">wingmnn</span>
									{phase === "done" && (
										<span className="nf-wm-status">all caught up</span>
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
										<span className="nf-pill-text">{n.text}</span>
										{n.urgent && <span className="nf-pill-dot" />}
									</div>
								);
							})}
							{(phase === "summary" || phase === "done") && (
								<div className="nf-summary">
									<div className="nf-summary-head">Today&apos;s briefing</div>
									<div className="nf-summary-items">
										<div className="nf-summary-row">
											<Mail size={13} className="nf-si" />
											<span>
												3 boss emails &mdash; <em>reply drafted</em>
											</span>
										</div>
										<div className="nf-summary-row">
											<Calendar size={13} className="nf-si" />
											<span>
												Dentist conflicts with flight &mdash;{" "}
												<em>rescheduled</em>
											</span>
										</div>
										<div className="nf-summary-row">
											<CreditCard size={13} className="nf-si" />
											<span>
												Card payment &mdash; <em>auto-scheduled</em>
											</span>
										</div>
										<div className="nf-summary-row">
											<Plane size={13} className="nf-si" />
											<span>
												NYC&rarr;TYO dropped $180 &mdash; <em>price locked</em>
											</span>
										</div>
										<div className="nf-summary-row">
											<DollarSign size={13} className="nf-si" />
											<span>
												$89 Amex charge &mdash; <em>flagged for review</em>
											</span>
										</div>
										<div className="nf-summary-row">
											<Bell size={13} className="nf-si" />
											<span>
												Overdue task &mdash; <em>reminder sent</em>
											</span>
										</div>
									</div>
									<div className="nf-summary-divider" />
									<div className="nf-summary-actions-head">Actions ready</div>
									<div className="nf-summary-actions">
										<div className="nf-summary-action">
											<ArrowRight size={11} />
											<span>Review and send 3 drafted replies</span>
										</div>
										<div className="nf-summary-action">
											<ArrowRight size={11} />
											<span>Confirm dentist moved to Feb 25</span>
										</div>
										<div className="nf-summary-action">
											<ArrowRight size={11} />
											<span>Approve or dispute $89 charge</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
				<div className="hero-ticker-wrap">
					<div className="hero-ticker">
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">MAIL</span> 3
							drafts auto-written, awaiting review
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--blue">CAL</span>{" "}
							Dentist rescheduled — conflict with Tokyo flight
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--yellow">FIN</span>{" "}
							Rent posted, $4,821 liquid, no anomalies
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--blue">PROJ</span>{" "}
							Acme deadline in 3 days — on track
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--purple">WELL</span>{" "}
							7.2h sleep, 6,400 steps, lunch skipped
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">TRVL</span>{" "}
							NRT→JFK confirmed, boarding pass stored
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--grey">JRNL</span>{" "}
							Evening prompt ready
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">MSG</span> 2
							threads need you, 11 handled
						</div>
						{/* duplicate set for seamless loop */}
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">MAIL</span> 3
							drafts auto-written, awaiting review
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--blue">CAL</span>{" "}
							Dentist rescheduled — conflict with Tokyo flight
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--yellow">FIN</span>{" "}
							Rent posted, $4,821 liquid, no anomalies
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--blue">PROJ</span>{" "}
							Acme deadline in 3 days — on track
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--purple">WELL</span>{" "}
							7.2h sleep, 6,400 steps, lunch skipped
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">TRVL</span>{" "}
							NRT→JFK confirmed, boarding pass stored
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--grey">JRNL</span>{" "}
							Evening prompt ready
						</div>
						<div className="hero-tick">
							<span className="hero-tick-tag hero-tick-tag--green">MSG</span> 2
							threads need you, 11 handled
						</div>
					</div>
				</div>
			</section>

			{/* ── S2: the feeling ── */}
			<section className="feel">
				<div className="feel-inner">
					<div className="feel-left">
						<p className="feel-label">The problem you already know</p>
					</div>
					<div className="feel-right">
						<p className="feel-text">
							Ten apps. Twenty tabs. A hundred notifications a day. Your mail
							doesn't talk to your calendar. Your calendar doesn't know about
							your flights. Your finances live in a spreadsheet you last opened
							in March.
						</p>
						<p className="feel-text">
							You are the integration layer for your own life.
						</p>
						<p className="feel-text feel-text--bold">
							Nobody else is going to fix that.
						</p>
					</div>
				</div>
			</section>

			{/* ── S3: conversation preview ── */}
			<section className="chat-section">
				<div ref={chatRef} className="chat-layout">
					<div className="chat-left">
						<p className="section-label">What it actually feels like</p>
						<h2 className="section-h2">
							Interact with it like
							<br />a person.
						</h2>
						<p className="chat-sub">
							No commands to memorize. No menus to navigate. Just say what you
							need — by typing, speaking, or showing it once how you want things
							done.
						</p>
						<div className="chat-feats">
							<div className="chat-feat">
								<span className="chat-feat-num">01</span>
								<div>
									<h4 className="chat-feat-title">Type it</h4>
									<p className="chat-feat-desc">
										Ask questions, give instructions, think out loud. Wingmnn
										understands intent, not keywords — so you never have to
										learn a syntax.
									</p>
								</div>
							</div>
							<div className="chat-feat">
								<span className="chat-feat-num">02</span>
								<div>
									<h4 className="chat-feat-title">Say it</h4>
									<p className="chat-feat-desc">
										Voice-first on mobile. Talk to it like you'd talk to a
										person sitting next to you. It transcribes, understands
										context, and acts.
									</p>
								</div>
							</div>
							<div className="chat-feat">
								<span className="chat-feat-num">03</span>
								<div>
									<h4 className="chat-feat-title">Teach it</h4>
									<p className="chat-feat-desc">
										Show it how you like things done — once. Your preferences
										are saved and applied automatically from that point forward.
										It gets sharper the more you use it.
									</p>
								</div>
							</div>
						</div>
					</div>
					<div className="chat-right">
						<ChatDemo active={chatVis} />
					</div>
				</div>
			</section>

			{/* ── S4: modules ── */}
			<section id="modules" className="mod-section">
				<div className="mod-header">
					<p className="section-label">10 modules, one brain</p>
					<h2 className="section-h2">
						Everything it keeps
						<br />
						track of for you.
					</h2>
				</div>
				<div ref={modRef} className={`mod-grid ${modVis ? "vis" : ""}`}>
					{modules.map((m, i) => (
						<div
							key={m.id}
							className="mod-card"
							style={{ transitionDelay: `${i * 0.04}s` }}
						>
							<div className="mod-top">
								<span className="mod-id">{m.id}</span>
								<span
									className={`mod-badge mod-badge--${m.status.toLowerCase()}`}
								>
									{m.status}
								</span>
							</div>
							<h3 className="mod-name">{m.name}</h3>
							<p className="mod-desc">{m.desc}</p>
						</div>
					))}
				</div>
			</section>

			{/* ── S5: your first week ── */}
			<section id="how" className="week-section">
				<div className="week-header">
					<p className="section-label">Your first week</p>
					<h2 className="section-h2">
						By Sunday, you'll wonder
						<br />
						how you lived without it.
					</h2>
				</div>
				<div ref={weekRef} className={`week-list ${weekVis ? "vis" : ""}`}>
					{yourWeek.map((d, i) => (
						<div
							key={d.day}
							className="week-row"
							style={{ transitionDelay: `${i * 0.06}s` }}
						>
							<div className="week-day">{d.day}</div>
							<div className="week-content">
								<h3 className="week-title">{d.title}</h3>
								<p className="week-body">{d.body}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* ── S6: promise ── */}
			<section className="promise">
				<div ref={promRef} className={`promise-inner ${promVis ? "vis" : ""}`}>
					<h2 className="promise-h2">
						Your data is yours.
						<br />
						<span className="promise-dim">
							We don't train on it. We don't sell it. We don't share it.
						</span>
					</h2>
					<p className="promise-body">
						Encrypted at rest. Encrypted in transit. Granular permissions per
						module. Revoke anything, anytime. Export everything. Delete your
						account in one click and it's actually gone. Our business model is
						your subscription — that alignment is by design.
					</p>
				</div>
			</section>

			{/* ── S7: platforms ── */}
			<section className="plat-section">
				<div ref={trustRef} className={`plat-grid ${trustVis ? "vis" : ""}`}>
					<div className="plat-card">
						<h3 className="plat-name">Web</h3>
						<p className="plat-desc">
							Full interface in your browser. No install required.
						</p>
						<span className="plat-tag plat-tag--live">At launch</span>
					</div>
					<div className="plat-card">
						<h3 className="plat-name">Mobile</h3>
						<p className="plat-desc">
							iOS &amp; Android. Voice-first. Push notifications.
						</p>
						<span className="plat-tag plat-tag--live">At launch</span>
					</div>
					<div className="plat-card">
						<h3 className="plat-name">API</h3>
						<p className="plat-desc">
							Build on your twin. REST endpoints for every module.
						</p>
						<span className="plat-tag plat-tag--soon">Coming Q3</span>
					</div>
				</div>
			</section>

			{/* ── S8: numbers ── */}
			<section className="nums-section">
				<div ref={numRef} className={`nums-inner ${numVis ? "vis" : ""}`}>
					<div className="num-block">
						<div className="num-val">
							{numVis ? waitlist.toLocaleString() : "0"}
						</div>
						<div className="num-label">on the waitlist</div>
					</div>
					<div className="num-block">
						<div className="num-val">10</div>
						<div className="num-label">modules at launch</div>
					</div>
					<div className="num-block">
						<div className="num-val">99.9%</div>
						<div className="num-label">uptime target</div>
					</div>
				</div>
				<p className="nums-note">
					Built in Brooklyn. Backed by operators, not observers.
				</p>
			</section>

			{/* ── S9: FAQ ── */}
			<section className="faq-section">
				<div className="faq-header">
					<p className="section-label">Questions</p>
					<h2 className="section-h2">Things people ask us.</h2>
				</div>
				<div ref={faqRef} className={`faq-list ${faqVis ? "vis" : ""}`}>
					{faqItems.map((item, i) => {
						const open = openFaq === i;
						return (
							<div
								key={i}
								className="faq-item"
								style={{ transitionDelay: `${i * 0.04}s` }}
							>
								<button
									type="button"
									className="faq-trigger"
									onClick={() => setOpenFaq(open ? null : i)}
									aria-expanded={open}
								>
									<span className="faq-q">{item.q}</span>
									<Plus
										size={18}
										className={`faq-icon ${open ? "faq-icon--open" : ""}`}
									/>
								</button>
								<div className={`faq-body ${open ? "faq-body--open" : ""}`}>
									<p className="faq-a">{item.a}</p>
								</div>
							</div>
						);
					})}
				</div>
			</section>

			{/* ── S10: CTA ── */}
			<section id="join" className="cta-section">
				<div className="cta-inner">
					{submitted ? (
						<div className="cta-done">
							<h2 className="cta-done-h">You're in.</h2>
							<p className="cta-done-sub">
								We'll let you know when your account is ready.
							</p>
						</div>
					) : (
						<>
							<h2 className="cta-h2">
								Stop managing your life
								<br />
								and start living it.
							</h2>
							<p className="cta-sub">
								Early access is rolling out now. Drop your email and we'll let
								you know when it's your turn.
							</p>
							<form onSubmit={handleSubmit} className="cta-form" noValidate>
								<div className="cta-input-wrap">
									<input
										type="email"
										placeholder="you@email.com"
										className={`cta-input ${formErr ? "cta-input--err" : ""}`}
										value={email}
										onChange={(e) => {
											setEmail(e.target.value);
											if (formErr) setFormErr("");
										}}
									/>
									{formErr && <span className="cta-err">{formErr}</span>}
								</div>
								<button type="submit" className="cta-btn">
									Get early access <ArrowRight size={15} />
								</button>
							</form>
						</>
					)}
				</div>
			</section>

			{/* ── footer ── */}
			<footer className="foot">
				<div className="foot-top">
					<div className="foot-brand">
						<div className="foot-logo">wingmnn</div>
						<p className="foot-tagline">
							A single intelligence that learns how you operate — then operates
							for you. Built with care in Brooklyn, NY.
						</p>
					</div>
					<div className="foot-nav">
						<div className="foot-col">
							<h4 className="foot-heading">Product</h4>
							<a href="#how" className="foot-link">
								How it works
							</a>
							<a href="#modules" className="foot-link">
								Modules
							</a>
							<a href="#join" className="foot-link">
								Get early access
							</a>
						</div>
						<div className="foot-col">
							<h4 className="foot-heading">Company</h4>
							<span className="foot-link">About</span>
							<span className="foot-link">Blog</span>
							<span className="foot-link">Careers</span>
						</div>
						<div className="foot-col">
							<h4 className="foot-heading">Connect</h4>
							<span className="foot-link">Twitter</span>
							<span className="foot-link">LinkedIn</span>
							<span className="foot-link">hello@wingmnn.com</span>
						</div>
					</div>
				</div>
				<div className="foot-bottom">
					<span>&copy; {new Date().getFullYear()} Wingmnn Systems Inc.</span>
					<div className="foot-legal">
						<span className="foot-link-sm">Privacy</span>
						<span className="foot-link-sm">Terms</span>
					</div>
				</div>
			</footer>
		</main>
	);
}

/* ─── styles ─── */

const styles = /* css */ `
:root {
	--cream: #f4f1eb;
	--ink: #1a1a1a;
	--red: #c0392b;
	--red-dark: #a33225;
	--grey-1: #444;
	--grey-2: #777;
	--grey-3: #aaa;
	--grey-4: #d4d0c8;
	--mono: 'IBM Plex Mono', monospace;
	--serif: 'Source Serif 4', Georgia, serif;
	--display: 'Anton', sans-serif;
	--page-px: clamp(24px, 5vw, 80px);
}

/* ── nav ── */
.nav {
	position: fixed; top: 0; left: 0; right: 0; z-index: 100;
	background: rgba(244,241,235,0.92);
	backdrop-filter: blur(12px);
	-webkit-backdrop-filter: blur(12px);
	border-bottom: 1px solid var(--grey-4);
	transform: translateY(-100%); opacity: 0;
	transition: transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.3s ease;
	pointer-events: none;
}
.nav--show { transform: translateY(0); opacity: 1; pointer-events: auto; }
.nav-inner {
	max-width: 1200px; margin: 0 auto; padding: 0 var(--page-px);
	display: flex; align-items: center; justify-content: space-between; height: 52px;
}
.nav-logo {
	font-family: var(--display); font-size: 1.15rem; color: var(--ink);
	text-decoration: none; letter-spacing: 0.03em; text-transform: lowercase;
}
.nav-right { display: flex; align-items: center; gap: 28px; }
.nav-link {
	font-family: var(--mono); font-size: 11px; color: var(--grey-2);
	text-decoration: none; letter-spacing: 0.02em;
	transition: color 0.15s;
}
.nav-link:hover { color: var(--ink); }
.nav-cta {
	font-family: var(--mono); font-size: 11px; font-weight: 600;
	color: #fff; background: var(--ink); padding: 7px 18px;
	text-decoration: none; border-radius: 4px; transition: background 0.15s;
}
.nav-cta:hover { background: #333; }
@media (max-width: 640px) {
	.hide-mobile { display: none; }
}

/* ── hero ── */
.hero {
	min-height: 100vh; display: flex; flex-direction: column;
	justify-content: center; align-items: center;
	background: var(--ink); position: relative; overflow: hidden;
	padding: 80px var(--page-px) 0;
}
.hero-content {
	display: grid; grid-template-columns: 1fr 1fr; gap: 48px;
	max-width: 1200px; width: 100%; margin: auto auto 0;
	align-items: center; position: relative; z-index: 1;
}
.hero-kicker {
	font-family: var(--mono); font-size: 12px; color: var(--red);
	letter-spacing: 0.08em; margin-bottom: 28px;
	text-transform: uppercase;
}
.hero-h1 {
	font-family: var(--display);
	font-size: clamp(4rem, 10vw, 8rem); line-height: 0.88;
	color: var(--cream); margin: 0 0 28px;
	letter-spacing: 0.02em; text-transform: lowercase;
}
.hero-sub {
	font-family: var(--serif); font-size: clamp(1.05rem, 1.5vw, 1.2rem);
	line-height: 1.8; color: rgba(244,241,235,0.5);
	max-width: 520px; margin: 0 0 40px;
}
.hero-btn {
	display: inline-flex; align-items: center; gap: 10px;
	font-family: var(--mono); font-size: 13px; font-weight: 600;
	color: #fff; background: var(--red); padding: 14px 28px;
	text-decoration: none; border-radius: 5px;
	transition: background 0.2s, transform 0.15s;
}
.hero-btn:hover { background: var(--red-dark); transform: translateY(-1px); }

/* notification scatter → organize → summary */
.hero-left { text-align: left; }
.hero-right { display: flex; justify-content: flex-end; align-items: center; }

.nf-stage { position: relative; width: 380px; height: 420px; }

/* wingmnn label */
.nf-wm {
	position: absolute; top: 4px; left: 0; z-index: 20;
	display: flex; align-items: center;
	animation: nfFadeUp 0.5s cubic-bezier(.22,1,.36,1);
}
.nf-wm-text {
	font-family: var(--display); font-size: 16px;
	color: rgba(244,241,235,0.5); letter-spacing: 0.02em;
	text-transform: lowercase; transition: color 0.4s ease;
}
.nf-wm--done .nf-wm-text { color: rgba(244,241,235,0.75); }
.nf-wm--absorb .nf-wm-text {
	animation: nfAbsorb 0.8s ease;
}
.nf-wm-check {
	color: #22c55e; flex-shrink: 0; overflow: hidden;
	max-width: 0; opacity: 0; margin-right: 0;
	transition: max-width 0.5s cubic-bezier(.22,1,.36,1),
	            opacity 0.4s ease,
	            margin-right 0.5s cubic-bezier(.22,1,.36,1);
}
.nf-wm--done .nf-wm-check {
	max-width: 24px; opacity: 1; margin-right: 8px;
}
.nf-wm-status {
	font-family: var(--mono); font-size: 10px;
	color: rgba(34,197,94,0.6); letter-spacing: 0.02em;
	margin-left: 8px;
	animation: nfFadeUp 0.4s ease 0.15s both;
}

/* notification pills */
.nf-pill {
	position: absolute;
	left: var(--ox); top: var(--oy);
	transform: translate(var(--dx), var(--dy)) rotate(var(--dr));
	display: inline-flex; align-items: center; gap: 8px;
	padding: 8px 14px;
	background: rgba(255,255,255,0.07);
	backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
	border-radius: 20px;
	border: 1px solid rgba(255,255,255,0.1);
	box-shadow: 0 4px 16px rgba(0,0,0,0.3);
	white-space: nowrap;
	animation: nfPopIn 0.3s cubic-bezier(.34,1.56,.64,1);
	transition: transform 0.8s cubic-bezier(.22,1,.36,1),
	            opacity 0.5s ease,
	            box-shadow 0.6s ease;
}
.nf-pill--org {
	transform: translate(0, 0) rotate(0deg);
	box-shadow: 0 1px 6px rgba(0,0,0,0.15);
}
.nf-pill--merge {
	transform: translate(calc(40px - var(--ox)), calc(10px - var(--oy))) scale(0);
	opacity: 0; pointer-events: none;
	transition: transform 0.7s cubic-bezier(.6, 0, .1, 1) calc(var(--i) * 40ms),
	            opacity 0.35s ease calc(var(--i) * 40ms + 120ms);
}
.nf-pill-text {
	font-family: var(--mono); font-size: 11px;
	color: rgba(244,241,235,0.7); letter-spacing: 0.01em;
}
.nf-pill-dot {
	width: 6px; height: 6px; border-radius: 50%;
	background: var(--red); flex-shrink: 0;
	box-shadow: 0 0 6px rgba(192,57,43,0.5);
}

/* summary card */
.nf-summary {
	position: absolute; z-index: 15;
	top: 36px; left: 0; right: 0;
	background: rgba(255,255,255,0.04);
	border: 1px solid rgba(255,255,255,0.07);
	border-radius: 12px; padding: 20px;
	transform-origin: top left;
	animation: nfSummaryIn 0.7s cubic-bezier(.22,1,.36,1);
}
.nf-summary-head {
	font-family: var(--mono); font-size: 10px; font-weight: 600;
	color: rgba(244,241,235,0.35); letter-spacing: 0.06em;
	text-transform: uppercase; margin-bottom: 16px;
}
.nf-summary-items { display: flex; flex-direction: column; gap: 10px; }
.nf-summary-row {
	display: flex; align-items: center; gap: 10px;
	font-family: var(--serif); font-size: 12.5px; line-height: 1.4;
	color: rgba(244,241,235,0.6);
	animation: nfRowIn 0.4s ease both;
}
.nf-summary-row:nth-child(1) { animation-delay: 0.1s; }
.nf-summary-row:nth-child(2) { animation-delay: 0.16s; }
.nf-summary-row:nth-child(3) { animation-delay: 0.22s; }
.nf-summary-row:nth-child(4) { animation-delay: 0.28s; }
.nf-summary-row:nth-child(5) { animation-delay: 0.34s; }
.nf-summary-row:nth-child(6) { animation-delay: 0.4s; }
.nf-summary-row em { font-style: normal; color: rgba(34,197,94,0.7); }
.nf-si { color: rgba(244,241,235,0.3); flex-shrink: 0; }
.nf-summary-divider {
	height: 1px; background: rgba(255,255,255,0.06); margin: 14px 0;
}
.nf-summary-actions-head {
	font-family: var(--mono); font-size: 10px; font-weight: 600;
	color: rgba(244,241,235,0.3); letter-spacing: 0.06em;
	text-transform: uppercase; margin-bottom: 10px;
}
.nf-summary-actions { display: flex; flex-direction: column; gap: 8px; }
.nf-summary-action {
	display: flex; align-items: center; gap: 8px;
	font-family: var(--mono); font-size: 11px;
	color: rgba(244,241,235,0.45);
	animation: nfRowIn 0.4s ease both;
}
.nf-summary-action:nth-child(1) { animation-delay: 0.48s; }
.nf-summary-action:nth-child(2) { animation-delay: 0.56s; }
.nf-summary-action:nth-child(3) { animation-delay: 0.64s; }
.nf-summary-action svg { color: var(--red); flex-shrink: 0; }

/* animations */
@keyframes nfPopIn { from { opacity: 0; scale: 0.7; } to { opacity: 1; scale: 1; } }
@keyframes nfFadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes nfAbsorb {
	0% { text-shadow: 0 0 0 transparent; transform: scale(1); }
	40% { text-shadow: 0 0 28px rgba(244,241,235,0.35); transform: scale(1.1); }
	100% { text-shadow: 0 0 0 transparent; transform: scale(1); }
}
@keyframes nfSummaryIn { from { opacity: 0; transform: translateY(-16px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes nfRowIn { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }

/* activity ticker */
.hero-ticker-wrap {
	width: 100vw; margin-top: auto; padding-top: 64px;
	overflow: hidden; position: relative;
	mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
	-webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}
.hero-ticker {
	display: flex; gap: 24px; white-space: nowrap;
	animation: tickerScroll 40s linear infinite;
	padding-bottom: 28px;
}
@keyframes tickerScroll {
	from { transform: translateX(0); }
	to { transform: translateX(-50%); }
}
.hero-tick {
	display: inline-flex; align-items: center; gap: 10px;
	font-family: var(--mono); font-size: 12px;
	color: rgba(244,241,235,0.35); flex-shrink: 0;
	letter-spacing: 0.01em;
}
.hero-tick-tag {
	font-size: 9px; font-weight: 600; padding: 2px 7px;
	border-radius: 3px; letter-spacing: 0.04em;
}
.hero-tick-tag--green { background: rgba(34,197,94,0.15); color: #22c55e; }
.hero-tick-tag--blue { background: rgba(59,130,246,0.15); color: #60a5fa; }
.hero-tick-tag--yellow { background: rgba(250,204,21,0.15); color: #facc15; }
.hero-tick-tag--purple { background: rgba(167,139,250,0.15); color: #a78bfa; }
.hero-tick-tag--grey { background: rgba(255,255,255,0.08); color: rgba(244,241,235,0.4); }

@media (max-width: 900px) {
	.hero-content { grid-template-columns: 1fr; gap: 32px; }
	.hero-left { text-align: center; }
	.hero-h1 { text-align: center; }
	.hero-sub { margin: 0 auto 40px; }
	.hero-btn { margin: 0 auto; }
	.hero-right { justify-content: center; }
	.nf-stage { width: 340px; height: 380px; }
}
@media (max-width: 500px) {
	.hero { padding-top: 60px; }
	.hero-ticker-wrap { padding-top: 48px; }
	.nf-stage { width: 300px; height: 360px; transform: scale(0.88); transform-origin: top center; }
}

/* ── feel (the problem) ── */
.feel {
	padding: 100px var(--page-px);
	border-top: 1px solid var(--grey-4);
}
.feel-inner {
	max-width: 1200px; margin: 0 auto;
	display: grid; grid-template-columns: 280px 1fr; gap: 60px;
}
.feel-label {
	font-family: var(--mono); font-size: 11px; font-weight: 500;
	color: var(--grey-3); letter-spacing: 0.04em;
	position: sticky; top: 120px;
}
.feel-text {
	font-family: var(--serif); font-size: clamp(1.1rem, 1.5vw, 1.3rem);
	line-height: 1.85; color: var(--grey-1); margin-bottom: 20px;
	max-width: 600px;
}
.feel-text:last-child { margin-bottom: 0; }
.feel-text--bold {
	font-weight: 600; color: var(--ink); font-size: clamp(1.2rem, 1.6vw, 1.4rem);
}
@media (max-width: 768px) {
	.feel-inner { grid-template-columns: 1fr; gap: 20px; }
	.feel-label { position: static; }
}

/* ── section headers (reusable) ── */
.section-label {
	font-family: var(--mono); font-size: 11px; color: var(--red);
	letter-spacing: 0.04em; margin-bottom: 12px;
}
.section-h2 {
	font-family: var(--serif); font-weight: 700;
	font-size: clamp(2rem, 4vw, 3.2rem); line-height: 1.15;
	color: var(--ink);
}

/* ── chat demo ── */
.chat-section {
	padding: 100px var(--page-px); border-top: 1px solid var(--grey-4);
}
.chat-layout {
	max-width: 1200px; margin: 0 auto;
	display: grid; grid-template-columns: 1fr 520px; gap: 64px;
	align-items: center;
}
.chat-left {}
.chat-sub {
	font-family: var(--serif); font-size: 1.05rem; line-height: 1.8;
	color: var(--grey-2); max-width: 440px; margin-top: 16px;
}

/* feature callouts */
.chat-feats {
	display: flex; flex-direction: column; gap: 28px;
	margin-top: 44px;
}
.chat-feat {
	display: flex; gap: 16px; align-items: flex-start;
}
.chat-feat-num {
	font-family: var(--mono); font-size: 11px; font-weight: 600;
	color: var(--red); letter-spacing: 0.02em;
	min-width: 24px; padding-top: 2px;
}
.chat-feat-title {
	font-family: var(--serif); font-weight: 600; font-size: 1.05rem;
	color: var(--ink); margin-bottom: 4px;
}
.chat-feat-desc {
	font-family: var(--serif); font-size: 0.9rem; line-height: 1.7;
	color: var(--grey-2); max-width: 380px;
}

/* chat window — fixed dimensions, no layout shift */
.chat-right {}
.cd-window {
	width: 520px; height: 580px;
	background: var(--ink); border-radius: 16px;
	display: flex; flex-direction: column;
	overflow: hidden;
	border: 1px solid rgba(255,255,255,0.06);
	box-shadow: 0 24px 80px rgba(0,0,0,0.12);
}
.cd-header {
	display: flex; align-items: center; gap: 8px;
	padding: 14px 20px; flex-shrink: 0;
	border-bottom: 1px solid rgba(255,255,255,0.06);
}
.cd-header-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background: #22c55e;
}
.cd-header-name {
	font-family: var(--display); font-size: 14px;
	color: rgba(244,241,235,0.7); letter-spacing: 0.02em;
	text-transform: lowercase;
}
.cd-header-status {
	font-family: var(--mono); font-size: 10px;
	color: rgba(34,197,94,0.5); letter-spacing: 0.02em;
}
.cd-messages {
	flex: 1; overflow-y: auto;
	padding: 0 20px;
	scroll-behavior: smooth;
}
.cd-messages::-webkit-scrollbar { width: 0; }
.cd-messages-inner {
	min-height: 100%;
	display: flex; flex-direction: column; justify-content: flex-end;
	padding: 12px 0;
}

.cd-group {
	display: flex; flex-direction: column; gap: 16px;
	padding-bottom: 4px;
	animation: cdFadeIn 0.3s ease;
}
.cd-cap {
	font-family: var(--mono); font-size: 10px; font-weight: 500;
	color: rgba(244,241,235,0.2); letter-spacing: 0.1em;
	text-transform: uppercase; text-align: center;
	padding: 16px 0 4px;
	animation: cdFadeIn 0.4s ease;
}

.cd-msg {
	display: flex; flex-direction: column; gap: 4px;
	animation: cdMsgIn 0.4s cubic-bezier(.22,1,.36,1);
}
.cd-msg--you { align-items: flex-end; }
.cd-msg--wm { align-items: flex-start; }

.cd-meta {
	display: flex; align-items: center; gap: 6px;
}
.cd-who {
	font-family: var(--mono); font-size: 10px; font-weight: 500;
	letter-spacing: 0.06em; text-transform: uppercase;
}
.cd-msg--you .cd-who { color: var(--grey-3); }
.cd-msg--wm .cd-who { color: var(--red); opacity: 0.8; }
.cd-mode-icon { color: var(--grey-3); }

.cd-text {
	font-family: var(--serif); font-size: 0.92rem; line-height: 1.7;
	margin: 0; max-width: 420px; padding: 12px 16px; border-radius: 12px;
}
.cd-msg--you .cd-text {
	background: #2a2a2a; color: #e0ddd6;
	border-bottom-right-radius: 4px;
}
.cd-msg--wm .cd-text {
	background: #1e1e1e; color: #c8c4bc;
	border-bottom-left-radius: 4px;
}
.cd-msg--remember .cd-text {
	border: 1px solid rgba(34,197,94,0.15);
}
.cd-remember-tag {
	font-family: var(--mono); font-size: 10px;
	color: rgba(34,197,94,0.6); letter-spacing: 0.02em;
	margin-top: 4px;
}

/* wm typing indicator */
.cd-typing-row { animation: cdFadeIn 0.3s ease; }
.cd-typing {
	display: flex; gap: 5px; padding: 14px 18px;
	background: #1e1e1e; border-radius: 12px;
	border-bottom-left-radius: 4px;
}
.cd-dot {
	width: 6px; height: 6px; border-radius: 50%;
	background: rgba(244,241,235,0.25);
	animation: cdBounce 1.2s infinite ease-in-out;
}
.cd-dot:nth-child(2) { animation-delay: 0.15s; }
.cd-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes cdBounce {
	0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
	30% { transform: translateY(-4px); opacity: 0.8; }
}
@keyframes cdMsgIn {
	from { opacity: 0; transform: translateY(8px); }
	to { opacity: 1; transform: translateY(0); }
}
@keyframes cdFadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

/* input bar */
.cd-input-bar {
	display: flex; align-items: flex-end; justify-content: space-between;
	gap: 12px;
	padding: 14px 20px; flex-shrink: 0;
	border-top: 1px solid rgba(255,255,255,0.06);
	background: rgba(255,255,255,0.02);
}
.cd-input-placeholder {
	font-family: var(--mono); font-size: 12px; line-height: 1.5;
	color: rgba(244,241,235,0.2); letter-spacing: 0.01em;
}
.cd-input-text {
	font-family: var(--mono); font-size: 12px; line-height: 1.5;
	color: rgba(244,241,235,0.7); letter-spacing: 0.01em;
	flex: 1; min-width: 0;
	word-break: break-word;
}
.cd-cursor {
	display: inline-block; width: 1.5px; height: 14px;
	background: rgba(244,241,235,0.5);
	margin-left: 1px; flex-shrink: 0;
	animation: cdBlink 0.7s step-end infinite;
}
@keyframes cdBlink {
	0%, 100% { opacity: 1; }
	50% { opacity: 0; }
}
.cd-input-mic { color: rgba(244,241,235,0.15); flex-shrink: 0; margin-bottom: 1px; }
.cd-input-mic--active { color: var(--red); }

/* voice recording indicator */
.cd-voice-ind {
	display: flex; align-items: center; gap: 10px;
}
.cd-voice-dot {
	width: 8px; height: 8px; border-radius: 50%;
	background: var(--red);
	animation: cdPulse 1s ease-in-out infinite;
}
.cd-voice-label {
	font-family: var(--mono); font-size: 12px; line-height: 1.5;
	color: rgba(244,241,235,0.4); letter-spacing: 0.01em;
}
@keyframes cdPulse {
	0%, 100% { opacity: 1; transform: scale(1); }
	50% { opacity: 0.4; transform: scale(1.3); }
}

/* responsive */
@media (max-width: 900px) {
	.chat-layout { grid-template-columns: 1fr; gap: 40px; }
	.cd-window { width: 100%; max-width: 520px; height: 540px; }
}
@media (max-width: 500px) {
	.cd-window { height: 480px; }
}

/* ── modules ── */
.mod-section {
	padding: 100px var(--page-px); border-top: 1px solid var(--grey-4);
}
.mod-header { max-width: 1200px; margin: 0 auto 48px; }
.mod-grid {
	max-width: 1200px; margin: 0 auto;
	display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
	gap: 1px; background: var(--grey-4);
	border: 1px solid var(--grey-4);
}
.mod-grid > * {
	opacity: 0; transform: translateY(6px);
	transition: opacity 0.3s ease, transform 0.3s ease;
}
.mod-grid.vis > * { opacity: 1; transform: translateY(0); }

.mod-card {
	background: var(--cream); padding: 24px;
	transition: background 0.15s;
}
.mod-card:hover { background: #eeebe4; }
.mod-top {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 10px;
}
.mod-id {
	font-family: var(--mono); font-size: 10px; font-weight: 600;
	color: var(--grey-3); letter-spacing: 0.06em;
}
.mod-badge {
	font-family: var(--mono); font-size: 9px; font-weight: 600;
	padding: 2px 8px; letter-spacing: 0.04em;
}
.mod-badge--live { background: #22c55e; color: #052e16; }
.mod-badge--watching { background: #facc15; color: #422006; }
.mod-badge--tracking { background: #facc15; color: #422006; }
.mod-badge--idle { background: #e5e2dc; color: #666; }
.mod-badge--ready { background: #e5e2dc; color: #666; }

.mod-name {
	font-family: var(--serif); font-weight: 600; font-size: 1.15rem;
	color: var(--ink); margin-bottom: 6px;
}
.mod-desc {
	font-family: var(--serif); font-size: 0.88rem; line-height: 1.65;
	color: var(--grey-2);
}

/* ── your first week ── */
.week-section {
	padding: 100px var(--page-px); border-top: 1px solid var(--grey-4);
	background: var(--ink); color: var(--cream);
}
.week-section .section-label { color: rgba(192,57,43,0.7); }
.week-section .section-h2 { color: var(--cream); }
.week-header { max-width: 1200px; margin: 0 auto 56px; }
.week-list {
	max-width: 1200px; margin: 0 auto;
	display: grid; grid-template-columns: 1fr; gap: 0;
}
.week-list > * {
	opacity: 0; transform: translateY(6px);
	transition: opacity 0.35s ease, transform 0.35s ease;
}
.week-list.vis > * { opacity: 1; transform: translateY(0); }

.week-row {
	display: grid; grid-template-columns: 80px 1fr; gap: 32px;
	padding: 28px 0; border-bottom: 1px solid rgba(255,255,255,0.07);
}
.week-row:last-child { border-bottom: none; }
.week-day {
	font-family: var(--mono); font-size: 12px; font-weight: 500;
	color: var(--red); letter-spacing: 0.04em; padding-top: 3px;
}
.week-title {
	font-family: var(--serif); font-weight: 600; font-size: 1.1rem;
	color: var(--cream); margin-bottom: 6px;
}
.week-body {
	font-family: var(--serif); font-size: 0.92rem; line-height: 1.7;
	color: rgba(244,241,235,0.55);
}
@media (max-width: 640px) {
	.week-row { grid-template-columns: 1fr; gap: 6px; }
}

/* ── promise (trust) ── */
.promise {
	padding: 120px var(--page-px);
	border-top: 1px solid var(--grey-4);
}
.promise-inner {
	max-width: 700px; margin: 0 auto; text-align: center;
	opacity: 0; transform: translateY(12px);
	transition: opacity 0.6s ease, transform 0.6s ease;
}
.promise-inner.vis { opacity: 1; transform: translateY(0); }
.promise-h2 {
	font-family: var(--serif); font-weight: 700;
	font-size: clamp(1.8rem, 3.5vw, 2.8rem); line-height: 1.3;
	color: var(--ink); margin-bottom: 28px;
}
.promise-dim { color: var(--grey-2); font-weight: 400; }
.promise-body {
	font-family: var(--serif); font-size: 1rem; line-height: 1.85;
	color: var(--grey-2);
}

/* ── platforms ── */
.plat-section {
	padding: 0 var(--page-px) 100px;
}
.plat-grid {
	max-width: 1200px; margin: 0 auto;
	display: grid; grid-template-columns: repeat(3, 1fr);
	gap: 1px; background: var(--grey-4); border: 1px solid var(--grey-4);
}
.plat-grid > * {
	opacity: 0; transform: translateY(6px);
	transition: opacity 0.4s ease, transform 0.4s ease;
}
.plat-grid.vis > * { opacity: 1; transform: translateY(0); }
.plat-grid.vis > *:nth-child(2) { transition-delay: 0.06s; }
.plat-grid.vis > *:nth-child(3) { transition-delay: 0.12s; }

.plat-card {
	background: var(--cream); padding: 32px 28px;
	display: flex; flex-direction: column;
}
.plat-name {
	font-family: var(--serif); font-weight: 700; font-size: 1.3rem;
	color: var(--ink); margin-bottom: 8px;
}
.plat-desc {
	font-family: var(--serif); font-size: 0.9rem; line-height: 1.65;
	color: var(--grey-2); flex: 1; margin-bottom: 16px;
}
.plat-tag {
	font-family: var(--mono); font-size: 10px; font-weight: 600;
	letter-spacing: 0.04em; padding: 3px 10px; align-self: flex-start;
}
.plat-tag--live { background: #22c55e; color: #052e16; }
.plat-tag--soon { background: var(--grey-4); color: var(--grey-2); }
@media (max-width: 768px) {
	.plat-grid { grid-template-columns: 1fr; }
}

/* ── numbers ── */
.nums-section {
	padding: 80px var(--page-px); border-top: 1px solid var(--grey-4);
	text-align: center;
}
.nums-inner {
	max-width: 800px; margin: 0 auto 24px;
	display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px;
	opacity: 0; transform: translateY(8px);
	transition: opacity 0.5s ease, transform 0.5s ease;
}
.nums-inner.vis { opacity: 1; transform: translateY(0); }

.num-val {
	font-family: var(--display); font-size: clamp(2.5rem, 5vw, 4rem);
	color: var(--ink); line-height: 1;
}
.num-label {
	font-family: var(--mono); font-size: 11px; color: var(--grey-3);
	margin-top: 8px; letter-spacing: 0.02em;
}
.nums-note {
	font-family: var(--mono); font-size: 11px; color: var(--grey-3);
	letter-spacing: 0.03em;
}

/* ── faq ── */
.faq-section {
	padding: 100px var(--page-px); border-top: 1px solid var(--grey-4);
}
.faq-header { max-width: 1200px; margin: 0 auto 40px; }
.faq-list {
	max-width: 720px; margin: 0 auto;
}
.faq-list > * {
	opacity: 0; transform: translateY(4px);
	transition: opacity 0.3s ease, transform 0.3s ease;
}
.faq-list.vis > * { opacity: 1; transform: translateY(0); }

.faq-item { border-bottom: 1px solid var(--grey-4); }
.faq-item:last-child { border-bottom: none; }
.faq-trigger {
	width: 100%; display: flex; align-items: center; justify-content: space-between;
	gap: 16px; padding: 20px 0; background: none; border: none;
	cursor: pointer; text-align: left; font-family: inherit;
}
.faq-trigger:hover .faq-q { color: var(--ink); }
.faq-q {
	font-family: var(--serif); font-size: 1.05rem; font-weight: 600;
	color: var(--grey-1); transition: color 0.15s;
}
.faq-icon {
	flex-shrink: 0; color: var(--grey-3);
	transition: transform 0.3s cubic-bezier(.22,1,.36,1), color 0.15s;
}
.faq-icon--open { transform: rotate(45deg); color: var(--red); }
.faq-body {
	max-height: 0; overflow: hidden;
	transition: max-height 0.4s cubic-bezier(.22,1,.36,1);
}
.faq-body--open { max-height: 300px; }
.faq-a {
	font-family: var(--serif); font-size: 0.92rem; line-height: 1.75;
	color: var(--grey-2); padding-bottom: 20px;
}

/* ── CTA ── */
.cta-section {
	padding: 120px var(--page-px);
	background: var(--ink);
}
.cta-inner { max-width: 620px; margin: 0 auto; text-align: center; }
.cta-h2 {
	font-family: var(--serif); font-weight: 700;
	font-size: clamp(2rem, 4vw, 3rem); line-height: 1.2;
	color: var(--cream); margin-bottom: 16px;
}
.cta-sub {
	font-family: var(--serif); font-size: 1rem; line-height: 1.7;
	color: rgba(244,241,235,0.5); margin-bottom: 36px;
}
.cta-form {
	display: flex; gap: 0; max-width: 480px; margin: 0 auto;
	align-items: flex-start;
}
.cta-input-wrap { flex: 1; display: flex; flex-direction: column; }
.cta-input {
	width: 100%; font-family: var(--mono); font-size: 13px;
	padding: 14px 18px; border: 1px solid #444; border-right: none;
	border-radius: 5px 0 0 5px; background: #2a2a2a; color: var(--cream);
	outline: none; transition: border-color 0.15s;
}
.cta-input::placeholder { color: #666; }
.cta-input:focus { border-color: var(--red); }
.cta-input--err { border-color: var(--red); }
.cta-err {
	font-family: var(--mono); font-size: 10px; color: var(--red);
	text-align: left; margin-top: 6px;
}
.cta-btn {
	display: inline-flex; align-items: center; gap: 8px;
	font-family: var(--mono); font-size: 12px; font-weight: 600;
	color: #fff; background: var(--red); padding: 14px 24px;
	border: 1px solid var(--red); border-radius: 0 5px 5px 0;
	cursor: pointer; transition: background 0.2s; white-space: nowrap;
}
.cta-btn:hover { background: var(--red-dark); }
@media (max-width: 500px) {
	.cta-form { flex-direction: column; gap: 10px; }
	.cta-input { border-right: 1px solid #444; border-radius: 5px; }
	.cta-btn { border-radius: 5px; justify-content: center; }
}

.cta-done { padding: 20px 0; }
.cta-done-h {
	font-family: var(--serif); font-weight: 700; font-size: 2.5rem;
	color: var(--cream); margin-bottom: 12px;
}
.cta-done-sub {
	font-family: var(--serif); font-size: 1.05rem; line-height: 1.7;
	color: rgba(244,241,235,0.5);
}

/* ── footer ── */
.foot {
	padding: 72px var(--page-px) 40px;
	background: var(--ink); color: var(--cream);
}
.foot-top {
	max-width: 1200px; margin: 0 auto 48px;
	display: grid; grid-template-columns: 1.4fr 1fr; gap: 80px;
	align-items: start;
}
.foot-brand { max-width: 380px; }
.foot-logo {
	font-family: var(--display); font-size: 1.8rem; color: var(--cream);
	letter-spacing: 0.03em; text-transform: lowercase; margin-bottom: 16px;
}
.foot-tagline {
	font-family: var(--serif); font-size: 1rem; line-height: 1.7;
	color: rgba(244,241,235,0.45);
}
.foot-nav {
	display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px;
}
.foot-heading {
	font-family: var(--mono); font-size: 11px; font-weight: 600;
	color: rgba(244,241,235,0.3); letter-spacing: 0.06em;
	text-transform: uppercase; margin-bottom: 16px;
}
.foot-link {
	display: block; font-family: var(--serif); font-size: 0.92rem;
	color: rgba(244,241,235,0.55); text-decoration: none;
	line-height: 2; cursor: pointer; transition: color 0.15s;
}
.foot-link:hover { color: var(--cream); }
.foot-bottom {
	max-width: 1200px; margin: 0 auto; padding-top: 24px;
	border-top: 1px solid rgba(255,255,255,0.08);
	font-family: var(--mono); font-size: 12px; color: rgba(244,241,235,0.25);
	display: flex; justify-content: space-between; align-items: center;
}
.foot-legal { display: flex; gap: 20px; }
.foot-link-sm {
	font-family: var(--mono); font-size: 12px;
	color: rgba(244,241,235,0.3); cursor: pointer;
	transition: color 0.15s;
}
.foot-link-sm:hover { color: rgba(244,241,235,0.6); }
@media (max-width: 768px) {
	.foot-top { grid-template-columns: 1fr; gap: 48px; }
	.foot-nav { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 500px) {
	.foot-nav { grid-template-columns: 1fr; gap: 32px; }
	.foot-bottom { flex-direction: column; gap: 12px; align-items: flex-start; }
}
`;
