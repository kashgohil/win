import type { Module } from "@/lib/onboarding-data";
import NavPillExpandable from "./NavPillExpandable";
import NavRail from "./NavRail";

interface AppShellProps {
	modules: Module[];
	userName: string;
	onSignOut: () => void;
	children: React.ReactNode;
}

export default function AppShell({
	modules,
	userName,
	onSignOut,
	children,
}: AppShellProps) {
	return (
		<div className="min-h-dvh bg-background">
			<NavRail modules={modules} userName={userName} onSignOut={onSignOut} />

			<main className="md:ml-(--rail-width) min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
				{children}
			</main>

			<NavPillExpandable modules={modules} />
		</div>
	);
}
