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
let dpr = (window.BoboGfx ? BoboGfx.dpr(1.5, renderer) : Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = window.BoboGfx && BoboGfx.weak(renderer) ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
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
sun.castShadow = true; sun.shadow.mapSize.setScalar(window.BoboGfx ? BoboGfx.shadow(1024, renderer) : 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
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

/* ======================================================================
   The world: restaurant (counter, kitchen, dining room), the street and 6 houses
   ====================================================================== */
const POS = {
  cashier:{ x:-5.5, z:-2.35, f:0 }, register:{ x:-5.5, z:-1.1 }, custOrder:{ x:-5.5, z:.35 },
  dough:{ x:-8, z:-7.6, sx:-8, sz:-6.35, f:Math.PI }, tops:{ x:-4.6, z:-7.6, sx:-4.6, sz:-6.35, f:Math.PI },
  oven:{ x:-1, z:-8, sx:-1, sz:-6.2, f:Math.PI }, grill:{ x:2.4, z:-7.8, sx:2.4, sz:-6.4, f:Math.PI },
  pass:{ x:4.8, z:-4.6, sx:4.8, sz:-5.95, f:0 }, fridge:{ x:9.6, z:-8 }, ice:{ x:7.1, z:-8.1 },
  shelf:{ x:1.9, z:-1.25, sx:1.9, sz:-.05, f:Math.PI }, board:{ x:9.7, z:-.6, sx:9.7, sz:.7, f:Math.PI },
  door:{ x:0, z:6.8 }, out:{ x:0, z:9.1 }, bike:{ x:5, z:9.2 },
  manager:{ x:0, z:3, f:Math.PI }, cookHome:{ x:-3, z:-5.6, f:Math.PI }
};
const QUEUE = k => ({ x:-5.5, z:.35 + k * 1.3 });
const WAIT_SPOTS = [[-2.6, 1], [-1.4, 1.7], [-3.6, 2], [-2.4, 2.7], [-1, 3]];
const PICKUP_X = [-3.2, -2.3, -1.4];
const SHELF_SLOTS = [[1.55, 1.02], [2.25, 1.02], [1.55, 1.62], [2.25, 1.62]];
const PASS_X = [4, 4.8, 5.6];
const TABLES = [[3.6, 2], [8.2, 2], [3.6, 5.4], [8.2, 5.4], [-8.2, 5.4], [-8.4, 2.4]];
const SEATS = []; TABLES.forEach(([x, z], t) => { SEATS.push({ t, x:x - 1.15, z, f:Math.PI / 2, px:x - .42, pz:z }); SEATS.push({ t, x:x + 1.15, z, f:-Math.PI / 2, px:x + .42, pz:z }); });
const PASS_DROP = { x:3.9, z:-3.55 };
const PASS_PATH = () => [[2.9, -5.75], [2.9, -3.55], [PASS_DROP.x, PASS_DROP.z]];
const RING = HOUSE_X.map(x => ({ x, z:HOUSE_RING_Z }));
const CIRCLES = [], BOXES = [];
const BND = { x0:-38, x1:38, z0:-8.55, z1:27 };
let seed = 7;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function signTex(text, bg, fg, icon, w = 512, bulbs){
  return canvasTex(w, 128, x => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, w - 8, 120, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    if(bulbs){ x.fillStyle = bulbs; for(let i = 0; i < 18; i++){ x.beginPath(); x.arc(30 + i * (w - 60) / 17, 14, 6, 0, 6.3); x.fill(); x.beginPath(); x.arc(30 + i * (w - 60) / 17, 114, 6, 0, 6.3); x.fill(); } }
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 60px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(text, w / 2 + 22, 70);
    if(icon) icon(x);
  });
}
const pizzaIcon = x => { x.fillStyle = '#ffd25a'; x.beginPath(); x.moveTo(40, 30); x.lineTo(104, 44); x.lineTo(56, 100); x.closePath(); x.fill(); x.strokeStyle = '#e39a4a'; x.lineWidth = 9; x.beginPath(); x.moveTo(38, 30); x.lineTo(106, 44); x.stroke(); x.fillStyle = '#e8402f'; for(const [a, b] of [[66, 50], [60, 70], [78, 60]]){ x.beginPath(); x.arc(a, b, 7, 0, 6.3); x.fill(); } };
function signMesh(tex, w, h, x, y, z, ry = 0, parent = world){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:tex, transparent:true })); m.position.set(x, y, z); m.rotation.y = ry; parent.add(m); return m; }
function numTex(n, col){ return canvasTex(128, 128, x => { x.fillStyle = col; x.beginPath(); x.roundRect(6, 6, 116, 116, 30); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 84px "Baloo Bhaijaan 2",system-ui,sans-serif'; x.fillText(String(n), 64, 72); }); }

const world = new THREE.Group(); scene.add(world);
const wallMat = new THREE.MeshStandardMaterial({ color:0xfff1d8, roughness:.9 });
let frontFrame, ovenFire, ovenGlow, grillGlow, guideArrow, guideRing, fridgeDoor, parkedBike, signM, decoGrp;
const box = (x0, z0, x1, z1) => BOXES.push({ x0, z0, x1, z1 });
function buildWorld(){
  /* ground: grass, sidewalks, the road */
  {
    const g = new THREE.PlaneGeometry(240, 200, 1, 1); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color:0x9fd47e, roughness:1 })); m.receiveShadow = true; world.add(m);
    const F = new Merge();
    F.add(GEO.box, 0, .02, 13, 240, .04, 5.6, 0, 0, 0, 0x6f7480);
    for(let i = -12; i <= 12; i++) F.add(GEO.box, i * 8, .045, 13, 3, .01, .22, 0, 0, 0, 0xffffff);
    F.add(GEO.box, 0, .07, 9.3, 240, .14, 1.85, 0, 0, 0, 0xebe3d6); F.add(GEO.box, 0, .07, 16.7, 240, .14, 1.85, 0, 0, 0, 0xebe3d6);
    for(const z of [10.2, 15.8]) F.add(GEO.box, 0, .08, z, 240, .16, .14, 0, 0, 0, 0xd2c8b8);
    HOUSE_X.forEach(x => { F.add(GEO.box, x, .05, 18.4, 1.6, .1, 1.6, 0, 0, 0, 0xebe3d6); });
    F.add(GEO.box, 0, .05, 8.2, 3.4, .1, .8, 0, 0, 0, 0xebe3d6);
    world.add(meshOf(F, false, true));
  }
  /* ---------- the restaurant shell: floors, walls (colour = decoration), front low wall with the door ---------- */
  {
    const F = new Merge();
    F.add(GEO.box, 0, .05, -.5, 22, .1, 17, 0, 0, 0, 0xd9a46a);
    F.add(GEO.box, 0, .11, -5.4, 21.6, .02, 7.2, 0, 0, 0, 0xf4efe6);
    world.add(meshOf(F, false, true));
    // wood planks (one colour, soft lines) on the dining floor
    const planks = canvasTex(256, 256, x => { x.fillStyle = '#d7a46c'; x.fillRect(0, 0, 256, 256); x.fillStyle = 'rgba(120,70,30,.16)'; for(let i = 0; i < 8; i++){ x.fillRect(0, i * 32, 256, 3); x.fillRect(((i * 97) % 256), i * 32, 3, 32); } });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping; planks.repeat.set(5, 2.5);
    const pf = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 9.6), new THREE.MeshStandardMaterial({ map:planks, roughness:.85 })); pf.rotation.x = -Math.PI / 2; pf.position.set(0, .105, 3.1); pf.receiveShadow = true; world.add(pf);
    const tiles = canvasTex(128, 128, x => { x.fillStyle = '#f7f2ea'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(160,140,120,.25)'; x.fillRect(0, 0, 128, 3); x.fillRect(0, 0, 3, 128); x.fillRect(0, 64, 128, 3); x.fillRect(64, 0, 3, 128); });
    tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping; tiles.repeat.set(11, 4);
    const kf = new THREE.Mesh(new THREE.PlaneGeometry(21.6, 7.4), new THREE.MeshStandardMaterial({ map:tiles, roughness:.6 })); kf.rotation.x = -Math.PI / 2; kf.position.set(0, .125, -5.3); kf.receiveShadow = true; world.add(kf);
    const W = new THREE.Group(); world.add(W);
    const wall = (x, y, z, w, h, d) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; W.add(m); };
    wall(0, 1.7, -9.15, 22.6, 3.4, .3); wall(-11.15, 1.4, -.5, .3, 2.8, 17.6); wall(11.15, 1.4, -.5, .3, 2.8, 17.6);
    const T = new Merge(), TRIM = 0xffffff, WOOD = 0xb07a44;
    T.add(GEO.box, 0, .45, -8.98, 22, .9, .06, 0, 0, 0, TRIM); T.add(GEO.box, 0, .92, -8.96, 22, .06, .08, 0, 0, 0, WOOD);
    for(const s of [-1, 1]){ T.add(GEO.box, s * 10.98, .45, -.5, .06, .9, 17.2, 0, 0, 0, TRIM); T.add(GEO.box, s * 10.96, .92, -.5, .08, .06, 17.2, 0, 0, 0, WOOD); }
    for(const s of [-1, 1]) T.add(GEO.box, 0, 3.45, -9.15, 22.7, .12, .4, 0, 0, 0, WOOD);
    for(const s of [-1, 1]) T.add(GEO.box, s * 11.15, 2.85, -.5, .4, .12, 17.7, 0, 0, 0, WOOD);
    // windows on the side walls
    for(const s of [-1, 1]) for(const z of [1, 5]){ T.add(GEO.box, s * 11.0, 1.75, z, .08, 1.2, 1.8, 0, 0, 0, 0xa8dcff); T.add(GEO.box, s * 10.97, 1.75, z, .06, 1.3, .08, 0, 0, 0, TRIM); T.add(GEO.box, s * 10.97, 1.75, z, .06, .08, 1.9, 0, 0, 0, TRIM); }
    // front: low wall with window boxes, the door gap and a pretty frame for the sign
    for(const s of [-1, 1]){ T.add(GEO.box, s * 6.35, .5, 8, 9.3, 1, .3, 0, 0, 0, 0xe0604a); T.add(GEO.box, s * 6.35, 1.03, 8, 9.5, .08, .45, 0, 0, 0, TRIM);
      for(let i = 0; i < 14; i++){ T.add(GEO.sm, s * (2.2 + i * .62), 1.18, 8.05, .2, .16, .2, 0, 0, 0, 0x5cbf54); if(i % 2) T.add(GEO.sm, s * (2.2 + i * .62), 1.3, 8.1, .09, .08, .09, 0, 0, 0, 0xffffff); } }
    // a chalk menu board on the back wall (drawn shapes, no text)
    T.add(GEO.box, -5.3, 2.4, -8.98, 3.2, 1.3, .06, 0, 0, 0, 0x3b4a42); T.add(GEO.box, -5.3, 2.4, -8.96, 3.4, 1.5, .03, 0, 0, 0, WOOD);
    world.add(meshOf(T));
    const chalk = canvasTex(256, 104, x => { x.strokeStyle = '#fff'; x.lineWidth = 4; x.fillStyle = 'rgba(255,255,255,.9)';
      x.beginPath(); x.moveTo(30, 22); x.lineTo(84, 32); x.lineTo(44, 82); x.closePath(); x.stroke(); x.beginPath(); x.arc(56, 42, 5, 0, 6.3); x.fill(); x.beginPath(); x.arc(50, 60, 5, 0, 6.3); x.fill();
      x.beginPath(); x.ellipse(140, 40, 30, 14, 0, Math.PI, 0); x.stroke(); x.strokeRect(110, 44, 60, 8); x.beginPath(); x.ellipse(140, 60, 30, 8, 0, 0, Math.PI); x.stroke();
      x.strokeRect(198, 34, 26, 44); x.beginPath(); x.moveTo(214, 34); x.lineTo(224, 14); x.stroke(); });
    signMesh(chalk, 3, 1.2, -5.3, 2.4, -8.93);
    box(-11.3, -9.3, 11.3, -8.95); box(-11.3, -9.3, -10.95, 8.2); box(10.95, -9.3, 11.3, 8.2);
    box(-11.3, 7.82, -1.7, 8.18); box(1.7, 7.82, 11.3, 8.18);
  }
  /* ---------- counter + register + pickup bell ---------- */
  {
    const M = new Merge(), x0 = -8.2, x1 = -.8, cx = (x0 + x1) / 2, w = x1 - x0, z = POS.register.z;
    M.add(GEO.box, cx, .5, z, w, 1, .9, 0, 0, 0, 0xe0604a);
    M.add(GEO.box, cx, .5, z + .46, w - .2, .8, .04, 0, 0, 0, 0xc84f3c);
    M.add(GEO.box, cx, 1.03, z, w + .2, .08, 1.1, 0, 0, 0, 0xfff6e6);
    M.add(GEO.box, -5.5, 1.2, z - .1, .7, .28, .5, 0, 0, 0, 0x4a5568); M.add(GEO.box, -5.5, 1.45, z - .2, .5, .34, .06, -.3, 0, 0, 0x2b2b33);
    M.add(GEO.box, -5.5, 1.46, z - .17, .42, .26, .02, -.3, 0, 0, 0x7fe0b0);
    M.add(GEO.box, -5.5, 1.08, z + .1, .55, .05, .3, 0, 0, 0, 0x8a96a8);
    M.add(GEO.box, -6.4, 1.2, z, .32, .3, .22, 0, .2, 0, 0xff8fb1); M.add(GEO.box, -6.4, 1.36, z, .2, .04, .12, 0, .2, 0, 0x2b2b33);
    M.add(GEO.cyl8, -.95, 1.1, z + .2, .13, .08, .13, 0, 0, 0, 0xffc23d); M.add(GEO.hemi, -.95, 1.13, z + .2, .1, .1, .1, 0, 0, 0, 0xffc23d);
    for(const px of PICKUP_X) M.add(GEO.box, px, 1.075, z + .05, .78, .01, .6, 0, 0, 0, 0xe8dcc8);
    world.add(meshOf(M)); box(x0 - .1, z - .5, x1 + .1, z + .5);
    signMesh(signTex(L('استلام', 'Pick up', 'Teslim'), '#3fb882', '#fff', null, 384), 1.7, .55, -2.3, 2.5, z + .3);
    signMesh(signTex(L('اطلب هون', 'Order here', 'Sipariş'), '#e0604a', '#fff', null, 384), 1.7, .55, -5.5, 2.5, z + .3);
    const pm = new Merge(); for(const s of [-1, 1]) for(const px of [-5.5, -2.3]) pm.add(GEO.cyl8, px + s * .7, 2.95, z + .3, .015, .5, .015, 0, 0, 0, 0x8a5a36);
    world.add(meshOf(pm, false, false));
  }
  /* ---------- kitchen: dough table, toppings table, brick oven, grill ---------- */
  {
    const M = new Merge();
    const table = (x, z, w, d, top, leg) => { M.add(GEO.box, x, .92, z, w, .1, d, 0, 0, 0, top); for(const s of [-1, 1]) for(const q of [-1, 1]) M.add(GEO.box, x + s * (w / 2 - .1), .45, z + q * (d / 2 - .1), .1, .9, .1, 0, 0, 0, leg); M.add(GEO.box, x, .25, z, w - .2, .05, d - .2, 0, 0, 0, leg); };
    // dough table: wood, flour sack, rolling pin, a bowl of dough balls
    table(POS.dough.x, POS.dough.z, 2.4, 1.2, 0xe6b67e, 0xb07a44);
    M.add(GEO.cyl, POS.dough.x - .85, 1.2, POS.dough.z - .25, .3, .45, .25, 0, 0, 0, 0xf6f0e2); M.add(GEO.sph, POS.dough.x - .85, 1.45, POS.dough.z - .25, .26, .1, .22, 0, 0, 0, 0xffffff);
    M.add(GEO.cyl8, POS.dough.x + .7, 1.02, POS.dough.z - .3, .05, .7, .05, 0, 0, Math.PI / 2, 0xd9a46a);
    M.add(GEO.cyl, POS.dough.x + .75, 1.04, POS.dough.z + .25, .28, .14, .28, 0, 0, 0, 0x6cc4ff); for(let i = 0; i < 3; i++) M.add(GEO.sph, POS.dough.x + .67 + i * .1, 1.13, POS.dough.z + .23 + (i % 2) * .08, .1, .07, .1, 0, 0, 0, 0xf6e3bf);
    M.add(GEO.cyl, POS.dough.x, .98, POS.dough.z, .55, .02, .55, 0, 0, 0, 0xf3e6c8);
    // toppings table: steel with a bin of each topping (each bin one colour)
    table(POS.tops.x, POS.tops.z, 2.6, 1.2, 0xd9dee6, 0x8a96a8);
    const bins = [0xffd23f, 0xe8402f, 0xe9d8bf, 0x3b3a2e, 0x4fbf3a];
    bins.forEach((c, i) => { const bx = POS.tops.x - 1.0 + i * .5; M.add(GEO.box, bx, 1.02, POS.tops.z - .33, .42, .12, .4, 0, 0, 0, 0xffffff); for(let k = 0; k < 4; k++) M.add(GEO.sm, bx - .1 + (k % 2) * .2, 1.08, POS.tops.z - .4 + (k > 1 ? .14 : 0), .07, .04, .07, 0, k, 0, c); });
    M.add(GEO.cyl, POS.tops.x, .98, POS.tops.z + .2, .52, .02, .52, 0, 0, 0, 0xcfd6e0);
    M.add(GEO.cyl, POS.tops.x + 1.05, 1.08, POS.tops.z + .3, .16, .22, .16, 0, 0, 0, 0xe8402f); M.add(GEO.cyl8, POS.tops.x + 1.05, 1.2, POS.tops.z + .3, .04, .1, .04, 0, 0, 0, 0xffffff);
    // brick oven: a dome on a base, dark mouth, chimney, wood logs
    const ox = POS.oven.x, oz = POS.oven.z;
    M.add(GEO.box, ox, .5, oz, 2.7, 1, 2, 0, 0, 0, 0xb85c3a);
    M.add(GEO.box, ox, 1.02, oz, 2.8, .08, 2.1, 0, 0, 0, 0xd9b38a);
    M.add(GEO.hemi, ox, 1.05, oz - .1, 1.25, 1.35, 1.0, 0, 0, 0, 0xc8643c);
    for(let i = 0; i < 9; i++){ const a = -1.2 + i * .3; M.add(GEO.box, ox + Math.sin(a) * .62, 1.05 + Math.cos(a) * .62, oz + .82, .26, .16, .22, 0, 0, -a, 0xa94b2e); }
    M.add(GEO.cyl, ox + .5, 2.6, oz - .45, .2, 1.2, .2, 0, 0, 0, 0x8a3e26); M.add(GEO.cyl, ox + .5, 3.2, oz - .45, .26, .12, .26, 0, 0, 0, 0x6b2e1c);
    for(let i = 0; i < 4; i++) M.add(GEO.cyl8, ox - .7 + i * .12, .2 + (i % 2) * .16, oz + 1.08, .07, .7, .07, Math.PI / 2, (i % 2) * .3, 0, 0x8a5a36);
    M.add(GEO.box, ox + 1.15, 1.1, oz + .9, .14, .04, 1, 0, .1, 0, 0xc98a52); M.add(GEO.box, ox + 1.15, 1.12, oz + 1.5, .5, .02, .45, 0, .1, 0, 0xc98a52);
    // grill (burgers): steel box, dark top, a hood
    const gx = POS.grill.x, gz = POS.grill.z;
    M.add(GEO.box, gx, .48, gz, 1.8, .96, 1.1, 0, 0, 0, 0x8a96a8); M.add(GEO.box, gx, .99, gz, 1.75, .06, 1.05, 0, 0, 0, 0x2b2b33);
    for(let i = 0; i < 7; i++) M.add(GEO.box, gx - .6 + i * .2, 1.03, gz, .04, .02, .9, 0, 0, 0, 0x55565e);
    M.add(GEO.box, gx, 2.6, gz - .2, 1.9, .5, 1.1, 0, 0, 0, 0xcfd6e0); M.add(GEO.box, gx, 3.1, gz - .4, .5, .5, .5, 0, 0, 0, 0xb8c0cc);
    // boxing table island with a stack of boxes and plates
    const px = POS.pass.x, pz = POS.pass.z;
    M.add(GEO.box, px, .46, pz, 2.8, .92, 1.2, 0, 0, 0, 0xffffff); M.add(GEO.box, px, .95, pz, 2.9, .08, 1.3, 0, 0, 0, 0xe6b67e);
    for(let i = 0; i < 5; i++) M.add(GEO.box, px - 1.15, 1.02 + i * .1, pz - .38, .55, .09, .5, 0, (i % 2) * .08, 0, i % 2 ? 0xd9a46a : 0xe0b07a);
    for(let i = 0; i < 6; i++) M.add(GEO.cyl, px + 1.15, 1.0 + i * .03, pz - .35, .26, .02, .26, 0, 0, 0, 0xffffff);
    M.add(GEO.box, px, .3, pz + .62, 2.6, .5, .04, 0, 0, 0, 0xffc23d);
    // delivery shelf
    const sx = POS.shelf.x, sz = POS.shelf.z;
    for(const s of [-1, 1]) M.add(GEO.box, sx + s * .72, 1.0, sz, .08, 2, .7, 0, 0, 0, 0x9a6b3c);
    for(const y of [.4, .95, 1.55]) M.add(GEO.box, sx, y, sz, 1.5, .06, .72, 0, 0, 0, 0xc98a52);
    // ice cream machine + drinks fridge (glass door with juice bottles)
    const ix = POS.ice.x, iz = POS.ice.z;
    M.add(GEO.box, ix, .5, iz, 1.2, 1, .8, 0, 0, 0, 0xffffff); M.add(GEO.box, ix, 1.4, iz - .1, 1.1, .8, .6, 0, 0, 0, 0xff9fc0);
    for(const s of [-1, 1]){ M.add(GEO.cyl8, ix + s * .25, 1.0, iz + .25, .06, .2, .06, 0, 0, 0, 0xcfd6e0); M.add(GEO.cyl8, ix + s * .25, 1.65, iz + .22, .04, .1, .04, Math.PI / 2, 0, 0, 0x8a96a8); }
    for(let i = 0; i < 3; i++) M.add(GEO.cone, ix - .35 + i * .3, 1.94, iz, .08, .2, .08, Math.PI, 0, 0, 0xe2a85e);
    const fx = POS.fridge.x, fz = POS.fridge.z;
    M.add(GEO.box, fx, 1.25, fz, 1.6, 2.5, .9, 0, 0, 0, 0xeef2f6);
    M.add(GEO.box, fx, 2.42, fz + .46, 1.5, .2, .04, 0, 0, 0, 0x6cc4ff);
    for(let r = 0; r < 3; r++){ M.add(GEO.box, fx, .55 + r * .6, fz, 1.4, .03, .7, 0, 0, 0, 0xcfd6e0); for(let i = 0; i < 5; i++){ M.add(GEO.cyl8, fx - .5 + i * .25, .75 + r * .6, fz + .1, .07, .36, .07, 0, 0, 0, r === 1 ? 0xff6fae : 0xffa020); M.add(GEO.cyl8, fx - .5 + i * .25, .97 + r * .6, fz + .1, .035, .08, .035, 0, 0, 0, 0xffffff); } }
    world.add(meshOf(M));
    const glass = new THREE.MeshStandardMaterial({ color:0xdff4ff, roughness:.05, metalness:.1, transparent:true, opacity:.28, depthWrite:false });
    fridgeDoor = new THREE.Group(); fridgeDoor.position.set(fx - .78, 0, fz + .47); world.add(fridgeDoor);
    const fd = new THREE.Mesh(new THREE.BoxGeometry(1.52, 2.3, .05), glass); fd.position.set(.76, 1.25, 0); fridgeDoor.add(fd);
    const fh = new THREE.Mesh(new THREE.BoxGeometry(.06, .8, .08), MAT); fh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(fh.geometry.attributes.position.count * 3).fill(.8), 3)); fh.position.set(1.4, 1.3, .06); fridgeDoor.add(fh);
    // glowing oven mouth + fire, grill glow (brighter while cooking)
    ovenFire = new THREE.Mesh(new THREE.SphereGeometry(.45, 14, 10), new THREE.MeshBasicMaterial({ color:0xff8a2a })); ovenFire.scale.set(1, .5, .6); ovenFire.position.set(ox, 1.2, oz - .35); world.add(ovenFire);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(.62, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color:0x2a1408 })); mouth.position.set(ox, 1.07, oz + .79); world.add(mouth);
    ovenGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xff9a3a, transparent:true, opacity:.55, depthWrite:false, blending:THREE.AdditiveBlending })); ovenGlow.scale.setScalar(2.4); ovenGlow.position.set(ox, 1.35, oz + .7); world.add(ovenGlow);
    grillGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xff7a2a, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending })); grillGlow.scale.setScalar(1.8); grillGlow.position.set(gx, 1.15, gz); world.add(grillGlow);
    for(const [sx2, sz2, w, d] of [[POS.dough.x, POS.dough.z, 2.4, 1.2], [POS.tops.x, POS.tops.z, 2.6, 1.2], [ox, oz, 2.8, 2.2], [gx, gz, 1.8, 1.1], [px, pz, 2.9, 1.3], [ix, iz, 1.2, .8], [fx, fz, 1.6, .9], [sx, sz, 1.6, .75]]) box(sx2 - w / 2, sz2 - d / 2, sx2 + w / 2, sz2 + d / 2);
    signMesh(signTex(L('توصيل', 'Delivery', 'Teslimat'), '#3f6fae', '#fff', null, 384), 1.4, .45, sx, 2.25, sz + .37);
  }
  /* ---------- job board ---------- */
  {
    const M = new Merge(), x = POS.board.x, z = POS.board.z;
    for(const s of [-1, 1]) M.add(GEO.box, x + s * .85, .9, z, .1, 1.8, .1, 0, 0, 0, 0x8a5a36);
    M.add(GEO.box, x, 1.55, z, 1.9, 1.25, .1, 0, 0, 0, 0x8a5a36); M.add(GEO.box, x, 1.55, z + .04, 1.75, 1.1, .06, 0, 0, 0, 0xf3dfb4);
    world.add(meshOf(M)); box(x - 1, z - .15, x + 1, z + .15);
    const jt = canvasTex(256, 160, c => {
      const ic = [['#e0604a', 0], ['#ffc23d', 1], ['#d9a46a', 2], ['#4f9dff', 3], ['#5ed6a0', 4]];
      ic.forEach(([col], i) => { const cx = 36 + (i % 3) * 92, cy = i < 3 ? 46 : 116; c.fillStyle = col; c.beginPath(); c.roundRect(cx - 30, cy - 30, 60, 60, 14); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, cy - 6, 11, 0, 6.3); c.fill(); c.fillRect(cx - 14, cy + 6, 28, 16); });
      c.fillStyle = '#8a5a36'; c.fillRect(214, 96, 22, 40); c.beginPath(); c.arc(225, 90, 12, 0, 6.3); c.fill();
    });
    signMesh(jt, 1.6, 1, x, 1.55, z + .08);
    signMesh(signTex(L('الشغلات', 'Jobs', 'Görevler'), '#8a5a36', '#fff', null, 384), 1.6, .5, x, 2.45, z + .06);
  }
  /* ---------- the sign over the door (style = decoration) ---------- */
  { const FF = new Merge(); for(const s of [-1, 1]) FF.add(GEO.box, s * 2.1, 1.85, 8, .3, 3.7, .3, 0, 0, 0, 0xffffff); FF.add(GEO.box, 0, 3.75, 8, 4.6, .25, .35, 0, 0, 0, 0xffffff); frontFrame = meshOf(FF); world.add(frontFrame); }
  signM = signMesh(signTex(L('مطعم بوبو', 'Bobo Restaurant', 'Bobo Restoranı'), '#e0604a', '#fff', pizzaIcon), 4.4, 1.1, 0, 4.4, 8.12);
  /* ---------- outside: houses, trees, lamps, the parked bike, benches ---------- */
  {
    const F = new Merge();
    HOUSE_X.forEach((x, i) => {
      const h = new THREE.Mesh(GM.houseGeo(new THREE.Color(HOUSE_COL[i]).getHex(), HOUSE_ROOF[i]), MAT); h.position.set(x, 0, HOUSE_Z); h.rotation.y = Math.PI; h.castShadow = h.receiveShadow = true; world.add(h);
      box(x - 2.8, HOUSE_Z - 2.3, x + 2.8, HOUSE_Z + 2.3);
      signMesh(numTex(i + 1, HOUSE_COL[i]), 1, 1, x + 1.2, 2.55, HOUSE_Z - 2.27, Math.PI);
      // a mailbox in the house colour
      F.add(GEO.cyl8, x + 1.5, .5, 18.1, .05, 1, .05, 0, 0, 0, 0x8a5a36); F.add(GEO.box, x + 1.5, 1.05, 18.1, .3, .26, .45, 0, 0, 0, new THREE.Color(HOUSE_COL[i]).getHex());
      for(const s of [-1, 1]) for(let k = 0; k < 4; k++) F.add(GEO.sm, x + s * (1.4 + k * .3), .3, 19.45, .22, .2, .22, 0, 0, 0, 0x58b84e);
    });
    world.add(meshOf(F));
    const T = [];
    for(const x of [-36, -24, -12, 12, 24, 36]) T.push([x, 22, 1.1]);
    for(const x of [-34, -26, -16, 16, 26, 34]) T.push([x, 5, 1.2]);
    for(let i = 0; i < 30; i++) T.push([-60 + i * 4.2 + srnd() * 2, 30 + srnd() * 8, 1.3 + srnd() * .6]);
    for(let i = 0; i < 12; i++) T.push([(i < 6 ? -1 : 1) * (14 + (i % 6) * 4 + srnd()), -12 - srnd() * 5, 1.3 + srnd() * .5]);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
    T.forEach(([x, z, s], i) => {
      _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
      _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
      _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
      if(Math.abs(z) < 26) CIRCLES.push({ x, z, r:.5 * s });
    });
    trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
    const LM = new Merge();
    for(const x of [-33, -21, -9, 9, 21, 33]) for(const z of [8.6, 17.4]){ LM.add(GEO.cyl8, x, 1.6, z, .07, 3.2, .07, 0, 0, 0, 0x3a4256); LM.add(GEO.sph, x, 3.3, z, .22, .22, .22, 0, 0, 0, 0xfff1b0); CIRCLES.push({ x, z, r:.2 }); }
    for(const s of [-1, 1]){ const bx = s * 13; LM.add(GEO.box, bx, .45, 8.9, 1.8, .1, .5, 0, 0, 0, 0xc98a52); LM.add(GEO.box, bx, .75, 8.7, 1.8, .5, .08, 0, 0, 0, 0xc98a52); for(const q of [-1, 1]) LM.add(GEO.box, bx + q * .75, .22, 8.9, .1, .45, .45, 0, 0, 0, 0x3a4256); }
    // a few hills far away
    for(let i = 0; i < 12; i++){ const a = i / 12 * Math.PI * 2, r = 110 + srnd() * 20; LM.add(GEO.sph, Math.cos(a) * r, -4, Math.sin(a) * r, 26 + srnd() * 14, 14 + srnd() * 10, 20, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
    world.add(meshOf(LM, true, false));
    parkedBike = new THREE.Mesh(GM.bikeGeo(), MAT); parkedBike.castShadow = true; parkedBike.position.set(POS.bike.x, 0, POS.bike.z); parkedBike.rotation.y = Math.PI / 2; world.add(parkedBike);
  }
  /* guide: a bouncing arrow over the place to go, and a ring on the ground */
  const GA = new Merge(); GA.add(GEO.cone, 0, 0, 0, .45, .7, .45, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .55, 0, .18, .6, .18, 0, 0, 0, 0xffc23d);
  guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
  decoGrp = new THREE.Group(); world.add(decoGrp);
}

/* ---------- decorations (the restaurant shown: your own, or the host's while you visit) ---------- */
let decoKey = '';
const glowSprites = [];
function applyDecor(d){
  const key = DECOR_IDS.map(c => d[c]).join('|'); if(key === decoKey) return; decoKey = key;
  wallMat.color.set((DECOR.wall.items[d.wall] || DECOR.wall.items.cream).col);
  while(decoGrp.children.length){ const o = decoGrp.children.pop(); if(o.geometry) o.geometry.dispose(); }
  glowSprites.length = 0;
  CIRCLES.splice(0, CIRCLES.length, ...CIRCLES.filter(c => !c.deco));
  // tables + chairs
  const tcol = new THREE.Color((DECOR.table.items[d.table] || DECOR.table.items.wood).col).getHex(), dark = new THREE.Color(tcol).multiplyScalar(.8).getHex();
  const M = new Merge(), leg = d.table === 'wood' ? 0x8a5a36 : 0xcfd6e0;
  TABLES.forEach(([x, z]) => {
    M.add(GEO.cyl, x, .76, z, .82, .08, .82, 0, 0, 0, tcol); M.add(GEO.cyl8, x, .38, z, .07, .74, .07, 0, 0, 0, leg); M.add(GEO.cyl, x, .03, z, .38, .05, .38, 0, 0, 0, leg);
    for(const s of [-1, 1]){ const cx = x + s * 1.15; M.add(GEO.box, cx, .46, z, .52, .08, .52, 0, 0, 0, tcol); M.add(GEO.box, cx + s * .24, .82, z, .06, .64, .5, 0, 0, 0, dark);
      for(const a of [-1, 1]) for(const b of [-1, 1]) M.add(GEO.cyl8, cx + a * .2, .22, z + b * .2, .03, .44, .03, 0, 0, 0, leg); }
    M.add(GEO.cyl8, x, .84, z - .25, .05, .1, .05, 0, 0, 0, 0xffffff); M.add(GEO.cyl8, x + .1, .84, z - .25, .05, .1, .05, 0, 0, 0, 0xe8402f);
    CIRCLES.push({ x, z, r:.85, deco:1 });
  });
  decoGrp.add(meshOf(M));
  // plants
  const P = new Merge(), spots = [[-10.3, 7.2], [10.3, 7.2], [10.3, 3.6], [2.7, 7.2], [-2.7, 7.2], [-10.3, -.2]];
  if(d.plant !== 'none') spots.forEach(([x, z], i) => {
    P.add(GEO.cyl, x, .3, z, .32, .6, .32, 0, 0, 0, i % 2 ? 0xe0604a : 0xd98a5a); P.add(GEO.cyl, x, .6, z, .3, .04, .3, 0, 0, 0, 0x6b4428);
    if(d.plant === 'pots'){ for(let k = 0; k < 7; k++){ const a = k * .9, r = k ? .16 : 0; P.add(GEO.cyl8, x + Math.cos(a) * r, .8, z + Math.sin(a) * r, .02, .4, .02, 0, 0, 0, 0x4caa3e); P.add(GEO.sm, x + Math.cos(a) * r, 1.02, z + Math.sin(a) * r, .09, .08, .09, 0, 0, 0, i % 2 ? 0xff8fb1 : 0xffffff); } }
    else if(d.plant === 'ferns'){ for(let k = 0; k < 9; k++){ const a = k / 9 * Math.PI * 2; P.add(GEO.sm, x + Math.cos(a) * .3, .85, z + Math.sin(a) * .3, .32, .07, .12, 0, -a, .5, k % 2 ? 0x4caa3e : 0x5fbf4a); } P.add(GEO.ico1, x, .85, z, .25, .25, .25, 0, 0, 0, 0x5fbf4a); }
    else { P.add(GEO.cyl8, x, 1.2, z, .06, 1.2, .06, 0, 0, 0, 0x8a5a36); P.add(GEO.ico1, x, 2.0, z, .6, .55, .6, 0, i, 0, 0x5cbf54); P.add(GEO.ico1, x + .2, 2.35, z - .1, .38, .35, .38, 0, 0, 0, 0x7ad46a); }
    CIRCLES.push({ x, z, r:.38, deco:1 });
  });
  if(!P.empty) decoGrp.add(meshOf(P));
  // lamps on each table
  if(d.lamp !== 'none'){
    const LM = new Merge(), lc = d.lamp === 'stars' ? 0xfff1a0 : d.lamp === 'lantern' ? 0xffb35c : 0xfff0c8;
    TABLES.forEach(([x, z]) => {
      if(d.lamp === 'warm'){ LM.add(GEO.cyl8, x, .96, z + .2, .02, .32, .02, 0, 0, 0, 0x8a5a36); LM.add(GEO.cone, x, 1.2, z + .2, .17, .18, .17, 0, 0, 0, 0xffffff); }
      else if(d.lamp === 'lantern'){ LM.add(GEO.box, x, .95, z + .2, .18, .26, .18, 0, 0, 0, 0xe0604a); LM.add(GEO.cone4, x, 1.13, z + .2, .14, .1, .14, 0, Math.PI / 4, 0, 0x8a3e26); }
      else { LM.add(GEO.cyl8, x, 1.0, z + .2, .02, .4, .02, 0, 0, 0, 0xc98f12); }
    });
    decoGrp.add(meshOf(LM));
    TABLES.forEach(([x, z]) => {
      if(d.lamp === 'stars'){ const s = new THREE.Mesh(K.starGeo, new THREE.MeshBasicMaterial({ color:0xffd23f })); s.scale.setScalar(.14); s.position.set(x, 1.28, z + .2); decoGrp.add(s); glowSprites.push(s); }
      else { const b = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color:lc })); b.position.set(x, d.lamp === 'warm' ? 1.1 : .95, z + .2); decoGrp.add(b); }
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:lc, transparent:true, opacity:.6, depthWrite:false, blending:THREE.AdditiveBlending })); g.scale.setScalar(1.3); g.position.set(x, 1.05, z + .2); decoGrp.add(g);
    });
  }
  // the sign
  const sg = d.sign === 'gold' ? ['#e0a91a', '#fff', null] : d.sign === 'bulbs' ? ['#e0604a', '#fff', '#fff3b0'] : ['#e0604a', '#fff', null];
  signM.material.map.dispose(); signM.material.map = signTex(L('مطعم بوبو', 'Bobo Restaurant', 'Bobo Restoranı'), sg[0], sg[1], pizzaIcon, 512, sg[2]); signM.material.needsUpdate = true;
  if(d.sign !== 'classic'){ const g = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:d.sign === 'gold' ? 0xffd23f : 0xfff3b0, transparent:true, opacity:.5, depthWrite:false, blending:THREE.AdditiveBlending })); g.scale.set(6.5, 2.4, 1); g.position.set(0, 4.4, 8.05); decoGrp.add(g); glowSprites.push(g); }
}

