import { useCallback, useEffect, useRef } from "react";

export function EmailBody({
	html,
	plain,
}: {
	html: string | null;
	plain: string | null;
}) {
	if (html) {
		return <SandboxedHtml html={html} />;
	}

	if (plain) {
		return (
			<div className="font-body text-[14px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
				{plain}
			</div>
		);
	}

	return (
		<p className="font-serif text-[15px] text-grey-2 italic">
			No content available.
		</p>
	);
}

function SandboxedHtml({ html }: { html: string }) {
	const iframeRef = useRef<HTMLIFrameElement>(null);

	const updateHeight = useCallback(() => {
		const iframe = iframeRef.current;
		if (!iframe?.contentDocument?.body) return;
		const height = iframe.contentDocument.body.scrollHeight;
		iframe.style.height = `${height + 16}px`;
	}, []);

	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		const blob = new Blob(
			[
				`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
	body {
		margin: 0;
		padding: 0;
		font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
		font-size: 14px;
		line-height: 1.6;
		color: #1a1a1a;
		word-break: break-word;
		overflow-wrap: break-word;
	}
	img { max-width: 100%; height: auto; }
	a { color: inherit; }
	table { max-width: 100%; }
	pre { overflow-x: auto; }
</style>
</head>
<body>${html}</body>
</html>`,
			],
			{ type: "text/html" },
		);
		const url = URL.createObjectURL(blob);
		iframe.src = url;

		const handleLoad = () => {
			updateHeight();
			// Re-measure after images load
			const images = iframe.contentDocument?.querySelectorAll("img") ?? [];
			for (const img of images) {
				img.addEventListener("load", updateHeight);
			}
		};

		iframe.addEventListener("load", handleLoad);

		return () => {
			iframe.removeEventListener("load", handleLoad);
			URL.revokeObjectURL(url);
		};
	}, [html, updateHeight]);

	return (
		<iframe
			ref={iframeRef}
			title="Email content"
			sandbox="allow-same-origin"
			className="w-full border-0 min-h-[200px]"
		/>
	);
}
