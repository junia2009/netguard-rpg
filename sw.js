const CACHE_NAME = 'netguard-v3';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/data.js',
  './js/engine.js',
  './js/entities.js',
  './js/combat.js',
  './js/ui.js',
  './js/music.js',
  './js/dungeon.js',
  './js/game.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

// Install: cache all assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
