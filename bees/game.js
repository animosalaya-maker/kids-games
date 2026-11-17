/* Bobo Bees («نحلات بوبو 🐝») — main game.
   A sunny meadow: your bee house (25 honeycomb slots), the honey shop, Pando the panda with quests,
   and six flower fields (sunflowers, clover, daisies, roses, blue flowers, pines & mushrooms) that open as your swarm grows.
   Walk into a field: your bees fly to the flowers and bring pollen to your backpack; your tool collects too.
   At the hive press «اعمل عسل» to turn pollen into honey. Spend honey on bigger backpacks, better tools, eggs and treats.
   Hatch eggs into 10 cute bee types; feed treats to level them up. Friendly ladybugs and snails visit the fields:
   shoo them gently for treats. Online rooms (Supabase presence; ?mp=local = BroadcastChannel): everyone sees each
   other's swarm, and 2+ friends in the same field get a shared pollen boost. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeBeeModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const BM = makeBeeModels(THREE, K);
const { MAT, BEES, RAR } = BM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const HONEY = '🍯', TREAT = '🍬';
const BEE_BY = {}; BEES.forEach(b => { BEE_BY[b.id] = b; });

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const S = 1.3;                                 // flower cell spacing
const FIELDS = [
  { id:'sun',    e:'🌻', name:L('دوّار الشمس', 'Sunflowers', 'Ayçiçekleri'),  need:0,  x:0,     z:-9,  c:9, r:7, mult:1,   ground:0xb4dc6e, pol:0xffd23f },
  { id:'clover', e:'☘️', name:L('البرسيم', 'Clover', 'Yonca'),               need:3,  x:-15.5, z:-6,  c:8, r:7, mult:1.4, ground:0x96d46e, pol:0xffe6f0 },
  { id:'daisy',  e:'🌼', name:L('الأقحوان', 'Daisies', 'Papatyalar'),        need:5,  x:15.5,  z:-6,  c:8, r:7, mult:1.8, ground:0xa3da76, pol:0xffffff },
  { id:'rose',   e:'🌹', name:L('الورد', 'Roses', 'Güller'),                 need:8,  x:-15.5, z:-21, c:8, r:7, mult:2.4, ground:0x8fcf66, pol:0xff7b8e },
  { id:'blue',   e:'💙', name:L('الزهر الأزرق', 'Blue flowers', 'Mavi çiçekler'), need:12, x:15.5, z:-21, c:8, r:7, mult:3, ground:0x8fd07c, pol:0x8fb2ff },
  { id:'pine',   e:'🍄', name:L('الصنوبر والفطر', 'Pines & mushrooms', 'Çam ve mantar'), need:16, x:0, z:-25, c:9, r:6, mult:4, ground:0x86bd62, pol:0xffe0b0 }
];
FIELDS.forEach((F, i) => { F.i = i; F.hw = F.c * S / 2; F.hd = F.r * S / 2; });
const FI = {}; FIELDS.forEach((F, i) => { FI[F.id] = i; });
const FLOWER_H = { sun:1, clover:.45, daisy:.5, rose:.65, blue:.6, pine:.35 };
const TOOLS = [
  { id:'scoop', e:'🥄', name:L('مغرفة', 'Scoop', 'Kepçe'),             pow:1, r:1.25, cd:.75, price:0 },
  { id:'net',   e:'🥅', name:L('شبكة', 'Net', 'Ağ'),                   pow:2, r:1.7,  cd:.7,  price:250 },
  { id:'rake',  e:'🧹', name:L('مشط الزهور', 'Flower rake', 'Çiçek tırmığı'), pow:3, r:2.3, cd:.65, price:1500 },
  { id:'wand',  e:'🪄', name:L('عصا سحرية', 'Magic wand', 'Sihirli değnek'), pow:5, r:2.9, cd:.6, price:6000 }
];
const PACKS = [
  { e:'👝', name:L('جزدان صغير', 'Little pouch', 'Küçük kese'), cap:60,    price:0 },
  { e:'🫙', name:L('مرطبان', 'Jar', 'Kavanoz'),                 cap:180,   price:120 },
  { e:'🎒', name:L('شنطة ضهر', 'Backpack', 'Sırt çantası'),      cap:500,   price:600 },
  { e:'🧺', name:L('سلّة كبيرة', 'Big basket', 'Büyük sepet'),    cap:1400,  price:2500 },
  { e:'🛢️', name:L('برميل', 'Barrel', 'Fıçı'),                   cap:4000,  price:9000 },
  { e:'🎈', name:L('بالون الطلع', 'Pollen balloon', 'Polen balonu'), cap:12000, price:30000 }
];
const SLOTS = 25, MAX_LVL = 10;
const EGGS = {
  basic:{ e:'🥚', name:L('بيضة نحلة', 'Bee egg', 'Arı yumurtası'),   w:{ sunny:22, snow:16, cherry:16, sky:16, zoom:8, honey:8, mint:6, cookie:5, sleepy:3, star:.5 } },
  gold: { e:'🥚', name:L('بيضة ذهبية', 'Golden egg', 'Altın yumurta'), w:{ sunny:3, snow:7, cherry:7, sky:7, zoom:14, honey:14, mint:14, cookie:13, sleepy:12, star:9 } }
};
const eggPrice = k => { const n = SAVE.bees.length, b = Math.round(80 * Math.pow(1.28, Math.max(0, n - 1)) / 10) * 10; return k === 'gold' ? b * 6 : b; };
const TREATS = [[1, 30], [5, 120], [20, 400]];
const lvlMul = l => 1 + .2 * (l - 1);
const xpNeed = l => l * 2;
const BOOST = 1.5;
/* Pando's quests (after the list: endless generated ones) */
const QUESTS = [
  { k:'field', f:'sun', n:100, h:40, t:2 },
  { k:'honey', n:120, h:60, t:2 },
  { k:'bees', n:3, h:120, t:3 },
  { k:'field', f:'sun', n:200, h:100, t:3 },
  { k:'shoo', n:2, h:120, t:4 },
  { k:'field', f:'clover', n:300, h:180, t:4 },
  { k:'feed', n:3, h:200, t:3 },
  { k:'honey', n:1000, h:300, t:5 },
  { k:'field', f:'daisy', n:600, h:400, t:5 },
  { k:'bees', n:8, h:600, t:6, egg:'basic' },
  { k:'field', f:'rose', n:1200, h:900, t:6 },
  { k:'shoo', n:6, h:700, t:6 },
  { k:'field', f:'blue', n:2500, h:2000, t:8 },
  { k:'bees', n:16, h:3000, t:8, egg:'gold' },
  { k:'field', f:'pine', n:5000, h:5000, t:10 }
];
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ---------- save (this device): bees_save v1 ---------- */
const SAVE_KEY = 'bees_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
const okBee = b => b && typeof b === 'object' && BEE_BY[b.t] ? { t:b.t, lvl:clamp(b.lvl | 0, 1, MAX_LVL), xp:clamp(b.xp | 0, 0, 99) } : null;
function freshSave(){
  return { v:SAVE_V, honey:0, pollen:0, pack:0, tool:0, bees:[{ t:'sunny', lvl:1, xp:0 }, { t:'sunny', lvl:1, xp:0 }], treats:2, eggs:{ basic:0, gold:0 },
    fu:['sun'], q:{ i:0, base:0, d:null }, stats:{ pollen:0, honey:0, shoo:0, feed:0, hatch:0, f:{} }, ms:{}, daily:today(), tut:0, hero:null, t:Date.now() };
}
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      const int = (x, max) => clamp(Math.floor(+x || 0), 0, max);
      s.honey = int(s.honey, 99999999); s.pack = int(s.pack, PACKS.length - 1); s.tool = int(s.tool, TOOLS.length - 1);
      s.pollen = clamp(int(s.pollen, 99999999), 0, PACKS[s.pack].cap); s.treats = int(s.treats, 9999);
      s.bees = (Array.isArray(v.bees) ? v.bees : []).map(okBee).filter(Boolean).slice(0, SLOTS); if(!s.bees.length) s.bees = freshSave().bees;
      s.eggs = { basic:int(v.eggs && v.eggs.basic, 999), gold:int(v.eggs && v.eggs.gold, 999) };
      s.fu = ['sun'].concat((Array.isArray(v.fu) ? v.fu : []).filter(id => FI[id] != null && id !== 'sun'));
      const st = v.stats && typeof v.stats === 'object' ? v.stats : {};
      s.stats = { pollen:int(st.pollen, 1e12), honey:int(st.honey, 1e12), shoo:int(st.shoo, 1e9), feed:int(st.feed, 1e9), hatch:int(st.hatch, 1e9), f:{} };
      if(st.f && typeof st.f === 'object') for(const k in st.f) if(FI[k] != null) s.stats.f[k] = int(st.f[k], 1e12);
      const q = v.q && typeof v.q === 'object' ? v.q : {};
      s.q = { i:int(q.i, 9999), base:int(q.base, 1e12), d:q.d && typeof q.d === 'object' && typeof q.d.k === 'string' ? q.d : null };
      s.ms = {}; if(v.ms && typeof v.ms === 'object') for(const k in v.ms) if(/^[a-z]\w{0,12}$/.test(k)) s.ms[k] = 1;
      s.tut = int(s.tut, 9);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; SAVE.t = Date.now(); rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const cap = () => PACKS[SAVE.pack].cap;
const isOpen = f => SAVE.fu.includes(FIELDS[f].id);

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

/* ---------- Sound (tiny synth, no files): effects, a soft swarm buzz and a cheerful little tune ---------- */
let actx = null, muted = rawGet('adv3d_muted') === 'true', buzz = null;
function ac(){
  if(!actx){ try{ actx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ actx = null; } if(actx) makeBuzz(); }
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
function makeBuzz(){
  try{
    const a = actx, g = a.createGain(), f = a.createBiquadFilter(), o1 = a.createOscillator(), o2 = a.createOscillator();
    f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 2;
    o1.type = 'sawtooth'; o1.frequency.value = 196; o2.type = 'sawtooth'; o2.frequency.value = 203;
    g.gain.value = 0; o1.connect(f); o2.connect(f); f.connect(g).connect(a.destination); o1.start(); o2.start();
    buzz = { g, o1, o2 };
  }catch(e){ buzz = null; }
}
function buzzFrame(flying){
  if(!buzz || !actx) return;
  const want = muted || state !== 'play' || document.hidden ? 0 : Math.min(.022, .004 + flying * .0011);
  try{ buzz.g.gain.setTargetAtTime(want, actx.currentTime, .25); buzz.o1.frequency.setTargetAtTime(196 + Math.sin(T * 1.3) * 6, actx.currentTime, .3); }catch(e){}
}
const SCALE = [523, 587, 659, 784, 880, 1046];
const TUNE = [0, 2, 4, 2, 3, 4, 5, 4, 2, 1, 0, 1, 2, 3, 2, -1, 0, 2, 4, 5, 4, 3, 2, 1, 2, 4, 3, 1, 0, -1, 0, -1];
let tuneI = 0;
setInterval(() => {
  if(muted || !actx || actx.state !== 'running' || document.hidden || !(state === 'play' || state === 'menu' || state === 'card')) return;
  const n = TUNE[tuneI % TUNE.length]; tuneI++;
  if(n >= 0) tone(SCALE[n], .22, 'triangle', .022);
  if(tuneI % 4 === 1) tone([131, 165, 175, 147][Math.floor(tuneI / 8) % 4], .4, 'sine', .03);
}, 260);
const SFX = {
  tap(){ tone(520, .05, 'triangle', .08); }, bonk(){ tone(300, .14, 'square', .05, 0, 140); },
  buy(){ [660, 880, 1100].forEach((f, i) => tone(f, .11, 'triangle', .1, i * .06)); },
  swish(){ tone(700, .12, 'sine', .05, 0, 1300); },
  pollen(){ tone(1400 + Math.random() * 300, .05, 'sine', .035); },
  honey(){ [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, .14, 'triangle', .09, i * .07)); },
  pour(){ tone(380, .3, 'sine', .05, 0, 260); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  crack(){ [0, .08, .16].forEach(d => tone(900 - d * 900, .05, 'square', .04, d)); },
  hatch(){ [784, 988, 1175, 1568, 2093].forEach((f, i) => tone(f, .12, 'triangle', .1, i * .08)); },
  yum(){ tone(660, .1, 'sine', .1, 0, 990); tone(990, .12, 'sine', .08, .1, 1320); },
  up(){ [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, .1, 'triangle', .09, i * .06)); },
  boing(){ tone(220, .25, 'sine', .1, 0, 520); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  open(){ [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .1, i * .09)); },
  full(){ tone(440, .15, 'triangle', .07); tone(330, .2, 'triangle', .07, .15); }
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
scene.fog = new THREE.Fog(0xd6f0ff, 48, 125);
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff4dc, 0x86a06a, 1.8); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffeccc, 2.35);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-17, right:17, top:17, bottom:-17, near:1, far:90 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(14, 30, 16);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const skyMat = new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false });
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, skyMat);
  const pa = g.attributes.position, a = new THREE.Color(0x63b9f4), h = new THREE.Color(0xfff0cc), b = new THREE.Color(0xcfeaff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color();
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles (instanced confetti / sparkles / pollen) ---------- */
const PMAX = 320, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
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
/* honey orbs: pollen balls flying from the player into the hive while making honey */
const OMAX = 48, orbs = [], orbMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshStandardMaterial({ color:0xffc52e, emissive:0x8a5a00, emissiveIntensity:.45, roughness:.3 }), OMAX);
orbMesh.frustumCulled = false; scene.add(orbMesh);
for(let i = 0; i < OMAX; i++){ orbs.push({ t:1, d:1, ax:0, ay:0, az:0, bx:0, by:0, bz:0, h:2 }); _m.makeScale(0, 0, 0); orbMesh.setMatrixAt(i, _m); }
let oNext = 0;
function orb(ax, ay, az, bx, by, bz, d = .8, h = 2){ const o = orbs[oNext]; oNext = (oNext + 1) % OMAX; Object.assign(o, { t:0, d, ax, ay, az, bx, by, bz, h }); }
function updateOrbs(dt){
  for(let i = 0; i < OMAX; i++){
    const o = orbs[i]; if(o.t >= o.d){ _m.makeScale(0, 0, 0); orbMesh.setMatrixAt(i, _m); continue; }
    o.t += dt; const k = clamp(o.t / o.d, 0, 1), s = Math.sin(k * Math.PI) * .5 + .5;
    _m.compose(_v.set(lerp(o.ax, o.bx, k), lerp(o.ay, o.by, k) + Math.sin(k * Math.PI) * o.h, lerp(o.az, o.bz, k)), _q.identity(), _s.set(s, s, s)); orbMesh.setMatrixAt(i, _m);
  }
  orbMesh.instanceMatrix.needsUpdate = true;
}
/* floating sprites (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); }),
  zz:iconTex(x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(32, 32, 28, 0, 6.3); x.fill(); x.fillStyle = '#7a5ccc'; x.font = '900 34px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 26, 38); x.font = '900 22px system-ui,sans-serif'; x.fillText('z', 42, 22); }),
  treat:iconTex(x => { x.fillStyle = '#ff8fb1'; x.beginPath(); x.moveTo(6, 22); x.lineTo(18, 32); x.lineTo(6, 42); x.closePath(); x.fill(); x.beginPath(); x.moveTo(58, 22); x.lineTo(46, 32); x.lineTo(58, 42); x.closePath(); x.fill(); x.fillStyle = '#ff5d8f'; x.beginPath(); x.ellipse(32, 32, 16, 13, 0, 0, 6.3); x.fill(); x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(27, 27, 5, 3, -.4, 0, 6.3); x.fill(); }),
  drop:iconTex(x => { x.fillStyle = '#ffb81c'; x.beginPath(); x.moveTo(32, 6); x.bezierCurveTo(46, 24, 52, 34, 52, 40); x.arc(32, 40, 20, 0, Math.PI); x.bezierCurveTo(12, 34, 18, 24, 32, 6); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(25, 40, 5, 8, -.3, 0, 6.3); x.fill(); }),
  bang:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); x.arc(32, 32, 29, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#4a2c00'; x.fillRect(28, 13, 9, 26); x.beginPath(); x.arc(32.5, 48, 5, 0, 6.3); x.fill(); }),
  full:iconTex(x => { x.fillStyle = '#ff6f61'; x.beginPath(); x.arc(32, 32, 29, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#fff'; x.fillRect(20, 24, 24, 26); x.fillRect(26, 16, 12, 8); })
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
   The world: meadow, paths, the bee house, the honey shop, Pando, the fields, trees
   ====================================================================== */
