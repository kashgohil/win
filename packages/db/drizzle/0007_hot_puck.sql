ALTER TABLE "email_attachments" ALTER COLUMN "provider_attachment_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "thread_group_id" uuid;--> statement-breakpoint
CREATE INDEX "emails_user_thread_received_idx" ON "emails" USING btree ("user_id","provider_thread_id","received_at");--> statement-breakpoint
CREATE INDEX "emails_user_thread_group_idx" ON "emails" USING btree ("user_id","thread_group_id");