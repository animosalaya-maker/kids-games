// Keeps the games working offline. Bump VERSION after changing any file.
const VERSION = 'kids-games-v5';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './privacy.html', './world.js',
  './bobo/', './bobo/index.html', './party/', './party/index.html',
  './duel/', './duel/index.html', './duel/engine.js', './solo/', './solo/index.html', './solo/engine.js',
  './duel/games/archery.js', './duel/games/balloon.js', './duel/games/basketball.js', './duel/games/bowling.js', './duel/games/cars.js', './duel/games/chop.js', './duel/games/coins.js', './duel/games/darts.js', './duel/games/flappy.js', './duel/games/fruit.js', './duel/games/mathduel.js', './duel/games/paint.js', './duel/games/pong.js', './duel/games/pool.js', './duel/games/rps.js', './duel/games/slap.js', './duel/games/snake.js', './duel/games/soccer.js', './duel/games/statue.js', './duel/games/sumo.js', './duel/games/tictactoe.js', './duel/games/tug.js', './solo/games/catch.js', './solo/games/colors.js', './solo/games/fishing.js', './solo/games/jumper.js', './solo/games/letters.js', './solo/games/math.js', './solo/games/memory.js', './solo/games/peek.js', './solo/games/puzzle.js', './solo/games/runner.js', './solo/games/shapes.js', './solo/games/stack.js'];
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
