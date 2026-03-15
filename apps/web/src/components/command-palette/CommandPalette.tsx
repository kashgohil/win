import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { useCreateTask } from "@/hooks/use-tasks";
import { api } from "@/lib/api";
import type { Module } from "@/lib/onboarding-data";
import { useNavigate } from "@tanstack/react-router";
import {
	Calendar,
	CalendarPlus,
	CheckSquare,
	DollarSign,
	FileText,
	FolderOpen,
	Heart,
	Home,
	Loader2,
	Mail,
	Plane,
	Plus,
	Search,
	Share2,
	Sparkles,
	UserPlus,
	Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const MODULE_ICONS: Record<string, React.ReactNode> = {
	mail: <Mail className="size-4" />,
	cal: <Calendar className="size-4" />,
	fin: <DollarSign className="size-4" />,
	crm: <Users className="size-4" />,
	task: <CheckSquare className="size-4" />,
	notes: <FileText className="size-4" />,
	social: <Share2 className="size-4" />,
	files: <FolderOpen className="size-4" />,
	travel: <Plane className="size-4" />,
	health: <Heart className="size-4" />,
};

/* ── Search result types ── */

interface ContactResult {
	id: string;
	name: string | null;
	primaryEmail: string;
	company: string | null;
}

interface TaskResult {
	id: string;
	title: string;
	statusKey: string;
	projectId: string | null;
}

interface MailResult {
	id: string;
	subject: string | null;
	fromName: string | null;
	fromAddress: string | null;
	receivedAt: string;
}

/* ── Debounce hook ── */

function useDebouncedValue<T>(value: T, delayMs: number): T {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, delayMs]);
	return debounced;
}

/* ── Search hook ── */

function useCommandSearch(query: string, modules: Module[]) {
	const [contacts, setContacts] = useState<ContactResult[]>([]);
	const [tasks, setTasks] = useState<TaskResult[]>([]);
	const [emails, setEmails] = useState<MailResult[]>([]);
	const [loading, setLoading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	const hasCrm = modules.some((m) => m.key === "crm");
	const hasTask = modules.some((m) => m.key === "task");
	const hasMail = modules.some((m) => m.key === "mail");

	useEffect(() => {
		if (!query || query.length < 2) {
			setContacts([]);
			setTasks([]);
			setEmails([]);
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);

		const searches: Promise<void>[] = [];

		if (hasCrm) {
			searches.push(
				api.contacts
					.get({
						query: { q: query, limit: "5" },
						fetch: { signal: controller.signal },
					})
					.then(({ data }) => {
						if (!controller.signal.aborted && data) {
							setContacts((data.contacts as ContactResult[]) ?? []);
						}
					})
					.catch(() => {}),
			);
		}

		if (hasTask) {
			searches.push(
				api.tasks
					.get({
						query: { q: query, limit: "5" },
						fetch: { signal: controller.signal },
					})
					.then(({ data }) => {
						if (!controller.signal.aborted && data) {
							setTasks((data.tasks as TaskResult[]) ?? []);
						}
					})
					.catch(() => {}),
			);
		}

		if (hasMail) {
			searches.push(
				api.mail.emails
					.get({
						query: { q: query, limit: "5" },
						fetch: { signal: controller.signal },
					})
					.then(({ data }) => {
						if (!controller.signal.aborted && data) {
							setEmails((data.emails as MailResult[]) ?? []);
						}
					})
					.catch(() => {}),
			);
		}

		Promise.allSettled(searches).then(() => {
			if (!controller.signal.aborted) setLoading(false);
		});

		return () => controller.abort();
	}, [query, hasCrm, hasTask, hasMail]);

	return { contacts, tasks, emails, loading };
}

/* ── AI task parse detection ── */

const AI_TASK_PREFIXES = [
	"remind me to ",
	"todo:",
	"todo ",
	"task:",
	"task ",
	"add task ",
	"new task ",
	"need to ",
	"don't forget to ",
	"remember to ",
];

function looksLikeTask(input: string): boolean {
	const lower = input.toLowerCase().trim();
	return AI_TASK_PREFIXES.some((p) => lower.startsWith(p));
}

interface ParsedTask {
	title: string;
	dueAt: string | null;
	priority: "none" | "low" | "medium" | "high" | "urgent";
	projectName: string | null;
}

function useAiTaskParse(query: string, enabled: boolean) {
	const [parsed, setParsed] = useState<ParsedTask | null>(null);
	const [loading, setLoading] = useState(false);
	const abortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!enabled || !looksLikeTask(query)) {
			setParsed(null);
			return;
		}

		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		setLoading(true);

		api.tasks.parse
			.post({ input: query }, { fetch: { signal: controller.signal } })
			.then(({ data }) => {
				if (!controller.signal.aborted && data) {
					setParsed(data as ParsedTask);
				}
			})
			.catch(() => {})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => controller.abort();
	}, [query, enabled]);

	return { parsed, loading };
}

