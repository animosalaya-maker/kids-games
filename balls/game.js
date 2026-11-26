/* Bobo Balls («طابات بوبو»): portrait aim-and-shoot puzzle arcade on a 2D canvas, everything drawn in code.
   The board is a 9 × 14 grid in world units (1 unit = 1 cell); physics runs on a fixed 1/240 s step in those units, so it
   behaves the same on every screen. Blocks live in a cell grid (that grid is also the spatial index for collisions).
   States: menu (a demo board plays behind the card) → map → play ⇄ pause → end.  Test params: ?lv=N (open level N). */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const Q = new URLSearchParams(location.search);
const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
const store = {
  get(k, d){ try{ const v = localStorage.getItem('balls_' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('balls_' + k, JSON.stringify(v)); }catch(e){} }
};
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, rnd = (a, b) => a + Math.random() * (b - a), TAU = Math.PI * 2;
const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
const LEVELS = window.BALLS_LEVELS || [];

/* ---------- world constants ---------- */
const COLS = 9, ROWS = 14;
const BR = 0.15, BIG_R = 0.24;           // ball radius (units)
const SPEED = 17;                        // units / s
const STEP = 1 / 240;                    // fixed physics step: 0.07 units per step < ball radius, so no tunnelling
const GAP = 0.05;                        // block inset inside its cell
const PICK_R = 0.3;
const LAUNCH_GAP = 0.042;                // seconds between balls in a stream
const MIN_VY = 0.13;                     // never let a ball travel almost flat (no endless side-to-side loops)
const RECALL_AFTER = 4;                  // seconds of flight before ⤵️ shows
const COIN_CAP_RUN = 30, COIN_CAP_DAY = 150;
const MAX_TMP = 140;                     // split-ball extras alive at once

/* colour scale by block number: mint → sky → violet → pink → peach → gold */
const PAL = ['#7ef7c8', '#6fe8f0', '#6fd0ff', '#7fb2ff', '#958dff', '#b384ff', '#d17dfa', '#f07ad8', '#ff7fb6', '#ff8c94', '#ff9f7a', '#ffb470', '#ffcb6a', '#ffe070'];
/* levels: colour relative to the level's biggest number; endless: to the current turn (so the board warms up as it grows) */
const bucket = hp => clamp(Math.round(Math.pow(clamp(hp / G.scaleMax, 0, 1), 0.8) * (PAL.length - 1)), 0, PAL.length - 1);

/* ---------- size ---------- */
let W = 0, H = 0, DPR = 1, C = 40, BX = 0, BY = 0, SA = { t:0, b:0, l:0, r:0 };
function readSA(){ try{ const cs = getComputedStyle($('#sa')); SA = { t:parseFloat(cs.paddingTop) || 0, r:parseFloat(cs.paddingRight) || 0, b:parseFloat(cs.paddingBottom) || 0, l:parseFloat(cs.paddingLeft) || 0 }; }catch(e){} }
function resize(){
  W = innerWidth; H = innerHeight; DPR = Math.min(2.5, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  readSA();
  const top = SA.t + 96, bot = H - SA.b - 96;
  C = Math.max(16, Math.min((W - 16) / COLS, (bot - top) / ROWS, 64));
  BX = (W - C * COLS) / 2; BY = top + Math.max(0, (bot - top - C * ROWS) * 0.4);
  buildSprites(); buildBG();
}
const SX = x => BX + x * C, SY = y => BY + y * C;

/* ---------- sprites (pre-rendered once per size) ---------- */
const SPR = {};
function mk(wu, hu, draw){   // size in units → canvas at device pixels, origin at centre, scaled to units
  const c = document.createElement('canvas'), k = C * DPR;
  c.width = Math.max(2, Math.ceil(wu * k)); c.height = Math.max(2, Math.ceil(hu * k));
  const g = c.getContext('2d'); g.scale(k, k); g.translate(wu / 2, hu / 2); g.lineJoin = 'round'; g.lineCap = 'round'; draw(g, k);
  c.wu = wu; c.hu = hu; return c;
}
function blit(c, x, y, sc, alpha){   // x,y in world units (centre)
  sc = sc || 1; const w = c.wu * C * sc, h = c.hu * C * sc;
  if(alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(c, SX(x) - w / 2, SY(y) - h / 2, w, h);
  if(alpha != null) ctx.globalAlpha = 1;
}
function shade(hex, t){   // t<0 darker, t>0 lighter
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = n >> 8 & 255, b = n & 255;
  const m = t < 0 ? 0 : 255, a = Math.abs(t); r = Math.round(r + (m - r) * a); g = Math.round(g + (m - g) * a); b = Math.round(b + (m - b) * a);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function rgba(hex, a){ const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }
/* block outline (centred cell, units): shape 0 square, 1 ◣ 2 ◢ 3 ◤ 4 ◥ */
function blockPts(sh, inset){
  const a = -0.5 + inset, b = 0.5 - inset;
  return [[[a, a], [b, a], [b, b], [a, b]], [[a, a], [a, b], [b, b]], [[b, a], [b, b], [a, b]], [[a, a], [b, a], [a, b]], [[a, a], [b, a], [b, b]]][sh];
}
function roundPoly(g, pts, rad){
  g.beginPath();
  const n = pts.length;
  for(let i = 0; i < n; i++){
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const v1x = p0[0] - p1[0], v1y = p0[1] - p1[1], v2x = p2[0] - p1[0], v2y = p2[1] - p1[1];
    const l1 = Math.hypot(v1x, v1y), l2 = Math.hypot(v2x, v2y), r = Math.min(rad, l1 / 2.5, l2 / 2.5);
    const ax = p1[0] + v1x / l1 * r, ay = p1[1] + v1y / l1 * r;
    if(i === 0) g.moveTo(ax, ay); else g.lineTo(ax, ay);
    g.quadraticCurveTo(p1[0], p1[1], p1[0] + v2x / l2 * r, p1[1] + v2y / l2 * r);
  }
  g.closePath();
}
const SHAPE_CODE = { '#':0, A:1, B:2, C:3, D:4 };
function centroid(sh){ if(!sh) return [0, 0]; const p = blockPts(sh, GAP); return [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3]; }
function buildSprites(){
  SPR.block = []; SPR.white = [];
  const PAD = 1.5;
  for(let sh = 0; sh < 5; sh++){
    SPR.block[sh] = PAL.map(col => mk(PAD, PAD, (g, k) => {
      const pts = blockPts(sh, GAP);
      g.save(); g.shadowColor = rgba(col, 0.85); g.shadowBlur = 0.32 * k; roundPoly(g, pts, 0.16); g.fillStyle = col; g.fill(); g.restore();
      const gr = g.createLinearGradient(0, -0.5, 0, 0.5); gr.addColorStop(0, shade(col, 0.45)); gr.addColorStop(0.55, col); gr.addColorStop(1, shade(col, -0.18));
      roundPoly(g, pts, 0.16); g.fillStyle = gr; g.fill();
      // inner shine + soft rim
      g.save(); roundPoly(g, pts, 0.16); g.clip();
      g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(-0.12, -0.36, 0.42, 0.16, -0.15, 0, TAU); g.fill();
      g.restore();
      roundPoly(g, blockPts(sh, GAP + 0.03), 0.13); g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 0.035; g.stroke();
    }));
    SPR.white[sh] = mk(PAD, PAD, g => { roundPoly(g, blockPts(sh, GAP - 0.02), 0.17); g.fillStyle = '#fff'; g.fill(); });
  }
  const ball = (core, glow, r) => mk(r * 5, r * 5, (g, k) => {
    const gl = g.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 2.5); gl.addColorStop(0, rgba(glow, 0.55)); gl.addColorStop(1, rgba(glow, 0));
    g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 2.5, 0, TAU); g.fill();
    const b = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r); b.addColorStop(0, '#ffffff'); b.addColorStop(0.6, core); b.addColorStop(1, shade(core, -0.25));
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  });
  SPR.ball = ball('#f4ecff', '#b9a6ff', BR);
  SPR.big = ball('#ffd76a', '#ffb347', BIG_R);
  SPR.tmp = ball('#ffc2e2', '#ff7fb6', BR);
  SPR.launch = ball('#fff6d8', '#ffd45e', BR * 1.25);
  SPR.dot = mk(0.16, 0.16, g => { g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 0.075, 0, TAU); g.fill(); });
  // particles: one soft dot per palette colour (+ white/gold/green)
  SPR.spark = {};
  PAL.concat(['#ffffff', '#ffd45e', '#5ef0a0', '#6fe8ff']).forEach(col => {
    SPR.spark[col] = mk(0.5, 0.5, g => { const gr = g.createRadialGradient(0, 0, 0, 0, 0, 0.25); gr.addColorStop(0, '#fff'); gr.addColorStop(0.25, col); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-0.25, -0.25, 0.5, 0.5); });
  });
  // pickups
  SPR.ring = mk(1, 1, (g, k) => {
    g.save(); g.shadowColor = '#5ef0a0'; g.shadowBlur = 0.25 * k;
    g.strokeStyle = '#5ef0a0'; g.lineWidth = 0.07; g.beginPath(); g.arc(0, 0, 0.27, 0, TAU); g.stroke(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.025; g.beginPath(); g.arc(0, 0, 0.27, 0, TAU); g.stroke();
    g.fillStyle = '#eafff4'; g.beginPath(); g.arc(0, 0, 0.1, 0, TAU); g.fill();
  });
  SPR.coin = mk(0.8, 0.8, (g, k) => {
    g.save(); g.shadowColor = '#ffcd4d'; g.shadowBlur = 0.2 * k;
    const gr = g.createRadialGradient(-0.08, -0.1, 0.02, 0, 0, 0.24); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.6, '#ffcd4d'); gr.addColorStop(1, '#d89a1c');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 0.22, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = '#b97c10'; g.lineWidth = 0.03; g.beginPath(); g.arc(0, 0, 0.15, 0, TAU); g.stroke();
    g.fillStyle = '#b97c10'; starPath(g, 0, 0, 0.09, 0.04); g.fill();
  });
  const badge = (col, icon) => mk(1, 1, (g, k) => {
    g.save(); g.shadowColor = col; g.shadowBlur = 0.3 * k;
    const gr = g.createRadialGradient(-0.08, -0.1, 0.02, 0, 0, 0.3); gr.addColorStop(0, shade(col, 0.6)); gr.addColorStop(1, col);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 0.28, 0, TAU); g.fill(); g.restore();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 0.035; g.beginPath(); g.arc(0, 0, 0.28, 0, TAU); g.stroke();
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 0.055; icon(g);
  });
  const arrowLine = (g, vert) => {
    g.save(); if(vert) g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(-0.16, 0); g.lineTo(0.16, 0); g.stroke();
    g.beginPath(); g.moveTo(-0.08, -0.08); g.lineTo(-0.17, 0); g.lineTo(-0.08, 0.08); g.stroke();
    g.beginPath(); g.moveTo(0.08, -0.08); g.lineTo(0.17, 0); g.lineTo(0.08, 0.08); g.stroke(); g.restore();
  };
  SPR.h = badge('#3fd0ff', g => arrowLine(g, false));
  SPR.v = badge('#3fd0ff', g => arrowLine(g, true));
  SPR.s = badge('#ff6fae', g => { g.beginPath(); g.moveTo(0, 0.16); g.lineTo(0, 0.02); g.lineTo(-0.12, -0.12); g.moveTo(0, 0.02); g.lineTo(0.12, -0.12); g.stroke(); [[-0.13, -0.14], [0.13, -0.14]].forEach(p => { g.beginPath(); g.arc(p[0], p[1], 0.045, 0, TAU); g.fill(); }); });
  SPR.b = badge('#ff9a3c', g => { g.beginPath(); g.arc(0, 0, 0.13, 0, TAU); g.fill(); g.fillStyle = '#ff9a3c'; g.beginPath(); g.arc(-0.04, -0.045, 0.04, 0, TAU); g.fill(); });
}
function starPath(g, x, y, R, r, n){
  n = n || 5; g.beginPath();
  for(let i = 0; i < n * 2; i++){ const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}

/* ---------- background (night sky, soft grid), pre-rendered ---------- */
let BG = null; const TWINK = [];
function buildBG(){
  BG = document.createElement('canvas'); BG.width = cv.width; BG.height = cv.height;
  const g = BG.getContext('2d'); g.scale(DPR, DPR);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0b0826'); sky.addColorStop(0.5, '#171049'); sky.addColorStop(1, '#2a1660');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  [[0.15, 0.2, '#6a4dff', 0.22], [0.9, 0.45, '#ff5fa8', 0.14], [0.3, 0.85, '#3fc6ff', 0.12], [0.75, 0.1, '#9b6bff', 0.12]].forEach(n => {
    const r = Math.max(W, H) * 0.45, gr = g.createRadialGradient(W * n[0], H * n[1], 0, W * n[0], H * n[1], r);
    gr.addColorStop(0, rgba(n[2], n[3])); gr.addColorStop(1, rgba(n[2], 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  });
  let seed = 7; const R = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 160; i++){ g.fillStyle = 'rgba(255,255,255,' + (0.15 + R() * 0.5) + ')'; g.beginPath(); g.arc(R() * W, R() * H, R() * 1.3 + 0.3, 0, TAU); g.fill(); }
  TWINK.length = 0; for(let i = 0; i < 26; i++) TWINK.push({ x:R() * W, y:R() * H, p:R() * TAU, s:0.8 + R() * 1.6 });
  // board panel + grid
  const x0 = SX(0), y0 = SY(0), bw = COLS * C, bh = ROWS * C;
  g.save(); g.shadowColor = 'rgba(120,100,255,.35)'; g.shadowBlur = 24;
  g.fillStyle = 'rgba(14,10,44,.55)'; rr(g, x0 - 4, y0 - 4, bw + 8, bh + 8, 16); g.fill(); g.restore();
  g.save(); rr(g, x0, y0, bw, bh, 12); g.clip();
  g.strokeStyle = 'rgba(170,160,255,.07)'; g.lineWidth = 1;
  for(let c = 1; c < COLS; c++){ g.beginPath(); g.moveTo(x0 + c * C, y0); g.lineTo(x0 + c * C, y0 + bh); g.stroke(); }
  for(let r = 1; r < ROWS; r++){ g.beginPath(); g.moveTo(x0, y0 + r * C); g.lineTo(x0 + bw, y0 + r * C); g.stroke(); }
  g.fillStyle = 'rgba(190,180,255,.12)';
  for(let c = 0; c <= COLS; c++) for(let r = 0; r <= ROWS; r++){ g.beginPath(); g.arc(x0 + c * C, y0 + r * C, 1.4, 0, TAU); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(190,175,255,.35)'; g.lineWidth = 2; rr(g, x0 - 2, y0 - 2, bw + 4, bh + 4, 14); g.stroke();
  // floor glow
  const fy = y0 + bh; const fg = g.createLinearGradient(0, fy - 10, 0, fy + 6); fg.addColorStop(0, 'rgba(255,212,94,0)'); fg.addColorStop(1, 'rgba(255,212,94,.25)');
  g.fillStyle = fg; g.fillRect(x0, fy - 10, bw, 12);
  g.strokeStyle = 'rgba(255,220,130,.75)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x0 + 6, fy); g.lineTo(x0 + bw - 6, fy); g.stroke();
}
function rr(g, x, y, w, h, r){ g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ---------- sound (tiny WebAudio synth) ---------- */
const SND = { ac:null, master:null, muted:!!store.get('muted', false), last:{} };
function audioInit(){
  if(SND.ac){ if(SND.ac.state === 'suspended') SND.ac.resume(); return; }
  try{ const AC = window.AudioContext || window.webkitAudioContext; SND.ac = new AC(); SND.master = SND.ac.createGain(); SND.master.gain.value = SND.muted ? 0 : 0.7; SND.master.connect(SND.ac.destination); }catch(e){ SND.ac = null; }
}
function tone(f, d, type, vol, f2, delay){
  const ac = SND.ac; if(!ac || SND.muted) return;
  const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), gn = ac.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(gn); gn.connect(SND.master); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol, freq, q){
  const ac = SND.ac; if(!ac || SND.muted) return;
  if(!SND.nb){ const n = ac.sampleRate * 0.5, b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0); for(let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; SND.nb = b; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(), t0 = ac.currentTime;
  s.buffer = SND.nb; f.type = 'bandpass'; f.frequency.setValueAtTime(freq || 1200, t0); f.Q.value = q || 0.8;
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(gn); gn.connect(SND.master); s.start(t0); s.stop(t0 + d + 0.02);
}
const SCALE = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];
function sfx(name, k){
  if(!SND.ac || SND.muted || G.mode === 'demo') return;
  const now = performance.now(), gap = { hit:28, pop:45, coin:50, ring:60, laser:90, launch:0 }[name] || 0;
  if(gap && now - (SND.last[name] || 0) < gap) return; SND.last[name] = now;
  switch(name){
    case 'hit': { const f = SCALE[(k || 0) % SCALE.length]; tone(f, 0.08, 'sine', 0.06); tone(f * 2, 0.04, 'triangle', 0.015); break; }
    case 'pop': tone(380, 0.14, 'sine', 0.13, 1200); noise(0.1, 0.05, 3000); tone(1568, 0.08, 'triangle', 0.03, null, 0.04); break;
    case 'launch': noise(0.35, 0.07, 700, 0.6); tone(260, 0.25, 'sine', 0.06, 620); break;
    case 'ring': tone(880, 0.07, 'triangle', 0.08); tone(1320, 0.12, 'triangle', 0.08, null, 0.06); break;
    case 'coin': tone(1320, 0.06, 'square', 0.03); tone(1760, 0.1, 'square', 0.03, null, 0.055); break;
    case 'laser': tone(1800, 0.22, 'sawtooth', 0.035, 300); noise(0.15, 0.04, 4000); break;
    case 'split': tone(700, 0.1, 'triangle', 0.07, 1400); break;
    case 'big': tone(300, 0.2, 'triangle', 0.09, 150); break;
    case 'land': tone(240, 0.05, 'sine', 0.05); break;
    case 'shift': tone(196, 0.18, 'triangle', 0.06, 160); break;
    case 'warn': tone(330, 0.14, 'square', 0.035); tone(330, 0.14, 'square', 0.035, null, 0.2); break;
    case 'combo': [784, 988, 1175].forEach((f, i) => tone(f, 0.1, 'triangle', 0.06, null, i * 0.05)); break;
    case 'win': [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.22, 'triangle', 0.1, null, i * 0.1)); break;
    case 'star': tone(1047 * (1 + (k || 0) * 0.26), 0.25, 'triangle', 0.09); break;
    case 'over': [523, 440, 392, 330].forEach((f, i) => tone(f, 0.28, 'triangle', 0.08, null, i * 0.17)); break;
    case 'click': tone(660, 0.05, 'sine', 0.07, 880); break;
  }
}
function setMute(m){
  SND.muted = m; store.set('muted', m);
  if(SND.master) SND.master.gain.value = m ? 0 : 0.7;
  $('#muteX').hidden = !m; $('#muteWave').style.display = m ? 'none' : '';
}

