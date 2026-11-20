"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useOffline } from "next/offline";
import {
  addItem,
  changeCount,
  cleanName,
  computeTotal,
  formatAmount,
  itemKey,
  MAX_COUNT,
  MAX_NAME_LENGTH,
  parsePrice,
  sortByCount,
  suggestItems,
  totalLabel,
  updateItem,
  type Item,
} from "@/lib/items";
import { createDraftStore, draftKey, type ServerList } from "@/lib/draft";
import { formatLocalTimestamp } from "@/lib/dates";
import { MinusIcon, PlusIcon, inputClass, primaryButtonClass, secondaryButtonClass } from "../../ui";

/** The list is sent to the server this long after the last change. */
const AUTO_SUBMIT_DELAY_MS = 10_000;

type EditItems = (change: (items: Item[]) => Item[]) => void;

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "saved" }
  | { kind: "offline" }
  | { kind: "signed-out" }
  | { kind: "error"; message: string };

export function VisitEditor({
  visitId,
  createdAt,
  server,
}: {
  visitId: number;
  createdAt: string;
  server: ServerList;
}) {
  const [store] = useState(() => createDraftStore(draftKey(visitId, createdAt), server));
  const draft = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  const hydrated = useHydrated();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [editing, setEditing] = useState<{ key: string; focus: "name" | "price" } | null>(null);
  const sending = useRef(false);

  async function send() {
    if (sending.current) return;
    sending.current = true;
    setStatus({ kind: "sending" });
    const sent = store.getSnapshot().items;
    try {
      const response = await fetch(`/api/visits/${visitId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: sent }),
        cache: "no-store",
        // Lets the request finish when it's sent because the page is being hidden or left.
        keepalive: true,
      });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        store.update((d) => ({
          ...d,
          lastSubmittedAt: body.submittedAt,
          pendingSubmit: false,
          // Only clean if nothing was tapped while the request was in flight.
          dirty: d.items === sent ? false : d.dirty,
        }));
        setStatus({ kind: "saved" });
      } else if (response.status === 401) {
        store.update((d) => ({ ...d, pendingSubmit: false }));
        setStatus({ kind: "signed-out" });
      } else {
        store.update((d) => ({ ...d, pendingSubmit: false }));
        setStatus({ kind: "error", message: body?.error ?? `The server answered ${response.status}.` });
      }
    } catch {
      // No connection: keep pendingSubmit so it's sent once the phone is back online.
      setStatus({ kind: "offline" });
    } finally {
      sending.current = false;
    }
  }

  // The pending auto-submit, restarted by every change to the list.
  const autoSubmit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function cancelAutoSubmit() {
    clearTimeout(autoSubmit.current);
    autoSubmit.current = undefined;
  }

  function submit() {
    cancelAutoSubmit();
    // A request is still in flight: try again once it has had time to finish.
    if (sending.current) return scheduleAutoSubmit();
    // Reorder right away, whatever the server says.
    store.update((d) => ({ ...d, items: sortByCount(d.items), pendingSubmit: true }));
    void send();
  }

  function scheduleAutoSubmit() {
    cancelAutoSubmit();
    autoSubmit.current = setTimeout(() => submitRef.current(), AUTO_SUBMIT_DELAY_MS);
  }

  /** Sends a waiting auto-submit right now (the page is being hidden or left). */
  function flushAutoSubmit() {
    if (autoSubmit.current !== undefined) submitRef.current();
  }

  const edit: EditItems = (change) => {
    store.update((d) => ({ ...d, items: change(d.items), dirty: true }));
    scheduleAutoSubmit();
  };

  const offline = useOffline();
  const sendRef = useRef(send);
  const submitRef = useRef(submit);
  const flushRef = useRef(flushAutoSubmit);
  useEffect(() => {
    sendRef.current = send;
    submitRef.current = submit;
    flushRef.current = flushAutoSubmit;
  });

  // Don't wait out the delay when the phone is locked, the app is switched away from,
  // or this page is left: the timer may never get to run.
  useEffect(() => {
    const flush = () => flushRef.current();
    const onVisibilityChange = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  // Send what the server doesn't have yet: on load, and whenever the connection comes
  // back (the browser's "online" event, or Next.js noticing the server is reachable).
  useEffect(() => {
    if (offline) return;
    const retry = () => {
      if (!navigator.onLine) return;
      const { pendingSubmit, dirty } = store.getSnapshot();
      if (pendingSubmit) void sendRef.current();
      // Changes left from an earlier visit to this page (e.g. the session had ended).
      else if (dirty && autoSubmit.current === undefined) submitRef.current();
    };
    const timer = setTimeout(retry, 0);
    window.addEventListener("online", retry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", retry);
    };
  }, [store, offline]);

  const total = computeTotal(draft.items);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section
        aria-label="Total"
        className="sticky top-2 z-20 flex items-baseline justify-between gap-3 rounded-2xl bg-ink px-5 py-3 text-bg shadow-lg shadow-black/10"
      >
        <p className="shrink-0 text-xs font-semibold tracking-wide uppercase opacity-70">To pay</p>
        <p className="text-right text-[1.25rem] leading-tight font-bold tabular-nums" aria-live="polite">
          {totalLabel(total)}
        </p>
      </section>

      <AddItemForm edit={edit} items={draft.items} />

      <section aria-label="Ordered items" className="flex-1">
        {draft.items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            Nothing ordered yet. Add the first round above.
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {draft.items.map((item) =>
              editing?.key === itemKey(item.name) ? (
                <ItemEditor
                  key={itemKey(item.name)}
                  item={item}
                  focus={editing.focus}
                  items={draft.items}
                  edit={edit}
                  onDone={() => setEditing(null)}
                />
              ) : (
                <ItemRow
                  key={itemKey(item.name)}
                  item={item}
                  edit={edit}
                  onEdit={() =>
                    // A missing price is the likely reason to open it, so start there.
                    setEditing({ key: itemKey(item.name), focus: item.priceCents === null ? "price" : "name" })
                  }
                />
              ),
            )}
          </ul>
        )}
        <p className="mt-3 px-1 text-center text-xs text-muted">
          {!hydrated
            ? " "
            : draft.lastSubmittedAt
              ? `Last saved to server: ${formatLocalTimestamp(draft.lastSubmittedAt)}`
              : "Not saved to the server yet"}
        </p>
      </section>

      <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-line bg-bg/95 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] backdrop-blur">
        <StatusLine status={status} dirty={hydrated && draft.dirty} />
        <button
          type="button"
          onClick={submit}
          disabled={status.kind === "sending"}
          className={`${primaryButtonClass} w-full`}
        >
          {status.kind === "sending" ? "Submitting…" : "Submit now"}
        </button>
        <p className="mt-1.5 text-center text-xs text-muted">
          Submits automatically every {AUTO_SUBMIT_DELAY_MS / 1000} seconds.
        </p>
      </div>
    </div>
  );
}

function StatusLine({ status, dirty }: { status: Status; dirty: boolean }) {
  let text: React.ReactNode = dirty ? "Unsaved changes, saving shortly…" : " ";
  let tone = dirty ? "text-accent-strong" : "text-muted";
  if (status.kind === "sending") {
    text = "Saving…";
    tone = "text-muted";
  } else if (status.kind === "offline") {
    text = "No connection. Saved on this phone, it will be sent when you’re back online.";
    tone = "text-accent-strong";
  } else if (status.kind === "error") {
    text = `Not saved: ${status.message}`;
    tone = "text-danger";
  } else if (status.kind === "signed-out") {
    text = (
      <>
        Not saved: your session ended.{" "}
        <Link href="/login" className="underline">
          Sign in again
        </Link>{" "}
        (the list stays on this phone).
      </>
    );
    tone = "text-danger";
  } else if (status.kind === "saved" && !dirty) {
    text = "Saved to server";
    tone = "text-ok";
  }
  return (
    <p role="status" className={`mb-2 min-h-5 text-center text-sm font-medium ${tone}`}>
      {text}
    </p>
  );
}

function ItemRow({ item, edit, onEdit }: { item: Item; edit: EditItems; onEdit: () => void }) {
  const zero = item.count === 0;
  const change = (delta: 1 | -1) => edit((items) => changeCount(items, item.name, delta));
  return (
    <li className={`flex items-center gap-1 py-1.5 pr-2 pl-2 ${zero ? "text-muted" : ""}`}>
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${item.name}`}
        className="min-w-0 flex-1 rounded-lg px-2 py-2 text-left leading-snug break-words active:bg-surface-2"
      >
        <span className={`block font-medium ${zero ? "line-through" : ""}`}>{item.name}</span>
        {item.priceCents !== null ? (
          <span className="mt-0.5 block text-sm text-muted tabular-nums">{formatAmount(item.priceCents)} €</span>
        ) : (
          <span className="mt-0.5 block text-sm text-accent-strong">+ price</span>
        )}
      </button>
      <span className="w-11 shrink-0 text-right text-lg font-bold tabular-nums">{item.count}x</span>
      <button
        type="button"
        onClick={() => change(-1)}
        aria-label={zero ? `Remove ${item.name}` : `One less ${item.name}`}
        className="ml-1 inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line bg-surface-2 active:scale-95 transition"
      >
        <MinusIcon />
      </button>
      <button
        type="button"
        onClick={() => change(1)}
        disabled={item.count >= MAX_COUNT}
        aria-label={`One more ${item.name}`}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink active:scale-95 transition disabled:opacity-50"
      >
        <PlusIcon />
      </button>
    </li>
  );
}

function ItemEditor({
  item,
  focus,
  items: current,
  edit,
  onDone,
}: {
  item: Item;
  focus: "name" | "price";
  items: Item[];
  edit: EditItems;
  onDone: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.priceCents === null ? "" : formatAmount(item.priceCents));
  const [error, setError] = useState<string | null>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim() === "") return setError("The item needs a name.");
    const priceCents = parsePrice(price);
    if (priceCents === "invalid") return setError("Write the price like 2,60.");
    const items = updateItem(current, item.name, { name, priceCents });
    if (items === "duplicate") return setError(`“${name.trim()}” is already in the list.`);
    const changed = cleanName(name) !== item.name || priceCents !== item.priceCents;
    if (changed) edit(() => items);
    onDone();
  }

  const clearError = () => setError(null);
  const cancelOnEscape = (e: React.KeyboardEvent) => e.key === "Escape" && onDone();

  return (
    <li className="space-y-2 bg-surface-2/60 px-4 py-3">
      <form onSubmit={save} noValidate className="space-y-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-muted">Item</span>
          <input
            autoFocus={focus === "name"}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError();
            }}
            onKeyDown={cancelOnEscape}
            maxLength={MAX_NAME_LENGTH}
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="done"
            className={inputClass}
          />
        </label>
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-sm font-medium text-muted">Price</span>
            <span className="relative block">
              <input
                autoFocus={focus === "price"}
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  clearError();
                }}
                onFocus={(e) => e.target.select()}
                onKeyDown={cancelOnEscape}
                inputMode="decimal"
                enterKeyHint="done"
                placeholder="No price"
                autoComplete="off"
                className={`${inputClass} pr-7 tabular-nums`}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">€</span>
            </span>
          </label>
          <button type="button" onClick={onDone} className={`${secondaryButtonClass} px-4`}>
            Cancel
          </button>
          <button type="submit" className={`${primaryButtonClass} px-4`}>
            Save
          </button>
        </div>
        <p className={`text-sm ${error ? "font-medium text-danger" : "text-muted"}`} role={error ? "alert" : undefined}>
          {error ?? "Leave the price empty to remove it."}
        </p>
      </form>
    </li>
  );
}