/* ── Status icons ── */

const STATUS_DOTS: Record<string, string> = {
	todo: "bg-grey-3",
	in_progress: "bg-blue-500",
	done: "bg-emerald-500",
	blocked: "bg-red-500",
	cancelled: "bg-grey-3/50",
};

/* ── Component ── */

interface CommandPaletteProps {
	modules: Module[];
}

export function CommandPalette({ modules }: CommandPaletteProps) {
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const navigate = useNavigate();
	const createTask = useCreateTask();

	const debouncedQuery = useDebouncedValue(inputValue, 250);
	const { contacts, tasks, emails, loading } = useCommandSearch(
		debouncedQuery,
		modules,
	);

	const hasTask = modules.some((m) => m.key === "task");
	const isTaskInput = useMemo(() => looksLikeTask(inputValue), [inputValue]);
	const debouncedTaskInput = useDebouncedValue(inputValue, 500);
	const { parsed: aiParsed, loading: aiParsing } = useAiTaskParse(
		debouncedTaskInput,
		hasTask,
	);

	const hasSearchResults =
		contacts.length > 0 || tasks.length > 0 || emails.length > 0;
	const isSearching = inputValue.length >= 2;

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (!open) setInputValue("");
	}, [open]);

	const runCommand = useCallback((fn: () => void) => {
		setOpen(false);
		fn();
	}, []);

	return (
		<CommandDialog
			open={open}
			onOpenChange={setOpen}
			showCloseButton={false}
			className="top-[18%] translate-y-0 sm:max-w-xl"
		>
			<CommandInput
				placeholder="Type a command or search…"
				value={inputValue}
				onValueChange={setInputValue}
			/>
			<CommandList className="max-h-[400px]">
				<CommandEmpty>
					{loading ? "Searching…" : "No results found."}
				</CommandEmpty>

				{/* Search results */}
				{isSearching && contacts.length > 0 && (
					<CommandGroup heading="Contacts">
						{contacts.map((c) => (
							<CommandItem
								key={c.id}
								value={`contact-${c.name ?? ""}-${c.primaryEmail}`}
								onSelect={() =>
									runCommand(() =>
										navigate({
											to: "/module/crm/$contactId",
											params: { contactId: c.id },
										}),
									)
								}
							>
								<Users className="size-4" />
								<div className="flex flex-col min-w-0">
									<span className="text-[13px] truncate">
										{c.name ?? c.primaryEmail}
									</span>
									<span className="text-[11px] text-grey-3 truncate">
										{c.primaryEmail}
										{c.company ? ` · ${c.company}` : ""}
									</span>
								</div>
							</CommandItem>
						))}
						<CommandItem
							value="view-all-contacts"
							onSelect={() =>
								runCommand(() =>
									navigate({
										to: "/module/crm/list",
										search: { q: inputValue },
									}),
								)
							}
						>
							<Search className="size-4" />
							<span className="text-[12px] text-grey-2">
								View all contacts for "{inputValue}"
							</span>
						</CommandItem>
					</CommandGroup>
				)}

				{isSearching && tasks.length > 0 && (
					<CommandGroup heading="Tasks">
						{tasks.map((t) => (
							<CommandItem
								key={t.id}
								value={`task-${t.title}`}
								onSelect={() =>
									runCommand(() =>
										navigate({
											to: "/module/task/list",
											search: { q: inputValue },
										}),
									)
								}
							>
								<span
									className={`size-2 rounded-full shrink-0 ${STATUS_DOTS[t.statusKey] ?? "bg-grey-3"}`}
								/>
								<span className="text-[13px] truncate">{t.title}</span>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{isSearching && emails.length > 0 && (
					<CommandGroup heading="Mail">
						{emails.map((e) => (
							<CommandItem
								key={e.id}
								value={`mail-${e.subject ?? ""}-${e.fromName ?? ""}`}
								onSelect={() =>
									runCommand(() => navigate({ to: "/module/mail" }))
								}
							>
								<Mail className="size-4" />
								<div className="flex flex-col min-w-0">
									<span className="text-[13px] truncate">
										{e.subject ?? "(no subject)"}
									</span>
									<span className="text-[11px] text-grey-3 truncate">
										{e.fromName ?? e.fromAddress ?? ""}
									</span>
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				)}

				{/* Quick actions */}
				<CommandGroup heading="Quick Actions">
					{/* AI-parsed task preview */}
					{hasTask && isTaskInput && aiParsing && (
						<CommandItem value="ai-task-parsing" disabled>
							<Loader2 className="size-4 animate-spin" />
							<span className="text-grey-2">Parsing task…</span>
						</CommandItem>
					)}
					{hasTask && aiParsed && isTaskInput && !aiParsing && (
						<CommandItem
							value={`ai-task-create ${aiParsed.title}`}
							onSelect={() => {
								setOpen(false);
								createTask.mutate(
									{
										title: aiParsed.title,
										priority: aiParsed.priority,
										dueAt: aiParsed.dueAt,
									},
									{
										onSuccess: () =>
											toast(`Task "${aiParsed.title}" created`),
										onError: () => toast.error("Failed to create task"),
									},
								);
							}}
						>
							<Sparkles className="size-4" />
							<div className="flex flex-col min-w-0">
								<span className="text-[13px] truncate">{aiParsed.title}</span>
								<span className="text-[11px] text-grey-3 truncate">
									{[
										aiParsed.priority !== "none" && aiParsed.priority,
										aiParsed.dueAt &&
											`due ${new Date(aiParsed.dueAt).toLocaleDateString()}`,
										aiParsed.projectName && `#${aiParsed.projectName}`,
									]
										.filter(Boolean)
										.join(" · ") || "Create with AI"}
								</span>
							</div>
						</CommandItem>
					)}
					{hasTask && (
						<CommandItem
							value={`create-task ${inputValue}`}
							onSelect={() => {
								const title = inputValue.trim() || "New task";
								setOpen(false);
								createTask.mutate(
									{ title },
									{
										onSuccess: () => toast(`Task "${title}" created`),
										onError: () => toast.error("Failed to create task"),
									},
								);
							}}
						>
							<Plus className="size-4" />
							<span>
								Create task
								{inputValue.trim() ? `: ${inputValue.trim()}` : ""}
							</span>
						</CommandItem>
					)}
					{modules.some((m) => m.key === "crm") && (
						<CommandItem
							value="create-contact new"
							onSelect={() =>
								runCommand(() => navigate({ to: "/module/crm/list" }))
							}
						>
							<UserPlus className="size-4" />
							<span>Create contact</span>
						</CommandItem>
					)}
					{modules.some((m) => m.key === "cal") && (
						<CommandItem
							value="create-event calendar new"
							onSelect={() => runCommand(() => navigate({ to: "/module/cal" }))}
						>
							<CalendarPlus className="size-4" />
							<span>Create event</span>
						</CommandItem>
					)}
				</CommandGroup>

				<CommandSeparator />

				{/* Static navigation (hidden when search results showing) */}
				{!hasSearchResults && (
					<>
						<CommandGroup heading="Navigate">
							<CommandItem
								onSelect={() => runCommand(() => navigate({ to: "/" }))}
							>
								<Home className="size-4" />
								<span>Home</span>
							</CommandItem>
							{modules.map((mod) => (
								<CommandItem
									key={mod.key}
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: `/module/${mod.key}`,
											}),
										)
									}
								>
									{MODULE_ICONS[mod.key]}
									<span>{mod.name}</span>
									<CommandShortcut>{mod.code}</CommandShortcut>
								</CommandItem>
							))}
						</CommandGroup>

						<CommandSeparator />

						{modules.some((m) => m.key === "task") && (
							<CommandGroup heading="Tasks">
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/task/list",
											}),
										)
									}
								>
									<CheckSquare className="size-4" />
									<span>All tasks</span>
									<CommandShortcut>L</CommandShortcut>
								</CommandItem>
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/task/list",
												search: { view: "board" },
											}),
										)
									}
								>
									<CheckSquare className="size-4" />
									<span>Board view</span>
									<CommandShortcut>B</CommandShortcut>
								</CommandItem>
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/task/calendar",
											}),
										)
									}
								>
									<Calendar className="size-4" />
									<span>Task calendar</span>
									<CommandShortcut>C</CommandShortcut>
								</CommandItem>
							</CommandGroup>
						)}

						{modules.some((m) => m.key === "crm") && (
							<CommandGroup heading="Contacts">
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/crm/list",
											}),
										)
									}
								>
									<Users className="size-4" />
									<span>All contacts</span>
								</CommandItem>
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/crm/follow-ups",
											}),
										)
									}
								>
									<Users className="size-4" />
									<span>Follow-ups</span>
								</CommandItem>
							</CommandGroup>
						)}

						{modules.some((m) => m.key === "mail") && (
							<CommandGroup heading="Mail">
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/mail",
											}),
										)
									}
								>
									<Mail className="size-4" />
									<span>Inbox</span>
								</CommandItem>
								<CommandItem
									onSelect={() =>
										runCommand(() =>
											navigate({
												to: "/module/mail/sent",
												search: {
													starred: undefined,
													attachment: undefined,
												},
											}),
										)
									}
								>
									<Mail className="size-4" />
									<span>Sent mail</span>
								</CommandItem>
							</CommandGroup>
						)}
					</>
				)}
			</CommandList>
		</CommandDialog>
	);
}
