import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogTitle,
} from "@/components/ui/dialog";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import type { SerializedAttachment } from "@wingmnn/types";
import {
	Archive,
	Download,
	File,
	FileAudio,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	Paperclip,
	Presentation,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Utilities ─── */

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canPreview(mimeType: string): boolean {
	return mimeType.startsWith("image/") || mimeType === "application/pdf";
}

function truncateFilename(name: string, max = 32): string {
	if (name.length <= max) return name;
	const ext = name.lastIndexOf(".");
	if (ext === -1) return `${name.slice(0, max - 3)}...`;
	const extension = name.slice(ext);
	const base = name.slice(0, max - extension.length - 3);
	return `${base}...${extension}`;
}

/* ─── File type classification ─── */

type FileCategory =
	| "image"
	| "pdf"
	| "document"
	| "spreadsheet"
	| "presentation"
	| "video"
	| "audio"
	| "archive"
	| "code"
	| "generic";

function classifyFile(mimeType: string, filename: string): FileCategory {
	if (mimeType.startsWith("image/")) return "image";
	if (mimeType === "application/pdf") return "pdf";
	if (mimeType.startsWith("video/")) return "video";
	if (mimeType.startsWith("audio/")) return "audio";

	const ext = filename.split(".").pop()?.toLowerCase() ?? "";

	if (
		mimeType.includes("spreadsheet") ||
		mimeType.includes("excel") ||
		["xlsx", "xls", "csv", "numbers"].includes(ext)
	)
		return "spreadsheet";
	if (
		mimeType.includes("presentation") ||
		mimeType.includes("powerpoint") ||
		["pptx", "ppt", "key"].includes(ext)
	)
		return "presentation";
	if (
		mimeType.includes("document") ||
		mimeType.includes("msword") ||
		mimeType.includes("text/plain") ||
		mimeType.includes("rtf") ||
		["docx", "doc", "txt", "rtf", "pages", "odt"].includes(ext)
	)
		return "document";
	if (
		mimeType.includes("zip") ||
		mimeType.includes("compressed") ||
		mimeType.includes("archive") ||
		mimeType.includes("tar") ||
		mimeType.includes("gzip") ||
		["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext)
	)
		return "archive";
	if (
		mimeType.includes("javascript") ||
		mimeType.includes("json") ||
		mimeType.includes("xml") ||
		mimeType.includes("html") ||
		[
			"js",
			"ts",
			"jsx",
			"tsx",
			"py",
			"rb",
			"go",
			"rs",
			"java",
			"c",
			"cpp",
			"h",
			"css",
			"scss",
			"html",
			"xml",
			"json",
			"yaml",
			"yml",
			"sh",
			"sql",
		].includes(ext)
	)
		return "code";

	return "generic";
}

const FILE_CATEGORY_CONFIG: Record<
	FileCategory,
	{
		icon: typeof File;
		accent: string;
		iconBg: string;
	}
> = {
	image: {
		icon: FileImage,
		accent: "text-violet-600 dark:text-violet-400",
		iconBg: "bg-violet-500/10 dark:bg-violet-400/10",
	},
	pdf: {
		icon: FileText,
		accent: "text-red-600 dark:text-red-400",
		iconBg: "bg-red-500/10 dark:bg-red-400/10",
	},
	document: {
		icon: FileText,
		accent: "text-blue-600 dark:text-blue-400",
		iconBg: "bg-blue-500/10 dark:bg-blue-400/10",
	},
	spreadsheet: {
		icon: FileSpreadsheet,
		accent: "text-emerald-600 dark:text-emerald-400",
		iconBg: "bg-emerald-500/10 dark:bg-emerald-400/10",
	},
	presentation: {
		icon: Presentation,
		accent: "text-orange-600 dark:text-orange-400",
		iconBg: "bg-orange-500/10 dark:bg-orange-400/10",
	},
	video: {
		icon: FileVideo,
		accent: "text-pink-600 dark:text-pink-400",
		iconBg: "bg-pink-500/10 dark:bg-pink-400/10",
	},
	audio: {
		icon: FileAudio,
		accent: "text-amber-600 dark:text-amber-400",
		iconBg: "bg-amber-500/10 dark:bg-amber-400/10",
	},
	archive: {
		icon: Archive,
		accent: "text-grey-2 dark:text-grey-3",
		iconBg: "bg-secondary/20",
	},
	code: {
		icon: FileCode,
		accent: "text-cyan-600 dark:text-cyan-400",
		iconBg: "bg-cyan-500/10 dark:bg-cyan-400/10",
	},
	generic: {
		icon: File,
		accent: "text-grey-2 dark:text-grey-3",
		iconBg: "bg-secondary/20",
	},
};

function getFileExtension(filename: string): string {
	const ext = filename.split(".").pop()?.toUpperCase() ?? "";
	return ext.length <= 5 ? ext : "";
}

/* ─── Thumbnail hook ─── */

function useImageThumbnail(attachment: SerializedAttachment) {
	const [thumbUrl, setThumbUrl] = useState<string | null>(null);
	const urlRef = useRef<string | null>(null);

	useEffect(() => {
		if (!attachment.mimeType.startsWith("image/")) return;

		let cancelled = false;
		const url = `${env.VITE_API_URL}/mail/attachments/${attachment.id}/download`;

		fetch(url, { credentials: "include" })
			.then((res) => {
				if (!res.ok || cancelled) return null;
				return res.blob();
			})
			.then((blob) => {
				if (!blob || cancelled) return;
				const objectUrl = URL.createObjectURL(blob);
				urlRef.current = objectUrl;
				setThumbUrl(objectUrl);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			if (urlRef.current) {
				URL.revokeObjectURL(urlRef.current);
				urlRef.current = null;
			}
		};
	}, [attachment.id, attachment.mimeType]);

	return thumbUrl;
}

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
