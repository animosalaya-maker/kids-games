/* «سباق بوبو» online race on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>),
   both see each other with names, the start is synced, both finish and get the same order */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
const res = (n, c, ...a) => log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a);
const until = async (p, fn, ms = 15000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn)) return true; await p.waitForTimeout(400); } return false; };
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
  const A = await mk('A', 'Sara', 'kart/?host=1&room=' + room);
  await until(A.p, () => window.__kart && __kart.mpScreen === 'lobby', 40000);
  const codeA = await A.p.evaluate(() => __kart.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'kart/?join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __kart.mp.players.length === 2) && await B.p.evaluate(() => __kart.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__kart.mp)), 'err:', await B.p.evaluate(() => __kart.mpErr), 'rtlog:', await B.p.evaluate(() => (window.BoboRT && BoboRT._log || []).join(' / ')));
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  await until(A.p, () => document.querySelector('#card').innerText.includes('Samir'), 20000);
  const la = await A.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' ')), lb = await B.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' '));
  res('lobby names', la.includes('Samir') && lb.includes('Sara'), la.slice(0, 120), '|', lb.slice(0, 120));
  // the host picks the track; the friend sees it
  await A.p.evaluate(() => __kart.mpTrackPick('candy'));
  res('friend sees the track', await until(B.p, () => __kart.mp.track === 'candy', 10000));
  await A.p.evaluate(() => __kart.mpStart());
  ok = await until(B.p, () => __kart.online && __kart.phase === 'go', 120000) && await until(A.p, () => __kart.phase === 'go', 30000);
  const [ta, tb] = await Promise.all([A.p.evaluate(() => __kart.t), B.p.evaluate(() => __kart.t)]);
  res('synced start', ok && Math.abs(ta - tb) < 1.2, ta.toFixed(2), tb.toFixed(2), await B.p.evaluate(() => __kart.track));
  await Promise.all([A.p.evaluate(() => __kart.ctl({ auto:true })), B.p.evaluate(() => __kart.ctl({ auto:true }))]);
  await until(A.p, () => (__kart.karts.find(k => k.kind === 'net') || {}).name === 'Samir', 20000);
  await until(B.p, () => (__kart.karts.find(k => k.kind === 'net') || {}).name === 'Sara', 20000);
  const ka = await A.p.evaluate(() => __kart.karts.filter(k => k.kind === 'net')), kb = await B.p.evaluate(() => __kart.karts.filter(k => k.kind === 'net'));
  res('both see each other with names', ka.length === 1 && kb.length === 1 && ka[0].name === 'Samir' && kb[0].name === 'Sara', JSON.stringify(ka.map(k => [k.name, k.x, k.z])), JSON.stringify(kb.map(k => [k.name, k.x, k.z])));
  await until(B.p, () => __kart.me.prog > .03, 60000); await A.p.waitForTimeout(1500);
  const [bme, bOnA] = await Promise.all([B.p.evaluate(() => __kart.me), A.p.evaluate(() => __kart.karts.find(k => k.kind === 'net'))]);
  res('B drives, A sees it', bOnA && Math.hypot(bme.x - bOnA.x, bme.z - bOnA.z) < 12 && bme.prog > 0, Math.hypot(bme.x - bOnA.x, bme.z - bOnA.z).toFixed(2), bme.prog);
  const cA = await A.p.evaluate(() => __kart.karts.filter(k => k.kind === 'cpu').map(k => [k.x, k.z])), cB = await B.p.evaluate(() => __kart.karts.filter(k => k.kind === 'cpu').map(k => [k.x, k.z]));
  res('computer karts the same on both', cA.length === cB.length && cA.every((c, i) => Math.hypot(c[0] - cB[i][0], c[1] - cB[i][1]) < 15), JSON.stringify(cA.map((c, i) => Math.hypot(c[0] - cB[i][0], c[1] - cB[i][1]).toFixed(1))));
  await B.p.evaluate(() => { __kart.give('banana'); __kart.use(); });
  res('item seen by the friend', await until(A.p, () => __kart.netDrops > 0, 10000));
  await Promise.all([A.p.evaluate(() => __kart.speed(4)), B.p.evaluate(() => __kart.speed(4))]);
  const fin = await Promise.all([until(A.p, () => __kart.state === 'podium', 420000), until(B.p, () => __kart.state === 'podium', 420000)]);
  const fa = await A.p.evaluate(() => __kart.final), fb = await B.p.evaluate(() => __kart.final);
  res('both finish with the same order', fin[0] && fin[1] && fa && fb && JSON.stringify(fa.map(x => x.id)) === JSON.stringify(fb.map(x => x.id)), JSON.stringify((fa || []).map(x => x.id + ':' + x.finT)), '|', JSON.stringify((fb || []).map(x => x.id + ':' + x.finT)));
  await A.p.evaluate(() => __kart.mpAgain());
  res('back to the lobby together', await until(B.p, () => __kart.mpScreen === 'lobby', 15000));
  log('B rt log:', await B.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
