import AuthBrandPanel from "./AuthBrandPanel";
import AuthForm from "./AuthForm";

type Tab = "signin" | "signup";

export default function AuthPage({ tab }: { tab: Tab }) {
	return (
		<div className="flex min-h-dvh">
			{/* Left — branding (desktop only) */}
			<AuthBrandPanel />

			{/* Accent divider */}
			<div className="hidden lg:block absolute left-[45%] xl:left-[50%] top-0 bottom-0 w-px bg-linear-to-b from-transparent via-accent-red/40 to-transparent z-10" />

			{/* Right — auth form */}
			<AuthForm tab={tab} />
		</div>
	);
}
