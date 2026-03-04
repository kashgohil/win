import { CATEGORIES, CATEGORY_CONFIG } from "@/components/mail/category-colors";
import { CategoryFilter } from "@/components/mail/CategoryFilter";
import {
	ATTACHMENTS_SHORTCUTS,
	Kbd,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { env } from "@/env";
import { useAttachmentsKeyboard } from "@/hooks/use-attachments-keyboard";
import { useImageThumbnail } from "@/hooks/use-image-thumbnail";
import { useMailAttachmentsInfinite } from "@/hooks/use-mail";
import {
	canPreview,
	classifyFile,
	FILE_CATEGORY_CONFIG,
	formatFileSize,
	getFileExtension,
	truncateFilename,
} from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type {
	EmailCategory,
	SerializedAttachmentWithContext,
} from "@wingmnn/types";
import { ArrowLeft, Download, Inbox, Paperclip, Search, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
	q: z.string().optional(),
	filetype: z.string().optional(),
	category: z.string().optional(),
	from: z.string().optional(),
	after: z.string().optional(),
	before: z.string().optional(),
});

export const Route = createFileRoute(
	"/_authenticated/_app/module/mail/attachments/",
)({
	component: AttachmentsPage,
	validateSearch: (search) => searchSchema.parse(search),
});

/* ─── Grid card ─── */

function AttachmentGridCard({
	attachment,
	onPreview,
	onDownload,
	isFocused,
	focusRef,
}: {
	attachment: SerializedAttachmentWithContext;
	onPreview: (att: SerializedAttachmentWithContext) => void;
	onDownload: (att: SerializedAttachmentWithContext) => void;
	isFocused?: boolean;
	focusRef?: (el: HTMLElement | null) => void;
}) {
	const category = classifyFile(attachment.mimeType, attachment.filename);
	const config = FILE_CATEGORY_CONFIG[category];
	const Icon = config.icon;
	const ext = getFileExtension(attachment.filename);
	const thumbUrl = useImageThumbnail(attachment);
	const isPreviewable = canPreview(attachment.mimeType);

	const senderLabel =
		attachment.fromName || attachment.fromAddress?.split("@")[0] || "Unknown";
	const dateLabel = new Date(attachment.receivedAt).toLocaleDateString(
		undefined,
		{ month: "short", day: "numeric" },
	);

	return (
		<button
			ref={focusRef}
			type="button"
			onClick={() =>
				isPreviewable ? onPreview(attachment) : onDownload(attachment)
			}
			className={cn(
				"group relative flex flex-col rounded-lg border border-border/40 bg-secondary/5 overflow-hidden transition-all duration-200 hover:border-border/70 hover:bg-secondary/15 cursor-pointer text-left w-full",
				isFocused &&
					"ring-2 ring-foreground/30 border-border/70 bg-secondary/15",
			)}
			title={attachment.filename}
		>
			{/* Thumbnail / Icon area */}
			<div className="relative flex items-center justify-center h-28 bg-secondary/10">
				{thumbUrl ? (
					<img src={thumbUrl} alt="" className="size-full object-cover" />
				) : (
					<div
						className={cn(
							"flex items-center justify-center size-14 rounded-xl",
							config.iconBg,
						)}
					>
						<Icon className={cn("size-7", config.accent)} />
					</div>
				)}

				{/* Extension badge */}
				{ext && (
					<span
						className={cn(
							"absolute top-2 right-2 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded",
							config.iconBg,
							config.accent,
						)}
					>
						{ext}
					</span>
				)}

				{/* Download hover overlay */}
				<div
					className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
					role="presentation"
					onClick={(e) => {
						e.stopPropagation();
						onDownload(attachment);
					}}
					onKeyDown={() => {}}
				>
					<Download className="size-5 text-white" />
				</div>
			</div>

			{/* Info area */}
			<div className="flex-1 px-3 py-2.5 space-y-1">
				<p className="font-body text-[13px] text-foreground truncate leading-snug">
					{truncateFilename(attachment.filename, 40)}
				</p>
				<p className="font-mono text-[10px] text-grey-3">
					{formatFileSize(attachment.size)}
				</p>
				<div className="flex items-center gap-1.5 text-[11px] text-grey-3 pt-0.5">
					<span className="truncate max-w-[60%]">{senderLabel}</span>
					<span className="opacity-40">·</span>
					<span className="shrink-0">{dateLabel}</span>
				</div>
				{attachment.emailSubject && (
					<p className="text-[11px] text-grey-3/70 truncate">
						{attachment.emailSubject}
					</p>
				)}
			</div>
		</button>
	);
}

/* ─── Skeleton card ─── */

