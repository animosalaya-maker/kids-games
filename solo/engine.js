/* Solo engine: one kid, full screen, Bobo is the hero. A game file calls Solo.register({...}). See solo/GAME_API.md. */
(function(){
'use strict';
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
if(!CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){ r = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2); this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
}
const store = { get(k, d){ try{ const v = localStorage.getItem('solo_' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } }, set(k, v){ try{ localStorage.setItem('solo_' + k, JSON.stringify(v)); }catch(e){} } };
let actx = null;
function ac(){ if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} } if(actx && actx.state === 'suspended') actx.resume().catch(()=>{}); return actx; }
function tone(freq, dur, type, vol, delay, toFreq){
  const a = ac(); if(!a) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0); if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  tap(){ tone(520,.05,'triangle',.08); }, good(){ tone(784,.1,'triangle',.13); tone(1046,.16,'triangle',.12,.08); },
  bad(){ tone(180,.25,'sawtooth',.07,0,110); }, pop(){ tone(900,.07,'square',.06,0,300); },
  coin(){ tone(988,.07,'square',.06); tone(1318,.12,'square',.06,.06); }, jump(){ tone(400,.15,'sine',.1,0,800); },
  hit(){ tone(200,.1,'square',.08,0,100); }, swoosh(){ tone(800,.12,'sawtooth',.04,0,200); },
  win(){ [523,659,784,1046,784,1046,1318].forEach((f,i)=>tone(f,.2,'triangle',.14,i*.11)); },
  over(){ [440,370,311,262].forEach((f,i)=>tone(f,.22,'sine',.12,i*.13)); }
};
function say(str){ try{ if(!('speechSynthesis' in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(str); u.lang = 'ar-SA'; u.rate = 0.9; u.pitch = 1.15; speechSynthesis.speak(u); }catch(e){} }

const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
function text(c, str, x, y, size, color, weight){
  c.save(); c.font = (weight || 800) + ' ' + Math.round(size) + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl'; c.lineJoin = 'round';
  c.strokeStyle = 'rgba(0,0,0,.35)'; c.lineWidth = Math.max(2, size * 0.12); c.strokeText(str, x, y); c.fillStyle = color || '#fff7e8'; c.fillText(str, x, y); c.restore();
}
function emoji(c, ch, x, y, size, rot){ c.save(); c.translate(x, y); if(rot) c.rotate(rot); c.font = Math.round(size) + 'px ' + EMOJI_FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, 0, size * 0.05); c.restore(); }

/* Bobo, in the colour and clothes the kid picked in the wardrobe */
function bobo(c, cx, cy, r, mood, look, t){
  const pal = window.World ? World.palette() : { color:'#9b6bff', light:'#d2bcff', belly:'#b993ff' };
  t = t == null ? performance.now() / 1000 : t; look = look || { x:0, y:0 };
  c.save(); c.translate(cx, cy);
  const sq = 1 + Math.sin(t * 8) * 0.04;
  c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(0, r * 0.92, r * 0.78, r * 0.2, 0, 0, Math.PI * 2); c.fill();
  c.scale(1 / sq, sq);
  c.fillStyle = pal.belly; c.beginPath(); c.ellipse(-r * 0.4, r * 0.78, r * 0.24, r * 0.15, 0, 0, Math.PI * 2); c.ellipse(r * 0.4, r * 0.78, r * 0.24, r * 0.15, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = pal.light; for(const s of [-1, 1]){ c.beginPath(); c.moveTo(s * r * 0.62, -r * 0.45); c.quadraticCurveTo(s * r * 0.9, -r * 1.15, s * r * 0.28, -r * 0.82); c.closePath(); c.fill(); }
  c.fillStyle = pal.color; c.beginPath(); c.arc(0, 0, r * 0.86, 0, Math.PI * 2);
  for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; c.moveTo(Math.cos(a) * r * 0.86 + r * 0.2, Math.sin(a) * r * 0.86); c.arc(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, r * 0.2, 0, Math.PI * 2); }
  c.fill();
  c.fillStyle = pal.belly; c.beginPath(); c.ellipse(0, r * 0.32, r * 0.5, r * 0.42, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = 'rgba(255,143,184,.75)'; c.beginPath(); c.ellipse(-r * 0.56, r * 0.08, r * 0.14, r * 0.09, 0, 0, Math.PI * 2); c.ellipse(r * 0.56, r * 0.08, r * 0.14, r * 0.09, 0, 0, Math.PI * 2); c.fill();
  const ex = r * 0.3, ey = -r * 0.22;
  if(mood === 'sleep'){ c.strokeStyle = '#2a1f4f'; c.lineWidth = Math.max(1.5, r * 0.08); c.lineCap = 'round'; for(const s of [-1, 1]){ c.beginPath(); c.arc(s * ex, ey, r * 0.15, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); } }
  else { const er = r * 0.24; for(const s of [-1, 1]){ c.fillStyle = '#fff'; c.beginPath(); c.arc(s * ex, ey, er, 0, Math.PI * 2); c.fill(); c.fillStyle = '#2a1f4f'; c.beginPath(); c.arc(s * ex + look.x * er * 0.4, ey + look.y * er * 0.4, er * 0.52, 0, Math.PI * 2); c.fill(); } }
  c.fillStyle = '#2a1f4f'; c.strokeStyle = '#2a1f4f'; c.lineWidth = Math.max(1.5, r * 0.07); c.lineCap = 'round';
  if(mood === 'happy' || mood === 'wow'){ c.beginPath(); c.ellipse(0, r * 0.2, r * 0.2, r * (mood === 'wow' ? 0.2 : 0.14), 0, 0, Math.PI * 2); c.fill(); }
  else if(mood === 'sad'){ c.beginPath(); c.arc(0, r * 0.42, r * 0.2, 1.15 * Math.PI, 1.85 * Math.PI); c.stroke(); }
  else { c.beginPath(); c.arc(0, r * 0.08, r * 0.24, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-r * 0.07, r * 0.28, r * 0.1, r * 0.1); }
  c.restore();
  if(window.World) World.drawOutfit(c, cx, cy, r);
}

const GAMES = []; function register(def){ GAMES.push(def); }
let cv, ctx, W = 0, H = 0, dpr = 1, cur = null, inst = null, phase = 'menu', runT = 0, banner = null, result = null;
const pointers = new Map();
const api = {
  get W(){ return W; }, get H(){ return H; }, get time(){ return runT; },
  sfx: SFX, tone, say, text, emoji, bobo, AR, FONT,
  rand: (a, b) => a + Math.random() * (b - a), clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  shuffle: arr => { const a = arr.slice(); for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  toast(str, ms){ banner = { str, until: performance.now() + (ms || 1200) }; },
  end(r){ if(phase !== 'play') return; finish(r || {}); }
};
function fit(){ dpr = Math.min(2.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); if(inst && inst.resize) inst.resize(); }

function finish(r){
  phase = 'result'; pointers.clear();
  const score = Math.max(0, Math.round(r.score || 0)), best = store.get('best_' + cur.id, 0), isBest = score > best && score > 0;
  if(isBest) store.set('best_' + cur.id, score);
  const coins = Math.max(1, Math.min(25, r.coins != null ? Math.round(r.coins) : Math.ceil(score / 2)));
  if(window.World){ World.addCoins(coins); if(World.track) World.track('solo', cur.id, score); }
  result = { score, best: Math.max(best, score), isBest, coins, win: !!r.win, msg: r.msg };
  (r.win || isBest ? SFX.win : SFX.over)();
  const el = document.getElementById('result');
  el.querySelector('.r-emo').textContent = r.win ? '🏆' : isBest ? '🌟' : '👏';
  el.querySelector('h2').textContent = r.msg || (r.win ? 'برافو! خلصتها' : isBest ? 'رقم جديد!' : 'حلو كتير!');
  el.querySelector('.r-score').textContent = AR(score);
  el.querySelector('.r-best').textContent = 'أحسن نتيجة: ' + AR(result.best);
  el.querySelector('.r-coins').textContent = '+' + AR(coins) + ' 🪙';
  setTimeout(() => { if(phase === 'result') el.hidden = false; }, 700);
}
function openGame(def){
  ac(); cur = def; inst = null; phase = 'intro';
  document.getElementById('menu').hidden = true; document.getElementById('play').hidden = false; document.getElementById('result').hidden = true;
  const it = document.getElementById('intro'); it.hidden = false;
  it.querySelector('.i-emo').textContent = def.emoji; it.querySelector('h2').textContent = def.title; it.querySelector('p').textContent = def.help;
  it.querySelector('.i-best').textContent = 'أحسن نتيجة: ' + AR(store.get('best_' + def.id, 0));
  it.style.setProperty('--bg', def.bg || '#9b6bff');
}
function start(){
  document.getElementById('intro').hidden = true; document.getElementById('result').hidden = true;
  inst = cur.create(api) || {}; runT = 0; banner = null; phase = 'play'; SFX.tap();
}
function backToMenu(){
  if(location.hash){ history.replaceState(null, '', location.pathname + location.search); }
  phase = 'menu'; cur = null; inst = null; pointers.clear();
  document.getElementById('menu').hidden = false; document.getElementById('play').hidden = true;
  document.getElementById('intro').hidden = true; document.getElementById('result').hidden = true;
}
function P(e){ return { id:e.pointerId, x:e.clientX, y:e.clientY }; }
function onDown(e){ e.preventDefault(); ac(); const p = Object.assign(P(e), { startX:e.clientX, startY:e.clientY }); pointers.set(e.pointerId, p); if(phase === 'play' && inst.pointerDown) inst.pointerDown(p); }
function onMove(e){ const p = pointers.get(e.pointerId); if(!p) return; p.x = e.clientX; p.y = e.clientY; if(phase === 'play' && inst.pointerMove) inst.pointerMove(p); }
function onUp(e){ const p = pointers.get(e.pointerId); if(!p) return; p.x = e.clientX; p.y = e.clientY; pointers.delete(e.pointerId); if(phase === 'play' && inst.pointerUp) inst.pointerUp(p); }

let last = 0;
function frame(now){
  const dt = Math.min(0.033, (now - last) / 1000 || 0); last = now;
  if(cur && inst){
    if(phase === 'play'){ runT += dt; if(inst.update) inst.update(dt); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.save(); if(inst.draw) inst.draw(ctx); ctx.restore();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if(banner && now < banner.until) text(ctx, banner.str, W / 2, H * 0.3, Math.min(34, W * 0.08), '#fff7e8');
  }
  requestAnimationFrame(frame);
}
function buildMenu(){
  const grid = document.getElementById('grid'); grid.innerHTML = '';
  GAMES.forEach(g => { const b = document.createElement('button'); b.className = 'tile'; b.style.setProperty('--bg', g.bg || '#9b6bff');
    b.innerHTML = '<span class="em">' + g.emoji + '</span><span class="nm">' + g.title + '</span>'; b.onclick = () => openGame(g); grid.appendChild(b); });
}
function openFromHash(){ const g = GAMES.find(x => x.id === location.hash.slice(1)); if(g) openGame(g); }
function boot(){
  cv = document.getElementById('cv'); ctx = cv.getContext('2d'); fit(); addEventListener('resize', fit);
  cv.addEventListener('pointerdown', onDown); cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointercancel', onUp);
  addEventListener('contextmenu', e => e.preventDefault());
  document.getElementById('quit').onclick = backToMenu;
  document.getElementById('goBtn').onclick = start;
  document.getElementById('again').onclick = () => openGame(cur);
  document.getElementById('toMenu').onclick = backToMenu;
  document.querySelectorAll('[data-home]').forEach(b => b.onclick = backToMenu);
  buildMenu();
  const want = new URLSearchParams(location.search).get('game') || location.hash.slice(1);
  const g = GAMES.find(x => x.id === want); if(g) openGame(g);
  addEventListener('hashchange', openFromHash);
  requestAnimationFrame(frame);
  if('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('../sw.js').catch(() => {});
}
window.Solo = { register, boot, api, GAMES, _debug:{ get phase(){ return phase; }, get result(){ return result; }, get inst(){ return inst; }, start(){ if(cur) start(); } } };
})();
