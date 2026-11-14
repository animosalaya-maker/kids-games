/* «تعا العب» invite popup on every screen (needs friends.js loaded first).
   Every 8 s while the page is visible: heartbeat; if invites are waiting, show the newest one as a popup.
   «يلّا 🎮» opens the 3D game straight into the friend's room. */
(function(){
  if(!window.Friends || !Friends.has()) return;
  const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
  const ROOT = (() => { try{ return new URL('.', document.currentScript.src).href; }catch(e){ return '../'; } })();
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
.ip-go{border:0;border-radius:16px;padding:12px 16px;background:#ffcd4d;color:#3b2600;font:900 17px/1 inherit;font-family:inherit;box-shadow:0 4px 0 #c99418;cursor:pointer;white-space:nowrap}
.ip-go:active{transform:translateY(3px);box-shadow:0 1px 0 #c99418}
.ip-x{border:0;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:18px;cursor:pointer;flex:none}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  let box = null, cur = null, busy = false;
  function host(){ return document.getElementById('stage') || document.body; }
  function show(inv){
    cur = inv; markSeen(inv.id);
    if(!box){
      box = document.createElement('div'); box.className = 'ip-wrap';
      ['pointerdown', 'touchstart', 'mousedown'].forEach(t => box.addEventListener(t, e => e.stopPropagation(), { passive:true }));
      const h = host(); if(h !== document.body) box.classList.add('in'); h.appendChild(box);
    }
    const f = inv.from || {}, who = Friends.nick(f) || Friends.fmtCode(f.code);
    box.innerHTML = `<div class="ip-card"><span class="ip-av"></span><div class="ip-txt">🎮 ${T('صاحبك عم يعزمك تلعبوا سوا!', 'Your friend invites you to play!', 'Arkadaşın seni oynamaya çağırıyor!')}<small>${who}</small></div>
      <button class="ip-go">${T('يلّا 🎮', "Let's go 🎮", 'Hadi 🎮')}</button><button class="ip-x" aria-label="✕">✕</button></div>`;
    try{ box.querySelector('.ip-av').appendChild(Friends.avatarEl(f, 48)); }catch(e){}
    box.querySelector('.ip-go').onclick = go;
    box.querySelector('.ip-x').onclick = () => { Friends.dismiss(inv.id).catch(() => {}); hide(); };
    requestAnimationFrame(() => box.classList.add('show'));
    try{ navigator.vibrate && navigator.vibrate([80, 60, 80]); }catch(e){}
  }
  function hide(){ cur = null; if(box) box.classList.remove('show'); }
  async function go(){
    if(!cur) return; const inv = cur; hide();
    await Promise.race([Friends.dismiss(inv.id).catch(() => {}), new Promise(r => setTimeout(r, 1500))]);
    location.href = Friends.gameUrl(ROOT + 'adventure3d/', { join:inv.room });
  }
  async function tick(){
    if(busy || cur || document.visibilityState === 'hidden') return; busy = true;
    try{
      const c = await Friends.heartbeat();
      if(c && c.invites > 0){
        const list = await Friends.invites(), s = seen();
        const inv = (list || []).find(i => !s.includes(i.id) && i.left > 20);
        if(inv && !cur) show(inv);
      }
    }catch(e){} finally { busy = false; }
  }
  setTimeout(tick, 1500); setInterval(tick, 8000);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') tick(); });
  window.__invitePop = { show, hide, tick };
})();
