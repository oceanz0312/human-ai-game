import { drizzle } from "drizzle-orm/d1";
import type { Database } from "./client";
import * as schema from "./schema";

/**
 * The repositories only use the async SQLite query builder plus `batch`, which both the LibSQL and
 * D1 drivers implement identically, so the D1 instance is exposed under the shared type.
 */
export function createD1Database(binding: unknown): Database {
  return drizzle(binding as Parameters<typeof drizzle>[0], { schema }) as unknown as Database;
}
