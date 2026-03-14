import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { type EnhanceAction, useAiEnhance } from "@/hooks/use-ai";
import { cn } from "@/lib/utils";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
	Bold,
	Ellipsis,
	Italic,
	Languages,
	Link as LinkIcon,
	List,
	ListOrdered,
	Loader2,
	Sparkles,
	Strikethrough,
	Underline as UnderlineIcon,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";

export interface RichTextEditorRef {
	focus: () => void;
	getHTML: () => string;
	getText: () => string;
	clear: () => void;
	isEmpty: () => boolean;
}

interface RichTextEditorProps {
	value?: string;
	onChange?: (html: string) => void;
	onPlainTextChange?: (text: string) => void;
	placeholder?: string;
	/** Minimal mode shows fewer toolbar buttons and no AI bar */
	minimal?: boolean;
	disabled?: boolean;
	className?: string;
	containerClassName?: string;
	editorClassName?: string;
	onKeyDown?: (e: KeyboardEvent) => void;
	ref?: React.Ref<RichTextEditorRef>;
	autoFocus?: boolean;
}

export function RichTextEditor({
	value,
	onChange,
	onPlainTextChange,
	placeholder = "Write something...",
	minimal = false,
	disabled = false,
	className,
	editorClassName,
	containerClassName,
	onKeyDown,
	ref,
	autoFocus = false,
}: RichTextEditorProps) {
	const isFocusedRef = useRef(false);
	const suppressUpdateRef = useRef(false);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: false,
				codeBlock: false,
				code: false,
				horizontalRule: false,
				blockquote: minimal ? false : undefined,
			}),
			Underline,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-foreground underline underline-offset-2",
				},
			}),
			Placeholder.configure({
				placeholder,
			}),
		],
		content: value || "",
		editable: !disabled,
		autofocus: autoFocus,
		onUpdate: ({ editor: e }) => {
			if (suppressUpdateRef.current) return;
			onChange?.(e.getHTML());
			onPlainTextChange?.(e.getText());
		},
		onFocus: () => {
			isFocusedRef.current = true;
		},
		onBlur: () => {
			isFocusedRef.current = false;
		},
		editorProps: {
			attributes: {
				class: cn(
					"outline-none min-h-[100px] font-body text-[13px] text-foreground leading-relaxed",
					"prose prose-sm max-w-none",
					"[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0",
					"tiptap",
					editorClassName,
				),
			},
			handleKeyDown: (_view, event) => {
				onKeyDown?.(event);
				return false;
			},
		},
	});

	// Sync external value changes
	useEffect(() => {
		if (!editor) return;
		const currentHTML = editor.getHTML();
		if (value !== undefined && value !== currentHTML) {
			suppressUpdateRef.current = true;
			editor.commands.setContent(value, { emitUpdate: false });
			suppressUpdateRef.current = false;
		}
	}, [value, editor]);

	useImperativeHandle(
		ref,
		() => ({
			focus: () => editor?.commands.focus(),
			getHTML: () => editor?.getHTML() ?? "",
			getText: () => editor?.getText() ?? "",
			clear: () => editor?.commands.clearContent(),
			isEmpty: () => editor?.isEmpty ?? true,
		}),
		[editor],
	);

	const toggleLink = useCallback(() => {
		if (!editor) return;
		if (editor.isActive("link")) {
			editor.chain().focus().unsetLink().run();
			return;
		}
		const url = window.prompt("URL");
		if (url) {
			editor.chain().focus().setLink({ href: url }).run();
		}
	}, [editor]);

	// AI enhance for selected text (bubble menu)
	const enhance = useAiEnhance();
	const handleEnhanceSelection = useCallback(
		(action: EnhanceAction, language?: string) => {
			if (!editor) return;
			const { from, to } = editor.state.selection;
			const selectedText = editor.state.doc.textBetween(from, to);
			if (!selectedText.trim()) return;

			enhance.mutate(
				{ text: selectedText, action, language },
				{
					onSuccess: (data) => {
						editor
							.chain()
							.focus()
							.deleteRange({ from, to })
							.insertContent(data.result)
							.run();
						onChange?.(editor.getHTML());
					},
					onError: () => toast.error("AI enhancement failed"),
				},
			);
		},
		[editor, enhance, onChange],
	);

	if (!editor) return null;

	return (
		<div
			className={cn(
				"rounded-md border border-border/50 bg-secondary/10 overflow-hidden transition-colors",
				"focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50",
				disabled && "opacity-50 pointer-events-none",
				className,
			)}
		>
			{/* Editor */}
			<div className={cn("px-3 py-3", containerClassName)}>
				<EditorContent editor={editor} />
			</div>

			{/* Floating toolbar on selection */}
			<BubbleMenu editor={editor}>
				<div className="flex items-center gap-0.5 rounded-lg border border-border/40 bg-popover px-1.5 py-1 shadow-md animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-1 duration-150">
					<ToolbarButton
						active={editor.isActive("bold")}
						onClick={() => editor.chain().focus().toggleBold().run()}
						label="Bold"
					>
						<Bold className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						active={editor.isActive("italic")}
						onClick={() => editor.chain().focus().toggleItalic().run()}
						label="Italic"
					>
						<Italic className="size-3.5" />
					</ToolbarButton>
					<ToolbarButton
						active={editor.isActive("underline")}
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						label="Underline"
					>
						<UnderlineIcon className="size-3.5" />
					</ToolbarButton>
					{!minimal && (
						<>
							<ToolbarButton
								active={editor.isActive("strike")}
								onClick={() => editor.chain().focus().toggleStrike().run()}
								label="Strikethrough"
							>
								<Strikethrough className="size-3.5" />
							</ToolbarButton>
							<div className="w-px h-4 bg-border/30 mx-0.5" />
							<ToolbarButton
								active={editor.isActive("bulletList")}
								onClick={() => editor.chain().focus().toggleBulletList().run()}
								label="Bullet list"
							>
								<List className="size-3.5" />
							</ToolbarButton>
							<ToolbarButton
								active={editor.isActive("orderedList")}
								onClick={() => editor.chain().focus().toggleOrderedList().run()}
								label="Numbered list"
							>
								<ListOrdered className="size-3.5" />
							</ToolbarButton>
						</>
					)}
					<div className="w-px h-4 bg-border/30 mx-0.5" />
					<ToolbarButton
						active={editor.isActive("link")}
						onClick={toggleLink}
						label="Link"
					>
						<LinkIcon className="size-3.5" />
					</ToolbarButton>

					{/* AI actions on selection */}
					<div className="w-px h-4 bg-border/30 mx-0.5" />
					<AiDropdown
						onAction={handleEnhanceSelection}
						isPending={enhance.isPending}
						scope="selection"
					/>
				</div>
			</BubbleMenu>
		</div>
	);
}

