import { t } from "elysia";

export const userResponse = t.Object({
	id: t.String({ format: "uuid" }),
	email: t.String({ format: "email" }),
	name: t.Union([t.String(), t.Null()]),
	image: t.Optional(t.Union([t.String(), t.Null()])),
	emailVerified: t.Boolean(),
	createdAt: t.String({ format: "date-time" }),
	updatedAt: t.String({ format: "date-time" }),
});
