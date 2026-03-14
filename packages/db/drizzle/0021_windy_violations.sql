ALTER TABLE "emails" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "emails_user_archived_idx" ON "emails" USING btree ("user_id","is_archived");