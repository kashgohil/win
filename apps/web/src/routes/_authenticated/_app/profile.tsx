import { MOTION_CONSTANTS } from "@/components/constant";
import ModuleCard from "@/components/onboarding/cards/ModuleCard";
import RadioCard from "@/components/onboarding/cards/RadioCard";
import RoleCard from "@/components/onboarding/cards/RoleCard";
import { getIcon } from "@/components/onboarding/icons";
import TimezoneCombobox from "@/components/onboarding/TimezoneCombobox";
import ModuleIntegrationsSheet from "@/components/profile/ModuleIntegrationsSheet";
import {
	onboardingQueryKey,
	useOnboardingProfile,
} from "@/hooks/use-onboarding";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import {
	getActiveModules,
	getModuleIntegrations,
	MODULES,
	NOTIFICATION_OPTIONS,
	PROACTIVITY_OPTIONS,
	ROLES,
	type Module,
} from "@/lib/onboarding-data";
import { cn, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronRight, Pencil } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";

/* ── Animation presets ── */

const fadeUp = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.6, ease: MOTION_CONSTANTS.EASE },
};

const sectionSwap = {
	initial: { opacity: 0 },
	animate: { opacity: 1 },
	exit: { opacity: 0 },
	transition: { duration: 0.2, ease: MOTION_CONSTANTS.EASE },
};

/* ── Types ── */

type EditingSection =
	| "name"
	| "timezone"
	| "role"
	| "modules"
	| "proactivity"
	| "notifications"
	| null;

/* ── Helpers ── */

function getInitials(name: string) {
	return name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function formatTimezone(tz: string): string {
	try {
		const offset = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		})
			.formatToParts(new Date())
			.find((p) => p.type === "timeZoneName")?.value;
		const city = tz.split("/").slice(1).join("/").replace(/_/g, " ");
		return `${city} (${offset})`;
	} catch {
		return tz;
	}
}

