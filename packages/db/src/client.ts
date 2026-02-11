import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import * as schema from "./schema/index.ts";

import { env } from "./env";

const client = new SQL(env.DATABASE_URL);

export const db = drizzle({ client, schema });

export type Database = typeof db;
