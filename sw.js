const CACHE = 'primo-site-v4';
const ASSETS = ["./", "index.html", "css/site.css", "css/home.css", "js/site.js", "js/home.js", "manifest.webmanifest", "icons/icon.svg", "img/autumn-d.jpg", "img/autumn.jpg", "img/course-wing.jpg", "img/course1.jpg", "img/course2.jpg", "img/course3.jpg", "img/founder-d.jpg", "img/founder.jpg", "img/hero1.jpg", "img/hero2.jpg", "img/hero3.jpg", "img/logo.png", "img/mood-blu.webp", "img/mood-bordeaux.webp", "img/mood-bw.webp", "img/mood-cioccolato.webp", "img/mood-fucsia.webp", "img/mood-giallo.webp", "img/mood-glitter.webp", "img/mood-grigio.webp", "img/mood-lampone.webp", "img/mood-lilla.webp", "img/mood-nude.webp", "img/mood-rosa.webp", "img/mood-rosso.webp", "img/mood-verde.webp", "img/product.jpg", "img/shade-blue.jpg", "img/shade-gold.jpg", "img/shade-night.jpg", "img/shade-rose.jpg", "img/spring-d.jpg", "img/spring.jpg", "img/summer-d.jpg", "img/summer.jpg", "img/winter-d.jpg", "img/winter.jpg", "fonts/inter-latin-300-normal.woff2", "fonts/inter-latin-400-normal.woff2", "fonts/inter-latin-500-normal.woff2", "fonts/montserrat-cyrillic-600-normal.woff2", "fonts/montserrat-cyrillic-700-normal.woff2", "fonts/montserrat-latin-400-normal.woff2", "fonts/montserrat-latin-500-normal.woff2", "fonts/montserrat-latin-600-normal.woff2", "fonts/montserrat-latin-700-normal.woff2", "fonts/montserrat-latin-800-normal.woff2"];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r;
  }).catch(() => caches.match(e.request)));
});
