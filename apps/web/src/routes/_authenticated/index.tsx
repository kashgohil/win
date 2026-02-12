import Logo from "@/components/Logo";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { MODULES } from "@/lib/onboarding-data";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	CheckSquare,
	DollarSign,
	FileText,
	FolderOpen,
	Heart,
	LogOut,
	Mail,
	Plane,
	Share2,
	Users,
} from "lucide-react";
import { useEffect, type ComponentType } from "react";

const MODULE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
	mail: Mail,
	cal: Calendar,
	fin: DollarSign,
	crm: Users,
	task: CheckSquare,
	notes: FileText,
	social: Share2,
	files: FolderOpen,
	travel: Plane,
	health: Heart,
};

export const Route = createFileRoute("/_authenticated/")({
	component: Dashboard,
});

function getGreeting() {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	if (h < 21) return "Good evening";
	return "Good night";
}

function Dashboard() {
	const navigate = useNavigate();
	const { data: session } = authClient.useSession();

	const { data: profileData, isPending } = useQuery({
		queryKey: ["onboarding"],
		queryFn: async () => {
			const { data, error } = await api.onboarding.get();
			if (error) throw new Error("Failed to load profile");
			return data;
		},
	});

	useEffect(() => {
		if (isPending) return;
		if (profileData?.profile && !profileData.profile.onboardingCompletedAt) {
			navigate({ to: "/onboarding", replace: true });
		}
	}, [profileData, isPending, navigate]);

	const firstName = session?.user?.name?.split(" ")[0] ?? "";
	const enabledModules = profileData?.profile?.enabledModules ?? [];
	const activeModules = MODULES.filter((m) => enabledModules.includes(m.key));

	const handleSignOut = async () => {
		await authClient.signOut();
		navigate({ to: "/auth", replace: true, search: { tab: "signin" } });
	};

	const dateStr = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
	});

	if (isPending) {
		return (
			<div className="min-h-dvh bg-cream flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading…
				</p>
			</div>
		);
	}

	return (
		<div className="min-h-dvh bg-cream">
			{/* ─── App header ─── */}
			<header className="sticky top-0 z-40 bg-cream/80 backdrop-blur-md border-b border-grey-4/60">
				<div className="flex items-center justify-between h-14 px-(--page-px)">
					<div className="flex items-center gap-2.5">
						<Logo className="h-6 w-6 text-ink" />
						<span className="font-mono text-[13px] font-medium tracking-[0.04em] text-ink lowercase">
							wingmnn
						</span>
					</div>

					<div className="flex items-center gap-4">
						<span className="font-mono text-[12px] text-grey-2 hidden sm:block">
							{session?.user?.email}
						</span>
						<button
							type="button"
							onClick={handleSignOut}
							className="flex items-center gap-1.5 font-mono text-[12px] text-grey-2 hover:text-ink transition-colors cursor-pointer"
						>
							<LogOut className="h-3.5 w-3.5" />
							<span className="hidden sm:inline">Sign out</span>
						</button>
					</div>
				</div>
			</header>

			{/* ─── Main ─── */}
			<main className="px-(--page-px) py-12 max-w-6xl mx-auto">
				{/* Greeting */}
				<div className="dash-fade-up mb-12">
					<h1 className="font-display text-[clamp(2rem,5vw,3.25rem)] text-ink tracking-[0.01em] leading-[1.1] lowercase">
						{getGreeting()}, {firstName}.
					</h1>
					<p className="font-mono text-[13px] text-grey-2 mt-2 tracking-[0.02em]">
						{dateStr}
					</p>
				</div>

				{/* Module grid */}
				{activeModules.length > 0 && (
					<section className="dash-fade-up" style={{ animationDelay: "120ms" }}>
						<h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-grey-3 mb-5">
							Your modules
						</h2>

						<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
							{activeModules.map((mod, i) => {
								const Icon = MODULE_ICONS[mod.key];
								return (
									<div
										key={mod.key}
										className="dash-card-in group relative flex flex-col items-start gap-6 p-5 rounded-xl border border-grey-4/80 bg-cream hover:border-grey-3 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-200 text-left"
										style={{ "--card-i": i } as React.CSSProperties}
									>
										<span className="font-mono text-[10px] font-medium tracking-widest text-grey-3 uppercase">
											{mod.code}
										</span>
										{Icon && (
											<Icon className="h-6 w-6 text-ink/70 group-hover:text-accent-red transition-colors duration-200" />
										)}
										<span className="font-body text-[15px] text-ink tracking-[0.01em]">
											{mod.name}
										</span>
									</div>
								);
							})}
						</div>
					</section>
				)}
			</main>
		</div>
	);
}
