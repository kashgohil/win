ALTER TABLE "emails" ADD COLUMN "unsubscribe_url" text;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "emails" ADD COLUMN "follow_up_dismissed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD COLUMN "muted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD COLUMN "vip" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD COLUMN "unsubscribed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "emails_follow_up_idx" ON "emails" USING btree ("user_id","follow_up_at");