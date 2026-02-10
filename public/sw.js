const CACHE_NAME = "transcripts-v1";

const PRECACHE_URLS = ["/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET requests and browser extensions
  if (request.method !== "GET" || !request.url.startsWith("http")) return;

  // Skip API calls and Convex requests — always go to network
  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("convex") ||
    url.pathname.startsWith("/_next/webpack")
  ) {
    return;
  }

  // Network-first strategy for navigation requests
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline"))
    );
    return;
  }

  // Stale-while-revalidate for static assets
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }
});
