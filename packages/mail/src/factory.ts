import { GmailProvider } from "./gmail";
import type { EmailProvider } from "./types";

const providers: Record<string, EmailProvider> = {
	gmail: new GmailProvider(),
};

export function getProvider(name: string): EmailProvider | null {
	return providers[name] ?? null;
}
