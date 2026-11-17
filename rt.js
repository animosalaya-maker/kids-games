/* بوبو لاند — shared online-room connection for all the games (window.BoboRT).
   Each game keeps its own small SupabaseTransport class; it opens the room through BoboRT.open() and this file keeps it alive:
   - when the channel drops (CHANNEL_ERROR / TIMED_OUT / CLOSED) it is removed and joined again with backoff (1 s, 2 s, 4 s, 8 s…),
     with the same room and player id, and the last presence meta is tracked again;
   - nothing is ever sent while the channel is not joined (supabase-js would fall back to HTTP POST /api/broadcast):
     position messages are dropped, the other messages wait a few seconds for the channel to come back;
   - coming back to the app (visibilitychange / pageshow) or to the network (online) checks the channel at once;
   - watchdog: with other players in the room, 12 s of total silence forces a new join (a small '_hb' message every 5 s keeps a
     quiet room from looking dead);
   - a player who drops out of the member list is kept for 20 s before the game is told (a '_bye' message on a real exit skips the wait);
   - a small «عم نرجع نتصل… 📡» chip shows while reconnecting.
   Names: BoboRT.fc() is this player's friend code for the presence meta, BoboRT.want(list, cb) looks the codes up on the server
   (Friends.names), BoboRT.name(fc) / BoboRT.label(p, fallback) read the saved name. Names never travel between players. */
