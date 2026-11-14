const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const ca = await b.newContext({ ...devices['Pixel 7'], locale:'ar' }), cb = await b.newContext({ ...devices['Pixel 7'], locale:'ar' });
  const A = await ca.newPage(), B = await cb.newPage(); const errs = [];
  for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(n + ' console ' + m.text()); }); }
  await A.goto(SITE + 'friends/'); await B.goto(SITE + 'friends/');
  await A.waitForTimeout(2500);
  const ca_ = await A.evaluate(async () => (await Friends.me()).code), cb_ = await B.evaluate(async () => (await Friends.me()).code);
  log('codes', ca_, cb_);
  log('req', JSON.stringify(await A.evaluate(c => Friends.request(c), cb_)));
  log('ans', JSON.stringify(await B.evaluate(c => Friends.answer(c, true), ca_)));
  await A.reload(); await A.waitForTimeout(4000);
  const btns = await A.evaluate(() => [...document.querySelectorAll('button')].filter(x => x.offsetParent).map(x => x.textContent.trim().slice(0, 30)));
  log('A buttons', JSON.stringify(btns));
  log('A friends', JSON.stringify(await A.evaluate(() => Friends.list())));
  // B goes into heist (playing)
  await B.goto(SITE + 'heist/'); await B.waitForTimeout(30000);
  log('A friends after B in heist', JSON.stringify(await A.evaluate(() => Friends.list())));
  await A.reload(); await A.waitForTimeout(4000);
  const joinBtn = await A.$('button.join');
  log('A has join button', !!joinBtn);
  if (joinBtn) {
    await joinBtn.click();
    let popup = false;
    for (let i = 0; i < 30 && !popup; i++) { await B.waitForTimeout(1000); popup = await B.evaluate(() => !!document.querySelector('.ip-wrap.show')); }
    log('B popup', popup, popup ? await B.evaluate(() => document.querySelector('.ip-wrap').innerText.replace(/\s+/g, ' ')) : '');
    if (popup) {
      await B.evaluate(() => { const b = document.querySelector('.ip-wrap .ip-go'); b && b.click(); });
      for (let i = 0; i < 40; i++) { await A.waitForTimeout(1000); if (/heist/.test(A.url())) break; }
      log('A url', A.url(), 'B url', B.url());
      await A.waitForTimeout(8000);
      const n = p => p.evaluate(() => window.__heist && __heist.mp ? __heist.mp.players.length : -1).catch(() => -2);
      log('players A', await n(A), 'B', await n(B));
    }
  }
  log('ERRORS', errs.slice(0, 15).join('\n'));
  await b.close();
})();
