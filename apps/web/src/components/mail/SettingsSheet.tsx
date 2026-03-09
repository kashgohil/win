import { AccountCard } from "@/components/mail/AccountCard";
import {
	ProviderCard,
	type ProviderConfig,
} from "@/components/mail/ProviderCard";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "@/components/ui/sheet";
import { useConnectAccount, useUpdateSignature } from "@/hooks/use-mail";
import { api } from "@/lib/api";
import { mailAccountsCollection } from "@/lib/mail-collections";
import { useLiveQuery } from "@tanstack/react-db";
import type { EmailProvider } from "@wingmnn/types";
import { Check, Pen, Settings2 } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { MOTION_CONSTANTS } from "../constant";

const PROVIDERS: ProviderConfig[] = [
	{
		key: "gmail",
		name: "gmail",
		description: "Google Workspace & personal accounts",
		iconBg: "bg-accent-red/10",
		iconText: "text-accent-red",
		enabled: true,
	},
	{
		key: "outlook",
		name: "outlook",
		description: "Microsoft 365 & personal accounts",
		iconBg: "bg-[#0078d4]/10",
		iconText: "text-[#0078d4]",
		enabled: true,
	},
];

export function SettingsSheet({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const { data: accounts, isLoading: isPending } = useLiveQuery(
		mailAccountsCollection,
	);
	const connectAccount = useConnectAccount();

	const handleConnect = async (provider: EmailProvider) => {
		const result = await connectAccount.mutateAsync(provider);
		if (result?.url) {
			window.location.href = result.url;
		}
	};

	const handleDisconnect = (accountId: string) => {
		mailAccountsCollection.utils.writeDelete(accountId);
		api.mail.accounts({ id: accountId }).delete();
	};

	const hasAccounts = accounts.length > 0;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="w-full sm:w-[400px] sm:max-w-[440px] p-0 overflow-y-auto"
			>
				{/* Header */}
				<div className="px-6 pt-6 pb-4">
					<div className="flex items-center gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
							<Settings2 size={18} />
						</div>
						<div>
							<SheetTitle className="font-display text-[1.1rem] font-medium tracking-[0.01em] lowercase">
								mail settings
							</SheetTitle>
							<span className="font-mono text-[10px] text-grey-3 uppercase tracking-[0.12em]">
								accounts
							</span>
						</div>
					</div>
					<SheetDescription className="font-serif text-[0.85rem] text-grey-2 mt-3 leading-relaxed">
						Connect and manage your email accounts. Wingmnn syncs your inbox to
						organize, triage, and surface what matters.
					</SheetDescription>
				</div>

				{/* Connected accounts */}
				{(hasAccounts || isPending) && (
					<div className="px-6 pt-5 pb-2">
						<div className="flex items-center gap-3">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Connected
							</span>
							<div className="flex-1 h-px bg-border/50" />
							{hasAccounts && (
								<span className="font-mono text-[10px] text-grey-2 tabular-nums">
									{accounts.length}
								</span>
							)}
						</div>

						<div className="mt-4 space-y-2">
							{isPending ? (
								<SettingsSkeleton />
							) : (
								accounts.map((account, i) => (
									<motion.div
										key={account.id}
										initial={{ opacity: 0, y: 12 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{
											duration: 0.4,
											ease: MOTION_CONSTANTS.EASE,
											delay: i * 0.06,
										}}
									>
										<AccountCard
											account={account}
											onDisconnect={() => handleDisconnect(account.id)}
										/>
									</motion.div>
								))
							)}
						</div>
					</div>
				)}

				{/* Signatures */}
				{hasAccounts && !isPending && (
					<div className="px-6 pt-5 pb-2">
						<div className="flex items-center gap-3 mb-4">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Signatures
							</span>
							<div className="flex-1 h-px bg-border/50" />
						</div>
						<div className="space-y-3">
							{accounts.map((account) => (
								<SignatureEditor
									key={account.id}
									accountId={account.id}
									email={account.email}
									signature={account.signature ?? null}
								/>
							))}
						</div>
					</div>
				)}

				{/* Add provider */}
				<div className="px-6 pt-5 pb-8">
					{!hasAccounts && !isPending ? (
						<>
							<p className="font-serif text-[0.85rem] text-grey-2 italic mb-5">
								Link your first email account to get started.
							</p>
						</>
					) : (
						<div className="flex items-center gap-3 mb-4">
							<span className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-grey-3">
								Add provider
							</span>
							<div className="flex-1 h-px bg-border/50" />
						</div>
					)}

					<div className="space-y-2">
						{PROVIDERS.map((provider, i) => (
							<motion.div
								key={provider.key}
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{
									duration: 0.4,
									ease: MOTION_CONSTANTS.EASE,
									delay: (hasAccounts ? accounts.length : 0) * 0.06 + i * 0.06,
								}}
							>
								<ProviderCard
									provider={provider}
									loading={connectAccount.isPending}
									onConnect={() => handleConnect(provider.key)}
								/>
							</motion.div>
						))}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function SignatureEditor({
	accountId,
	email,
	signature,
}: {
	accountId: string;
	email: string;
	signature: string | null;
}) {
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(signature ?? "");
	const updateSignature = useUpdateSignature();

	const handleSave = useCallback(() => {
		const trimmed = value.trim();
		updateSignature.mutate(
			{ accountId, signature: trimmed || null },
			{
				onSuccess: () => {
					setEditing(false);
					toast("Signature updated");
				},
				onError: () => toast.error("Failed to update signature"),
			},
		);
	}, [accountId, value, updateSignature]);

	if (!editing) {
		return (
			<div className="rounded-lg border border-border/40 bg-background px-4 py-3">
				<div className="flex items-center justify-between gap-2">
					<span className="font-body text-[12px] text-grey-2 truncate">
						{email}
					</span>
					<button
						type="button"
						onClick={() => {
							setValue(signature ?? "");
							setEditing(true);
						}}
						className="inline-flex items-center gap-1 font-mono text-[10px] text-grey-3 hover:text-foreground transition-colors cursor-pointer shrink-0"
					>
						<Pen className="size-2.5" />
						{signature ? "Edit" : "Add"}
					</button>
				</div>
				{signature && (
					<p className="font-body text-[11px] text-grey-3 mt-1.5 whitespace-pre-wrap line-clamp-3">
						{signature}
					</p>
				)}
			</div>
		);
	}

	return (
		<div className="rounded-lg border border-ring/50 bg-background px-4 py-3">
			<span className="font-body text-[12px] text-grey-2 block mb-2">
				{email}
			</span>
			<textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				placeholder="Your email signature..."
				rows={4}
				className="w-full resize-none rounded-md border border-border/50 bg-secondary/10 px-3 py-2 font-body text-[12px] text-foreground placeholder:text-grey-3 outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
			/>
			<div className="flex items-center gap-2 mt-2">
				<button
					type="button"
					onClick={handleSave}
					disabled={updateSignature.isPending}
					className="inline-flex items-center gap-1 rounded-md bg-foreground text-background px-3 py-1.5 font-body text-[11px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
				>
					<Check className="size-3" />
					Save
				</button>
				<button
					type="button"
					onClick={() => setEditing(false)}
					className="font-body text-[11px] text-grey-3 hover:text-foreground transition-colors cursor-pointer px-2 py-1.5"
				>
					Cancel
				</button>
			</div>
		</div>
	);
}

function SettingsSkeleton() {
	return (
		<div className="space-y-2">
			{[0, 1].map((i) => (
				<div
					key={i}
					className="rounded-lg border border-border/40 bg-background animate-pulse"
				>
					<div className="flex items-start gap-3.5 px-4 py-3.5">
						<div className="size-9 rounded-md bg-secondary/40 shrink-0" />
						<div className="flex-1 space-y-2">
							<div className="h-3.5 w-40 bg-secondary/40 rounded" />
							<div className="h-2.5 w-16 bg-secondary/25 rounded" />
							<div className="h-2 w-24 bg-secondary/20 rounded mt-1" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
