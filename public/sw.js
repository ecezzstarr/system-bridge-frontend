const CACHE_NAME = 'weave-v6';
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

// Push wakes this worker independently of the page's visible polling loop.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {}
    try { payload = event.data ? event.data.json() : {} } catch { /* Show a safe fallback. */ }
    const id = typeof payload.id === 'string' ? payload.id : ''
    await self.registration.showNotification(payload.title || 'WEAVE', {
      body: payload.body || 'You have a new WEAVE notification.',
      icon: '/icon.svg?v=3',
      tag: id || 'weave-notification',
      data: { url: '/notifications' + (id ? '?open=' + encodeURIComponent(id) : '') },
    })
  })())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil((async () => {
    const target = new URL(event.notification.data?.url || '/notifications', self.location.origin)
    if (target.origin !== self.location.origin) return
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin && 'focus' in client) {
        await client.navigate(target.href)
        return client.focus()
      }
    }
    return self.clients.openWindow(target.href)
  })())
})
