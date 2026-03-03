import { useEffect } from "react";

type UseEmailDetailKeyboardOptions = {
	disabled?: boolean;
	onReply: () => void;
	onForward: () => void;
	onStar: () => void;
	onToggleRead: () => void;
	onArchive: () => void;
	onDelete: () => void;
	onBack: () => void;
	onNavigateAttachments: () => void;
};

export function useEmailDetailKeyboard({
	disabled = false,
	onReply,
	onForward,
	onStar,
	onToggleRead,
	onArchive,
	onDelete,
	onBack,
	onNavigateAttachments,
}: UseEmailDetailKeyboardOptions) {
	useEffect(() => {
		if (disabled) return;

		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey
			) {
				return;
			}

			switch (e.key) {
				case "r":
					e.preventDefault();
					onReply();
					break;
				case "f":
					e.preventDefault();
					onForward();
					break;
				case "s":
					e.preventDefault();
					onStar();
					break;
				case "u":
					e.preventDefault();
					onToggleRead();
					break;
				case "e":
					e.preventDefault();
					onArchive();
					break;
				case "a":
					e.preventDefault();
					onNavigateAttachments();
					break;
				case "#":
					e.preventDefault();
					onDelete();
					break;
				case "Escape":
				case "[":
					e.preventDefault();
					onBack();
					break;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [
		disabled,
		onReply,
		onForward,
		onStar,
		onToggleRead,
		onArchive,
		onDelete,
		onBack,
		onNavigateAttachments,
	]);
}