/* ---------- collisions: circles, boxes, the edge of the town ---------- */
function collide(o, r){
  o.x = clamp(o.x, BND.x0 + r, BND.x1 - r); o.z = clamp(o.z, BND.z0 + r, BND.z1 - r);
  for(const c of CIRCLES){ const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz; if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; } }
  for(const b of BOXES){
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rr) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; } }
  }
}
const isOutside = (x, z) => z > 8.35 || Math.abs(x) > 11.2;

/* ======================================================================
   Actors (player, helper bots, friends, customers): a model + a held item + a bike when riding
   ====================================================================== */
function shadowAll(g){ g.traverse(o => { if(o.isMesh && !o.material.transparent) o.castShadow = true; }); }
const CARRY_GEO = {};
function carryGeo(k){
  if(CARRY_GEO[k]) return CARRY_GEO[k];
  let g;
  if(k === 'dough'){ const M = new Merge(); M.add(GEO.sph, 0, .1, 0, .2, .14, .2, 0, 0, 0, 0xf6e3bf); g = M.geometry(); }
  else if(k === 'pizzaRaw'){ const M = new Merge(); M.add(GEO.cyl, 0, .03, 0, .44, .06, .44, 0, 0, 0, 0xf6e3bf); M.add(GEO.cyl, 0, .065, 0, .38, .012, .38, 0, 0, 0, 0xd8402c); M.add(GEO.cyl, 0, .075, 0, .34, .012, .34, 0, 0, 0, 0xffe9a0); g = M.geometry(); }
  else if(k === 'pizza') g = GM.pizzaGeo(['cheese', 'tomato']);
  else if(k === 'burger') g = GM.burgerGeo();
  else if(k === 'box') g = GM.boxGeo();
  else if(k === 'tray'){ const M = new Merge(); M.add(GEO.box, 0, .02, 0, .8, .04, .55, 0, 0, 0, 0xc98a52); M.add(GEO.cyl, -.1, .055, 0, .26, .03, .26, 0, 0, 0, 0xffffff); M.add(GEO.cyl, -.1, .09, 0, .2, .04, .2, 0, 0, 0, 0xe7a85a); M.add(GEO.cyl8, .25, .14, .05, .06, .2, .06, 0, 0, 0, 0xffa020); g = M.geometry(); }
  else if(k === 'patty'){ const M = new Merge(); M.add(GEO.cyl, 0, .04, 0, .26, .07, .26, 0, 0, 0, 0x8a4a2a); g = M.geometry(); }
  return (CARRY_GEO[k] = g || null);
}
const bikeGeoShared = GM.bikeGeo();
function makeActor(hero){
  const a = { hero:null, h:null, held:null, carry:'', bike:null, x:0, z:0, f:0, m:0, t:Math.random() * 5 };
  setActorHero(a, hero); return a;
}
function setActorHero(a, hero){
  hero = HEROES[hero] ? hero : 'sara';
  if(a.hero === hero) return;
  if(a.h) scene.remove(a.h.grp);
  a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp);
  a.held = new THREE.Mesh(carryGeo('box'), MAT); a.held.castShadow = true; a.held.visible = false; a.h.grp.add(a.held); a.held.position.set(0, .66, .42);
  a.carry = '';
  if(!a.bike){ a.bike = new THREE.Mesh(bikeGeoShared, MAT); a.bike.castShadow = true; a.bike.visible = false; scene.add(a.bike); }
}
function removeActor(a){ if(a.h) scene.remove(a.h.grp); if(a.bike) scene.remove(a.bike); }
function poseActor(a, dt, x, z, f, m, carry, bike, extra){
  a.t += dt; a.x = x; a.z = z; a.f = f; a.m = m;
  const H = a.h; if(!H) return;
  if(carry !== a.carry){ a.carry = carry; const g = carry && carryGeo(carry); a.held.visible = !!g; if(g) a.held.geometry = g; for(const arm of H.arms) arm.userData.hold = !!g || carry === 'hands'; }
  H.grp.position.set(x, bike ? .42 : (extra && extra.sit ? .2 : 0), z); H.grp.rotation.y = f;
  poseHero(H, { t:a.t, dt, run:bike ? 0 : m, grounded:true, vy:0, sq:0, flip:0 });
  if(bike){ H.legs.forEach((l, i) => { l.rotation.x = -1.15 + Math.sin(a.t * 9 * (m + .2) + i * Math.PI) * .45; }); for(const arm of H.arms){ arm.userData.hold = false; arm.rotation.x = -1.1; } H.body.rotation.x = .15; }
  if(extra && extra.sit){ H.legs.forEach(l => { l.rotation.x = -1.45; }); }
  a.bike.visible = !!bike;
  if(bike){ a.bike.position.set(x, 0, z); a.bike.rotation.y = f; a.held.visible = false; }
  else if(a.carry && carryGeo(a.carry)) a.held.visible = true;
  if(extra && extra.work){ for(const arm of H.arms){ arm.userData.hold = false; arm.rotation.x = -1.2 + Math.sin(a.t * 14 + arm.userData.side) * .35; } }
}

