// Offline cache for the installed web app. The release number lives in src/version.js: bump it there, and the
// cache name below changes with it so installed copies drop the old files and pick up the new ones.
importScripts('src/version.js');
const VERSION = 'deepcore-' + self.APP_VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest',
  './src/version.js', './src/config.js', './src/analytics.js', './src/data.js', './src/core.js', './src/maps.js', './src/styles.css', './src/game.js',
  './fonts/silkscreen-latin-400-normal.woff2', './fonts/silkscreen-latin-700-normal.woff2',
  './fonts/barlow-semi-condensed-latin-400-normal.woff2', './fonts/barlow-semi-condensed-latin-500-normal.woff2',
  './fonts/barlow-semi-condensed-latin-600-normal.woff2', './fonts/barlow-semi-condensed-latin-700-normal.woff2',
  './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network first for the app itself (so updates land quickly), cache as the offline fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
