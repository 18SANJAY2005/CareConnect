// CareConnect Service Worker - Mobile PWA App Shell Cache
const CACHE_NAME = 'careconnect-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/careconnect-logo.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass API requests, Vite dev server, localhost, and modules
  if (
    requestUrl.pathname.startsWith('/api') ||
    requestUrl.pathname.startsWith('/src') ||
    requestUrl.pathname.startsWith('/@') ||
    requestUrl.pathname.includes('node_modules') ||
    requestUrl.port === '8000' ||
    requestUrl.port === '5173' ||
    requestUrl.hostname === 'localhost' ||
    requestUrl.hostname === '127.0.0.1'
  ) {
    return;
  }

  // Navigation requests (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // Network-first for static assets in production
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
