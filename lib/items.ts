// Item rules shared by the browser (offline editing) and the server (validation).
// No imports from Node or Next here, so both sides can use it.

export type Item = {
  name: string;
  priceCents: number | null;
  count: number;
};

export const MAX_NAME_LENGTH = 80;
export const MAX_COUNT = 999;
export const MAX_ITEMS = 200;
export const MAX_PRICE_CENTS = 99_999_99;

/** Trims and collapses inner whitespace: "  Pivo   12 " -> "Pivo 12". */
export function cleanName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Identity of an item: items whose names share a key are one item. */
export function itemKey(name: string): string {
  return cleanName(name).toLocaleLowerCase("sk");
}

/** Lowercase and without diacritics, so "kofola" finds "Kofóla" in suggestions. */
function foldForSearch(text: string): string {
  return itemKey(text).normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Parses "2,60", "2.6", "3" or "3 €" into cents.
 * Returns null for an empty input and "invalid" for anything else.
 */
export function parsePrice(input: string): number | null | "invalid" {
  const text = input.replace(/\s|€/g, "");
  if (text === "") return null;
  const match = /^(\d{1,5})(?:[.,](\d{1,2}))?$/.exec(text);
  if (!match) return "invalid";
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 260 -> "2,60", 123450 -> "1 234,50" (non-breaking space). */
export function formatAmount(cents: number): string {
  const whole = Math.floor(cents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const fraction = String(cents % 100).padStart(2, "0");
  return `${whole},${fraction}`;
}

export type Total =
  | { kind: "empty" } // nothing ordered yet
  | { kind: "no-prices" } // ordered items, none has a price
  | { kind: "exact"; cents: number }
  | { kind: "at-least"; cents: number }; // some ordered items have no price

export function computeTotal(items: Item[]): Total {
  let cents = 0;
  let priced = 0;
  let unpriced = 0;
  for (const item of items) {
    if (item.count <= 0) continue;
    if (item.priceCents === null) {
      unpriced++;
    } else {
      priced++;
      cents += item.priceCents * item.count;
    }
  }
  return totalFrom(cents, priced, unpriced);
}

/** Builds a Total from aggregates, e.g. computed in SQL. */
export function totalFrom(cents: number, priced: number, unpriced: number): Total {
  if (priced === 0 && unpriced === 0) return { kind: "empty" };
  if (priced === 0) return { kind: "no-prices" };
  return { kind: unpriced > 0 ? "at-least" : "exact", cents };
}

export function totalLabel(total: Total): string {
  switch (total.kind) {
    case "empty":
      return `${formatAmount(0)} €`;
    case "no-prices":
      return "(no prices)";
    case "exact":
      return `${formatAmount(total.cents)} €`;
    case "at-least":
      return `> ${formatAmount(total.cents)} €`;
  }
}

/**
 * Adds `quantity` of an item. An item with the same name gets its count raised
 * (and its price replaced when one is given); a new name goes to the end.
 */
export function addItem(
  items: Item[],
  input: { name: string; priceCents: number | null; quantity: number },
): Item[] {
  const name = cleanName(input.name);
  const key = itemKey(name);
  const index = items.findIndex((item) => itemKey(item.name) === key);
  if (index === -1) {
    return [
      ...items,
      { name, priceCents: input.priceCents, count: clampCount(input.quantity) },
    ];
  }
  return items.map((item, i) =>
    i === index
      ? {
          ...item,
          count: clampCount(item.count + input.quantity),
          priceCents: input.priceCents ?? item.priceCents,
        }
      : item,
  );
}

/** "+" and "-": a "-" on an item that is already at 0 removes it. */
export function changeCount(items: Item[], name: string, delta: 1 | -1): Item[] {
  const key = itemKey(name);
  const target = items.find((item) => itemKey(item.name) === key);
  if (!target) return items;
  if (delta < 0 && target.count === 0) {
    return items.filter((item) => item !== target);
  }
  return items.map((item) =>
    item === target ? { ...item, count: clampCount(item.count + delta) } : item,
  );
}

/**
 * Renames an item and sets or clears (null) its price, keeping its count and place.
 * Returns "duplicate" when the new name belongs to another item in the list.
 */
export function updateItem(
  items: Item[],
  name: string,
  change: { name: string; priceCents: number | null },
): Item[] | "duplicate" {
  const key = itemKey(name);
  const newName = cleanName(change.name);
  const newKey = itemKey(newName);
  if (newKey !== key && items.some((item) => itemKey(item.name) === newKey)) return "duplicate";
  return items.map((item) =>
    itemKey(item.name) === key ? { ...item, name: newName, priceCents: change.priceCents } : item,
  );
}

/** Highest count first; items with equal counts keep their current order. */
export function sortByCount(items: Item[]): Item[] {
  return [...items].sort((a, b) => b.count - a.count);
}

/** Names already in the list that match what the user is typing. */
export function suggestItems(items: Item[], query: string, limit = 5): Item[] {
  const folded = foldForSearch(query);
  if (folded === "") return [];
  return items
    .filter((item) => foldForSearch(item.name).includes(folded))
    .sort(
      (a, b) =>
        Number(!foldForSearch(a.name).startsWith(folded)) -
        Number(!foldForSearch(b.name).startsWith(folded)),
    )
    .slice(0, limit);
}

function clampCount(count: number): number {
  return Math.min(MAX_COUNT, Math.max(0, Math.trunc(count)));
}

/** Validates an item list sent by the browser before the server stores it. */
export function validateItems(
  input: unknown,
): { ok: true; items: Item[] } | { ok: false; error: string } {
  if (!Array.isArray(input)) return { ok: false, error: "Items must be a list." };
  if (input.length > MAX_ITEMS) {
    return { ok: false, error: `A visit can have at most ${MAX_ITEMS} items.` };
  }
  const seen = new Set<string>();
  const items: Item[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) {
      return { ok: false, error: "Every item must be an object." };
    }
    const { name, priceCents, count } = raw as Record<string, unknown>;
    if (typeof name !== "string" || cleanName(name) === "") {
      return { ok: false, error: "Every item needs a name." };
    }
    const cleaned = cleanName(name);
    if (cleaned.length > MAX_NAME_LENGTH) {
      return { ok: false, error: `"${cleaned.slice(0, 20)}…" is too long.` };
    }
    const key = itemKey(cleaned);
    if (seen.has(key)) return { ok: false, error: `"${cleaned}" is in the list twice.` };
    seen.add(key);
    if (
      priceCents !== null &&
      !(Number.isInteger(priceCents) && (priceCents as number) >= 0 && (priceCents as number) <= MAX_PRICE_CENTS)
    ) {
      return { ok: false, error: `"${cleaned}" has an invalid price.` };
    }
    if (!(Number.isInteger(count) && (count as number) >= 0 && (count as number) <= MAX_COUNT)) {
      return { ok: false, error: `"${cleaned}" has an invalid count.` };
    }
    items.push({ name: cleaned, priceCents: priceCents as number | null, count: count as number });
  }
  return { ok: true, items };
}
