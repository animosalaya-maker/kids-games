/* Bobo Garden («جنينة بوبو 🌻») — main game.
   A sunny yard: your soil plot (6 tiles at the start, up to 25), a cute farmhouse, a seed stall, a market stand,
   a tool shed and a little pond. Plant → water → grow (5 visible stages) → pick → sell for «قروش البستان».
   Upgrades: bigger plot, sprinkler, scarecrow (no cheeky crows), greenhouse, fertilizer.
   Weather: rain (waters everything), golden hour (golden fruit), rare «مطر نجوم» (crystal fruit).
   «كتاب البستان» collects everything you picked. Plants keep growing a bit while the game is closed (capped).
   Online rooms (Supabase presence like heist; ?mp=local = BroadcastChannel): friends visit the host's garden,
   help water (both get a small bonus) and gift fruit with a two-step double confirmation. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeGardenModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const GM = makeGardenModels(THREE, K);
const { PLANTS, PLANT_IDS, VARIANTS, MAT } = GM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const COIN = '💰';
const mmss = s => { s = Math.max(0, Math.ceil(s)); return N(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0'); };

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const COLS = 5, ROWS = 5, TILE = 1.75, SOIL = 1.5, NCELL = COLS * ROWS;
const cellX = i => (i % COLS - 2) * TILE, cellZ = i => (Math.floor(i / COLS) - 2) * TILE;
/* plot levels: rectangles of cells (c0, c1, r0, r1) added at each level → 6, 9, 12, 18, 20, 25 tiles */
const PLOT_RECTS = [[1, 3, 2, 3], [1, 3, 1, 3], [1, 3, 1, 4], [0, 4, 1, 3], [0, 4, 1, 4], [0, 4, 0, 4]];
const PLOT_MAX = PLOT_RECTS.length - 1;
const PLOT_PRICE = [60, 150, 300, 600, 1000];
const unlockedSet = lvl => { const s = new Set(); for(let l = 0; l <= lvl; l++){ const [c0, c1, r0, r1] = PLOT_RECTS[l]; for(let r = r0; r <= r1; r++) for(let c = c0; c <= c1; c++) s.add(r * COLS + c); } return s; };
const PLOT_N = PLOT_RECTS.map((_, l) => unlockedSet(l).size);
const WATER_T = 60, REGROW_AT = .76, OFFLINE_CAP = 30 * 60, SPRINKLE_T = 12, GREEN_MUL = 1.4, FERT_MUL = 2, HELP_BONUS = .08, HELP_COINS = 3, HELP_MAX = 10;
const START_COINS = 20;
const UPG = {
  plot:      { e:'🟫', name:L('جنينة أكبر', 'Bigger garden', 'Daha büyük bahçe'), info:L('أراضي زيادة للزرع', 'More soil to plant in', 'Ekmek için daha çok toprak') },
  sprinkler: { e:'💦', name:L('رشّاش مي', 'Sprinkler', 'Fıskiye'), price:250, info:L('بيسقي الزرع لحالو', 'Waters plants by itself', 'Bitkileri kendi sular') },
  scarecrow: { e:'🌾', name:L('فزّاعة', 'Scarecrow', 'Korkuluk'), price:120, info:L('ما بيخلّي الغربان تقرّب', 'Keeps the crows away', 'Kargaları uzak tutar') },
  greenhouse:{ e:'🪴', name:L('بيت بلاستيك', 'Greenhouse', 'Sera'), price:500, info:L('الزرع بيكبر أسرع', 'Plants grow faster', 'Bitkiler daha hızlı büyür') },
  fert:      { e:'🧪', name:L('سماد ×3', 'Fertilizer ×3', 'Gübre ×3'), price:40, info:L('نبتة بتكبر أسرع وبتعطي أكتر', 'A plant grows faster and gives more', 'Bitki daha hızlı büyür, daha çok verir') }
};
const UPG_IDS = Object.keys(UPG);
const PAGES = [
  { id:'veg', e:'🥕', name:L('الخضرة', 'Veggies', 'Sebzeler'), items:['carrot', 'tomato', 'corn', 'pumpkin'] },
  { id:'fruit', e:'🍓', name:L('الفواكه', 'Fruits', 'Meyveler'), items:['strawberry', 'blueberry', 'watermelon', 'apple'] },
  { id:'wonder', e:'🌻', name:L('العجايب', 'Wonders', 'Harikalar'), items:['sunflower', 'cactus'] }
];
const PAGE_REWARD = [5, 10, 15];        // World coins for: everything picked / everything golden / everything crystal
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const newUid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const stageOf = g => g >= 1 ? 4 : g >= .75 ? 3 : g >= .45 ? 2 : g >= .15 ? 1 : 0;
const itemKey = (p, v) => p + (v ? ':' + VARIANTS[v].id : '');
const parseItem = k => { const [p, v] = String(k).split(':'); return PLANTS[p] ? { p, v:v === 'g' ? 1 : v === 'c' ? 2 : 0 } : null; };
const itemEmoji = k => { const it = parseItem(k); return it ? PLANTS[it.p].e + VARIANTS[it.v].tag : '❓'; };
const itemName = k => { const it = parseItem(k); return it ? PLANTS[it.p].name + (it.v ? ' ' + VARIANTS[it.v].name : '') : ''; };
const itemPrice = k => { const it = parseItem(k); return it ? PLANTS[it.p].sell * VARIANTS[it.v].mul : 0; };

/* ---------- save (this device): garden_save v1 ---------- */
const SAVE_KEY = 'garden_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function okTile(t){
  if(!t || typeof t !== 'object' || !PLANTS[t.p]) return null;
  return { p:t.p, g:clamp(+t.g || 0, 0, 1), w:clamp(+t.w || 0, 0, WATER_T), v:clamp(t.v | 0, 0, 2), f:!!t.f, n:clamp(t.n | 0, 0, 9999) };
}
function freshSave(){ return { v:SAVE_V, coins:START_COINS, seeds:{ carrot:4 }, basket:{}, plot:0, tiles:Array(NCELL).fill(null), up:{ sprinkler:false, scarecrow:false, greenhouse:false }, fert:0, book:{}, claims:{}, daily:today(), tut:0, hero:null, t:Date.now(), picked:0, sold:0 }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.coins = clamp(Math.floor(+s.coins || 0), 0, 9999999);
      s.plot = clamp(s.plot | 0, 0, PLOT_MAX);
      const tiles = Array.isArray(v.tiles) ? v.tiles : [], un = unlockedSet(s.plot);
      s.tiles = Array.from({ length:NCELL }, (_, i) => un.has(i) ? okTile(tiles[i]) : null);
      const bag = (o, ok) => { const r = {}; if(o && typeof o === 'object') for(const k in o){ const n = clamp(o[k] | 0, 0, 999); if(n > 0 && ok(k)) r[k] = n; } return r; };
      s.seeds = bag(v.seeds, k => !!PLANTS[k]); s.basket = bag(v.basket, k => !!parseItem(k));
      s.up = { sprinkler:!!(v.up && v.up.sprinkler), scarecrow:!!(v.up && v.up.scarecrow), greenhouse:!!(v.up && v.up.greenhouse) };
      s.fert = clamp(s.fert | 0, 0, 99);
      s.book = {}; if(v.book && typeof v.book === 'object') for(const k in v.book) if(PLANTS[k] && Array.isArray(v.book[k])) s.book[k] = [0, 1, 2].map(j => clamp(v.book[k][j] | 0, 0, 99999));
      s.claims = {}; if(v.claims && typeof v.claims === 'object') for(const p of PAGES) s.claims[p.id] = clamp(v.claims[p.id] | 0, 0, 3);
      s.t = +v.t || Date.now();
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; SAVE.t = Date.now(); rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const unlocked = () => unlockedSet(SAVE.plot);
const seedCount = () => Object.values(SAVE.seeds).reduce((a, b) => a + b, 0);
const basketCount = () => Object.values(SAVE.basket).reduce((a, b) => a + b, 0);

/* ---------- Always-landscape stage ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, SAL = 0, SAB = 0;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  const st = stage.style;
  st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? `translateX(${VW}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SH + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SH <= 520);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
}
function toLayer(cx, cy){ return ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy }; }
layout();

/* ---------- Sound (tiny synth, no files) ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true';
function ac(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ actx = null; } }
  if(actx && actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
function tone(freq, dur, type, vol, delay, toFreq){
  if(muted) return; const a = ac(); if(!a) return;
  const t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t0);
  if(toFreq) o.frequency.exponentialRampToValueAtTime(toFreq, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(a.destination); o.start(t0); o.stop(t0 + dur + 0.05);
}
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  buy(){ [660, 880, 1100].forEach((f, i) => tone(f, .11, 'triangle', .1, i * .06)); },
  plant(){ tone(260, .12, 'sine', .12, 0, 180); tone(520, .1, 'triangle', .08, .1, 780); },
  water(){ [0, .12, .24, .36, .5].forEach(d => tone(900 + Math.random() * 400, .08, 'sine', .04, d, 400)); },
  pop(){ tone(500, .08, 'sine', .12, 0, 1100); },
  pick(){ [784, 988, 1175, 1568].forEach((f, i) => tone(f, .1, 'triangle', .1, i * .07)); },
  coins(){ [1318, 1568, 1976, 1568, 2093].forEach((f, i) => tone(f, .07, 'square', .045, i * .06)); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  caw(){ tone(420, .12, 'sawtooth', .06, 0, 300); tone(400, .14, 'sawtooth', .06, .16, 280); },
  flap(){ [0, .07, .14].forEach(d => tone(180, .05, 'triangle', .05, d, 120)); },
  grow(){ [392, 523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .09, i * .08)); },
  rain(){ tone(300, .5, 'sine', .05, 0, 200); },
  magic(){ [784, 1046, 1318, 1568, 2093, 2637].forEach((f, i) => tone(f, .16, 'sine', .07, i * .08)); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  heart(){ tone(880, .1, 'sine', .1, 0, 1320); tone(1320, .12, 'sine', .07, .08, 1760); }
};

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcdeeff, 50, 130);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff4e2, 0x7f9a6c, 1.75); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-16, right:16, top:16, bottom:-16, near:1, far:90 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(14, 30, 16);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, skyMat);
  const pa = g.attributes.position, a = new THREE.Color(0x5fb8f5), h = new THREE.Color(0xfff2d6), b = new THREE.Color(0xbfe6ff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles (instanced confetti / sparkles / water drops) ---------- */
const PMAX = 300, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .7 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function spray(x, y, z, dx, dz, n){   // water from a watering can or sprinkler
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    p.life = .45 + Math.random() * .3; p.x = x; p.y = y; p.z = z; p.vx = dx * (1 + Math.random()) + (Math.random() - .5) * .8; p.vz = dz * (1 + Math.random()) + (Math.random() - .5) * .8; p.vy = .5 + Math.random(); p.s = .6 + Math.random() * .4; p.g = 9;
    pMesh.setColorAt(i, _c.set(Math.random() < .5 ? 0x8fd6ff : 0xd8f3ff));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
/* floating sprites (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  drop:iconTex(x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 30, 0, 6.3); x.fill(); x.fillStyle = '#3fa8f5'; x.beginPath(); x.moveTo(32, 10); x.bezierCurveTo(44, 26, 48, 34, 48, 40); x.arc(32, 40, 16, 0, Math.PI); x.bezierCurveTo(16, 34, 20, 26, 32, 10); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(26, 40, 4, 6, -.3, 0, 6.3); x.fill(); }),
  ready:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); x.arc(32, 32, 30, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); x.strokeStyle = '#7a4a24'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 12, Math.PI, 0); x.stroke(); x.fillStyle = '#9a6b3c'; x.beginPath(); x.moveTo(14, 32); x.lineTo(50, 32); x.lineTo(45, 50); x.lineTo(19, 50); x.closePath(); x.fill(); x.fillStyle = '#e8402f'; x.beginPath(); x.arc(27, 29, 6, 0, 6.3); x.fill(); x.fillStyle = '#5fbf4a'; x.beginPath(); x.arc(37, 28, 6, 0, 6.3); x.fill(); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); }),
  feather:iconTex(x => { x.fillStyle = '#3d4466'; x.beginPath(); x.ellipse(32, 32, 9, 24, .6, 0, 6.3); x.fill(); x.strokeStyle = '#6a7398'; x.lineWidth = 2; x.beginPath(); x.moveTo(18, 52); x.lineTo(46, 12); x.stroke(); }),
  plus:iconTex(x => { x.fillStyle = '#5ed6a0'; x.beginPath(); x.arc(32, 32, 30, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#fff'; x.fillRect(27, 14, 10, 36); x.fillRect(14, 27, 36, 10); })
};
const floaters = [];
for(let i = 0; i < 40; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.heart, transparent:true, depthWrite:false })); s.visible = false; scene.add(s); floaters.push({ s, life:0, vx:0, vy:0, vz:0 }); }
let fNext = 0;
function floatIcon(kind, x, y, z, n = 1, size = .45){
  for(let k = 0; k < n; k++){
    const f = floaters[fNext]; fNext = (fNext + 1) % floaters.length;
    f.s.material.map = TEX[kind]; f.s.material.needsUpdate = true; f.s.visible = true;
    f.s.position.set(x + (Math.random() - .5) * .5, y, z + (Math.random() - .5) * .5); f.s.scale.setScalar(size * (.8 + Math.random() * .4));
    f.life = 1.3 + Math.random() * .4; f.vx = (Math.random() - .5) * .8; f.vy = 1 + Math.random() * .6; f.vz = (Math.random() - .5) * .8;
  }
}
function updateFloaters(dt){
  for(const f of floaters){ if(f.life <= 0) continue; f.life -= dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = clamp(f.life * 1.5, 0, 1); if(f.life <= 0) f.s.visible = false; }
}

/* ======================================================================
   The world: lawn, paths, farmhouse, seed stall, market stand, tool shed, pond, trees, fence
   ====================================================================== */
const CIRCLES = [], BOXES = [], SEGS = [];
const BOUND = 19;
const SPOTS = {
  seeds:{ x:-9, z:4.6, fx:-9, fz:6.6, e:'🌱' },     // the seed stall (front point is where you stand)
  sell: { x:9, z:4.6, fx:9, fz:6.6, e:'🧺' },
  shed: { x:-9.5, z:-6.5, fx:-7.2, fz:-4.6, e:'🔧' }
};
const POND = { x:10, z:-6.5, r:3.4 };
const HOUSE = { x:1.5, z:-11.5 };
const SPAWN = { x:0, z:4.8, f:Math.PI };
let seed = 11;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function signTex(text, bg, fg, icon){
  return canvasTex(512, 128, x => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, 504, 120, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 60px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(text, 286, 70);
    if(icon) icon(x);
  });
}
const sproutIcon = x => { x.fillStyle = '#fff'; x.fillRect(66, 52, 8, 48); x.beginPath(); x.ellipse(52, 50, 20, 11, -.5, 0, 6.3); x.fill(); x.beginPath(); x.ellipse(88, 44, 22, 12, .5, 0, 6.3); x.fill(); };
const basketIcon = x => { x.strokeStyle = '#fff'; x.lineWidth = 7; x.beginPath(); x.arc(70, 64, 22, Math.PI, 0); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(40, 64); x.lineTo(100, 64); x.lineTo(92, 96); x.lineTo(48, 96); x.closePath(); x.fill(); };
const toolIcon = x => { x.fillStyle = '#fff'; x.save(); x.translate(70, 64); x.rotate(-.7); x.fillRect(-5, -10, 10, 46); x.fillRect(-18, -34, 36, 22); x.restore(); };
function signMesh(tex, w, h, x, y, z, ry = 0){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:tex, transparent:true })); m.position.set(x, y, z); m.rotation.y = ry; world.add(m); return m; }

