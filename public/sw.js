// build.mjs replaces 'gr-dev' with a content hash, so every deploy that
// changes the app installs as a new version and the page can offer a reload.
const CACHE = 'gr-dev';
const CORE = [
  './', './index.html', './app.js', './styles.css', './manifest.json',
  './fonts/cormorant-garamond-v21-cyrillic_latin_latin-ext-500italic.woff2',
  './fonts/cormorant-garamond-v21-cyrillic_latin_latin-ext-500.woff2',
  './fonts/cormorant-garamond-v21-cyrillic_latin_latin-ext-600italic.woff2',
  './fonts/cormorant-garamond-v21-cyrillic_latin_latin-ext-600.woff2',
  './fonts/dm-sans-v17-latin_latin-ext-500.woff2',
  './fonts/dm-sans-v17-latin_latin-ext-600.woff2',
  './fonts/dm-sans-v17-latin_latin-ext-700.woff2',
  './fonts/dm-sans-v17-latin_latin-ext-regular.woff2',
  './icons/icon-192.png', './icons/icon-512.png',
];

// No skipWaiting here: a new version waits until the user taps Reload.
// cache: 'reload' bypasses the HTTP cache so a new version never stores stale files.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) =>
    c.addAll(CORE.map((url) => new Request(url, { cache: 'reload' })))));
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first: one version is served as a whole until the next one activates.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});
