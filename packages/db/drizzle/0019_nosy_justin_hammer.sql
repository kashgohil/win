CREATE TABLE "contact_merge_dismissals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"contact_id_a" uuid NOT NULL,
	"contact_id_b" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_merge_dismissals" ADD CONSTRAINT "contact_merge_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_merge_dismissals" ADD CONSTRAINT "contact_merge_dismissals_contact_id_a_contacts_id_fk" FOREIGN KEY ("contact_id_a") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_merge_dismissals" ADD CONSTRAINT "contact_merge_dismissals_contact_id_b_contacts_id_fk" FOREIGN KEY ("contact_id_b") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contact_merge_dismissals_pair_idx" ON "contact_merge_dismissals" USING btree ("user_id","contact_id_a","contact_id_b");