const world = new THREE.Group(); scene.add(world);
let pondTex, guideArrow, guideRing, waterMesh;
function buildWorld(){
  /* ground with gentle colour variation */
  {
    const g = new THREE.CircleGeometry(150, 64); g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x98da6c), b = new THREE.Color(0x7fc95c), far = new THREE.Color(0xa6d98a);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z), n = (Math.sin(x * .23) + Math.cos(z * .19)) * .5 + .5; _c.copy(a).lerp(b, n * .6).lerp(far, clamp((d - 30) / 40, 0, 1)); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; world.add(m);
  }
  /* paths (flat strips) and the dark-soil frame around the plot */
  const F = new Merge(), PATH = 0xf3dfb4;
  const seg = (x1, z1, x2, z2, w = 1.8) => { const L2 = Math.hypot(x2 - x1, z2 - z1); F.add(GEO.box, (x1 + x2) / 2, .02, (z1 + z2) / 2, w, .04, L2, 0, Math.atan2(x2 - x1, z2 - z1), 0, PATH); F.add(GEO.cyl, x2, .02, z2, w / 2, .04, w / 2, 0, 0, 0, PATH); F.add(GEO.cyl, x1, .02, z1, w / 2, .04, w / 2, 0, 0, 0, PATH); };
  seg(-9, 7.2, 9, 7.2, 2.2); seg(0, 7.2, 0, 12); seg(-9, 7.2, -9, 5.6); seg(9, 7.2, 9, 5.6); seg(-6.2, 6.5, -6.2, -4.8); seg(-6.2, -4.8, -2, -8.6); seg(-2, -8.6, HOUSE.x, -8.9);
  seg(6.2, 6.5, 6.2, -3); seg(6.2, -3, 7.2, -4);
  F.add(GEO.box, 0, .025, 0, COLS * TILE + 1.1, .05, ROWS * TILE + 1.1, 0, 0, 0, 0x8fce62);      // lawn under the plot
  world.add(meshOf(F, false, true));

  /* ---------- the farmhouse (decorative) ---------- */
  {
    const M = new Merge(), x = HOUSE.x, z = HOUSE.z, w = 7, d = 5, h = 3;
    M.add(GEO.box, x, h / 2, z, w, h, d, 0, 0, 0, 0xfff1d8);
    M.add(GEO.box, x, .18, z, w + .12, .36, d + .12, 0, 0, 0, 0xd9a46a);
    M.add(GEO.box, x, h + .05, z, w + .3, .14, d + .3, 0, 0, 0, 0xf0a46a);
    // gable roof: two slanted slabs + gable ends
    for(const s of [-1, 1]) M.add(GEO.box, x, h + 1.15, z + s * 1.42, w + .9, .22, 3.35, s * .72, 0, 0, 0xe0604a);
    M.add(GEO.box, x, h + 2.32, z, w + .95, .2, .3, 0, 0, 0, 0xc84f3c);
    for(const s of [-1, 1]){ M.add(GEO.cone4, x + s * (w / 2 - .05), h + .95, z, 2.55 / .707, 1.85, .2, 0, Math.PI / 4, 0, 0xfff1d8); }
    M.add(GEO.box, x + 2.2, h + 1.9, z - 1, .8, 1.8, .8, 0, 0, 0, 0xd7b08a); M.add(GEO.box, x + 2.2, h + 2.85, z - 1, .95, .16, .95, 0, 0, 0, 0xbf9670);
    // door, windows with flower boxes (one colour per box), porch
    M.add(GEO.box, x, 1.1, z + d / 2 + .02, 1.3, 2.1, .1, 0, 0, 0, 0x8a5a36); M.add(GEO.sm, x + .42, 1.1, z + d / 2 + .1, .08, .08, .08, 0, 0, 0, 0xffc83a);
    M.add(GEO.box, x, 2.35, z + d / 2 + .5, 2.4, .1, 1.2, -.25, 0, 0, 0xe0604a);
    for(const s of [-1, 1]) M.add(GEO.cyl8, x + s * 1.05, 1.15, z + d / 2 + 1, .07, 2.3, .07, 0, 0, 0, 0xffffff);
    M.add(GEO.box, x, .1, z + d / 2 + .7, 2.6, .2, 1.4, 0, 0, 0, 0xd9a46a);
    for(const s of [-1, 1]){
      const wx = x + s * 2.3;
      M.add(GEO.box, wx, 1.75, z + d / 2 + .03, 1.3, 1.1, .1, 0, 0, 0, 0xa8dcff);
      M.add(GEO.box, wx, 1.75, z + d / 2 + .06, .08, 1.1, .1, 0, 0, 0, 0xffffff); M.add(GEO.box, wx, 1.75, z + d / 2 + .06, 1.3, .08, .1, 0, 0, 0, 0xffffff);
      for(const q of [-1, 1]) M.add(GEO.box, wx + q * .82, 1.75, z + d / 2 + .06, .3, 1.15, .08, 0, 0, 0, 0x6cc4ff);
      M.add(GEO.box, wx, 1.1, z + d / 2 + .2, 1.45, .28, .34, 0, 0, 0, 0x9a6b3c);
      for(let i = 0; i < 6; i++) M.add(GEO.sm, wx - .55 + i * .22, 1.3, z + d / 2 + .22, .1, .09, .1, 0, 0, 0, s < 0 ? 0xff8fb1 : 0xffd23f);
    }
    for(const s of [-1, 1]) M.add(GEO.box, x + s * (w / 2 + .03), 1.75, z, .1, 1.1, 1.3, 0, 0, 0, 0xa8dcff);
    world.add(meshOf(M));
    BOXES.push({ x0:x - w / 2 - .1, z0:z - d / 2 - .1, x1:x + w / 2 + .1, z1:z + d / 2 + .1 });
    signMesh(signTex(L('بيت المزرعة', 'Farmhouse', 'Çiftlik evi'), '#e0604a', '#fff', x2 => { x2.fillStyle = '#fff'; x2.beginPath(); x2.moveTo(44, 70); x2.lineTo(70, 40); x2.lineTo(96, 70); x2.closePath(); x2.fill(); x2.fillRect(52, 68, 36, 30); }), 3, .75, x, h + .55, z + d / 2 + .16);
  }
  /* ---------- stalls: seed stall (green), market stand (orange): one colour each, no stripes ---------- */
  const stall = (S, col, colD, sign, goods) => {
    const M = new Merge(), x = S.x, z = S.z;
    M.add(GEO.box, x, .55, z, 3.2, 1.1, 1.3, 0, 0, 0, 0xc98a52); M.add(GEO.box, x, 1.14, z + .05, 3.4, .1, 1.45, 0, 0, 0, 0xe6b67e);
    for(const s of [-1, 1]) for(const q of [-1, 1]) M.add(GEO.cyl8, x + s * 1.55, 1.4, z + q * .6, .07, 2.8, .07, 0, 0, 0, 0xffffff);
    M.add(GEO.box, x, 2.85, z + .1, 3.7, .12, 2, -.18, 0, 0, col);
    for(let i = 0; i < 8; i++) M.add(GEO.cyl, x - 1.62 + i * .463, 2.62, z + 1.08, .23, .1, .23, Math.PI / 2, 0, 0, colD);
    goods(M, x, z);
    world.add(meshOf(M));
    BOXES.push({ x0:x - 1.75, z0:z - .75, x1:x + 1.75, z1:z + .75 });
    signMesh(sign, 2.8, .7, x, 3.35, z + .4);
  };
  stall(SPOTS.seeds, 0x5ed6a0, 0x3fb882, signTex(L('دكانة البذور', 'Seed shop', 'Tohumcu'), '#3fb882', '#fff', sproutIcon), (M, x, z) => {
    const cols = [0xff8a1f, 0xe8402f, 0xffc928, 0x4a5fd8, 0xff6fae, 0x3fae4a];
    for(let i = 0; i < 6; i++){ M.add(GEO.box, x - 1.25 + i * .5, 1.42, z + .25, .36, .46, .06, -.25, 0, 0, 0xfff6e6); M.add(GEO.box, x - 1.25 + i * .5, 1.45, z + .28, .26, .22, .02, -.25, 0, 0, cols[i]); }
    for(const s of [-1, 1]){ M.add(GEO.cyl, x + s * 2.2, .3, z + .6, .32, .6, .32, 0, 0, 0, 0xd98a5a); M.add(GEO.ico1, x + s * 2.2, .85, z + .6, .4, .45, .4, 0, 0, 0, 0x5fbf4a); }
  });
  stall(SPOTS.sell, 0xffb347, 0xf0902a, signTex(L('السوق', 'Market', 'Pazar'), '#f0902a', '#fff', basketIcon), (M, x, z) => {
    const crate = (cx, col, fruitR) => { M.add(GEO.box, cx, 1.32, z + .1, .8, .32, .6, 0, 0, 0, 0xb07a44); for(let i = 0; i < 6; i++) M.add(GEO.sph, cx - .24 + (i % 3) * .24, 1.52, z + (i < 3 ? -.03 : .23), fruitR, fruitR, fruitR, 0, 0, 0, col); };
    crate(x - 1, 0xe8402f, .11); crate(x, 0xff8a1f, .1); crate(x + 1, 0xffd93d, .1);
    M.add(GEO.cyl, x + 2.15, .35, z + .5, .45, .7, .45, 0, 0, 0, 0xb07a44); M.add(GEO.sph, x + 2.15, .78, z + .5, .38, .3, .38, 0, 0, 0, 0x3fae4a);
    M.add(GEO.box, x - 2.2, .4, z + .45, .7, .8, .7, 0, .3, 0, 0xb07a44); M.add(GEO.sph, x - 2.2, .9, z + .45, .32, .3, .32, 0, 0, 0, 0xff8c1a);
  });
  /* ---------- tool shed (upgrades) ---------- */
  {
    const M = new Merge(), x = SPOTS.shed.x, z = SPOTS.shed.z, w = 3.4, d = 2.8, h = 2.3;
    M.add(GEO.box, x, h / 2, z, w, h, d, 0, 0, 0, 0x7fb6e8);
    for(let i = 0; i < 7; i++) M.add(GEO.box, x - w / 2 + .25 + i * .48, h / 2, z + d / 2 + .02, .06, h, .06, 0, 0, 0, 0x6aa0d4);
    for(const s of [-1, 1]) M.add(GEO.box, x, h + .55, z + s * .78, w + .5, .14, 1.8, s * .6, 0, 0, 0x3f6fae);
    for(const s of [-1, 1]) M.add(GEO.cone4, x + s * (w / 2 - .02), h + .02, z, 1.45 / .707, 1.1, .1, 0, Math.PI / 4, 0, 0x7fb6e8);
    M.add(GEO.box, x + .7, .95, z + d / 2 + .05, 1.1, 1.9, .1, 0, 0, 0, 0xffffff); M.add(GEO.box, x + .7, .95, z + d / 2 + .1, .9, 1.7, .05, 0, 0, 0, 0xfff1d8);
    M.add(GEO.box, x - .8, 1.4, z + d / 2 + .05, .8, .7, .08, 0, 0, 0, 0xa8dcff);
    // tools leaning on the wall: rake, shovel, a watering can on a barrel
    M.add(GEO.cyl8, x + w / 2 + .15, .9, z + .5, .035, 1.8, .035, 0, 0, -.18, 0x9a6b3c); M.add(GEO.box, x + w / 2 + .32, 1.75, z + .5, .08, .06, .5, 0, 0, -.18, 0x8a96a8);
    M.add(GEO.cyl8, x + w / 2 + .15, .9, z - .3, .035, 1.8, .035, 0, 0, -.15, 0x9a6b3c); M.add(GEO.box, x + w / 2 + .15, .12, z - .3, .3, .36, .05, 0, 0, -.15, 0x8a96a8);
    M.add(GEO.cyl, x - 2.1, .4, z + 1, .38, .8, .38, 0, 0, 0, 0x9a6b3c);
    world.add(meshOf(M));
    const can = new THREE.Mesh(GM.canGeo(0x5ed6a0), MAT); can.position.set(x - 2.1, .92, z + 1); can.castShadow = true; world.add(can);
    BOXES.push({ x0:x - w / 2 - .1, z0:z - d / 2 - .1, x1:x + w / 2 + .35, z1:z + d / 2 + .1 }); CIRCLES.push({ x:x - 2.1, z:z + 1, r:.4 });
    signMesh(signTex(L('مخزن الأدوات', 'Tool shed', 'Alet kulübesi'), '#3f6fae', '#fff', toolIcon), 2.6, .65, x, h + .2, z + d / 2 + .5);
  }
  /* ---------- the little pond with lily pads, reeds and stones ---------- */
  {
    const M = new Merge();
    M.add(GEO.cyl, POND.x, .02, POND.z, POND.r + .35, .05, POND.r + .1, 0, 0, 0, 0xe8d8a8);
    for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2, r = POND.r + .35; M.add(GEO.dode, POND.x + Math.cos(a) * r, .12, POND.z + Math.sin(a) * r * .9, .32 + (i % 3) * .06, .2, .3, 0, i, 0, i % 2 ? 0xc9c2b4 : 0xb5ad9f); }
    for(const [dx, dz] of [[1.2, .6], [-1.3, -.4], [.3, -1.5], [-.6, 1.4]]){ M.add(GEO.cyl, POND.x + dx, .1, POND.z + dz, .42, .02, .42, 0, 0, 0, 0x5cb85a); }
    M.add(GEO.sm, POND.x - .6, .14, POND.z + 1.4, .12, .1, .12, 0, 0, 0, 0xff8fb1); M.add(GEO.sm, POND.x + 1.2, .14, POND.z + .6, .12, .1, .12, 0, 0, 0, 0xffffff);
    for(let i = 0; i < 12; i++){ const a = -2.2 + i * .1, r = POND.r + .5 + (i % 3) * .18; M.add(GEO.cyl8, POND.x + Math.cos(a) * r, .55, POND.z + Math.sin(a) * r, .03, 1.1 + (i % 3) * .25, .03, 0, 0, (i % 2 - .5) * .2, 0x5a9e46); if(i % 3 === 0) M.add(GEO.cyl8, POND.x + Math.cos(a) * r, 1.15, POND.z + Math.sin(a) * r, .07, .32, .07, 0, 0, 0, 0x9a6b3c); }
    world.add(meshOf(M));
    pondTex = canvasTex(256, 256, x => { x.fillStyle = '#5fc0ee'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 3; for(let i = 0; i < 18; i++){ x.beginPath(); const cx = (i * 71) % 256, cy = (i * 113) % 256; x.arc(cx, cy, 10 + (i % 4) * 6, .2, 2.2); x.stroke(); } });
    pondTex.wrapS = pondTex.wrapT = THREE.RepeatWrapping; pondTex.repeat.set(2, 2);
    waterMesh = new THREE.Mesh(new THREE.CircleGeometry(POND.r, 40), new THREE.MeshStandardMaterial({ map:pondTex, roughness:.12, metalness:.05, transparent:true, opacity:.92 }));
    waterMesh.rotation.x = -Math.PI / 2; waterMesh.scale.y = .9; waterMesh.position.set(POND.x, .07, POND.z); waterMesh.receiveShadow = true; world.add(waterMesh);
    CIRCLES.push({ x:POND.x, z:POND.z, r:POND.r + .2 });
  }
  /* ---------- white picket fence around the yard (gap at the front path) ---------- */
  {
    const FN = new Merge(), fcol = 0xffffff, R = 17.5, n = 56;
    for(let i = 0; i < n; i++){
      const a1 = i / n * Math.PI * 2, a2 = (i + 1) / n * Math.PI * 2, mid = (a1 + a2) / 2;
      if(Math.abs(angDiff(mid, Math.PI / 2)) < .1) continue;
      const x1 = Math.cos(a1) * R, z1 = Math.sin(a1) * R, x2 = Math.cos(a2) * R, z2 = Math.sin(a2) * R, L2 = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1);
      FN.add(GEO.box, x1, .45, z1, .16, .9, .16, 0, ry, 0, fcol); FN.add(GEO.cone4, x1, .97, z1, .12, .14, .12, 0, ry + Math.PI / 4, 0, fcol);
      for(const y of [.35, .7]) FN.add(GEO.box, (x1 + x2) / 2, y, (z1 + z2) / 2, .08, .1, L2, 0, ry, 0, fcol);
    }
    world.add(meshOf(FN));
  }
  /* flower beds along the house and the path (one colour per bed) */
  const FL = new Merge();
  const bed = (x, z, w, d, col) => { FL.add(GEO.box, x, .1, z, w, .2, d, 0, 0, 0, 0x9a6b44); for(let i = 0; i < w * d * 3; i++){ const fx = x + (srnd() - .5) * (w - .3), fz = z + (srnd() - .5) * (d - .3); FL.add(GEO.sm, fx, .3, fz, .1, .07, .1, 0, 0, 0, col); FL.add(GEO.sm, fx, .24, fz, .14, .05, .14, 0, 0, 0, 0x4fae4a); } };
  bed(HOUSE.x - 3, HOUSE.z + 3.3, 2.2, .7, 0xff8fb1); bed(HOUSE.x + 3, HOUSE.z + 3.3, 2.2, .7, 0xffd23f); bed(-3.2, 9.4, 3, .8, 0xffffff); bed(3.2, 9.4, 3, .8, 0xb99cff);
  bed(13.5, 1.5, 1, 3, 0xff8fb1); bed(-13.5, 0, 1, 3, 0xffd23f);
  world.add(meshOf(FL));
  /* trees (instanced), bushes */
  const T = [];
  const tree = (x, z, s = 1) => { T.push([x, z, s]); if(Math.hypot(x, z) < BOUND + 1) CIRCLES.push({ x, z, r:.55 * s }); };
  for(const [x, z] of [[-13, -9], [-14.5, 5.5], [14, -11], [14.5, 7], [-4.5, -14.5], [8.5, -14], [-12, 11], [12, 11.5]]) tree(x, z, 1 + srnd() * .35);
  for(let i = 0; i < 46; i++){ const a = i / 46 * Math.PI * 2 + srnd() * .05, r = 22 + srnd() * 8; tree(Math.cos(a) * r, Math.sin(a) * r, 1.2 + srnd() * .7); }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
  T.forEach(([x, z, s], i) => {
    _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
    _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
    _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
  });
  trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
  const BU = [];
  for(let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2; if(Math.abs(angDiff(a, Math.PI / 2)) < .25) continue; BU.push([Math.cos(a) * 16.4, Math.sin(a) * 16.4]); }
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.6, 1), new THREE.MeshStandardMaterial({ color:0x58b84e, roughness:.85, flatShading:true }), BU.length);
  BU.forEach(([x, z], i) => { _m.compose(_v.set(x, .4, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(1, .75, 1)); bush.setMatrixAt(i, _m); });
  bush.castShadow = true; world.add(bush);
  const HL = new Merge();
  for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2, r = 80 + srnd() * 20; HL.add(GEO.sph, Math.cos(a) * r, -4, Math.sin(a) * r, 22 + srnd() * 14, 12 + srnd() * 10, 18, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
  world.add(meshOf(HL, false, false));
  /* guide: a bouncing arrow over the place to go, and a ring on the ground */
  const GA = new Merge(); GA.add(GEO.cone, 0, 0, 0, .45, .7, .45, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .55, 0, .18, .6, .18, 0, 0, 0, 0xffc23d);
  guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
}

/* ---------- collisions: circles, boxes, the edge of the yard ---------- */
function collide(o, r){
  const d = Math.hypot(o.x, o.z); if(d > BOUND - r - .3){ const k = (BOUND - r - .3) / d; o.x *= k; o.z *= k; }
  for(const c of CIRCLES){ const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz; if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; } }
  for(const b of BOXES){
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rr) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; } }
  }
}

