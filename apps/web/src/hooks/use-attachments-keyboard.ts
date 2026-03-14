import { useCallback, useEffect, useRef, useState } from "react";

type Section = "header" | "search" | "filters" | "attachments";

type UseAttachmentsKeyboardOptions = {
	attachmentCount: number;
	filterCount: number;
	headerCount: number;
	/** Whether a modal/dialog is open (disables keyboard nav) */
	disabled?: boolean;
	onSelectFilter: (index: number) => void;
	onActivateAttachment: (index: number) => void;
	onActivateHeader: (index: number) => void;
	onActivateSearch?: () => void;
	onOpenSearch?: () => void;
	onNavigateInbox?: () => void;
	onNavigateSent?: () => void;
	onNavigateArchived?: () => void;
	onGoBack?: () => void;
};

type UseAttachmentsKeyboardReturn = {
	/** Whether keyboard navigation is active (hides on mouse move) */
	isActive: boolean;
	activeSection: Section;
	focusedHeaderIndex: number;
	focusedFilterIndex: number;
	focusedAttachmentIndex: number;
	/** Ref callback for attachment card elements (for scrollIntoView) */
	attachmentCardRef: (index: number, el: HTMLElement | null) => void;
	/** Ref callback for the header section element */
	headerRef: (el: HTMLElement | null) => void;
	/** Ref callback for the search section element */
	searchRef: (el: HTMLElement | null) => void;
	/** Ref callback for the filters section element */
	filtersRef: (el: HTMLElement | null) => void;
};

