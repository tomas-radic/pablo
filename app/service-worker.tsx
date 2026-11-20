"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const enabled = () => process.env.NODE_ENV === "production" && "serviceWorker" in navigator;

// Registers public/sw.js, which keeps visited pages and app files available
// offline. Only in production builds; in dev it would fight with hot reload.
export function ServiceWorker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled()) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        // Files loaded before the worker took control aren't cached yet; hand them over.
        const urls = performance
          .getEntriesByType("resource")
          .map((entry) => entry.name)
          .filter((url) => new URL(url).pathname.startsWith("/_next/static/"));
        registration.active?.postMessage({ type: "cache-urls", urls });
      })
      .catch(() => {});
  }, []);

  // In-app navigations don't load a full page, so the worker never sees one to save.
  // Ask it to fetch and keep a copy, so a reload without connection still works.
  useEffect(() => {
    if (!enabled() || pathname === "/login") return;
    navigator.serviceWorker.ready
      .then((registration) =>
        registration.active?.postMessage({ type: "cache-urls", urls: [location.href] }),
      )
      .catch(() => {});
  }, [pathname]);

  return null;
}

/** Drops the offline copies of specific pages, e.g. of a deleted visit. */
export async function forgetOfflinePages(paths: string[]): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  for (const key of keys.filter((k) => k.startsWith("pablo-pages"))) {
    const cache = await caches.open(key);
    for (const request of await cache.keys()) {
      if (paths.includes(new URL(request.url).pathname)) await cache.delete(request);
    }
  }
}

/** Removes cached pages, e.g. on sign-out, so the next person can't see them offline. */
export async function clearOfflineCache(): Promise<void> {
  if (!("caches" in window)) return;
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("pablo-pages")).map((key) => caches.delete(key)));
}
