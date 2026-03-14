import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useStarContact } from "@/hooks/use-contacts";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Building2, Calendar, Phone, Star } from "lucide-react";
import type { ReactNode } from "react";

const HOVER_OPEN_DELAY = 300;
const HOVER_CLOSE_DELAY = 300;

/* ── Types ── */

interface ContactCardProps {
	/** The email address to look up the contact by */
	email: string;
	/** The trigger element (e.g. a name or email span) */
	children: ReactNode;
	/** Side of the popover relative to trigger */
	side?: "top" | "bottom" | "left" | "right";
	/** Alignment of the popover */
	align?: "start" | "center" | "end";
}

type ContactLookupResult = {
	id: string;
	name: string | null;
	primaryEmail: string;
	company: string | null;
	jobTitle: string | null;
	phone: string | null;
	starred: boolean;
	relationshipScore: number;
	lastInteractionAt: string | null;
};

/* ── Hook: look up contact by email ── */

function useContactByEmail(email: string, enabled: boolean) {
	return useQuery({
		queryKey: ["contacts", "lookup", email],
		queryFn: async () => {
			const { data, error } = await api.contacts.lookup.get({
				query: { email },
			});
			if (error) return null;
			return (data as ContactLookupResult) ?? null;
		},
		enabled,
		staleTime: 5 * 60 * 1000,
	});
}

/* ── Component ── */

export function ContactCard({
	email,
	children,
	side = "bottom",
	align = "start",
}: ContactCardProps) {
	const { data: contact, isLoading } = useContactByEmail(email, true);
	const starContact = useStarContact();

	// If no contact found, just render the trigger as-is
	if (!isLoading && !contact) {
		return <>{children}</>;
	}

	return (
		<HoverCard openDelay={HOVER_OPEN_DELAY} closeDelay={HOVER_CLOSE_DELAY}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className="inline cursor-pointer hover:underline decoration-dotted underline-offset-2"
				>
					{children}
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				side={side}
				align={align}
				className="w-72 p-0 overflow-hidden"
			>
				{isLoading ? (
					<CardSkeleton />
				) : contact ? (
					<ContactCardContent
						contact={contact}
						onStar={() => starContact.mutate(contact.id)}
					/>
				) : null}
			</HoverCardContent>
		</HoverCard>
	);
}

/* ── Lazy variant: only fetches on open ── */

export function ContactCardLazy({
	email,
	children,
	side = "bottom",
	align = "start",
}: ContactCardProps) {
	return (
		<HoverCard openDelay={HOVER_OPEN_DELAY} closeDelay={HOVER_CLOSE_DELAY}>
			<HoverCardTrigger asChild>
				<button
					type="button"
					className="inline cursor-pointer hover:underline decoration-dotted underline-offset-2"
				>
					{children}
				</button>
			</HoverCardTrigger>
			<HoverCardContent
				side={side}
				align={align}
				className="w-72 p-0 overflow-hidden"
			>
				<LazyContent email={email} />
			</HoverCardContent>
		</HoverCard>
	);
}

function LazyContent({ email }: { email: string }) {
	const { data: contact, isLoading } = useContactByEmail(email, true);
	const starContact = useStarContact();

	if (isLoading) {
		return <CardSkeleton />;
	}

	if (!contact) {
		return (
			<div className="p-4">
				<p className="font-mono text-[11px] text-grey-3">{email}</p>
				<p className="font-body text-[12px] text-grey-2 mt-1">
					No contact found
				</p>
				<Link
					to="/module/crm/list"
					search={{ q: email }}
					className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] text-foreground hover:underline"
				>
					Search contacts
					<ArrowRight className="size-3" />
				</Link>
			</div>
		);
	}

	return (
		<ContactCardContent
			contact={contact}
			onStar={() => starContact.mutate(contact.id)}
		/>
	);
}

/* ── Skeleton ── */

