import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

type Shortcut = {
	key: string;
	label: string;
};

type ShortcutGroup = Shortcut[];

function Kbd({ children }: { children: string }) {
	return (
		<kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded border border-foreground/10 bg-foreground/6 font-mono text-[10px] font-medium leading-none text-foreground/60">
			{children}
		</kbd>
	);
}

function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
	return (
		<span className="inline-flex items-center gap-1">
			<Kbd>{shortcut.key}</Kbd>
			<span className="text-foreground/40">{shortcut.label}</span>
		</span>
	);
}

function GroupSeparator() {
	return <span className="w-px h-3 bg-foreground/10 mx-0.5" />;
}

export const INBOX_SHORTCUTS: ShortcutGroup[] = [
	[
		{ key: "\u2191\u2193", label: "navigate" },
		{ key: "\u2190\u2192", label: "header / categories" },
		{ key: "\u23CE", label: "select" },
	],
	[
		{ key: "E", label: "archive" },
		{ key: "S", label: "star" },
		{ key: "R", label: "read" },
	],
	[
		{ key: "/", label: "search" },
		{ key: "[", label: "back" },
	],
];

export const EMAIL_DETAIL_SHORTCUTS: ShortcutGroup[] = [
	[
		{ key: "ESC", label: "back" },
		{ key: "[", label: "back" },
	],
];

export const MAIL_HUB_SHORTCUTS: ShortcutGroup[] = [
	[
		{ key: "I", label: "inbox" },
		{ key: "A", label: "attachments" },
	],
];

export const ATTACHMENTS_SHORTCUTS: ShortcutGroup[] = [
	[
		{ key: "[", label: "back" },
		{ key: "/", label: "search" },
	],
	[{ key: "I", label: "inbox" }],
];

export function KeyboardShortcutBar({
	shortcuts,
	visible = true,
}: {
	shortcuts: ShortcutGroup[];
	visible?: boolean;
}) {
	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 8 }}
					transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
					className={cn(
						"fixed bottom-4 left-1/2 -translate-x-1/2 md:left-[calc((--rail-width)+50%)] md:-translate-x-1/2 z-40",
						"flex items-center gap-3 px-4 py-2",
						"font-body text-[10px] tracking-wide",
						"rounded-full bg-foreground/6 backdrop-blur-md shadow-sm ring-1 ring-foreground/6",
						"pointer-events-none select-none",
						"opacity-50 hover:opacity-100 transition-opacity duration-300",
						"[&:hover]:pointer-events-auto",
					)}
				>
					{shortcuts.map((group, gi) => (
						<Fragment key={group[0]?.key ?? gi}>
							{gi > 0 && <GroupSeparator />}
							<span className="inline-flex items-center gap-2">
								{group.map((shortcut) => (
									<ShortcutItem key={shortcut.key} shortcut={shortcut} />
								))}
							</span>
						</Fragment>
					))}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