(function(){
'use strict';
const T = (ar, en, tr) => window.L ? window.L(ar, en, tr) : ar;
const BACKOFF = [1000, 2000, 4000, 8000], JOIN_TIMEOUT = 9000, SILENCE = 12000, BEAT = 5000, GRACE = 20000, QUEUE_MAX = 30, QUEUE_AGE = 10000;
const clients = {}, conns = new Set(), log = [];
const note = (...a) => { log.push(Math.round(performance.now()) + ' ' + a.join(' ')); if(log.length > 80) log.shift(); };

/* ---------- reconnect chip ---------- */
let chip = null, chipTimer = 0;
function chipSet(){
  const now = Date.now(); let on = false, soon = false;
  conns.forEach(c => { if(c.down && !c.closed){ if(now - c.downAt >= (c.silent ? 2500 : 600)) on = true; else soon = true; } });
  if(soon && !chipTimer) chipTimer = setTimeout(() => { chipTimer = 0; chipSet(); }, 650);
  if(!on){ if(chip) chip.style.display = 'none'; return; }
  if(!chip){
    chip = document.createElement('div'); chip.id = 'rtChip'; chip.setAttribute('role', 'status');
    chip.style.cssText = 'position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;' +
      'background:rgba(28,32,56,.88);color:#fff;font:700 13px/1.2 system-ui,sans-serif;padding:7px 14px;border-radius:999px;box-shadow:0 3px 10px rgba(0,0,0,.3);white-space:nowrap;direction:' + (document.documentElement.dir || 'rtl');
    (document.body || document.documentElement).appendChild(chip);
  }
  chip.textContent = T('عم نرجع نتصل… 📡', 'Reconnecting… 📡', 'Yeniden bağlanıyor… 📡');
  chip.style.display = 'block';
}

function client(o){
  const k = o.url + '|' + (o.eps || 30);
  if(!clients[k]) clients[k] = window.supabase.createClient(o.url, o.key, {
    auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false },
    realtime:{ params:{ eventsPerSecond:o.eps || 30 }, heartbeatIntervalMs:15000, reconnectAfterMs:n => [1000, 2000, 4000, 8000][n - 1] || 8000 } });
  return clients[k];
}
const quiet = p => { if(p && p.catch) p.catch(() => {}); };

class Conn{
  constructor(o){
    this.o = o; this.h = o.h; this.id = o.id; this.sb = client(o);
    this.volatile = new Set(o.volatile || ['pos']);
    this.ch = null; this.gen = 0; this.closed = false; this.down = false; this.downAt = 0; this.silent = false; this.everUp = false;
    this.meta = null; this.queue = []; this.tries = 0; this.timer = 0; this.joinTimer = 0;
    this.seen = new Map(); this.bye = new Set(); this.others = 0; this.rejoins = 0;
    this.lastRx = Date.now(); this.lastTx = 0; this.silence = SILENCE; this.hiddenAt = 0;
    conns.add(this);
    this.iv = setInterval(() => this.tick(), 1000);
    this.ready = new Promise((res, rej) => { this.res = res; this.rej = rej; });
    this.ready.catch(() => {});
    this.join();
  }
  joined(){ const ch = this.ch; return !!ch && ch.state === 'joined' && this.sb.realtime.isConnected(); }

  /* make a fresh channel and subscribe; `gen` makes every callback of an older channel a no-op */
  join(){
    if(this.closed) return;
    const gen = ++this.gen, sb = this.sb, o = this.o;
    let ch;
    try{
      ch = this.ch = sb.channel(o.topic, { config:{ broadcast:{ self:false, ack:false }, presence:{ key:this.id, enabled:true } } });
      ch.on('presence', { event:'sync' }, () => { if(gen === this.gen) this.onSync(); });
      o.events.forEach(ev => ch.on('broadcast', { event:ev }, m => { if(gen === this.gen){ this.rx(true); this.h.msg(ev, m && m.payload); } }));
      ch.on('broadcast', { event:'_hb' }, () => { if(gen === this.gen) this.rx(true); });
      ch.on('broadcast', { event:'_bye' }, m => { if(gen === this.gen){ this.rx(true); this.onBye(m && m.payload && m.payload.id); } });
    }catch(e){ this.failed(gen, e); return; }
    let done = false;
    clearTimeout(this.joinTimer);
    this.joinTimer = setTimeout(() => { if(!done && gen === this.gen){ done = true; this.failed(gen, new Error('timeout')); } }, JOIN_TIMEOUT);
    try{
      ch.subscribe(status => {
        if(gen !== this.gen || this.closed) return;
        if(status === 'SUBSCRIBED'){
          if(!done){ done = true; clearTimeout(this.joinTimer); this.up(); }
          else if(!this.down){ if(this.meta) this.pushTrack(); }   // the library joined again by itself: track again
        }else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          if(!done){ done = true; clearTimeout(this.joinTimer); this.failed(gen, new Error(status)); }
          else this.lost(1000, false, status);
        }
      });
    }catch(e){ if(!done){ done = true; clearTimeout(this.joinTimer); this.failed(gen, e); } }
  }
  up(){
    const first = !this.everUp; note('up', first ? 'first' : 're');
    this.everUp = true; this.tries = 0; this.lastRx = Date.now();
    const was = this.down; this.down = false; chipSet();
    if(this.meta) this.pushTrack();
    const now = Date.now(), q = this.queue; this.queue = [];
    q.forEach(m => { if(now - m.t < QUEUE_AGE) this.push(m.ev, m.p); });
    if(first) this.res();
    else if(was){ try{ this.h.status && this.h.status('up'); }catch(e){} }
  }
  failed(gen, err){
    if(gen !== this.gen || this.closed) return;
    note('join failed', err && err.message);
    this.drop();
    if(!this.everUp){ this.closed = true; this.stop(); this.rej(err); return; }
    this.retry();
  }
  /* the live channel went bad (or we decided so): take it down and join again after `delay` ms */
  lost(delay, silent, why){
    if(this.closed || !this.everUp) return;
    if(this.down){ if(delay === 0 && this.timer){ clearTimeout(this.timer); this.timer = 0; this.tries = 0; this.attempt(); } return; }
    // `silent`: a precaution re-join (watchdog / back from the background) — no message unless it takes long
    note('lost', why || '', delay, silent ? 'silent' : '');
    this.down = true; this.downAt = Date.now(); this.silent = !!silent; this.rejoins++; this.tries = 0; chipSet();
    if(!silent){ try{ this.h.status && this.h.status('down'); }catch(e){} }
    this.drop();
    if(delay === 0) this.attempt(); else { this.tries = 1; this.timer = setTimeout(() => { this.timer = 0; this.attempt(); }, delay); }
  }
  retry(){
    if(this.closed || this.timer) return;
    const d = BACKOFF[Math.min(this.tries, BACKOFF.length - 1)]; this.tries++;
    this.timer = setTimeout(() => { this.timer = 0; this.attempt(); }, d);
  }
  attempt(){
    if(this.closed) return;
    if(navigator.onLine === false){ this.retry(); return; }
    this.join();
  }
  /* remove the current channel without waiting; with no other channel on the socket, close the socket too so the next join
     gets a brand-new one (a phone that changed network can hold a socket that looks open but is dead) */
  drop(){
    const ch = this.ch, sb = this.sb; this.ch = null; this.gen++; clearTimeout(this.joinTimer);
    if(!ch) return;
    try{
      const rt = sb.realtime, alone = (rt.channels || []).every(c => c === ch);
      if(alone) rt.disconnect();
      quiet(ch.unsubscribe());
      if(alone){
        rt.sendBuffer = [];
        // the library schedules its own socket reconnect right after telling us about the error; we do the re-join ourselves,
        // so cancel it (it would replace the socket under the new channel)
        const off = () => { try{ if(rt.reconnectTimer) rt.reconnectTimer.reset(); }catch(e){} };
        Promise.resolve().then(off); setTimeout(off, 0);
      }
      if(rt.channels && rt.channels.indexOf(ch) >= 0) rt.channels = rt.channels.filter(c => c !== ch);
    }catch(e){}
  }

  /* ----- presence ----- */
  rx(real){ this.lastRx = Date.now(); if(real) this.silence = SILENCE; }
  onSync(){
    this.rx(false);
    const ch = this.ch; if(!ch) return;
    const st = ch.presenceState(), now = Date.now(), live = new Set();
    let fresh = false;
    for(const k in st){
      const m = st[k]; if(!m || !m.length) continue;
      const meta = Object.assign({}, m[m.length - 1], { id:k });
      delete meta.presence_ref;
      live.add(k);
      if(k !== this.id && meta.ph !== 'probe' && !this.seen.has(k)) fresh = true;
      this.seen.set(k, { meta, gone:0 });
      this.bye.delete(k);
    }
    for(const [k, s] of this.seen){
      if(live.has(k)) continue;
      // gone from the server's list: forget at once after a '_bye', a probe, or when a brand-new player came in (a reload gives
      // the same child a new id); otherwise keep the last known entry for the grace time
      if(k === this.id || this.bye.has(k) || s.meta.ph === 'probe' || fresh){ this.seen.delete(k); this.bye.delete(k); }
      else if(!s.gone) s.gone = now;
    }
    this.emit();
  }
  onBye(id){
    if(!id || id === this.id) return;
    const s = this.seen.get(id);
    if(s && s.gone){ this.seen.delete(id); this.emit(); }
    else this.bye.add(id);
  }
  emit(){
    const list = []; let others = 0, me = false;
    for(const [k, s] of this.seen){ list.push(s.meta); if(k === this.id) me = true; else if(s.meta.ph !== 'probe' && !s.gone) others++; }
    // right after a re-join the server's first list may not hold our own entry yet
    if(!me && this.rejoins && this.meta && this.meta.ph !== 'probe') list.push(Object.assign({}, this.meta, { id:this.id }));
    this.others = others;
    try{ this.h.presence(list); }catch(e){ setTimeout(() => { throw e; }, 0); }
  }
  tick(){
    if(this.closed) return;
    const now = Date.now();
    if(this.down){ chipSet(); return; }
    if(!this.everUp) return;
    if(!this.joined()){
      // 'joining' / 'errored' for a moment is the library's own business; if it stays so, take over
      this.bad = (this.bad || 0) + 1; if(this.bad >= 3){ this.bad = 0; this.lost(0, false, 'state'); }
      return;
    }
    this.bad = 0;
    let ch = false;
    for(const [k, s] of this.seen) if(s.gone && now - s.gone > GRACE){ this.seen.delete(k); ch = true; }
    if(ch) this.emit();
    if(document.visibilityState === 'hidden') return;
    if(this.others > 0){
      if(now - this.lastTx > BEAT) this.push('_hb', {});
      if(now - this.lastRx > this.silence){ this.silence = Math.min(this.silence * 2, 60000); this.lastRx = now; this.lost(0, true, 'silence'); }
    }
  }
  /* back in the foreground / back online */
  wake(hiddenFor){
    if(this.closed || !this.everUp) return;
    if(this.down){ this.lost(0); return; }
    if(!this.joined() || hiddenFor > 30000){ this.lost(0, true, 'wake'); return; }
    if(hiddenFor > 4000 && this.others > 0) this.lastRx = Math.min(this.lastRx, Date.now() - this.silence + 4000);
  }

  /* ----- sending ----- */
  push(ev, p){
    const ch = this.ch; if(!ch || !this.joined()) return false;
    this.lastTx = Date.now();
    try{ quiet(ch.send({ type:'broadcast', event:ev, payload:p })); }catch(e){}
    return true;
  }
  pushTrack(){
    const ch = this.ch; if(!ch || !this.joined() || !this.meta) return;
    try{ quiet(ch.track(Object.assign({}, this.meta))); }catch(e){}
  }
  track(meta){ if(this.closed) return; this.meta = Object.assign({}, meta); this.pushTrack(); }
  send(ev, p){
    if(this.closed) return;
    if(this.push(ev, p)) return;
    if(this.volatile.has(ev) || !this.everUp) return;
    const now = Date.now();
    this.queue = this.queue.filter(m => now - m.t < QUEUE_AGE);
    if(this.queue.length >= QUEUE_MAX) this.queue.shift();
    this.queue.push({ ev, p, t:now });
  }
  stop(){ clearInterval(this.iv); clearTimeout(this.timer); clearTimeout(this.joinTimer); this.timer = 0; this.down = false; conns.delete(this); chipSet(); }
  close(){
    if(this.closed) return;
    this.closed = true; this.stop();
    const ch = this.ch, sb = this.sb; this.ch = null; this.gen++;
    if(!ch) return;
    if(ch.state === 'joined' && sb.realtime.isConnected()){
      try{ quiet(ch.send({ type:'broadcast', event:'_bye', payload:{ id:this.id } })); }catch(e){}
      try{ quiet(ch.untrack()); }catch(e){}
    }
    try{ quiet(sb.removeChannel(ch)); }catch(e){}
  }
}

