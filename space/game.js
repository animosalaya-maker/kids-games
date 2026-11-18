/* Bobo Space («فضاء بوبو»): portrait fixed-formation shooter, 2D canvas, everything drawn in code.
   States: menu → play ⇄ pause → over/win. 15 waves, a boss every 5th wave. Test params: ?wave=N (start wave).
   Online co-op («👫 العب مع أصحابك», 2–4 players, see the "Online" section near the end): the room owner (host) runs the aliens,
   waves, boss, enemy shots, pickups and the team score; every phone flies its own rocket and claims its own hits. */
(function(){
'use strict';
const $ = s => document.querySelector(s);
const cv = $('#cv'), ctx = cv.getContext('2d');
const Q = new URLSearchParams(location.search);
const T = (a, e, t) => (window.L ? window.L(a, e, t) : a);
const store = {
  get(k, d){ try{ const v = localStorage.getItem('space_' + k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem('space_' + k, JSON.stringify(v)); }catch(e){} }
};
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t, TAU = Math.PI * 2;
const FONT = '"Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif';
const COIN_CAP = 60;
const MATE_COLS = ['#7dffb0', '#ff9ad5', '#ffc46b', '#b9a2ff'];   // friends' shots and name labels (by room slot)
const WAVES_TOTAL = 15;

/* ---------- pilots (head crops of the owner's characters: centre + radius in image pixels) ---------- */
const PILOTS = [
  { id:'me', iw:232, cx:116, cy:126, r:74, col:'#ff8fc8', name:T('شخصيتي', 'Me', 'Ben') },
  { id:'sara', iw:232, cx:98, cy:100, r:78, col:'#9c7be3', name:T('سارة', 'Sara', 'Sara') },
  { id:'sidra', iw:210, cx:88, cy:118, r:74, col:'#1fa6a9', name:T('سيدرة', 'Sidra', 'Sidra') },
  { id:'qamar', iw:240, cx:122, cy:118, r:84, col:'#f5c518', name:T('قمر', 'Qamar', 'Kamer') },
  { id:'samir', iw:215, cx:112, cy:112, r:84, col:'#3a74d8', name:T('سمير', 'Samir', 'Semir') },
  { id:'mushakis', iw:360, cx:196, cy:140, r:106, col:'#f2983a', name:T('مشاكس', 'Mushakis', 'Muşakis') },
  { id:'zaqzouq', iw:315, cx:156, cy:128, r:110, col:'#8e93a3', name:T('زقزوق', 'Zaqzouq', 'Zakzuk') },
  { id:'laila', iw:258, cx:130, cy:110, r:80, col:'#2b3a7a', name:T('العمة ليلى', 'Aunt Laila', 'Leyla Teyze') }
];
const IMGS = {};
PILOTS.forEach(p => { const im = new Image(); im.onload = () => { if(SPR.ships) delete SPR.ships[p.id]; if(G.pilot === p.id) buildShip(); }; im.src = '../worlds/chars/' + p.id + '.png'; IMGS[p.id] = im; });

/* ---------- aliens ---------- */
const TYPES = {
  b:{ shape:'blob', hp:1, r:17, col:'#5fe08a', dark:'#23945a', pts:100 },
  g:{ shape:'bug', hp:1, r:16, col:'#ff7aa8', dark:'#c33d70', pts:150 },
  p:{ shape:'puff', hp:2, r:17, col:'#6cc0ff', dark:'#2e74c4', pts:200 },
  s:{ shape:'squid', hp:2, r:17, col:'#b892ff', dark:'#7348d0', pts:250 },
  z:{ shape:'zip', hp:1, r:14, col:'#ffd84d', dark:'#cf8f0c', pts:200 },
  k:{ shape:'king', hp:3, r:19, col:'#ff9f4a', dark:'#cc5a18', pts:400 }
};
const BOSSES = [
  { shape:'blob', r:56, col:'#45d6c8', dark:'#1a8a94', hp:70, name:T('الزعيم جِلّو', 'Boss Jello', 'Patron Jöle') },
  { shape:'puff', r:56, col:'#c08cff', dark:'#6c3fc9', hp:110, name:T('الملكة نفّوشة', 'Queen Fluffa', 'Kraliçe Pofuduk') },
  { shape:'king', r:60, col:'#ff8a4a', dark:'#c2471c', hp:150, name:T('الكابتن زعلان', 'Captain Grumpy', 'Kaptan Huysuz') }
];
/* rows top (back) to bottom (front), 8 columns; '.' = empty */
const WAVES = [
  { rows:['.bbbbbb.', '.bbbbbb.'] },
  { rows:['..gggg..', '.bbbbbb.', '.bbbbbb.'] },
  { rows:['p..pp..p', '.gg..gg.', '..bbbb..', '...bb...'] },
  { rows:['...kk...', '..pppp..', '.gggggg.', '..bbbb..', '...bb...'] },
  { boss:0, rows:['.z....z.', '..b..b..'] },
  { rows:['ssssssss', 'gggggggg', '.bbbbbb.'] },
  { rows:['kk....kk', 'pp.zz.pp', 'ss.bb.ss', 'gg....gg'], dive:1.3 },
  { rows:['zzzzzzzz', '.zzzzzz.', '..pppp..'], dive:1.7 },
  { rows:['.kkkkkk.', 'pppppppp', 'ssssssss', 'gggggggg'] },
  { boss:1, rows:['p.s..s.p', '.g.gg.g.'] },
  { rows:['kpskkspk', 'zgzggzgz', 'bbbbbbbb', 'ss....ss'] },
  { rows:['z.z.z.z.', '.k.k.k.k', 'pppppppp', '.s.s.s.s'], dive:1.3 },
  { rows:['kkkkkkkk', 'ssssssss', 'pppppppp'] },
  { rows:['zzzzzzzz', 'kgkgkgkg', 'pspspsps', 'bbbbbbbb'], dive:1.4 },
  { boss:2, rows:['k.z..z.k', '.p.ss.p.'] }
];
const PICK = {
  power:{ col:'#ff9a3c', dark:'#d0581a' }, shield:{ col:'#4fc3ff', dark:'#1f74c8' }, magnet:{ col:'#ff5a7a', dark:'#bf2747' },
  slow:{ col:'#a682ff', dark:'#6340c8' }, heart:{ col:'#ff7ac0', dark:'#c4407f' }
};

/* ---------- size ---------- */
let W = 0, H = 0, DPR = 1, PW = 0, OX = 0, S = 1, SA = { t:0, b:0, l:0, r:0 };
function readSA(){ try{ const cs = getComputedStyle($('#sa')); SA = { t:parseFloat(cs.paddingTop) || 0, r:parseFloat(cs.paddingRight) || 0, b:parseFloat(cs.paddingBottom) || 0, l:parseFloat(cs.paddingLeft) || 0 }; }catch(e){} }
function resize(){
  W = innerWidth; H = innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  PW = Math.min(W, H * 0.68); OX = (W - PW) / 2; S = clamp(PW / 390, 0.72, 1.7);
  readSA(); buildSprites(); buildBG();
  if(G.p){ G.p.x = clamp(G.p.x, OX + 20 * S, OX + PW - 20 * S); G.p.y = clamp(G.p.y, H * 0.45, H - SA.b - 40 * S); G.p.tx = G.p.x; G.p.ty = G.p.y; }
}
const topY = () => SA.t + 112 * S;

/* ---------- small colour helpers ---------- */
function mix(a, b, t){
  const p = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const A = p(a), B = p(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
}
function mk(w, h, draw){
  const c = document.createElement('canvas'), k = S * DPR;
  c.width = Math.max(1, Math.ceil(w * k)); c.height = Math.max(1, Math.ceil(h * k));
  const g = c.getContext('2d'); g.scale(k, k); g.translate(w / 2, h / 2); g.lineCap = 'round'; g.lineJoin = 'round'; draw(g);
  c.dw = w; c.dh = h; return c;
}
function blit(c, x, y, sc, rot, alpha){
  sc = sc || 1; const w = c.dw * S * sc, h = c.dh * S * sc;
  if(alpha != null) ctx.globalAlpha = alpha;
  if(rot){ ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore(); }
  else ctx.drawImage(c, x - w / 2, y - h / 2, w, h);
  if(alpha != null) ctx.globalAlpha = 1;
}
function whiten(src){
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; c.dw = src.dw; c.dh = src.dh;
  const g = c.getContext('2d'); g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); return c;
}
function starPath(g, x, y, R, r, n){
  n = n || 5; g.beginPath();
  for(let i = 0; i < n * 2; i++){ const a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}
function heartPath(g, x, y, s){
  g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.25, y + s * 0.05, x - s * 0.75, y - s * 0.95, x, y - s * 0.35);
  g.bezierCurveTo(x + s * 0.75, y - s * 0.95, x + s * 1.25, y + s * 0.05, x, y + s * 0.9); g.closePath();
}

/* ---------- alien drawing (design units, centred) ---------- */
function bodyGrad(g, r, col, dark){
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.45, r * 0.1, 0, 0, r * 1.15);
  gr.addColorStop(0, mix(col, '#ffffff', 0.55)); gr.addColorStop(0.45, col); gr.addColorStop(1, dark); return gr;
}
function face(g, r, blink, dy, opts){
  opts = opts || {}; dy = dy || 0;
  const ex = r * 0.36, ey = dy - r * 0.04;
  // cheeks
  g.fillStyle = 'rgba(255,120,160,.45)';
  g.beginPath(); g.ellipse(-r * 0.6, ey + r * 0.32, r * 0.17, r * 0.11, 0, 0, TAU); g.ellipse(r * 0.6, ey + r * 0.32, r * 0.17, r * 0.11, 0, 0, TAU); g.fill();
  if(blink){
    g.strokeStyle = '#2a1640'; g.lineWidth = r * 0.1;
    [-1, 1].forEach(s => { g.beginPath(); g.arc(s * ex, ey + r * 0.02, r * 0.17, 0.2, Math.PI - 0.2); g.stroke(); });
  } else {
    [-1, 1].forEach(s => {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * ex, ey, r * 0.25, r * 0.29, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(42,22,64,.35)'; g.lineWidth = r * 0.04; g.stroke();
      g.fillStyle = '#2a1640'; g.beginPath(); g.arc(s * ex - s * r * 0.03, ey + r * 0.07, r * 0.15, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - s * r * 0.08, ey + r * 0.01, r * 0.055, 0, TAU); g.fill();
    });
  }
  // grumpy eyebrows (inner ends lower)
  g.strokeStyle = '#2a1640'; g.lineWidth = r * 0.11;
  [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.64, ey - r * 0.4); g.lineTo(s * r * 0.14, ey - r * 0.25); g.stroke(); });
  if(opts.stache){
    g.fillStyle = '#5a2a12';
    [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.17, ey + r * 0.42, r * 0.2, r * 0.09, s * -0.35, 0, TAU); g.fill(); });
  }
  // pouty frown
  g.strokeStyle = '#2a1640'; g.lineWidth = r * 0.08;
  g.beginPath(); g.arc(0, ey + r * 0.62, r * 0.15, Math.PI + 0.55, TAU - 0.55); g.stroke();
}
function shine(g, r){
  g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.ellipse(-r * 0.42, -r * 0.55, r * 0.22, r * 0.12, -0.6, 0, TAU); g.fill();
}
function crown(g, r, y){
  const w = r * 0.62, h = r * 0.42;
  g.fillStyle = '#ffd34a'; g.strokeStyle = '#b27712'; g.lineWidth = r * 0.06;
  g.beginPath(); g.moveTo(-w, y); g.lineTo(-w, y - h); g.lineTo(-w * 0.5, y - h * 0.5); g.lineTo(0, y - h * 1.15); g.lineTo(w * 0.5, y - h * 0.5); g.lineTo(w, y - h); g.lineTo(w, y); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#ff4f8b'; g.beginPath(); g.arc(0, y - h * 0.35, r * 0.08, 0, TAU); g.fill();
  g.fillStyle = '#4fd9ff'; g.beginPath(); g.arc(-w * 0.55, y - h * 0.25, r * 0.06, 0, TAU); g.arc(w * 0.55, y - h * 0.25, r * 0.06, 0, TAU); g.fill();
}
function drawAlien(g, shape, r, col, dark, frame, boss){
  g.lineWidth = r * 0.07; g.strokeStyle = mix(dark, '#000000', 0.25);
  if(shape === 'blob'){
    g.fillStyle = bodyGrad(g, r, col, dark);
    const b = frame ? 0.06 : 0;
    g.beginPath(); g.moveTo(-r * 0.95, r * 0.5);
    g.bezierCurveTo(-r * (1.05 + b), -r * 1.15, r * (1.05 + b), -r * 1.15, r * 0.95, r * 0.5);
    g.quadraticCurveTo(r * 0.66, r * (frame ? 0.82 : 0.98), r * 0.32, r * 0.62);
    g.quadraticCurveTo(0, r * (frame ? 0.98 : 0.82), -r * 0.32, r * 0.62);
    g.quadraticCurveTo(-r * 0.66, r * (frame ? 0.82 : 0.98), -r * 0.95, r * 0.5);
    g.closePath(); g.fill(); g.stroke(); shine(g, r);
    if(boss) crown(g, r, -r * 0.7);
    face(g, r, frame === 2, 0);
  } else if(shape === 'bug'){
    g.fillStyle = 'rgba(220,240,255,.6)'; g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = r * 0.05;
    const wa = frame ? 0.25 : 0.55;
    [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * r * 0.85, -r * 0.3, r * 0.52, r * 0.3, s * -wa, 0, TAU); g.fill(); g.stroke(); });
    g.strokeStyle = mix(dark, '#000000', 0.25); g.lineWidth = r * 0.08;
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.28, -r * 0.7); g.quadraticCurveTo(s * r * 0.35, -r * 1.2, s * r * 0.62, -r * 1.25); g.stroke(); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(s * r * 0.64, -r * 1.25, r * 0.16, 0, TAU); g.fill(); });
    g.fillStyle = bodyGrad(g, r, col, dark); g.strokeStyle = mix(dark, '#000000', 0.25); g.lineWidth = r * 0.07;
    g.beginPath(); g.ellipse(0, 0, r * 0.92, r * 0.86, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = 'rgba(120,20,60,.28)'; g.beginPath(); g.arc(-r * 0.62, r * 0.38, r * 0.12, 0, TAU); g.arc(r * 0.62, r * 0.38, r * 0.12, 0, TAU); g.arc(0, r * 0.66, r * 0.1, 0, TAU); g.fill();
    shine(g, r); face(g, r, frame === 2, -r * 0.05);
  } else if(shape === 'puff'){
    g.fillStyle = dark;
    for(let i = 0; i < 10; i++){ const a = i / 10 * TAU + (frame ? 0.15 : 0); g.beginPath(); g.arc(Math.cos(a) * r * 0.72, Math.sin(a) * r * 0.72, r * 0.36, 0, TAU); g.fill(); }
    g.fillStyle = col;
    for(let i = 0; i < 10; i++){ const a = i / 10 * TAU + (frame ? 0.15 : 0); g.beginPath(); g.arc(Math.cos(a) * r * 0.66, Math.sin(a) * r * 0.66, r * 0.32, 0, TAU); g.fill(); }
    g.fillStyle = bodyGrad(g, r * 0.95, col, mix(col, dark, 0.5)); g.beginPath(); g.arc(0, 0, r * 0.82, 0, TAU); g.fill();
    if(boss){
      g.strokeStyle = mix(dark, '#000000', 0.2); g.lineWidth = r * 0.06;
      [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.3, -r * 0.85); g.quadraticCurveTo(s * r * 0.4, -r * 1.3, s * r * 0.7, -r * 1.35); g.stroke(); g.fillStyle = '#ffe14d'; starPath(g, s * r * 0.72, -r * 1.36, r * 0.2, r * 0.09); g.fill(); });
    }
    shine(g, r); face(g, r, frame === 2, 0);
  } else if(shape === 'squid'){
    g.strokeStyle = dark; g.lineWidth = r * 0.3;
    for(let i = 0; i < 4; i++){
      const x = -r * 0.55 + i * r * 0.37, w = (frame ? -1 : 1) * (i % 2 ? 1 : -1) * r * 0.2;
      g.beginPath(); g.moveTo(x, r * 0.25); g.quadraticCurveTo(x + w, r * 0.75, x - w * 0.5, r * 1.12); g.stroke();
    }
    g.strokeStyle = col; g.lineWidth = r * 0.16;
    for(let i = 0; i < 4; i++){
      const x = -r * 0.55 + i * r * 0.37, w = (frame ? -1 : 1) * (i % 2 ? 1 : -1) * r * 0.2;
      g.beginPath(); g.moveTo(x, r * 0.25); g.quadraticCurveTo(x + w, r * 0.75, x - w * 0.5, r * 1.1); g.stroke();
    }
    g.fillStyle = bodyGrad(g, r, col, dark); g.strokeStyle = mix(dark, '#000000', 0.25); g.lineWidth = r * 0.07;
    g.beginPath(); g.moveTo(-r * 0.92, r * 0.42); g.bezierCurveTo(-r * 1.05, -r * 1.25, r * 1.05, -r * 1.25, r * 0.92, r * 0.42); g.quadraticCurveTo(0, r * 0.62, -r * 0.92, r * 0.42); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.arc(-r * 0.55, -r * 0.3, r * 0.1, 0, TAU); g.arc(r * 0.6, -r * 0.45, r * 0.08, 0, TAU); g.arc(r * 0.1, -r * 0.75, r * 0.07, 0, TAU); g.fill();
    shine(g, r); face(g, r, frame === 2, -r * 0.08);
  } else if(shape === 'zip'){
    g.fillStyle = dark;
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * r * 0.6, -r * 0.2); g.lineTo(s * r * (frame ? 1.35 : 1.25), r * (frame ? 0.15 : 0.35)); g.lineTo(s * r * 0.6, r * 0.5); g.closePath(); g.fill(); });
    g.fillStyle = '#ff8a3d'; g.beginPath(); g.moveTo(-r * 0.25, -r * 0.7); g.lineTo(0, -r * 1.3); g.lineTo(r * 0.25, -r * 0.7); g.closePath(); g.fill();
    g.fillStyle = bodyGrad(g, r, col, dark); g.strokeStyle = mix(dark, '#000000', 0.25);
    g.beginPath(); g.arc(0, 0, r * 0.85, 0, TAU); g.fill(); g.stroke();
    shine(g, r); face(g, r, frame === 2, 0);
  } else if(shape === 'king'){
    g.fillStyle = mix(dark, '#7a1d4a', 0.4);
    g.beginPath(); g.moveTo(-r * 0.7, -r * 0.1); g.quadraticCurveTo(-r * 1.25, r * 0.7, -r * 0.8, r * 1.05); g.lineTo(r * 0.8, r * 1.05); g.quadraticCurveTo(r * 1.25, r * 0.7, r * 0.7, -r * 0.1); g.closePath(); g.fill();
    g.fillStyle = bodyGrad(g, r, col, dark); g.strokeStyle = mix(dark, '#000000', 0.25);
    g.beginPath(); g.arc(0, r * 0.05, r * 0.9, 0, TAU); g.fill(); g.stroke();
    shine(g, r); crown(g, r, -r * 0.62 + (frame ? -r * 0.04 : 0));
    face(g, r, frame === 2, r * 0.08, { stache:true });
  }
}

