import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createDatabase, migrateDatabase } from "@/server/db/client";

export async function createTestDatabase() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "human-ai-test-"));
  const db = createDatabase(`file:${path.join(dir, "test.db")}`);
  await migrateDatabase(db);
  return { db, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
