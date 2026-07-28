// Pass-through Service Worker for PWA Installation
// Prevents caching bugs/stale file mismatches while keeping PWA compatibility

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Automatically clear all old caches on activation to fix any blank screen/stale file issues
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log('[PWA SW] Clearing old cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // Pass-through fetch handler (required for PWA install criteria)
  event.respondWith(fetch(event.request));
});
