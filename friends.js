/* Bobo Land «أصحابي / Friends»: shared client for the friends server (Supabase RPCs `bobo_fr_*`, see supabase/friends.sql).
   Child safety: no names, no free text, no chat. A kid is a random device secret (kept on this phone; the server keeps only
   its SHA-256), a public 6-letter friend code, an avatar id and an optional nickname built from fixed word lists.
   Every call returns a Promise; on failure it rejects with an Error whose .text is a friendly message (Friends.errText).
   `?fr=mock` (remembered for the tab) swaps in an in-memory fake server with the same contract, kept in localStorage,
   while each tab gets its own identity (sessionStorage), so two tabs can play two kids in tests. */
(function(){
'use strict';
const URL_ = 'https://vgpwtrzplggvlsuvqsas.supabase.co', KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
const BASE = (() => { try{ return new URL('.', document.currentScript.src).href; }catch(e){ return './'; } })();
const SITE = 'https://animosalaya-maker.github.io/kids-games/';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/* fixed lists (the server accepts only these ids) */
const AVATARS = { bobo:'', cat:'🐱', dog:'🐶', fox:'🦊', lion:'🦁', tiger:'🐯', panda:'🐼', bear:'🐻', rabbit:'🐰', frog:'🐸', owl:'🦉', penguin:'🐧', monkey:'🐵' };
const ADJ = {
  fast:['سريع','Fast','Hızlı'], brave:['شجاع','Brave','Cesur'], happy:['مبسوط','Happy','Mutlu'], smart:['ذكي','Smart','Akıllı'],
  strong:['قوي','Strong','Güçlü'], funny:['مهضوم','Funny','Komik'], kind:['لطيف','Kind','Nazik'], golden:['ذهبي','Golden','Altın'],
  little:['صغير','Little','Minik'], super:['خارق','Super','Süper'], cool:['رايق','Cool','Havalı'], shiny:['لامع','Shiny','Parlak'] };
const NOUN = {
  tiger:['نمر','Tiger','Kaplan'], lion:['أسد','Lion','Aslan'], rabbit:['أرنب','Rabbit','Tavşan'], falcon:['صقر','Falcon','Şahin'],
  dolphin:['دلفين','Dolphin','Yunus'], bear:['دب','Bear','Ayı'], fox:['ثعلب','Fox','Tilki'], penguin:['بطريق','Penguin','Penguen'],
  cat:['قط','Cat','Kedi'], elephant:['فيل','Elephant','Fil'], horse:['حصان','Horse','At'], star:['نجم','Star','Yıldız'] };
const COLORS = ['purple','pink','green','orange','blue','gold'], HATS = ['cap','bow','top','flower','grad','crown'], GLASSES = ['round','sun','goggles'];

/* storage */
function ss(){ try{ return window.sessionStorage; }catch(e){ return null; } }
function ls(){ try{ return window.localStorage; }catch(e){ return null; } }
function get(st, k){ try{ return st ? st.getItem(k) : null; }catch(e){ return null; } }
function put(st, k, v){ try{ if(st){ if(v == null) st.removeItem(k); else st.setItem(k, v); } }catch(e){} }
const MOCK = (() => {
  let q = null; try{ q = new URLSearchParams(location.search).get('fr'); }catch(e){}
  if(q === 'mock') put(ss(), 'bobo_fr_mock', '1'); else if(q === 'real') put(ss(), 'bobo_fr_mock', null);
  return get(ss(), 'bobo_fr_mock') === '1';
})();
const IDS = MOCK ? ss() : ls(), K_SECRET = MOCK ? 'bobo_fr_secret_mock' : 'bobo_fr_secret', K_CODE = MOCK ? 'bobo_fr_code_mock' : 'bobo_fr_code';

function b64url(bytes){ let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function secret(create){
  let s = get(IDS, K_SECRET);
  if(!s && create){ const b = new Uint8Array(32); crypto.getRandomValues(b); s = b64url(b); put(IDS, K_SECRET, s); }
  return s;
}

/* ---------- fake server for tests (same contract as the SQL functions) ---------- */
function makeMock(load, save, now){
  const ok = s => typeof s === 'string' && s.length >= 43 && s.length <= 128 && /^[A-Za-z0-9_-]+$/.test(s);
  const fail = (code, msg) => { const e = new Error(msg); e.code = code; throw e; };
  const fresh = () => ({ seq:1, kids:[], req:[], fr:[], inv:[] });
  const card = k => ({ code:k.code, avatar:k.avatar, color:k.color, hat:k.hat, glasses:k.glasses, na:k.na, nn:k.nn, online:now() - k.seen < 60000 });
  const isFr = (d, a, b) => d.fr.some(f => f[0] === a && f[1] === b);
  const nFr = (d, a) => d.fr.filter(f => f[0] === a).length;
  const counts = (d, id) => ({ requests:d.req.filter(r => r[1] === id).length,
    invites:d.inv.filter(i => i.to === id && !i.dis && i.exp > now() && isFr(d, id, i.from)).length });
  const byCode = (d, c) => d.kids.find(k => k.code === String(c || '').trim().toUpperCase());
  const befriend = (d, a, b) => { d.req = d.req.filter(r => !((r[0] === a && r[1] === b) || (r[0] === b && r[1] === a))); if(!isFr(d, a, b)) d.fr.push([a, b, now()], [b, a, now()]); };
  const F = {
    bobo_fr_me(d, a){
      if(!ok(a.p_secret)) fail('22023', 'bad_secret');
      let k = d.kids.find(x => x.h === a.p_secret);
      if(!k){
        let c; do{ c = ''; for(let i = 0; i < 6; i++) c += ALPHABET[Math.floor(Math.random() * 32)]; }while(byCode(d, c));
        k = { id:d.seq++, h:a.p_secret, code:c, avatar:'bobo', color:'purple', hat:null, glasses:null, na:null, nn:null, seen:now() }; d.kids.push(k);
      }
      k.seen = now(); return Object.assign(card(k), counts(d, k.id));
    },
    bobo_fr_set_look(d, a, me){
      if(!(a.p_avatar in AVATARS) || !COLORS.includes(a.p_color) || (a.p_hat != null && !HATS.includes(a.p_hat)) || (a.p_glasses != null && !GLASSES.includes(a.p_glasses))) fail('22023', 'bad_look');
      if((a.p_nick_a == null) !== (a.p_nick_n == null) || (a.p_nick_a != null && !(a.p_nick_a in ADJ && a.p_nick_n in NOUN))) fail('22023', 'bad_nick');
      Object.assign(me, { avatar:a.p_avatar, color:a.p_color, hat:a.p_hat || null, glasses:a.p_glasses || null, na:a.p_nick_a || null, nn:a.p_nick_n || null, seen:now() });
      return card(me);
    },
    bobo_fr_request(d, a, me){
      const o = byCode(d, a.p_code); if(!o) return { status:'not_found' };
      if(o.id === me.id) return { status:'self' };
      let st;
      if(isFr(d, me.id, o.id)) st = 'already_friends';
      else if(d.req.some(r => r[0] === o.id && r[1] === me.id)){
        if(nFr(d, me.id) >= 50) return { status:'my_limit' }; if(nFr(d, o.id) >= 50) return { status:'their_limit' };
        befriend(d, me.id, o.id); st = 'accepted';
      } else if(d.req.some(r => r[0] === me.id && r[1] === o.id)) st = 'already_sent';
      else {
        if(nFr(d, me.id) >= 50) return { status:'my_limit' };
        if(d.req.filter(r => r[0] === me.id).length >= 20) return { status:'pending_limit' };
        d.req.push([me.id, o.id, now()]); st = 'sent';
      }
      return { status:st, kid:card(o) };
    },
    bobo_fr_requests(d, a, me){
      const k = id => d.kids.find(x => x.id === id);
      return { incoming:d.req.filter(r => r[1] === me.id).sort((x, y) => y[2] - x[2]).map(r => card(k(r[0]))),
               outgoing:d.req.filter(r => r[0] === me.id).sort((x, y) => y[2] - x[2]).map(r => card(k(r[1]))) };
    },
    bobo_fr_answer(d, a, me){
      const o = byCode(d, a.p_code);
      if(!o || !d.req.some(r => r[0] === o.id && r[1] === me.id)) return { status:'none' };
      if(a.p_accept){
        if(nFr(d, me.id) >= 50) return { status:'my_limit' }; if(nFr(d, o.id) >= 50) return { status:'their_limit' };
        befriend(d, me.id, o.id); return { status:'accepted', kid:card(o) };
      }
      d.req = d.req.filter(r => !(r[0] === o.id && r[1] === me.id)); return { status:'declined' };
    },
    bobo_fr_remove(d, a, me){
      const o = byCode(d, a.p_code); if(!o) return { status:'none' };
      d.fr = d.fr.filter(f => !((f[0] === me.id && f[1] === o.id) || (f[0] === o.id && f[1] === me.id)));
      d.req = d.req.filter(r => !(r[0] === me.id && r[1] === o.id));
      d.inv = d.inv.filter(i => !((i.from === me.id && i.to === o.id) || (i.from === o.id && i.to === me.id)));
      return { status:'removed' };
    },
    bobo_fr_friends(d, a, me){
      return d.fr.filter(f => f[0] === me.id).map(f => [d.kids.find(k => k.id === f[1]), f[2]])
        .sort((x, y) => ((now() - y[0].seen < 60000) - (now() - x[0].seen < 60000)) || y[1] - x[1]).map(x => card(x[0]));
    },
    bobo_fr_heartbeat(d, a, me){ me.seen = now(); return counts(d, me.id); },
    bobo_fr_invite(d, a, me){
      if(!/^[0-9]{4}$/.test(a.p_room || '')) fail('22023', 'bad_room');
      const o = byCode(d, a.p_code); if(!o || !isFr(d, me.id, o.id)) return { status:'not_friends' };
      if(d.inv.filter(i => i.from === me.id && now() - i.t < 60000).length >= 6) return { status:'slow_down' };
      d.inv = d.inv.filter(i => i.exp > now() - 864e5);
      d.inv.forEach(i => { if(i.from === me.id && i.to === o.id) i.dis = true; });
      d.inv.push({ id:d.seq++, from:me.id, to:o.id, room:a.p_room, t:now(), exp:now() + 600000, dis:false }); me.seen = now();
      return { status:'sent' };
    },
    bobo_fr_invites(d, a, me){
      return d.inv.filter(i => i.to === me.id && !i.dis && i.exp > now() && isFr(d, me.id, i.from)).sort((x, y) => y.t - x.t)
        .map(i => ({ id:i.id, room:i.room, from:card(d.kids.find(k => k.id === i.from)), left:Math.max(0, Math.floor((i.exp - now()) / 1000)) }));
    },
    bobo_fr_dismiss(d, a, me){ d.inv.forEach(i => { if(i.id === +a.p_id && i.to === me.id) i.dis = true; }); return { status:'dismissed' }; },
    bobo_fr_delete_me(d, a, me){
      const id = me.id; d.kids = d.kids.filter(k => k.id !== id);
      d.req = d.req.filter(r => r[0] !== id && r[1] !== id); d.fr = d.fr.filter(f => f[0] !== id && f[1] !== id); d.inv = d.inv.filter(i => i.from !== id && i.to !== id);
      return { status:'deleted' };
    }
  };
  return {
    call(fn, args){
      if(!F[fn]) fail('PGRST202', 'no such function');
      const d = load() || fresh(); let me = null;
      if(fn !== 'bobo_fr_me'){
        if(!ok(args.p_secret)) fail('22023', 'bad_secret');
        me = d.kids.find(k => k.h === args.p_secret);
        if(!me){ if(fn === 'bobo_fr_delete_me') return { status:'deleted' }; fail('P0002', 'not_registered'); }
      }
      const r = F[fn](d, args || {}, me); save(d); return JSON.parse(JSON.stringify(r));
    }
  };
}

/* ---------- transport ---------- */
function friendlyError(e){
  const err = new Error(e && e.message || 'error'); err.code = e && e.code || '';
  const offline = navigator.onLine === false || /fetch|network|timeout|load|Failed|offline/i.test(err.message);
  err.offline = offline;
  err.text = offline ? T('ما في إنترنت… الأصحاب بدهم إنترنت 📡', 'No internet… friends need the internet 📡', 'İnternet yok… arkadaşlar için internet lazım 📡')
                     : T('صار شي غلط، جرّب كمان شوي 🙈', 'Something went wrong, try again soon 🙈', 'Bir şeyler ters gitti, birazdan tekrar dene 🙈');
  return err;
}
let sbp = null;
function client(){
  if(sbp) return sbp;
  sbp = new Promise((res, rej) => {
    const make = () => res(window.supabase.createClient(URL_, KEY, { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false, storageKey:'bobo-fr' } }));
    if(window.supabase && window.supabase.createClient) return make();
    const s = document.createElement('script'); s.src = BASE + 'supabase.js';
    s.onload = () => (window.supabase && window.supabase.createClient) ? make() : rej(new Error('load'));
    s.onerror = () => { s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  }).catch(e => { sbp = null; throw e; });
  return sbp;
}
let mock = null;
if(MOCK){
  const st = ls();
  mock = makeMock(() => { try{ return JSON.parse(st.getItem('bobo_fr_mockdb')); }catch(e){ return null; } }, d => { try{ st.setItem('bobo_fr_mockdb', JSON.stringify(d)); }catch(e){} }, () => Date.now());
}
async function rpc(fn, args){
  if(mock){
    await new Promise(r => setTimeout(r, 90));
    if(window.__frOffline) throw friendlyError(new Error('offline'));
    try{ return mock.call(fn, args); }catch(e){ throw friendlyError(e); }
  }
  if(navigator.onLine === false) throw friendlyError(new Error('offline'));
  let r;
  try{
    const sb = await client();
    r = await Promise.race([sb.rpc(fn, args), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
  }catch(e){ throw friendlyError(e); }
  if(r.error){ const m = r.error.message || ''; throw friendlyError({ message:m || 'error', code:r.error.code || (/not_registered/.test(m) ? 'P0002' : '') }); }
  return r.data;
}

/* ---------- API ---------- */
let meCache = null, readyP = null;
function ready(force){
  if(readyP && !force) return readyP;
  readyP = rpc('bobo_fr_me', { p_secret:secret(true) }).then(me => { meCache = me; put(IDS, K_CODE, me.code); return me; }, e => { readyP = null; throw e; });
  return readyP;
}
async function call(fn, extra){
  await ready();
  const go = () => rpc(fn, Object.assign({ p_secret:secret(true) }, extra || {}));
  try{ return await go(); }
  catch(e){ if(e.code === 'P0002'){ await ready(true); return go(); } throw e; }
}
const normCode = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').split('').filter(ch => ALPHABET.includes(ch)).join('');
const isCode = s => typeof s === 'string' && s.length === 6 && [...s].every(ch => ALPHABET.includes(ch));

/* Bobo drawing (same look as the home screen, still pose) */
function drawBobo(c, cx, cy, r, pal){
  c.save(); c.translate(cx, cy);
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, r * .92, r * .78, r * .2, 0, 0, 7); c.fill();
  c.fillStyle = pal.belly; c.beginPath(); c.ellipse(-r * .4, r * .78, r * .24, r * .15, 0, 0, 7); c.ellipse(r * .4, r * .78, r * .24, r * .15, 0, 0, 7); c.fill();
  c.fillStyle = pal.light;
  for(const s of [-1, 1]){ c.beginPath(); c.moveTo(s * r * .62, -r * .45); c.quadraticCurveTo(s * r * .9, -r * 1.15, s * r * .28, -r * .82); c.closePath(); c.fill(); }
  c.fillStyle = pal.color; c.beginPath(); c.arc(0, 0, r * .86, 0, 7);
  for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; c.moveTo(Math.cos(a) * r * .86 + r * .2, Math.sin(a) * r * .86); c.arc(Math.cos(a) * r * .86, Math.sin(a) * r * .86, r * .2, 0, 7); }
  c.fill();
  c.fillStyle = pal.belly; c.beginPath(); c.ellipse(0, r * .32, r * .5, r * .42, 0, 0, 7); c.fill();
  c.fillStyle = 'rgba(255,143,184,.75)'; c.beginPath(); c.ellipse(-r * .56, r * .08, r * .14, r * .09, 0, 0, 7); c.ellipse(r * .56, r * .08, r * .14, r * .09, 0, 0, 7); c.fill();
  const ex = r * .3, ey = -r * .22, er = r * .24;
  for(const s of [-1, 1]){
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex, ey, er, 0, 7); c.fill();
    c.fillStyle = '#2a1f4f'; c.beginPath(); c.arc(s * ex, ey + er * .1, er * .52, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex - er * .18, ey - er * .08, er * .17, 0, 7); c.fill();
  }
  c.strokeStyle = '#2a1f4f'; c.lineWidth = Math.max(1.5, r * .07); c.lineCap = 'round';
  c.beginPath(); c.arc(0, r * .08, r * .24, .2 * Math.PI, .8 * Math.PI); c.stroke();
  c.fillStyle = '#fff'; c.fillRect(-r * .07, r * .28, r * .1, r * .1);
  c.restore();
}
const PAL_FALLBACK = { color:'#9b6bff', light:'#d2bcff', belly:'#b993ff' };
function palOf(k){ const W = window.World; return (W && W.COLORS && W.COLORS[k && k.color]) || PAL_FALLBACK; }
/* An avatar for a friend card: their Bobo (with outfit) or their animal, in a round badge tinted with their colour */
function avatarEl(k, size){
  size = size || 56; k = k || {};
  const pal = palOf(k), el = document.createElement('span');
  el.className = 'fr-av';
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;flex:none;display:grid;place-items:center;position:relative;overflow:hidden;` +
    `background:radial-gradient(circle at 35% 30%, ${pal.light}, ${pal.color});box-shadow:inset 0 -${Math.round(size / 14)}px 0 rgba(0,0,0,.18),0 0 0 3px rgba(255,255,255,.12)`;
  if(k.avatar && AVATARS[k.avatar]){
    el.innerHTML = `<span style="font-size:${Math.round(size * .62)}px;line-height:1;filter:drop-shadow(0 2px 0 rgba(0,0,0,.2))">${AVATARS[k.avatar]}</span>`;
  } else {
    const cv = document.createElement('canvas'), px = Math.round(size * 2); cv.width = cv.height = px;
    cv.style.cssText = `width:${size}px;height:${size}px`;
    const c = cv.getContext('2d'), r = px * .3;
    drawBobo(c, px / 2, px * .58, r, pal);
    if(window.World && World.drawOutfit) World.drawOutfit(c, px / 2, px * .58, r, { hat:k.hat, glasses:k.glasses });
    el.appendChild(cv);
  }
  el.setAttribute('aria-hidden', 'true');
  return el;
}
function nick(k){
  if(!k || !k.na || !ADJ[k.na] || !NOUN[k.nn]) return '';
  const lang = window.I18N ? I18N.lang : 'ar', i = lang === 'ar' ? 0 : lang === 'tr' ? 2 : 1;
  return lang === 'ar' ? NOUN[k.nn][0] + ' ' + ADJ[k.na][0] : ADJ[k.na][i] + ' ' + NOUN[k.nn][i];
}
const fmtCode = c => (c || '').slice(0, 3) + ' ' + (c || '').slice(3);
function gameUrl(base, params){
  const u = new URLSearchParams(params);
  if(MOCK){ u.set('mp', 'local'); }
  return base + '?' + u.toString();
}

/* heartbeat: tells the server "I'm here" every 25 s while the page is visible; cb gets the badge counts */
function startHeartbeat(cb, ms){
  if(!secret(false)) return () => {};
  ms = ms || 25000; let iv = 0, stopped = false;
  const beat = () => { if(stopped || document.visibilityState === 'hidden') return; call('bobo_fr_heartbeat').then(c => { if(cb && !stopped) cb(c); }, () => {}); };
  const vis = () => { if(document.visibilityState === 'visible') beat(); };
  beat(); iv = setInterval(beat, ms); document.addEventListener('visibilitychange', vis);
  return () => { stopped = true; clearInterval(iv); document.removeEventListener('visibilitychange', vis); };
}

/* what to tell the kid after "add friend" (status from bobo_fr_request / bobo_fr_answer) */
function statusText(st){
  return ({
    sent:T('بعتنا الطلب! ✉️ استنّى صاحبك يقبل', 'Request sent! ✉️ Wait for your friend to accept', 'İstek gönderildi! ✉️ Arkadaşının kabul etmesini bekle'),
    already_sent:T('الطلب مبعوت من قبل ⏳', 'Already sent ⏳', 'Zaten gönderildi ⏳'),
    accepted:T('صرتو أصحاب! 🎉', 'You are friends now! 🎉', 'Artık arkadaşsınız! 🎉'),
    already_friends:T('إنتو أصحاب أصلاً 😄', 'You are already friends 😄', 'Zaten arkadaşsınız 😄'),
    self:T('هاد رمزك إنت! 😄', "That's your own code! 😄", 'Bu senin kodun! 😄'),
    not_found:T('ما لقينا هالرمز، تأكّد منه 🔍', "We couldn't find that code, check it 🔍", 'Bu kod bulunamadı, kontrol et 🔍'),
    my_limit:T('عندك ٥٠ صاحب، هاد الحد 🙈', 'You have 50 friends, that is the limit 🙈', '50 arkadaşın var, sınır bu 🙈'),
    their_limit:T('صاحبك عنده أصحاب كتير 🙈', 'Your friend has too many friends 🙈', 'Arkadaşının çok fazla arkadaşı var 🙈'),
    pending_limit:T('بعتت طلبات كتير، استنّى يقبلوا ⏳', 'Too many requests waiting, wait for answers ⏳', 'Çok fazla bekleyen istek var, cevapları bekle ⏳'),
    none:T('هالطلب مش موجود هلّق', 'That request is gone', 'Bu istek artık yok')
  })[st] || T('صار شي غلط، جرّب كمان شوي 🙈', 'Something went wrong, try again soon 🙈', 'Bir şeyler ters gitti, birazdan tekrar dene 🙈');
}

window.Friends = {
  statusText,
  MOCK, ALPHABET, AVATARS, ADJ, NOUN, SITE,
  has: () => !!secret(false),
  get code(){ return (meCache && meCache.code) || get(IDS, K_CODE) || ''; },
  me: force => ready(!!force),
  setLook: o => call('bobo_fr_set_look', { p_avatar:o.avatar || 'bobo', p_color:o.color || 'purple', p_hat:o.hat || null, p_glasses:o.glasses || null, p_nick_a:o.na || null, p_nick_n:o.nn || null })
    .then(c => { meCache = Object.assign({}, meCache, c); return c; }),
  request: code => call('bobo_fr_request', { p_code:normCode(code) }),
  requests: () => call('bobo_fr_requests'),
  answer: (code, yes) => call('bobo_fr_answer', { p_code:code, p_accept:!!yes }),
  remove: code => call('bobo_fr_remove', { p_code:code }),
  list: () => call('bobo_fr_friends'),
  heartbeat: () => call('bobo_fr_heartbeat'),
  invite: (code, room) => call('bobo_fr_invite', { p_code:code, p_room:String(room) }),
  invites: () => call('bobo_fr_invites'),
  dismiss: id => call('bobo_fr_dismiss', { p_id:id }),
  async deleteMe(){
    const s = secret(false);
    if(s) await rpc('bobo_fr_delete_me', { p_secret:s });
    put(IDS, K_SECRET, null); put(IDS, K_CODE, null); meCache = null; readyP = null;
    return { status:'deleted' };
  },
  normCode, isCode, fmtCode, nick, avatarEl, drawBobo, gameUrl, startHeartbeat,
  link: code => SITE + '?friend=' + encodeURIComponent(code),
  errText: e => (e && e.text) || friendlyError(e).text,
  _makeMock: makeMock
};
})();
