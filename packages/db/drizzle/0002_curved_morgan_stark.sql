CREATE TYPE "public"."auto_handle_action" AS ENUM('archived', 'labeled', 'forwarded', 'auto-replied', 'filtered');--> statement-breakpoint
CREATE TYPE "public"."email_category" AS ENUM('urgent', 'actionable', 'informational', 'newsletter', 'receipt', 'confirmation', 'promotional', 'spam', 'uncategorized');--> statement-breakpoint
CREATE TYPE "public"."email_provider" AS ENUM('gmail', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('pending', 'syncing', 'synced', 'error');--> statement-breakpoint
CREATE TYPE "public"."triage_status" AS ENUM('pending', 'acted', 'dismissed', 'snoozed');--> statement-breakpoint
CREATE TABLE "email_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "email_provider" NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"sync_status" "sync_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_cursor" text,
	"sync_error" text,
	"webhook_channel_id" varchar(255),
	"webhook_expiry" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"provider_message_id" varchar(255) NOT NULL,
	"provider_thread_id" varchar(255),
	"subject" text,
	"from_address" varchar(255),
	"from_name" varchar(255),
	"to_addresses" text[],
	"cc_addresses" text[],
	"snippet" text,
	"received_at" timestamp with time zone NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_starred" boolean DEFAULT false NOT NULL,
	"has_attachments" boolean DEFAULT false NOT NULL,
	"labels" text[],
	"category" "email_category" DEFAULT 'uncategorized' NOT NULL,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"ai_summary" text,
	"body_plain" text,
	"body_html" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_auto_handled" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_id" uuid,
	"text" text NOT NULL,
	"linked_module" varchar(20),
	"action_type" "auto_handle_action" NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_triage_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"email_id" uuid,
	"title" text NOT NULL,
	"subtitle" text,
	"urgent" boolean DEFAULT false NOT NULL,
	"source_module" varchar(20),
	"actions" jsonb,
	"status" "triage_status" DEFAULT 'pending' NOT NULL,
	"draft_response" text,
	"snoozed_until" timestamp with time zone,
	"acted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_accounts" ADD CONSTRAINT "email_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_email_account_id_email_accounts_id_fk" FOREIGN KEY ("email_account_id") REFERENCES "public"."email_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_auto_handled" ADD CONSTRAINT "mail_auto_handled_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_auto_handled" ADD CONSTRAINT "mail_auto_handled_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_triage_items" ADD CONSTRAINT "mail_triage_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_triage_items" ADD CONSTRAINT "mail_triage_items_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_accounts_user_id_idx" ON "email_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "emails_user_received_at_idx" ON "emails" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "emails_account_provider_msg_idx" ON "emails" USING btree ("email_account_id","provider_message_id");--> statement-breakpoint
CREATE INDEX "emails_user_category_idx" ON "emails" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "emails_user_priority_idx" ON "emails" USING btree ("user_id","priority_score");--> statement-breakpoint
CREATE INDEX "auto_handled_user_created_idx" ON "mail_auto_handled" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "triage_user_status_idx" ON "mail_triage_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "triage_user_created_idx" ON "mail_triage_items" USING btree ("user_id","created_at");