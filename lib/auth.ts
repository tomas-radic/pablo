import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { verifyPassword } from "./db-core";

export const SESSION_COOKIE = "publog_session";
const SESSION_DAYS = 90;

export type User = { id: number; email: string };

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function secureCookies(): boolean {
  if (process.env.SESSION_COOKIE_SECURE) return process.env.SESSION_COOKIE_SECURE === "true";
  return process.env.NODE_ENV === "production";
}

/** Looks up the user behind a raw session token, or null if it's unknown or expired. */
export function userForToken(token: string | undefined): User | null {
  if (!token) return null;
  const row = db()
    .prepare(
      `SELECT users.id, users.email FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = ?
         AND sessions.expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
    )
    // SQLite's clock rather than new Date(): Next.js forbids reading the time while prerendering.
    .get(hashToken(token));
  return row ? { id: row.id as number, email: row.email as string } : null;
}

/** The signed-in user. Redirects to /login when there is none. */
export async function getCurrentUser(): Promise<User> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = userForToken(token);
  if (!user) redirect("/login");
  return user;
}

/** Checks the email and password and, if they match, starts a session. */
export async function signIn(email: string, password: string): Promise<boolean> {
  const row = db()
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email.trim().toLowerCase());
  // Hash anyway when the user doesn't exist, so timing doesn't reveal which emails exist.
  const stored = (row?.password_hash as string | undefined) ?? DUMMY_HASH;
  const valid = await verifyPassword(password, stored);
  if (!row || !valid) return false;

  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db()
    .prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashToken(token), row.id as number, expires.toISOString());
  db().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  store.delete(SESSION_COOKIE);
}

// scrypt hash of a random throwaway password; never matches real input.
const DUMMY_HASH =
  "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");
