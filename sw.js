// Keeps the games working offline. Bump VERSION after changing any file.
// SHELL (home page + shared libraries) is cached at install. Every other file in FILES is fetched afterwards in the
// background, three at a time (so the first game a kid opens is not stuck behind 9 MB of downloads), and any file a page
// loads is cached when it is used. When a new VERSION takes over, the old copies are carried over first, so a game
// that already worked offline keeps working while the new copies arrive.
const VERSION = 'kids-games-v68';
const SHELL = ['./', './index.html', './manifest.webmanifest', './manifest-en.webmanifest', './manifest-tr.webmanifest', './i18n.js', './icon-192.png', './icon-512.png',
  './world.js', './back.js', './rt.js', './avatar.js', './friends.js', './invitepop.js', './adventure3d/three.module.min.js', './worlds/chars/me.png'];
const FILES = ['./', './index.html', './manifest.webmanifest', './manifest-en.webmanifest', './manifest-tr.webmanifest', './i18n.js', './icon-192.png', './icon-512.png', './privacy.html', './world.js', './back.js', './blocks/', './blocks/index.html', './blocks/game.js', './blocks/world.js', './blocks/blocks.js', './blocks/blueprints.js', './blocks/models.js', './blocks/audio.js', './balls/', './balls/index.html', './balls/game.js', './balls/levels.js', './hara/food.js', './hara/park2.js', './hara/gate.js', './hara/', './hara/index.html', './hara/game.js', './hara/park.js', './hara/tex.js', './hara/audio.js', './maps/castle/zones.js', './maps/castle/zone_snow.js', './maps/castle/zone_candy.js', './maps/castle/zone_volcano.js', './maps/castle/zone_pirate.js', './maps/castle/zone_sky.js', './tiny/', './tiny/index.html', './tiny/game.js', './tiny/world.js', './tiny/models.js', './tiny/tex.js', './tiny/geo.js', './tiny/audio.js', './info/', './info/index.html', './info/data.js', './party/arena.js', './survive/', './survive/index.html', './survive/game.js', './survive/world.js', './survive/audio.js', './kart/', './kart/index.html', './kart/game.js', './kart/tracks.js', './kart/trackdefs.js', './kart/models.js', './kart/audio.js', './prank3d/', './prank3d/index.html', './prank3d/game.js', './prank3d/house.js', './prank3d/uncle.js', './prank3d/props.js', './prank3d/audio.js', './prank3d/textures.js', './desert/', './desert/index.html', './desert/game.js', './desert/world.js', './desert/audio.js', './space/', './space/index.html', './space/game.js', './island/', './island/index.html', './island/game.js', './island/world.js', './rt.js', './avatar.js', './worlds/chars/me.png', './park/', './park/index.html', './park/game.js', './park/models.js', './fashion/', './fashion/index.html', './fashion/game.js', './fashion/items.js', './bees/', './bees/index.html', './bees/game.js', './bees/models.js', './surprise/', './surprise/index.html', './surprise/game.js', './surprise/island.js', './city/', './city/index.html', './city/game.js', './city/models.js', './restaurant/', './restaurant/index.html', './restaurant/game.js', './restaurant/models.js', './garden/', './garden/index.html', './garden/game.js', './garden/models.js', './hide/', './hide/index.html', './hide/game.js', './hide/maps.js', './hide/textures.js', './hide/audio.js', './shop/', './shop/index.html', './shop/entitlements.js', './shop/billing.js', './shop/gate.js', './shop/castle.jpg', './maps/castle/', './maps/castle/index.html', './maps/castle/build.js', './maps/castle/mapsave.js', './pets/', './pets/index.html', './pets/game.js', './pets/models.js', './invitepop.js', './supabase.js', './friends.js', './friends/', './friends/index.html',
  './bobo/', './bobo/index.html', './party/', './party/index.html', './prank/', './prank/index.html', './adventure/', './adventure/index.html', './adventure3d/', './adventure3d/index.html', './adventure3d/three.module.min.js',
  './heist/', './heist/index.html', './granny/', './granny/index.html', './granny/game.js', './granny/house.js', './granny/textures.js', './granny/nona.js', './granny/audio.js', './worlds/', './worlds/index.html', './worlds/kit.js', './worlds/levels.js', './worlds/chars/sara.png', './worlds/chars/sidra.png', './worlds/chars/qamar.png', './worlds/chars/samir.png', './worlds/chars/mushakis.png', './worlds/chars/zaqzouq.png', './worlds/chars/laila.png',
  './duel/', './duel/index.html', './duel/engine.js', './solo/', './solo/index.html', './solo/engine.js',
  './duel/games/archery.js', './duel/games/balloon.js', './duel/games/basketball.js', './duel/games/bowling.js', './duel/games/cars.js', './duel/games/chop.js', './duel/games/coins.js', './duel/games/darts.js', './duel/games/flappy.js', './duel/games/fruit.js', './duel/games/mathduel.js', './duel/games/paint.js', './duel/games/pong.js', './duel/games/pool.js', './duel/games/rps.js', './duel/games/slap.js', './duel/games/snake.js', './duel/games/soccer.js', './duel/games/statue.js', './duel/games/sumo.js', './duel/games/tictactoe.js', './duel/games/tug.js', './solo/games/catch.js', './solo/games/colors.js', './solo/games/fishing.js', './solo/games/jumper.js', './solo/games/letters.js', './solo/games/math.js', './solo/games/memory.js', './solo/games/peek.js', './solo/games/puzzle.js', './solo/games/runner.js', './solo/games/shapes.js', './solo/games/stack.js'];
