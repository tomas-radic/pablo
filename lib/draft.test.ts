import { describe, expect, it } from "vitest";
import { chooseDraft, type Draft } from "./draft";

const items = [{ name: "Pivo 12", priceCents: 260, count: 2 }];
const otherItems = [{ name: "Kofola", priceCents: 190, count: 1 }];

const local = (over: Partial<Draft>): Draft => ({
  items: otherItems,
  dirty: false,
  lastSubmittedAt: "2026-11-18T20:00:00.000Z",
  pendingSubmit: false,
  ...over,
});

describe("chooseDraft", () => {
  it("uses the server list when the phone has nothing", () => {
    expect(chooseDraft({ items, submittedAt: null }, null).items).toBe(items);
  });

  it("keeps unsubmitted changes from the phone", () => {
    const server = { items, submittedAt: "2026-11-18T21:00:00.000Z" };
    expect(chooseDraft(server, local({ dirty: true })).items).toBe(otherItems);
    expect(chooseDraft(server, local({ pendingSubmit: true })).items).toBe(otherItems);
  });

  it("takes a newer server list over a clean phone copy", () => {
    const server = { items, submittedAt: "2026-11-18T21:00:00.000Z" };
    expect(chooseDraft(server, local({})).items).toBe(items);
  });

  it("keeps the phone copy when the page came from an older offline cache", () => {
    const server = { items, submittedAt: "2026-11-18T19:00:00.000Z" };
    expect(chooseDraft(server, local({})).items).toBe(otherItems);
  });
});