/* ======================================================================
   The plot: soil tiles, plants, icons, upgrades (sprinkler, scarecrow, greenhouse)
   ====================================================================== */
const plotGrp = new THREE.Group(); world.add(plotGrp);
const soilTex = canvasTex(128, 128, x => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(0,0,0,.13)'; for(let i = 0; i < 5; i++) x.fillRect(0, 10 + i * 25, 128, 7); x.fillStyle = 'rgba(255,255,255,.25)'; for(let i = 0; i < 40; i++) x.fillRect((i * 37) % 128, (i * 61) % 128, 3, 3); });
const soilMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(SOIL, .2, SOIL), new THREE.MeshStandardMaterial({ map:soilTex, roughness:1 }), NCELL);
soilMesh.receiveShadow = true; plotGrp.add(soilMesh);
const frameMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color:0xd59a5e, roughness:.8 }), NCELL * 4);
frameMesh.castShadow = true; frameMesh.receiveShadow = true; plotGrp.add(frameMesh);
const forSaleTex = canvasTex(128, 128, x => { x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 6; x.setLineDash([14, 10]); x.strokeRect(6, 6, 116, 116); x.fillStyle = 'rgba(70,120,40,.25)'; x.fillRect(6, 6, 116, 116); });
const saleMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(SOIL, SOIL), new THREE.MeshBasicMaterial({ map:forSaleTex, transparent:true, depthWrite:false }), NCELL);
saleMesh.rotation.x = 0; plotGrp.add(saleMesh);
const saleSign = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.plus, transparent:true, depthWrite:false })); saleSign.scale.setScalar(.8); saleSign.visible = false; plotGrp.add(saleSign);
const SOIL_DRY = new THREE.Color(0xb07a4c), SOIL_WET = new THREE.Color(0x6e4428);
const cells = Array.from({ length:NCELL }, (_, i) => {
  const grp = new THREE.Group(); grp.position.set(cellX(i), .2, cellZ(i)); plotGrp.add(grp);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.drop, transparent:true, depthWrite:false })); icon.visible = false; icon.scale.setScalar(.4); grp.add(icon);
  return { i, grp, fol:null, fruit:null, key:'', icon, iconK:'', ph:Math.random() * 6, pulse:0 };
});
/* extras that come with upgrades */
const extras = new THREE.Group(); plotGrp.add(extras);
let sprinklers = [], scarecrowMesh = null, greenhouse = null, sprinkleFx = 0;
function plotHalf(lvl){ let c0 = 9, c1 = -9, r0 = 9, r1 = -9; for(const i of unlockedSet(lvl)){ const c = i % COLS, r = Math.floor(i / COLS); c0 = Math.min(c0, c); c1 = Math.max(c1, c); r0 = Math.min(r0, r); r1 = Math.max(r1, r); } return { x0:(c0 - 2) * TILE - TILE / 2, x1:(c1 - 2) * TILE + TILE / 2, z0:(r0 - 2) * TILE - TILE / 2, z1:(r1 - 2) * TILE + TILE / 2 }; }
function buildExtras(view){
  while(extras.children.length){ const o = extras.children.pop(); if(o.geometry && o !== scarecrowMesh) o.geometry.dispose(); }
  sprinklers = []; scarecrowMesh = null; greenhouse = null;
  const b = plotHalf(view.lvl);
  if(view.up.sprinkler){ const g = GM.sprinklerGeo(); for(const [x, z] of [[b.x0 - .35, b.z0 - .35], [b.x1 + .35, b.z1 + .35], [b.x0 - .35, b.z1 + .35], [b.x1 + .35, b.z0 - .35]]){ const m = new THREE.Mesh(g, MAT); m.position.set(x, 0, z); m.castShadow = true; extras.add(m); sprinklers.push(m); } }
  if(view.up.scarecrow){ scarecrowMesh = new THREE.Mesh(GM.scarecrowGeo(), MAT); scarecrowMesh.castShadow = true; scarecrowMesh.position.set(b.x1 + 1.1, 0, (b.z0 + b.z1) / 2 - .5); scarecrowMesh.rotation.y = -.5; extras.add(scarecrowMesh); }
  if(view.up.greenhouse){
    const M = new Merge(), w = b.x1 - b.x0 + .9, d = b.z1 - b.z0 + .9, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, h = 2.5, FR = 0xffffff;
    for(const sx of [-1, 1]) for(const sz of [-1, 1]) M.add(GEO.box, cx + sx * w / 2, h / 2, cz + sz * d / 2, .1, h, .1, 0, 0, 0, FR);
    for(let i = 0; i <= Math.round(w / 1.75); i++){ const x = cx - w / 2 + i * w / Math.round(w / 1.75); M.add(GEO.box, x, h + .55, cz, .08, .08, d + .1, 0, 0, 0, FR); for(const s of [-1, 1]) M.add(GEO.box, x, h, cz + s * d / 2, .08, .08, .08, 0, 0, 0, FR); }
    for(const s of [-1, 1]) for(const q of [-1, 1]) M.add(GEO.box, cx + q * w / 2, h + .28, cz + s * d / 4, .08, .08, d / 2 / Math.cos(.42) + .05, s * -.42, 0, 0, FR);
    for(const s of [-1, 1]) M.add(GEO.box, cx, h, cz + s * d / 2, w, .08, .08, 0, 0, 0, FR);
    const frame = new THREE.Mesh(M.geometry(), MAT); frame.castShadow = false; extras.add(frame);
    const glass = new THREE.MeshStandardMaterial({ color:0xe8f8ff, roughness:.05, metalness:.1, transparent:true, opacity:.1, depthWrite:false, side:THREE.DoubleSide });
    const roof = new THREE.Group();
    for(const s of [-1, 1]){ const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d / 2 / Math.cos(.42)), glass); p.rotation.x = -Math.PI / 2 + s * .42; p.position.set(cx, h + .28, cz + s * d / 4); roof.add(p); }
    const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); back.position.set(cx, h / 2, cz - d / 2); roof.add(back);
    for(const s of [-1, 1]){ const sd = new THREE.Mesh(new THREE.PlaneGeometry(d, h), glass); sd.rotation.y = Math.PI / 2; sd.position.set(cx + s * w / 2, h / 2, cz); roof.add(sd); }
    extras.add(roof); greenhouse = { frame, roof };
  }
}
/* the garden shown: your own, or the host's while visiting */
let visiting = null;           // { lvl, up, tiles:[{p,g,w,v,f}|null] } from the host
const ownView = () => ({ lvl:SAVE.plot, up:SAVE.up, tiles:SAVE.tiles });
const curView = () => visiting || ownView();
let viewKey = '';
function rebuildPlot(){
  const view = curView(), un = unlockedSet(view.lvl), next = view.lvl < PLOT_MAX ? unlockedSet(view.lvl + 1) : new Set();
  let fi = 0;
  for(let i = 0; i < NCELL; i++){
    const x = cellX(i), z = cellZ(i), on = un.has(i);
    _m.compose(_v.set(x, .1, z), _q.identity(), _s.set(on ? 1 : 0, on ? 1 : 0, on ? 1 : 0)); soilMesh.setMatrixAt(i, _m);
    const sale = !on && next.has(i) && !visiting;
    _m.compose(_v.set(x, .045, z), _q.setFromEuler(_e.set(-Math.PI / 2, 0, 0)), _s.set(sale ? 1 : 0, sale ? 1 : 0, 1)); saleMesh.setMatrixAt(i, _m);
    for(const [dx, dz, w, d] of [[0, -.75, 1.62, .12], [0, .75, 1.62, .12], [-.75, 0, .12, 1.4], [.75, 0, .12, 1.4]]){
      _m.compose(_v.set(x + dx, .14, z + dz), _q.identity(), on ? _s.set(w, .28, d) : _s.set(0, 0, 0)); frameMesh.setMatrixAt(fi++, _m);
    }
    cells[i].grp.visible = on;
  }
  soilMesh.instanceMatrix.needsUpdate = frameMesh.instanceMatrix.needsUpdate = saleMesh.instanceMatrix.needsUpdate = true;
  if(next.size && !visiting){ let sx = 0, sz = 0, n = 0; for(const i of next) if(!un.has(i)){ sx += cellX(i); sz += cellZ(i); n++; } saleSign.position.set(sx / n, .6, sz / n); saleSign.visible = true; } else saleSign.visible = false;
  buildExtras(view);
  for(const c of cells) c.key = '#';
  viewKey = view.lvl + '|' + view.up.sprinkler + view.up.scarecrow + view.up.greenhouse + '|' + !!visiting;
}
function setCellPlant(c, t){
  const st = t ? stageOf(t.g) : -1, key = t ? t.p + st + (st === 4 ? t.v : 0) : '';
  if(key === c.key) return;
  const grew = t && c.key && c.key !== '#' && c.key.startsWith(t.p) && +c.key[t.p.length] < st;
  c.key = key;
  if(c.fol){ c.grp.remove(c.fol); c.fol = null; } if(c.fruit){ c.grp.remove(c.fruit); c.fruit = null; }
  if(!t) return;
  const g = GM.plantGeo(t.p, st);
  c.fol = new THREE.Mesh(g.fol, MAT); c.fol.castShadow = true; c.grp.add(c.fol);
  if(g.fruit){ c.fruit = new THREE.Mesh(g.fruit, GM.FRUIT_MAT[t.v] || MAT); c.fruit.castShadow = true; c.grp.add(c.fruit); }
  if(grew){ c.pulse = 1; burst(c.grp.position.x, .5, c.grp.position.z, 10, [0x7bd35c, 0xffffff, 0xffe14d], 2.5, .7); }
}
let wetKey = '';
function plotFrame(dt){
  const view = curView(), vk = view.lvl + '|' + view.up.sprinkler + view.up.scarecrow + view.up.greenhouse + '|' + !!visiting;
  if(vk !== viewKey) rebuildPlot();
  let wk = '';
  for(const c of cells){
    const t = view.tiles[c.i]; if(!c.grp.visible) continue;
    setCellPlant(c, t);
    const wet = !!(t && t.w > 0); wk += wet ? 1 : 0;
    // sway (more for tall plants), a happy bounce when a stage grows
    if(c.fol){ const st = stageOf(t.g), amp = .025 + st * .012, wv = Math.sin(T * 1.7 + c.ph) * amp + Math.sin(T * 2.9 + c.ph * 2) * amp * .4;
      c.pulse = Math.max(0, c.pulse - dt * 2.5); const sq = 1 + Math.sin(c.pulse * Math.PI) * .18;
      c.fol.rotation.z = wv; c.fol.rotation.x = wv * .6; c.fol.scale.set(sq, 2 - sq, sq);
      if(c.fruit){ c.fruit.rotation.z = wv; c.fruit.rotation.x = wv * .6; c.fruit.scale.copy(c.fol.scale); } }
    // icon: water drop when dry, basket when ripe
    const kind = !t ? '' : t.g >= 1 ? 'ready' : t.w <= 0 ? 'drop' : '';
    if(kind !== c.iconK){ c.iconK = kind; c.icon.visible = !!kind; if(kind){ c.icon.material.map = TEX[kind]; c.icon.material.needsUpdate = true; } }
    if(kind){ c.icon.position.y = GM.plantH(t.p, stageOf(t.g)) + .45 + Math.abs(Math.sin(T * 3 + c.ph)) * .12; }
    if(t && t.g >= 1 && t.v && Math.random() < dt * 3) burst(c.grp.position.x + (Math.random() - .5) * .8, .3 + Math.random() * GM.plantH(t.p, 4), c.grp.position.z + (Math.random() - .5) * .8, 1, t.v === 2 ? [0xbff4ff, 0xffffff] : [0xffd23f, 0xffffff], .6, .7, -.5, .3);
  }
  if(wk !== wetKey){ wetKey = wk; for(let i = 0; i < NCELL; i++){ const t = view.tiles[i]; soilMesh.setColorAt(i, t && t.w > 0 ? SOIL_WET : SOIL_DRY); } soilMesh.instanceColor.needsUpdate = true; }
  if(saleSign.visible) saleSign.position.y = .6 + Math.abs(Math.sin(T * 2.4)) * .25;
  // sprinkler spray now and then
  if(sprinklers.length){ sprinkleFx -= dt; if(sprinkleFx <= 0){ sprinkleFx = .12; for(const s of sprinklers){ const a = T * 2 + s.position.x; spray(s.position.x, .9, s.position.z, Math.cos(a) * 1.4, Math.sin(a) * 1.4, 2); } } }
  if(scarecrowMesh) scarecrowMesh.rotation.z = Math.sin(T * 1.3) * .03;
}

/* ======================================================================
   Growing (your own garden, always ticking — also while you visit a friend)
   ====================================================================== */
const rateOf = t => (t.n > 0 ? (1 - REGROW_AT) / (PLANTS[t.p].regrow || PLANTS[t.p].grow) : 1 / PLANTS[t.p].grow) * (SAVE.up.greenhouse ? GREEN_MUL : 1) * (t.f ? FERT_MUL : 1);
function rollVariant(off){
  const w = off ? 'clear' : W.kind;
  const pc = w === 'stars' ? .25 : .005, pg = w === 'golden' ? .3 : w === 'stars' ? .05 : .03;
  const r = Math.random(); return r < pc ? 2 : r < pc + pg ? 1 : 0;
}
let gdnDirty = true, sprinkleT = 0;
function growTile(t, dt, off){
  if(!t || t.g >= 1) return false;
  const water = SAVE.up.sprinkler ? dt : Math.min(dt, t.w);
  t.w = SAVE.up.sprinkler ? WATER_T : Math.max(0, t.w - dt);
  if(water <= 0) return false;
  const st0 = stageOf(t.g);
  t.g = Math.min(1, t.g + water * rateOf(t));
  if(t.g >= 1){ t.v = rollVariant(off); gdnDirty = true; if(!off && !visiting) ripeFx(t); }
  if(stageOf(t.g) !== st0) gdnDirty = true;
  return true;
}
function ripeFx(t){
  const i = SAVE.tiles.indexOf(t); if(i < 0) return;
  SFX.pop();
  if(t.v) { SFX.magic(); say(t.v === 2 ? L('واو! ثمرة كريستال 💎 نادرة كتير!', 'Wow! A crystal fruit 💎 — super rare!', 'Vay! Kristal meyve 💎 — çok nadir!') : L('واو! ثمرة ذهبية ✨ بتسوى كتير!', 'Wow! A golden fruit ✨ — worth a lot!', 'Vay! Altın meyve ✨ — çok değerli!'), 3500); }
}
function tickGarden(dt){
  if(SAVE.up.sprinkler){ sprinkleT -= dt; if(sprinkleT <= 0) sprinkleT = SPRINKLE_T; }
  const raining = W.kind === 'rain' && !visiting;
  for(const t of SAVE.tiles){ if(!t) continue; if(raining && t.g < 1 && t.w < WATER_T){ t.w = WATER_T; gdnDirty = true; } growTile(t, dt, false); }
}
/* plants keep growing a bit while the game is closed — but at most OFFLINE_CAP seconds' worth */
let offlineGrew = 0;
function applyOffline(){
  const el = (Date.now() - (+SAVE.t || Date.now())) / 1000;
  if(!(el > 5)) return 0;
  const dt = Math.min(el, OFFLINE_CAP); let any = false;
  for(const t of SAVE.tiles) if(growTile(t, dt, true)) any = true;
  SAVE.t = Date.now();
  return any ? dt : 0;
}

/* ======================================================================
   The player, camera, input
   ====================================================================== */
