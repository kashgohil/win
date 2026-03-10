import { useCallback, useEffect, useRef, useState } from "react";

/* ── Compose open payload ── */

export type ComposePayload =
	| { mode: "compose"; defaultAccountId?: string }
	| {
			mode: "reply";
			emailId: string;
			fromAddress: string | null;
			subject: string | null;
			originalBody: string | null;
	  }
	| {
			mode: "forward";
			emailId: string;
			fromAddress: string | null;
			subject: string | null;
			originalBody: string | null;
	  };

const EVENT_NAME = "mail:compose";

/**
 * Dispatch a compose event from anywhere in the mail module.
 * The ComposeCard in the mail layout listens for this.
 */
export function openCompose(payload: ComposePayload) {
	document.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: payload }));
}

/**
 * Hook to listen for compose events.
 * Returns the latest payload and controls to manage visibility.
 */
export function useComposeListener() {
	const [visible, setVisible] = useState(false);
	const [payload, setPayload] = useState<ComposePayload | null>(null);
	const payloadRef = useRef<ComposePayload | null>(null);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<ComposePayload>).detail ?? {
				mode: "compose",
			};
			payloadRef.current = detail;
			setPayload(detail);
			setVisible(true);
		};
		document.addEventListener(EVENT_NAME, handler);
		return () => document.removeEventListener(EVENT_NAME, handler);
	}, []);

	const close = useCallback(() => {
		setVisible(false);
		// Keep payload briefly so exit animation can show subject
		setTimeout(() => {
			setPayload(null);
			payloadRef.current = null;
		}, 400);
	}, []);

	return { visible, payload, close, setVisible };
}
