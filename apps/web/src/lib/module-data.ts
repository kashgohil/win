import type { ModuleKey } from "./onboarding-data";

/* ── Types ── */

export interface TriageItem {
	id: string;
	title: string;
	subtitle?: string;
	timestamp: string;
	urgent?: boolean;
	actions: { label: string; variant?: "default" | "outline" | "ghost" }[];
	sourceModule?: ModuleKey;
}

export interface AutoHandledItem {
	id: string;
	text: string;
	linkedModule?: ModuleKey;
	timestamp: string;
}

export interface BriefingStat {
	label: string;
	value: string | number;
	trend?: "up" | "down" | "neutral";
	accent?: boolean;
}

export interface ModuleData {
	briefing: BriefingStat[];
	triage: TriageItem[];
	autoHandled: AutoHandledItem[];
}

/* ── Mail ── */

const MAIL_DATA: ModuleData = {
	briefing: [
		{ label: "unread", value: 14 },
		{ label: "need you", value: 3, accent: true },
		{ label: "auto-handled", value: 8 },
	],
	triage: [
		{
			id: "m1",
			title: "Contract from Acme Corp",
			subtitle: "Reply drafted — needs your review before sending",
			timestamp: "2h ago",
			urgent: true,
			actions: [
				{ label: "Send as-is", variant: "default" },
				{ label: "Edit draft", variant: "outline" },
				{ label: "Dismiss", variant: "ghost" },
			],
		},
		{
			id: "m2",
			title: "Investor intro — Sarah Chen",
			subtitle: "Forward to CRM and log as new contact?",
			timestamp: "4h ago",
			actions: [
				{ label: "Yes, log it", variant: "default" },
				{ label: "No", variant: "ghost" },
			],
			sourceModule: "crm",
		},
		{
			id: "m3",
			title: "Q4 board deck feedback",
			subtitle: "3 comments from David — suggest replying with summary",
			timestamp: "5h ago",
			actions: [
				{ label: "Reply with summary", variant: "default" },
				{ label: "Open thread", variant: "outline" },
			],
		},
	],
	autoHandled: [
		{
			id: "ma1",
			text: "5 newsletters archived",
			timestamp: "1h ago",
		},
		{
			id: "ma2",
			text: "2 receipts forwarded",
			linkedModule: "fin",
			timestamp: "2h ago",
		},
		{
			id: "ma3",
			text: "1 meeting confirmation synced",
			linkedModule: "cal",
			timestamp: "3h ago",
		},
		{
			id: "ma4",
			text: "3 promotional emails filtered",
			timestamp: "4h ago",
		},
		{
			id: "ma5",
			text: "Auto-replied to delivery notification",
			timestamp: "5h ago",
		},
	],
};

/* ── Calendar ── */

const CAL_DATA: ModuleData = {
	briefing: [
		{ label: "next event", value: "42min" },
		{ label: "conflicts", value: 1, accent: true },
		{ label: "free blocks", value: "2.5h" },
	],
	triage: [
		{
			id: "c1",
			title: "Double-booked: 2pm Tuesday",
			subtitle:
				"Team standup (recurring) vs. Client call with Meridian (new, high-priority)",
			timestamp: "just now",
			urgent: true,
			actions: [
				{ label: "Keep standup", variant: "outline" },
				{ label: "Move standup", variant: "default" },
				{ label: "AI decides", variant: "ghost" },
			],
		},
		{
			id: "c2",
			title: "Meeting prep: Board review Thursday",
			subtitle: "3 docs attached — estimated 45min read time",
			timestamp: "1d away",
			actions: [
				{ label: "Summarize docs", variant: "default" },
				{ label: "Block prep time", variant: "outline" },
			],
			sourceModule: "files",
		},
		{
			id: "c3",
			title: "Reschedule request from Alex",
			subtitle: "Wants to move Friday 1:1 to Monday 10am — you're free",
			timestamp: "30min ago",
			actions: [
				{ label: "Accept", variant: "default" },
				{ label: "Suggest alternative", variant: "outline" },
				{ label: "Decline", variant: "ghost" },
			],
		},
	],
	autoHandled: [
		{
			id: "ca1",
			text: "Declined 2 low-priority meeting requests",
			timestamp: "1h ago",
		},
		{
			id: "ca2",
			text: "Added travel buffer before client visit",
			linkedModule: "travel",
			timestamp: "2h ago",
		},
		{
			id: "ca3",
			text: "Sent reminder for tomorrow's dentist appointment",
			timestamp: "3h ago",
		},
		{
			id: "ca4",
			text: "Protected your 2-hour deep work block",
			timestamp: "today",
		},
	],
};

