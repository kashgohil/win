ALTER TABLE "task_connections" ADD COLUMN "webhook_id" varchar(255);--> statement-breakpoint
ALTER TABLE "task_connections" ADD COLUMN "webhook_secret" text;