export const Route = createFileRoute("/_authenticated/_app/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const queryClient = useQueryClient();
	const { data: session } = authClient.useSession();
	const { data: profileData } = useOnboardingProfile();

	const profile = profileData?.profile;
	const user = session?.user;

	const [editing, setEditing] = useState<EditingSection>(null);
	const [saving, setSaving] = useState(false);
	const [selectedModule, setSelectedModule] = useState<Module | null>(null);

	const selectedIntegrations = useMemo(
		() => (selectedModule ? getModuleIntegrations(selectedModule.key) : []),
		[selectedModule],
	);

	/* Draft state for each section */
	const [draftName, setDraftName] = useState("");
	const [draftTimezone, setDraftTimezone] = useState("");
	const [draftRole, setDraftRole] = useState("");
	const [draftModules, setDraftModules] = useState<string[]>([]);
	const [draftProactivity, setDraftProactivity] = useState("");
	const [draftNotifications, setDraftNotifications] = useState("");

	const startEditing = useCallback(
		(section: EditingSection) => {
			if (!profile || !user) return;
			switch (section) {
				case "name":
					setDraftName(user.name ?? "");
					break;
				case "timezone":
					setDraftTimezone(profile.timezone ?? "");
					break;
				case "role":
					setDraftRole(profile.role ?? "");
					break;
				case "modules":
					setDraftModules([...(profile.enabledModules ?? [])]);
					break;
				case "proactivity":
					setDraftProactivity(profile.aiProactivity ?? "");
					break;
				case "notifications":
					setDraftNotifications(profile.notificationStyle ?? "");
					break;
			}
			setEditing(section);
		},
		[profile, user],
	);

	const cancel = useCallback(() => setEditing(null), []);

	const saveProfile = useCallback(
		async (payload: Record<string, unknown>) => {
			setSaving(true);
			try {
				await api.onboarding.patch(payload);
				await queryClient.invalidateQueries({
					queryKey: onboardingQueryKey,
				});
				setEditing(null);
			} finally {
				setSaving(false);
			}
		},
		[queryClient],
	);

	const saveName = useCallback(async () => {
		if (!draftName.trim()) return;
		setSaving(true);
		try {
			await authClient.updateUser({ name: draftName.trim() });
			setEditing(null);
		} finally {
			setSaving(false);
		}
	}, [draftName]);

	if (!profile || !user) return null;

	const userName = user.name ?? user.email ?? "";
	const memberSince = user.createdAt ? formatDate(user.createdAt) : "";
	const currentRole = ROLES.find((r) => r.key === profile.role);
	const RoleIcon = currentRole ? getIcon(currentRole.icon) : undefined;
	const activeModules = getActiveModules(profile.enabledModules);
	const currentProactivity = PROACTIVITY_OPTIONS.find(
		(o) => o.key === profile.aiProactivity,
	);
	const currentNotifications = NOTIFICATION_OPTIONS.find(
		(o) => o.key === profile.notificationStyle,
	);
	const ProactivityIcon = currentProactivity
		? getIcon(currentProactivity.icon)
		: undefined;
	const NotificationsIcon = currentNotifications
		? getIcon(currentNotifications.icon)
		: undefined;

	return (
		<div className="px-(--page-px) py-10 max-w-5xl mx-auto">
			{/* ── Masthead ── */}
			<motion.header {...fadeUp}>
				<div className="font-mono text-[11px] text-muted-foreground uppercase tracking-[0.14em]">
					Profile
				</div>

				<div className="flex items-center gap-5 mt-5">
					{/* Avatar */}
					{user.image ? (
						<img
							src={user.image}
							alt={userName}
							className="size-16 rounded-full object-cover shrink-0"
						/>
					) : (
						<div className="size-16 rounded-full bg-foreground flex items-center justify-center shrink-0">
							<span className="font-mono text-[18px] font-medium text-background leading-none">
								{getInitials(userName)}
							</span>
						</div>
					)}

					<div className="flex-1 min-w-0">
						{/* Name — inline edit */}
						<SwapContainer>
							{editing === "name" ? (
								<motion.div
									key="name-edit"
									{...sectionSwap}
									className="flex items-center gap-2"
								>
									<input
										type="text"
										value={draftName}
										onChange={(e) => setDraftName(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") saveName();
											if (e.key === "Escape") cancel();
										}}
										autoFocus
										className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-tight bg-transparent border-b border-accent-red/40 outline-none w-full"
									/>
									<InlineActions
										saving={saving}
										onSave={saveName}
										onCancel={cancel}
									/>
								</motion.div>
							) : (
								<motion.div
									key="name-view"
									{...sectionSwap}
									className="group flex items-baseline gap-2"
								>
									<h1 className="font-display text-[clamp(1.5rem,3vw,2rem)] text-foreground tracking-[0.01em] leading-tight lowercase">
										{userName}
									</h1>
									<EditButton onClick={() => startEditing("name")} />
								</motion.div>
							)}
						</SwapContainer>

						<p className="font-mono text-[12px] text-grey-2 mt-1 tracking-[0.02em]">
							{user.email}
						</p>
						{memberSince && (
							<p className="font-mono text-[11px] text-grey-3 mt-0.5 tracking-[0.02em]">
								Member since {memberSince}
							</p>
						)}
					</div>
				</div>
			</motion.header>

			<div className="mt-12 space-y-10">
				{/* ── Location ── */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.1 }}
				>
					<SectionRule
						label="Location"
						editing={editing === "timezone"}
						onEdit={() => startEditing("timezone")}
						onCancel={cancel}
					/>
					<SwapContainer className="mt-4">
						{editing === "timezone" ? (
							<motion.div key="tz-edit" {...sectionSwap} className="space-y-3">
								<TimezoneCombobox
									value={draftTimezone}
									onChange={setDraftTimezone}
								/>
								<div className="flex justify-end">
									<InlineActions
										saving={saving}
										onSave={() => saveProfile({ timezone: draftTimezone })}
										onCancel={cancel}
									/>
								</div>
							</motion.div>
						) : (
							<motion.p
								key="tz-view"
								{...sectionSwap}
								className="font-body text-[15px] text-foreground tracking-[0.01em]"
							>
								{profile.timezone
									? formatTimezone(profile.timezone)
									: "Not set"}
							</motion.p>
						)}
					</SwapContainer>
				</motion.section>

				{/* ── Role ── */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.15 }}
				>
					<SectionRule
						label="Role"
						editing={editing === "role"}
						onEdit={() => startEditing("role")}
						onCancel={cancel}
					/>
					<SwapContainer className="mt-4">
						{editing === "role" ? (
							<motion.div
								key="role-edit"
								{...sectionSwap}
								className="space-y-3"
							>
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{ROLES.map((role, i) => (
										<RoleCard
											key={role.key}
											icon={role.icon}
											label={role.label}
											description={role.description}
											selected={draftRole === role.key}
											onClick={() => setDraftRole(role.key)}
											index={i}
										/>
									))}
								</div>
								<div className="flex justify-end">
									<InlineActions
										saving={saving}
										onSave={() => saveProfile({ role: draftRole })}
										onCancel={cancel}
									/>
								</div>
							</motion.div>
						) : (
							<motion.div key="role-view" {...sectionSwap}>
								{currentRole ? (
									<div className="flex items-center gap-3">
										{RoleIcon && (
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
												<RoleIcon size={17} />
											</div>
										)}
										<div>
											<p className="font-display text-[1rem] text-foreground font-medium leading-tight">
												{currentRole.label}
											</p>
											<p className="font-serif text-[0.83rem] text-grey-2 leading-snug mt-0.5">
												{currentRole.description}
											</p>
										</div>
									</div>
								) : (
									<p className="font-serif text-[15px] text-grey-2 italic">
										Not set
									</p>
								)}
							</motion.div>
						)}
					</SwapContainer>
				</motion.section>

				{/* ── Modules ── */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.2 }}
				>
					<SectionRule
						label="Modules"
						count={activeModules.length}
						editing={editing === "modules"}
						onEdit={() => startEditing("modules")}
						onCancel={cancel}
					/>
					<SwapContainer className="mt-4">
						{editing === "modules" ? (
							<motion.div key="mod-edit" {...sectionSwap} className="space-y-3">
								<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
									{MODULES.map((mod, i) => (
										<ModuleCard
											key={mod.key}
											icon={mod.icon}
											code={mod.code}
											name={mod.name}
											description={mod.description}
											selected={draftModules.includes(mod.key)}
											onClick={() =>
												setDraftModules((prev) =>
													prev.includes(mod.key)
														? prev.filter((k) => k !== mod.key)
														: [...prev, mod.key],
												)
											}
											index={i}
										/>
									))}
								</div>
								<div className="flex justify-end">
									<InlineActions
										saving={saving}
										disabled={draftModules.length === 0}
										onSave={() =>
											saveProfile({
												enabledModules: draftModules,
											})
										}
										onCancel={cancel}
									/>
								</div>
							</motion.div>
						) : (
							<motion.div key="mod-view" {...sectionSwap}>
								{activeModules.length > 0 ? (
									<div className="flex flex-wrap gap-2">
										{activeModules.map((mod) => {
											const Icon = getIcon(mod.icon);
											const hasIntegrations =
												getModuleIntegrations(mod.key).length > 0;
											return (
												<button
													key={mod.key}
													type="button"
													onClick={() => setSelectedModule(mod)}
													className="group/pill inline-flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 bg-background hover:border-grey-3 cursor-pointer transition-colors duration-150"
												>
													{Icon && (
														<Icon
															size={13}
															className="text-accent-red shrink-0"
														/>
													)}
													<span className="font-mono text-[11px] font-medium text-foreground tracking-[0.04em] uppercase">
														{mod.code}
													</span>
													<span className="font-serif text-[13px] text-grey-2">
														{mod.name}
													</span>
													{hasIntegrations && (
														<span className="size-1.5 rounded-full bg-accent-red/40 shrink-0" />
													)}
													<ChevronRight
														size={12}
														className="text-grey-3 opacity-0 -ml-1 group-hover/pill:opacity-100 transition-opacity duration-150 shrink-0"
													/>
												</button>
											);
										})}
									</div>
								) : (
									<p className="font-serif text-[15px] text-grey-2 italic">
										No modules enabled
									</p>
								)}
							</motion.div>
						)}
					</SwapContainer>
				</motion.section>

				{/* ── AI Proactivity ── */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.25 }}
				>
					<SectionRule
						label="AI Proactivity"
						editing={editing === "proactivity"}
						onEdit={() => startEditing("proactivity")}
						onCancel={cancel}
					/>
					<SwapContainer className="mt-4">
						{editing === "proactivity" ? (
							<motion.div
								key="proact-edit"
								{...sectionSwap}
								className="space-y-3"
							>
								<div className="space-y-2">
									{PROACTIVITY_OPTIONS.map((opt, i) => (
										<RadioCard
											key={opt.key}
											icon={opt.icon}
											label={opt.label}
											description={opt.description}
											selected={draftProactivity === opt.key}
											onClick={() => setDraftProactivity(opt.key)}
											index={i}
										/>
									))}
								</div>
								<div className="flex justify-end">
									<InlineActions
										saving={saving}
										onSave={() =>
											saveProfile({
												aiProactivity: draftProactivity,
											})
										}
										onCancel={cancel}
									/>
								</div>
							</motion.div>
						) : (
							<motion.div key="proact-view" {...sectionSwap}>
								{currentProactivity ? (
									<div className="flex items-center gap-3">
										{ProactivityIcon && (
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
												<ProactivityIcon size={17} />
											</div>
										)}
										<div>
											<p className="font-display text-[0.95rem] text-foreground font-medium leading-tight">
												{currentProactivity.label}
											</p>
											<p className="font-serif text-[0.83rem] text-grey-2 leading-snug mt-0.5">
												{currentProactivity.description}
											</p>
										</div>
									</div>
								) : (
									<p className="font-serif text-[15px] text-grey-2 italic">
										Not set
									</p>
								)}
							</motion.div>
						)}
					</SwapContainer>
				</motion.section>

				{/* ── Notifications ── */}
				<motion.section
					{...fadeUp}
					transition={{ ...fadeUp.transition, delay: 0.3 }}
				>
					<SectionRule
						label="Notifications"
						editing={editing === "notifications"}
						onEdit={() => startEditing("notifications")}
						onCancel={cancel}
					/>
					<SwapContainer className="mt-4">
						{editing === "notifications" ? (
							<motion.div
								key="notif-edit"
								{...sectionSwap}
								className="space-y-3"
							>
								<div className="space-y-2">
									{NOTIFICATION_OPTIONS.map((opt, i) => (
										<RadioCard
											key={opt.key}
											icon={opt.icon}
											label={opt.label}
											description={opt.description}
											selected={draftNotifications === opt.key}
											onClick={() => setDraftNotifications(opt.key)}
											index={i}
										/>
									))}
								</div>
								<div className="flex justify-end">
									<InlineActions
										saving={saving}
										onSave={() =>
											saveProfile({
												notificationStyle: draftNotifications,
											})
										}
										onCancel={cancel}
									/>
								</div>
							</motion.div>
						) : (
							<motion.div key="notif-view" {...sectionSwap}>
								{currentNotifications ? (
									<div className="flex items-center gap-3">
										{NotificationsIcon && (
											<div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
												<NotificationsIcon size={17} />
											</div>
										)}
										<div>
											<p className="font-display text-[0.95rem] text-foreground font-medium leading-tight">
												{currentNotifications.label}
											</p>
											<p className="font-serif text-[0.83rem] text-grey-2 leading-snug mt-0.5">
												{currentNotifications.description}
											</p>
										</div>
									</div>
								) : (
									<p className="font-serif text-[15px] text-grey-2 italic">
										Not set
									</p>
								)}
							</motion.div>
						)}
					</SwapContainer>
				</motion.section>
			</div>

			<ModuleIntegrationsSheet
				module={selectedModule}
				integrations={selectedIntegrations}
				open={selectedModule !== null}
				onOpenChange={(open) => {
					if (!open) setSelectedModule(null);
				}}
			/>
		</div>
	);
}