/* ---------- progress ---------- */
const PROG = { stars:store.get('stars', []), best:store.get('best', 0), shots:store.get('shots', 0) };
const unlocked = () => { let u = 0; while(u < LEVELS.length && (PROG.stars[u] || 0) > 0) u++; return Math.min(u, LEVELS.length - 1); };
const totalStars = () => PROG.stars.reduce((a, b) => a + (b || 0), 0);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ---------- game state ---------- */
const G = {
  state:'menu', mode:'demo', lv:0, turn:0, balls:3, lx:COLS / 2, nextX:null, queue:0, launchAcc:0, flyT:0, acc:0, ff:1,
  phase:'aim', aim:null, bricks:[], cell:new Array(COLS * ROWS).fill(null), picks:[], pcell:new Array(COLS * ROWS).fill(null),
  arr:[], landed:0, gain:0, coins:0, pops:0, hits:0, combo:0, comboT:0, parts:[], texts:[], beams:[], shake:0, shiftA:0,
  scaleMax:10, time:0, idle:0, cleared:false, clearT:0, awarded:false, endT:0, result:null, uid:0, demoT:0, flash:0, maxRow:0
};
function cellIdx(c, r){ return r * COLS + c; }
function rebuildGrid(){
  G.cell.fill(null); G.pcell.fill(null);
  for(const b of G.bricks) if(b.r >= 0 && b.r < ROWS) G.cell[cellIdx(b.c, b.r)] = b;
  for(const p of G.picks) if(!p.gone && p.r >= 0 && p.r < ROWS) G.pcell[cellIdx(p.c, p.r)] = p;
}
function addBrick(c, r, hp, sh){ const b = { c, r, hp, max:hp, sh:sh || 0, fl:0, sq:0, id:++G.uid }; G.bricks.push(b); return b; }
function addPick(c, r, t){ const p = { c, r, t, used:false, gone:false, ph:Math.random() * TAU, id:++G.uid }; G.picks.push(p); return p; }
function resetBoard(){
  G.bricks = []; G.picks = []; G.arr = []; G.parts = []; G.texts = []; G.beams = []; G.rings = []; G.flyers = [];
  G.turn = 0; G.nextX = null; G.queue = 0; G.landed = 0; G.gain = 0; G.coins = 0; G.pops = 0; G.hits = 0; G.combo = 0;
  G.lx = COLS / 2; G.phase = 'aim'; G.aim = null; G.cleared = false; G.awarded = false; G.result = null; G.shiftA = 0; G.idle = 0; G.flyT = 0;
}
function loadLevel(i){
  const L = LEVELS[i]; resetBoard(); G.lv = i; G.balls = L.balls;
  L.rows.forEach((row, ri) => row.split('').forEach((ch, ci) => {
    const r = ri + 1;
    if(ch in SHAPE_CODE) addBrick(ci, r, L.hp[ri][ci], SHAPE_CODE[ch]);
    else if('+$hvsb'.includes(ch)) addPick(ci, r, ch);
  }));
  G.scaleMax = Math.max(4, ...G.bricks.map(b => b.max));
  rebuildGrid();
}