/* ======================================================================
   Orders, customers, bots — the shared restaurant state.
   The room owner (or you when playing alone) simulates it; friends get it 5× a second.
   ====================================================================== */
let ORD = [], CUST = [], BOTS = [];
let simT = 0, spawnT = SPAWN_FIRST, oSeq = 1, cSeq = 1, ticketN = 0, sessionOrders = 0, cheerT = 0, stDirty = true;
let hostView = null;          // { decor, menu } of the room owner while you are a guest
const isAuth = () => !mpActive() || MP.isHost;
const menuOn = k => k === 'cheese' || k === 'tomato' || k === 'juice' || k === 'pizza' || !!(hostView ? hostView.menu[k] : SAVE.menu[k]);
const wantCash = o => [o.m].concat(o.m === 'pizza' ? o.t : [], o.d ? ['juice'] : [], o.i ? ['ice'] : []);
const wantBox = o => [o.type === 'go' ? 'box' : 'plate'].concat(o.d ? ['juice'] : [], o.i ? ['ice'] : []);
const orderById = id => ORD.find(o => o.id === id);
const custById = id => CUST.find(c => c.id === id);
function genWant(vip){
  const tops = TOP_IDS.filter(menuOn);
  if(!vip && menuOn('burger') && Math.random() < .35) return { m:'burger', t:[], d:Math.random() < .5 ? 1 : 0, i:menuOn('ice') && Math.random() < .35 ? 1 : 0 };
  let n;
  if(vip) n = Math.min(3, tops.length);
  else if(sessionOrders < 2) n = 1;
  else { const r = Math.random(); n = Math.min(tops.length, r < .15 ? 0 : r < .55 ? 1 : r < .85 ? 2 : 3); }
  const t = shuffle(tops.slice()).slice(0, n).sort((a, b) => TOP_IDS.indexOf(a) - TOP_IDS.indexOf(b));
  return { m:'pizza', t, d:vip || Math.random() < .5 ? 1 : 0, i:menuOn('ice') && (vip || Math.random() < .35) ? 1 : 0 };
}
function newOrder(type, want, cust, vip){
  ticketN = ticketN % 99 + 1; sessionOrders++;
  const o = { id:oSeq++, n:ticketN, type, m:want.m, t:want.t, d:want.d, i:want.i, h:type === 'go' ? Math.floor(Math.random() * HOUSE_X.length) : -1,
    st:'ask', by:null, cust:cust || 0, t0:simT, miss:0, burnt:0, vip:vip ? 1 : 0, slot:-1, stars:0, doneT:0 };
  ORD.push(o); stDirty = true; return o;
}
const activeOrders = () => ORD.filter(o => o.st !== 'done').length;
const vipDue = () => SAVE.vipDay !== today() && sessionOrders >= 2 && !ORD.some(o => o.vip && o.st !== 'done') && !CUST.some(c => c.vip && !c.oid);
function spawnCustomer(vip, want){
  const side = Math.random() < .5 ? -1 : 1;
  const c = { id:cSeq++, v:Math.floor(Math.random() * GM.CUST_N), vip:vip ? 1 : 0, x:side * 24, z:9.1, f:-side * Math.PI / 2, m:0, st:'in', path:[[side * 3, 9.1], [0, 9.1], [POS.door.x, POS.door.z]], oid:0, seat:-1, t:0, carry:0, want:want || genWant(vip), seq:cSeq, wi:-1 };
  CUST.push(c); stDirty = true; return c;
}
function spawnPhone(want){ const o = newOrder('go', want || genWant(false), 0, false); SFX.phone(); if(state === 'play' && ME.job === 'cashier' && !SAVE.tut.phone){ SAVE.tut.phone = 1; persist(); say(LINES.phone, 5500); } return o; }
function spawnTick(dt){
  spawnT -= dt; if(spawnT > 0) return;
  spawnT = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
  const waiting = CUST.filter(c => c.st === 'in' || c.st === 'q' || c.st === 'order').length;
  if(activeOrders() + waiting >= MAX_ACTIVE) { spawnT = 3; return; }
  if(vipDue()){ spawnCustomer(true); return; }
  if(Math.random() < .3 || waiting >= 3) spawnPhone(); else spawnCustomer(false);
}
function walkPath(a, dt, sp){
  if(!a.path.length){ a.m = Math.max(0, a.m - dt * 6); return true; }
  const [tx, tz] = a.path[0], dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz), step = sp * dt;
  if(d > .01) a.f += angDiff(Math.atan2(dx, dz), a.f) * Math.min(1, dt * 10);
  if(d <= step){ a.x = tx; a.z = tz; a.path.shift(); }
  else { a.x += dx / d * step; a.z += dz / d * step; }
  a.m = Math.min(1, a.m + dt * 6);
  return !a.path.length;
}
const near = (a, x, z, r = .08) => Math.hypot(a.x - x, a.z - z) < r;
function freeSeat(){ const used = new Set(CUST.map(c => c.seat).filter(s => s >= 0)); const free = SEATS.map((s, i) => i).filter(i => !used.has(i)); return free.length ? pick(free) : -1; }
function custTick(dt){
  const SP = 2.4;
  const line = CUST.filter(c => c.st === 'q' || c.st === 'order').sort((a, b) => a.seq - b.seq);
  line.forEach((c, k) => { const q = QUEUE(k); const last = c.path.length ? c.path[c.path.length - 1] : [c.x, c.z]; if(Math.hypot(last[0] - q.x, last[1] - q.z) > .05) c.path = [[q.x, q.z]]; c.qi = k; });
  const waiters = CUST.filter(c => c.st === 'wait').sort((a, b) => a.seq - b.seq);
  waiters.forEach((c, k) => { const w = WAIT_SPOTS[k % WAIT_SPOTS.length]; if(c.wi !== k){ c.wi = k; c.path = [[w[0], w[1]]]; } });
  for(let i = CUST.length - 1; i >= 0; i--){
    const c = CUST[i], arrived = walkPath(c, dt, SP);
    if(c.st === 'in'){ if(arrived){ c.st = 'q'; stDirty = true; } }
    else if(c.st === 'q'){ if(arrived && c.qi === 0){ c.st = 'order'; c.f = Math.PI; const o = newOrder('dine', c.want, c.id, c.vip); c.oid = o.id; stDirty = true; if(c.vip && state === 'play') say(LINES.vip, 5000, panelOn()); } }
    else if(c.st === 'order'){ if(arrived) c.f += angDiff(Math.PI, c.f) * Math.min(1, dt * 8); }
    else if(c.st === 'wait'){
      const o = orderById(c.oid);
      if(o && o.st === 'ready'){ c.st = 'grab'; c.path = [[PICKUP_X[o.slot] || PICKUP_X[0], -.3]]; stDirty = true; }
      else if(arrived) c.f += angDiff(Math.PI, c.f) * Math.min(1, dt * 4);
    }
    else if(c.st === 'grab'){
      if(arrived){ const o = orderById(c.oid); if(o) finishOrder(o); c.carry = 1; c.seat = freeSeat(); const s = SEATS[c.seat];
        if(s){ c.path = [[s.x + (s.f > 0 ? -.6 : .6), s.z + .9], [s.x, s.z]]; c.st = 'seat'; } else { c.st = 'out'; c.path = [[POS.door.x, POS.door.z], [0, 9.1], [Math.random() < .5 ? -26 : 26, 9.1]]; } stDirty = true; }
    }
    else if(c.st === 'seat'){ if(arrived){ c.st = 'eat'; c.t = 9; c.carry = 0; c.f = SEATS[c.seat].f; stDirty = true; } }
    else if(c.st === 'eat'){ c.t -= dt; c.f = SEATS[c.seat] ? SEATS[c.seat].f : c.f; if(c.t <= 0){ c.st = 'out'; const s = SEATS[c.seat]; c.path = [[s.x + (s.f > 0 ? -.6 : .6), s.z + .9], [POS.door.x, POS.door.z], [0, 9.1], [Math.random() < .5 ? -26 : 26, 9.1]]; c.seat = -1; stDirty = true; } }
    else if(c.st === 'out'){ if(arrived){ CUST.splice(i, 1); const k = ORD.findIndex(o => o.cust === c.id); if(k >= 0) ORD.splice(k, 1); stDirty = true; } }
  }
}
function ordersTick(){
  for(let i = ORD.length - 1; i >= 0; i--){ const o = ORD[i]; if(o.st === 'done' && (o.type === 'go' || !custById(o.cust)) && simT - o.doneT > 4){ ORD.splice(i, 1); stDirty = true; } }
  // a claim whose player left the room is let go
  if(mpActive()) for(const o of ORD) if(o.by && o.by !== 'bot' && o.by !== MP.id && !MP.players.some(p => p.id === o.by)){ o.by = null; if(o.st === 'out') o.st = 'ready'; stDirty = true; }
}
function freeSlot(arr, n, type){ const used = new Set(ORD.filter(o => o.st === 'ready' && o.type === type).map(o => o.slot)); for(let i = 0; i < n; i++) if(!used.has(i)) return i; return 0; }
function finishOrder(o){
  if(o.st === 'done') return;
  const el = simT - o.t0, fast = el < (o.type === 'go' ? FAST_GO : FAST_DINE);
  o.stars = 1 + (!o.miss && !o.burnt ? 1 : 0) + (fast ? 1 : 0);
  o.st = 'done'; o.by = null; o.doneT = simT; stDirty = true;
  if(isAuth()) onOrderDone(o);
}
/* the rules: every change to an order goes through here (your own taps, bots, friends' intents) */
function hostApply(pid, op, d){
  const o = d && d.oid ? orderById(d.oid) : null;
  const res = { ok:false, op, oid:d && d.oid, coins:0 };
  if(op === 'take'){
    if(!o || o.st !== 'ask') return res;
    if(o.type === 'dine'){ const c = custById(o.cust); if(!c || c.st !== 'order') return res; c.st = 'wait'; c.wi = -1; }
    o.st = 'cook'; o.miss += clamp(d.miss | 0, 0, 20); res.ok = true; res.coins = PAY.take;
  } else if(op === 'claim'){
    if(!o || (o.by && o.by !== pid)) return res;
    if(d.job === 'cook' && o.st === 'cook'){ o.by = pid; res.ok = true; }
    else if(d.job === 'boxer' && o.st === 'box'){ o.by = pid; res.ok = true; }
    else if(d.job === 'delivery' && o.st === 'ready' && o.type === 'go'){ o.by = pid; o.st = 'out'; res.ok = true; }
  } else if(op === 'drop'){
    if(!o || o.by !== pid) return res;
    o.by = null; if(o.st === 'out') o.st = 'ready'; res.ok = true;
  } else if(op === 'cooked'){
    if(!o || o.st !== 'cook' || o.by !== pid) return res;
    o.st = 'box'; o.by = null; o.miss += clamp(d.miss | 0, 0, 20); o.burnt += clamp(d.burnt | 0, 0, 9);
    res.ok = true; res.coins = PAY.cook + (d.perfect ? PAY.perfect : 0);
  } else if(op === 'boxed'){
    if(!o || o.st !== 'box' || o.by !== pid) return res;
    o.st = 'ready'; o.by = null; o.miss += clamp(d.miss | 0, 0, 20); o.slot = freeSlot(null, o.type === 'go' ? SHELF_SLOTS.length : PICKUP_X.length, o.type);
    res.ok = true; res.coins = PAY.box;
  } else if(op === 'deliver'){
    if(!o || o.st !== 'out' || o.by !== pid) return res;
    if((d.h | 0) !== o.h){ res.wrong = true; return res; }
    finishOrder(o); res.ok = true; res.coins = PAY.tip;
  } else if(op === 'cheer'){ cheerT = 12; res.ok = true; }
  if(res.ok) stDirty = true;
  return res;
}