function AddItemForm({ edit, items }: { edit: EditItems; items: Item[] }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const suggestions = showSuggestions ? suggestItems(items, name) : [];

  function pick(item: Item) {
    setName(item.name);
    if (item.priceCents !== null && price.trim() === "") setPrice(formatAmount(item.priceCents));
    setShowSuggestions(false);
  }

  function add(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim() === "") return setError("Type what you ordered.");
    const priceCents = parsePrice(price);
    if (priceCents === "invalid") return setError("Write the price like 2,60.");
    const qty = quantity.trim() === "" ? 1 : Number(quantity);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_COUNT) {
      return setError(`The number must be between 1 and ${MAX_COUNT}.`);
    }
    edit((items) => addItem(items, { name, priceCents, quantity: qty }));
    setName("");
    setPrice("");
    setQuantity("1");
    setError(null);
    setShowSuggestions(false);
    nameRef.current?.focus();
  }

  return (
    <form onSubmit={add} className="rounded-2xl border border-line bg-surface p-3" noValidate>
      <div className="relative">
        <label htmlFor="item-name" className="sr-only">
          Item
        </label>
        <input
          id="item-name"
          ref={nameRef}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setShowSuggestions(true);
            setError(null);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setShowSuggestions(false)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="What did you order?"
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="done"
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls="item-suggestions"
          aria-autocomplete="list"
          className={inputClass}
        />
        {suggestions.length > 0 && (
          <ul
            id="item-suggestions"
            role="listbox"
            className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-xl shadow-black/15"
          >
            {suggestions.map((item) => (
              <li key={itemKey(item.name)} role="option" aria-selected="false">
                <button
                  type="button"
                  // mousedown fires before the input's blur, so the tap isn't lost
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left active:bg-surface-2"
                >
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-sm text-muted tabular-nums">
                    {item.priceCents !== null && formatAmount(item.priceCents)}
                    {item.count > 0 && ` · ${item.count}x`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Price (optional)</span>
          <input
            value={price}
            onChange={(e) => {
              setPrice(e.target.value);
              setError(null);
            }}
            inputMode="decimal"
            placeholder="Price"
            autoComplete="off"
            className={`${inputClass} pr-7 tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">€</span>
        </label>
        <label className="relative w-[4.5rem] shrink-0">
          <span className="sr-only">How many</span>
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">×</span>
          <input
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value.replace(/\D/g, ""));
              setError(null);
            }}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete="off"
            className={`${inputClass} pl-7 tabular-nums`}
          />
        </label>
        <button type="submit" className={`${primaryButtonClass} px-4`} aria-label="Add item">
          <PlusIcon /> Add
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 px-1 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

/** False during server render and hydration, true afterwards (for time-zone-dependent text). */
function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
const noopSubscribe = () => () => {};
