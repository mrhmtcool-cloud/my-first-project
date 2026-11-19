/**
 * sw.js — SELF-DESTRUCT service worker (cache cleaner).
 *
 * Pehle app offline-cache use karti thi — par usme purane version phans jaate
 * the (naye features dikhne me dikkat). Ye naya "worker" aate hi:
 *   1) saara purana cache DELETE karta hai
 *   2) khud ko unregister (band) karta hai
 *   3) khule pages ko fresh reload karta hai
 * Result: hamesha naya version dikhega. ✅
 */
self.addEventListener('install', () => { self.skipWaiting(); });

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try {
      const clientsList = await self.clients.matchAll();
      clientsList.forEach((c) => { try { c.navigate(c.url); } catch (err) {} });
    } catch (err) {}
  })());
});
