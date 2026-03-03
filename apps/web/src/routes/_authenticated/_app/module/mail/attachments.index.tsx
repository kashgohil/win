import { FileTypeFilter } from "@/components/mail/FileTypeFilter";
import {
	ATTACHMENTS_SHORTCUTS,
	KeyboardShortcutBar,
} from "@/components/mail/KeyboardShortcutBar";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { env } from "@/env";
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
import type { SerializedAttachmentWithContext } from "@wingmnn/types";
import { ArrowLeft, Download, Paperclip, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({
	q: z.string().optional(),
	filetype: z.string().optional(),
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
}: {
	attachment: SerializedAttachmentWithContext;
	onPreview: (att: SerializedAttachmentWithContext) => void;
	onDownload: (att: SerializedAttachmentWithContext) => void;
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
			type="button"
			onClick={() =>
				isPreviewable ? onPreview(attachment) : onDownload(attachment)
			}
			className="group relative flex flex-col rounded-lg border border-border/40 bg-secondary/5 overflow-hidden transition-all duration-200 hover:border-border/70 hover:bg-secondary/15 cursor-pointer text-left w-full"
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

/* ─── Main page ─── */

function AttachmentsPage() {
	const { q, filetype, from, after, before } = Route.useSearch();
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

	const { data, isPending, hasNextPage, isFetchingNextPage, fetchNextPage } =
		useMailAttachmentsInfinite({
			q,
			filetype,
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

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey
			) {
				return;
			}

			switch (e.key) {
				case "[":
					e.preventDefault();
					appNavigate({ to: "/module/mail" });
					break;
				case "/":
				case "k":
					e.preventDefault();
					inputRef.current?.focus();
					break;
				case "i":
					e.preventDefault();
					appNavigate({
						to: "/module/mail/inbox",
						search: {
							view: undefined,
							starred: undefined,
							attachment: undefined,
						},
					});
					break;
			}
		};

		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [appNavigate]);

	const attachments =
		data?.pages.flatMap((page) => page?.attachments ?? []) ?? [];
	const total = data?.pages[0]?.total;

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

	const handleFiletypeChange = useCallback(
		(ft: string | null) => {
			navigate({
				search: (prev) => ({
					...prev,
					filetype: ft ?? undefined,
				}),
			});
		},
		[navigate],
	);

	return (
		<>
			<div className="max-w-5xl mx-auto px-(--page-px) py-8 pb-16 space-y-6">
				{/* Header */}
				<div className="space-y-4">
					<Link
						to="/module/mail"
						className="inline-flex items-center gap-1.5 text-grey-2 hover:text-foreground text-[12px] font-body transition-colors"
					>
						<ArrowLeft className="size-3" />
						Mail
					</Link>

					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<Paperclip className="size-4 text-grey-2" />
							<h1 className="font-body text-[18px] font-medium text-foreground">
								Attachments
							</h1>
							{total !== undefined && (
								<span className="font-mono text-[11px] text-grey-3 tabular-nums">
									{total.toLocaleString()} file
									{total !== 1 ? "s" : ""}
								</span>
							)}
						</div>
					</div>

					{/* Search input */}
					<form onSubmit={handleSearchSubmit} className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-grey-3" />
						<input
							ref={inputRef}
							type="text"
							value={searchValue}
							onChange={(e) => setSearchValue(e.target.value)}
							placeholder="Search by filename..."
							className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/40 bg-secondary/5 font-body text-[13px] text-foreground placeholder:text-grey-3 focus:outline-none focus:border-border/70 focus:bg-secondary/10 transition-colors"
						/>
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

					{/* Filter chips */}
					<FileTypeFilter
						value={filetype ?? null}
						onChange={handleFiletypeChange}
					/>
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
							{q || filetype
								? "No attachments match your filters"
								: "No attachments found"}
						</p>
						<p className="font-body text-[12px] text-grey-3 mt-1">
							{q || filetype
								? "Try adjusting your search or filter"
								: "Attachments from your emails will appear here"}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{attachments.map((att) => (
							<AttachmentGridCard
								key={att.id}
								attachment={att}
								onPreview={handlePreview}
								onDownload={handleDownload}
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