/* ---------- helper bots: the owner's characters do every job nobody is doing ---------- */
const BOT_HOME = { cashier:POS.cashier, cook:POS.cookHome, boxer:{ x:POS.pass.sx, z:POS.pass.sz, f:0 }, delivery:{ x:POS.shelf.sx, z:POS.shelf.sz, f:Math.PI } };
function humanJobs(){ const s = new Set(); if(mpActive()) for(const p of MP.players){ if(JOBS[p.job]) s.add(p.job); } else if(ME.job) s.add(ME.job); return s; }
function botBoost(){ return (cheerT > 0 ? 1.8 : 1) * (humanJobs().has('manager') ? 1.25 : 1); }
function syncBots(){
  const hj = humanJobs(), want = WORK_JOBS.filter(j => !hj.has(j));
  for(let i = BOTS.length - 1; i >= 0; i--){ const b = BOTS[i]; if(!want.includes(b.job)){ const o = orderById(b.oid); if(o && o.by === 'bot'){ o.by = null; if(o.st === 'out') o.st = 'ready'; } BOTS.splice(i, 1); stDirty = true; } }
  const taken = new Set((mpActive() ? MP.players.map(p => p.hero) : [heroId]).concat(BOTS.map(b => b.hero)));
  const pool = ['sidra', 'samir', 'qamar', 'zaqzouq', 'mushakis', 'sara', 'laila'];
  for(const j of want){ if(BOTS.some(b => b.job === j)) continue;
    const hero = pool.find(h => !taken.has(h)) || 'laila'; taken.add(hero);
    const H = BOT_HOME[j]; BOTS.push({ job:j, hero, x:H.x, z:H.z, f:H.f, m:0, carry:'', ph:'idle', t:0, oid:0, path:[], bike:false }); stDirty = true; }
}
function botTick(b, dt){
  const k = botBoost(), walk = 3.4 * k, H = BOT_HOME[b.job];
  const arrived = walkPath(b, dt, b.bike ? 9 * k : walk);
  b.bike = b.job === 'delivery' && isOutside(b.x, b.z);
  let o = b.oid ? orderById(b.oid) : null;
  const goHome = () => { b.ph = 'idle'; b.oid = 0; b.carry = ''; b.path = [[H.x, H.z]]; };
  if(b.job === 'cashier'){
    if(!arrived){ return; }
    b.f += angDiff(0, b.f) * Math.min(1, dt * 8);
    const ask = currentAsk();
    if(ask){ b.t += dt * k; b.ph = 'work'; if(b.t > 2.4){ b.t = 0; hostApply('bot', 'take', { oid:ask.id }); SFX.register(); } } else { b.t = 0; b.ph = 'idle'; }
  } else if(b.job === 'cook'){
    if(b.ph !== 'idle' && (!o || o.st !== 'cook' || o.by !== 'bot')){ goHome(); return; }
    if(b.ph === 'idle'){ if(arrived) b.f += angDiff(Math.PI, b.f) * Math.min(1, dt * 8);
      const n = ORD.find(x => x.st === 'cook' && !x.by); if(n && hostApply('bot', 'claim', { oid:n.id, job:'cook' }).ok){ b.oid = n.id; if(n.m === 'burger'){ b.ph = 'goGrill'; b.path = [[POS.grill.sx, POS.grill.sz]]; } else { b.ph = 'goDough'; b.path = [[POS.dough.sx, POS.dough.sz]]; } } return; }
    if(!arrived) return;
    const face = () => { b.f += angDiff(Math.PI, b.f) * Math.min(1, dt * 10); };
    if(b.ph === 'goDough'){ b.ph = 'dough'; b.t = 2.2; b.carry = 'dough'; }
    else if(b.ph === 'dough'){ face(); b.t -= dt * k; if(b.t <= 0){ b.ph = 'goTops'; b.path = [[POS.tops.sx, POS.tops.sz]]; b.carry = 'pizzaRaw'; } }
    else if(b.ph === 'goTops'){ b.ph = 'tops'; b.t = .8 + o.t.length * .5; }
    else if(b.ph === 'tops'){ face(); b.t -= dt * k; if(b.t <= 0){ b.ph = 'goOven'; b.path = [[POS.oven.sx, POS.oven.sz]]; } }
    else if(b.ph === 'goOven'){ b.ph = 'oven'; b.t = 3.8; b.carry = ''; SFX.sizzle(.6); }
    else if(b.ph === 'oven'){ face(); b.t -= dt * k; if(b.t <= 0){ b.ph = 'goPass'; b.carry = 'pizza'; b.path = PASS_PATH(); SFX.ding(); } }
    else if(b.ph === 'goGrill'){ b.ph = 'grill'; b.t = 3.6; b.carry = ''; SFX.sizzle(.8); }
    else if(b.ph === 'grill'){ face(); b.t -= dt * k; if(b.t <= 0){ b.ph = 'goPass'; b.carry = 'burger'; b.path = PASS_PATH(); } }
    else if(b.ph === 'goPass'){ hostApply('bot', 'cooked', { oid:o.id }); goHome(); }
  } else if(b.job === 'boxer'){
    if(b.ph !== 'idle' && (!o || o.st !== 'box' || o.by !== 'bot')){ goHome(); return; }
    if(arrived) b.f += angDiff(0, b.f) * Math.min(1, dt * 8);
    if(b.ph === 'idle'){ const n = ORD.find(x => x.st === 'box' && !x.by); if(n && hostApply('bot', 'claim', { oid:n.id, job:'boxer' }).ok){ b.oid = n.id; b.ph = 'work'; b.t = 2.2 + (n.d + n.i) * .5; } return; }
    b.t -= dt * k; if(b.t <= 0){ hostApply('bot', 'boxed', { oid:o.id }); SFX.pick(); goHome(); }
  } else if(b.job === 'delivery'){
    if(b.ph !== 'idle' && b.ph !== 'back' && (!o || o.st !== 'out' || o.by !== 'bot')){ b.ph = 'back'; b.oid = 0; b.carry = ''; b.path = deliveryBack(b); return; }
    if(b.ph === 'idle'){ if(arrived) b.f += angDiff(Math.PI, b.f) * Math.min(1, dt * 8);
      const n = ORD.find(x => x.st === 'ready' && x.type === 'go' && !x.by); if(n && arrived && hostApply('bot', 'claim', { oid:n.id, job:'delivery' }).ok){ b.oid = n.id; b.carry = 'box'; b.ph = 'ride'; const hx = HOUSE_X[n.h];
        b.path = [[.6, 6.6], [POS.out.x, POS.out.z], [POS.bike.x, POS.bike.z], [hx, 13], [hx, HOUSE_RING_Z]]; } return; }
    if(!arrived) return;
    if(b.ph === 'ride'){ b.ph = 'ring'; b.t = 1.2; b.f = 0; SFX.bell(); }
    else if(b.ph === 'ring'){ b.t -= dt * k; if(b.t <= 0){ const hx = b.x; hostApply('bot', 'deliver', { oid:o.id, h:o.h }); b.carry = ''; b.oid = 0; b.ph = 'back'; b.path = deliveryBack(b, hx); } }
    else if(b.ph === 'back'){ goHome(); }
  }
}
function deliveryBack(b, hx){ const p = []; if(isOutside(b.x, b.z)){ p.push([hx != null ? hx : b.x, 13], [POS.bike.x, POS.bike.z], [POS.out.x, POS.out.z], [.6, 6.6]); } p.push([BOT_HOME.delivery.x, BOT_HOME.delivery.z]); return p; }
function currentAsk(){
  const dine = ORD.find(o => o.st === 'ask' && o.type === 'dine' && (custById(o.cust) || {}).st === 'order');
  return dine || ORD.find(o => o.st === 'ask' && o.type === 'go') || null;
}
function hostTick(dt){
  simT += dt; cheerT = Math.max(0, cheerT - dt);
  syncBots(); spawnTick(dt); custTick(dt);
  for(const b of BOTS) botTick(b, dt);
  ordersTick();
}

/* ======================================================================
   You: your job, your task, rewards
   ====================================================================== */
