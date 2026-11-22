/* «بوبو الصغير» online on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>),
   names in the lobby and over heads, positions synced in the same place, a jump seen by the friend, hidden in another place, leave */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
let fails = 0;
const res = (n, c, ...a) => { log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a); if(!c) fails++; };
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
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); localStorage.setItem('tiny_save', JSON.stringify({ v:1, tut:1 })); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + path);
    return { p, ctx, me };
  };
  const A = await mk('A', 'Sara', 'tiny/?q=0&host=1&room=' + room);
  await until(A.p, () => window.__tiny && __tiny.mpScreen === 'lobby', 40000);
  const codeA = await A.p.evaluate(() => __tiny.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'tiny/?q=0&join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __tiny.mp.players.length === 2) && await B.p.evaluate(() => __tiny.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__tiny.mp)), 'err:', await B.p.evaluate(() => __tiny.mpErr));
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  await until(A.p, () => document.querySelector('#card').innerText.includes('Samir'), 20000);
  res('lobby names', (await A.p.evaluate(() => document.querySelector('#card').innerText)).includes('Samir') && (await B.p.evaluate(() => document.querySelector('#card').innerText)).includes('Sara'));
  await A.p.evaluate(() => __tiny.mpGo()); await B.p.evaluate(() => __tiny.mpGo());
  res('both play', await until(A.p, () => __tiny.state === 'play', 20000) && await until(B.p, () => __tiny.state === 'play', 20000));
  await A.p.waitForTimeout(1500);
  await A.p.evaluate(() => { __tiny.load('hub'); __tiny.tp(-1, 0, -6); __tiny.face(-1, 6); }); await B.p.evaluate(() => { __tiny.load('hub'); __tiny.tp(1, 0, -4); __tiny.face(-1, -6); });
  await until(A.p, () => (__tiny.remotes[0] || {}).name === 'Samir', 20000);
  await until(B.p, () => (__tiny.remotes[0] || {}).name === 'Sara', 20000);
  const ra = await A.p.evaluate(() => __tiny.remotes), rb = await B.p.evaluate(() => __tiny.remotes);
  res('names over heads', ra.length === 1 && rb.length === 1 && ra[0].name === 'Samir' && rb[0].name === 'Sara' && ra[0].vis && rb[0].vis, JSON.stringify(ra), JSON.stringify(rb));
  res('position synced', ra[0] && Math.hypot(ra[0].x - 1, ra[0].z + 4) < 1.5, JSON.stringify(ra[0]));
  await B.p.evaluate(() => __tiny.A());
  res('friend sees the jump', await until(A.p, () => (__tiny.remotes[0] || {}).y > .8, 10000));
  await B.p.evaluate(() => __tiny.relA());
  await B.p.evaluate(() => __tiny.load('down', 'front'));
  res('other place: friend hidden', await until(A.p, () => __tiny.remotes[0] && !__tiny.remotes[0].vis, 10000));
  await A.p.evaluate(() => __tiny.load('down', 'front'));
  res('same place: friend visible', await until(A.p, () => __tiny.remotes[0] && __tiny.remotes[0].vis && __tiny.remotes[0].area === 'down', 15000));
  await B.p.evaluate(() => __tiny.mpLeave());
  res('friend leaves', await until(A.p, () => __tiny.remotes.length === 0, 40000));
  log('A rt log:', await A.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  log('SUMMARY live: ' + (fails ? fails + ' FAIL' : 'ALL PASS'));
  await b.close();
  process.exitCode = fails ? 1 : 0;
})();
