import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { env } from "@/env";
import { useImageThumbnail } from "@/hooks/use-image-thumbnail";
import {
	FILE_CATEGORY_CONFIG,
	canPreview,
	classifyFile,
	formatFileSize,
	getFileExtension,
	truncateFilename,
} from "@/lib/file-utils";
import { cn } from "@/lib/utils";
import type { SerializedAttachment } from "@wingmnn/types";
import { Download, Paperclip, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";

/* ─── Attachment card ─── */

function AttachmentCard({
	attachment,
	onPreview,
	onDownload,
}: {
	attachment: SerializedAttachment;
	onPreview: (att: SerializedAttachment) => void;
	onDownload: (att: SerializedAttachment) => void;
}) {
	const category = classifyFile(attachment.mimeType, attachment.filename);
	const config = FILE_CATEGORY_CONFIG[category];
	const Icon = config.icon;
	const ext = getFileExtension(attachment.filename);
	const thumbUrl = useImageThumbnail(attachment);
	const isPreviewable = canPreview(attachment.mimeType);

	return (
		<button
			type="button"
			onClick={() =>
				isPreviewable ? onPreview(attachment) : onDownload(attachment)
			}
			className="group relative flex items-center gap-3 rounded-lg border border-border/40 bg-secondary/5 px-3 py-2.5 text-left transition-all duration-200 hover:border-border/70 hover:bg-secondary/15 cursor-pointer w-full"
			title={attachment.filename}
		>
			{/* Icon / Thumbnail */}
			{thumbUrl ? (
				<div className="relative size-9 shrink-0 rounded-md overflow-hidden bg-secondary/20">
					<img src={thumbUrl} alt="" className="size-full object-cover" />
				</div>
			) : (
				<div
					className={cn(
						"flex items-center justify-center size-9 shrink-0 rounded-md",
						config.iconBg,
					)}
				>
					<Icon className={cn("size-4", config.accent)} />
				</div>
			)}

			{/* File info */}
			<div className="flex-1 min-w-0">
				<p className="font-body text-[13px] text-foreground truncate leading-snug">
					{truncateFilename(attachment.filename)}
				</p>
				<p className="font-mono text-[10px] text-grey-3 mt-0.5">
					{ext && (
						<span className={cn("font-medium mr-1.5", config.accent)}>
							{ext}
						</span>
					)}
					{formatFileSize(attachment.size)}
				</p>
			</div>

			{/* Download action — visible on hover */}
			<div
				className="shrink-0 p-1.5 rounded-md text-grey-3 opacity-0 group-hover:opacity-100 transition-all duration-150 hover:bg-secondary/30 hover:text-foreground"
				role="presentation"
				onClick={(e) => {
					e.stopPropagation();
					onDownload(attachment);
				}}
				onKeyDown={() => {}}
			>
				<Download className="size-3.5" />
			</div>
		</button>
	);
}

/* ─── Main component ─── */

export function AttachmentList({
	attachments,
}: {
	attachments: SerializedAttachment[];
}) {
	// Separate open state from preview data so content persists during close animation
	const [dialogOpen, setDialogOpen] = useState(false);
	const [preview, setPreview] = useState<{
		url: string;
		mimeType: string;
		filename: string;
	} | null>(null);
	const previewUrlRef = useRef<string | null>(null);

	const downloadUrl = useCallback(
		(id: string) => `${env.VITE_API_URL}/mail/attachments/${id}/download`,
		[],
	);

	const handleDownload = useCallback(
		async (attachment: SerializedAttachment) => {
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
		async (attachment: SerializedAttachment) => {
			// Open dialog immediately with metadata, fetch content in background
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
		// Close dialog first, clean up data after animation completes
		setDialogOpen(false);
		const url = previewUrlRef.current;
		setTimeout(() => {
			if (url) URL.revokeObjectURL(url);
			previewUrlRef.current = null;
			setPreview(null);
		}, 250);
	}, []);

	if (attachments.length === 0) return null;

	return (
		<>
			<div className="space-y-2.5">
				<div className="flex items-center gap-2">
					<Paperclip className="size-3 text-grey-3" />
					<h3 className="font-body text-[11px] uppercase tracking-wider text-grey-3">
						{attachments.length} attachment
						{attachments.length !== 1 && "s"}
					</h3>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					{attachments.map((att) => (
						<AttachmentCard
							key={att.id}
							attachment={att}
							onPreview={handlePreview}
							onDownload={handleDownload}
						/>
					))}
				</div>
			</div>

			<Dialog
				open={dialogOpen}
				onOpenChange={(open) => !open && closePreview()}
			>
				<DialogContent
					showCloseButton={false}
					className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden"
				>
					{/* Header */}
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

					{/* Content */}
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
		</>
	);
}
