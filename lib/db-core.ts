// Database setup and password hashing. Imports only Node built-ins, so the
// terminal scripts in scripts/ can use it with plain `node` as well as Next.js.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const NOW = `(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT ${NOW}
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS visits (
  id                 INTEGER PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label              TEXT NOT NULL,
  date               TEXT NOT NULL,
  items_submitted_at TEXT,
  created_at         TEXT NOT NULL DEFAULT ${NOW}
);
CREATE INDEX IF NOT EXISTS visits_user_date ON visits(user_id, date DESC);

CREATE TABLE IF NOT EXISTS items (
  id          INTEGER PRIMARY KEY,
  visit_id    INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  name        TEXT NOT NULL,
  price_cents INTEGER,
  count       INTEGER NOT NULL CHECK (count >= 0)
);
CREATE INDEX IF NOT EXISTS items_visit ON items(visit_id, position);
`;

export function databasePath(): string {
  // The ignore comment stops Next's build from bundling the whole project because of this path.
  return resolve(/*turbopackIgnore: true*/ process.env.DATABASE_PATH ?? "data/pablo.sqlite");
}

export function openDatabase(path: string = databasePath()): DatabaseSync {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(SCHEMA);
  return db;
}

/** Runs `fn` in a transaction, rolling back if it throws. */
export function transaction<T>(db: DatabaseSync, fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltText, keyText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !keyText) return false;
  const expected = Buffer.from(keyText, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltText, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export const MIN_PASSWORD_LENGTH = 8;

/** Creates a user, or sets a new password when the email already exists. */
export async function upsertUser(
  db: DatabaseSync,
  email: string,
  password: string,
): Promise<"created" | "updated"> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+$/.test(normalized)) throw new Error(`"${email}" is not an email address.`);
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must have at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  const hash = await hashPassword(password);
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
  if (existing) {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, existing.id as number);
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id as number);
    return "updated";
  }
  db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(normalized, hash);
  return "created";
}