const P = { x:SPAWN.x, z:SPAWN.z, vx:0, vz:0, face:SPAWN.f, move:0, goal:null, busy:null };
let heroM = null, T = 0;
const canMesh = new THREE.Mesh(GM.canGeo(), MAT); canMesh.castShadow = true; canMesh.visible = false;
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
function setHero(id){
  heroId = HEROES[id] ? id : 'sara';
  if(heroM) scene.remove(heroM.grp);
  heroM = HEROES[heroId](); shadowAll(heroM.grp); scene.add(heroM.grp);
  heroM.grp.add(canMesh); canMesh.position.set(.32, .5, .32);
}
const cam = { yaw:0, pitch:.64, dist:9.6, tx:P.x, tz:P.z, pAdj:0 };
let snapCam = true, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(closeup){
    camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  cam.pitch = lerp(cam.pitch, clamp(.64 + cam.pAdj, .32, 1.2), Math.min(1, dt * 3));
  const k = snapCam ? 1 : 1 - Math.exp(-7 * dt);
  // look a little ahead of the player, toward the garden
  const tx = P.x * .78, tz = P.z * .7 - 1;
  cam.tx = lerp(cam.tx, tx, k); cam.tz = lerp(cam.tz, tz, k);
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  _v.set(cam.tx + dx * cam.dist, .8 + dy * cam.dist, cam.tz + dz * cam.dist);
  if(snapCam){ camPos.copy(_v); camLook.set(cam.tx, .8, cam.tz); snapCam = false; } else { camPos.lerp(_v, 1 - Math.exp(-10 * dt)); camLook.set(cam.tx, .8, cam.tz); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state !== 'play') return;
  if(p.x < SW * .3 && p.y > SH * .3 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .3); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; look.t0 = performance.now(); }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){
  let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 52;
  if(d > m){ dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy.x = dx / m; joy.y = dy / m;
}
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id && state === 'play' && Math.hypot(p.x - look.sx, p.y - look.sy) > 14){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.32, .4); look.x = p.x; look.y = p.y; }
  else if(e.pointerId === look.id){ look.x = p.x; look.y = p.y; }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){
    look.id = null;
    const p = toLayer(e.clientX, e.clientY);
    if(Math.hypot(p.x - look.sx, p.y - look.sy) < 14 && performance.now() - look.t0 < 500 && e.type === 'pointerup') tapAt(p.x, p.y);
  }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); actBtn.classList.add('on'); doAction(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => actBtn.addEventListener(t, () => actBtn.classList.remove('on')));
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat){ doAction(); e.preventDefault(); }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.2);
function rayAt(x, y){ ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
function cellAt(x, z){ const c = Math.round(x / TILE + 2), r = Math.round(z / TILE + 2); if(c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1; const i = r * COLS + c; return Math.abs(x - cellX(i)) < SOIL / 2 + .1 && Math.abs(z - cellZ(i)) < SOIL / 2 + .1 ? i : -1; }
/* tap the world: a crow, a friend (to gift), a plant/tile, a stall */
function tapAt(x, y){
  if(state !== 'play') return;
  const r = rayAt(x, y);
  if(crow && crow.phase !== 'leave'){ if(r.ray.distanceToPoint(_v.set(crow.x, crow.y + .35, crow.z)) < .75){ shooCrow(); return; } }
  for(const a of RM.values()){ if(r.ray.distanceToPoint(_v.set(a.x, .7, a.z)) < .7){ giftStart(a.id); return; } }
  // plants stick up: test each plant's middle first
  let best = -1, bd = 1e9;
  const view = curView();
  for(const c of cells){ const t = view.tiles[c.i]; if(!c.grp.visible || !t) continue; const h = GM.plantH(t.p, stageOf(t.g)); _v.set(cellX(c.i), .2 + h * .55, cellZ(c.i)); const d = r.ray.distanceToPoint(_v); if(d < Math.max(.45, h * .4)){ const cd = camera.position.distanceTo(_v); if(cd < bd){ bd = cd; best = c.i; } } }
  if(best < 0){ const hit = r.ray.intersectPlane(groundPlane, _v); if(hit){ const i = cellAt(hit.x, hit.z); if(i >= 0) best = i; else {
    for(const k in SPOTS){ const S = SPOTS[k]; if(Math.abs(hit.x - S.x) < 2.2 && Math.abs(hit.z - S.z) < 1.6){ walkTo(S.fx, S.fz, .8, () => spotAction(k)); return; } }
    walkTo(hit.x, hit.z, .3, null); return; } } }
  if(best >= 0) tileTap(best);
}
function tileTap(i){
  const view = curView(), un = unlockedSet(view.lvl);
  if(!un.has(i)){ if(!visiting && view.lvl < PLOT_MAX && unlockedSet(view.lvl + 1).has(i)){ SFX.tap(); openShed(); } return; }
  walkTo(cellX(i), cellZ(i), 1.15, () => tileAction(i));
}
function walkTo(x, z, r, fn){ P.goal = { x, z, r, fn, t:4 }; }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
  if(m > 0) P.goal = null;
  else if(P.goal){
    const g = P.goal, dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz); g.t -= dt;
    if(d <= g.r || g.t <= 0){ P.goal = null; if(Math.hypot(dx, dz) > .05) P.face = Math.atan2(dx, dz); if(g.fn) g.fn(); }
    else { const sp = clamp((d - g.r) * 1.5, .35, 1); inp.x = dx / d * sp; inp.z = dz / d * sp; inp.m = sp; }
  }
}
const SPEED = 5.2;
function stepPlayer(dt){
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 14 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 14 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42);
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
}

/* ======================================================================
   Aunt Laila, pop-ups, fruit flying into the basket
   ====================================================================== */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200, top = false){
  clearTimeout(sayTO); guideT.textContent = text; guideEl.classList.toggle('top', top);
  guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = '';
  sayTO = setTimeout(() => { guideEl.hidden = true; }, ms);
}
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
const LINES = {
  hi:    L('أهلا حبيبي! أنا العمة ليلى 👵 هاي جنينتك الجديدة 🌻', "Hello sweetie! I'm Aunt Laila 👵 This is your new garden 🌻", 'Merhaba tatlım! Ben Leyla Teyze 👵 Bu senin yeni bahçen 🌻'),
  plant: L('كبوس على التراب 🟫 وازرع بذرة جزر 🥕', 'Tap the soil 🟫 and plant a carrot seed 🥕', 'Toprağa 🟫 dokun ve havuç tohumu 🥕 ek'),
  water: L('هلّق اسقيها 💧 كبوس على النبتة', 'Now water it 💧 — tap the plant', 'Şimdi sula 💧 — bitkiye dokun'),
  grow:  L('برافو! النبتة بتكبر طول ما فيها مي 💧 استنّاها شوي', 'Well done! It grows while it has water 💧 wait a little', 'Aferin! Suyu oldukça büyür 💧 biraz bekle'),
  pick:  L('صارت جاهزة! 🧺 كبوس عليها لتقطفها', "It's ready! 🧺 Tap it to pick", 'Hazır! 🧺 Toplamak için dokun'),
  sell:  L('خود الخضرة عالسوق 🧺 وبيعها بقروش البستان 💰', 'Take your veggies to the market 🧺 and sell them for garden coins 💰', 'Sebzeleri pazara 🧺 götür ve bahçe paralarına 💰 sat'),
  shop:  L('اشتري بذور جديدة من دكانة البذور 🌱', 'Buy new seeds at the seed shop 🌱', 'Tohumcudan 🌱 yeni tohum al'),
  done:  L('شاطر! كبّر جنينتك من مخزن الأدوات 🔧 وجمّع كل شي بكتاب البستان 📖', 'Great! Grow your garden at the tool shed 🔧 and collect everything in the garden book 📖', 'Harika! Alet kulübesinde 🔧 bahçeni büyüt, her şeyi bahçe kitabında 📖 topla'),
  back:  L('أهلا فيك من جديد! 🌻', 'Welcome back! 🌻', 'Tekrar hoş geldin! 🌻'),
  crow:  L('غراب شقي! 🐦‍⬛ كبوس عليه ليطير', 'A cheeky crow! Tap it to shoo it away', 'Yaramaz bir karga! Kovmak için dokun'),
  noseed:L('خلصت البذور! روح عدكانة البذور 🌱', 'Out of seeds! Go to the seed shop 🌱', 'Tohum bitti! Tohumcuya git 🌱')
};
const flyEl = $('#fly'), basketEl = $('#hudBasket');
function layerPos(el){ let x = 0, y = 0; while(el && el !== stage){ x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; }
function screenOf(x, y, z){ _v.set(x, y, z).project(camera); return { x:(_v.x * .5 + .5) * SW, y:(-_v.y * .5 + .5) * SH }; }
function flyToBasket(emoji, v, from, n, done){
  const bp = layerPos(basketEl), tx = bp.x + basketEl.offsetWidth / 2, ty = bp.y + basketEl.offsetHeight / 2;
  let left = n;
  for(let k = 0; k < n; k++){
    const el = document.createElement('i'); el.textContent = emoji; if(v) el.className = v === 2 ? 'c' : 'g'; flyEl.appendChild(el);
    const sx = from.x + (Math.random() - .5) * 40, sy = from.y, ux = sx + (Math.random() - .5) * 120, uy = sy - 70 - Math.random() * 60;
    const a = el.animate([
      { transform:`translate(${sx}px,${sy}px) translate(-50%,-50%) scale(.4)` },
      { transform:`translate(${ux}px,${uy}px) translate(-50%,-50%) scale(1.25)`, offset:.35 },
      { transform:`translate(${tx}px,${ty}px) translate(-50%,-50%) scale(.6)` }
    ], { duration:900 + k * 90, easing:'cubic-bezier(.45,.05,.55,.95)', fill:'forwards' });
    a.onfinish = () => { el.remove(); basketEl.classList.remove('bump'); void basketEl.offsetWidth; basketEl.classList.add('bump'); if(--left === 0 && done) done(); };
  }
}

/* ======================================================================
   Garden actions: plant, water, fertilize, pick, remove; crows
   ====================================================================== */
function tileAction(i){
  if(state !== 'play') return;
  if(visiting){ helpTile(i); return; }
  const t = SAVE.tiles[i];
  if(crow && crow.i === i && crow.phase === 'peck'){ shooCrow(); return; }
  if(!t){ openSeeds(i); return; }
  if(t.g >= 1){ harvest(i); return; }
  if(t.w < WATER_T * .5 && !SAVE.up.sprinkler){ startWater(i); return; }
  openPlantInfo(i);
}
function plantSeed(i, type){
  if(SAVE.tiles[i] || !unlocked().has(i) || !(SAVE.seeds[type] > 0)) return false;
  SAVE.seeds[type]--; if(!SAVE.seeds[type]) delete SAVE.seeds[type];
  SAVE.tiles[i] = { p:type, g:0, w:0, v:0, f:false, n:0 };
  SFX.plant(); burst(cellX(i), .35, cellZ(i), 14, [0x9a6440, 0x7bd35c, 0xffffff], 2.4, .8);
  gdnDirty = true; hudKey = ''; persist();
  if(SAVE.tut <= 1){ SAVE.tut = 2; persist(); say(LINES.water, 6000); }
  return true;
}
function startWater(i){
  if(P.busy) return;
  P.busy = { k:'water', i, t:.95 };
  P.face = Math.atan2(cellX(i) - P.x, cellZ(i) - P.z);
  SFX.water();
}
function doWater(i){
  const t = SAVE.tiles[i]; if(!t || t.g >= 1) return false;
  t.w = WATER_T; gdnDirty = true; persist();
  floatIcon('drop', cellX(i), .9, cellZ(i), 1, .4);
  if(SAVE.tut === 2){ SAVE.tut = 3; persist(); say(LINES.grow, 5500); }
  return true;
}
function busyFrame(dt){
  const b = P.busy;
  canMesh.visible = !!b;
  if(!b) return;
  b.t -= dt;
  canMesh.rotation.x = Math.min(.9, (0.95 - b.t) * 3); canMesh.position.y = .55;
  if(Math.random() < .8){ _v.set(.32, .7, .62).applyMatrix4(heroM.grp.matrixWorld); spray(_v.x, _v.y, _v.z, Math.sin(P.face) * .6, Math.cos(P.face) * .6, 1); }
  if(b.t <= 0){ P.busy = null; canMesh.visible = false; canMesh.rotation.x = 0; if(b.k === 'water'){ if(visiting) helpSend(b.i); else doWater(b.i); } }
}
function fertilize(i){
  const t = SAVE.tiles[i]; if(!t || t.f || t.g >= 1 || SAVE.fert <= 0) return false;
  SAVE.fert--; t.f = true; gdnDirty = true; persist(); SFX.magic();
  burst(cellX(i), .5, cellZ(i), 24, [0xb99cff, 0xffffff, 0x7bd35c], 3, .9);
  return true;
}
function removePlant(i){ if(!SAVE.tiles[i]) return; SAVE.tiles[i] = null; gdnDirty = true; persist(); SFX.tap(); burst(cellX(i), .4, cellZ(i), 14, [0x9a6440, 0x7bd35c], 2.4, .8); }
function harvest(i, fast){
  const t = SAVE.tiles[i]; if(!t || t.g < 1) return 0;
  const Pl = PLANTS[t.p], n = Pl.yield + (t.f ? 1 : 0), key = itemKey(t.p, t.v), v = t.v;
  SAVE.basket[key] = Math.min(999, (SAVE.basket[key] || 0) + n);
  const b = SAVE.book[t.p] || (SAVE.book[t.p] = [0, 0, 0]); const isNew = !(b[0] + b[1] + b[2]) || !b[v]; b[v] += n;
  SAVE.picked += n;
  if(Pl.regrow){ t.g = REGROW_AT; t.n++; t.v = 0; t.f = false; } else SAVE.tiles[i] = null;
  gdnDirty = true; persist(); SFX.pick();
  const x = cellX(i), z = cellZ(i);
  burst(x, .7, z, 26, v === 2 ? [0xbff4ff, 0xffffff, 0x7fe0ff] : v === 1 ? [0xffd23f, 0xffffff, 0xffb000] : [Pl.col, 0xffffff, 0x7bd35c], 3.6, 1);
  for(let k = 0; k < Math.min(n, 4); k++) throwFruit(t.p, v, x, z);
  if(!fast) flyToBasket(Pl.e, v, screenOf(x, .9, z), Math.min(n, 6), () => { hudKey = ''; });
  hudKey = '';
  if(isNew) setTimeout(() => { if(state === 'play') pop('📖 ' + L('جديد بالكتاب!', 'New in the book!', 'Kitapta yeni!')); }, 700);
  if(SAVE.tut <= 3){ SAVE.tut = 4; persist(); setTimeout(() => { if(state === 'play') say(LINES.sell, 6000); }, 900); }
  return n;
}
/* little 3D fruits that hop out of the plant before flying to the basket */
const thrown = [];
function throwFruit(type, v, x, z){
  const m = new THREE.Mesh(GM.fruitGeo(type), GM.FRUIT_MAT[v] || MAT); m.position.set(x, .6, z); scene.add(m);
  const a = Math.random() * 6.28; thrown.push({ m, vx:Math.cos(a) * 1.2, vy:4.5 + Math.random() * 1.5, vz:Math.sin(a) * 1.2, life:.75 });
}
function thrownFrame(dt){
  for(let k = thrown.length - 1; k >= 0; k--){ const f = thrown[k]; f.life -= dt; f.vy -= 14 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; f.m.rotation.x += dt * 8; f.m.rotation.z += dt * 6; const s = clamp(f.life * 3, 0, 1) * 1.6; f.m.scale.setScalar(s); if(f.life <= 0){ scene.remove(f.m); thrown.splice(k, 1); } }
}
/* ---------- the cheeky crow: lands on a growing plant and pecks; tap it to shoo; a scarecrow keeps it away ---------- */
let crow = null, crowT = 40 + Math.random() * 30;
function spawnCrow(force){
  if(crow || visiting || (SAVE.up.scarecrow && !force)) return false;
  const cand = SAVE.tiles.map((t, i) => t && t.g < 1 && t.g > .05 ? i : -1).filter(i => i >= 0);
  if(!cand.length) return false;
  const i = pick(cand), M = GM.buildCrow(), a = Math.random() * Math.PI * 2;
  M.grp.scale.setScalar(1.2); scene.add(M.grp);
  crow = { M, i, phase:'fly', t:0, sx:cellX(i) + Math.cos(a) * 18, sy:9, sz:cellZ(i) + Math.sin(a) * 18, x:0, y:0, z:0, peck:0, eatT:14, from:a };
  SFX.caw(); say(LINES.crow, 3500);
  return true;
}
function shooCrow(){
  if(!crow || crow.phase === 'leave') return false;
  crow.phase = 'leave'; crow.t = 0; crow.lx = crow.x; crow.ly = crow.y; crow.lz = crow.z;
  SFX.caw(); SFX.flap(); floatIcon('feather', crow.x, crow.y + .5, crow.z, 4, .35);
  pop(L('قاق! 🐦 طار الغراب', 'Caw! The crow flew away', 'Gak! Karga uçtu gitti'));
  SAVE.coins += 1; hudKey = ''; persist();
  return true;
}
function crowFrame(dt){
  if(!crow){
    if(state === 'play' && !visiting && !SAVE.up.scarecrow){ crowT -= dt; if(crowT <= 0){ crowT = 45 + Math.random() * 40; spawnCrow(); } }
    return;
  }
  const c = crow, M = c.M, tx = cellX(c.i) + .25, tz = cellZ(c.i) + .2, t = SAVE.tiles[c.i];
  c.t += dt;
  const flap = s => { for(const [k, w] of M.wings.entries()) w.rotation.z = (k ? -1 : 1) * Math.sin(T * s) * .9; };
  if(c.phase === 'fly'){
    const k = clamp(c.t / 2.4, 0, 1), e = 1 - Math.pow(1 - k, 2);
    c.x = lerp(c.sx, tx, e); c.z = lerp(c.sz, tz, e); c.y = lerp(c.sy, .35, e) + Math.sin(k * Math.PI) * 2;
    M.grp.rotation.y = Math.atan2(tx - c.sx, tz - c.sz); flap(22);
    if(k >= 1){ c.phase = 'peck'; c.t = 0; for(const w of M.wings) w.rotation.z = 0; }
  } else if(c.phase === 'peck'){
    if(!t || t.g >= 1){ shooCrowQuiet(); return; }
    c.y = .35 + GM.plantH(t.p, stageOf(t.g)) * .2;
    M.body.rotation.x = Math.max(0, Math.sin(c.t * 9)) * .5; M.grp.rotation.y += Math.sin(c.t * 1.3) * dt;
    if(c.t >= c.eatT){ t.g = Math.max(0, t.g - .12); gdnDirty = true; persist(); pop(L('😮 الغراب أكل شوي!', '😮 The crow nibbled a bit!', '😮 Karga biraz yedi!')); shooCrowQuiet(); return; }
  } else {
    const k = clamp(c.t / 2, 0, 1);
    c.x = c.lx + Math.cos(c.from) * 20 * k * k; c.z = c.lz + Math.sin(c.from) * 20 * k * k; c.y = c.ly + k * 9; flap(26);
    M.grp.rotation.y = Math.atan2(Math.cos(c.from), Math.sin(c.from));
    if(k >= 1){ scene.remove(M.grp); crow = null; return; }
  }
  M.grp.position.set(c.x, c.y, c.z);
}
function shooCrowQuiet(){ if(!crow) return; crow.phase = 'leave'; crow.t = 0; crow.lx = crow.x; crow.ly = crow.y; crow.lz = crow.z; SFX.flap(); }

/* ======================================================================
   Weather: rain (waters everything), golden hour (golden fruit), «مطر نجوم» (crystal fruit)
   ====================================================================== */
const WX = {
  clear: { e:'☀️', name:'', sun:2.3, sunC:0xfff0d4, hemi:1.75, hemiC:0xfff4e2, sky:0xffffff, fog:0xcdeeff },
  rain:  { e:'🌧️', name:L('مطر', 'Rain', 'Yağmur'), dur:40, sun:.95, sunC:0xdfe8f0, hemi:1.35, hemiC:0xe6eef6, sky:0x9eabbb, fog:0xb0bccb, wc:'#6cc4ff',
           say:L('مطر! 🌧️ عم يسقي كل الزرع لحالو', "Rain! 🌧️ It's watering all your plants", 'Yağmur! 🌧️ Tüm bitkileri suluyor') },
  golden:{ e:'🌅', name:L('ساعة ذهبية', 'Golden hour', 'Altın saat'), dur:45, sun:2.7, sunC:0xffb35c, hemi:1.5, hemiC:0xffe0b0, sky:0xffd9a0, fog:0xffe2b8, wc:'#ffc23d',
           say:L('الساعة الذهبية 🌅 الثمار ممكن تطلع ذهبية ✨', 'Golden hour 🌅 fruit may turn golden ✨', 'Altın saat 🌅 meyveler altın olabilir ✨') },
  stars: { e:'🌠', name:L('مطر نجوم', 'Star rain', 'Yıldız yağmuru'), dur:40, sun:1.2, sunC:0xd2c6ff, hemi:1.4, hemiC:0xe4ddff, sky:0x8f7fd6, fog:0xa99ee0, wc:'#b99cff',
           say:L('مطر نجوم! 🌠 نادر كتير — الثمار ممكن تصير كريستال 💎', 'Star rain! 🌠 Super rare — fruit may turn crystal 💎', 'Yıldız yağmuru! 🌠 Çok nadir — meyveler kristal olabilir 💎') }
};
const W = { kind:'clear', left:0, next:80 + Math.random() * 60 };
let hostWx = null;                   // the weather in the host's garden, while visiting
const shownWx = () => visiting ? (hostWx || 'clear') : W.kind;
function startWeather(kind){
  if(!WX[kind] || kind === 'clear'){ W.kind = 'clear'; W.left = 0; W.next = 90 + Math.random() * 70; hudKey = ''; gdnDirty = true; return; }
  W.kind = kind; W.left = WX[kind].dur; hudKey = ''; gdnDirty = true;
  // the plants already ripe get a chance too
  if(kind !== 'rain') for(const t of SAVE.tiles) if(t && t.g >= 1 && !t.v && Math.random() < (kind === 'stars' ? .3 : .35)) t.v = kind === 'stars' ? 2 : 1;
  if(kind === 'rain') SFX.rain(); else SFX.magic();
  if(state === 'play') say(WX[kind].say, 4500, true);
}
function weatherTick(dt){
  if(visiting) return;
  if(W.kind !== 'clear'){ W.left -= dt; if(W.left <= 0) startWeather('clear'); return; }
  W.next -= dt;
  if(W.next <= 0){ const r = Math.random(); startWeather(r < .12 ? 'stars' : r < .55 ? 'rain' : 'golden'); }
}
/* visuals: lights blend, raindrops, clouds, falling stars, golden motes */
const RAIN_N = 240, rainMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.03, .6, .03), new THREE.MeshBasicMaterial({ color:0xcfe9ff, transparent:true, opacity:.55, depthWrite:false }), RAIN_N);
rainMesh.frustumCulled = false; rainMesh.visible = false; scene.add(rainMesh);
const drops = Array.from({ length:RAIN_N }, () => ({ x:(Math.random() - .5) * 30, y:Math.random() * 14, z:(Math.random() - .5) * 30, v:14 + Math.random() * 6 }));
const STAR_N = 28, starMesh = new THREE.InstancedMesh(K.starGeo, new THREE.MeshBasicMaterial({ color:0xfff3b0 }), STAR_N);
starMesh.frustumCulled = false; starMesh.visible = false; scene.add(starMesh);
const fstars = Array.from({ length:STAR_N }, () => ({ x:(Math.random() - .5) * 26, y:4 + Math.random() * 14, z:(Math.random() - .5) * 26, v:5 + Math.random() * 3, r:Math.random() * 6 }));
const clouds = new THREE.Group(); clouds.visible = false; scene.add(clouds);
{ const M = new Merge(); for(let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2, r = 6 + (i % 3) * 3, x = Math.cos(a) * r, z = Math.sin(a) * r; for(let k = 0; k < 4; k++) M.add(GEO.ico1, x + (k - 1.5) * 1.3, 10 + (k % 2) * .5, z + (k % 2) * .6, 1.4 + (k % 2) * .4, 1, 1.2, 0, k, 0, 0xe9eef4); }
  const cm = new THREE.Mesh(M.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1, transparent:true, opacity:.9, flatShading:true })); clouds.add(cm); }
