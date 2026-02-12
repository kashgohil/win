import { relations } from "drizzle-orm";
import {
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { users } from "./auth";

export const userProfiles = pgTable("user_profiles", {
	id: uuid().primaryKey().defaultRandom(),
	userId: text("user_id")
		.notNull()
		.unique()
		.references(() => users.id, { onDelete: "cascade" }),
	timezone: varchar({ length: 100 }),
	role: varchar({ length: 20 }),
	enabledModules: text("enabled_modules").array(),
	aiProactivity: varchar("ai_proactivity", { length: 20 }),
	notificationStyle: varchar("notification_style", { length: 20 }),
	onboardingStep: integer("onboarding_step").default(1).notNull(),
	onboardingCompletedAt: timestamp("onboarding_completed_at", {
		withTimezone: true,
	}),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
});

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
	user: one(users, {
		fields: [userProfiles.userId],
		references: [users.id],
	}),
}));
