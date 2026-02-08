import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Linkedin,
	Mail,
	MapPin,
	Send,
	Twitter,
} from "lucide-react";
import { useState } from "react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/contact")({
	component: ContactPage,
	head: () =>
		seo({
			title: "Contact — Wingmnn",
			description:
				"Get in touch with the Wingmnn team. Questions, partnerships, press inquiries — we'd love to hear from you.",
			path: "/contact",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "ContactPage",
					name: "Contact Wingmnn",
					url: "https://wingmnn.com/contact",
					description:
						"Get in touch with the Wingmnn team. Questions, partnerships, press inquiries — we'd love to hear from you.",
				},
			],
		}),
});

/* ─── component ─── */

function ContactPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [subject, setSubject] = useState("General");
	const [message, setMessage] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setSubmitted(true);
	};

	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Contact
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Get in touch.
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Questions, partnerships, press inquiries, or just want to say
						hello — we'd love to hear from you. Fill out the form below
						and we'll get back to you as soon as we can.
					</p>
				</div>
			</section>

			{/* ── Form + Sidebar ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto grid grid-cols-[1fr_360px] max-md:grid-cols-1 gap-[60px] max-md:gap-12">
					{/* ── Contact form ── */}
					<div>
						{submitted ? (
							<div className="py-12 text-center">
								<div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/10 mb-6">
									<Send size={24} className="text-green-500" />
								</div>
								<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-4">
									Message sent.
								</h2>
								<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[480px] mx-auto">
									Thanks for reaching out. We'll get back to you within
									one business day.
								</p>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="flex flex-col gap-6">
								<div>
									<label
										htmlFor="contact-name"
										className="font-mono text-[11px] text-grey-2 tracking-[0.04em] mb-2 block"
									>
										Name
									</label>
									<input
										id="contact-name"
										type="text"
										required
										placeholder="Your name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										className="w-full font-serif text-[0.95rem] h-12 px-4 border border-grey-4 rounded-md bg-cream text-ink outline-none transition-colors duration-150 placeholder:text-grey-3 focus:border-accent-red"
									/>
								</div>

								<div>
									<label
										htmlFor="contact-email"
										className="font-mono text-[11px] text-grey-2 tracking-[0.04em] mb-2 block"
									>
										Email
									</label>
									<input
										id="contact-email"
										type="email"
										required
										placeholder="you@email.com"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="w-full font-serif text-[0.95rem] h-12 px-4 border border-grey-4 rounded-md bg-cream text-ink outline-none transition-colors duration-150 placeholder:text-grey-3 focus:border-accent-red"
									/>
								</div>

								<div>
									<label
										htmlFor="contact-subject"
										className="font-mono text-[11px] text-grey-2 tracking-[0.04em] mb-2 block"
									>
										Subject
									</label>
									<select
										id="contact-subject"
										value={subject}
										onChange={(e) => setSubject(e.target.value)}
										className="w-full font-serif text-[0.95rem] h-12 px-4 border border-grey-4 rounded-md bg-cream text-ink outline-none transition-colors duration-150 focus:border-accent-red appearance-none cursor-pointer"
									>
										<option value="General">General</option>
										<option value="Support">Support</option>
										<option value="Partnership">Partnership</option>
										<option value="Press">Press</option>
									</select>
								</div>

								<div>
									<label
										htmlFor="contact-message"
										className="font-mono text-[11px] text-grey-2 tracking-[0.04em] mb-2 block"
									>
										Message
									</label>
									<textarea
										id="contact-message"
										required
										placeholder="Tell us what's on your mind..."
										rows={6}
										value={message}
										onChange={(e) => setMessage(e.target.value)}
										className="w-full font-serif text-[0.95rem] px-4 py-3 border border-grey-4 rounded-md bg-cream text-ink outline-none transition-colors duration-150 placeholder:text-grey-3 focus:border-accent-red resize-y"
									/>
								</div>

								<button
									type="submit"
									className="inline-flex items-center justify-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark cursor-pointer self-start"
								>
									Send message <Send size={16} />
								</button>
							</form>
						)}
					</div>

					{/* ── Sidebar ── */}
					<div className="flex flex-col gap-px bg-grey-4 border border-grey-4 self-start">
						<div className="bg-cream p-8">
							<div className="flex items-center gap-3 mb-3">
								<Mail size={18} className="text-accent-red shrink-0" />
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink">
									Email
								</h3>
							</div>
							<a
								href="mailto:hello@wingmnn.com"
								className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 hover:text-accent-red transition-colors duration-150 no-underline"
							>
								hello@wingmnn.com
							</a>
						</div>

						<div className="bg-cream p-8">
							<div className="flex items-center gap-3 mb-3">
								<MapPin size={18} className="text-accent-red shrink-0" />
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink">
									Location
								</h3>
							</div>
							<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2">
								Brooklyn, NY
							</p>
						</div>

						<div className="bg-cream p-8">
							<div className="flex items-center gap-3 mb-4">
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink">
									Social
								</h3>
							</div>
							<div className="flex flex-col gap-3">
								<a
									href="#"
									className="inline-flex items-center gap-2.5 font-serif text-[0.92rem] text-grey-2 hover:text-accent-red transition-colors duration-150 no-underline"
								>
									<Twitter size={16} className="shrink-0" />
									Twitter
								</a>
								<a
									href="#"
									className="inline-flex items-center gap-2.5 font-serif text-[0.92rem] text-grey-2 hover:text-accent-red transition-colors duration-150 no-underline"
								>
									<Linkedin size={16} className="shrink-0" />
									LinkedIn
								</a>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── CTA ── */}
			<section className="py-[120px] px-(--page-px) bg-ink">
				<div className="max-w-[620px] mx-auto text-center">
					<h2 className="font-serif font-bold text-[clamp(2rem,4vw,3rem)] leading-[1.2] text-cream mb-4">
						Join the waitlist.
					</h2>
					<p className="font-serif text-base leading-[1.7] text-cream/50 mb-9">
						Early access is rolling out now. We'll let you know when it's
						your turn.
					</p>
					<Link
						to="/"
						hash="join"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Get early access <ArrowRight size={16} />
					</Link>
				</div>
			</section>
		</main>
	);
}
