// Live reconnect test on the real server: two phones in one room, one goes offline for 20 s, then both must see each other
// again with positions flowing both ways, and no request to the HTTP broadcast fallback.
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const GAMES = {
  city:{ path:'city/', n:p => p.evaluate(() => __city.mp.players.length),
    begin:async () => {}, move:(p, x) => p.evaluate(x => { if(__city.state !== 'play') __city.play(); __city.tp(x, 20); }, x),
    seen:p => p.evaluate(() => { const r = __city.mp.remotes[0]; return r ? r.x : null; }) },
  adventure3d:{ path:'adventure3d/', n:p => p.evaluate(() => __adv3d.mp.players.length),
    begin:async (A, B) => { await A.evaluate(() => document.querySelector('#bStart').click()); await sleep(1500); for(const p of [A, B]) await p.evaluate(() => __adv3d.mp.skipCountdown()); await sleep(500);
      for(const p of [A, B]) await p.evaluate(() => __adv3d.mp.setTimeLeft(170)); console.log('match active', await A.evaluate(() => __adv3d.mp.active), await B.evaluate(() => __adv3d.mp.active)); },
    move:(p, x) => p.evaluate(x => __adv3d.teleport(x, 33), x),
    seen:p => p.evaluate(() => { const r = __adv3d.mp.remotes()[0]; return r ? r.x : null; }) }
};
let fail = 0;
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding'] });
  for(const name of Object.keys(GAMES)){
    const G = GAMES[name];
    const ca = await b.newContext({ ...devices['Pixel 7'] }), cb = await b.newContext({ ...devices['Pixel 7'] });
    if(process.env.FAKE){ const F = new (require(process.env.FAKE).Fake)(); await F.attach(ca, 'A'); await F.attach(cb, 'B'); }   // local dry run without the server
    const A = await ca.newPage(), B = await cb.newPage(); const errs = []; let http = 0, ws = 0;
    [A, B].forEach((p, i) => { const t = i ? 'B ' : 'A ';
      p.on('pageerror', e => errs.push(t + e.message));
      p.on('request', r => { if(/\/api\/broadcast/.test(r.url())){ http++; } });
      p.on('websocket', () => ws++); });
    await A.goto(SITE + G.path + '?host=1&v=' + Date.now());
    let code = null; for(let i = 0; i < 60 && !code; i++){ await sleep(500); code = await A.evaluate(() => window.__boboRoom && __boboRoom()).catch(() => null); }
    console.log('==', name, 'room', code);
    if(!code){ console.log(name, 'FAIL no room', errs.join(' ; ')); fail++; await ca.close(); await cb.close(); continue; }
    await B.goto(SITE + G.path + '?join=' + code + '&v=' + Date.now());
    let na = 0, nb = 0; for(let i = 0; i < 40; i++){ await sleep(500); na = await G.n(A).catch(() => 0); nb = await G.n(B).catch(() => 0); if(na >= 2 && nb >= 2) break; }
    console.log(name, 'joined: A sees', na, 'B sees', nb);
    await G.begin(A, B);
    const check = async (label, xa, xb) => {
      let sa = null, sb = null, ok = false;
      for(let i = 0; i < 40 && !ok; i++){ await G.move(A, xa); await G.move(B, xb); await sleep(500); sa = await G.seen(A).catch(() => null); sb = await G.seen(B).catch(() => null); na = await G.n(A).catch(() => 0); nb = await G.n(B).catch(() => 0);
        ok = na === 2 && nb === 2 && sa != null && sb != null && Math.abs(sa - xb) < 1 && Math.abs(sb - xa) < 1; }
      if(!ok) fail++;
      console.log(name, ok ? 'PASS' : 'FAIL', label, '| A sees', na, 'players, friend at x', sa, '(want', xb + ') | B sees', nb, 'players, friend at x', sb, '(want', xa + ') | http fallback requests', http, '| websockets opened', ws);
    };
    const logs = async label => { for(const [t, p] of [['A', A], ['B', B]]) console.log(name, label, t, 'log:', await p.evaluate(() => BoboRT._log.join(' | ')).catch(e => 'n/a ' + e.message), '| chip', await p.evaluate(() => { const c = document.getElementById('rtChip'); return !!c && c.style.display !== 'none'; }).catch(() => null)); };
    await check('baseline', 6, -6);
    await cb.setOffline(true); await sleep(10000); await logs('B offline 10 s'); await sleep(10000); await cb.setOffline(false);
    await check('after B was offline 20 s', 9, -9);
    await ca.setOffline(true); await sleep(12000); await ca.setOffline(false);
    await check('after A (room owner) was offline 12 s', 4, -4);
    await logs('end');
    if(http){ fail++; console.log(name, 'FAIL http fallback used', http); }
    if(errs.length){ fail++; console.log(name, 'FAIL page errors:', errs.join(' ; ')); } else console.log(name, 'no page errors');
    await ca.close(); await cb.close();
  }
  await b.close();
  console.log(fail ? 'RESULT: FAIL (' + fail + ')' : 'RESULT: ALL PASS');
  process.exit(fail ? 1 : 0);
})();