/* ── Editorial section rule with edit toggle ── */

function SectionRule({
	label,
	count,
	editing,
	onEdit,
	onCancel,
}: {
	label: string;
	count?: number;
	editing: boolean;
	onEdit: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="flex items-center gap-3">
			<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
				{label}
			</span>
			<div className="flex-1 h-px bg-border/50" />
			{count !== undefined && !editing && (
				<span className="font-mono text-[10px] text-grey-2 tabular-nums">
					{count}
				</span>
			)}
			{editing ? (
				<button
					type="button"
					onClick={onCancel}
					className="font-mono text-[10px] text-grey-3 uppercase tracking-widest hover:text-foreground transition-colors duration-150 cursor-pointer"
				>
					Cancel
				</button>
			) : (
				<button
					type="button"
					onClick={onEdit}
					className="font-mono text-[10px] text-grey-3 uppercase tracking-widest hover:text-foreground transition-colors duration-150 cursor-pointer flex items-center gap-1"
				>
					<Pencil size={9} />
					Edit
				</button>
			)}
		</div>
	);
}

/* ── Inline edit button (for name) ── */

function EditButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="opacity-0 group-hover:opacity-100 text-grey-3 hover:text-foreground transition-all duration-150 cursor-pointer translate-y-px"
		>
			<Pencil size={12} />
		</button>
	);
}