const CIRCLES = [], BOXES = [];
const BX0 = -23.5, BX1 = 23.5, BZ0 = -32, BZ1 = 13.5;
const HIVE = { x:0, z:3.4, fx:0, fz:6.5 }, SHOP = { x:-7.6, z:4.4, fx:-7.6, fz:6.6 }, PANDA = { x:7.6, z:4.2, fx:7.6, fz:6.6 };
const SPAWN = { x:0, z:8.6, f:Math.PI };
let seed = 7;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function roundBox(x, X, Y, W, H, r){ x.beginPath(); x.roundRect(X, Y, W, H, r); }
function signTex(text, bg, fg, icon, w = 512, h = 128){
  return canvasTex(w, h, x => {
    x.fillStyle = bg; roundBox(x, 4, 4, w - 8, h - 8, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 58px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(text, w / 2 + (icon ? 30 : 0), h / 2 + 6, w - (icon ? 150 : 60));
    if(icon) icon(x);
  });
}
function drawBeeIcon(x, cx, cy, r){
  x.fillStyle = 'rgba(255,255,255,.9)'; for(const s of [-1, 1]){ x.beginPath(); x.ellipse(cx + s * r * .45, cy - r * .7, r * .5, r * .32, s * -.5, 0, 6.3); x.fill(); }
  x.fillStyle = '#ffc93c'; x.beginPath(); x.ellipse(cx, cy, r, r * .85, 0, 0, 6.3); x.fill();
  x.save(); x.beginPath(); x.ellipse(cx, cy, r, r * .85, 0, 0, 6.3); x.clip(); x.fillStyle = '#6b4a1a'; x.fillRect(cx - r * .3, cy - r, r * .22, r * 2); x.fillRect(cx + r * .15, cy - r, r * .22, r * 2); x.restore();
  x.fillStyle = '#1d1410'; x.beginPath(); x.arc(cx - r * .6, cy - r * .1, r * .14, 0, 6.3); x.fill();
}
function drawLock(x, cx, cy, r){
  x.strokeStyle = '#fff'; x.lineWidth = r * .28; x.beginPath(); x.arc(cx, cy - r * .3, r * .5, Math.PI, 0); x.stroke();
  x.fillStyle = '#fff'; roundBox(x, cx - r * .8, cy - r * .3, r * 1.6, r * 1.2, r * .25); x.fill();
  x.fillStyle = '#8a7a6a'; x.beginPath(); x.arc(cx, cy + r * .2, r * .18, 0, 6.3); x.fill();
}
function fieldSignTex(F, locked){
  return canvasTex(512, 192, x => {
    x.fillStyle = locked ? '#a89a8a' : '#e0a83a'; roundBox(x, 4, 4, 504, 184, 40); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 56px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(F.name, 256, locked ? 62 : 98, 460);
    if(locked){ drawLock(x, 150, 140, 34); drawBeeIcon(x, 262, 138, 30); x.direction = 'ltr'; x.font = '800 54px "Baloo Bhaijaan 2",system-ui,sans-serif'; x.fillText('×' + N(F.need), 352, 142); }
  });
}
function signBoard(tex, w, h, x, y, z, ry = 0, noPost){
  const M = new Merge(); if(!noPost) M.add(GEO.cyl8, x, (y - h / 2) / 2, z - .05, .07, y - h / 2, .07, 0, 0, 0, 0x9a6b3c);
  M.add(GEO.box, x, y, z - .06, w + .12, h + .12, .08, 0, ry, 0, 0x9a6b3c);
  const post = meshOf(M); world.add(post);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:tex, transparent:true })); m.position.set(x, y, z); m.rotation.y = ry; world.add(m); return m;
}
const world = new THREE.Group(); scene.add(world);
let guideArrow, guideRing, swingRing, slotMesh, pandaM, pandaBang, cloudGrp;
const slotPos = [];
const FLD = [];                                 // per field: { im, cells, dirty, sign, barrier, box }
function buildWorld(){
  /* the meadow: soft colour variation */
  {
    const g = new THREE.CircleGeometry(160, 72); g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x9edb6e), b = new THREE.Color(0x86cc5e), far = new THREE.Color(0xaedb8e);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z + 9), n = (Math.sin(x * .21) + Math.cos(z * .17)) * .5 + .5; _c.copy(a).lerp(b, n * .6).lerp(far, clamp((d - 34) / 40, 0, 1)); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; world.add(m);
  }
  /* paths from the hive yard to every field */
  const PTH = new Merge(), PATH = 0xf3dfb4;
  const seg = (x1, z1, x2, z2, w = 1.8) => { const L2 = Math.hypot(x2 - x1, z2 - z1); PTH.add(GEO.box, (x1 + x2) / 2, .02, (z1 + z2) / 2, w, .04, L2, 0, Math.atan2(x2 - x1, z2 - z1), 0, PATH); PTH.add(GEO.cyl, x2, .02, z2, w / 2, .04, w / 2, 0, 0, 0, PATH); PTH.add(GEO.cyl, x1, .02, z1, w / 2, .04, w / 2, 0, 0, 0, PATH); };
  PTH.add(GEO.cyl, 0, .021, 7, 5.5, .04, 3.6, 0, 0, 0, PATH);                      // the hive yard
  seg(-7.6, 7.2, 7.6, 7.2, 2.4); seg(0, 4, 0, -4.2, 2); seg(-3, 1.2, -9, 1.2); seg(-9, 1.2, -15.5, -1.4); seg(3, 1.2, 9, 1.2); seg(9, 1.2, 15.5, -1.4);
  seg(-7.5, -1, -7.5, -15.5); seg(-7.5, -15.5, -15.5, -15.8); seg(7.5, -1, 7.5, -15.5); seg(7.5, -15.5, 15.5, -15.8); seg(-7.5, -15.5, 0, -19.6); seg(0, 13, 0, 9);
  world.add(meshOf(PTH, false, true));

  /* ---------- the bee house with its 25 honeycomb slots ---------- */
  { const m = new THREE.Mesh(BM.hiveGeo(), MAT); m.position.set(HIVE.x, 0, HIVE.z); m.castShadow = m.receiveShadow = true; world.add(m);
    BOXES.push({ x0:HIVE.x - 2.4, z0:HIVE.z - 1.5, x1:HIVE.x + 2.4, z1:HIVE.z + 1.5 }); CIRCLES.push({ x:HIVE.x - 2.7, z:HIVE.z + 1.2, r:.4 }, { x:HIVE.x + 2.75, z:HIVE.z + 1.3, r:.35 });
    slotMesh = new THREE.InstancedMesh(BM.slotGeo, new THREE.MeshStandardMaterial({ roughness:.45 }), SLOTS); slotMesh.castShadow = false; slotMesh.receiveShadow = true;
    for(let i = 0; i < SLOTS; i++){ const r = Math.floor(i / 5), c = i % 5, x = HIVE.x + (c - 2) * .62 + (r % 2 ? .155 : -.155), y = 3.55 - r * .53, z = HIVE.z + 1.27;
      slotPos.push({ x, y, z }); _m.compose(_v.set(x, y, z), _q.identity(), _s.set(.29, .29, .1)); slotMesh.setMatrixAt(i, _m); slotMesh.setColorAt(i, _c.set(0xf6dfa6)); }
    world.add(slotMesh);
    signBoard(signTex(L('خلية النحل', 'Bee house', 'Arı evi'), '#e0604a', '#fff', x => drawBeeIcon(x, 90, 66, 34)), 2.7, .68, HIVE.x, 4.72, HIVE.z + 1.72, 0, true);
  }
  /* ---------- the honey shop ---------- */
  { const m = new THREE.Mesh(BM.shopGeo(), MAT); m.position.set(SHOP.x, 0, SHOP.z); m.castShadow = m.receiveShadow = true; world.add(m);
    BOXES.push({ x0:SHOP.x - 1.8, z0:SHOP.z - .75, x1:SHOP.x + 1.8, z1:SHOP.z + .75 }); CIRCLES.push({ x:SHOP.x - 2.3, z:SHOP.z + .55, r:.4 }, { x:SHOP.x + 2.3, z:SHOP.z + .55, r:.4 });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.8, .7), new THREE.MeshBasicMaterial({ map:signTex(L('دكانة العسل', 'Honey shop', 'Bal dükkanı'), '#f0902a', '#fff', x => { x.fillStyle = '#fff'; x.beginPath(); x.moveTo(70, 26); x.lineTo(96, 40); x.lineTo(96, 88); x.lineTo(70, 102); x.lineTo(44, 88); x.lineTo(44, 40); x.closePath(); x.fill(); }), transparent:true }));
    sg.position.set(SHOP.x, 3.35, SHOP.z + .4); world.add(sg);
  }
  /* ---------- Pando the panda on a little quest mat ---------- */
  { pandaM = BM.buildPanda(); pandaM.grp.position.set(PANDA.x, 0, PANDA.z); pandaM.grp.rotation.y = -.25; world.add(pandaM.grp);
    const M = new Merge(); M.add(GEO.cyl, PANDA.x, .03, PANDA.z, 1.3, .06, 1.3, 0, 0, 0, 0x8fce62); for(let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2; M.add(GEO.cyl8, PANDA.x + Math.cos(a) * 1.55 - .4, .9, PANDA.z - 1.2 + Math.sin(a) * .3, .06, 1.8 + (i % 3) * .4, .06, 0, 0, (i % 2 - .5) * .1, 0x7cc251); }
    world.add(meshOf(M)); CIRCLES.push({ x:PANDA.x, z:PANDA.z, r:1 });
    pandaBang = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.bang, transparent:true, depthWrite:false })); pandaBang.scale.setScalar(.7); pandaBang.position.set(PANDA.x, 2.9, PANDA.z); pandaBang.visible = false; world.add(pandaBang);
    signBoard(signTex(L('مهمات باندو', "Pando's tasks", "Pando'nun görevleri"), '#2b2b33', '#fff'), 2.3, .58, PANDA.x + 1.9, 1.5, PANDA.z + .2, -.3);
  }
  /* ---------- the fields: ground patch, wooden border, instanced flowers, sign, rope barrier while locked ---------- */
  FIELDS.forEach((F, f) => {
    const M = new Merge(), w = F.hw * 2 + .7, d = F.hd * 2 + .7;
    M.add(GEO.box, F.x, .035, F.z, w, .07, d, 0, 0, 0, F.ground);
    const B = 0xc98a52;
    M.add(GEO.box, F.x, .12, F.z - d / 2, w + .2, .18, .14, 0, 0, 0, B);
    for(const s of [-1, 1]) M.add(GEO.box, F.x + s * w / 2, .12, F.z, .14, .18, d, 0, 0, 0, B);
    for(const s of [-1, 1]) M.add(GEO.box, F.x + s * (w / 4 + .8), .12, F.z + d / 2, w / 2 - 1.6, .18, .14, 0, 0, 0, B);
    world.add(meshOf(M, false, true));
    const cells = [], geo = BM.FLOWER[F.id](), im = new THREE.InstancedMesh(geo, MAT, F.c * F.r);
    for(let r = 0; r < F.r; r++) for(let c = 0; c < F.c; c++){
      const x = F.x + (c - (F.c - 1) / 2) * S + (srnd() - .5) * .3, z = F.z + (r - (F.r - 1) / 2) * S + (srnd() - .5) * .3;
      cells.push({ x, z, p:1, s:.9 + srnd() * .25, ry:srnd() * 6.28, shown:-1 });
    }
    im.castShadow = false; im.receiveShadow = true;
    const fl = { im, cells, dirty:true, sign:null, barrier:null, box:null };
    FLD.push(fl); world.add(im); drawField(f, true); im.computeBoundingSphere();
    fl.sign = signBoard(fieldSignTex(F, !isOpen(f)), 2.4, .9, F.x, 1.55, F.z + F.hd + .9);
    if(!isOpen(f)) addBarrier(f);
  });
  /* trees (instanced) around the meadow and between fields, pines near the wood */
  const T = [];
  const tree = (x, z, s = 1) => { T.push([x, z, s]); if(x > BX0 - 1 && x < BX1 + 1 && z > BZ0 - 1 && z < BZ1 + 1) CIRCLES.push({ x, z, r:.55 * s }); };
  for(const [x, z] of [[-11, -13.8], [11, -13.8], [-12.5, 4.5], [12.5, 4.5], [-19.5, 9], [19.5, 9], [-4.5, 11.5], [4.8, 11.8], [-21, -13.5], [21, -13.5]]) tree(x, z, .9 + srnd() * .3);
  for(let i = 0; i < 60; i++){ const t = i / 60; let x, z;
    if(t < .3){ x = lerp(BX0 - 4, BX1 + 4, t / .3); z = BZ0 - 4 - srnd() * 5; } else if(t < .6){ x = lerp(BX0 - 4, BX1 + 4, (t - .3) / .3); z = BZ1 + 4 + srnd() * 5; }
    else if(t < .8){ x = BX0 - 4 - srnd() * 5; z = lerp(BZ0, BZ1, (t - .6) / .2); } else { x = BX1 + 4 + srnd() * 5; z = lerp(BZ0, BZ1, (t - .8) / .2); }
    tree(x, z, 1.2 + srnd() * .7); }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
  const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
  T.forEach(([x, z, s], i) => {
    _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
    _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
    _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
  });
  trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
  const PN = [];
  const PF = FIELDS[FI.pine];
  for(let i = 0; i < 7; i++){ PN.push([PF.x - PF.hw - 1.6, PF.z - PF.hd + i * 1.25, .8 + srnd() * .4]); PN.push([PF.x + PF.hw + 1.6, PF.z - PF.hd + i * 1.25, .8 + srnd() * .4]); }
  for(let i = 0; i < 9; i++) PN.push([PF.x - PF.hw + i * 1.45, PF.z - PF.hd - 1.5, .9 + srnd() * .5]);
  const pine = new THREE.InstancedMesh(new THREE.ConeGeometry(.9, 2.4, 7), new THREE.MeshStandardMaterial({ color:0x3f8f4a, roughness:.85, flatShading:true }), PN.length * 2);
  PN.forEach(([x, z, s], i) => { _m.compose(_v.set(x, 1.4 * s, z), _q.identity(), _s.set(s, s, s)); pine.setMatrixAt(i * 2, _m); _m.compose(_v.set(x, 2.5 * s, z), _q.identity(), _s.set(s * .7, s * .7, s * .7)); pine.setMatrixAt(i * 2 + 1, _m); CIRCLES.push({ x, z, r:.5 * s }); });
  pine.castShadow = true; world.add(pine);
  /* a hedge of round bushes at the edge of the meadow */
  const BU = [];
  for(let x = BX0; x <= BX1; x += 1.7){ BU.push([x, BZ0 - .6]); if(Math.abs(x) > 1.6) BU.push([x, BZ1 + .6]); }
  for(let z = BZ0; z <= BZ1; z += 1.7){ BU.push([BX0 - .6, z]); BU.push([BX1 + .6, z]); }
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.75, 1), new THREE.MeshStandardMaterial({ color:0x58b84e, roughness:.85, flatShading:true }), BU.length);
  BU.forEach(([x, z], i) => { _m.compose(_v.set(x, .45, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(1, .8, 1)); bush.setMatrixAt(i, _m); });
  bush.castShadow = true; world.add(bush);
  /* little flower clumps along the yard (one colour per clump) */
  const FL = new Merge();
  const clump = (x, z, col) => { for(let i = 0; i < 6; i++){ const fx = x + (srnd() - .5) * 1.1, fz = z + (srnd() - .5) * .8; FL.add(GEO.ico, fx, .25, fz, .09, .07, .09, 0, 0, 0, col); FL.add(GEO.ico, fx, .17, fz, .12, .05, .12, 0, 0, 0, 0x4fae4a); } };
  for(const [x, z, c] of [[-3.6, 10.6, 0xff8fb1], [3.6, 10.6, 0xffd23f], [-10.6, 7.6, 0xffffff], [10.6, 7.6, 0xb99cff], [-4.4, 1.2, 0xffd23f], [4.4, 1.2, 0xff8fb1]]) clump(x, z, c);
  world.add(meshOf(FL, false, false));
  /* far hills and soft clouds */
  const HL = new Merge();
  for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2, r = 85 + srnd() * 20; HL.add(GEO.sph, Math.cos(a) * r, -4, Math.sin(a) * r - 9, 22 + srnd() * 14, 12 + srnd() * 10, 18, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
  world.add(meshOf(HL, false, false));
  cloudGrp = new THREE.Group(); scene.add(cloudGrp);
  { const M = new Merge(); for(let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2, r = 40 + (i % 3) * 14, x = Math.cos(a) * r, z = Math.sin(a) * r - 9, y = 26 + (i % 4) * 3; for(let k = 0; k < 4; k++) M.add(GEO.ico1, x + (k - 1.5) * 3, y + (k % 2) * 1.2, z + (k % 2) * 1.4, 3.2 + (k % 2), 2.2, 2.8, 0, k, 0, 0xffffff); }
    cloudGrp.add(new THREE.Mesh(M.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true, fog:false, transparent:true, opacity:.92 }))); }
  /* guide arrow + ring, swing ring */
  const GA = new Merge(); GA.add(GEO.cone, 0, 0, 0, .45, .7, .45, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .55, 0, .18, .6, .18, 0, 0, 0, 0xffc23d);
  guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
  swingRing = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color:0xfff3b0, transparent:true, opacity:0, depthWrite:false }));
  swingRing.rotation.x = -Math.PI / 2; swingRing.position.y = .12; world.add(swingRing);
}
function addBarrier(f){
  const F = FIELDS[f], M = new Merge(), w = F.hw * 2 + 1.1, d = F.hd * 2 + 1.1;
  const pts = [];
  const nx = Math.ceil(w / 1.6), nz = Math.ceil(d / 1.6);
  for(let i = 0; i <= nx; i++){ pts.push([F.x - w / 2 + i * w / nx, F.z - d / 2]); pts.push([F.x - w / 2 + i * w / nx, F.z + d / 2]); }
  for(let i = 1; i < nz; i++){ pts.push([F.x - w / 2, F.z - d / 2 + i * d / nz]); pts.push([F.x + w / 2, F.z - d / 2 + i * d / nz]); }
  for(const [x, z] of pts){ M.add(GEO.cyl8, x, .5, z, .07, 1, .07, 0, 0, 0, 0xffffff); M.add(GEO.sm, x, 1.02, z, .1, .1, .1, 0, 0, 0, 0xffc23d); }
  for(const y of [.55, .85]){ M.add(GEO.box, F.x, y, F.z - d / 2, w, .05, .05, 0, 0, 0, 0xffe7a8); M.add(GEO.box, F.x, y, F.z + d / 2, w, .05, .05, 0, 0, 0, 0xffe7a8); M.add(GEO.box, F.x - w / 2, y, F.z, .05, .05, d, 0, 0, 0, 0xffe7a8); M.add(GEO.box, F.x + w / 2, y, F.z, .05, .05, d, 0, 0, 0, 0xffe7a8); }
  const m = meshOf(M); world.add(m);
  const box = { x0:F.x - w / 2 - .1, z0:F.z - d / 2 - .1, x1:F.x + w / 2 + .1, z1:F.z + d / 2 + .1 }; BOXES.push(box);
  FLD[f].barrier = m; FLD[f].box = box;
}
function removeBarrier(f){
  const fl = FLD[f]; if(fl.barrier){ world.remove(fl.barrier); fl.barrier.geometry.dispose(); fl.barrier = null; }
  if(fl.box){ const i = BOXES.indexOf(fl.box); if(i >= 0) BOXES.splice(i, 1); fl.box = null; }
  const old = fl.sign.material.map; fl.sign.material.map = fieldSignTex(FIELDS[f], false); fl.sign.material.needsUpdate = true; if(old) old.dispose();
}
const DRY = new THREE.Color(.74, .7, .6), WHITE = new THREE.Color(1, 1, 1);
function drawField(f, all){
  const fl = FLD[f]; let any = false;
  fl.cells.forEach((c, i) => {
    const q = Math.round(c.p * 20) / 20; if(!all && q === c.shown) return; c.shown = q; any = true;
    const sy = c.s * (.5 + .5 * q), sx = c.s * (.82 + .18 * q);
    _m.compose(_v.set(c.x, 0, c.z), _q.setFromEuler(_e.set((1 - q) * .25, c.ry, 0)), _s.set(sx, sy, sx)); fl.im.setMatrixAt(i, _m);
    fl.im.setColorAt(i, _c.copy(DRY).lerp(WHITE, q));
  });
  if(any){ fl.im.instanceMatrix.needsUpdate = true; if(fl.im.instanceColor) fl.im.instanceColor.needsUpdate = true; }
  fl.dirty = false;
}
let regenT = 0;
function flowersFrame(dt){
  regenT += dt;
  if(regenT >= .25){ const k = regenT * .11; regenT = 0; for(const fl of FLD) for(const c of fl.cells) if(c.p < 1){ c.p = Math.min(1, c.p + k); fl.dirty = true; } }
  FLD.forEach((fl, f) => { if(fl.dirty) drawField(f); });
}

