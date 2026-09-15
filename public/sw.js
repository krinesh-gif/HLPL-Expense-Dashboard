/* Hivefy Expenses service worker.
 *
 * Deliberately conservative about what it caches. Expense amounts, float balances
 * and the dashboard are money: showing a stale figure is worse than showing an
 * error, so nothing from the network is ever served from cache after the fact.
 * The cache holds only the static shell, and the offline fallback page states
 * plainly that it is offline.
 */
const VERSION = "v3";
const SHELL = `hlpl-shell-${VERSION}`;
const SHELL_FILES = [
  "/offline",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Immutable build output can be cached forever; it is content-hashed.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit ?? fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL).then((c) => c.put(request, copy));
          }
          return res;
        }),
      ),
    );
    return;
  }

  // Pages: always go to the network. If there is no network, show the offline
  // page rather than a stale balance.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline").then((hit) => hit ?? Response.error())),
    );
  }
});

// ---- reminders -------------------------------------------------------------

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }

  const title = payload.title || "Hivefy Expenses";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "Anything to record today?",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "daily-reminder",
      renotify: true,
      data: { url: payload.url || "/entry" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/entry";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(target) && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});

// The page asks the worker to wake queued entries after a reconnect.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
