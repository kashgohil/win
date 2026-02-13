import Logo from "@/components/Logo";
import { useTheme } from "@/hooks/use-theme";
import type { Module } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import { Link, useMatchRoute } from "@tanstack/react-router";
import { LogOut, Moon, Sun } from "lucide-react";

interface NavRailProps {
	modules: Module[];
	userName: string;
	onSignOut: () => void;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export default function NavRail({
	modules,
	userName,
	onSignOut,
}: NavRailProps) {
	const { theme, toggle } = useTheme();
	const matchRoute = useMatchRoute();
	const isProfileActive = !!matchRoute({ to: "/profile" });

	return (
		<aside className="hidden md:flex flex-col items-center fixed inset-y-0 left-0 w-(--rail-width) bg-background z-40">
			{/* ─── Logo mark ─── */}
			<div
				className="rail-item pt-5 pb-3"
				style={{ "--rail-i": 0 } as React.CSSProperties}
			>
				<Logo className="h-[18px] w-[18px] text-foreground" />
			</div>

			{/* ─── Separator ─── */}
			<div
				className="rail-item text-grey-4 text-[7px] leading-none select-none pb-3"
				style={{ "--rail-i": 1 } as React.CSSProperties}
			>
				&#9670;
			</div>

			{/* ─── Module glyphs ─── */}
			<nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-1.5 overflow-y-auto">
				{modules.map((mod, i) => (
					<button
						key={mod.key}
						type="button"
						className="rail-item group relative w-full flex items-center justify-center h-10 rounded-lg text-grey-3 hover:text-foreground hover:bg-secondary/80 transition-all duration-200 cursor-pointer"
						style={{ "--rail-i": i + 2 } as React.CSSProperties}
					>
						<span className="font-mono text-[11px] font-semibold tracking-widest uppercase group-hover:-translate-y-px transition-transform duration-200">
							{mod.code}
						</span>
					</button>
				))}
			</nav>

			{/* ─── User section ─── */}
			<div
				className="rail-item flex flex-col items-center gap-2.5 pt-3 pb-5"
				style={{ "--rail-i": modules.length + 2 } as React.CSSProperties}
			>
				<button
					type="button"
					onClick={toggle}
					className="text-grey-3 hover:text-foreground transition-colors duration-200 cursor-pointer"
					title={
						theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
					}
				>
					{theme === "dark" ? (
						<Sun className="h-3.5 w-3.5" />
					) : (
						<Moon className="h-3.5 w-3.5" />
					)}
				</button>
				<button
					type="button"
					onClick={onSignOut}
					className="text-grey-3 hover:text-accent-red transition-colors duration-200 cursor-pointer"
					title="Sign out"
				>
					<LogOut className="h-3.5 w-3.5" />
				</button>
				<Link
					to="/profile"
					title={userName}
					className={cn(
						"size-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
						isProfileActive
							? "bg-accent-red ring-2 ring-accent-red/30"
							: "bg-foreground hover:ring-2 hover:ring-foreground/20",
					)}
				>
					<span className="font-mono text-[10px] font-medium text-background leading-none">
						{getInitials(userName)}
					</span>
				</Link>
			</div>
		</aside>
	);
}
