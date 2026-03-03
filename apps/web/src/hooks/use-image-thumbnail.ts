import { env } from "@/env";
import { useEffect, useRef, useState } from "react";

export function useImageThumbnail(attachment: {
	id: string;
	mimeType: string;
}) {
	const [thumbUrl, setThumbUrl] = useState<string | null>(null);
	const urlRef = useRef<string | null>(null);

	useEffect(() => {
		if (!attachment.mimeType.startsWith("image/")) return;

		let cancelled = false;
		const url = `${env.VITE_API_URL}/mail/attachments/${attachment.id}/download`;

		fetch(url, { credentials: "include" })
			.then((res) => {
				if (!res.ok || cancelled) return null;
				return res.blob();
			})
			.then((blob) => {
				if (!blob || cancelled) return;
				const objectUrl = URL.createObjectURL(blob);
				urlRef.current = objectUrl;
				setThumbUrl(objectUrl);
			})
			.catch(() => {});

		return () => {
			cancelled = true;
			if (urlRef.current) {
				URL.revokeObjectURL(urlRef.current);
				urlRef.current = null;
			}
		};
	}, [attachment.id, attachment.mimeType]);

	return thumbUrl;
}
