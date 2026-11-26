/* «تعا العب» invite popup + «انضم» join-request popup on every screen (needs friends.js loaded first).
   Doorbell: Friends.onPing rings when a friend sent something → the poll below runs at once (at most once a second);
   the 8 s poll stays as the fallback. An online game page reports «playing» the moment it can take a friend in,
   and clears it when the page is hidden or left (keepalive request).
   Every 8 s while the page is visible (24 s on a page that cannot host while the doorbell is connected): heartbeat (on an online game page: bobo_fr_set_playing(<game>) every ~25 s instead,
   so friends see «انضم»). If a friend asks to join, show «👋 X بدّو يلعب معك …» with ✓ قبول / ✕ رفض; else show the newest invite.
   Accepting a join request answers with this page's room (window.__boboRoom()), or a room made in-page (window.__boboHost()),
   or opens <game>/?host=1&accept=<id>: the game makes a room (?host=1) and this script answers as soon as __boboRoom() has it.
   The game id comes from <script src=".../invitepop.js" data-game="heist">, window.BOBO_GAME, or the page's folder
   (Friends.GAMES[id].path); a page reports «playing» only once it exposes window.__boboRoom (= it can take a friend in).
   «يلّا 🎮» on an invite opens the invited game (Friends.GAMES[inv.game]) straight into the friend's room. */
