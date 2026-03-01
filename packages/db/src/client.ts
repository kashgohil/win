import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema";

import { env } from "./env";

const client = new SQL({
	url: env.DATABASE_URL,
	max: 20,
	idleTimeout: 30,
});

export const db = drizzle({ client, schema });

export type Database = typeof db;
