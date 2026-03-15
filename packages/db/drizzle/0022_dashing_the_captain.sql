CREATE TYPE "public"."fin_recurrence_interval" AS ENUM('weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."fin_transaction_source" AS ENUM('email', 'manual');--> statement-breakpoint
CREATE TYPE "public"."fin_transaction_type" AS ENUM('expense', 'income');--> statement-breakpoint
CREATE TABLE "fin_recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"merchant" varchar(255) NOT NULL,
	"expected_amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"interval" "fin_recurrence_interval" NOT NULL,
	"category" varchar(100),
	"last_charge_at" timestamp with time zone,
	"next_expected_at" timestamp with time zone,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fin_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" "fin_transaction_type" NOT NULL,
	"source" "fin_transaction_source" DEFAULT 'email' NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"merchant" varchar(255),
	"description" text,
	"category" varchar(100),
	"transacted_at" timestamp with time zone NOT NULL,
	"source_email_id" uuid,
	"recurring_group_id" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fin_recurring_expenses" ADD CONSTRAINT "fin_recurring_expenses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_source_email_id_emails_id_fk" FOREIGN KEY ("source_email_id") REFERENCES "public"."emails"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fin_transactions" ADD CONSTRAINT "fin_transactions_recurring_group_id_fin_recurring_expenses_id_fk" FOREIGN KEY ("recurring_group_id") REFERENCES "public"."fin_recurring_expenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fin_recurring_user_active_idx" ON "fin_recurring_expenses" USING btree ("user_id","active");--> statement-breakpoint
CREATE INDEX "fin_recurring_user_merchant_idx" ON "fin_recurring_expenses" USING btree ("user_id","merchant");--> statement-breakpoint
CREATE INDEX "fin_txn_user_transacted_idx" ON "fin_transactions" USING btree ("user_id","transacted_at");--> statement-breakpoint
CREATE INDEX "fin_txn_user_category_idx" ON "fin_transactions" USING btree ("user_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "fin_txn_user_source_email_idx" ON "fin_transactions" USING btree ("user_id","source_email_id");