const P = { x:POS.manager.x, z:POS.manager.z, vx:0, vz:0, face:Math.PI, move:0, goal:null, carry:'', bike:false };
const ME = { job:null, task:null, cheerCD:0 };
const myPid = () => mpActive() ? MP.id : 'me';
let T = 0, me = null;
const myPizza = GM.makePizza(); myPizza.grp.visible = false; scene.add(myPizza.grp); shadowAll(myPizza.grp);
const myPatty = new THREE.Mesh(carryGeo('patty'), MAT); myPatty.visible = false; myPatty.castShadow = true; scene.add(myPatty);
const cheeseStr = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1, 6), new THREE.MeshStandardMaterial({ color:0xffd84a, roughness:.3 })); cheeseStr.visible = false; scene.add(cheeseStr);
let cheeseT = 0, reqN = 0;
const pending = new Map();
function intent(op, d, cb){
  d = d || {};
  if(isAuth()){ const r = hostApply(myPid(), op, d); if(cb) cb(r); return; }
  const rid = ++reqN; pending.set(rid, { cb, t:4 });
  mpSend('in', Object.assign({ op, rid }, d));
}
function pendingTick(dt){ for(const [rid, p] of pending){ p.t -= dt; if(p.t <= 0){ pending.delete(rid); if(p.cb) p.cb({ ok:false }); } } }
const coinsEl = $('#hudCoins'), starsEl = $('#hudStars');
function bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
function earn(n, x, y, z){
  if(!(n > 0)) return;
  SAVE.coins += n; persist(); hudKey = ''; SFX.coins(); bump(coinsEl);
  if(x != null) floatIcon('coin', x, y, z, Math.min(4, Math.ceil(n / 3)), .4);
  pop('+' + N(n) + ' ' + COIN);
}
const seenDone = new Set();
function onOrderDone(o){
  const key = (MP.code || 'solo') + ':' + o.id + ':' + o.t0;
  if(seenDone.has(key)) return; seenDone.add(key);
  SAVE.stars += o.stars; SAVE.served++; bump(starsEl);
  let bonus = PAY.team + (ME.job === 'manager' ? PAY.manager : 0);
  SAVE.coins += bonus; hudKey = '';
  const c = custById(o.cust), at = o.type === 'go' ? { x:HOUSE_X[o.h], z:HOUSE_RING_Z } : c ? { x:c.rx != null ? c.rx : c.x, z:c.rz != null ? c.rz : c.z } : { x:-2.3, z:-.5 };
  fxTag(at.x, 2.6, at.z, `<i>${'⭐'.repeat(o.stars)}</i>`, 'stars', 2.6);
  for(let i = 0; i < o.stars; i++) setTimeout(() => floatIcon('star', at.x, 1.8, at.z, 1, .45), i * 150);
  if(o.type === 'go') houseFx(o.h);
  SFX.star();
  if(o.vip && SAVE.vipDay !== today() && state !== 'menu'){
    SAVE.vipDay = today(); SAVE.coins += VIP_COINS;
    try{ if(window.World) World.addCoins(VIP_WORLD, L('من مطعم بوبو', 'from Bobo Restaurant', 'Bobo Restoranı\'ndan')); }catch(e){}
    setTimeout(() => { if(state === 'play') vipCard(o.stars); }, 900);
  }
  while(SAVE.miles < MILES.length && SAVE.served >= MILES[SAVE.miles][0]){
    const [n, w] = MILES[SAVE.miles]; SAVE.miles++;
    try{ if(window.World) World.addCoins(w, L('من مطعم بوبو', 'from Bobo Restaurant', 'Bobo Restoranı\'ndan')); }catch(e){}
    setTimeout(() => { if(state === 'play') say('🏆 ' + N(n) + ' ' + L('طلب! برافو يا فريق 🎉', 'orders! Well done, team 🎉', 'sipariş! Aferin takım 🎉'), 4500, panelOn()); }, 1200);
  }
  persist();
}
/* a resident opens the door, waves, and hearts float up */
const residents = [];
function houseFx(h){
  const x = HOUSE_X[h]; if(x == null) return;
  const r = GM.customer(h + 3); r.grp.position.set(x, 0, HOUSE_Z - 2.5); r.grp.rotation.y = 0; scene.add(r.grp);
  residents.push({ r, t:2.6 }); SFX.door(); floatIcon('heart', x, 1.8, HOUSE_Z - 2.6, 3, .45);
}
function residentsFrame(dt){
  for(let i = residents.length - 1; i >= 0; i--){ const q = residents[i]; q.t -= dt; poseHero(q.r, { t:T, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); q.r.arms[1].rotation.z = -2.4 + Math.sin(T * 12) * .4; q.r.grp.scale.setScalar(clamp(Math.min(2.6 - q.t, q.t) * 4, 0, 1));
    if(q.t <= 0){ scene.remove(q.r.grp); residents.splice(i, 1); } }
}
const LINES = {
  hi:      L('أهلا حبيبي! أنا العمة ليلى 👵 أهلا بمطعم بوبو 🍕 اختار شغلتك!', "Hello sweetie! I'm Aunt Laila 👵 Welcome to Bobo Restaurant 🍕 Pick your job!", 'Merhaba tatlım! Ben Leyla Teyze 👵 Bobo Restoranı\'na hoş geldin 🍕 Görevini seç!'),
  cashier: L('إنت الكاشير 🧾 الزبون بيورجيك شو بدّو بالصور — كبوس نفس الصور 👆', "You're the cashier 🧾 The customer shows pictures — tap the same pictures 👆", 'Kasiyersin 🧾 Müşteri resimlerle gösterir — aynı resimlere dokun 👆'),
  cook:    L('إنت الطبّاخ 🧑‍🍳 اختار طلب، اعجن 👊، حط الإضافات، وبالفرن 🔥', "You're the cook 🧑‍🍳 Pick an order, press the dough 👊, add toppings, then the oven 🔥", 'Aşçısın 🧑‍🍳 Sipariş seç, hamuru bas 👊, malzemeleri koy, sonra fırın 🔥'),
  oven:    L('طلّعها لمّا الدولاب يصير بالأخضر 🟢', 'Take it out when the ring is in the green 🟢', 'Halka yeşildeyken çıkar 🟢'),
  boxer:   L('إنت للتغليف 📦 صحن 🍽️ للي بياكل هون، علبة 📦 للتوصيل، وزيد العصير 🧃', "You're the boxer 📦 A plate 🍽️ to eat here, a box 📦 for delivery, and add the drink 🧃", 'Paketçisin 📦 Burada yiyene tabak 🍽️, eve kutu 📦, içeceği de ekle 🧃'),
  delivery:L('إنت الدليفري 🚲 خود العلبة 📦 وروح عالبيت اللي إلو نفس اللون والرقم 🏠 ودق الجرس 🔔', "You're delivery 🚲 Take the box 📦 to the house with the same colour and number 🏠 and ring 🔔", 'Kuryesin 🚲 Kutuyu 📦 aynı renk ve numaralı eve 🏠 götür ve zili çal 🔔'),
  manager: L('إنت المدير ⭐ المساعدين بيشتغلوا — كبوس 📣 ليصيروا أسرع!', "You're the manager ⭐ The helpers do the work — tap 📣 to speed them up!", 'Müdürsün ⭐ Yardımcılar çalışıyor — hızlandırmak için 📣 dokun!'),
  phone:   L('📞 تلفون! طلب توصيل — كبوس نفس الصور', '📞 Phone! A delivery order — tap the same pictures', '📞 Telefon! Eve sipariş — aynı resimlere dokun'),
  vip:     L('⭐ زبون خاص! طلبو كبير — خدموه منيح 👑', '⭐ A special customer! A big order — serve it well 👑', '⭐ Özel müşteri! Büyük sipariş — iyi hizmet edin 👑'),
  notYet:  L('لسّا ما استوت! استنّى الأخضر 🟢', 'Not ready yet! Wait for the green 🟢', 'Daha pişmedi! Yeşili bekle 🟢'),
  burnt:   L('أوبس! احترقت 😅💨 يلا نعيدها', 'Oops! It burnt 😅💨 Let\'s make it again', 'Eyvah! Yandı 😅💨 Yeniden yapalım'),
  wrongHouse: L('مش هاد البيت 😅 شوف اللون والرقم 🏠', 'Not this house 😅 Look at the colour and number 🏠', 'Bu ev değil 😅 Rengine ve numarasına bak 🏠'),
  back:    L('أهلا فيك من جديد! 🍕', 'Welcome back! 🍕', 'Tekrar hoş geldin! 🍕')
};
function setJob(j){
  if(!JOBS[j]) return;
  dropTask();
  ME.job = j; SAVE.job = j; persist();
  const H = j === 'manager' ? POS.manager : j === 'cook' ? POS.cookHome : BOT_HOME[j];
  P.x = H.x; P.z = H.z; P.face = H.f; P.vx = P.vz = 0; P.goal = null; snapCam = true; P.carry = ''; P.bike = false;
  if(mpActive()) mpTrack();
  if(!SAVE.tut[j]){ SAVE.tut[j] = 1; persist(); setTimeout(() => { if(state === 'play') say(LINES[j], 7000, panelOn()); }, 300); }
  hudKey = ''; panelKey = '';
}
function dropTask(){
  const t = ME.task; ME.task = null; P.carry = ''; myPizza.grp.visible = false; myPatty.visible = false; panelKey = '';
  if(t && t.oid && t.claimed) intent('drop', { oid:t.oid });
}
function walkTo(x, z, r, fn){ P.goal = { x, z, r, fn, t:6 }; }

/* ---------- cashier ---------- */
function cashTap(k){
  const o = currentAsk(); if(!o || ME.job !== 'cashier') return false;
  let t = ME.task; if(!t || t.k !== 'cash' || t.oid !== o.id) t = ME.task = { k:'cash', oid:o.id, picks:[], miss:0 };
  const want = wantCash(o);
  if(want.includes(k) && !t.picks.includes(k)){
    t.picks.push(k); SFX.pick(); panelKey = '';
    if(t.picks.length === want.length){ const oid = o.id, miss = t.miss; t.sent = true;
      intent('take', { oid, miss }, r => { if(r.ok){ SFX.register(); earn(r.coins, POS.register.x, 1.6, POS.register.z); burst(POS.register.x, 1.4, POS.register.z, 16, CONFETTI, 3, .8); } if(ME.task && ME.task.oid === oid) ME.task = null; panelKey = ''; }); }
    return true;
  }
  t.miss++; SFX.bonk(); shakeBtn(k); hintNext = T + .01; return false;
}
/* ---------- cook ---------- */
const STEP_AT = { dough:POS.dough, tops:POS.tops, oven:POS.oven, grill:POS.grill, pass:{ sx:2.85, sz:-4.4, f:Math.PI / 2 } };
function cookStart(oid){
  if(ME.job !== 'cook' || (ME.task && ME.task.k === 'cook')) return false;
  const o = orderById(oid); if(!o || o.st !== 'cook' || o.by) return false;
  intent('claim', { oid, job:'cook' }, r => {
    if(!r.ok){ SFX.bonk(); panelKey = ''; return; }
    ME.task = { k:'cook', oid, m:o.m, t:o.t.slice(), step:'', taps:0, picks:[], miss:0, burnt:0, on:false, p:0, claimed:true };
    GM.resetPizza(myPizza);
    cookStep(o.m === 'burger' ? 'grill' : 'dough'); SFX.tap();
    if(!SAVE.tut.cook2){ SAVE.tut.cook2 = 1; persist(); }
  });
  return true;
}
function cookStep(step){
  const t = ME.task; if(!t) return;
  t.step = step; t.on = false; t.p = 0; panelKey = '';
  const S = STEP_AT[step]; walkTo(S.sx, S.sz, .2, () => { if(ME.task === t){ P.face = S.f; panelKey = ''; } });
  if(step === 'oven' && !SAVE.tut.oven){ SAVE.tut.oven = 1; persist(); say(LINES.oven, 5000, true); }
  if(step === 'pass') P.carry = t.m === 'burger' ? 'burger' : '';
}
const atStep = () => { const t = ME.task; if(!t || !t.step) return false; const S = STEP_AT[t.step]; return Math.hypot(P.x - S.sx, P.z - S.sz) < .9 && !P.goal; };
function doughTap(){
  const t = ME.task; if(!t || t.step !== 'dough' || !atStep()) return false;
  t.taps++; GM.setFlat(myPizza, Math.min(1, t.taps / DOUGH_TAPS)); SFX.thump(); burst(POS.dough.x, 1.1, POS.dough.z, 8, [0xffffff, 0xf6e3bf], 1.6, .5, 8, 1);
  myPizza.grp.scale.set(1.12, .8, 1.12);
  if(t.taps >= DOUGH_TAPS){ setTimeout(() => { if(ME.task === t) cookStep('tops'); }, 350); }
  panelKey = ''; return true;
}
function topTap(k){
  const t = ME.task; if(!t || t.step !== 'tops' || !atStep()) return false;
  if(k === 'ok'){ if(t.picks.length >= t.t.length){ cookStep('oven'); return true; } return false; }
  if(t.t.includes(k) && !t.picks.includes(k)){
    t.picks.push(k); GM.addTop(myPizza, k); SFX.plop(); panelKey = '';
    if(t.picks.length === t.t.length) setTimeout(() => { if(ME.task === t && t.step === 'tops') cookStep('oven'); }, 600);
    return true;
  }
  t.miss++; SFX.bonk(); shakeBtn(k); hintNext = T + .01; return false;
}
function ovenIn(){
  const t = ME.task; if(!t || (t.step !== 'oven' && t.step !== 'grill') || !atStep() || t.on) return false;
  t.on = true; t.p = 0; SFX.sizzle(1.2); panelKey = '';
  if(t.step === 'grill') burst(POS.grill.x, 1.1, POS.grill.z, 10, [0xffb35c, 0xffffff], 1.5, .5);
  return true;
}
function ovenOut(){
  const t = ME.task; if(!t || !t.on) return false;
  if(t.p < GREEN[0]){ SFX.bonk(); say(LINES.notYet, 2500, true); return false; }
  if(t.p <= GREEN[1]){
    t.on = false; t.perfect = !t.miss && !t.burnt; SFX.ding(); SFX.boing();
    if(t.step === 'oven'){ cheeseT = 1; } else burst(POS.grill.x, 1.2, POS.grill.z, 12, [0xffd23f, 0xffffff], 2, .6);
    cookStep('pass'); return true;
  }
  burn(); return true;
}
function burn(){
  const t = ME.task; if(!t) return;
  const S = t.step === 'grill' ? POS.grill : POS.oven;
  t.on = false; t.burnt++; SFX.burnt(); smokePuff(S.x, 1.3, S.z + .6); say(LINES.burnt, 3500, true);
  if(t.step === 'oven') GM.setCook(myPizza, 2);
  setTimeout(() => { if(ME.task !== t) return; GM.resetPizza(myPizza); t.taps = 0; t.picks = []; cookStep(t.m === 'burger' ? 'grill' : 'dough'); }, 1300);
}
function cookFrame(dt){
  const t = ME.task && ME.task.k === 'cook' ? ME.task : null;
  myPizza.grp.visible = !!t && t.m === 'pizza' && t.step !== '';
  myPatty.visible = !!t && t.m === 'burger' && t.step === 'grill';
  GM.animPizza(myPizza, dt);
  myPizza.grp.scale.lerp(_v.set(1, 1, 1), Math.min(1, dt * 10));
  if(!t){ grillGlow.material.opacity = Math.max(0, grillGlow.material.opacity - dt); return; }
  if(t.on){
    t.p += dt / (t.step === 'grill' ? BURGER_T : OVEN_T);
    const p = t.p, ck = p < GREEN[0] ? p / GREEN[0] * .95 : p <= GREEN[1] ? 1 : 1 + (p - GREEN[1]) / (1 - GREEN[1]);
    if(t.step === 'oven'){ GM.setCook(myPizza, ck); if(Math.random() < dt * (p > GREEN[1] ? 14 : 3)) puff(POS.oven.x, 1.6, POS.oven.z + .8, p > GREEN[1] ? 0x6b6460 : 0xffffff, .25, 1.2, .8, .5); }
    else { myPatty.material = MAT; if(Math.random() < dt * 6) puff(POS.grill.x + (Math.random() - .5) * .3, 1.15, POS.grill.z, p > GREEN[1] ? 0x6b6460 : 0xffffff, .2, 1, .9, .5); if(Math.random() < dt * 2) SFX.sizzle(.4); }
    if(t.p >= 1) burn();
  }
  grillGlow.material.opacity = lerp(grillGlow.material.opacity, t.step === 'grill' && t.on ? .7 : 0, Math.min(1, dt * 4));
  // where my food is
  const hold = () => { _v.set(P.x + Math.sin(P.face) * .45, .74, P.z + Math.cos(P.face) * .45); return _v; };
  if(t.m === 'pizza'){
    let p;
    if(t.step === 'dough' && atStep()) p = _v.set(POS.dough.x, .99, POS.dough.z);
    else if(t.step === 'tops' && atStep()) p = _v.set(POS.tops.x, .99, POS.tops.z + .2);
    else if(t.step === 'oven' && t.on) p = _v.set(POS.oven.x, 1.08, POS.oven.z + .25);
    else p = hold();
    myPizza.grp.position.lerp(p, Math.min(1, dt * 12)); if(myPizza.grp.position.distanceTo(p) > 3) myPizza.grp.position.copy(p);
    myPizza.grp.rotation.y = P.face;
    if(t.step === 'pass' && Math.random() < dt * 4) puff(myPizza.grp.position.x, myPizza.grp.position.y + .15, myPizza.grp.position.z, 0xffffff, .14, 1, .5, .45);
  } else if(t.step === 'grill'){ myPatty.position.set(POS.grill.x, 1.0, POS.grill.z); const c = t.p < GREEN[0] ? 0 : t.p <= GREEN[1] ? 1 : 2; myPatty.scale.setScalar(1); myPatty.rotation.y = T; myPatty.material = c === 2 ? BURNT : MAT; }
  // cheese stretch when the pizza comes out of the oven
  if(cheeseT > 0){ cheeseT = Math.max(0, cheeseT - dt * 1.4); const pp = myPizza.grp.position, h = (1 - cheeseT) * .6;
    cheeseStr.visible = cheeseT > 0 && cheeseT < .95; cheeseStr.position.set(pp.x + .1, pp.y + .08 + h / 2, pp.z); cheeseStr.scale.set(1 - (1 - cheeseT) * .7, Math.max(.01, h), 1 - (1 - cheeseT) * .7); }
  else cheeseStr.visible = false;
  if(t.step === 'pass' && atStep() && !t.sent){ t.sent = true; const oid = t.oid;
    intent('cooked', { oid, miss:t.miss, burnt:t.burnt, perfect:t.perfect }, r => { if(ME.task === t) { ME.task = null; P.carry = ''; } panelKey = '';
      if(r.ok){ earn(r.coins, POS.pass.x, 1.6, POS.pass.z); if(t.perfect){ SAVE.perfect++; pop('🌟 ' + L('ممتاز!', 'Perfect!', 'Mükemmel!')); } } }); }
}
const BURNT = new THREE.MeshStandardMaterial({ color:0x2b2420, roughness:.9 });
/* ---------- boxer ---------- */
function boxStart(oid){
  if(ME.job !== 'boxer' || (ME.task && ME.task.k === 'box')) return false;
  const o = orderById(oid); if(!o || o.st !== 'box' || o.by) return false;
  intent('claim', { oid, job:'boxer' }, r => { if(!r.ok){ SFX.bonk(); panelKey = ''; return; } ME.task = { k:'box', oid, picks:[], miss:0, claimed:true }; panelKey = ''; SFX.tap(); });
  return true;
}
let fridgeT = 0;
function boxTap(k){
  const t = ME.task; if(!t || t.k !== 'box') return false;
  const o = orderById(t.oid); if(!o) return false;
  const want = wantBox(o);
  if(want.includes(k) && !t.picks.includes(k)){
    t.picks.push(k); SFX.pick(); panelKey = '';
    if(k === 'juice'){ fridgeT = 1.2; SFX.door(); } if(k === 'ice') burst(POS.ice.x, 1.9, POS.ice.z + .3, 10, [0xffb3cf, 0xffffff], 1.4, .6);
    if(t.picks.length === want.length && !t.sent){ t.sent = true; const oid = t.oid;
      intent('boxed', { oid, miss:t.miss }, r => { if(ME.task === t) ME.task = null; panelKey = ''; if(r.ok){ SFX.ding(); earn(r.coins, POS.pass.x, 1.6, POS.pass.z); } }); }
    return true;
  }
  t.miss++; SFX.bonk(); shakeBtn(k); hintNext = T + .01; return false;
}
/* ---------- delivery ---------- */
function delTake(){
  if(ME.job !== 'delivery' || ME.task) return false;
  const o = ORD.find(x => x.st === 'ready' && x.type === 'go' && !x.by); if(!o) return false;
  intent('claim', { oid:o.id, job:'delivery' }, r => {
    if(!r.ok){ SFX.bonk(); return; }
    ME.task = { k:'del', oid:o.id, h:o.h, claimed:true }; P.carry = 'box'; SFX.pick(); hudKey = '';
    say(L('روح عالبيت ', 'Go to house ', 'Şu eve git: ') + N(o.h + 1) + ' 🏠 ' + L('— نفس اللون!', '— the same colour!', '— aynı renk!'), 4000);
  });
  return true;
}
function delRing(h){
  const t = ME.task; if(!t || t.k !== 'del') return false;
  SFX.bell();
  if(h !== t.h){ SFX.bonk(); say(LINES.wrongHouse, 3500); return false; }
  const oid = t.oid;
  intent('deliver', { oid, h }, r => { if(r.ok){ ME.task = null; P.carry = ''; SAVE.delivered++; earn(r.coins, HOUSE_X[h], 2, HOUSE_RING_Z); hudKey = '';
    setTimeout(() => { if(state === 'play' && ME.job === 'delivery') say(L('برافو! 🎉 ارجع عالمطعم لطلب جديد 🍕', 'Great! 🎉 Go back to the restaurant for a new order 🍕', 'Harika! 🎉 Yeni sipariş için restorana dön 🍕'), 3500); }, 1200); } });
  return true;
}
/* ---------- manager ---------- */
function cheer(){
  if(ME.job !== 'manager' || ME.cheerCD > 0) return false;
  ME.cheerCD = 20; intent('cheer', {}); SFX.cheer(); pop('📣 ' + L('يلا يا فريق!', 'Go team!', 'Haydi takım!'));
  burst(P.x, 2, P.z, 30, CONFETTI, 4, 1); floatIcon('note', P.x, 2.2, P.z, 4, .4);
  if(mpActive()) mpSend('fx', { k:'cheer' });
  return true;
}

/* ======================================================================
   Showing the shared state: food on the pass / counter / shelf / tables, customers, bots
   ====================================================================== */
const geoCache = {};
const cgeo = (k, f) => geoCache[k] || (geoCache[k] = f());
const mainGeo = o => o.m === 'burger' ? cgeo('burger', GM.burgerGeo) : cgeo('p:' + o.t.join(','), () => GM.pizzaGeo(o.t));
const tagGeo = h => cgeo('tag' + h, () => { const M = new Merge(); M.add(GEO.box, .2, .14, .2, .16, .03, .16, 0, 0, 0, new THREE.Color(HOUSE_COL[h] || '#fff').getHex()); return M.geometry(); });
const boardGeo = () => cgeo('board', () => { const M = new Merge(); M.add(GEO.cyl, 0, .015, 0, .5, .03, .5, 0, 0, 0, 0xc98a52); M.add(GEO.box, .55, .015, 0, .3, .03, .1, 0, 0, 0, 0xc98a52); return M.geometry(); });
const foodVis = new Map();
function buildFood(o, kind, picks){
  const g = new THREE.Group();
  const add = (geo, x, y, z, s = 1) => { const m = new THREE.Mesh(geo, MAT); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = true; g.add(m); return m; };
  const has = k => picks.includes(k);
  if(kind === 'shelf' || (kind === 'pass' && has('box'))){ add(cgeo('box', () => GM.boxGeo()), 0, 0, 0, .9); if(o.h >= 0) add(tagGeo(o.h), 0, 0, 0, .9); if(o.d && (kind === 'shelf' || has('juice'))) add(cgeo('juice', GM.juiceGeo), .38, 0, .1, .9); if(o.i && (kind === 'shelf' || has('ice'))) add(cgeo('ice', GM.iceGeo), -.38, 0, .1, .9); return g; }
  const s = kind === 'tray' ? .78 : .85;
  if(kind === 'tray') add(cgeo('trayG', GM.trayGeo), 0, 0, 0, 1.15);
  const lift = kind === 'tray' ? .05 : 0;
  if(kind === 'pass' && !has('plate')) add(boardGeo(), 0, 0, 0, .9);
  else add(cgeo('plate', GM.plateGeo), kind === 'tray' ? -.12 : 0, lift, 0, s);
  add(mainGeo(o), kind === 'tray' ? -.12 : 0, lift + .03, 0, s * (o.m === 'burger' ? 1 : .9));
  if(o.d && (kind !== 'pass' || has('juice'))) add(cgeo('juice', GM.juiceGeo), .38, lift, .12, .9);
  if(o.i && (kind !== 'pass' || has('ice'))) add(cgeo('ice', GM.iceGeo), .38, lift, -.16, .9);
  return g;
}
function foodFrame(dt){
  const seen = new Set(), boxers = ORD.filter(o => o.st === 'box').sort((a, b) => a.id - b.id);
  for(const o of ORD){
    let kind = '', x = 0, y = 0, z = 0, ry = 0, picks = [];
    if(o.st === 'box'){ const i = boxers.indexOf(o); if(i < 3){ kind = 'pass'; x = PASS_X[i]; y = .99; z = POS.pass.z + .15; if(ME.task && ME.task.k === 'box' && ME.task.oid === o.id) picks = ME.task.picks; } }
    else if(o.st === 'ready' && o.type === 'dine'){ kind = 'tray'; x = PICKUP_X[o.slot] || PICKUP_X[0]; y = 1.08; z = POS.register.z + .05; }
    else if(o.st === 'ready' && o.type === 'go'){ const s = SHELF_SLOTS[o.slot] || SHELF_SLOTS[0]; kind = 'shelf'; x = s[0]; y = s[1]; z = POS.shelf.z; }
    else if(o.st === 'done' && o.type === 'dine'){ const c = custById(o.cust); if(c && c.st === 'eat' && SEATS[c.seat]){ const S = SEATS[c.seat]; kind = 'table'; x = S.px; y = .8; z = S.pz; ry = S.f; } }
    if(!kind) continue;
    seen.add(o.id);
    const key = kind + '|' + picks.join(',');
    let v = foodVis.get(o.id);
    if(!v || v.key !== key){ if(v) scene.remove(v.grp); v = { key, grp:buildFood(o, kind, picks), pop:1 }; foodVis.set(o.id, v); scene.add(v.grp); }
    v.pop = Math.max(0, v.pop - dt * 4); const sc = 1 + Math.sin(v.pop * Math.PI) * .25;
    v.grp.position.set(x, y, z); v.grp.rotation.y = ry; v.grp.scale.setScalar(sc);
    if(kind !== 'shelf' && Math.random() < dt * 2.2) puff(x + (Math.random() - .5) * .2, y + .25, z, 0xffffff, .14, 1.3, .45, .4, 2);
  }
  for(const [id, v] of foodVis) if(!seen.has(id)){ scene.remove(v.grp); foodVis.delete(id); }
}
/* customers */
const custVis = new Map();
const trayMesh = () => { const m = new THREE.Mesh(carryGeo('tray'), MAT); m.castShadow = true; return m; };
function custFrame(dt){
  const seen = new Set(), auth = isAuth();
  for(const c of CUST){
    seen.add(c.id);
    let v = custVis.get(c.id);
    if(!v){ const h = GM.customer(c.v, c.vip); scene.add(h.grp); const tm = trayMesh(); tm.position.set(0, .62, .42); tm.visible = false; h.grp.add(tm); v = { h, tm, rx:c.x, rz:c.z, rf:c.f, rm:0, t:Math.random() * 5 }; custVis.set(c.id, v); }
    const k = auth ? 1 : 1 - Math.exp(-8 * dt);
    if(!auth && Math.hypot(v.rx - c.x, v.rz - c.z) > 6){ v.rx = c.x; v.rz = c.z; }
    v.rx = lerp(v.rx, c.x, k); v.rz = lerp(v.rz, c.z, k); v.rf += angDiff(c.f, v.rf) * k; v.rm = lerp(v.rm, c.m, k); v.t += dt;
    c.rx = v.rx; c.rz = v.rz;
    const sit = c.st === 'eat', carry = !!c.carry;
    v.h.grp.position.set(v.rx, sit ? .22 : 0, v.rz); v.h.grp.rotation.y = v.rf;
    v.tm.visible = carry; for(const a of v.h.arms) a.userData.hold = carry;
    poseHero(v.h, { t:v.t, dt, run:v.rm, grounded:true, vy:0, sq:0, flip:0 });
    if(sit){ v.h.legs.forEach(l => { l.rotation.x = -1.45; }); const eatA = Math.sin(v.t * 5); v.h.arms[1].rotation.x = -1.4 + eatA * .5; v.h.head.rotation.x = .12 + Math.max(0, eatA) * .1;
      if(Math.random() < dt * .6) floatIcon('heart', v.rx, 1.7, v.rz, 1, .3); }
    if(c.st === 'order' && c.vip && Math.random() < dt * 3) burst(v.rx, 1.8, v.rz, 1, [0xffd23f, 0xffffff], .6, .6, -.5, .3);
  }
  for(const [id, v] of custVis) if(!seen.has(id)){ scene.remove(v.h.grp); custVis.delete(id); }
}
/* helper bots */
const botVis = new Map();
let ovenPizza = null;
function botsFrame(dt){
  const seen = new Set(), auth = isAuth(); let ovenBusy = false;
  for(const b of BOTS){
    seen.add(b.job);
    let v = botVis.get(b.job);
    if(!v){ v = { a:makeActor(b.hero), rx:b.x, rz:b.z, rf:b.f }; botVis.set(b.job, v); }
    if(v.a.hero !== b.hero) setActorHero(v.a, b.hero);
    const k = auth ? 1 : 1 - Math.exp(-8 * dt);
    if(Math.hypot(v.rx - b.x, v.rz - b.z) > 8){ v.rx = b.x; v.rz = b.z; }
    v.rx = lerp(v.rx, b.x, k); v.rz = lerp(v.rz, b.z, k); v.rf += angDiff(b.f, v.rf) * k;
    const work = ['dough', 'tops', 'oven', 'grill', 'work', 'ring'].includes(b.ph);
    poseActor(v.a, dt, v.rx, v.rz, v.rf, b.m, b.carry, b.bike, { work });
    if(b.ph === 'oven') ovenBusy = true;
    if(cheerT > 0 && Math.random() < dt * 5) burst(v.rx, 1.7, v.rz, 1, [0xffd23f, 0xffffff], 1, .6, -1, .5);
    if(b.ph === 'grill' && Math.random() < dt * 5) puff(POS.grill.x, 1.15, POS.grill.z, 0xffffff, .2, 1, .9, .5);
  }
  for(const [j, v] of botVis) if(!seen.has(j)){ removeActor(v.a); botVis.delete(j); }
  if(!ovenPizza){ ovenPizza = new THREE.Mesh(carryGeo('pizza'), MAT); ovenPizza.position.set(POS.oven.x, 1.08, POS.oven.z + .25); scene.add(ovenPizza); }
  ovenPizza.visible = ovenBusy;
  const hot = ovenBusy || (ME.task && ME.task.k === 'cook' && ME.task.on && ME.task.step === 'oven');
  ovenGlow.material.opacity = lerp(ovenGlow.material.opacity, hot ? .95 : .45, Math.min(1, dt * 3)) + Math.sin(T * 13) * .03;
  ovenFire.scale.set(1 + Math.sin(T * 9) * .08, .5 + Math.sin(T * 13) * .06 + (hot ? .15 : 0), .6);
  if(hot && Math.random() < dt * 3) puff(POS.oven.x + .5, 3.3, POS.oven.z - .45, 0xd8d0c8, .3, 2, .9, .35, 2.2);
  fridgeT = Math.max(0, fridgeT - dt); fridgeDoor.rotation.y = lerp(fridgeDoor.rotation.y, fridgeT > 0 ? -1.2 : 0, Math.min(1, dt * 8));
  parkedBike.visible = !(P.bike || BOTS.some(b => b.bike) || [...RM.values()].some(a => a.bike2));
  for(const s of glowSprites) if(s.isMesh) s.rotation.y = T * 1.5;
}

/* ======================================================================
   Camera, input
   ====================================================================== */
const cam = { yaw:0, pitch:.72, dist:10.5, tx:P.x, tz:P.z, pAdj:0 };
let snapCam = true, closeup = null, shotCam = null, wasBike = false;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const CLOSE = {
  cash:{ p:[-7.3, 3.5, -5.6], l:[-5.0, .6, .4] },
  box:{ p:[6.6, 4.5, -.4], l:[4.7, .25, -4.4] }
};
function stationClose(){
  if(!panelOn() || joy.id != null || P.goal || P.move > .2) return null;
  if(panelMode === 'cash') return CLOSE.cash;
  if(panelMode === 'box') return CLOSE.box;
  if(panelMode === 'cook' && ME.task && atStep()){ const S = STEP_AT[ME.task.step]; const x = ME.task.step === 'pass' ? POS.pass.x : S.x, z = ME.task.step === 'pass' ? POS.pass.z : S.z; return { p:[x + 1.7, 4.1, z + 4.4], l:[x, .3, z + .3] }; }
  return null;
}
function updateCamera(dt){
  const c = shotCam || stationClose();
  if(c){
    camPos.lerp(_v.set(c.p[0], c.p[1], c.p[2]), 1 - Math.exp(-(shotCam ? 50 : 5) * dt)); camLook.lerp(_s.set(c.l[0], c.l[1], c.l[2]), 1 - Math.exp(-(shotCam ? 50 : 6) * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); closeup = c; return;
  }
  if(closeup){ closeup = null; }
  cam.pitch = lerp(cam.pitch, clamp(.72 + cam.pAdj, .35, 1.2), Math.min(1, dt * 3));
  if(P.bike && P.z > 15.2 && look.id == null) cam.yaw += angDiff(Math.PI, cam.yaw) * Math.min(1, dt * 3);
  else if(P.bike && P.move > .25 && look.id == null) cam.yaw += angDiff(P.face + Math.PI, cam.yaw) * Math.min(1, dt * 1.6);
  else if(!P.bike && !isOutside(P.x, P.z) && look.id == null && Math.abs(angDiff(0, cam.yaw)) > .01 && wasBike){ cam.yaw += angDiff(0, cam.yaw) * Math.min(1, dt * 2.5); if(Math.abs(angDiff(0, cam.yaw)) < .02) wasBike = false; }
  if(P.bike) wasBike = true;
  const dist = P.bike ? 12 : cam.dist;
  const k = snapCam ? 1 : 1 - Math.exp(-7 * dt);
  cam.tx = lerp(cam.tx, P.x, k); cam.tz = lerp(cam.tz, P.z - 1, k);
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  _v.set(cam.tx + dx * dist, .8 + dy * dist, cam.tz + dz * dist);
  if(snapCam){ camPos.copy(_v); camLook.set(cam.tx, .8, cam.tz); snapCam = false; } else { camPos.lerp(_v, 1 - Math.exp(-6 * dt)); camLook.lerp(_s.set(cam.tx, .8, cam.tz), 1 - Math.exp(-10 * dt)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac(); MUS.on = true;
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
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); MUS.on = true; actBtn.classList.add('on'); doAction(); });
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
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.1);
function tapAt(x, y){
  if(state !== 'play') return;
  ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera);
  const hit = ray.ray.intersectPlane(groundPlane, _v); if(!hit) return;
  if(Math.hypot(hit.x - POS.board.x, hit.z - POS.board.z) < 1.3){ walkTo(POS.board.sx, POS.board.sz, .6, () => openJobs()); return; }
  walkTo(hit.x, hit.z, .3, null);
}
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
    if(d <= g.r || g.t <= 0){ P.goal = null; if(d > .05) P.face = Math.atan2(dx, dz); if(g.fn) g.fn(); }
    else { const sp = clamp((d - g.r) * 1.5, .35, 1); inp.x = dx / d * sp; inp.z = dz / d * sp; inp.m = sp; }
  }
}
function stepPlayer(dt){
  P.bike = ME.job === 'delivery' && isOutside(P.x, P.z);
  const SPEED = P.bike ? 10 : 5.2;
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 12 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 12 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42);
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
  if(P.bike && P.move > .3 && Math.random() < dt * 0.3) SFX.bike();
}

