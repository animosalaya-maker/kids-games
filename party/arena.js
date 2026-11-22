/* Friends Party — "arena" mini-games: 1–4 kids on ONE phone held sideways, each with a joystick in their own corner,
   empty seats played by bots. Loaded by party/index.html before its main script, which calls PartyArena(api) once
   and merges .games into its GAMES (same round flow, countdown and scoreboard as the button games).
   Games: tiles (Falling Tiles 🌋), haunt (Haunted Yard 👻), bunny (Bunny Round-up 🐰), soccer (Mini Soccer ⚽).
   Drawing: plain canvas 2D, static scenery baked once per round into an offscreen canvas (fast on mid phones).
   Always landscape: the stage is rotated in-page when the phone is upright (no screen.orientation.lock). */
(function(){
'use strict';
const TAU = Math.PI * 2, INK = '#1c1838';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const hyp = Math.hypot;
// each colour's screen corner: red bottom-left, blue top-right, green bottom-right, yellow top-left
const LEFT = i => i === 0 || i === 3, TOP = i => i === 1 || i === 3;
const LIGHT = ['#ffc2c3', '#c4e4ff', '#c2f5d6', '#ffeaa8'];
function srand(seed){ let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

window.PartyArena = function(api){
const { L, SFX, tone } = api;
const AR = api.AR;
const PL = () => api.players();
const PC = api.PLAYERS.map((p, i) => ({ color:p.color, dark:p.dark, light:LIGHT[i] }));
const GHOSTPC = api.PLAYERS.map((p, i) => ({ color:LIGHT[i], dark:p.color, light:'#ffffff' }));
const GREYPC = { color:'#b3aed0', dark:'#7a7499', light:'#ecebf7' };
const pcOf = i => i >= 0 ? PC[i] : GREYPC;

/* ---------- Stage (always landscape) ---------- */
const css = `
#arena{position:fixed;left:0;top:0;overflow:hidden;transform-origin:0 0;z-index:3;touch-action:none;background:#1c1838;-webkit-user-select:none;user-select:none}
#arena[hidden]{display:none}
#acv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}
#amsg{position:absolute;left:50%;top:52%;transform:translate(-50%,-50%);max-width:min(64%,520px);text-align:center;pointer-events:none;z-index:2;
  font-family:var(--display);font-weight:800;line-height:1.15;color:#fff7e8;text-shadow:0 3px 0 rgba(0,0,0,.4);
  background:rgba(28,24,56,.78);border-radius:24px;padding:10px 22px 12px;box-shadow:0 0 0 3px rgba(255,255,255,.14),0 14px 30px rgba(0,0,0,.35)}
#amsg:empty{display:none}
#amsg .big{display:block;font-size:34px;text-wrap:balance}
#amsg .small{display:block;font-family:var(--body);font-weight:700;font-size:16px;color:#d9d2ff;text-shadow:none;margin-top:4px;line-height:1.45;text-wrap:balance}
#arena.short #amsg .big{font-size:28px} #arena.short #amsg .small{font-size:14px}
#aquit{position:absolute;top:5px;left:150px;z-index:3;width:34px;height:34px;border-radius:12px;border:0;
  background:rgba(54,46,104,.85);color:#fff7e8;font-size:17px;display:grid;place-items:center;opacity:.85;box-shadow:0 3px 0 rgba(0,0,0,.3)}
body.arena #cv,body.arena #buttons,body.arena #msgA,body.arena #msgB,body.arena #btnQuit{display:none!important}`;
const stEl = document.createElement('style'); stEl.textContent = css; document.head.appendChild(stEl);
const stage = document.createElement('div'); stage.id = 'arena'; stage.hidden = true;
stage.innerHTML = '<canvas id="acv" aria-label="' + L('ساحة اللعب', 'Play arena', 'Oyun arenası') + '"></canvas><div id="amsg"></div>' +
  '<button id="aquit" type="button" aria-label="' + L('القائمة', 'Menu', 'Menü') + '">✕</button>';
document.body.appendChild(stage);
const cv = stage.querySelector('#acv'), c = cv.getContext('2d'), msgEl = stage.querySelector('#amsg');
stage.querySelector('#aquit').addEventListener('click', e => { e.stopPropagation(); api.quit(); });
['pointerdown'].forEach(t => stage.querySelector('#aquit').addEventListener(t, e => e.stopPropagation()));

let on = false, ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, dpr = 1, sizeKey = '';
let JR = 46, BR = 28;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const st = stage.style; st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? 'translateX(' + VW + 'px) rotate(90deg)' : 'none';
  stage.classList.toggle('short', SH <= 380);
  cv.width = Math.round(SW * dpr); cv.height = Math.round(SH * dpr);
  JR = clamp(Math.round(SH * 0.11), 36, 58); BR = Math.round(JR * 0.62);
  sizeKey = SW + 'x' + SH + '@' + dpr;
  stage.querySelector('#aquit').style.left = Math.round(Math.max(JR * 2 + 30, SW / 2 - 262)) + 'px';
  rotOverlay();
}
function rotOverlay(){ // the champion card shows inside the same sideways view
  const ov = document.getElementById('overlay'); if(!ov) return;
  const s = ov.style;
  if(on && ROT){ s.inset = 'auto'; s.left = '0'; s.top = '0'; s.width = SW + 'px'; s.height = SH + 'px'; s.transformOrigin = '0 0'; s.transform = 'translateX(' + VW + 'px) rotate(90deg)'; }
  else { s.inset = ''; s.left = ''; s.top = ''; s.width = ''; s.height = ''; s.transformOrigin = ''; s.transform = ''; }
}
addEventListener('resize', () => { if(on) layout(); });
function toLayer(cx, cy){ return ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy }; }

/* ---------- World <-> screen ---------- */
let K = 4, OX = 0, OY = 0, worldKey = '';
const X = x => OX + x * K, Y = y => OY + y * K;
function setWorld(g){
  const side = Math.max(JR * 2 + 28, SW * 0.13), top = 44, bot = 8;
  const w = SW - side * 2, h = SH - top - bot;
  K = Math.min(w / g.wW, h / (g.wH + (g.padB || 0)));
  OX = SW / 2 - g.wW * K / 2; OY = top + h / 2 - (g.wH + (g.padB || 0)) * K / 2;
  worldKey = sizeKey + g.key;
}
const bg = document.createElement('canvas'), bgc = bg.getContext('2d');
let bgKey = '';
function bake(g){
  setWorld(g);
  bg.width = cv.width; bg.height = cv.height;
  bgc.setTransform(dpr, 0, 0, dpr, 0, 0); bgc.clearRect(0, 0, SW, SH);
  g.bake(bgc);
  bgKey = worldKey;
}

/* ---------- Input: one floating joystick + one action button per human, multi-touch ---------- */
const pads = [0, 1, 2, 3].map(() => ({ x:0, y:0, act:0, used:0, pid:null, bpid:null, bx:0, by:0, kx:0, ky:0, down:false }));
const keys = new Set();
function home(i){ const m = 12; return { x: LEFT(i) ? m + JR + 4 : SW - m - JR - 4, y: TOP(i) ? m + JR + 4 : SH - m - JR - 4 }; }
function btnPos(i){ const h = home(i); return { x: LEFT(i) ? h.x - JR * 0.3 : h.x + JR * 0.3, y: TOP(i) ? h.y + JR + BR + 16 : h.y - JR - BR - 16 }; }
function humans(){ return PL().map((p, i) => p.bot ? -1 : i).filter(i => i >= 0); }
function owner(p){ // whose touch is this? the human whose corner is nearest
  const hs = humans(); if(!hs.length) return -1;
  let best = -1, bd = 1e9;
  hs.forEach(i => { const h = home(i), d = hyp(p.x - h.x, p.y - h.y); if(d < bd){ bd = d; best = i; } });
  return best;
}
function setStick(pd, p){
  let dx = p.x - pd.bx, dy = p.y - pd.by; const d = hyp(dx, dy);
  if(d > JR){ pd.bx += dx * (1 - JR / d); pd.by += dy * (1 - JR / d); dx = p.x - pd.bx; dy = p.y - pd.by; } // the base follows the thumb
  pd.kx = dx; pd.ky = dy;
  const m = Math.min(1, hyp(dx, dy) / JR);
  if(m < 0.14){ pd.x = 0; pd.y = 0; } else { const a = Math.atan2(dy, dx); pd.x = Math.cos(a) * m; pd.y = Math.sin(a) * m; }
}
function resetPad(pd, i){ pd.pid = null; pd.x = pd.y = pd.kx = pd.ky = 0; const h = home(i); pd.bx = h.x; pd.by = h.y; }
stage.addEventListener('pointerdown', e => {
  if(!on) return; e.preventDefault(); if(api.ac) api.ac();
  const p = toLayer(e.clientX, e.clientY), i = owner(p); if(i < 0) return;
  const pd = pads[i], b = btnPos(i), solo = humans().length === 1;
  if(hyp(p.x - b.x, p.y - b.y) < BR * 1.55 || (solo && p.x > SW * 0.5)){ pd.act++; pd.bpid = e.pointerId; pd.down = true; return; }
  if(pd.pid != null) return;
  pd.pid = e.pointerId; pd.bx = clamp(p.x, JR + 6, SW - JR - 6); pd.by = clamp(p.y, JR + 6, SH - JR - 6); setStick(pd, p);
}, { passive:false });
stage.addEventListener('pointermove', e => {
  if(!on) return; const p = toLayer(e.clientX, e.clientY);
  pads.forEach(pd => { if(pd.pid === e.pointerId) setStick(pd, p); });
}, { passive:true });
function release(e){ pads.forEach((pd, i) => { if(pd.pid === e.pointerId) resetPad(pd, i); if(pd.bpid === e.pointerId){ pd.bpid = null; pd.down = false; } }); }
['pointerup', 'pointercancel'].forEach(t => stage.addEventListener(t, release));
addEventListener('blur', () => pads.forEach((pd, i) => { resetPad(pd, i); pd.bpid = null; pd.down = false; }));
// keyboard for desktop: red = WASD + Space, blue = arrows + Enter
const KEYMAP = { KeyW:[0, 0, -1], KeyS:[0, 0, 1], KeyA:[0, -1, 0], KeyD:[0, 1, 0], ArrowUp:[1, 0, -1], ArrowDown:[1, 0, 1], ArrowLeft:[1, -1, 0], ArrowRight:[1, 1, 0] };
addEventListener('keydown', e => {
  if(!on) return;
  if(KEYMAP[e.code]){ keys.add(e.code); e.preventDefault(); }
  else if(e.code === 'Space' && !e.repeat){ pads[0].act++; e.preventDefault(); }
  else if(e.code === 'Enter' && !e.repeat){ pads[1].act++; e.preventDefault(); }
});
addEventListener('keyup', e => keys.delete(e.code));
function humanInput(i){
  const pd = pads[i]; let x = pd.x, y = pd.y;
  keys.forEach(k => { const m = KEYMAP[k]; if(m && m[0] === i){ x += m[1]; y += m[2]; } });
  const act = pd.act > pd.used; pd.used = pd.act;
  return { x, y, act };
}
function input(b, g, dt){
  const p = b.i >= 0 ? PL()[b.i] : null;
  if(!p || p.bot) return g.bot(b, dt) || { x:0, y:0, act:false };
  return humanInput(b.i);
}
function freshInput(){ pads.forEach(pd => pd.used = pd.act); }

/* ---------- Bodies ---------- */
function mkBody(i, x, y, r){ return { i, x, y, vx:0, vy:0, r, fx:0, fy: TOP(i) ? 1 : -1, dash:0, cd:0, kcd:0, walk:0, h:0, stun:0, blink:0, sq:0, ai:{ t:0, tx:x, ty:y } }; }
function drive(b, inp, dt, sp){
  let ix = inp.x, iy = inp.y; const m = hyp(ix, iy);
  if(m > 1){ ix /= m; iy /= m; }
  if(b.stun > 0){ ix = 0; iy = 0; }
  const boost = b.dash > 0 ? 2.3 : 1, s = sp * boost, a = Math.min(1, dt * (b.dash > 0 ? 14 : 9));
  b.vx += (ix * s - b.vx) * a; b.vy += (iy * s - b.vy) * a;
  b.x += b.vx * dt; b.y += b.vy * dt;
  const mm = hyp(ix, iy);
  if(mm > 0.2){ const k = Math.min(1, dt * 14); b.fx += (ix / mm - b.fx) * k; b.fy += (iy / mm - b.fy) * k; const f = hyp(b.fx, b.fy) || 1; b.fx /= f; b.fy /= f; }
  b.walk += hyp(b.vx, b.vy) * dt * 0.55;
}
function tick(b, dt){ b.dash = Math.max(0, b.dash - dt); b.cd = Math.max(0, b.cd - dt); b.kcd = Math.max(0, b.kcd - dt); b.stun = Math.max(0, b.stun - dt); b.blink = Math.max(0, b.blink - dt); b.sq *= Math.max(0, 1 - dt * 8); }
function tryDash(b, inp, cdT){
  if(!inp.act || b.cd > 0 || b.stun > 0) return false;
  b.dash = 0.2; b.cd = cdT || 1.3;
  const s = hyp(b.vx, b.vy); if(s < 5){ b.vx = b.fx * 30; b.vy = b.fy * 30; }
  tone(320, .14, 'sine', .08, 0, 760); return true;
}
function collide(list, onHit){
  for(let a = 0; a < list.length; a++) for(let q = a + 1; q < list.length; q++){
    const A = list[a], B = list[q];
    const dx = B.x - A.x, dy = B.y - A.y, d = hyp(dx, dy) || 0.001, m = A.r + B.r; if(d >= m) continue;
    const nx = dx / d, ny = dy / d, o = (m - d) / 2;
    A.x -= nx * o; A.y -= ny * o; B.x += nx * o; B.y += ny * o;
    const rv = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
    if(rv < 0){
      const j = -rv * 0.8, wa = A.dash > 0 ? 0.35 : 1, wb = B.dash > 0 ? 0.35 : 1;
      A.vx -= nx * j * wa; A.vy -= ny * j * wa; B.vx += nx * j * wb; B.vy += ny * j * wb;
      if(onHit) onHit(A, B, -rv);
      if(-rv > 22){ tone(230, .09, 'triangle', .09, 0, 120); A.sq = B.sq = 0.18; }
    }
  }
}
function toward(b, tx, ty, slow){
  const dx = tx - b.x, dy = ty - b.y, d = hyp(dx, dy);
  if(d < 0.6) return { x:0, y:0 };
  const s = Math.min(1, d / (slow || 3)); return { x:dx / d * s, y:dy / d * s };
}
function nearestBy(list, f){ let best = null, bd = 1e9; list.forEach(o => { const d = f(o); if(d < bd){ bd = d; best = o; } }); return best; }

/* ---------- Particles ---------- */
let FX = [], CONF = [];
function puff(x, y, col, n, sp, kind){ for(let k = 0; k < n; k++){ const a = Math.random() * TAU, s = rnd(sp * 0.4, sp); FX.push({ x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, t:0, life:rnd(0.4, 0.8), col, kind:kind || 'dot', s:rnd(0.6, 1.4) }); } }
function floatText(x, y, txt, col){ FX.push({ x, y, vx:0, vy:-10, t:0, life:1.1, col:col || '#fff7e8', kind:'text', txt, s:1 }); }
function drawFX(dt){
  FX = FX.filter(p => (p.t += dt) < p.life);
  FX.forEach(p => {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94;
    const k = 1 - p.t / p.life, x = X(p.x), y = Y(p.y);
    c.globalAlpha = Math.max(0, k);
    if(p.kind === 'text') text(p.txt, x, y - p.t * 12, 15 + K * 1.2, p.col);
    else if(p.kind === 'ring'){ c.strokeStyle = p.col; c.lineWidth = 3; c.beginPath(); c.arc(x, y, K * (2 + p.t * 18) * p.s, 0, TAU); c.stroke(); }
    else if(p.kind === 'star'){ starPath(x, y, K * 1.1 * p.s * (0.5 + k * 0.5)); c.fillStyle = p.col; c.fill(); }
    else { c.fillStyle = p.col; c.beginPath(); c.arc(x, y, K * 0.7 * p.s * (0.4 + k * 0.6), 0, TAU); c.fill(); }
  });
  c.globalAlpha = 1;
}
function confetti(){
  const cols = ['#ff5a5f', '#3fa9ff', '#3fd47a', '#ffc233', '#b46cff', '#fff7e8'];
  for(let k = 0; k < 90; k++) CONF.push({ x:rnd(0, SW), y:rnd(-SH * 0.6, -10), vx:rnd(-30, 30), vy:rnd(60, 160), r:rnd(0, TAU), vr:rnd(-8, 8), w:rnd(5, 10), col:cols[k % cols.length] });
}
function drawConf(dt){
  CONF = CONF.filter(p => p.y < SH + 20);
  CONF.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w * 0.3, p.w, p.w * 0.6); c.restore(); });
}

