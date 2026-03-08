CREATE TYPE "public"."calendar_event_status" AS ENUM('confirmed', 'tentative', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."calendar_provider" AS ENUM('google', 'outlook');--> statement-breakpoint
CREATE TYPE "public"."calendar_sync_status" AS ENUM('pending', 'syncing', 'synced', 'error');--> statement-breakpoint
CREATE TABLE "calendar_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "calendar_provider" NOT NULL,
	"email" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"sync_status" "calendar_sync_status" DEFAULT 'pending' NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_token" text,
	"sync_error" text,
	"webhook_channel_id" varchar(255),
	"webhook_resource_id" varchar(255),
	"webhook_expiry" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendar_account_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"external_id" varchar(1024) NOT NULL,
	"title" text,
	"description" text,
	"location" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"status" "calendar_event_status" DEFAULT 'confirmed' NOT NULL,
	"organizer" jsonb,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"recurrence_rule" text,
	"recurring_event_id" varchar(1024),
	"html_link" text,
	"meeting_link" text,
	"reminders" jsonb,
	"source" varchar(20) DEFAULT 'external' NOT NULL,
	"synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_accounts" ADD CONSTRAINT "calendar_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_calendar_account_id_calendar_accounts_id_fk" FOREIGN KEY ("calendar_account_id") REFERENCES "public"."calendar_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_accounts_user_id_idx" ON "calendar_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_accounts_user_provider_email_idx" ON "calendar_accounts" USING btree ("user_id","provider","email");--> statement-breakpoint
CREATE INDEX "calendar_events_user_id_idx" ON "calendar_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "calendar_events_account_id_idx" ON "calendar_events" USING btree ("calendar_account_id");--> statement-breakpoint
CREATE INDEX "calendar_events_start_time_idx" ON "calendar_events" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE INDEX "calendar_events_end_time_idx" ON "calendar_events" USING btree ("user_id","end_time");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_events_account_external_idx" ON "calendar_events" USING btree ("calendar_account_id","external_id");