/* ---------- sprites ---------- */
const SPR = {};
function alienSprites(shape, r, col, dark, boss){
  const sz = r * 3; const o = {};
  o.f = [0, 1, 2].map(fr => mk(sz, sz, g => drawAlien(g, shape, r, col, dark, fr, boss)));
  o.w = whiten(o.f[0]); return o;
}
function glowDot(r, halo, core, mid, edge){
  return mk(halo * 2, halo * 2, g => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, halo);
    gr.addColorStop(0, core); gr.addColorStop(r / halo * 0.6, core); gr.addColorStop(r / halo, mid); gr.addColorStop(1, edge);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, halo, 0, TAU); g.fill();
  });
}
function buildSprites(){
  SPR.al = {}; for(const k in TYPES){ const t = TYPES[k]; SPR.al[k] = alienSprites(t.shape, t.r, t.col, t.dark, false); }
  SPR.boss = BOSSES.map(b => alienSprites(b.shape, b.r, b.col, b.dark, true));
  SPR.bullet = mk(22, 30, g => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 13); gr.addColorStop(0, 'rgba(140,240,255,.7)'); gr.addColorStop(1, 'rgba(140,240,255,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 2, 11, 15, 0, 0, TAU); g.fill();
    const b = g.createRadialGradient(-2, -3, 0.5, 0, 0, 6.5); b.addColorStop(0, '#ffffff'); b.addColorStop(0.5, '#bff6ff'); b.addColorStop(1, '#55d8ff');
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -2.5, 1.7, 0, TAU); g.fill();
  });
  SPR.bullet2 = mk(22, 30, g => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 13); gr.addColorStop(0, 'rgba(255,240,140,.75)'); gr.addColorStop(1, 'rgba(255,240,140,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 2, 11, 15, 0, 0, TAU); g.fill();
    g.fillStyle = '#fff6b0'; starPath(g, 0, 0, 7.5, 3.4); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill();
  });
  SPR.bulletT = MATE_COLS.map(c => mk(22, 30, g => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 13); gr.addColorStop(0, mix(c, '#ffffff', 0.2).replace('rgb', 'rgba').replace(')', ',.7)')); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(0, 2, 11, 15, 0, 0, TAU); g.fill();
    const b = g.createRadialGradient(-2, -3, 0.5, 0, 0, 6.5); b.addColorStop(0, '#ffffff'); b.addColorStop(0.5, mix(c, '#ffffff', 0.55)); b.addColorStop(1, c);
    g.fillStyle = b; g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-2, -2.5, 1.7, 0, TAU); g.fill();
  }));
  SPR.eshot = mk(34, 34, g => {
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, 17); gr.addColorStop(0, 'rgba(255,90,160,.9)'); gr.addColorStop(0.45, 'rgba(255,90,160,.45)'); gr.addColorStop(1, 'rgba(255,90,160,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 17, 0, TAU); g.fill();
    const c = g.createRadialGradient(-1.5, -1.5, 0, 0, 0, 7); c.addColorStop(0, '#ffffff'); c.addColorStop(0.55, '#ffd0e6'); c.addColorStop(1, '#ff4f9a');
    g.fillStyle = c; g.beginPath(); g.arc(0, 0, 7, 0, TAU); g.fill();
  });
  SPR.coin = mk(24, 24, g => {
    const gr = g.createRadialGradient(-3, -3, 1, 0, 0, 10); gr.addColorStop(0, '#fff6c0'); gr.addColorStop(0.5, '#ffd23f'); gr.addColorStop(1, '#d48a0c');
    g.fillStyle = gr; g.strokeStyle = '#a8650a'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 9.5, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#fff2a8'; starPath(g, 0, 0.3, 5, 2.2); g.fill();
  });
  SPR.star = {}; ['#ffffff', '#ffd84d', '#5fe08a', '#ff7aa8', '#6cc0ff', '#b892ff', '#ff9f4a', '#45d6c8', '#c08cff', '#ff8a4a'].forEach(c => {
    SPR.star[c] = mk(20, 20, g => {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 10); gr.addColorStop(0, c === '#ffffff' ? 'rgba(255,255,255,.6)' : mix(c, '#ffffff', 0.3).replace('rgb', 'rgba').replace(')', ',.55)')); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 10, 0, TAU); g.fill();
      g.fillStyle = mix(c, '#ffffff', 0.35); starPath(g, 0, 0, 6.5, 2.8); g.fill();
    });
  });
  SPR.pick = {}; for(const k in PICK) SPR.pick[k] = mk(44, 44, g => drawPick(g, k));
  SPR.heart = mk(24, 22, g => { heartPath(g, 0, 0, 9.5); g.fillStyle = '#ff4f7f'; g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(-4, -3, 2.4, 1.6, -0.6, 0, TAU); g.fill(); });
  SPR.heartE = mk(24, 22, g => { heartPath(g, 0, 0, 9.5); g.fillStyle = 'rgba(255,255,255,.12)'; g.fill(); g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 2; g.stroke(); });
  buildShip();
}
function drawPick(g, k){
  const P = PICK[k];
  const halo = g.createRadialGradient(0, 0, 10, 0, 0, 22); halo.addColorStop(0, P.col); halo.addColorStop(1, 'rgba(255,255,255,0)');
  g.globalAlpha = 0.55; g.fillStyle = halo; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.globalAlpha = 1;
  const b = g.createRadialGradient(-5, -6, 2, 0, 0, 16); b.addColorStop(0, mix(P.col, '#ffffff', 0.6)); b.addColorStop(0.6, P.col); b.addColorStop(1, P.dark);
  g.fillStyle = b; g.beginPath(); g.arc(0, 0, 15.5, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.2; g.stroke();
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 3;
  if(k === 'power'){ g.beginPath(); g.moveTo(0, -10); g.lineTo(8, -1); g.lineTo(3.5, -1); g.lineTo(3.5, 8); g.lineTo(-3.5, 8); g.lineTo(-3.5, -1); g.lineTo(-8, -1); g.closePath(); g.fill(); }
  else if(k === 'shield'){ g.beginPath(); g.moveTo(0, -8); g.lineTo(7, -5); g.quadraticCurveTo(7, 5, 0, 9); g.quadraticCurveTo(-7, 5, -7, -5); g.closePath(); g.fill(); g.fillStyle = P.col; g.beginPath(); g.arc(0, 0, 2.6, 0, TAU); g.fill(); }
  else if(k === 'magnet'){ g.lineWidth = 4.2; g.beginPath(); g.arc(0, -1, 6, Math.PI, 0, true); g.moveTo(-6, -1); g.lineTo(-6, -7); g.moveTo(6, -1); g.lineTo(6, -7); g.stroke(); g.strokeStyle = P.dark; g.lineWidth = 4.4; g.beginPath(); g.moveTo(-6, -6); g.lineTo(-6, -8.5); g.moveTo(6, -6); g.lineTo(6, -8.5); g.stroke(); }
  else if(k === 'slow'){ g.lineWidth = 2.4; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.stroke(); g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 0); g.lineTo(4, 2.5); g.stroke(); }
  else if(k === 'heart'){ heartPath(g, 0, 0.5, 7.5); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(-7, -8, 4, 2.2, -0.7, 0, TAU); g.fill();
}
function buildShip(){
  if(!SPR.al) return;
  SPR.ships = {}; SPR.ship = makeShip(G.pilot); SPR.shipW = whiten(SPR.ship);
}
/* a friend's rocket with their own pilot in the window (cached) */
function shipFor(id){ if(!SPR.ships) SPR.ships = {}; return SPR.ships[id] || (SPR.ships[id] = makeShip(id)); }
function makeShip(pid){
  const P = PILOTS.find(p => p.id === pid) || PILOTS[1], im = IMGS[P.id];
  return mk(64, 76, g => {
    const c2 = P.col;
    // fins
    g.fillStyle = mix(c2, '#000000', 0.15); g.strokeStyle = '#2a1a55'; g.lineWidth = 2.2;
    [-1, 1].forEach(s => { g.beginPath(); g.moveTo(s * 11, 4); g.quadraticCurveTo(s * 28, 10, s * 27, 30); g.quadraticCurveTo(s * 20, 26, s * 10, 24); g.closePath(); g.fill(); g.stroke(); });
    // body
    const bg = g.createLinearGradient(-16, 0, 16, 0); bg.addColorStop(0, '#d9d4f5'); bg.addColorStop(0.35, '#ffffff'); bg.addColorStop(1, '#b7aee6');
    g.fillStyle = bg; g.beginPath(); g.moveTo(0, -36); g.bezierCurveTo(17, -26, 18, 6, 13, 28); g.lineTo(-13, 28); g.bezierCurveTo(-18, 6, -17, -26, 0, -36); g.closePath(); g.fill(); g.stroke();
    // nose cap + stripe
    g.save(); g.clip();
    g.fillStyle = '#ff5f8f'; g.fillRect(-20, -40, 40, 13);
    g.fillStyle = c2; g.fillRect(-20, 17, 40, 6);
    g.restore();
    g.beginPath(); g.moveTo(0, -36); g.bezierCurveTo(17, -26, 18, 6, 13, 28); g.lineTo(-13, 28); g.bezierCurveTo(-18, 6, -17, -26, 0, -36); g.closePath(); g.stroke();
    // nozzle
    g.fillStyle = '#6b62a8'; g.beginPath(); g.moveTo(-9, 28); g.lineTo(9, 28); g.lineTo(7, 34); g.lineTo(-7, 34); g.closePath(); g.fill(); g.stroke();
    // cockpit with the pilot
    const cy = -6, cr = 13.5;
    g.fillStyle = '#2a1a55'; g.beginPath(); g.arc(0, cy, cr + 2.6, 0, TAU); g.fill();
    const glass = g.createRadialGradient(-3, cy - 4, 1, 0, cy, cr); glass.addColorStop(0, '#bfe9ff'); glass.addColorStop(1, '#4a7fd6');
    g.fillStyle = glass; g.beginPath(); g.arc(0, cy, cr, 0, TAU); g.fill();
    if(im && im.complete && im.naturalWidth){
      g.save(); g.beginPath(); g.arc(0, cy, cr, 0, TAU); g.clip();
      const k = (cr * 2.1) / (P.r * 2); g.drawImage(im, -P.cx * k, cy - P.cy * k + 1.5, im.naturalWidth * k, im.naturalHeight * k); g.restore();
    }
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.ellipse(-5, cy - 6, 5, 2.6, -0.6, 0, TAU); g.fill();
    g.strokeStyle = '#ffd34a'; g.lineWidth = 2; g.beginPath(); g.arc(0, cy, cr + 1.2, 0, TAU); g.stroke();
    // rivets
    g.fillStyle = '#8d84c9'; [[-9, 12], [9, 12]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); });
  });
}

