const CACHE = 'gr-v1';
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

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const refresh = fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
      e.waitUntil(refresh.catch(() => {}));
      return hit || refresh.catch(() => hit || Response.error());
    })
  );
});
