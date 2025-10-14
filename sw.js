const CACHE_NAME = 'metas-cobertura-cache-v1';
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  // Bootstrap CDN etc. são externos — o navegador tratará
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (evt) => {
  // Network-first for API requests (Firebase), cache-first for app shell
  if (evt.request.mode === 'navigate' || evt.request.destination === 'document') {
    evt.respondWith(
      fetch(evt.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request).catch(() => {
      // fallback could be a small offline response
      return new Response('', { status: 503, statusText: 'Offline' });
    }))
  );
});