export function useAttachmentsKeyboard({
	attachmentCount,
	filterCount,
	headerCount,
	disabled = false,
	onSelectFilter,
	onActivateAttachment,
	onActivateHeader,
	onActivateSearch,
	onOpenSearch,
	onNavigateInbox,
	onNavigateSent,
	onNavigateArchived,
	onGoBack,
}: UseAttachmentsKeyboardOptions): UseAttachmentsKeyboardReturn {
	const [isActive, setIsActive] = useState(false);
	const [activeSection, setActiveSection] = useState<Section>("attachments");
	const [focusedHeaderIndex, setFocusedHeaderIndex] = useState(0);
	const [focusedFilterIndex, setFocusedFilterIndex] = useState(0);
	const [focusedAttachmentIndex, setFocusedAttachmentIndex] = useState(0);
	const attachmentCardRefs = useRef<Map<number, HTMLElement>>(new Map());
	const headerElRef = useRef<HTMLElement | null>(null);
	const searchElRef = useRef<HTMLElement | null>(null);
	const filtersElRef = useRef<HTMLElement | null>(null);

	// Reset index when attachment list changes
	const prevAttachmentCount = useRef(attachmentCount);
	useEffect(() => {
		if (attachmentCount !== prevAttachmentCount.current) {
			prevAttachmentCount.current = attachmentCount;
			if (focusedAttachmentIndex >= attachmentCount && attachmentCount > 0) {
				setFocusedAttachmentIndex(attachmentCount - 1);
			}
		}
	}, [attachmentCount, focusedAttachmentIndex]);

	const scrollAttachmentIntoView = useCallback((index: number) => {
		const el = attachmentCardRefs.current.get(index);
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, []);

	const scrollSectionIntoView = useCallback((section: Section) => {
		const el =
			section === "header"
				? headerElRef.current
				: section === "search"
					? searchElRef.current
					: filtersElRef.current;
		if (el) {
			el.scrollIntoView({ block: "nearest", behavior: "smooth" });
		}
	}, []);

	const attachmentCardRef = useCallback(
		(index: number, el: HTMLElement | null) => {
			if (el) {
				attachmentCardRefs.current.set(index, el);
			} else {
				attachmentCardRefs.current.delete(index);
			}
		},
		[],
	);

	const headerRef = useCallback((el: HTMLElement | null) => {
		headerElRef.current = el;
	}, []);

	const searchRef = useCallback((el: HTMLElement | null) => {
		searchElRef.current = el;
	}, []);

	const filtersRef = useCallback((el: HTMLElement | null) => {
		filtersElRef.current = el;
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

			// Global shortcut: / to open search
			if (key === "/") {
				e.preventDefault();
				onOpenSearch?.();
				return;
			}

			// Global shortcut: [ to go back
			if (key === "[") {
				e.preventDefault();
				onGoBack?.();
				return;
			}

			// Global shortcut: i to navigate to inbox
			if (key === "i") {
				e.preventDefault();
				onNavigateInbox?.();
				return;
			}

			// Global shortcut: s to navigate to sent
			if (key === "s") {
				e.preventDefault();
				onNavigateSent?.();
				return;
			}

			// Global shortcut: g to navigate to archived
			if (key === "g") {
				e.preventDefault();
				onNavigateArchived?.();
				return;
			}

			// Global shortcut: k to open search (only when inactive)
			if (key === "k" && !isActive) {
				e.preventDefault();
				onOpenSearch?.();
				return;
			}

			// Activate keyboard mode on first relevant keypress
			if (
				!isActive &&
				(key === "ArrowDown" || key === "ArrowUp" || key === "j")
			) {
				e.preventDefault();
				setIsActive(true);
				return;
			}

			if (!isActive) return;

			// --- Navigation: header → search → filters → attachments ---

			if (key === "ArrowDown" || key === "j") {
				e.preventDefault();
				if (activeSection === "header") {
					setActiveSection("search");
					scrollSectionIntoView("search");
					onActivateSearch?.();
				} else if (activeSection === "search") {
					setActiveSection("filters");
					scrollSectionIntoView("filters");
				} else if (activeSection === "filters") {
					setActiveSection("attachments");
					setFocusedAttachmentIndex(0);
					scrollAttachmentIntoView(0);
				} else {
					setFocusedAttachmentIndex((prev) => {
						const next = Math.min(prev + 1, attachmentCount - 1);
						scrollAttachmentIntoView(next);
						return next;
					});
				}
				return;
			}

			if (key === "ArrowUp" || key === "k") {
				e.preventDefault();
				if (activeSection === "attachments" && focusedAttachmentIndex === 0) {
					setActiveSection("filters");
					scrollSectionIntoView("filters");
				} else if (activeSection === "attachments") {
					setFocusedAttachmentIndex((prev) => {
						const next = Math.max(prev - 1, 0);
						scrollAttachmentIntoView(next);
						return next;
					});
				} else if (activeSection === "filters") {
					setActiveSection("search");
					scrollSectionIntoView("search");
					onActivateSearch?.();
				} else if (activeSection === "search") {
					setActiveSection("header");
					scrollSectionIntoView("header");
				}
				return;
			}

			if (key === "ArrowLeft") {
				e.preventDefault();
				if (activeSection === "header") {
					setFocusedHeaderIndex((prev) => Math.max(prev - 1, 0));
				} else if (activeSection === "filters") {
					setFocusedFilterIndex((prev) => Math.max(prev - 1, 0));
				} else if (activeSection === "attachments") {
					setFocusedAttachmentIndex((prev) => {
						const next = Math.max(prev - 1, 0);
						scrollAttachmentIntoView(next);
						return next;
					});
				}
				return;
			}

			if (key === "ArrowRight") {
				e.preventDefault();
				if (activeSection === "header") {
					setFocusedHeaderIndex((prev) => Math.min(prev + 1, headerCount - 1));
				} else if (activeSection === "filters") {
					setFocusedFilterIndex((prev) => Math.min(prev + 1, filterCount - 1));
				} else if (activeSection === "attachments") {
					setFocusedAttachmentIndex((prev) => {
						const next = Math.min(prev + 1, attachmentCount - 1);
						scrollAttachmentIntoView(next);
						return next;
					});
				}
				return;
			}

			// --- Activation ---

			if (key === "Enter" || key === " ") {
				e.preventDefault();
				if (activeSection === "header") {
					onActivateHeader(focusedHeaderIndex);
				} else if (activeSection === "search") {
					onActivateSearch?.();
				} else if (activeSection === "filters") {
					onSelectFilter(focusedFilterIndex);
				} else if (activeSection === "attachments" && attachmentCount > 0) {
					onActivateAttachment(focusedAttachmentIndex);
				}
				return;
			}

			// --- Deactivate ---

			if (key === "Escape") {
				e.preventDefault();
				setIsActive(false);
				return;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [
		disabled,
		isActive,
		activeSection,
		focusedAttachmentIndex,
		focusedFilterIndex,
		focusedHeaderIndex,
		attachmentCount,
		filterCount,
		headerCount,
		onSelectFilter,
		onActivateAttachment,
		onActivateHeader,
		onActivateSearch,
		onOpenSearch,
		onNavigateInbox,
		onNavigateSent,
		onNavigateArchived,
		onGoBack,
		scrollAttachmentIntoView,
		scrollSectionIntoView,
	]);

	return {
		isActive,
		activeSection,
		focusedHeaderIndex,
		focusedFilterIndex,
		focusedAttachmentIndex,
		attachmentCardRef,
		headerRef,
		searchRef,
		filtersRef,
	};
}
