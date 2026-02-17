import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { HERO_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import GoogleOAuthButton from "./GoogleOAuthButton";

const errorClass = "font-mono text-[10px] text-accent-red mt-1.5";

type Tab = "signin" | "signup";

export default function AuthForm({ tab }: { tab: Tab }) {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [serverError, setServerError] = useState("");

	const signinRef = useRef<HTMLButtonElement>(null);
	const signupRef = useRef<HTMLButtonElement>(null);
	const [indicator, setIndicator] = useState({ left: 0, width: 0 });
	const mounted = useRef(false);

	const form = useForm({
		defaultValues: { name: "", email: "", password: "" },
		onSubmit: async ({ value }) => {
			setServerError("");

			try {
				if (tab === "signup") {
					const { error } = await authClient.signUp.email({
						name: value.name.trim(),
						email: value.email.trim(),
						password: value.password,
					});
					if (error) {
						setServerError(
							error.message ?? "Sign up failed. Please try again.",
						);
						return;
					}
					navigate({ to: "/onboarding", replace: true });
				} else {
					const { error } = await authClient.signIn.email({
						email: value.email.trim(),
						password: value.password,
					});
					if (error) {
						setServerError(
							error.message ?? "Sign in failed. Please try again.",
						);
						return;
					}
					navigate({ to: "/", replace: true });
				}
			} catch {
				setServerError("Something went wrong. Please try again.");
			}
		},
	});

	useEffect(() => {
		const el = tab === "signin" ? signinRef.current : signupRef.current;
		if (el) {
			setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
		}
		if (mounted.current) {
			setServerError("");
		}
		mounted.current = true;
	}, [tab]);

	function switchTab(next: Tab) {
		navigate({ to: "/auth", search: { tab: next }, replace: true });
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
			className="auth-light flex min-h-dvh flex-1 flex-col items-center justify-center bg-cream px-6 py-12"
		>
			{/* Mobile logo — hidden on desktop since brand panel shows */}
			<div className="mb-10 flex items-center gap-2 lg:hidden">
				<Logo className="size-5 text-ink" />
				<span className="font-display text-[1.3rem] text-ink tracking-[0.03em] lowercase">
					wingmnn
				</span>
			</div>

			<div className="w-full max-w-[400px]">
				{/* Tab toggle */}
				<div className="relative mb-8 flex border-b border-grey-4">
					<button
						ref={signinRef}
						type="button"
						onClick={() => switchTab("signin")}
						className={cn(
							"cursor-pointer bg-transparent px-1 pb-3 font-mono text-[13px] font-medium transition-colors duration-200",
							tab === "signin" ? "text-ink" : "text-grey-3 hover:text-grey-1",
						)}
					>
						Sign in
					</button>
					<button
						ref={signupRef}
						type="button"
						onClick={() => switchTab("signup")}
						className={cn(
							"cursor-pointer bg-transparent px-1 pb-3 font-mono text-[13px] font-medium transition-colors duration-200 ml-6",
							tab === "signup" ? "text-ink" : "text-grey-3 hover:text-grey-1",
						)}
					>
						Create account
					</button>

					{/* Sliding indicator */}
					<motion.div
						className="absolute -bottom-px h-[2px] bg-ink"
						animate={{ left: indicator.left, width: indicator.width }}
						transition={{ type: "spring", stiffness: 400, damping: 30 }}
					/>
				</div>

				{/* Server error */}
				{serverError && (
					<div className="mb-5 rounded-md border border-accent-red/20 bg-accent-red/5 px-4 py-3 font-mono text-[11px] text-accent-red">
						{serverError}
					</div>
				)}

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					{/* Name — signup only, animated in/out */}
					<AnimatePresence initial={false}>
						{tab === "signup" && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: "auto", opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
								style={{ overflow: "hidden" }}
							>
								<div className="pb-5">
									<form.Field
										name="name"
										validators={{
											onSubmit: ({ value }) =>
												!value.trim() ? "Name is required" : undefined,
										}}
									>
										{(field) => (
											<>
												<Label>Name</Label>
												<Input
													type="text"
													name={field.name}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder="Your name"
													autoComplete="name"
													className="mt-2"
												/>
												{field.state.meta.errors.length > 0 && (
													<p className={errorClass}>
														{field.state.meta.errors[0]}
													</p>
												)}
											</>
										)}
									</form.Field>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					<div className="flex flex-col gap-5">
						{/* Email */}
						<form.Field
							name="email"
							validators={{
								onSubmit: ({ value }) => {
									if (
										!value.trim() ||
										!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
									)
										return "Valid email is required";
									return undefined;
								},
							}}
						>
							{(field) => (
								<div>
									<Label>Email</Label>
									<Input
										type="email"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="you@example.com"
										autoComplete="email"
										className="mt-2"
									/>
									{field.state.meta.errors.length > 0 && (
										<p className={errorClass}>{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Password */}
						<form.Field
							name="password"
							validators={{
								onSubmit: ({ value }) =>
									value.length < 8
										? "Password must be at least 8 characters"
										: undefined,
							}}
						>
							{(field) => (
								<div>
									<Label>Password</Label>
									<div className="relative mt-2">
										<Input
											type={showPassword ? "text" : "password"}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											placeholder="Min. 8 characters"
											autoComplete={
												tab === "signup" ? "new-password" : "current-password"
											}
											className="pr-12"
										/>
										<button
											type="button"
											onClick={() => setShowPassword((v) => !v)}
											className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent p-0 text-grey-3 hover:text-grey-1 transition-colors"
											tabIndex={-1}
										>
											{showPassword ? (
												<EyeOff className="size-4" />
											) : (
												<Eye className="size-4" />
											)}
										</button>
									</div>
									{field.state.meta.errors.length > 0 && (
										<p className={errorClass}>{field.state.meta.errors[0]}</p>
									)}
								</div>
							)}
						</form.Field>

						{/* Submit */}
						<form.Subscribe selector={(s) => s.isSubmitting}>
							{(isSubmitting) => (
								<Button
									type="submit"
									variant="auth"
									size="auth"
									disabled={isSubmitting}
									className="mt-1 cursor-pointer"
								>
									{isSubmitting
										? "Please wait..."
										: tab === "signup"
											? "Create account"
											: "Sign in"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>

				{/* Divider */}
				<div className="my-6 flex items-center gap-4">
					<Separator className="flex-1" />
					<span className="font-mono text-[11px] text-grey-3">or</span>
					<Separator className="flex-1" />
				</div>

				{/* Google OAuth */}
				<GoogleOAuthButton mode={tab} />

				{/* Footer link */}
				<p className="mt-8 text-center font-mono text-[11px] text-grey-3">
					<a
						href={HERO_URL}
						className="underline decoration-grey-4 underline-offset-2 hover:text-grey-1 transition-colors"
					>
						Learn more about Wingmnn
					</a>
				</p>
			</div>
		</motion.div>
	);
}
