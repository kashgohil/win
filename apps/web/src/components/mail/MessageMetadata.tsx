import { ContactCardLazy } from "@/components/contacts/ContactCard";
import { CATEGORY_CONFIG } from "@/components/mail/category-colors";
import { cn, formatDate } from "@/lib/utils";
import type { SerializedEmailDetail } from "@wingmnn/types";

function AddressWithCard({ address }: { address: string }) {
	return (
		<ContactCardLazy email={address} side="bottom" align="start">
			<span className="hover:underline decoration-dotted underline-offset-2 cursor-pointer">
				{address}
			</span>
		</ContactCardLazy>
	);
}

export function MessageMetadata({ email }: { email: SerializedEmailDetail }) {
	return (
		<dl className="px-4 py-3.5 space-y-2.5">
			<div className="flex gap-3 min-w-0">
				<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
					From
				</dt>
				<dd className="font-body text-[13px] text-foreground min-w-0">
					{email.fromAddress ? (
						<ContactCardLazy
							email={email.fromAddress}
							side="bottom"
							align="start"
						>
							<span className="inline">
								{email.fromName && (
									<span className="font-medium">{email.fromName}</span>
								)}
								<span className="text-grey-2 font-mono text-[12px]">
									{email.fromName ? " " : ""}
									&lt;{email.fromAddress}&gt;
								</span>
							</span>
						</ContactCardLazy>
					) : (
						<span className="text-grey-3">Unknown sender</span>
					)}
				</dd>
			</div>
			{email.toAddresses && email.toAddresses.length > 0 && (
				<div className="flex gap-3 min-w-0">
					<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
						To
					</dt>
					<dd className="font-mono text-[12px] text-grey-2 min-w-0 break-all flex flex-wrap gap-x-1">
						{email.toAddresses.map((addr, i) => (
							<span key={addr}>
								<AddressWithCard address={addr} />
								{i < email.toAddresses!.length - 1 && ","}
							</span>
						))}
					</dd>
				</div>
			)}
			{email.ccAddresses && email.ccAddresses.length > 0 && (
				<div className="flex gap-3 min-w-0">
					<dt className="font-body text-[11px] uppercase tracking-wider text-grey-3 shrink-0 w-9 text-left">
						Cc
					</dt>
					<dd className="font-mono text-[12px] text-grey-2 min-w-0 break-all flex flex-wrap gap-x-1">
						{email.ccAddresses.map((addr, i) => (
							<span key={addr}>
								<AddressWithCard address={addr} />
								{i < email.ccAddresses!.length - 1 && ","}
							</span>
						))}
					</dd>
				</div>
			)}
			<div className="flex flex-wrap items-center gap-x-2 gap-y-0 pt-0.5">
				<dt className="sr-only">Date and category</dt>
				<dd className="font-body text-[12px] text-grey-2 flex flex-wrap items-center gap-x-2">
					<time dateTime={email.receivedAt}>
						{formatDate(email.receivedAt)}
					</time>
					<span className="text-grey-3">·</span>
					<span
						className={cn(
							"inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px]",
							CATEGORY_CONFIG[email.category].bg,
							CATEGORY_CONFIG[email.category].text,
						)}
					>
						<span
							className={cn(
								"size-1.5 rounded-full",
								CATEGORY_CONFIG[email.category].dot,
							)}
							aria-hidden
						/>
						{CATEGORY_CONFIG[email.category].label}
					</span>
				</dd>
			</div>
		</dl>
	);
}
