import "server-only";
import type { DatabaseSync } from "node:sqlite";
import { openDatabase } from "./db-core";

// One connection per server process; kept on globalThis so dev reloads reuse it.
const globalForDb = globalThis as typeof globalThis & { pabloDb?: DatabaseSync };

export function db(): DatabaseSync {
  globalForDb.pabloDb ??= openDatabase();
  return globalForDb.pabloDb;
}
