import { t } from "elysia";

const redisStatus = t.Object({
	status: t.Union([t.Literal("healthy"), t.Literal("unhealthy")]),
	latencyMs: t.Number(),
	error: t.Optional(t.String()),
});

export const healthResponse = t.Object({
	health: t.String(),
	redis: redisStatus,
});