// big files that never change between versions: straight from the cache (a new VERSION fetches them again)
const STATIC = /\/adventure3d\/three\.module\.min\.js$|\/worlds\/chars\/[a-z]+\.png$|\/icon-\d+\.png$|\/shop\/castle\.jpg$/;
const DONE = './__warm-' + VERSION;
const fresh = u => new Request(u, { cache:'no-cache' });
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(fresh))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(carryOver().then(() => self.clients.claim())); setTimeout(() => warm().catch(() => {}), 3000); });
// copy what older versions had (only what this version does not have yet), then drop the old caches
async function carryOver(){
  const keys = await caches.keys(), cur = await caches.open(VERSION);
  for(const k of keys){
    if(k === VERSION) continue;
    try{
      const old = await caches.open(k);
      for(const req of await old.keys()){
        if(/__warm-/.test(req.url) || await cur.match(req)) continue;
        const res = await old.match(req); if(!res) continue;
        if(res.type === 'opaque'){ await cur.put(req, res); continue; }
        const h = new Headers(res.headers); h.set('x-bobo-old', '1');   // marks it for warm() to fetch again
        await cur.put(req, new Response(await res.blob(), { status:res.status, statusText:res.statusText, headers:h }));
      }
    }catch(err){}
    await caches.delete(k);
  }
}
// fetch the rest of FILES in the background: files missing from this version's cache or carried over from an old one
let warming = null;
function warm(){
  if(warming) return warming;
  warming = (async () => {
    const c = await caches.open(VERSION);
    if(await c.match(DONE)) return;
    const todo = FILES.filter(f => !SHELL.includes(f)); let failed = 0;
    const worker = async () => { for(let f; (f = todo.shift()) !== undefined;){ try{ const hit = await c.match(f); if(hit && !hit.headers.has('x-bobo-old')) continue; const res = await fetch(fresh(f)); if(res.ok) await c.put(f, res); else failed++; }catch(err){ failed++; } } };
    await Promise.all([worker(), worker(), worker()]);
    if(!failed) await c.put(DONE, new Response(VERSION));
  })().finally(() => { warming = null; });
  return warming;
}
self.addEventListener('message', e => { if(e.data === 'warm') e.waitUntil(warm()); });
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  // only same-origin files and fonts; never touch the game server (supabase.co realtime / API)
  const u = new URL(e.request.url);
  if(u.origin !== location.origin && !u.hostname.startsWith('fonts.g')) return;
  const put = res => { if(res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); } return res; };
  if(u.origin !== location.origin || STATIC.test(u.pathname)) { // fonts and big unchanging files: cache first
    e.respondWith(caches.match(e.request, { ignoreSearch:u.origin === location.origin }).then(hit => hit || fetch(e.request).then(put)));
    return;
  }
  // a page opened: carry on with the background download if it was cut short (the browser stops idle workers)
  if(e.request.mode === 'navigate') e.waitUntil(new Promise(r => setTimeout(r, 3000)).then(warm).catch(() => {}));
  // our own files: newest from the network first (so new games show up at once), the saved copy when offline or slow
  e.respondWith(new Promise(resolve => {
    let done = false;
    const nav = e.request.mode === 'navigate';   // a page with ?place=2 / ?join=… offline: the saved page without the query
    const fromCache = () => caches.match(e.request).then(hit => hit || (nav ? caches.match(e.request, { ignoreSearch:true }).then(h => h || caches.match('./index.html')) : undefined));
    const t = setTimeout(() => fromCache().then(hit => { if(hit && !done) { done = true; resolve(hit); } }), 4000);
    fetch(e.request, { cache:'no-cache' }).then(res => { put(res); if (!done) { done = true; clearTimeout(t); resolve(res); } })
      .catch(() => fromCache().then(hit => { if (!done) { done = true; clearTimeout(t); resolve(hit || Response.error()); } }));
  }));
});
