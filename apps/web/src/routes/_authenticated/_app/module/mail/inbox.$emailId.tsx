import { MOTION_CONSTANTS } from "@/components/constant";
import { EmailBody } from "@/components/mail/EmailBody";
import { useMailEmailDetail } from "@/hooks/use-mail";
import { cn, formatDate } from "@/lib/utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Archive, ArrowLeft, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/inbox/$emailId",
)({
	component: EmailDetail,
});

function EmailDetail() {
	const { emailId } = Route.useParams();
	const { data, isPending } = useMailEmailDetail(emailId);

	if (isPending) {
		return <DetailSkeleton />;
	}

	if (!data?.email) {
		return (
			<div className="px-(--page-px) py-8 max-w-5xl mx-auto">
				<Link
					to="/module/mail/inbox"
					className="inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-3" />
					Back to inbox
				</Link>
				<div className="py-16 flex flex-col items-center gap-2">
					<p className="font-serif text-[15px] text-grey-2 italic">
						Email not found.
					</p>
				</div>
			</div>
		);
	}

	const email = data.email;
	const isUrgent = email.category === "urgent" || email.priorityScore >= 8;

	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto pb-16">
			{/* Back link */}
			<motion.div
				initial={{ opacity: 0, x: -8 }}
				animate={{ opacity: 1, x: 0 }}
				transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
			>
				<Link
					to="/module/mail/inbox"
					className="inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors"
				>
					<ArrowLeft className="size-3" />
					Back to inbox
				</Link>
			</motion.div>

			{/* Header */}
			<motion.header
				initial={{ opacity: 0, y: 12 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.5,
					delay: 0.06,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-6"
			>
				<h2 className="font-display text-[clamp(1.25rem,2.5vw,1.75rem)] text-foreground leading-tight lowercase">
					{email.subject || "(no subject)"}
				</h2>

				{/* Metadata — compact inline */}
				<div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span className="font-body text-[13px] text-foreground">
						{email.fromName && (
							<span className="font-medium">{email.fromName}</span>
						)}
						{email.fromAddress && (
							<span className="text-grey-2">
								{email.fromName ? " " : ""}
								&lt;{email.fromAddress}&gt;
							</span>
						)}
					</span>
					{email.toAddresses && email.toAddresses.length > 0 && (
						<>
							<span className="font-body text-[12px] text-grey-3">&rarr;</span>
							<span className="font-body text-[13px] text-grey-2">
								{email.toAddresses.join(", ")}
							</span>
						</>
					)}
				</div>

				{email.ccAddresses && email.ccAddresses.length > 0 && (
					<div className="mt-1 flex items-baseline gap-2">
						<span className="font-body text-[12px] text-grey-3">Cc</span>
						<span className="font-body text-[13px] text-grey-2">
							{email.ccAddresses.join(", ")}
						</span>
					</div>
				)}

				<div className="mt-2 flex items-center gap-3">
					<span className="font-body text-[13px] text-grey-2">
						{formatDate(email.receivedAt)}
					</span>
					{isUrgent && <span className="size-1.5 rounded-full bg-accent-red" />}
					<span className="font-body text-[12px] text-grey-3 capitalize">
						{email.category}
					</span>
				</div>
			</motion.header>

			{/* Divider */}
			<div className="my-6 h-px bg-border/30" />

			{/* Body + AI Summary — side-by-side on desktop */}
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
				{/* AI Summary — mobile: card above body, desktop: sticky aside */}
				{email.aiSummary && (
					<motion.div
						initial={{ opacity: 0, y: 12 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							duration: 0.5,
							delay: 0.12,
							ease: MOTION_CONSTANTS.EASE,
						}}
						className="order-first lg:order-last lg:sticky lg:top-8 lg:self-start rounded-lg bg-secondary/20 p-4"
					>
						<div className="flex items-center gap-1.5 mb-2">
							<Sparkles className="size-3 text-grey-3" />
							<span className="font-body text-[12px] text-foreground/40">
								Summary
							</span>
						</div>
						<p className="font-serif text-[14px] text-foreground/60 italic leading-relaxed">
							{email.aiSummary}
						</p>
					</motion.div>
				)}

				{/* Body */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: 0.18,
						ease: MOTION_CONSTANTS.EASE,
					}}
					className={email.aiSummary ? "" : "lg:col-span-2"}
				>
					<EmailBody html={email.bodyHtml} plain={email.bodyPlain} />
				</motion.div>
			</div>

			{/* Action bar */}
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{
					duration: 0.4,
					delay: 0.24,
					ease: MOTION_CONSTANTS.EASE,
				}}
				className="mt-6 pt-6 border-t border-border/30 flex items-center gap-4"
			>
				<button
					type="button"
					className="inline-flex items-center gap-1.5 font-body text-[13px] text-grey-2 hover:text-foreground transition-colors duration-150 cursor-pointer"
				>
					<Archive className="size-3" />
					Archive
				</button>
			</motion.div>
		</div>
	);
}

function DetailSkeleton() {
	return (
		<div className="px-(--page-px) py-8 max-w-5xl mx-auto animate-pulse">
			<div className="h-3 w-24 bg-secondary/30 rounded" />
			<div className="mt-6 space-y-2">
				<div className="h-7 w-80 bg-secondary/40 rounded" />
				<div className="h-3 w-56 bg-secondary/25 rounded mt-3" />
				<div className="h-3 w-36 bg-secondary/25 rounded" />
			</div>
			<div className="my-6 h-px bg-border/30" />
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							key={i}
							className={cn(
								"h-3 bg-secondary/25 rounded",
								i % 3 === 0 ? "w-full" : "w-3/4",
							)}
						/>
					))}
				</div>
				<div className="rounded-lg bg-secondary/10 p-4 space-y-2">
					<div className="h-2.5 w-16 bg-secondary/25 rounded" />
					<div className="h-3 w-full bg-secondary/20 rounded" />
					<div className="h-3 w-2/3 bg-secondary/20 rounded" />
				</div>
			</div>
		</div>
	);
}
