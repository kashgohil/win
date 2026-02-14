import { createMailAiWorker } from "./mail-ai.worker";
import { createMailAutoHandleWorker } from "./mail-autohandle.worker";
import { createMailSyncWorker } from "./mail-sync.worker";

console.log("[workers] Starting mail workers...");

const mailSyncWorker = createMailSyncWorker();
const mailAiWorker = createMailAiWorker();
const mailAutoHandleWorker = createMailAutoHandleWorker();

console.log("[workers] All workers started");

async function shutdown() {
	console.log("[workers] Shutting down gracefully...");
	await Promise.all([
		mailSyncWorker.close(),
		mailAiWorker.close(),
		mailAutoHandleWorker.close(),
	]);
	console.log("[workers] All workers stopped");
	process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