const wxNow = { sun:2.3, hemi:1.75 }, wxCol = { sun:new THREE.Color(0xfff0d4), hemi:new THREE.Color(0xfff4e2), sky:new THREE.Color(0xffffff), fog:new THREE.Color(0xcdeeff) };
function weatherFrame(dt){
  const kind = state === 'menu' || state === 'select' ? 'clear' : shownWx(), w = WX[kind] || WX.clear, k = 1 - Math.exp(-dt * 1.6);
  wxNow.sun = lerp(wxNow.sun, w.sun, k); wxNow.hemi = lerp(wxNow.hemi, w.hemi, k);
  sun.intensity = wxNow.sun; hemi.intensity = wxNow.hemi;
  sun.color.lerp(_c.set(w.sunC), k); hemi.color.lerp(_c.set(w.hemiC), k); skyMat.color.lerp(_c.set(w.sky), k); scene.fog.color.lerp(_c.set(w.fog), k);
  const cx = camLook.x, cz = camLook.z;
  rainMesh.visible = kind === 'rain'; clouds.visible = kind === 'rain' || kind === 'stars';
  if(clouds.visible){ clouds.position.set(cx, 0, cz); clouds.rotation.y = T * .02; clouds.children[0].material.color.set(kind === 'stars' ? 0x9d92d8 : 0xffffff); }
  if(rainMesh.visible){
    for(let i = 0; i < RAIN_N; i++){ const d = drops[i]; d.y -= d.v * dt; if(d.y < 0){ d.y += 14; d.x = (Math.random() - .5) * 30; d.z = (Math.random() - .5) * 30; if(Math.random() < .08) burst(cx + d.x, .1, cz + d.z, 1, [0xcfe9ff], 1, .5, 10, 1); }
      _m.compose(_v.set(cx + d.x, d.y, cz + d.z), _q.identity(), _s.set(1, 1, 1)); rainMesh.setMatrixAt(i, _m); }
    rainMesh.instanceMatrix.needsUpdate = true;
  }
  starMesh.visible = kind === 'stars';
  if(starMesh.visible){
    for(let i = 0; i < STAR_N; i++){ const s = fstars[i]; s.y -= s.v * dt; s.x += s.v * .45 * dt; s.r += dt * 4; if(s.y < 0){ burst(cx + s.x, .3, cz + s.z, 4, [0xfff3b0, 0xbff4ff, 0xffffff], 2, .7); s.y = 12 + Math.random() * 6; s.x = (Math.random() - .5) * 26 - 3; s.z = (Math.random() - .5) * 26; }
      _m.compose(_v.set(cx + s.x, s.y, cz + s.z), _q.setFromEuler(_e.set(0, 0, s.r)), _s.set(.26, .26, .26)); starMesh.setMatrixAt(i, _m); }
    starMesh.instanceMatrix.needsUpdate = true;
  }
  if(kind === 'golden' && Math.random() < dt * 14) burst(cx + (Math.random() - .5) * 18, .5 + Math.random() * 2, cz + (Math.random() - .5) * 12, 1, [0xffd23f, 0xfff1b0], .3, .6, -.4, .2);
}

/* ======================================================================
   Bees and butterflies (instanced; each one is a single colour)
   ====================================================================== */
const BF_N = 9, BEE_N = 6;
const wingGeo = (() => { const g = new THREE.CircleGeometry(.14, 10); g.translate(.13, 0, 0); g.rotateX(-Math.PI / 2); return g; })();
const bfWings = new THREE.InstancedMesh(wingGeo, new THREE.MeshStandardMaterial({ side:THREE.DoubleSide, roughness:.7 }), BF_N * 2);
const BF_COL = [0xffffff, 0xffe14d, 0xff9fc0, 0x9fd8ff, 0xffffff, 0xffc23d, 0xb99cff, 0xffe14d, 0xff9fc0];
const butterflies = Array.from({ length:BF_N }, (_, i) => ({ x:(Math.random() - .5) * 20, y:1.2, z:(Math.random() - .5) * 16, a:Math.random() * 6, s:.7 + Math.random() * .5, ph:Math.random() * 9, tx:0, tz:0, t:0 }));
butterflies.forEach((b, i) => { bfWings.setColorAt(i * 2, _c.set(BF_COL[i])); bfWings.setColorAt(i * 2 + 1, _c.set(BF_COL[i])); });
bfWings.castShadow = true; bfWings.frustumCulled = false; scene.add(bfWings);
const beeBody = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 10, 8), new THREE.MeshStandardMaterial({ color:0xffcf2e, roughness:.5 }), BEE_N);
const beeWing = new THREE.InstancedMesh(wingGeo, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.75, side:THREE.DoubleSide, depthWrite:false }), BEE_N * 2);
beeBody.frustumCulled = beeWing.frustumCulled = false; beeBody.castShadow = true; scene.add(beeBody, beeWing);
const bees = Array.from({ length:BEE_N }, () => ({ x:(Math.random() - .5) * 8, y:1, z:(Math.random() - .5) * 8, ph:Math.random() * 9, tx:0, ty:1, tz:0, t:0 }));
function bugsFrame(dt){
  const view = curView(), bloom = [];
  for(const c of cells){ const t = view.tiles[c.i]; if(c.grp.visible && t && stageOf(t.g) >= 3) bloom.push([cellX(c.i), .3 + GM.plantH(t.p, stageOf(t.g)) * .8, cellZ(c.i)]); }
  butterflies.forEach((b, i) => {
    b.t -= dt; if(b.t <= 0){ b.t = 2 + Math.random() * 3; const tgt = bloom.length && Math.random() < .5 ? pick(bloom) : [(Math.random() - .5) * 26, 0, (Math.random() - .5) * 22]; b.tx = tgt[0]; b.tz = tgt[2]; }
    const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz) || 1, sp = 1.4 * b.s;
    b.a += angDiff(Math.atan2(dx, dz), b.a) * Math.min(1, dt * 2); b.x += Math.sin(b.a) * sp * dt; b.z += Math.cos(b.a) * sp * dt;
    b.y = 1 + Math.sin(T * 1.7 + b.ph) * .35 + (d < 1 ? -.3 : 0);
    const flap = Math.sin(T * 16 + b.ph) * 1.1;
    for(const s of [0, 1]){ _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e.set(0, b.a + (s ? Math.PI : 0), (s ? -1 : 1) * flap, 'YXZ')), _s.set(1, 1, 1.25)); bfWings.setMatrixAt(i * 2 + s, _m); }
  });
  bfWings.instanceMatrix.needsUpdate = true; if(bfWings.instanceColor) bfWings.instanceColor.needsUpdate = false;
  bees.forEach((b, i) => {
    b.t -= dt; if(b.t <= 0){ b.t = 1.5 + Math.random() * 2.5; const tgt = bloom.length ? pick(bloom) : [(Math.random() - .5) * 10, 1, (Math.random() - .5) * 8]; b.tx = tgt[0] + (Math.random() - .5) * .6; b.ty = tgt[1] + .2; b.tz = tgt[2] + (Math.random() - .5) * .6; }
    const k = 1 - Math.exp(-dt * 1.8); b.x = lerp(b.x, b.tx, k) + Math.sin(T * 7 + b.ph) * .01; b.y = lerp(b.y, b.ty, k) + Math.sin(T * 9 + b.ph) * .008; b.z = lerp(b.z, b.tz, k);
    const a = Math.atan2(b.tx - b.x, b.tz - b.z);
    _m.compose(_v.set(b.x, b.y, b.z), _q.setFromEuler(_e.set(0, a, 0)), _s.set(1, .9, 1.4)); beeBody.setMatrixAt(i, _m);
    const fl = Math.sin(T * 40 + b.ph) * .7;
    for(const s of [0, 1]){ _m.compose(_v.set(b.x, b.y + .06, b.z), _q.setFromEuler(_e.set(0, a + Math.PI / 2 + (s ? Math.PI : 0), (s ? -1 : 1) * fl - .3, 'YXZ')), _s.set(.6, .6, .5)); beeWing.setMatrixAt(i * 2 + s, _m); }
  });
  beeBody.instanceMatrix.needsUpdate = beeWing.instanceMatrix.needsUpdate = true;
}

/* ======================================================================
   Action button (context), guide arrow, HUD
   ====================================================================== */
