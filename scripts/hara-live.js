/* «حديقة الحارة» food on the real server: two kids with server names open plain hara/ (public shard `bobo-hara-pub-<n>`),
   A buys a cola at the fizzy drinks cart → B sees A holding it; both order at «مطعم الحديقة», sit at the same table and
   eat → each sees the other sitting, holding the tray and eating, and the 😋 bubble when done. Only item numbers travel,
   nothing goes through HTTP /api/broadcast, no page errors. */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
let fails = 0;
const res = (n, c, ...a) => { log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a); if(!c) fails++; };
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ try{ if(await p.evaluate(fn, arg)) return true; }catch(e){} await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'] });
  const errs = [], posts = [];
  const mk = async (n, name, path) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], viewport:{ width:800, height:370 }, locale:'ar' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if(/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + path);
    return { p, ctx, me };
  };
  const A = await mk('A', 'Sara', 'hara/?q=0'), B = await mk('B', 'Samir', 'hara/?q=0');
  for(const [n, K] of [['A', A], ['B', B]]) res(n + ' in the public park', await until(K.p, () => window.__hara && __hara.state === 'menu' && __hara.pub.active, 40000), JSON.stringify(await K.p.evaluate(() => window.__hara && __hara.pub)));
  res('same shard', await A.p.evaluate(() => __hara.pub.shard) === await B.p.evaluate(() => __hara.pub.shard));
  await A.p.evaluate(() => __hara.play()); await B.p.evaluate(() => __hara.play());
  const F = await A.p.evaluate(() => __hara.food), c = F.carts[0], cf = F.cafe;
  res('4 carts and the café', F.carts.length === 4 && F.cafe.seats.length >= 8, JSON.stringify(F.carts.map(c => c.k)));
  for(const K of [A, B]) await K.p.evaluate(() => __hara.setCoins(20));
  await A.p.evaluate(c => { __hara.tp(c.ux, c.uz); __hara.use(); }, c); await A.p.waitForTimeout(300);
  res('A bought a cola', await A.p.evaluate(() => __hara.buy('cola') && __hara.hold.k === 'cola' && __hara.coins === 18));
  await B.p.evaluate(c => { __hara.tp(c.ux + 1.5, c.uz + 1.2); __hara.face(c.ux, c.uz); }, c);
  const idA = await A.p.evaluate(() => __hara.mp.id), idB = await B.p.evaluate(() => __hara.mp.id);
  res('B sees Sara holding a cola', await until(B.p, id => __hara.remotes.some(r => r.id === id && r.name === 'Sara' && r.hold === __hara.items.indexOf('cola') && r.held), 30000, idA), JSON.stringify(await B.p.evaluate(() => __hara.remotes)));
  await A.p.evaluate(() => { __hara.tp(4, 12.5, 0); __hara.bite(); });
  res('B sees Sara sipping', await until(B.p, id => __hara.remotes.some(r => r.id === id && r.eat === 1), 10000, idA));
  // both order at the café counter and sit at the same table
  for(const [K, it] of [[A, 'pizza'], [B, 'burger']]){ await K.p.evaluate(c => { __hara.tp(c.counter.x, c.counter.z); __hara.use(); }, cf); await K.p.waitForTimeout(300); await K.p.evaluate(it => __hara.buy(it), it); }
  res('both paid with their own coins', await A.p.evaluate(() => __hara.coins === 14) && await B.p.evaluate(() => __hara.coins === 15));
  await A.p.evaluate(s => { __hara.tp(s.x - .5, s.z); __hara.start('seat', 2); }, cf.seats[2]);
  await B.p.evaluate(s => { __hara.tp(s.x + .5, s.z); __hara.start('seat', 3); }, cf.seats[3]);
  res('B sees Sara sitting at the table eating pizza', await until(B.p, id => __hara.remotes.some(r => r.id === id && r.k === 'seat' && r.i === 2 && r.hold === __hara.items.indexOf('pizza') && r.eat === 1 && r.vis), 30000, idA), JSON.stringify(await B.p.evaluate(() => __hara.remotes)));
  res('A sees Samir sitting at the table eating a burger', await until(A.p, id => __hara.remotes.some(r => r.id === id && r.k === 'seat' && r.i === 3 && r.hold === __hara.items.indexOf('burger') && r.eat === 1 && r.vis), 30000, idB));
  res('B sees the 😋 when Sara finishes', await until(B.p, id => __hara.remotes.some(r => r.id === id && r.last === 'yum'), 150000, idA));
  res('A sees the 😋 when Samir finishes', await until(A.p, id => __hara.remotes.some(r => r.id === id && r.last === 'yum'), 60000, idB));
  res('no /api/broadcast for gameplay', posts.length === 0, posts.length);
  res('no page errors', errs.length === 0, errs.join(' | '));
  await b.close();
  log(fails ? 'FAILED ' + fails : 'ALL PASS');
  process.exit(fails ? 1 : 0);
})();
