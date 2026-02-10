import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const waitlist = pgTable("waitlist", {
	id: uuid().primaryKey().defaultRandom(),
	email: varchar({ length: 255 }).notNull().unique(),
	source: varchar({ length: 50 }).default("website").notNull(),
	referrer: text(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});
