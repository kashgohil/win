import { MOTION_CONSTANTS } from "@/components/constant";
import { useMailAttachmentsInfinite } from "@/hooks/use-mail";
import { Link } from "@tanstack/react-router";
import {
	File,
	FileImage,
	FileSpreadsheet,
	FileText,
	Paperclip,
} from "lucide-react";
import { motion } from "motion/react";

const FILE_ICONS: Record<string, typeof File> = {
	pdf: FileText,
	doc: FileText,
	docx: FileText,
	xls: FileSpreadsheet,
	xlsx: FileSpreadsheet,
	csv: FileSpreadsheet,
	jpg: FileImage,
	jpeg: FileImage,
	png: FileImage,
	gif: FileImage,
	webp: FileImage,
	svg: FileImage,
};

function getFileIcon(filename: string | null): typeof File {
	if (!filename) return File;
	const ext = filename.split(".").pop()?.toLowerCase() ?? "";
	return FILE_ICONS[ext] ?? File;
}

function formatSize(bytes: number | null): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function RecentAttachmentsWidget() {
	const { data, isLoading } = useMailAttachmentsInfinite();

	const attachments = data?.pages?.flatMap((p) => p?.attachments ?? []) ?? [];

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[0, 1, 2].map((i) => (
					<div key={i} className="animate-pulse flex items-center gap-3 py-2">
						<div className="size-8 rounded bg-secondary/20" />
						<div className="flex-1 space-y-1.5">
							<div className="h-3 w-32 bg-secondary/20 rounded" />
							<div className="h-2.5 w-20 bg-secondary/15 rounded" />
						</div>
					</div>
				))}
			</div>
		);
	}

	if (attachments.length === 0) {
		return (
			<p className="font-body text-[13px] text-grey-3 italic py-4">
				No recent attachments.
			</p>
		);
	}

	return (
		<div className="space-y-0.5">
			{attachments.slice(0, 5).map((att, i) => {
				const FileIcon = getFileIcon(att.filename);

				return (
					<motion.div
						key={att.id}
						initial={{ opacity: 0, y: 6 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{
							delay: i * 0.03,
							duration: 0.3,
							ease: MOTION_CONSTANTS.EASE,
						}}
					>
						<Link
							to="/module/mail/attachments"
							className="group flex items-center gap-3 rounded-md px-2 py-2 -mx-2 hover:bg-secondary/20 transition-colors cursor-pointer"
						>
							<div className="size-8 rounded-md bg-foreground/4 border border-border/30 flex items-center justify-center shrink-0">
								<FileIcon className="size-3.5 text-grey-2" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="font-body text-[13px] text-foreground/80 truncate group-hover:text-foreground transition-colors">
									{att.filename ?? "Untitled"}
								</p>
								<div className="flex items-center gap-2 mt-0.5">
									{att.size != null && (
										<span className="font-mono text-[10px] text-grey-3 tabular-nums">
											{formatSize(att.size)}
										</span>
									)}
									{"emailSubject" in att && att.emailSubject && (
										<span className="font-body text-[10px] text-grey-3 truncate">
											{att.emailSubject as string}
										</span>
									)}
								</div>
							</div>
						</Link>
					</motion.div>
				);
			})}
			<Link
				to="/module/mail/attachments"
				className="flex items-center justify-center gap-1.5 font-mono text-[11px] text-grey-3 hover:text-foreground tracking-[0.03em] transition-colors mt-3 pt-3 border-t border-border/30"
			>
				<Paperclip className="size-3" />
				View all
			</Link>
		</div>
	);
}
