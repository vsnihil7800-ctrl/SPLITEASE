// Registers the PWA service worker. Only runs in production builds — in
// dev, Vite's own module reloading and a caching service worker actively
// fight each other (stale-while-revalidate would keep re-serving an old
// bundle over HMR updates), so this is a deliberate no-op under `vite dev`.
export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (e.g. unsupported browser, blocked by an
      // extension) should never break the app itself — it just means no
      // offline/installable support this session.
    });
  });
}
