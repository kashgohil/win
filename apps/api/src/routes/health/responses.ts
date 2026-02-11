import { t } from "elysia";

export const healthResponse = t.Object({
	health: t.String(),
});
