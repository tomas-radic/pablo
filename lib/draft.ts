// The item list being edited on the phone, saved in localStorage so it survives
// reloads and having no connection. Browser only (except the pure helpers).

import type { Item } from "./items";

export type Draft = {
  items: Item[];
  /** Changed since the last successful submit. */
  dirty: boolean;
  /** When the server last accepted this list (ISO time from the server). */
  lastSubmittedAt: string | null;
  /** Submit was pressed but hasn't reached the server yet; retried when back online. */
  pendingSubmit: boolean;
};

export type ServerList = { items: Item[]; submittedAt: string | null };

export function draftFromServer(server: ServerList): Draft {
  return { items: server.items, dirty: false, lastSubmittedAt: server.submittedAt, pendingSubmit: false };
}

/**
 * Picks what to show when the page loads: unsubmitted changes on this phone win;
 * otherwise whichever list the server accepted most recently. (The page itself may
 * be an older copy served offline, so the phone's copy can be newer than "server".)
 */
export function chooseDraft(server: ServerList, local: Draft | null): Draft {
  if (!local) return draftFromServer(server);
  if (local.dirty || local.pendingSubmit) return local;
  if (server.submittedAt && (!local.lastSubmittedAt || server.submittedAt > local.lastSubmittedAt)) {
    return draftFromServer(server);
  }
  return local;
}

const storageKey = (visitId: number) => `publog:visit:${visitId}:v1`;

export function readDraft(visitId: number): Draft | null {
  try {
    const raw = localStorage.getItem(storageKey(visitId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    return Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDraft(visitId: number, draft: Draft): void {
  try {
    localStorage.setItem(storageKey(visitId), JSON.stringify(draft));
  } catch {
    // Private mode or full storage: editing still works for this page view.
  }
}

/** A tiny store for useSyncExternalStore: server data during SSR, the phone's copy after. */
export function createDraftStore(visitId: number, server: ServerList) {
  const serverDraft = draftFromServer(server);
  let current: Draft | null = null;
  const listeners = new Set<() => void>();

  const getSnapshot = (): Draft => {
    current ??= chooseDraft(server, readDraft(visitId));
    return current;
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot,
    getServerSnapshot: () => serverDraft,
    update(change: (draft: Draft) => Draft) {
      current = change(getSnapshot());
      writeDraft(visitId, current);
      listeners.forEach((listener) => listener());
    },
  };
}

export type DraftStore = ReturnType<typeof createDraftStore>;
