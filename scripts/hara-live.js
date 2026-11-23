/* «حديقة الحارة» online on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>),
   names in the lobby and over heads, positions synced, the friend seen swinging and sliding, seesaw together, leave */
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
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + path);
    return { p, ctx, me };
  };
  const A = await mk('A', 'Sara', 'hara/?q=0&host=1&room=' + room);
  await until(A.p, () => window.__hara && __hara.mpScreen === 'lobby', 40000);
  const codeA = await A.p.evaluate(() => __hara.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'hara/?q=0&join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __hara.mp.players.length === 2) && await B.p.evaluate(() => __hara.mpScreen === 'lobby'); }
  res('join', ok, await B.p.evaluate(() => JSON.stringify(__hara.mp)), 'err:', await B.p.evaluate(() => __hara.mpErr));
  await until(B.p, () => document.querySelector('#card').innerText.includes('Sara'), 20000);
  await until(A.p, () => document.querySelector('#card').innerText.includes('Samir'), 20000);
  res('lobby names', (await A.p.evaluate(() => document.querySelector('#card').innerText)).includes('Samir') && (await B.p.evaluate(() => document.querySelector('#card').innerText)).includes('Sara'));
  await A.p.evaluate(() => __hara.mpGo()); await B.p.evaluate(() => __hara.mpGo());
  res('both play', await until(A.p, () => __hara.state === 'play', 20000) && await until(B.p, () => __hara.state === 'play', 20000));
  await A.p.waitForTimeout(1500);
  await A.p.evaluate(() => { __hara.tp(4, 17, Math.PI); }); await B.p.evaluate(() => { __hara.tp(6, 14, 0); });
  await until(A.p, () => (__hara.remotes[0] || {}).name === 'Samir', 20000);
  await until(B.p, () => (__hara.remotes[0] || {}).name === 'Sara', 20000);
  const ra = await A.p.evaluate(() => __hara.remotes), rb = await B.p.evaluate(() => __hara.remotes);
  res('names over heads', ra.length === 1 && rb.length === 1 && ra[0].name === 'Samir' && rb[0].name === 'Sara' && ra[0].vis && rb[0].vis, JSON.stringify(ra), JSON.stringify(rb));
  res('position synced', ra[0] && Math.hypot(ra[0].x - 6, ra[0].z - 14) < 1.5, JSON.stringify(ra[0]));
  const W = await A.p.evaluate(() => __hara.world);
  await B.p.evaluate(s => { __hara.tp(s.x + .3, s.z + .3, 0); __hara.use(); }, W.swings[1]);
  for(let k = 0; k < 10; k++){ await B.p.evaluate(() => __hara.A()); await B.p.waitForTimeout(400); }
  res('friend seen swinging', await until(A.p, () => { const r = __hara.remotes[0]; return r && r.k === 'swing' && r.i === 1 && Math.abs(__hara.world.swings[1].ang) > .2; }, 15000), JSON.stringify(await A.p.evaluate(() => __hara.remotes[0])));
  await B.p.evaluate(() => __hara.leave());
  await B.p.evaluate(s => { __hara.tp(s.top.x, s.top.z, 0); __hara.use(); }, W.slides[0]);
  res('friend seen sliding', await until(A.p, () => { const r = __hara.remotes[0]; return r && r.k === 'slide'; }, 10000));
  await until(B.p, () => !__hara.P.act, 15000);
  const S = W.seesaw;
  await A.p.evaluate(S => { __hara.tp(S.x - Math.cos(.25) * 1.6, S.z + Math.sin(.25) * 1.6, 0); __hara.start('seesaw', 0); }, S);
  await B.p.evaluate(S => { __hara.tp(S.x + Math.cos(.25) * 1.6, S.z - Math.sin(.25) * 1.6, 0); __hara.start('seesaw', 1); }, S);
  res('seesaw together', await until(A.p, () => { const r = __hara.remotes[0]; return r && r.k === 'seesaw' && r.i === 1; }, 15000) && await until(B.p, () => { const r = __hara.remotes[0]; return r && r.k === 'seesaw' && r.i === 0; }, 15000));
  await A.p.evaluate(() => __hara.leave()); await B.p.evaluate(() => __hara.leave());
  await B.p.evaluate(() => __hara.mpLeave());
  res('friend leaves', await until(A.p, () => __hara.remotes.length === 0, 40000));
  log('A rt log:', await A.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  log('SUMMARY live: ' + (fails ? fails + ' FAIL' : 'ALL PASS'));
  await b.close();
  process.exitCode = fails ? 1 : 0;
})();
