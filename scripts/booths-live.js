/* «بسطات بوبو» on the real server: two kids with server names open plain booths/ (public shard `bobo-booths-pub-<n>`),
   see each other, each takes a different free booth (the host's table agrees on both phones), B gives A's booth a ❤️ and
   A gives B's booth a 🌟 → the counters go up on both phones, the owner sees «<name> أعطاك …», the «🏆» board lists both.
   Only realtime messages, nothing through HTTP /api/broadcast, no page errors. */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
let fails = 0;
const res = (n, c, ...a) => { log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a); if(!c) fails++; };
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ try{ if(await p.evaluate(fn, arg)) return true; }catch(e){} await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'] });
  const errs = [], posts = [];
  const mk = async (n, name) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], viewport:{ width:800, height:370 }, locale:'ar' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if(/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + 'booths/?q=0');
    return { p, ctx, me };
  };
  const A = await mk('A', 'Sara'), B = await mk('B', 'Samir');
  for(const [n, K] of [['A', A], ['B', B]]) res(n + ' on the public plaza', await until(K.p, () => window.__booths && __booths.state === 'menu' && __booths.pub.active, 40000), JSON.stringify(await K.p.evaluate(() => window.__booths && __booths.pub)));
  res('same shard', await A.p.evaluate(() => __booths.pub.shard) === await B.p.evaluate(() => __booths.pub.shard));
  await A.p.evaluate(() => __booths.play()); await B.p.evaluate(() => __booths.hero('samir')); await B.p.evaluate(() => __booths.play());
  const idA = await A.p.evaluate(() => __booths.mp.id), idB = await B.p.evaluate(() => __booths.mp.id);
  res('A sees Samir', await until(A.p, id => __booths.remotes.some(r => r.id === id && r.who === 'Samir'), 30000, idB), JSON.stringify(await A.p.evaluate(() => __booths.remotes)));
  res('B sees Sara', await until(B.p, id => __booths.remotes.some(r => r.id === id && r.who === 'Sara'), 30000, idA));
  // both get the table from the host, then each takes a different free booth
  await A.p.waitForTimeout(3000);
  const bA = await A.p.evaluate(() => __booths.booths.findIndex(e => !e));
  await A.p.evaluate(b => __booths.claim(b, 1, 0, 0), bA);
  res('A owns booth ' + bA, await until(A.p, () => __booths.myBooth >= 0, 15000), JSON.stringify(await A.p.evaluate(() => __booths.booths)));
  res('B sees A\'s booth (Sara)', await until(B.p, b => __booths.booths[b] && __booths.booths[b].name === 'Sara', 15000, bA), JSON.stringify(await B.p.evaluate(b => __booths.booths[b], bA)));
  const bB = await B.p.evaluate(a => __booths.booths.findIndex((e, i) => !e && i !== a), bA);
  await B.p.evaluate(b => __booths.claim(b, 4, 3, 2), bB);
  res('B owns booth ' + bB, await until(B.p, b => __booths.myBooth === b, 15000, bB));
  res('A sees B\'s booth (Samir)', await until(A.p, b => __booths.booths[b] && __booths.booths[b].name === 'Samir', 15000, bB));
  res('different booths, one owner each', await A.p.evaluate(([a, b]) => __booths.booths[a].mine && !__booths.booths[b].mine, [bA, bB]) && await B.p.evaluate(([a, b]) => !__booths.booths[a].mine && __booths.booths[b].mine, [bA, bB]));
  // B visits A's booth and gives a heart
  const hA0 = await A.p.evaluate(b => __booths.booths[b].h, bA);
  await B.p.evaluate(b => { const s = __booths.spot(b, 'front'); __booths.tp(s.x, s.z, s.f); }, bA); await B.p.waitForTimeout(500);
  res('B at A\'s booth: gift bar', await B.p.evaluate(b => __booths.giftTarget === b && __booths.giftsShown, bA));
  res('B gives ❤️', await B.p.evaluate(b => __booths.give(b, 'heart'), bA));
  res('A counter +1 on A', await until(A.p, ([b, h]) => __booths.booths[b].h === h + 1, 15000, [bA, hA0]), JSON.stringify(await A.p.evaluate(b => __booths.booths[b], bA)));
  res('A counter +1 on B', await until(B.p, ([b, h]) => __booths.booths[b].h === h + 1, 15000, [bA, hA0]));
  res('A sees «Samir أعطاك ❤️»', await until(A.p, () => /Samir/.test(__booths.giftNote || ''), 6000), await A.p.evaluate(() => __booths.giftNote));
  res('A lifetime hearts saved', await A.p.evaluate(() => __booths.life >= 1));
  res('second gift within 10 s refused', !(await B.p.evaluate(b => __booths.give(b, 'star'), bA)));
  // A visits B's booth and gives a star
  const hB0 = await B.p.evaluate(b => __booths.booths[b].h, bB);
  await A.p.evaluate(b => { const s = __booths.spot(b, 'front'); __booths.tp(s.x, s.z, s.f); }, bB); await A.p.waitForTimeout(500);
  res('A gives 🌟', await A.p.evaluate(b => __booths.give(b, 'star'), bB));
  res('B counter +1 on B', await until(B.p, ([b, h]) => __booths.booths[b].h === h + 1, 15000, [bB, hB0]));
  res('B counter +1 on A', await until(A.p, ([b, h]) => __booths.booths[b].h === h + 1, 15000, [bB, hB0]));
  res('B sees «Sara أعطاك 🌟»', await until(B.p, () => /Sara/.test(__booths.giftNote || ''), 6000), await B.p.evaluate(() => __booths.giftNote));
  res('board lists both', await until(A.p, () => ['Sara', 'Samir'].every(n => __booths.board.some(r => r.name === n)), 10000), JSON.stringify(await A.p.evaluate(() => __booths.board)));
  // an emote and the golf cart
  await A.p.evaluate(() => __booths.emote('wave'));
  res('B sees A wave', await until(B.p, id => __booths.remotes.some(r => r.id === id && r.last === 'wave'), 10000, idA));
  const c0 = await B.p.evaluate(() => __booths.carts[1]);
  await B.p.evaluate(c => __booths.tp(c.x - 1.6, c.z), c0); await B.p.waitForTimeout(300);
  res('B hops in the cart', await B.p.evaluate(() => __booths.enterCart(1)));
  await B.p.evaluate(() => __booths.input(0, -1)); await B.p.waitForTimeout(4000); await B.p.evaluate(() => __booths.input(null));
  res('A sees B driving the cart', await until(A.p, id => __booths.carts[1].by === id, 10000, idB), JSON.stringify(await A.p.evaluate(() => __booths.carts)));
  await A.p.screenshot({ path:'booths-live-A.png' }); await B.p.screenshot({ path:'booths-live-B.png' });
  // B leaves: the host frees B's booth
  await B.ctx.close();
  res('B\'s booth freed after B left', await until(A.p, b => !__booths.booths[b] || __booths.booths[b].name !== 'Samir', 45000, bB));
  res('no /api/broadcast for gameplay', posts.length === 0, posts.length);
  res('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  log(fails ? 'FAILED ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