/* ======================================================================
   Aunt Laila, pop-ups, the action button, the guide arrow
   ====================================================================== */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200, top = false){
  clearTimeout(sayTO); guideT.textContent = text; guideEl.classList.toggle('top', !!top);
  guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = '';
  sayTO = setTimeout(() => { guideEl.hidden = true; }, ms);
}
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
let ctxNow = null, actKey = '';
const dist = (x, z) => Math.hypot(P.x - x, P.z - z);
function context(){
  if(dist(POS.board.sx, POS.board.sz) < 1.6) return { k:'jobs' };
  const j = ME.job, t = ME.task;
  if(j === 'cashier' && dist(POS.cashier.x, POS.cashier.z) > 2.2) return { k:'goCash' };
  if(j === 'cook'){ if(t && t.k === 'cook' && !atStep() && !P.goal) return { k:'cookGo' }; if(!t && !panelWanted()) return { k:'goCook' }; }
  if(j === 'boxer' && dist(POS.pass.sx, POS.pass.sz) > 2.4) return { k:'goBox' };
  if(j === 'delivery'){
    if(t && t.k === 'del'){ for(let h = 0; h < RING.length; h++) if(dist(RING[h].x, RING[h].z) < 2.6) return { k:'ring', h }; return null; }
    if(dist(POS.shelf.sx, POS.shelf.sz) < 2.2) return ORD.some(o => o.st === 'ready' && o.type === 'go' && !o.by) ? { k:'take' } : null;
    return { k:'goShelf' };
  }
  if(j === 'manager' && ME.cheerCD <= 0) return { k:'cheer' };
  return null;
}
const ACT_LOOK = {
  jobs:['🔄', L('الشغلات', 'Jobs', 'Görevler'), '#f3dfb4'], goCash:['🧾', L('عالكاشير', 'To the till', 'Kasaya'), '#ff8f6b'], cookGo:['▶️', L('كمّل', 'Go on', 'Devam'), '#ffb86b'],
  goCook:['🧑‍🍳', L('عالمطبخ', 'To the kitchen', 'Mutfağa'), '#ffb86b'], goBox:['📦', L('عالتغليف', 'To boxing', 'Paketlemeye'), '#e6b67e'],
  ring:['🔔', L('دق الجرس', 'Ring', 'Zili çal'), '#ffc23d'], take:['📦', L('خود', 'Take', 'Al'), '#5ed6a0'], goShelf:['🍕', L('عالمطعم', 'To the shop', 'Restorana'), '#6cc4ff'],
  cheer:['📣', L('يلا يا فريق!', 'Go team!', 'Haydi takım!'), '#ff8fb1']
};
function updateActBtn(){
  ctxNow = panelOn() ? null : context();
  const key = ctxNow ? ctxNow.k + (ctxNow.h != null ? ctxNow.h : '') : '';
  if(key === actKey) return; actKey = key;
  if(!ctxNow){ actBtn.hidden = true; return; }
  const [ic, label, col] = ACT_LOOK[ctxNow.k];
  $('#actI').textContent = ic; $('#actB').textContent = label; actBtn.style.setProperty('--ac', col);
  actBtn.hidden = false; actBtn.classList.toggle('pulse', ['ring', 'take', 'cheer'].includes(ctxNow.k));
}
function doAction(){
  if(state !== 'play') return;
  const c = ctxNow || context(); if(!c) return;
  P.goal = null; actKey = '';
  if(c.k === 'jobs'){ SFX.tap(); openJobs(); }
  else if(c.k === 'goCash') walkTo(POS.cashier.x, POS.cashier.z, .15, () => { P.face = 0; });
  else if(c.k === 'cookGo'){ const S = STEP_AT[ME.task.step]; walkTo(S.sx, S.sz, .2, () => { P.face = S.f; panelKey = ''; }); }
  else if(c.k === 'goCook') walkTo(POS.cookHome.x, POS.cookHome.z, .2, () => { P.face = Math.PI; });
  else if(c.k === 'goBox') walkTo(POS.pass.sx, POS.pass.sz, .15, () => { P.face = 0; });
  else if(c.k === 'goShelf') walkTo(POS.shelf.sx, POS.shelf.sz, .3, () => { P.face = Math.PI; });
  else if(c.k === 'take') delTake();
  else if(c.k === 'ring') delRing(c.h);
  else if(c.k === 'cheer') cheer();
}
let guideArrowT = null;
function guideTarget(){
  if(state !== 'play') return null;
  const j = ME.job, t = ME.task;
  if(j === 'delivery'){ if(t && t.k === 'del') return { x:RING[t.h].x, z:RING[t.h].z, y:2.2 }; if(ORD.some(o => o.st === 'ready' && o.type === 'go' && !o.by)) return { x:POS.shelf.sx, z:POS.shelf.sz, y:2.6 }; }
  if(j === 'cashier' && currentAsk()) return { x:POS.cashier.x, z:POS.cashier.z, y:2.4 };
  if(j === 'cook' && t && t.k === 'cook'){ const S = STEP_AT[t.step]; return S ? { x:S.sx, z:S.sz, y:2.4 } : null; }
  if(j === 'cook' && ORD.some(o => o.st === 'cook' && !o.by)) return { x:POS.cookHome.x, z:POS.cookHome.z, y:2.4 };
  if(j === 'boxer' && ORD.some(o => o.st === 'box' && !o.by)) return { x:POS.pass.sx, z:POS.pass.sz, y:2.4 };
  return null;
}
function animGuide(){
  const g = guideTarget();
  const show = !!g && Math.hypot(g.x - P.x, g.z - P.z) > 1.6;
  guideArrow.visible = guideRing.visible = show;
  if(!show) return;
  guideArrow.position.set(g.x, g.y + .6 + Math.abs(Math.sin(T * 3.5)) * .5, g.z); guideArrow.rotation.y = T * 2;
  guideRing.position.set(g.x, .16, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
}

/* ======================================================================
   HUD: coins, stars, order tickets, the room bar; bubbles over customers, the phone and houses
   ====================================================================== */
const hudEl = $('#hud'), tixEl = $('#tix');
let hudKey = '';
const hsBadge = (h, big) => h >= 0 ? `<span class="hs${big ? ' big' : ''}" style="--h:${HOUSE_COL[h]}">${N(h + 1)}</span>` : '';
const itemsHtml = (o, small) => `${ITEM_E[o.m]}${o.m === 'pizza' && o.t.length ? `<small>${o.t.map(t => ITEM_E[t]).join('')}</small>` : ''}${o.d ? (small ? '<small>🧃</small>' : '🧃') : ''}${o.i ? (small ? '<small>🍦</small>' : '🍦') : ''}`;
const STAGE_E = { ask:'🗣️', cook:'🔥', box:'📦', ready:'✅', out:'🚲', done:'⭐' };
function isMine(o){ const j = ME.job; return (j === 'cashier' && o.st === 'ask') || (j === 'cook' && o.st === 'cook') || (j === 'boxer' && o.st === 'box') || (j === 'delivery' && ((o.st === 'ready' && o.type === 'go') || (o.st === 'out' && o.by === myPid()))); }
function hudFrame(){
  const mp = mpActive();
  const list = ORD.filter(o => o.st !== 'done').sort((a, b) => a.id - b.id).slice(0, 6);
  const key = [SAVE.coins, SAVE.stars, ME.job, list.map(o => o.id + o.st + (o.by || '')).join(','), mp ? MP.players.map(p => p.id + p.hero + p.job).join(',') : '', MP.code].join('|');
  if(key === hudKey) return; hudKey = key;
  coinsEl.textContent = COIN + ' ' + N(SAVE.coins);
  starsEl.textContent = '⭐ ' + N(SAVE.stars);
  $('#jobI').textContent = ME.job ? JOBS[ME.job].e : '❔';
  tixEl.innerHTML = list.map(o => `<div class="tk${isMine(o) ? ' mine' : ''}${o.vip ? ' vip' : ''}"><span class="it">${o.vip ? '👑' : ''}${itemsHtml(o, true)}</span><span class="sg">${o.st === 'ask' && o.type === 'go' ? '📞' : STAGE_E[o.st]} ${o.type === 'go' ? hsBadge(o.h) : '🍽️'}</span></div>`).join('');
  const bar = $('#mpBar'); bar.hidden = !mp;
  if(mp) bar.innerHTML = `<span class="chip roomchip">🍕 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${BoboRT.chipH(p.id)}${JOBS[p.job] ? JOBS[p.job].e : ''}</span>`).join('');
}
const tagsEl = $('#tags'), tagEls = new Map(), fxTags = [];
let fxSeq = 0;
function fxTag(x, y, z, html, cls, life){ fxTags.push({ id:'fx' + (++fxSeq), x, y, z, html, cls, life }); }
function wantHtml(list, picks){ const left = picks.slice(); return list.map(k => { const i = left.indexOf(k); const ok = i >= 0; if(ok) left.splice(i, 1); return `<i class="${ok ? 'ok' : ''}">${ITEM_E[k]}</i>`; }).join(''); }
function tagsFrame(dt){
  const want = [];
  const inMenu = state === 'menu' || state === 'select';
  if(!inMenu){
    const cashPicks = o => ME.task && ME.task.k === 'cash' && ME.task.oid === o.id ? ME.task.picks : [];
    for(const c of CUST){
      const x = c.rx != null ? c.rx : c.x, z = c.rz != null ? c.rz : c.z;
      if(c.st === 'order'){ const o = orderById(c.oid); if(o) want.push({ id:'c' + c.id, x, y:2.3, z, cls:'bub' + (o.vip ? ' vip' : ''), html:(o.vip ? '<i>👑</i>' : '') + wantHtml(wantCash(o), cashPicks(o)) }); }
      else if(c.st === 'wait') want.push({ id:'c' + c.id, x, y:2.1, z, cls:'bub small', html:'<i>⏳</i>' });
      else if(c.st === 'eat') want.push({ id:'c' + c.id, x, y:1.95, z, cls:'bub small', html:'<i>😋</i>' });
    }
    const ph = ORD.find(o => o.st === 'ask' && o.type === 'go');
    if(ph) want.push({ id:'phone', x:POS.register.x + .2, y:2.0, z:POS.register.z, cls:'bub phone', html:'<i>📞</i>' + wantHtml(wantCash(ph), ME.task && ME.task.k === 'cash' && ME.task.oid === ph.id ? ME.task.picks : []) + hsBadge(ph.h) });
    if(ME.task && ME.task.k === 'del'){ const h = ME.task.h; want.push({ id:'house', x:HOUSE_X[h], y:5.6, z:HOUSE_Z - 2, cls:'bub home', style:`--h:${HOUSE_COL[h]}`, html:`<i>🏠</i><b>${N(h + 1)}</b>` }); }
    for(let i = fxTags.length - 1; i >= 0; i--){ const f = fxTags[i]; f.life -= dt; f.y += dt * .5; if(f.life <= 0){ fxTags.splice(i, 1); continue; } want.push({ id:f.id, x:f.x, y:f.y, z:f.z, cls:'bub ' + f.cls, html:f.html }); }
  }
  const seen = new Set();
  for(const w of want){
    seen.add(w.id);
    let e = tagEls.get(w.id);
    if(!e){ e = document.createElement('div'); tagsEl.appendChild(e); tagEls.set(w.id, e); e._h = ''; e._c = ''; }
    if(e._h !== w.html){ e.innerHTML = w.html; e._h = w.html; }
    if(e._c !== w.cls){ e.className = w.cls; e._c = w.cls; if(w.style) e.setAttribute('style', w.style); }
    _v.set(w.x, w.y, w.z).project(camera);
    const vis = _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2;
    e.style.display = vis ? '' : 'none';
    if(vis){ e.style.transform = `translate(${((_v.x * .5 + .5) * SW).toFixed(1)}px,${((-_v.y * .5 + .5) * SH).toFixed(1)}px) translate(-50%,-100%)`; if(w.style) e.style.setProperty('--h', w.style.split(':')[1]); }
  }
  for(const [id, e] of tagEls) if(!seen.has(id)){ e.remove(); tagEls.delete(id); }
}

