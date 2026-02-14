export { getProvider } from "./src/factory";
export { GmailProvider } from "./src/gmail";
export { getValidAccessToken } from "./src/token-manager";
export type {
	EmailProvider,
	RefreshResult,
	SendParams,
	SyncedEmail,
	SyncResult,
	TokenResult,
} from "./src/types";
