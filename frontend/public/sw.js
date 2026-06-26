// SplitEase Stay — service worker
//
// Scope is deliberately narrow: this only caches the same-origin static app
// shell (HTML/JS/CSS/icons), using a stale-while-revalidate strategy so the
// app still opens (and updates in the background) with a flaky connection.
//
// It NEVER caches anything under /api or /socket.io. This is a money app —
// balances, expenses, and bills must always come from the network. A cached
// balance is a wrong balance. Cross-origin requests (the deployed backend,
// Google Fonts) are left alone entirely; the browser's own HTTP cache
// handles those.

const CACHE_NAME = "splitease-stay-shell-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only ever handle same-origin GETs. Everything else (API calls, the
  // Socket.io handshake, cross-origin fonts) passes straight through to the
  // network exactly as if there were no service worker at all.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          // Only cache real, valid responses (skip opaque/error responses).
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          // Offline and not cached: for a page navigation, fall back to the
          // offline page rather than letting the request hang/fail blank.
          if (request.mode === "navigate") {
            return cache.match("/offline.html");
          }
          return cached;
        });

      // Stale-while-revalidate: serve the cached shell instantly if we have
      // one (fast repeat opens, works offline), while still updating the
      // cache in the background for next time.
      return cached || networkFetch;
    })
  );
});
