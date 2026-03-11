import { MOTION_CONSTANTS } from "@/components/constant";
import { useMailEmailsInfinite } from "@/hooks/use-mail";
import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";

export function VipSendersWidget() {
	// VIP senders are those who are starred — fetch starred emails as a proxy
	const { data, isLoading } = useMailEmailsInfinite({
		starred: true,
		limit: 20,
	});

	// Group by sender and show most recent
	const vipSenders = useMemo(() => {
		const emails = data?.pages?.flatMap((p) => p?.emails ?? []) ?? [];
		const senderMap = new Map<
			string,
			{ name: string; address: string; subject: string; time: string }
		>();

		for (const email of emails) {
			const addr = email.fromAddress ?? "unknown";
			if (!senderMap.has(addr)) {
				senderMap.set(addr, {
					name: email.fromName ?? addr,
					address: addr,
					subject: email.subject ?? "(no subject)",
					time: email.receivedAt,
				});
			}
		}

		return Array.from(senderMap.values()).slice(0, 5);
	}, [data]);

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[0, 1, 2].map((i) => (
					<div key={i} className="animate-pulse flex items-center gap-3 py-2">
						<div className="size-7 rounded-full bg-secondary/20" />
						<div className="flex-1 space-y-1.5">
							<div className="h-3 w-28 bg-secondary/20 rounded" />
							<div className="h-2.5 w-40 bg-secondary/15 rounded" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (vipSenders.length === 0) {
		return (
			<p className="font-body text-[13px] text-grey-3 italic py-4">
				Star emails to see VIP senders here.
			</p>
		);
	}

	return (
		<div className="space-y-0.5">
			{vipSenders.map((sender, i) => {
				const initials = sender.name
					.split(" ")
					.map((w) => w[0])
					.join("")
					.slice(0, 2)
					.toUpperCase();

				return (
					<motion.div
						key={sender.address}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.03,
							duration: 0.3,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<Link
							to="/module/mail/inbox"
							search={{
								q: `from:${sender.address}`,
								view: undefined,
								starred: undefined,
								attachment: undefined,
							}}
							className="group flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
						>
							<div className="size-7 rounded-full bg-foreground/6 flex items-center justify-center shrink-0">
								<span className="font-mono text-[9px] text-foreground/50 font-medium">
									{initials}
								</span>
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-body text-[13px] text-foreground/80 truncate group-hover:text-foreground transition-colors">
									{sender.name}
								</p>
								<p className="font-body text-[11px] text-grey-3 truncate">
									{sender.subject}
								</p>
							</div>
							<Star className="size-3 text-amber-400 fill-amber-400 shrink-0" />
						</Link>
					</motion.div>
				);
			})}
		</div>
	);
}
