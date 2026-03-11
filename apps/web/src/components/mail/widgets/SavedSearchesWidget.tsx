import { MOTION_CONSTANTS } from "@/components/constant";
import { Link } from "@tanstack/react-router";
import { Bookmark, Search } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";

const SAVED_SEARCHES_KEY = "mail-saved-searches";

interface SavedSearch {
	label: string;
	filters: Record<string, string>;
}

function getSavedSearches(): SavedSearch[] {
	try {
		const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
		if (raw) return JSON.parse(raw);
	} catch {
		// ignore
	}
	return [];
}

export function SavedSearchesWidget() {
	const searches = useMemo(() => getSavedSearches(), []);

	if (searches.length === 0) {
		return (
			<div className="py-4 flex flex-col items-center gap-2">
				<Search className="size-4 text-grey-3/50" />
				<p className="font-body text-[12px] text-grey-3 text-center">
					Save searches from the inbox to access them here.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-0.5">
			{searches.slice(0, 6).map((search, i) => (
				<motion.div
					key={search.label}
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
							...search.filters,
							view: undefined,
							starred: undefined,
							attachment: undefined,
						}}
						className="group flex items-center gap-2.5 rounded-md px-2 py-2 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
					>
						<Bookmark className="size-3 text-grey-3 shrink-0" />
						<span className="font-body text-[13px] text-foreground/70 group-hover:text-foreground transition-colors truncate">
							{search.label}
						</span>
					</Link>
				</motion.div>
			))}
		</div>
	);
}