/* ---------- collisions: circles, boxes, the edge of the meadow ---------- */
function collide(o, r){
  o.x = clamp(o.x, BX0 + r, BX1 - r); o.z = clamp(o.z, BZ0 + r, BZ1 - r);
  for(const c of CIRCLES){ const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz; if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; } }
  for(const b of BOXES){
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rr) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; } }
  }
}
function fieldAt(x, z, any){ for(let f = 0; f < FIELDS.length; f++){ const F = FIELDS[f]; if(Math.abs(x - F.x) < F.hw + .25 && Math.abs(z - F.z) < F.hd + .25 && (any || isOpen(f))) return f; } return -1; }
function lockedNear(x, z){ for(let f = 0; f < FIELDS.length; f++){ if(isOpen(f)) continue; const F = FIELDS[f]; if(Math.abs(x - F.x) < F.hw + 2.4 && Math.abs(z - F.z) < F.hd + 2.4) return f; } return -1; }

/* ======================================================================
   The player, tools, camera, input
   ====================================================================== */
const P = { x:SPAWN.x, z:SPAWN.z, vx:0, vz:0, face:SPAWN.f, move:0, goal:null, busy:null, swing:0, cd:0, auto:0 };
let heroM = null, T = 0, myField = -1;
const toolPiv = new THREE.Group(); let toolMesh = null, packMesh = null;
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
function gearMeshes(grp, tool, pack, old){
  if(old){ if(old.t) old.piv.remove(old.t); if(old.p) grp.remove(old.p); }
  const piv = old ? old.piv : new THREE.Group(); if(!old){ piv.position.set(.34, .52, .12); grp.add(piv); }
  const t = new THREE.Mesh(BM.TOOL_GEO[TOOLS[tool].id], MAT); t.castShadow = true; t.rotation.x = .5; piv.add(t);
  const p = new THREE.Mesh(BM.packGeo(pack), MAT); p.castShadow = true; grp.add(p);
  return { piv, t, p, tool, pack };
}
let myGear = null;
function setHero(id){
  heroId = HEROES[id] ? id : 'sara';
  if(heroM) scene.remove(heroM.grp);
  heroM = HEROES[heroId](); shadowAll(heroM.grp); scene.add(heroM.grp);
  myGear = gearMeshes(heroM.grp, SAVE.tool, SAVE.pack, null);
}
function refreshGear(){ if(heroM && myGear && (myGear.tool !== SAVE.tool || myGear.pack !== SAVE.pack)) myGear = gearMeshes(heroM.grp, SAVE.tool, SAVE.pack, myGear); }
const cam = { yaw:0, pitch:.62, dist:10.5, tx:P.x, tz:P.z, pAdj:0 };
let snapCam = true, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(closeup){
    camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  cam.pitch = lerp(cam.pitch, clamp(.62 + cam.pAdj, .3, 1.2), Math.min(1, dt * 3));
  const k = snapCam ? 1 : 1 - Math.exp(-7 * dt);
  const tx = P.x, tz = P.z - 1.2;
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
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function rayAt(x, y){ ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
const SPOTS = { hive:HIVE, shop:SHOP, panda:PANDA };
/* tap the world: a friendly bug, the hive / shop / panda, or the ground (walk there) */
function tapAt(x, y){
  if(state !== 'play') return;
  const r = rayAt(x, y);
  if(bug && bug.phase !== 'leave' && r.ray.distanceToPoint(_v.set(bug.x, .3, bug.z)) < .8){ walkTo(bug.x, bug.z, 2.2, () => shooBug()); return; }
  if(r.ray.distanceToPoint(_v.set(PANDA.x, 1.4, PANDA.z)) < 1.3){ walkTo(PANDA.fx, PANDA.fz, .8, () => spotAction('panda')); return; }
  if(r.ray.distanceToPoint(_v.set(HIVE.x, 2.4, HIVE.z + 1)) < 2.2){ walkTo(HIVE.fx, HIVE.fz, .8, () => spotAction(SAVE.pollen > 0 ? 'make' : 'hive')); return; }
  if(r.ray.distanceToPoint(_v.set(SHOP.x, 1.4, SHOP.z)) < 1.8){ walkTo(SHOP.fx, SHOP.fz, .8, () => spotAction('shop')); return; }
  const hit = r.ray.intersectPlane(groundPlane, _v); if(hit) walkTo(hit.x, hit.z, .3, null);
}
function walkTo(x, z, r, fn){ P.goal = { x, z, r, fn, t:6 }; }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
  if(P.busy){ inp.x = inp.z = inp.m = 0; return; }
  if(m > 0) P.goal = null;
  else if(P.goal){
    const g = P.goal, dx = g.x - P.x, dz = g.z - P.z, d = Math.hypot(dx, dz); g.t -= dt;
    if(d <= g.r || g.t <= 0){ P.goal = null; if(Math.hypot(dx, dz) > .05) P.face = Math.atan2(dx, dz); if(g.fn) g.fn(); }
    else { const sp = clamp((d - g.r) * 1.5, .35, 1); inp.x = dx / d * sp; inp.z = dz / d * sp; inp.m = sp; }
  }
}
const SPEED = 6;
function stepPlayer(dt){
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 14 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 14 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42);
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
}

