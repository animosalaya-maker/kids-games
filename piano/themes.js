/* «بيانو بوبو» themes («سمات»): original backgrounds drawn on the canvas.
   paint(c, w, h)      → the still picture, drawn once into an off-screen canvas (on resize / theme change)
   init(w, h)          → the moving things (made once, re-used every frame)
   anim(c, w, h, t, pulse, P) → draws the moving things; pulse = 1 on the beat, falling to 0 (no allocations in here)
   tile colours: a/b = tile gradient (top/bottom), edge = rim, hold = long-tile body, fill = the rising fill of a held tile.
   need = total stars to open the theme. hero = the Bobo friend who dances (../worlds/chars/<hero>.png). */
(function(){
'use strict';
const TAU = Math.PI * 2;
const CANDY = ['#ff5fa8', '#ffd84d', '#5fd0ff', '#8be36a', '#c07bff', '#ff9a4d'], FISH = ['#ffb030', '#ff6f9f', '#6fe0a0', '#ffe14d', '#b88bff', '#5fc8ff'],
  CREAM = ['#ff9fca', '#fff7d6', '#8fd8a8', '#c8a0ff', '#ffd27a', '#8fc8ff'], BALLOON = ['#ff5a7a', '#ffb33a', '#4fb8ff', '#6fd86a', '#b88bff', '#ff7ad0'];
function rr(c, x, y, w, h, r){ r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function circ(c, x, y, r, col){ c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function sky(c, w, h, stops){ const g = c.createLinearGradient(0, 0, 0, h); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function cloud(c, x, y, s, col){ c.fillStyle = col; c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s * 0.9, y - s * 0.35, s * 0.8, 0, TAU); c.arc(x + s * 1.8, y, s * 0.85, 0, TAU); c.arc(x + s * 0.9, y + s * 0.2, s * 0.9, 0, TAU); c.fill(); }
function hills(c, w, h, y0, amp, n, col, ph){ c.fillStyle = col; c.beginPath(); c.moveTo(0, h); for(let i = 0; i <= 40; i++){ const x = i / 40 * w; c.lineTo(x, y0 - Math.sin(i / 40 * Math.PI * n + (ph || 0)) * amp); } c.lineTo(w, h); c.closePath(); c.fill(); }
function star5(c, x, y, r, col){ c.fillStyle = col; c.beginPath(); for(let i = 0; i < 10; i++){ const a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); } c.closePath(); c.fill(); }
function note(c, x, y, s, col){ c.fillStyle = col; c.strokeStyle = col; c.lineWidth = s * 0.22; c.beginPath(); c.ellipse(x, y, s * 0.55, s * 0.4, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(x + s * 0.48, y - s * 0.1); c.lineTo(x + s * 0.48, y - s * 1.6); c.quadraticCurveTo(x + s * 1.1, y - s * 1.2, x + s * 1.0, y - s * 0.8); c.stroke(); }
/* a tiny seeded random so a theme looks the same every time */
function rng(seed){ let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function parts(n, w, h, seed, extra){ const R = rng(seed), out = []; for(let i = 0; i < n; i++){ const p = { x:R() * w, y:R() * h, s:0.5 + R(), v:0.5 + R(), ph:R() * TAU, k:Math.floor(R() * 6) }; if(extra) extra(p, R); out.push(p); } return out; }

/* little animals, drawn from circles (used by the ice-cream and forest themes) */
function cat(c, x, y, s, col, bob){
  y -= bob * s * 0.25;
  c.fillStyle = col; c.beginPath(); c.moveTo(x - s * 0.9, y - s * 0.4); c.lineTo(x - s * 0.75, y - s * 1.25); c.lineTo(x - s * 0.2, y - s * 0.85); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(x + s * 0.9, y - s * 0.4); c.lineTo(x + s * 0.75, y - s * 1.25); c.lineTo(x + s * 0.2, y - s * 0.85); c.closePath(); c.fill();
  circ(c, x, y, s, col);
  circ(c, x - s * 0.35, y - s * 0.1, s * 0.13, '#2a1a1a'); circ(c, x + s * 0.35, y - s * 0.1, s * 0.13, '#2a1a1a');
  circ(c, x - s * 0.31, y - s * 0.15, s * 0.045, '#fff'); circ(c, x + s * 0.39, y - s * 0.15, s * 0.045, '#fff');
  circ(c, x, y + s * 0.15, s * 0.09, '#ff7fa0');
  c.strokeStyle = '#2a1a1a'; c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); c.arc(x - s * 0.1, y + s * 0.28, s * 0.1, 0, Math.PI); c.arc(x + s * 0.1, y + s * 0.28, s * 0.1, 0, Math.PI); c.stroke();
  circ(c, x - s * 0.6, y + s * 0.25, s * 0.13, 'rgba(255,120,150,.45)'); circ(c, x + s * 0.6, y + s * 0.25, s * 0.13, 'rgba(255,120,150,.45)');
}
function capy(c, x, y, s, bob, sing){
  y -= bob * s * 0.3;
  c.fillStyle = '#b07a4a'; c.beginPath(); c.ellipse(x, y + s * 0.5, s * 1.25, s * 0.85, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x + s * 0.75, y - s * 0.25, s * 0.75, s * 0.6, -0.15, 0, TAU); c.fill();
  circ(c, x + s * 0.35, y - s * 0.75, s * 0.16, '#8a5a32');
  circ(c, x + s * 0.85, y - s * 0.42, s * 0.09, '#2a1a10');
  c.fillStyle = '#7a4c28'; c.beginPath(); c.ellipse(x + s * 1.35, y - s * 0.12, s * 0.22, s * 0.18, 0, 0, TAU); c.fill();
  if(sing){ circ(c, x + s * 1.25, y + s * 0.12, s * 0.1 + sing * s * 0.08, '#4a2a14'); }
  c.fillStyle = '#ff9fb8'; c.beginPath(); c.ellipse(x + s * 0.55, y - s * 0.15, s * 0.12, s * 0.08, 0, 0, TAU); c.fill();
  // a little orange on the head (capybaras love that)
  circ(c, x + s * 0.55, y - s * 0.95, s * 0.2, '#ff9a2e'); circ(c, x + s * 0.6, y - s * 1.12, s * 0.05, '#3fa34d');
}
function bear(c, x, y, s, bob, sing){
  y -= bob * s * 0.3;
  circ(c, x, y + s * 0.6, s * 0.95, '#8a5a3a');
  circ(c, x - s * 0.62, y - s * 0.62, s * 0.3, '#8a5a3a'); circ(c, x + s * 0.62, y - s * 0.62, s * 0.3, '#8a5a3a');
  circ(c, x - s * 0.62, y - s * 0.62, s * 0.15, '#d9a77a'); circ(c, x + s * 0.62, y - s * 0.62, s * 0.15, '#d9a77a');
  circ(c, x, y - s * 0.1, s * 0.78, '#8a5a3a');
  c.fillStyle = '#e8c49a'; c.beginPath(); c.ellipse(x, y + s * 0.15, s * 0.36, s * 0.28, 0, 0, TAU); c.fill();
  circ(c, x, y + s * 0.02, s * 0.1, '#2a1a10');
  circ(c, x - s * 0.3, y - s * 0.25, s * 0.09, '#2a1a10'); circ(c, x + s * 0.3, y - s * 0.25, s * 0.09, '#2a1a10');
  circ(c, x, y + s * 0.3, s * 0.06 + (sing || 0) * s * 0.1, '#5a2a1a');
  // a little bow tie
  c.fillStyle = '#ff5a7a'; c.beginPath(); c.moveTo(x, y + s * 0.72); c.lineTo(x - s * 0.3, y + s * 0.58); c.lineTo(x - s * 0.3, y + s * 0.86); c.closePath(); c.moveTo(x, y + s * 0.72); c.lineTo(x + s * 0.3, y + s * 0.58); c.lineTo(x + s * 0.3, y + s * 0.86); c.closePath(); c.fill();
}

const THEMES = [
  { id:'candy', name:['أرض الحلوى', 'Candy Land', 'Şeker Diyarı'], em:'🍭', hero:'sara', need:0,
    tile:{ a:'#7a2a8f', b:'#4b1263', edge:'#ffb8e6', hold:'#62207a', fill:'#ff8fd0', glow:'#ff6fc4' }, lane:'rgba(255,255,255,.16)', div:'rgba(255,255,255,.45)', line:'#ff4fae',
    paint(c, w, h){
      sky(c, w, h, ['#ff9fd2', '#ffd0ea', '#d4f3ff']);
      cloud(c, w * 0.08, h * 0.14, w * 0.07, 'rgba(255,255,255,.85)'); cloud(c, w * 0.62, h * 0.22, w * 0.06, 'rgba(255,255,255,.75)');
      hills(c, w, h, h * 0.8, h * 0.04, 3, '#ffb6e1'); hills(c, w, h, h * 0.86, h * 0.035, 4, '#ff8fcf', 1);
      const R = rng(7);
      for(let i = 0; i < 5; i++){
        const x = w * (0.1 + i * 0.2), y = h * (0.66 + R() * 0.08), r = w * 0.05;
        c.fillStyle = '#fff'; c.fillRect(x - 2, y, 4, h * 0.14);
        const cols = ['#ff5fa8', '#ffd84d', '#5fd0ff', '#8be36a', '#c07bff'];
        for(let k = 5; k > 0; k--) circ(c, x, y, r * k / 5, k % 2 ? cols[i] : '#fff');
      }
    },
    init(w, h){ return parts(18, w, h, 3); },
    anim(c, w, h, t, pulse, P){
      const cols = CANDY;
      for(let i = 0; i < P.length; i++){
        const p = P[i], y = ((p.y - t * 22 * p.v) % (h + 40) + h + 40) % (h + 40) - 20, x = p.x + Math.sin(t * 0.8 + p.ph) * 14, s = w * 0.018 * p.s * (1 + pulse * 0.15);
        c.save(); c.translate(x, y); c.rotate(t * 0.6 * (p.k % 2 ? 1 : -1) + p.ph);
        c.fillStyle = cols[p.k]; c.beginPath(); c.ellipse(0, 0, s * 1.3, s, 0, 0, TAU); c.fill();
        c.beginPath(); c.moveTo(-s * 1.2, 0); c.lineTo(-s * 2.1, -s * 0.8); c.lineTo(-s * 2.1, s * 0.8); c.closePath(); c.moveTo(s * 1.2, 0); c.lineTo(s * 2.1, -s * 0.8); c.lineTo(s * 2.1, s * 0.8); c.closePath(); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.ellipse(-s * 0.3, -s * 0.35, s * 0.4, s * 0.2, 0, 0, TAU); c.fill();
        c.restore();
      }
    } },
  { id:'space', name:['الفضاء', 'Outer Space', 'Uzay'], em:'🪐', hero:'samir', need:0,
    tile:{ a:'#23285e', b:'#10132e', edge:'#7fe8ff', hold:'#1d2250', fill:'#5fdcff', glow:'#4fd8ff' }, lane:'rgba(140,170,255,.08)', div:'rgba(140,200,255,.3)', line:'#4fd8ff',
    paint(c, w, h){
      sky(c, w, h, ['#07051f', '#1d1150', '#3a1a6e']);
      c.globalAlpha = 0.35; circ(c, w * 0.2, h * 0.35, w * 0.35, '#5a2a9a'); circ(c, w * 0.85, h * 0.6, w * 0.3, '#2a3a9a'); c.globalAlpha = 1;
      // ringed planet
      circ(c, w * 0.78, h * 0.18, w * 0.11, '#ffb35c'); c.fillStyle = '#ff8f3c'; c.fillRect(w * 0.67, h * 0.17, w * 0.22, h * 0.012);
      c.strokeStyle = '#ffe0a0'; c.lineWidth = w * 0.012; c.beginPath(); c.ellipse(w * 0.78, h * 0.18, w * 0.19, w * 0.05, -0.3, 0, TAU); c.stroke();
      // moon
      circ(c, w * 0.16, h * 0.78, w * 0.13, '#d8dcf0'); circ(c, w * 0.12, h * 0.75, w * 0.03, '#b8bdd8'); circ(c, w * 0.2, h * 0.82, w * 0.022, '#b8bdd8'); circ(c, w * 0.21, h * 0.73, w * 0.015, '#b8bdd8');
      circ(c, w * 0.6, h * 0.88, w * 0.05, '#7be0b0'); circ(c, w * 0.58, h * 0.87, w * 0.015, '#4fb888');
    },
    init(w, h){ return parts(70, w, h, 11); },
    anim(c, w, h, t, pulse, P){
      for(let i = 0; i < P.length; i++){
        const p = P[i], a = 0.35 + 0.65 * Math.abs(Math.sin(t * p.v * 1.6 + p.ph));
        c.globalAlpha = a; c.fillStyle = p.k === 0 ? '#ffe68a' : '#fff';
        const s = (1 + p.s * 1.4) * (p.k === 0 ? 1.6 : 1);
        c.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
      c.globalAlpha = 1;
      // a shooting star every few seconds
      const k = (t * 0.25) % 1; if(k < 0.25){ const x = w * (1.1 - k * 4.4), y = h * (0.1 + k * 1.2); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w * 0.12, y - h * 0.04); c.stroke(); }
      // a small rocket bobbing
      const rx = w * 0.42 + Math.sin(t * 0.5) * w * 0.25, ry = h * 0.45 + Math.sin(t * 1.3) * h * 0.03, s = w * 0.035;
      c.save(); c.translate(rx, ry); c.rotate(0.5 + Math.sin(t * 0.5) * 0.2);
      c.fillStyle = '#ffd24d'; c.beginPath(); c.moveTo(-s * 0.5, s * 1.2); c.lineTo(0, s * (1.8 + pulse * 0.6)); c.lineTo(s * 0.5, s * 1.2); c.closePath(); c.fill();
      c.fillStyle = '#f2f4ff'; rr(c, -s * 0.6, -s, s * 1.2, s * 2.2, s * 0.6); c.fill();
      c.fillStyle = '#ff5a7a'; c.beginPath(); c.moveTo(-s * 0.6, -s * 0.4); c.quadraticCurveTo(0, -s * 2.2, s * 0.6, -s * 0.4); c.closePath(); c.fill();
      circ(c, 0, 0, s * 0.3, '#4fd8ff');
      c.restore();
    } },
  { id:'ocean', name:['تحت البحر', 'Under the Sea', 'Deniz Altı'], em:'🐠', hero:'sidra', need:0,
    tile:{ a:'#0e3f73', b:'#062448', edge:'#8ff0ff', hold:'#0a3360', fill:'#4fe0ff', glow:'#3fd0ff' }, lane:'rgba(255,255,255,.08)', div:'rgba(200,250,255,.35)', line:'#5ff0ff',
    paint(c, w, h){
      sky(c, w, h, ['#3fd0f0', '#0f8ec8', '#06507e']);
      c.fillStyle = 'rgba(255,255,255,.08)';
      for(let i = 0; i < 5; i++){ c.beginPath(); c.moveTo(w * (0.05 + i * 0.22), 0); c.lineTo(w * (0.15 + i * 0.22), 0); c.lineTo(w * (0.3 + i * 0.22), h * 0.8); c.lineTo(w * (0.12 + i * 0.22), h * 0.8); c.closePath(); c.fill(); }
      hills(c, w, h, h * 0.9, h * 0.02, 3, '#f4d9a0');
      const cols = ['#ff7a8a', '#ffb35c', '#c87bff'];
      for(let i = 0; i < 3; i++){ const x = w * (0.15 + i * 0.35), y = h * 0.9; c.strokeStyle = cols[i]; c.lineWidth = w * 0.025; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h * 0.08); c.moveTo(x, y - h * 0.04); c.lineTo(x - w * 0.05, y - h * 0.09); c.moveTo(x, y - h * 0.05); c.lineTo(x + w * 0.05, y - h * 0.1); c.stroke(); }
      star5(c, w * 0.55, h * 0.93, w * 0.04, '#ff8f5a');
    },
    init(w, h){ return parts(26, w, h, 5); },
    anim(c, w, h, t, pulse, P){
      // seaweed swaying
      c.strokeStyle = '#2fbf6a'; c.lineWidth = w * 0.018; c.lineCap = 'round';
      for(let i = 0; i < 4; i++){ const x = w * (0.06 + i * 0.29); c.beginPath(); c.moveTo(x, h); for(let k = 1; k <= 6; k++) c.lineTo(x + Math.sin(t * 1.4 + k * 0.7 + i) * w * 0.02 * k / 3, h - k * h * 0.035); c.stroke(); }
      for(let i = 0; i < P.length; i++){
        const p = P[i];
        if(i < 18){ // bubbles
          const y = ((p.y - t * 40 * p.v) % h + h) % h, x = p.x + Math.sin(t * 2 + p.ph) * 6, r = 2 + p.s * 4;
          c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
        } else { // fish
          const dir = p.k % 2 ? 1 : -1, span = w + 120, x = dir > 0 ? ((p.x + t * 40 * p.v) % span) - 60 : span - ((p.x + t * 40 * p.v) % span) - 60;
          const y = h * (0.25 + (i - 18) * 0.07) + Math.sin(t * 2 + p.ph) * 8, s = w * 0.03 * (0.8 + p.s * 0.4);
          const col = FISH[p.k];
          c.fillStyle = col; c.beginPath(); c.ellipse(x, y, s * 1.4, s, 0, 0, TAU); c.fill();
          c.beginPath(); c.moveTo(x - dir * s * 1.2, y); c.lineTo(x - dir * s * 2.3, y - s * (0.8 + pulse * 0.3)); c.lineTo(x - dir * s * 2.3, y + s * (0.8 + pulse * 0.3)); c.closePath(); c.fill();
          circ(c, x + dir * s * 0.7, y - s * 0.2, s * 0.22, '#fff'); circ(c, x + dir * s * 0.75, y - s * 0.2, s * 0.11, '#1a1a2a');
        }
      }
    } },
  { id:'icecream', name:['سيارة البوظة', 'Ice-Cream Truck', 'Dondurma Arabası'], em:'🍦', hero:'qamar', need:4,
    tile:{ a:'#7a3f24', b:'#4a2312', edge:'#fff0d0', hold:'#5e3019', fill:'#ffc2dd', glow:'#ff9fca' }, lane:'rgba(255,255,255,.14)', div:'rgba(255,255,255,.5)', line:'#ff6fae',
    paint(c, w, h){
      sky(c, w, h, ['#8fe3ff', '#c8f1ff', '#fff4d6']);
      cloud(c, w * 0.1, h * 0.12, w * 0.06, '#fff'); cloud(c, w * 0.66, h * 0.08, w * 0.05, '#fff');
      c.fillStyle = '#9a9aa8'; c.fillRect(0, h * 0.86, w, h * 0.14); c.fillStyle = '#fff'; for(let x = 0; x < w; x += w * 0.18) c.fillRect(x, h * 0.93, w * 0.09, h * 0.008);
      c.fillStyle = '#7fd36a'; c.fillRect(0, h * 0.83, w, h * 0.03);
      // the truck
      const x = w * 0.12, y = h * 0.62, tw = w * 0.76, th = h * 0.2;
      c.fillStyle = '#fff'; rr(c, x, y, tw * 0.72, th, w * 0.04); c.fill();
      c.fillStyle = '#ff8fc0'; rr(c, x + tw * 0.7, y + th * 0.25, tw * 0.3, th * 0.75, w * 0.04); c.fill();
      c.fillStyle = '#bfefff'; rr(c, x + tw * 0.76, y + th * 0.33, tw * 0.18, th * 0.28, w * 0.02); c.fill();
      for(let i = 0; i < 6; i++){ c.fillStyle = i % 2 ? '#ff8fc0' : '#8fe3ff'; c.fillRect(x + i * tw * 0.12, y + th * 0.78, tw * 0.12, th * 0.12); }
      c.fillStyle = '#ffe8a8'; rr(c, x + tw * 0.06, y + th * 0.15, tw * 0.56, th * 0.45, w * 0.03); c.fill();
      // the cone sign on the roof
      c.fillStyle = '#e8a050'; c.beginPath(); c.moveTo(x + tw * 0.28, y - th * 0.05); c.lineTo(x + tw * 0.36, y - th * 0.05); c.lineTo(x + tw * 0.32, y + th * 0.05); c.closePath(); c.fill();
      circ(c, x + tw * 0.32, y - th * 0.14, tw * 0.06, '#ff9fca'); circ(c, x + tw * 0.32, y - th * 0.26, tw * 0.045, '#fff7d6'); circ(c, x + tw * 0.32, y - th * 0.34, tw * 0.018, '#ff4f6a');
      circ(c, x + tw * 0.18, y + th, w * 0.055, '#333'); circ(c, x + tw * 0.18, y + th, w * 0.025, '#ccc');
      circ(c, x + tw * 0.82, y + th, w * 0.055, '#333'); circ(c, x + tw * 0.82, y + th, w * 0.025, '#ccc');
    },
    init(w, h){ return parts(10, w, h, 9); },
    anim(c, w, h, t, pulse, P){
      const x = w * 0.12, y = h * 0.62, tw = w * 0.76, th = h * 0.2, s = w * 0.045;
      // cats in the window, bobbing to the beat
      cat(c, x + tw * 0.18, y + th * 0.5, s, '#ffb35c', pulse * (1 + Math.sin(t * 3)) * 0.5);
      cat(c, x + tw * 0.34, y + th * 0.52, s * 0.9, '#c8c8d8', pulse * 0.8);
      cat(c, x + tw * 0.5, y + th * 0.5, s, '#4a4a5a', pulse * (1 + Math.cos(t * 3)) * 0.5);
      cat(c, x + tw * 0.86, y + th * 0.2, s * 0.8, '#fff2e0', pulse);
      const cols = CREAM;
      for(let i = 0; i < P.length; i++){
        const p = P[i], yy = ((p.y - t * 18 * p.v) % (h * 0.6) + h * 0.6) % (h * 0.6), xx = p.x + Math.sin(t + p.ph) * 10, r = w * 0.02 * p.s;
        c.fillStyle = '#e8a050'; c.beginPath(); c.moveTo(xx - r, yy); c.lineTo(xx + r, yy); c.lineTo(xx, yy + r * 2.4); c.closePath(); c.fill();
        circ(c, xx, yy - r * 0.2, r * 1.05, cols[p.k]);
      }
    } },
  { id:'forest', name:['غابة الأصحاب المغنّيين', 'Singing Forest', 'Şarkı Söyleyen Orman'], em:'🦫', hero:'mushakis', need:8,
    tile:{ a:'#1f5a32', b:'#0f3a1e', edge:'#d8ffb0', hold:'#184a28', fill:'#9fff7a', glow:'#8fff6a' }, lane:'rgba(255,255,255,.1)', div:'rgba(230,255,200,.4)', line:'#b8ff5a',
    paint(c, w, h){
      sky(c, w, h, ['#bff0a0', '#7fd68a', '#3f9a5a']);
      circ(c, w * 0.82, h * 0.1, w * 0.08, '#fff3a0');
      hills(c, w, h, h * 0.55, h * 0.03, 2, '#5fb86a'); hills(c, w, h, h * 0.75, h * 0.03, 3, '#4aa85a', 2);
      const R = rng(21);
      for(let i = 0; i < 7; i++){
        const x = w * (0.02 + i * 0.16 + R() * 0.04), y = h * (0.56 + (i % 2) * 0.06), s = w * (0.07 + R() * 0.03);
        c.fillStyle = '#7a4a2a'; c.fillRect(x - s * 0.12, y, s * 0.24, s * 1.2);
        circ(c, x, y - s * 0.2, s * 0.75, i % 2 ? '#2f8a45' : '#3a9e50'); circ(c, x - s * 0.4, y + s * 0.1, s * 0.5, '#2f8a45'); circ(c, x + s * 0.4, y + s * 0.1, s * 0.5, '#3a9e50');
      }
      for(let i = 0; i < 4; i++){ const x = w * (0.12 + i * 0.25), y = h * 0.95; c.fillStyle = '#fff'; c.fillRect(x - 3, y - 10, 6, 10); c.fillStyle = '#ff5a5a'; c.beginPath(); c.arc(x, y - 10, 10, Math.PI, 0); c.fill(); circ(c, x - 3, y - 14, 2, '#fff'); }
    },
    init(w, h){ return parts(24, w, h, 13); },
    anim(c, w, h, t, pulse, P){
      const s = w * 0.07;
      capy(c, w * 0.18, h * 0.84, s, pulse, pulse);
      bear(c, w * 0.56, h * 0.8, s * 0.95, pulse * (0.6 + 0.4 * Math.sin(t * 2)), pulse);
      capy(c, w * 0.36, h * 0.93, s * 0.7, pulse * 0.7, 0);
      for(let i = 0; i < P.length; i++){
        const p = P[i];
        if(i < 8){ // music notes rising from the singers
          const k = (t * 0.35 * p.v + p.ph) % 1, from = i % 2 ? w * 0.27 : w * 0.56;
          c.globalAlpha = 1 - k; note(c, from + Math.sin(k * 8 + p.ph) * 18, h * (0.78 - k * 0.35), w * 0.022, i % 3 ? '#fff' : '#ffe14d'); c.globalAlpha = 1;
        } else { // fireflies
          const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 2 * p.v + p.ph));
          c.globalAlpha = a; circ(c, p.x + Math.sin(t * 0.7 + p.ph) * 20, (p.y * 0.6) + Math.cos(t * 0.9 + p.ph) * 14, 2.5, '#fff79a'); c.globalAlpha = 1;
        }
      }
    } },
  { id:'neon', name:['مدينة الأضواء', 'Neon City Night', 'Neon Şehir Gecesi'], em:'🌃', hero:'zaqzouq', need:14,
    tile:{ a:'#1a1a2e', b:'#06060f', edge:'#ff5fd8', hold:'#14142a', fill:'#5ff8ff', glow:'#ff4fd0' }, lane:'rgba(255,255,255,.05)', div:'rgba(255,95,216,.4)', line:'#5ff8ff',
    paint(c, w, h){
      sky(c, w, h, ['#0d0624', '#2a0c48', '#5a1458']);
      circ(c, w * 0.75, h * 0.14, w * 0.09, '#ffe8f6'); circ(c, w * 0.79, h * 0.12, w * 0.08, '#2a0c48');
      const R = rng(31);
      for(let layer = 0; layer < 2; layer++){
        let x = -10;
        while(x < w){
          const bw = w * (0.1 + R() * 0.12), bh = h * (layer ? 0.18 + R() * 0.2 : 0.3 + R() * 0.25), y = h * 0.88 - bh;
          c.fillStyle = layer ? '#160a2a' : '#22103e'; c.fillRect(x, y, bw, bh + h * 0.12);
          for(let wy = y + 10; wy < h * 0.86; wy += 16) for(let wx = x + 6; wx < x + bw - 8; wx += 12) if(R() < 0.45){ c.fillStyle = R() < 0.5 ? 'rgba(255,230,120,.7)' : 'rgba(120,220,255,.55)'; c.fillRect(wx, wy, 5, 7); }
          x += bw + 4;
        }
      }
      c.fillStyle = '#0a0518'; c.fillRect(0, h * 0.88, w, h * 0.12);
    },
    init(w, h){ return parts(14, w, h, 17); },
    anim(c, w, h, t, pulse, P){
      // neon signs pulsing on the beat
      const a = 0.55 + pulse * 0.45;
      c.lineWidth = 6; c.globalAlpha = a * 0.35;
      c.strokeStyle = '#ff4fd0'; rr(c, w * 0.08, h * 0.42, w * 0.22, h * 0.07, 12); c.stroke();
      c.strokeStyle = '#5ff8ff'; c.beginPath(); c.arc(w * 0.68, h * 0.5, w * 0.06, 0, TAU); c.stroke();
      c.lineWidth = 2.5; c.globalAlpha = a;
      c.strokeStyle = '#ff9fe8'; rr(c, w * 0.08, h * 0.42, w * 0.22, h * 0.07, 12); c.stroke();
      c.strokeStyle = '#bffcff'; c.beginPath(); c.arc(w * 0.68, h * 0.5, w * 0.06, 0, TAU); c.stroke();
      note(c, w * 0.17, h * 0.47, w * 0.02, '#ffd0f4'); note(c, w * 0.23, h * 0.47, w * 0.02, '#ffd0f4');
      c.globalAlpha = 1;
      // car lights along the road
      for(let i = 0; i < P.length; i++){
        const p = P[i], dir = i % 2 ? 1 : -1, x = dir > 0 ? (p.x + t * 90 * p.v) % (w + 40) - 20 : w + 20 - (p.x + t * 90 * p.v) % (w + 40), y = h * (0.92 + (i % 2) * 0.04);
        circ(c, x, y, 3, dir > 0 ? '#fff4b0' : '#ff4f6a'); circ(c, x + 10 * dir, y, 3, dir > 0 ? '#fff4b0' : '#ff4f6a');
      }
    } },
  { id:'snow', name:['بلاد التلج', 'Snowy Land', 'Karlı Diyar'], em:'⛄', hero:'laila', need:20,
    tile:{ a:'#2a5ea0', b:'#163a6e', edge:'#e8f8ff', hold:'#214e88', fill:'#aef0ff', glow:'#8fe8ff' }, lane:'rgba(255,255,255,.18)', div:'rgba(255,255,255,.6)', line:'#3fb8ff',
    paint(c, w, h){
      sky(c, w, h, ['#9fd8ff', '#d6efff', '#f4fbff']);
      hills(c, w, h, h * 0.7, h * 0.04, 2, '#e8f4ff'); hills(c, w, h, h * 0.82, h * 0.03, 3, '#ffffff', 1);
      const R = rng(41);
      for(let i = 0; i < 6; i++){
        const x = w * (0.05 + i * 0.18 + R() * 0.04), y = h * (0.7 + (i % 2) * 0.05), s = w * (0.06 + R() * 0.03);
        c.fillStyle = '#6a4a3a'; c.fillRect(x - 3, y, 6, s * 0.5);
        for(let k = 0; k < 3; k++){ c.fillStyle = '#2f7a5a'; c.beginPath(); c.moveTo(x, y - s * (1.4 - k * 0.4)); c.lineTo(x - s * (0.5 + k * 0.15), y - s * (0.5 - k * 0.45)); c.lineTo(x + s * (0.5 + k * 0.15), y - s * (0.5 - k * 0.45)); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x, y - s * (1.4 - k * 0.4)); c.lineTo(x - s * 0.2, y - s * (1.05 - k * 0.4)); c.lineTo(x + s * 0.2, y - s * (1.05 - k * 0.4)); c.closePath(); c.fill(); }
      }
      // igloo
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.8, h * 0.88, w * 0.11, Math.PI, 0); c.fill(); c.fillStyle = '#bfe2f8'; c.beginPath(); c.arc(w * 0.8, h * 0.88, w * 0.04, Math.PI, 0); c.fill();
    },
    init(w, h){ return parts(60, w, h, 43); },
    anim(c, w, h, t, pulse, P){
      // snowman waving to the beat
      const x = w * 0.2, y = h * 0.86, s = w * 0.06;
      c.strokeStyle = '#8fb8d8'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x, y, s, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y - s * 1.4, s * 0.72, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y - s * 2.45, s * 0.5, 0, TAU); c.stroke();
      circ(c, x, y, s, '#fff'); circ(c, x, y - s * 1.4, s * 0.72, '#fff'); circ(c, x, y - s * 2.45, s * 0.5, '#fff');
      circ(c, x, y - s * 1.55, s * 0.08, '#333'); circ(c, x, y - s * 1.25, s * 0.08, '#333');
      circ(c, x - s * 0.17, y - s * 2.55, s * 0.07, '#222'); circ(c, x + s * 0.17, y - s * 2.55, s * 0.07, '#222');
      c.fillStyle = '#ff8a2a'; c.beginPath(); c.moveTo(x, y - s * 2.45); c.lineTo(x + s * 0.45, y - s * 2.38); c.lineTo(x, y - s * 2.33); c.closePath(); c.fill();
      c.fillStyle = '#e84a6a'; c.fillRect(x - s * 0.55, y - s * 2.05, s * 1.1, s * 0.18);
      c.strokeStyle = '#6a4a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(x + s * 0.65, y - s * 1.5); c.lineTo(x + s * 1.4, y - s * (2 + pulse * 0.5)); c.moveTo(x - s * 0.65, y - s * 1.5); c.lineTo(x - s * 1.3, y - s * 1.9); c.stroke();
      c.fillStyle = '#fff';
      for(let i = 0; i < P.length; i++){
        const p = P[i], yy = (p.y + t * 30 * p.v) % h, xx = p.x + Math.sin(t * 0.9 + p.ph) * 16, r = 1.5 + p.s * 2.2;
        c.globalAlpha = 0.85; c.beginPath(); c.arc(xx, yy, r, 0, TAU); c.fill();
      }
      c.globalAlpha = 1;
    } },
  { id:'rainbow', name:['قوس قزح', 'Rainbow Sky', 'Gökkuşağı'], em:'🌈', hero:'me', need:30,
    tile:{ a:'#5a2aa0', b:'#36156e', edge:'#fff2a8', hold:'#4a2288', fill:'#ffe14d', glow:'#ffd24d' }, lane:'rgba(255,255,255,.14)', div:'rgba(255,255,255,.55)', line:'#ff7a3a',
    paint(c, w, h){
      sky(c, w, h, ['#7fc8ff', '#ffc2e0', '#ffe2a8']);
      const cols = ['#ff5a5a', '#ff9f3a', '#ffe14d', '#6fd86a', '#4fb8ff', '#9a6aff'];
      c.lineWidth = w * 0.04;
      for(let i = 0; i < cols.length; i++){ c.strokeStyle = cols[i]; c.beginPath(); c.arc(w * 0.5, h * 0.72, w * (0.62 - i * 0.04), Math.PI, 0); c.stroke(); }
      cloud(c, -w * 0.05, h * 0.7, w * 0.09, '#fff'); cloud(c, w * 0.85, h * 0.7, w * 0.09, '#fff');
      hills(c, w, h, h * 0.86, h * 0.03, 3, '#8fe08a');
    },
    init(w, h){ return parts(12, w, h, 51); },
    anim(c, w, h, t, pulse, P){
      const cols = BALLOON;
      for(let i = 0; i < P.length; i++){
        const p = P[i], y = h - ((t * 26 * p.v + p.y) % (h + 120)) + 60, x = p.x + Math.sin(t * 0.9 + p.ph) * 18, r = w * 0.035 * (0.8 + p.s * 0.3) * (1 + pulse * 0.06);
        c.strokeStyle = 'rgba(80,80,80,.45)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + r); c.quadraticCurveTo(x + 6, y + r * 2, x, y + r * 3); c.stroke();
        c.fillStyle = cols[p.k]; c.beginPath(); c.ellipse(x, y, r * 0.85, r, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.ellipse(x - r * 0.3, y - r * 0.35, r * 0.2, r * 0.3, -0.4, 0, TAU); c.fill();
      }
      for(let i = 0; i < 3; i++){ const x = ((t * 30 + i * 140) % (w + 80)) - 40, y = h * (0.15 + i * 0.07) + Math.sin(t * 3 + i) * 5; c.strokeStyle = '#4a3a5a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 8, y - 4 * (0.5 + Math.sin(t * 8 + i) * 0.5)); c.quadraticCurveTo(x - 4, y, x, y); c.quadraticCurveTo(x + 4, y, x + 8, y - 4 * (0.5 + Math.sin(t * 8 + i) * 0.5)); c.stroke(); }
    } }
];
window.PianoThemes = { list:THEMES, rr, circ, note };
})();
