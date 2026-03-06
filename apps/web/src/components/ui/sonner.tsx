import { cn } from "@/lib/utils";
import { Check, CircleAlert, Info, Loader2, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/* ─── Motion-animated icon badges ─── */

const ICON_STYLES = {
	success:
		"bg-[#2d6a4f]/[0.07] text-[#2d6a4f] dark:bg-[#52b788]/[0.08] dark:text-[#52b788]",
	error: "bg-accent-red/10 text-accent-red",
	warning:
		"bg-[#b8860b]/[0.07] text-[#b8860b] dark:bg-[#daa520]/[0.09] dark:text-[#daa520]",
	info: "bg-muted-foreground/10 text-muted-foreground",
	loading: "text-muted-foreground",
} as const;

const ICON_MAP = {
	success: <Check strokeWidth={2.5} className="size-3.5" />,
	error: <CircleAlert strokeWidth={2} className="size-3.5" />,
	warning: <TriangleAlert strokeWidth={2} className="size-3.5" />,
	info: <Info strokeWidth={2} className="size-3.5" />,
	loading: <Loader2 strokeWidth={2} className="size-3.5 animate-spin" />,
} as const;

function AnimatedIcon({ variant }: { variant: keyof typeof ICON_MAP }) {
	return (
		<motion.span
			className={cn(
				"flex items-center justify-center size-[22px] rounded-full shrink-0 -mt-px",
				ICON_STYLES[variant],
			)}
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{
				type: "spring",
				stiffness: 500,
				damping: 25,
				delay: 0.1,
			}}
		>
			{ICON_MAP[variant]}
		</motion.span>
	);
}

/* ─── Toaster ─── */

function Toaster(props: ToasterProps) {
	return (
		<Sonner
			className="toaster group"
			position="bottom-right"
			gap={8}
			icons={{
				success: <AnimatedIcon variant="success" />,
				error: <AnimatedIcon variant="error" />,
				warning: <AnimatedIcon variant="warning" />,
				info: <AnimatedIcon variant="info" />,
				loading: <AnimatedIcon variant="loading" />,
			}}
			toastOptions={{
				unstyled: true,
				classNames: {
					toast: "toast-editorial",
					title: "toast-title",
					description: "toast-description",
					actionButton: "toast-action",
					cancelButton: "toast-cancel",
					closeButton: "toast-close",
					success: "toast-success",
					error: "toast-error",
					warning: "toast-warning",
					info: "toast-info",
					loading: "toast-loading",
				},
			}}
			closeButton
			{...props}
		/>
	);
}

export { Toaster };
