/* «بيت الجدّة نونا» online co-op on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>) */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
const res = (n, c, ...a) => log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a);
/* poll a page condition for up to ms */
const until = async (p, fn, ms = 15000) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn)) return true; await p.waitForTimeout(500); } return false; };
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const errs = [], posts = [];
  const room = String(1000 + Math.floor(Math.random() * 9000));
  const mk = async (n, name, path) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], viewport:{ width:800, height:370 }, locale:'ar' }); const p = await ctx.newPage();
    const cons = []; p.on('console', m => cons.push(m.type() + ':' + m.text())); p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if (/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + path);
    return { p, ctx, me, cons };
  };
  const A = await mk('A', 'Sara', 'granny/?host=1&room=' + room);
  await A.p.waitForFunction(() => window.__granny && __granny.mpScreen === 'lobby', null, { timeout:40000 }).catch(() => {});
  const codeA = await A.p.evaluate(() => __granny.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'granny/?join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __granny.mp.players.length === 2) && await B.p.evaluate(() => __granny.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__granny.mp)), 'err:', await B.p.evaluate(() => __granny.mpErr), 'rtlog:', await B.p.evaluate(() => (window.BoboRT && BoboRT._log || []).join(' / ')));
  if(!ok){ log('B console:', B.cons.join(' | ').slice(0, 1500)); }
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  const la = await A.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' ')), lb = await B.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' '));
  res('lobby names', la.includes('Samir') && lb.includes('Sara'), la, '|', lb);
  await A.p.evaluate(() => __granny.mpStart());
  ok = false;
  for(let i = 0; i < 20 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await B.p.evaluate(() => __granny.state === 'play' && __granny.co); }
  res('start together', ok);
  await until(B.p, () => __granny.peers.length === 1 && __granny.peers[0].label === 'Sara', 20000);
  await until(A.p, () => __granny.peers.length === 1 && __granny.peers[0].visible, 20000);
  const pa = await A.p.evaluate(() => __granny.peers), pb = await B.p.evaluate(() => __granny.peers);
  res('both see each other with names', pa.length === 1 && pa[0].visible && pb.length === 1 && pb[0].visible && pa[0].label === 'Samir' && pb[0].label === 'Sara', JSON.stringify(pa), JSON.stringify(pb));
  if(!ok || !pa.length){ res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none'); await b.close(); return; }
  const b0 = await A.p.evaluate(() => __granny.peers[0]);
  await B.p.evaluate(() => { __granny.teleport('hall'); __granny.face(Math.PI); });
  await B.p.keyboard.down('ArrowUp'); await B.p.waitForTimeout(2500); await B.p.keyboard.up('ArrowUp'); await B.p.waitForTimeout(1500);
  const bme = await B.p.evaluate(() => __granny.player);
  await until(A.p, new Function('return (p => Math.hypot(p.tx - ' + bme.x + ', p.tz - ' + bme.z + ') < .05)(__granny.peers[0])'), 10000);
  await A.p.waitForTimeout(1500);
  const b1 = await A.p.evaluate(() => __granny.peers[0]);
  res('B moves, A sees it', Math.hypot(b1.x - b0.x, b1.z - b0.z) > .5 && Math.hypot(b1.x - bme.x, b1.z - bme.z) < .2, JSON.stringify([b0.x, b0.z]), JSON.stringify([b1.x, b1.z]), JSON.stringify([bme.x, bme.z]));
  // B picks up the pliers, A sees them in B's hands; B opens the chain lock for everyone
  await B.p.evaluate(() => { __granny.teleport('pliers'); __granny.pos(); }); await B.p.waitForTimeout(1500); await B.p.evaluate(() => __granny.act());
  const bid0 = await B.p.evaluate(() => __granny.mp.id); await until(A.p, new Function('return __granny.itemsBy.pliers === "' + bid0 + '"'), 15000);
  await until(B.p, () => __granny.held === 'pliers', 10000);
  const bid = await B.p.evaluate(() => __granny.mp.id);
  res('B picks up the pliers (A sees)', (await A.p.evaluate(() => __granny.itemsBy)).pliers === bid);
  await B.p.evaluate(() => { __granny.teleport('door'); __granny.pos(); }); await B.p.waitForTimeout(1500); log('B before door:', JSON.stringify(await B.p.evaluate(() => ({ held:__granny.held, ctx:__granny.ctx, st:__granny.state, pl:__granny.player }))));
  await B.p.evaluate(() => __granny.act()); await until(A.p, () => __granny.locks.chain, 15000); await until(B.p, () => __granny.locks.chain, 10000);
  res('B opens a lock for everyone', (await A.p.evaluate(() => __granny.locks)).chain && (await B.p.evaluate(() => __granny.locks)).chain);
  // grandma: same on both phones
  await A.p.evaluate(() => __granny.setGrandma(2, -2, 1, 'wander')); await A.p.waitForTimeout(3000);
  const gA = await A.p.evaluate(() => __granny.grandma), gB = await B.p.evaluate(() => __granny.grandma);
  res('grandma the same on both', Math.hypot(gA.x - gB.x, gA.z - gB.z) < 1.2, JSON.stringify([gA.x, gA.z, gA.mode]), JSON.stringify([gB.x, gB.z, gB.mode]));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