/* ======================================================================
   Aunt Laila, pop-ups
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
  hi:    L('أهلا حبيبي! أنا العمة ليلى 👵 هدول نحلاتك 🐝 بيلحقوك وين ما رحت', "Hello sweetie! I'm Aunt Laila 👵 These are your bees 🐝 they follow you everywhere", 'Merhaba tatlım! Ben Leyla Teyze 👵 Bunlar senin arıların 🐝 seni her yere takip ederler'),
  go:    L('روح على حقل دوّار الشمس 🌻 والنحلات بيجمعوا حبوب الطلع', 'Walk to the sunflower field 🌻 and your bees will collect pollen', 'Ayçiçeği tarlasına 🌻 yürü, arıların polen toplasın'),
  field: L('شوف النحلات عم يجمعوا 🐝🌼 وإنت كمان كبوس «اجمع»', 'Look, the bees are collecting 🐝🌼 You can press «Collect» too', 'Bak, arılar topluyor 🐝🌼 Sen de «Topla»ya bas'),
  full:  L('الشنطة امتلت! 🎒 ارجع عالخلية واعمل عسل 🍯', 'Your backpack is full! 🎒 Go back to the hive and make honey 🍯', 'Çantan doldu! 🎒 Kovana dön ve bal yap 🍯'),
  honey: L('يمّي! صار عندك عسل 🍯 فيك تشتري أغراض من دكانة العسل 🛒', 'Yummy! You made honey 🍯 Spend it at the honey shop 🛒', 'Nefis! Bal yaptın 🍯 Bal dükkanında 🛒 harca'),
  panda: L('روح احكي مع الباندا باندو 🐼 عندو مهمات حلوة', 'Go talk to Pando the panda 🐼 he has fun tasks', 'Panda Pando ile konuş 🐼 güzel görevleri var'),
  done:  L('شاطر! فقّس بيض 🥚 لتكبر عيلة النحل وتفتح حقول جديدة 🌹', 'Great! Hatch eggs 🥚 to grow your swarm and open new fields 🌹', 'Harika! Yumurta çıkar 🥚 sürünü büyüt ve yeni tarlalar aç 🌹'),
  back:  L('أهلا فيك من جديد! النحلات اشتاقولك 🐝', 'Welcome back! Your bees missed you 🐝', 'Tekrar hoş geldin! Arıların seni özledi 🐝'),
  bug:   L('في حشرة لطيفة عم تاكل الزهر 🐞 قلّها «روح بلطف» 👋', 'A friendly bug is nibbling the flowers 🐞 tell it «shoo» gently 👋', 'Sevimli bir böcek çiçekleri kemiriyor 🐞 nazikçe «kışt» de 👋')
};
const flyEl = $('#fly'), packEl = $('#hudPack');
function layerPos(el){ let x = 0, y = 0; while(el && el !== stage){ x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; }
function screenOf(x, y, z){ _v.set(x, y, z).project(camera); return { x:(_v.x * .5 + .5) * SW, y:(-_v.y * .5 + .5) * SH }; }
function flyTo(el, emoji, from, n, done){
  const bp = layerPos(el), tx = bp.x + el.offsetWidth / 2, ty = bp.y + el.offsetHeight / 2;
  let left = n;
  for(let k = 0; k < n; k++){
    const i = document.createElement('i'); i.textContent = emoji; flyEl.appendChild(i);
    const sx = from.x + (Math.random() - .5) * 40, sy = from.y, ux = sx + (Math.random() - .5) * 120, uy = sy - 70 - Math.random() * 60;
    const a = i.animate([
      { transform:`translate(${sx}px,${sy}px) translate(-50%,-50%) scale(.4)` },
      { transform:`translate(${ux}px,${uy}px) translate(-50%,-50%) scale(1.2)`, offset:.35 },
      { transform:`translate(${tx}px,${ty}px) translate(-50%,-50%) scale(.6)` }
    ], { duration:850 + k * 80, easing:'cubic-bezier(.45,.05,.55,.95)', fill:'forwards' });
    a.onfinish = () => { i.remove(); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); if(--left === 0 && done) done(); };
  }
}

/* ======================================================================
   Bees: your swarm (and friends' swarms) — follow, fly to flowers, gather, bring pollen back
   ====================================================================== */
const MAXB = 130, ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const beeBody = new THREE.InstancedMesh(BM.bodyGeo, MAT, MAXB), beeFace = new THREE.InstancedMesh(BM.faceGeo, MAT, MAXB);
const beeWing = new THREE.InstancedMesh(BM.wingGeo, new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.72, side:THREE.DoubleSide, depthWrite:false }), MAXB * 2);
const beeAcc = {}; for(const k in BM.ACC) beeAcc[k] = new THREE.InstancedMesh(BM.ACC[k], MAT, MAXB);
for(const m of [beeBody, beeFace, beeWing, ...Object.values(beeAcc)]){ m.frustumCulled = false; scene.add(m); }
beeBody.castShadow = true;
for(let i = 0; i < MAXB; i++){ beeBody.setColorAt(i, _c.set(0xffffff)); beeFace.setColorAt(i, _c.set(0xffffff)); }
const swarms = new Map();                        // owner id → { own, bees:[entity], o:{x,z,fd} }
function newEnt(t, k, ref, from){
  const sx = from ? from.x : P.x, sz = from ? from.z : P.z;
  return { t, k, ref, x:sx + (Math.random() - .5), y:from ? from.y : 1.3, z:sz + (Math.random() - .5), yaw:0, st:'follow', tx:sx, ty:1.3, tz:sz, f:-1, ci:-1, timer:Math.random() * 1.5, ph:Math.random() * 6.28, carry:0, nap:false };
}
function syncOwnSwarm(from){
  let sw = swarms.get('me'); if(!sw){ sw = { own:true, bees:[], o:{ x:P.x, z:P.z, fd:-1 } }; swarms.set('me', sw); }
  const bs = SAVE.bees;
  while(sw.bees.length > bs.length) sw.bees.pop();
  bs.forEach((b, i) => { const e = sw.bees[i]; if(!e) sw.bees.push(newEnt(BEE_BY[b.t].i, i, b, from)); else { e.t = BEE_BY[b.t].i; e.ref = b; } });
}
function setRemoteSwarm(id, bz, a){
  const types = String(bz || '').slice(0, SLOTS).split('').map(ch => ch.charCodeAt(0) - 97).filter(i => i >= 0 && i < BEES.length);
  let sw = swarms.get(id);
  if(!sw){ sw = { own:false, bees:[], o:{ x:a.x, z:a.z, fd:-1 }, bz:'' }; swarms.set(id, sw); }
  if(sw.bz === bz) return; sw.bz = bz;
  while(sw.bees.length > types.length) sw.bees.pop();
  types.forEach((t, i) => { if(sw.bees[i]) sw.bees[i].t = t; else sw.bees.push(newEnt(t, i, null, { x:a.x, y:1.3, z:a.z })); });
}
const beeCode = () => SAVE.bees.map(b => String.fromCharCode(97 + BEE_BY[b.t].i)).join('');
function pickCell(f, ox, oz){
  const cells = FLD[f].cells; let best = -1, bs = -1e9;
  for(let k = 0; k < 12; k++){
    const i = Math.floor(Math.random() * cells.length), c = cells[i], d = Math.hypot(c.x - ox, c.z - oz);
    if(c.p < .3 || d > 5) continue; const sc = c.p - d * .06; if(sc > bs){ bs = sc; best = i; }
  }
  return best;
}
function moveBee(b, dt, sp, soft){
  const dx = b.tx - b.x, dy = b.ty - b.y, dz = b.tz - b.z, d = Math.hypot(dx, dy, dz);
  if(soft){ const k = 1 - Math.exp(-dt * 2.6 * Math.min(2, sp / 5)); b.x += dx * k; b.y += dy * k; b.z += dz * k; }
  else if(d > 1e-4){ const st = Math.min(d, sp * dt); b.x += dx / d * st; b.y += dy / d * st; b.z += dz / d * st; }
  if(Math.hypot(dx, dz) > .05) b.yaw += angDiff(Math.atan2(dx, dz), b.yaw) * Math.min(1, dt * 8);
  return d;
}
let boostNow = 1, flyingN = 0;
function beeYield(b, q){
  const B = BEES[b.t], F = FIELDS[b.f];
  const a = B.pow * lvlMul(b.ref ? b.ref.lvl : 1) * (B.fav && B.fav.includes(F.id) ? B.favMul : 1) * F.mult * boostNow * (q >= .5 ? 1 : .6) * (B.two ? 2 : 1);
  return Math.max(1, Math.round(a));
}
function beeAI(b, sw, dt){
  const B = BEES[b.t], o = sw.o, sp = 5.4 * B.spd;
  b.timer -= dt;
  if(b.st === 'follow' || b.st === 'nap'){
    const nap = b.st === 'nap', a = b.ph + T * (nap ? .15 : .55 + B.spd * .12), rr = 1 + (b.k % 4) * .3;
    b.tx = o.x + Math.cos(a) * rr; b.tz = o.z + Math.sin(a) * rr; b.ty = nap ? .9 + Math.sin(T + b.ph) * .05 : 1.3 + Math.sin(T * 2 + b.ph) * .16 + (b.k % 3) * .14;
    moveBee(b, dt, sp, true);
    if(nap){ if(Math.random() < dt * .8) floatIcon('zz', b.x, b.y + .3, b.z, 1, .3); if(b.timer <= 0){ b.st = 'follow'; b.timer = .5; } return; }
    const full = sw.own && SAVE.pollen >= cap();
    if(o.fd >= 0 && b.timer <= 0 && !full){
      if(B.nap && Math.random() < B.nap){ b.st = 'nap'; b.timer = 3 + Math.random() * 2; return; }
      const ci = pickCell(o.fd, o.x, o.z);
      if(ci >= 0){ const c = FLD[o.fd].cells[ci]; b.st = 'go'; b.f = o.fd; b.ci = ci; b.tx = c.x + (Math.random() - .5) * .3; b.tz = c.z + (Math.random() - .5) * .3; b.ty = FLOWER_H[FIELDS[o.fd].id] * c.s + .18; }
      else b.timer = .7;
    }
  } else if(b.st === 'go'){
    if(o.fd !== b.f){ b.st = 'back'; b.carry = 0; return; }
    if(moveBee(b, dt, sp) < .08){ b.st = 'gather'; b.timer = B.gt; }
  } else if(b.st === 'gather'){
    b.y = b.ty + Math.sin(T * 9 + b.ph) * .04; b.yaw += dt * 1.5;
    if(Math.random() < dt * 4) burst(b.x, b.y, b.z, 1, [FIELDS[b.f].pol, 0xffffff], .6, .45, 1, .5);
    if(b.timer <= 0){
      const fl = FLD[b.f], c = fl.cells[b.ci], q = c.p;
      c.p = Math.max(0, c.p - .2); fl.dirty = true;
      if(B.two){ const j = pickCell(b.f, c.x, c.z); if(j >= 0){ fl.cells[j].p = Math.max(0, fl.cells[j].p - .2); } }
      b.carry = sw.own ? beeYield(b, q) : 0; b.st = 'back';
    }
  } else if(b.st === 'back'){
    b.tx = o.x; b.tz = o.z; b.ty = 1.3;
    if(moveBee(b, dt, sp * 1.1) < .55){
      if(sw.own && b.carry) deposit(b);
      b.carry = 0; b.st = 'follow'; b.timer = .2 + Math.random() * .7;
    }
  }
}
let packBumpT = 0;
function deposit(b){
  const room = cap() - SAVE.pollen, add = Math.min(b.carry, room);
  if(add > 0) addPollen(add, b.f);
  const B = BEES[b.t];
  if(B.treat && Math.random() < B.treat){ SAVE.treats++; floatIcon('treat', P.x, 2, P.z, 1, .45); pop('+1 ' + TREAT); hudKey = ''; }
  if(B.star && Math.random() < .5) burst(P.x, 1.4, P.z, 4, [0xffd23f, 0xffffff], 1.5, .6);
  if(Math.random() < .3) SFX.pollen();
}
function addPollen(n, f){
  const was = SAVE.pollen;
  SAVE.pollen = Math.min(cap(), SAVE.pollen + n); const got = SAVE.pollen - was;
  if(got <= 0) return 0;
  SAVE.stats.pollen += got; const id = FIELDS[f].id; SAVE.stats.f[id] = (SAVE.stats.f[id] || 0) + got;
  hudKey = ''; packBumpT = .3;
  if(SAVE.pollen >= cap() && was < cap()) onFull();
  return got;
}
let fullSaid = false;
function onFull(){
  SFX.full(); floatIcon('full', P.x, 2.4, P.z, 1, .6);
  if(SAVE.tut === 2){ SAVE.tut = 3; persist(); }
  if(!fullSaid || SAVE.tut <= 3){ say(LINES.full, 5000); fullSaid = true; }
}
function beesFrame(dt){
  const me = swarms.get('me'); if(me){ me.o.x = P.x; me.o.z = P.z; me.o.fd = myField; }
  let k = 0; flyingN = 0;
  const wingQ = [_q.clone(), _q.clone()];
  const putBee = (x, y, z, yaw, t, sc, flap) => {
    if(k >= MAXB) return;
    const B = BEES[t], s = sc * B.size;
    _q.setFromEuler(_e.set(Math.sin(T * 3 + k) * .08, yaw, 0, 'YXZ'));
    _m.compose(_v.set(x, y, z), _q, _s.set(s, s, s)); beeBody.setMatrixAt(k, _m); beeFace.setMatrixAt(k, _m); beeBody.setColorAt(k, _c.set(B.col));
    for(const a in beeAcc) beeAcc[a].setMatrixAt(k, B.acc === a ? _m : ZERO);
    const fl = flap ? .35 + Math.sin(T * 48 + k) * .55 : .15;
    for(const sd of [0, 1]){
      _q2.setFromEuler(_e.set(0, sd ? Math.PI - .35 : .35, 0)); wingQ[sd].copy(_q).multiply(_q2); _q2.setFromEuler(_e.set(0, 0, fl)); wingQ[sd].multiply(_q2);
      _v2.set((sd ? -.07 : .07) * s, .16 * s, -.02 * s).applyQuaternion(_q).add(_v);
      _m.compose(_v2, wingQ[sd], _s.set(s, s, s)); beeWing.setMatrixAt(k * 2 + sd, _m);
    }
    k++;
  };
  for(const [id, sw] of swarms){
    for(const b of sw.bees){
      beeAI(b, sw, dt);
      if(b.st !== 'follow' || Math.random() < .3) flyingN++;
      putBee(b.x, b.y, b.z, b.yaw, b.t, .78, b.st !== 'gather' || true);
      if(BEES[b.t].star && Math.random() < dt * 3) burst(b.x, b.y, b.z, 1, [0xffd23f, 0xfff6b0], .5, .5, 1, .3);
    }
  }
  // little bees peeking out of the hive slots
  SAVE.bees.forEach((b, i) => { const p = slotPos[i]; if(p) putBee(p.x, p.y - .04 + Math.sin(T * 2 + i) * .02, p.z + .07, 0, BEE_BY[b.t].i, .62, false); });
  for(let i = k; i < MAXB; i++){ _m.makeScale(0, 0, 0); beeBody.setMatrixAt(i, _m); beeFace.setMatrixAt(i, _m); beeWing.setMatrixAt(i * 2, _m); beeWing.setMatrixAt(i * 2 + 1, _m); for(const a in beeAcc) beeAcc[a].setMatrixAt(i, _m); }
  for(const m of [beeBody, beeFace, beeWing, ...Object.values(beeAcc)]) m.instanceMatrix.needsUpdate = true;
  beeBody.instanceColor.needsUpdate = true;
  buzzFrame(flyingN);
}
let hiveKey = '';
function hiveSlotsFrame(){
  const key = SAVE.bees.map(b => b.t).join(); if(key === hiveKey) return; hiveKey = key;
  for(let i = 0; i < SLOTS; i++){ const b = SAVE.bees[i]; slotMesh.setColorAt(i, b ? _c.set(BM.shade(BEE_BY[b.t].col, .92)) : _c.set(0xf6dfa6)); }
  slotMesh.instanceColor.needsUpdate = true;
}

