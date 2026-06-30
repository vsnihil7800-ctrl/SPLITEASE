// SplitEase Stay — service worker
//
// Responsibilities:
//   1. Cache the app shell (HTML/JS/CSS/icons) with stale-while-revalidate.
//   2. Receive Web Push notifications and show them via the Notifications API.
//   3. Handle notificationclick to open/focus the relevant page.
//
// Never caches /api or /socket.io — a cached balance is a wrong balance.

const CACHE_NAME = "splitease-stay-shell-v1";

const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

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

// ─── Fetch (shell cache) ────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/socket.io")) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(async () => {
          if (request.mode === "navigate") {
            return cache.match("/offline.html");
          }
          return cached;
        });

      return cached || networkFetch;
    })
  );
});

// ─── Web Push ───────────────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "SplitEase Stay", body: event.data.text() };
  }

  const title = data.title || "SplitEase Stay";
  const options = {
    body: data.body || data.message || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" },
    // Vibrate pattern: 200ms on, 100ms off, 200ms on
    vibrate: [200, 100, 200],
    // Collapse same-tag notifications (avoids spamming the notification tray)
    tag: "splitease-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click ─────────────────────────────────────────────────────

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If the app is already open in a tab, focus it and navigate.
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        // Otherwise open a new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
