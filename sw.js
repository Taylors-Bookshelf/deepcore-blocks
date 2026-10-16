// Offline cache for the installed web app. The release number lives in src/version.js: bump it there, and the
// cache name below changes with it so installed copies drop the old files and pick up the new ones.
importScripts('src/version.js');
const VERSION = 'deepcore-' + self.APP_VERSION;
const CORE = ['./', './index.html', './manifest.webmanifest',
  './src/version.js', './src/config.js', './src/analytics.js', './src/data.js', './src/core.js', './src/maps.js', './src/meta.js', './src/assets.js', './src/styles.css', './src/game.js',
  './fonts/jersey-10-latin-400-normal.woff2', './fonts/chakra-petch-latin-500-normal.woff2', './fonts/chakra-petch-latin-600-normal.woff2', './fonts/chakra-petch-latin-700-normal.woff2',
  './assets/blocks/topsoil.png', './assets/blocks/wood-bark.png', './assets/blocks/limestone.png', './assets/blocks/granite.png', './assets/blocks/slate.png', './assets/blocks/basalt.png', './assets/blocks/magmastone.png', './assets/blocks/crust.png', './assets/ores/bone.png', './assets/ores/meteorite.png', './assets/ores/prism-ore.png', './assets/ores/coal.png', './assets/ores/iron.png', './assets/ores/copper.png', './assets/ores/gold.png', './assets/gems/ruby.png', './assets/gems/emerald.png', './assets/gems/diamond.png', './assets/specials/blast-charge.png', './assets/specials/sledgehammer.png', './assets/ui/anvil.png',
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