/* ── Finance ── */

const FIN_DATA: ModuleData = {
	briefing: [
		{ label: "spent this month", value: "$4,212" },
		{ label: "of budget", value: "72%", trend: "up" },
		{ label: "anomalies", value: 2, accent: true },
	],
	triage: [
		{
			id: "f1",
			title: "Spotify charged twice — $9.99 x 2",
			subtitle: "Duplicate charge detected on Feb 10. Dispute recommended.",
			timestamp: "1d ago",
			urgent: true,
			actions: [
				{ label: "Dispute charge", variant: "default" },
				{ label: "Mark as expected", variant: "ghost" },
			],
		},
		{
			id: "f2",
			title: "AWS bill spike — +340% vs last month",
			subtitle: "$847 vs $192 average. Likely caused by new staging env.",
			timestamp: "2d ago",
			urgent: true,
			actions: [
				{ label: "Investigate", variant: "default" },
				{ label: "Acknowledge", variant: "outline" },
			],
		},
		{
			id: "f3",
			title: "Invoice #4021 is 3 days overdue",
			subtitle: "Acme Corp — $12,500. Follow-up email drafted.",
			timestamp: "3d ago",
			actions: [
				{ label: "Send follow-up", variant: "default" },
				{ label: "Mark as paid", variant: "outline" },
				{ label: "Snooze", variant: "ghost" },
			],
			sourceModule: "mail",
		},
	],
	autoHandled: [
		{
			id: "fa1",
			text: "Categorized 12 transactions",
			timestamp: "today",
		},
		{
			id: "fa2",
			text: "Logged 2 email receipts as expenses",
			linkedModule: "mail",
			timestamp: "today",
		},
		{
			id: "fa3",
			text: "Updated monthly budget forecast",
			timestamp: "yesterday",
		},
		{
			id: "fa4",
			text: "Renewed domain subscription tracked",
			timestamp: "2d ago",
		},
	],
};

/* ── CRM / Contacts ── */

const CRM_DATA: ModuleData = {
	briefing: [
		{ label: "touched this week", value: 18 },
		{ label: "follow-ups due", value: 4, accent: true },
		{ label: "cooling off", value: 2, trend: "down" },
	],
	triage: [
		{
			id: "cr1",
			title: "Follow up with Marcus Rivera",
			subtitle: "Last contact 12 days ago. Relationship score dropping.",
			timestamp: "overdue",
			urgent: true,
			actions: [
				{ label: "Draft email", variant: "default" },
				{ label: "Schedule call", variant: "outline" },
				{ label: "Snooze 1 week", variant: "ghost" },
			],
			sourceModule: "mail",
		},
		{
			id: "cr2",
			title: "New contact detected: Priya Sharma",
			subtitle: "Appeared in 3 emails this week. Auto-create contact?",
			timestamp: "2d ago",
			actions: [
				{ label: "Create contact", variant: "default" },
				{ label: "Ignore", variant: "ghost" },
			],
		},
		{
			id: "cr3",
			title: "Quarterly check-in reminder",
			subtitle: "4 key contacts haven't been reached in 60+ days",
			timestamp: "this week",
			actions: [
				{ label: "View contacts", variant: "default" },
				{ label: "Auto-schedule", variant: "outline" },
			],
			sourceModule: "cal",
		},
		{
			id: "cr4",
			title: "LinkedIn intro request: James Park",
			subtitle: "Connected via Sarah Chen. Log interaction?",
			timestamp: "5h ago",
			actions: [
				{ label: "Log it", variant: "default" },
				{ label: "Skip", variant: "ghost" },
			],
			sourceModule: "social",
		},
	],
	autoHandled: [
		{
			id: "cra1",
			text: "Updated 6 contact records from email activity",
			linkedModule: "mail",
			timestamp: "today",
		},
		{
			id: "cra2",
			text: "Logged 2 meeting interactions",
			linkedModule: "cal",
			timestamp: "today",
		},
		{
			id: "cra3",
			text: "Enriched 3 profiles with public data",
			timestamp: "yesterday",
		},
	],
};

/* ── Tasks ── */

