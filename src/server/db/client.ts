import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "node:path";
import * as schema from "./schema";

export function createDatabase(url: string, authToken?: string) {
  const client = createClient({ url, authToken: authToken || undefined });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

export async function migrateDatabase(db: Database) {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
}
