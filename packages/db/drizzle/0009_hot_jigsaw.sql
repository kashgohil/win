CREATE TYPE "public"."task_activity_action" AS ENUM('created', 'updated', 'deleted', 'synced', 'write_back', 'write_back_failed', 'conflict_detected', 'conflict_resolved');--> statement-breakpoint
CREATE TYPE "public"."task_connection_status" AS ENUM('active', 'disconnected', 'error');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('none', 'low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."task_provider" AS ENUM('linear', 'jira');--> statement-breakpoint
CREATE TYPE "public"."task_source" AS ENUM('native', 'external');--> statement-breakpoint
CREATE TYPE "public"."task_status_key" AS ENUM('todo', 'in_progress', 'done', 'blocked', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."task_write_back_state" AS ENUM('synced', 'pending', 'failed', 'conflict');--> statement-breakpoint
CREATE TABLE "task_activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"task_id" uuid,
	"connection_id" uuid,
	"action" "task_activity_action" NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"provider" "task_provider" NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"scopes" text,
	"external_workspace_id" varchar(255),
	"external_workspace_name" varchar(255),
	"status" "task_connection_status" DEFAULT 'active' NOT NULL,
	"read_write" boolean DEFAULT false NOT NULL,
	"last_sync_at" timestamp with time zone,
	"sync_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"connection_id" uuid,
	"name" varchar(255) NOT NULL,
	"description" text,
	"source" "task_source" DEFAULT 'native' NOT NULL,
	"external_id" varchar(255),
	"external_url" text,
	"color" varchar(20),
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid,
	"project_id" uuid,
	"name" varchar(255) NOT NULL,
	"status_key" "task_status_key" NOT NULL,
	"external_id" varchar(255),
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_sync_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"project_external_id" varchar(255),
	"cursor" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"project_id" uuid,
	"connection_id" uuid,
	"source" "task_source" DEFAULT 'native' NOT NULL,
	"external_id" varchar(255),
	"external_url" text,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status_key" "task_status_key" DEFAULT 'todo' NOT NULL,
	"priority" "task_priority" DEFAULT 'none' NOT NULL,
	"priority_score" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone,
	"assignee_user_id" text,
	"external_assignee_ref" varchar(255),
	"external_assignee_name" varchar(255),
	"source_email_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminder_at" timestamp with time zone,
	"snoozed_until" timestamp with time zone,
	"last_synced_at" timestamp with time zone,
	"sync_hash" varchar(64),
	"last_provider_updated_at" timestamp with time zone,
	"write_back_state" "task_write_back_state"
);
--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_connection_id_task_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."task_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_connections" ADD CONSTRAINT "task_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_items" ADD CONSTRAINT "task_items_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_projects" ADD CONSTRAINT "task_projects_connection_id_task_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."task_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_connection_id_task_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."task_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_statuses" ADD CONSTRAINT "task_statuses_project_id_task_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."task_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_sync_state" ADD CONSTRAINT "task_sync_state_connection_id_task_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."task_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_project_id_task_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."task_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_connection_id_task_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."task_connections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_source_email_id_emails_id_fk" FOREIGN KEY ("source_email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_activity_log_user_created_idx" ON "task_activity_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "task_activity_log_task_id_idx" ON "task_activity_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_connections_user_id_idx" ON "task_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_connections_user_provider_workspace_idx" ON "task_connections" USING btree ("user_id","provider","external_workspace_id");--> statement-breakpoint
CREATE INDEX "task_items_task_id_idx" ON "task_items" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_projects_user_id_idx" ON "task_projects" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_projects_connection_external_idx" ON "task_projects" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE INDEX "task_statuses_project_id_idx" ON "task_statuses" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_statuses_connection_external_idx" ON "task_statuses" USING btree ("connection_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_sync_state_connection_project_idx" ON "task_sync_state" USING btree ("connection_id","project_external_id");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status_key");--> statement-breakpoint
CREATE INDEX "tasks_user_project_idx" ON "tasks" USING btree ("user_id","project_id");--> statement-breakpoint
CREATE INDEX "tasks_user_due_at_idx" ON "tasks" USING btree ("user_id","due_at");--> statement-breakpoint
CREATE INDEX "tasks_user_priority_idx" ON "tasks" USING btree ("user_id","priority_score");--> statement-breakpoint
CREATE INDEX "tasks_user_created_at_idx" ON "tasks" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_connection_external_idx" ON "tasks" USING btree ("connection_id","external_id");