CREATE TYPE "public"."task_automation_action" AS ENUM('notify', 'set_status', 'set_priority', 'move_project');--> statement-breakpoint
CREATE TYPE "public"."task_automation_trigger" AS ENUM('status_changed', 'task_created', 'task_overdue', 'priority_changed');--> statement-breakpoint
CREATE TABLE "task_automation_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"trigger" "task_automation_trigger" NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"action" "task_automation_action" NOT NULL,
	"action_params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_automation_rules" ADD CONSTRAINT "task_automation_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_automation_rules_user_idx" ON "task_automation_rules" USING btree ("user_id");