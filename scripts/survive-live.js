/* «البقاء بالجزيرة المهجورة» online on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>),
   names in the lobby and over heads, shared tree chop, raft progress synced, laser tag, both reach the ship together */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
const res = (n, c, ...a) => log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a);
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn, arg)) return true; await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const errs = [], posts = [];
  const room = String(1000 + Math.floor(Math.random() * 9000));
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
  const A = await mk('A', 'Sara', 'survive/?nointro=1&host=1&room=' + room);
  await until(A.p, () => window.__surv && __surv.mpScreen === 'lobby', 40000);
  const codeA = await A.p.evaluate(() => __surv.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'survive/?nointro=1&join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __surv.mp.players.length === 2) && await B.p.evaluate(() => __surv.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__surv.mp)), 'err:', await B.p.evaluate(() => __surv.mpErr));
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  await until(A.p, () => document.querySelector('#card').innerText.includes('Samir'), 20000);
  res('lobby names', (await A.p.evaluate(() => document.querySelector('#card').innerText)).includes('Samir') && (await B.p.evaluate(() => document.querySelector('#card').innerText)).includes('Sara'));
  await A.p.evaluate(() => __surv.mpDiff('easy'));
  res('friend sees the difficulty', await until(B.p, () => __surv.mp.diff === 'easy', 10000));
  await A.p.evaluate(() => __surv.mpStart());
  ok = await until(B.p, () => __surv.state === 'play' && __surv.phase === 'build', 60000) && await until(A.p, () => __surv.state === 'play', 20000);
  res('both start', ok);
  const W = await A.p.evaluate(() => __surv.world), tree = W.trees[3];
  await A.p.evaluate(t => { __surv.tp(t.x + 1.5, t.z); __surv.face(t.x, t.z); }, tree);
  await B.p.evaluate(t => { __surv.tp(t.x - 1.5, t.z); __surv.face(t.x, t.z); }, tree);
  await until(A.p, () => (__surv.remotes[0] || {}).name === 'Samir', 20000);
  await until(B.p, () => (__surv.remotes[0] || {}).name === 'Sara', 20000);
  const ra = await A.p.evaluate(() => __surv.remotes), rb = await B.p.evaluate(() => __surv.remotes);
  res('names over heads', ra.length === 1 && rb.length === 1 && ra[0].name === 'Samir' && rb[0].name === 'Sara', JSON.stringify(ra), JSON.stringify(rb));
  for(let k = 0; k < 2; k++){ await A.p.evaluate(() => __surv.A()); await A.p.waitForTimeout(1000); }
  await until(B.p, () => __surv.ws.tr[3] < 6, 10000);
  for(let k = 0; k < 3; k++){ await B.p.evaluate(() => __surv.A()); await B.p.waitForTimeout(1000); }
  const fell = await until(A.p, () => __surv.ws.tr[3] === 0, 10000) && await until(B.p, () => __surv.ws.tr[3] === 0, 10000);
  await until(B.p, () => (__surv.inv.wood || 0) > 0, 8000);
  res('shared tree chop', fell && (await A.p.evaluate(() => __surv.inv.wood || 0)) > 0 && (await B.p.evaluate(() => __surv.inv.wood || 0)) > 0);
  const R = W.raft;
  await B.p.evaluate(r => { const c = __surv.costs().raft[0]; for(const k in c) __surv.give(k, c[k]); __surv.tp(r.x - 2.6, r.z - 1); __surv.face(r.x, r.z); }, R);
  await B.p.waitForTimeout(500); await B.p.evaluate(() => __surv.A());
  res('raft progress synced', await until(A.p, () => __surv.raft.st === 1, 10000) && await until(B.p, () => __surv.raft.st === 1, 10000));
  await A.p.evaluate(() => __surv.giveBlaster());
  const cf = W.fire;
  await A.p.evaluate(c => { __surv.tp(c.x + 6, c.z + 3); __surv.face(c.x, c.z + 3); }, cf);
  await B.p.evaluate(c => { __surv.tp(c.x, c.z + 3); }, cf);
  await A.p.waitForTimeout(3000);
  await A.p.evaluate(() => __surv.fireNow());
  res('laser tag reaches the friend', await until(B.p, () => __surv.blaster.tagged > 0, 10000) && await until(A.p, () => Object.values(__surv.blaster.tags).includes(1), 8000));
  await until(B.p, () => __surv.blaster.tagged === 0, 15000);
  for(const st of [1, 2, 3]){ await A.p.evaluate(([r, st]) => { const c = __surv.costs().raft[st]; for(const k in c) __surv.give(k, c[k]); __surv.tp(r.x + 2.6, r.z - 1); __surv.face(r.x, r.z); }, [R, st]); await A.p.waitForTimeout(500); await A.p.evaluate(() => __surv.A()); await until(A.p, s => __surv.raft.st === s + 1, 10000, st); }
  await A.p.evaluate(r => { __surv.tp(r.x + 2.4, r.z - 1); __surv.face(r.x, r.z); }, R);
  await B.p.evaluate(r => { __surv.tp(r.x - 2.4, r.z - 1); __surv.face(r.x, r.z); }, R);
  await until(B.p, () => __surv.raft.st === 4, 10000); await B.p.waitForTimeout(800);
  await A.p.evaluate(() => __surv.A()); await B.p.evaluate(() => __surv.A());
  res('sail together', await until(A.p, () => __surv.phase === 'sail', 40000) && await until(B.p, () => __surv.phase === 'sail', 20000));
  await A.p.evaluate(() => __surv.speed(4));
  const fin = await Promise.all([until(A.p, () => __surv.end && __surv.end.card, 300000), until(B.p, () => __surv.end && __surv.end.card, 300000)]);
  const ea = await A.p.evaluate(() => __surv.end), eb = await B.p.evaluate(() => __surv.end);
  res('both reach the ship together', fin[0] && fin[1] && ea && eb && ea.team.length === 2 && eb.team.length === 2, JSON.stringify(ea), JSON.stringify(eb));
  await A.p.evaluate(() => __surv.mpAgain());
  res('back to the lobby together', await until(B.p, () => __surv.mpScreen === 'lobby', 20000));
  log('B rt log:', await B.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
