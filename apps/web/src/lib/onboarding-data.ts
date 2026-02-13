export const MODULES = [
	{
		key: "mail",
		code: "MAL",
		name: "Mail",
		icon: "Mail",
		description: "Drafts, sorts, and replies to emails on your behalf",
	},
	{
		key: "cal",
		code: "CAL",
		name: "Calendar",
		icon: "Calendar",
		description: "Schedules meetings, resolves conflicts, sends reminders",
	},
	{
		key: "fin",
		code: "FIN",
		name: "Finance",
		icon: "DollarSign",
		description: "Tracks expenses, sends invoices, flags anomalies",
	},
	{
		key: "crm",
		code: "CRM",
		name: "Contacts",
		icon: "Users",
		description:
			"Manages relationships, logs interactions, suggests follow-ups",
	},
	{
		key: "task",
		code: "TSK",
		name: "Tasks",
		icon: "CheckSquare",
		description: "Captures to-dos, prioritizes, and tracks completion",
	},
	{
		key: "notes",
		code: "NTS",
		name: "Notes",
		icon: "FileText",
		description: "Summarizes meetings, organizes knowledge, quick capture",
	},
	{
		key: "social",
		code: "SOC",
		name: "Social",
		icon: "Share2",
		description: "Drafts posts, schedules content, tracks engagement",
	},
	{
		key: "files",
		code: "FLS",
		name: "Files",
		icon: "FolderOpen",
		description: "Organizes documents, searches across drives, version control",
	},
	{
		key: "travel",
		code: "TRV",
		name: "Travel",
		icon: "Plane",
		description: "Books trips, tracks itineraries, manages loyalty programs",
	},
	{
		key: "health",
		code: "HLT",
		name: "Health",
		icon: "Heart",
		description: "Tracks habits, schedules workouts, logs wellness data",
	},
] as const;

export type Module = (typeof MODULES)[number];
export type ModuleKey = Module["key"];

export function getActiveModules(enabledModules?: string[] | null): Module[] {
	if (!enabledModules) return [];
	return MODULES.filter((m) => enabledModules.includes(m.key));
}

export const ROLE_MODULE_PRESETS: Record<string, ModuleKey[]> = {
	founder: ["mail", "cal", "fin", "crm", "task", "notes"],
	executive: ["mail", "cal", "crm", "task", "notes", "travel"],
	freelancer: ["mail", "cal", "fin", "task", "social", "notes"],
	professional: ["mail", "cal", "task", "notes", "files"],
};

export const INTEGRATIONS = [
	{
		module: "mail",
		provider: "Gmail",
		icon: "Mail",
		description: "Send and receive email",
	},
	{
		module: "mail",
		provider: "Outlook",
		icon: "Mail",
		description: "Microsoft email",
	},
	{
		module: "cal",
		provider: "Google Calendar",
		icon: "Calendar",
		description: "Events and scheduling",
	},
	{
		module: "cal",
		provider: "Outlook Calendar",
		icon: "Calendar",
		description: "Microsoft calendar",
	},
	{
		module: "fin",
		provider: "Stripe",
		icon: "DollarSign",
		description: "Payment processing",
	},
	{
		module: "fin",
		provider: "QuickBooks",
		icon: "DollarSign",
		description: "Accounting",
	},
	{
		module: "crm",
		provider: "HubSpot",
		icon: "Users",
		description: "CRM platform",
	},
	{
		module: "crm",
		provider: "Salesforce",
		icon: "Users",
		description: "CRM platform",
	},
	{
		module: "task",
		provider: "Linear",
		icon: "CheckSquare",
		description: "Issue tracking",
	},
	{
		module: "task",
		provider: "Notion",
		icon: "CheckSquare",
		description: "Project management",
	},
	{
		module: "notes",
		provider: "Notion",
		icon: "FileText",
		description: "Notes and docs",
	},
	{
		module: "social",
		provider: "X / Twitter",
		icon: "Share2",
		description: "Social posting",
	},
	{
		module: "social",
		provider: "LinkedIn",
		icon: "Share2",
		description: "Professional network",
	},
	{
		module: "files",
		provider: "Google Drive",
		icon: "FolderOpen",
		description: "Cloud storage",
	},
	{
		module: "files",
		provider: "Dropbox",
		icon: "FolderOpen",
		description: "File sync",
	},
	{
		module: "travel",
		provider: "Google Flights",
		icon: "Plane",
		description: "Flight search",
	},
	{
		module: "health",
		provider: "Apple Health",
		icon: "Heart",
		description: "Health data",
	},
] as const;

export const ROLES = [
	{
		key: "founder",
		label: "Founder",
		description: "Building a company from the ground up",
		icon: "Rocket",
	},
	{
		key: "executive",
		label: "Executive",
		description: "Leading teams and driving strategy",
		icon: "Briefcase",
	},
	{
		key: "freelancer",
		label: "Freelancer",
		description: "Running your own practice or studio",
		icon: "Palette",
	},
	{
		key: "professional",
		label: "Professional",
		description: "Excelling in your craft and career",
		icon: "GraduationCap",
	},
] as const;

export const PROACTIVITY_OPTIONS = [
	{
		key: "observer",
		label: "Observer",
		description: "Organizes and surfaces. Never acts without asking.",
		icon: "Eye",
	},
	{
		key: "advisor",
		label: "Advisor",
		description: "Drafts, suggests, and nudges. You approve.",
		icon: "Lightbulb",
	},
	{
		key: "autopilot",
		label: "Autopilot",
		description: "Handles routine tasks. Flags only what matters.",
		icon: "Zap",
	},
] as const;

export const NOTIFICATION_OPTIONS = [
	{
		key: "quiet",
		label: "Quiet",
		description: "Daily digest only",
		icon: "Moon",
	},
	{
		key: "balanced",
		label: "Balanced",
		description: "Urgent alerts + daily digest",
		icon: "Bell",
	},
	{
		key: "realtime",
		label: "Real-time",
		description: "Everything as it happens",
		icon: "BellRing",
	},
] as const;
