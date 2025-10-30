// Simple service worker for offline caching
const CACHE_NAME = 'neon-tetris-v1';
const ASSETS = [ '/', '/index.html', '/app.js', '/style.css' ];

self.addEventListener('install', ev=>{
  ev.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', ev=>{
  ev.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', ev=>{
  ev.respondWith(caches.match(ev.request).then(r=>r || fetch(ev.request).then(resp=>{ const clone = resp.clone(); if(ev.request.method==='GET' && resp && resp.type!=='opaque'){ caches.open(CACHE_NAME).then(c=>c.put(ev.request, clone)); } return resp; }).catch(()=>caches.match('/index.html'))));
});