/* ======================================================================
   Station panel (bottom): cashier register, cook steps, boxing table
   ====================================================================== */
const panelEl = $('#panel');
let panelKey = '', panelMode = '', hintNext = 0;
const panelOn = () => !panelEl.hidden;
function panelWanted(){
  if(state !== 'play') return '';
  const j = ME.job;
  if(j === 'cashier' && dist(POS.cashier.x, POS.cashier.z) < 2.2) return 'cash';
  if(j === 'cook' && ((ME.task && ME.task.k === 'cook') || (P.z < -3.4 && P.x < 4 && P.x > -10))) return 'cook';
  if(j === 'boxer' && dist(POS.pass.sx, POS.pass.sz) < 2.4) return 'box';
  return '';
}
function shakeBtn(k){ const b = panelEl.querySelector(`[data-k="${k}"]`); if(b){ b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); } }
const pbtn = (k, on, extra = '') => `<button class="pb${extra}" data-k="${k}"${on ? '' : ' disabled'}>${ITEM_E[k] || k}</button>`;
const RC = 2 * Math.PI * 40;
const ringSvg = () => `<svg class="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#f3dfb4"/><circle cx="50" cy="50" r="40" stroke="#5ed6a0" stroke-dasharray="${RC * (GREEN[1] - GREEN[0])} ${RC}" stroke-dashoffset="${-RC * GREEN[0]}" transform="rotate(-90 50 50)"/><circle cx="50" cy="50" r="40" stroke="#ff9a3a" stroke-dasharray="${RC * (1 - GREEN[1])} ${RC}" stroke-dashoffset="${-RC * GREEN[1]}" transform="rotate(-90 50 50)" opacity=".35"/><circle id="ringP" cx="50" cy="50" r="27" fill="none" stroke="#e8304f" stroke-width="10" stroke-dasharray="0 ${2 * Math.PI * 27}" transform="rotate(-90 50 50)"/><text id="ringT" x="50" y="60" text-anchor="middle" font-size="30">🔥</text></svg>`;
function waitMsg(e, a, b, c){ return `<div class="wait"><i>${e}</i>${L(a, b, c)}</div>`; }
function renderPanel(mode){
  const j = ME.job, t = ME.task;
  let html = '', key = mode;
  if(mode === 'cash'){
    const o = currentAsk();
    const picks = o && t && t.k === 'cash' && t.oid === o.id ? t.picks : [];
    const hint = o && ((t && t.oid === o.id && t.miss) || SAVE.served < 3) ? wantCash(o).find(k => !picks.includes(k)) : null;
    key += '|' + (o ? o.id : 0) + '|' + picks.join(',') + '|' + hint + menuKey();
    if(key === panelKey) return; panelKey = key;
    html = `<h3>🧾 ${JOBS.cashier.name}${o ? (o.type === 'go' ? ' · 📞 ' + hsBadge(o.h) : ' · 🙂') : ''}</h3>`;
    if(!o) html += waitMsg('⏳', 'استنّى زبون…', 'Waiting for a customer…', 'Müşteri bekleniyor…');
    else {
      html += `<div class="want">${o.vip ? '<i>👑</i>' : ''}${wantHtml(wantCash(o), picks)}</div>`;
      const btn = k => `<button class="pb${k === hint ? ' hint' : ''}" data-k="${k}">${ITEM_E[k]}</button>`;
      html += `<div class="pbtns">${['pizza', 'burger'].filter(menuOn).map(btn).join('')}<span class="pb sep" style="visibility:hidden;min-width:0;width:0;padding:0"></span>${TOP_IDS.filter(menuOn).map(btn).join('')}<span style="width:8px"></span>${['juice', 'ice'].filter(menuOn).map(btn).join('')}</div>`;
    }
    panelEl.innerHTML = html;
    panelEl.querySelectorAll('[data-k]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cashTap(b.dataset.k); }));
    return;
  }
  if(mode === 'cook'){
    if(!t || t.k !== 'cook'){
      const list = ORD.filter(o => o.st === 'cook' && !o.by);
      key += '|list|' + list.map(o => o.id).join(',');
      if(key === panelKey) return; panelKey = key;
      html = `<h3>🧑‍🍳 ${JOBS.cook.name}</h3>` + (list.length ? `<div class="tlist">${list.slice(0, 4).map((o, i) => `<button class="tbtn${i === 0 ? ' pb hint' : ''}" style="height:auto" data-o="${o.id}"><span class="it">${o.vip ? '👑' : ''}${itemsHtml(o)}</span></button>`).join('')}</div>` : waitMsg('⏳', 'استنّى طلب من الكاشير…', 'Waiting for an order…', 'Sipariş bekleniyor…'));
      panelEl.innerHTML = html;
      panelEl.querySelectorAll('[data-o]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); cookStart(+b.dataset.o); }));
      return;
    }
    const at = atStep();
    key += '|' + t.oid + '|' + t.step + '|' + at + '|' + t.taps + '|' + t.picks.join(',') + '|' + t.on + menuKey();
    if(key === panelKey) return; panelKey = key;
    const head = t.m === 'burger' ? '🍔' : `🍕 ${t.t.map(k => `<span style="opacity:${t.picks.includes(k) ? .35 : 1}">${ITEM_E[k]}</span>`).join('')}`;
    html = `<h3>${head}</h3>`;
    if(!at){ html += t.step === 'pass' ? waitMsg('🚶', 'عالتغليف…', 'To the boxing table…', 'Paket masasına…') : `<div class="pbtns"><button class="pb big go" id="pGo">▶️</button></div>`; }
    else if(t.step === 'dough'){ html += `<div class="pbtns"><button class="pb big hot hint" id="pDough">👊</button></div><div class="dots">${Array.from({ length:DOUGH_TAPS }, (_, i) => `<b class="${i < t.taps ? 'on' : ''}"></b>`).join('')}</div>`; }
    else if(t.step === 'tops'){
      const hint = t.t.find(k => !t.picks.includes(k));
      html += `<div class="pbtns">${TOP_IDS.filter(menuOn).map(k => `<button class="pb${k === hint ? ' hint' : ''}" data-k="${k}">${ITEM_E[k]}</button>`).join('')}${!t.t.length ? '<button class="pb go hint" data-k="ok">✅</button>' : ''}</div>`;
    }
    else if(t.step === 'oven' || t.step === 'grill'){
      html += `<div class="ringbox">${ringSvg()}${t.on ? `<button class="pb big go" id="pOut">🧤</button>` : `<button class="pb big hot hint" id="pIn">${t.step === 'grill' ? '🥩' : '🔥'}</button>`}</div>`;
    }
    else html += waitMsg('🚶', 'عالتغليف…', 'To the boxing table…', 'Paket masasına…');
    panelEl.innerHTML = html;
    const on = (id, f) => { const b = $('#' + id); if(b) b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); f(); }); };
    on('pDough', doughTap); on('pIn', ovenIn); on('pOut', ovenOut);
    on('pGo', () => { const S = STEP_AT[t.step]; walkTo(S.sx, S.sz, .2, () => { P.face = S.f; panelKey = ''; }); });
    panelEl.querySelectorAll('[data-k]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); topTap(b.dataset.k); }));
    return;
  }
  if(mode === 'box'){
    if(!t || t.k !== 'box'){
      const list = ORD.filter(o => o.st === 'box' && !o.by);
      key += '|list|' + list.map(o => o.id).join(',');
      if(key === panelKey) return; panelKey = key;
      html = `<h3>📦 ${JOBS.boxer.name}</h3>` + (list.length ? `<div class="tlist">${list.slice(0, 4).map((o, i) => `<button class="tbtn${i === 0 ? ' pb hint' : ''}" style="height:auto" data-o="${o.id}"><span class="it">${itemsHtml(o)}</span><span class="sg">${o.type === 'go' ? '📦 ' + hsBadge(o.h) : '🍽️'}</span></button>`).join('')}</div>` : waitMsg('⏳', 'استنّى الطبّاخ…', 'Waiting for the cook…', 'Aşçı bekleniyor…'));
      panelEl.innerHTML = html;
      panelEl.querySelectorAll('[data-o]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); boxStart(+b.dataset.o); }));
      return;
    }
    const o = orderById(t.oid); if(!o){ ME.task = null; return; }
    const want = wantBox(o), hint = want.find(k => !t.picks.includes(k));
    key += '|' + t.oid + '|' + t.picks.join(',') + menuKey();
    if(key === panelKey) return; panelKey = key;
    html = `<h3>${ITEM_E[o.m]} ${o.type === 'go' ? '· 📦 ' + hsBadge(o.h) : '· 🍽️'}</h3><div class="want">${wantHtml(want, t.picks)}</div>
      <div class="pbtns">${['plate', 'box', 'juice', 'ice'].filter(k => k !== 'ice' || menuOn('ice') || o.i).map(k => `<button class="pb${k === hint ? ' hint' : ''}" data-k="${k}">${ITEM_E[k]}</button>`).join('')}</div>`;
    panelEl.innerHTML = html;
    panelEl.querySelectorAll('[data-k]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); boxTap(b.dataset.k); }));
  }
}
const menuKey = () => MENU_IDS.map(k => menuOn(k) ? 1 : 0).join('');
function panelFrame(){
  const mode = panelWanted();
  if(mode !== panelMode){ panelMode = mode; panelKey = ''; }
  if(!mode){ if(!panelEl.hidden){ panelEl.hidden = true; actKey = ''; } return; }
  if(panelEl.hidden){ panelEl.hidden = false; actKey = ''; }
  renderPanel(mode);
  const t = ME.task;
  if(t && t.k === 'cook' && (t.step === 'oven' || t.step === 'grill')){
    const rp = $('#ringP'), rt = $('#ringT');
    if(rp){ const C2 = 2 * Math.PI * 27, p = t.on ? clamp(t.p, 0, 1) : 0; rp.setAttribute('stroke-dasharray', `${C2 * p} ${C2}`); rp.setAttribute('stroke', p > GREEN[1] ? '#5a3a22' : p >= GREEN[0] ? '#1f9d55' : '#ff9a3a'); if(rt) rt.textContent = p > GREEN[1] ? '💨' : p >= GREEN[0] ? '✅' : (t.step === 'grill' ? '🥩' : '🔥'); }
  }
}

/* ======================================================================
   Cards: menu, hero picker, job board, decorations, pause, the special order
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on;
  if(!on){ actBtn.hidden = true; actKey = ''; panelEl.hidden = true; panelMode = ''; }
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
function showMenu(){
  if(MP.t){ mpLeave(true); }
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('rest_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🍕</div><h1>${L('مطعم بوبو', 'Bobo Restaurant', 'Bobo Restoranı')}</h1>
    <p class="sub">${L('اختار شغلة، اعمل بيتزا، ووصّل الطلبات!', 'Pick a job, make pizza and deliver orders!', 'Bir görev seç, pizza yap, siparişleri götür!')}</p>
    <div class="row"><div class="mine"><span>${COIN} ${N(SAVE.coins)}</span><span>⭐ ${N(SAVE.stars)}</span><span>🍽️ ${N(SAVE.served)}</span>${SAVE.vipDay !== today() ? `<span>👑 ${L('طلب خاص اليوم', "Today's special", 'Günün özeli')}</span>` : ''}</div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  $('#bPlay').onclick = () => { ac(); MUS.on = true; SFX.tap(); startPlay(); };
  $('#bMp').onclick = () => { ac(); MUS.on = true; SFX.tap(); mpMenu(); };
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
    SFX.tap(); heroId = selPick; SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setActorHero(me, selPick);
    if(mpActive()) mpTrack();
    if(selFrom === 'pause') resume();
    else if(selFrom === 'mp') mpMenu(); else showMenu();
  };
}
/* the job board: who is doing what (friends or helpers) */
function whoDoes(j){
  const out = [];
  if(mpActive()) for(const p of MP.players) if(p.job === j && p.id !== MP.id) out.push(`<img src="${charImg(p.hero)}" alt="" style="--c:${MCOL[p.c] || '#fff'}">`);
  const b = BOTS.find(b => b.job === j); if(b && j !== ME.job) out.push(`<img src="${charImg(b.hero)}" alt="" style="--c:#ddd">`);
  return out.join('');
}
function openJobs(first){
  if(isAuth()) syncBots();
  openCard(true);
  const cur = ME.job;
  card.innerHTML = `${first ? '' : xBtn}<h2>🔄 ${L('اختار شغلتك', 'Pick your job', 'Görevini seç')}</h2>
    <div class="jobs">${JOB_IDS.map(j => `<button class="job${j === cur ? ' on' : ''}" data-j="${j}"><span class="em">${JOBS[j].e}</span><b>${JOBS[j].name}</b><small>${JOBS[j].info}</small><span class="who">${whoDoes(j)}</span></button>`).join('')}</div>
    <p>🤖 ${L('المساعدين بيعملوا الشغلات التانية', 'Helpers do the other jobs', 'Yardımcılar diğer görevleri yapar')}</p>`;
  wireX();
  card.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { SFX.tap(); closeCard(); setJob(b.dataset.j); });
}
let decoTab = 'wall';
function openDeco(msg){
  openCard(true);
  const tabs = DECOR_IDS.concat(['menu']);
  const tabBtn = c => `<button data-t="${c}" class="${c === decoTab ? 'on' : ''}">${c === 'menu' ? '🍕' : DECOR[c].e}</button>`;
  let grid;
  if(decoTab === 'menu'){
    grid = `<div class="deco">${MENU_IDS.map(k => { const have = !!SAVE.menu[k], price = menuPrice(k);
      return `<button class="item${have ? ' on' : SAVE.coins < price ? ' poor' : ''}" data-m="${k}"><span class="em">${menuE(k)}</span><b>${menuName(k)}</b>${have ? `<small>✅ ${L('عالمنيو', 'On the menu', 'Menüde')}</small>` : coinTag(price)}</button>`; }).join('')}</div>`;
  } else {
    const D = DECOR[decoTab];
    grid = `<div class="deco">${Object.keys(D.items).map(i => { const it = D.items[i], have = owned(decoTab, i), on = SAVE.decor[decoTab] === i;
      const look = it.col ? `<span class="swatch" style="background:${it.col}"></span>` : `<span class="em">${it.em}</span>`;
      return `<button class="item${on ? ' on' : !have && SAVE.coins < it.price ? ' poor' : ''}" data-d="${i}">${look}<b>${it.name}</b>${on ? `<small>✅</small>` : have ? `<small>👆 ${L('حطّها', 'Use', 'Kullan')}</small>` : coinTag(it.price)}</button>`; }).join('')}</div>`;
  }
  card.innerHTML = `${xBtn}<h2>🎨 ${L('زيّن مطعمك', 'Decorate your restaurant', 'Restoranını süsle')}</h2><p>${coinTag(SAVE.coins)}</p>
    <div class="tabs">${tabs.map(tabBtn).join('')}</div>${grid}
    <p class="mp-msg" id="decoMsg">${msg || (hostView ? L('هاد لمطعمك إنت 🏠', 'This is for your own restaurant 🏠', 'Bu senin restoranın için 🏠') : '')}</p>`;
  wireX();
  card.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { SFX.tap(); decoTab = b.dataset.t; openDeco(); });
  card.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const r = buyDecor(decoTab, b.dataset.d); if(r) openDeco(r === 'buy' ? '✨' : ''); else { SFX.bonk(); $('#decoMsg').textContent = L('بدّك قروش أكتر 💰', 'You need more coins 💰', 'Daha çok para 💰 lazım'); } });
  card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m; if(SAVE.menu[k]){ SFX.tap(); return; } if(buyMenu(k)) openDeco('✨ ' + menuE(k) + ' ' + L('صار عالمنيو!', 'is on the menu!', 'menüde!')); else { SFX.bonk(); $('#decoMsg').textContent = L('بدّك قروش أكتر 💰', 'You need more coins 💰', 'Daha çok para 💰 lazım'); } });
}
function buyDecor(c, i){
  const it = DECOR[c] && DECOR[c].items[i]; if(!it) return false;
  if(owned(c, i)){ SAVE.decor[c] = i; persist(); SFX.tap(); return 'use'; }
  if(SAVE.coins < it.price) return false;
  SAVE.coins -= it.price; SAVE.own[c + ':' + i] = 1; SAVE.decor[c] = i; persist(); SFX.buy(); hudKey = ''; stDirty = true;
  burst(0, 3, 2, 40, CONFETTI, 6, 1.1);
  return 'buy';
}
function buyMenu(k){
  if(!MENU_IDS.includes(k) || SAVE.menu[k]) return false;
  const price = menuPrice(k); if(SAVE.coins < price) return false;
  SAVE.coins -= price; SAVE.menu[k] = 1; persist(); SFX.buy(); SFX.magic(); hudKey = ''; panelKey = ''; stDirty = true;
  return true;
}
function vipCard(stars){
  openCard(false);
  card.className = 'card vipcard';
  card.innerHTML = `<div class="giftbig">👑</div><h2>${L('خلّصتوا الطلب الخاص!', 'Special order done!', 'Özel sipariş tamam!')}</h2>
    <div class="bigstars">${[0, 1, 2].map(i => i < stars ? '⭐' : '<s>⭐</s>').join('')}</div>
    <p style="font-size:24px;direction:ltr">+${N(VIP_COINS)} ${COIN} · +${N(VIP_WORLD)} 🪙</p>
    <button class="big-btn" id="bOk">🎉 ${L('يا سلام!', 'Hooray!', 'Yaşasın!')}</button>`;
  SFX.magic(); burst(P.x, 2, P.z, 50, CONFETTI, 6, 1.2);
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); };
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
$('#btnJob').onclick = () => { if(state !== 'play') return; SFX.tap(); openJobs(); };
$('#btnDeco').onclick = () => { if(state !== 'play') return; SFX.tap(); openDeco(); };
function startPlay(){
  if(ROT) rawSet('rest_rothint', '1');
  overlay.hidden = true; cam.yaw = 0; cam.pAdj = 0; snapCam = true;
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  const first = !SAVE.tut.hi;
  if(first){ SAVE.tut.hi = 1; persist(); }
  openJobs(true);
  say(first ? LINES.hi : LINES.back, first ? 5000 : 2500, true);
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function simStep(dt){
  const live = state !== 'menu' && state !== 'select' && (state === 'play' || mpActive());
  if(live && isAuth()) hostTick(dt);
  if(state === 'play'){ readInput(dt); stepPlayer(dt); }
  else { P.vx = P.vz = 0; P.move = lerp(P.move, 0, Math.min(1, dt * 10)); }
  cookFrame(dt);
  ME.cheerCD = Math.max(0, ME.cheerCD - dt);
  pendingTick(dt);
}
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  simStep(dt);
  const t = ME.task, cooking = t && t.k === 'cook';
  const carry = P.carry || (cooking && t.m === 'pizza' && !atStep() && t.step ? 'hands' : '');
  const work = (cooking && atStep() && (t.step === 'dough' || t.step === 'tops')) || (panelMode === 'box' && t && t.k === 'box');
  poseActor(me, dt, P.x, P.z, P.face, P.move, carry, P.bike, { work });
  if(state === 'play'){ updateActBtn(); hudFrame(); panelFrame(); saveT += dt; if(saveT > 8) persist(); }
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = Math.sin(menuT * .12) * .35, ox = ((window.I18N && I18N.dir) || 'rtl') === 'rtl' ? -6.5 : 6.5;
    camera.position.set(ox * .4 + Math.sin(a) * 12, 13, 4 + Math.cos(a) * 18); camera.lookAt(ox, 0, -.5); camLook.set(ox, 0, -.5); aimSun(0, -1);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  applyDecor(hostView ? hostView.decor : SAVE.decor);
  { const show = camera.position.z > 8.6 && !(state === 'play' && !isOutside(P.x, P.z) && camera.position.z < 16); frontFrame.visible = signM.visible = show; for(const g of glowSprites) if(g.isSprite) g.visible = show; }
  foodFrame(dt); custFrame(dt); botsFrame(dt); residentsFrame(dt);
  animGuide(); tagsFrame(dt);
  mpFrame(dt);
  updateParts(dt); updatePuffs(dt); updateFloaters(dt);
  musicTick();
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   The room owner runs the restaurant (orders, customers, helpers) and sends it 5× a second (st);
   friends send what they do (in) and get an answer (res). Events: pos, st, in, res, fx.
   No names, no chat: a player is a character + a colour badge + a job icon.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'st', 'in', 'res', 'fx'];
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-rest-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-rest-' + code);
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
      for(const [k, p] of this.peers) if(now - p.last > 12000){ this.peers.delete(k); ch = true; }
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, stT:0, inviteFor:null, typed:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'restaurant';
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
/* friends in the room: their character, what they carry, their bike */
const RM = new Map();
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = makeActor(p.hero); Object.assign(a, { id:p.id, tx:0, tz:4, tf:Math.PI, tm:0, rx:0, rz:4, rf:Math.PI, rm:0, carry2:'', bike2:false, seen:false }); RM.set(p.id, a); }
    a.c = p.c; a.job = p.job;
    setActorHero(a, p.hero);
  }
  for(const [id, a] of RM) if(!here.has(id)){ removeActor(a); RM.delete(id); }
  hudKey = '';
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
  remoteSync();
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
  MP.meta = { fc:BoboRT.fc(), hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play', job:ME.job || '' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  if(how === 'join'){ ORD = []; CUST = []; BOTS = []; }
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.job = ME.job || ''; MP.t.track(MP.meta); hudKey = ''; } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
/* saved names: each player's friend code is in the presence meta, the name behind it comes from the server (../rt.js) */
function mpNamesIn(){ hudKey = ''; }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  BoboRT.see(list, mpNamesIn);
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me2 = all.findIndex(p => p.id === MP.id);
  if(me2 >= MP_MAX){ mpLeave(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); say(L('صاحب المطعم طلع 🚪 رجعنا عمطعمك', 'The restaurant owner left 🚪 back to your restaurant', 'Restoran sahibi çıktı 🚪 kendi restoranına döndün'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.flag(); if(MP.isHost){ stDirty = true; say(L('صاحبك إجا يشتغل معك! 🍕', 'A friend came to work with you! 🍕', 'Bir arkadaşın seninle çalışmaya geldi! 🍕'), 3500, panelOn()); } }
  remoteSync(); hudKey = '';
}
/* the room owner's restaurant, packed small */
const ST_IDS = ['ask', 'cook', 'box', 'ready', 'out', 'done'], CST_IDS = ['in', 'q', 'order', 'wait', 'grab', 'seat', 'eat', 'out'];
function packState(){
  return { o:ORD.map(o => [o.id, o.n, o.type === 'go' ? 1 : 0, o.m === 'burger' ? 1 : 0, o.t.map(t => TOP_IDS.indexOf(t)).join(''), o.d, o.i, o.h, ST_IDS.indexOf(o.st), o.by || '', o.cust, o.miss, o.burnt, o.vip, o.slot, o.stars, Math.round(o.t0 * 10) / 10]),
    c:CUST.map(c => [c.id, c.v, c.vip, r2(c.x), r2(c.z), r2(c.f), r2(c.m), CST_IDS.indexOf(c.st), c.oid, c.seat, c.carry]),
    b:BOTS.map(b => [b.job, b.hero, r2(b.x), r2(b.z), r2(b.f), r2(b.m), b.carry, b.bike ? 1 : 0, b.ph]),
    dec:SAVE.decor, u:MENU_IDS.filter(k => SAVE.menu[k]).join(','), ch:cheerT > 0 ? 1 : 0 };
}
function mpState(){ if(!mpActive() || !MP.isHost) return; stDirty = false; MP.stT = .2; mpSend('st', packState()); }
function applyState(p){
  if(!Array.isArray(p.o) || !Array.isArray(p.c) || !Array.isArray(p.b)) return;
  ORD = p.o.filter(Array.isArray).map(a => ({ id:a[0] | 0, n:a[1] | 0, type:a[2] ? 'go' : 'dine', m:a[3] ? 'burger' : 'pizza', t:String(a[4] || '').split('').map(i => TOP_IDS[+i]).filter(Boolean), d:a[5] ? 1 : 0, i:a[6] ? 1 : 0,
    h:clamp(a[7] | 0, -1, HOUSE_X.length - 1), st:ST_IDS[a[8]] || 'ask', by:typeof a[9] === 'string' && a[9] ? a[9] : null, cust:a[10] | 0, miss:a[11] | 0, burnt:a[12] | 0, vip:a[13] ? 1 : 0, slot:clamp(a[14] | 0, 0, 3), stars:clamp(a[15] | 0, 0, 3), t0:+a[16] || 0 }));
  const old = new Map(CUST.map(c => [c.id, c]));
  CUST = p.c.filter(Array.isArray).map(a => { const c = old.get(a[0] | 0) || { id:a[0] | 0 }; return Object.assign(c, { v:a[1] | 0, vip:a[2] ? 1 : 0, x:clamp(+a[3] || 0, -45, 45), z:clamp(+a[4] || 0, -10, 30), f:+a[5] || 0, m:clamp(+a[6] || 0, 0, 1), st:CST_IDS[a[7]] || 'in', oid:a[8] | 0, seat:clamp(a[9] | 0, -1, SEATS.length - 1), carry:a[10] ? 1 : 0 }); });
  BOTS = p.b.filter(a => Array.isArray(a) && JOBS[a[0]]).map(a => ({ job:a[0], hero:HEROES[a[1]] ? a[1] : 'sara', x:clamp(+a[2] || 0, -45, 45), z:clamp(+a[3] || 0, -10, 30), f:+a[4] || 0, m:clamp(+a[5] || 0, 0, 1), carry:CARRY_OK.includes(a[6]) ? a[6] : '', bike:!!a[7], ph:String(a[8] || '') }));
  const dec = {}; for(const c of DECOR_IDS){ const v = p.dec && p.dec[c]; dec[c] = DECOR[c].items[v] ? v : Object.keys(DECOR[c].items)[0]; }
  const menu = {}; String(p.u || '').split(',').forEach(k => { if(MENU_IDS.includes(k)) menu[k] = 1; });
  hostView = { decor:dec, menu };
  cheerT = p.ch ? 1 : 0;
  for(const o of ORD) if(o.st === 'done') onOrderDone(o);
  const t = ME.task;
  if(t && t.claimed && !t.sent){ const o = orderById(t.oid); if(!o || (o.by && o.by !== MP.id)){ ME.task = null; P.carry = ''; panelKey = ''; say(L('صاحبك عملها 👍', 'A friend did it 👍', 'Arkadaşın yaptı 👍'), 2500, panelOn()); } }
}
const CARRY_OK = ['', 'dough', 'pizzaRaw', 'pizza', 'burger', 'box', 'tray', 'patty'];
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){ if(!a) return; a.tx = clamp(+p.x || 0, -45, 45); a.tz = clamp(+p.z || 0, -10, 30); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1); a.carry2 = CARRY_OK.includes(p.c) ? p.c : ''; a.bike2 = !!p.b; if(!a.seen){ a.seen = true; a.rx = a.tx; a.rz = a.tz; } }
  else if(ev === 'st'){ if(MP.isHost || p.id !== MP.hostId) return; applyState(p); }
  else if(ev === 'in'){ if(!MP.isHost || !RM.has(p.id)) return; const r = hostApply(p.id, String(p.op), p); mpSend('res', { to:p.id, rid:p.rid, ok:r.ok, coins:r.coins, op:p.op, wrong:!!r.wrong }); if(r.ok) mpState(); }
  else if(ev === 'res'){ if(p.to !== MP.id) return; const q = pending.get(p.rid); if(q){ pending.delete(p.rid); if(q.cb) q.cb({ ok:!!p.ok, coins:clamp(p.coins | 0, 0, 20), wrong:!!p.wrong }); } }
  else if(ev === 'fx'){ if(!a) return; if(p.k === 'cheer'){ burst(a.rx, 2, a.rz, 30, CONFETTI, 4, 1); floatIcon('note', a.rx, 2.2, a.rz, 3, .4); SFX.cheer(); } }
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && state !== 'menu' && state !== 'select'){ MP.sendT = .12; mpSend('pos', { x:r2(P.x), z:r2(P.z), f:r2(P.face), m:r2(P.move), c:P.carry || (ME.task && ME.task.k === 'cook' && ME.task.step === 'pass' ? 'pizza' : ''), b:P.bike ? 1 : 0 }); }
  if(MP.isHost){ MP.stT -= dt; if(MP.stT <= 0 || (stDirty && MP.stT < .1)) mpState(); }
  for(const a of RM.values()){
    const k = 1 - Math.exp(-10 * dt);
    if(Math.hypot(a.rx - a.tx, a.rz - a.tz) > 8){ a.rx = a.tx; a.rz = a.tz; }
    a.rx = lerp(a.rx, a.tx, k); a.rz = lerp(a.rz, a.tz, k); a.rf += angDiff(a.tf, a.rf) * k; a.rm = lerp(a.rm, a.tm, k);
    poseActor(a, dt, a.rx, a.rz, a.rf, a.rm, a.carry2, a.bike2);
  }
}
function mpLeave(silent){
  const wasGuest = mpActive() && !MP.isHost;
  MP.tok++; mpClose(); MP.screen = 'off';
  if(wasGuest || hostView){ hostView = null; ORD = []; CUST = []; BOTS = []; spawnT = SPAWN_FIRST; if(ME.task) { ME.task = null; P.carry = ''; } }
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  if(hostView){ hostView = null; ORD = []; CUST = []; BOTS = []; }
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🍕 ${L('كل واحد بياخد شغلة، وبتشتغلوا سوا بنفس المطعم', 'Everyone picks a job and you work together in one restaurant', 'Herkes bir görev seçer, aynı restoranda birlikte çalışırsınız')}</p>
    <button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
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
  startPlay();
  if(MP.isHost){ stDirty = true; mpState(); say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000, true); }
  else say(L('أهلا! هاد مطعم صاحبك 🍕 اختار شغلة وساعدو!', "Welcome! This is your friend's restaurant 🍕 Pick a job and help!", 'Hoş geldin! Burası arkadaşının restoranı 🍕 Bir görev seç ve yardım et!'), 5000, true);
}
async function mpCreate(){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(r === 'ok'){ mpEnter(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(mpCreate); }
}
async function mpJoin(code){
  mpConnecting();
  try{
    const r = await mpOpen(code, 'join');
    if(MP.screen !== 'connecting') return;
    if(r === 'ok') mpEnter();
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'restaurant' yet: guarded. */
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

/* ---------- test hook ---------- */
const ordView = o => ({ id:o.id, type:o.type, m:o.m, t:o.t.slice(), d:o.d, i:o.i, h:o.h, st:o.st, by:o.by, vip:o.vip, stars:o.stars, miss:o.miss, burnt:o.burnt, cust:o.cust });
window.__rest = {
  get state(){ return state; }, get simT(){ return simT; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:() => startPlay(), closeCard:() => closeCard(),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), get coins(){ return SAVE.coins; }, addCoins(n){ SAVE.coins += n; hudKey = ''; persist(); },
  setJob:j => { if(state !== 'play') closeCard(); setJob(j); }, get job(){ return ME.job; }, get task(){ return ME.task ? JSON.parse(JSON.stringify(ME.task)) : null; },
  get orders(){ return ORD.map(ordView); }, get customers(){ return CUST.map(c => ({ id:c.id, st:c.st, x:c.x, z:c.z, oid:c.oid, vip:c.vip, seat:c.seat })); },
  get bots(){ return BOTS.map(b => ({ job:b.job, hero:b.hero, ph:b.ph, x:b.x, z:b.z, carry:b.carry, bike:b.bike })); },
  spawn:(kind, want) => kind === 'phone' ? ordView(spawnPhone(want)) : (spawnCustomer(kind === 'vip', want), true),
  pauseSpawns(on){ spawnT = on ? 1e9 : 2; },
  tick(sec){ let s = sec; while(s > 0){ const d = Math.min(.05, s); T += d; simStep(d); s -= d; } },
  P, tp(x, z, f){ P.x = x; P.z = z; if(f != null) P.face = f; P.goal = null; P.vx = P.vz = 0; snapCam = true; },
  POS, RING, HOUSE_X, currentAsk:() => { const o = currentAsk(); return o ? ordView(o) : null; }, wantCash:id => wantCash(orderById(id)), wantBox:id => wantBox(orderById(id)),
  cashTap:k => cashTap(k), cookStart:oid => cookStart(oid), doughTap:() => doughTap(), topTap:k => topTap(k), ovenIn:() => ovenIn(), ovenOut:() => ovenOut(), setOven(p){ if(ME.task) ME.task.p = p; }, atStep:() => atStep(),
  boxStart:oid => boxStart(oid), boxTap:k => boxTap(k), delTake:() => delTake(), ring:h => delRing(h), cheer:() => cheer(), get cheerT(){ return cheerT; },
  get panel(){ return panelEl.hidden ? '' : panelMode; }, get act(){ return ctxNow ? ctxNow.k : ''; }, doAction:() => doAction(),
  buyDecor:(c, i) => buyDecor(c, i), buyMenu:k => buyMenu(k), deco:t => { if(t) decoTab = t; openDeco(); }, jobs:() => openJobs(), get decoKey(){ return decoKey; }, get wallColor(){ return '#' + wallMat.color.getHexString(); },
  vip:() => { spawnCustomer(true); }, menuOn:k => menuOn(k), pause:() => showPause(),
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, players:MP.players.map(p => ({ id:p.id, hero:p.hero, job:p.job })), remotes:[...RM.values()].map(a => ({ id:a.id, x:a.rx, z:a.rz, job:a.job, bike:a.bike2, carry:a.carry2 })), hostView:!!hostView }; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ shotCam = v ? { p:[v[0], v[1], v[2]], l:[v[3], v[4], v[5]] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; }, say:(t, ms) => say(t, ms)
};

/* ---------- boot ---------- */
buildWorld();
applyDecor(SAVE.decor);
me = makeActor(heroId);
ME.job = SAVE.job;
resize();
showMenu();
requestAnimationFrame(frame);
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(); }
})();