/* ── Save / Cancel action buttons ── */

function InlineActions({
	saving,
	disabled,
	onSave,
	onCancel,
}: {
	saving: boolean;
	disabled?: boolean;
	onSave: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="flex items-center gap-2">
			<button
				type="button"
				onClick={onCancel}
				disabled={saving}
				className="font-mono text-[11px] text-grey-3 hover:text-foreground transition-colors duration-150 cursor-pointer px-2 py-1 disabled:opacity-50"
			>
				Cancel
			</button>
			<button
				type="button"
				onClick={onSave}
				disabled={saving || disabled}
				className={cn(
					"font-mono text-[11px] uppercase tracking-[0.08em] px-4 py-1.5 rounded-sm transition-all duration-150 cursor-pointer",
					"bg-foreground text-background hover:bg-foreground/90",
					"disabled:opacity-40 disabled:cursor-not-allowed",
				)}
			>
				{saving ? "Saving…" : "Save"}
			</button>
		</div>
	);
}

/* ── Animated height swap container ── */

function SwapContainer({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	const innerRef = useRef<HTMLDivElement>(null);
	const [height, setHeight] = useState<number | undefined>(undefined);

	useLayoutEffect(() => {
		const el = innerRef.current;
		if (!el) return;
		const ro = new ResizeObserver(([entry]) => {
			setHeight(entry.contentRect.height);
		});
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	return (
		<motion.div
			className={cn("overflow-hidden", className)}
			animate={height !== undefined ? { height } : undefined}
			transition={{ duration: 0.3, ease: MOTION_CONSTANTS.EASE }}
		>
			<div ref={innerRef}>
				<AnimatePresence mode="popLayout" initial={false}>
					{children}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}
