import { ConfirmDialog } from "@/components/tasks/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
	type AutomationAction,
	type AutomationRule,
	type AutomationTrigger,
	useAutomationRules,
	useCreateAutomationRule,
	useDeleteAutomationRule,
	useProjects,
	useUpdateAutomationRule,
} from "@/hooks/use-tasks";
import {
	Bell,
	FolderInput,
	Loader2,
	Pencil,
	Plus,
	SignalHigh,
	Trash2,
	Workflow,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const TRIGGERS: { value: AutomationTrigger; label: string }[] = [
	{ value: "status_changed", label: "Status changes" },
	{ value: "task_created", label: "Task created" },
	{ value: "task_overdue", label: "Task overdue" },
	{ value: "priority_changed", label: "Priority changes" },
];

const ACTIONS: { value: AutomationAction; label: string; icon: typeof Zap }[] =
	[
		{ value: "notify", label: "Send notification", icon: Bell },
		{ value: "set_status", label: "Set status", icon: Workflow },
		{ value: "set_priority", label: "Set priority", icon: SignalHigh },
		{ value: "move_project", label: "Move to project", icon: FolderInput },
	];

const STATUSES = [
	{ value: "todo", label: "To do" },
	{ value: "in_progress", label: "In progress" },
	{ value: "done", label: "Done" },
	{ value: "blocked", label: "Blocked" },
	{ value: "cancelled", label: "Cancelled" },
];

const PRIORITIES = [
	{ value: "none", label: "None" },
	{ value: "low", label: "Low" },
	{ value: "medium", label: "Medium" },
	{ value: "high", label: "High" },
	{ value: "urgent", label: "Urgent" },
];

type RuleFormState = {
	name: string;
	trigger: AutomationTrigger;
	action: AutomationAction;
	conditions: Record<string, string>;
	actionParams: Record<string, string>;
};

const defaultForm: RuleFormState = {
	name: "",
	trigger: "status_changed",
	action: "notify",
	conditions: {},
	actionParams: {},
};

export function TaskAutomations() {
	const { data: rules, isLoading } = useAutomationRules();
	const createRule = useCreateAutomationRule();
	const updateRule = useUpdateAutomationRule();
	const deleteRule = useDeleteAutomationRule();
	const { data: projects } = useProjects();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
	const [deleteId, setDeleteId] = useState<string | null>(null);
	const [form, setForm] = useState<RuleFormState>(defaultForm);

	const openCreate = () => {
		setEditingRule(null);
		setForm(defaultForm);
		setDialogOpen(true);
	};

	const openEdit = (rule: AutomationRule) => {
		setEditingRule(rule);
		setForm({
			name: rule.name,
			trigger: rule.trigger,
			action: rule.action,
			conditions: (rule.conditions as Record<string, string>) ?? {},
			actionParams: (rule.actionParams as Record<string, string>) ?? {},
		});
		setDialogOpen(true);
	};

	const handleSave = () => {
		if (!form.name.trim()) {
			toast.error("Rule name is required");
			return;
		}

		const conditions = Object.keys(form.conditions).length
			? form.conditions
			: undefined;
		const actionParams = Object.keys(form.actionParams).length
			? form.actionParams
			: undefined;

		if (editingRule) {
			updateRule.mutate(
				{
					id: editingRule.id,
					name: form.name,
					trigger: form.trigger,
					action: form.action,
					conditions,
					actionParams,
				},
				{
					onSuccess: () => {
						toast("Rule updated");
						setDialogOpen(false);
					},
					onError: () => toast.error("Failed to update rule"),
				},
			);
		} else {
			createRule.mutate(
				{
					name: form.name,
					trigger: form.trigger,
					action: form.action,
					conditions,
					actionParams,
				},
				{
					onSuccess: () => {
						toast("Rule created");
						setDialogOpen(false);
					},
					onError: () => toast.error("Failed to create rule"),
				},
			);
		}
	};

	const handleToggle = (rule: AutomationRule) => {
		updateRule.mutate(
			{ id: rule.id, enabled: !rule.enabled },
			{
				onError: () => toast.error("Failed to toggle rule"),
			},
		);
	};

	const handleDelete = () => {
		if (!deleteId) return;
		deleteRule.mutate(deleteId, {
			onSuccess: () => {
				toast("Rule deleted");
				setDeleteId(null);
			},
			onError: () => toast.error("Failed to delete rule"),
		});
	};

	const setCondition = (key: string, value: string) => {
		setForm((prev) => ({
			...prev,
			conditions: value
				? { ...prev.conditions, [key]: value }
				: Object.fromEntries(
						Object.entries(prev.conditions).filter(([k]) => k !== key),
					),
		}));
	};

	const setActionParam = (key: string, value: string) => {
		setForm((prev) => ({
			...prev,
			actionParams: value
				? { ...prev.actionParams, [key]: value }
				: Object.fromEntries(
						Object.entries(prev.actionParams).filter(([k]) => k !== key),
					),
		}));
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="h-16 rounded-lg bg-secondary/20 animate-pulse"
					/>
				))}
			</div>
		);
	}

	const activeProjects = projects?.filter((p) => !p.archived) ?? [];
	const isSaving = createRule.isPending || updateRule.isPending;

	return (
		<div className="space-y-3">
			{(!rules || rules.length === 0) && (
				<div className="rounded-lg border border-dashed border-border/40 px-4 py-6 text-center">
					<Zap className="size-5 text-grey-3 mx-auto mb-2" />
					<p className="font-body text-[13px] text-grey-3">
						No automation rules yet
					</p>
					<p className="font-body text-[12px] text-grey-3/60 mt-0.5">
						Create rules to automate repetitive task actions
					</p>
				</div>
			)}

			{rules?.map((rule) => {
				const triggerLabel =
					TRIGGERS.find((t) => t.value === rule.trigger)?.label ?? rule.trigger;
				const actionDef = ACTIONS.find((a) => a.value === rule.action);
				const ActionIcon = actionDef?.icon ?? Zap;

				return (
					<div
						key={rule.id}
						className="flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-secondary/5 px-4 py-3"
					>
						<div className="flex items-center gap-3 min-w-0">
							<div className="size-8 rounded-md flex items-center justify-center bg-violet-500/10 text-violet-500">
								<ActionIcon className="size-4" />
							</div>
							<div className="min-w-0">
								<span className="font-body text-[14px] text-foreground font-medium block truncate">
									{rule.name}
								</span>
								<span className="font-mono text-[10px] text-grey-3 block">
									When {triggerLabel.toLowerCase()} →{" "}
									{actionDef?.label ?? rule.action}
								</span>
							</div>
						</div>

						<div className="flex items-center gap-2 shrink-0">
							<Switch
								checked={rule.enabled}
								onCheckedChange={() => handleToggle(rule)}
							/>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => openEdit(rule)}
								className="font-mono text-[11px] gap-1.5"
							>
								<Pencil className="size-3" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setDeleteId(rule.id)}
								className="font-mono text-[11px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
							>
								<Trash2 className="size-3" />
							</Button>
						</div>
					</div>
				);
			})}

			<Button
				variant="outline"
				size="sm"
				onClick={openCreate}
				className="font-mono text-[11px] gap-1.5 mt-2"
			>
				<Plus className="size-3" />
				New rule
			</Button>

			{/* Create / Edit dialog */}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-[1rem]">
							{editingRule ? "Edit rule" : "New automation rule"}
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4 mt-2">
						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
								Name
							</span>
							<Input
								value={form.name}
								onChange={(e) =>
									setForm((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="e.g. Notify on high priority"
								className="font-body text-[13px]"
							/>
						</div>

						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
								When
							</span>
							<Select
								value={form.trigger}
								onValueChange={(v) =>
									setForm((prev) => ({
										...prev,
										trigger: v as AutomationTrigger,
										conditions: {},
									}))
								}
							>
								<SelectTrigger className="font-body text-[13px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{TRIGGERS.map((t) => (
										<SelectItem key={t.value} value={t.value}>
											{t.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Condition fields based on trigger */}
						{form.trigger === "status_changed" && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
										From status
									</span>
									<Select
										value={form.conditions.fromStatus ?? ""}
										onValueChange={(v) => setCondition("fromStatus", v)}
									>
										<SelectTrigger className="font-body text-[13px]">
											<SelectValue placeholder="Any" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">Any</SelectItem>
											{STATUSES.map((s) => (
												<SelectItem key={s.value} value={s.value}>
													{s.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
										To status
									</span>
									<Select
										value={form.conditions.toStatus ?? ""}
										onValueChange={(v) => setCondition("toStatus", v)}
									>
										<SelectTrigger className="font-body text-[13px]">
											<SelectValue placeholder="Any" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">Any</SelectItem>
											{STATUSES.map((s) => (
												<SelectItem key={s.value} value={s.value}>
													{s.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						{(form.trigger === "task_created" ||
							form.trigger === "task_overdue") && (
							<div className="grid grid-cols-2 gap-3">
								<div>
									<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
										Priority
									</span>
									<Select
										value={form.conditions.priority ?? ""}
										onValueChange={(v) => setCondition("priority", v)}
									>
										<SelectTrigger className="font-body text-[13px]">
											<SelectValue placeholder="Any" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">Any</SelectItem>
											{PRIORITIES.map((p) => (
												<SelectItem key={p.value} value={p.value}>
													{p.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
										Project
									</span>
									<Select
										value={form.conditions.projectId ?? ""}
										onValueChange={(v) => setCondition("projectId", v)}
									>
										<SelectTrigger className="font-body text-[13px]">
											<SelectValue placeholder="Any" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">Any</SelectItem>
											{activeProjects.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
						)}

						<div>
							<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
								Then
							</span>
							<Select
								value={form.action}
								onValueChange={(v) =>
									setForm((prev) => ({
										...prev,
										action: v as AutomationAction,
										actionParams: {},
									}))
								}
							>
								<SelectTrigger className="font-body text-[13px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ACTIONS.map((a) => (
										<SelectItem key={a.value} value={a.value}>
											{a.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Action params based on action */}
						{form.action === "notify" && (
							<div>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
									Message (optional)
								</span>
								<Input
									value={form.actionParams.message ?? ""}
									onChange={(e) => setActionParam("message", e.target.value)}
									placeholder="Custom notification message"
									className="font-body text-[13px]"
								/>
							</div>
						)}

						{form.action === "set_status" && (
							<div>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
									Set to
								</span>
								<Select
									value={form.actionParams.status ?? ""}
									onValueChange={(v) => setActionParam("status", v)}
								>
									<SelectTrigger className="font-body text-[13px]">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										{STATUSES.map((s) => (
											<SelectItem key={s.value} value={s.value}>
												{s.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{form.action === "set_priority" && (
							<div>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
									Set to
								</span>
								<Select
									value={form.actionParams.priority ?? ""}
									onValueChange={(v) => setActionParam("priority", v)}
								>
									<SelectTrigger className="font-body text-[13px]">
										<SelectValue placeholder="Select priority" />
									</SelectTrigger>
									<SelectContent>
										{PRIORITIES.map((p) => (
											<SelectItem key={p.value} value={p.value}>
												{p.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{form.action === "move_project" && (
							<div>
								<span className="font-mono text-[10px] uppercase tracking-[0.14em] text-grey-3 block mb-1.5">
									Move to
								</span>
								<Select
									value={form.actionParams.projectId ?? ""}
									onValueChange={(v) => setActionParam("projectId", v)}
								>
									<SelectTrigger className="font-body text-[13px]">
										<SelectValue placeholder="Select project" />
									</SelectTrigger>
									<SelectContent>
										{activeProjects.map((p) => (
											<SelectItem key={p.id} value={p.id}>
												{p.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						<div className="flex justify-end gap-2 pt-2">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setDialogOpen(false)}
								className="font-mono text-[11px]"
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleSave}
								disabled={isSaving}
								className="font-mono text-[11px] gap-1.5"
							>
								{isSaving && <Loader2 className="size-3 animate-spin" />}
								{editingRule ? "Save" : "Create"}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<ConfirmDialog
				open={!!deleteId}
				onOpenChange={(open) => !open && setDeleteId(null)}
				title="delete automation rule"
				description="This rule will be permanently deleted and will no longer trigger on matching tasks."
				actionLabel="Delete"
				destructive
				onConfirm={handleDelete}
			/>
		</div>
	);
}
