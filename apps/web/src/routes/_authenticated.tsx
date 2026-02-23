import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
	component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	useEffect(() => {
		if (!isPending && !session?.user) {
			navigate({ to: "/auth", replace: true, search: { tab: "signin" } });
		}
	}, [session, isPending, navigate]);

	if (isPending) {
		return (
			<div className="min-h-dvh bg-background flex items-center justify-center">
				<p className="font-mono text-[12px] text-grey-3 animate-pulse">
					Loading…
				</p>
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	return (
		<>
			<Outlet />
			<Toaster />
		</>
	);
}
