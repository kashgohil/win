import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
	useCreateTransaction,
	useScanReceipt,
	type ScanReceiptResult,
} from "@/hooks/use-finance";
import { useForm } from "@tanstack/react-form";
import { CalendarIcon, ImagePlus, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

const EXPENSE_CATEGORIES: { value: string; code: string; label: string }[] = [
	{ value: "software", code: "SFT", label: "Software" },
	{ value: "subscription", code: "SUB", label: "Subscription" },
	{ value: "food", code: "FOD", label: "Food" },
	{ value: "travel", code: "TRV", label: "Travel" },
	{ value: "utilities", code: "UTL", label: "Utilities" },
	{ value: "shopping", code: "SHP", label: "Shopping" },
	{ value: "entertainment", code: "ENT", label: "Entertainment" },
	{ value: "education", code: "EDU", label: "Education" },
	{ value: "health", code: "HLT", label: "Health" },
	{ value: "housing", code: "HSG", label: "Housing" },
	{ value: "transport", code: "TRN", label: "Transport" },
	{ value: "business", code: "BIZ", label: "Business" },
	{ value: "other", code: "OTH", label: "Other" },
];

const INCOME_CATEGORIES: { value: string; code: string; label: string }[] = [
	{ value: "salary", code: "SAL", label: "Salary" },
	{ value: "freelance", code: "FRL", label: "Freelance" },
	{ value: "investment", code: "INV", label: "Investment" },
	{ value: "refund", code: "RFD", label: "Refund" },
	{ value: "gift", code: "GFT", label: "Gift" },
	{ value: "business", code: "BIZ", label: "Business" },
	{ value: "other", code: "OTH", label: "Other" },
];

const CUSTOM_CATEGORY_VALUE = "__custom__";

export function AddTransactionDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const createTxn = useCreateTransaction();
	const scanReceipt = useScanReceipt();
	const [type, setType] = useState<"expense" | "income">("expense");
	const [calendarOpen, setCalendarOpen] = useState(false);
	const [customCategory, setCustomCategory] = useState("");
	const [isCustomCategory, setIsCustomCategory] = useState(false);
	const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
	const [dragging, setDragging] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const form = useForm({
		defaultValues: {
			amount: "",
			merchant: "",
			description: "",
			category: "other",
			date: new Date(),
		},
		onSubmit: async ({ value }) => {
			const cents = Math.round(Number.parseFloat(value.amount) * 100);
			if (!cents || cents <= 0) {
				toast.error("Enter a valid amount");
				return;
			}

			const finalCategory = isCustomCategory
				? customCategory.trim().toLowerCase() || "other"
				: value.category;

			createTxn.mutate(
				{
					type,
					amount: cents,
					merchant: value.merchant || undefined,
					description: value.description || undefined,
					category: finalCategory,
					transactedAt: value.date.toISOString(),
				},
				{
					onSuccess: () => {
						toast("Transaction added");
						onOpenChange(false);
						form.reset();
						setType("expense");
						setCustomCategory("");
						setIsCustomCategory(false);
						setReceiptPreview(null);
					},
					onError: () => toast.error("Failed to add transaction"),
				},
			);
		},
	});

	const processFile = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("image/")) {
				toast.error("Please upload an image file");
				return;
			}
			if (file.size > 10 * 1024 * 1024) {
				toast.error("Image must be under 10MB");
				return;
			}

			const previewUrl = URL.createObjectURL(file);
			setReceiptPreview(previewUrl);

			const buffer = await file.arrayBuffer();
			const bytes = new Uint8Array(buffer);
			let binary = "";
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const base64 = btoa(binary);

			scanReceipt.mutate(
				{ image: base64, mimeType: file.type },
				{
					onSuccess: (result: ScanReceiptResult) => {
						if (result.type) setType(result.type);
						if (result.amount != null) {
							form.setFieldValue(
								"amount",
								(result.amount / 100).toFixed(2),
							);
						}
						if (result.merchant) {
							form.setFieldValue("merchant", result.merchant);
						}
						if (result.description) {
							form.setFieldValue("description", result.description);
						}
						if (result.transactedAt) {
							form.setFieldValue(
								"date",
								new Date(result.transactedAt),
							);
						}
						if (result.category) {
							const cats =
								result.type === "income"
									? INCOME_CATEGORIES
									: EXPENSE_CATEGORIES;
							const match = cats.find(
								(c) => c.value === result.category,
							);
							if (match) {
								form.setFieldValue("category", match.value);
								setIsCustomCategory(false);
							} else {
								setIsCustomCategory(true);
								setCustomCategory(result.category);
							}
						}
						toast("Receipt scanned");
					},
					onError: () => {
						toast.error("Could not parse receipt");
					},
				},
			);
		},
		[form, scanReceipt],
	);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) processFile(file);
			e.target.value = "";
		},
		[processFile],
	);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragging(false);
			const file = e.dataTransfer.files[0];
			if (file) processFile(file);
		},
		[processFile],
	);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragging(false);
	}, []);

	const clearReceipt = useCallback(() => {
		if (receiptPreview) URL.revokeObjectURL(receiptPreview);
		setReceiptPreview(null);
	}, [receiptPreview]);

	const categories =
		type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add transaction</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="mt-2"
				>
					<div className="space-y-3">
						{/* Type toggle */}
						<Tabs
							value={type}
							onValueChange={(v) =>
								setType(v as "expense" | "income")
							}
						>
							<TabsList className="w-full">
								<TabsTrigger
									value="expense"
									className="flex-1"
								>
									Expense
								</TabsTrigger>
								<TabsTrigger
									value="income"
									className="flex-1"
								>
									Income
								</TabsTrigger>
							</TabsList>
						</Tabs>

						{/* Receipt upload */}
						<div>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/*"
								className="hidden"
								onChange={handleFileChange}
							/>
							{receiptPreview ? (
								<div className="relative rounded-lg border border-border/40 overflow-hidden">
									<img
										src={receiptPreview}
										alt="Receipt"
										className="w-full max-h-36 object-cover"
									/>
									{scanReceipt.isPending && (
										<div className="absolute inset-0 flex items-center justify-center bg-background/70">
											<Loader2 className="size-5 animate-spin text-foreground" />
											<span className="ml-2 font-mono text-[11px] text-foreground">
												Scanning...
											</span>
										</div>
									)}
									<button
										type="button"
										onClick={clearReceipt}
										className="absolute top-1.5 right-1.5 size-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
									>
										<X className="size-3.5" />
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									onDrop={handleDrop}
									onDragOver={handleDragOver}
									onDragLeave={handleDragLeave}
									className={cn(
										"w-full flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed py-6 transition-colors",
										dragging
											? "border-foreground/40 bg-secondary/20 text-foreground"
											: "border-border/50 hover:border-border text-grey-3 hover:text-foreground",
									)}
								>
									<ImagePlus className="size-5" />
									<span className="font-mono text-[11px]">
										{dragging
											? "Drop receipt here"
											: "Drop receipt or click to upload"}
									</span>
									<span className="font-mono text-[10px] text-grey-3">
										Auto-fills all fields
									</span>
								</button>
							)}
						</div>

						<div className="grid grid-cols-2 gap-3">
							<form.Field
								name="amount"
								validators={{
									onSubmit: ({ value }) =>
										!value || Number.parseFloat(value) <= 0
											? "Required"
											: undefined,
								}}
							>
								{(field) => (
									<div className="space-y-1">
										<Label htmlFor="txn-amount">Amount</Label>
										<Input
											id="txn-amount"
											type="number"
											step="0.01"
											min="0"
											placeholder="0.00"
											value={field.state.value}
											onChange={(e) =>
												field.handleChange(e.target.value)
											}
											onBlur={field.handleBlur}
											className="h-9 px-3"
										/>
									</div>
								)}
							</form.Field>

							<form.Field name="date">
								{(field) => (
									<div className="space-y-1">
										<Label>Date</Label>
										<Popover
											open={calendarOpen}
											onOpenChange={setCalendarOpen}
										>
											<PopoverTrigger asChild>
												<Button
													variant="outline"
													className={cn(
														"h-9 w-full justify-start text-left font-mono text-[13px] font-normal",
														!field.state.value &&
															"text-muted-foreground",
													)}
												>
													<CalendarIcon className="mr-2 size-3.5 text-muted-foreground" />
													{field.state.value.toLocaleDateString(
														"en-US",
														{
															month: "short",
															day: "numeric",
															year: "numeric",
														},
													)}
												</Button>
											</PopoverTrigger>
											<PopoverContent
												className="w-auto p-0"
												align="start"
											>
												<Calendar
													mode="single"
													selected={field.state.value}
													onSelect={(d) => {
														if (d) field.handleChange(d);
														setCalendarOpen(false);
													}}
													initialFocus
												/>
											</PopoverContent>
										</Popover>
									</div>
								)}
							</form.Field>
						</div>

						<form.Field name="merchant">
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor="txn-merchant">
										{type === "expense" ? "Merchant" : "Source"}
									</Label>
									<Input
										id="txn-merchant"
										placeholder={
											type === "expense"
												? "e.g. Amazon, Spotify"
												: "e.g. Client name, Employer"
										}
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										className="h-9 px-3"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="description">
							{(field) => (
								<div className="space-y-1">
									<Label htmlFor="txn-description">
										Description
									</Label>
									<Input
										id="txn-description"
										placeholder={
											type === "expense"
												? "What was this for?"
												: "e.g. March invoice, Dividend"
										}
										value={field.state.value}
										onChange={(e) =>
											field.handleChange(e.target.value)
										}
										onBlur={field.handleBlur}
										className="h-9 px-3"
									/>
								</div>
							)}
						</form.Field>

						<form.Field name="category">
							{(field) => (
								<div className="space-y-1">
									<Label>Category</Label>
									{isCustomCategory ? (
										<div className="flex gap-2">
											<Input
												placeholder="Custom category"
												value={customCategory}
												onChange={(e) =>
													setCustomCategory(e.target.value)
												}
												className="h-9 px-3 flex-1"
											/>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												className="h-9 px-2 text-grey-3"
												onClick={() => {
													setIsCustomCategory(false);
													setCustomCategory("");
												}}
											>
												<X className="size-3.5" />
											</Button>
										</div>
									) : (
										<Select
											value={
												categories.find(
													(c) =>
														c.value ===
														field.state.value,
												)
													? field.state.value
													: "other"
											}
											onValueChange={(v) => {
												if (v === CUSTOM_CATEGORY_VALUE) {
													setIsCustomCategory(true);
												} else {
													field.handleChange(v);
												}
											}}
										>
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{categories.map((c) => (
													<SelectItem
														key={c.value}
														value={c.value}
													>
														<span className="font-mono text-[10px] text-grey-3 mr-1.5">
															{c.code}
														</span>
														{c.label}
													</SelectItem>
												))}
												<SelectItem
													value={CUSTOM_CATEGORY_VALUE}
												>
													<span className="font-mono text-[10px] text-grey-3 mr-1.5">
														+
													</span>
													Custom...
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								</div>
							)}
						</form.Field>
					</div>

					<Button
						type="submit"
						className="w-full mt-6"
						disabled={createTxn.isPending || scanReceipt.isPending}
					>
						{createTxn.isPending ? "Adding..." : "Add transaction"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
