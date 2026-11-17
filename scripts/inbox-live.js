// Doorbell timings: two kids become friends, then «انضم» (ask to join), «تعا العب» (invite), friend request and leaving.
// MOCK=1: one browser context, ?fr=mock (local fake server). Otherwise two contexts on the real server.
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const MOCK = !!process.env.MOCK, Q = MOCK ? '?fr=mock' : '';
const GAME = process.env.GAME || 'heist';
const log = (...a) => console.log(...a);
const sec = ms => (ms / 1000).toFixed(2) + ' s';
async function until(page, fn, arg, max){
  const t0 = Date.now();
  while(Date.now() - t0 < (max || 40000)){
    let ok = false; try{ ok = await page.evaluate(fn, arg); }catch(e){}
    if(ok) return Date.now() - t0;
    await page.waitForTimeout(50);
  }
  return -1;
}
(async () => {
  const b = await chromium.launch({ args:['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const ca = await b.newContext({ ...devices['Pixel 7'], locale:'ar' }), cb = MOCK ? ca : await b.newContext({ ...devices['Pixel 7'], locale:'ar' });
  const A = await ca.newPage(), B = await cb.newPage(); const errs = [], net = [];
  for (const [n, p] of [['A', A], ['B', B]]) {
    p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push(n + ' console ' + m.text().slice(0, 200)); });
    p.on('response', r => { if (/api\/broadcast/.test(r.url())) net.push(n + ' broadcast HTTP ' + r.status()); });
    p.on('websocket', ws => net.push(n + ' ws ' + ws.url().replace(/apikey=[^&]+/, 'apikey=…').slice(0, 90)));
  }
  await A.goto(SITE + 'friends/' + Q); await B.goto(SITE + 'friends/' + Q);
  const codeA = await A.evaluate(async () => (await Friends.me()).code), codeB = await B.evaluate(async () => (await Friends.me()).code);
  log('codes', codeA, codeB);
  await A.reload(); await B.reload(); await A.waitForTimeout(MOCK ? 1500 : 5000);
  log('A bell state', await A.evaluate(() => typeof Friends.onPing));

  // 1) friend request: A sends by code → B's page shows it; B accepts → A's list shows the friend
  let t = Date.now();
  log('request', JSON.stringify(await A.evaluate(c => Friends.request(c), codeB)));
  log('T friend request → shown on B:', sec(await until(B, () => !document.getElementById('reqSec').hidden && !!document.querySelector('#reqList .row'))), '(incl. server call', sec(Date.now() - t) + ')');
  await B.evaluate(() => document.querySelector('#reqList .round.yes').click());
  log('T B accepts → friend row on A:', sec(await until(A, () => !!document.querySelector('#frList .row'))));

  // 2) presence: B opens the game → «انضم» appears on A's card
  t = Date.now();
  await B.goto(SITE + GAME + '/' + Q);
  const tLoad = Date.now() - t;
  log('T B opens ' + GAME + ' → «انضم» on A:', sec(tLoad + await until(A, () => !!document.querySelector('#frList button.join'), null, 60000)), '(page load ' + sec(tLoad) + ')');

  // 3) «انضم»: A taps → popup on B; B accepts → A lands in the room
  await A.waitForTimeout(1200);
  await A.evaluate(() => document.querySelector('#frList button.join').click());
  const tPop = await until(B, () => !!document.querySelector('.ip-wrap.show .ip-yes'));
  log('T «انضم» tap → popup on B:', sec(tPop));
  if (tPop >= 0) {
    await B.waitForTimeout(600);
    t = Date.now(); let tAns = -1;
    B.on('requestfinished', r => { if (tAns < 0 && /bobo_fr_answer_join/.test(r.url())) tAns = Date.now(); });
    await B.evaluate(() => document.querySelector('.ip-wrap .ip-yes').click());
    let ok = -1; for (let i = 0; i < 800; i++) { if (new RegExp('/' + GAME + '/').test(A.url())) { ok = Date.now() - t; break; } await A.waitForTimeout(50); }
    log('T B accepts → A navigates to the room:', sec(ok), A.url().replace(SITE, ''));
    if (tAns > 0) log('   of which: B makes its room + answers the server', sec(tAns - t), '· answer on the server → A navigates', sec(t + ok - tAns), '(includes a fixed 0.5 s «قبل!» screen)');
    const tIn = await until(A, () => typeof window.__boboRoom === 'function' && /^\d{4}$/.test(window.__boboRoom() || ''), null, 60000);
    log('T B accepts → A is in the room (game loaded + joined):', tIn < 0 ? 'not seen' : sec(Date.now() - t), 'rooms A/B', await A.evaluate(() => window.__boboRoom && __boboRoom()).catch(() => '?'), await B.evaluate(() => window.__boboRoom && __boboRoom()).catch(() => '?'));
  }

  // 4) leaving: B leaves the game → A (back on the friends page) loses «انضم»
  await A.goto(SITE + 'friends/' + Q);
  const seen = await until(A, () => !!document.querySelector('#frList button.join'), null, 20000);
  log('A back on friends, sees «انضم»:', sec(seen));
  t = Date.now();
  await B.goto(SITE + 'friends/' + Q);
  log('T B leaves the game → «انضم» gone on A:', sec(await until(A, () => !!document.querySelector('#frList .row') && !document.querySelector('#frList button.join'), null, 90000)));

  // 5) «تعا العب»: A picks the game for B → B (on the friends page, then also on the home page) gets the invite
  await B.goto(SITE + Q); await B.waitForTimeout(MOCK ? 2500 : 6000);   // home page: only invitepop.js listens here
  log('B home has popup script', await B.evaluate(() => !!window.__invitePop));
  await until(A, () => !!document.querySelector('#frList button.play:not(.off)'), null, 30000);
  await A.evaluate(() => document.querySelector('#frList button.play').click());
  await A.waitForTimeout(500);
  t = Date.now();
  await A.evaluate(g => { const x = document.querySelector('#gameList button[data-game="' + g + '"]') || document.querySelector('#gameList button'); x.click(); }, GAME);
  let tSent = -1;
  A.on('request', r => { if (tSent < 0 && /bobo_fr_invite2/.test(r.url())) tSent = Date.now(); });
  const tInv = await until(B, () => !!document.querySelector('.ip-wrap.show .ip-go'), null, 90000);
  log('T «تعا العب» game picked → popup on B:', sec(tInv), tSent > 0 ? '(of which after the invite was sent: ' + sec(t + tInv - tSent) + ')' : '');
  if (tInv >= 0) {
    t = Date.now();
    await B.evaluate(() => document.querySelector('.ip-wrap .ip-go').click());
    let ok = -1; for (let i = 0; i < 800; i++) { if (/join=\d{4}/.test(B.url())) { ok = Date.now() - t; break; } await B.waitForTimeout(50); }
    log('T B taps «يلّا» → B navigates to the room:', sec(ok), B.url().replace(SITE, ''));
  }
  // 6) the bell reconnects by itself: C (a third kid, nobody's friend) listens, loses the network for 12 s, comes back; a stranger's ping must arrive again
  try {
    const C = await (MOCK ? ca : await b.newContext({ ...devices['Pixel 7'], locale:'ar' })).newPage();
    C.on('websocket', ws => { net.push('C ws open'); ws.on('close', () => net.push('C ws close')); });
    await C.goto(SITE + 'friends/' + Q);
    const codeC = await C.evaluate(async () => (await Friends.me()).code);
    await C.evaluate(() => { window.__p = []; Friends.onPing(k => window.__p.push(k)); });
    await C.waitForTimeout(MOCK ? 500 : 4000);
    await A.evaluate(c => Friends.ping(c, 'test1'), codeC);
    log('bell: stranger ping reaches C:', sec(await until(C, () => window.__p.includes('test1'), null, 10000)));
    await C.context().setOffline(true); await C.waitForTimeout(12000); await C.context().setOffline(false);
    const t6 = Date.now(); let back = -1;
    for (let i = 0; i < 30 && back < 0; i++) {
      await A.evaluate((a) => Friends.ping(a.c, 'again' + a.i), { c:codeC, i });
      await C.waitForTimeout(1000);
      if (await C.evaluate(() => window.__p.some(k => /^again/.test(k)))) back = Date.now() - t6;
    }
    log('bell: after 12 s offline, pings reach C again within', sec(back), JSON.stringify(await C.evaluate(() => window.__p)));
  } catch (e) { log('bell reconnect test failed', e.message); }
  log('NET', [...new Set(net)].join(' | '));
  log('ERRORS', errs.slice(0, 15).join('\n'));
  await b.close();
})();