/* ---------- background (gradient + nebula + planets + starfield) ---------- */
let BG = null;
function buildBG(){
  const nh = Math.ceil(H * 1.2), sc = 0.5;
  const c = document.createElement('canvas'); c.width = Math.ceil(W * sc); c.height = Math.ceil(nh * sc);
  const g = c.getContext('2d'); g.scale(sc, sc);
  const blobs = [['rgba(150,70,255,', 0.32], ['rgba(40,180,255,', 0.2], ['rgba(255,80,170,', 0.22], ['rgba(70,230,200,', 0.14], ['rgba(150,70,255,', 0.25]];
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 9; i++){
    const [col, a] = blobs[i % blobs.length], x = r() * W, y = r() * nh, R = (0.35 + r() * 0.45) * Math.max(W, 380);
    for(const dy of [-nh, 0, nh]){
      const gr = g.createRadialGradient(x, y + dy, 0, x, y + dy, R); gr.addColorStop(0, col + a + ')'); gr.addColorStop(0.5, col + (a * 0.4) + ')'); gr.addColorStop(1, col + '0)');
      g.fillStyle = gr; g.fillRect(x - R, y + dy - R, R * 2, R * 2);
    }
  }
  const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0a0726'); sky.addColorStop(0.55, '#170f45'); sky.addColorStop(1, '#2a165a');
  const stars = []; const n = Math.round(clamp(W * H / 3200, 70, 200));
  for(let i = 0; i < n; i++) stars.push({ x:Math.random() * W, y:Math.random() * H, z:Math.random() < 0.6 ? rnd(0.25, 0.5) : rnd(0.6, 1), tw:rnd(0, TAU), c:Math.random() < 0.15 ? (Math.random() < 0.5 ? '#ffe7a8' : '#a8d8ff') : '#ffffff' });
  const planet = (R, a, b, ring, craters) => mk(R * 3.4, R * 3.4, g => {
    if(ring){ g.save(); g.rotate(-0.35); g.strokeStyle = 'rgba(255,220,170,.55)'; g.lineWidth = R * 0.22; g.beginPath(); g.ellipse(0, 0, R * 1.6, R * 0.42, 0, Math.PI, TAU); g.stroke(); g.restore(); }
    const gr = g.createRadialGradient(-R * 0.4, -R * 0.4, R * 0.1, 0, 0, R); gr.addColorStop(0, a); gr.addColorStop(1, b);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
    if(craters){ g.fillStyle = 'rgba(0,0,0,.14)'; [[-0.3, -0.2, 0.22], [0.35, 0.25, 0.16], [-0.05, 0.5, 0.12], [0.4, -0.4, 0.1]].forEach(([x, y, s]) => { g.beginPath(); g.arc(x * R, y * R, s * R, 0, TAU); g.fill(); }); }
    else { g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = R * 0.16; [-0.35, 0.05, 0.45].forEach(y => { g.beginPath(); g.moveTo(-R, y * R); g.quadraticCurveTo(0, y * R + R * 0.12, R, y * R); g.stroke(); }); }
    g.fillStyle = 'rgba(10,6,40,.35)'; g.beginPath(); g.arc(R * 0.35, R * 0.3, R * 1.05, 0, TAU); g.fill();
    g.restore();
    if(ring){ g.save(); g.rotate(-0.35); g.strokeStyle = 'rgba(255,220,170,.7)'; g.lineWidth = R * 0.22; g.beginPath(); g.ellipse(0, 0, R * 1.6, R * 0.42, 0, 0, Math.PI); g.stroke(); g.restore(); }
  });
  const pl = [planet(34, '#ffb38a', '#c2457a', true, false), planet(18, '#9fe6ff', '#3b6fd0', false, true), planet(12, '#e6e1ff', '#8f86c9', false, true)];
  const planets = BG && BG.planets ? BG.planets.map((p, i) => Object.assign(p, { spr:pl[i] })) :
    [{ spr:pl[0], x:W * 0.78, y:H * 0.3, v:7 }, { spr:pl[1], x:W * 0.16, y:H * 0.62, v:11 }, { spr:pl[2], x:W * 0.55, y:-H * 0.2, v:15 }];
  BG = { neb:c, nh, sky, stars, planets, off:BG ? BG.off : 0 };
}
function drawBG(dt){
  const warp = G.warp;
  ctx.fillStyle = BG.sky; ctx.fillRect(0, 0, W, H);
  BG.off = (BG.off + dt * 8 * S * warp) % BG.nh;
  ctx.globalAlpha = 0.9;
  ctx.drawImage(BG.neb, 0, BG.off - BG.nh, W, BG.nh); ctx.drawImage(BG.neb, 0, BG.off, W, BG.nh);
  ctx.globalAlpha = 1;
  for(const p of BG.planets){
    p.y += dt * p.v * S * (0.6 + warp * 0.4);
    const h = p.spr.dh * S; if(p.y - h / 2 > H){ p.y = -h; p.x = rnd(W * 0.1, W * 0.9); }
    blit(p.spr, p.x, p.y, 1, 0, 0.85);
  }
  const t = G.time;
  for(const s of BG.stars){
    s.y += dt * (14 + s.z * 60) * S * warp; if(s.y > H){ s.y -= H + 4; s.x = Math.random() * W; }
    const a = s.z * (0.55 + 0.45 * Math.sin(t * 2.2 + s.tw)), sz = (0.7 + s.z * 1.6) * Math.min(S, 1.4);
    ctx.globalAlpha = clamp(a, 0.1, 1); ctx.fillStyle = s.c;
    if(warp > 1.6) ctx.fillRect(s.x, s.y, sz, sz * (1 + warp * s.z * 2)); else ctx.fillRect(s.x, s.y, sz, sz);
  }
  ctx.globalAlpha = 1;
}

/* ---------- sound (tiny WebAudio synth) ---------- */
const SND = { ac:null, master:null, muted:!!store.get('muted', false), last:{} };
function audioInit(){
  if(SND.ac) { if(SND.ac.state === 'suspended') SND.ac.resume(); return; }
  try{ const AC = window.AudioContext || window.webkitAudioContext; SND.ac = new AC(); SND.master = SND.ac.createGain(); SND.master.gain.value = SND.muted ? 0 : 0.7; SND.master.connect(SND.ac.destination); }catch(e){ SND.ac = null; }
}
function tone(f, d, type, vol, f2, delay){
  const ac = SND.ac; if(!ac || SND.muted) return;
  const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), gn = ac.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
  gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol, t0 + 0.008); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(gn); gn.connect(SND.master); o.start(t0); o.stop(t0 + d + 0.02);
}
function noise(d, vol, freq){
  const ac = SND.ac; if(!ac || SND.muted) return;
  if(!SND.nb){ const n = ac.sampleRate * 0.4, b = ac.createBuffer(1, n, ac.sampleRate), ch = b.getChannelData(0); for(let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1; SND.nb = b; }
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain(), t0 = ac.currentTime;
  s.buffer = SND.nb; f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = 0.8;
  gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  s.connect(f); f.connect(gn); gn.connect(SND.master); s.start(t0); s.stop(t0 + d + 0.02);
}
function sfx(name){
  if(!SND.ac || SND.muted) return;
  const now = performance.now(), gap = { pew:70, pop:40, coin:45, hit:60 }[name] || 0;
  if(gap && now - (SND.last[name] || 0) < gap) return; SND.last[name] = now;
  switch(name){
    case 'pew': tone(1100, 0.07, 'triangle', 0.035, 620); break;
    case 'pop': tone(320, 0.12, 'sine', 0.16, 980); noise(0.08, 0.05, 2400); break;
    case 'hit': tone(700, 0.05, 'square', 0.03, 500); break;
    case 'coin': tone(1320, 0.06, 'square', 0.035); tone(1760, 0.09, 'square', 0.035, null, 0.055); break;
    case 'power': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, null, i * 0.065)); break;
    case 'hurt': tone(420, 0.35, 'sawtooth', 0.08, 110); noise(0.25, 0.08, 500); break;
    case 'shieldpop': tone(900, 0.2, 'sine', 0.12, 300); noise(0.15, 0.06, 3000); break;
    case 'wave': [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.18, 'triangle', 0.09, null, i * 0.09)); break;
    case 'boss': tone(130, 0.7, 'square', 0.07, 70); tone(196, 0.7, 'sawtooth', 0.04, 98, 0.1); break;
    case 'bosshit': tone(240, 0.06, 'square', 0.04, 180); break;
    case 'boom': noise(0.6, 0.18, 700); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, null, 0.15 + i * 0.08)); break;
    case 'over': [523, 440, 349, 294].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, null, i * 0.16)); break;
    case 'win': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1, null, i * 0.11)); break;
    case 'click': tone(660, 0.05, 'sine', 0.08, 880); break;
  }
}
function setMute(m){
  SND.muted = m; store.set('muted', m);
  if(SND.master) SND.master.gain.value = m ? 0 : 0.7;
  $('#muteX').hidden = !m; $('#muteWave').style.display = m ? 'none' : '';
}

/* ---------- game state ---------- */
const G = {
  state:'menu', time:0, ft:0, warp:1, shake:0, pilot:store.get('pilot', 'sara'),
  p:null, wave:1, phase:'intro', phaseT:0, score:0, coins:0, lives:3, stars:0, waveStars:[], hitsWave:0,
  enemies:[], bullets:[], eshots:[], picks:[], coinsArr:[], parts:[], texts:[], boss:null,
  fireCd:0, diveCd:2, shotCd:2, kills:0, waveCount:0, dropAt:[], banner:null, awarded:false, best:store.get('best', 0), endT:0,
  online:false, guest:false, eid:0, mbul:[], overT:0, netSlow:false, gone:new Set(), claimed:new Set()
};
const nid = () => ++G.eid;
/* online: a player who is out of hearts flies on as a ghost until a friend touches them (or the next wave) */
const out = p => !p || p.dead || p.ghost;
if(!PILOTS.some(p => p.id === G.pilot)) G.pilot = 'sara';

function newPlayer(){
  const sp = G.online ? MP.slot * 0.17 - 0.25 : 0;   // friends start side by side
  const x = OX + PW * (0.5 + sp);
  return { x, y:H - SA.b - 110 * S, tx:x, ty:H - SA.b - 110 * S, inv:0, level:1, powerT:0, shield:0, magnet:0, slow:0, dead:false, ghost:false, tilt:0 };
}
/* how = undefined (solo) | 'host' | 'guest' */
function startGame(how){
  audioInit();
  G.online = !!how; G.guest = how === 'guest';
  const w0 = clamp(parseInt(Q.get('wave'), 10) || 1, 1, WAVES_TOTAL);
  Object.assign(G, { state:'play', score:0, coins:0, lives:3, stars:0, waveStars:[], enemies:[], bullets:[], eshots:[], picks:[], coinsArr:[], parts:[], texts:[], boss:null, awarded:false, shake:0, endT:0,
    mbul:[], overT:0, netSlow:false, banner:null });
  G.gone = new Set(); G.claimed = new Set(); MP.drops = []; MP.hits = []; MP.pk = []; MP.hu = 0;
  G.p = newPlayer();
  if(G.guest){ G.wave = 1; G.phase = 'intro'; G.phaseT = 0; } else startWave(w0);
  show(null); try{ if(window.World) World.track('play', 'space'); }catch(e){}
}
function waveBanner(n){
  const wv = WAVES[n - 1];
  G.banner = { t:0, big:wv.boss != null ? T('الزعيم جاي!', 'Boss time!', 'Patron geliyor!') : T('الموجة ' + n, 'Wave ' + n, 'Dalga ' + n), small:wv.boss != null ? BOSSES[wv.boss].name : T('فرقعهم كلهم!', 'Pop them all!', 'Hepsini patlat!'), dur:1.7 };
  if(wv.boss != null) sfx('boss');
}
function clearBanner(n, st){
  sfx('wave');
  G.banner = { t:0, big:T('أحسنت!', 'Great job!', 'Harika!'), small:T('خلصت الموجة ' + n, 'Wave ' + n + ' cleared', 'Dalga ' + n + ' bitti'), stars:st, dur:2.1 };
}
function startWave(n){
  G.wave = n; G.phase = 'intro'; G.phaseT = 0; G.hitsWave = 0; G.kills = 0;
  if(G.p && G.p.ghost) revive();
  waveBanner(n);
}
function revive(){
  const p = G.p; if(!p || !p.ghost) return;
  p.ghost = false; G.lives = 2; p.inv = 2.5; sfx('power');
  burst(p.x, p.y, '#ff7aa8', 14); burst(p.x, p.y, '#ffd84d', 10);
  ftext(p.x, p.y - 50 * S, T('رجعت! 💖', 'Back in! 💖', 'Geri döndün! 💖'), '#ffb3d6');
}
function spawnWave(){
  const wv = WAVES[G.wave - 1]; let group = 0; G.waveCount = 0;
  const rows = wv.rows.slice().reverse(); // front rows first
  rows.forEach((row, ri) => {
    const rIndex = wv.rows.length - 1 - ri; let k = 0;
    const side = group % 3, cells = [];
    for(let c = 0; c < 8; c++) if(row[c] !== '.') cells.push(c);
    cells.forEach((c, i) => {
      const t = TYPES[row[c]];
      const e = { id:nid(), k:row[c], T:t, hp:t.hp + (G.wave > 10 && row[c] !== 'z' ? 1 : 0), col:c, row:rIndex + (wv.boss != null ? 4 : 0), x:-100, y:-100, st:'wait', t:0,
        delay:group * 1.15 + k * 0.12, phase:Math.random() * 10, flash:0, rot:0, vx:0, vy:0, fired:false, hop:0 };
      const left = side === 0 || (side === 2 && i < cells.length / 2), mir = left ? 1 : -1;
      if(side === 2){ e.p0 = { x:OX + PW * (0.5 - mir * 0.08), y:-30 * S }; e.p1 = { x:OX + PW * (0.5 + mir * 0.5), y:H * 0.55 }; e.p2 = { x:OX + PW * (0.5 + mir * 0.15), y:H * 0.22 }; }
      else { e.p0 = { x:left ? OX - 30 * S : OX + PW + 30 * S, y:H * 0.18 }; e.p1 = { x:OX + PW * (left ? 0.95 : 0.05), y:H * 0.62 }; e.p2 = { x:OX + PW * (left ? 0.1 : 0.9), y:H * 0.42 }; }
      G.enemies.push(e); k++; G.waveCount++;
    });
    group++;
  });
  if(wv.boss != null){
    const B = BOSSES[wv.boss];
    // online: more rockets shooting → a tougher boss
    const hp = G.online ? Math.round(B.hp * (1 + 0.75 * (mpCrew() - 1))) : B.hp;
    G.boss = { def:B, spr:SPR.boss[wv.boss], idx:wv.boss, x:OX + PW / 2, y:-120 * S, hp, max:hp, t:0, st:'enter', patT:2.5, pat:0, flash:0 };
  }
  const n = G.waveCount + (G.boss ? 12 : 0);
  G.dropAt = wv.boss != null ? [2, 6] : [Math.max(2, Math.round(n * 0.3)), Math.round(n * 0.7)];
  G.diveCd = 3; G.shotCd = 2.2;
}
function slotPos(col, row){
  const gap = Math.min(PW / 9.4, 44 * S), b = 1 + 0.045 * Math.sin(G.ft * 1.5);
  return { x:OX + PW / 2 + (col - 3.5) * gap * b + Math.sin(G.ft * 0.55) * PW * 0.045, y:topY() + row * gap * 0.86 * b };
}
function bez(a, b, c, d, t){ const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d; }

/* ---------- particles / effects ---------- */
function burst(x, y, col, n, spd){
  n = n || 10; spd = spd || 1;
  const spr = SPR.star[col] || SPR.star['#ffffff'];
  for(let i = 0; i < n; i++){ const a = rnd(0, TAU), v = rnd(70, 220) * S * spd; G.parts.push({ x, y, vx:Math.cos(a) * v, vy:Math.sin(a) * v, life:rnd(0.5, 0.9), t:0, spr, rot:rnd(0, TAU), vr:rnd(-6, 6), sc:rnd(0.7, 1.3) }); }
  G.parts.push({ ring:true, x, y, t:0, life:0.35, col, r:10 * S * spd });
  if(G.parts.length > 420) G.parts.splice(0, G.parts.length - 420);
}
function sparkle(x, y, col){ G.parts.push({ x, y, vx:rnd(-30, 30) * S, vy:rnd(-30, 30) * S, life:0.4, t:0, spr:SPR.star[col] || SPR.star['#ffffff'], rot:0, vr:3, sc:0.6 }); }
function ftext(x, y, s, col){ for(const t of G.texts) if(t.t < 0.6 && Math.abs(t.x - x) < 120 * S && Math.abs(t.y - y) < 22 * S) y = t.y - 24 * S; G.texts.push({ x, y, s, col:col || '#fff', t:0 }); }
function dropCoins(x, y, n){
  for(let i = 0; i < n; i++) G.coinsArr.push({ x:x + rnd(-8, 8) * S, y, vx:rnd(-60, 60) * S, vy:rnd(-140, -40) * S, t:0 });
  // online: every phone gets its own copy of the coins (coins are per player)
  if(G.online && !G.guest && MP.drops.length < 40) MP.drops.push([NX(x), NY(y), n]);
}
/* playfield ↔ shared coordinates (0…1000 across the play strip and down the screen), so phones of any size agree */
const NX = x => Math.round((x - OX) / PW * 1000), NY = y => Math.round(y / H * 1000);
const FX = n => OX + clamp(+n || 0, -200, 1200) / 1000 * PW, FY = n => clamp(+n || 0, -300, 1300) / 1000 * H;