/* endless: a new row on top every turn; numbers grow with the turn */
function spawnRow(turn){
  const free = []; for(let c = 0; c < COLS; c++) free.push(c);
  const take = () => free.splice(Math.floor(Math.random() * free.length), 1)[0];
  const n = clamp(Math.round(rnd(3, turn < 6 ? 5 : 7)), 2, 7);
  for(let k = 0; k < n; k++){
    const c = take(); let hp = turn;
    if(turn >= 8 && Math.random() < 0.28) hp = turn * 2;
    const tri = Math.random() < 0.14 ? 1 + Math.floor(Math.random() * 4) : 0;
    addBrick(c, 1, tri ? Math.max(1, Math.ceil(hp * 0.7)) : hp, tri);
  }
  addPick(take(), 1, '+');
  if(free.length && Math.random() < 0.35) addPick(take(), 1, '$');
  if(free.length && turn >= 3 && Math.random() < 0.2) addPick(take(), 1, 'hvsb'[Math.floor(Math.random() * 4)]);
}
function startEndless(){
  resetBoard(); G.mode = 'en'; G.balls = 3; G.turn = 0; G.lv = -1; G.scaleMax = 8;
  spawnRow(1); rebuildGrid(); enterPlay();
}
function startLevel(i){
  i = clamp(i | 0, 0, LEVELS.length - 1); G.mode = 'lv'; loadLevel(i); enterPlay();
}
function enterPlay(){
  G.state = 'play'; G.time = 0; show(null); audioInit(); sfx('click');
  try{ if(window.World) World.track('play', 'balls'); }catch(e){}
  G.texts.push({ t:G.mode === 'en' ? T('بلا نهاية ♾️', 'Endless ♾️', 'Sonsuz ♾️') : T('مرحلة ', 'Level ', 'Bölüm ') + (G.lv + 1) + ' ' + LEVELS[G.lv].emoji, x:COLS / 2, y:ROWS * 0.55, life:1.6, max:1.6, size:0.9, col:'#ffe07a' });
}
function startDemo(){
  G.mode = 'demo'; const pick = ['heart', 'bobo', 'star', 'smile', 'butterfly', 'cat'];
  const idx = LEVELS.findIndex(l => l.name === pick[Math.floor(Math.random() * pick.length)]);
  loadLevel(Math.max(0, idx)); G.balls = 40; G.bricks.forEach(b => { b.hp = b.max = 4 + Math.floor(Math.random() * 30); }); G.scaleMax = 34; G.demoT = 1.2;
}

