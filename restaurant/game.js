/* Bobo Restaurant («مطعم بوبو 🍕») — main game.
   A cosy restaurant on a little town street: a counter with the register, a kitchen (dough table, toppings table,
   brick oven, grill), a drinks fridge and ice-cream machine, a boxing table, dining tables, a delivery bike outside
   and 6 coloured, numbered houses. Pick a job at the job board — cashier, cook, boxer, delivery or manager —
   helper bots (the owner's characters) do the jobs nobody is doing, so the restaurant always works.
   Orders: customer (or phone) → cashier matches the picture bubble → cook (dough, toppings, oven with a green zone;
   burnt = smoke puff and redo) → boxer (plate or box + drink + ice cream) → the customer picks it up and eats,
   or the delivery kid rides to the matching house and rings the bell.
   Earn «قروش» per job done + stars per order (speed + accuracy); spend them on decorations and new menu items.
   Daily «طلب خاص»: a VIP customer with a big order. Save: restaurant_save v1.
   Online rooms (Supabase presence like garden; ?mp=local = BroadcastChannel): up to 4 kids, each picks a job;
   the room owner is authoritative for orders, customers and bots; the others send intents. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeRestaurantModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, glowTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const GM = makeRestaurantModels(THREE, K);
const { MAT, TOPS, TOP_IDS, EXTRA } = GM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const COIN = '💰';
const r2 = v => Math.round(v * 100) / 100;

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const JOBS = {
  cashier: { e:'🧾', name:L('كاشير', 'Cashier', 'Kasiyer'), info:L('خود طلبات الزباين', 'Take the orders', 'Siparişleri al') },
  cook:    { e:'🧑‍🍳', name:L('طبّاخ', 'Cook', 'Aşçı'), info:L('اعمل بيتزا وبرغر', 'Make pizza and burgers', 'Pizza ve hamburger yap') },
  boxer:   { e:'📦', name:L('تغليف', 'Boxer', 'Paketçi'), info:L('صحن أو علبة + عصير', 'Plate or box + drink', 'Tabak ya da kutu + içecek') },
  delivery:{ e:'🚲', name:L('توصيل', 'Delivery', 'Kurye'), info:L('وصّل الطلب عالبيت', 'Take orders to houses', 'Siparişi eve götür') },
  manager: { e:'⭐', name:L('مدير', 'Manager', 'Müdür'), info:L('خلّي المساعدين أسرع', 'Speed up the helpers', 'Yardımcıları hızlandır') }
};
const JOB_IDS = Object.keys(JOBS);
const WORK_JOBS = ['cashier', 'cook', 'boxer', 'delivery'];
const ITEM_E = { pizza:'🍕', burger:'🍔', juice:'🧃', ice:'🍦', plate:'🍽️', box:'📦', cheese:'🧀', tomato:'🍅', mushroom:'🍄', olive:'🫒', pepper:'🫑' };
const HOUSE_COL = ['#ff6b6b', '#4f9dff', '#3fc48a', '#f5b81c', '#a986ff', '#ff8f3a'];
const HOUSE_ROOF = [0xc94848, 0x2f6fc4, 0x2a8f60, 0xc98f12, 0x7a5ac9, 0xcf6a1e];
const HOUSE_X = [-30, -18, -6, 6, 18, 30], HOUSE_Z = 22, HOUSE_RING_Z = 18.3;
const MAX_ACTIVE = 4, SPAWN_FIRST = 2.5, SPAWN_MIN = 11, SPAWN_MAX = 16, FAST_DINE = 75, FAST_GO = 100;
const OVEN_T = 7, BURGER_T = 5.5, GREEN = [.55, .8], DOUGH_TAPS = 6;
const PAY = { take:3, cook:5, perfect:2, box:3, tip:8, team:1, manager:2 };
const MILES = [[10, 3], [50, 5], [150, 10]];    // served orders → World coins
const VIP_COINS = 25, VIP_WORLD = 3;
const DECOR = {
  wall:  { e:'🧱', name:L('الحيطان', 'Walls', 'Duvarlar'), items:{
    cream:{ col:'#fff1d8', price:0, name:L('كريمي', 'Cream', 'Krem') }, mint:{ col:'#c9f2de', price:40, name:L('نعناعي', 'Mint', 'Nane') },
    peach:{ col:'#ffd6c2', price:40, name:L('خوخي', 'Peach', 'Şeftali') }, sky:{ col:'#cfe9ff', price:60, name:L('سماوي', 'Sky', 'Gök') },
    lilac:{ col:'#e6dcff', price:60, name:L('ليلكي', 'Lilac', 'Leylak') }, butter:{ col:'#fff2a8', price:80, name:L('أصفر', 'Butter', 'Sarı') } } },
  table: { e:'🪑', name:L('الطاولات', 'Tables', 'Masalar'), items:{
    wood:{ col:'#c98a52', price:0, name:L('خشب', 'Wood', 'Ahşap') }, white:{ col:'#ffffff', price:50, name:L('أبيض', 'White', 'Beyaz') },
    blue:{ col:'#6cc4ff', price:80, name:L('أزرق', 'Blue', 'Mavi') }, pink:{ col:'#ff9fc0', price:80, name:L('زهري', 'Pink', 'Pembe') },
    mint:{ col:'#5ed6a0', price:100, name:L('أخضر', 'Green', 'Yeşil') } } },
  plant: { e:'🪴', name:L('النباتات', 'Plants', 'Bitkiler'), items:{
    none:{ col:'#e8dcc8', price:0, name:L('ولا شي', 'None', 'Yok'), em:'➖' }, pots:{ price:40, name:L('ورود', 'Flowers', 'Çiçekler'), em:'🌷' },
    ferns:{ price:70, name:L('سرخس', 'Ferns', 'Eğrelti'), em:'🌿' }, trees:{ price:120, name:L('شجرات', 'Little trees', 'Ağaççıklar'), em:'🌳' } } },
  lamp:  { e:'💡', name:L('اللمبات', 'Lamps', 'Lambalar'), items:{
    none:{ price:0, name:L('ولا شي', 'None', 'Yok'), em:'➖' }, warm:{ price:60, name:L('لمبات دافية', 'Warm lamps', 'Sıcak lambalar'), em:'💡' },
    lantern:{ price:100, name:L('فوانيس', 'Lanterns', 'Fenerler'), em:'🏮' }, stars:{ price:150, name:L('نجوم', 'Stars', 'Yıldızlar'), em:'⭐' } } },
  sign:  { e:'🪧', name:L('اليافطة', 'Sign', 'Tabela'), items:{
    classic:{ price:0, name:L('عادية', 'Classic', 'Klasik'), em:'🪧' }, gold:{ price:100, name:L('ذهبية', 'Golden', 'Altın'), em:'✨' },
    bulbs:{ price:150, name:L('لمبات', 'Light bulbs', 'Ampuller'), em:'💡' } } }
};
const DECOR_IDS = Object.keys(DECOR);
const MENU_IDS = ['mushroom', 'olive', 'pepper', 'burger', 'ice'];
const menuPrice = k => TOPS[k] ? TOPS[k].price : EXTRA[k].price;
const menuE = k => ITEM_E[k];
const menuName = k => TOPS[k] ? TOPS[k].name : EXTRA[k].name;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ---------- save (this device): restaurant_save v1 ---------- */
const SAVE_KEY = 'restaurant_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){
  return { v:SAVE_V, coins:15, stars:0, served:0, hero:null, job:null, decor:{ wall:'cream', table:'wood', plant:'none', lamp:'none', sign:'classic' },
    own:{}, menu:{}, vipDay:'', tut:{}, miles:0, perfect:0, delivered:0, t:Date.now() };
}
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.coins = clamp(Math.floor(+s.coins || 0), 0, 9999999); s.stars = clamp(Math.floor(+s.stars || 0), 0, 9999999);
      s.served = clamp(s.served | 0, 0, 9999999); s.miles = clamp(s.miles | 0, 0, MILES.length);
      s.perfect = clamp(s.perfect | 0, 0, 9999999); s.delivered = clamp(s.delivered | 0, 0, 9999999);
      s.decor = {}; for(const c of DECOR_IDS){ const want = v.decor && v.decor[c]; s.decor[c] = DECOR[c].items[want] ? want : Object.keys(DECOR[c].items)[0]; }
      s.own = {}; if(v.own && typeof v.own === 'object') for(const k in v.own){ const [c, i] = k.split(':'); if(DECOR[c] && DECOR[c].items[i]) s.own[k] = 1; }
      s.menu = {}; if(v.menu && typeof v.menu === 'object') for(const k of MENU_IDS) if(v.menu[k]) s.menu[k] = 1;
      s.tut = {}; if(v.tut && typeof v.tut === 'object') for(const k of JOB_IDS) if(v.tut[k]) s.tut[k] = 1;
      s.job = JOBS[v.job] ? v.job : null; s.vipDay = typeof v.vipDay === 'string' ? v.vipDay : '';
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; SAVE.t = Date.now(); rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const owned = (c, i) => DECOR[c].items[i] && (DECOR[c].items[i].price === 0 || !!SAVE.own[c + ':' + i]);

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