/* ---------- player hit / kill ---------- */
function hurtPlayer(){
  const p = G.p; if(p.inv > 0 || out(p) || (G.state !== 'play' && !(G.online && G.state === 'pause'))) return;
  if(p.shield > 0){ p.shield = 0; p.inv = 1.2; sfx('shieldpop'); burst(p.x, p.y, '#6cc0ff', 14); G.shake = Math.max(G.shake, 5); return; }
  G.lives--; G.hitsWave++; p.inv = 2.3; p.level = Math.max(1, p.level - 1); sfx('hurt'); G.shake = 12;
  burst(p.x, p.y, '#ff7aa8', 16);
  G.eshots = G.eshots.filter(s => { const keep = Math.hypot(s.x - p.x, s.y - p.y) > 160 * S; if(!keep && G.guest) G.gone.add(s.id); return keep; });
  if(G.guest) MP.hu++;
  if(G.online && G.lives <= 0){
    p.ghost = true; p.shield = 0; p.magnet = 0; p.level = 1;
    burst(p.x, p.y, '#ffd84d', 24, 1.4); burst(p.x, p.y, '#ffffff', 16, 1.1);
    ftext(p.x, p.y - 50 * S, T('خلّي صاحبك يلمسك! 👻', 'A friend can touch you back! 👻', 'Bir arkadaşın sana dokunsun! 👻'), '#d8ccff');
    return;
  }
  if(G.lives <= 0){ p.dead = true; burst(p.x, p.y, '#ffd84d', 30, 1.6); burst(p.x, p.y, '#ffffff', 20, 1.2); G.endT = 1.6; }
}
function killEnemy(e, i){
  const diving = e.st === 'dive';
  const pts = e.T.pts * (diving ? 2 : 1);
  G.score += pts; G.kills++; burst(e.x, e.y, e.T.col, 11); sfx('pop'); G.shake = Math.max(G.shake, 2.5);
  if(diving) ftext(e.x, e.y - 10 * S, '+' + pts, '#ffe27a');
  if(Math.random() < (e.k === 'k' ? 0.9 : 0.3)) dropCoins(e.x, e.y, e.k === 'k' ? 2 : 1);
  G.enemies.splice(i, 1);
  if(G.dropAt.length && G.kills >= G.dropAt[0]){ G.dropAt.shift(); dropPick(e.x, e.y); }
  else if(Math.random() < 0.03) dropPick(e.x, e.y);
}
function dropPick(x, y, kind){
  const p = G.p; if(!kind){
    const w = [['power', p.level < 3 ? 4 : 1.5], ['shield', p.shield ? 0.5 : 2.2], ['magnet', 1.6], ['slow', 1.3], ['heart', G.lives < 3 ? 1.8 : 0]];
    let s = w.reduce((a, b) => a + b[1], 0) * Math.random(); kind = w[0][0]; for(const [k, v] of w){ if((s -= v) <= 0){ kind = k; break; } }
  }
  G.picks.push({ id:nid(), kind, x:clamp(x, OX + 30 * S, OX + PW - 30 * S), y, t:0 });
}
const PICK_NAMES = {
  power:lv => lv >= 3 ? T('طلقة ثلاثية!', 'Triple shot!', 'Üçlü atış!') : T('طلقة مضاعفة!', 'Double shot!', 'Çift atış!'),
  shield:() => T('فقاعة حماية!', 'Shield bubble!', 'Kalkan baloncuğu!'),
  magnet:() => T('مغناطيس مصاري!', 'Coin magnet!', 'Altın mıknatısı!'),
  slow:() => T('حركة بطيئة!', 'Slow-mo!', 'Ağır çekim!'),
  heart:() => T('قلب زيادة!', 'Extra heart!', 'Ekstra kalp!')
};
function takePick(k){
  const p = G.p; sfx('power'); burst(p.x, p.y - 10 * S, '#ffd84d', 10, 0.8);
  if(k === 'power'){ p.level = Math.min(3, p.level + 1); p.powerT = 15; }
  else if(k === 'shield') p.shield = 12;
  else if(k === 'magnet') p.magnet = 12;
  else if(k === 'slow') p.slow = 7;
  else if(k === 'heart') G.lives = Math.min(3, G.lives + 1);
  ftext(p.x, p.y - 50 * S, PICK_NAMES[k](p.level), PICK[k].col);
  if(!G.guest) G.score += 50;
}

