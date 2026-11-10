// Keeps the games working offline. Bump VERSION after changing any file.
const VERSION = 'kids-games-v3';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './privacy.html',
  './bobo/', './bobo/index.html', './party/', './party/index.html',
  './duel/', './duel/index.html', './duel/engine.js',
  './duel/games/tictactoe.js', './duel/games/pong.js', './duel/games/soccer.js', './duel/games/pool.js', './duel/games/basketball.js', './duel/games/snake.js', './duel/games/cars.js', './duel/games/paint.js', './duel/games/sumo.js', './duel/games/darts.js', './duel/games/statue.js', './duel/games/slap.js', './duel/games/coins.js', './duel/games/fruit.js', './duel/games/flappy.js', './duel/games/chop.js', './duel/games/tug.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && (new URL(e.request.url).origin === location.origin || e.request.url.includes('fonts.g'))) {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy));
    }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