function CardSkeleton() {
	return (
		<div className="p-4 animate-pulse">
			<div className="flex items-center gap-3">
				<div className="size-10 rounded-full bg-secondary/30" />
				<div>
					<div className="h-4 w-28 bg-secondary/30 rounded" />
					<div className="h-3 w-36 bg-secondary/20 rounded mt-1" />
				</div>
			</div>
		</div>
	);
}

/* ── Card content ── */

function ContactCardContent({
	contact,
	onStar,
}: {
	contact: ContactLookupResult;
	onStar: () => void;
}) {
	const initials = getInitials(contact.name, contact.primaryEmail);

	return (
		<div>
			{/* Header */}
			<div className="p-4 pb-3">
				<div className="flex items-start gap-3">
					<div className="size-10 rounded-full bg-secondary/30 flex items-center justify-center shrink-0">
						<span className="font-mono text-[12px] text-grey-2 uppercase">
							{initials}
						</span>
					</div>
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5">
							<span className="font-body text-[14px] text-foreground tracking-[0.01em] truncate">
								{contact.name ?? contact.primaryEmail}
							</span>
							{contact.starred && (
								<Star className="size-3 text-amber-500 fill-amber-500 shrink-0" />
							)}
						</div>
						<span className="font-mono text-[11px] text-grey-3 block truncate">
							{contact.primaryEmail}
						</span>
					</div>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onStar();
						}}
						className="p-1 rounded hover:bg-secondary/30 transition-colors cursor-pointer shrink-0"
					>
						<Star
							className={cn(
								"size-3.5",
								contact.starred
									? "text-amber-500 fill-amber-500"
									: "text-grey-3",
							)}
						/>
					</button>
				</div>
			</div>

			{/* Details */}
			<div className="px-4 pb-3 space-y-1.5">
				{contact.company && (
					<div className="flex items-center gap-2">
						<Building2 className="size-3 text-grey-3 shrink-0" />
						<span className="font-mono text-[11px] text-grey-2 truncate">
							{contact.company}
							{contact.jobTitle ? ` · ${contact.jobTitle}` : ""}
						</span>
					</div>
				)}
				{contact.phone && (
					<div className="flex items-center gap-2">
						<Phone className="size-3 text-grey-3 shrink-0" />
						<span className="font-mono text-[11px] text-grey-2">
							{contact.phone}
						</span>
					</div>
				)}
				{contact.lastInteractionAt && (
					<div className="flex items-center gap-2">
						<Calendar className="size-3 text-grey-3 shrink-0" />
						<span className="font-mono text-[11px] text-grey-2">
							Last contact: {formatDaysAgo(contact.lastInteractionAt)}
						</span>
					</div>
				)}
			</div>

			{/* Score + link footer */}
			<div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-secondary/5">
				<ScorePill score={contact.relationshipScore} />
				<Link
					to="/module/crm/$contactId"
					params={{ contactId: contact.id }}
					className="inline-flex items-center gap-1 font-mono text-[10px] text-foreground hover:underline"
				>
					View profile
					<ArrowRight className="size-3" />
				</Link>
			</div>
		</div>
	);
}

/* ── Score pill ── */

function ScorePill({ score }: { score: number }) {
	const color =
		score >= 70
			? "bg-emerald-500/10 text-emerald-600"
			: score >= 40
				? "bg-amber-500/10 text-amber-600"
				: "bg-secondary/20 text-grey-3";

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px]",
				color,
			)}
		>
			<span className="font-display text-[12px] leading-none">{score}</span>
			score
		</span>
	);
}

/* ── Helpers ── */

function getInitials(name: string | null, email: string): string {
	if (name) {
		const parts = name.split(/\s+/);
		if (parts.length >= 2) {
			return `${parts[0]![0]}${parts[parts.length - 1]![0]}`;
		}
		return name.slice(0, 2);
	}
	return email.slice(0, 2);
}

function formatDaysAgo(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
	if (diffDays === 0) return "today";
	if (diffDays === 1) return "yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;
	if (diffDays < 30) return `${Math.round(diffDays / 7)}w ago`;
	return date.toLocaleDateString();
}