const TASK_DATA: ModuleData = {
	briefing: [
		{ label: "completed today", value: "5 of 8" },
		{ label: "overdue", value: 1, accent: true },
		{ label: "due this week", value: 6 },
	],
	triage: [
		{
			id: "t1",
			title: "Review PR #342 — auth refactor",
			subtitle: "Assigned by David. Requested 2 days ago.",
			timestamp: "overdue",
			urgent: true,
			actions: [
				{ label: "Open PR", variant: "default" },
				{ label: "Delegate", variant: "outline" },
				{ label: "Snooze", variant: "ghost" },
			],
		},
		{
			id: "t2",
			title: "Prepare slide deck for Friday",
			subtitle: "AI can generate outline from your notes",
			timestamp: "due in 2d",
			actions: [
				{ label: "Generate outline", variant: "default" },
				{ label: "Start blank", variant: "outline" },
			],
			sourceModule: "notes",
		},
		{
			id: "t3",
			title: "Approve expense reports",
			subtitle: "3 reports from team members pending your approval",
			timestamp: "due today",
			actions: [
				{ label: "Review all", variant: "default" },
				{ label: "Auto-approve", variant: "outline" },
			],
			sourceModule: "fin",
		},
	],
	autoHandled: [
		{
			id: "ta1",
			text: "Marked 'Send invoice to Acme' as complete",
			linkedModule: "fin",
			timestamp: "1h ago",
		},
		{
			id: "ta2",
			text: "Re-prioritized 3 tasks based on deadlines",
			timestamp: "today",
		},
		{
			id: "ta3",
			text: "Created task from email: 'Review partnership terms'",
			linkedModule: "mail",
			timestamp: "today",
		},
	],
};

/* ── Notes ── */

const NOTES_DATA: ModuleData = {
	briefing: [
		{ label: "captured today", value: 4 },
		{ label: "unsorted", value: 2, accent: true },
		{ label: "last edited", value: "35min" },
	],
	triage: [
		{
			id: "n1",
			title: "Meeting notes need review",
			subtitle: "Auto-captured from 'Product roadmap sync' — verify accuracy",
			timestamp: "2h ago",
			actions: [
				{ label: "Review notes", variant: "default" },
				{ label: "Approve as-is", variant: "outline" },
			],
			sourceModule: "cal",
		},
		{
			id: "n2",
			title: "Organize uncategorized captures",
			subtitle: "2 voice memos and 1 quick note need filing",
			timestamp: "today",
			actions: [
				{ label: "Auto-organize", variant: "default" },
				{ label: "Review manually", variant: "outline" },
			],
		},
	],
	autoHandled: [
		{
			id: "na1",
			text: "Summarized 45-min product sync into key points",
			linkedModule: "cal",
			timestamp: "2h ago",
		},
		{
			id: "na2",
			text: "Tagged 3 notes with project references",
			linkedModule: "task",
			timestamp: "today",
		},
		{
			id: "na3",
			text: "Linked meeting action items to tasks",
			linkedModule: "task",
			timestamp: "today",
		},
	],
};

/* ── Social ── */

const SOCIAL_DATA: ModuleData = {
	briefing: [
		{ label: "new interactions", value: 12 },
		{ label: "drafts ready", value: 2, accent: true },
		{ label: "scheduled", value: 3 },
	],
	triage: [
		{
			id: "s1",
			title: "Post draft ready for review",
			subtitle: "LinkedIn article on Q4 learnings — AI-drafted from your notes",
			timestamp: "1h ago",
			actions: [
				{ label: "Review & post", variant: "default" },
				{ label: "Edit draft", variant: "outline" },
				{ label: "Discard", variant: "ghost" },
			],
			sourceModule: "notes",
		},
		{
			id: "s2",
			title: "Engagement spike on last post",
			subtitle: "143 reactions, 28 comments — 3 worth replying to",
			timestamp: "6h ago",
			actions: [
				{ label: "View & reply", variant: "default" },
				{ label: "Auto-reply top 3", variant: "outline" },
			],
		},
	],
	autoHandled: [
		{
			id: "sa1",
			text: "Published scheduled post on X",
			timestamp: "9am",
		},
		{
			id: "sa2",
			text: "Liked 4 posts from key contacts",
			linkedModule: "crm",
			timestamp: "today",
		},
		{
			id: "sa3",
			text: "Saved trending article to reading list",
			timestamp: "today",
		},
	],
};

/* ── Files ── */