/* ---------- physics ---------- */
const PB = [[0, 0], [0, 0], [0, 0], [0, 0]];
function brickPoly(b){   // world-space polygon (re-uses PB)
  const a0 = GAP, a1 = 1 - GAP, x0 = b.c + a0, x1 = b.c + a1, y0 = b.r + a0, y1 = b.r + a1;
  let n = 3;
  switch(b.sh){
    case 0: PB[0][0] = x0; PB[0][1] = y0; PB[1][0] = x1; PB[1][1] = y0; PB[2][0] = x1; PB[2][1] = y1; PB[3][0] = x0; PB[3][1] = y1; n = 4; break;
    case 1: PB[0][0] = x0; PB[0][1] = y0; PB[1][0] = x0; PB[1][1] = y1; PB[2][0] = x1; PB[2][1] = y1; break;
    case 2: PB[0][0] = x1; PB[0][1] = y0; PB[1][0] = x1; PB[1][1] = y1; PB[2][0] = x0; PB[2][1] = y1; break;
    case 3: PB[0][0] = x0; PB[0][1] = y0; PB[1][0] = x1; PB[1][1] = y0; PB[2][0] = x0; PB[2][1] = y1; break;
    case 4: PB[0][0] = x0; PB[0][1] = y0; PB[1][0] = x1; PB[1][1] = y0; PB[2][0] = x1; PB[2][1] = y1; break;
  }
  return n;
}
const HIT = { nx:0, ny:0, px:0, py:0 };
/* circle (x,y,r) against a block: fills HIT with the push-out normal and contact point */
function circleBrick(x, y, r, b){
  const n = brickPoly(b);
  let best = 1e9, qx = 0, qy = 0, inside = true, sgn = 0;
  for(let i = 0; i < n; i++){
    const a = PB[i], c = PB[(i + 1) % n], ex = c[0] - a[0], ey = c[1] - a[1];
    const cr = ex * (y - a[1]) - ey * (x - a[0]);
    if(sgn === 0) sgn = Math.sign(cr); else if(Math.sign(cr) !== sgn && cr !== 0) inside = false;
    let t = ((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey); t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a[0] + ex * t, py = a[1] + ey * t, d = (x - px) * (x - px) + (y - py) * (y - py);
    if(d < best){ best = d; qx = px; qy = py; }
  }
  if(!inside && best >= r * r) return false;
  const d = Math.sqrt(best) || 1e-6;
  if(inside){ HIT.nx = (qx - x) / d; HIT.ny = (qy - y) / d; }
  else { HIT.nx = (x - qx) / d; HIT.ny = (y - qy) / d; }
  HIT.px = qx; HIT.py = qy; return true;
}
function stepBall(o, dt){
  o.x += o.vx * dt; o.y += o.vy * dt;
  const r = o.r;
  if(o.x < r){ o.x = r; o.vx = Math.abs(o.vx); }
  else if(o.x > COLS - r){ o.x = COLS - r; o.vx = -Math.abs(o.vx); }
  if(o.y < r){ o.y = r; o.vy = Math.abs(o.vy); }
  const cx = Math.floor(o.x), cy = Math.floor(o.y);
  let bounced = false;
  for(let dy = -1; dy <= 1; dy++){
    const ry = cy + dy; if(ry < 0 || ry >= ROWS) continue;
    for(let dx = -1; dx <= 1; dx++){
      const rx = cx + dx; if(rx < 0 || rx >= COLS) continue;
      const i = ry * COLS + rx, b = G.cell[i];
      if(b && circleBrick(o.x, o.y, r, b)){
        o.x = HIT.px + HIT.nx * (r + 0.001); o.y = HIT.py + HIT.ny * (r + 0.001);
        const vn = o.vx * HIT.nx + o.vy * HIT.ny;
        if(vn < 0){ o.vx -= 2 * vn * HIT.nx; o.vy -= 2 * vn * HIT.ny; bounced = true; hitBrick(b, o.big ? 2 : 1, HIT.px, HIT.py); }
      }
      const p = G.pcell[i];
      if(p && !p.gone){ const ddx = o.x - (p.c + 0.5), ddy = o.y - (p.r + 0.5); if(ddx * ddx + ddy * ddy < (r + PICK_R) * (r + PICK_R)) touchPick(p, o); }
    }
  }
  if(bounced){
    const sp = Math.hypot(o.vx, o.vy) || SPEED, min = SPEED * MIN_VY;
    if(Math.abs(o.vy) < min){ o.vy = (o.vy < 0 ? -1 : 1) * min; o.vx = Math.sign(o.vx || 1) * Math.sqrt(Math.max(0, SPEED * SPEED - min * min)); }
    else if(Math.abs(sp - SPEED) > 0.01){ o.vx *= SPEED / sp; o.vy *= SPEED / sp; }
  }
  if(o.y >= ROWS - r && o.vy > 0) return true;   // landed
  return false;
}
function hitBrick(b, dmg, px, py){
  if(b.hp <= 0) return;
  b.hp -= dmg; b.fl = 1; b.sq = 1; G.hits++;
  sfx('hit', Math.min(9, Math.floor(G.hits / 6)));
  const col = PAL[bucket(Math.max(1, b.hp))];
  if(G.parts.length < 500) for(let k = 0; k < 2; k++) part(px, py, rnd(-2, 2), rnd(-2, 2), 0.35, col, 0.35);
  if(b.hp <= 0) popBrick(b);
}
function popBrick(b){
  b.hp = 0; G.cell[cellIdx(b.c, b.r)] = null; b.dead = true;
  const col = PAL[bucket(b.max)], cx = b.c + 0.5, cy = b.r + 0.5;
  const n = G.parts.length < 400 ? 16 : 6;
  for(let k = 0; k < n; k++){ const a = rnd(0, TAU), s = rnd(1.5, 5); part(cx + rnd(-0.3, 0.3), cy + rnd(-0.3, 0.3), Math.cos(a) * s, Math.sin(a) * s, rnd(0.45, 0.8), k % 5 ? col : '#ffffff', rnd(0.22, 0.42), true); }
  G.rings.push({ x:cx, y:cy, t:0, col });
  G.pops++; sfx('pop');
  G.combo = G.comboT > 0 ? G.combo + 1 : 1; G.comboT = 0.7;
  const words = { 3:T('حلو!', 'Nice!', 'Güzel!'), 5:T('رائع!', 'Great!', 'Harika!'), 8:T('مذهل!', 'Amazing!', 'Muhteşem!'), 12:T('خارق!', 'Super!', 'Süper!'), 18:T('أسطوري!', 'Legendary!', 'Efsane!') };
  if(words[G.combo] || (G.combo > 18 && G.combo % 6 === 0)){
    G.texts = G.texts.filter(t => !t.combo);
    G.texts.push({ combo:true, t:words[G.combo] || T('خرافي!', 'Wow!', 'Vay!'), sub:'×' + G.combo, x:COLS / 2, y:ROWS * 0.42, life:1.1, max:1.1, size:0.75 + Math.min(0.4, G.combo * 0.02), col:'#ffe07a' });
    if(G.combo >= 5) G.shake = Math.min(7, 2 + G.combo * 0.35);
    sfx('combo');
  }
  if(G.mode !== 'en' && !G.bricks.some(x => !x.dead)){ G.cleared = true; G.clearT = 0.55; }
}
function touchPick(p, o){
  switch(p.t){
    case '+':
      p.gone = true; G.pcell[cellIdx(p.c, p.r)] = null; G.gain++; sfx('ring');
      G.flyers.push({ x:p.c + 0.5, y:p.r + 0.5, t:0, kind:'ring' });
      for(let k = 0; k < 8; k++){ const a = k / 8 * TAU; part(p.c + 0.5, p.r + 0.5, Math.cos(a) * 3, Math.sin(a) * 3, 0.4, '#5ef0a0', 0.5, true); }
      break;
    case '$':
      p.gone = true; G.pcell[cellIdx(p.c, p.r)] = null; G.coins++; sfx('coin');
      G.flyers.push({ x:p.c + 0.5, y:p.r + 0.5, t:0, kind:'coin' });
      for(let k = 0; k < 6; k++) part(p.c + 0.5, p.r + 0.5, rnd(-3, 3), rnd(-3, 3), 0.4, '#ffd45e', 0.5, true);
      break;
    case 'h': case 'v':
      if(o.lz === p.id && G.flyT - o.lzT < 0.3) return;
      o.lz = p.id; o.lzT = G.flyT; p.used = true; p.fire = 1; sfx('laser');
      G.beams.push({ h:p.t === 'h', c:p.c, r:p.r, t:0 });
      for(const b of G.bricks) if(!b.dead && (p.t === 'h' ? b.r === p.r : b.c === p.c)) hitBrick(b, 1, b.c + 0.5, b.r + 0.5);
      break;
    case 's':
      if(o.tmp || o.sp === p.id) return;
      o.sp = p.id; p.used = true; p.fire = 1; sfx('split');
      for(const s of [-0.32, 0.32]){
        if(G.tmpN >= MAX_TMP) break;
        const a = Math.atan2(o.vy, o.vx) + s;
        G.arr.push({ x:o.x, y:o.y, vx:Math.cos(a) * SPEED, vy:Math.sin(a) * SPEED, r:BR, tmp:true, st:0, sp:p.id }); G.tmpN++;
      }
      break;
    case 'b':
      if(o.big) return;
      o.big = true; o.r = BIG_R; p.used = true; p.fire = 1; sfx('big');
      for(let k = 0; k < 6; k++) part(o.x, o.y, rnd(-3, 3), rnd(-3, 3), 0.35, '#ffd45e', 0.5, true);
      break;
  }
}
G.rings = []; G.flyers = []; G.tmpN = 0;

/* ---------- aim + trajectory preview ---------- */
const launchY = () => ROWS - BR;
function aimDir(wx, wy){
  let dx = wx - G.lx, dy = wy - launchY();
  if(dy > -0.25){ if(dy > 0.6){ dx = -dx; dy = -dy; } else return null; }   // below the line: slingshot style (pull back)
  const L = Math.hypot(dx, dy); if(L < 0.4) return null;
  let a = Math.atan2(dy, dx);   // -PI..0 (up)
  const lim = 0.14;             // ~8° from flat
  a = clamp(a, -Math.PI + lim, -lim);
  return { x:Math.cos(a), y:Math.sin(a), a };
}
/* trace a ghost ball until its first bounce, then a short stretch after it */
const TR = { pts:[], hit:null };
function trace(dir){
  TR.pts.length = 0; TR.hit = null;
  const o = { x:G.lx, y:launchY(), vx:dir.x, vy:dir.y, r:BR };
  const ds = 0.04; let bounced = false, after = 0, dist = 0, next = 0;
  for(let i = 0; i < 1400; i++){
    o.x += o.vx * ds; o.y += o.vy * ds; dist += ds;
    let hit = false;
    if(o.x < o.r){ o.x = o.r; o.vx = Math.abs(o.vx); hit = true; }
    else if(o.x > COLS - o.r){ o.x = COLS - o.r; o.vx = -Math.abs(o.vx); hit = true; }
    if(o.y < o.r){ o.y = o.r; o.vy = Math.abs(o.vy); hit = true; }
    if(!hit){
      const cx = Math.floor(o.x), cy = Math.floor(o.y);
      for(let dy = -1; dy <= 1 && !hit; dy++) for(let dx = -1; dx <= 1 && !hit; dx++){
        const rx = cx + dx, ry = cy + dy; if(rx < 0 || ry < 0 || rx >= COLS || ry >= ROWS) continue;
        const b = G.cell[ry * COLS + rx];
        if(b && circleBrick(o.x, o.y, o.r, b)){
          const vn = o.vx * HIT.nx + o.vy * HIT.ny;
          o.x = HIT.px + HIT.nx * (o.r + 0.001); o.y = HIT.py + HIT.ny * (o.r + 0.001);
          if(vn < 0){ o.vx -= 2 * vn * HIT.nx; o.vy -= 2 * vn * HIT.ny; hit = true; }
        }
      }
    }
    if(dist >= next){ TR.pts.push(o.x, o.y, bounced ? 1 : 0); next += 0.42; }
    if(hit && !bounced){ bounced = true; TR.hit = { x:o.x, y:o.y }; next = dist + 0.42; }
    if(bounced){ after += ds; if(after > 2.6) break; }
    if(o.y >= ROWS - o.r && o.vy > 0) break;
  }
}

/* ---------- turn flow ---------- */
function fire(dir){
  if(G.state !== 'play' && G.mode !== 'demo') return false;
  if(G.phase !== 'aim' || !dir) return false;
  G.phase = 'fly'; G.dir = { x:dir.x, y:dir.y }; G.queue = G.balls; G.launchAcc = LAUNCH_GAP; G.flyT = 0; G.landed = 0; G.nextX = null; G.tmpN = 0;
  G.hits = 0; G.pops = 0; G.idle = 0; G.aim = null;
  if(G.mode !== 'demo'){ PROG.shots++; if(PROG.shots < 50) store.set('shots', PROG.shots); }
  sfx('launch'); syncButtons();
  return true;
}
function recall(){
  if(G.phase !== 'fly') return;
  if(G.nextX == null) G.nextX = G.lx;
  G.landed += G.queue; G.queue = 0;
  for(const o of G.arr) if(o.st === 0) o.st = 3;
  sfx('land'); syncButtons();
}
function endTurn(){
  G.turn++;
  G.balls += G.gain; if(G.gain > 0) G.texts.push({ ltr:true, t:'+' + G.gain, x:G.nextX, y:ROWS - 1.2, life:1, max:1, size:0.6, col:'#5ef0a0' });
  G.gain = 0; G.lx = clamp(G.nextX != null ? G.nextX : G.lx, BR, COLS - BR); G.nextX = null; G.arr.length = 0; G.tmpN = 0;
  G.picks = G.picks.filter(p => !p.gone && !p.used);
  G.ff = G.ffKeep ? G.ff : 1;
  if(G.mode === 'lv' && G.cleared){ win(); return; }
  if(G.mode === 'en' || (G.mode === 'demo' && G.demoShift)){
    for(const b of G.bricks) b.r++;
    for(const p of G.picks) p.r++;
    G.picks = G.picks.filter(p => { if(p.r >= ROWS - 1){ if(p.t === '+') G.balls++; return false; } return true; });
    G.bricks = G.bricks.filter(b => !b.dead);
    spawnRow(G.turn + 1); G.scaleMax = Math.max(8, (G.turn + 1) * 1.6); G.shiftA = 1; sfx('shift');
    rebuildGrid();
    if(G.bricks.some(b => b.r >= ROWS - 1)){ G.phase = 'over'; G.overT = 0.7; syncButtons(); return; }
    if(G.bricks.some(b => b.r >= ROWS - 3)) sfx('warn');
  } else {
    G.bricks = G.bricks.filter(b => !b.dead); rebuildGrid();
  }
  G.phase = 'aim'; syncButtons();
}
function starsFor(turns, par){ return turns <= par ? 3 : turns <= par + Math.max(3, Math.ceil(par / 2)) ? 2 : 1; }
function addCoinsOnce(n, why){
  if(G.awarded) return 0; G.awarded = true;
  const d = store.get('coinday', { d:'', n:0 }); if(d.d !== today()){ d.d = today(); d.n = 0; }
  n = Math.max(0, Math.min(n, COIN_CAP_RUN, COIN_CAP_DAY - d.n));
  if(n > 0){ d.n += n; store.set('coinday', d); try{ if(window.World) World.addCoins(n, why); }catch(e){} }
  return n;
}
function win(){
  const L = LEVELS[G.lv], stars = starsFor(G.turn, L.par);
  const prev = PROG.stars[G.lv] || 0; if(stars > prev){ PROG.stars[G.lv] = stars; store.set('stars', PROG.stars); }
  const coins = addCoinsOnce(G.coins + stars * 2, T('من طابات بوبو', 'from Bobo Balls', 'Bobo Topları\'ndan'));
  G.result = { win:true, stars, turns:G.turn, coins, balls:G.balls, best:stars > prev && prev > 0 };
  G.phase = 'won'; G.state = 'end'; G.endT = 1.1; sfx('win'); syncButtons();
  for(let k = 0; k < 90; k++){ const a = rnd(-Math.PI, 0), s = rnd(4, 11); part(rnd(1, COLS - 1), ROWS * 0.7, Math.cos(a) * s * 0.6, Math.sin(a) * s, rnd(1, 1.8), PAL[k % PAL.length], rnd(0.6, 1), true, 6); }
  G.texts.push({ t:T('برافو! 🎉', 'Well done! 🎉', 'Aferin! 🎉'), x:COLS / 2, y:ROWS * 0.4, life:1.4, max:1.4, size:1, col:'#ffe07a' });
}
function gameOver(){
  const score = G.turn, isBest = score > PROG.best;
  if(isBest){ PROG.best = score; store.set('best', score); }
  const coins = addCoinsOnce(G.coins + Math.floor(score / 3), T('من طابات بوبو', 'from Bobo Balls', 'Bobo Topları\'ndan'));
  G.result = { win:false, score, coins, balls:G.balls, best:isBest };
  G.state = 'end'; G.endT = 0.9; sfx('over'); syncButtons();
  G.shake = 6;
}
function showEnd(){
  const R = G.result; if(!R) return;
  const lv = G.mode === 'lv';
  $('#endTitle').textContent = lv ? T('خلصت المرحلة ', 'Level ', 'Bölüm ') + (G.lv + 1) + T('! 🎉', ' complete! 🎉', ' bitti! 🎉') : T('انتهت اللعبة! 🌙', 'Game over! 🌙', 'Oyun bitti! 🌙');
  $('#endStars').hidden = !lv;
  $('#endStars').querySelectorAll('span').forEach((s, i) => { s.classList.toggle('on', lv && i < R.stars); });
  if(lv) for(let i = 0; i < R.stars; i++) setTimeout(() => sfx('star', i), 200 + i * 180);
  $('#newBest').hidden = !(R.best && !lv);
  $('#rA').textContent = lv ? R.turns : R.score; $('#rAl').textContent = lv ? T('الدورات', 'Turns', 'Tur') : T('النتيجة', 'Score', 'Puan');
  $('#rB').textContent = lv ? LEVELS[G.lv].par : PROG.best; $('#rBl').textContent = lv ? T('هدف ٣ نجوم', '3-star goal', '3 yıldız hedefi').replace('٣', '3') : T('الأحسن', 'Best', 'En iyi');
  $('#rC').textContent = R.balls; $('#rCoins').textContent = '+' + R.coins;
  const nx = $('#btnNext');
  if(lv && G.lv < LEVELS.length - 1){ nx.hidden = false; nx.textContent = T('المرحلة الجاية', 'Next level', 'Sonraki bölüm') + ' ▶'; }
  else if(!lv){ nx.hidden = false; nx.textContent = T('العب كمان', 'Play again', 'Tekrar oyna') + ' 🔁'; }
  else nx.hidden = true;
  $('#btnAgain').hidden = !lv; $('#btnEndMap').hidden = !lv;
  show('end');
}

/* ---------- particles / effects ---------- */
function part(x, y, vx, vy, life, col, size, glow, grav){
  if(G.parts.length > 700) return;
  G.parts.push({ x, y, vx, vy, life, max:life, col, size:size || 0.4, g:grav != null ? grav : 3 });
}

/* ---------- update ---------- */
function update(dt){
  G.time += dt;
  if(G.state === 'pause' || G.state === 'map') return;
  const play = G.state === 'play' || G.mode === 'demo' || G.state === 'end';
  if(!play) return;
  if(G.mode === 'demo') demoAI(dt);
  if(G.phase === 'fly'){
    G.flyT += dt * G.ff;
    G.acc += dt * G.ff; if(G.acc > 0.25) G.acc = 0.25;
    while(G.acc >= STEP){ G.acc -= STEP; physStep(STEP); if(G.phase !== 'fly') break; }
    if(G.cleared && G.clearT > 0){ G.clearT -= dt; if(G.clearT <= 0) recall(); }
    const live = G.arr.length > 0 || G.queue > 0;
    if(!live) endTurn();
    syncButtons();
  } else if(G.phase === 'aim' && G.state === 'play'){ G.idle += dt; if(G.cleared && G.mode === 'lv') win(); }
  if(G.phase === 'over'){ G.overT -= dt; if(G.overT <= 0 && G.state === 'play'){ G.phase = 'done'; gameOver(); } }
  if(G.state === 'end' && G.endT > 0){ G.endT -= dt; if(G.endT <= 0) showEnd(); }
  // effects
  if(G.shiftA > 0) G.shiftA = Math.max(0, G.shiftA - dt * 4);
  if(G.comboT > 0){ G.comboT -= dt; if(G.comboT <= 0) G.combo = 0; }
  G.shake = Math.max(0, G.shake - dt * 18);
  for(const b of G.bricks){ if(b.fl > 0) b.fl = Math.max(0, b.fl - dt * 7); if(b.sq > 0) b.sq = Math.max(0, b.sq - dt * 6); }
  for(const p of G.picks) if(p.fire > 0) p.fire = Math.max(0, p.fire - dt * 3);
  for(let i = G.parts.length - 1; i >= 0; i--){
    const p = G.parts[i]; p.life -= dt; if(p.life <= 0){ G.parts[i] = G.parts[G.parts.length - 1]; G.parts.pop(); continue; }
    p.vy += p.g * dt; p.vx *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for(let i = G.texts.length - 1; i >= 0; i--){ const t = G.texts[i]; t.life -= dt; if(t.life <= 0) G.texts.splice(i, 1); }
  for(let i = G.beams.length - 1; i >= 0; i--){ const b = G.beams[i]; b.t += dt * 2.5; if(b.t >= 1) G.beams.splice(i, 1); }
  for(let i = G.rings.length - 1; i >= 0; i--){ const r = G.rings[i]; r.t += dt * 2.6; if(r.t >= 1) G.rings.splice(i, 1); }
  for(let i = G.flyers.length - 1; i >= 0; i--){ const f = G.flyers[i]; f.t += dt * 1.8; if(f.t >= 1) G.flyers.splice(i, 1); }
}
function physStep(dt){
  // stream launch
  if(G.queue > 0){
    G.launchAcc += dt;
    while(G.launchAcc >= LAUNCH_GAP && G.queue > 0){
      G.launchAcc -= LAUNCH_GAP; G.queue--;
      G.arr.push({ x:G.lx, y:launchY(), vx:G.dir.x * SPEED, vy:G.dir.y * SPEED, r:BR, st:0 });
    }
  }
  for(let i = G.arr.length - 1; i >= 0; i--){
    const o = G.arr[i];
    if(o.st === 0){
      if(stepBall(o, dt)){
        o.y = ROWS - o.r;
        if(o.tmp){ fadeAt(o); G.arr[i] = G.arr[G.arr.length - 1]; G.arr.pop(); continue; }
        if(G.nextX == null){ G.nextX = clamp(o.x, BR, COLS - BR); sfx('land'); }
        o.st = 1;
      }
    } else if(o.st === 1 || o.st === 3){
      const tx = G.nextX != null ? G.nextX : G.lx, ty = ROWS - BR;
      const sp = o.st === 3 ? 30 : 14, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy);
      if(d <= sp * dt){
        if(o.tmp){ G.arr[i] = G.arr[G.arr.length - 1]; G.arr.pop(); continue; }
        G.landed++; G.arr[i] = G.arr[G.arr.length - 1]; G.arr.pop(); continue;
      }
      o.x += dx / d * sp * dt; o.y += dy / d * sp * dt;
    }
  }
}
function fadeAt(o){ part(o.x, o.y, 0, -1, 0.3, '#ff7fb6', 0.4, true, 0); }

/* menu demo: aims at a random block every turn */
function demoAI(dt){
  if(G.state !== 'menu' && G.state !== 'map') return;
  if(G.phase === 'aim'){
    G.demoT -= dt;
    if(G.demoT <= 0){
      if(!G.bricks.some(b => !b.dead) || G.turn > 8){ startDemo(); return; }
      const live = G.bricks.filter(b => !b.dead), b = live[Math.floor(Math.random() * live.length)];
      const d = aimDir(b.c + 0.5 + rnd(-0.4, 0.4), b.r + 0.5);
      if(d){ fire(d); } G.demoT = 1.1;
    }
  }
  if(G.cleared && G.phase === 'aim'){ startDemo(); }
}

/* ---------- draw ---------- */
function draw(){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if(BG) ctx.drawImage(BG, 0, 0, W, H);
  // twinkles
  for(const s of TWINK){ const a = 0.35 + 0.35 * Math.sin(G.time * s.s + s.p); ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; ctx.fillRect(s.x, s.y, 1.6, 1.6); }
  if(G.state === 'map') return;
  ctx.save();
  if(G.shake > 0) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  const sh = G.shiftA > 0 ? (G.shiftA * G.shiftA) : 0;   // rows ease down after a shift
  // danger line (endless)
  if(G.mode === 'en'){
    const danger = G.bricks.some(b => !b.dead && b.r >= ROWS - 3);
    const y = SY(ROWS - 1); ctx.strokeStyle = danger ? 'rgba(255,90,120,' + (0.55 + 0.35 * Math.sin(G.time * 8)).toFixed(3) + ')' : 'rgba(255,120,150,.28)';
    ctx.lineWidth = danger ? 3 : 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.moveTo(SX(0) + 4, y); ctx.lineTo(SX(COLS) - 4, y); ctx.stroke(); ctx.setLineDash([]);
  }
  // laser badges + pickups
  for(const p of G.picks){
    if(p.gone) continue;
    const x = p.c + 0.5, y = p.r + 0.5 - sh, ph = G.time * 3 + p.ph;
    if(p.t === '+'){ blit(SPR.ring, x, y, 0.9 + 0.12 * Math.sin(ph)); }
    else if(p.t === '$'){ const w = Math.abs(Math.cos(ph * 0.6)); ctx.save(); ctx.translate(SX(x), SY(y)); ctx.scale(0.35 + 0.65 * w, 1); ctx.drawImage(SPR.coin, -SPR.coin.wu * C / 2, -SPR.coin.hu * C / 2, SPR.coin.wu * C, SPR.coin.hu * C); ctx.restore(); }
    else {
      if(p.t === 'h' || p.t === 'v'){
        ctx.save(); ctx.globalAlpha = 0.18 + 0.1 * Math.sin(ph) + (p.fire || 0) * 0.5; ctx.strokeStyle = '#6fe8ff'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
        ctx.beginPath(); if(p.t === 'h'){ ctx.moveTo(SX(0), SY(y)); ctx.lineTo(SX(COLS), SY(y)); } else { ctx.moveTo(SX(x), SY(0)); ctx.lineTo(SX(x), SY(ROWS)); } ctx.stroke(); ctx.restore();
      }
      blit(SPR[p.t], x, y, (p.used ? 0.85 : 1) + 0.06 * Math.sin(ph) + (p.fire || 0) * 0.3, p.used ? 0.7 : 1);
    }
  }
  // blocks
  const fs = Math.round(C * 0.4);
  for(const b of G.bricks){
    if(b.dead) continue;
    const bk = bucket(b.hp), x = b.c + 0.5, y = b.r + 0.5 - sh, sc = 1 + b.sq * 0.08;
    blit(SPR.block[b.sh][bk], x, y, sc);
    if(b.fl > 0) blit(SPR.white[b.sh], x, y, sc, b.fl * 0.75);
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const b of G.bricks){
    if(b.dead) continue;
    const cen = CEN[b.sh], x = SX(b.c + 0.5 + cen[0] * 0.8), y = SY(b.r + 0.5 + cen[1] * 0.8 - sh) + C * 0.03;
    const s = b.hp >= 1000 ? 0.6 : b.hp >= 100 ? 0.78 : 1, tri = b.sh ? 0.82 : 1;
    ctx.font = '800 ' + Math.round(fs * s * tri) + 'px ' + FONT;
    ctx.fillStyle = 'rgba(30,18,72,.92)'; ctx.fillText(String(b.hp), x, y);
  }
  // pop rings
  ctx.globalCompositeOperation = 'lighter';
  for(const r of G.rings){ ctx.strokeStyle = rgba(r.col, (1 - r.t) * 0.8); ctx.lineWidth = 3 * (1 - r.t) + 0.5; ctx.beginPath(); ctx.arc(SX(r.x), SY(r.y), C * (0.3 + r.t * 0.7), 0, TAU); ctx.stroke(); }
  // laser beams
  for(const bm of G.beams){
    const a = 1 - bm.t, y = SY(bm.r + 0.5), x = SX(bm.c + 0.5);
    for(const [w, al] of [[C * 0.5 * a, 0.25], [C * 0.18, 0.7], [3, 1]]){
      ctx.strokeStyle = 'rgba(120,235,255,' + (al * a).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, w);
      ctx.beginPath(); if(bm.h){ ctx.moveTo(SX(0), y); ctx.lineTo(SX(COLS), y); } else { ctx.moveTo(x, SY(0)); ctx.lineTo(x, SY(ROWS)); } ctx.stroke();
    }
  }
  // particles
  for(const p of G.parts){ const k = p.life / p.max, spr = SPR.spark[p.col] || SPR.spark['#ffffff']; blit(spr, p.x, p.y, p.size * (0.4 + k * 0.8) * 2, Math.min(1, k * 1.5)); }
  // balls
  for(const o of G.arr){ blit(o.big ? SPR.big : o.tmp ? SPR.tmp : SPR.ball, o.x, o.y); }
  ctx.globalCompositeOperation = 'source-over';
  // flyers (ring / coin collected)
  for(const f of G.flyers){
    const tx = f.kind === 'ring' ? (G.nextX != null ? G.nextX : G.lx) : 0.6, ty = f.kind === 'ring' ? ROWS - 0.3 : -1.2;
    const e = f.t * f.t, x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e;
    blit(f.kind === 'ring' ? SPR.ring : SPR.coin, x, y, 0.7 * (1 - f.t * 0.4), 1 - f.t * 0.3);
  }
  drawLauncher();
  if(G.phase === 'aim' && G.aim && G.state === 'play') drawAim();
  ctx.restore();
  drawTexts();
  if(G.state === 'play') drawHUD();
  if(G.state === 'play' && G.phase === 'aim' && !G.aim) drawHint();
}
const CEN = [0, 1, 2, 3, 4].map(centroid);
function drawLauncher(){
  const y = launchY();
  if(G.phase === 'aim' || G.queue > 0){
    const pulse = G.phase === 'aim' ? 1 + 0.08 * Math.sin(G.time * 5) : 1;
    blit(SPR.launch, G.lx, y, pulse);
    const n = G.phase === 'aim' ? G.balls : G.queue;
    countLabel(G.lx, n);
  }
  if(G.phase === 'fly' && G.nextX != null && G.landed > 0){ blit(SPR.ball, G.nextX, y, 1.15); if(G.queue === 0) countLabel(G.nextX, G.landed); }
}
function countLabel(x, n){
  ctx.font = '800 ' + Math.round(Math.max(14, C * 0.36)) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const sx = clamp(SX(x), BX + 20, BX + COLS * C - 20), sy = SY(ROWS) + 6;
  ctx.direction = 'ltr'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,50,.85)'; ctx.strokeText('×' + n, sx, sy);
  ctx.fillStyle = '#fff3c0'; ctx.fillText('×' + n, sx, sy); ctx.direction = 'inherit';
}
function drawAim(){
  const d = G.aim; trace(d);
  const pts = TR.pts;
  for(let i = 0; i < pts.length; i += 3){
    const k = i / pts.length, after = pts[i + 2];
    const a = after ? 0.5 * (1 - k) + 0.1 : 0.95 - k * 0.5;
    blit(SPR.dot, pts[i], pts[i + 1], after ? 0.8 : 1.1 + 0.15 * Math.sin(G.time * 10 - i * 0.3), a);
  }
  if(TR.hit){ ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(SX(TR.hit.x), SY(TR.hit.y), BR * C, 0, TAU); ctx.stroke(); }
}
function drawTexts(){
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for(const t of G.texts){
    const k = t.life / t.max, born = 1 - k, sc = born < 0.15 ? 0.6 + born / 0.15 * 0.5 : 1.1 - Math.min(0.1, (born - 0.15));
    const px = Math.round(C * t.size * sc);
    ctx.font = '800 ' + px + 'px ' + FONT; ctx.globalAlpha = Math.min(1, k * 3);
    const x = SX(t.x), y = SY(t.y) - born * C * 0.6;
    ctx.direction = t.ltr ? 'ltr' : 'inherit';
    ctx.lineWidth = Math.max(4, px * 0.16); ctx.strokeStyle = 'rgba(40,20,100,.9)'; ctx.strokeText(t.t, x, y);
    ctx.fillStyle = t.col; ctx.fillText(t.t, x, y);
    if(t.sub){
      ctx.direction = 'ltr'; ctx.font = '800 ' + Math.round(px * 0.7) + 'px ' + FONT;
      ctx.strokeText(t.sub, x, y + px * 0.85); ctx.fillStyle = '#ffffff'; ctx.fillText(t.sub, x, y + px * 0.85);
    }
  }
  ctx.direction = 'inherit';
  ctx.globalAlpha = 1;
}
function drawHUD(){
  const cx = W / 2, y = SA.t + 34;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if(G.mode === 'lv'){
    const L = LEVELS[G.lv];
    ctx.font = '800 22px ' + FONT; ctx.fillStyle = '#fff3c0';
    ctx.fillText(T('مرحلة ', 'Level ', 'Bölüm ') + (G.lv + 1) + ' ' + L.emoji, cx, y - 2);
    const st = starsFor(G.turn + 1, L.par);
    ctx.font = '800 20px ' + FONT;
    for(let i = 0; i < 3; i++){ ctx.fillStyle = i < st ? '#ffcd4d' : 'rgba(255,255,255,.2)'; ctx.fillText('★', cx - 26 + i * 26, y + 26); }
    ctx.font = '700 13px ' + FONT; ctx.fillStyle = 'rgba(220,210,255,.8)';
    ctx.fillText(T('الدورة ', 'Turn ', 'Tur ') + (G.turn + 1), cx, y + 48);
  } else {
    ctx.font = '800 30px ' + FONT; ctx.fillStyle = '#fff3c0'; ctx.fillText(String(G.turn + 1), cx, y);
    ctx.font = '700 13px ' + FONT; ctx.fillStyle = 'rgba(220,210,255,.85)';
    ctx.fillText(T('الأحسن ', 'Best ', 'En iyi ') + Math.max(PROG.best, G.turn + 1), cx, y + 26);
  }
  // coins (top-left)
  const lx = SA.l + 18;
  ctx.textAlign = 'left'; blitScreen(SPR.coin, lx + 12, y, 0.95); ctx.font = '800 20px ' + FONT; ctx.fillStyle = '#ffe07a'; ctx.fillText(String(G.coins), lx + 30, y + 1);
  blitScreen(SPR.ball, lx + 12, y + 30, 1.6); ctx.fillStyle = '#efe8ff'; ctx.fillText(String(G.balls + G.gain), lx + 30, y + 31);
}
function blitScreen(c, x, y, sc){ const w = c.wu * C * sc, h = c.hu * C * sc; ctx.drawImage(c, x - w / 2, y - h / 2, w, h); }
function drawHint(){
  const show = (PROG.shots < 3 && G.turn === 0) || G.idle > 7;
  if(!show) return;
  const t = (G.time % 2.2) / 2.2, e = t < 0.7 ? t / 0.7 : 1;
  const x0 = SX(G.lx), y0 = SY(ROWS - 2.2), x1 = SX(clamp(G.lx + 1.6, 1, COLS - 1)), y1 = SY(ROWS - 7);
  const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e;
  ctx.globalAlpha = t < 0.85 ? 1 : (1 - (t - 0.85) / 0.15);
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.setLineDash([3, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SX(G.lx), SY(launchY())); ctx.lineTo(x, y); ctx.stroke(); ctx.setLineDash([]);
  ctx.font = Math.round(C * 0.9) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('👆', x + C * 0.1, y + C * 0.35);
  ctx.globalAlpha = 1;
  const msg = T('اسحب لتصوّب، واترك لتطلق', 'Drag to aim, let go to fire', 'Nişan için sürükle, bırak ve ateşle');
  ctx.font = '800 ' + Math.round(Math.max(15, C * 0.4)) + 'px ' + FONT;
  const w = ctx.measureText(msg).width + 28, by = SY(ROWS - 4.2);
  ctx.fillStyle = 'rgba(30,20,90,.88)'; rr(ctx, W / 2 - w / 2, by - 20, w, 40, 20); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, by + 1);
}