function SkeletonCard() {
	return (
		<div className="flex flex-col rounded-lg border border-border/40 bg-secondary/5 overflow-hidden animate-pulse">
			<div className="h-28 bg-secondary/20" />
			<div className="px-3 py-2.5 space-y-2">
				<div className="h-3.5 bg-secondary/30 rounded w-3/4" />
				<div className="h-2.5 bg-secondary/20 rounded w-1/3" />
				<div className="h-2.5 bg-secondary/20 rounded w-1/2" />
			</div>
		</div>
	);
}

/* ─── Header items for keyboard nav ─── */

const HEADER_ITEMS = ["back", "inbox"] as const;

/* ─── Main page ─── */

function AttachmentsPage() {
	const { q, filetype, category, from, after, before } = Route.useSearch();
	const navigate = Route.useNavigate();
	const appNavigate = useNavigate();
	const sentinelRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [searchValue, setSearchValue] = useState(q ?? "");

	// Preview dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [preview, setPreview] = useState<{
		url: string;
		mimeType: string;
		filename: string;
	} | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	const activeCategory = category ?? null;

	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMailAttachmentsInfinite({
			q,
			filetype,
			category: activeCategory ?? undefined,
			from,
			after,
			before,
		});

	// Infinite scroll sentinel
	useEffect(() => {
		const el = sentinelRef.current;
		if (!el) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage]);

	const attachments =
		data?.pages.flatMap((page) => page?.attachments ?? []) ?? [];
	const total = data?.pages[0]?.total;

	// Group attachments by email category (only when showing "All")
	const groupedAttachments = useMemo(() => {
		if (activeCategory || attachments.length === 0) return null;
		const groups = new Map<EmailCategory, SerializedAttachmentWithContext[]>();
		for (const att of attachments) {
			const list = groups.get(att.category);
			if (list) list.push(att);
			else groups.set(att.category, [att]);
		}
		const order: EmailCategory[] = [
			"urgent",
			"actionable",
			"informational",
			"receipt",
			"confirmation",
			"newsletter",
			"promotional",
			"spam",
			"uncategorized",
		];
		return order
			.filter((cat) => groups.has(cat))
			.map((cat) => ({
				category: cat,
				config: CATEGORY_CONFIG[cat],
				items: groups.get(cat)!,
			}));
	}, [activeCategory, attachments]);

	const downloadUrl = useCallback(
		(id: string) => `${env.VITE_API_URL}/mail/attachments/${id}/download`,
		[],
	);

	const handleDownload = useCallback(
		async (attachment: SerializedAttachmentWithContext) => {
			const res = await fetch(downloadUrl(attachment.id), {
				credentials: "include",
			});
			if (!res.ok) return;
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = attachment.filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		},
		[downloadUrl],
	);

	const handlePreview = useCallback(
		async (attachment: SerializedAttachmentWithContext) => {
			setPreview({
				url: "",
				mimeType: attachment.mimeType,
				filename: attachment.filename,
			});
			setDialogOpen(true);

			const res = await fetch(downloadUrl(attachment.id), {
				credentials: "include",
			});
			if (!res.ok) {
				setDialogOpen(false);
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			previewUrlRef.current = url;
			setPreview({
				url,
				mimeType: attachment.mimeType,
				filename: attachment.filename,
			});
		},
		[downloadUrl],
	);

	const closePreview = useCallback(() => {
		setDialogOpen(false);
		const url = previewUrlRef.current;
		setTimeout(() => {
			if (url) URL.revokeObjectURL(url);
			previewUrlRef.current = null;
			setPreview(null);
		}, 250);
	}, []);

	const handleSearchSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const trimmed = searchValue.trim();
			navigate({
				search: (prev) => ({
					...prev,
					q: trimmed || undefined,
				}),
			});
		},
		[searchValue, navigate],
	);

	const handleCategoryChange = useCallback(
		(cat: string | null) => {
			navigate({
				search: (prev) => ({
					...prev,
					category: cat ?? undefined,
				}),
			});
		},
		[navigate],
	);

	// ── Keyboard navigation ──

	const headerCount = HEADER_ITEMS.length;
	const filterCount = CATEGORIES.length + 1; // +1 for "All"

	const handleNavigateInbox = useCallback(() => {
		appNavigate({
			to: "/module/mail/inbox",
			search: {
				view: undefined,
				starred: undefined,
				attachment: undefined,
			},
		});
	}, [appNavigate]);

	const handleActivateHeader = useCallback(
		(index: number) => {
			const item = HEADER_ITEMS[index];
			if (item === "back") {
				appNavigate({ to: "/module/mail" });
			} else if (item === "inbox") {
				handleNavigateInbox();
			}
		},
		[appNavigate, handleNavigateInbox],
	);

	const handleActivateSearch = useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const handleKeyboardSelectFilter = useCallback(
		(index: number) => {
			if (index === 0) {
				handleCategoryChange(null);
			} else {
				const cat = CATEGORIES[index - 1];
				if (cat) handleCategoryChange(cat.value);
			}
		},
		[handleCategoryChange],
	);

	const handleKeyboardActivateAttachment = useCallback(
		(index: number) => {
			const att = attachments[index];
			if (!att) return;
			const isPreviewable = canPreview(att.mimeType);
			if (isPreviewable) {
				handlePreview(att);
			} else {
				handleDownload(att);
			}
		},
		[attachments, handlePreview, handleDownload],
	);

	const handleOpenSearch = useCallback(() => {
		inputRef.current?.focus();
	}, []);

	const handleGoBack = useCallback(() => {
		appNavigate({ to: "/module/mail" });
	}, [appNavigate]);

	const keyboard = useAttachmentsKeyboard({
		attachmentCount: attachments.length,
		filterCount,
		headerCount,
		disabled: dialogOpen,
		onSelectFilter: handleKeyboardSelectFilter,
		onActivateAttachment: handleKeyboardActivateAttachment,
		onActivateHeader: handleActivateHeader,
		onActivateSearch: handleActivateSearch,
		onOpenSearch: handleOpenSearch,
		onNavigateInbox: handleNavigateInbox,
		onGoBack: handleGoBack,
	});

	return (
		<>
			<div className="max-w-5xl mx-auto px-(--page-px) py-8 pb-16 space-y-6">
				{/* Header */}
				<div ref={keyboard.headerRef} className="space-y-4">
					<div className="flex items-center justify-between">
						<Link
							to="/module/mail"
							className={cn(
								"group inline-flex items-center gap-1.5 font-body text-[13px] text-grey-3 hover:text-foreground transition-all duration-150 rounded-lg px-2 py-1 -mx-2",
								keyboard.isActive &&
									keyboard.activeSection === "header" &&
									keyboard.focusedHeaderIndex === 0 &&
									"ring-2 ring-foreground/30 text-foreground",
							)}
						>
							<ArrowLeft className="size-3.5 group-hover:-translate-x-0.5 transition-transform duration-150" />
							Mail
						</Link>

						<div className="flex items-center gap-3">
							<Link
								to="/module/mail/inbox"
								search={{
									view: undefined,
									starred: undefined,
									attachment: undefined,
								}}
								className={cn(
									"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/40 bg-secondary/10 hover:bg-secondary/25 hover:border-border/60 text-grey-3 hover:text-foreground transition-all duration-150",
									keyboard.isActive &&
										keyboard.activeSection === "header" &&
										keyboard.focusedHeaderIndex === 1 &&
										"ring-2 ring-foreground/30 text-foreground",
								)}
							>
								<Inbox className="size-3" />
								<span className="font-body text-[12px]">Inbox</span>
								<Kbd>I</Kbd>
							</Link>
						</div>
					</div>

					{/* Search input */}
					<form
						ref={keyboard.searchRef}
						onSubmit={handleSearchSubmit}
						className="relative"
					>
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-grey-3" />
						<input
							ref={inputRef}
							type="text"
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							placeholder="Search by filename..."
							className={cn(
								"w-full pl-9 pr-14 py-2 rounded-lg border border-border/40 bg-secondary/5 font-body text-[13px] text-foreground placeholder:text-grey-3 focus:outline-none focus:border-border/70 focus:bg-secondary/10 transition-colors",
								keyboard.isActive &&
									keyboard.activeSection === "search" &&
									"ring-2 ring-foreground/30",
							)}
						/>
						{!searchValue && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
								<Kbd>/</Kbd>
							</div>
						)}
						{searchValue && (
							<button
								type="button"
								onClick={() => {
									setSearchValue("");
									navigate({
										search: (prev) => ({
											...prev,
											q: undefined,
										}),
									});
								}}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-3 hover:text-foreground transition-colors cursor-pointer"
							>
								<X className="size-3.5" />
							</button>
						)}
					</form>

					{/* Category filter chips */}
					<div ref={keyboard.filtersRef}>
						<CategoryFilter
							value={activeCategory}
							onChange={handleCategoryChange}
							total={total}
							keyboardFocusIndex={
								keyboard.isActive && keyboard.activeSection === "filters"
									? keyboard.focusedFilterIndex
									: undefined
							}
						/>
					</div>
				</div>

				{/* Content */}
				{isPending ? (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{Array.from({ length: 9 }).map((_, i) => (
							<SkeletonCard key={`skel-${i}`} />
						))}
					</div>
				) : attachments.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<Paperclip className="size-8 text-grey-3/40 mb-3" />
						<p className="font-body text-[14px] text-grey-2">
							{q || filetype || category
								? "No attachments match your filters"
								: "No attachments found"}
						</p>
						<p className="font-body text-[12px] text-grey-3 mt-1">
							{q || filetype || category
								? "Try adjusting your search or filter"
								: "Attachments from your emails will appear here"}
						</p>
					</div>
				) : groupedAttachments ? (
					<div className="space-y-8">
						{groupedAttachments.map((group) => {
							// Calculate the global index offset for keyboard nav
							let offset = 0;
							for (const g of groupedAttachments) {
								if (g.category === group.category) break;
								offset += g.items.length;
							}
							return (
								<section key={group.category}>
									<div className="flex items-center gap-2 mb-3">
										<span
											className={cn(
												"size-2 rounded-full shrink-0",
												group.config.dot,
											)}
										/>
										<h2
											className={cn(
												"font-body text-[13px] font-medium",
												group.config.text,
											)}
										>
											{group.config.label}
										</h2>
										<span className="font-mono text-[10px] text-grey-3 tabular-nums">
											{group.items.length}
										</span>
									</div>
									<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
										{group.items.map((att, idx) => (
											<AttachmentGridCard
												key={att.id}
												attachment={att}
												onPreview={handlePreview}
												onDownload={handleDownload}
												isFocused={
													keyboard.isActive &&
													keyboard.activeSection === "attachments" &&
													keyboard.focusedAttachmentIndex === offset + idx
												}
												focusRef={(el) =>
													keyboard.attachmentCardRef(offset + idx, el)
												}
											/>
										))}
									</div>
								</section>
							);
						})}
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{attachments.map((att, idx) => (
							<AttachmentGridCard
								key={att.id}
								attachment={att}
								onPreview={handlePreview}
								onDownload={handleDownload}
								isFocused={
									keyboard.isActive &&
									keyboard.activeSection === "attachments" &&
									keyboard.focusedAttachmentIndex === idx
								}
								focusRef={(el) => keyboard.attachmentCardRef(idx, el)}
							/>
						))}
					</div>
				)}

				{/* Infinite scroll sentinel */}
				<div ref={sentinelRef} className="h-px" />

				{/* Loading more indicator */}
				{isFetchingNextPage && (
					<div className="flex items-center justify-center py-6">
						<div className="size-5 border-2 border-grey-3/40 border-t-foreground/70 rounded-full animate-spin" />
					</div>
				)}
			</div>

			{/* Preview dialog */}
			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => !open && closePreview()}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden"
				>
					<div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
						<DialogTitle className="font-body text-[13px] font-normal text-foreground truncate pr-4">
							{preview?.filename}
						</DialogTitle>
						<div className="flex items-center gap-1 shrink-0">
							{preview?.url && (
								<button
									type="button"
									onClick={() => {
										if (!preview) return;
										const a = document.createElement("a");
										a.href = preview.url;
										a.download = preview.filename;
										document.body.appendChild(a);
										a.click();
										document.body.removeChild(a);
									}}
									className="p-1.5 rounded-md text-grey-3 hover:text-foreground hover:bg-secondary/20 transition-colors cursor-pointer"
									aria-label="Download file"
								>
									<Download className="size-4" />
								</button>
							)}
							<DialogClose className="p-1.5 rounded-md text-grey-3 hover:text-foreground hover:bg-secondary/20 transition-colors cursor-pointer">
								<span className="sr-only">Close</span>
								<X className="size-4" />
							</DialogClose>
						</div>
					</div>

					<div className="flex items-center justify-center p-4 max-h-[calc(85vh-3.5rem)] overflow-auto bg-secondary/5">
						{!preview?.url ? (
							<div className="flex items-center justify-center py-24">
								<div className="size-5 border-2 border-grey-3/40 border-t-foreground/70 rounded-full animate-spin" />
							</div>
						) : preview.mimeType.startsWith("image/") ? (
							<img
								src={preview.url}
								alt={preview.filename}
								className="max-w-full max-h-[75vh] object-contain rounded"
							/>
						) : (
							<iframe
								src={preview.url}
								title={preview.filename}
								className="w-full h-[75vh] rounded"
							/>
						)}
					</div>
				</DialogContent>
			</Dialog>

			<KeyboardShortcutBar shortcuts={ATTACHMENTS_SHORTCUTS} />
		</>
	);
}
