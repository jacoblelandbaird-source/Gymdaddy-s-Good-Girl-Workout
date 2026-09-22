// Bump this when you want to force everyone's cached copy to refresh.
const CACHE_NAME = 'gymdaddy-cache-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests — never touch Firebase/Firestore
  // or other cross-origin calls, so cloud sync keeps working untouched.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    // Network-first for the app page itself, so you always get the latest
    // version when you have signal — falls back to the cached copy offline.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((res) => res || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest) — they rarely change.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }))
  );
});
