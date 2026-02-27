CREATE TABLE "mail_sender_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sender_address" varchar(255) NOT NULL,
	"category" "email_category" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mail_sender_rules" ADD CONSTRAINT "mail_sender_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "mail_sender_rules_user_sender_idx" ON "mail_sender_rules" USING btree ("user_id","sender_address");--> statement-breakpoint
CREATE INDEX "mail_sender_rules_user_id_idx" ON "mail_sender_rules" USING btree ("user_id");