const FILES_DATA: ModuleData = {
	briefing: [
		{ label: "total synced", value: "2,341" },
		{ label: "recently shared", value: 5 },
		{ label: "storage used", value: "68%" },
	],
	triage: [
		{
			id: "fl1",
			title: "Shared doc needs your attention",
			subtitle:
				"'Partnership Agreement v3' — 2 comments awaiting your response",
			timestamp: "4h ago",
			actions: [
				{ label: "Open document", variant: "default" },
				{ label: "Reply inline", variant: "outline" },
			],
		},
		{
			id: "fl2",
			title: "Duplicate files detected",
			subtitle: "3 copies of 'Brand Guidelines.pdf' across drives",
			timestamp: "1d ago",
			actions: [
				{ label: "Merge & clean", variant: "default" },
				{ label: "Review", variant: "outline" },
				{ label: "Ignore", variant: "ghost" },
			],
		},
	],
	autoHandled: [
		{
			id: "fla1",
			text: "Synced 12 files from Google Drive",
			timestamp: "1h ago",
		},
		{
			id: "fla2",
			text: "Organized 5 downloads into project folders",
			timestamp: "today",
		},
		{
			id: "fla3",
			text: "Backed up meeting recordings",
			linkedModule: "cal",
			timestamp: "yesterday",
		},
	],
};

/* ── Travel ── */

const TRAVEL_DATA: ModuleData = {
	briefing: [
		{ label: "upcoming trips", value: 1 },
		{ label: "price alerts", value: 2, accent: true },
		{ label: "loyalty points", value: "42k" },
	],
	triage: [
		{
			id: "tr1",
			title: "Flight price dropped — SFO to NYC",
			subtitle: "Mar 15 nonstop now $289 (was $412). Save $123.",
			timestamp: "2h ago",
			urgent: true,
			actions: [
				{ label: "Book now", variant: "default" },
				{ label: "Set lower alert", variant: "outline" },
				{ label: "Dismiss", variant: "ghost" },
			],
		},
		{
			id: "tr2",
			title: "Hotel confirmation needed",
			subtitle: "NYC trip Mar 15-18 — 2 options shortlisted within budget",
			timestamp: "1d ago",
			actions: [
				{ label: "Compare options", variant: "default" },
				{ label: "Auto-book cheapest", variant: "outline" },
			],
		},
	],
	autoHandled: [
		{
			id: "tra1",
			text: "Added flight to calendar",
			linkedModule: "cal",
			timestamp: "2h ago",
		},
		{
			id: "tra2",
			text: "Tracked loyalty points from last trip",
			timestamp: "3d ago",
		},
		{
			id: "tra3",
			text: "Set price alert for return flight",
			timestamp: "1w ago",
		},
	],
};

/* ── Health ── */

const HEALTH_DATA: ModuleData = {
	briefing: [
		{ label: "streak", value: "3 days" },
		{ label: "today's goal", value: "72%" },
		{ label: "sleep score", value: "84" },
	],
	triage: [
		{
			id: "h1",
			title: "Workout reminder: you've been sedentary 3h",
			subtitle: "Calendar shows a 30-min free block at 3pm",
			timestamp: "just now",
			actions: [
				{ label: "Block 3pm", variant: "default" },
				{ label: "Snooze 1h", variant: "outline" },
				{ label: "Skip today", variant: "ghost" },
			],
			sourceModule: "cal",
		},
		{
			id: "h2",
			title: "Weekly wellness check-in",
			subtitle: "Rate your energy, sleep quality, and stress this week",
			timestamp: "Sunday",
			actions: [
				{ label: "Quick check-in", variant: "default" },
				{ label: "Remind later", variant: "ghost" },
			],
		},
	],
	autoHandled: [
		{
			id: "ha1",
			text: "Logged 7,842 steps from Apple Health",
			timestamp: "today",
		},
		{
			id: "ha2",
			text: "Tracked 7.5h sleep (good)",
			timestamp: "this morning",
		},
		{
			id: "ha3",
			text: "Nudged hydration reminder at 2pm",
			timestamp: "today",
		},
	],
};

/* ── Export ── */

export const MODULE_DATA: Record<ModuleKey, ModuleData> = {
	mail: MAIL_DATA,
	cal: CAL_DATA,
	fin: FIN_DATA,
	crm: CRM_DATA,
	task: TASK_DATA,
	notes: NOTES_DATA,
	social: SOCIAL_DATA,
	files: FILES_DATA,
	travel: TRAVEL_DATA,
	health: HEALTH_DATA,
};
