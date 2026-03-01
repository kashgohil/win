import { useEffect, useRef } from "react";

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

	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		const doc = iframe.contentDocument;
		if (!doc) return;

		doc.open();
		doc.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
	html {
		color-scheme: light;
	}
	html, body {
		width: 100%;
		min-width: 100%;
		box-sizing: border-box;
		margin: 0;
		padding: 0;
		overflow: hidden;
	}
	body {
		background-color: #ffffff;
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
</html>`);
		doc.close();

		const syncHeight = () => {
			if (!doc.body) return;
			iframe.style.height = `${doc.body.scrollHeight}px`;
		};

		// Measure immediately after writing content
		syncHeight();

		// ResizeObserver catches async changes (images, fonts, CSS reflows)
		const observer = new ResizeObserver(syncHeight);
		observer.observe(doc.body);

		return () => {
			observer.disconnect();
		};
	}, [html]);

	return (
		<div className="min-w-0 w-full py-4 bg-white rounded-lg">
			<iframe
				ref={iframeRef}
				title="Email content"
				sandbox="allow-same-origin"
				className="w-full border-0"
				style={{ width: "100%" }}
			/>
		</div>
	);
}