/* ---------- input ---------- */
let drag = null;
function toWorld(e){ return { x:(e.clientX - BX) / C, y:(e.clientY - BY) / C }; }
cv.addEventListener('pointerdown', e => {
  audioInit();
  if(G.state !== 'play' || G.phase !== 'aim') return;
  drag = e.pointerId; try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  const w = toWorld(e); G.aim = aimDir(w.x, w.y);
});
cv.addEventListener('pointermove', e => { if(drag !== e.pointerId) return; const w = toWorld(e); G.aim = aimDir(w.x, w.y); });
const up = e => { if(drag !== e.pointerId) return; drag = null; const d = G.aim; G.aim = null; if(d && G.state === 'play') fire(d); };
cv.addEventListener('pointerup', up);
cv.addEventListener('pointercancel', e => { if(drag === e.pointerId){ drag = null; G.aim = null; } });
document.addEventListener('visibilitychange', () => { if(document.hidden && G.state === 'play') pause(); });

/* ---------- buttons + screens ---------- */
function syncButtons(){
  const fly = G.state === 'play' && G.phase === 'fly';
  const bf = $('#btnFast'), brc = $('#btnRecall');
  if(bf.hidden === fly) bf.hidden = !fly;
  bf.classList.toggle('on', G.ff > 1); const fx = '×' + G.ff; if($('#fastX').textContent !== fx) $('#fastX').textContent = fx;
  const rc = fly && G.flyT >= RECALL_AFTER && !G.cleared;
  if(brc.hidden === rc) brc.hidden = !rc;
  $('#btnPause').hidden = G.state !== 'play';
}
function show(id){
  ['menu', 'map', 'pause', 'end'].forEach(n => { $('#' + n).hidden = n !== id; });
  syncButtons();
}
function toMenu(){
  G.state = 'menu'; startDemo(); show('menu'); refreshMenu();
}
function refreshMenu(){
  $('#lvInfo').textContent = '⭐ ' + totalStars() + ' / ' + LEVELS.length * 3;
  $('#enInfo').textContent = '🏆 ' + PROG.best;
}
function openMap(){
  G.state = 'map'; show('map'); buildMap();
  const cur = document.querySelector('.node.cur'); if(cur) cur.scrollIntoView({ block:'center' });
}
function buildMap(){
  const path = $('#mapPath'); path.innerHTML = '';
  const n = LEVELS.length, gapY = 96, top = 50, h = top + n * gapY + 40, u = unlocked();
  path.style.height = h + 'px';
  const pts = [];
  for(let i = 0; i < n; i++){
    const y = h - 50 - i * gapY;   // level 1 at the bottom, climbing up
    const x = 50 + Math.sin(i * 0.9) * 32;   // percent
    pts.push([x, y]);
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 ' + h); svg.setAttribute('preserveAspectRatio', 'none');
  let d = ''; pts.forEach((p, i) => { if(!i) d += 'M' + p[0] + ' ' + p[1]; else { const q = pts[i - 1], my = (q[1] + p[1]) / 2; d += ' C' + q[0] + ' ' + my + ' ' + p[0] + ' ' + my + ' ' + p[0] + ' ' + p[1]; } });
  svg.innerHTML = '<path d="' + d + '" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="10" vector-effect="non-scaling-stroke" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="rgba(255,224,122,.7)" stroke-width="3" stroke-dasharray="2 12" vector-effect="non-scaling-stroke" stroke-linecap="round"/>';
  path.appendChild(svg);
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button'), st = PROG.stars[i] || 0, lock = i > u, col = PAL[(i * 3) % PAL.length];
    b.className = 'node' + (lock ? ' lock' : '') + (i === u ? ' cur' : '');
    b.style.left = pts[i][0] + '%'; b.style.top = pts[i][1] + 'px';
    if(!lock) b.style.setProperty('--c1', shade(col, 0.35)); if(!lock){ b.style.setProperty('--c2', shade(col, -0.25)); b.style.setProperty('--gl', rgba(col, 0.6)); }
    b.dataset.lv = i;
    b.innerHTML = (lock ? '🔒' : String(i + 1)) + '<span class="st">' + [0, 1, 2].map(k => k < st ? '<i>★</i>' : '★').join('') + '</span>' + (i % 5 === 2 && !lock ? '<span class="em">' + L.emoji + '</span>' : '');
    b.setAttribute('aria-label', T('مرحلة ', 'Level ', 'Bölüm ') + (i + 1));
    b.onclick = () => { if(lock){ toast(T('خلّص المرحلة اللي قبلها أول 🔒', 'Finish the level before it first 🔒', 'Önce bir önceki bölümü bitir 🔒')); sfx('click'); return; } startLevel(i); };
    path.appendChild(b);
  });
  $('#mapStars').textContent = '⭐ ' + totalStars() + ' / ' + n * 3;
}
let toastT = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2200); }
function pause(){
  if(G.state !== 'play') return; G.state = 'pause'; drag = null; G.aim = null;
  $('#pauseInfo').textContent = G.mode === 'lv' ? T('مرحلة ', 'Level ', 'Bölüm ') + (G.lv + 1) + '  •  ' + T('الدورة ', 'Turn ', 'Tur ') + (G.turn + 1) : T('بلا نهاية', 'Endless', 'Sonsuz') + '  •  ' + (G.turn + 1);
  $('#btnPauseMap').hidden = G.mode !== 'lv';
  show('pause');
}
function resume(){ if(G.state !== 'pause') return; G.state = 'play'; show(null); sfx('click'); }
function restart(){ if(G.mode === 'en') startEndless(); else startLevel(G.lv); }
function goBack(){
  if(G.state === 'menu') location.href = '../';
  else if(G.state === 'map') toMenu();
  else if(G.state === 'pause') resume();
  else toMenu();
}
$('#btnLevels').onclick = () => { audioInit(); sfx('click'); openMap(); };
$('#btnEndless').onclick = () => { audioInit(); startEndless(); };
$('#btnPause').onclick = () => { sfx('click'); pause(); };
$('#btnResume').onclick = resume;
$('#btnRestart').onclick = restart;
$('#btnPauseMap').onclick = () => openMap();
$('#btnMute').onclick = () => { audioInit(); setMute(!SND.muted); sfx('click'); };
$('#btnFast').onclick = () => { G.ff = G.ff >= 3 ? 1 : G.ff + 1; G.ffKeep = G.ff > 1; sfx('click'); syncButtons(); };
$('#btnRecall').onclick = () => recall();
$('#btnNext').onclick = () => { if(G.mode === 'lv') startLevel(G.lv + 1); else startEndless(); };
$('#btnAgain').onclick = () => restart();
$('#btnEndMap').onclick = () => openMap();
$('#btnMenu').onclick = () => toMenu();
['btnFast', 'btnRecall', 'btnPause', 'btnMute'].forEach(id => $('#' + id).addEventListener('pointerdown', e => e.stopPropagation()));

