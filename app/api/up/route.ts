import { connection } from "next/server";
import { db } from "@/lib/db";

// GET /api/up — health check for Dokku: answers 200 when the app runs and the
// database can be read. No sign-in needed (proxy.ts skips /api).
export async function GET() {
  await connection(); // always check at request time, never prerender
  try {
    db().prepare("SELECT 1").get();
    return new Response("ok", { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response("database unavailable", { status: 503 });
  }
}