let ctxNow = null;
function nearestCell(){
  const view = curView(), un = unlockedSet(view.lvl); let best = -1, bd = 1.35;
  for(let i = 0; i < NCELL; i++){ if(!un.has(i)) continue; const d = Math.hypot(cellX(i) - P.x, cellZ(i) - P.z); if(d < bd){ bd = d; best = i; } }
  return best;
}
function context(){
  if(crow && crow.phase === 'peck' && Math.hypot(crow.x - P.x, crow.z - P.z) < 2) return { k:'crow' };
  const i = nearestCell();
  if(i >= 0){
    const t = curView().tiles[i];
    if(visiting) return t && t.g < 1 && !(t.w > 0) ? { k:'help', i } : null;
    if(!t) return { k:'plant', i };
    if(t.g >= 1) return { k:'pick', i };
    if(t.w < WATER_T * .5 && !SAVE.up.sprinkler) return { k:'water', i };
    return { k:'look', i };
  }
  for(const k in SPOTS){ const S = SPOTS[k]; if(Math.hypot(S.fx - P.x, S.fz - P.z) < 2.6) return { k };
  }
  return null;
}
const ACT_LOOK = {
  plant:['🌱', L('ازرع', 'Plant', 'Ek'), '#5ed6a0'], water:['💧', L('اسقي', 'Water', 'Sula'), '#6cc4ff'], pick:['🧺', L('اقطف', 'Pick', 'Topla'), '#ffc23d'],
  look:['🔍', L('شوف', 'Look', 'Bak'), '#fff8ec'], help:['💧', L('ساعد', 'Help', 'Yardım'), '#6cc4ff'], crow:['👋', L('روح!', 'Shoo!', 'Kışt!'), '#ff8fb1'],
  seeds:['🌱', L('بذور', 'Seeds', 'Tohum'), '#5ed6a0'], sell:['🧺', L('بيع', 'Sell', 'Sat'), '#ffb347'], shed:['🔧', L('تطوير', 'Upgrade', 'Geliştir'), '#7fb6e8']
};
let actKey = '';
function updateActBtn(){
  ctxNow = P.busy ? null : context();
  const key = ctxNow ? ctxNow.k + (ctxNow.i != null ? ctxNow.i : '') : '';
  if(key === actKey) return; actKey = key;
  if(!ctxNow){ actBtn.hidden = true; return; }
  const [ic, label, col] = ACT_LOOK[ctxNow.k];
  $('#actI').textContent = ic; $('#actB').textContent = label; actBtn.style.setProperty('--ac', col);
  actBtn.hidden = false; actBtn.classList.toggle('pulse', ctxNow.k === 'pick' || ctxNow.k === 'crow');
}
function doAction(){
  if(state !== 'play') return;
  const c = ctxNow || context(); if(!c) return;
  P.goal = null;
  if(c.k === 'crow') shooCrow();
  else if(c.i != null) tileAction(c.i);
  else spotAction(c.k);
  actKey = '';
}
function spotAction(k){
  if(state !== 'play') return;
  if(visiting && k !== 'seeds' && k !== 'sell' && k !== 'shed'){ return; }
  SFX.tap();
  if(k === 'seeds') openShop(); else if(k === 'sell') openSell(); else if(k === 'shed') openShed();
}
/* guide arrow (tutorial) */
function guideTarget(){
  if(state !== 'play' || visiting) return null;
  const tut = SAVE.tut;
  if(tut <= 1){ const un = unlocked(); for(const i of [12, 11, 13, 17, 16, 18]) if(un.has(i) && !SAVE.tiles[i]) return { x:cellX(i), z:cellZ(i), y:1.3 }; }
  if(tut === 2){ const i = SAVE.tiles.findIndex(t => t && t.w <= 0 && t.g < 1); if(i >= 0) return { x:cellX(i), z:cellZ(i), y:1.4 }; }
  if(tut === 3){ const i = SAVE.tiles.findIndex(t => t && t.g >= 1); if(i >= 0) return { x:cellX(i), z:cellZ(i), y:1.6 }; }
  if(tut === 4 && basketCount()) return { x:SPOTS.sell.fx, z:SPOTS.sell.fz, y:2.4 };
  if(tut === 5) return { x:SPOTS.seeds.fx, z:SPOTS.seeds.fz, y:2.4 };
  return null;
}
let readySaid = false;
function animGuide(){
  const g = guideTarget();
  const show = !!g && Math.hypot(g.x - P.x, g.z - P.z) > 1.4;
  guideArrow.visible = guideRing.visible = !!g && show;
  if(SAVE.tut === 3 && g && !readySaid){ readySaid = true; say(LINES.pick, 5000); }
  if(!guideArrow.visible) return;
  guideArrow.position.set(g.x, g.y + .6 + Math.abs(Math.sin(T * 3.5)) * .5, g.z); guideArrow.rotation.y = T * 2;
  guideRing.position.set(g.x, .26, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
}
const hudEl = $('#hud');
let hudKey = '';
function hudFrame(){
  const mp = mpActive(), wk = shownWx(), wleft = visiting ? 0 : Math.ceil(W.left);
  const key = [SAVE.coins, basketCount(), seedCount(), wk, wleft, mp ? MP.players.map(p => p.id + p.hero).join(',') : '', MP.code, RM.size].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudCoins').textContent = COIN + ' ' + N(SAVE.coins);
  basketEl.textContent = '🧺 ' + N(basketCount());
  $('#hudSeeds').textContent = '🌱 ' + N(seedCount());
  const wx = $('#hudWx'); wx.hidden = wk === 'clear';
  if(wk !== 'clear'){ wx.style.setProperty('--wc', WX[wk].wc); wx.textContent = WX[wk].e + ' ' + WX[wk].name + (wleft ? ' · ' + N(wleft) : ''); }
  $('#btnGift').hidden = !(mp && RM.size);
  const bar = $('#mpBar'); bar.hidden = !mp;
  if(mp) bar.innerHTML = `<span class="chip roomchip">🏡 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${p.id === MP.hostId ? '🌻' : ''}</span>`).join('');
}
basketEl.onclick = () => { if(state !== 'play') return; SFX.tap(); openBasket(); };
$('#btnBook').onclick = () => { if(state !== 'play') return; SFX.tap(); openBook(0); };
$('#btnGift').onclick = () => { if(state !== 'play') return; SFX.tap(); const ids = [...RM.keys()]; if(ids.length === 1) giftStart(ids[0]); else giftWho(); };

/* ======================================================================
   Cards: seed picker, plant info, seed shop, market, tool shed, basket, book
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on;
  if(!on){ actBtn.hidden = true; actKey = ''; }
  hudKey = '';
}
function openCard(wide){
  state = 'card'; setPlayUI(false); clearInput(); P.goal = null;
  overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : '');
}
function closeCard(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); }
const xBtn = `<button class="x-btn" id="bX" aria-label="${L('سكّر', 'Close', 'Kapat')}">✖</button>`;
function wireX(fn){ const b = $('#bX'); if(b) b.onclick = () => { SFX.tap(); (fn || closeCard)(); }; }
const coinTag = n => `<span class="price">${COIN} ${N(n)}</span>`;
const timeTag = s => s < 100 ? '⏱️' : s < 250 ? '⏱️⏱️' : '⏱️⏱️⏱️';
function openSeeds(i){
  openCard(true);
  const own = PLANT_IDS.filter(k => SAVE.seeds[k] > 0);
  card.innerHTML = `${xBtn}<h2>🌱 ${L('شو بدّك تزرع؟', 'What will you plant?', 'Ne ekeceksin?')}</h2>
    ${own.length ? `<div class="seedgrid">${own.map(k => `<button class="item" data-s="${k}"><span class="cnt">${N(SAVE.seeds[k])}</span><span class="em">${PLANTS[k].e}</span><b>${PLANTS[k].name}</b><span class="time">${timeTag(PLANTS[k].grow)}</span></button>`).join('')}</div>`
      : `<p>${L('ما عندك بذور! اشتري من دكانة البذور 🌱', 'No seeds! Buy some at the seed shop 🌱', 'Tohumun yok! Tohumcudan al 🌱')}</p><button class="big-btn mint" id="bGoShop">🌱 ${L('دكانة البذور', 'Seed shop', 'Tohumcu')}</button>`}`;
  wireX();
  card.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { closeCard(); plantSeed(i, b.dataset.s); });
  const gs = $('#bGoShop'); if(gs) gs.onclick = () => { SFX.tap(); openShop(); };
}
function openPlantInfo(i){
  const t = SAVE.tiles[i]; if(!t) return;
  openCard(false);
  const Pl = PLANTS[t.p], rate = rateOf(t), left = (1 - t.g) / rate, wetPct = SAVE.up.sprinkler ? 100 : Math.round(t.w / WATER_T * 100);
  card.innerHTML = `${xBtn}<div class="bigstar">${Pl.e}</div><h2>${Pl.name}${t.f ? ' 🧪' : ''}</h2>
    <p>🌱 ${L('بتكبر', 'Growing', 'Büyüyor')} · ⏳ ${mmss(left)}</p>
    <div class="bar2"><i style="width:${Math.round(t.g * 100)}%"></i></div>
    <div class="bar2 w"><i style="width:${wetPct}%"></i></div>
    <div class="row"><button class="big-btn sky" id="bWater">💧 ${L('اسقي', 'Water', 'Sula')}</button>
    ${!t.f ? `<button class="big-btn pink" id="bFert"${SAVE.fert > 0 ? '' : ' disabled'}>🧪 ${L('سمّد', 'Fertilize', 'Gübrele')} (${N(SAVE.fert)})</button>` : ''}</div>
    <button class="ghost-btn" id="bDig">🗑️ ${L('شيل النبتة', 'Remove plant', 'Bitkiyi sök')}</button>`;
  wireX();
  $('#bWater').onclick = () => { closeCard(); startWater(i); };
  const bf = $('#bFert'); if(bf) bf.onclick = () => { if(fertilize(i)) closeCard(); else SFX.bonk(); };
  let sure = false;
  $('#bDig').onclick = () => { if(!sure){ sure = true; SFX.tap(); $('#bDig').textContent = '🗑️ ' + L('متأكد؟ كبوس كمان مرة', 'Sure? Press again', 'Emin misin? Tekrar bas'); return; } removePlant(i); closeCard(); };
}
function openShop(msg){
  openCard(true);
  card.innerHTML = `${xBtn}<h2>🌱 ${L('دكانة البذور', 'Seed shop', 'Tohumcu')}</h2>
    <p>${coinTag(SAVE.coins)}</p>
    <div class="seedgrid">${PLANT_IDS.map(k => { const Pl = PLANTS[k], can = SAVE.coins >= Pl.seed;
      return `<button class="item${can ? '' : ' poor'}" data-b="${k}">${SAVE.seeds[k] ? `<span class="cnt">${N(SAVE.seeds[k])}</span>` : ''}<span class="em">${Pl.e}</span><b>${Pl.name}</b><span class="time">${timeTag(Pl.grow)}${Pl.regrow ? ' 🔁' : ''}</span>${coinTag(Pl.seed)}</button>`; }).join('')}</div>
    <p class="mp-msg" id="shopMsg">${msg || ''}</p>`;
  wireX();
  card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
    const k = b.dataset.b;
    if(!buySeed(k)){ SFX.bonk(); $('#shopMsg').textContent = L('بدّك قروش أكتر 💰 بيع ثمار بالسوق', 'You need more coins 💰 — sell fruit at the market', 'Daha çok para 💰 lazım — pazarda meyve sat'); return; }
    openShop('✅ ' + PLANTS[k].e + ' +' + N(1));
  });
}
function buySeed(k){
  const Pl = PLANTS[k]; if(!Pl || SAVE.coins < Pl.seed) return false;
  SAVE.coins -= Pl.seed; SAVE.seeds[k] = Math.min(999, (SAVE.seeds[k] || 0) + 1); persist(); SFX.buy(); hudKey = '';
  if(SAVE.tut === 5){ SAVE.tut = 6; persist(); setTimeout(() => { if(state === 'play') say(LINES.done, 6500); }, 400); }
  return true;
}
function openSell(){
  openCard(true);
  const keys = Object.keys(SAVE.basket).filter(k => SAVE.basket[k] > 0);
  const total = keys.reduce((a, k) => a + itemPrice(k) * SAVE.basket[k], 0);
  card.innerHTML = `${xBtn}<h2>🧺 ${L('السوق', 'Market', 'Pazar')}</h2><p>${coinTag(SAVE.coins)}</p>
    ${keys.length ? `<div class="sellrow">${keys.map(k => `<button class="item" data-k="${k}"><span class="cnt">×${N(SAVE.basket[k])}</span><span class="em">${itemEmoji(k)}</span><b>${itemName(k)}</b>${coinTag(itemPrice(k) * SAVE.basket[k])}</button>`).join('')}</div>
      <button class="big-btn" id="bSellAll">💰 ${L('بيع الكل', 'Sell all', 'Hepsini sat')} · ${N(total)}</button>`
      : `<p>${L('السلة فاضية! ازرع واقطف ثمار وجيبها لهون 🥕', 'Your basket is empty! Grow and pick fruit, then bring it here 🥕', 'Sepetin boş! Yetiştir, topla, buraya getir 🥕')}</p>`}`;
  wireX();
  card.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { sell(b.dataset.k); openSell(); });
  const sa = $('#bSellAll'); if(sa) sa.onclick = () => { sellAll(); openSell(); };
}
function sell(k){
  const n = SAVE.basket[k] | 0; if(!n) return 0;
  const got = itemPrice(k) * n; delete SAVE.basket[k];
  SAVE.coins += got; SAVE.sold += got; persist(); SFX.coins(); hudKey = '';
  pop('+' + N(got) + ' ' + COIN);
  if(SAVE.tut === 4){ SAVE.tut = 5; persist(); setTimeout(() => { if(state === 'play') say(LINES.shop, 6000); }, 500); }
  return got;
}
function sellAll(){ let g = 0; for(const k of Object.keys(SAVE.basket)) g += sell(k); if(g) pop('+' + N(g) + ' ' + COIN); return g; }
function upgradePrice(id){ return id === 'plot' ? (SAVE.plot < PLOT_MAX ? PLOT_PRICE[SAVE.plot] : 0) : UPG[id].price; }
function upgradeDone(id){ return id === 'plot' ? SAVE.plot >= PLOT_MAX : id === 'fert' ? false : !!SAVE.up[id]; }
function buyUpgrade(id){
  if(!UPG[id] || upgradeDone(id)) return false;
  const price = upgradePrice(id); if(SAVE.coins < price) return false;
  SAVE.coins -= price;
  if(id === 'plot') SAVE.plot++; else if(id === 'fert') SAVE.fert += 3; else SAVE.up[id] = true;
  if(id === 'scarecrow' && crow) shooCrowQuiet();
  persist(); SFX.buy(); hudKey = ''; gdnDirty = true;
  if(id !== 'fert') setTimeout(() => { const b = plotHalf(SAVE.plot); burst((b.x0 + b.x1) / 2, 1, (b.z0 + b.z1) / 2, 50, CONFETTI, 6, 1.2); SFX.grow(); }, 200);
  return true;
}
function openShed(msg){
  openCard(true);
  card.innerHTML = `${xBtn}<h2>🔧 ${L('مخزن الأدوات', 'Tool shed', 'Alet kulübesi')}</h2><p>${coinTag(SAVE.coins)} · 🧪 ${N(SAVE.fert)}</p>
    <div class="upg">${UPG_IDS.map(id => { const U = UPG[id], done = upgradeDone(id), price = upgradePrice(id);
      return `<button class="item${done ? ' done' : SAVE.coins < price ? ' poor' : ''}" data-u="${id}"><span class="em">${U.e}</span><b>${U.name}</b><small>${U.info}</small>
        ${id === 'plot' ? `<div class="lvl">${PLOT_RECTS.slice(1).map((_, l) => `<b class="${l < SAVE.plot ? 'on' : ''}"></b>`).join('')}</div><small dir="ltr">🟫 ${N(PLOT_N[SAVE.plot])}${done ? '' : ' → ' + N(PLOT_N[SAVE.plot + 1])}</small>` : ''}
        ${done ? `<small>✅ ${L('عندك', 'Yours', 'Senin')}</small>` : coinTag(price)}</button>`; }).join('')}</div>
    <p class="mp-msg" id="shedMsg">${msg || ''}</p>`;
  wireX();
  card.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
    const id = b.dataset.u;
    if(upgradeDone(id)){ SFX.tap(); return; }
    if(!buyUpgrade(id)){ SFX.bonk(); $('#shedMsg').textContent = L('بدّك قروش أكتر 💰', 'You need more coins 💰', 'Daha çok para 💰 lazım'); return; }
    if(id === 'fert') openShed('🧪 +' + N(3)); else { closeCard(); say('✅ ' + UPG[id].name + ' — ' + UPG[id].info, 4000); }
  });
}
function openBasket(){
  openCard(true);
  const keys = Object.keys(SAVE.basket).filter(k => SAVE.basket[k] > 0);
  card.innerHTML = `${xBtn}<h2>🧺 ${L('سلّتي', 'My basket', 'Sepetim')}</h2>
    ${keys.length ? `<div class="sellrow">${keys.map(k => `<div class="item"><span class="cnt">×${N(SAVE.basket[k])}</span><span class="em">${itemEmoji(k)}</span><b>${itemName(k)}</b></div>`).join('')}</div>
    <p>${L('بيعهن بالسوق 🧺 جنب الجنينة', 'Sell them at the market 🧺 next to the garden', 'Bahçenin yanındaki pazarda 🧺 sat')}</p>` : `<p>${L('السلة فاضية 🥕', 'The basket is empty 🥕', 'Sepet boş 🥕')}</p>`}
    <p>🌱 ${PLANT_IDS.filter(k => SAVE.seeds[k]).map(k => PLANTS[k].e + '×' + N(SAVE.seeds[k])).join('  ') || '—'}</p>`;
  wireX();
}
/* «كتاب البستان»: every plant has 3 stars (picked / golden / crystal); a page pays World coins when all its plants reach a star level */
const starsOf = k => { const b = SAVE.book[k] || [0, 0, 0]; return [b[0] + b[1] + b[2] > 0, b[1] > 0, b[2] > 0]; };
const pageLevel = p => { let l = 0; for(let s = 0; s < 3; s++){ if(p.items.every(k => starsOf(k)[s])) l = s + 1; else break; } return l; };
function claimPage(pi){
  const p = PAGES[pi], lvl = pageLevel(p), had = SAVE.claims[p.id] | 0;
  if(lvl <= had) return 0;
  let coins = 0; for(let l = had; l < lvl; l++) coins += PAGE_REWARD[l];
  SAVE.claims[p.id] = lvl; persist(); SFX.star();
  try{ if(window.World) World.addCoins(coins, L('من جنينة بوبو', 'from Bobo Garden', 'Bobo Bahçesi\'nden')); }catch(e){}
  return coins;
}
function openBook(pi){
  openCard(true);
  const p = PAGES[pi], lvl = pageLevel(p), had = SAVE.claims[p.id] | 0;
  const total = PLANT_IDS.reduce((a, k) => a + starsOf(k).filter(Boolean).length, 0);
  card.innerHTML = `${xBtn}<h2>📖 ${L('كتاب البستان', 'Garden book', 'Bahçe kitabı')} · ⭐ ${N(total)}/${N(PLANT_IDS.length * 3)}</h2>
    <div class="tabs">${PAGES.map((q, j) => `<button data-p="${j}" class="${j === pi ? 'on' : ''}">${q.e} ${q.name}${pageLevel(q) > (SAVE.claims[q.id] | 0) ? ' 🎁' : ''}</button>`).join('')}</div>
    <div class="book">${p.items.map(k => { const s = starsOf(k), b = SAVE.book[k] || [0, 0, 0], known = s[0];
      return `<div class="entry${known ? '' : ' unk'}"><span class="em">${PLANTS[k].e}</span><b>${known ? PLANTS[k].name : '؟'}</b><span class="st">${['⭐', '✨', '💎'].map((e, j) => s[j] ? e : `<s>${e}</s>`).join('')}</span><small>${known ? '🧺 ' + N(b[0] + b[1] + b[2]) : ''}</small></div>`; }).join('')}</div>
    <p>⭐ ${L('قطفت', 'Picked', 'Toplandı')} · ✨ ${L('ذهبي', 'Golden', 'Altın')} · 💎 ${L('كريستال', 'Crystal', 'Kristal')}</p>
    ${lvl > had ? `<button class="big-btn" id="bClaim">🎁 ${L('خود الجائزة', 'Get the prize', 'Ödülü al')} · ${N(PAGE_REWARD.slice(had, lvl).reduce((a, b) => a + b, 0))} 🪙</button>` : had >= 3 ? `<p>🏆 ${L('الصفحة كاملة!', 'Page complete!', 'Sayfa tamam!')}</p>` : `<p>${L('كمّل الصفحة لتاخد جائزة 🪙', 'Complete the page to get a prize 🪙', 'Ödül için sayfayı tamamla 🪙')}</p>`}`;
  wireX();
  card.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { SFX.tap(); openBook(+b.dataset.p); });
  const bc = $('#bClaim'); if(bc) bc.onclick = () => { const c = claimPage(pi); if(c) pop('+' + N(c) + ' 🪙'); openBook(pi); };
}

