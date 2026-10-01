/*
  Circuit Book service worker.

  The goal is narrow and specific: the app must open and run a session in a
  basement gym or on a field with no signal. So the shell and the station photos
  are cached, and everything that writes is left strictly to the network — the
  outbox in the app handles queuing those.
*/

const VERSION = "v1";
const SHELL_CACHE = `cb-shell-${VERSION}`;
const PAGE_CACHE = `cb-pages-${VERSION}`;
const IMAGE_CACHE = `cb-images-${VERSION}`;

const PRECACHE = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // One failed icon should not block the whole install.
      await Promise.allSettled(PRECACHE.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL_CACHE, PAGE_CACHE, IMAGE_CACHE]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

function isSupabaseStorage(url) {
  return url.pathname.includes("/storage/v1/object");
}

function isSupabaseApi(url) {
  return (
    url.pathname.startsWith("/rest/v1") ||
    url.pathname.startsWith("/auth/v1") ||
    url.pathname.startsWith("/realtime")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything that is not a plain GET is a write. Never touch it.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Reads and writes against the database and auth must always be live, or the
  // app would show a stale library and a session that silently diverges.
  if (isSupabaseApi(url)) return;

  // Station photos. Signed URLs carry a token that changes on every re-sign, so
  // matching ignores the query string and the same photo stays cached.
  if (isSupabaseStorage(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request, { ignoreSearch: true });
        const fetching = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);

        // Serve the cached photo immediately and refresh it in the background.
        if (cached) {
          event.waitUntil(fetching);
          return cached;
        }
        const fresh = await fetching;
        return fresh || new Response("", { status: 504, statusText: "Offline" });
      })(),
    );
    return;
  }

  // Build output is content-hashed, so it can be served from cache forever.
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }

  // Page navigations: try the network, fall back to the last copy of that page,
  // then to a plain offline notice.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await cache.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const shell = await caches.open(SHELL_CACHE);
          const offline = await shell.match("/offline.html");
          return (
            offline ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
  }
});

// Lets a new deploy take over without the user force-closing the app.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
