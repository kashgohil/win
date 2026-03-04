export { getProvider } from "./src/factory";
export { GmailProvider } from "./src/gmail";
export { OutlookProvider } from "./src/outlook";
export { getValidAccessToken } from "./src/token-manager";
export type {
	EmailProvider,
	RefreshResult,
	SendParams,
	SyncedAttachment,
	SyncedEmail,
	SyncResult,
	TokenResult,
} from "./src/types";
