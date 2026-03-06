import { useCallback, useEffect, useRef, useState } from "react";

type Section = "header" | "categories" | "emails";

type UseInboxKeyboardOptions = {
	emailCount: number;
	categoryCount: number;
	headerCount: number;
	/** Whether a modal/dialog is open (disables keyboard nav) */
	disabled?: boolean;
	onSelectCategory: (index: number) => void;
	onOpenEmail: (index: number) => void;
	onArchiveEmail: (index: number) => void;
	onStarEmail: (index: number) => void;
	onToggleReadEmail: (index: number) => void;
	onSelectEmail: (index: number) => void;
	onActivateHeader: (index: number) => void;
	onOpenSearch?: () => void;
	onNavigateAttachments?: () => void;
	onNavigateSent?: () => void;
	onToggleView?: () => void;
	onToggleViewMode?: () => void;
	onGoBack?: () => void;
	/** View mode for quick-view feature */
	viewMode?: "inline" | "sidepanel";
	/** Currently expanded thread ID (inline mode) */
	expandedThreadId?: string | null;
	/** Toggle expand on a thread (inline mode, Space key) */
	onToggleExpand?: (index: number) => void;
	/** Peek at a thread (sidepanel mode, auto on j/k) */
	onPeekEmail?: (index: number) => void;
	/** Collapse expanded thread (inline mode, Escape key) */
	onCollapseExpand?: () => void;
	/** Quick reply (q key) — expand + focus reply in inline, focus reply in sidepanel */
	onQuickReply?: (index: number) => void;
};

type UseInboxKeyboardReturn = {
	/** Whether keyboard navigation is active (hides on mouse move) */
	isActive: boolean;
	activeSection: Section;
	focusedHeaderIndex: number;
	focusedCategoryIndex: number;
	focusedEmailIndex: number;
	/** Ref callback for email row elements (for scrollIntoView) */
	emailRowRef: (index: number, el: HTMLElement | null) => void;
	/** Ref callback for the header section element */
	headerRef: (el: HTMLElement | null) => void;
	/** Ref callback for the categories section element */
	categoriesRef: (el: HTMLElement | null) => void;
};