/* ── Toolbar button ── */

function ToolbarButton({
	active,
	onClick,
	label,
	children,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			className={cn(
				"p-1.5 rounded-md transition-colors cursor-pointer",
				active
					? "bg-foreground/10 text-foreground"
					: "text-grey-3 hover:text-foreground hover:bg-foreground/5",
			)}
		>
			{children}
		</button>
	);
}

/* ── AI action definitions ── */

type AiAction = {
	id: EnhanceAction;
	label: string;
	icon?: React.ComponentType<{ className?: string }>;
	needsLanguage?: boolean;
};

type AiActionGroup = {
	label: string;
	actions: AiAction[];
};

const QUICK_ACTIONS: AiAction[] = [
	{ id: "fix-grammar", label: "Fix grammar", icon: Sparkles },
	{ id: "translate", label: "Translate", icon: Languages, needsLanguage: true },
];

const MORE_ACTIONS: AiActionGroup[] = [
	{
		label: "Tone",
		actions: [
			{ id: "more-formal", label: "More formal" },
			{ id: "more-friendly", label: "More friendly" },
			{ id: "more-concise", label: "More concise" },
			{ id: "more-detailed", label: "More detailed" },
		],
	},
	{
		label: "Transform",
		actions: [
			{ id: "improve-clarity", label: "Improve clarity" },
			{ id: "shorten", label: "Shorten" },
			{ id: "expand", label: "Expand" },
		],
	},
];

/* ── AI actions bar ── */

export function AiDropdown({
	onAction,
	isPending,
	scope,
}: {
	onAction: (action: EnhanceAction, language?: string) => void;
	isPending: boolean;
	scope: "selection" | "message";
}) {
	const [open, setOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node)
			) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open]);

	const handleAction = useCallback(
		(action: EnhanceAction, needsLanguage?: boolean) => {
			if (needsLanguage) {
				const language = window.prompt("Translate to which language?");
				if (!language) return;
				onAction(action, language);
			} else {
				onAction(action);
			}
			setOpen(false);
		},
		[onAction],
	);

	return (
		<div ref={dropdownRef} className="flex items-center gap-1">
			{isPending && (
				<Loader2 className="size-3 text-grey-3 animate-spin mr-0.5" />
			)}

			{/* Quick actions — icon only with sliding tooltips */}
			<TooltipProvider sliding>
				{QUICK_ACTIONS.map((action) => {
					const Icon = action.icon!;
					return (
						<Tooltip key={action.id}>
							<TooltipTrigger asChild>
								<button
									type="button"
									disabled={isPending}
									onClick={() => handleAction(action.id, action.needsLanguage)}
									className={cn(
										"inline-flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
										"text-grey-3 hover:text-foreground hover:bg-foreground/5",
										isPending && "opacity-50 cursor-not-allowed",
									)}
								>
									<Icon className="size-3.5" />
								</button>
							</TooltipTrigger>
							<TooltipContent side="top" sideOffset={6}>
								{action.label}
							</TooltipContent>
						</Tooltip>
					);
				})}
			</TooltipProvider>

			{/* More dropdown */}
			<div className="relative">
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					disabled={isPending}
					title="More AI actions"
					className={cn(
						"inline-flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
						"text-grey-3 hover:text-foreground hover:bg-foreground/5",
						isPending && "opacity-50 cursor-not-allowed",
					)}
				>
					<Ellipsis className="size-3.5" />
				</button>

				{open && (
					<div
						className={cn(
							"absolute z-50 min-w-[160px] rounded-lg border border-border/40 bg-popover p-1 shadow-md",
							"animate-in fade-in-0 zoom-in-95 duration-100",
							scope === "selection"
								? "bottom-full mb-1 right-0"
								: "bottom-full mb-1 left-0",
						)}
					>
						{MORE_ACTIONS.map((group, gi) => (
							<div key={group.label}>
								{gi > 0 && <div className="h-px bg-border/30 my-1" />}
								<div className="px-2 py-1">
									<span className="font-mono text-[9px] text-grey-3 uppercase tracking-wider">
										{group.label}
									</span>
								</div>
								{group.actions.map((action) => (
									<button
										key={action.id}
										type="button"
										onClick={() =>
											handleAction(action.id, action.needsLanguage)
										}
										className="w-full px-2 py-1.5 rounded-md font-body text-[12px] text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors cursor-pointer text-left"
									>
										{action.label}
									</button>
								))}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
