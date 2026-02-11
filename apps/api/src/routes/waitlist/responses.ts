import { t } from "elysia";

export const waitlistSuccessResponse = t.Object({
	message: t.String(),
});

export const waitlistErrorResponse = t.Object({
	error: t.String(),
});
