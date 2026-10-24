// Offline cache for Personal App (used when the site is served over http/https).
// Bump VERSION whenever a file below changes so visitors get the update.
var VERSION = 'personal-app-web-v1';
var FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/icons.js', './js/m3.js', './js/util.js', './js/store.js', './js/delta.js', './js/theme.js', './js/notify.js',
  './js/views/notes.js', './js/views/habits.js', './js/views/calendar.js', './js/views/calculator.js',
  './js/views/life.js', './js/views/settings.js', './js/views/onboarding.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(VERSION).then(function (cache) { return cache.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Cache first (the app never needs the network), refreshed in the background.
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(VERSION).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return null; });
      if (hit) { event.waitUntil(network); return hit; }
      return network.then(function (res) {
        if (res) return res;
        if (req.mode === 'navigate') return cache.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      });
    });
  }));
});
