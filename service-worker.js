
const CACHE_NAME = 'sskratom-cache-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/script.js', '/manifest.json', '/icon.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(ASSETS))); self.skipWaiting();});
self.addEventListener('activate', e => { e.waitUntil(clients.claim());});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
