import { Badge } from "@/components/ui/badge";
import type { AutoHandledItem } from "@/lib/module-data";
import { MODULES, type ModuleKey } from "@/lib/onboarding-data";
import { cn } from "@/lib/utils";
import {
	Archive,
	ArrowRight,
	Check,
	Filter,
	Forward,
	Reply,
	Tag,
} from "lucide-react";
import { motion } from "motion/react";
import { MOTION_CONSTANTS } from "../constant";

/* ── Mail-specific auto-handled item (extends generic base) ── */

export interface MailAutoHandledItem extends AutoHandledItem {
	sender?: string;
	subject?: string;
	actionType?: string;
	emailId?: string;
	category?: string;
}

/* ── Action metadata ── */

const ACTION_META: Record<
	string,
	{ label: string; icon: typeof Archive; color: string }
> = {
	archived: {
		label: "Archived",
		icon: Archive,
		color: "border-blue-500/25 text-blue-600 dark:text-blue-400",
	},
	filtered: {
		label: "Filtered",
		icon: Filter,
		color: "border-amber-500/25 text-amber-600 dark:text-amber-400",
	},
	labeled: {
		label: "Labeled",
		icon: Tag,
		color: "border-violet-500/25 text-violet-600 dark:text-violet-400",
	},
	forwarded: {
		label: "Forwarded",
		icon: Forward,
		color: "border-emerald-500/25 text-emerald-600 dark:text-emerald-400",
	},
	"auto-replied": {
		label: "Replied",
		icon: Reply,
		color: "border-cyan-500/25 text-cyan-600 dark:text-cyan-400",
	},
};

function getModuleCode(key: ModuleKey): string {
	return MODULES.find((m) => m.key === key)?.code ?? key.toUpperCase();
}

/* ── Component ── */

export function MailAutoHandledCard({
	item,
	index,
	onViewEmail,
}: {
	item: MailAutoHandledItem;
	index: number;
	onViewEmail?: (emailId: string) => void;
}) {
	const meta = (item.actionType && ACTION_META[item.actionType]) || {
		label: "Handled",
		icon: Check,
		color: "border-foreground/15 text-foreground/70",
	};
	const ActionIcon = meta.icon;
	const canView = item.emailId && onViewEmail;

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				delay: index * 0.04,
				duration: 0.3,
				ease: MOTION_CONSTANTS.EASE,
			}}
			className="mb-2 last:mb-0"
		>
			<div
				className={cn(
					"rounded-lg border border-border/30 hover:border-border/50 transition-colors duration-200 px-3.5 py-2.5",
					canView && "cursor-pointer",
				)}
				onClick={canView ? () => onViewEmail(item.emailId!) : undefined}
			>
				{/* Line 1 — Action + who + when */}
				<div className="flex items-center gap-2 min-w-0">
					<Badge
						variant="outline"
						className={cn(
							"font-mono text-[10px] tracking-[0.06em] uppercase px-1.5 py-0 gap-1 shrink-0",
							meta.color,
						)}
					>
						<ActionIcon className="size-2.5" />
						{meta.label}
					</Badge>
					<span className="font-body text-[13px] text-foreground/70 tracking-[0.01em] truncate min-w-0">
						{item.sender ?? item.text}
					</span>
					<span className="font-mono text-[10px] text-grey-3 tabular-nums shrink-0 ml-auto">
						{item.timestamp}
					</span>
				</div>

				{/* Line 2 — Subject + why + linked module */}
				<div className="flex items-center gap-2 mt-1.5 min-w-0">
					{item.subject && (
						<span className="font-body text-[12px] text-grey-3 truncate min-w-0">
							{item.subject}
						</span>
					)}
					{item.category && (
						<span className="font-mono text-[10px] tracking-[0.06em] text-foreground/25 lowercase shrink-0">
							{item.category}
						</span>
					)}
					{item.linkedModule && (
						<Badge
							variant="outline"
							className="font-mono text-[9px] tracking-widest uppercase border-border/40 text-grey-3 px-1.5 py-0 shrink-0"
						>
							<ArrowRight className="size-2.5" />
							{getModuleCode(item.linkedModule)}
						</Badge>
					)}
				</div>
			</div>
		</motion.div>
	);
}