export function useInboxKeyboard({
	emailCount,
	categoryCount,
	headerCount,
	disabled = false,
	onSelectCategory,
	onOpenEmail,
	onArchiveEmail,
	onStarEmail,
	onToggleReadEmail,
	onSelectEmail,
	onActivateHeader,
	onOpenSearch,
	onNavigateAttachments,
	onNavigateSent,
	onToggleView,
	onToggleViewMode,
	onGoBack,
	viewMode,
	expandedThreadId,
	onToggleExpand,
	onCollapseExpand,
	onPeekEmail,
	onQuickReply,
}: UseInboxKeyboardOptions): UseInboxKeyboardReturn {
	const [isActive, setIsActive] = useState(false);
	const [activeSection, setActiveSection] = useState<Section>("emails");
	const [focusedHeaderIndex, setFocusedHeaderIndex] = useState(0);
	const [focusedCategoryIndex, setFocusedCategoryIndex] = useState(0);
	const [focusedEmailIndex, setFocusedEmailIndex] = useState(0);
	const emailRowRefs = useRef<Map<number, HTMLElement>>(new Map());
	const headerElRef = useRef<HTMLElement | null>(null);
	const categoriesElRef = useRef<HTMLElement | null>(null);

	// Reset state when email list changes significantly
	const prevEmailCount = useRef(emailCount);
	useEffect(() => {
		if (emailCount !== prevEmailCount.current) {
			prevEmailCount.current = emailCount;
			if (focusedEmailIndex >= emailCount && emailCount > 0) {
				setFocusedEmailIndex(emailCount - 1);
			}
		}
	}, [emailCount, focusedEmailIndex]);

	const scrollEmailIntoView = useCallback((index: number) => {
		const el = emailRowRefs.current.get(index);
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, []);

	const scrollSectionIntoView = useCallback((section: Section) => {
		const el =
			section === "header" ? headerElRef.current : categoriesElRef.current;
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, []);

	const emailRowRef = useCallback((index: number, el: HTMLElement | null) => {
		if (el) {
			emailRowRefs.current.set(index, el);
		} else {
			emailRowRefs.current.delete(index);
		}
	}, []);

	const headerRef = useCallback((el: HTMLElement | null) => {
		headerElRef.current = el;
	}, []);

	const categoriesRef = useCallback((el: HTMLElement | null) => {
		categoriesElRef.current = el;
	}, []);

	// Deactivate on mouse movement
	useEffect(() => {
		if (!isActive) return;

		const handler = () => setIsActive(false);
		document.addEventListener("mousemove", handler, { once: true });
		return () => document.removeEventListener("mousemove", handler);
	}, [isActive]);

	// Main keyboard handler
	useEffect(() => {
		if (disabled) return;

		const handler = (e: KeyboardEvent) => {
			// Don't intercept when typing in inputs or when modifiers are held
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

			const key = e.key;

			// Global shortcut: / to open search (works even when keyboard nav is inactive)
			if (key === "/") {
				e.preventDefault();
				onOpenSearch?.();
				return;
			}

			// Global shortcut: a to open attachments
			if (key === "a") {
				e.preventDefault();
				onNavigateAttachments?.();
				return;
			}

			// Global shortcut: s to navigate to sent
			if (key === "s") {
				e.preventDefault();
				onNavigateSent?.();
				return;
			}

			// Global shortcut: v to toggle read/unread view
			if (key === "v") {
				e.preventDefault();
				onToggleView?.();
				return;
			}

			// Global shortcut: p to toggle panel mode
			if (key === "p") {
				e.preventDefault();
				onToggleViewMode?.();
				return;
			}

			// Global shortcut: [ to go back
			if (key === "[") {
				e.preventDefault();
				onGoBack?.();
				return;
			}

			// Activate keyboard mode on first relevant keypress
			if (
				!isActive &&
				(key === "ArrowDown" || key === "ArrowUp" || key === "j")
			) {
				e.preventDefault();
				setIsActive(true);
				if (viewMode === "sidepanel" && onPeekEmail) {
					onPeekEmail(focusedEmailIndex);
				}
				return;
			}

			if (!isActive) return;

			// --- Navigation ---

			if (key === "ArrowDown" || key === "j") {
				e.preventDefault();
				if (activeSection === "header") {
					// Move from header to categories
					setActiveSection("categories");
					scrollSectionIntoView("categories");
				} else if (activeSection === "categories") {
					// Move from categories to email list
					setActiveSection("emails");
					setFocusedEmailIndex(0);
					scrollEmailIntoView(0);
					if (viewMode === "sidepanel" && onPeekEmail) {
						onPeekEmail(0);
					}
				} else {
					// Move down in email list
					setFocusedEmailIndex((prev) => {
						const next = Math.min(prev + 1, emailCount - 1);
						scrollEmailIntoView(next);
						if (viewMode === "sidepanel" && onPeekEmail) {
							onPeekEmail(next);
						}
						return next;
					});
				}
				return;
			}

			if (key === "ArrowUp" || key === "k") {
				e.preventDefault();
				if (activeSection === "emails" && focusedEmailIndex === 0) {
					// Move from top of emails to categories
					setActiveSection("categories");
					scrollSectionIntoView("categories");
				} else if (activeSection === "emails") {
					setFocusedEmailIndex((prev) => {
						const next = Math.max(prev - 1, 0);
						scrollEmailIntoView(next);
						if (viewMode === "sidepanel" && onPeekEmail) {
							onPeekEmail(next);
						}
						return next;
					});
				} else if (activeSection === "categories") {
					// Move from categories to header
					setActiveSection("header");
					scrollSectionIntoView("header");
				}
				return;
			}

			if (key === "ArrowLeft") {
				e.preventDefault();
				if (activeSection === "header") {
					setFocusedHeaderIndex((prev) => Math.max(prev - 1, 0));
				} else if (activeSection === "categories") {
					setFocusedCategoryIndex((prev) => Math.max(prev - 1, 0));
				}
				return;
			}

			if (key === "ArrowRight") {
				e.preventDefault();
				if (activeSection === "header") {
					setFocusedHeaderIndex((prev) => Math.min(prev + 1, headerCount - 1));
				} else if (activeSection === "categories") {
					setFocusedCategoryIndex((prev) =>
						Math.min(prev + 1, categoryCount - 1),
					);
				}
				return;
			}

			// --- Activation ---

			if (key === "Enter") {
				e.preventDefault();
				if (activeSection === "header") {
					onActivateHeader(focusedHeaderIndex);
				} else if (activeSection === "categories") {
					onSelectCategory(focusedCategoryIndex);
				} else if (activeSection === "emails" && emailCount > 0) {
					onOpenEmail(focusedEmailIndex);
				}
				return;
			}

			if (key === " ") {
				e.preventDefault();
				if (activeSection === "header") {
					onActivateHeader(focusedHeaderIndex);
				} else if (activeSection === "categories") {
					onSelectCategory(focusedCategoryIndex);
				} else if (
					activeSection === "emails" &&
					emailCount > 0 &&
					viewMode === "inline" &&
					onToggleExpand
				) {
					onToggleExpand(focusedEmailIndex);
				} else if (activeSection === "emails" && emailCount > 0) {
					onOpenEmail(focusedEmailIndex);
				}
				return;
			}

			// --- Email actions (only when focused on email list) ---

			if (activeSection === "emails" && emailCount > 0) {
				if (key === "q") {
					e.preventDefault();
					onQuickReply?.(focusedEmailIndex);
					return;
				}
				if (key === "e") {
					e.preventDefault();
					onArchiveEmail(focusedEmailIndex);
					return;
				}
				if (key === "f") {
					e.preventDefault();
					onStarEmail(focusedEmailIndex);
					return;
				}
				if (key === "r") {
					e.preventDefault();
					onToggleReadEmail(focusedEmailIndex);
					return;
				}
				if (key === "x") {
					e.preventDefault();
					onSelectEmail(focusedEmailIndex);
					return;
				}
			}

			// --- Deactivate / Collapse ---

			if (key === "Escape") {
				e.preventDefault();
				if (viewMode === "inline" && expandedThreadId && onCollapseExpand) {
					onCollapseExpand();
				} else {
					setIsActive(false);
				}
				return;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [
		disabled,
		isActive,
		activeSection,
		focusedEmailIndex,
		focusedCategoryIndex,
		focusedHeaderIndex,
		emailCount,
		categoryCount,
		headerCount,
		onSelectCategory,
		onOpenEmail,
		onArchiveEmail,
		onStarEmail,
		onToggleReadEmail,
		onSelectEmail,
		onActivateHeader,
		onOpenSearch,
		onNavigateAttachments,
		onNavigateSent,
		onToggleView,
		onToggleViewMode,
		onGoBack,
		scrollEmailIntoView,
		scrollSectionIntoView,
		viewMode,
		expandedThreadId,
		onToggleExpand,
		onCollapseExpand,
		onPeekEmail,
		onQuickReply,
	]);

	return {
		isActive,
		activeSection,
		focusedHeaderIndex,
		focusedCategoryIndex,
		focusedEmailIndex,
		emailRowRef,
		headerRef,
		categoriesRef,
	};
}