/* ======================================================================
   Collecting with your tool (auto in a field, or press «اجمع»)
   ====================================================================== */
function swing(manual){
  if(myField < 0 || P.busy) return 0;
  const tl = TOOLS[SAVE.tool];
  if(P.cd > 0) return 0;
  P.cd = tl.cd; P.swing = 1; P.auto = tl.cd * 1.6;
  const cx = P.x + Math.sin(P.face) * .7, cz = P.z + Math.cos(P.face) * .7, F = FIELDS[myField], fl = FLD[myField];
  let got = 0;
  for(const c of fl.cells){
    if(Math.hypot(c.x - cx, c.z - cz) > tl.r || c.p < .12) continue;
    got += tl.pow * F.mult * (c.p >= .5 ? 1 : .5) * boostNow; c.p = Math.max(0, c.p - .34);
  }
  fl.dirty = true;
  swingRing.position.set(cx, .12, cz); swingRing.scale.setScalar(tl.r); swingRing.material.opacity = .85; swingRing.material.color.set(SAVE.tool === 3 ? 0xffe680 : 0xfff3b0);
  burst(cx, .5, cz, 6 + SAVE.tool * 3, [F.pol, 0xffffff, 0x9be15d], 2.2 + tl.r * .4, .6, 6, 1.4);
  if(SAVE.tool === 3) burst(cx, 1, cz, 6, [0xffd23f, 0xff8fb1, 0xffffff], 2, .7);
  if(manual) SFX.swish();
  if(MP.t) mpSend('sw', { x:Math.round(cx * 100) / 100, z:Math.round(cz * 100) / 100, r:tl.r, fd:myField, tl:SAVE.tool });
  got = Math.round(got);
  if(got > 0){ if(SAVE.pollen >= cap()){ if(manual) floatIcon('full', P.x, 2.4, P.z, 1, .5); return 0; } return addPollen(got, myField); }
  return 0;
}
function toolFrame(dt){
  P.cd = Math.max(0, P.cd - dt);
  P.swing = Math.max(0, P.swing - dt * 3.2);
  if(myGear){ const s = P.swing; myGear.piv.rotation.x = s > 0 ? -Math.sin(s * Math.PI) * 1.6 : 0; myGear.piv.rotation.z = s > 0 ? Math.sin(s * Math.PI * 2) * .4 : 0; }
  swingRing.material.opacity = Math.max(0, swingRing.material.opacity - dt * 2.4); swingRing.scale.multiplyScalar(1 + dt * .4);
  if(state === 'play' && myField >= 0 && !P.busy && SAVE.pollen < cap()){ P.auto -= dt; if(P.auto <= 0) swing(false); }
}

/* ======================================================================
   Making honey at the hive
   ====================================================================== */
const honeyMul = () => 1 + SAVE.bees.reduce((a, b) => a + (BEE_BY[b.t].honey ? BEE_BY[b.t].honey * lvlMul(b.lvl) : 0), 0);
const nearHive = () => Math.hypot(P.x - HIVE.fx, P.z - HIVE.fz) < 3.2;
function startMake(){
  if(P.busy || SAVE.pollen <= 0) return false;
  if(!nearHive()){ say(L('روح عالخلية لتعمل عسل 🏠🍯', 'Go to the hive to make honey 🏠🍯', 'Bal yapmak için kovana git 🏠🍯'), 3000); return false; }
  const total = SAVE.pollen;
  P.busy = { k:'make', total, left:total, dur:clamp(total / 70, 1.4, 4), acc:0, made:0, mul:honeyMul() };
  P.goal = null; P.face = Math.atan2(HIVE.x - P.x, HIVE.z + 1.3 - P.z);
  SFX.pour(); if(MP.t) mpSend('fx', { k:'honey' });
  return true;
}
function busyFrame(dt){
  const b = P.busy; if(!b || b.k !== 'make') return;
  const chunk = Math.min(b.left, b.total * dt / b.dur);
  b.left -= chunk; SAVE.pollen = Math.max(0, Math.round(b.left)); b.acc += chunk * b.mul;
  const whole = Math.floor(b.acc); if(whole > 0){ b.acc -= whole; SAVE.honey += whole; b.made += whole; SAVE.stats.honey += whole; }
  hudKey = '';
  if(Math.random() < dt * 22){ const s = slotPos[Math.floor(Math.random() * SLOTS)]; orb(P.x, 1.3, P.z, s.x, s.y, s.z + .1, .7, 1.2); }
  if(Math.random() < dt * 6) burst(HIVE.x + (Math.random() - .5) * 3, 1.4 + Math.random() * 2.4, HIVE.z + 1.4, 2, [0xffb81c, 0xffd23f], 1, .7, 6, .5);
  if(b.left <= .001) finishMake();
}
function finishMake(){
  const b = P.busy; P.busy = null; if(!b) return;
  const rest = Math.round(b.acc); if(rest > 0){ SAVE.honey += rest; b.made += rest; SAVE.stats.honey += rest; }
  SAVE.pollen = 0; persist(); hudKey = '';
  SFX.honey(); pop('+' + N(b.made) + ' ' + HONEY);
  burst(HIVE.x, 3, HIVE.z + 1.5, 40, [0xffb81c, 0xffd23f, 0xffffff], 5, 1.1); floatIcon('drop', HIVE.x, 3.5, HIVE.z + 1.4, 4, .5);
  flyTo($('#hudHoney'), HONEY, screenOf(HIVE.x, 2.6, HIVE.z + 1.3), Math.min(6, 2 + Math.floor(b.made / 50)));
  fullSaid = false;
  if(SAVE.tut <= 3){ SAVE.tut = 4; persist(); setTimeout(() => { if(state === 'play') say(LINES.honey, 5000); setTimeout(() => { if(state === 'play' && SAVE.tut === 4) say(LINES.panda, 6000); }, 5200); }, 900); }
  return b.made;
}

/* ======================================================================
   Friendly bugs: a ladybug or a snail visits a field and nibbles flowers. Shoo it gently → treats.
   ====================================================================== */
let bug = null, bugT = 30 + Math.random() * 20;
function spawnBug(kind, force){
  if(bug) return false;
  let f = myField; if(f < 0){ if(!force) return false; f = 0; }
  kind = kind || (Math.random() < .55 ? 'ladybug' : 'snail');
  const fl = FLD[f]; let c = null;
  for(let k = 0; k < 20; k++){ const cc = pick(fl.cells), d = Math.hypot(cc.x - P.x, cc.z - P.z); if(d > 2.5 && d < 7){ c = cc; break; } }
  c = c || pick(fl.cells);
  const M = kind === 'ladybug' ? BM.buildLadybug() : BM.buildSnail(); M.grp.scale.setScalar(kind === 'ladybug' ? 1.4 : 1.5); scene.add(M.grp);
  bug = { kind, M, f, x:c.x, z:c.z, tx:c.x, tz:c.z, yaw:0, phase:'in', t:0, life:45, sp:kind === 'ladybug' ? .6 : .3, y:0 };
  M.grp.position.set(bug.x, 0, bug.z); M.grp.scale.multiplyScalar(.01);
  if(state === 'play') say(LINES.bug, 4000);
  return true;
}
function shooBug(){
  if(!bug || bug.phase === 'leave') return 0;
  const b = bug, n = b.kind === 'snail' ? 2 : 1;
  b.phase = 'leave'; b.t = 0; const a = Math.atan2(b.x - P.x, b.z - P.z); b.lx = b.x; b.lz = b.z; b.la = a;
  SAVE.treats += n; SAVE.stats.shoo++; persist(); hudKey = '';
  SFX.boing(); floatIcon('heart', b.x, .8, b.z, 3, .4); floatIcon('treat', b.x, 1, b.z, n, .45);
  pop('👋 +' + N(n) + ' ' + TREAT + ' ' + L('باي باي!', 'Bye bye!', 'Güle güle!'));
  if(MP.t) mpSend('fx', { k:'shoo' });
  return n;
}
function bugFrame(dt){
  if(!bug){
    if(state === 'play' && myField >= 0 && SAVE.tut >= 4){ bugT -= dt; if(bugT <= 0){ bugT = 35 + Math.random() * 25; spawnBug(); } }
    return;
  }
  const b = bug, M = b.M; b.t += dt;
  if(b.phase === 'in'){ const s = clamp(b.t / .5, 0, 1); M.grp.scale.setScalar((b.kind === 'ladybug' ? 1.4 : 1.5) * s); if(s >= 1){ b.phase = 'eat'; b.t = 0; } }
  else if(b.phase === 'eat'){
    b.life -= dt;
    const dx = b.tx - b.x, dz = b.tz - b.z, d = Math.hypot(dx, dz);
    if(d < .1){ const c = pick(FLD[b.f].cells); if(Math.hypot(c.x - b.x, c.z - b.z) < 3){ b.tx = c.x; b.tz = c.z; } }
    else { b.x += dx / d * b.sp * dt; b.z += dz / d * b.sp * dt; b.yaw += angDiff(Math.atan2(dx, dz), b.yaw) * Math.min(1, dt * 4); }
    // nibble the nearest flower a little
    for(const c of FLD[b.f].cells) if(Math.abs(c.x - b.x) < .7 && Math.abs(c.z - b.z) < .7 && c.p > .2){ c.p -= dt * .25; FLD[b.f].dirty = true; }
    M.body.rotation.z = Math.sin(T * (b.kind === 'ladybug' ? 14 : 4)) * .06; M.body.position.y = Math.abs(Math.sin(T * 6)) * (b.kind === 'ladybug' ? .03 : .01);
    if(b.life <= 0){ b.phase = 'leave'; b.t = 0; b.lx = b.x; b.lz = b.z; b.la = b.yaw; b.quiet = true; }
  } else {
    const k = clamp(b.t / 1.4, 0, 1);
    b.x = b.lx + Math.sin(b.la) * 6 * k; b.z = b.lz + Math.cos(b.la) * 6 * k; b.y = Math.abs(Math.sin(k * Math.PI * 3)) * .6 * (1 - k);
    b.yaw = b.la; M.grp.scale.setScalar((b.kind === 'ladybug' ? 1.4 : 1.5) * (1 - k * k));
    if(k >= 1){ scene.remove(M.grp); bug = null; return; }
  }
  M.grp.position.set(b.x, b.y, b.z); M.grp.rotation.y = b.yaw;
}

/* ======================================================================
   Hatching, feeding, buying, field unlocks, milestones, quests
   ====================================================================== */
