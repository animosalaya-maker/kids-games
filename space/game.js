/* Bobo Space («فضاء بوبو»): portrait fixed-formation shooter, 2D canvas, everything drawn in code.
   States: menu → play ⇄ pause → over/win. 15 waves, a boss every 5th wave. Test params: ?wave=N (start wave). */
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
PILOTS.forEach(p => { const im = new Image(); im.onload = () => { if(G.pilot === p.id) buildShip(); }; im.src = '../worlds/chars/' + p.id + '.png'; IMGS[p.id] = im; });

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
  const P = PILOTS.find(p => p.id === G.pilot) || PILOTS[1], im = IMGS[P.id];
  SPR.ship = mk(64, 76, g => {
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
  SPR.shipW = whiten(SPR.ship);
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
  fireCd:0, diveCd:2, shotCd:2, kills:0, waveCount:0, dropAt:[], banner:null, awarded:false, best:store.get('best', 0), endT:0
};
if(!PILOTS.some(p => p.id === G.pilot)) G.pilot = 'sara';

function newPlayer(){ return { x:OX + PW / 2, y:H - SA.b - 110 * S, tx:OX + PW / 2, ty:H - SA.b - 110 * S, inv:0, level:1, powerT:0, shield:0, magnet:0, slow:0, dead:false, tilt:0 }; }
function startGame(){
  audioInit();
  const w0 = clamp(parseInt(Q.get('wave'), 10) || 1, 1, WAVES_TOTAL);
  Object.assign(G, { state:'play', score:0, coins:0, lives:3, stars:0, waveStars:[], enemies:[], bullets:[], eshots:[], picks:[], coinsArr:[], parts:[], texts:[], boss:null, awarded:false, shake:0, endT:0 });
  G.p = newPlayer(); startWave(w0);
  show(null); try{ if(window.World) World.track('play', 'space'); }catch(e){}
}
function startWave(n){
  G.wave = n; G.phase = 'intro'; G.phaseT = 0; G.hitsWave = 0; G.kills = 0;
  const wv = WAVES[n - 1];
  G.banner = { t:0, big:wv.boss != null ? T('الزعيم جاي!', 'Boss time!', 'Patron geliyor!') : T('الموجة ' + n, 'Wave ' + n, 'Dalga ' + n), small:wv.boss != null ? BOSSES[wv.boss].name : T('فرقعهم كلهم!', 'Pop them all!', 'Hepsini patlat!'), dur:1.7 };
  if(wv.boss != null) sfx('boss');
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
      const e = { k:row[c], T:t, hp:t.hp + (G.wave > 10 && row[c] !== 'z' ? 1 : 0), col:c, row:rIndex + (wv.boss != null ? 4 : 0), x:-100, y:-100, st:'wait', t:0,
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
    G.boss = { def:B, spr:SPR.boss[wv.boss], idx:wv.boss, x:OX + PW / 2, y:-120 * S, hp:B.hp, max:B.hp, t:0, st:'enter', patT:2.5, pat:0, flash:0 };
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
function dropCoins(x, y, n){ for(let i = 0; i < n; i++) G.coinsArr.push({ x:x + rnd(-8, 8) * S, y, vx:rnd(-60, 60) * S, vy:rnd(-140, -40) * S, t:0 }); }

/* ---------- player hit / kill ---------- */
function hurtPlayer(){
  const p = G.p; if(p.inv > 0 || p.dead || G.state !== 'play') return;
  if(p.shield > 0){ p.shield = 0; p.inv = 1.2; sfx('shieldpop'); burst(p.x, p.y, '#6cc0ff', 14); G.shake = Math.max(G.shake, 5); return; }
  G.lives--; G.hitsWave++; p.inv = 2.3; p.level = Math.max(1, p.level - 1); sfx('hurt'); G.shake = 12;
  burst(p.x, p.y, '#ff7aa8', 16);
  G.eshots = G.eshots.filter(s => Math.hypot(s.x - p.x, s.y - p.y) > 160 * S);
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
  G.picks.push({ kind, x:clamp(x, OX + 30 * S, OX + PW - 30 * S), y, t:0 });
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
  G.score += 50;
}

/* ---------- update ---------- */
function enemyFire(x, y, aim){
  if(G.eshots.length >= 4 + Math.min(8, G.wave)) return;
  const sp = (125 + Math.min(G.wave, 14) * 6) * S;
  let vx = 0; if(aim){ const dx = G.p.x - x, dy = Math.max(60 * S, G.p.y - y); vx = clamp(dx / dy, -0.45, 0.45) * sp; }
  G.eshots.push({ x, y:y + 10 * S, vx, vy:sp, t:0 });
}
function update(dt){
  G.time += dt;
  const p = G.p, es = p && p.slow > 0 ? 0.45 : 1, edt = dt * es;
  G.ft += edt;
  G.warp = lerp(G.warp, (G.state === 'play' && (G.phase === 'clear' || G.phase === 'intro') && G.phaseT > 0.3) ? 4 : 1, 1 - Math.exp(-dt * 2.5));
  if(G.state === 'menu'){ updateDemo(dt); return; }
  if(G.state !== 'play') return;

  /* player */
  if(!p.dead){
    const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
    if(kx || ky){ p.tx += kx * 420 * S * dt; p.ty += ky * 420 * S * dt; }
    p.tx = clamp(p.tx, OX + 22 * S, OX + PW - 22 * S); p.ty = clamp(p.ty, H * 0.42, H - SA.b - 44 * S);
    const ox = p.x; const k = 1 - Math.exp(-dt * 22); p.x = lerp(p.x, p.tx, k); p.y = lerp(p.y, p.ty, k);
    p.tilt = lerp(p.tilt, clamp((p.x - ox) / Math.max(dt, 0.001) / (900 * S), -0.35, 0.35), 1 - Math.exp(-dt * 10));
    ['inv', 'shield', 'magnet', 'slow'].forEach(n => { if(p[n] > 0) p[n] = Math.max(0, p[n] - dt); });
    if(p.level > 1){ p.powerT -= dt; if(p.powerT <= 0){ p.level--; p.powerT = p.level > 1 ? 8 : 0; } }
    // auto-fire
    G.fireCd -= dt;
    if(G.fireCd <= 0 && G.phase !== 'clear'){
      G.fireCd = 0.17; const by = p.y - 36 * S, sp = -760 * S;
      if(p.level === 1) G.bullets.push({ x:p.x, y:by, vx:0, vy:sp });
      else if(p.level === 2){ G.bullets.push({ x:p.x - 9 * S, y:by, vx:0, vy:sp }, { x:p.x + 9 * S, y:by, vx:0, vy:sp }); }
      else { G.bullets.push({ x:p.x, y:by, vx:0, vy:sp, st:1 }, { x:p.x - 8 * S, y:by + 4 * S, vx:-130 * S, vy:sp }, { x:p.x + 8 * S, y:by + 4 * S, vx:130 * S, vy:sp }); }
      sfx('pew');
    }
  } else {
    G.endT -= dt; if(G.endT <= 0){ endGame(false); return; }
  }

  /* phases */
  G.phaseT += dt;
  if(G.banner){ G.banner.t += dt; if(G.banner.t > G.banner.dur) G.banner = null; }
  if(G.phase === 'intro' && G.phaseT > 1.4){ G.phase = 'fight'; G.phaseT = 0; spawnWave(); }
  else if(G.phase === 'fight' && !G.enemies.length && !G.boss){
    G.phase = 'clear'; G.phaseT = 0;
    const st = G.hitsWave === 0 ? 3 : G.hitsWave === 1 ? 2 : 1; G.waveStars.push(st); G.stars += st;
    G.score += 500 * st; sfx('wave');
    G.banner = { t:0, big:T('أحسنت!', 'Great job!', 'Harika!'), small:T('خلصت الموجة ' + G.wave, 'Wave ' + G.wave + ' cleared', 'Dalga ' + G.wave + ' bitti'), stars:st, dur:2.1 };
    // gather the remaining coins
    G.coinsArr.forEach(c => c.pull = true);
  } else if(G.phase === 'clear' && G.phaseT > 2.3){
    if(G.wave >= WAVES_TOTAL){ endGame(true); return; }
    startWave(G.wave + 1);
  }

  /* bullets */
  for(let i = G.bullets.length - 1; i >= 0; i--){ const b = G.bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; if(b.y < -20 * S || b.x < OX - 20 || b.x > OX + PW + 20) G.bullets.splice(i, 1); }

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
        const want = clamp((G.p.x - e.x) * 2.2, -170 * S, 170 * S) * (e.y < G.p.y - 40 * S ? 1 : 0.2);
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
    if(!p.dead && (e.st === 'dive' || e.st === 'enter') && Math.hypot(e.x - p.x, e.y - p.y) < (e.T.r * 0.8 + 14) * S){ hurtPlayer(); if(e.st === 'dive'){ e.hp = 0; killEnemy(e, i); continue; } }
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
  if(fighting && !p.dead){
    const form = G.enemies.filter(e => e.st === 'form');
    G.diveCd -= edt;
    if(G.diveCd <= 0 && form.length){
      G.diveCd = Math.max(0.9, 3.4 - G.wave * 0.18) / (wv.dive || 1) * rnd(0.75, 1.25);
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
      if(B.patT <= 0 && !p.dead){
        const angry = B.hp < B.max * 0.5; B.patT = (angry ? 1.8 : 2.5) - B.idx * 0.15; B.pat++;
        const pat = B.pat % 3, sp = (120 + B.idx * 12) * S;
        if(pat === 1){ const n = angry ? 7 : 5; for(let i = 0; i < n; i++){ const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.24; G.eshots.push({ x:B.x, y:B.y + 40 * S, vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, t:0 }); } }
        else if(pat === 2){ const n = angry ? 12 : 10, o = rnd(0, 1); for(let i = 0; i < n; i++){ const a = (i + o) / n * TAU; if(Math.sin(a) < -0.2) continue; G.eshots.push({ x:B.x, y:B.y, vx:Math.cos(a) * sp * 0.85, vy:Math.sin(a) * sp * 0.85 + 30 * S, t:0 }); } }
        else {
          const kinds = ['z', 'b', 'g']; const n = 2 + (angry ? 1 : 0);
          for(let i = 0; i < n; i++){ const k = kinds[(B.idx + i) % 3]; G.enemies.push({ k, T:TYPES[k], hp:1, col:0, row:0, x:B.x + (i - (n - 1) / 2) * 40 * S, y:B.y + 30 * S, st:'dive', t:0.3, vx:0, vy:-40 * S, side:i % 2 ? 1 : -1, phase:rnd(0, 9), flash:0, rot:0, minion:true, fired:false }); }
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
        B.hp--; B.flash = 0.07; sparkle(b.x, b.y, '#ffffff'); sfx('bosshit'); G.score += 10;
        if(B.hp <= 0){
          G.score += 5000 * (B.idx + 1); sfx('boom'); G.shake = 16;
          for(let q = 0; q < 5; q++) burst(B.x + rnd(-40, 40) * S, B.y + rnd(-30, 30) * S, q % 2 ? '#ffd84d' : B.def.col, 14, 1.4);
          dropCoins(B.x, B.y, 15); dropPick(B.x - 30 * S, B.y, 'power'); if(G.lives < 3) dropPick(B.x + 30 * S, B.y, 'heart');
          ftext(B.x, B.y, '+' + 5000 * (B.idx + 1), '#ffe27a');
          G.enemies.forEach(e => { burst(e.x, e.y, e.T.col, 6); }); G.enemies.length = 0;
          G.boss = null; G.eshots.length = 0; break;
        }
      }
    }
    if(G.boss && !p.dead){ const dx = (p.x - B.x) / (rx + 12 * S), dy = (p.y - B.y) / (ry + 12 * S); if(dx * dx + dy * dy < 1) hurtPlayer(); }
  }

  /* enemy shots */
  for(let i = G.eshots.length - 1; i >= 0; i--){
    const s = G.eshots[i]; s.t += edt; s.x += s.vx * edt; s.y += s.vy * edt;
    if(s.y > H + 20 || s.y < -40 || s.x < -20 || s.x > W + 20){ G.eshots.splice(i, 1); continue; }
    if(!p.dead && Math.hypot(s.x - p.x, s.y - (p.y - 2 * S)) < (p.shield > 0 ? 34 : 13) * S){ G.eshots.splice(i, 1); hurtPlayer(); }
  }

  /* pickups */
  for(let i = G.picks.length - 1; i >= 0; i--){
    const k = G.picks[i]; k.t += dt; k.y += 75 * S * dt; k.x += Math.sin(k.t * 3) * 20 * S * dt;
    if(k.y > H + 30 * S){ G.picks.splice(i, 1); continue; }
    if(!p.dead && Math.hypot(k.x - p.x, k.y - p.y) < 40 * S){ G.picks.splice(i, 1); takePick(k.kind); }
  }

  /* coins */
  for(let i = G.coinsArr.length - 1; i >= 0; i--){
    const c = G.coinsArr[i]; c.t += dt;
    const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
    if(!p.dead && (c.pull || (p.magnet > 0 && d < 420 * S) || d < 70 * S)){ const sp = (c.pull || p.magnet > 0 ? 620 : 380) * S; c.vx = lerp(c.vx, dx / d * sp, 0.2); c.vy = lerp(c.vy, dy / d * sp, 0.2); }
    else { c.vy = Math.min(c.vy + 260 * S * dt, 110 * S); c.vx *= 0.97; }
    c.x += c.vx * dt; c.y += c.vy * dt;
    if(!p.dead && d < 26 * S){ G.coinsArr.splice(i, 1); G.coins++; G.score += 25; sfx('coin'); sparkle(c.x, c.y, '#ffd84d'); continue; }
    if(c.y > H + 20) G.coinsArr.splice(i, 1);
  }

  /* particles / texts */
  updateParts(dt);
  G.shake = Math.max(0, G.shake - dt * 30);
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
  const blinkOff = p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0;
  // flame
  const fl = 1 + Math.sin(G.time * 40) * 0.15 + Math.random() * 0.1;
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt);
  ctx.globalCompositeOperation = 'lighter';
  const fy = 34 * S, fh = 26 * S * fl;
  let gr = ctx.createLinearGradient(0, fy, 0, fy + fh); gr.addColorStop(0, 'rgba(255,240,170,1)'); gr.addColorStop(0.4, 'rgba(255,150,60,.9)'); gr.addColorStop(1, 'rgba(255,60,120,0)');
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(-8 * S, fy); ctx.quadraticCurveTo(0, fy + fh * 1.3, 8 * S, fy); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.moveTo(-4 * S, fy); ctx.quadraticCurveTo(0, fy + fh * 0.6, 4 * S, fy); ctx.closePath(); ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  if(!blinkOff){ const c = SPR.ship; ctx.drawImage(p.inv > 2 ? SPR.shipW : c, -c.dw * S / 2, -c.dh * S / 2, c.dw * S, c.dh * S); }
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
  for(const e of G.enemies) if(e.st !== 'wait') drawAlienE(e);
  // bullets
  ctx.globalCompositeOperation = 'lighter';
  for(const b of G.bullets) blit(b.st ? SPR.bullet2 : SPR.bullet, b.x, b.y, 1, b.st ? G.time * 8 : 0);
  ctx.globalCompositeOperation = 'source-over';
  for(const s of G.eshots) blit(SPR.eshot, s.x, s.y, 1 + Math.sin(s.t * 12) * 0.1);
  drawShip(G.p);
  drawParts();
  for(const t of G.texts){ ctx.globalAlpha = clamp(1.4 - t.t * 1.3, 0, 1); text(t.s, t.x, t.y, 17 * S, t.col); }
  ctx.globalAlpha = 1;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if(G.p.slow > 0){ ctx.fillStyle = 'rgba(140,110,255,' + (0.08 + 0.04 * Math.sin(G.time * 4)) + ')'; ctx.fillRect(0, 0, W, H); }
  if(G.p.inv > 2){ ctx.fillStyle = 'rgba(255,80,140,' + ((G.p.inv - 2) * 0.6) + ')'; ctx.fillRect(0, 0, W, H); }
  drawHUD(); drawBanner();
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
  if(G.state !== 'pause') update(dt);
  draw(G.state === 'pause' ? 0 : dt);
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
document.addEventListener('visibilitychange', () => { if(document.hidden && G.state === 'play') pause(); });

/* ---------- screens ---------- */
function show(id){
  ['menu', 'pause', 'end'].forEach(n => { $('#' + n).hidden = n !== id; });
  $('#btnPause').hidden = G.state !== 'play';
}
function pause(){ if(G.state !== 'play') return; G.state = 'pause'; drag = null; $('#pauseInfo').textContent = T('الموجة ', 'Wave ', 'Dalga ') + G.wave + '  •  ' + G.score; show('pause'); }
function resume(){ if(G.state !== 'pause') return; G.state = 'play'; last = performance.now(); show(null); sfx('click'); }
function award(){
  if(G.awarded) return 0; G.awarded = true;
  const n = Math.min(COIN_CAP, G.coins);
  if(n > 0){ try{ if(window.World) World.addCoins(n, T('من فضاء بوبو', 'from Bobo Space', 'Bobo Uzay\'dan')); }catch(e){} }
  if(G.score > G.best){ G.best = G.score; store.set('best', G.best); return 2; }
  return 1;
}
function endGame(win){
  const cleared = win ? WAVES_TOTAL : G.wave - 1 + (G.phase === 'clear' ? 1 : 0);
  G.state = win ? 'win' : 'over'; G.banner = null;
  const prevBest = G.best, r = award();
  sfx(win ? 'win' : 'over');
  $('#endTitle').textContent = win ? T('فزت! خلّصت الفضاء 🎉', 'You won! Space is saved 🎉', 'Kazandın! Uzay kurtuldu 🎉') : T('خلصت اللعبة!', 'Game over!', 'Oyun bitti!');
  let st;
  if(win){ const ratio = G.stars / (WAVES_TOTAL * 3); st = ratio >= 0.8 ? 3 : ratio >= 0.55 ? 2 : 1; }
  else st = cleared >= 10 ? 3 : cleared >= 5 ? 2 : cleared >= 1 ? 1 : 0;
  [...$('#endStars').children].forEach((s, i) => s.classList.toggle('on', i < st));
  $('#newBest').hidden = !(G.score > 0 && G.score > prevBest);
  $('#rScore').textContent = G.score; $('#rBest').textContent = G.best; $('#rWave').textContent = cleared + ' / ' + WAVES_TOTAL;
  $('#rCoins').textContent = '+' + Math.min(COIN_CAP, G.coins) + ' 🪙';
  show('end'); void r;
}
function toMenu(){
  if(G.state === 'pause' || G.state === 'play') award();
  G.state = 'menu'; G.parts = []; G.p = null; updateBest(); show('menu');
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
$('#btnAgain').addEventListener('click', () => { startGame(); });
$('#btnMenu').addEventListener('click', () => { sfx('click'); toMenu(); });
$('#btnResume').addEventListener('click', resume);
$('#btnRestart').addEventListener('click', () => { award(); startGame(); });
$('#btnPause').addEventListener('click', e => { e.stopPropagation(); pause(); });
$('#btnMute').addEventListener('click', e => { e.stopPropagation(); audioInit(); setMute(!SND.muted); sfx('click'); });
$('#btnExit').onclick = e => { e.preventDefault(); award(); location.href = '../'; };
['pointerdown'].forEach(t => { $('#btnPause').addEventListener(t, e => e.stopPropagation()); $('#btnMute').addEventListener(t, e => e.stopPropagation()); });

addEventListener('resize', () => { resize(); document.querySelectorAll('.pilot').forEach(b => b._size && b._size()); });
resize(); setMute(SND.muted); buildPilots(); updateBest(); show('menu');
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => {});
requestAnimationFrame(frame);

/* test / debug hooks (no UI) */
window.__space = {
  get state(){ return G.state; }, G, toMenu, startGame, pause, resume,
  killAll(){ for(let i = G.enemies.length - 1; i >= 0; i--){ const e = G.enemies[i]; if(e.st !== 'wait') killEnemy(e, i); } },
  give(k){ dropPick(G.p.x, G.p.y - 60 * S, k); },
  hurt(){ G.p.inv = 0; hurtPlayer(); }
};
})();
