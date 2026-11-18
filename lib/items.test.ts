import { describe, expect, it } from "vitest";
import {
  addItem,
  changeCount,
  computeTotal,
  formatAmount,
  parsePrice,
  sortByCount,
  suggestItems,
  totalLabel,
  updateItem,
  validateItems,
  type Item,
} from "./items";

const beer: Item = { name: "Pivo 12", priceCents: 260, count: 5 };
const pizza: Item = { name: "Diavola", priceCents: 1190, count: 3 };
const coffee: Item = { name: "Espresso", priceCents: 240, count: 1 };

describe("parsePrice", () => {
  it.each([
    ["2,60", 260],
    ["2.6", 260],
    ["3", 300],
    [" 11,90 € ", 1190],
    ["0,05", 5],
  ])("reads %j as %i cents", (input, cents) => expect(parsePrice(input)).toBe(cents));

  it("returns null for an empty field", () => expect(parsePrice("  ")).toBeNull());

  it.each(["abc", "2,605", "-1", "1,2,3"])("rejects %j", (input) =>
    expect(parsePrice(input)).toBe("invalid"),
  );
});

describe("formatAmount", () => {
  it("uses a decimal comma", () => expect(formatAmount(260)).toBe("2,60"));
  it("groups thousands", () => expect(formatAmount(123450)).toBe("1 234,50"));
});

describe("totals", () => {
  it("adds up price × count", () => {
    expect(totalLabel(computeTotal([beer, pizza, coffee]))).toBe("51,10 €");
  });

  it("says 'more than' when an ordered item has no price", () => {
    const fernet = { name: "Fernet", priceCents: null, count: 2 };
    expect(totalLabel(computeTotal([beer, fernet]))).toBe("more than 13,00 €");
  });

  it("says '(no prices)' when no ordered item has a price", () => {
    expect(totalLabel(computeTotal([{ name: "Fernet", priceCents: null, count: 1 }]))).toBe("(no prices)");
  });

  it("ignores items with count 0", () => {
    const zeroUnpriced = { name: "Fernet", priceCents: null, count: 0 };
    expect(totalLabel(computeTotal([coffee, zeroUnpriced]))).toBe("2,40 €");
  });

  it("is 0,00 € for an empty list", () => expect(totalLabel(computeTotal([]))).toBe("0,00 €"));
});

describe("addItem", () => {
  it("appends a new item with the given quantity", () => {
    expect(addItem([beer], { name: "  Kofola  ", priceCents: 190, quantity: 2 })).toEqual([
      beer,
      { name: "Kofola", priceCents: 190, count: 2 },
    ]);
  });

  it("merges an item with the same name, ignoring case", () => {
    expect(addItem([beer, pizza], { name: "pivo 12", priceCents: null, quantity: 2 })).toEqual([
      { ...beer, count: 7 },
      pizza,
    ]);
  });

  it("replaces the price when a new one is given", () => {
    expect(addItem([beer], { name: "Pivo 12", priceCents: 280, quantity: 1 })[0]).toEqual({
      name: "Pivo 12",
      priceCents: 280,
      count: 6,
    });
  });
});

describe("changeCount", () => {
  it("goes up and down", () => {
    expect(changeCount([coffee], "Espresso", 1)[0].count).toBe(2);
    expect(changeCount([coffee], "Espresso", -1)[0].count).toBe(0);
  });

  it("removes an item when '-' is pressed at 0", () => {
    const zero = { ...coffee, count: 0 };
    expect(changeCount([beer, zero], "Espresso", -1)).toEqual([beer]);
  });
});

describe("updateItem", () => {
  it("adds a price to an item without one", () => {
    const fernet = { name: "Fernet", priceCents: null, count: 2 };
    expect(updateItem([beer, fernet], "fernet", { name: "Fernet", priceCents: 350 })).toEqual([
      beer,
      { ...fernet, priceCents: 350 },
    ]);
  });

  it("changes and clears a price", () => {
    expect((updateItem([beer], "Pivo 12", { name: "Pivo 12", priceCents: 280 }) as Item[])[0].priceCents).toBe(280);
    expect((updateItem([beer], "Pivo 12", { name: "Pivo 12", priceCents: null }) as Item[])[0].priceCents).toBeNull();
  });

  it("renames an item, keeping its count and place", () => {
    expect(updateItem([beer, pizza], "Diavola", { name: "  Pizza  Diavola ", priceCents: 1190 })).toEqual([
      beer,
      { ...pizza, name: "Pizza Diavola" },
    ]);
  });

  it("allows changing only the letter case", () => {
    expect((updateItem([beer], "Pivo 12", { name: "PIVO 12", priceCents: 260 }) as Item[])[0].name).toBe("PIVO 12");
  });

  it("refuses a name another item already has", () => {
    expect(updateItem([beer, pizza], "Diavola", { name: "pivo 12", priceCents: null })).toBe("duplicate");
  });
});

describe("sortByCount", () => {
  it("puts the highest counts first and keeps ties in place", () => {
    const a = { name: "A", priceCents: null, count: 1 };
    const b = { name: "B", priceCents: null, count: 3 };
    const c = { name: "C", priceCents: null, count: 1 };
    expect(sortByCount([a, b, c]).map((i) => i.name)).toEqual(["B", "A", "C"]);
  });
});

describe("suggestItems", () => {
  const items = [beer, pizza, coffee, { name: "Kofóla", priceCents: 190, count: 1 }];

  it("matches anywhere in the name, ignoring case and accents", () => {
    expect(suggestItems(items, "kofo").map((i) => i.name)).toEqual(["Kofóla"]);
    expect(suggestItems(items, "12").map((i) => i.name)).toEqual(["Pivo 12"]);
  });

  it("lists names that start with the text first", () => {
    expect(suggestItems([coffee, beer], "p").map((i) => i.name)).toEqual(["Pivo 12", "Espresso"]);
  });

  it("suggests nothing for empty input", () => expect(suggestItems(items, " ")).toEqual([]));
});

describe("validateItems", () => {
  it("accepts a valid list and cleans names", () => {
    expect(validateItems([{ name: " Pivo  12 ", priceCents: 260, count: 0 }])).toEqual({
      ok: true,
      items: [{ name: "Pivo 12", priceCents: 260, count: 0 }],
    });
  });

  it.each([
    ["not a list", "x"],
    ["duplicate names", [beer, { ...beer, name: "PIVO 12" }]],
    ["negative count", [{ ...beer, count: -1 }]],
    ["fractional price", [{ ...beer, priceCents: 2.5 }]],
    ["missing name", [{ name: " ", priceCents: null, count: 1 }]],
  ])("rejects %s", (_label, input) => expect(validateItems(input).ok).toBe(false));
});