function rollBee(kind){
  const w = EGGS[kind].w; let tot = 0; for(const k in w) tot += w[k];
  let r = Math.random() * tot; for(const k in w){ r -= w[k]; if(r <= 0) return k; } return 'sunny';
}
let newSlot = -1;
function hatch(kind){
  if(!EGGS[kind] || !(SAVE.eggs[kind] > 0) || SAVE.bees.length >= SLOTS) return -1;
  SAVE.eggs[kind]--;
  const t = rollBee(kind);
  SAVE.bees.push({ t, lvl:1, xp:0 }); SAVE.stats.hatch++;
  const i = SAVE.bees.length - 1; newSlot = i;
  syncOwnSwarm(slotPos[i]);
  persist(); hudKey = ''; mpTrack();
  const p = slotPos[i]; burst(p.x, p.y, p.z + .2, 30, CONFETTI, 3.5, .9); floatIcon('heart', p.x, p.y + .4, p.z + .3, 3, .4);
  if(MP.t) mpSend('fx', { k:'hatch' });
  checkUnlocks(true); checkBeeMilestones();
  return i;
}
function feed(i){
  const b = SAVE.bees[i]; if(!b || SAVE.treats <= 0 || b.lvl >= MAX_LVL) return false;
  SAVE.treats--; b.xp++; SAVE.stats.feed++;
  let up = false; if(b.xp >= xpNeed(b.lvl)){ b.lvl++; b.xp = 0; up = true; }
  persist(); hudKey = '';
  if(up){ SFX.up(); const p = slotPos[i]; burst(p.x, p.y, p.z + .2, 24, [0xffd23f, 0xffffff, 0xff8fb1], 3, .8); } else SFX.yum();
  return up ? 'up' : true;
}
function buyPack(i){ const Pk = PACKS[i]; if(!Pk || i <= SAVE.pack || SAVE.honey < Pk.price) return false; SAVE.honey -= Pk.price; SAVE.pack = i; persist(); SFX.buy(); hudKey = ''; refreshGear(); mpTrack(); return true; }
function buyTool(i){ const Tl = TOOLS[i]; if(!Tl || i <= SAVE.tool || SAVE.honey < Tl.price) return false; SAVE.honey -= Tl.price; SAVE.tool = i; persist(); SFX.buy(); hudKey = ''; refreshGear(); mpTrack(); return true; }
function buyEgg(k){ if(!EGGS[k]) return false; const pr = eggPrice(k); if(SAVE.honey < pr) return false; SAVE.honey -= pr; SAVE.eggs[k]++; persist(); SFX.buy(); hudKey = ''; return true; }
function buyTreats(j){ const t = TREATS[j]; if(!t || SAVE.honey < t[1]) return false; SAVE.honey -= t[1]; SAVE.treats += t[0]; persist(); SFX.buy(); hudKey = ''; return true; }
function milestone(key, coins){
  if(SAVE.ms[key]) return false;
  SAVE.ms[key] = 1; persist();
  try{ if(window.World) World.addCoins(coins, L('من نحلات بوبو', 'from Bobo Bees', 'Bobo Arıları\'ndan')); }catch(e){}
  return true;
}
function checkBeeMilestones(){ for(const n of [5, 10, 15, 20, 25]) if(SAVE.bees.length >= n) milestone('b' + n, 5); }
function checkUnlocks(fx){
  const got = [];
  FIELDS.forEach((F, f) => {
    if(isOpen(f) || SAVE.bees.length < F.need) return;
    SAVE.fu.push(F.id); got.push(f);
    if(FLD[f]) removeBarrier(f);
    milestone('f' + F.id, 3);
    if(fx){ burst(F.x, 1.5, F.z + F.hd, 60, CONFETTI, 6, 1.2); }
  });
  if(got.length){ persist(); if(fx){ SFX.open(); const F = FIELDS[got[got.length - 1]]; setTimeout(() => { if(state === 'play' || state === 'card') say('🎉 ' + L('انفتح حقل جديد: ', 'A new field opened: ', 'Yeni tarla açıldı: ') + F.name + ' ' + F.e, 5000, true); }, 300); } }
  return got;
}
/* quests */
function questDef(i){
  if(i < QUESTS.length) return QUESTS[i];
  const j = i - QUESTS.length, cyc = Math.floor(j / 4) + 1, kind = ['field', 'honey', 'shoo', 'feed'][j % 4];
  const open = FIELDS.filter((F, f) => isOpen(f)), F = open[(j * 7 + 3) % open.length];
  if(kind === 'field') return { k:'field', f:F.id, n:Math.round(F.mult * 800 * cyc / 100) * 100, h:Math.round(F.mult * 500 * cyc), t:4 + cyc };
  if(kind === 'honey') return { k:'honey', n:2000 * cyc, h:800 * cyc, t:5 };
  if(kind === 'shoo') return { k:'shoo', n:2 + cyc, h:500 * cyc, t:6 };
  return { k:'feed', n:3 + cyc, h:400 * cyc, t:4 };
}
function qValue(q){ return q.k === 'field' ? (SAVE.stats.f[q.f] | 0) : q.k === 'honey' ? SAVE.stats.honey : q.k === 'shoo' ? SAVE.stats.shoo : q.k === 'feed' ? SAVE.stats.feed : 0; }
function curQuest(){ if(!SAVE.q.d){ SAVE.q.d = questDef(SAVE.q.i); SAVE.q.base = qValue(SAVE.q.d); } return SAVE.q.d; }
function qProg(){ const q = curQuest(); return Math.min(q.n, q.k === 'bees' ? SAVE.bees.length : Math.max(0, qValue(q) - SAVE.q.base)); }
const qDone = () => qProg() >= curQuest().n;
function qText(q){
  const n = N(q.n);
  if(q.k === 'field'){ const F = FIELDS[FI[q.f]]; return L('اجمع ' + n + ' حبوب من ' + F.name + ' ' + F.e, 'Collect ' + n + ' pollen from the ' + F.name + ' ' + F.e, F.name + ' tarlasından ' + n + ' polen topla ' + F.e); }
  if(q.k === 'honey') return L('اعمل ' + n + ' عسل 🍯', 'Make ' + n + ' honey 🍯', n + ' bal yap 🍯');
  if(q.k === 'bees') return L('كبّر عيلتك لـ ' + n + ' نحلات 🐝', 'Grow your swarm to ' + n + ' bees 🐝', 'Sürünü ' + n + ' arıya çıkar 🐝');
  if(q.k === 'shoo') return L('قول «روح بلطف» لـ ' + n + ' حشرات لطيفة 🐞🐌', 'Gently shoo ' + n + ' friendly bugs 🐞🐌', n + ' sevimli böceği nazikçe kov 🐞🐌');
  return L('طعمي النحلات ' + n + ' حلويات 🍬', 'Feed your bees ' + n + ' treats 🍬', 'Arılarına ' + n + ' şeker ver 🍬');
}
const qIcon = q => q.k === 'field' ? FIELDS[FI[q.f]].e : q.k === 'honey' ? HONEY : q.k === 'bees' ? '🐝' : q.k === 'shoo' ? '👋' : TREAT;
function claimQuest(){
  if(!qDone()) return null;
  const q = curQuest(), i = SAVE.q.i;
  SAVE.honey += q.h; SAVE.treats += q.t; if(q.egg) SAVE.eggs[q.egg]++;
  let coins = 0; if((i + 1) % 3 === 0 && milestone('q' + (i + 1), 3)) coins = 3;
  SAVE.q = { i:i + 1, base:0, d:null }; curQuest();
  persist(); hudKey = ''; SFX.star();
  if(SAVE.tut === 4){ SAVE.tut = 5; persist(); }
  return { h:q.h, t:q.t, egg:q.egg || null, coins };
}

/* ======================================================================
   Action button (context), guide arrow, HUD
   ====================================================================== */
let ctxNow = null;
function context(){
  if(P.busy) return P.busy.k === 'make' ? { k:'making' } : null;
  if(bug && bug.phase === 'eat' && Math.hypot(bug.x - P.x, bug.z - P.z) < 2.8) return { k:'shoo' };
  if(Math.hypot(HIVE.fx - P.x, HIVE.fz - P.z) < 2.9) return { k:SAVE.pollen > 0 ? 'make' : 'hive' };
  if(Math.hypot(SHOP.fx - P.x, SHOP.fz - P.z) < 2.7) return { k:'shop' };
  if(Math.hypot(PANDA.fx - P.x, PANDA.fz - P.z) < 2.7) return { k:'panda' };
  if(myField >= 0) return { k:'collect' };
  const lf = lockedNear(P.x, P.z); if(lf >= 0) return { k:'locked', f:lf };
  return null;
}
const ACT_LOOK = {
  make:['🍯', L('اعمل عسل', 'Make honey', 'Bal yap'), '#ffc23d'], making:['🍯', L('عم نعمل…', 'Making…', 'Yapılıyor…'), '#ffe08a'], hive:['🐝', L('الخلية', 'Hive', 'Kovan'), '#ffe08a'],
  shop:['🛒', L('الدكانة', 'Shop', 'Dükkan'), '#ffb347'], panda:['🐼', L('باندو', 'Pando', 'Pando'), '#fff8ec'], collect:['🌼', L('اجمع', 'Collect', 'Topla'), '#5ed6a0'],
  shoo:['👋', L('روح بلطف', 'Shoo gently', 'Nazikçe kov'), '#ff8fb1'], locked:['🔒', '', '#e6dccb']
};
let actKey = '';
function updateActBtn(){
  ctxNow = context();
  const key = ctxNow ? ctxNow.k + (ctxNow.f != null ? ctxNow.f : '') + SAVE.tool : '';
  if(key === actKey) return; actKey = key;
  if(!ctxNow){ actBtn.hidden = true; return; }
  const [ic, label, col] = ACT_LOOK[ctxNow.k];
  $('#actI').textContent = ctxNow.k === 'collect' ? TOOLS[SAVE.tool].e : ic;
  $('#actB').textContent = ctxNow.k === 'locked' ? '🐝 ×' + N(FIELDS[ctxNow.f].need) : label;
  actBtn.style.setProperty('--ac', col);
  actBtn.hidden = false; actBtn.classList.toggle('pulse', ctxNow.k === 'make' || ctxNow.k === 'shoo');
  actBtn.classList.toggle('dim', ctxNow.k === 'locked' || ctxNow.k === 'making');
}
function doAction(){
  if(state !== 'play') return;
  const c = ctxNow || context(); if(!c) return;
  P.goal = null;
  if(c.k === 'shoo') shooBug();
  else if(c.k === 'collect') swing(true);
  else if(c.k === 'locked'){ SFX.bonk(); say('🔒 ' + FIELDS[c.f].name + ' — ' + L('بدّك ' + N(FIELDS[c.f].need) + ' نحلات لتفتحو 🐝 فقّس بيض!', 'You need ' + N(FIELDS[c.f].need) + ' bees to open it 🐝 hatch eggs!', 'Açmak için ' + N(FIELDS[c.f].need) + ' arı lazım 🐝 yumurta çıkar!'), 3500); }
  else if(c.k !== 'making') spotAction(c.k);
  actKey = '';
}
function spotAction(k){
  if(state !== 'play') return;
  SFX.tap();
  if(k === 'make'){ if(SAVE.pollen > 0) startMake(); else openHive(); }
  else if(k === 'hive') openHive(); else if(k === 'shop') openShop('pack'); else if(k === 'panda') openPanda();
}
function guideTarget(){
  if(state !== 'play') return null;
  if(P.busy) return null;
  if(SAVE.pollen >= cap() || SAVE.tut === 3) return SAVE.pollen > 0 ? { x:HIVE.fx, z:HIVE.fz, y:1.4 } : null;
  if(SAVE.tut <= 1 && myField < 0){ const F = FIELDS[0]; return { x:F.x, z:F.z + F.hd - 1, y:1.6 }; }
  if(SAVE.tut === 4) return { x:PANDA.fx, z:PANDA.fz, y:1.6 };
  return null;
}
function animGuide(){
  const g = guideTarget();
  const show = !!g && Math.hypot(g.x - P.x, g.z - P.z) > 1.6;
  guideArrow.visible = guideRing.visible = show;
  if(!show) return;
  guideArrow.position.set(g.x, g.y + .6 + Math.abs(Math.sin(T * 3.5)) * .5, g.z); guideArrow.rotation.y = T * 2;
  guideRing.position.set(g.x, .1, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
}
let lastField = -2;
function fieldFrame(){
  myField = fieldAt(P.x, P.z);
  if(myField !== lastField){
    if(myField >= 0 && state === 'play'){ const F = FIELDS[myField]; pop(F.e + ' ' + F.name); if(SAVE.tut <= 1){ SAVE.tut = 2; persist(); say(LINES.field, 6000); } }
    lastField = myField; hudKey = '';
  }
  // shared boost: 2+ friends in the same field
  let n = 1; if(myField >= 0) for(const a of RM.values()) if(a.seen && a.fd === myField) n++;
  const nb = myField >= 0 && n >= 2 ? BOOST : 1;
  if(nb !== boostNow){ boostNow = nb; hudKey = ''; if(nb > 1 && state === 'play'){ SFX.star(); pop('👫 ×' + BOOST + ' ' + L('مع أصحابك!', 'with friends!', 'arkadaşlarla!')); } }
  if(boostNow > 1 && Math.random() < .5){ const F = FIELDS[myField]; burst(F.x + (Math.random() - .5) * F.hw * 2, .4 + Math.random(), F.z + (Math.random() - .5) * F.hd * 2, 1, [0xffd23f, 0xfff6b0], .4, .6, -.4, .3); }
}
const hudEl = $('#hud');
let hudKey = '';
function hudFrame(){
  if(packBumpT > 0){ packBumpT = 0; packEl.classList.remove('bump'); void packEl.offsetWidth; packEl.classList.add('bump'); }
  const mp = mpActive(), q = curQuest(), qp = qProg(), done = qp >= q.n;
  const key = [SAVE.honey, SAVE.pollen, cap(), SAVE.treats, myField, boostNow, qp, SAVE.q.i, mp ? MP.players.map(p => p.id + p.hero).join(',') : '', MP.code].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudHoney').textContent = HONEY + ' ' + N(SAVE.honey);
  $('#hudTreats').textContent = TREAT + ' ' + N(SAVE.treats);
  const c = cap(), full = SAVE.pollen >= c;
  $('#packFill').style.width = 'calc(' + (SAVE.pollen / c * 100).toFixed(1) + '% - 6px)';
  $('#packTxt').textContent = PACKS[SAVE.pack].e + ' ' + N(SAVE.pollen) + '/' + N(c);
  packEl.classList.toggle('full', full);
  const hf = $('#hudField'); hf.hidden = myField < 0; if(myField >= 0) hf.textContent = FIELDS[myField].e + ' ' + FIELDS[myField].name;
  const hb = $('#hudBoost'); hb.hidden = boostNow <= 1; hb.textContent = '👫 ×' + BOOST;
  const hq = $('#hudQuest'); hq.hidden = SAVE.tut < 4; hq.classList.toggle('done', done); hq.textContent = '🐼 ' + (done ? '✅ ' + L('خلصت!', 'Done!', 'Bitti!') : qIcon(q) + ' ' + N(qp) + '/' + N(q.n));
  const bar = $('#mpBar'); bar.hidden = !mp;
  if(mp) bar.innerHTML = `<span class="chip roomchip">🐝 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${p.id === MP.hostId ? '🏠' : ''}</span>`).join('');
  pandaBang.visible = done;
}
packEl.onclick = () => { if(state !== 'play') return; SFX.tap(); openHive(); };
$('#btnHive').onclick = () => { if(state !== 'play') return; SFX.tap(); openHive(); };

