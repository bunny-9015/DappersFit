// ============================================================
// Dappersfit Service Worker — Production PWA
// Strategy:
//   • Static shell  → Cache-first (install-time precache)
//   • API calls     → Network-only (never cache)
//   • Navigation    → Network-first, fallback to cached /index.html
//   • Images/fonts  → Stale-while-revalidate
// ============================================================

const CACHE_VERSION = 'v3';
const SHELL_CACHE   = `dappersfit-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dappersfit-runtime-${CACHE_VERSION}`;

// Static app shell — always precache on install
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(SHELL_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload for faster page loads if supported
      if ('navigationPreload' in self.registration) {
        try {
          await self.registration.navigationPreload.enable();
        } catch (err) {
          console.warn('[SW] Navigation preload error:', err);
        }
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      );
    })()
  );
  self.clients.claim();
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Skip non-GET and chrome-extension requests
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // 2. API calls — Network ONLY, never cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 3. Uploads — Network ONLY
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(fetch(request));
    return;
  }

  // 4. Navigation (HTML pages) — Preload / Network-first, fallback offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Check if navigation preload response is available
          const preloadResp = await event.preloadResponse;
          if (preloadResp) {
            return preloadResp;
          }
          const networkResp = await fetch(request);
          if (networkResp.ok) {
            const clone = networkResp.clone();
            const cache = await caches.open(SHELL_CACHE);
            cache.put(request, clone);
          }
          return networkResp;
        } catch (error) {
          const cache = await caches.open(SHELL_CACHE);
          const cachedIndex = await cache.match('/index.html');
          if (cachedIndex) return cachedIndex;
          const cachedOffline = await cache.match('/offline.html');
          return cachedOffline || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // 5. Static shell assets — Cache-first
  if (SHELL_ASSETS.some((a) => url.pathname === a || url.pathname.endsWith(a))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            caches.open(SHELL_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        });
      })
    );
    return;
  }

  // 6. JS/CSS bundles (Vite chunks) — Cache-first with network fallback
  if (
    url.pathname.includes('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            caches.open(RUNTIME_CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        }).catch(() => cached || new Response('', { status: 503 }));
      })
    );
    return;
  }

  // 7. Images / fonts — Stale-while-revalidate
  if (
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|woff2?|ttf|otf)$/)
  ) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // 8. Everything else — Network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Background Sync ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncPendingOrders());
  }
});

async function syncPendingOrders() {
  // Notify all open clients that sync is happening
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'BACKGROUND_SYNC', tag: 'sync-orders' });
  });
}

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Dappersfit', body: event.data.text() };
  }

  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image,
    tag: data.tag || 'dappersfit-notification',
    requireInteraction: data.requireInteraction || false,
    data: { url: data.url || '/', ...data.data },
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [100, 50, 100],
    timestamp: Date.now(),
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Dappersfit', options)
  );
});

// ── Notification Click ────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Focus existing window if open
      for (const client of clients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ── Message Handling ──────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
