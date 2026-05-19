import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema/users.js";

const sql = postgres(env.databaseUrl, {
  prepare: false
});

export const db = drizzle(sql, { schema });

export const checkDatabaseConnection = async (): Promise<void> => {
  await sql`select 1`;
};
