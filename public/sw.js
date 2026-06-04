/*
 * Service worker minimale (niente Serwist/next-pwa: zero dipendenze).
 * Scopo: rendere l'app affidabilmente installabile e dare un fallback offline.
 * NON cache aggressiva di HTML/RSC (eviterebbe contenuti stantii col App
 * Router). Solo: asset statici cache-first + pagina /offline come rete-fallback.
 * Coach AI, import Lichess e motore live restano online; il motore wasm, una
 * volta scaricato, resta in cache per uso offline.
 */
const CACHE = "shakh-static-v1";
const OFFLINE_URL = "/offline";

// Prefissi di sola lettura, immutabili o versionati: sicuri in cache-first.
const STATIC_PREFIXES = ["/_next/static", "/engine", "/icons", "/fonts"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // niente cross-origin

  // Asset statici: cache-first con riempimento pigro.
  if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Navigazioni: rete, con fallback alla pagina offline se la rete manca.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    );
  }
});
