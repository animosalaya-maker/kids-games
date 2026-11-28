/* «بيانو بوبو» VS on the real server: two kids with server names; A makes a room, B joins with the number, both see each
   other's name, A picks a song (B sees it), A starts → both play the same song with the same tiles, each sees the other's
   live score; B stops tapping half-way → both phones show the same winner (A). Only realtime messages, no page errors. */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
let fails = 0;
const res = (n, c, ...a) => { log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a); if(!c) fails++; };
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ try{ if(await p.evaluate(fn, arg)) return true; }catch(e){} await p.waitForTimeout(300); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'] });
  const errs = [], posts = [];
  const mk = async (n, name) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ar' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if(/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + 'piano/'); await p.waitForTimeout(1000);
    return { p, ctx, me };
  };
  const A = await mk('A', 'Sara'), B = await mk('B', 'Samir');
  await A.p.evaluate(() => __piano.mpMenu()); await A.p.evaluate(() => __piano.mpCreate());
  res('A room made', await until(A.p, () => __piano.mp.screen === 'lobby' && __piano.mp.active, 30000), JSON.stringify(await A.p.evaluate(() => __piano.mp)));
  const code = await A.p.evaluate(() => __piano.mp.code); log('room', code);
  await B.p.evaluate(c => __piano.mpJoin(c), code);
  res('B joined', await until(B.p, () => __piano.mp.screen === 'lobby' && __piano.mp.players.length === 2, 30000), JSON.stringify(await B.p.evaluate(() => __piano.mp)));
  res('A sees Samir', await until(A.p, () => __piano.mp.players.some(p => p.name === 'Samir'), 20000), JSON.stringify(await A.p.evaluate(() => __piano.mp.players)));
  res('B sees Sara', await until(B.p, () => __piano.mp.players.some(p => p.name === 'Sara'), 20000), JSON.stringify(await B.p.evaluate(() => __piano.mp.players)));
  await A.p.evaluate(() => __piano.pickSong('mary'));
  res('B sees the song', await until(B.p, () => __piano.mp.song === 'mary', 15000));
  await A.p.screenshot({ path:'piano-live-lobby.png' });
  await A.p.evaluate(() => { __piano.auto = true; }); await B.p.evaluate(() => { __piano.auto = true; });
  await A.p.evaluate(() => __piano.mpStart());
  res('B started the same song', await until(B.p, () => __piano.mp.screen === 'in' && __piano.info().song === 'mary', 15000));
  res('same tiles', JSON.stringify(await A.p.evaluate(() => __piano.G.tiles.map(t => t.lane))) === JSON.stringify(await B.p.evaluate(() => __piano.G.tiles.map(t => t.lane))));
  await A.p.waitForTimeout(6000);
  res('A sees B score', await until(A.p, () => +__piano.oppText().score > 0 && __piano.oppText().name === 'Samir', 10000), JSON.stringify(await A.p.evaluate(() => __piano.oppText())));
  res('B sees A score', await until(B.p, () => +__piano.oppText().score > 0 && __piano.oppText().name === 'Sara', 10000), JSON.stringify(await B.p.evaluate(() => __piano.oppText())));
  await A.p.screenshot({ path:'piano-live-A.png' }); await B.p.screenshot({ path:'piano-live-B.png' });
  await B.p.evaluate(() => { __piano.auto = false; });
  res('A result', await until(A.p, () => __piano.mp.result, 60000), JSON.stringify(await A.p.evaluate(() => __piano.mp)));
  res('B result', await until(B.p, () => __piano.mp.result, 30000), JSON.stringify(await B.p.evaluate(() => __piano.mp)));
  const ra = await A.p.evaluate(() => __piano.mp.result), rb = await B.p.evaluate(() => __piano.mp.result);
  const idA = await A.p.evaluate(() => __piano.mp.id);
  res('same winner (A)', ra && rb && ra.winnerId === idA && rb.winnerId === idA && ra.win === 'me' && rb.win === 'opp' && ra.me === rb.opp && ra.opp === rb.me, JSON.stringify([ra, rb]));
  await A.p.screenshot({ path:'piano-live-result-A.png' });
  res('no /api/broadcast for gameplay', posts.length === 0, posts.length);
  res('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  log(fails ? 'FAILED ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
