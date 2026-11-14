const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'https://animosalaya-maker.github.io/kids-games/';
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const mk = async (name) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'] });
    const p = await ctx.newPage();
    p.on('console', m => console.log(`[${name}] ${m.type()}: ${m.text()}`));
    p.on('pageerror', e => console.log(`[${name}] PAGEERROR ${e.message}`));
    p.on('websocket', ws => { console.log(`[${name}] WS open ${ws.url().slice(0,80)}`);
      ws.on('framereceived', f => { const s = String(f.payload); if (/presence|phx_reply|system/.test(s)) console.log(`[${name}] <= ${s.slice(0,300)}`); });
      ws.on('framesent', f => { const s = String(f.payload); if (/presence|phx_join/.test(s)) console.log(`[${name}] => ${s.slice(0,300)}`); });
      ws.on('close', () => console.log(`[${name}] WS closed`)); });
    return p;
  };
  const A = await mk('A'), B = await mk('B');
  await A.goto(SITE + 'adventure3d/?host=1&v=' + Date.now());
  let code = null;
  for (let i = 0; i < 40 && !code; i++) { await A.waitForTimeout(500); code = await A.evaluate(() => window.__adv3d && __adv3d.mp.screen === 'lobby' ? __adv3d.mp.code : null).catch(() => null); }
  console.log('A screen', await A.evaluate(() => __adv3d.mp.screen), 'code', code);
  await B.goto(SITE + 'adventure3d/?join=' + code + '&v=' + Date.now());
  for (let i = 0; i < 30; i++) { await B.waitForTimeout(500); const s = await B.evaluate(() => __adv3d.mp.screen).catch(() => '?'); if (s !== 'connecting' && i > 2) break; }
  console.log('RESULT B screen', await B.evaluate(() => __adv3d.mp.screen), 'B players', JSON.stringify(await B.evaluate(() => __adv3d.mp.players)));
  console.log('RESULT A players', JSON.stringify(await A.evaluate(() => __adv3d.mp.players)));
  await b.close();
})();
