import LaunchAnimation from "@/components/onboarding/LaunchAnimation";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/onboarding/launch")({
	component: LaunchAnimation,
});
