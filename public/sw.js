const CACHE_NAME = 'trackmyattendance-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. INSTALL: Precache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching static shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Smart Caching Strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip mutations (POST/PUT/DELETE) and Supabase calls (handled by Dexie/SyncService)
  if (request.method !== 'GET' || url.hostname.includes('supabase.co') || url.hostname.includes('clerk')) {
    return;
  }

  // Strategy: Stale-While-Revalidate for Assets, Network-First for others
  const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff2|json)$/);

  if (isAsset) {
    // Cache First / Stale-While-Revalidate for assets
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
  } else {
    // Navigation or Dynamic Request
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cacheCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          return response;
        })
        .catch(() => {
          // If navigation fails, return index.html for SPA routing
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return caches.match(request);
        })
    );
  }
});
