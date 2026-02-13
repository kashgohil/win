import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
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
		<TooltipProvider sliding>
			<aside className="hidden md:flex flex-col items-center fixed inset-y-0 left-0 w-(--rail-width) bg-background z-40">
				{/* ─── Logo mark ─── */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							asChild
							className="rail-item mt-3 mb-1 size-9"
							style={{ "--rail-i": 0 } as React.CSSProperties}
						>
							<Link to="/">
								<Logo className="h-[18px] w-[18px] text-foreground" />
							</Link>
						</Button>
					</TooltipTrigger>
					<TooltipContent side="right">Home</TooltipContent>
				</Tooltip>

				{/* ─── Separator ─── */}
				<div
					className="rail-item px-3 py-1.5"
					style={{ "--rail-i": 1 } as React.CSSProperties}
				>
					<Separator className="bg-border/50" />
				</div>

				{/* ─── Module glyphs ─── */}
				<nav className="flex-1 flex flex-col items-center gap-0.5 w-full px-1.5 overflow-y-auto">
					{modules.map((mod, i) => (
						<Tooltip key={mod.key}>
							<TooltipTrigger asChild>
								<Button
									variant="ghost"
									className="rail-item group w-full h-10 text-grey-3 hover:text-foreground"
									style={{ "--rail-i": i + 2 } as React.CSSProperties}
								>
									<span className="font-mono text-[11px] font-semibold tracking-widest uppercase group-hover:-translate-y-px transition-transform duration-200">
										{mod.code}
									</span>
								</Button>
							</TooltipTrigger>
							<TooltipContent side="right">{mod.name}</TooltipContent>
						</Tooltip>
					))}
				</nav>

				{/* ─── User section ─── */}
				<div
					className="rail-item flex flex-col items-center gap-1 pt-3 pb-5"
					style={{ "--rail-i": modules.length + 2 } as React.CSSProperties}
				>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={toggle}
								className="text-grey-3 hover:text-foreground"
							>
								{theme === "dark" ? (
									<Sun className="h-3.5 w-3.5" />
								) : (
									<Moon className="h-3.5 w-3.5" />
								)}
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">
							{theme === "dark" ? "Light mode" : "Dark mode"}
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon-sm"
								onClick={onSignOut}
								className="text-grey-3 hover:text-accent-red"
							>
								<LogOut className="h-3.5 w-3.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">Sign out</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<Link
								to="/profile"
								className={cn(
									"mt-1 size-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer",
									isProfileActive
										? "bg-accent-red ring-2 ring-accent-red/30"
										: "bg-foreground hover:ring-2 hover:ring-foreground/20",
								)}
							>
								<span className="font-mono text-[10px] font-medium text-background leading-none">
									{getInitials(userName)}
								</span>
							</Link>
						</TooltipTrigger>
						<TooltipContent side="right">{userName}</TooltipContent>
					</Tooltip>
				</div>
			</aside>
		</TooltipProvider>
	);
}
