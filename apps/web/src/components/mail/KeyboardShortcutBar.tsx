import { AnimatePresence, motion } from "motion/react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

type Shortcut = {
	keys: string[];
	label: string;
};

type ShortcutGroup = Shortcut[];

export function Kbd({ children }: { children: string }) {
	return (
		<kbd className="inline-flex items-center justify-center font-mono text-[10px] bg-secondary/40 px-1.5 py-0.5 rounded">
			{children}
		</kbd>
	);
}

function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
	return (
		<span className="inline-flex items-center gap-1">
			{shortcut.keys.map((key) => (
				<Kbd key={key}>{key}</Kbd>
			))}
			<span className="text-foreground/40">{shortcut.label}</span>
		</span>
	);
}

function GroupSeparator() {
	return <span className="w-px h-3 bg-foreground/10 mx-0.5" />;
}

export const INBOX_SHORTCUTS: ShortcutGroup[] = [
	[{ keys: ["\u23CE"], label: "select" }],
	[
		{ keys: ["E"], label: "archive" },
		{ keys: ["S"], label: "star" },
		{ keys: ["R"], label: "read" },
	],
	[
		{ keys: ["/"], label: "search" },
		{ keys: ["["], label: "back" },
	],
];

export const EMAIL_DETAIL_SHORTCUTS: ShortcutGroup[] = [
	[{ keys: ["ESC", "["], label: "back" }],
];

export const MAIL_HUB_SHORTCUTS: ShortcutGroup[] = [
	[
		{ keys: ["I"], label: "inbox" },
		{ keys: ["A"], label: "attachments" },
	],
	[
		{ keys: ["1-9"], label: "filter account" },
		{ keys: ["0"], label: "all accounts" },
	],
];

export const ATTACHMENTS_SHORTCUTS: ShortcutGroup[] = [
	[{ keys: ["\u23CE"], label: "select" }],
	[
		{ keys: ["["], label: "back" },
		{ keys: ["/"], label: "search" },
	],
	[{ keys: ["I"], label: "inbox" }],
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
						"rounded-full bg-background/90 backdrop-blur-md shadow-md ring-1 ring-border/50",
						"pointer-events-none select-none",
						"opacity-50 hover:opacity-100 transition-opacity duration-300",
						"[&:hover]:pointer-events-auto",
					)}
				>
					{shortcuts.map((group, gi) => (
						<Fragment key={group[0]?.keys[0] ?? gi}>
							{gi > 0 && <GroupSeparator />}
							<span className="inline-flex items-center gap-2">
								{group.map((shortcut) => (
									<ShortcutItem
										key={shortcut.keys.join("+")}
										shortcut={shortcut}
									/>
								))}
							</span>
						</Fragment>
					))}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