/* ---------- Sound (tiny synth, no files): kitchen sounds + a cheerful loop ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true', noiseBuf = null;
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
function noise(dur, vol, freq, q, delay){
  if(muted) return; const a = ac(); if(!a) return;
  if(!noiseBuf){ noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = noiseBuf.getChannelData(0); for(let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t0 = a.currentTime + (delay || 0), s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.frequency.value = freq || 3000; f.Q.value = q || .8;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || .08, t0 + .03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(a.destination); s.start(t0); s.stop(t0 + dur + .05);
}
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  buy(){ [660, 880, 1100].forEach((f, i) => tone(f, .11, 'triangle', .1, i * .06)); },
  pick(){ tone(700, .07, 'triangle', .1, 0, 1000); },
  thump(){ tone(150, .12, 'sine', .22, 0, 70); noise(.08, .05, 600, 1); },
  plop(){ tone(420, .08, 'sine', .12, 0, 760); },
  sizzle(d = .9){ noise(d, .05, 5200, .6); noise(d * .8, .03, 2400, .9, .05); },
  ding(){ tone(1568, .5, 'sine', .12); tone(2093, .6, 'sine', .07, .02); },
  register(){ [1318, 1760].forEach((f, i) => tone(f, .09, 'square', .05, i * .07)); tone(2637, .35, 'triangle', .07, .16); },
  bell(){ [1318, 1046, 1318, 1046].forEach((f, i) => tone(f, .16, 'sine', .1, i * .12)); },
  bike(){ tone(2200, .12, 'sine', .08); tone(2200, .12, 'sine', .08, .18); },
  door(){ tone(988, .3, 'triangle', .1); tone(784, .4, 'triangle', .1, .22); },
  burnt(){ noise(.6, .09, 900, .5); tone(330, .2, 'square', .05, .1, 160); tone(220, .3, 'square', .05, .32, 110); },
  boing(){ tone(200, .35, 'sine', .12, 0, 600); },
  coins(){ [1318, 1568, 1976, 1568, 2093].forEach((f, i) => tone(f, .07, 'square', .045, i * .06)); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  cheer(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .14, 'triangle', .1, i * .07)); noise(.4, .03, 1800, .7, .1); },
  phone(){ for(let i = 0; i < 6; i++) tone(i % 2 ? 1300 : 1100, .06, 'square', .035, i * .07); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  magic(){ [784, 1046, 1318, 1568, 2093, 2637].forEach((f, i) => tone(f, .16, 'sine', .07, i * .08)); }
};
/* a gentle, cheerful loop (bass + melody), scheduled a little ahead */
const MUS = { on:false, next:0, step:0 };
const MEL = [72, 76, 79, 76, 77, 74, 72, -1, 69, 72, 76, 72, 74, 71, 67, -1, 72, 76, 79, 81, 79, 76, 77, 74, 72, 74, 76, 72, 71, 74, 72, -1];
const BASS = [48, 48, 53, 53, 45, 45, 50, 43];
const mfreq = m => 440 * Math.pow(2, (m - 69) / 12);
function musicTick(){
  const a = actx; if(!a || muted || !MUS.on || a.state !== 'running') { if(a) MUS.next = a.currentTime + .1; return; }
  const beat = 60 / 116 / 2;
  if(MUS.next < a.currentTime) MUS.next = a.currentTime + .05;
  while(MUS.next < a.currentTime + .3){
    const s = MUS.step % MEL.length, t = MUS.next - a.currentTime;
    if(MEL[s] > 0) tone(mfreq(MEL[s]), beat * 1.6, 'triangle', .022, t);
    if(s % 4 === 0) tone(mfreq(BASS[(s / 4) % BASS.length]), beat * 3.2, 'sine', .04, t);
    if(s % 2 === 1) noise(.04, .008, 7000, 1, t);
    MUS.step++; MUS.next += beat;
  }
}

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xffe9cf, 60, 150);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff1dc, 0x9a7a5c, 1.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeccc, 2.2);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-17, right:17, top:17, bottom:-17, near:1, far:90 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(12, 30, 18);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, skyMat);
  const pa = g.attributes.position, a = new THREE.Color(0x6cbcf5), h = new THREE.Color(0xfff0d8), b = new THREE.Color(0xffe2bd), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles: confetti / crumbs (instanced) ---------- */
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
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
/* soft puffs: steam from hot food (white), oven smoke (grey), a burnt pizza (dark, big) */
const puffTex = canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(.5, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
const puffs = [];
for(let i = 0; i < 70; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:puffTex, transparent:true, depthWrite:false, opacity:0 })); s.visible = false; scene.add(s); puffs.push({ s, life:0, max:1, vx:0, vy:0, vz:0, g:1, op:.6 }); }
let puNext = 0;
function puff(x, y, z, col = 0xffffff, size = .35, life = 1.4, up = .7, op = .55, grow = 1.6){
  const p = puffs[puNext]; puNext = (puNext + 1) % puffs.length;
  p.s.visible = true; p.s.material.color.set(col); p.s.position.set(x + (Math.random() - .5) * .15, y, z + (Math.random() - .5) * .15);
  p.life = p.max = life; p.vx = (Math.random() - .5) * .25; p.vy = up * (.7 + Math.random() * .6); p.vz = (Math.random() - .5) * .25; p.g = grow; p.op = op; p.size = size;
}
function updatePuffs(dt){
  for(const p of puffs){ if(p.life <= 0) continue; p.life -= dt; const k = 1 - p.life / p.max;
    p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
    p.s.scale.setScalar(p.size * (1 + k * p.g)); p.s.material.opacity = p.op * Math.sin(Math.min(1, k * 1.3) * Math.PI) ;
    if(p.life <= 0) p.s.visible = false; }
}
function smokePuff(x, y, z){ for(let i = 0; i < 14; i++) puff(x + (Math.random() - .5) * .6, y + Math.random() * .3, z + (Math.random() - .5) * .6, i % 3 ? 0x6b6460 : 0x3d3734, .5 + Math.random() * .3, 1.6 + Math.random() * .6, 1.1, .8, 2.2); }
/* floating icons (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); }),
  coin:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); x.arc(32, 32, 26, 0, 6.3); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 5; x.stroke(); x.fillStyle = '#fff3b0'; x.beginPath(); x.ellipse(26, 24, 6, 9, -.5, 0, 6.3); x.fill(); }),
  note:iconTex(x => { x.fillStyle = '#ff8fb1'; x.beginPath(); x.ellipse(24, 46, 11, 8, -.4, 0, 6.3); x.fill(); x.fillRect(32, 12, 6, 34); x.beginPath(); x.moveTo(38, 12); x.quadraticCurveTo(52, 16, 50, 30); x.quadraticCurveTo(46, 22, 38, 22); x.fill(); })
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
