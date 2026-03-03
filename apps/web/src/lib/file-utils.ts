import {
	Archive,
	File,
	FileAudio,
	FileCode,
	FileImage,
	FileSpreadsheet,
	FileText,
	FileVideo,
	Presentation,
} from "lucide-react";

/* ─── File type classification ─── */

export type FileCategory =
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

export function classifyFile(mimeType: string, filename: string): FileCategory {
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

export const FILE_CATEGORY_CONFIG: Record<
	FileCategory,
	{
		icon: typeof File;
		accent: string;
		iconBg: string;
		label: string;
	}
> = {
	image: {
		icon: FileImage,
		accent: "text-violet-600 dark:text-violet-400",
		iconBg: "bg-violet-500/10 dark:bg-violet-400/10",
		label: "Images",
	},
	pdf: {
		icon: FileText,
		accent: "text-red-600 dark:text-red-400",
		iconBg: "bg-red-500/10 dark:bg-red-400/10",
		label: "PDFs",
	},
	document: {
		icon: FileText,
		accent: "text-blue-600 dark:text-blue-400",
		iconBg: "bg-blue-500/10 dark:bg-blue-400/10",
		label: "Documents",
	},
	spreadsheet: {
		icon: FileSpreadsheet,
		accent: "text-emerald-600 dark:text-emerald-400",
		iconBg: "bg-emerald-500/10 dark:bg-emerald-400/10",
		label: "Spreadsheets",
	},
	presentation: {
		icon: Presentation,
		accent: "text-orange-600 dark:text-orange-400",
		iconBg: "bg-orange-500/10 dark:bg-orange-400/10",
		label: "Presentations",
	},
	video: {
		icon: FileVideo,
		accent: "text-pink-600 dark:text-pink-400",
		iconBg: "bg-pink-500/10 dark:bg-pink-400/10",
		label: "Videos",
	},
	audio: {
		icon: FileAudio,
		accent: "text-amber-600 dark:text-amber-400",
		iconBg: "bg-amber-500/10 dark:bg-amber-400/10",
		label: "Audio",
	},
	archive: {
		icon: Archive,
		accent: "text-grey-2 dark:text-grey-3",
		iconBg: "bg-secondary/20",
		label: "Archives",
	},
	code: {
		icon: FileCode,
		accent: "text-cyan-600 dark:text-cyan-400",
		iconBg: "bg-cyan-500/10 dark:bg-cyan-400/10",
		label: "Code",
	},
	generic: {
		icon: File,
		accent: "text-grey-2 dark:text-grey-3",
		iconBg: "bg-secondary/20",
		label: "Other",
	},
};

/* ─── Utilities ─── */

export function getFileExtension(filename: string): string {
	const ext = filename.split(".").pop()?.toUpperCase() ?? "";
	return ext.length <= 5 ? ext : "";
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function truncateFilename(name: string, max = 32): string {
	if (name.length <= max) return name;
	const ext = name.lastIndexOf(".");
	if (ext === -1) return `${name.slice(0, max - 3)}...`;
	const extension = name.slice(ext);
	const base = name.slice(0, max - extension.length - 3);
	return `${base}...${extension}`;
}

export function canPreview(mimeType: string): boolean {
	return mimeType.startsWith("image/") || mimeType === "application/pdf";
}
