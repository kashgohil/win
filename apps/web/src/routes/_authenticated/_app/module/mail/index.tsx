import ModulePage from "@/components/module/ModulePage";
import {
	useConnectAccount,
	useMailData,
	useTriageAction,
} from "@/hooks/use-mail";
import type { ModuleData } from "@/lib/module-data";
import { MODULE_DATA } from "@/lib/module-data";
import type { ModuleKey } from "@/lib/onboarding-data";
import { createFileRoute } from "@tanstack/react-router";
import type { EmailProvider, TriageAction } from "@wingmnn/types";
import { ArrowRight, Mail } from "lucide-react";
import { motion } from "motion/react";

export const Route = createFileRoute("/_authenticated/_app/module/mail/")({
	component: MailModule,
});

const PROVIDERS: {
	key: EmailProvider;
	name: string;
	accent: string;
	hoverAccent: string;
	iconBg: string;
	iconText: string;
}[] = [
	{
		key: "gmail",
		name: "Gmail",
		accent: "border-accent-red/20",
		hoverAccent: "hover:border-accent-red/40 hover:bg-accent-red/[0.02]",
		iconBg: "bg-accent-red/10",
		iconText: "text-accent-red",
	},
];

function MailModule() {
	const { data, isPending } = useMailData();
	const triageAction = useTriageAction();

	const handleAction = (itemId: string, actionLabel: string) => {
		const actionMap: Record<string, TriageAction> = {
			"Send as-is": "send_draft",
			"Send follow-up": "send_draft",
			"Reply with summary": "send_draft",
			Dismiss: "dismiss",
			Archive: "archive",
			Snooze: "snooze",
		};

		const action = actionMap[actionLabel] ?? "dismiss";
		triageAction.mutate({ id: itemId, action });
	};

	const handleDismiss = (itemId: string) => {
		triageAction.mutate({ id: itemId, action: "dismiss" });
	};

	const moduleData: ModuleData | undefined = data
		? {
				briefing: data.briefing,
				triage: data.triage.map((t) => ({
					...t,
					sourceModule: t.sourceModule as ModuleKey | undefined,
				})),
				autoHandled: data.autoHandled.map((a) => ({
					...a,
					linkedModule: a.linkedModule as ModuleKey | undefined,
				})),
			}
		: undefined;

	return (
		<ModulePage
			moduleKey="mail"
			data={moduleData ?? MODULE_DATA.mail}
			onAction={handleAction}
			onDismiss={handleDismiss}
			isLoading={isPending}
			emptyState={!isPending && !moduleData ? <ConnectCard /> : undefined}
		/>
	);
}

function ConnectCard() {
	const connectAccount = useConnectAccount();

	const handleConnect = async (provider: EmailProvider) => {
		const result = await connectAccount.mutateAsync(provider);
		if (result?.url) {
			window.location.href = result.url;
		}
	};

	return (
		<div className="mt-12 relative">
			{/* Ghost preview */}
			<div className="select-none pointer-events-none" aria-hidden="true">
				<div className="blur-[6px] opacity-30">
					<div className="h-4 w-80 bg-secondary/40 rounded" />
					<div className="mt-8 space-y-1">
						{[0, 1, 2].map((i) => (
							<div key={i} className="py-4 px-3">
								<div className="h-4 w-48 bg-secondary/40 rounded" />
								<div className="h-3 w-72 bg-secondary/25 rounded mt-2" />
								<div className="flex gap-4 mt-3">
									<div className="h-3 w-14 bg-secondary/20 rounded" />
									<div className="h-3 w-14 bg-secondary/20 rounded" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* Overlay connect card */}
			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
				className="absolute inset-0 flex items-center justify-center"
			>
				<div className="w-full max-w-sm rounded-xl border border-border/40 bg-background/95 backdrop-blur-sm p-6 shadow-sm">
					<h3 className="font-display text-[18px] text-foreground lowercase leading-tight">
						connect your email
					</h3>
					<p className="font-serif text-[14px] text-grey-2 italic mt-1">
						Link your inbox to let Wingmnn manage it for you.
					</p>

					<div className="mt-5 space-y-2">
						{PROVIDERS.map((provider) => (
							<button
								key={provider.key}
								type="button"
								onClick={() => handleConnect(provider.key)}
								disabled={connectAccount.isPending}
								className={`group relative w-full rounded-lg border p-3 text-left transition-all duration-200 cursor-pointer ${provider.accent} ${provider.hoverAccent}`}
							>
								<div className="flex items-center gap-3">
									<div
										className={`size-9 rounded-full flex items-center justify-center shrink-0 ${provider.iconBg}`}
									>
										<Mail className={`size-4 ${provider.iconText}`} />
									</div>
									<div className="flex-1 min-w-0">
										<p className="font-body text-[14px] text-foreground font-medium">
											{connectAccount.isPending
												? "Connecting..."
												: `Connect ${provider.name}`}
										</p>
									</div>
									<ArrowRight className="size-4 text-grey-3 shrink-0 group-hover:translate-x-0.5 transition-transform duration-200" />
								</div>
							</button>
						))}
					</div>

					<div className="mt-5 flex items-center gap-2 text-grey-3">
						<span className="font-body text-[11px]">Connect your email</span>
						<span className="text-[8px]">&rarr;</span>
						<span className="font-body text-[11px]">We'll start learning</span>
						<span className="text-[8px]">&rarr;</span>
						<span className="font-body text-[11px]">Your inbox, managed</span>
					</div>
				</div>
			</motion.div>
		</div>
	);
}
