import "server-only";
import { db } from "./db";
import { transaction } from "./db-core";
import { totalFrom, type Item, type Total } from "./items";

// Every function takes the user id and only touches that user's visits.

export type VisitSummary = {
  id: number;
  label: string;
  date: string; // YYYY-MM-DD
  itemCount: number;
  total: Total;
};

export type Visit = {
  id: number;
  label: string;
  date: string;
  submittedAt: string | null; // last successful submit of the item list
  createdAt: string;
  items: Item[];
};

export function listVisits(userId: number): VisitSummary[] {
  const rows = db()
    .prepare(
      `SELECT v.id, v.label, v.date,
              COALESCE(SUM(i.count), 0) AS item_count,
              COALESCE(SUM(CASE WHEN i.count > 0 AND i.price_cents IS NOT NULL THEN i.price_cents * i.count END), 0) AS cents,
              COALESCE(SUM(i.count > 0 AND i.price_cents IS NOT NULL), 0) AS priced,
              COALESCE(SUM(i.count > 0 AND i.price_cents IS NULL), 0) AS unpriced
       FROM visits v
       LEFT JOIN items i ON i.visit_id = v.id
       WHERE v.user_id = ?
       GROUP BY v.id
       ORDER BY v.date DESC, v.id DESC`,
    )
    .all(userId);
  return rows.map((row) => ({
    id: row.id as number,
    label: row.label as string,
    date: row.date as string,
    itemCount: row.item_count as number,
    total: totalFrom(row.cents as number, row.priced as number, row.unpriced as number),
  }));
}

export function getVisit(userId: number, visitId: number): Visit | null {
  const row = db()
    .prepare("SELECT id, label, date, items_submitted_at, created_at FROM visits WHERE id = ? AND user_id = ?")
    .get(visitId, userId);
  if (!row) return null;
  const items = db()
    .prepare("SELECT name, price_cents, count FROM items WHERE visit_id = ? ORDER BY position")
    .all(visitId)
    .map((item) => ({
      name: item.name as string,
      priceCents: item.price_cents as number | null,
      count: item.count as number,
    }));
  return {
    id: row.id as number,
    label: row.label as string,
    date: row.date as string,
    submittedAt: row.items_submitted_at as string | null,
    createdAt: row.created_at as string,
    items,
  };
}

export function createVisit(userId: number, label: string, date: string): number {
  const result = db()
    .prepare("INSERT INTO visits (user_id, label, date) VALUES (?, ?, ?)")
    .run(userId, label, date);
  return Number(result.lastInsertRowid);
}

export function updateVisit(userId: number, visitId: number, label: string, date: string): boolean {
  const result = db()
    .prepare("UPDATE visits SET label = ?, date = ? WHERE id = ? AND user_id = ?")
    .run(label, date, visitId, userId);
  return result.changes > 0;
}

/** Deletes a visit and (through the foreign key) its items. */
export function deleteVisit(userId: number, visitId: number): boolean {
  const result = db().prepare("DELETE FROM visits WHERE id = ? AND user_id = ?").run(visitId, userId);
  return result.changes > 0;
}

/**
 * Replaces the visit's whole item list with what the browser submitted.
 * Returns the submit time, or null when the visit isn't this user's.
 */
export function replaceItems(userId: number, visitId: number, items: Item[]): string | null {
  return transaction(db(), () => {
    const submittedAt = new Date().toISOString();
    const updated = db()
      .prepare("UPDATE visits SET items_submitted_at = ? WHERE id = ? AND user_id = ?")
      .run(submittedAt, visitId, userId);
    if (updated.changes === 0) return null;
    db().prepare("DELETE FROM items WHERE visit_id = ?").run(visitId);
    const insert = db().prepare(
      "INSERT INTO items (visit_id, position, name, price_cents, count) VALUES (?, ?, ?, ?, ?)",
    );
    items.forEach((item, position) =>
      insert.run(visitId, position, item.name, item.priceCents, item.count),
    );
    return submittedAt;
  });
}

/** Checks a label and YYYY-MM-DD date from the visit form. */
export function validateVisit(
  label: unknown,
  date: unknown,
): { ok: true; label: string; date: string } | { ok: false; error: string } {
  const cleanLabel = typeof label === "string" ? label.trim().replace(/\s+/g, " ") : "";
  if (cleanLabel === "") return { ok: false, error: "Give the visit a label." };
  if (cleanLabel.length > 80) return { ok: false, error: "The label can have at most 80 characters." };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { ok: false, error: "Pick a date." };
  }
  return { ok: true, label: cleanLabel, date };
}
