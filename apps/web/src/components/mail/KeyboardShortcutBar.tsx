import { AnimatePresence, motion } from "motion/react";
import { Fragment, useEffect, useState } from "react";

import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";

export { Kbd };

type Shortcut = {
	keys: string[];
	label: string;
};

type ShortcutGroup = Shortcut[];

function ShortcutItem({ shortcut }: { shortcut: Shortcut }) {
	return (
		<span className="inline-flex items-center gap-1.5">
			{shortcut.keys.map((key) => (
				<Kbd key={key}>{key}</Kbd>
			))}
			<span className="text-muted-foreground/70 font-body text-[10px] tracking-wide">
				{shortcut.label}
			</span>
		</span>
	);
}

function GroupSeparator() {
	return (
		<span className="text-foreground/15 text-[8px] select-none" aria-hidden>
			&#x2022;
		</span>
	);
}

export const INBOX_SHORTCUTS: ShortcutGroup[] = [
	[
		{ keys: ["\u23CE"], label: "open" },
		{ keys: ["\u2423"], label: "peek" },
		{ keys: ["X"], label: "select" },
	],
	[
		{ keys: ["/"], label: "search" },
		{ keys: ["["], label: "back" },
	],
];

export const INBOX_INLINE_SHORTCUTS: ShortcutGroup[] = [
	[
		{ keys: ["ESC"], label: "close" },
		{ keys: ["\u23CE"], label: "full view" },
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
		{ keys: ["S"], label: "sent" },
		{ keys: ["A"], label: "attachments" },
	],
	[
		{ keys: ["1-9"], label: "filter account" },
		{ keys: ["0"], label: "all accounts" },
	],
];

export const SENT_SHORTCUTS: ShortcutGroup[] = [
	[
		{ keys: ["\u23CE"], label: "open" },
		{ keys: ["\u2423"], label: "peek" },
	],
	[
		{ keys: ["I"], label: "inbox" },
		{ keys: ["A"], label: "attachments" },
	],
	[
		{ keys: ["/"], label: "search" },
		{ keys: ["["], label: "back" },
	],
];

export const SENT_INLINE_SHORTCUTS: ShortcutGroup[] = [
	[
		{ keys: ["ESC"], label: "close" },
		{ keys: ["\u23CE"], label: "full view" },
	],
	[
		{ keys: ["/"], label: "search" },
		{ keys: ["["], label: "back" },
	],
];

export const ATTACHMENTS_SHORTCUTS: ShortcutGroup[] = [
	[{ keys: ["\u23CE"], label: "select" }],
	[
		{ keys: ["["], label: "back" },
		{ keys: ["/"], label: "search" },
	],
	[
		{ keys: ["I"], label: "inbox" },
		{ keys: ["S"], label: "sent" },
	],
];

function useIsTyping() {
	const [isTyping, setIsTyping] = useState(false);

	useEffect(() => {
		const onFocusIn = (e: FocusEvent) => {
			const t = e.target as HTMLElement;
			if (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.isContentEditable
			) {
				setIsTyping(true);
			}
		};
		const onFocusOut = (e: FocusEvent) => {
			const t = e.relatedTarget as HTMLElement | null;
			if (
				!t ||
				(t.tagName !== "INPUT" &&
					t.tagName !== "TEXTAREA" &&
					!t.isContentEditable)
			) {
				setIsTyping(false);
			}
		};
		document.addEventListener("focusin", onFocusIn);
		document.addEventListener("focusout", onFocusOut);
		return () => {
			document.removeEventListener("focusin", onFocusIn);
			document.removeEventListener("focusout", onFocusOut);
		};
	}, []);

	return isTyping;
}

export function KeyboardShortcutBar({
	shortcuts,
	visible = true,
}: {
	shortcuts: ShortcutGroup[];
	visible?: boolean;
}) {
	const isTyping = useIsTyping();

	return (
		<AnimatePresence>
			{visible && !isTyping && (
				<motion.div
					initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
					animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
					exit={{ opacity: 0, y: 4, filter: "blur(4px)" }}
					transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
					className={cn(
						"fixed bottom-4 left-1/2 -translate-x-1/2 md:left-[calc((--rail-width)+50%)] md:-translate-x-1/2 z-40",
						"flex items-center gap-3 px-3.5 py-1.5",
						"rounded-lg border border-border/30 bg-background/80 backdrop-blur-lg",
						"shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]",
						"pointer-events-none select-none",
						"opacity-40 hover:opacity-100 transition-opacity duration-500 ease-out",
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
