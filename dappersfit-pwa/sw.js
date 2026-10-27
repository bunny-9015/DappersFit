// Dappersfit Logistics PWA - iOS Optimized Service Worker
const CACHE_NAME = 'dappersfit-pwa-v1.0.8';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  './',
  './index.html',
  './styles.css',
  './app.js',
  './firebase-service.js',
  './manifest.json',
  './favicon.png',
  './apple-touch-icon.png',
  './icons/app_icon.png',
  './icons/avatar.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: Cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Asset pre-cache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge old cache revisions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Navigation fallback + Cache-First for static assets, Network-First for API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Navigation requests (Cold Reopen & Home Screen launch protection)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status < 400) {
            return networkResponse;
          }
          return caches.match('/index.html')
            .then((cached) => cached || caches.match('./index.html') || caches.match('/') || networkResponse);
        })
        .catch(() => {
          return caches.match('/index.html')
            .then((cached) => cached || caches.match('./index.html') || caches.match('/'));
        })
    );
    return;
  }

  // 2. If API request or outside origin, try Network with fallback
  if (url.pathname.startsWith('/api') || !url.origin.includes(self.location.origin)) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 3. Shell assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