/* ---------- Drawing helpers ---------- */
function rr(g, x, y, w, h, r){ g.beginPath(); if(g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
function starPath(x, y, R){ c.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? R * 0.45 : R; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); }
function text(s, x, y, size, color, g, align){
  g = g || c; g.font = '800 ' + Math.round(size) + 'px ' + FONT; g.textAlign = align || 'center'; g.direction = /[\u0600-\u06ff]/.test(s) ? 'rtl' : 'ltr'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = Math.max(3, size * 0.18); g.strokeStyle = INK; g.strokeText(s, x, y); g.fillStyle = color || '#fff7e8'; g.fillText(s, x, y);
}
function emo(s, x, y, size, g){ g = g || c; g.font = Math.round(size) + 'px ' + EMOJI; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function shadow(g, x, y, rx, ry, a){ g.fillStyle = 'rgba(20,8,40,' + (a == null ? 0.3 : a) + ')'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); }

/* A round jelly-bean buddy seen from above at a slant. (x, y) = the ground point under it, r = radius in px. */
function bean(x, y, r, pc, o){
  o = o || {};
  const h = o.h || 0, fx = o.fx || 0, fy = o.fy == null ? 1 : o.fy, t = o.t || 0, ghost = !!o.ghost;
  if(!ghost){ const s = Math.max(0.45, 1 - h / (r * 4)); shadow(c, x, y, r * 0.95 * s, r * 0.42 * s, 0.32 * s); }
  else shadow(c, x, y + r * 0.3, r * 0.6, r * 0.22, 0.12);
  c.save(); c.translate(x, y - r * 0.62 - h);
  if(o.alpha != null) c.globalAlpha = o.alpha;
  const sq = o.sq || 0; c.scale(1 + sq, 1 - sq);
  if(!ghost){ // little feet stepping
    const st = Math.sin(o.walk || 0) * r * 0.14; c.fillStyle = pc.dark;
    c.beginPath(); c.ellipse(-r * 0.45, r * 0.8 - st, r * 0.27, r * 0.19, 0, 0, TAU); c.fill();
    c.beginPath(); c.ellipse(r * 0.45, r * 0.8 + st, r * 0.27, r * 0.19, 0, 0, TAU); c.fill();
  } else { // a wavy little tail instead of feet
    c.fillStyle = pc.color; c.beginPath(); c.moveTo(-r * 0.8, r * 0.3);
    for(let k = 0; k <= 4; k++) c.lineTo(-r * 0.8 + k * r * 0.4, r * (k % 2 ? 1.25 : 0.95) + Math.sin(t * 8 + k) * r * 0.06);
    c.lineTo(r * 0.8, r * 0.3); c.fill();
  }
  if(o.arms){ // cheering arms
    c.fillStyle = pc.color; c.strokeStyle = 'rgba(28,24,56,.7)'; c.lineWidth = Math.max(1.2, r * 0.08);
    for(const s of [-1, 1]){ const ay = -r * 0.35 + Math.sin(t * 11 + s) * r * 0.25; c.beginPath(); c.arc(s * r * 1.08, ay, r * 0.24, 0, TAU); c.fill(); c.stroke(); }
  }
  const g = c.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.08, 0, 0, r * 1.1);
  g.addColorStop(0, pc.light); g.addColorStop(0.5, pc.color); g.addColorStop(1, pc.dark);
  c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, r, r * 1.04, 0, 0, TAU); c.fill();
  c.lineWidth = Math.max(1.5, r * 0.1); c.strokeStyle = 'rgba(28,24,56,.8)'; c.stroke();
  c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-r * 0.4, -r * 0.52, r * 0.24, r * 0.13, -0.6, 0, TAU); c.fill();
  if(fy > -0.82){
    const ex = fx * r * 0.36, ey = Math.max(-0.45, fy) * r * 0.2 - r * 0.12, mood = o.mood || 'idle';
    for(const s of [-1, 1]){
      const cx0 = ex + s * r * 0.3;
      if(mood === 'cheer'){ c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.1); c.lineCap = 'round'; c.beginPath(); c.arc(cx0, ey + r * 0.04, r * 0.13, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      else if(mood === 'dizzy'){ c.strokeStyle = INK; c.lineWidth = Math.max(1.5, r * 0.09); c.beginPath(); c.moveTo(cx0 - r * 0.11, ey - r * 0.11); c.lineTo(cx0 + r * 0.11, ey + r * 0.11); c.moveTo(cx0 + r * 0.11, ey - r * 0.11); c.lineTo(cx0 - r * 0.11, ey + r * 0.11); c.stroke(); }
      else {
        c.fillStyle = '#fff'; c.beginPath(); c.ellipse(cx0, ey, r * 0.19, r * 0.22, 0, 0, TAU); c.fill();
        c.fillStyle = INK; c.beginPath(); c.arc(cx0 + fx * r * 0.06, ey + fy * r * 0.05, r * 0.11, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(cx0 + fx * r * 0.06 - r * 0.04, ey + fy * r * 0.05 - r * 0.05, r * 0.035, 0, TAU); c.fill();
      }
    }
    c.fillStyle = 'rgba(255,110,140,.45)';
    for(const s of [-1, 1]){ c.beginPath(); c.ellipse(ex + s * r * 0.52, ey + r * 0.22, r * 0.13, r * 0.08, 0, 0, TAU); c.fill(); }
    c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = Math.max(1.4, r * 0.08); c.lineCap = 'round';
    if(mood === 'cheer' || mood === 'happy'){ c.beginPath(); c.arc(ex, ey + r * 0.24, r * 0.16, 0, Math.PI); c.fill(); }
    else if(mood === 'dizzy'){ c.beginPath(); c.ellipse(ex, ey + r * 0.32, r * 0.08, r * 0.1, 0, 0, TAU); c.fill(); }
    else { c.beginPath(); c.arc(ex, ey + r * 0.2, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
  }
  if(o.halo){ c.strokeStyle = '#ffe27a'; c.lineWidth = Math.max(2, r * 0.13); c.beginPath(); c.ellipse(0, -r * 1.3, r * 0.5, r * 0.16, 0, 0, TAU); c.stroke(); }
  c.restore();
}
// winners bounce during the celebration
function cheerH(i, t){ const ph = api.phase(), g = api.game(); if(ph !== 'result' || !g || g.win == null) return 0; const w = Array.isArray(g.win) ? g.win : [g.win]; return w.includes(i) ? Math.abs(Math.sin(t * 9 + i)) * K * 3 : 0; }
function isWinner(i){ const g = api.game(); if(api.phase() !== 'result' || !g || g.win == null) return false; const w = Array.isArray(g.win) ? g.win : [g.win]; return w.includes(i); }
function drawBody(b, t, o){
  o = o || {};
  const ch = cheerH(b.i, t), pc = o.pc || pcOf(b.i), r = b.r * K;
  const blinkHide = b.blink > 0 && Math.floor(b.blink * 12) % 2 === 0;
  bean(X(b.x), Y(b.y), r, pc, Object.assign({ h:(b.h || 0) * K + ch, fx:b.fx, fy:b.fy, t, walk:b.walk, sq:b.sq, mood: ch ? 'cheer' : b.stun > 0 ? 'dizzy' : (o.mood || 'idle'), alpha: blinkHide ? 0.35 : o.alpha }, o.extra || {}));
}
function sortY(list){ return list.slice().sort((a, b) => a.y - b.y); }

/* ---------- Game base ---------- */
function endAfter(g, win, delay){ api.endAfter(g, win, delay); }
function timeLeft(g){ return Math.max(0, (g.LIMIT || 0) - (g.time || 0)); }

/* =====================================================================
   1) Falling Tiles over lava 🌋 — last one standing wins, the fallen float on as cheering ghosts
   ===================================================================== */
const tiles = {
  key:'tiles', arena:true, icon:'⤴️', C:8, R:6, T:10, LIMIT:50, padB:2,
  title:L('البلاط الطايح 🌋', 'Falling Tiles 🌋', 'Düşen Karolar 🌋'),
  help:L('البلاط عم يتشقّق ويوقع بالحمم! اركض، ونطّ ⤴️ فوق الفراغات. آخر واحد واقف بيربح', 'The tiles crack and drop into the lava! Run, and jump ⤴️ over the gaps. The last one standing wins', 'Karolar çatlayıp lava düşüyor! Koş ve boşlukların üstünden zıpla ⤴️. Ayakta kalan son kişi kazanır'),
  press(){}, draw(){},
  start(){
    this.wW = this.C * this.T; this.wH = this.R * this.T;
    const rnd1 = srand(7);
    this.tiles = [];
    for(let y = 0; y < this.R; y++) for(let x = 0; x < this.C; x++){
      const cr = []; const n = 2 + (rnd1() * 2 | 0);
      for(let k = 0; k < n; k++){ const a = rnd1() * TAU; let px = (rnd1() - 0.5) * 0.2, py = (rnd1() - 0.5) * 0.2; const seg = [[px, py]]; for(let s = 0; s < 3; s++){ px += Math.cos(a + (rnd1() - 0.5) * 1.2) * 0.14; py += Math.sin(a + (rnd1() - 0.5) * 1.2) * 0.14; seg.push([px, py]); } cr.push(seg); }
      this.tiles.push({ x, y, s:0, t:0, st:0, seed:rnd1() * 100, cr });
    }
    this.time = 0; this.done = false; this.win = undefined; this.next = 2.2; this.last = -1;
    this.P = PL().map((p, i) => { const b = mkBody(i, ((LEFT(i) ? 1 : this.C - 2) + 0.5) * this.T, ((TOP(i) ? 1 : this.R - 2) + 0.5) * this.T, 3.1); b.fall = 0; b.ghost = false; b.jump = 0; return b; });
    PL().forEach(p => p.out = false); FX = []; freshInput();
  },
  tileAt(x, y){ const cx = Math.floor(x / this.T), cy = Math.floor(y / this.T); if(cx < 0 || cy < 0 || cx >= this.C || cy >= this.R) return null; return this.tiles[cy * this.C + cx]; },
  solid(tl){ return !!tl && tl.s <= 1; },
  crack(tl){ if(tl && tl.s === 0){ tl.s = 1; tl.t = 1.2; } },
  alive(){ return this.P.filter(b => !b.fall && !b.ghost); },
  left(){ return timeLeft(this); },
  val(i){ const b = this.P[i]; return b && (b.fall || b.ghost) ? '👻' : '✔'; },
  update(dt){
    this.idle(dt);
    if(api.ending(this, dt)) return;
    this.time += dt;
    // tiles crack on their own, faster and faster
    this.next -= dt;
    if(this.next <= 0){
      this.next = Math.max(0.3, 1.2 - this.time * 0.024);
      const solid = this.tiles.filter(tl => tl.s === 0);
      const n = this.time > 20 ? 2 : 1;
      for(let k = 0; k < n && solid.length; k++) this.crack(solid.splice(Math.random() * solid.length | 0, 1)[0]);
    }
    this.tiles.forEach(tl => {
      if(tl.s === 1){ tl.t -= dt; if(tl.t <= 0){ tl.s = 2; tl.t = 0.45; tone(150, .2, 'sawtooth', .045, 0, 60); } }
      else if(tl.s === 2){ tl.t -= dt; if(tl.t <= 0) tl.s = 3; }
    });
    // standing still too long cracks your tile too
    const under = new Set();
    const live = this.alive();
    live.forEach(b => {
      const inp = input(b, this, dt);
      if(inp.act && b.jump <= 0 && b.cd <= 0){ b.jump = 0.52; b.cd = 0.8; SFX.jump(Math.max(0, b.i)); }
      if(b.jump > 0){ b.jump -= dt; b.h = Math.sin((1 - Math.max(0, b.jump) / 0.52) * Math.PI) * 4.2; if(b.jump <= 0){ b.h = 0; b.sq = 0.22; } }
      drive(b, inp, dt, b.jump > 0 ? 29 : 24);
      b.x = clamp(b.x, 1.2, this.wW - 1.2); b.y = clamp(b.y, 1.2, this.wH - 1.2);
      if(b.jump <= 0){
        const tl = this.tileAt(b.x, b.y);
        if(tl) under.add(tl);
        if(!tl || tl.s === 3 || (tl.s === 2 && tl.t < 0.3)) this.fallIn(b);
      }
    });
    this.tiles.forEach(tl => { if(under.has(tl)){ tl.st += dt; if(tl.st > 2.6) this.crack(tl); } else tl.st = Math.max(0, tl.st - dt * 0.6); });
    collide(this.alive().filter(b => b.h < 2));
    const a = this.alive();
    if(this.P.length >= 2 && a.length <= 1) endAfter(this, a.length ? a[0].i : (this.last >= 0 ? this.last : null), 1.3);
    else if(this.time >= this.LIMIT){ SFX.go(); endAfter(this, a.map(b => b.i), 0.5); }
  },
  fallIn(b){
    b.fall = 0.001; b.vx *= 0.3; b.vy *= 0.3; this.last = b.i;
    PL()[b.i].out = true; api.refresh();
    SFX.splash(); puff(b.x, b.y, '#ffb43a', 14, 30); puff(b.x, b.y, '#ff6a2a', 1, 1, 'ring');
    floatText(b.x, b.y - 6, L('أوبس!', 'Oops!', 'Hop!'));
  },
  idle(dt){ // ghosts float about; the fallen sink then come back as ghosts
    this.P.forEach(b => {
      tick(b, dt);
      if(b.fall > 0 && !b.ghost){ b.fall += dt; if(b.fall > 0.85){ b.ghost = true; b.h = 5; b.vx = b.vy = 0; tone(660, .3, 'sine', .07, 0, 990); } }
      else if(b.ghost){
        const inp = api.phase() === 'play' ? input(b, this, dt) : { x:0, y:0 };
        drive(b, inp, dt, 20); b.x = clamp(b.x, 2, this.wW - 2); b.y = clamp(b.y, 7, this.wH);
      }
    });
  },
  bot(b, dt){
    const m = b.ai;
    if(b.ghost){ m.t -= dt; if(m.t <= 0 || hyp(m.tx - b.x, m.ty - b.y) < 2){ m.t = rnd(1, 2.5); const a = this.alive(), o = a[Math.random() * a.length | 0]; m.tx = o ? o.x + rnd(-8, 8) : rnd(0, this.wW); m.ty = o ? o.y + rnd(-8, 8) : rnd(0, this.wH); } return toward(b, m.tx, m.ty, 6); }
    const T = this.T, cx = Math.floor(b.x / T), cy = Math.floor(b.y / T), here = this.tileAt(b.x, b.y);
    m.t -= dt;
    const danger = !here || here.s >= 1 || here.st > 1.1;
    if(m.t <= 0 || (danger && m.t > 0.12) || !this.solid(this.tileAt(m.tx, m.ty))){
      m.t = rnd(0.25, 0.45);
      let best = null, bs = -1e9;
      this.tiles.forEach(tl => {
        if(tl.s !== 0) return;
        const d = hyp(tl.x - cx, tl.y - cy); if(d > 4.2) return;
        let sc = -d * 0.45 - hyp(tl.x - (this.C - 1) / 2, tl.y - (this.R - 1) / 2) * 0.22 - tl.st * 1.4 + Math.random() * 0.5;
        for(let oy = -1; oy <= 1; oy++) for(let ox = -1; ox <= 1; ox++){ if(!ox && !oy) continue; const n = this.tileAt((tl.x + ox + 0.5) * T, (tl.y + oy + 0.5) * T); if(n && n.s === 0) sc += 0.55; }
        const tx = (tl.x + 0.5) * T, ty = (tl.y + 0.5) * T;
        let holes = 0; const L0 = hyp(tx - b.x, ty - b.y), steps = Math.ceil(L0 / 2.5);
        for(let s = 1; s < steps; s++){ const q = this.tileAt(b.x + (tx - b.x) * s / steps, b.y + (ty - b.y) * s / steps); if(!q || q.s >= 2) holes++; }
        if(holes > 3) return; if(holes) sc -= 1.2 + holes * 0.4;
        this.P.forEach(o => { if(o !== b && !o.fall && !o.ghost && hyp(o.x - tx, o.y - ty) < T * 0.9) sc -= 1.1; });
        if(sc > bs){ bs = sc; best = [tx, ty]; }
      });
      if(best){ m.tx = best[0]; m.ty = best[1]; }
    }
    const v = toward(b, m.tx, m.ty, 2.5);
    const sp = hyp(v.x, v.y);
    let act = false;
    if(sp > 0.2 && b.cd <= 0){
      const ax = b.x + v.x / sp * 4.5, ay = b.y + v.y / sp * 4.5, ahead = this.tileAt(ax, ay);
      if(!ahead || ahead.s >= 2 || (ahead.s === 1 && ahead.t < 0.4)) act = true;
    }
    if(here && here.s === 1 && here.t < 0.3 && b.cd <= 0) act = true;
    return { x:v.x, y:v.y, act };
  },
  bake(g){
    // lava everywhere
    const gr = g.createRadialGradient(SW / 2, SH / 2, 10, SW / 2, SH / 2, SW * 0.7);
    gr.addColorStop(0, '#ffb347'); gr.addColorStop(0.45, '#ff7a2a'); gr.addColorStop(1, '#c9361c');
    g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
    const r = srand(11);
    for(let k = 0; k < 70; k++){ const x = r() * SW, y = r() * SH, s = 8 + r() * 30; g.fillStyle = r() < 0.5 ? 'rgba(160,30,20,.32)' : 'rgba(255,220,90,.25)'; g.beginPath(); g.ellipse(x, y, s, s * 0.6, r() * 3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(255,240,150,.35)'; g.lineWidth = 2;
    for(let k = 0; k < 26; k++){ let x = r() * SW, y = r() * SH; g.beginPath(); g.moveTo(x, y); for(let s = 0; s < 4; s++){ x += (r() - 0.5) * 40; y += (r() - 0.5) * 40; g.lineTo(x, y); } g.stroke(); }
    // volcanic rocks on the sides
    for(let k = 0; k < 16; k++){
      const left = k % 2 === 0, x = left ? r() * (OX - 30) + 10 : SW - 10 - r() * (OX - 30), y = 60 + r() * (SH - 120), s = 10 + r() * 18;
      shadow(g, x + 3, y + s * 0.5, s * 1.1, s * 0.45, 0.35);
      g.fillStyle = '#4b3a63'; g.beginPath(); g.ellipse(x, y, s, s * 0.8, r(), 0, TAU); g.fill();
      g.fillStyle = '#6a5689'; g.beginPath(); g.ellipse(x - s * 0.25, y - s * 0.25, s * 0.55, s * 0.4, r(), 0, TAU); g.fill();
    }
    // stone rim around the tile field
    const x0 = X(0), y0 = Y(0), w = this.wW * K, h = this.wH * K, p = K * 2.2;
    shadow(g, x0 + w / 2, y0 + h + p * 0.6, w * 0.55, p * 1.4, 0.35);
    g.fillStyle = '#3b2f57'; rr(g, x0 - p, y0 - p, w + p * 2, h + p * 2 + K * 1.6, p * 1.2); g.fill();
    g.fillStyle = '#5a4a82'; rr(g, x0 - p, y0 - p, w + p * 2, h + p * 2, p * 1.2); g.fill();
    g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    // the lava pool under the tiles
    const lg = g.createLinearGradient(0, y0, 0, y0 + h); lg.addColorStop(0, '#ff9a3a'); lg.addColorStop(1, '#ff5a1f');
    g.fillStyle = lg; rr(g, x0, y0, w, h, K); g.fill();
    for(let k = 0; k < 40; k++){ g.fillStyle = r() < 0.5 ? 'rgba(255,235,120,.4)' : 'rgba(170,35,20,.3)'; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, K * (1 + r() * 3), K * (0.6 + r() * 1.5), r() * 3, 0, TAU); g.fill(); }
  },
  paint(t){
    const T = this.T, s = T * K, d = s * 0.2, pad = s * 0.035;
    // bubbles in the open lava
    this.tiles.forEach(tl => {
      if(tl.s !== 3) return;
      const ph = (t * 0.7 + tl.seed) % 1, x = X((tl.x + 0.3 + (tl.seed % 0.4)) * T), y = Y((tl.y + 0.5) * T);
      c.fillStyle = 'rgba(255,240,140,' + (0.7 * (1 - ph)) + ')'; c.beginPath(); c.arc(x, y, K * (0.4 + ph * 1.6), 0, TAU); c.fill();
      const ph2 = (t * 0.5 + tl.seed * 1.7) % 1; c.strokeStyle = 'rgba(255,250,200,' + (0.6 * (1 - ph2)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(X((tl.x + 0.7) * T), Y((tl.y + 0.3) * T), K * (0.3 + ph2 * 2), 0, TAU); c.stroke();
    });
    for(let ry = 0; ry < this.R; ry++) for(let rx = 0; rx < this.C; rx++){
      const tl = this.tiles[ry * this.C + rx]; if(tl.s === 3) continue;
      let ox = 0, oy = 0, sc = 1, al = 1; const k = tl.s === 1 ? 1 - tl.t / 1.2 : tl.s === 2 ? 1 : 0;
      if(tl.s === 1){ const w = 0.25 + k * 1.2; ox = Math.sin(t * 46 + tl.seed) * s * 0.025 * w; oy = Math.cos(t * 39 + tl.seed) * s * 0.018 * w; }
      if(tl.s === 2){ const p = 1 - tl.t / 0.45; sc = 1 - p * 0.5; oy = p * s * 0.55; al = Math.max(0, 1 - p * 1.1); }
      c.save(); c.globalAlpha = al; c.translate(X(rx * T) + s / 2 + ox, Y(ry * T) + s / 2 + oy); c.scale(sc, sc);
      const hw = s / 2 - pad;
      c.fillStyle = tl.s ? '#9c6a7a' : '#7466a6'; rr(c, -hw, -hw + d, hw * 2, hw * 2, s * 0.16); c.fill();
      const flash = tl.s === 1 && Math.floor(t * (6 + k * 14)) % 2 === 0;
      const top = (rx + ry) % 2 ? '#e6defa' : '#d4c9f2';
      c.fillStyle = tl.s === 2 ? '#c9a4a0' : flash ? '#ffd2b0' : top; rr(c, -hw, -hw, hw * 2, hw * 2, s * 0.16); c.fill();
      c.lineWidth = 2; c.strokeStyle = 'rgba(28,24,56,.55)'; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)'; rr(c, -hw + s * 0.1, -hw + s * 0.08, hw * 1.2, s * 0.08, s * 0.04); c.fill();
      if(!tl.s){ c.fillStyle = 'rgba(116,102,166,.18)'; c.beginPath(); c.arc(-hw * 0.35, hw * 0.3, s * 0.07, 0, TAU); c.arc(hw * 0.4, -hw * 0.1, s * 0.05, 0, TAU); c.fill(); }
      if(tl.s >= 1){ // cracks grow
        c.strokeStyle = INK; c.lineWidth = Math.max(1.5, s * 0.035); c.lineCap = 'round'; c.lineJoin = 'round';
        const n = tl.s === 2 ? 4 : 1 + Math.floor(k * 3.99);
        tl.cr.forEach(seg => { c.beginPath(); c.moveTo(seg[0][0] * s, seg[0][1] * s); for(let q = 1; q <= Math.min(n, seg.length - 1); q++) c.lineTo(seg[q][0] * s, seg[q][1] * s); c.stroke(); });
      }
      c.restore();
    }
    // the falling sink, then everybody standing, ghosts on top
    this.P.forEach(b => { if(b.fall && !b.ghost){ const k = Math.min(1, b.fall / 0.85); bean(X(b.x), Y(b.y) + k * K * 2, b.r * K * (1 - k * 0.8), pcOf(b.i), { t, mood:'dizzy', alpha:1 - k * 0.6 }); } });
    sortY(this.alive()).forEach(b => drawBody(b, t, { mood: api.phase() === 'result' ? 'happy' : 'idle' }));
    this.P.forEach(b => { if(b.ghost) bean(X(b.x), Y(b.y), b.r * K, GHOSTPC[b.i], { h:K * (4 + Math.sin(t * 3 + b.i) * 1.2), fx:b.fx, fy:b.fy, t, ghost:true, alpha:0.72, mood:'cheer', arms:true, halo:true }); });
  }
};

/* =====================================================================
   2) Haunted Yard 👻 — collect candles, a smiling ghost chases you; tagged = drop your candles and blink
   ===================================================================== */
const GRAVES = [[40, 28], [80, 19], [120, 28], [30, 64], [64, 50], [96, 50], [130, 64], [80, 80]];
const haunt = {
  key:'haunt', arena:true, icon:'💨', wW:160, wH:96, LIMIT:40,
  title:L('المقبرة المسكونة 👻', 'Haunted Yard 👻', 'Perili Bahçe 👻'),
  help:L('لمّ أكتر شموع 🕯️ وانتبه من الشبح اللطيف! إذا لمسك بتوقع شموعك. 💨 للهروب', 'Collect the most candles 🕯️ and watch out for the friendly ghost! If it tags you, you drop your candles. 💨 to dash', 'En çok mumu 🕯️ topla, şirin hayalete dikkat! Sana dokunursa mumların düşer. Kaçmak için 💨'),
  press(){}, draw(){},
  start(){
    this.time = 0; this.done = false; this.win = undefined; this.spawn = 0.2;
    this.P = PL().map((p, i) => { const b = mkBody(i, LEFT(i) ? 16 : 144, TOP(i) ? 14 : 82, 3.8); b.held = 0; return b; });
    this.ghosts = [this.mkGhost(80, 50)];
    this.candles = []; for(let k = 0; k < 5 + this.P.length; k++) this.addCandle();
    PL().forEach(p => p.out = false); FX = []; freshInput();
  },
  mkGhost(x, y){ return { x, y, vx:0, vy:0, tgt:null, re:0, happy:0, bob:Math.random() * 6 }; },
  free(x, y, gap){
    if(x < 6 || y < 6 || x > this.wW - 6 || y > this.wH - 6) return false;
    if(GRAVES.some(g => hyp(g[0] - x, g[1] - y) < 9)) return false;
    if(this.P && this.P.some(b => hyp(b.x - x, b.y - y) < gap)) return false;
    if(this.ghosts && this.ghosts.some(g => hyp(g.x - x, g.y - y) < 14)) return false;
    return !this.candles || !this.candles.some(q => hyp(q.x - x, q.y - y) < 8);
  },
  addCandle(){ for(let k = 0; k < 30; k++){ const x = rnd(8, this.wW - 8), y = rnd(8, this.wH - 8); if(this.free(x, y, 12)){ this.candles.push({ x, y, vx:0, vy:0, cool:0, t:0, seed:Math.random() * 9 }); return; } } },
  left(){ return timeLeft(this); },
  val(i){ const b = this.P[i]; return b ? AR(b.held) : '0'; },
  graveBump(b){ GRAVES.forEach(g => { const dx = b.x - g[0], dy = b.y - g[1], d = hyp(dx, dy) || 0.01, m = b.r + 4.4; if(d < m){ b.x = g[0] + dx / d * m; b.y = g[1] + dy / d * m; } }); },
  update(dt){
    this.idle(dt);
    if(api.ending(this, dt)) return;
    this.time += dt;
    if(this.ghosts.length < 2 && this.P.length >= 3 && this.time > 16){ this.ghosts.push(this.mkGhost(80, -6)); tone(520, .4, 'sine', .1, 0, 260); floatText(80, 10, L('شبح تاني! 👻', 'Another ghost! 👻', 'Bir hayalet daha! 👻')); }
    this.spawn -= dt;
    if(this.spawn <= 0){ this.spawn = 0.7; if(this.candles.filter(q => !q.lost).length < 5 + this.P.length) this.addCandle(); }
    this.P.forEach(b => {
      const inp = input(b, this, dt);
      tryDash(b, inp, 1.4);
      drive(b, inp, dt, 30);
      b.x = clamp(b.x, b.r, this.wW - b.r); b.y = clamp(b.y, b.r, this.wH - b.r);
      this.graveBump(b);
    });
    collide(this.P);
    // candles: picked up by walking into them
    this.candles.forEach(q => {
      q.t += dt; q.cool = Math.max(0, q.cool - dt);
      if(q.vx || q.vy){ q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= Math.exp(-4 * dt); q.vy *= Math.exp(-4 * dt); if(hyp(q.vx, q.vy) < 1){ q.vx = q.vy = 0; } q.x = clamp(q.x, 4, this.wW - 4); q.y = clamp(q.y, 4, this.wH - 4); }
      if(q.cool > 0 || q.got) return;
      const b = this.P.find(b => b.blink <= 0 && hyp(b.x - q.x, b.y - q.y) < b.r + 2.6);
      if(b){ q.got = true; b.held++; puff(q.x, q.y - 3, '#ffe27a', 6, 22, 'star'); tone(880 + b.held * 30, .07, 'triangle', .1); tone(1320, .1, 'triangle', .07, .05); }
    });
    this.candles = this.candles.filter(q => !q.got);
    // ghosts drift after the leader nearby
    const spd = 19 + this.time * 0.2;
    this.ghosts.forEach(g => {
      g.happy = Math.max(0, g.happy - dt); g.re -= dt;
      if(g.re <= 0 || !g.tgt || g.tgt.blink > 0){
        g.re = 1.4;
        const pool = this.P.filter(b => b.blink <= 0 && !this.ghosts.some(o => o !== g && o.tgt === b));
        g.tgt = nearestBy(pool.length ? pool : this.P, b => hyp(b.x - g.x, b.y - g.y) - b.held * 5 + Math.random() * 12);
      }
      if(g.happy > 0){ g.vx *= 0.9; g.vy *= 0.9; }
      else if(g.tgt){
        const dx = g.tgt.x - g.x, dy = g.tgt.y - g.y, d = hyp(dx, dy) || 1, a = Math.min(1, dt * 2.2);
        g.vx += (dx / d * spd - g.vx) * a; g.vy += (dy / d * spd - g.vy) * a;
      }
      g.x += g.vx * dt; g.y += g.vy * dt;
      this.ghosts.forEach(o => { if(o === g) return; const dx = g.x - o.x, dy = g.y - o.y, d = hyp(dx, dy) || 1; if(d < 14){ g.x += dx / d * (14 - d) * 0.5; g.y += dy / d * (14 - d) * 0.5; } });
      if(g.happy > 0) return;
      this.P.forEach(b => {
        if(b.blink > 0 || hyp(b.x - g.x, b.y - g.y) > b.r + 4.2) return;
        // tagged: candles fly out, the kid blinks for a moment
        for(let k = 0; k < b.held; k++){ const a = Math.random() * TAU, s = rnd(22, 46); this.candles.push({ x:b.x, y:b.y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, cool:0.7, t:0, seed:Math.random() * 9 }); }
        if(b.held) floatText(b.x, b.y - 8, '-' + AR(b.held) + ' 🕯️', '#ffe27a');
        b.held = 0; b.blink = 2.2; b.stun = 0.35;
        const dx = b.x - g.x, dy = b.y - g.y, d = hyp(dx, dy) || 1; b.vx = dx / d * 40; b.vy = dy / d * 40;
        g.happy = 1.1; g.tgt = null; puff(b.x, b.y - 4, '#e9e4ff', 10, 26);
        tone(440, .35, 'sine', .12, 0, 220); tone(620, .3, 'triangle', .06, .08, 330);
      });
    });
    if(this.time >= this.LIMIT){ SFX.go(); endAfter(this, api.best(this.P.map(b => b.held)), 0.6); }
  },
  idle(dt){ this.P.forEach(b => tick(b, dt)); this.ghosts.forEach(g => { g.bob += dt; }); },
  bot(b, dt){
    const m = b.ai; m.t -= dt;
    if(m.t <= 0){
      m.t = rnd(0.2, 0.35);
      const q = nearestBy(this.candles.filter(q => q.cool <= 0), q => hyp(q.x - b.x, q.y - b.y) + (this.ghosts.some(g => hyp(g.x - q.x, g.y - q.y) < 18) ? 40 : 0) + (this.P.some(o => o !== b && hyp(o.x - q.x, o.y - q.y) < hyp(b.x - q.x, b.y - q.y) * 0.6) ? 18 : 0));
      if(q){ m.tx = q.x; m.ty = q.y; } else { m.tx = 80 + rnd(-30, 30); m.ty = 48 + rnd(-20, 20); }
    }
    let v = toward(b, m.tx, m.ty, 2); let fear = 0;
    this.ghosts.forEach(g => { const dx = b.x - g.x, dy = b.y - g.y, d = hyp(dx, dy) || 1; if(d < 30 && b.blink <= 0){ const w = (30 - d) / 30 * 2.2; v.x += dx / d * w; v.y += dy / d * w; fear = Math.max(fear, 1 - d / 30); } });
    GRAVES.forEach(g => { const dx = b.x - g[0], dy = b.y - g[1], d = hyp(dx, dy) || 1; if(d < 11){ const w = (11 - d) / 11 * 1.5; v.x += dx / d * w - dy / d * w * 0.6; v.y += dy / d * w + dx / d * w * 0.6; } });
    // stay off the fence
    if(b.x < 8) v.x += 0.8; if(b.x > this.wW - 8) v.x -= 0.8; if(b.y < 8) v.y += 0.8; if(b.y > this.wH - 8) v.y -= 0.8;
    return { x:v.x, y:v.y, act: fear > 0.62 && b.cd <= 0 };
  },
  bake(g){
    const r = srand(23);
    const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#22184a'); gr.addColorStop(1, '#130d2e');
    g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
    for(let k = 0; k < 60; k++){ g.fillStyle = 'rgba(255,255,255,' + (0.2 + r() * 0.6) + ')'; g.beginPath(); g.arc(r() * SW, r() * SH, 0.6 + r() * 1.4, 0, TAU); g.fill(); }
    // moon peeking behind the yard
    const mx = X(this.wW * 0.84), my = Y(-2);
    const mg = g.createRadialGradient(mx, my, 4, mx, my, K * 26); mg.addColorStop(0, 'rgba(255,246,200,.45)'); mg.addColorStop(1, 'rgba(255,246,200,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(mx, my, K * 26, 0, TAU); g.fill();
    g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(mx, my, K * 7, 0, TAU); g.fill();
    // trees on the sides
    for(let k = 0; k < 10; k++){
      const left = k % 2 === 0, x = left ? 20 + r() * (OX - 50) : SW - 20 - r() * (OX - 50), y = 70 + r() * (SH - 130), s = 18 + r() * 14;
      shadow(g, x + 4, y + s * 0.7, s * 1.1, s * 0.4, 0.4);
      g.fillStyle = '#3a2a6e'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
      g.fillStyle = '#4b3a8a'; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.3, s * 0.6, 0, TAU); g.fill();
    }
    // the yard
    const x0 = X(0), y0 = Y(0), w = this.wW * K, h = this.wH * K;
    shadow(g, x0 + w / 2, y0 + h + 4, w * 0.52, 12, 0.5);
    const yg = g.createRadialGradient(x0 + w / 2, y0 + h / 2, 10, x0 + w / 2, y0 + h / 2, w * 0.6);
    yg.addColorStop(0, '#5a47a3'); yg.addColorStop(1, '#3a2c78');
    g.fillStyle = yg; rr(g, x0, y0, w, h, K * 3); g.fill();
    for(let k = 0; k < 240; k++){ const x = x0 + r() * w, y = y0 + r() * h; g.strokeStyle = r() < 0.5 ? 'rgba(120,100,200,.55)' : 'rgba(40,28,90,.45)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 2, y); g.lineTo(x, y - 4); g.lineTo(x + 2, y); g.stroke(); }
    for(let k = 0; k < 26; k++){ const x = x0 + r() * w, y = y0 + r() * h; g.fillStyle = ['#ff9ad5', '#9af3ff', '#fff59a'][k % 3]; for(let p = 0; p < 5; p++){ const a = p / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.6, 0, TAU); g.fill(); } g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
    // stepping-stone path
    for(let k = 0; k < 22; k++){ const a = k / 22 * TAU, x = X(80 + Math.cos(a) * 58), y = Y(48 + Math.sin(a) * 32); g.fillStyle = 'rgba(160,150,220,.35)'; g.beginPath(); g.ellipse(x, y, K * 2.4, K * 1.6, a, 0, TAU); g.fill(); }
    // fence
    g.strokeStyle = '#2a1f5c'; g.lineWidth = Math.max(4, K * 1.3); rr(g, x0, y0, w, h, K * 3); g.stroke();
    g.strokeStyle = '#8c7bd6'; g.lineWidth = Math.max(2, K * 0.5); g.stroke();
    for(let k = 0; k <= 16; k++){ for(const yy of [y0, y0 + h]){ const x = x0 + w * k / 16; g.fillStyle = '#2a1f5c'; g.fillRect(x - 3, yy - 5, 6, 8); g.fillStyle = '#a99af0'; g.fillRect(x - 2, yy - 5, 4, 3); } }
    for(let k = 1; k < 10; k++){ for(const xx of [x0, x0 + w]){ const y = y0 + h * k / 10; g.fillStyle = '#2a1f5c'; g.fillRect(xx - 4, y - 3, 8, 6); g.fillStyle = '#a99af0'; g.fillRect(xx - 3, y - 3, 6, 2); } }
    // gravestones (with flowers, no scary bits)
    GRAVES.forEach((gv, n) => {
      const x = X(gv[0]), y = Y(gv[1] + 2.5), s = K * 4.6;
      shadow(g, x + s * 0.2, y + s * 0.1, s * 1.15, s * 0.42, 0.4);
      g.fillStyle = '#5d548c'; rr(g, x - s * 1.05, y - s * 0.45, s * 2.1, s * 0.7, s * 0.2); g.fill();
      g.fillStyle = '#7b72ad'; g.beginPath(); g.moveTo(x - s * 0.75, y); g.lineTo(x - s * 0.75, y - s * 1.25); g.arc(x, y - s * 1.25, s * 0.75, Math.PI, 0); g.lineTo(x + s * 0.75, y); g.closePath(); g.fill();
      g.fillStyle = '#a9a2d6'; g.beginPath(); g.moveTo(x - s * 0.62, y - s * 0.1); g.lineTo(x - s * 0.62, y - s * 1.25); g.arc(x, y - s * 1.25, s * 0.62, Math.PI, 0); g.lineTo(x + s * 0.62, y - s * 0.1); g.closePath(); g.fill();
      g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x - s * 0.5, y - s * 1.55, s * 0.18, s * 0.9);
      if(n % 2){ // a star
        g.fillStyle = '#d6cff6'; g.beginPath(); for(let k = 0; k < 10; k++){ const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? s * 0.13 : s * 0.3; g.lineTo(x + Math.cos(a) * q, y - s * 1.05 + Math.sin(a) * q); } g.fill();
      } else { g.fillStyle = '#d6cff6'; g.beginPath(); g.arc(x, y - s * 1.05, s * 0.28, 0, TAU); g.fill(); g.fillStyle = '#a9a2d6'; g.beginPath(); g.arc(x + s * 0.12, y - s * 1.12, s * 0.25, 0, TAU); g.fill(); }
      for(let k = 0; k < 3; k++){ const fx = x + (k - 1) * s * 0.6, fy = y + s * 0.05; g.fillStyle = ['#ff9ad5', '#ffd36e', '#9af3ff'][(k + n) % 3]; g.beginPath(); g.arc(fx, fy, s * 0.13, 0, TAU); g.fill(); }
    });
    // smiling pumpkin lanterns in the yard corners
    [[5, 48], [155, 48]].forEach(p => {
      const x = X(p[0]), y = Y(p[1]), s = K * 3;
      const lg = g.createRadialGradient(x, y, 2, x, y, s * 4); lg.addColorStop(0, 'rgba(255,170,60,.45)'); lg.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = lg; g.beginPath(); g.arc(x, y, s * 4, 0, TAU); g.fill();
      g.fillStyle = '#ff9a2e'; g.beginPath(); g.ellipse(x, y, s * 1.2, s, 0, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      g.strokeStyle = 'rgba(160,70,0,.6)'; g.beginPath(); g.moveTo(x, y - s); g.lineTo(x, y + s); g.stroke();
      g.fillStyle = '#4fb04a'; g.fillRect(x - 1.5, y - s - 4, 3, 5);
      g.fillStyle = '#ffe47a'; g.beginPath(); g.arc(x - s * 0.4, y - s * 0.15, s * 0.16, 0, TAU); g.arc(x + s * 0.4, y - s * 0.15, s * 0.16, 0, TAU); g.fill();
      g.beginPath(); g.arc(x, y + s * 0.15, s * 0.45, 0.1 * Math.PI, 0.9 * Math.PI); g.fill();
    });
    // soft night vignette
    const vg = g.createRadialGradient(SW / 2, SH / 2, SH * 0.35, SW / 2, SH / 2, SW * 0.62); vg.addColorStop(0, 'rgba(10,5,30,0)'); vg.addColorStop(1, 'rgba(10,5,30,.55)');
    g.fillStyle = vg; g.fillRect(0, 0, SW, SH);
  },
  paint(t){
    // fireflies
    for(let k = 0; k < 12; k++){ const x = X(80 + Math.sin(t * 0.4 + k * 1.7) * 70), y = Y(48 + Math.cos(t * 0.33 + k * 2.3) * 42), a = 0.4 + 0.4 * Math.sin(t * 3 + k); c.fillStyle = 'rgba(230,255,140,' + a + ')'; c.beginPath(); c.arc(x, y, 2.2, 0, TAU); c.fill(); }
    // candle glows (additive)
    c.globalCompositeOperation = 'lighter';
    this.candles.forEach(q => { const x = X(q.x), y = Y(q.y) - K * 2.5, R = K * (6 + Math.sin(t * 7 + q.seed) * 0.6); const g = c.createRadialGradient(x, y, 1, x, y, R); g.addColorStop(0, 'rgba(255,200,90,.55)'); g.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); });
    this.P.forEach(b => { if(!b.held) return; const x = X(b.x), y = Y(b.y) - K * 4, R = K * (5 + Math.min(6, b.held)); const g = c.createRadialGradient(x, y, 1, x, y, R); g.addColorStop(0, 'rgba(255,210,110,.35)'); g.addColorStop(1, 'rgba(255,160,60,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, TAU); c.fill(); });
    c.globalCompositeOperation = 'source-over';
    const items = this.candles.map(q => ({ y:q.y, q })).concat(this.P.map(b => ({ y:b.y, b })));
    items.sort((a, b) => a.y - b.y).forEach(it => {
      if(it.q) this.candle(it.q, t);
      else {
        const b = it.b; drawBody(b, t, { mood: b.held >= 3 ? 'happy' : 'idle' });
        if(b.held){ const x = X(b.x), y = Y(b.y) - b.r * K * 2.7 - (b.h || 0) * K - cheerH(b.i, t); c.fillStyle = 'rgba(28,24,56,.75)'; rr(c, x - 17, y - 10, 34, 20, 10); c.fill(); text('🕯️', x - 7, y, 12); text(AR(b.held), x + 8, y, 14, '#ffe27a'); }
      }
    });
    this.ghosts.forEach(g => this.ghost(g, t));
  },
  candle(q, t){
    const x = X(q.x), y = Y(q.y), s = K;
    shadow(c, x, y, s * 1.6, s * 0.6, 0.35);
    c.fillStyle = '#fff4dc'; rr(c, x - s * 0.9, y - s * 3, s * 1.8, s * 3, s * 0.5); c.fill(); c.lineWidth = 1.5; c.strokeStyle = INK; c.stroke();
    c.fillStyle = 'rgba(255,200,160,.6)'; c.fillRect(x - s * 0.5, y - s * 3, s * 0.4, s * 1.3);
    const f = 1 + Math.sin(t * 13 + q.seed) * 0.12, fy = y - s * 3.2;
    c.fillStyle = '#ffb12e'; c.beginPath(); c.moveTo(x, fy - s * 2.2 * f); c.quadraticCurveTo(x + s * 1.1, fy - s * 0.4, x, fy + s * 0.2); c.quadraticCurveTo(x - s * 1.1, fy - s * 0.4, x, fy - s * 2.2 * f); c.fill();
    c.fillStyle = '#fff3a0'; c.beginPath(); c.ellipse(x, fy - s * 0.45, s * 0.38, s * 0.7 * f, 0, 0, TAU); c.fill();
  },
  ghost(g, t){
    const x = X(g.x), base = Y(g.y), s = K * 5.4, fl = Math.sin(g.bob * 2.4) * K * 1.2, y = base - K * 6 + fl;
    shadow(c, x, base, s * 0.7, s * 0.24, 0.25);
    c.save(); c.translate(x, y); c.rotate(clamp(g.vx * 0.006, -0.25, 0.25) + (g.happy > 0 ? Math.sin(t * 20) * 0.15 : 0));
    const gr = c.createRadialGradient(-s * 0.3, -s * 0.4, s * 0.1, 0, 0, s * 1.3); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#cfd8ff');
    c.globalAlpha = 0.93; c.fillStyle = gr; c.beginPath(); c.arc(0, -s * 0.2, s * 0.85, Math.PI, 0);
    for(let k = 0; k <= 6; k++){ const px = s * 0.85 - k * s * 0.283, py = s * 0.75 + (k % 2 ? -s * 0.18 : 0) + Math.sin(t * 6 + k) * s * 0.05; c.lineTo(px, py); }
    c.closePath(); c.fill(); c.globalAlpha = 1; c.lineWidth = 2.5; c.strokeStyle = 'rgba(28,24,56,.7)'; c.stroke();
    // little waving arms
    c.fillStyle = '#eef1ff'; for(const sd of [-1, 1]){ c.beginPath(); c.ellipse(sd * s * 0.95, s * 0.05 + Math.sin(t * 5 + sd) * s * 0.1, s * 0.22, s * 0.15, sd * 0.5, 0, TAU); c.fill(); c.stroke(); }
    // happy face
    const lx = clamp(g.vx * 0.01, -0.2, 0.2) * s;
    c.fillStyle = INK;
    if(g.happy > 0){ c.lineWidth = 3; c.strokeStyle = INK; for(const sd of [-1, 1]){ c.beginPath(); c.arc(lx + sd * s * 0.3, -s * 0.25, s * 0.12, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } }
    else for(const sd of [-1, 1]){ c.beginPath(); c.ellipse(lx + sd * s * 0.3, -s * 0.28, s * 0.1, s * 0.14, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(lx + sd * s * 0.3 - s * 0.03, -s * 0.33, s * 0.035, 0, TAU); c.fill(); c.fillStyle = INK; }
    c.fillStyle = 'rgba(255,120,170,.55)'; for(const sd of [-1, 1]){ c.beginPath(); c.ellipse(lx + sd * s * 0.55, -s * 0.06, s * 0.14, s * 0.08, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#ff7aa8'; c.beginPath(); c.arc(lx, -s * 0.06, s * 0.17, 0, Math.PI); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke();
    c.restore();
    if(g.happy > 0) text(L('بخ! 😄', 'Boo! 😄', 'Bö! 😄'), x, y - s * 1.4, 14 + K * 1.5, '#e9e4ff');
  }
};

/* =====================================================================
   3) Bunny Round-up 🐰 — carry bunnies one at a time to your own pen; dash into a carrier to make them drop it
   ===================================================================== */
const BUNCOL = ['#ffffff', '#f3e2c7', '#d9d4e6', '#c99a6e'];
const bunny = {
  key:'bunny', arena:true, icon:'💨', wW:160, wH:96, LIMIT:40,
  cx:80, cy:48, rx:76, ry:45,
  title:L('لمّ الأرانب 🐰', 'Bunny Round-up 🐰', 'Tavşan Toplama 🐰'),
  help:L('امسك أرنب وودّيه على الحظيرة اللي بلونك! واحد واحد. 💨 اخبط اللي حامل أرنب ليوقّعه', 'Grab a bunny and take it to the pen with your color! One at a time. 💨 bump a carrier to make them drop it', 'Bir tavşan yakala, kendi renkli ağılına götür! Teker teker. 💨 taşıyana çarp, düşürsün'),
  press(){}, draw(){},
  pen(i){ return { x:this.cx + (LEFT(i) ? -1 : 1) * this.rx * 0.7, y:this.cy + (TOP(i) ? -1 : 1) * this.ry * 0.7, r:11.5 }; },
  start(){
    this.time = 0; this.done = false; this.win = undefined; this.spawn = 1;
    this.P = PL().map((p, i) => { const pn = this.pen(i), b = mkBody(i, pn.x + (this.cx - pn.x) * 0.35, pn.y + (this.cy - pn.y) * 0.35, 3.8); b.carry = null; b.score = 0; return b; });
    this.B = []; for(let k = 0; k < 4 + this.P.length; k++) this.addBunny(true);
    PL().forEach(p => p.out = false); FX = []; freshInput();
  },
  addBunny(spread){
    const a = Math.random() * TAU, d = spread ? rnd(0.1, 0.45) : 0;
    this.B.push({ x:this.cx + Math.cos(a) * this.rx * d, y:this.cy + Math.sin(a) * this.ry * d, vx:0, vy:0, h:0, hop:0, wait:rnd(0.2, 1), fx:Math.random() < 0.5 ? -1 : 1, st:'free', own:-1, col:BUNCOL[Math.random() * 4 | 0], cool:0, by:-1, seed:Math.random() * 9 });
    if(!spread) puff(this.cx, this.cy, '#c99a6e', 8, 20);
  },
  inField(o, m){ // keep inside the oval field
    const dx = (o.x - this.cx) / (this.rx - m), dy = (o.y - this.cy) / (this.ry - m), d = hyp(dx, dy);
    if(d > 1){ o.x = this.cx + dx / d * (this.rx - m); o.y = this.cy + dy / d * (this.ry - m); return true; } return false;
  },
  left(){ return timeLeft(this); },
  val(i){ const b = this.P[i]; return b ? AR(b.score) : '0'; },
  drop(v, by){
    const bn = v.carry; if(!bn) return; v.carry = null;
    const dx = v.x - by.x, dy = v.y - by.y, d = hyp(dx, dy) || 1;
    bn.st = 'free'; bn.x = v.x; bn.y = v.y; bn.vx = dx / d * 40 + rnd(-8, 8); bn.vy = dy / d * 40 + rnd(-8, 8); bn.hop = 0.42; bn.cool = 0.8; bn.by = v.i;
    v.stun = 0.4; floatText(v.x, v.y - 8, L('أوف!', 'Oof!', 'Of!'));
    tone(300, .2, 'square', .07, 0, 500); puff(v.x, v.y, '#ffffff', 8, 24);
  },
  update(dt){
    this.idle(dt);
    if(api.ending(this, dt)) return;
    this.time += dt;
    this.spawn -= dt;
    if(this.spawn <= 0){ this.spawn = 1.3; if(this.B.filter(b => b.st === 'free').length < 3 + Math.ceil(this.P.length / 2)) this.addBunny(false); }
    this.P.forEach(b => {
      const inp = input(b, this, dt);
      tryDash(b, inp, 1.5);
      drive(b, inp, dt, b.carry ? 26 : 30);
      this.inField(b, b.r);
    });
    collide(this.P, (A, B2) => { if(A.dash > 0 && B2.carry) this.drop(B2, A); else if(B2.dash > 0 && A.carry) this.drop(A, B2); else if(A.dash > 0) B2.stun = 0.25; else if(B2.dash > 0) A.stun = 0.25; });
    // grab + deliver
    this.P.forEach(b => {
      if(b.carry){
        const pn = this.pen(b.i);
        if(hyp(b.x - pn.x, b.y - pn.y) < pn.r - 1.5){
          const bn = b.carry; b.carry = null; bn.st = 'pen'; bn.own = b.i; b.score++;
          const n = this.B.filter(q => q.st === 'pen' && q.own === b.i).length - 1, a = n * 2.4;
          bn.x = pn.x + Math.cos(a) * (2 + (n % 5) * 1.3); bn.y = pn.y + Math.sin(a) * (1.5 + (n % 5)); bn.h = 0;
          SFX.point(); puff(pn.x, pn.y, PC[b.i].color, 12, 30, 'star'); floatText(pn.x, pn.y - 8, '+' + AR(1), PC[b.i].light);
        }
        return;
      }
      if(b.stun > 0) return;
      const bn = this.B.find(q => q.st === 'free' && !(q.cool > 0 && q.by === b.i) && hyp(q.x - b.x, q.y - b.y) < b.r + 3.2);
      if(bn){ bn.st = 'carried'; bn.own = b.i; b.carry = bn; tone(760, .08, 'square', .06, 0, 1100); puff(bn.x, bn.y, '#ffffff', 5, 16); }
    });
    if(this.time >= this.LIMIT){ SFX.go(); endAfter(this, api.best(this.P.map(b => b.score)), 0.6); }
  },
  idle(dt){
    this.P.forEach(b => tick(b, dt));
    this.B.forEach(bn => {
      if(bn.st === 'carried'){ const o = this.P.find(b => b.carry === bn); if(o){ bn.x = o.x; bn.y = o.y; bn.fx = o.fx < 0 ? -1 : 1; } return; }
      if(bn.st !== 'free') return;
      bn.cool = Math.max(0, bn.cool - dt);
      if(bn.hop > 0){
        bn.hop -= dt; const p = 1 - Math.max(0, bn.hop) / 0.38; bn.h = Math.sin(clamp(p, 0, 1) * Math.PI) * 2.6;
        bn.x += bn.vx * dt; bn.y += bn.vy * dt;
        if(bn.hop <= 0){ bn.h = 0; bn.wait = rnd(0.3, 0.9); }
      } else if(api.phase() === 'play'){
        bn.wait -= dt;
        if(bn.wait <= 0){
          const near = nearestBy(this.P, b => hyp(b.x - bn.x, b.y - bn.y)), d = near ? hyp(near.x - bn.x, near.y - bn.y) : 99;
          let a;
          if(d < 17){ a = Math.atan2(bn.y - near.y, bn.x - near.x) + rnd(-0.7, 0.7); }
          else { a = Math.random() * TAU; const ex = (bn.x - this.cx) / this.rx, ey = (bn.y - this.cy) / this.ry; if(hyp(ex, ey) > 0.6) a = Math.atan2(-ey, -ex) + rnd(-0.8, 0.8); }
          const s = d < 17 ? 36 : 22;
          bn.vx = Math.cos(a) * s; bn.vy = Math.sin(a) * s; bn.fx = bn.vx < 0 ? -1 : 1; bn.hop = 0.38;
        }
      }
      if(this.inField(bn, 3)){ bn.vx *= -0.5; bn.vy *= -0.5; }
      for(let i = 0; i < 4; i++){ const pn = this.pen(i), dx = bn.x - pn.x, dy = bn.y - pn.y, d = hyp(dx, dy) || 1; if(d < pn.r + 2){ bn.x = pn.x + dx / d * (pn.r + 2); bn.y = pn.y + dy / d * (pn.r + 2); } }
    });
  },
  bot(b, dt){
    const m = b.ai; m.t -= dt;
    if(b.carry){ const pn = this.pen(b.i); return toward(b, pn.x, pn.y, 1); }
    if(m.t <= 0){
      m.t = rnd(0.2, 0.4); m.mode = 'bunny'; m.who = null;
      const thief = b.cd <= 0 && Math.random() < 0.55 ? nearestBy(this.P.filter(o => o !== b && o.carry && hyp(o.x - b.x, o.y - b.y) < 20), o => hyp(o.x - b.x, o.y - b.y)) : null;
      if(thief){ m.mode = 'steal'; m.who = thief; }
      else {
        const q = nearestBy(this.B.filter(q => q.st === 'free' && !(q.cool > 0 && q.by === b.i)), q => hyp(q.x - b.x, q.y - b.y) + (this.P.some(o => o !== b && !o.carry && hyp(o.x - q.x, o.y - q.y) < hyp(b.x - q.x, b.y - q.y) * 0.7) ? 14 : 0));
        m.q = q || null;
      }
    }
    if(m.mode === 'steal' && m.who && m.who.carry){ const o = m.who, d = hyp(o.x - b.x, o.y - b.y); const v = toward(b, o.x + o.vx * 0.15, o.y + o.vy * 0.15, 1); return { x:v.x, y:v.y, act: d < 9 && b.cd <= 0 }; }
    if(m.q && m.q.st === 'free') return toward(b, m.q.x + m.q.vx * 0.12, m.q.y + m.q.vy * 0.12, 1);
    return toward(b, this.cx, this.cy, 4);
  },
  bake(g){
    const r = srand(41);
    const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#8fdc6a'); gr.addColorStop(1, '#5fb548');
    g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
    for(let k = 0; k < 420; k++){ const x = r() * SW, y = r() * SH; g.strokeStyle = r() < 0.5 ? 'rgba(60,140,50,.55)' : 'rgba(190,240,140,.5)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 2, y + 2); g.lineTo(x, y - 3); g.lineTo(x + 2, y + 2); g.stroke(); }
    for(let k = 0; k < 50; k++){ const x = r() * SW, y = r() * SH; g.fillStyle = ['#ffffff', '#ffe066', '#ff9ad5', '#b7a3ff'][k % 4]; for(let p = 0; p < 5; p++){ const a = p / 5 * TAU; g.beginPath(); g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, TAU); g.fill(); } g.fillStyle = '#ffb42e'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
    // bushes on the sides
    for(let k = 0; k < 10; k++){
      const left = k % 2 === 0, x = left ? 18 + r() * (OX - 40) : SW - 18 - r() * (OX - 40), y = 80 + r() * (SH - 150), s = 14 + r() * 12;
      shadow(g, x + 3, y + s * 0.7, s * 1.2, s * 0.4, 0.3);
      [[0, 0, 1], [-0.6, 0.2, 0.7], [0.6, 0.2, 0.7]].forEach(q => { g.fillStyle = '#3f9a3c'; g.beginPath(); g.arc(x + q[0] * s, y + q[1] * s, s * q[2], 0, TAU); g.fill(); });
      g.fillStyle = '#6ccb56'; g.beginPath(); g.arc(x - s * 0.25, y - s * 0.3, s * 0.45, 0, TAU); g.fill();
      if(k % 3 === 0){ g.fillStyle = '#ff6b6b'; [[0.2, -0.1], [-0.3, 0.3], [0.5, 0.35]].forEach(q => { g.beginPath(); g.arc(x + q[0] * s, y + q[1] * s, 2.4, 0, TAU); g.fill(); }); }
    }
    // the dirt field
    const cx = X(this.cx), cy = Y(this.cy), rx = this.rx * K, ry = this.ry * K;
    shadow(g, cx, cy + 6, rx + 6, ry + 4, 0.25);
    g.fillStyle = '#4f9c3d'; g.beginPath(); g.ellipse(cx, cy, rx + 6, ry + 6, 0, 0, TAU); g.fill();
    const fg = g.createRadialGradient(cx, cy - ry * 0.2, 10, cx, cy, rx); fg.addColorStop(0, '#e8bd82'); fg.addColorStop(1, '#c58e57');
    g.fillStyle = fg; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); g.fill();
    g.lineWidth = 4; g.strokeStyle = '#8a5a32'; g.stroke();
    for(let k = 0; k < 70; k++){ const a = r() * TAU, d = Math.sqrt(r()) * 0.95; g.fillStyle = r() < 0.5 ? 'rgba(140,95,55,.45)' : 'rgba(255,235,200,.4)'; g.beginPath(); g.ellipse(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 1.5 + r() * 3, 1 + r() * 2, r() * 3, 0, TAU); g.fill(); }
    // the burrow in the middle
    g.fillStyle = '#a8743f'; g.beginPath(); g.ellipse(cx, cy, K * 6, K * 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#4a2c14'; g.beginPath(); g.ellipse(cx, cy + K * 0.4, K * 3.6, K * 2.3, 0, 0, TAU); g.fill();
    // pens: hay floor + a fence in the owner's colour (open towards the middle)
    for(let i = 0; i < 4; i++){
      const pn = this.pen(i), x = X(pn.x), y = Y(pn.y), R = pn.r * K, act = i < PL().length, col = act ? PC[i] : { color:'#b98a5a', dark:'#7b5530' };
      g.fillStyle = act ? '#f6dc8f' : '#e2c48c'; g.beginPath(); g.ellipse(x, y, R, R * 0.8, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(190,140,40,.55)'; g.lineWidth = 1.4; for(let k = 0; k < 26; k++){ const a = r() * TAU, d = r() * 0.8; const sx = x + Math.cos(a) * R * d, sy = y + Math.sin(a) * R * 0.8 * d; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + (r() - 0.5) * 8, sy + (r() - 0.5) * 5); g.stroke(); }
      if(act){ g.fillStyle = col.color; g.globalAlpha = 0.18; g.beginPath(); g.ellipse(x, y, R, R * 0.8, 0, 0, TAU); g.fill(); g.globalAlpha = 1; }
      const open = Math.atan2(this.cy - pn.y, (this.cx - pn.x) * 0.6);
      g.lineWidth = Math.max(3, K * 0.8); g.strokeStyle = col.dark; g.beginPath(); g.ellipse(x, y, R, R * 0.8, 0, open + 0.55, open + TAU - 0.55); g.stroke();
      g.lineWidth = Math.max(1.5, K * 0.35); g.strokeStyle = col.color; g.beginPath(); g.ellipse(x, y - 2, R, R * 0.8, 0, open + 0.55, open + TAU - 0.55); g.stroke();
      for(let k = 0; k <= 10; k++){ const a = open + 0.55 + (TAU - 1.1) * k / 10, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * 0.8; g.fillStyle = col.dark; rr(g, px - 2.6, py - 7, 5.2, 9, 2); g.fill(); g.fillStyle = col.color; rr(g, px - 2, py - 7, 4, 4, 1.5); g.fill(); }
    }
  },
  paint(t){
    // pens: the delivered bunnies sit and wiggle
    this.B.forEach(bn => { if(bn.st === 'pen') this.bun(bn, t, 0.8, true); });
    const items = this.P.map(b => ({ y:b.y, b })).concat(this.B.filter(q => q.st === 'free').map(q => ({ y:q.y, q })));
    items.sort((a, b) => a.y - b.y).forEach(it => {
      if(it.q){ this.bun(it.q, t, 1, false); return; }
      const b = it.b; drawBody(b, t, { mood: b.carry ? 'happy' : 'idle' });
      if(b.carry){ const bn = b.carry; this.bun({ x:b.x, y:b.y, h:b.r * 2.3 + (b.h || 0) + Math.abs(Math.sin(t * 8)) * 0.5 + cheerH(b.i, t) / K, fx:bn.fx, col:bn.col, seed:bn.seed }, t, 0.85, false, true); }
    });
    // pen labels
    for(let i = 0; i < PL().length; i++){ const pn = this.pen(i), b = this.P[i]; text(AR(b.score), X(pn.x), Y(pn.y + pn.r * 0.8 + 3), 14 + K, PC[i].light); }
  },
  bun(bn, t, sc, sit, held){
    const s = K * 2.4 * sc, x = X(bn.x), gy = Y(bn.y), h = (bn.h || 0) * K, fx = bn.fx || 1;
    if(!held) shadow(c, x, gy, s * 1.1, s * 0.45, 0.28);
    const y = gy - s * 0.6 - h + (sit ? Math.sin(t * 4 + bn.seed) * 0.6 : 0);
    c.save(); c.translate(x, y); c.scale(fx, 1); if(held) c.rotate(Math.sin(t * 10 + bn.seed) * 0.15);
    c.lineWidth = 1.6; c.strokeStyle = 'rgba(28,24,56,.75)';
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(-s * 0.95, -s * 0.05, s * 0.35, 0, TAU); c.fill(); c.stroke(); // tail
    c.fillStyle = bn.col; c.beginPath(); c.ellipse(-s * 0.15, 0, s, s * 0.75, 0, 0, TAU); c.fill(); c.stroke();
    const wig = Math.sin(t * 6 + bn.seed) * 0.12;
    for(const k of [-1, 1]){ // ears
      c.save(); c.translate(s * 0.5 + k * s * 0.12, -s * 0.85); c.rotate(-0.25 + k * 0.18 + wig * k);
      c.fillStyle = bn.col; c.beginPath(); c.ellipse(0, -s * 0.55, s * 0.22, s * 0.62, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = '#ffb3c8'; c.beginPath(); c.ellipse(0, -s * 0.55, s * 0.1, s * 0.42, 0, 0, TAU); c.fill(); c.restore();
    }
    c.fillStyle = bn.col; c.beginPath(); c.arc(s * 0.6, -s * 0.45, s * 0.55, 0, TAU); c.fill(); c.stroke(); // head
    c.fillStyle = INK; c.beginPath(); c.arc(s * 0.78, -s * 0.55, s * 0.11, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(s * 0.75, -s * 0.59, s * 0.04, 0, TAU); c.fill();
    c.fillStyle = '#ff8fb1'; c.beginPath(); c.arc(s * 1.1, -s * 0.4, s * 0.09, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,130,160,.45)'; c.beginPath(); c.ellipse(s * 0.72, -s * 0.28, s * 0.12, s * 0.07, 0, 0, TAU); c.fill();
    c.restore();
  }
};

/* =====================================================================
   4) Mini Soccer ⚽ — 1v1 or 2v2 (red+yellow vs blue+green), timer + score, golden goal on a tie
   ===================================================================== */
const soccer = {
  key:'soccer', arena:true, icon:'🦶', wW:160, wH:96, LIMIT:45, GY0:34, GY1:62,
  title:L('فوتبول القبّعات ⚽', 'Mini Soccer ⚽', 'Mini Futbol ⚽'),
  help:L('سجّل بمرمى الفريق التاني! 🦶 للشوطة. الأحمر والأصفر ضد الأزرق والأخضر', 'Score in the other team\'s goal! 🦶 to kick. Red and Yellow against Blue and Green', 'Diğer takımın kalesine gol at! Şut için 🦶. Kırmızı ve Sarı, Mavi ve Yeşil\'e karşı'),
  press(){}, draw(){},
  team(i){ return i === 0 || i === 3 || i === -1 ? 0 : 1; },
  start(){
    this.time = 0; this.done = false; this.win = undefined; this.score = [0, 0]; this.cele = 0; this.golden = false;
    const n = PL().length;
    this.P = PL().map((p, i) => mkBody(i, 0, 0, 4));
    if(n === 3){ const h = mkBody(-1, 0, 0, 4); this.P.push(h); } // a grey helper evens out 1 v 2
    this.P.forEach(b => { b.team = this.team(b.i); });
    this.ball = { x:80, y:48, vx:0, vy:0, r:2.7, spin:0 };
    this.kickoff();
    PL().forEach(p => p.out = false); FX = []; freshInput();
  },
  kickoff(){
    const solo = { 0:0, 1:0 }; this.P.forEach(b => solo[b.team]++);
    this.P.forEach(b => {
      const left = b.team === 0, one = solo[b.team] === 1, top = b.i === -1 ? true : TOP(b.i);
      b.x = left ? 38 : 122; b.y = one ? 48 : (top ? 30 : 66); b.vx = b.vy = 0; b.fx = left ? 1 : -1; b.fy = 0; b.dash = 0; b.stun = 0;
    });
    Object.assign(this.ball, { x:80, y:48, vx:0, vy:0 });
  },
  left(){ return this.golden ? Math.max(0, this.LIMIT + 15 - this.time) : timeLeft(this); },
  val(){ return ''; },
  update(dt){
    this.idle(dt);
    if(api.ending(this, dt)) return;
    if(this.cele > 0){ this.cele -= dt; this.ballStep(dt, true); if(this.cele <= 0){ api.setMsg(''); this.kickoff(); } return; }
    this.time += dt;
    const bl = this.ball;
    this.P.forEach(b => {
      const inp = input(b, this, dt);
      if(inp.act){
        const d = hyp(bl.x - b.x, bl.y - b.y);
        if(d < b.r + bl.r + 5 && b.kcd <= 0){
          let ux = (bl.x - b.x) / (d || 1) + b.fx * 0.8, uy = (bl.y - b.y) / (d || 1) + b.fy * 0.8; const u = hyp(ux, uy) || 1; ux /= u; uy /= u;
          bl.vx = ux * 100 + b.vx * 0.3; bl.vy = uy * 100 + b.vy * 0.3; b.kcd = 0.35;
          tone(180, .1, 'square', .12, 0, 80); tone(900, .05, 'triangle', .06); puff(bl.x, bl.y, '#ffffff', 5, 20);
        } else tryDash(b, inp, 1.2);
      }
      drive(b, inp, dt, 31);
      b.x = clamp(b.x, b.r, this.wW - b.r); b.y = clamp(b.y, b.r, this.wH - b.r);
    });
    collide(this.P);
    // players push the ball (dribbling)
    this.P.forEach(b => {
      const dx = bl.x - b.x, dy = bl.y - b.y, d = hyp(dx, dy) || 0.01, m = b.r + bl.r; if(d >= m) return;
      const nx = dx / d, ny = dy / d; bl.x = b.x + nx * m; bl.y = b.y + ny * m;
      const vn = (bl.vx - b.vx) * nx + (bl.vy - b.vy) * ny;
      if(vn < 0){ bl.vx -= nx * vn * 1.55; bl.vy -= ny * vn * 1.55; }
    });
    this.ballStep(dt, false);
    const left = this.left();
    if(left <= 0){
      if(this.score[0] !== this.score[1]) this.finishMatch();
      else if(!this.golden){ this.golden = true; api.setMsg(L('هدف ذهبي! ⚽', 'Golden goal! ⚽', 'Altın gol! ⚽'), L('أول هدف بيربح', 'The next goal wins', 'İlk gol kazanır')); SFX.go(); setTimeout(() => { if(this.golden && !this.done && !this.cele) api.setMsg(''); }, 1600); }
      else { endAfter(this, null, 0.4); }
    }
  },
  finishMatch(){ const tw = this.score[0] > this.score[1] ? 0 : 1; endAfter(this, this.P.filter(b => b.i >= 0 && b.team === tw).map(b => b.i), 1.2); },
  ballStep(dt, frozen){
    const bl = this.ball, f = Math.exp(-0.95 * dt);
    bl.x += bl.vx * dt; bl.y += bl.vy * dt; bl.vx *= f; bl.vy *= f; bl.spin += hyp(bl.vx, bl.vy) * dt * 0.35;
    if(bl.y < bl.r){ bl.y = bl.r; bl.vy = Math.abs(bl.vy) * 0.8; }
    if(bl.y > this.wH - bl.r){ bl.y = this.wH - bl.r; bl.vy = -Math.abs(bl.vy) * 0.8; }
    const inMouth = bl.y > this.GY0 + bl.r * 0.5 && bl.y < this.GY1 - bl.r * 0.5;
    for(const side of [0, 1]){
      const out = side === 0 ? bl.x < bl.r : bl.x > this.wW - bl.r;
      if(!out) continue;
      if(!inMouth && (side === 0 ? bl.x > -1 : bl.x < this.wW + 1)){ bl.x = side === 0 ? bl.r : this.wW - bl.r; bl.vx = (side === 0 ? 1 : -1) * Math.abs(bl.vx) * 0.8; continue; }
      // inside the goal: net walls
      bl.y = clamp(bl.y, this.GY0 + bl.r, this.GY1 - bl.r);
      const back = side === 0 ? -8 + bl.r : this.wW + 8 - bl.r;
      if(side === 0 ? bl.x < back : bl.x > back){ bl.x = back; bl.vx *= -0.3; }
      if(!frozen && (side === 0 ? bl.x < -bl.r : bl.x > this.wW + bl.r)) this.goal(side === 0 ? 1 : 0);
    }
  },
  goal(team){
    this.score[team]++; this.cele = 1.9; this.lastGoal = team;
    const names = this.P.filter(b => b.i >= 0 && b.team === team).map(b => PL()[b.i].name).join(L(' و', ' & ', ' & '));
    api.setMsg(L('جوووول! ⚽', 'GOOOAL! ⚽', 'GOOOL! ⚽'), names + ' · ' + AR(this.score[0]) + ' : ' + AR(this.score[1]));
    [523, 659, 784, 1046].forEach((f, k) => tone(f, .18, 'triangle', .13, k * 0.08));
    puff(this.ball.x, this.ball.y, team === 0 ? '#ff5a5f' : '#3fa9ff', 18, 40, 'star');
    if(this.golden){ this.cele = 0; api.setMsg(''); this.finishMatch(); }
  },
  idle(dt){ this.P.forEach(b => tick(b, dt)); },
  bot(b, dt){
    const bl = this.ball, m = b.ai, tm = b.team, gx = tm === 0 ? this.wW + 6 : -6, ox = tm === 0 ? 0 : this.wW;
    m.t -= dt;
    const mates = this.P.filter(o => o.team === tm);
    const chaser = nearestBy(mates, o => hyp(o.x - bl.x, o.y - bl.y) + (o === b ? 0 : 2));
    const px = bl.x + bl.vx * 0.22, py = bl.y + bl.vy * 0.22;
    let tx, ty, act = false;
    if(chaser === b || mates.length === 1 || hyp(bl.x - b.x, bl.y - b.y) < 9){
      const gy = clamp(48 + (py - 48) * 0.3, this.GY0 + 5, this.GY1 - 5);
      let ux = gx - px, uy = gy - py; const ul = hyp(ux, uy) || 1; ux /= ul; uy /= ul;
      const side = (b.x - px) * ux + (b.y - py) * uy;
      if(side > -1.5){ const qx = -uy, qy = ux, sg = ((b.x - px) * qx + (b.y - py) * qy) >= 0 ? 1 : -1; tx = px - ux * 8 + qx * sg * 8; ty = py - uy * 8 + qy * sg * 8; }
      else {
        const bx = px - ux * (b.r + bl.r + 1), by = py - uy * (b.r + bl.r + 1);
        if(hyp(b.x - bx, b.y - by) > 4){ tx = bx; ty = by; } else { tx = px + ux * 3; ty = py + uy * 3; }
        const d = hyp(bl.x - b.x, bl.y - b.y), ax = (bl.x - b.x) / (d || 1), ay = (bl.y - b.y) / (d || 1);
        if(d < b.r + bl.r + 4 && ax * ux + ay * uy > 0.82 && b.kcd <= 0 && (Math.abs(gx - bl.x) < 75 || Math.random() < 0.03)) act = true;
      }
    } else {
      tx = ox + (px - ox) * 0.38; ty = 48 + (py - 48) * 0.6;
    }
    if(m.t <= 0){ m.t = 0.12; m.tx = tx; m.ty = ty; }
    const v = toward(b, m.tx, m.ty, 2);
    return { x:v.x, y:v.y, act };
  },
  bake(g){
    const r = srand(57);
    g.fillStyle = '#231d48'; g.fillRect(0, 0, SW, SH);
    // stands full of fans
    for(let y = 6; y < SH; y += 9) for(let x = 4 + (y % 2) * 4; x < SW; x += 9){
      if(x > X(-12) && x < X(this.wW + 12) && y > Y(-6) && y < Y(this.wH + 6)) continue;
      g.fillStyle = ['#ff5a5f', '#3fa9ff', '#3fd47a', '#ffc233', '#b46cff', '#fff7e8', '#ff9ad5'][r() * 7 | 0]; g.globalAlpha = 0.45 + r() * 0.4; g.beginPath(); g.arc(x, y, 2.6, 0, TAU); g.fill();
    }
    g.globalAlpha = 1;
    // pitch
    const x0 = X(0), y0 = Y(0), w = this.wW * K, h = this.wH * K, p = K * 5;
    shadow(g, x0 + w / 2, y0 + h + p, w * 0.55, 10, 0.5);
    g.fillStyle = '#3c9b48'; rr(g, x0 - p - K * 8, y0 - p, w + p * 2 + K * 16, h + p * 2, K * 3); g.fill();
    for(let k = 0; k < 16; k++){ g.fillStyle = k % 2 ? '#5cc35f' : '#52b656'; g.fillRect(x0 + w * k / 16, y0, w / 16 + 0.5, h); }
    g.strokeStyle = 'rgba(255,255,255,.92)'; g.lineWidth = Math.max(2, K * 0.55);
    g.strokeRect(x0, y0, w, h);
    g.beginPath(); g.moveTo(x0 + w / 2, y0); g.lineTo(x0 + w / 2, y0 + h); g.stroke();
    g.beginPath(); g.arc(x0 + w / 2, y0 + h / 2, K * 13, 0, TAU); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + w / 2, y0 + h / 2, K * 0.9, 0, TAU); g.fill();
    for(const s of [0, 1]){
      const bx = s ? x0 + w - K * 22 : x0; g.strokeRect(bx, Y(22), K * 22, K * 52);
      const sx = s ? x0 + w - K * 8 : x0; g.strokeRect(sx, Y(34), K * 8, K * 28);
      g.beginPath(); g.arc(s ? x0 + w - K * 15 : x0 + K * 15, y0 + h / 2, K * 0.8, 0, TAU); g.fill();
      for(const cy of [y0, y0 + h]){ g.beginPath(); g.arc(s ? x0 + w : x0, cy, K * 2.5, 0, TAU); g.stroke(); }
    }
    // corner flags
    [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h]].forEach((q, k) => { g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0], q[1] - 14); g.stroke(); g.fillStyle = k % 2 ? '#3fa9ff' : '#ff5a5f'; g.beginPath(); g.moveTo(q[0], q[1] - 14); g.lineTo(q[0] + 9, q[1] - 11); g.lineTo(q[0], q[1] - 8); g.fill(); });
    // goals with nets, posts in the defending team's colours
    for(const s of [0, 1]){
      const gx = s ? x0 + w : x0 - K * 8, gy = Y(this.GY0), gw = K * 8, gh = K * (this.GY1 - this.GY0);
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(gx, gy, gw, gh);
      g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1;
      for(let k = 1; k < 6; k++){ g.beginPath(); g.moveTo(gx + gw * k / 6, gy); g.lineTo(gx + gw * k / 6, gy + gh); g.stroke(); }
      for(let k = 1; k < 12; k++){ g.beginPath(); g.moveTo(gx, gy + gh * k / 12); g.lineTo(gx + gw, gy + gh * k / 12); g.stroke(); }
      const ca = s ? '#3fa9ff' : '#ff5a5f', cb = s ? '#3fd47a' : '#ffc233';
      g.lineWidth = Math.max(4, K * 1.1); g.lineCap = 'round';
      g.strokeStyle = INK; g.beginPath(); g.moveTo(s ? gx : gx + gw, gy); g.lineTo(s ? gx + gw : gx, gy); g.lineTo(s ? gx + gw : gx, gy + gh); g.lineTo(s ? gx : gx + gw, gy + gh); g.stroke();
      g.lineWidth = Math.max(2.5, K * 0.7); g.strokeStyle = ca; g.beginPath(); g.moveTo(s ? gx : gx + gw, gy); g.lineTo(s ? gx + gw : gx, gy); g.stroke();
      g.strokeStyle = cb; g.beginPath(); g.moveTo(s ? gx + gw : gx, gy + gh); g.lineTo(s ? gx : gx + gw, gy + gh); g.stroke();
      g.fillStyle = '#fff'; [gy, gy + gh].forEach(py => { g.beginPath(); g.arc(s ? gx : gx + gw, py, K * 1.1, 0, TAU); g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke(); });
    }
    g.lineCap = 'butt';
  },
  paint(t){
    const bl = this.ball, items = this.P.map(b => ({ y:b.y, b })).concat([{ y:bl.y, ball:true }]);
    items.sort((a, b) => a.y - b.y).forEach(it => {
      if(!it.ball){ const b = it.b; drawBody(b, t, { mood: this.cele > 0 ? (b.team === this.lastGoal ? 'happy' : 'dizzy') : 'idle' }); if(b.i < 0) text('🤖', X(b.x), Y(b.y) - b.r * K * 2.9, 13); return; }
      const x = X(bl.x), y = Y(bl.y), R = bl.r * K;
      shadow(c, x + R * 0.2, y + R * 0.15, R * 1.05, R * 0.5, 0.35);
      c.save(); c.translate(x, y - R * 0.8);
      c.fillStyle = '#ffffff'; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
      c.save(); c.clip();
      c.fillStyle = INK; for(let k = 0; k < 3; k++){ const a = bl.spin + k * TAU / 3; c.beginPath(); c.arc(Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.35, R * 0.3, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(28,24,56,.18)'; c.beginPath(); c.arc(R * 0.3, R * 0.35, R, 0, TAU); c.fill();
      c.restore();
      c.lineWidth = 2; c.strokeStyle = INK; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(-R * 0.35, -R * 0.4, R * 0.25, R * 0.14, -0.6, 0, TAU); c.fill();
      c.restore();
    });
  },
  hud(t){ // team score pill
    const tA = this.P.filter(b => b.team === 0), tB = this.P.filter(b => b.team === 1);
    const w = 64 + (tA.length + tB.length) * 23, cx = SW / 2 - 44, y = 22;
    c.fillStyle = 'rgba(28,24,56,.85)'; rr(c, cx - w / 2 - 54, y - 17, w + 108, 34, 17); c.fill();
    c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.18)'; c.stroke();
    const dot = (b, x) => { const pc = pcOf(b.i); c.fillStyle = pc.color; c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fill(); c.strokeStyle = INK; c.lineWidth = 2; c.stroke(); if(b.i >= 0) text(AR(PL()[b.i].score), x, y + 1, 11, '#fff7e8'); else emo('🤖', x, y, 10); };
    tA.forEach((b, k) => dot(b, cx - w / 2 - 36 + k * 21));
    tB.forEach((b, k) => dot(b, cx + w / 2 + 36 - k * 21));
    text(AR(this.score[0]) + ' : ' + AR(this.score[1]), cx, y + 1, 24, '#fff7e8');
    clockPill(cx + w / 2 + 54 + 47, y, this.left(), this.golden ? 15 : this.LIMIT, t, this.golden);
  }
};

/* ---------- HUD, joysticks, bot badges ---------- */
function clockPill(cx, y, left, total, t, gold){
  const w = 74; c.fillStyle = 'rgba(28,24,56,.85)'; rr(c, cx - w / 2, y - 13, w, 26, 13); c.fill();
  const fr = clamp(left / total, 0, 1), R = 8, px = cx - w / 2 + 15;
  c.fillStyle = '#fff7e8'; c.beginPath(); c.arc(px, y, R, 0, TAU); c.fill();
  c.fillStyle = gold ? '#ffcd4d' : fr < 0.25 ? '#ff5a5f' : '#ffcd4d'; c.beginPath(); c.moveTo(px, y); c.arc(px, y, R * 0.8, -Math.PI / 2, -Math.PI / 2 + TAU * fr); c.closePath(); c.fill();
  const low = left < 5.5 && left > 0;
  text(AR(Math.ceil(left)), cx + 10, y + 1, low ? 19 + Math.sin(t * 12) * 2 : 18, low ? '#ff8a8d' : '#fff7e8');
}
function drawHud(g, t){
  if(g.hud){ g.hud(t); return; }
  const cx = SW / 2, y = 22, L4 = [3, 0].filter(i => i < PL().length), R4 = [1, 2].filter(i => i < PL().length);
  clockPill(cx, y, g.left(), g.LIMIT, t);
  const chip = (i, x) => {
    const w = 80, p = PL()[i];
    c.fillStyle = 'rgba(28,24,56,.85)'; rr(c, x - w / 2, y - 15, w, 30, 15); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = PC[i].color; c.stroke();
    bean(x - w / 2 + 14, y + 8, 9, PC[i], { t, fy:1, mood:isWinner(i) ? 'cheer' : 'idle' });
    text(g.val(i), x - 3, y + 1, 17, '#fff7e8');
    text('⭐' + AR(p.score), x + w / 2 - 15, y + 1, 11, '#ffe27a');
    if(p.bot) emo('🤖', x - w / 2 + 6, y - 13, 11);
  };
  L4.forEach((i, k) => chip(i, cx - 37 - 45 - k * 85));
  R4.forEach((i, k) => chip(i, cx + 37 + 45 + k * 85));
}
function drawPads(g, t){
  const ps = PL(), ph = api.phase();
  ps.forEach((p, i) => {
    const h = home(i), pc = PC[i];
    if(p.bot){
      c.fillStyle = 'rgba(28,24,56,.55)'; c.beginPath(); c.arc(h.x, h.y, JR * 0.72, 0, TAU); c.fill();
      c.lineWidth = 2; c.strokeStyle = pc.color; c.setLineDash([5, 5]); c.stroke(); c.setLineDash([]);
      bean(h.x, h.y + JR * 0.28, JR * 0.3, pc, { t, fy:1, mood:'happy' });
      text(L('بوت 🤖', 'Bot 🤖', 'Bot 🤖'), h.x, h.y + JR * 0.5, 12, '#fff7e8');
    } else {
      const pd = pads[i], bx = pd.pid != null ? pd.bx : h.x, by = pd.pid != null ? pd.by : h.y;
      if(pd.pid == null){ pd.bx = h.x; pd.by = h.y; }
      const pulse = ph !== 'play' ? 1 + Math.sin(t * 5) * 0.04 : 1;
      c.fillStyle = 'rgba(28,24,56,.38)'; c.beginPath(); c.arc(bx, by, JR * pulse, 0, TAU); c.fill();
      c.lineWidth = 3; c.strokeStyle = pc.color; c.globalAlpha = 0.85; c.stroke(); c.globalAlpha = 1;
      for(let k = 0; k < 4; k++){ const a = k * Math.PI / 2; c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(bx + Math.cos(a) * JR * 0.82, by + Math.sin(a) * JR * 0.82); c.lineTo(bx + Math.cos(a + 0.22) * JR * 0.66, by + Math.sin(a + 0.22) * JR * 0.66); c.lineTo(bx + Math.cos(a - 0.22) * JR * 0.66, by + Math.sin(a - 0.22) * JR * 0.66); c.fill(); }
      const kx = bx + (pd.pid != null ? pd.kx : 0), ky = by + (pd.pid != null ? pd.ky : 0), kr = JR * 0.46;
      const kg = c.createRadialGradient(kx - kr * 0.3, ky - kr * 0.35, 2, kx, ky, kr); kg.addColorStop(0, pc.light); kg.addColorStop(0.6, pc.color); kg.addColorStop(1, pc.dark);
      shadow(c, kx, ky + kr * 0.6, kr * 0.9, kr * 0.35, 0.3);
      c.fillStyle = kg; c.beginPath(); c.arc(kx, ky, kr, 0, TAU); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(kx - kr * 0.3, ky - kr * 0.35, kr * 0.3, kr * 0.16, -0.6, 0, TAU); c.fill();
      // action button
      const b = btnPos(i), body = g.P && g.P.find(q => q.i === i), cdT = body ? (g.key === 'tiles' ? body.cd / 0.8 : g.key === 'soccer' ? Math.min(body.cd / 1.2, body.kcd / 0.35) : body.cd / (g.key === 'bunny' ? 1.5 : 1.4)) : 0;
      const dn = pd.down ? 0.9 : 1;
      shadow(c, b.x, b.y + BR * 0.75, BR * 0.9, BR * 0.3, 0.3);
      c.fillStyle = pc.dark; c.beginPath(); c.arc(b.x, b.y + 4, BR * dn, 0, TAU); c.fill();
      c.fillStyle = pc.color; c.beginPath(); c.arc(b.x, b.y + (pd.down ? 3 : 0), BR * dn, 0, TAU); c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke();
      if(cdT > 0.01){ c.fillStyle = 'rgba(28,24,56,.5)'; c.beginPath(); c.moveTo(b.x, b.y); c.arc(b.x, b.y, BR * dn, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(cdT, 0, 1)); c.closePath(); c.fill(); }
      emo(g.icon || '💨', b.x, b.y + (pd.down ? 3 : 0), BR * 0.95);
    }
  });
}

/* ---------- Frame ---------- */
let lastNow = 0, lastPhase = '', lastGameKey = '';
function render(){
  if(!on) return;
  const now = performance.now(), dt = Math.min(0.05, (now - lastNow) / 1000 || 0); lastNow = now;
  const t = now / 1000, g = api.game(), ph = api.phase();
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if(!g || !g.arena || !g.P){ c.fillStyle = '#1c1838'; c.fillRect(0, 0, SW, SH); return; }
  if(lastGameKey !== g.key + ':' + (g.P && g.P.length)){ lastGameKey = g.key + ':' + g.P.length; bgKey = ''; }
  if(bgKey !== sizeKey + g.key) bake(g);
  if(ph !== 'play' && g.idle) g.idle(dt);
  if(ph === 'result' && lastPhase !== 'result' && g.win != null && !(Array.isArray(g.win) && !g.win.length)) confetti();
  if(ph !== 'result' && CONF.length && ph !== lastPhase) CONF = [];
  lastPhase = ph;
  c.drawImage(bg, 0, 0, SW, SH);
  g.paint(t);
  drawFX(dt);
  drawHud(g, t);
  drawPads(g, t);
  drawConf(dt);
}

function setOn(v){
  on = !!v; stage.hidden = !on; document.body.classList.toggle('arena', on);
  if(on){ layout(); pads.forEach((pd, i) => { resetPad(pd, i); pd.bpid = null; pd.down = false; }); bgKey = ''; }
  rotOverlay();
}
function setMsg(html){ msgEl.innerHTML = html || ''; }

// test hooks (read-only views of the current round)
window.__arena = {
  get on(){ return on; }, get rot(){ return ROT; }, get size(){ return [SW, SH]; },
  home, btnPos, toScreen(x, y){ const p = { x:X(x), y:Y(y) }; return ROT ? { x:VW - p.y, y:p.x } : p; },
  stageToClient(x, y){ return ROT ? { x:VW - y, y:x } : { x, y }; },
  pads, bodies(){ const g = api.game(); return g && g.P ? g.P.map(b => ({ i:b.i, x:b.x, y:b.y, ghost:!!b.ghost, fall:!!b.fall, held:b.held, score:b.score, carry:!!b.carry, team:b.team })) : []; },
  game(){ return api.game(); }
};

return { games:{ tiles, haunt, bunny, soccer }, order:['tiles', 'haunt', 'bunny', 'soccer'], setOn, render, setMsg, get on(){ return on; } };
};
})();