/* ======================================================================
   Cards: hive, bee, hatching, shop, Pando
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
const honeyTag = n => `<span class="price">${HONEY} ${N(n)}</span>`;
const beeImg = t => BM.portrait(t);
const rarTag = B => `<span class="tag" style="--rc:${RAR[B.rar].col}">${RAR[B.rar].name}</span>`;
const lvDots = l => `<span class="lv">${Array.from({ length:MAX_LVL }, (_, i) => `<b class="${i < l ? 'on' : ''}"></b>`).join('')}</span>`;
function openHive(msg){
  openCard(true);
  const n = SAVE.bees.length, near = nearHive();
  const cells = Array.from({ length:SLOTS }, (_, i) => { const b = SAVE.bees[i]; if(!b) return `<div class="cell empty"></div>`; const B = BEE_BY[b.t];
    return `<button class="cell${i === newSlot ? ' new' : ''}" data-b="${i}" style="background:${BM.hexCss(BM.shade(B.col, 1.12))}" aria-label="${B.name}"><img src="${beeImg(b.t)}" alt=""><small>${N(b.lvl)}</small></button>`; }).join('');
  newSlot = -1;
  const eggBtns = ['basic', 'gold'].filter(k => SAVE.eggs[k] > 0).map(k => `<button class="big-btn ${k === 'gold' ? '' : 'mint'}" data-h="${k}"${n >= SLOTS ? ' disabled' : ''}>${EGGS[k].e}${k === 'gold' ? '✨' : ''} ${L('فقّس', 'Hatch', 'Çıkar')} ×${N(SAVE.eggs[k])}</button>`).join('');
  card.innerHTML = `${xBtn}<h2>🏠 ${L('خلية النحل', 'The bee house', 'Arı evi')} · 🐝 ${N(n)}/${N(SLOTS)}</h2>
    <div class="hive-row"><div class="comb">${cells}</div>
    <div class="hive-side">
      ${near ? `<button class="big-btn" id="bMake"${SAVE.pollen > 0 ? '' : ' disabled'}>🍯 ${L('اعمل عسل', 'Make honey', 'Bal yap')} · 🌼 ${N(SAVE.pollen)}</button>` : `<p>🏠 ${L('روح عالخلية لتعمل عسل', 'Go to the hive to make honey', 'Bal yapmak için kovana git')} · 🌼 ${N(SAVE.pollen)}</p>`}
      ${eggBtns ? `<div class="row">${eggBtns}</div>` : `<button class="ghost-btn" id="bGoEggs">🥚 ${L('اشتري بيضة', 'Buy an egg', 'Yumurta al')}</button>`}
      <p>🍬 ${N(SAVE.treats)} · ${L('كبوس على نحلة لتطعميها', 'Tap a bee to feed it', 'Beslemek için bir arıya dokun')}</p>
      <p class="mp-msg" id="hiveMsg">${msg || ''}</p>
    </div></div>`;
  wireX();
  card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { SFX.tap(); openBee(+b.dataset.b); });
  card.querySelectorAll('[data-h]').forEach(b => b.onclick = () => hatchCard(b.dataset.h));
  const bm = $('#bMake'); if(bm) bm.onclick = () => { closeCard(); startMake(); };
  const ge = $('#bGoEggs'); if(ge) ge.onclick = () => { SFX.tap(); openShop('egg'); };
}
function openBee(i){
  const b = SAVE.bees[i]; if(!b) return openHive();
  openCard(false);
  const B = BEE_BY[b.t], max = b.lvl >= MAX_LVL;
  card.innerHTML = `${xBtn}<img class="beebig" src="${beeImg(b.t)}" alt="" style="--rc:${B.css}">
    <h2>${B.name} ${rarTag(B)}</h2><p>${B.info}</p>
    <p>${L('المستوى', 'Level', 'Seviye')} ${N(b.lvl)} ${lvDots(b.lvl)}</p>
    ${max ? `<p>🏆 ${L('أعلى مستوى!', 'Top level!', 'En üst seviye!')}</p>` : `<div class="bar2 h"><i style="width:${Math.round(b.xp / xpNeed(b.lvl) * 100)}%"></i></div>`}
    <div class="row"><button class="big-btn pink" id="bFeed"${SAVE.treats > 0 && !max ? '' : ' disabled'}>${TREAT} ${L('طعميها', 'Feed', 'Besle')} (${N(SAVE.treats)})</button>
    <button class="ghost-btn" id="bBack">↩️ ${L('الخلية', 'Hive', 'Kovan')}</button></div>
    <p class="mp-msg" id="beeMsg"></p>`;
  wireX();
  $('#bBack').onclick = () => { SFX.tap(); openHive(); };
  $('#bFeed').onclick = () => { const r = feed(i); if(!r){ SFX.bonk(); return; } openBee(i); if(r === 'up'){ pop('⭐ ' + L('صارت أقوى!', 'Level up!', 'Seviye atladı!')); const m = $('#beeMsg'); if(m){ m.style.color = 'var(--mint-d)'; m.textContent = '⭐ ' + L('المستوى ', 'Level ', 'Seviye ') + N(SAVE.bees[i].lvl); } } };
}
function hatchCard(kind){
  if(SAVE.bees.length >= SLOTS){ SFX.bonk(); openHive(L('الخلية مليانة 🐝', 'The hive is full 🐝', 'Kovan dolu 🐝')); return; }
  if(!(SAVE.eggs[kind] > 0)){ SFX.bonk(); openShop('egg'); return; }
  const i = hatch(kind); if(i < 0) return;
  const b = SAVE.bees[i], B = BEE_BY[b.t];
  openCard(false);
  card.innerHTML = `<h2>🥚 ${L('عم تفقس…', 'Hatching…', 'Çatlıyor…')}</h2><div class="egg wob${kind === 'gold' ? ' gold' : ''}">🥚</div>`;
  SFX.crack(); setTimeout(() => { if(state === 'card') SFX.crack(); }, 600);
  setTimeout(() => {
    if(state !== 'card' || !card.querySelector('.egg')) return;
    SFX.hatch();
    card.innerHTML = `<h2>🎉 ${L('نحلة جديدة!', 'A new bee!', 'Yeni bir arı!')}</h2>
      <img class="beebig hatched" src="${beeImg(b.t)}" alt="" style="--rc:${B.css}">
      <h2>${B.name} ${rarTag(B)}</h2><p>${B.info}</p>
      <div class="row"><button class="big-btn" id="bYay">🐝 ${L('يا سلام!', 'Hooray!', 'Yaşasın!')}</button><button class="ghost-btn" id="bToHive">🏠 ${L('الخلية', 'Hive', 'Kovan')}</button></div>`;
    $('#bYay').onclick = () => { SFX.tap(); closeCard(); };
    $('#bToHive').onclick = () => { SFX.tap(); newSlot = i; openHive(); };
  }, 1500);
}
let shopTab = 'pack';
function openShop(tab, msg){
  shopTab = tab || shopTab;
  openCard(true);
  const TABS = [['pack', '🎒', L('شنط', 'Bags', 'Çantalar')], ['tool', '🧹', L('أدوات', 'Tools', 'Aletler')], ['egg', '🥚', L('بيض', 'Eggs', 'Yumurtalar')], ['treat', TREAT, L('حلويات', 'Treats', 'Şekerler')]];
  let items = '';
  if(shopTab === 'pack') items = PACKS.map((Pk, i) => { const own = i <= SAVE.pack;
    return `<button class="item${own ? ' done' : SAVE.honey < Pk.price ? ' poor' : ''}" data-pk="${i}"><span class="em">${Pk.e}</span><b>${Pk.name}</b><small>🌼 ${N(Pk.cap)}</small>${own ? `<small>✅ ${i === SAVE.pack ? L('معك', 'Using', 'Kullanılıyor') : L('عندك', 'Yours', 'Senin')}</small>` : honeyTag(Pk.price)}</button>`; }).join('');
  else if(shopTab === 'tool') items = TOOLS.map((Tl, i) => { const own = i <= SAVE.tool;
    return `<button class="item${own ? ' done' : SAVE.honey < Tl.price ? ' poor' : ''}" data-tl="${i}"><span class="em">${Tl.e}</span><b>${Tl.name}</b><span class="info">💪 ×${N(Tl.pow)} · ⭕ ${N(Tl.r)}</span>${own ? `<small>✅ ${i === SAVE.tool ? L('معك', 'Using', 'Kullanılıyor') : L('عندك', 'Yours', 'Senin')}</small>` : honeyTag(Tl.price)}</button>`; }).join('');
  else if(shopTab === 'egg') items = ['basic', 'gold'].map(k => { const pr = eggPrice(k);
    return `<button class="item${SAVE.honey < pr ? ' poor' : ''}" data-egg="${k}">${SAVE.eggs[k] ? `<span class="cnt">${N(SAVE.eggs[k])}</span>` : ''}<span class="em${k === 'gold' ? ' egg gold' : ''}" style="${k === 'gold' ? 'font-size:40px' : ''}">🥚</span><b>${EGGS[k].name}</b><span class="info">${k === 'gold' ? L('فرصة أكبر لنحلات نادرة ⭐', 'Better chance of rare bees ⭐', 'Nadir arı şansı daha yüksek ⭐') : L('نحلة جديدة لعيلتك 🐝', 'A new bee for your swarm 🐝', 'Sürüne yeni bir arı 🐝')}</span>${honeyTag(pr)}</button>`; }).join('');
  else items = TREATS.map(([n, pr], j) => `<button class="item${SAVE.honey < pr ? ' poor' : ''}" data-tr="${j}"><span class="em">${TREAT}</span><b>×${N(n)}</b><span class="info">${L('بتكبّر النحلات', 'Levels up bees', 'Arıları büyütür')}</span>${honeyTag(pr)}</button>`).join('');
  const eggsOwned = SAVE.eggs.basic + SAVE.eggs.gold;
  card.innerHTML = `${xBtn}<h2>🛒 ${L('دكانة العسل', 'Honey shop', 'Bal dükkanı')}</h2><p>${honeyTag(SAVE.honey)} · ${TREAT} ${N(SAVE.treats)} · 🐝 ${N(SAVE.bees.length)}/${N(SLOTS)}</p>
    <div class="tabs">${TABS.map(([id, e, nm]) => `<button data-tab="${id}" class="${id === shopTab ? 'on' : ''}">${e} ${nm}</button>`).join('')}</div>
    <div class="shopgrid">${items}</div>
    ${shopTab === 'egg' && eggsOwned ? `<button class="big-btn mint" id="bHatchNow">🐣 ${L('فقّس هلّق!', 'Hatch now!', 'Şimdi çıkar!')}</button>` : ''}
    <p class="mp-msg" id="shopMsg">${msg || ''}</p>`;
  wireX();
  const poor = () => { SFX.bonk(); $('#shopMsg').textContent = L('بدّك عسل أكتر 🍯 اجمع حبوب واعمل عسل', 'You need more honey 🍯 collect pollen and make honey', 'Daha çok bal lazım 🍯 polen topla, bal yap'); };
  card.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SFX.tap(); openShop(b.dataset.tab); });
  card.querySelectorAll('[data-pk]').forEach(b => b.onclick = () => { const i = +b.dataset.pk; if(i <= SAVE.pack){ SFX.tap(); return; } if(!buyPack(i)) return poor(); openShop('pack', '✅ ' + PACKS[i].e + ' ' + PACKS[i].name); });
  card.querySelectorAll('[data-tl]').forEach(b => b.onclick = () => { const i = +b.dataset.tl; if(i <= SAVE.tool){ SFX.tap(); return; } if(!buyTool(i)) return poor(); openShop('tool', '✅ ' + TOOLS[i].e + ' ' + TOOLS[i].name); });
  card.querySelectorAll('[data-egg]').forEach(b => b.onclick = () => { const k = b.dataset.egg; if(!buyEgg(k)) return poor(); openShop('egg', '✅ 🥚 +1'); });
  card.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => { const j = +b.dataset.tr; if(!buyTreats(j)) return poor(); openShop('treat', '✅ ' + TREAT + ' +' + N(TREATS[j][0])); });
  const hn = $('#bHatchNow'); if(hn) hn.onclick = () => hatchCard(SAVE.eggs.gold > 0 ? 'gold' : 'basic');
}
function openPanda(){
  openCard(false);
  const q = curQuest(), p = qProg(), done = p >= q.n, first = SAVE.tut === 4;
  card.innerHTML = `${xBtn}<div class="panda">🐼</div><h2>${L('باندو', 'Pando', 'Pando')}</h2>
    ${first ? `<p>${L('أهلا! أنا باندو 🎋 بحب العسل كتير. ساعدني بمهماتي وبعطيك هدايا!', "Hi! I'm Pando 🎋 I love honey. Help me with my tasks and I'll give you presents!", 'Merhaba! Ben Pando 🎋 Balı çok severim. Görevlerime yardım et, sana hediyeler vereyim!')}</p>` : ''}
    <h2 style="font-size:24px">${qText(q)}</h2>
    <div class="bar2 h"><i style="width:${Math.round(p / q.n * 100)}%"></i></div><p dir="ltr">${N(p)} / ${N(q.n)}</p>
    <div class="reward"><span>${HONEY} ${N(q.h)}</span><span>${TREAT} ${N(q.t)}</span>${q.egg ? `<span>🥚${q.egg === 'gold' ? '✨' : ''} 1</span>` : ''}</div>
    ${done ? `<button class="big-btn" id="bClaim">🎁 ${L('خود الجائزة', 'Get the prize', 'Ödülü al')}</button>` : `<button class="big-btn mint" id="bOk">👍 ${L('تمام!', 'OK!', 'Tamam!')}</button>`}`;
  wireX();
  if(first && !done){ SAVE.tut = 5; persist(); setTimeout(() => { if(state === 'play') say(LINES.done, 6000); }, 400); }
  const ok = $('#bOk'); if(ok) ok.onclick = () => { SFX.tap(); closeCard(); };
  const cl = $('#bClaim'); if(cl) cl.onclick = () => {
    const r = claimQuest(); if(!r) return;
    card.innerHTML = `<div class="bigstar">🎉</div><h2>${L('شكراً كتير!', 'Thank you so much!', 'Çok teşekkürler!')}</h2>
      <div class="reward"><span>${HONEY} +${N(r.h)}</span><span>${TREAT} +${N(r.t)}</span>${r.egg ? `<span>🥚${r.egg === 'gold' ? '✨' : ''} +1</span>` : ''}${r.coins ? `<span>🪙 +${N(r.coins)}</span>` : ''}</div>
      <p>🐼 ${L('المهمة الجاية: ', 'Next task: ', 'Sonraki görev: ')}${qText(curQuest())}</p>
      <button class="big-btn" id="bOk2">👍 ${L('يلا!', "Let's go!", 'Hadi!')}</button>`;
    $('#bOk2').onclick = () => { SFX.tap(); closeCard(); };
    burst(PANDA.x, 2.4, PANDA.z, 40, CONFETTI, 5, 1);
  };
}

/* ======================================================================
   Menu, hero picker, pause, daily gift, starting to play
   ====================================================================== */
