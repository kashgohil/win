import { useMailSenders } from "@/hooks/use-mail";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecipientInputProps {
	id?: string;
	label: string;
	values: string[];
	onChange: (values: string[]) => void;
	placeholder?: string;
}

export function RecipientInput({
	id,
	label,
	values,
	onChange,
	placeholder = "recipient@example.com",
}: RecipientInputProps) {
	const [input, setInput] = useState("");
	const [focused, setFocused] = useState(false);
	const [highlightIndex, setHighlightIndex] = useState(-1);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const { data: senderData } = useMailSenders(input);
	const suggestions = (senderData?.senders ?? []).filter(
		(s) => !values.includes(s.address),
	);

	const showDropdown = focused && input.length >= 1 && suggestions.length > 0;

	const addRecipient = useCallback(
		(address: string) => {
			const trimmed = address.trim().toLowerCase();
			if (trimmed && !values.includes(trimmed)) {
				onChange([...values, trimmed]);
			}
			setInput("");
			setHighlightIndex(-1);
		},
		[values, onChange],
	);

	const removeRecipient = useCallback(
		(address: string) => {
			onChange(values.filter((v) => v !== address));
		},
		[values, onChange],
	);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
				if (showDropdown && highlightIndex >= 0) {
					e.preventDefault();
					addRecipient(suggestions[highlightIndex].address);
				} else if (input.trim()) {
					e.preventDefault();
					addRecipient(input);
				}
			} else if (e.key === "Backspace" && !input && values.length > 0) {
				removeRecipient(values[values.length - 1]);
			} else if (e.key === "ArrowDown" && showDropdown) {
				e.preventDefault();
				setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
			} else if (e.key === "ArrowUp" && showDropdown) {
				e.preventDefault();
				setHighlightIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
			} else if (e.key === "Escape") {
				setInput("");
				setHighlightIndex(-1);
			}
		},
		[
			input,
			values,
			showDropdown,
			highlightIndex,
			suggestions,
			addRecipient,
			removeRecipient,
		],
	);

	// Reset highlight when suggestions change
	useEffect(() => {
		setHighlightIndex(-1);
	}, [input]);

	// Close dropdown on click outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				setFocused(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, []);

	return (
		<div ref={containerRef} className="relative">
			<div
				className={cn(
					"flex items-center gap-2 py-1.5 border-b transition-colors flex-wrap",
					focused ? "border-border/40" : "border-border/10",
				)}
				onClick={() => inputRef.current?.focus()}
			>
				<span className="font-body text-[12px] text-grey-3 shrink-0">
					{label}
				</span>
				{values.map((addr) => (
					<span
						key={addr}
						className="inline-flex items-center gap-1 rounded-full bg-secondary/30 px-2.5 py-0.5 font-mono text-[11px] text-foreground"
					>
						{addr}
						<button
							type="button"
							className="hover:text-accent-red cursor-pointer"
							onClick={(e) => {
								e.stopPropagation();
								removeRecipient(addr);
							}}
						>
							<X className="size-2.5" />
						</button>
					</span>
				))}
				<input
					ref={inputRef}
					id={id}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onFocus={() => setFocused(true)}
					onKeyDown={handleKeyDown}
					placeholder={values.length === 0 ? placeholder : ""}
					className="flex-1 min-w-[100px] bg-transparent font-body text-[13px] text-foreground placeholder:text-grey-3/40 outline-none"
				/>
			</div>

			{showDropdown && (
				<div className="absolute z-50 mt-1 w-full rounded-lg border border-border/40 bg-background shadow-lg overflow-hidden">
					{suggestions.slice(0, 6).map((s, i) => (
						<button
							key={s.address}
							type="button"
							className={cn(
								"w-full text-left px-3 py-2 flex items-center gap-2 transition-colors cursor-pointer",
								i === highlightIndex
									? "bg-secondary/30"
									: "hover:bg-secondary/15",
							)}
							onMouseDown={(e) => {
								e.preventDefault();
								addRecipient(s.address);
							}}
							onMouseEnter={() => setHighlightIndex(i)}
						>
							<div className="min-w-0 flex-1">
								{s.name && (
									<div className="font-body text-[13px] text-foreground truncate">
										{s.name}
									</div>
								)}
								<div className="font-mono text-[11px] text-grey-3 truncate">
									{s.address}
								</div>
							</div>
							<span className="font-mono text-[9px] text-grey-3 shrink-0">
								{s.count}
							</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
