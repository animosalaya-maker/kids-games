/* «فضاء بوبو» online co-op on the real server: A makes a room (?host=1&room=<code>), B joins (?join=<code>) */
const { chromium, devices } = require('playwright');
const SITE = process.env.SITE || 'http://localhost:8765/';
const log = (...a) => console.log(...a);
const res = (n, c, ...a) => log('RESULT ' + n + ':', c ? 'PASS' : 'FAIL', ...a);
const until = async (p, fn, ms = 15000, arg) => { const t0 = Date.now(); while(Date.now() - t0 < ms){ if(await p.evaluate(fn, arg)) return true; await p.waitForTimeout(400); } return false; };
(async () => {
  const b = await chromium.launch();
  const errs = [], posts = [];
  const room = String(1000 + Math.floor(Math.random() * 9000));
  const mk = async (n, name, path) => {
    const ctx = await b.newContext({ ...devices['Pixel 7'], locale:'ar' }); const p = await ctx.newPage();
    const cons = []; p.on('console', m => cons.push(m.type() + ':' + m.text())); p.on('pageerror', e => errs.push(n + ' PAGEERR ' + e.message));
    p.on('request', r => { if (/api\/broadcast/.test(r.url()) && !/bobo-inbox/.test(r.postData() || '')) posts.push(n); });
    await p.goto(SITE + 'friends/'); await p.waitForTimeout(1500);
    const me = await p.evaluate(async nm => { const m = await Friends.me(); const r = await Friends.setName(nm); return { code:m.code, name:r.name }; }, name);
    log(n, JSON.stringify(me));
    await p.goto(SITE + path);
    return { p, ctx, me, cons };
  };
  const A = await mk('A', 'Sara', 'space/?host=1&room=' + room);
  await A.p.waitForFunction(() => window.__space && __space.mpScreen === 'lobby', null, { timeout:40000 }).catch(() => {});
  const codeA = await A.p.evaluate(() => __space.mp.code);
  res('room code from ?room', codeA === room, room, codeA);
  const B = await mk('B', 'Samir', 'space/?join=' + codeA);
  let ok = false;
  for(let i = 0; i < 30 && !ok; i++){ await A.p.waitForTimeout(1000); ok = await A.p.evaluate(() => __space.mp.players.length === 2) && await B.p.evaluate(() => __space.mpScreen === 'lobby'); }
  res('create/join', ok, await B.p.evaluate(() => JSON.stringify(__space.mp)), 'rtlog:', await B.p.evaluate(() => (window.BoboRT && BoboRT._log || []).join(' / ')));
  if(!ok) log('B console:', B.cons.join(' | ').slice(0, 1500));
  await until(B.p, () => document.querySelector('#mpCard').innerText.includes('Sara'), 20000);
  await until(A.p, () => document.querySelector('#mpCard').innerText.includes('Samir'), 20000);
  const la = await A.p.evaluate(() => document.querySelector('#mpCard').innerText.replace(/\s+/g, ' ')), lb = await B.p.evaluate(() => document.querySelector('#mpCard').innerText.replace(/\s+/g, ' '));
  res('lobby names both ways', la.includes('Samir') && lb.includes('Sara'), la, '|', lb);
  await A.p.evaluate(() => __space.mpStart());
  ok = await until(B.p, () => __space.state === 'play' && __space.online.guest, 20000);
  res('start together', ok);
  await until(B.p, () => __space.mates.length === 1 && __space.mates[0].label === 'Sara', 20000);
  await until(A.p, () => __space.mates.length === 1 && __space.mates[0].label === 'Samir', 20000);
  const ma = await A.p.evaluate(() => __space.mates), mb = await B.p.evaluate(() => __space.mates);
  res('rockets with names both ways', ma.length === 1 && mb.length === 1 && ma[0].label === 'Samir' && mb[0].label === 'Sara', JSON.stringify(ma), JSON.stringify(mb));
  // B moves, A sees it
  await B.p.evaluate(() => __space.moveTo(150, 600));
  const okB = await until(A.p, () => { const m = __space.mates[0]; return m && Math.abs(m.sx - 150) < 30 && Math.abs(m.sy - 600) < 30; }, 10000);
  res('B moves, A sees it', okB, JSON.stringify(await A.p.evaluate(() => __space.mates[0])), JSON.stringify(await B.p.evaluate(() => __space.me)));
  // A moves, B sees it
  await A.p.evaluate(() => __space.moveTo(820, 700));
  const okA = await until(B.p, () => { const m = __space.mates[0]; return m && Math.abs(m.sx - 820) < 30 && Math.abs(m.sy - 700) < 30; }, 10000);
  res('A moves, B sees it', okA, JSON.stringify(await B.p.evaluate(() => __space.mates[0])), JSON.stringify(await A.p.evaluate(() => __space.me)));
  // same aliens (keep both alive and not shooting them all down too fast: sample right after they come in)
  await until(A.p, () => __space.aliens().length > 3, 15000); await A.p.waitForTimeout(1500);
  let best = null;
  for(let i = 0; i < 5; i++){
    const [al, bl] = await Promise.all([A.p.evaluate(() => __space.aliens()), B.p.evaluate(() => __space.aliens())]);
    const m = new Map(bl.map(e => [e.id, e])), same = al.filter(e => m.has(e.id) && Math.hypot(m.get(e.id).x - e.x, m.get(e.id).y - e.y) < 80).length;
    if(!best || same / Math.max(1, al.length) > best.r) best = { r:same / Math.max(1, al.length), a:al.length, b:bl.length, same };
    await A.p.waitForTimeout(700);
  }
  res('same aliens on both', best && best.a > 2 && best.r >= 0.75, JSON.stringify(best));
  // a guest kill counts
  const al = await A.p.evaluate(() => __space.aliens()), t = al[0];
  if(t){
    const sc0 = await A.p.evaluate(() => __space.G.score);
    await B.p.evaluate(id => __space.claim(id, 9), t.id);
    const gone = await until(A.p, id => !__space.aliens().some(e => e.id === id), 8000, t.id);
    res('guest kill counts', gone && (await A.p.evaluate(() => __space.G.score)) > sc0);
  }
  log('B rt log:', await B.p.evaluate(() => (BoboRT._log || []).join(' / ')));
  // host leaves → guest toast
  await A.p.evaluate(() => __space.toMenu());
  const left = await until(B.p, () => __space.state === 'menu' && !document.querySelector('#toast').hidden, 30000);
  res('host leaves → guest toast', left);
  res('http broadcast posts', posts.length === 0, posts.length);
  res('page errors', errs.length === 0, errs.slice(0, 10).join(' | ') || 'none');
  await b.close();
})();
