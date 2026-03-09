import { MOTION_CONSTANTS } from "@/components/constant";
import { getIcon } from "@/components/onboarding/icons";
import { useDailyBriefing } from "@/hooks/use-ai";
import { useOnboardingProfile } from "@/hooks/use-onboarding";
import { authClient } from "@/lib/auth-client";
import { getActiveModules, MODULES } from "@/lib/onboarding-data";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/_app/")({
	component: Dashboard,
});

/* ── Helpers ── */

function getGreeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	if (h < 21) return "Good evening";
	return "Good night";
}

function useCurrentTime() {
	const [now, setNow] = useState(new Date());
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 10_000);
		return () => clearInterval(id);
	}, []);
	return now;
}

function getDayProgress(now: Date): number {
	const mins = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
	return Math.max(0, Math.min(1, (mins - 420) / 960));
}

/* ── Component ── */

function Dashboard() {
	const now = useCurrentTime();
	const { data: session } = authClient.useSession();
	const { data: profileData } = useOnboardingProfile();
	const { data: briefing, isPending: briefingLoading } = useDailyBriefing();

	const firstName = session?.user?.name?.split(" ")[0] ?? "";
	const enabledModules = profileData?.profile?.enabledModules ?? [];
	const activeModules = getActiveModules(enabledModules);

	const timeStr = now.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});

	const dateStr = now.toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	const events = briefing?.events ?? [];
	const overdueTasks = briefing?.overdueTasks ?? [];
	const todayTasks = briefing?.todayTasks ?? [];
	const unreadCount = briefing?.unreadCount ?? 0;
	const triageCount = briefing?.triageCount ?? 0;

	// Build dispatch items from real data
	const dispatchItems: { text: string; moduleKey: string; urgent?: boolean }[] =
		[];
	if (overdueTasks.length > 0) {
		for (const t of overdueTasks.slice(0, 3)) {
			dispatchItems.push({
				text: t.title,
				moduleKey: "task",
				urgent: true,
			});
		}
	}
	if (triageCount > 0) {
		dispatchItems.push({
			text: `${triageCount} email${triageCount > 1 ? "s" : ""} need${triageCount === 1 ? "s" : ""} attention`,
			moduleKey: "mail",
		});
	}
	if (todayTasks.length > 0) {
		for (const t of todayTasks.slice(0, 2)) {
			dispatchItems.push({ text: t.title, moduleKey: "task" });
		}
	}

	const visibleDispatch = dispatchItems.filter((a) =>
		enabledModules.includes(a.moduleKey),
	);

	// Build systems pulse from real data
	const systemsPulse: Record<
		string,
		{ status: string; signal: "good" | "warn" | "neutral" }
	> = {};
	if (enabledModules.includes("mail")) {
		systemsPulse.mail = {
			status: unreadCount > 0 ? `${unreadCount} unread` : "all clear",
			signal: triageCount > 0 ? "warn" : unreadCount > 0 ? "neutral" : "good",
		};
	}
	if (enabledModules.includes("cal")) {
		systemsPulse.cal = {
			status:
				events.length > 0
					? `${events.length} event${events.length > 1 ? "s" : ""} today`
					: "no events",
			signal: events.length > 3 ? "warn" : "neutral",
		};
	}
	if (enabledModules.includes("task")) {
		const totalDue = overdueTasks.length + todayTasks.length;
		systemsPulse.task = {
			status:
				overdueTasks.length > 0
					? `${overdueTasks.length} overdue`
					: todayTasks.length > 0
						? `${todayTasks.length} due today`
						: "on track",
			signal:
				overdueTasks.length > 0 ? "warn" : totalDue > 0 ? "neutral" : "good",
		};
	}

	const progress = getDayProgress(now);

	return (
		<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
			{/* ── Masthead ── */}
			<header className="dash-fade-up">
				<div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
					<span>{dateStr}</span>
					<span className="text-grey-3">·</span>
					<AnimatedClock timeStr={timeStr} />
				</div>
				<h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] text-foreground tracking-[0.01em] leading-[1.05] lowercase mt-1">
					{getGreeting()}, {firstName}.
				</h1>

				{/* AI briefing summary */}
				{briefing?.aiSummary && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.15,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="mt-4 flex items-start gap-2.5"
					>
						<Sparkles className="size-3.5 text-grey-3 shrink-0 mt-1" />
						<p className="font-serif text-[15px] text-foreground/70 italic leading-relaxed">
							{briefing.aiSummary}
						</p>
					</motion.div>
				)}

				{/* ─ Day progress rail ─ */}
				<div className="mt-8 relative">
					<div className="h-px bg-border w-full" />
					<div
						className="absolute top-0 left-0 h-px bg-foreground/30 transition-all duration-[2s] ease-linear"
						style={{ width: `${progress * 100}%` }}
					/>
					<div
						className="dash-day-dot absolute -top-[3px] size-[7px] rounded-full bg-accent-red transition-all duration-[2s] ease-linear"
						style={{ left: `${progress * 100}%` }}
					/>
				</div>
				<div className="flex justify-between font-mono text-[9px] text-grey-2 tracking-widest uppercase mt-1.5 select-none">
					<span>7 am</span>
					<span>11 pm</span>
				</div>
			</header>

			{/* ── Two-column briefing ── */}
			<div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-x-12 gap-y-10">
				{/* ─── Main column ─── */}
				<div className="min-w-0 space-y-10">
					{/* ── Next ── */}
					{events.length > 0 && (
						<section
							className="dash-fade-up"
							style={{ animationDelay: "100ms" }}
						>
							<SectionRule label="Next" />
							<div className="mt-4 pl-0.5">
								<span className="font-mono text-[13px] text-accent-red tracking-[0.02em]">
									{events[0].time}
								</span>
								<h2 className="font-display text-[clamp(1.25rem,2.5vw,1.75rem)] text-foreground leading-tight mt-1 lowercase">
									{events[0].title}
								</h2>
								{events[0].detail && (
									<p className="font-mono text-[12px] text-grey-2 mt-1 tracking-[0.02em]">
										{events[0].detail}
									</p>
								)}
							</div>
						</section>
					)}

					{/* ── Dispatch ── */}
					<section className="dash-fade-up" style={{ animationDelay: "200ms" }}>
						<SectionRule
							label="Dispatch"
							count={
								visibleDispatch.length > 0 ? visibleDispatch.length : undefined
							}
						/>
						{briefingLoading ? (
							<div className="mt-4 space-y-3 animate-pulse">
								<div className="h-4 w-64 bg-secondary/30 rounded" />
								<div className="h-4 w-48 bg-secondary/25 rounded" />
								<div className="h-4 w-56 bg-secondary/20 rounded" />
							</div>
						) : visibleDispatch.length > 0 ? (
							<ol className="mt-4">
								{visibleDispatch.map((action, i) => {
									const code = MODULES.find(
										(m) => m.key === action.moduleKey,
									)?.code;
									return (
										<li
											key={`${action.moduleKey}-${action.text}`}
											className="group flex items-baseline gap-4 py-3 border-b border-border/25 last:border-0 cursor-default hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors duration-150"
										>
											<span className="font-mono text-[11px] text-grey-2 tabular-nums w-5 text-right shrink-0">
												{String(i + 1).padStart(2, "0")}
											</span>
											<span className="font-body text-[15px] text-foreground tracking-[0.01em] flex-1 leading-snug">
												{action.urgent && (
													<span className="inline-block size-1.5 rounded-full bg-accent-red mr-2 relative -top-px" />
												)}
												{action.text}
											</span>
											{code && (
												<span className="font-mono text-[10px] text-grey-2 tracking-widest uppercase shrink-0 group-hover:text-muted-foreground transition-colors duration-150">
													{code}
												</span>
											)}
										</li>
									);
								})}
							</ol>
						) : (
							<p className="mt-4 font-serif text-[15px] text-grey-2 italic">
								Nothing to act on — you're clear.
							</p>
						)}
					</section>

					{/* ── Today's schedule ── */}
					{events.length > 0 && (
						<section
							className="dash-fade-up"
							style={{ animationDelay: "300ms" }}
						>
							<SectionRule label="Today" />
							<div className="mt-4 relative">
								{/* Vertical connector line */}
								<div className="absolute left-[61px] top-2 bottom-2 w-px bg-border/50" />
								{events.map((event) => (
									<div
										key={`${event.time}-${event.title}`}
										className="relative flex items-baseline gap-4 py-2"
									>
										<span className="font-mono text-[12px] text-grey-2 tabular-nums w-10 text-right shrink-0">
											{event.time}
										</span>
										{/* Timeline dot */}
										<span className="relative z-10 shrink-0 size-3 rounded-full bg-background flex items-center justify-center">
											<span className="size-[5px] rounded-full bg-foreground" />
										</span>
										<div className="flex-1 min-w-0">
											<span className="font-body text-[14px] tracking-[0.01em] leading-snug text-foreground">
												{event.title}
											</span>
											{event.detail && (
												<span className="font-mono text-[11px] text-grey-3 ml-2">
													{event.detail}
												</span>
											)}
										</div>
									</div>
								))}
							</div>
						</section>
					)}
				</div>

				{/* ─── Sidebar: Systems board ─── */}
				{activeModules.length > 0 && (
					<aside
						className="dash-fade-up lg:border-l lg:border-border/50 lg:pl-8"
						style={{ animationDelay: "150ms" }}
					>
						<SectionRule label="Systems" hideLine="lg" />

						<div className="mt-4">
							{activeModules.map((mod, i) => {
								const Icon = getIcon(mod.icon);
								const pulse = systemsPulse[mod.key];
								const signal = pulse?.signal;
								return (
									<Link
										key={mod.key}
										to={`/module/${mod.key}`}
										className="dash-card-in group flex items-center gap-3 py-[9px] hover:bg-secondary/30 -mx-2 px-2 rounded-lg transition-colors duration-150"
										style={
											{
												"--card-i": i,
											} as React.CSSProperties
										}
									>
										<span
											className={`size-[5px] rounded-full shrink-0 ${
												signal === "warn"
													? "bg-accent-red"
													: signal === "good"
														? "bg-foreground/40"
														: "bg-grey-3"
											}`}
										/>
										<span className="font-mono text-[10px] font-semibold tracking-widest uppercase text-foreground/80 w-8 shrink-0">
											{mod.code}
										</span>
										<span className="font-mono text-[11px] text-grey-2 tracking-[0.02em] flex-1 truncate">
											{pulse?.status ?? "—"}
										</span>
										{Icon && (
											<Icon className="h-3.5 w-3.5 text-transparent group-hover:text-grey-3 transition-colors duration-200 shrink-0" />
										)}
									</Link>
								);
							})}
						</div>
					</aside>
				)}
			</div>
		</div>
	);
}

/* ── Animated clock: digits slide on change ── */

function AnimatedClock({ timeStr }: { timeStr: string }) {
	return (
		<time className="inline-flex tabular-nums overflow-hidden">
			{timeStr.split("").map((char, i) => (
				<AnimatePresence mode="popLayout" key={i}>
					<motion.span
						key={char}
						initial={{ y: 10, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -10, opacity: 0 }}
						transition={{
							duration: 0.3,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="inline-block"
					>
						{char}
					</motion.span>
				</AnimatePresence>
			))}
		</time>
	);
}

/* ── Shared: editorial section rule ── */

function SectionRule({
	label,
	count,
	hideLine,
}: {
	label: string;
	count?: number;
	hideLine?: "lg";
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
				{label}
			</span>
			<div
				className={`flex-1 h-px bg-border/50 ${hideLine === "lg" ? "lg:hidden" : ""}`}
			/>
			{count !== undefined && (
				<span className="font-mono text-[10px] text-grey-2 tabular-nums">
					{count}
				</span>
			)}
		</div>
	);
}
