/* «بيت عمّو زعلان» online co-op on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>) */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
const res = (n, c, ...a) => log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a);
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
  const A = await mk('A', 'Sara', 'prank3d/?host=1&room=' + room);
  await A.p.waitForFunction(() => window.__prank && __prank.mpScreen === 'lobby', null, { timeout:40000 }).catch(() => {});
  const codeA = await A.p.evaluate(() => __prank.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'prank3d/?join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __prank.mp.players.length === 2) && await B.p.evaluate(() => __prank.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__prank.mp)), 'err:', await B.p.evaluate(() => __prank.mpErr), 'rtlog:', await B.p.evaluate(() => (window.BoboRT && BoboRT._log || []).join(' / ')));
  if(!ok){ log('B console:', B.cons.join(' | ').slice(0, 1500)); }
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  const la = await A.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' ')), lb = await B.p.evaluate(() => document.querySelector('#card').innerText.replace(/\s+/g, ' '));
  res('lobby names', la.includes('Samir') && lb.includes('Sara'), la, '|', lb);
  await A.p.evaluate(() => __prank.mpLevel(6)); await A.p.waitForTimeout(1500);
  await A.p.evaluate(() => __prank.mpStart());
  ok = false;
  for(let i = 0; i < 20 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await B.p.evaluate(() => __prank.state === 'play' && __prank.co && __prank.level === 6); }
  res('start together (mission 7)', ok);
  await until(B.p, () => __prank.peers.length === 1 && __prank.peers[0].label === 'Sara', 20000);
  await until(A.p, () => __prank.peers.length === 1 && __prank.peers[0].visible, 20000);
  const pa = await A.p.evaluate(() => __prank.peers), pb = await B.p.evaluate(() => __prank.peers);
  res('both see each other with names', pa.length === 1 && pa[0].visible && pb.length === 1 && pb[0].visible && pa[0].label === 'Samir' && pb[0].label === 'Sara', JSON.stringify(pa), JSON.stringify(pb));
  if(!ok || !pa.length){ res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none'); await b.close(); return; }
  const b0 = await A.p.evaluate(() => __prank.peers[0]);
  await B.p.evaluate(() => { __prank.face(0); });
  await B.p.keyboard.down('ArrowUp'); await B.p.waitForTimeout(2500); await B.p.keyboard.up('ArrowUp'); await B.p.waitForTimeout(1500);
  const bme = await B.p.evaluate(() => __prank.player);
  await until(A.p, new Function('return (p => Math.hypot(p.tx - ' + bme.x + ', p.tz - ' + bme.z + ') < .05)(__prank.peers[0])'), 10000);
  await A.p.waitForTimeout(1500);
  const b1 = await A.p.evaluate(() => __prank.peers[0]);
  res('B moves, A sees it', Math.hypot(b1.x - b0.x, b1.z - b0.z) > .5 && Math.hypot(b1.x - bme.x, b1.z - bme.z) < .2, JSON.stringify([b0.x, b0.z]), JSON.stringify([b1.x, b1.z]), JSON.stringify([bme.x, bme.z]));
  // B picks a prank item and sets it; A sees both
  const bid = await B.p.evaluate(() => __prank.mp.id);
  await B.p.evaluate(() => { __prank.teleport('item0'); __prank.pos(); }); await B.p.waitForTimeout(1500); await B.p.evaluate(() => __prank.act());
  const picked = await until(A.p, new Function('return __prank.pranks[0].st === "held" && __prank.pranks[0].by === "' + bid + '"'), 15000);
  await until(B.p, () => __prank.held === 0, 10000);
  res('B picks up a prank item (A sees)', picked);
  await B.p.evaluate(() => { __prank.teleport('spot0'); __prank.pos(); }); await B.p.waitForTimeout(1500); await B.p.evaluate(() => __prank.act());
  const set = await until(A.p, () => __prank.pranks[0].st === 'set', 15000) && await until(B.p, () => __prank.pranks[0].st === 'set', 10000);
  res('B sets the prank for everyone', set);
  // the host's uncle goes off the prank: both phones play it
  await B.p.evaluate(() => { __prank.teleport(-14.5, -16, 1); __prank.pos(); }); await A.p.evaluate(() => { __prank.teleport(14.5, -16, 1); }); await B.p.waitForTimeout(1500);
  const id0 = await A.p.evaluate(() => __prank.pranks[0].id);
  await A.p.evaluate(id => __prank.uncleTo(id), id0); await A.p.evaluate(() => __prank.sim(1.5));
  const shared = await until(B.p, () => __prank.pranks[0].st === 'done', 15000);
  res('shared prank goes off on both phones', shared && await A.p.evaluate(() => __prank.pranks[0].st === 'done'));
  await A.p.evaluate(() => __prank.sim(4));
  // the uncle: same on both phones
  await A.p.evaluate(() => __prank.setUncle(2, -2, 1, 'search')); await A.p.waitForTimeout(3000);
  await until(B.p, () => Math.hypot(__prank.uncle.vx - 2, __prank.uncle.vz + 2) < 1.2, 12000);
  log('B rt log:', await B.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  const gA = await A.p.evaluate(() => __prank.uncle), gB = await B.p.evaluate(() => __prank.uncle);
  res('uncle the same on both', Math.hypot(gA.vx - gB.vx, gA.vz - gB.vz) < 1.2, JSON.stringify([gA.vx, gA.vz, gA.mode]), JSON.stringify([gB.vx, gB.vz, gB.mode]));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
