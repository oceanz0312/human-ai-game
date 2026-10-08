import { createDatabase, migrateDatabase } from "../src/server/db/client";

const url = process.env.DATABASE_URL ?? "file:./local.db";
const db = createDatabase(url, process.env.DATABASE_AUTH_TOKEN);
await migrateDatabase(db);
console.log(`Migrated ${url.startsWith("file:") ? url : "remote database"}`);
