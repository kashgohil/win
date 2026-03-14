import { useCallback, useRef } from "react";
import { toast } from "sonner";

const UNDO_DELAY = 5000;

interface UndoableActionOptions {
	/** Toast message shown on action */
	message: string;
	/** Perform the optimistic cache update. Return a function that reverts it. */
	optimisticUpdate: () => () => void;
	/** The actual API call — only fires after the undo window closes */
	apiCall: () => unknown;
	/** Optional callback after action completes (e.g. navigate back) */
	onComplete?: () => void;
	/** Optional callback after the API call fires (e.g. invalidate related caches) */
	onAfterApiCall?: () => void;
}

export function useUndoableAction() {
	const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	);

	const execute = useCallback(
		({
			message,
			optimisticUpdate,
			apiCall,
			onComplete,
			onAfterApiCall,
		}: UndoableActionOptions) => {
			const revert = optimisticUpdate();
			const actionId = crypto.randomUUID();

			onComplete?.();

			const timer = setTimeout(async () => {
				pendingTimers.current.delete(actionId);
				await apiCall();
				onAfterApiCall?.();
			}, UNDO_DELAY);

			pendingTimers.current.set(actionId, timer);

			toast(message, {
				duration: UNDO_DELAY + 500,
				action: {
					label: "Undo",
					onClick: () => {
						const t = pendingTimers.current.get(actionId);
						if (t) {
							clearTimeout(t);
							pendingTimers.current.delete(actionId);
						}
						revert();
					},
				},
			});
		},
		[],
	);

	return execute;
}
