/**
 * sw.js — Service worker tuned for LOW-BANDWIDTH Indian networks.
 *  - Precaches the app shell (tiny vanilla JS — no framework payload).
 *  - GET /api responses: network-first with cache fallback (stale listings still show).
 *  - Static assets: cache-first (instant repeat loads on 2G/3G).
 */
const CACHE = 'lnm-v2';
const SHELL = [
  '/', '/index.html', '/css/app.css',
  '/js/i18n.js', '/js/api.js', '/js/app.js',
  '/manifest.webmanifest',
  '/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png', '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  // Map tiles & external links: straight to network, no caching (they're huge)
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    // Network-first API: fresh data when online, cached fallback when not
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static: cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('/index.html')))
  );
});
