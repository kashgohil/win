ALTER TABLE "mail_triage_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "mail_triage_items" CASCADE;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "triage_status" "triage_status";--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "triage_reason" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "draft_response" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "snoozed_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "triage_acted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "emails_user_triage_status_idx" ON "emails" USING btree ("user_id","triage_status");