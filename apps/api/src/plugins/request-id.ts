import Elysia from "elysia";

import { randomUUID } from "crypto";

type Options = {
	name?: string;
	uuid?: () => string;
	header?: string;
};

export const requestID = ({
	name = "request-id",
	uuid = randomUUID,
	header = "X-Request-ID",
}: Readonly<Options> = {}) => {
	return new Elysia({ name, seed: header })
		.onRequest(({ set, request: { headers } }) => {
			set.headers[header] = headers.get(header) || uuid();
		})
		.derive(({ set }) => ({
			requestID: set.headers[header],
		}));
};
