CREATE TYPE "public"."contact_follow_up_status" AS ENUM('pending', 'completed', 'dismissed', 'snoozed');--> statement-breakpoint
CREATE TYPE "public"."contact_follow_up_type" AS ENUM('commitment', 'cadence_nudge', 'meeting_prep');--> statement-breakpoint
CREATE TYPE "public"."contact_interaction_type" AS ENUM('email_sent', 'email_received', 'meeting', 'task_assigned', 'task_completed');--> statement-breakpoint
CREATE TYPE "public"."contact_source" AS ENUM('discovered', 'manual', 'imported');--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'contact_follow_up';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'contact_meeting_prep';--> statement-breakpoint
CREATE TABLE "contact_follow_ups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "contact_follow_up_type" NOT NULL,
	"title" varchar(500) NOT NULL,
	"context" text,
	"source_email_id" uuid,
	"source_event_id" uuid,
	"due_at" timestamp with time zone,
	"status" "contact_follow_up_status" DEFAULT 'pending' NOT NULL,
	"snoozed_until" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"contact_id" uuid NOT NULL,
	"type" "contact_interaction_type" NOT NULL,
	"reference_id" text,
	"title" varchar(500) NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_tag_assignments" (
	"contact_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "contact_tag_assignments_contact_id_tag_id_pk" PRIMARY KEY("contact_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "contact_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"primary_email" varchar(255) NOT NULL,
	"additional_emails" text[] DEFAULT '{}' NOT NULL,
	"name" varchar(255),
	"company" varchar(255),
	"job_title" varchar(255),
	"phone" varchar(50),
	"avatar_url" text,
	"notes" text,
	"starred" boolean DEFAULT false NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"source" "contact_source" DEFAULT 'discovered' NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"relationship_score" integer DEFAULT 0 NOT NULL,
	"avg_interaction_gap_days" integer,
	"avg_response_time_mins" integer,
	"avg_your_response_time_mins" integer,
	"introduced_by" uuid,
	"introduced_at" timestamp with time zone,
	"last_score_computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_follow_ups" ADD CONSTRAINT "contact_follow_ups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_follow_ups" ADD CONSTRAINT "contact_follow_ups_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_follow_ups" ADD CONSTRAINT "contact_follow_ups_source_email_id_emails_id_fk" FOREIGN KEY ("source_email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_follow_ups" ADD CONSTRAINT "contact_follow_ups_source_event_id_calendar_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."calendar_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_interactions" ADD CONSTRAINT "contact_interactions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag_assignments" ADD CONSTRAINT "contact_tag_assignments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tag_assignments" ADD CONSTRAINT "contact_tag_assignments_tag_id_contact_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."contact_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_tags" ADD CONSTRAINT "contact_tags_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_follow_ups_user_status_due_idx" ON "contact_follow_ups" USING btree ("user_id","status","due_at");--> statement-breakpoint
CREATE INDEX "contact_follow_ups_contact_idx" ON "contact_follow_ups" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "contact_interactions_contact_occurred_idx" ON "contact_interactions" USING btree ("contact_id","occurred_at");--> statement-breakpoint
CREATE INDEX "contact_interactions_user_idx" ON "contact_interactions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_interactions_reference_idx" ON "contact_interactions" USING btree ("contact_id","type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contact_tags_user_name_idx" ON "contact_tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_user_email_idx" ON "contacts" USING btree ("user_id","primary_email");--> statement-breakpoint
CREATE INDEX "contacts_user_name_idx" ON "contacts" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "contacts_user_last_interaction_idx" ON "contacts" USING btree ("user_id","last_interaction_at");--> statement-breakpoint
CREATE INDEX "contacts_user_starred_idx" ON "contacts" USING btree ("user_id","starred");--> statement-breakpoint
CREATE INDEX "contacts_user_score_idx" ON "contacts" USING btree ("user_id","relationship_score");--> statement-breakpoint
CREATE INDEX "contacts_user_company_idx" ON "contacts" USING btree ("user_id","company");