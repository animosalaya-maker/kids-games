const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'https://animosalaya-maker.github.io/kids-games/';
const GAMES = [['adventure3d/', 'p => window.__adv3d && __adv3d.mp', 'm => m.screen === "lobby" ? m.code : null', 'm => m.players.length'],
               ['worlds/', null, null, null], ['heist/', null, null, null]];
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  for (const [path] of GAMES) {
    const ca = await b.newContext({ ...devices['Pixel 7'] }), cb = await b.newContext({ ...devices['Pixel 7'] });
    const A = await ca.newPage(), B = await cb.newPage(); const errs = [];
    [A, B].forEach((p, i) => p.on('pageerror', e => errs.push((i ? 'B ' : 'A ') + e.message)));
    await A.goto(SITE + path + '?host=1&v=' + Date.now());
    // find the room code shown on the page (4 digits in the lobby)
    let code = null;
    for (let i = 0; i < 40 && !code; i++) { await A.waitForTimeout(500);
      code = await A.evaluate(() => { const m = (window.__adv3d && __adv3d.mp) || (window.__worlds && __worlds.mp) || (window.__heist && __heist.mp); if (m && m.code && /lobby/.test(m.screen || '')) return m.code; return null; }).catch(() => null); }
    console.log(path, 'A code', code);
    if (!code) { console.log(path, 'FAIL no room code', errs.join(';')); continue; }
    await B.goto(SITE + path + '?join=' + code + '&v=' + Date.now());
    let nB = 0, nA = 0;
    for (let i = 0; i < 30; i++) { await B.waitForTimeout(500);
      const get = p => p.evaluate(() => { const m = (window.__adv3d && __adv3d.mp) || (window.__worlds && __worlds.mp) || (window.__heist && __heist.mp); return m && m.players ? m.players.length : 0; }).catch(() => 0);
      nB = await get(B); nA = await get(A); if (nA >= 2 && nB >= 2) break; }
    console.log(path, (nA >= 2 && nB >= 2) ? 'PASS' : 'FAIL', 'A sees', nA, 'B sees', nB, errs.join(';'));
    await ca.close(); await cb.close();
  }
  await b.close();
})();