/* ======================================================================
   Menu, hero picker, pause, daily gift, starting to play
   ====================================================================== */
function showMenu(){
  if(MP.t){ mpLeave(true); }
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('garden_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🌻</div><h1>${L('جنينة بوبو', 'Bobo Garden', 'Bobo Bahçesi')}</h1>
    <p class="sub">${L('ازرع، اسقي، اقطف، وبيع بالسوق!', 'Plant, water, pick and sell at the market!', 'Ek, sula, topla ve pazarda sat!')}</p>
    <div class="row"><div class="mine"><span>${COIN} ${N(SAVE.coins)}</span><span>🟫 ${N(PLOT_N[SAVE.plot])}</span><span>📖 ${N(PLANT_IDS.filter(k => starsOf(k)[0]).length)}/${N(PLANT_IDS.length)}</span></div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  $('#bPlay').onclick = () => { ac(); SFX.tap(); startPlay(); };
  $('#bMp').onclick = () => { ac(); SFX.tap(); mpMenu(); };
  $('#bHero').onclick = () => { ac(); SFX.tap(); showSelect('menu'); };
}
let selFrom = 'menu', selPick = heroId;
function showSelect(from){
  selFrom = from; state = 'select'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card wide';
  selPick = heroId;
  card.innerHTML = `<h2>🦸 ${L('اختار شخصيتك', 'Pick your character', 'Karakterini seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === selPick ? ' on' : ''}" data-id="${id}" style="--c:${HERO_COLOR[id]}" aria-pressed="${id === selPick}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <button class="big-btn" id="bOkHero">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const btns = [...card.querySelectorAll('.hero')];
  btns.forEach(b => b.onclick = () => { selPick = b.dataset.id; SFX.tap(); btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
  $('#bOkHero').onclick = () => {
    SFX.tap(); SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setHero(selPick);
    if(mpActive()) mpTrack();
    if(selFrom === 'pause'){ overlay.hidden = true; state = 'play'; setPlayUI(true); }
    else if(selFrom === 'mp') mpMenu(); else showMenu();
  };
}
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush(); persist();
  const mp = mpActive();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    ${mp ? `<button class="ghost-btn" id="bLeaveR">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : ''}</div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { muted = !muted; rawSet('adv3d_muted', String(muted)); $('#bSnd').innerHTML = (muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  if(mp) $('#bLeaveR').onclick = () => { SFX.tap(); mpLeave(); resume(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
/* daily gift: a seed packet */
function rollPacket(){
  const cheap = ['carrot', 'tomato', 'strawberry', 'sunflower', 'corn', 'blueberry'], rare = ['pumpkin', 'watermelon', 'cactus', 'apple'];
  const out = {}; const a = pick(cheap), b = pick(cheap.filter(k => k !== a));
  out[a] = 3; out[b] = 2; if(Math.random() < .25) out[pick(rare)] = 1;
  return out;
}
function dailyCard(){
  const pack = rollPacket();
  openCard(false);
  card.innerHTML = `<div class="bigstar">🎁</div><h2>${L('هدية اليوم!', "Today's gift!", 'Günün hediyesi!')}</h2>
    <div class="giftbig">🌱</div>
    <p>${L('كيس بذور هدية من العمة ليلى:', 'A seed packet from Aunt Laila:', 'Leyla Teyze\'den bir tohum paketi:')}</p>
    <p style="font-size:28px;direction:ltr">${Object.keys(pack).map(k => PLANTS[k].e + '×' + N(pack[k])).join('  ')}</p>
    <button class="big-btn" id="bTake">🎁 ${L('خدها!', 'Take it!', 'Al!')}</button>`;
  $('#bTake').onclick = () => { takeDaily(pack); closeCard(); say(L('ازرعهن بالجنينة! 🌱', 'Plant them in your garden! 🌱', 'Bahçene ek! 🌱'), 3500); };
}
function takeDaily(pack){
  if(SAVE.daily === today()) return false;
  SFX.star(); SAVE.daily = today();
  for(const k in pack) SAVE.seeds[k] = Math.min(999, (SAVE.seeds[k] || 0) + pack[k]);
  persist(); hudKey = ''; pop('+🌱');
  return true;
}
function startPlay(where){
  if(ROT) rawSet('garden_rothint', '1');
  overlay.hidden = true;
  const sp = where === 'visit' ? { x:2.2, z:5.2, f:Math.PI } : SPAWN;
  P.x = sp.x; P.z = sp.z; P.face = sp.f; P.vx = P.vz = 0; P.goal = null; P.busy = null;
  cam.yaw = 0; cam.pAdj = 0; snapCam = true; closeup = null;
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  if(where === 'visit') return;
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(LINES.hi, 3800); setTimeout(() => { if(state === 'play' && SAVE.tut === 1) say(LINES.plant, 7000); }, 4000); }
  else if(SAVE.tut === 1) say(LINES.plant, 6000);
  else if(SAVE.daily !== today() && !mpActive()) setTimeout(() => { if(state === 'play') dailyCard(); }, 500);
  else if(offlineGrew > 60){ say(L('جنينتك كبرت شوي وإنت مش هون 🌱', 'Your garden grew a little while you were away 🌱', 'Sen yokken bahçen biraz büyüdü 🌱'), 4000); offlineGrew = 0; }
  else say(LINES.back, 2500);
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  if(state === 'play'){ readInput(dt); stepPlayer(dt); }
  else { P.vx = P.vz = 0; P.move = lerp(P.move, 0, Math.min(1, dt * 10)); }
  if(heroM){ heroM.grp.position.set(P.x, 0, P.z); heroM.grp.rotation.y = P.face; poseHero(heroM, { t:T, dt, run:P.move, grounded:true, vy:0, sq:0, flip:0 }); }
  busyFrame(dt);
  // your own garden grows whenever the game is open (not on the title screen)
  if(state !== 'menu' && state !== 'select'){ tickGarden(dt); weatherTick(dt); }
  if(state === 'play'){ updateActBtn(); hudFrame(); saveT += dt; if(saveT > 8) persist(); }
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .05 + .3;
    camera.position.set(Math.sin(a) * 19, 11, Math.cos(a) * 19); camera.lookAt(0, 0, -1); camLook.set(0, 0, -1); aimSun(0, -1);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  plotFrame(dt); crowFrame(dt); thrownFrame(dt); weatherFrame(dt); bugsFrame(dt);
  if(pondTex) pondTex.offset.set(T * .02, T * .012);
  animGuide();
  mpFrame(dt);
  updateParts(dt); updateFloaters(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   The room owner's garden is the garden everyone sees. Events: pos, fx, gdn, greq, help, helped, gf.
   No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'fx', 'gdn', 'greq', 'help', 'helped', 'gf'];
const MP_MAX = 4, MCOL = ['#ff8fb1', '#6cc4ff', '#5ed6a0', '#ffc23d'];
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
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(!SupabaseTransport.client) SupabaseTransport.client = window.supabase.createClient(MP_URL, MP_KEY, {
      auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }, realtime:{ params:{ eventsPerSecond:30 } } });
    const sb = SupabaseTransport.client;
    const ch = this.ch = sb.channel('bobo-garden-' + code, { config:{ broadcast:{ self:false, ack:false }, presence:{ key:id, enabled:true } } });
    ch.on('presence', { event:'sync' }, () => {
      const st = ch.presenceState(), list = [];
      for(const k in st){ const m = st[k]; if(m && m.length) list.push(Object.assign({}, m[m.length - 1], { id:k })); }
      h.presence(list);
    });
    MP_EVENTS.forEach(ev => ch.on('broadcast', { event:ev }, m => h.msg(ev, m && m.payload)));
    await new Promise((res, rej) => {
      let first = true;
      const to = setTimeout(() => { if(first){ first = false; rej(new Error('timeout')); } }, 9000);
      ch.subscribe(status => {
        if(status === 'SUBSCRIBED'){ if(first){ first = false; clearTimeout(to); res(); } else h.status('up'); }
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){
          if(first){ first = false; clearTimeout(to); rej(new Error(status)); } else if(!this.closed) h.status('down');
        }
      });
    });
  }
  track(meta){ try{ const p = this.ch && this.ch.track(Object.assign({}, meta)); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  send(ev, payload){ try{ const p = this.ch && this.ch.send({ type:'broadcast', event:ev, payload }); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  close(){
    this.closed = true; const ch = this.ch, sb = SupabaseTransport.client; this.ch = null;
    if(!ch || !sb) return;
    try{ const p = ch.untrack(); if(p && p.catch) p.catch(() => {}); }catch(e){}
    try{ const p = sb.removeChannel(ch); if(p && p.catch) p.catch(() => {}); }catch(e){}
  }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-garden-' + code);
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
      for(const [k, p] of this.peers) if(now - p.last > 8000){ this.peers.delete(k); ch = true; }
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, gdnT:0, inviteFor:null, typed:'', helps:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'garden';
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
addEventListener('pagehide', () => { try{ if(frRoomCode && window.Friends){ clearInterval(frRoomIv); frRoomIv = 0; frRoomCode = null; Friends.setRoom(null, null, true); } }catch(e){} });
/* friends in the room: their character (with a watering can when they water) */
const RM = new Map();
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, can:null, canT:0, x:SPAWN.x + 2, z:SPAWN.z, f:Math.PI, m:0, tx:SPAWN.x + 2, tz:SPAWN.z, tf:Math.PI, tm:0, c:p.c, t:Math.random() * 5, seen:false }; RM.set(p.id, a); }
    a.c = p.c;
    const hero = okHero(p.hero);
    if(a.hero !== hero){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp); a.can = new THREE.Mesh(canMesh.geometry, MAT); a.can.position.set(.32, .55, .32); a.can.visible = false; a.h.grp.add(a.can); }
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); RM.delete(id); if(GF && GF.peer === id) giftCancel(L('صاحبك طلع من الغرفة', 'Your friend left the room', 'Arkadaşın odadan çıktı')); }
  hudKey = '';
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
  remoteSync();
  if(GF){ giftRefund(); GF = null; }
  $('#mpBar').hidden = true; hudKey = '';
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  MP.helps = 0;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.t.track(MP.meta); hudKey = ''; } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me = all.findIndex(p => p.id === MP.id);
  if(me >= MP_MAX){ mpLeave(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); say(L('صاحب الجنينة طلع 🚪 رجعنا عجنينتك', 'The garden owner left 🚪 back to your garden', 'Bahçe sahibi çıktı 🚪 bahçene döndün'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.flag(); if(MP.isHost){ gdnDirty = true; mpGarden(); say(L('صاحبك إجا يزور جنينتك! 🌻', 'A friend came to visit your garden! 🌻', 'Bir arkadaşın bahçeni ziyarete geldi! 🌻'), 3500); } }
  remoteSync(); hudKey = '';
}
/* the host sends its garden: [plant index, growth, wet, variant, fertilized] per cell (0 = empty) */
function mpGarden(){
  if(!mpActive() || !MP.isHost) return;
  gdnDirty = false; MP.gdnT = 1.5;
  mpSend('gdn', { lvl:SAVE.plot, up:[+SAVE.up.sprinkler, +SAVE.up.scarecrow, +SAVE.up.greenhouse], w:W.kind,
    t:SAVE.tiles.map(t => t ? [PLANT_IDS.indexOf(t.p), Math.round(t.g * 1000) / 1000, t.w > 0 ? 1 : 0, t.v, t.f ? 1 : 0] : 0) });
}
function gardenIn(p){
  if(!Array.isArray(p.t) || p.t.length !== NCELL) return null;
  const lvl = clamp(p.lvl | 0, 0, PLOT_MAX), un = unlockedSet(lvl), up = Array.isArray(p.up) ? p.up : [];
  return { lvl, up:{ sprinkler:!!up[0], scarecrow:!!up[1], greenhouse:!!up[2] },
    tiles:p.t.map((r, i) => Array.isArray(r) && un.has(i) && PLANT_IDS[r[0] | 0] ? { p:PLANT_IDS[r[0] | 0], g:clamp(+r[1] || 0, 0, 1), w:r[2] ? WATER_T : 0, v:clamp(r[3] | 0, 0, 2), f:!!r[4], n:0 } : null) };
}
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){ if(!a) return; a.tx = clamp(+p.x || 0, -25, 25); a.tz = clamp(+p.z || 0, -25, 25); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1); if(!a.seen){ a.seen = true; a.x = a.tx; a.z = a.tz; } }
  else if(ev === 'fx'){ if(!a) return; if(p.k === 'water'){ a.canT = 1; } else if(p.k === 'pick'){ burst(a.x, 1, a.z, 18, CONFETTI, 3, .8); } }
  else if(ev === 'greq'){ if(MP.isHost) mpGarden(); }
  else if(ev === 'gdn'){
    if(MP.isHost || p.id !== MP.hostId) return;
    const g = gardenIn(p); if(!g) return;
    visiting = g; hostWx = WX[p.w] ? p.w : 'clear'; hudKey = '';
  }
  else if(ev === 'help'){ if(MP.isHost) onHelp(p); }
  else if(ev === 'helped'){ if(p.to === MP.id) onHelped(p); }
  else if(ev === 'gf') onGift(p);
}
/* helping water a friend's garden: the helper gets a few coins, the host's plant gets a growth boost */
function helpTile(i){
  const t = visiting && visiting.tiles[i];
  if(!t){ say(L('هاي جنينة صاحبك 🌻 هو بس اللي بيزرع', "This is your friend's garden 🌻 only they can plant", 'Burası arkadaşının bahçesi 🌻 sadece o ekebilir'), 3000); return; }
  if(t.g >= 1){ say(L('صاحبك بيقطفها 🧺 إنت ساعدو بالسقاية 💧', 'Your friend picks this 🧺 you can help with water 💧', 'Bunu arkadaşın toplar 🧺 sen sulamaya yardım et 💧'), 3000); return; }
  if(t.w > 0){ say(L('هاي مسقية 💧 دوّر على نبتة عطشانة', 'This one has water 💧 find a thirsty one', 'Bunun suyu var 💧 susuz birini bul'), 2500); return; }
  startWater(i);
}
function helpSend(i){ mpSend('help', { i }); mpSend('fx', { k:'water' }); if(visiting && visiting.tiles[i]) visiting.tiles[i].w = WATER_T; floatIcon('drop', cellX(i), .9, cellZ(i), 1, .4); }
function onHelp(p){
  const i = p.i | 0, t = SAVE.tiles[i];
  const ok = !!(t && t.g < 1 && t.w < WATER_T * .6 && RM.has(p.id));
  if(ok){
    t.w = WATER_T; const st0 = stageOf(t.g); t.g = Math.min(1, t.g + HELP_BONUS);
    if(t.g >= 1){ t.v = rollVariant(false); ripeFx(t); } else if(stageOf(t.g) !== st0) cells[i].pulse = 1;
    gdnDirty = true; persist();
    floatIcon('heart', cellX(i), 1.1, cellZ(i), 3, .4); SFX.heart();
    if(state === 'play') pop('💚 ' + L('صاحبك سقى نبتتك!', 'Your friend watered your plant!', 'Arkadaşın bitkini suladı!'));
  }
  mpSend('helped', { to:p.id, i, ok });
  mpGarden();
}
function onHelped(p){
  if(!p.ok) return;
  floatIcon('heart', cellX(p.i | 0), 1.1, cellZ(p.i | 0), 3, .4); SFX.heart();
  if(MP.helps < HELP_MAX){ MP.helps++; SAVE.coins += HELP_COINS; persist(); hudKey = ''; pop('+' + N(HELP_COINS) + ' ' + COIN + ' ' + L('شكراً!', 'Thanks!', 'Teşekkürler!')); }
  else pop('💚 ' + L('شكراً!', 'Thanks!', 'Teşekkürler!'));
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && state !== 'menu' && state !== 'select'){ MP.sendT = .12; mpSend('pos', { x:Math.round(P.x * 100) / 100, z:Math.round(P.z * 100) / 100, f:Math.round(P.face * 100) / 100, m:Math.round(P.move * 100) / 100 }); }
  if(MP.isHost){ MP.gdnT -= dt; if(MP.gdnT <= 0 || (gdnDirty && MP.gdnT < 1.2)) mpGarden(); }
  if(P.busy && P.busy.k === 'water' && !P.busy.sent){ P.busy.sent = true; mpSend('fx', { k:'water' }); }
  for(const a of RM.values()){
    const k = 1 - Math.exp(-10 * dt);
    a.x = lerp(a.x, a.tx, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k); a.t += dt;
    if(a.h){ a.h.grp.position.set(a.x, 0, a.z); a.h.grp.rotation.y = a.f; poseHero(a.h, { t:a.t, dt, run:a.m, grounded:true, vy:0, sq:0, flip:0 }); }
    if(a.can){ a.canT = Math.max(0, a.canT - dt); a.can.visible = a.canT > 0; if(a.canT > 0){ a.can.rotation.x = .8; if(Math.random() < .7){ _v.set(.32, .7, .62).applyMatrix4(a.h.grp.matrixWorld); spray(_v.x, _v.y, _v.z, Math.sin(a.f) * .6, Math.cos(a.f) * .6, 1); } } }
  }
}
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  if(visiting){ visiting = null; hostWx = null; }
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  if(visiting){ visiting = null; hostWx = null; }
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🌻 ${L('أصحابك بيزوروا جنينتك، بيساعدوك بالسقاية، وبتهادوا ثمار', 'Friends visit your garden, help you water, and you gift each other fruit', 'Arkadaşların bahçeni ziyaret eder, sulamaya yardım eder, birbirinize meyve hediye edersiniz')}</p>
    <button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bCreate">🏡 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showMenu(); };
}
function mpConnecting(){
  MP.screen = 'connecting'; mpCard(false);
  card.innerHTML = `<div class="bigstar"><span class="spin">⏳</span></div><h2>${L('عم نتصل…', 'Connecting…', 'Bağlanıyor…')}</h2>
    <button class="ghost-btn" id="bCancel">↩️ ${L('رجوع', 'Back', 'Geri')}</button>`;
  $('#bCancel').onclick = () => { SFX.tap(); mpMenu(); };
}
function mpError(retry){
  MP.screen = 'error'; mpCard(false);
  card.innerHTML = `<div class="bigstar">📡</div><h2>${L('ما في إنترنت؟ جرّب كمان مرة', 'No internet? Try again', 'İnternet yok mu? Tekrar dene')}</h2>
    <div class="row"><button class="big-btn" id="bRetry">🔄 ${L('جرّب كمان مرة', 'Try again', 'Tekrar dene')}</button><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bRetry').onclick = () => { SFX.tap(); retry(); };
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
}
function mpEnter(){
  MP.screen = 'in';
  startPlay(MP.isHost ? 'own' : 'visit');
  if(MP.isHost){ gdnDirty = true; mpGarden(); say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000); }
  else { mpSend('greq', {}); say(L('أهلا! هاي جنينة صاحبك 🌻 ساعدو يسقي النباتات العطشانة 💧', "Welcome! This is your friend's garden 🌻 help water the thirsty plants 💧", 'Hoş geldin! Burası arkadaşının bahçesi 🌻 susuz bitkileri sulamaya yardım et 💧'), 5000); }
}
async function mpCreate(want){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(r === 'ok'){ mpEnter(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(mpCreate); }
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
    if(r === 'ok') mpEnter();
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'garden' yet: guarded. */
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  try{
    Friends.invite(who, MP.code, FR_GAME).then(r => {
      if(r && r.status === 'sent') say(L('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else say(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
    }, () => say(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle')));
  }catch(e){}
}
function mpKeypad(msg){
  MP.screen = 'keypad'; MP.typed = ''; mpCard(true);
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  card.innerHTML = `<h2>🔢 ${L('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-cols"><div class="mp-col"><div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg">${msg || ''}</p>
      <button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${L('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${L('تمام', 'OK', 'Tamam')}">✅</button></div></div>`;
  card.querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); SFX.tap(); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.bonk(); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; SFX.tap(); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(state !== 'mp' || MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});

/* ======================================================================
   «هدية» gift a fruit. The fruit is shown big; both kids press ✓, then ✓✓ again («متأكد؟»).
   «ما بدي» cancels at any step (the fruit goes back to the giver). Messages: ask → ok1 → ok2 (or no).
   ====================================================================== */
let GF = null;
function giftWho(){
  openCard(false);
  card.innerHTML = `${xBtn}<h2>🎁 ${L('لمين الهدية؟', 'Who is the gift for?', 'Hediye kime?')}</h2>
    <div class="row">${[...RM.values()].map(a => `<button class="hero-btn" data-w="${a.id}" style="--c:${MCOL[a.c] || '#fff'}"><img src="${charImg(a.hero)}" alt=""><span>${HERO_NAME[a.hero]}</span></button>`).join('')}</div>`;
  wireX();
  card.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { SFX.tap(); closeCard(); giftStart(b.dataset.w); });
}
function giftStart(peer){
  if(GF || !mpActive() || !RM.has(peer)) return;
  SFX.tap(); openCard(true);
  const keys = Object.keys(SAVE.basket).filter(k => SAVE.basket[k] > 0), a = RM.get(peer);
  card.innerHTML = `${xBtn}<h2>🎁 <img src="${charImg(a.hero)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:top;vertical-align:middle;box-shadow:0 0 0 3px ${MCOL[a.c] || '#fff'}"> ${L('شو بدّك تهدي صاحبك؟', 'What will you gift your friend?', 'Arkadaşına ne hediye edeceksin?')}</h2>
    ${keys.length ? `<div class="sellrow">${keys.map(k => `<button class="item" data-k="${k}"><span class="cnt">×${N(SAVE.basket[k])}</span><span class="em">${itemEmoji(k)}</span><b>${itemName(k)}</b></button>`).join('')}</div>`
      : `<p>${L('سلّتك فاضية! اقطف ثمار أول 🧺', 'Your basket is empty! Pick some fruit first 🧺', 'Sepetin boş! Önce meyve topla 🧺')}</p>`}
    <button class="big-btn no" id="bNo">🙅 ${L('ما بدي', 'No thanks', 'İstemiyorum')}</button>`;
  wireX(); $('#bNo').onclick = () => { SFX.tap(); closeCard(); };
  card.querySelectorAll('[data-k]').forEach(b => b.onclick = () => giftOffer(peer, b.dataset.k));
}
function giftOffer(peer, k){
  if(GF || !RM.has(peer) || !(SAVE.basket[k] > 0)) return false;
  SAVE.basket[k]--; if(!SAVE.basket[k]) delete SAVE.basket[k];          // held until the gift is done (or given back)
  GF = { gid:newUid(), peer, role:'give', item:k, step:'c1', ok1:[false, false], ok2:[false, false] };
  mpSend('gf', { to:peer, gid:GF.gid, k:'ask', item:k }); hudKey = '';
  if(state !== 'card') openCard(true);
  giftRender(); return true;
}
function giftRefund(){ if(GF && GF.role === 'give' && GF.item){ SAVE.basket[GF.item] = Math.min(999, (SAVE.basket[GF.item] || 0) + 1); GF.item = null; persist(); hudKey = ''; } }
function onGift(p){
  if(p.to !== MP.id || typeof p.gid !== 'string') return;
  if(p.k === 'ask'){
    if(GF || !parseItem(p.item) || !(state === 'play' || state === 'pause')){ mpSend('gf', { to:p.id, gid:p.gid, k:'no' }); return; }
    if(state === 'pause'){ overlay.hidden = true; state = 'play'; }
    GF = { gid:p.gid, peer:p.id, role:'get', item:p.item, step:'c1', ok1:[false, false], ok2:[false, false] };
    SFX.flag(); openCard(true); giftRender(); return;
  }
  if(!GF || GF.gid !== p.gid || GF.peer !== p.id) return;
  if(p.k === 'no'){ giftCancel(); return; }
  if(p.k === 'ok1' && GF.step === 'c1'){ GF.ok1[1] = true; if(GF.ok1[0]) GF.step = 'c2'; }
  else if(p.k === 'ok2' && GF.step === 'c2'){ GF.ok2[1] = true; if(GF.ok2[0]){ giftCommit(); return; } }
  giftRender();
}
function giftNo(){ if(GF){ mpSend('gf', { to:GF.peer, gid:GF.gid, k:'no' }); giftRefund(); GF = null; } }
function giftCancel(msg){
  giftRefund(); GF = null; if(state !== 'card') return;
  card.innerHTML = `<div class="bigstar">👍</div><h2>${L('ما صارت هدية', 'No gift this time', 'Hediye olmadı')}</h2>${msg ? `<p>${msg}</p>` : ''}<button class="big-btn" id="bOk">${L('تمام', 'OK', 'Tamam')}</button>`;
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); };
}
function giftCommit(){
  const g = GF; GF = null;
  if(g.role === 'get'){ SAVE.basket[g.item] = Math.min(999, (SAVE.basket[g.item] || 0) + 1); }
  persist(); hudKey = ''; SFX.star(); mpSend('fx', { k:'pick' });
  burst(P.x, 1.2, P.z, 30, CONFETTI, 4, 1);
  if(state !== 'card') return;
  card.innerHTML = `<div class="bigstar">🎉</div><h2>${g.role === 'get' ? L('وصلتك هدية!', 'You got a gift!', 'Hediye geldi!') : L('بعتّ الهدية!', 'Gift sent!', 'Hediye gönderildi!')}</h2>
    <div class="giftbig">${itemEmoji(g.item)}</div><p>${itemName(g.item)}</p>
    <button class="big-btn" id="bOk">🌻 ${L('يا سلام!', 'Hooray!', 'Yaşasın!')}</button>`;
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); };
}
function giftRender(){
  if(!GF || state !== 'card') return;
  const a = RM.get(GF.peer), friendImg = a ? `<img src="${charImg(a.hero)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:top;vertical-align:middle;box-shadow:0 0 0 3px ${MCOL[a.c] || '#fff'}">` : '';
  const c2 = GF.step === 'c2', ok = c2 ? GF.ok2 : GF.ok1, okIc = v => v ? '✅' : '⏳';
  const head = GF.role === 'give' ? L('بدّك تهدي صاحبك', 'You are gifting your friend', 'Arkadaşına hediye ediyorsun') : L('صاحبك بدّو يهديك', 'Your friend wants to gift you', 'Arkadaşın sana hediye vermek istiyor');
  const me = `<div class="side2" style="--c:${MCOL[MP.meta ? MP.meta.c : 0]}"><span class="who">${L('إنت', 'You', 'Sen')}</span><img src="${charImg(heroId)}" alt="" style="background:none"><span class="ok">${okIc(ok[0])}</span></div>`;
  const them = `<div class="side2" style="--c:${a ? MCOL[a.c] : '#ddd'}"><span class="who">${L('صاحبك', 'Friend', 'Arkadaşın')}</span><img src="${charImg(a ? a.hero : 'sara')}" alt="" style="background:none"><span class="ok">${okIc(ok[1])}</span></div>`;
  card.innerHTML = `<h2>🎁 ${friendImg} ${head}</h2>
    <div class="trade${c2 ? ' big' : ''}">${GF.role === 'give' ? me : them}<div style="display:flex;flex-direction:column;align-items:center"><span class="giftbig">${itemEmoji(GF.item)}</span><b>${itemName(GF.item)}</b><span class="arrows">➡️</span></div>${GF.role === 'give' ? them : me}</div>
    <h2 style="font-size:22px">${c2 ? L('متأكد؟ 🤔 كبوس كمان مرة', 'Are you sure? 🤔 Press again', 'Emin misin? 🤔 Tekrar bas') : L('شوف منيح وكبوس ✓', 'Look carefully, then press ✓', 'İyice bak ve ✓ bas')}</h2>
    <div class="row"><button class="big-btn mint" id="bYes"${ok[0] ? ' disabled' : ''}>${c2 ? '✓✓ ' + L('أكيد!', "I'm sure!", 'Eminim!') : '✓ ' + L('موافق', 'OK', 'Tamam')}</button><button class="big-btn no" id="bNo">🙅 ${L('ما بدي', 'No thanks', 'İstemiyorum')}</button></div>`;
  $('#bYes').onclick = () => giftYes();
  $('#bNo').onclick = () => { SFX.tap(); giftNo(); closeCard(); };
}
function giftYes(){
  if(!GF) return; SFX.tap();
  if(GF.step === 'c1'){ GF.ok1[0] = true; mpSend('gf', { to:GF.peer, gid:GF.gid, k:'ok1' }); if(GF.ok1[1]) GF.step = 'c2'; giftRender(); }
  else if(GF.step === 'c2'){ GF.ok2[0] = true; mpSend('gf', { to:GF.peer, gid:GF.gid, k:'ok2' }); if(GF.ok2[1]) giftCommit(); else giftRender(); }
}

