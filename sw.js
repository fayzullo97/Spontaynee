const CACHE = 'neon-tetris-v1';
const ASSETS = [
  '/', '/index.html', '/style.css', '/app.js'
];

// install
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

// fetch
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  e.respondWith(caches.match(req).then(resp => resp || fetch(req).then(r => {
    const rClone = r.clone();
    caches.open(CACHE).then(c => c.put(req, rClone));
    return r;
  })).catch(()=> caches.match('/index.html')));
});