const CACHE_NAME = 'beats-cache-v1';
const ASSETS = [
  '/',
  '/style.css',
  '/script.js',
  '/customAudioLib.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(resp => {
          return resp || fetch(event.request).then(networkResp => {
            cache.put(event.request, networkResp.clone());
            return networkResp;
          });
        });
      })
    );
  }
});
