import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Image } from "lucide-react";

import { seo } from "@/lib/seo";

export const Route = createFileRoute("/blog")({
	component: BlogPage,
	head: () =>
		seo({
			title: "Blog — Wingmnn",
			description:
				"Thinking out loud about AI, productivity, and the future of personal software.",
			path: "/blog",
			jsonLd: [
				{
					"@context": "https://schema.org",
					"@type": "Blog",
					name: "Wingmnn Blog",
					url: "https://wingmnn.com/blog",
					description:
						"Thinking out loud about AI, productivity, and the future of personal software.",
					publisher: {
						"@type": "Organization",
						name: "Wingmnn Systems Inc.",
					},
				},
			],
		}),
});

/* ─── data ─── */

const featuredPost = {
	category: "Product",
	title: "Introducing Wingmnn: Why we built your partner-in-crime",
	excerpt:
		"Most productivity tools solve one problem. We wanted to solve the meta-problem — the cognitive overhead of stitching ten apps together every single day. Here's why we started building Wingmnn, and what we believe a partner-in-crime should actually do.",
	date: "Jan 15, 2026",
	readTime: "8 min read",
};

const posts = [
	{
		category: "Engineering",
		title: "The end of app-switching",
		excerpt:
			"Context-switching between tools costs more than you think. We measured it, and the numbers changed how we build.",
		date: "Jan 8, 2026",
		readTime: "5 min read",
	},
	{
		category: "Product",
		title: "What cross-domain intelligence actually means",
		excerpt:
			"When your calendar knows about your finances and your inbox knows about your deadlines, something fundamentally shifts.",
		date: "Dec 28, 2025",
		readTime: "6 min read",
	},
	{
		category: "Security",
		title: "Privacy-first AI: Our architecture explained",
		excerpt:
			"A deep dive into how we built an AI system that never trains on your data, never sells it, and lets you delete everything in one click.",
		date: "Dec 15, 2025",
		readTime: "10 min read",
	},
];

/* ─── component ─── */

function BlogPage() {
	return (
		<main>
			{/* ── Header ── */}
			<section className="pt-[140px] pb-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[800px] mx-auto text-center">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Blog
					</p>
					<h1 className="font-serif font-bold text-[clamp(2rem,4vw,3.2rem)] leading-[1.15] text-ink mb-6">
						Blog
					</h1>
					<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 max-w-[600px] mx-auto">
						Thinking out loud about AI, productivity, and the future of
						personal software.
					</p>
				</div>
			</section>

			{/* ── Featured post ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Featured
					</p>
					<div className="grid grid-cols-2 max-md:grid-cols-1 gap-10 items-center">
						<div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-grey-4 bg-[#f5f3ee] h-[360px]">
							<Image
								size={28}
								strokeWidth={1.2}
								className="text-grey-3/50"
							/>
							<span className="font-mono text-[11px] tracking-[0.02em] text-grey-3">
								Featured post image
							</span>
						</div>
						<div>
							<span className="font-mono text-[10px] font-semibold tracking-[0.06em] uppercase bg-accent-red/10 text-accent-red py-1 px-2.5 rounded-sm">
								{featuredPost.category}
							</span>
							<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mt-4 mb-4">
								{featuredPost.title}
							</h2>
							<p className="font-serif text-[1.05rem] leading-[1.8] text-grey-2 mb-6">
								{featuredPost.excerpt}
							</p>
							<div className="flex items-center gap-4 font-mono text-[11px] text-grey-3 tracking-[0.02em]">
								<span>{featuredPost.date}</span>
								<span className="w-1 h-1 rounded-full bg-grey-4" />
								<span className="flex items-center gap-1.5">
									<Clock size={12} strokeWidth={1.5} />
									{featuredPost.readTime}
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ── Post grid ── */}
			<section className="py-[100px] px-(--page-px) border-b border-grey-4">
				<div className="max-w-[1200px] mx-auto">
					<p className="font-mono text-[11px] text-accent-red tracking-[0.04em] mb-3">
						Latest
					</p>
					<h2 className="font-serif font-bold text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.2] text-ink mb-12">
						Recent posts.
					</h2>
					<div className="grid grid-cols-3 max-md:grid-cols-1 gap-px bg-grey-4 border border-grey-4">
						{posts.map((post) => (
							<article key={post.title} className="bg-cream p-8">
								<div className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-grey-4 bg-[#f5f3ee] h-[200px] mb-6">
									<Image
										size={28}
										strokeWidth={1.2}
										className="text-grey-3/50"
									/>
									<span className="font-mono text-[11px] tracking-[0.02em] text-grey-3">
										Placeholder
									</span>
								</div>
								<span className="font-mono text-[10px] font-semibold tracking-[0.06em] uppercase bg-accent-red/10 text-accent-red py-1 px-2.5 rounded-sm">
									{post.category}
								</span>
								<h3 className="font-serif font-semibold text-[1.1rem] text-ink mt-3 mb-2">
									{post.title}
								</h3>
								<p className="font-serif text-[0.92rem] leading-[1.75] text-grey-2 mb-5">
									{post.excerpt}
								</p>
								<div className="flex items-center gap-4 font-mono text-[11px] text-grey-3 tracking-[0.02em]">
									<span>{post.date}</span>
									<span className="w-1 h-1 rounded-full bg-grey-4" />
									<span className="flex items-center gap-1.5">
										<Clock size={12} strokeWidth={1.5} />
										{post.readTime}
									</span>
								</div>
							</article>
						))}
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
						to="/early-access"
						className="inline-flex items-center gap-2.5 font-mono font-semibold text-sm text-white py-3.5 px-7 rounded-md transition-colors duration-200 bg-accent-red hover:bg-red-dark no-underline"
					>
						Get early access <ArrowRight size={16} />
					</Link>
				</div>
			</section>
		</main>
	);
}
