// Pablo service worker: lets pages you've opened before load without a connection.
// - App files (/_next/static) never change for a given URL: cache first.
// - Pages: network first, falling back to the last copy saved on this device.
// - The API and everything else go straight to the network.

const VERSION = "v1";
const STATIC_CACHE = `pablo-static-${VERSION}`;
const PAGE_CACHE = `pablo-pages-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [STATIC_CACHE, PAGE_CACHE];
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "cache-urls") return;
  event.waitUntil(
    Promise.all(
      event.data.urls.map(async (url) => {
        const { pathname, origin } = new URL(url);
        if (origin !== self.location.origin) return;
        const isStatic = pathname.startsWith("/_next/static/");
        const cache = await caches.open(isStatic ? STATIC_CACHE : PAGE_CACHE);
        // Static files never change; pages are refetched so the saved copy is fresh.
        if (isStatic && (await cache.match(url))) return;
        const response = await fetch(url, { credentials: "same-origin" }).catch(() => null);
        if (isCacheable(response)) await cache.put(url, response);
      }),
    ),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  }
});

function isCacheable(response) {
  return Boolean(response && response.ok && !response.redirected && response.type === "basic");
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    return new Response(OFFLINE_PAGE, {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

const OFFLINE_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · Pablo</title>
<style>body{font-family:system-ui,sans-serif;background:#f7f3ec;color:#1f1a16;margin:0;display:grid;place-items:center;min-height:100dvh;padding:1rem;text-align:center}
@media (prefers-color-scheme:dark){body{background:#15110e;color:#f4ede3}}a{color:inherit}</style></head>
<body><main><h1>You’re offline</h1><p>This page wasn’t opened on this phone before, so there’s no saved copy.</p>
<p><a href="/">Back to your visits</a></p></main></body></html>`;