(function(){
  if(!window.Friends || !Friends.has()) return;
  const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
  const ROOT = (() => { try{ return new URL('.', document.currentScript.src).href; }catch(e){ return '../'; } })();
  const GAME = (() => {
    let g = null; try{ g = (document.currentScript && document.currentScript.dataset.game) || window.BOBO_GAME || null; }catch(e){}
    if(g && Friends.GAMES[g]) return g;
    try{
      const here = new URL('.', location.href).href;
      return Object.keys(Friends.GAMES).find(id => new URL(Friends.GAMES[id].path, ROOT).href === here) || null;
    }catch(e){ return null; }
  })();
  const canHost = () => !!GAME && typeof window.__boboRoom === 'function';
  const myRoom = () => { try{ const r = canHost() && window.__boboRoom(); return /^\d{4}$/.test(r || '') ? String(r) : null; }catch(e){ return null; } };
  const SEEN = 'bobo_inv_seen';
  const seen = () => { try{ return JSON.parse(sessionStorage.getItem(SEEN)) || []; }catch(e){ return []; } };
  const markSeen = id => { try{ const s = seen(); s.push(id); sessionStorage.setItem(SEEN, JSON.stringify(s.slice(-30))); }catch(e){} };
  const css = `
.ip-wrap{position:fixed;left:50%;top:calc(12px + var(--sa-t, env(safe-area-inset-top,0px)));transform:translate(-50%,-140%);z-index:9500;
  width:min(440px,calc(100% - 24px));transition:transform .45s cubic-bezier(.2,1.4,.4,1);font-family:inherit;direction:${(window.I18N && I18N.dir) || 'rtl'}}
.ip-wrap.in{position:absolute}
.ip-wrap.show{transform:translate(-50%,0)}
.ip-card{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:22px;background:linear-gradient(135deg,#4b2fb0,#7b3fd6);
  color:#fff;border:3px solid #ffcd4d;box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 0 6px rgba(255,205,77,.18);animation:ipGlow 1.6s ease-in-out infinite}
@keyframes ipGlow{50%{box-shadow:0 10px 30px rgba(0,0,0,.4),0 0 0 10px rgba(255,205,77,.32)}}
.ip-txt{flex:1;min-width:0;font-weight:800;font-size:16px;line-height:1.35}
.ip-txt small{display:block;font-weight:600;font-size:13px;opacity:.85}
.ip-txt .ip-g{display:inline-block;margin-top:3px;padding:1px 10px;border-radius:999px;background:rgba(255,205,77,.22);color:#ffe08a;font-weight:900;font-size:14px}
.ip-go{border:0;border-radius:16px;padding:12px 16px;background:#ffcd4d;color:#3b2600;font-family:inherit;font-weight:900;font-size:17px;line-height:1;box-shadow:0 4px 0 #c99418;cursor:pointer;white-space:nowrap}
.ip-go:active{transform:translateY(3px);box-shadow:0 1px 0 #c99418}
.ip-x{border:0;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:18px;cursor:pointer;flex:none}
.ip-card.jr{flex-wrap:wrap;background:linear-gradient(135deg,#1f7a52,#3fc47a);border-color:#fff}
.ip-card.jr .ip-txt{flex:1 1 60%}
.ip-btns{display:flex;gap:10px;width:100%}
.ip-btns button{flex:1;border:0;border-radius:16px;padding:13px 10px;font-family:inherit;font-weight:900;font-size:19px;line-height:1;cursor:pointer}
.ip-yes{background:#ffcd4d;color:#3b2600;box-shadow:0 5px 0 #c99418}
.ip-no{background:rgba(255,255,255,.22);color:#fff;box-shadow:0 5px 0 rgba(0,0,0,.18)}
.ip-btns button:active{transform:translateY(4px);box-shadow:none}
.ip-btns button:disabled{opacity:.6}
.ip-toast{position:fixed;left:50%;bottom:calc(22px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:9600;max-width:calc(100% - 32px);
  background:#ffcd4d;color:#3b2600;font-weight:900;font-size:17px;padding:10px 18px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.35);text-align:center;pointer-events:none;transition:opacity .4s}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  let box = null, cur = null, busy = false;
  function host(){ return document.getElementById('stage') || document.body; }
  function toast(text, ms){
    const el = document.createElement('div'); el.className = 'ip-toast'; el.textContent = text; document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, ms || 3000); setTimeout(() => el.remove(), (ms || 3000) + 500);
  }
  function mkBox(){
    if(!box){
      box = document.createElement('div'); box.className = 'ip-wrap';
      ['pointerdown', 'touchstart', 'mousedown'].forEach(t => box.addEventListener(t, e => e.stopPropagation(), { passive:true }));
      const h = host(); if(h !== document.body) box.classList.add('in'); h.appendChild(box);
    }
  }
  function show(inv){
    cur = inv; markSeen(inv.id); mkBox();
    const f = inv.from || {}, who = Friends.nick(f) || Friends.fmtCode(f.code);
    box.innerHTML = `<div class="ip-card"><span class="ip-av"></span><div class="ip-txt">🎮 ${T('صاحبك عم يعزمك تلعبوا سوا!', 'Your friend invites you to play!', 'Arkadaşın seni oynamaya çağırıyor!')}<small>${who}</small><span class="ip-g">${Friends.gameName(inv.game)}</span></div>
      <button class="ip-go">${T('يلّا 🎮', "Let's go 🎮", 'Hadi 🎮')}</button><button class="ip-x" aria-label="✕">✕</button></div>`;
    try{ box.querySelector('.ip-av').appendChild(Friends.avatarEl(f, 48)); }catch(e){}
    box.querySelector('.ip-go').onclick = go;
    box.querySelector('.ip-x').onclick = () => { Friends.dismiss(inv.id).catch(() => {}); hide(); };
    requestAnimationFrame(() => box.classList.add('show'));
    try{ const ua = navigator.userActivation; if(navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate([80, 60, 80]); }catch(e){}
  }
  function hide(){ cur = null; clearTimeout(hideT); if(box) box.classList.remove('show'); }
  let hideT = 0;

  /* ---- «انضم»: a friend asks to join the game I'm playing ---- */
  function showJoin(req){
    cur = Object.assign({ join:true }, req); markSeen('j' + req.id); mkBox();
    const f = req.from || {}, who = Friends.nick(f) || Friends.fmtCode(f.code);
    box.innerHTML = `<div class="ip-card jr"><span class="ip-av"></span><div class="ip-txt">👋 <span class="ip-who"></span> ${T('بدّو يلعب معك', 'wants to play with you', 'seninle oynamak istiyor')}<span class="ip-g">${Friends.gameName(req.game)}</span></div>
      <div class="ip-btns"><button class="ip-yes">✓ ${T('قبول', 'Accept', 'Kabul')}</button><button class="ip-no">✕ ${T('رفض', 'Decline', 'Reddet')}</button></div></div>`;
    box.querySelector('.ip-who').textContent = who;
    try{ box.querySelector('.ip-av').appendChild(Friends.avatarEl(f, 48)); }catch(e){}
    box.querySelector('.ip-yes').onclick = () => acceptJoin(req);
    box.querySelector('.ip-no').onclick = () => { hide(); Friends.answerJoin(req.id, false, null).catch(() => {}); };
    requestAnimationFrame(() => box.classList.add('show'));
    clearTimeout(hideT); hideT = setTimeout(() => { if(cur && cur.join && cur.id === req.id) hide(); }, Math.max(5, req.left || 0) * 1000);
    try{ const ua = navigator.userActivation; if(navigator.vibrate && (!ua || ua.hasBeenActive)) navigator.vibrate([80, 60, 80, 60, 80]); }catch(e){}
  }
  const comingText = () => T('✓ صاحبك جاي يلعب معك!', '✓ Your friend is coming to play!', '✓ Arkadaşın oynamaya geliyor!');
  async function acceptJoin(req){
    box.querySelectorAll('button').forEach(b => { b.disabled = true; });
    const g = Friends.GAMES[req.game] ? req.game : null;
    const openHost = () => { location.href = Friends.gameUrl(ROOT + Friends.GAMES[g || Friends.gameOf(req.game)].path, { host:1, accept:req.id }); };
    if(g && g === GAME){
      let room = myRoom();
      if(!room && typeof window.__boboHost === 'function'){ try{ room = await window.__boboHost(); }catch(e){ room = null; } if(!/^\d{4}$/.test(room || '')) room = null; }
      if(room){
        hide();
        try{ const r = await Friends.answerJoin(req.id, true, room); toast(r && r.status === 'ok' ? comingText() : T('هالطلب خلص ⏳', 'That request is over ⏳', 'Bu istek bitti ⏳')); }
        catch(e){ toast(Friends.errText(e)); }
        return;
      }
    }
    openHost();
  }
  /* opened as <game>/?host=1&accept=<id>: the game is making a room; answer the request as soon as it has one */
  (function(){
    let id = null; try{ id = new URLSearchParams(location.search).get('accept'); }catch(e){}
    if(!/^\d{1,18}$/.test(id || '')) return;
    try{ const q = new URLSearchParams(location.search); q.delete('accept'); history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
    const t0 = Date.now();
    const wait = () => {
      const room = myRoom();
      if(room){ Friends.answerJoin(id, true, room).then(r => { if(r && r.status === 'ok') toast(comingText(), 3500); }, () => {}); return; }
      if(Date.now() - t0 > 45000){ Friends.answerJoin(id, false, null).catch(() => {}); return; }
      setTimeout(wait, 400);
    };
    setTimeout(wait, 300);
  })();
  async function go(){
    if(!cur) return; const inv = cur; hide();
    await Promise.race([Friends.dismiss(inv.id).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    location.href = Friends.gameUrl(ROOT + Friends.GAMES[Friends.gameOf(inv.game)].path, { join:inv.room });
  }
  let lastPlay = 0, playingSet = false, lastCoin = 0, lastRing = 0, ringT = 0, again = false, hint = null;
  /* the doorbell rang: poll now, but never more than once a second */
  function ring(k){
    if(k === 'join' || k === 'invite') hint = k;   // only says which list to look at first; the lists themselves come from the server
    if(ringT) return;
    ringT = setTimeout(() => { ringT = 0; lastRing = Date.now(); if(busy){ again = true; return; } tick(); }, Math.max(0, lastRing + 1000 - Date.now()));
  }
  /* «I'm playing <game>» right away (friends see «انضم» without waiting for the next poll) */
  function announce(){
    if(!canHost() || document.visibilityState === 'hidden') return false;
    lastPlay = Date.now(); playingSet = true;
    Friends.setPlaying(GAME).catch(() => { lastPlay = 0; });
    return true;
  }
  function leave(){ if(playingSet){ playingSet = false; lastPlay = 0; Friends.setPlaying(null, true); } }
  async function tick(){
    if(busy || cur || document.visibilityState === 'hidden') return; busy = true;
    try{
      let c;
      if(canHost() && Date.now() - lastPlay > 24000){ lastPlay = Date.now(); c = await Friends.setPlaying(GAME); playingSet = true; }
      else if(hint){ c = { joins:hint === 'join' ? 1 : 0, invites:hint === 'invite' ? 1 : 0 }; }   // rang: go straight to that list (one request less)
      else c = await Friends.heartbeat();
      hint = null;
      // coins sent from Bobo Land (admin gift): add them to this phone's wallet
      if(window.World && World.addCoins && Friends.claimCoins && Date.now() - lastCoin > 45000){
        lastCoin = Date.now();
        try{ const g = await Friends.claimCoins(); if(g && g.coins > 0){ World.addCoins(g.coins); toast('🎁 ' + T('وصلك ' + g.coins + ' عملة من بوبو لاند!', 'You got ' + g.coins + ' coins from Bobo Land!', 'Bobo Land\'dan ' + g.coins + ' altın geldi!'), 5000); try{ window.dispatchEvent(new Event('bobo-coins')); }catch(e){} } }catch(e){}
      }
      if(c && c.joins > 0 && !cur){
        const list = await Friends.joinReqs(), s = seen();
        const req = (list || []).find(r => !s.includes('j' + r.id) && r.left > 5);
        if(req && !cur){ showJoin(req); return; }
      }
      if(c && c.invites > 0){
        const list = await Friends.invites(), s = seen();
        const inv = (list || []).find(i => !s.includes(i.id) && i.left > 20);
        if(inv && !cur) show(inv);
      }
    }catch(e){} finally { busy = false; if(again){ again = false; ring(); } }
  }
  setTimeout(tick, 1500);
  /* every 8 s; while the doorbell is connected (a friend's invite rings it at once) a page that is not hosting a game
     only needs the heartbeat every 24 s (friends see «online» for 60 s after each one) */
  let lastPoll = 0;
  setInterval(() => {
    if(!canHost() && Friends.bellOn && Friends.bellOn() && Date.now() - lastPoll < 23500) return;
    lastPoll = Date.now(); tick();
  }, 8000);
  if(GAME){ // the game defines window.__boboRoom a moment after this script runs: watch for it, then announce at once
    const t0 = Date.now(), iv = setInterval(() => { if(playingSet || Date.now() - t0 > 60000 || announce()) clearInterval(iv); }, 200);
  }
  if(Friends.onPing) Friends.onPing(ring);
  // hidden (app switched, tab closed on a phone: pagehide often never comes) = not playing; visible again = playing again, now
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible'){ if(!playingSet) announce(); tick(); } else leave(); });
  addEventListener('pagehide', leave);
  addEventListener('pageshow', e => { if(e.persisted){ lastPlay = 0; if(!playingSet) announce(); tick(); } });
  window.__invitePop = { show, showJoin, hide, tick, ring, get game(){ return GAME; } };
})();
