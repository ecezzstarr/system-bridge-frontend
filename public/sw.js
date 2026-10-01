const CACHE_NAME = 'weave-v5';
const URLS_TO_CACHE = [
  '/icon.svg?v=3',
  '/weave-logo.svg',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
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
  const url = new URL(event.request.url);

  // Authenticated WEAVE worlds, route navigations, API state and Next.js
  // runtime assets must always come from the active release. Never fall
  // back to an old cached HTML shell after a deployment.
  if (
    event.request.mode === 'navigate' ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Only stable install assets use cache-first behavior.
  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
