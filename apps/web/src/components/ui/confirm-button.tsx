import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface ConfirmButtonProps {
	/** The button element that triggers the confirmation dialog */
	children: React.ReactNode;
	title: string;
	description: string;
	/** Label for the confirm action button */
	confirmLabel?: string;
	/** Label for the cancel button */
	cancelLabel?: string;
	/** Use destructive styling for the confirm button */
	destructive?: boolean;
	/** Called when the user confirms the action */
	onConfirm: () => void;
}

export function ConfirmButton({
	children,
	title,
	description,
	confirmLabel = "Continue",
	cancelLabel = "Cancel",
	destructive = true,
	onConfirm,
}: ConfirmButtonProps) {
	const [open, setOpen] = useState(false);

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
					<AlertDialogAction
						className={cn(
							destructive && "bg-accent-red text-white hover:bg-accent-red/90",
						)}
						onClick={onConfirm}
					>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
