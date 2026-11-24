/* «حديقة الحارة» on the real server: the PUBLIC park. Two kids with server names open plain hara/ (no codes), land in the same
   public shard `bobo-hara-pub-<n>`, see each other with their server names, walk / swing / emote is synced,
   and nothing is sent through HTTP /api/broadcast. Then both go to the second park «حديقة الشجر الكبيرة» (its own shards
   `bobo-hara2-pub-<n>`) and see each other there. Then the private room flow (?host / ?join) still works and follows the host's park. */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
let fails = 0;
const res = (n, c, ...a) => { log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a); if(!c) fails++; };
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ try{ if(await p.evaluate(fn, arg)) return true; }catch(e){} await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
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
  for(const [n, K] of [['A', A], ['B', B]]) res(n + ' in the public park with no code', await until(K.p, () => window.__hara && __hara.state === 'menu' && __hara.pub.active, 40000), JSON.stringify(await K.p.evaluate(() => window.__hara && __hara.pub)));
  const shA = await A.p.evaluate(() => __hara.pub.shard), shB = await B.p.evaluate(() => __hara.pub.shard);
  res('same shard', shA === shB, shA, shB);
  await A.p.evaluate(() => __hara.play()); await B.p.evaluate(() => __hara.play());
  const W = await A.p.evaluate(() => __hara.world);
  await A.p.evaluate(C => __hara.tp(C.x, C.z + 6, Math.PI), W.C); await B.p.evaluate(C => __hara.tp(C.x + 1, C.z + 3, 0), W.C);
  const seeName = (p, nm) => until(p, nm => __hara.remotes.some(r => r.name === nm && r.vis), 30000, nm);
  res('A sees Samir (server name)', await seeName(A.p, 'Samir'), JSON.stringify(await A.p.evaluate(() => __hara.remotes)));
  res('B sees Sara (server name)', await seeName(B.p, 'Sara'), JSON.stringify(await B.p.evaluate(() => __hara.remotes)));
  res('mode chip', /حديقة الكل/.test(await A.p.textContent('#roomChip')), await A.p.textContent('#roomChip'));
  const idB = await B.p.evaluate(() => __hara.mp.id);
  const b0 = await A.p.evaluate(id => __hara.remotes.find(r => r.id === id), idB);
  await B.p.evaluate(() => __hara.input(0, -1)); await B.p.waitForTimeout(3000); await B.p.evaluate(() => __hara.input(null)); await A.p.waitForTimeout(1500);
  const b1 = await A.p.evaluate(id => __hara.remotes.find(r => r.id === id), idB), bp = await B.p.evaluate(() => __hara.P);
  res('walk synced', b0 && b1 && Math.hypot(b1.x - b0.x, b1.z - b0.z) > .3 && Math.hypot(b1.x - bp.x, b1.z - bp.z) < .6, JSON.stringify([b0, b1, bp]));
  await B.p.evaluate(s => { __hara.tp(s.x + .3, s.z + .3, 0); __hara.use(); }, W.swings[1]);
  for(let k = 0; k < 8; k++){ await B.p.evaluate(() => __hara.A()); await B.p.waitForTimeout(400); }
  res('swing seen', await until(A.p, id => { const r = __hara.remotes.find(r => r.id === id); return r && r.k === 'swing' && r.i === 1; }, 15000, idB));
  await B.p.evaluate(() => __hara.leave());
  await B.p.waitForTimeout(500); await B.p.evaluate(() => __hara.emote('party'));
  res('emote seen', await until(A.p, id => { const r = __hara.remotes.find(r => r.id === id); return r && r.emo === 'party' && /🎉/.test(r.bub || ''); }, 6000, idB));
  res('bots off with 2 kids', await A.p.evaluate(() => !__hara.pub.botsOn));
  /* the second park: both walk over, land in its own public shard and see each other there */
  await A.p.evaluate(() => __hara.goPlace(2)); await B.p.evaluate(() => __hara.goPlace(2));
  for(const [n, K] of [['A', A], ['B', B]]) res(n + ' in park 2 public shard', await until(K.p, () => __hara.place === 2 && __hara.pub.active, 40000), JSON.stringify(await K.p.evaluate(() => __hara.pub)));
  const W2 = await A.p.evaluate(() => __hara.world);
  await A.p.evaluate(C => __hara.tp(C.x + 3, C.z + 9, Math.PI), W2.C); await B.p.evaluate(C => __hara.tp(C.x + 2, C.z + 6, 0), W2.C);
  res('park 2: A sees Samir', await seeName(A.p, 'Samir'), JSON.stringify(await A.p.evaluate(() => __hara.remotes)));
  res('park 2: B sees Sara', await seeName(B.p, 'Sara'));
  res('park 2 chip', /حديقة الشجر الكبيرة/.test(await A.p.textContent('#roomChip')) && await A.p.evaluate(() => __hara.pub.kids === 2), await A.p.textContent('#roomChip'));
  await B.p.evaluate(s => { __hara.tp(s.x + .3, s.z + .3, 0); __hara.use(); }, W2.swings[0]);
  res('park 2 swing seen', await until(A.p, id => { const r = __hara.remotes.find(r => r.id === id); return r && r.k === 'swing' && r.i === 0 && r.vis; }, 15000, idB));
  await B.p.evaluate(() => __hara.leave()); await B.p.waitForTimeout(1600); await B.p.evaluate(() => __hara.emote('heart'));
  res('park 2 emote seen', await until(A.p, id => { const r = __hara.remotes.find(r => r.id === id); return r && r.emo === 'heart'; }, 6000, idB));
  await A.p.evaluate(() => __hara.goPlace(1));
  res('A back in park 1 does not see B', await until(A.p, id => __hara.place === 1 && __hara.pub.active && !__hara.remotes.some(r => r.id === id && r.vis), 40000, idB));
  /* the private room still works: B makes room, A joins with ?join */
  const room = String(1000 + Math.floor(Math.random() * 9000));
  await B.p.goto(SITE + 'hara/?q=0&host=1&room=' + room);
  res('B private room', await until(B.p, () => window.__hara && __hara.mpScreen === 'lobby', 40000), await B.p.evaluate(() => window.__hara && __hara.mp.code));
  res('A no longer sees B in the public park', await until(A.p, id => !__hara.remotes.some(r => r.id === id), 40000, idB));
  await A.p.goto(SITE + 'hara/?q=0&join=' + room);
  res('A joined the room', await until(A.p, () => window.__hara && __hara.mpScreen === 'lobby' && __hara.mp.players.length === 2, 40000));
  await A.p.evaluate(() => __hara.mpGo()); await B.p.evaluate(() => __hara.mpGo());
  await A.p.evaluate(C => __hara.tp(C.x, C.z + 6, Math.PI), W.C); await B.p.evaluate(C => __hara.tp(C.x + 1, C.z + 3, 0), W.C);
  res('room: names over heads', await seeName(A.p, 'Samir') && await seeName(B.p, 'Sara'));
  await B.p.evaluate(() => __hara.goPlace(2, true));
  res('room: A follows the host to park 2', await until(A.p, () => __hara.place === 2, 20000));
  await A.p.waitForTimeout(800); const W3 = await A.p.evaluate(() => __hara.world);
  await A.p.evaluate(C => __hara.tp(C.x + 3, C.z + 9, Math.PI), W3.C); await B.p.evaluate(C => __hara.tp(C.x + 2, C.z + 6, 0), W3.C);
  res('room in park 2: names over heads', await seeName(A.p, 'Samir') && await seeName(B.p, 'Sara'));
  res('room chip', /غرفة/.test(await A.p.textContent('#roomChip')) && (await A.p.textContent('#roomChip')).includes(room), await A.p.textContent('#roomChip'));
  log('A rt log:', await A.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  log('SUMMARY live: ' + (fails ? fails + ' FAIL' : 'ALL PASS'));
  await b.close();
  process.exitCode = fails ? 1 : 0;
})();