let hiddenAt = 0;
function wakeAll(){
  const d = hiddenAt ? Date.now() - hiddenAt : 0; hiddenAt = 0;
  conns.forEach(c => c.wake(d));
}
document.addEventListener('visibilitychange', () => {
  if(document.visibilityState === 'hidden'){ if(!hiddenAt) hiddenAt = Date.now(); }
  else wakeAll();
});
window.addEventListener('online', () => conns.forEach(c => c.wake(0)));
window.addEventListener('offline', () => conns.forEach(c => { if(c.everUp && !c.down) c.lost(1000, false, 'offline'); }));
window.addEventListener('pageshow', e => { if(e.persisted) conns.forEach(c => c.wake(60000)); });

/* ---------- names (from the server only) ---------- */
const names = new Map(), askedAt = new Map(), waiting = new Set();
let nameTimer = 0, cbs = new Set();
const okCode = c => typeof c === 'string' && /^[A-Z0-9]{4,12}$/.test(c);
const clean = n => typeof n === 'string' ? n.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 20) : '';
function fc(){
  try{ const F = window.Friends; if(F && F.has && F.has()){ const c = String(F.code || '').toUpperCase(); if(okCode(c)) return c; } }catch(e){}
  return undefined;
}
function name(code){ return (okCode(code) && names.get(code)) || ''; }
function label(p, fallback){ return (p && name(p.fc)) || fallback; }
function flush(){
  nameTimer = 0;
  const F = window.Friends, codes = [...waiting].slice(0, 40), run = cbs; waiting.clear(); cbs = new Set();
  if(!codes.length || !(F && F.names)) return;
  const now = Date.now(); codes.forEach(c => askedAt.set(c, now));
  let p; try{ p = F.names(codes); }catch(e){ return; }
  Promise.resolve(p).then(r => {
    let ch = false;
    if(r && typeof r === 'object') for(const c of codes){ const n = clean(r[c]); if(n && names.get(c) !== n){ names.set(c, n); ch = true; } }
    if(ch) run.forEach(cb => { try{ cb(); }catch(e){ setTimeout(() => { throw e; }, 0); } });
  }).catch(() => {});
}
/* look up the names of the friend codes in a presence list (or an array of codes); cb() runs once if a new name arrived */
function want(list, cb){
  const F = window.Friends; if(!(F && F.names)) return;
  const now = Date.now(); let add = false;
  (list || []).forEach(p => {
    const c = typeof p === 'string' ? p : p && p.fc;
    if(!okCode(c)) return;
    const t = askedAt.get(c);
    if(t && now - t < (names.has(c) ? 300000 : 45000)) return;
    waiting.add(c); add = true;
  });
  if(!add) return;
  if(cb) cbs.add(cb);
  if(!nameTimer) nameTimer = setTimeout(flush, 150);
}

window.BoboRT = {
  open: o => new Conn(o),
  fc, name, label, want,
  _conns: conns, _log: log
};
})();
