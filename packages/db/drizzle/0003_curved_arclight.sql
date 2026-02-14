DROP INDEX "emails_account_provider_msg_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "email_accounts_user_provider_email_idx" ON "email_accounts" USING btree ("user_id","provider","email");--> statement-breakpoint
CREATE UNIQUE INDEX "emails_account_provider_msg_idx" ON "emails" USING btree ("email_account_id","provider_message_id");