function showMenu(){
  if(MP.t){ mpLeave(true); }
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('bees_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🐝</div><h1>${L('نحلات بوبو', 'Bobo Bees', 'Bobo Arıları')}</h1>
    <p class="sub">${L('اجمع حبوب الطلع، اعمل عسل، وكبّر عيلة النحل!', 'Collect pollen, make honey and grow your swarm!', 'Polen topla, bal yap ve sürünü büyüt!')}</p>
    <div class="row"><div class="mine"><span>${HONEY} ${N(SAVE.honey)}</span><span>🐝 ${N(SAVE.bees.length)}</span><span>🌼 ${N(SAVE.fu.length)}/${N(FIELDS.length)}</span></div>
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
/* daily gift: honey, treats, sometimes an egg */
function rollDaily(){ return { h:50 + SAVE.bees.length * 25, t:3, egg:Math.random() < .2 ? 'basic' : null }; }
function dailyCard(){
  const g = rollDaily();
  openCard(false);
  card.innerHTML = `<div class="bigstar">🎁</div><h2>${L('هدية اليوم!', "Today's gift!", 'Günün hediyesi!')}</h2>
    <div class="giftbig">🍯</div>
    <p>${L('هدية من العمة ليلى:', 'A present from Aunt Laila:', 'Leyla Teyze\'den bir hediye:')}</p>
    <div class="reward"><span>${HONEY} ${N(g.h)}</span><span>${TREAT} ${N(g.t)}</span>${g.egg ? '<span>🥚 1</span>' : ''}</div>
    <button class="big-btn" id="bTake">🎁 ${L('خدها!', 'Take it!', 'Al!')}</button>`;
  $('#bTake').onclick = () => { takeDaily(g); closeCard(); say(L('صرفهن بدكانة العسل 🛒', 'Spend it at the honey shop 🛒', 'Bal dükkanında harca 🛒'), 3500); };
}
function takeDaily(g){
  if(SAVE.daily === today()) return false;
  g = g || rollDaily();
  SFX.star(); SAVE.daily = today();
  SAVE.honey += g.h; SAVE.treats += g.t; if(g.egg) SAVE.eggs[g.egg]++;
  persist(); hudKey = ''; pop('+' + N(g.h) + ' ' + HONEY);
  return true;
}
function startPlay(where){
  if(ROT) rawSet('bees_rothint', '1');
  overlay.hidden = true;
  const sp = where === 'visit' ? { x:1.6 + Math.random() * 2, z:9, f:Math.PI } : SPAWN;
  P.x = sp.x; P.z = sp.z; P.face = sp.f; P.vx = P.vz = 0; P.goal = null; P.busy = null;
  cam.yaw = 0; cam.pAdj = 0; snapCam = true; closeup = null; lastField = -2;
  const me = swarms.get('me'); if(me) for(const b of me.bees){ b.x = P.x + (Math.random() - .5) * 2; b.z = P.z + (Math.random() - .5) * 2; b.y = 1.3; b.st = 'follow'; }
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(LINES.hi, 4200); setTimeout(() => { if(state === 'play' && SAVE.tut === 1) say(LINES.go, 7000); }, 4400); }
  else if(SAVE.tut === 1) say(LINES.go, 6000);
  else if(SAVE.daily !== today() && !mpActive()) setTimeout(() => { if(state === 'play') dailyCard(); }, 500);
  else if(where !== 'visit') say(LINES.back, 2500);
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function update(dt){
  // gameplay that runs while playing (also used by the test hook's tick)
  if(state === 'play' || state === 'card' || state === 'pause' || state === 'mp'){ fieldFrame(); busyFrame(dt); }
  toolFrame(dt); bugFrame(dt); flowersFrame(dt);
}
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
  update(dt);
  if(state === 'play'){ updateActBtn(); hudFrame(); saveT += dt; if(saveT > 8) persist(); }
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .05 + .3;
    camera.position.set(Math.sin(a) * 15, 9.5, 4 + Math.cos(a) * 15); camera.lookAt(0, 1.5, -1); camLook.set(0, 0, -1); aimSun(0, -1);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  beesFrame(dt); hiveSlotsFrame(); updateOrbs(dt);
  if(pandaM){ pandaM.head.rotation.x = Math.sin(T * 1.6) * .08; pandaM.head.rotation.z = Math.sin(T * .9) * .06; }
  if(pandaBang.visible) pandaBang.position.y = 2.9 + Math.abs(Math.sin(T * 3)) * .25;
  if(cloudGrp) cloudGrp.rotation.y = T * .004;
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
   Everyone plays their own save in the same meadow and sees each other's characters and swarms.
   Events: pos (with the field), sw (a tool swing — flowers droop for everyone), fx. 2+ in one field = shared boost.
   No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'sw', 'fx'];
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-bees-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-bees-' + code);
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
      for(const [k, p] of this.peers) if(now - p.last > 20000){ this.peers.delete(k); ch = true; }
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, inviteFor:null, typed:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'bees';
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
/* friends in the room: their character with tool + backpack, and their swarm */
const RM = new Map();
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, gear:null, x:SPAWN.x + 2, z:SPAWN.z, f:Math.PI, m:0, tx:SPAWN.x + 2, tz:SPAWN.z, tf:Math.PI, tm:0, c:p.c, t:Math.random() * 5, seen:false, fd:-1, mk:0, swing:0 }; RM.set(p.id, a); }
    a.c = p.c;
    const hero = okHero(p.hero), tl = clamp(p.tl | 0, 0, TOOLS.length - 1), pk = clamp(p.pk | 0, 0, PACKS.length - 1);
    if(a.hero !== hero){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp); a.gear = gearMeshes(a.h.grp, tl, pk, null); }
    else if(a.gear && (a.gear.tool !== tl || a.gear.pack !== pk)) a.gear = gearMeshes(a.h.grp, tl, pk, a.gear);
    setRemoteSwarm(p.id, typeof p.bz === 'string' ? p.bz : '', a);
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); RM.delete(id); swarms.delete(id); }
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play', bz:beeCode(), tl:SAVE.tool, pk:SAVE.pack };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.bz = beeCode(); MP.meta.tl = SAVE.tool; MP.meta.pk = SAVE.pack; MP.t.track(MP.meta); hudKey = ''; } }
function mpSend(ev, p){ if(MP.t && MP.meta) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me = all.findIndex(p => p.id === MP.id);
  if(me >= MP_MAX){ mpLeave(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  if(!MP.players.some(p => p.id === MP.hostId)) MP.hostId = MP.players[0].id;    // the meadow belongs to everyone: the room stays open
  MP.isHost = MP.hostId === MP.id;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.flag(); if(state === 'play') say(L('صاحبك إجا مع نحلاتو! 🐝 روحوا عنفس الحقل لتجمعوا أكتر', 'A friend came with their bees! 🐝 Go to the same field to collect more', 'Bir arkadaşın arılarıyla geldi! 🐝 Daha çok toplamak için aynı tarlaya gidin'), 4500); }
  remoteSync(); hudKey = '';
}
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){ if(!a) return; a.tx = clamp(+p.x || 0, BX0, BX1); a.tz = clamp(+p.z || 0, BZ0, BZ1); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1); a.fd = Number.isInteger(p.fd) && FIELDS[p.fd] ? p.fd : -1; a.mk = p.mk ? 1 : 0; if(!a.seen){ a.seen = true; a.x = a.tx; a.z = a.tz; } }
  else if(ev === 'sw'){
    if(!a) return; a.swing = 1;
    const f = p.fd | 0, x = +p.x || 0, z = +p.z || 0, r = clamp(+p.r || 1, .5, 3);
    if(!FLD[f]) return;
    for(const c of FLD[f].cells) if(Math.hypot(c.x - x, c.z - z) <= r && c.p >= .12) c.p = Math.max(0, c.p - .2);
    FLD[f].dirty = true;
    burst(x, .5, z, 6, [FIELDS[f].pol, 0xffffff], 2, .6, 6, 1.2);
  }
  else if(ev === 'fx'){ if(!a) return; if(p.k === 'hatch') burst(a.x, 1.5, a.z, 24, CONFETTI, 3, .9); else if(p.k === 'shoo') floatIcon('heart', a.x, 1.8, a.z, 2, .4); }
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && state !== 'menu' && state !== 'select'){ MP.sendT = .12; mpSend('pos', { x:Math.round(P.x * 100) / 100, z:Math.round(P.z * 100) / 100, f:Math.round(P.face * 100) / 100, m:Math.round(P.move * 100) / 100, fd:myField, mk:P.busy ? 1 : 0 }); }
  for(const a of RM.values()){
    const k = 1 - Math.exp(-10 * dt);
    a.x = lerp(a.x, a.tx, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k); a.t += dt;
    if(a.h){ a.h.grp.position.set(a.x, 0, a.z); a.h.grp.rotation.y = a.f; poseHero(a.h, { t:a.t, dt, run:a.m, grounded:true, vy:0, sq:0, flip:0 }); }
    a.swing = Math.max(0, a.swing - dt * 3.2); if(a.gear) a.gear.piv.rotation.x = a.swing > 0 ? -Math.sin(a.swing * Math.PI) * 1.6 : 0;
    if(a.mk && Math.random() < dt * 14){ const s = slotPos[Math.floor(Math.random() * SLOTS)]; orb(a.x, 1.3, a.z, s.x, s.y, s.z + .1, .7, 1.2); }
    const sw = swarms.get(a.id); if(sw){ sw.o.x = a.x; sw.o.z = a.z; sw.o.fd = a.fd; }
  }
}
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🐝 ${L('اجمعوا سوا بنفس الحقل وبتاخدوا حبوب أكتر!', 'Collect together in the same field and get more pollen!', 'Aynı tarlada birlikte toplayın, daha çok polen alın!')}</p>
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
  if(MP.isHost) say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000);
  else say(L('أهلا! روح عحقل صاحبك واجمعوا سوا 🐝🌻', "Welcome! Go to your friend's field and collect together 🐝🌻", 'Hoş geldin! Arkadaşının tarlasına git, birlikte toplayın 🐝🌻'), 5000);
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'bees' yet: guarded. */
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
window.__bees = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:where => startPlay(where),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(),
  get honey(){ return SAVE.honey; }, get pollen(){ return SAVE.pollen; }, get cap(){ return cap(); }, get treats(){ return SAVE.treats; },
  addHoney(n){ SAVE.honey += n; hudKey = ''; persist(); }, addTreats(n){ SAVE.treats += n; hudKey = ''; persist(); }, setPollen(n){ SAVE.pollen = clamp(n, 0, cap()); hudKey = ''; },
  P, tp(x, z, f){ P.x = x; P.z = z; if(f != null) P.face = f; P.goal = null; snapCam = true; fieldFrame(); },
  FIELDS, get field(){ return myField; }, fieldCenter:f => ({ x:FIELDS[f].x, z:FIELDS[f].z }), isOpen:f => isOpen(f), cells:f => FLD[f].cells.map(c => c.p),
  HIVE, SHOP, PANDA, nearHive:() => nearHive(),
  swing:() => { P.cd = 0; return swing(true); },
  tick(sec, step = .05){ let s = sec; while(s > 0){ const d = Math.min(step, s); T += d; update(d); beesFrame(d); mpFrame(d); s -= d; } hudKey = ''; },
  get bees(){ return SAVE.bees.map(b => ({ t:b.t, lvl:b.lvl, xp:b.xp })); },
  get swarm(){ const sw = swarms.get('me'); return sw ? sw.bees.map(b => ({ t:BEES[b.t].id, st:b.st, x:b.x, y:b.y, z:b.z })) : []; },
  get swarms(){ return [...swarms.entries()].map(([id, sw]) => ({ id, own:sw.own, n:sw.bees.length, busy:sw.bees.filter(b => b.st !== 'follow').length })); },
  make:() => startMake(), finishMake:() => finishMake(), get busy(){ return P.busy ? P.busy.k : null; },
  buyPack:i => buyPack(i), buyTool:i => buyTool(i), buyEgg:k => buyEgg(k), buyTreats:j => buyTreats(j), eggPrice:k => eggPrice(k), get eggs(){ return Object.assign({}, SAVE.eggs); },
  get pack(){ return SAVE.pack; }, get tool(){ return SAVE.tool; },
  hatch:k => hatch(k), hatchCard:k => hatchCard(k), feed:i => feed(i), giveEggs(k, n = 1){ SAVE.eggs[k] += n; persist(); },
  checkUnlocks:() => checkUnlocks(true), get fu(){ return SAVE.fu.slice(); }, get barriers(){ return FLD.map(f => !!f.barrier); },
  get quest(){ const q = curQuest(); return { i:SAVE.q.i, k:q.k, f:q.f, n:q.n, prog:qProg(), done:qDone(), text:qText(q) }; }, claimQuest:() => claimQuest(), panda:() => openPanda(),
  spawnBug:k => spawnBug(k, true), shoo:() => shooBug(), get bug(){ return bug ? { kind:bug.kind, phase:bug.phase, x:bug.x, z:bug.z, f:bug.f } : null; },
  daily:() => dailyCard(), takeDaily:() => takeDaily(), setDaily(d){ SAVE.daily = d; persist(); }, get ms(){ return Object.assign({}, SAVE.ms); },
  hive:() => openHive(), shop:t => openShop(t), bee:i => openBee(i), spot:k => spotAction(k), act:() => doAction(), get ctx(){ const c = context(); return c ? c.k : null; },
  get boost(){ return boostNow; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, players:MP.players.map(p => ({ id:p.id, hero:p.hero, bz:p.bz })), remotes:[...RM.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, z:a.z, fd:a.fd, bees:(swarms.get(a.id) || { bees:[] }).bees.length })) }; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; }
};

/* ---------- boot ---------- */
buildWorld();
checkUnlocks(false); curQuest(); persist();
setHero(heroId);
syncOwnSwarm();
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
