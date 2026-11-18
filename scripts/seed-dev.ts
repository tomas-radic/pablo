// Development data: a test user and one sample visit.
//
//   npm run db:seed
//
// Sign in with the email and password below. Never run against production data.

import { openDatabase, upsertUser } from "../lib/db-core.ts";

const DEV_EMAIL = "dev@publog.test";
const DEV_PASSWORD = "publog-dev-2026";

if (process.env.NODE_ENV === "production") {
  console.error("Refusing to seed development data with NODE_ENV=production.");
  process.exit(1);
}

const db = openDatabase();
await upsertUser(db, DEV_EMAIL, DEV_PASSWORD);
const user = db.prepare("SELECT id FROM users WHERE email = ?").get(DEV_EMAIL)!;

const hasVisits = db.prepare("SELECT 1 FROM visits WHERE user_id = ?").get(user.id as number);
if (!hasVisits) {
  const visit = db
    .prepare("INSERT INTO visits (user_id, label, date, items_submitted_at) VALUES (?, ?, ?, ?)")
    .run(user.id as number, "Friday with the team", "2026-11-13", new Date().toISOString());
  const insert = db.prepare(
    "INSERT INTO items (visit_id, position, name, price_cents, count) VALUES (?, ?, ?, ?, ?)",
  );
  const items: [string, number | null, number][] = [
    ["Pivo 12", 260, 5],
    ["Diavola", 1190, 3],
    ["Espresso", 240, 1],
    ["Fernet", null, 2],
  ];
  items.forEach(([name, price, count], i) => insert.run(visit.lastInsertRowid, i, name, price, count));
}

console.log(`Seeded. Sign in as ${DEV_EMAIL} (password in scripts/seed-dev.ts).`);