/* ---------- test hook ---------- */
window.__garden = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:where => startPlay(where),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), get coins(){ return SAVE.coins; }, addCoins(n){ SAVE.coins += n; hudKey = ''; persist(); },
  giveSeeds(k, n = 1){ SAVE.seeds[k] = (SAVE.seeds[k] || 0) + n; hudKey = ''; persist(); },
  P, tp(x, z, f){ P.x = x; P.z = z; if(f != null) P.face = f; P.goal = null; snapCam = true; },
  cell:i => ({ x:cellX(i), z:cellZ(i) }), unlocked:() => [...unlocked()], tiles:() => SAVE.tiles.map(t => t && Object.assign({ st:stageOf(t.g) }, t)),
  view:() => curView().tiles.map(t => t && { p:t.p, g:t.g, w:t.w, v:t.v, st:stageOf(t.g) }), shownKey:i => cells[i].key,
  tap:i => tileTap(i), act:i => tileAction(i), plant:(i, k) => plantSeed(i, k), water:i => doWater(i), harvest:i => harvest(i),
  setGrowth(i, g){ const t = SAVE.tiles[i]; if(t){ t.g = g; if(g >= 1 && !t.v) t.v = 0; gdnDirty = true; } }, setVariant(i, v){ const t = SAVE.tiles[i]; if(t) t.v = v; },
  tick(sec){ let s = sec; while(s > 0){ const d = Math.min(1, s); tickGarden(d); s -= d; } },
  fertilize:i => fertilize(i), get fert(){ return SAVE.fert; },
  buySeed:k => buySeed(k), sell:k => sell(k), sellAll:() => sellAll(), buyUpgrade:id => buyUpgrade(id), upgradePrice:id => upgradePrice(id),
  spot:k => spotAction(k), shop:() => openShop(), market:() => openSell(), shed:() => openShed(), book:p => openBook(p || 0), claim:p => claimPage(p), pageLevel:p => pageLevel(PAGES[p]), PAGES,
  weather:k => startWeather(k), get wx(){ return { kind:W.kind, left:W.left, shown:shownWx(), rain:rainMesh.visible, stars:starMesh.visible }; },
  spawnCrow:f => spawnCrow(f), shoo:() => shooCrow(), get crow(){ return crow ? { phase:crow.phase, i:crow.i, x:crow.x, y:crow.y, z:crow.z } : null; },
  daily:() => dailyCard(), get offlineGrew(){ return offlineGrew; }, OFFLINE_CAP, WATER_T, PLANTS,
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, players:MP.players.map(p => ({ id:p.id, hero:p.hero })), remotes:[...RM.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, z:a.z })), visiting:!!visiting, helps:MP.helps }; },
  help:i => helpTile(i), helpNow:i => helpSend(i), giftTo:(peer, k) => { giftStart(peer); return giftOffer(peer, k); }, giftYes:() => giftYes(), get gift(){ return GF ? { role:GF.role, step:GF.step, item:GF.item, ok1:GF.ok1.slice(), ok2:GF.ok2.slice() } : null; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; }
};

/* ---------- boot ---------- */
buildWorld();
offlineGrew = applyOffline(); persist();
setHero(heroId);
rebuildPlot();
resize();
showMenu();
requestAnimationFrame(frame);
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 10000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(room); }
})();
