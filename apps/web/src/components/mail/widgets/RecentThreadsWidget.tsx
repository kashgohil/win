import { MOTION_CONSTANTS } from "@/components/constant";
import { useMailThreadsInfinite } from "@/hooks/use-mail";
import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

export function RecentThreadsWidget() {
	const { data, isLoading } = useMailThreadsInfinite({ limit: 5 });

	const threads = data?.pages?.flatMap((p) => p?.threads ?? []) ?? [];

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[0, 1, 2, 3].map((i) => (
					<div key={i} className="animate-pulse flex items-center gap-3 py-2">
						<div className="size-4 rounded bg-secondary/20" />
						<div className="flex-1 space-y-1.5">
							<div className="h-3 w-40 bg-secondary/20 rounded" />
							<div className="h-2.5 w-24 bg-secondary/15 rounded" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (threads.length === 0) {
		return (
			<p className="font-body text-[13px] text-grey-3 italic py-4">
				No recent threads.
			</p>
		);
	}

	return (
		<div className="space-y-0.5">
			{threads.slice(0, 5).map((thread, i) => {
				const sender =
					thread.latestMessage?.fromName ??
					thread.latestMessage?.fromAddress ??
					"Unknown";

				return (
					<motion.div
						key={thread.threadId}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.03,
							duration: 0.3,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<Link
							to="/module/mail/inbox/$emailId"
							params={{ emailId: thread.threadId }}
							search={{ view: undefined }}
							className="group flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
						>
							<MessageSquare className="size-3.5 text-grey-3 shrink-0" />
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 min-w-0">
									<p className="font-body text-[13px] text-foreground/80 truncate group-hover:text-foreground transition-colors">
										{thread.subject ?? "(no subject)"}
									</p>
									{thread.unreadCount > 0 && (
										<span className="size-1.5 rounded-full bg-accent-red shrink-0" />
									)}
								</div>
								<div className="flex items-center gap-2 mt-0.5">
									<p className="font-body text-[11px] text-grey-3 truncate">
										{sender}
									</p>
									{thread.messageCount > 1 && (
										<span className="font-mono text-[9px] text-grey-3/60 tabular-nums">
											{thread.messageCount}
										</span>
									)}
								</div>
							</div>
							<ArrowRight className="size-3 text-grey-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
						</Link>
					</motion.div>
				);
			})}
		</div>
	);
}
