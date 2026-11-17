const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const errs = [], posts = [];
  const mk = async (n, name) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ar' }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if (/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + 'island/'); await p.waitForTimeout(5000);
    await p.evaluate(() => __island.play()); return { p, ctx, me };
  };
  const A = await mk('A', 'Sara'), B = await mk('B', 'Samir');
  const seen = p => p.evaluate(() => __island.players().map(x => ({ code:x.code, name:x.name, x:Math.round(x.x), z:Math.round(x.z) })));
  let ok = false, pa, pb;
  for (let i = 0; i < 40 && !ok; i++) { await A.p.waitForTimeout(1000); pa = await seen(A.p); pb = await seen(B.p);
    ok = pa.some(x => x.code === B.me.code && x.name === 'Samir') && pb.some(x => x.code === A.me.code && x.name === 'Sara'); }
  log('A sees', JSON.stringify(pa), 'B sees', JSON.stringify(pb));
  log('RESULT names+presence:', ok ? 'PASS' : 'FAIL', 'shards', await A.p.evaluate(() => __island.shard), await B.p.evaluate(() => __island.shard));
  await B.p.evaluate(() => { __island.tp(__island.P.x + 7, __island.P.z + 5); }); await B.p.keyboard.down('ArrowUp'); await B.p.waitForTimeout(2500); await B.p.keyboard.up('ArrowUp'); await A.p.waitForTimeout(2500);
  const pa2 = await seen(A.p); const b0 = pa.find(x => x.code === B.me.code), b1 = pa2.find(x => x.code === B.me.code);
  log('RESULT movement sync:', b0 && b1 && (b0.x !== b1.x || b0.z !== b1.z) ? 'PASS' : 'FAIL', JSON.stringify(b0), JSON.stringify(b1));
  await B.ctx.setOffline(true); await B.p.waitForTimeout(15000); await B.ctx.setOffline(false); await B.p.waitForTimeout(20000);
  await B.p.evaluate(() => { __island.tp(__island.P.x - 9, __island.P.z - 6); }); await B.p.keyboard.down('ArrowUp'); await B.p.waitForTimeout(2000); await B.p.keyboard.up('ArrowUp'); await A.p.waitForTimeout(3000);
  const pa3 = await seen(A.p), pb3 = await seen(B.p); const b2 = pa3.find(x => x.code === B.me.code);
  log('RESULT after 15s offline:', b2 && pb3.some(x => x.code === A.me.code) && (b2.x !== b1.x || b2.z !== b1.z) ? 'PASS' : 'FAIL', JSON.stringify(pa3), JSON.stringify(pb3), 'B status', await B.p.evaluate(() => __island.mpStatus));
  log('RESULT http broadcast posts:', posts.length === 0 ? 'PASS' : 'FAIL ' + posts.length, 'ERRORS', errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
