import { GmailProvider } from "./gmail";
import { OutlookProvider } from "./outlook";
import type { EmailProvider } from "./types";

const providers: Record<string, EmailProvider> = {
	gmail: new GmailProvider(),
	outlook: new OutlookProvider(),
};

export function getProvider(name: string): EmailProvider | null {
	return providers[name] ?? null;
}