/* ---------- loop ---------- */
let last = performance.now();
function frame(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  try{ update(dt); draw(); }catch(e){ console.error(e); }
  requestAnimationFrame(frame);
}
addEventListener('resize', resize);
resize(); setMute(SND.muted);
toMenu();
if(Q.get('lv')) startLevel((+Q.get('lv') || 1) - 1);
else if(Q.get('mode') === 'endless') startEndless();
requestAnimationFrame(frame);

/* test / debug hooks (no UI) */
window.__balls = {
  get state(){ return G.state; }, G, LEVELS, PROG, COLS, ROWS,
  startLevel, startEndless, toMenu, openMap, pause, resume, recall, back:goBack,
  fireDeg(deg){ const a = -deg * Math.PI / 180; return fire({ x:Math.cos(a), y:Math.sin(a) }); },
  aimAt(c, r){ return aimDir(c, r); },
  screenOf(x, y){ return { x:SX(x), y:SY(y) }; },
  live(){ return G.bricks.filter(b => !b.dead).length; },
  hpSum(){ return G.bricks.reduce((s, b) => s + (b.dead ? 0 : b.hp), 0); },
  killAll(){ G.bricks.forEach(b => { if(!b.dead) popBrick(b); }); },
  give(t, c, r){ const p = addPick(c, r, t); rebuildGrid(); return p.id; },
  clearBoard(){ G.bricks = []; G.picks = []; rebuildGrid(); },
  brick(c, r, hp, sh){ addBrick(c, r, hp, sh || 0); rebuildGrid(); },
  /* run one whole turn synchronously (calibration / fast tests) */
  simTurn(deg){
    if(!this.fireDeg(deg)) return false;
    for(let i = 0; i < 240 * 60 && G.phase === 'fly'; i++){
      physStep(STEP); G.flyT += STEP;
      if(G.cleared){ G.clearT -= STEP; if(G.clearT <= 0) recall(); }
      if(G.flyT > 30) recall();
      if(!G.arr.length && !G.queue) endTurn();
    }
    return true;
  },
  trace(deg){ const a = -deg * Math.PI / 180; trace({ x:Math.cos(a), y:Math.sin(a) }); return { n:TR.pts.length / 3, hit:TR.hit }; }
};
})();