/* ---------- update ---------- */
function enemyFire(x, y, aim){
  if(G.eshots.length >= 4 + Math.min(8, G.wave) + (G.online ? 2 * (mpCrew() - 1) : 0)) return;
  const sp = (125 + Math.min(G.wave, 14) * 6) * S, tg = G.online ? pickLiving() : G.p;
  let vx = 0; if(aim){ const dx = tg.x - x, dy = Math.max(60 * S, tg.y - y); vx = clamp(dx / dy, -0.45, 0.45) * sp; }
  G.eshots.push({ id:nid(), x, y:y + 10 * S, vx, vy:sp, t:0 });
}
/* the player's own rocket: move, timers, auto-fire (same on every phone) */
function movePlayer(dt){
  const p = G.p;
  const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  if(G.state === 'play' && (kx || ky)){ p.tx += kx * 420 * S * dt; p.ty += ky * 420 * S * dt; }
  p.tx = clamp(p.tx, OX + 22 * S, OX + PW - 22 * S); p.ty = clamp(p.ty, H * 0.42, H - SA.b - 44 * S);
  const ox = p.x; const k = 1 - Math.exp(-dt * 22); p.x = lerp(p.x, p.tx, k); p.y = lerp(p.y, p.ty, k);
  p.tilt = lerp(p.tilt, clamp((p.x - ox) / Math.max(dt, 0.001) / (900 * S), -0.35, 0.35), 1 - Math.exp(-dt * 10));
  ['inv', 'shield', 'magnet', 'slow'].forEach(n => { if(p[n] > 0) p[n] = Math.max(0, p[n] - dt); });
  if(p.level > 1){ p.powerT -= dt; if(p.powerT <= 0){ p.level--; p.powerT = p.level > 1 ? 8 : 0; } }
  // auto-fire
  G.fireCd -= dt;
  if(G.fireCd <= 0 && G.phase !== 'clear' && !p.ghost){
    G.fireCd = 0.17; shoot(G.bullets, p.x, p.y, p.level);
    sfx('pew');
  }
}
function shoot(arr, x, y, level, c){
  const by = y - 36 * S, sp = -760 * S;
  if(level === 1) arr.push({ x, y:by, vx:0, vy:sp, c });
  else if(level === 2){ arr.push({ x:x - 9 * S, y:by, vx:0, vy:sp, c }, { x:x + 9 * S, y:by, vx:0, vy:sp, c }); }
  else { arr.push({ x, y:by, vx:0, vy:sp, st:1, c }, { x:x - 8 * S, y:by + 4 * S, vx:-130 * S, vy:sp, c }, { x:x + 8 * S, y:by + 4 * S, vx:130 * S, vy:sp, c }); }
}
function moveBullets(arr, dt){ for(let i = arr.length - 1; i >= 0; i--){ const b = arr[i]; b.x += b.vx * dt; b.y += b.vy * dt; if(b.y < -20 * S || b.x < OX - 20 || b.x > OX + PW + 20) arr.splice(i, 1); } }
const slowOn = () => (G.p && G.p.slow > 0) || (G.online && (G.guest ? G.netSlow : mates().some(m => m.sl)));
function update(dt){
  G.time += dt;
  const p = G.p, es = slowOn() ? 0.45 : 1, edt = dt * es;
  G.ft += edt;
  G.warp = lerp(G.warp, ((G.state === 'play' || G.state === 'pause') && (G.phase === 'clear' || G.phase === 'intro') && G.phaseT > 0.3) ? 4 : 1, 1 - Math.exp(-dt * 2.5));
  if(G.state === 'menu'){ updateDemo(dt); return; }
  if(G.state !== 'play' && !(G.online && G.state === 'pause')) return;   // online the game goes on behind the pause card
  if(G.guest){ updateGuest(dt, edt); return; }

  /* player */
  if(!p.dead){
    movePlayer(dt);
  } else {
    G.endT -= dt; if(G.endT <= 0){ endGame(false); return; }
  }
  if(G.online){
    updateMates(dt);
    // the run ends only when every rocket in the room is a ghost
    if(!anyAlive()){ G.overT += dt; if(G.overT > 1.6){ endGame(false); return; } } else G.overT = 0;
  }

  /* phases */
  G.phaseT += dt;
  if(G.banner){ G.banner.t += dt; if(G.banner.t > G.banner.dur) G.banner = null; }
  if(G.phase === 'intro' && G.phaseT > 1.4){ G.phase = 'fight'; G.phaseT = 0; spawnWave(); }
  else if(G.phase === 'fight' && !G.enemies.length && !G.boss){
    G.phase = 'clear'; G.phaseT = 0;
    const st = G.hitsWave === 0 ? 3 : G.hitsWave === 1 ? 2 : 1; G.waveStars.push(st); G.stars += st;
    G.score += 500 * st; clearBanner(G.wave, st);
    // gather the remaining coins
    G.coinsArr.forEach(c => c.pull = true);
  } else if(G.phase === 'clear' && G.phaseT > 2.3){
    if(G.wave >= WAVES_TOTAL){ endGame(true); return; }
    startWave(G.wave + 1);
  }

  /* bullets */
  moveBullets(G.bullets, dt);

  /* enemies */
  const wv = WAVES[G.wave - 1];
  const fighting = G.phase === 'fight';
  for(let i = G.enemies.length - 1; i >= 0; i--){
    const e = G.enemies[i]; e.flash = Math.max(0, e.flash - dt);
    if(e.st === 'wait'){ e.delay -= edt; if(e.delay <= 0){ e.st = 'enter'; e.t = 0; } continue; }
    if(e.st === 'enter'){
      e.t += edt / 1.9; const s = slotPos(e.col, e.row), t = Math.min(1, e.t);
      const nx = bez(e.p0.x, e.p1.x, e.p2.x, s.x, t), ny = bez(e.p0.y, e.p1.y, e.p2.y, s.y, t);
      e.rot = clamp((nx - e.x) * 0.02, -0.5, 0.5); e.x = nx; e.y = ny;
      if(e.t >= 1){ e.st = 'form'; e.rot = 0; }
    } else if(e.st === 'form'){
      const s = slotPos(e.col, e.row); e.x = lerp(e.x, s.x, 1 - Math.exp(-edt * 12)); e.y = lerp(e.y, s.y, 1 - Math.exp(-edt * 12)); e.rot *= 0.9;
    } else if(e.st === 'dive'){
      e.t += edt;
      const fast = e.k === 'z' ? 1.35 : 1;
      if(e.t < 0.55){ e.vy = lerp(e.vy, -70 * S, 0.1); e.vx = e.side * 150 * S; }
      else {
        e.vy = Math.min(e.vy + 520 * S * edt, (190 + G.wave * 6) * S * fast);
        const tg = G.online ? nearestLiving(e.x, e.y) : G.p;
        const want = clamp((tg.x - e.x) * 2.2, -170 * S, 170 * S) * (e.y < tg.y - 40 * S ? 1 : 0.2);
        e.vx = lerp(e.vx, want + (e.k === 's' ? Math.sin(e.t * 7) * 140 * S : 0), 1 - Math.exp(-edt * 2.2));
      }
      e.x += e.vx * edt; e.y += e.vy * edt; e.rot = clamp(e.vx / (400 * S), -0.6, 0.6);
      if(!e.fired && e.y > H * 0.33 && G.wave > 1){ e.fired = true; enemyFire(e.x, e.y, true); }
      if(e.y > H + 40 * S){ if(e.minion){ G.enemies.splice(i, 1); continue; } e.st = 'ret'; e.y = -40 * S; e.x = slotPos(e.col, e.row).x; }
    } else if(e.st === 'ret'){
      const s = slotPos(e.col, e.row); const dx = s.x - e.x, dy = s.y - e.y, d = Math.hypot(dx, dy), sp = 260 * S * edt;
      if(d < sp + 1){ e.st = 'form'; } else { e.x += dx / d * sp; e.y += dy / d * sp; }
      e.rot *= 0.9;
    }
    // body collision with the player
    if(!out(p) && (e.st === 'dive' || e.st === 'enter') && Math.hypot(e.x - p.x, e.y - p.y) < (e.T.r * 0.8 + 14) * S){ hurtPlayer(); if(e.st === 'dive'){ e.hp = 0; killEnemy(e, i); continue; } }
    // hits
    for(let j = G.bullets.length - 1; j >= 0; j--){
      const b = G.bullets[j];
      if(Math.abs(b.x - e.x) < e.T.r * 1.05 * S && Math.abs(b.y - e.y) < e.T.r * 1.1 * S){
        G.bullets.splice(j, 1); e.hp--; e.flash = 0.09;
        if(e.hp <= 0){ killEnemy(e, i); break; } else { sfx('hit'); sparkle(b.x, b.y, '#ffffff'); }
      }
    }
  }

  /* dives + formation shots */
  if(fighting && anyAlive()){
    const form = G.enemies.filter(e => e.st === 'form');
    G.diveCd -= edt;
    if(G.diveCd <= 0 && form.length){
      G.diveCd = Math.max(0.9, 3.4 - G.wave * 0.18) / (wv.dive || 1) * rnd(0.75, 1.25) / (G.online ? 1 + 0.25 * (mpCrew() - 1) : 1);
      const n = G.wave >= 6 && Math.random() < 0.4 ? 2 : 1;
      for(let q = 0; q < n && form.length; q++){
        const e = form.splice(Math.floor(Math.random() * form.length), 1)[0];
        e.st = 'dive'; e.t = 0; e.vy = 0; e.side = e.x < OX + PW / 2 ? -1 : 1; e.fired = false;
      }
    }
    G.shotCd -= edt;
    if(G.shotCd <= 0){
      G.shotCd = Math.max(0.55, 1.9 - G.wave * 0.09) * rnd(0.7, 1.3);
      const sh = G.enemies.filter(e => e.st === 'form');
      if(sh.length && G.wave > 0){ const e = sh[Math.floor(Math.random() * sh.length)]; enemyFire(e.x, e.y, G.wave >= 3 && Math.random() < 0.5); }
    }
  }

  /* boss */
  const B = G.boss;
  if(B){
    B.t += edt; B.flash = Math.max(0, B.flash - dt);
    const hx = OX + PW / 2 + Math.sin(B.t * 0.7) * PW * 0.26, hy = topY() + 64 * S + Math.sin(B.t * 1.4) * 8 * S;
    if(B.st === 'enter'){ B.y = lerp(B.y, hy, 1 - Math.exp(-edt * 1.6)); B.x = lerp(B.x, hx, 1 - Math.exp(-edt * 2)); if(Math.abs(B.y - hy) < 4 * S) B.st = 'fight'; }
    else {
      B.x = lerp(B.x, hx, 1 - Math.exp(-edt * 3)); B.y = lerp(B.y, hy, 1 - Math.exp(-edt * 3));
      B.patT -= edt;
      if(B.patT <= 0 && anyAlive()){
        const angry = B.hp < B.max * 0.5; B.patT = (angry ? 1.8 : 2.5) - B.idx * 0.15; B.pat++;
        const pat = B.pat % 3, sp = (120 + B.idx * 12) * S;
        if(pat === 1){ const n = angry ? 7 : 5; for(let i = 0; i < n; i++){ const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.24; G.eshots.push({ id:nid(), x:B.x, y:B.y + 40 * S, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, t:0 }); } }
        else if(pat === 2){ const n = angry ? 12 : 10, o = rnd(0, 1); for(let i = 0; i < n; i++){ const a = (i + o) / n * TAU; if(Math.sin(a) < -0.2) continue; G.eshots.push({ id:nid(), x:B.x, y:B.y, vx:Math.cos(a) * sp * 0.85, vy:Math.sin(a) * sp * 0.85 + 30 * S, t:0 }); } }
        else {
          const kinds = ['z', 'b', 'g']; const n = 2 + (angry ? 1 : 0);
          for(let i = 0; i < n; i++){ const k = kinds[(B.idx + i) % 3]; G.enemies.push({ id:nid(), k, T:TYPES[k], hp:1, col:0, row:0, x:B.x + (i - (n - 1) / 2) * 40 * S, y:B.y + 30 * S, st:'dive', t:0.3, vx:0, vy:-40 * S, side:i % 2 ? 1 : -1, phase:rnd(0, 9), flash:0, rot:0, minion:true, fired:false }); }
        }
        sfx('bosshit');
      }
    }
    // hits on boss
    const rx = B.def.r * 0.95 * S, ry = B.def.r * 0.9 * S;
    for(let j = G.bullets.length - 1; j >= 0; j--){
      const b = G.bullets[j], dx = (b.x - B.x) / rx, dy = (b.y - B.y) / ry;
      if(dx * dx + dy * dy < 1){
        G.bullets.splice(j, 1); if(B.st !== 'fight') continue;
        if(hitBoss(b.x, b.y)) break;
      }
    }
    if(G.boss && !out(p)){ const dx = (p.x - B.x) / (rx + 12 * S), dy = (p.y - B.y) / (ry + 12 * S); if(dx * dx + dy * dy < 1) hurtPlayer(); }
  }

  /* enemy shots */
  for(let i = G.eshots.length - 1; i >= 0; i--){
    const s = G.eshots[i]; s.t += edt; s.x += s.vx * edt; s.y += s.vy * edt;
    if(s.y > H + 20 || s.y < -40 || s.x < -20 || s.x > W + 20){ G.eshots.splice(i, 1); continue; }
    if(!out(p) && Math.hypot(s.x - p.x, s.y - (p.y - 2 * S)) < (p.shield > 0 ? 34 : 13) * S){ G.eshots.splice(i, 1); hurtPlayer(); }
  }

  /* pickups */
  for(let i = G.picks.length - 1; i >= 0; i--){
    const k = G.picks[i]; k.t += dt; k.y += 75 * S * dt; k.x += Math.sin(k.t * 3) * 20 * S * dt;
    if(k.y > H + 30 * S){ G.picks.splice(i, 1); continue; }
    if(!out(p) && Math.hypot(k.x - p.x, k.y - p.y) < 40 * S){ G.picks.splice(i, 1); takePick(k.kind); }
  }

  updateCoins(dt);

  /* particles / texts */
  updateParts(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
}
/* a hit on the boss (from this phone's bubble or a friend's claim); true when it popped */
function hitBoss(bx, by){
  const B = G.boss; if(!B || B.st !== 'fight') return false;
  B.hp--; B.flash = 0.07; sparkle(bx, by, '#ffffff'); sfx('bosshit'); G.score += 10;
  if(B.hp > 0) return false;
  G.score += 5000 * (B.idx + 1); sfx('boom'); G.shake = 16;
  for(let q = 0; q < 5; q++) burst(B.x + rnd(-40, 40) * S, B.y + rnd(-30, 30) * S, q % 2 ? '#ffd84d' : B.def.col, 14, 1.4);
  dropCoins(B.x, B.y, 15); dropPick(B.x - 30 * S, B.y, 'power'); if(G.lives < 3 || G.online) dropPick(B.x + 30 * S, B.y, 'heart');
  ftext(B.x, B.y, '+' + 5000 * (B.idx + 1), '#ffe27a');
  G.enemies.forEach(e => { burst(e.x, e.y, e.T.col, 6); }); G.enemies.length = 0;
  G.boss = null; G.eshots.length = 0;
  return true;
}
/* coins: every phone runs its own coins and collects them for itself */
function updateCoins(dt){
  const p = G.p;
  for(let i = G.coinsArr.length - 1; i >= 0; i--){
    const c = G.coinsArr[i]; c.t += dt;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    if(!out(p) && (c.pull || (p.magnet > 0 && d < 420 * S) || d < 70 * S)){ const sp = (c.pull || p.magnet > 0 ? 620 : 380) * S; c.vx = lerp(c.vx, dx / d * sp, 0.2); c.vy = lerp(c.vy, dy / d * sp, 0.2); }
    else { c.vy = Math.min(c.vy + 260 * S * dt, 110 * S); c.vx *= 0.97; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if(!out(p) && d < 26 * S){ G.coinsArr.splice(i, 1); G.coins++; if(!G.online) G.score += 25; sfx('coin'); sparkle(c.x, c.y, '#ffd84d'); continue; }
    if(c.y > H + 20) G.coinsArr.splice(i, 1);
  }
}
function updateParts(dt){
  for(let i = G.parts.length - 1; i >= 0; i--){ const q = G.parts[i]; q.t += dt; if(q.t >= q.life){ G.parts.splice(i, 1); continue; } if(!q.ring){ q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.96; q.vy *= 0.96; q.rot += q.vr * dt; } }
  for(let i = G.texts.length - 1; i >= 0; i--){ const t = G.texts[i]; t.t += dt; t.y -= 40 * S * dt; if(t.t > 1.1) G.texts.splice(i, 1); }
}

/* ---------- menu demo: a little formation sways behind the card ---------- */
const DEMO = { e:[], t:0 };
function updateDemo(dt){
  DEMO.t += dt;
  if(!DEMO.e.length){ const r = ['kpskkspk', 'gzgbbgzg']; r.forEach((row, ri) => { for(let c = 0; c < 8; c++) DEMO.e.push({ k:row[c], col:c, row:ri, phase:rnd(0, 9) }); }); }
  updateParts(dt);
  if(Math.random() < dt * 1.2){ const e = DEMO.e[Math.floor(Math.random() * DEMO.e.length)]; const s = slotPos(e.col, e.row); sparkle(s.x + rnd(-14, 14) * S, s.y + rnd(-14, 14) * S, '#ffffff'); }
}

/* ---------- draw ---------- */
function drawAlienE(e){
  const spr = SPR.al[e.k], t = G.time + e.phase;
  const blink = (t % 3.6) < 0.13, fr = blink ? 2 : (Math.floor(t * 3) % 2);
  const sq = 1 + Math.sin(t * 6) * 0.04;
  const c = spr.f[fr];
  const w = c.dw * S, h = c.dh * S;
  ctx.save(); ctx.translate(e.x, e.y); if(e.rot) ctx.rotate(e.rot); ctx.scale(sq, 2 - sq);
  ctx.drawImage(c, -w / 2, -h / 2, w, h);
  if(e.flash > 0){ ctx.globalAlpha = 0.75; ctx.drawImage(spr.w, -w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
  ctx.restore();
}
function drawShip(p){
  if(p.dead) return;
  const blinkOff = !p.ghost && p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
  // flame
  const fl = 1 + Math.sin(G.time * 40) * 0.15 + Math.random() * 0.1;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt);
  if(p.ghost){
    // a ghost rocket: see-through, bobbing, no flame
    ctx.globalAlpha = 0.38 + 0.1 * Math.sin(G.time * 4); ctx.translate(0, Math.sin(G.time * 3) * 3 * S);
    const c = p.spr || SPR.ship; ctx.drawImage(c, -c.dw * S / 2, -c.dh * S / 2, c.dw * S, c.dh * S);
    ctx.globalAlpha = 1; ctx.restore();
    text('👻', p.x + 22 * S, p.y - 30 * S, 20 * S, '#fff', 'center', false);
    return;
  }
  ctx.globalCompositeOperation = 'lighter';
  const fy = 34 * S, fh = 26 * S * fl;
  let gr = ctx.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.4, 'rgba(255,150,60,.9)'); gr.addColorStop(1, 'rgba(255,60,120,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-8 * S, fy); ctx.quadraticCurveTo(0, fy + fh * 1.3, 8 * S, fy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(-4 * S, fy); ctx.quadraticCurveTo(0, fy + fh * 0.6, 4 * S, fy); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if(!blinkOff){ const c = p.spr || SPR.ship; ctx.drawImage(p.inv > 2 && !p.spr ? SPR.shipW : c, -c.dw * S / 2, -c.dh * S / 2, c.dw * S, c.dh * S); }
  ctx.restore();
  if(p.shield > 0){
    const a = p.shield < 2.5 ? (Math.floor(p.shield * 8) % 2 ? 0.3 : 0.9) : 0.9, R = 38 * S * (1 + Math.sin(G.time * 5) * 0.03);
    ctx.globalAlpha = a;
    const sg = ctx.createRadialGradient(p.x - R * 0.3, p.y - R * 0.4, R * 0.1, p.x, p.y, R);
    sg.addColorStop(0, 'rgba(255,255,255,.18)'); sg.addColorStop(0.75, 'rgba(110,200,255,.12)'); sg.addColorStop(1, 'rgba(140,220,255,.55)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,.9)'; ctx.lineWidth = 2.5 * S; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(p.x - R * 0.42, p.y - R * 0.5, R * 0.2, R * 0.09, -0.7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  if(p.magnet > 0){
    ctx.strokeStyle = 'rgba(255,110,140,' + (0.25 + 0.2 * Math.sin(G.time * 8)) + ')'; ctx.lineWidth = 2 * S;
    const r = (46 + (G.time * 60 % 30)) * S; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
  }
}
function text(s, x, y, size, col, align, stroke){
  ctx.font = '800 ' + size + 'px ' + FONT; ctx.direction = /^[\d+x\s/\-]+$/.test(s) ? 'ltr' : 'inherit'; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  if(stroke !== false){ ctx.lineWidth = size * 0.22; ctx.strokeStyle = 'rgba(30,12,70,.85)'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
}
function drawHUD(){
  const p = G.p, top = SA.t + 12, L = Math.max(SA.l, 0) + 12;
  // hearts
  for(let i = 0; i < 3; i++) blit(i < G.lives ? SPR.heart : SPR.heartE, L + 14 * S + i * 27 * S, top + 14 * S, 1.05);
  // coins
  blit(SPR.coin, L + 14 * S, top + 42 * S, 0.95);
  text(String(G.coins), L + 28 * S, top + 43 * S, 19 * S, '#ffe27a', 'left');
  // score + wave
  text(String(G.score), W / 2, top + 16 * S, 26 * S, '#ffffff');
  text(T('الموجة ', 'Wave ', 'Dalga ') + G.wave + ' / ' + WAVES_TOTAL, W / 2, top + 40 * S, 13 * S, '#c7bdf2', 'center');
  // active powers
  let x = L + 14 * S; const y = top + 70 * S;
  const act = [];
  if(p.level > 1) act.push(['power', p.powerT / 15]);
  if(p.shield > 0) act.push(['shield', p.shield / 12]);
  if(p.magnet > 0) act.push(['magnet', p.magnet / 12]);
  if(p.slow > 0) act.push(['slow', p.slow / 7]);
  for(const [k, f] of act){
    blit(SPR.pick[k], x, y, 0.62);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2.5 * S; ctx.beginPath(); ctx.arc(x, y, 13 * S, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(f, 0, 1)); ctx.stroke();
    if(k === 'power') text('x' + p.level, x + 12 * S, y + 10 * S, 11 * S, '#fff', 'center');
    x += 32 * S;
  }
  // boss bar
  const B = G.boss;
  if(B){
    const bw = Math.min(PW * 0.62, 280 * S), bx = W / 2 - bw / 2, by = top + 62 * S, bh = 12 * S;
    text(B.def.name, W / 2, by - 8 * S, 13 * S, '#ffd6ea');
    ctx.fillStyle = 'rgba(20,8,50,.75)'; rr(bx - 3 * S, by - 3 * S + 4 * S, bw + 6 * S, bh + 6 * S, 9 * S); ctx.fill();
    const f = clamp(B.hp / B.max, 0, 1), gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ff5f9a'); gr.addColorStop(1, '#ffb347');
    ctx.fillStyle = gr; if(f > 0){ rr(bx, by + 4 * S, bw * f, bh, 6 * S); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; if(f > 0){ rr(bx + 3 * S, by + 5.5 * S, Math.max(0, bw * f - 6 * S), bh * 0.3, 3 * S); ctx.fill(); }
  }
}
function rr(x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function drawBanner(){
  const b = G.banner; if(!b) return;
  const t = b.t, a = clamp(Math.min(t / 0.2, (b.dur - t) / 0.3), 0, 1), sc = t < 0.25 ? 0.6 + 0.4 * (1 - Math.pow(1 - t / 0.25, 3)) * 1.05 : 1;
  const cy = H * 0.42;
  ctx.globalAlpha = a; ctx.save(); ctx.translate(W / 2, cy); ctx.scale(sc, sc);
  text(b.big, 0, 0, 44 * S, '#ffd84d');
  text(b.small, 0, 36 * S, 18 * S, '#ffffff');
  if(b.stars){
    for(let i = 0; i < 3; i++){
      const st = clamp((t - 0.3 - i * 0.2) / 0.3, 0, 1), on = i < b.stars;
      if(st <= 0) continue;
      const x = (i - 1) * 46 * S, y = -58 * S - (i === 1 ? 8 * S : 0), s = (st < 1 ? 1.3 - 0.3 * st : 1) * st;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      starPath(ctx, 0, 0, 20 * S, 9 * S); ctx.fillStyle = on ? '#ffd84d' : 'rgba(255,255,255,.18)'; ctx.fill();
      ctx.lineWidth = 3 * S; ctx.strokeStyle = on ? '#fff3b8' : 'rgba(255,255,255,.3)'; ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function draw(dt){
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBG(dt);
  let sx = 0, sy = 0; if(G.shake > 0){ sx = rnd(-1, 1) * G.shake * 0.6 * S; sy = rnd(-1, 1) * G.shake * 0.6 * S; }
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  if(G.state === 'menu'){
    for(const e of DEMO.e){ const s = slotPos(e.col, e.row); drawAlienE({ k:e.k, x:s.x, y:s.y + 10 * S, phase:e.phase, flash:0, rot:0 }); }
    drawParts();
    // a rocket idling at the bottom
    if(SPR.ship){ const x = W / 2 + Math.sin(G.time * 0.9) * PW * 0.25, y = H - SA.b - 90 * S + Math.sin(G.time * 2) * 4 * S; drawShip({ x, y, tilt:Math.cos(G.time * 0.9) * 0.15, inv:0, shield:0, magnet:0, dead:false }); }
    return;
  }
  if(!G.p) return;
  // coins, pickups
  for(const c of G.coinsArr){ const sq = Math.abs(Math.cos(c.t * 5 + c.x)); ctx.save(); ctx.translate(c.x, c.y); ctx.scale(0.35 + 0.65 * sq, 1); ctx.drawImage(SPR.coin, -SPR.coin.dw * S / 2, -SPR.coin.dh * S / 2, SPR.coin.dw * S, SPR.coin.dh * S); ctx.restore(); }
  for(const k of G.picks){ blit(SPR.pick[k.kind], k.x, k.y, 1 + Math.sin(k.t * 5) * 0.06); if(Math.random() < 0.15) sparkle(k.x + rnd(-16, 16) * S, k.y + rnd(-16, 16) * S, '#ffffff'); }
  // boss
  const B = G.boss;
  if(B){
    const fr = (G.time % 3.2) < 0.15 ? 2 : Math.floor(G.time * 2.4) % 2, c = B.spr.f[fr];
    const sq = 1 + Math.sin(G.time * 3) * 0.035, angry = B.hp < B.max * 0.5;
    ctx.save(); ctx.translate(B.x + (angry ? Math.sin(G.time * 40) * 1.2 * S : 0), B.y); ctx.scale(sq, 2 - sq); ctx.drawImage(c, -c.dw * S / 2, -c.dh * S / 2, c.dw * S, c.dh * S);
    if(B.flash > 0){ ctx.globalAlpha = 0.35; ctx.drawImage(B.spr.w, -c.dw * S / 2, -c.dh * S / 2, c.dw * S, c.dh * S); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  for(const e of G.enemies) if(e.st !== 'wait' && !(e.dead > 0)) drawAlienE(e);
  // bullets
  ctx.globalCompositeOperation = 'lighter';
  for(const b of G.bullets) blit(b.st ? SPR.bullet2 : SPR.bullet, b.x, b.y, 1, b.st ? G.time * 8 : 0);
  for(const b of G.mbul) blit(SPR.bulletT[b.c & 3], b.x, b.y, 0.92);
  ctx.globalCompositeOperation = 'source-over';
  for(const s of G.eshots) blit(SPR.eshot, s.x, s.y, 1 + Math.sin(s.t * 12) * 0.1);
  if(G.online) drawMates();
  drawShip(G.p);
  drawParts();
  for(const t of G.texts){ ctx.globalAlpha = clamp(1.4 - t.t * 1.3, 0, 1); text(t.s, t.x, t.y, 17 * S, t.col); }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if(slowOn()){ ctx.fillStyle = 'rgba(140,110,255,' + (0.08 + 0.04 * Math.sin(G.time * 4)) + ')'; ctx.fillRect(0, 0, W, H); }
  if(G.p.inv > 2){ ctx.fillStyle = 'rgba(255,80,140,' + ((G.p.inv - 2) * 0.6) + ')'; ctx.fillRect(0, 0, W, H); }
  drawHUD(); drawBanner();
  if(G.online && G.p.ghost && G.state === 'play') text(T('خلّي صاحبك يلمسك! 👻', 'Fly to a friend to come back! 👻', 'Geri dönmek için bir arkadaşına uç! 👻'), W / 2, H - SA.b - 26 * S, 16 * S, '#e6ddff');
}
function drawParts(){
  for(const q of G.parts){
    const f = q.t / q.life;
    if(q.ring){ ctx.globalAlpha = 1 - f; ctx.strokeStyle = q.col; ctx.lineWidth = 3 * S * (1 - f); ctx.beginPath(); ctx.arc(q.x, q.y, q.r + f * 34 * S, 0, TAU); ctx.stroke(); continue; }
    blit(q.spr, q.x, q.y, q.sc * (1 - f * 0.6), q.rot, 1 - f * f);
  }
  ctx.globalAlpha = 1;
}

/* ---------- loop ---------- */
let last = performance.now();
function frame(now){
  let dt = (now - last) / 1000; last = now; if(dt > 0.05) dt = 0.05; if(dt < 0) dt = 0;
  if(G.state !== 'pause' || G.online) update(dt);
  draw(G.state === 'pause' && !G.online ? 0 : dt);
  mpFrame(dt);
  requestAnimationFrame(frame);
}

/* ---------- input ---------- */
const keys = { l:false, r:false, u:false, d:false };
let drag = null;
cv.addEventListener('pointerdown', e => {
  if(G.state !== 'play' || !G.p) return;
  audioInit();
  drag = { id:e.pointerId, sx:e.clientX, sy:e.clientY, px:G.p.tx, py:G.p.ty };
  try{ cv.setPointerCapture(e.pointerId); }catch(_){}
});
cv.addEventListener('pointermove', e => {
  if(!drag || drag.id !== e.pointerId || G.state !== 'play') return;
  const k = 1.15; G.p.tx = drag.px + (e.clientX - drag.sx) * k; G.p.ty = drag.py + (e.clientY - drag.sy) * k;
});
const endDrag = e => { if(drag && drag.id === e.pointerId) drag = null; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
addEventListener('keydown', e => {
  const k = e.key;
  if(k === 'ArrowLeft' || k === 'a') keys.l = true; if(k === 'ArrowRight' || k === 'd') keys.r = true;
  if(k === 'ArrowUp' || k === 'w') keys.u = true; if(k === 'ArrowDown' || k === 's') keys.d = true;
  if((k === 'Escape' || k === 'p') && G.state === 'play') pause(); else if((k === 'Escape' || k === 'p') && G.state === 'pause') resume();
});
addEventListener('keyup', e => {
  const k = e.key;
  if(k === 'ArrowLeft' || k === 'a') keys.l = false; if(k === 'ArrowRight' || k === 'd') keys.r = false;
  if(k === 'ArrowUp' || k === 'w') keys.u = false; if(k === 'ArrowDown' || k === 's') keys.d = false;
});
document.addEventListener('visibilitychange', () => { if(document.hidden && G.state === 'play' && !G.online) pause(); });

/* ---------- screens ---------- */
function show(id){
  ['menu', 'pause', 'end', 'mp'].forEach(n => { $('#' + n).hidden = n !== id; });
  $('#btnPause').hidden = G.state !== 'play';
}
function pause(){
  if(G.state !== 'play') return; G.state = 'pause'; drag = null;
  $('#pauseInfo').textContent = (G.online ? T('اللعبة مكمّلة مع أصحابك 👫', 'The game goes on with your friends 👫', 'Oyun arkadaşlarınla devam ediyor 👫') + '  •  ' : '') + T('الموجة ', 'Wave ', 'Dalga ') + G.wave + '  •  ' + G.score;
  $('#btnRestart').hidden = G.online;
  show('pause');
}
function resume(){ if(G.state !== 'pause') return; G.state = 'play'; last = performance.now(); show(null); sfx('click'); }
function award(){
  if(G.awarded) return 0; G.awarded = true;
  const n = Math.min(COIN_CAP, G.coins);
  if(n > 0){ try{ if(window.World) World.addCoins(n, T('من فضاء بوبو', 'from Bobo Space', 'Bobo Uzay\'dan')); }catch(e){} }
  if(G.score > G.best){ G.best = G.score; store.set('best', G.best); return 2; }
  return 1;
}
function endGame(win, net){
  const cleared = net ? clamp(net.cl | 0, 0, WAVES_TOTAL) : win ? WAVES_TOTAL : G.wave - 1 + (G.phase === 'clear' ? 1 : 0);
  if(net) G.score = Math.max(0, net.sc | 0);
  G.state = win ? 'win' : 'over'; G.banner = null; drag = null;
  const prevBest = G.best, r = award();
  sfx(win ? 'win' : 'over');
  $('#endTitle').textContent = G.online ? (win ? T('فزتوا! خلّصتوا الفضاء سوا 🎉', 'You won together! Space is saved 🎉', 'Birlikte kazandınız! Uzay kurtuldu 🎉') : T('خلصت اللعبة! لعبتوا حلو سوا 👫', 'Game over! Great teamwork 👫', 'Oyun bitti! Harika takım 👫'))
    : win ? T('فزت! خلّصت الفضاء 🎉', 'You won! Space is saved 🎉', 'Kazandın! Uzay kurtuldu 🎉') : T('خلصت اللعبة!', 'Game over!', 'Oyun bitti!');
  let st;
  if(net) st = clamp(net.st | 0, 0, 3);
  else if(win){ const ratio = G.stars / (WAVES_TOTAL * 3); st = ratio >= 0.8 ? 3 : ratio >= 0.55 ? 2 : 1; }
  else st = cleared >= 10 ? 3 : cleared >= 5 ? 2 : cleared >= 1 ? 1 : 0;
  if(G.online && !G.guest){ const m = { k:'end', win:!!win, sc:G.score, cl:cleared, st }; mpSend('ev', m); setTimeout(() => { if(G.online && MP.t) mpSend('ev', m); }, 700); }
  mpEndTeam();
  [...$('#endStars').children].forEach((s, i) => s.classList.toggle('on', i < st));
  $('#newBest').hidden = !(G.score > 0 && G.score > prevBest);
  $('#rScore').textContent = G.score; $('#rBest').textContent = G.best; $('#rWave').textContent = cleared + ' / ' + WAVES_TOTAL;
  $('#rCoins').textContent = '+' + Math.min(COIN_CAP, G.coins) + ' 🪙';
  $('#btnAgain').hidden = G.guest;
  $('#endWait').hidden = !G.guest;
  show('end'); void r;
}
function toMenu(){
  if(G.state === 'pause' || G.state === 'play') award();
  if(MP.t || G.online) mpLeave();
  G.state = 'menu'; G.parts = []; G.p = null; G.online = false; G.guest = false; updateBest(); show('menu');
}
function updateBest(){ $('#bestLine').textContent = G.best > 0 ? T('أحسن نتيجة: ', 'Best score: ', 'En iyi skor: ') + G.best : ''; }

function buildPilots(){
  const box = $('#pilots'); box.innerHTML = '';
  PILOTS.forEach(p => {
    const b = document.createElement('button'); b.className = 'pilot'; b.type = 'button'; b.setAttribute('aria-label', p.name); b.title = p.name;
    b.setAttribute('aria-pressed', String(p.id === G.pilot));
    b.style.backgroundImage = 'url(../worlds/chars/' + p.id + '.png)';
    const size = () => { const B = b.clientWidth || 70, k = B / (p.r * 2.15); b.style.backgroundSize = (p.iw * k) + 'px auto'; b.style.backgroundPosition = (-(p.cx * k - B / 2)) + 'px ' + (-(p.cy * k - B / 2) + 2) + 'px'; };
    b._size = size;
    b.addEventListener('click', () => { G.pilot = p.id; store.set('pilot', p.id); box.querySelectorAll('.pilot').forEach(x => x.setAttribute('aria-pressed', String(x === b))); buildShip(); audioInit(); sfx('click'); });
    box.appendChild(b);
  });
  requestAnimationFrame(() => box.querySelectorAll('.pilot').forEach(b => b._size()));
}

$('#btnPlay').addEventListener('click', () => { startGame(); });
$('#btnAgain').addEventListener('click', () => { if(G.online){ if(!G.guest) mpStart(); } else startGame(); });
$('#btnFriends').addEventListener('click', () => { audioInit(); sfx('click'); mpMenu(); });
$('#btnMenu').addEventListener('click', () => { sfx('click'); toMenu(); });
$('#btnResume').addEventListener('click', resume);
$('#btnRestart').addEventListener('click', () => { award(); startGame(); });
$('#btnPause').addEventListener('click', e => { e.stopPropagation(); pause(); });
$('#btnMute').addEventListener('click', e => { e.stopPropagation(); audioInit(); setMute(!SND.muted); sfx('click'); });
$('#btnExit').onclick = e => { e.preventDefault(); award(); try{ if(MP.t) mpLeave(); }catch(_){} location.href = '../'; };
['pointerdown'].forEach(t => { $('#btnPause').addEventListener(t, e => e.stopPropagation()); $('#btnMute').addEventListener(t, e => e.stopPropagation()); });

addEventListener('resize', () => { resize(); document.querySelectorAll('.pilot').forEach(b => b._size && b._size()); });
resize(); setMute(SND.muted); buildPilots(); updateBest(); show('menu');
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => {});
requestAnimationFrame(frame);

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of 2–4 rockets. Nothing is stored on a server; no names travel, no chat.
   The room owner (host) runs the aliens, waves, boss, enemy shots, pickups and the team score, and sends a snapshot
   ('st', ~10/s, with the host's own rocket in it). Every other phone flies its own rocket and sends 'pos' (~15/s) with the hits
   its own bubbles made ('h'), the pickups it touched ('pk') and how often it got hurt ('hu'); the host checks and applies them.
   Each phone keeps its own hearts (out of hearts = a ghost until a friend touches it or the next wave) and its own coins.
   Events: pos (every player), st (host snapshot), ev (host: start / pick / end).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'st', 'ev'];
const MP_MAX = 4;
const MP_LOCAL = Q.get('mp') === 'local';
const N = n => window.I18N && I18N.num ? I18N.num(n) : String(n);
function loadSupabase(){
  if(window.supabase && window.supabase.createClient) return Promise.resolve();
  if(loadSupabase.p) return loadSupabase.p;
  return (loadSupabase.p = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = '../supabase.js';
    s.onload = () => (window.supabase && window.supabase.createClient) ? res() : rej(new Error('no client'));
    s.onerror = () => { loadSupabase.p = null; s.remove(); rej(new Error('load')); };
    document.head.appendChild(s);
  }));
}
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-space-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
/* ?mp=local: the same room between tabs of one browser (tests) */
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-space-' + code);
    bc.onmessage = e => {
      const m = e.data || {};
      if(m.k === 'hb'){ const old = this.peers.get(m.from), js = JSON.stringify(m.meta); this.peers.set(m.from, { meta:m.meta, js, last:Date.now() }); if(!old || old.js !== js) this.sync(); }
      else if(m.k === 'hello'){ if(this.meta) this.beat(); }
      else if(m.k === 'bye'){ if(this.peers.delete(m.from)) this.sync(); }
      else if(m.k === 'b') h.msg(m.ev, m.p);
    };
    this.iv = setInterval(() => {
      if(this.meta) this.beat();
      const now = Date.now(); let ch = false;
      for(const [k, p] of this.peers) if(now - p.last > 6000){ this.peers.delete(k); ch = true; }
      if(ch) this.sync();
    }, 1000);
    bc.postMessage({ k:'hello', from:id });
    return new Promise(res => setTimeout(() => { this.ready = true; res(); this.sync(); }, 400));
  }
  sync(){
    if(!this.ready || !this.bc) return;
    const list = [...this.peers].map(([k, p]) => Object.assign({}, p.meta, { id:k }));
    if(this.meta) list.push(Object.assign({}, this.meta, { id:this.id }));
    this.h.presence(list);
  }
  beat(){ if(this.bc) this.bc.postMessage({ k:'hb', from:this.id, meta:this.meta }); }
  track(meta){ this.meta = Object.assign({}, meta); this.beat(); setTimeout(() => this.sync(), 0); }
  send(ev, p){ if(this.bc) this.bc.postMessage({ k:'b', ev, p }); }
  close(){ clearInterval(this.iv); if(this.bc){ if(this.meta) this.bc.postMessage({ k:'bye', from:this.id }); this.bc.close(); this.bc = null; } }
}
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, stT:0,
  inviteFor:null, typed:'', slot:0, mates:new Map(), drops:[], hits:[], pk:[], hu:0, hostGone:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okPilot = id => PILOTS.some(p => p.id === id) ? id : 'sara';
const pilotOf = id => PILOTS.find(p => p.id === id) || PILOTS[1];
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'space';
let frRoomCode = null, frRoomIv = 0;
function frRoom(code){
  try{
    if(!(window.Friends && Friends.has()) || code === frRoomCode) return;
    clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = code;
    const safe = f => { try{ const p = f(); if(p && p.catch) p.catch(() => {}); }catch(e){} };
    if(code){ const beat = () => safe(() => Friends.setRoom(code, FR_GAME)); beat(); frRoomIv = setInterval(beat, 60000); }
    else safe(() => Friends.setRoom(null));
  }catch(e){}
}
addEventListener('pagehide', () => { try{ if(MP.t) mpLeave(); }catch(e){} try{ if(frRoomCode && window.Friends){ clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = null; Friends.setRoom(null, null, true); } }catch(e){} });
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0; MP.mates.clear();
}
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || mpNewId();
  const live = () => MP.t === t && MP.tok === tok;
  try{
    await t.open(code, MP.id, {
      presence:list => { if(live()) mpPresence(list); },
      msg:(ev, p) => { if(live() && p && typeof p === 'object') mpMsg(ev, p); },
      status:s => { if(live() && s === 'up') mpTrack(); }
    });
  }catch(e){ if(live()) mpClose(); throw e; }
  if(!live()) throw new Error('cancelled');
  const t0 = performance.now();
  // the server only sends the room's member list after we track something: send a short 'probe' first, then wait for the list
  t.track({ ph:'probe' });
  await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
  if(MP.synced) await new Promise(r => setTimeout(r, 300));
  if(!live()) throw new Error('cancelled');
  const others = MP.list.filter(p => p.id !== MP.id);
  if(how === 'create' && others.length){ mpClose(); return 'busy'; }
  if(how === 'join' && !others.length){ mpClose(); return 'nobody'; }
  if(others.length >= MP_MAX){ mpClose(); return 'full'; }
  const used = new Set(others.map(p => p.c)); let c = 0; while(used.has(c)) c++;
  MP.slot = c;
  MP.meta = { fc:window.BoboRT ? BoboRT.fc() : undefined, pl:G.pilot, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.pl = G.pilot; MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpNamesIn(){ mpLobbyDraw(); if(G.state === 'over' || G.state === 'win') mpEndTeam(); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  if(window.BoboRT) BoboRT.see(list, mpNamesIn);
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ if(!MP.hostGone) MP.hostGone = performance.now(); }
  else MP.hostGone = 0;
  for(const id of [...MP.mates.keys()]) if(!MP.players.some(p => p.id === id)) MP.mates.delete(id);
  if(before.length){
    const came = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id)), left = before.filter(id => id !== MP.id && id !== MP.hostId && !MP.players.some(p => p.id === id));
    if(came.length){ sfx('coin'); if(G.online && G.state === 'play') toast('👫 ' + T('صاحبك فات!', 'A friend joined!', 'Bir arkadaşın geldi!')); }
    else if(left.length && G.online && G.state === 'play') toast('👋 ' + T('صاحبك طلع', 'A friend left', 'Bir arkadaşın çıktı'));
  }
  if(MP.screen === 'lobby') mpLobbyDraw();
}
function mpCrew(){ return Math.max(1, Math.min(MP_MAX, MP.players.length || 1)); }

/* ---------- friends' rockets ---------- */
function mateOf(id){
  let m = MP.mates.get(id);
  if(!m){ m = { id, x:0, y:0, nx:500, ny:800, tilt:0, lv:1, g:false, sh:false, iv:false, sl:false, lf:3, last:0, fcd:Math.random() * 0.17, fresh:true }; MP.mates.set(id, m); }
  return m;
}
function mateFrom(id, q){
  if(!q || typeof q !== 'object' || id === MP.id || !MP.players.some(p => p.id === id)) return null;
  const m = mateOf(id);
  m.nx = clamp(+q.x || 0, 0, 1000); m.ny = clamp(+q.y || 0, 0, 1000);
  if(m.fresh || !m.last || performance.now() - m.last > 4000){ m.x = FX(m.nx); m.y = FY(m.ny); m.fresh = false; }
  m.lv = clamp(q.lv | 0, 1, 3); m.g = !!q.g; m.sh = !!q.sh; m.iv = !!q.iv; m.sl = !!q.sl; m.lf = clamp(q.lf | 0, 0, 3);
  m.last = performance.now();
  return m;
}
function mates(){ const now = performance.now(); return [...MP.mates.values()].filter(m => now - m.last < 4000); }
function mateMeta(m){ const pr = MP.players.find(p => p.id === m.id); return { pl:okPilot(pr && pr.pl), c:pr ? clamp(pr.c | 0, 0, 3) : 1 }; }
/* the label under a friend's rocket: the saved name from the server (../rt.js), else the pilot's name */
function mateLabel(m){ const fb = pilotOf(mateMeta(m).pl).name; return window.BoboRT ? BoboRT.who(m.id, fb) : fb; }
function anyAlive(){ return !out(G.p) || (G.online && mates().some(m => !m.g)); }
function living(){ const l = []; if(!out(G.p)) l.push(G.p); if(G.online) mates().forEach(m => { if(!m.g) l.push(m); }); return l; }
function nearestLiving(x, y){ const l = living(); let b = G.p, bd = Infinity; for(const q of l){ const d = Math.hypot(q.x - x, q.y - y); if(d < bd){ bd = d; b = q; } } return b; }
function pickLiving(){ const l = living(); return l.length ? l[Math.floor(Math.random() * l.length)] : G.p; }
function updateMates(dt){
  const k = 1 - Math.exp(-dt * 14), fire = G.phase !== 'clear';
  for(const m of mates()){
    const ox = m.x; m.x = lerp(m.x, FX(m.nx), k); m.y = lerp(m.y, FY(m.ny), k);
    m.tilt = lerp(m.tilt, clamp((m.x - ox) / Math.max(dt, 0.001) / (900 * S), -0.35, 0.35), 1 - Math.exp(-dt * 10));
    m.fcd -= dt;
    if(m.fcd <= 0){ m.fcd = 0.17; if(fire && !m.g) shoot(G.mbul, m.x, m.y, m.lv, mateMeta(m).c); }
    // a living friend touching my ghost brings me back
    if(G.p && G.p.ghost && !m.g && Math.hypot(m.x - G.p.x, m.y - G.p.y) < 52 * S) revive();
  }
  // friends' bubbles are only for the eyes (each phone claims its own hits): they pop on whatever they touch
  moveBullets(G.mbul, dt);
  for(let j = G.mbul.length - 1; j >= 0; j--){
    const b = G.mbul[j]; let hit = false;
    for(const e of G.enemies){ if(e.st === 'wait' || e.dead) continue; if(Math.abs(b.x - e.x) < e.T.r * 1.05 * S && Math.abs(b.y - e.y) < e.T.r * 1.1 * S){ hit = true; break; } }
    const B = G.boss; if(!hit && B){ const dx = (b.x - B.x) / (B.def.r * 0.95 * S), dy = (b.y - B.y) / (B.def.r * 0.9 * S); hit = dx * dx + dy * dy < 1; }
    if(hit){ G.mbul.splice(j, 1); if(Math.random() < 0.5) sparkle(b.x, b.y, '#ffffff'); }
  }
  if(G.mbul.length > 160) G.mbul.splice(0, G.mbul.length - 160);
}
function drawMates(){
  for(const m of mates()){
    const mm = mateMeta(m);
    drawShip({ x:m.x, y:m.y, tilt:m.tilt, inv:m.iv ? 1 + G.time % 1 : 0, shield:m.sh ? 5 : 0, magnet:0, dead:false, ghost:m.g, spr:shipFor(mm.pl) });
    // the name is drawn as canvas text (it comes from the server, never from the friend's phone)
    const y = m.y + 64 * S;
    ctx.globalAlpha = m.g ? 0.6 : 1;
    text(mateLabel(m), m.x, y, 13 * S, MATE_COLS[mm.c]);
    for(let i = 0; i < 3; i++) blit(i < m.lf ? SPR.heart : SPR.heartE, m.x + (i - 1) * 12 * S, y + 15 * S, 0.48);
    ctx.globalAlpha = 1;
  }
}
const myPos = () => { const p = G.p; return { x:NX(p.x), y:NY(p.y), lv:p.level, g:p.ghost ? 1 : 0, sh:p.shield > 0 ? 1 : 0, iv:p.inv > 0 ? 1 : 0, sl:p.slow > 0 ? 1 : 0, lf:G.lives }; };

/* ---------- host: snapshot out, friends' claims in ---------- */
function snap(){
  const e = [];
  for(const q of G.enemies){ if(q.st === 'wait') continue; e.push([q.id, q.k, NX(q.x), NY(q.y), Math.round(q.rot * 100), (q.flash > 0 ? 1 : 0) | (q.st === 'dive' || q.st === 'enter' ? 2 : 0)]); }
  const B = G.boss;
  return {
    w:G.wave, ph:G.phase[0], sc:G.score, st:G.waveStars[G.waveStars.length - 1] || 0, sl:slowOn() ? 1 : 0, e,
    s:G.eshots.map(q => [q.id, NX(q.x), NY(q.y), Math.round(q.vx / PW * 1000), Math.round(q.vy / H * 1000)]),
    k:G.picks.map(q => [q.id, q.kind, NX(q.x), NY(q.y)]),
    cd:MP.drops.splice(0),
    b:B ? [NX(B.x), NY(B.y), B.hp, B.max, B.idx, B.st === 'fight' ? 1 : 0, B.flash > 0 ? 1 : 0] : 0,
    p:myPos()
  };
}
function hostTakes(from, q, m){
  if(!G.online || G.guest || (G.state !== 'play' && G.state !== 'pause')) return;
  if(Array.isArray(q.h)) for(const r of q.h.slice(0, 24)){
    if(!Array.isArray(r)) continue;
    const eid = r[0] | 0;
    if(eid === -1){ const n = clamp(r[1] | 0, 1, 6); for(let i = 0; i < n && G.boss; i++) if(hitBoss(G.boss.x + rnd(-20, 20) * S, G.boss.y + rnd(0, 25) * S)) break; continue; }
    const i = G.enemies.findIndex(e => e.id === eid && e.st !== 'wait'); if(i < 0) continue;
    const e = G.enemies[i]; e.hp -= clamp(r[1] | 0, 1, 9); e.flash = 0.09;
    if(e.hp <= 0) killEnemy(e, i); else sfx('hit');
  }
  if(Array.isArray(q.pk)) for(const id of q.pk.slice(0, 6)){
    const i = G.picks.findIndex(k => k.id === (id | 0)); if(i < 0) continue;
    const k = G.picks.splice(i, 1)[0]; G.score += 50; burst(m.x, m.y - 10 * S, '#ffd84d', 8, 0.7);
    mpSend('ev', { k:'pick', to:from, kind:k.kind });
  }
  if(q.hu > 0){ G.hitsWave += clamp(q.hu | 0, 1, 5); G.eshots = G.eshots.filter(s => Math.hypot(s.x - m.x, s.y - m.y) > 160 * S); }
}

/* ---------- guest: the host's snapshot in, my rocket and my claims out ---------- */
function claimHit(id, n){ const h = MP.hits.find(x => x[0] === id); if(h) h[1] += n; else if(MP.hits.length < 24) MP.hits.push([id, n]); }
function applySnap(q){
  const now = performance.now();
  if(q.p) mateFrom(MP.hostId, q.p);
  const w = clamp(q.w | 0, 1, WAVES_TOTAL), ph = { i:'intro', f:'fight', c:'clear' }[q.ph] || 'fight';
  if(w !== G.wave || ph !== G.phase){
    if(w !== G.wave && G.wave > 0 && G.p.ghost) revive();     // a new wave brings everybody back
    G.wave = w; G.phase = ph; G.phaseT = 0;
    if(ph === 'intro') waveBanner(w);
    else if(ph === 'clear'){ clearBanner(w, clamp(q.st | 0, 1, 3)); G.coinsArr.forEach(c => c.pull = true); }
  }
  G.score = Math.max(0, +q.sc | 0); G.netSlow = !!q.sl;
  // aliens: keep the same objects by id and glide them; the ones that are gone popped
  const old = new Map(G.enemies.map(e => [e.id, e])), list = [];
  for(const r of (Array.isArray(q.e) ? q.e.slice(0, 90) : [])){
    if(!Array.isArray(r)) continue;
    const id = r[0] | 0, k = TYPES[r[1]] ? r[1] : 'b', x = clamp(+r[2] || 0, -300, 1300), y = clamp(+r[3] || 0, -300, 1300);
    let e = old.get(id);
    if(e){
      old.delete(id);
      const d = Math.max(0.05, (now - e.sAt) / 1000);
      if(Math.abs(y - e.sy) > 250 || Math.abs(x - e.sx) > 250){ e.vx = e.vy = 0; e.x = FX(x); e.y = FY(y); }   // came back in from the top
      else { e.vx = clamp((x - e.sx) / d, -2500, 2500); e.vy = clamp((y - e.sy) / d, -2500, 2500); }
    } else { e = { id, k, T:TYPES[k], phase:rnd(0, 9), flash:0, rot:0, trot:0, vx:0, vy:0, dead:0, st:'net', x:FX(x), y:FY(y) }; }
    e.sx = x; e.sy = y; e.sAt = now; e.trot = clamp((r[4] | 0) / 100, -1, 1); if(r[5] & 1) e.flash = Math.max(e.flash, 0.06); e.danger = !!(r[5] & 2);
    list.push(e);
  }
  for(const e of old.values()) if(!(e.dead > 0) && e.y < H * 0.97 && e.y > -10){ burst(e.x, e.y, e.T.col, 11); sfx('pop'); G.shake = Math.max(G.shake, 2.5); }
  G.enemies = list;
  // boss
  if(Array.isArray(q.b)){
    const ix = clamp(q.b[4] | 0, 0, BOSSES.length - 1);
    let B = G.boss; if(!B || B.idx !== ix) B = G.boss = { def:BOSSES[ix], spr:SPR.boss[ix], idx:ix, x:FX(q.b[0]), y:FY(q.b[1]), t:0, flash:0 };
    B.sx = clamp(+q.b[0] || 0, -300, 1300); B.sy = clamp(+q.b[1] || 0, -300, 1300); B.max = clamp(q.b[3] | 0, 1, 9999); B.hp = clamp(q.b[2] | 0, 0, B.max);
    B.st = q.b[5] ? 'fight' : 'enter'; if(q.b[6]) B.flash = Math.max(B.flash, 0.05);
  } else if(G.boss){
    const B = G.boss; G.boss = null; sfx('boom'); G.shake = 16;
    for(let i = 0; i < 5; i++) burst(B.x + rnd(-40, 40) * S, B.y + rnd(-30, 30) * S, i % 2 ? '#ffd84d' : B.def.col, 14, 1.4);
    ftext(B.x, B.y, '+' + 5000 * (B.idx + 1), '#ffe27a');
  }
  // enemy shots (each phone checks the hits on its own rocket)
  const oldS = new Map(G.eshots.map(s => [s.id, s])), sh = [];
  for(const r of (Array.isArray(q.s) ? q.s.slice(0, 60) : [])){
    if(!Array.isArray(r)) continue;
    const id = r[0] | 0; if(G.gone.has(id)) continue;
    const s = oldS.get(id) || { id, t:0 };
    s.vx = clamp(+r[3] || 0, -2000, 2000) / 1000 * PW; s.vy = clamp(+r[4] || 0, -2000, 2000) / 1000 * H;
    s.x = FX(r[1]) + s.vx * 0.04; s.y = FY(r[2]) + s.vy * 0.04;
    sh.push(s);
  }
  G.eshots = sh;
  if(G.gone.size > 400) G.gone = new Set([...G.gone].slice(-200));
  // pickups
  const oldK = new Map(G.picks.map(k => [k.id, k])), pk = [];
  for(const r of (Array.isArray(q.k) ? q.k.slice(0, 20) : [])){
    if(!Array.isArray(r) || !PICK[r[1]]) continue;
    const id = r[0] | 0; if(G.claimed.has(id)) continue;
    const k = oldK.get(id) || { id, kind:r[1], t:0, x:FX(r[2]), y:FY(r[3]) }; k.tx = FX(r[2]); k.ty = FY(r[3]); pk.push(k);
  }
  G.picks = pk;
  // my own copy of the coins that fell
  for(const r of (Array.isArray(q.cd) ? q.cd.slice(0, 40) : [])) if(Array.isArray(r)) dropCoins(FX(r[0]), FY(r[1]), clamp(r[2] | 0, 1, 15));
}
function updateGuest(dt, edt){
  const p = G.p;
  movePlayer(dt);
  updateMates(dt);
  G.phaseT += dt;
  if(G.banner){ G.banner.t += dt; if(G.banner.t > G.banner.dur) G.banner = null; }
  moveBullets(G.bullets, dt);
  const now = performance.now(), k = 1 - Math.exp(-dt * 16);
  for(const e of G.enemies){
    e.flash = Math.max(0, e.flash - dt); if(e.dead > 0) e.dead -= dt;
    const age = Math.min(0.25, (now - e.sAt) / 1000);
    e.x = lerp(e.x, FX(e.sx + e.vx * age), k); e.y = lerp(e.y, FY(e.sy + e.vy * age), k); e.rot = lerp(e.rot, e.trot, k);
    if(e.dead > 0) continue;
    // my bubbles: show the hit at once and claim it, the host keeps the score
    for(let j = G.bullets.length - 1; j >= 0; j--){
      const b = G.bullets[j];
      if(Math.abs(b.x - e.x) < e.T.r * 1.05 * S && Math.abs(b.y - e.y) < e.T.r * 1.1 * S){ G.bullets.splice(j, 1); e.flash = 0.09; sfx('hit'); sparkle(b.x, b.y, '#ffffff'); claimHit(e.id, 1); }
    }
    if(!out(p) && e.danger && Math.hypot(e.x - p.x, e.y - p.y) < (e.T.r * 0.8 + 14) * S){ hurtPlayer(); claimHit(e.id, 9); e.dead = 1.2; burst(e.x, e.y, e.T.col, 11); sfx('pop'); }
  }
  const B = G.boss;
  if(B){
    B.flash = Math.max(0, B.flash - dt);
    B.x = lerp(B.x, FX(B.sx), k); B.y = lerp(B.y, FY(B.sy), k);
    const rx = B.def.r * 0.95 * S, ry = B.def.r * 0.9 * S;
    for(let j = G.bullets.length - 1; j >= 0; j--){
      const b = G.bullets[j], dx = (b.x - B.x) / rx, dy = (b.y - B.y) / ry;
      if(dx * dx + dy * dy < 1){ G.bullets.splice(j, 1); if(B.st === 'fight'){ B.flash = 0.07; sparkle(b.x, b.y, '#ffffff'); sfx('bosshit'); claimHit(-1, 1); } }
    }
    if(!out(p)){ const dx = (p.x - B.x) / (rx + 12 * S), dy = (p.y - B.y) / (ry + 12 * S); if(dx * dx + dy * dy < 1) hurtPlayer(); }
  }
  for(let i = G.eshots.length - 1; i >= 0; i--){
    const s = G.eshots[i]; s.t += edt; s.x += s.vx * edt; s.y += s.vy * edt;
    if(s.y > H + 20 || s.y < -40 || s.x < -20 || s.x > W + 20){ G.eshots.splice(i, 1); continue; }
    if(!out(p) && Math.hypot(s.x - p.x, s.y - (p.y - 2 * S)) < (p.shield > 0 ? 34 : 13) * S){ G.eshots.splice(i, 1); G.gone.add(s.id); hurtPlayer(); }
  }
  for(let i = G.picks.length - 1; i >= 0; i--){
    const q = G.picks[i]; q.t += dt;
    q.x = lerp(q.x, q.tx, k); q.y = lerp(q.y, q.ty + 75 * S * 0.06, k);
    if(!out(p) && Math.hypot(q.x - p.x, q.y - p.y) < 40 * S){ G.picks.splice(i, 1); G.claimed.add(q.id); if(MP.pk.length < 6) MP.pk.push(q.id); }
  }
  updateCoins(dt);
  updateParts(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
}
function mpMsg(ev, p){
  const from = String(p.id || '');
  if(!from || from === MP.id || !MP.meta) return;
  if(ev === 'pos'){ const m = mateFrom(from, p); if(m && MP.isHost) hostTakes(from, p, m); return; }
  if(from !== MP.hostId || MP.isHost) return;      // only the room owner runs the game
  if(ev === 'st'){
    const inRun = G.online && G.guest && (G.state === 'play' || G.state === 'pause');
    if(!inRun){
      // a late joiner (or a friend still looking at the last end card) comes in at the current wave
      if(MP.screen === 'lobby' || (G.online && (G.state === 'over' || G.state === 'win'))) mpBeginGuest(); else return;
    }
    applySnap(p);
  } else if(ev === 'ev'){
    if(p.k === 'start'){ if(MP.screen === 'lobby' || G.online) mpBeginGuest(); }
    else if(p.k === 'pick'){ if(p.to === MP.id && G.guest && G.p && PICK[p.kind] && !out(G.p)) takePick(p.kind); }
    else if(p.k === 'end'){ if(G.guest && (G.state === 'play' || G.state === 'pause')) endGame(!!p.win, p); }
  }
}
function mpBeginGuest(){
  MP.screen = 'in'; startGame('guest'); G.wave = 0;
}
function mpStart(){
  if(!MP.isHost || !mpActive()) return;
  MP.screen = 'in'; MP.mates.clear();
  mpSend('ev', { k:'start' });
  startGame('host');
}
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 3000){ MP.hostGone = 0; hostLeft(); return; }
  MP.sendT -= dt; MP.stT -= dt;
  if(!(G.online && G.p && (G.state === 'play' || G.state === 'pause'))) return;
  if(G.guest){
    if(MP.sendT <= 0){
      MP.sendT = 1 / 15; const m = myPos();
      if(MP.hits.length){ m.h = MP.hits; MP.hits = []; }
      if(MP.pk.length){ m.pk = MP.pk; MP.pk = []; }
      if(MP.hu){ m.hu = MP.hu; MP.hu = 0; }
      mpSend('pos', m);
    }
  } else if(MP.stT <= 0){ MP.stT = 0.1; mpSend('st', snap()); }
}
function hostLeft(){
  toMenu();
  toast('🚪 ' + T('صاحب الغرفة طلع — رجعنا عالقائمة', 'The room owner left — back to the menu', 'Oda sahibi çıktı — menüye döndük'), 4500);
}
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; }

/* ---------- small toast ---------- */
let toastT = 0;
function toast(msg, ms){
  const el = $('#toast'); if(!el) return;
  el.textContent = msg; el.hidden = false; clearTimeout(toastT);
  toastT = setTimeout(() => { el.hidden = true; }, ms || 3000);
}

/* ---------- room screens: menu, keypad, connecting, error, lobby ---------- */
const mpCard = () => $('#mpCard');
function faceCss(pid, B){
  const p = pilotOf(okPilot(pid)), k = B / (p.r * 2.15);
  return 'background-image:url(../worlds/chars/' + p.id + '.png);background-size:' + (p.iw * k).toFixed(1) + 'px auto;background-position:' + (-(p.cx * k - B / 2)).toFixed(1) + 'px ' + (-(p.cy * k - B / 2) + 2).toFixed(1) + 'px';
}
function mpShow(screen){ MP.screen = screen; G.state = 'menu'; G.online = false; G.guest = false; G.p = null; show('mp'); }
function mpMenu(){
  MP.tok++; mpClose(); mpShow('menu');
  const me = pilotOf(G.pilot);
  mpCard().innerHTML = `<h2>👫 ${T('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🚀 ${T('لحتى 4 لاعبين، كل واحد بصاروخو، وبتفرقعوا الكائنات سوا!', 'Up to 4 players, each with a rocket — pop the blobs together!', '4 oyuncuya kadar, herkesin bir roketi var — yaratıkları birlikte patlatın!')}</p>
    <div class="mp-me"><span class="face" style="${faceCss(me.id, 64)}"></span><b></b></div>
    <div class="row"><button class="big-btn sm" id="bCreate">🏠 ${T('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn sm mint" id="bJoin">🔢 ${T('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  mpCard().querySelector('.mp-me b').textContent = me.name;
  $('#bCreate').onclick = () => { sfx('click'); mpCreate(); };
  $('#bJoin').onclick = () => { sfx('click'); mpKeypad(''); };
  $('#bBack').onclick = () => { sfx('click'); mpBack(); };
}
function mpBack(){ mpLeave(); G.state = 'menu'; show('menu'); }
function mpConnecting(){
  mpShow('connecting');
  mpCard().innerHTML = `<div class="bigicon spin">⏳</div><h2>${T('عم نتصل…', 'Connecting…', 'Bağlanıyor…')}</h2>
    <button class="ghost-btn" id="bCancel">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  $('#bCancel').onclick = () => { sfx('click'); mpMenu(); };
}
function mpError(retry){
  mpShow('error');
  mpCard().innerHTML = `<div class="bigicon">📡</div><h2>${T('ما في إنترنت؟ جرّب كمان مرة', 'No internet? Try again', 'İnternet yok mu? Tekrar dene')}</h2>
    <div class="row"><button class="big-btn sm" id="bRetry">🔄 ${T('جرّب كمان مرة', 'Try again', 'Tekrar dene')}</button><button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bRetry').onclick = () => { sfx('click'); retry(); };
  $('#bBack').onclick = () => { sfx('click'); mpMenu(); };
}
/* the room's waiting card: which room, who is here, and (for the owner) «ابدأ» */
function mpLobby(){
  if(!mpActive()){ mpMenu(); return; }
  mpShow('lobby'); mpLobbyDraw();
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || !mpActive()) return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => {
    const p = pl[i]; if(!p) return `<div class="slot empty"><span class="face"></span><small>…</small></div>`;
    const me = p.id === MP.id, c = clamp(p.c | 0, 0, 3), nm = me ? T('إنت', 'You', 'Sen') : (window.BoboRT ? BoboRT.whoH(p.id, '') : '');
    return `<div class="slot" style="--c:${MATE_COLS[c]}"><span class="face" style="${faceCss(p.pl, 60)}"></span><span class="nm" dir="auto">${me ? nm : ('👫 ' + nm).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`;
  }).join('');
  const n = pl.length;
  mpCard().innerHTML = `<h2>🏠 ${T('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <p>${T('قول لصاحبك هالرقم ليفوت', 'Tell your friend this number to join', 'Arkadaşına bu numarayı söyle')}</p>
    <div class="slots">${slots}</div>
    ${MP.isHost ? `<p class="mp-msg">${n < 2 ? T('استنّى أصحابك يفوتوا…', 'Wait for your friends to join…', 'Arkadaşlarının gelmesini bekle…') : T('جاهزين؟ يلّا!', 'Ready? Go!', 'Hazır mısınız? Haydi!')}</p>
      <div class="row"><button class="big-btn sm" id="bStart"${n < 2 ? ' disabled' : ''}>▶️ ${T('ابدأ', 'Start', 'Başla')}</button><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p class="mp-msg">${T('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row"><button class="ghost-btn" id="bLeave">🚪 ${T('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){ const b = $('#bStart'); b.onclick = () => { if(MP.players.length < 2) return; sfx('click'); mpStart(); }; }
  $('#bLeave').onclick = () => { sfx('click'); mpLeave(); mpMenu(); };
}
/* the friends' faces and names on the end card */
function mpEndTeam(){
  const el = $('#endTeam'); if(!el) return;
  if(!G.online || !MP.players.length){ el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = MP.players.map(p => {
    const me = p.id === MP.id, c = clamp(p.c | 0, 0, 3);
    const nm = me ? T('إنت', 'You', 'Sen') : (window.BoboRT ? BoboRT.whoH(p.id, pilotOf(okPilot(p.pl)).name) : '');
    return `<div class="slot" style="--c:${MATE_COLS[c]}"><span class="face" style="${faceCss(p.pl, 48)}"></span><span class="nm" dir="auto">${nm}</span></div>`;
  }).join('');
}
async function mpCreate(want){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate()); }
}
async function mpJoin(code, until){
  mpConnecting();
  try{
    let r = await mpOpen(code, 'join');
    if(MP.screen !== 'connecting') return;
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpen(code, 'join'); if(MP.screen !== 'connecting') return;
    }
    if(r === 'ok') mpLobby();
    else if(r === 'full') mpKeypad(T('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(T('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'space' yet: guarded. */
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  const no = () => toast(T('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
  try{
    Promise.resolve(Friends.invite(who, MP.code, FR_GAME)).then(r => {
      if(r && r.status === 'sent') toast(T('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else no();
    }, no);
  }catch(e){}
}
function mpKeypad(msg){
  mpShow('keypad'); MP.typed = '';
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  mpCard().innerHTML = `<h2>🔢 ${T('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg"></p>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${T('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${T('تمام', 'OK', 'Tamam')}">✅</button></div>
    <button class="ghost-btn" id="bBack">↩️ ${T('رجوع', 'Back', 'Geri')}</button>`;
  $('#kpMsg').textContent = msg || '';
  mpCard().querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { sfx('click'); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); sfx('click'); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else sfx('hit'); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; sfx('click'); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(MP.screen !== 'keypad' || G.state !== 'menu') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});
/* the big «رجوع» button */
function goBack(){
  if(G.state === 'menu'){
    if(MP.screen === 'lobby'){ mpLeave(); mpMenu(); }
    else if(MP.screen !== 'off' && MP.screen !== 'in') mpBack();
    else location.href = '../';
  } else toMenu();
}

/* test / debug hooks (no UI) */
window.__space = {
  get state(){ return G.state; }, G, toMenu, startGame, pause, resume,
  killAll(){ for(let i = G.enemies.length - 1; i >= 0; i--){ const e = G.enemies[i]; if(e.st !== 'wait') killEnemy(e, i); } },
  give(k){ dropPick(G.p.x, G.p.y - 60 * S, k); },
  hurt(){ G.p.inv = 0; hurtPlayer(); },
  /* online */
  get mpScreen(){ return MP.screen; }, back:goBack,
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, screen:MP.screen, id:MP.id, hostId:MP.hostId, players:MP.players.map(p => ({ id:p.id, pl:p.pl, c:p.c })) }; },
  mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c), mpStart:() => mpStart(), mpMenu:() => mpMenu(),
  get online(){ return { on:G.online, guest:G.guest }; },
  get mates(){ return mates().map(m => ({ id:m.id, x:m.nx, y:m.ny, sx:NX(m.x), sy:NY(m.y), g:m.g, lf:m.lf, label:mateLabel(m), pl:mateMeta(m).pl })); },
  get me(){ const p = G.p; return p ? { x:NX(p.x), y:NY(p.y), ghost:p.ghost, lives:G.lives, coins:G.coins } : null; },
  aliens(){ return G.enemies.filter(e => e.st !== 'wait' && !(e.dead > 0)).map(e => ({ id:e.id, k:e.k, x:NX(e.x), y:NY(e.y) })); },
  moveTo(nx, ny){ if(G.p){ G.p.tx = FX(nx); G.p.ty = FY(ny); } },
  claim(id, n){ claimHit(id, n || 9); },
  boss(){ const B = G.boss; return B ? { hp:B.hp, max:B.max, idx:B.idx, st:B.st, x:NX(B.x), y:NY(B.y) } : null; }
};
/* links: ?host=1[&room=1234][&invite=<friendCode>] makes a room, ?join=1234 joins one (tries for 20 s) */
(function(){
  const join = Q.get('join'), host = Q.get('host') === '1', inv = Q.get('invite'), room = Q.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(room); }
})();
})();
