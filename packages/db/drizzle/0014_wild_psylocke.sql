ALTER TABLE "emails" ADD COLUMN "related_task_id" uuid;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "related_task_reason" text;