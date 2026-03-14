import { useCallback, useSyncExternalStore } from "react";

/* ── Widget registry ── */

export type MailWidgetId =
	| "stats"
	| "actionables"
	| "category_breakdown"
	| "auto_handled"
	| "recent_threads"
	| "vip_senders"
	| "recent_attachments"
	| "saved_searches"
	| "account_health"
	| "quick_nav"
	| "response_time"
	| "email_volume"
	| "follow_ups"
	| "labels_overview"
	| "read_later";

export interface MailWidgetDef {
	id: MailWidgetId;
	label: string;
	description: string;
	/** If true, widget cannot be removed */
	pinned?: boolean;
	/** Default width as fraction of container (0–1) */
	defaultWidth: number;
	/** Minimum width as fraction (0–1). Widget cannot be resized below this. */
	minWidth: number;
}

export interface MailWidgetEntry {
	id: MailWidgetId;
	/** Width as fraction of container (0–1). Widgets in same row are normalized. */
	width: number;
}

export const WIDGET_REGISTRY: MailWidgetDef[] = [
	{
		id: "stats",
		label: "Stats",
		description: "At-a-glance email metrics and counters",
		pinned: true,
		defaultWidth: 1,
		minWidth: 0.5,
	},
	{
		id: "actionables",
		label: "Actionables",
		description: "Unified feed of everything needing your attention",
		pinned: true,
		defaultWidth: 1,
		minWidth: 0.4,
	},
	{
		id: "category_breakdown",
		label: "Inbox Breakdown",
		description: "Unread emails grouped by category",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "recent_threads",
		label: "Recent Threads",
		description: "Latest active conversations",
		defaultWidth: 0.5,
		minWidth: 0.25,
	},
	{
		id: "vip_senders",
		label: "VIP Senders",
		description: "Recent emails from your VIP contacts",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "recent_attachments",
		label: "Recent Attachments",
		description: "Latest files received in your inbox",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "auto_handled",
		label: "Auto-handled",
		description: "Emails automatically processed by your rules",
		defaultWidth: 1,
		minWidth: 0.4,
	},
	{
		id: "saved_searches",
		label: "Saved Searches",
		description: "Quick access to your bookmarked filters",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "account_health",
		label: "Account Health",
		description: "Sync status and connection health",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "quick_nav",
		label: "Quick Nav",
		description: "Shortcuts to inbox, sent, files, drafts",
		defaultWidth: 1,
		minWidth: 0.25,
	},
	{
		id: "response_time",
		label: "Response Time",
		description: "Average reply time trends over the past week",
		defaultWidth: 0.5,
		minWidth: 0.25,
	},
	{
		id: "email_volume",
		label: "Email Volume",
		description: "Incoming vs outgoing email activity chart",
		defaultWidth: 0.5,
		minWidth: 0.25,
	},
	{
		id: "follow_ups",
		label: "Follow-ups",
		description: "Emails awaiting a reply from others",
		defaultWidth: 0.5,
		minWidth: 0.25,
	},
	{
		id: "labels_overview",
		label: "Labels",
		description: "Email distribution across your labels",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
	{
		id: "read_later",
		label: "Read Later",
		description: "Emails you've saved to read later",
		defaultWidth: 0.5,
		minWidth: 0.2,
	},
];

/* ── Row grouping ── */

/** Groups a flat list of entries into rows where each row's widths sum ≤ 1.0 */
export function groupIntoRows(entries: MailWidgetEntry[]): MailWidgetEntry[][] {
	const rows: MailWidgetEntry[][] = [];
	let row: MailWidgetEntry[] = [];
	let sum = 0;

	for (const entry of entries) {
		if (row.length > 0 && sum + entry.width > 1.01) {
			rows.push(row);
			row = [entry];
			sum = entry.width;
		} else {
			row.push(entry);
			sum += entry.width;
		}
	}
	if (row.length > 0) rows.push(row);
	return rows;
}

/* ── Default layout ── */

const DEFAULT_LAYOUT: MailWidgetEntry[] = [
	{ id: "stats", width: 1 },
	{ id: "actionables", width: 1 },
	{ id: "category_breakdown", width: 0.5 },
	{ id: "recent_threads", width: 0.5 },
	{ id: "auto_handled", width: 1 },
	{ id: "quick_nav", width: 1 },
];

const STORAGE_KEY = "mail-hub-widgets";

/* ── Persistent store ── */

let listeners: Array<() => void> = [];
let cachedLayout: MailWidgetEntry[] | null = null;

function defForId(id: MailWidgetId): MailWidgetDef | undefined {
	return WIDGET_REGISTRY.find((w) => w.id === id);
}

function getLayout(): MailWidgetEntry[] {
	if (cachedLayout) return cachedLayout;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw);
			const validIds = new Set(WIDGET_REGISTRY.map((w) => w.id));
			let entries: MailWidgetEntry[];

			if (Array.isArray(parsed) && parsed.length > 0) {
				const first = parsed[0];

				if (typeof first === "string") {
					// v1: string[] of IDs
					entries = (parsed as string[])
						.filter((id) => validIds.has(id as MailWidgetId))
						.map((id) => ({
							id: id as MailWidgetId,
							width: defForId(id as MailWidgetId)?.defaultWidth ?? 0.5,
						}));
				} else if ("span" in first && !("width" in first)) {
					// v2: { id, span: 1|2 }[]
					entries = (parsed as { id: MailWidgetId; span: 1 | 2 }[])
						.filter((e) => validIds.has(e.id))
						.map((e) => ({
							id: e.id,
							width: e.span === 2 ? 1 : 0.5,
						}));
				} else {
					// v3: { id, width }[] — current format
					entries = (parsed as MailWidgetEntry[]).filter((e) =>
						validIds.has(e.id),
					);
				}
			} else {
				entries = [];
			}

			// Ensure pinned widgets are present
			for (const w of WIDGET_REGISTRY) {
				if (w.pinned && !entries.some((e) => e.id === w.id)) {
					entries.unshift({ id: w.id, width: w.defaultWidth });
				}
			}

			cachedLayout = entries;
			return entries;
		}
	} catch {
		// ignore
	}
	cachedLayout = DEFAULT_LAYOUT;
	return DEFAULT_LAYOUT;
}

function setLayout(layout: MailWidgetEntry[]) {
	cachedLayout = layout;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
	for (const listener of listeners) {
		listener();
	}
}

function subscribe(listener: () => void) {
	listeners = [...listeners, listener];
	return () => {
		listeners = listeners.filter((l) => l !== listener);
	};
}

/* ── Hook ── */

export function useMailWidgets() {
	const layout = useSyncExternalStore(subscribe, getLayout, getLayout);

	const toggleWidget = useCallback((id: MailWidgetId) => {
		const current = getLayout();
		const def = defForId(id);
		if (def?.pinned) return;

		const existing = current.find((e) => e.id === id);
		if (existing) {
			setLayout(current.filter((e) => e.id !== id));
		} else {
			setLayout([...current, { id, width: def?.defaultWidth ?? 0.5 }]);
		}
	}, []);

	const updateLayout = useCallback((newLayout: MailWidgetEntry[]) => {
		setLayout(newLayout);
	}, []);

	const resetLayout = useCallback(() => {
		setLayout(DEFAULT_LAYOUT);
	}, []);

	const enabledIds = new Set(layout.map((e) => e.id));

	return {
		layout,
		enabledIds,
		toggleWidget,
		updateLayout,
		resetLayout,
		registry: WIDGET_REGISTRY,
	};
}
