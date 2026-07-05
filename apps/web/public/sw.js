const APP_SHELL_CACHE = "watchtower-shell-v1";
const APP_SHELL_URLS = ["/dashboard", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== APP_SHELL_CACHE).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Network-first for navigation requests, falling back to the cached app shell
// when offline. This is a minimal offline shell, not a full offline app —
// monitoring itself always happens on the backend, never in the browser.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match("/dashboard").then((res) => res ?? Response.error()))
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Watchtower", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "Watchtower", {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes("/dashboard") && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow("/dashboard");
    })
  );
});
