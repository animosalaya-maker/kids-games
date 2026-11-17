/* Bobo City («مدينة بوبو 🏙️») — a calm town roleplay sandbox.
   A bright low-poly town: roads with gentle traffic, a park with a fountain and a playground, a school, a hospital,
   a fire station, a bakery, a toy shop, a supermarket, a library, a beach with a pier, a gas station and a little airfield.
   Pick one of 6 houses (your single-colour flag goes up), furnish it on a grid, change wall and floor colours.
   Spawn vehicles from the garage, try role outfits, play with everything, and have a pet follow you.
   Online rooms of up to 4 (Supabase presence like pets; ?mp=local = BroadcastChannel): everyone sees each other's
   characters, roles, vehicles and passengers; the host's town state (house owners, traffic) is authoritative and
   each player's house furniture is synced, so friends can visit each other's houses. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeCityModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const CM = makeCityModels(THREE, K);
const { MAT, PRISM, FURN, FURN_IDS, FCATS, VEH, VEH_IDS, ROLES, ROLE_IDS, ITEMS, BALLOON_COLS, PETS, PET_IDS } = CM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const hexCss = c => '#' + c.toString(16).padStart(6, '0');

/* ======================================================================
   The map (1 unit = 1 m). North is −z, the beach is to the south (+z).
   ====================================================================== */
const ROAD_HW = 3.5, WALK_W = 1.6;
const ROADS = [   // [x1, z1, x2, z2] centre lines
  [-52, -30, 52, -30], [-36, 30, 36, 30], [-36, -30, -36, 30], [36, -30, 36, 30],
  [-42, 0, 52, 0], [0, -30, 0, 30], [0, 30, 0, 36]
];
const HOUSE_X = [-45, -27, -9, 9, 27, 45], HOUSE_Z = -46, HW = 10, HD = 8, CX = 10, CZ = 8, WALL_H = 2.8, WALL_T = .3;
const houseX0 = i => HOUSE_X[i] - HW / 2, houseZ0 = () => HOUSE_Z - HD / 2;
const DOOR_Z = HOUSE_Z + HD / 2;                       // the front wall line (door gap x −1..+1 around the centre)
const HOUSE_COL = [0xffe2b8, 0xc9f0dc, 0xcfe6ff, 0xffd0c4, 0xe4d8ff, 0xfff1a8];
const ROOF_COL = [0xe46f4f, 0x3f9c8e, 0x3f7fd0, 0xd8603f, 0x8a6ad0, 0xe8a92a];
const FLAGS = [0xff5d73, 0x3f8ef0, 0x5ed6a0, 0xffc23d, 0xb99cff, 0xff9f43, 0x2bb3c0, 0xff8fb1];
const WALLC = [0xfff6e6, 0xffe0e8, 0xdff3ff, 0xe3f7df, 0xfff2b8, 0xece0ff, 0xffd9c2, 0xd6f0ee];
const FLOORC = [0xe6b67e, 0xc98a52, 0xf2e2c4, 0xbfe3f2, 0xd9c7ef, 0xb9e3b0, 0xf6c0c8, 0x9aa7b4];
const SPAWN = { x:0, z:-37.5, f:Math.PI };
const BOUND = { x0:-62, x1:62, z0:-58, z1:74 };
const SEA_Z = 50.5, PIER = { x0:10.5, x1:13.5, z0:41, zDeck:44, z1:66, y:1.0 };
const PLACES = {
  fountain:{ x:-20, z:12 }, school:{ x:-18, z:-15 }, hospital:{ x:14, z:-16 }, fire:{ x:28, z:-16 },
  bakery:{ x:9, z:10 }, toys:{ x:18.5, z:10 }, market:{ x:28, z:10 }, library:{ x:18, z:21 },
  kiosk:{ x:-8, z:43 }, gas:{ x:47, z:-6 }, plane:{ x:-50, z:18 }, playground:{ x:-10, z:19 }
};
/* things you can use (the action button appears when you are close) */
const SPOTS = [
  { k:'swing', x:-7, z:22.4, r:1.3, i:0 }, { k:'swing', x:-9.2, z:22.4, r:1.3, i:1 },
  { k:'slide', x:-14.6, z:18, r:1.6 }, { k:'seesaw', x:-7.2, z:15.5, r:1.5, side:-1 }, { k:'seesaw', x:-3.8, z:15.5, r:1.5, side:1 },
  { k:'fountain', x:-20, z:15.6, r:2 },
  { k:'bell', x:-11, z:-7.8, r:2 }, { k:'board', x:-24, z:-7.6, r:2.2 },
  { k:'bed', x:9.5, z:-7.6, r:1.6, i:0 }, { k:'bed', x:14, z:-7.6, r:1.6, i:1 }, { k:'bed', x:18.5, z:-7.6, r:1.6, i:2 },
  { k:'shop', shop:'bakery', x:9, z:5.6, r:2.2 }, { k:'shop', shop:'toys', x:18.5, z:5.6, r:2.2 }, { k:'shop', shop:'market', x:28, z:5.6, r:2.2 },
  { k:'shop', shop:'library', x:18, z:25.3, r:2.2 }, { k:'shop', shop:'kiosk', x:-8, z:40.6, r:2.2 },
  { k:'plane', x:-47, z:18, r:4 }, { k:'pump', x:45, z:-6, r:3.2, drive:true }, { k:'pump', x:49.5, z:-6, r:3.2, drive:true },
  { k:'ladder', x:14.4, z:63.5, r:2.2, swim:true }
];
const SHOPS = {
  bakery: { e:'🥖', name:L('مخبز', 'Bakery', 'Fırın'), items:['bread', 'cake'], col:0xc98a52, wall:0xffe0b8 },
  toys:   { e:'🎈', name:L('محل ألعاب', 'Toy shop', 'Oyuncakçı'), items:['balloon'], col:0x3f8ef0, wall:0xc4e7ff },
  market: { e:'🛒', name:L('سوبرماركت', 'Supermarket', 'Market'), items:['apple', 'juice'], col:0x4fae4a, wall:0xd7f5d0 },
  library:{ e:'📚', name:L('مكتبة', 'Library', 'Kütüphane'), items:['book'], col:0x8a6ad0, wall:0xece0ff },
  kiosk:  { e:'🍦', name:L('بوظة', 'Ice cream', 'Dondurma'), items:['icecream'], col:0xff8fb1, wall:0xffffff }
};

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'city_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1, FURN_MAX = 40;
const okFurn = it => it && FURN[it.k] ? { k:it.k, ix:clamp(it.ix | 0, 0, CX - 1), iz:clamp(it.iz | 0, 0, CZ - 1), r:(it.r | 0) & 3 } : null;
function freshSave(){ return { v:SAVE_V, hero:null, house:-1, flag:0, wall:0, floor:0, furn:[], veh:['car', 'scooter', 'bicycle', 'bus'], role:null, pet:null, tut:0, fish:0, got:{}, seen:{} }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.house = Number.isInteger(s.house) && s.house >= 0 && s.house < 6 ? s.house : -1;
      s.flag = clamp(s.flag | 0, 0, FLAGS.length - 1); s.wall = clamp(s.wall | 0, 0, WALLC.length - 1); s.floor = clamp(s.floor | 0, 0, FLOORC.length - 1);
      s.furn = (Array.isArray(s.furn) ? s.furn : []).map(okFurn).filter(Boolean).slice(0, FURN_MAX);
      s.veh = (Array.isArray(s.veh) ? s.veh : []).filter(k => VEH[k]); for(const k of ['car', 'scooter', 'bicycle', 'bus']) if(!s.veh.includes(k)) s.veh.push(k);
      s.role = ROLES[s.role] ? s.role : null; s.pet = PETS[s.pet] ? s.pet : null;
      s.fish = clamp(s.fish | 0, 0, 99999); s.tut = clamp(s.tut | 0, 0, 9);
      s.got = s.got && typeof s.got === 'object' ? s.got : {}; s.seen = s.seen && typeof s.seen === 'object' ? s.seen : {};
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
function reward(key, n){ if(SAVE.got[key]) return; SAVE.got[key] = 1; persist(); try{ if(window.World) World.addCoins(n, L('من مدينة بوبو', 'from Bobo City', 'Bobo Şehri\'nden')); }catch(e){} }

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
  place(){ tone(320, .14, 'sine', .12, 0, 640); tone(980, .1, 'triangle', .08, .1); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  heart(){ tone(880, .1, 'sine', .1, 0, 1320); tone(1320, .12, 'sine', .07, .08, 1760); },
  eat(){ [0, .2, .4].forEach(d => tone(260, .08, 'square', .04, d, 200)); },
  splash(){ tone(900, .3, 'sine', .08, 0, 150); [0, .12, .25].forEach(d => tone(600 + Math.random() * 300, .12, 'triangle', .05, d, 200)); },
  boing(){ tone(220, .25, 'sine', .1, 0, 660); },
  whee(){ tone(400, .9, 'sine', .08, 0, 1100); },
  bell(){ [0, .45, .9].forEach(d => { tone(1320, .8, 'sine', .1, d); tone(1980, .5, 'sine', .04, d); }); },
  horn(){ tone(330, .28, 'square', .06); tone(415, .28, 'square', .05); },
  siren(){ tone(700, .5, 'sine', .07, 0, 1000); tone(1000, .5, 'sine', .07, .5, 700); },
  jingle(){ [784, 988, 1175, 988, 784, 988, 1318].forEach((f, i) => tone(f, .16, 'triangle', .07, i * .17)); },
  flag(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .18, 'triangle', .12, i * .1)); },
  engine(){ tone(110, .3, 'sawtooth', .03, 0, 160); },
  pop(){ tone(700, .08, 'triangle', .1, 0, 1200); },
  fish(){ [659, 784, 988, 1318].forEach((f, i) => tone(f, .12, 'triangle', .1, i * .07)); },
  plane(){ tone(180, 1.4, 'sawtooth', .03, 0, 260); },
  pump(){ [0, .25, .5, .75].forEach(d => tone(500 + d * 400, .15, 'sine', .06, d)); }
};

/* ---------- Renderer (DPR cap 1.5, lowered when slow) ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xd6f0ff, 70, 190);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
scene.add(new THREE.HemisphereLight(0xfff4e2, 0x7f9a6c, 1.75));
const sun = new THREE.DirectionalLight(0xfff0d4, 2.3);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-22, right:22, top:22, bottom:-22, near:1, far:110 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(22, 40, 16);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false }));
  const pa = g.attributes.position, a = new THREE.Color(0x67bdf5), h = new THREE.Color(0xfff0d8), b = new THREE.Color(0xbfe6ff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color();
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles (instanced) ---------- */
const PMAX = 320, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
const WATER = [0xbfe8ff, 0xffffff, 0x8fd8ff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .7 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + 2; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
/* a directed water jet (fire truck, firefighter hose) */
function spray(x, y, z, dx, dy, dz, n = 3){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    p.life = .9 + Math.random() * .3; p.x = x; p.y = y; p.z = z;
    p.vx = dx * (8 + Math.random() * 2) + (Math.random() - .5); p.vy = dy * 8 + 2 + Math.random(); p.vz = dz * (8 + Math.random() * 2) + (Math.random() - .5); p.s = .9 + Math.random() * .5; p.g = 9;
    pMesh.setColorAt(i, _c.set(pick(WATER)));
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
/* floating sprites: hearts, stars, notes, letters, bubbles (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const letterTex = ch => iconTex(x => { x.fillStyle = '#3f8ef0'; x.font = '900 46px "Baloo Bhaijaan 2",system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, 32, 36); });
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); }),
  note:iconTex(x => { x.fillStyle = '#ff8fb1'; x.beginPath(); x.ellipse(22, 46, 11, 8, -.4, 0, 6.3); x.fill(); x.fillRect(30, 10, 5, 36); x.fillRect(30, 10, 18, 7); }),
  bub:iconTex(x => { x.strokeStyle = '#7fd0ff'; x.lineWidth = 5; x.fillStyle = 'rgba(200,240,255,.55)'; x.beginPath(); x.arc(32, 32, 24, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(24, 24, 6, 0, 6.3); x.fill(); }),
  zz:iconTex(x => { x.fillStyle = '#6a7cff'; x.font = '900 48px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', 32, 34); }),
  la:letterTex('أ'), lb:letterTex('ب'), lc:letterTex('A'), ld:letterTex('B'), le:letterTex('1'), lf:letterTex('2')
};
const floaters = [];
for(let i = 0; i < 48; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.heart, transparent:true, depthWrite:false })); s.visible = false; scene.add(s); floaters.push({ s, life:0, vx:0, vy:0, vz:0 }); }
let fNext = 0;
function floatIcon(kind, x, y, z, n = 1, size = .45){
  for(let k = 0; k < n; k++){
    const f = floaters[fNext]; fNext = (fNext + 1) % floaters.length;
    const kk = kind === 'letters' ? pick(['la', 'lb', 'lc', 'ld', 'le', 'lf']) : kind;
    f.s.material.map = TEX[kk]; f.s.material.needsUpdate = true; f.s.visible = true;
    f.s.position.set(x + (Math.random() - .5) * .6, y, z + (Math.random() - .5) * .6); f.s.scale.setScalar(size * (.8 + Math.random() * .4));
    f.life = 1.3 + Math.random() * .4; f.vx = (Math.random() - .5) * .5; f.vy = 1 + Math.random() * .6; f.vz = (Math.random() - .5) * .5;
  }
}
function updateFloaters(dt){
  for(const f of floaters){ if(f.life <= 0) continue; f.life -= dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = clamp(f.life * 1.5, 0, 1); if(f.life <= 0) f.s.visible = false; }
}

/* ======================================================================
   The town: ground, roads, buildings, houses, park, beach, pier, airfield
   ====================================================================== */
const CIRCLES = [], BOXES = [], SEGS = [], VBOXES = [];   // VBOXES: only vehicles bump into these (house yards)
const CULL = [];                                          // far things are hidden (distance culling)
let seed = 11;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function signTex(text, bg, fg){
  return canvasTex(512, 128, x => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, 504, 120, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    let fs = 64; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif`;
    while(x.measureText(text).width > 450 && fs > 30){ fs -= 4; x.font = `800 ${fs}px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif`; }
    x.fillText(text, 256, 70);
  });
}
function signMesh(text, bg, fg, w, h){ const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map:signTex(text, bg, fg), transparent:true })); return m; }
function plane(w, h, tex, rep, col){ if(tex && rep){ tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rep[0], rep[1]); } return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map:tex || null, color:col != null ? col : 0xffffff, roughness:.9 })); }
const onRoad = (x, z, pad = 0) => ROADS.some(([x1, z1, x2, z2]) => x >= Math.min(x1, x2) - ROAD_HW - WALK_W - pad && x <= Math.max(x1, x2) + ROAD_HW + WALK_W + pad && z >= Math.min(z1, z2) - ROAD_HW - WALK_W - pad && z <= Math.max(z1, z2) + ROAD_HW + WALK_W + pad);
const inBox = (x, z, pad = 0) => BOXES.concat(VBOXES).some(b => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);
function addCull(o, x, z, r){ CULL.push({ o, x, z, r }); }

const world = new THREE.Group(); scene.add(world);
let seaTex, fountainWater, guideArrow, guideRing, chevrons, gridMesh, bellMesh, seesawBoard, planeParked, cloudGrp;
const swingSeats = [];
const HOUSES = [];      // per house: { i, grp, walls, roof, liningMat, floorMat, furnGrp, flag, flagMat, plate, plateMat, sale, key, owner }
function buildWorld(){
  /* grass, sand and sea */
  {
    const g = new THREE.PlaneGeometry(420, 240, 70, 40); g.rotateX(-Math.PI / 2); g.translate(0, 0, -84);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x96d86c), b = new THREE.Color(0x7cc75c), far = new THREE.Color(0xa6d98a);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z), n = (Math.sin(x * .13) + Math.cos(z * .11)) * .5 + .5; _c.copy(a).lerp(b, n * .6).lerp(far, clamp((d - 70) / 60, 0, 1)); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; world.add(m);
    const sandTex = canvasTex(128, 128, x => { x.fillStyle = '#f6e2b0'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(200,170,110,.25)'; for(let i = 0; i < 60; i++) x.fillRect((i * 37) % 128, (i * 61) % 128, 2, 2); });
    const sand = plane(420, 26, sandTex, [60, 4]); sand.rotation.x = -Math.PI / 2; sand.position.set(0, .012, 46); sand.receiveShadow = true; world.add(sand);
    seaTex = canvasTex(256, 256, x => { x.fillStyle = '#4fb8ec'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 3; for(let i = 0; i < 22; i++){ x.beginPath(); const cx = (i * 71) % 256, cy = (i * 113) % 256; x.arc(cx, cy, 10 + (i % 4) * 7, .2, 2.2); x.stroke(); } });
    seaTex.wrapS = seaTex.wrapT = THREE.RepeatWrapping; seaTex.repeat.set(40, 20);
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 300), new THREE.MeshStandardMaterial({ map:seaTex, roughness:.2, metalness:.05, transparent:true, opacity:.9, fog:true }));
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, .045, SEA_Z + 150); sea.receiveShadow = true; world.add(sea);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(420, .9), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.6, depthWrite:false }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(0, .06, SEA_Z + .2); world.add(foam);
  }
  /* roads with sidewalks, centre dashes, crossings and the beach parking */
  {
    const S = new Merge(), R = new Merge(), D = new Merge();
    for(const [x1, z1, x2, z2] of ROADS){
      const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2, len = Math.hypot(x2 - x1, z2 - z1), along = x1 === x2 ? 'z' : 'x';
      const w = (ROAD_HW + WALK_W) * 2;
      if(along === 'x'){ S.add(GEO.box, cx, .03, cz, len + w, .06, w, 0, 0, 0, 0xe9e4da); R.add(GEO.box, cx, .05, cz, len + ROAD_HW * 2, .06, ROAD_HW * 2, 0, 0, 0, 0x6b7080); }
      else { S.add(GEO.box, cx, .03, cz, w, .06, len + w, 0, 0, 0, 0xe9e4da); R.add(GEO.box, cx, .05, cz, ROAD_HW * 2, .06, len + ROAD_HW * 2, 0, 0, 0, 0x6b7080); }
      for(let t = 4; t < len - 4; t += 4.5){
        const x = along === 'x' ? Math.min(x1, x2) + t : x1, z = along === 'z' ? Math.min(z1, z2) + t : z1;
        if(ROADS.some(r => r !== null && (r[0] === r[2] ? Math.abs(x - r[0]) < ROAD_HW + 1 && z > Math.min(r[1], r[3]) - 4 && z < Math.max(r[1], r[3]) + 4 && along === 'x' : Math.abs(z - r[1]) < ROAD_HW + 1 && x > Math.min(r[0], r[2]) - 4 && x < Math.max(r[0], r[2]) + 4 && along === 'z'))) continue;
        D.add(GEO.box, x, .085, z, along === 'x' ? 2 : .22, .02, along === 'x' ? .22 : 2, 0, 0, 0, 0xffffff);
      }
    }
    // zebra crossings in front of the school, the shops and the beach
    for(const [x, z, al] of [[-12, 0, 'z'], [16, 0, 'z'], [0, 33, 'x'], [-36, 12, 'x'], [36, -15, 'x']]) for(let i = -3; i <= 3; i++) D.add(GEO.box, al === 'z' ? x + i * .9 : x, .088, al === 'z' ? z : z + i * .9, al === 'z' ? .5 : 6, .02, al === 'z' ? 6 : .5, 0, 0, 0, 0xffffff);
    R.add(GEO.box, 0, .05, 38, 16, .06, 7, 0, 0, 0, 0x6b7080);
    for(let i = -3; i <= 3; i++) D.add(GEO.box, i * 2.2, .085, 39, .14, .02, 4, 0, 0, 0, 0xffffff);
    world.add(meshOf(S, false, true), meshOf(R, false, true), meshOf(D, false, true));
  }
  /* ---------- buildings ---------- */
  const building = (cx, cz, w, d, h, wall, roof, face, text, o = {}) => {
    const M = new Merge(), fz = cz + face * d / 2;
    M.add(GEO.box, cx, h / 2, cz, w, h, d, 0, 0, 0, wall);
    M.add(GEO.box, cx, h + .15, cz, w + .5, .3, d + .5, 0, 0, 0, roof);
    M.add(GEO.box, cx, .15, cz, w + .1, .3, d + .1, 0, 0, 0, o.base || 0xe2d6c4);
    const floors = Math.max(1, Math.floor(h / 3));
    for(let f = 0; f < floors; f++){
      const y = 1.5 + f * 3;
      for(let x = -w / 2 + 1.6; x <= w / 2 - 1.5; x += 2.4){
        if(f === 0 && Math.abs(x - (o.doorX || 0)) < 1.6) continue;
        M.add(GEO.box, cx + x, y + .2, fz + face * .03, 1.5, 1.2, .1, 0, 0, 0, 0xbfe8ff); M.add(GEO.box, cx + x, y - .45, fz + face * .1, 1.7, .12, .25, 0, 0, 0, 0xffffff);
      }
      for(const s of [-1, 1]) for(let z = -d / 2 + 1.6; z <= d / 2 - 1.5; z += 2.6) M.add(GEO.box, cx + s * (w / 2 + .03), y + .2, cz + z, .1, 1.2, 1.4, 0, 0, 0, 0xbfe8ff);
    }
    const dx = cx + (o.doorX || 0);
    if(!o.noDoor){ M.add(GEO.box, dx, 1.15, fz + face * .04, 1.8, 2.3, .1, 0, 0, 0, o.door || 0xc98a52); M.add(GEO.box, dx, 1.15, fz + face * .07, .04, 2.2, .04, 0, 0, 0, 0x8a5a32); M.add(GEO.box, dx, 2.4, fz + face * .2, 2.4, .14, .45, 0, 0, 0, roof); }
    if(o.awning) M.add(GEO.box, cx, 2.75, fz + face * .7, w - .4, .1, 1.5, face * .32, 0, 0, o.awning);
    if(o.extra) o.extra(M, fz);
    const mesh = meshOf(M); world.add(mesh); addCull(mesh, cx, cz, Math.max(w, d));
    if(text){ const sg = signMesh(text, o.signBg || hexCss(roof), '#fff', Math.min(w * .7, 6), Math.min(w * .7, 6) / 4); const sh = Math.min(w * .7, 6) / 4; sg.position.set(cx, o.awning ? h - sh / 2 - .25 : h - .55, fz + face * .09); if(face < 0) sg.rotation.y = Math.PI; world.add(sg); addCull(sg, cx, cz, Math.max(w, d)); }
    BOXES.push({ x0:cx - w / 2 - .1, z0:cz - d / 2 - .1, x1:cx + w / 2 + .1, z1:cz + d / 2 + .1 });
    return mesh;
  };
  // school (two floors) with a clock
  building(-18, -15, 20, 9, 6.2, 0xffd9a0, 0xe8734a, 1, L('مدرسة', 'School', 'Okul'), { extra:(M, fz) => { M.add(GEO.cyl, -18, 7.2, fz - .5, .9, .2, .9, Math.PI / 2, 0, 0, 0xffffff); M.add(GEO.box, -18, 7.35, fz - .35, .06, .5, .04, 0, 0, 0, 0x333333); M.add(GEO.box, -17.85, 7.2, fz - .35, .35, .06, .04, 0, 0, 0, 0x333333); M.add(PRISM, -18, 6.45, fz - 1.5, 3.2, 1.6, 2, 0, 0, 0, 0xe8734a); } });
  // hospital (heart sign, not a cross) with a canopy and three beds in front
  building(14, -16, 14, 9, 6.2, 0xf6f7ff, 0x5aa9e6, 1, L('مستشفى', 'Hospital', 'Hastane'), { signBg:'#ff6f91', extra:(M, fz) => {
    const hx = 14, hz = fz + .2;
    M.add(GEO.sph, hx, 7.1, fz - .3, .7, .6, .2, 0, 0, 0, 0xff6f91);
    for(const x of [7.5, 20.5]) for(const z of [-9.5, -5.6]) M.add(GEO.cyl8, x, 1.4, z, .07, 2.8, .07, 0, 0, 0, 0xffffff);
    for(const x of [9.5, 14, 18.5]){ M.add(GEO.box, x, .4, -7.6, 1.2, .2, 2.2, 0, 0, 0, 0xc0c8d4); for(const [a, b] of [[-.5, -1], [.5, -1], [-.5, 1], [.5, 1]]) M.add(GEO.cyl8, x + a, .2, -7.6 + b, .04, .4, .04, 0, 0, 0, 0x9aa7b4);
      M.add(GEO.box, x, .56, -7.5, 1.1, .14, 2, 0, 0, 0, 0xffffff); M.add(GEO.box, x, .66, -8.35, .8, .12, .4, 0, 0, 0, 0xffffff); M.add(GEO.box, x, .66, -7.2, 1.12, .1, 1.2, 0, 0, 0, 0x8fd0ff); M.add(GEO.box, x, .75, -8.7, 1.2, .5, .08, 0, 0, 0, 0xc0c8d4); }
  } });
  // fire station: big red doors
  { const cm = new THREE.Mesh(new THREE.BoxGeometry(13.6, .12, 4.6), new THREE.MeshStandardMaterial({ color:0x8fd0ff, transparent:true, opacity:.45, roughness:.4, depthWrite:false })); cm.position.set(14, 2.85, -7.6); world.add(cm); }
  building(28, -16, 8, 9, 6.2, 0xe8394a, 0xffffff, 1, L('الإطفائية', 'Fire station', 'İtfaiye'), { signBg:'#c22a3a', noDoor:true, extra:(M, fz) => { M.add(GEO.box, 28, 1.6, fz + .05, 5.4, 3.2, .1, 0, 0, 0, 0xf2f2f2); for(let i = 1; i < 6; i++) M.add(GEO.box, 28, i * .55, fz + .1, 5.4, .05, .04, 0, 0, 0, 0xd0d0d8); M.add(GEO.box, 28, .06, -8, 6, .04, 6, 0, 0, 0, 0xd9d4ca); } });
  // shops facing the middle road
  for(const [k, x, w] of [['bakery', 9, 7.5], ['toys', 18.5, 7.5], ['market', 28, 8]]){
    const S = SHOPS[k];
    building(x, 10, w, 6, 4.8, S.wall, S.col, -1, S.name, { awning:S.col, extra:(M) => { M.add(GEO.box, x, .55, 6.4, 2.6, 1.1, .9, 0, 0, 0, 0xffffff); M.add(GEO.box, x, 1.12, 6.4, 2.8, .08, 1.05, 0, 0, 0, S.col); shopDisplay(M, k, x, 1.16, 6.4); } });
  }
  // library with columns
  building(18, 21, 12, 6, 4.6, 0xece0ff, 0x8a6ad0, 1, SHOPS.library.name, { extra:(M) => { for(const x of [13, 15.5, 20.5, 23]) M.add(GEO.cyl, x, 2.2, 24.6, .3, 4.4, .3, 0, 0, 0, 0xffffff); M.add(GEO.box, 18, 4.55, 24.6, 11.6, .3, 1.3, 0, 0, 0, 0xffffff); M.add(PRISM, 18, 4.7, 24.6, 11.6, 1.1, 1.3, 0, 0, 0, 0xffffff);
    M.add(GEO.box, 18, .55, 25.4, 2.6, 1.1, .9, 0, 0, 0, 0xffffff); M.add(GEO.box, 18, 1.12, 25.4, 2.8, .08, 1.05, 0, 0, 0, 0x8a6ad0); shopDisplay(M, 'library', 18, 1.16, 25.4); } });
  // gas station: canopy, two pumps and a small shop
  {
    const M = new Merge();
    for(const [x, z] of [[43.5, -8.5], [50.5, -8.5], [43.5, -3.8], [50.5, -3.8]]) M.add(GEO.cyl8, x, 2, z, .15, 4, .15, 0, 0, 0, 0xffffff);
    M.add(GEO.box, 47, 4.1, -6.2, 9, .4, 6.4, 0, 0, 0, 0x3f8ef0); M.add(GEO.box, 47, 4.35, -6.2, 8.6, .1, 6, 0, 0, 0, 0xffffff);
    M.add(GEO.box, 47, .04, -6.2, 10, .05, 7.5, 0, 0, 0, 0xd9d4ca);
    for(const x of [45, 49.5]){ M.add(GEO.box, x, .8, -6.2, .7, 1.6, .5, 0, 0, 0, 0xff8a3d); M.add(GEO.box, x, 1.3, -5.94, .5, .35, .02, 0, 0, 0, 0xbfe8ff); M.add(GEO.cyl8, x + .4, .9, -6.2, .04, .6, .04, 0, 0, .4, 0x333333); }
    world.add(meshOf(M)); addCull(world.children[world.children.length - 1], 47, -6, 8);
    building(47, -13, 6, 4, 3, 0xffffff, 0x3f8ef0, 1, L('محطة بنزين', 'Gas station', 'Benzinlik'), {});
    CIRCLES.push({ x:45, z:-6.2, r:.5 }, { x:49.5, z:-6.2, r:.5 });
    for(const [x, z] of [[43.5, -8.5], [50.5, -8.5], [43.5, -3.8], [50.5, -3.8]]) CIRCLES.push({ x, z, r:.25 });
  }
  /* ---------- the park: lawn, paths, fountain, flowers, playground ---------- */
  {
    const M = new Merge();
    M.add(GEO.box, -18, .02, 15, 27, .04, 21, 0, 0, 0, 0x8bd66a);
    M.add(GEO.box, -20, .04, 9.8, 2.2, .03, 8, 0, 0, 0, 0xf3dfb4); M.add(GEO.box, -26, .04, 12, 10, .03, 2.2, 0, 0, 0, 0xf3dfb4); M.add(GEO.box, -14, .04, 12, 8, .03, 2.2, 0, 0, 0, 0xf3dfb4);
    M.add(GEO.cyl, -20, .045, 12, 5.5, .03, 5.5, 0, 0, 0, 0xf6e6c4);
    // fountain
    M.add(GEO.cyl, -20, .35, 12, 2.8, .7, 2.8, 0, 0, 0, 0xe9dcc6); M.add(GEO.torus, -20, .7, 12, 2.75, 2.75, 1.2, Math.PI / 2, 0, 0, 0xf6ecdc);
    M.add(GEO.cyl, -20, 1.3, 12, .35, 1.8, .35, 0, 0, 0, 0xf6ecdc); M.add(GEO.cyl, -20, 2.2, 12, 1.1, .22, 1.1, 0, 0, 0, 0xe9dcc6); M.add(GEO.sph, -20, 2.6, 12, .35, .35, .35, 0, 0, 0, 0xf6ecdc);
    // flower beds, one colour each
    const bed = (x, z, w, d, col) => { M.add(GEO.box, x, .12, z, w, .24, d, 0, 0, 0, 0x9a6b44); for(let i = 0; i < w * d * 3; i++){ const fx = x + (srnd() - .5) * (w - .3), fz = z + (srnd() - .5) * (d - .3); M.add(GEO.sm, fx, .32, fz, .1, .07, .1, 0, 0, 0, col); M.add(GEO.sm, fx, .27, fz, .14, .05, .14, 0, 0, 0, 0x4fae4a); } BOXES.push({ x0:x - w / 2, z0:z - d / 2, x1:x + w / 2, z1:z + d / 2 }); };
    bed(-27, 7, 4, 1, 0xff8fb1); bed(-27, 17, 4, 1, 0xffd23f); bed(-13, 7, 3, 1, 0xffffff); bed(-29.5, 22, 1, 4, 0xb99cff);
    // benches
    const bench = (x, z, ry) => { M.add(GEO.box, x, .45, z, 1.8, .1, .5, 0, ry, 0, 0xc98a52); M.add(GEO.box, x - Math.sin(ry) * .22, .8, z - Math.cos(ry) * .22, 1.8, .4, .08, 0, ry, 0, 0xc98a52); M.add(GEO.box, x, .22, z, 1.6, .44, .3, 0, ry, 0, 0x6a5a8a); CIRCLES.push({ x, z, r:.7 }); };
    bench(-20, 5.5, Math.PI); bench(-26, 15, Math.PI / 2); bench(-14.5, 8.5, -Math.PI / 2); bench(-8, 41, 0); bench(4, 41, 0);
    // playground: sand, swing frame, slide, seesaw base
    M.add(GEO.box, -9, .03, 19, 11, .04, 9, 0, 0, 0, 0xf7dc9c);
    for(const s of [-1, 1]){ M.add(GEO.cyl8, -8.1 + s * 2.2, 1.5, 21.9, .08, 3.1, .08, -.18, 0, 0, 0x3f8ef0); M.add(GEO.cyl8, -8.1 + s * 2.2, 1.5, 22.9, .08, 3.1, .08, .18, 0, 0, 0x3f8ef0); CIRCLES.push({ x:-8.1 + s * 2.2, z:22.4, r:.35 }); }
    M.add(GEO.cyl8, -8.1, 3, 22.4, .08, 4.6, .08, 0, 0, Math.PI / 2, 0x3f8ef0);
    const sx = -14.6, sz = 18;                             // slide: ladder at x −14.6, slope down toward +x
    for(const [dx, dz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) M.add(GEO.cyl8, sx + dx, 1.1, sz + dz, .07, 2.2, .07, 0, 0, 0, 0xff6f6f);
    M.add(GEO.box, sx, 2.2, sz, 1.2, .12, 1.2, 0, 0, 0, 0xffc23d); M.add(GEO.cone4, sx, 2.95, sz, .95, .8, .95, 0, Math.PI / 4, 0, 0xff6f6f);
    M.add(GEO.box, sx + 2, 1.15, sz, 3.3, .08, 1, 0, 0, -.6, 0x5ed6a0); for(const s of [-1, 1]) M.add(GEO.box, sx + 2, 1.3, sz + s * .5, 3.3, .3, .06, 0, 0, -.6, 0x46c08c);
    for(let i = 0; i < 6; i++) M.add(GEO.box, sx - .62, .3 + i * .36, sz, .08, .06, .9, 0, 0, 0, 0xff6f6f);
    CIRCLES.push({ x:sx, z:sz, r:.95 }, { x:sx + 1.6, z:sz, r:.6 }, { x:sx + 2.6, z:sz, r:.5 });
    M.add(GEO.cone4, -5.5, .3, 15.5, .35, .6, .35, 0, Math.PI / 4, 0, 0xb99cff); CIRCLES.push({ x:-5.5, z:15.5, r:.4 });
    const pm = meshOf(M); world.add(pm); addCull(pm, -18, 15, 16);
    CIRCLES.push({ x:-20, z:12, r:2.95 });
    fountainWater = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), new THREE.MeshStandardMaterial({ map:seaTex, roughness:.15, transparent:true, opacity:.9 }));
    fountainWater.rotation.x = -Math.PI / 2; fountainWater.position.set(-20, .62, 12); world.add(fountainWater);
    // swing seats (animated) and the seesaw board (rocks)
    for(const x of [-7, -9.2]){
      const g = new THREE.Group(); g.position.set(x, 3, 22.4);
      const S = new Merge(); S.add(GEO.box, 0, -2.25, 0, .65, .07, .35, 0, 0, 0, 0xffc23d); for(const s of [-1, 1]) S.add(GEO.cyl8, s * .28, -1.12, 0, .015, 2.2, .015, 0, 0, 0, 0x777777);
      g.add(meshOf(S)); world.add(g); swingSeats.push(g);
    }
    const B = new Merge(); B.add(GEO.box, 0, 0, 0, 4, .12, .4, 0, 0, 0, 0xb99cff); for(const s of [-1, 1]){ B.add(GEO.box, s * 1.75, .08, 0, .5, .06, .45, 0, 0, 0, 0xffc23d); B.add(GEO.cyl8, s * 1.5, .3, 0, .03, .4, .03, 0, 0, 0, 0x777777); B.add(GEO.box, s * 1.5, .5, 0, .06, .06, .4, 0, 0, 0, 0x777777); }
    seesawBoard = meshOf(B); seesawBoard.position.set(-5.5, .62, 15.5); world.add(seesawBoard);
  }
  /* ---------- school yard: bell post and a chalkboard ---------- */
  {
    const M = new Merge();
    M.add(GEO.box, -18, .02, -7, 20, .04, 6.5, 0, 0, 0, 0xe9d8b8);
    for(const s of [-1, 1]) M.add(GEO.box, -11 + s * .6, 1.4, -8.4, .14, 2.8, .14, 0, 0, 0, 0x8a5a32); M.add(GEO.box, -11, 2.85, -8.4, 1.6, .16, .3, 0, 0, 0, 0x8a5a32);
    M.add(GEO.box, -24, 1.4, -8.6, 3, 1.6, .12, 0, 0, 0, 0x2f6b4f); M.add(GEO.box, -24, 1.4, -8.66, 3.2, 1.8, .06, 0, 0, 0, 0xc98a52); for(const s of [-1, 1]) M.add(GEO.box, -24 + s * 1.4, .6, -8.7, .1, 1.2, .1, 0, 0, 0, 0xc98a52);
    for(let i = 0; i < 5; i++) M.add(GEO.box, -25 + i * .45, 1.55 + (i % 2) * .2, -8.53, .3, .04, .01, 0, 0, i * .3, 0xffffff);
    world.add(meshOf(M)); CIRCLES.push({ x:-10.4, z:-8.4, r:.25 }, { x:-11.6, z:-8.4, r:.25 }); BOXES.push({ x0:-25.6, z0:-8.8, x1:-22.4, z1:-8.4 });
    const BM = new Merge(); BM.add(GEO.cone, 0, -.35, 0, .38, .55, .38, 0, 0, 0, 0xffc23d); BM.add(GEO.sph, 0, -.62, 0, .1, .1, .1, 0, 0, 0, 0xc98f12); BM.add(GEO.cyl8, 0, -.05, 0, .05, .14, .05, 0, 0, 0, 0x8a5a32);
    bellMesh = meshOf(BM); bellMesh.position.set(-11, 2.75, -8.4); world.add(bellMesh);
  }
  /* ---------- beach: palms, umbrellas (one colour each), towels, kiosk ---------- */
  {
    const M = new Merge();
    const palm = (x, z, s) => { for(let i = 0; i < 6; i++) M.add(GEO.cyl8, x + i * .08 * s, .4 + i * .7 * s, z, .2 - i * .015, .75 * s, .2 - i * .015, 0, 0, -.08, 0xb98a5a); for(let i = 0; i < 7; i++){ const a = i / 7 * Math.PI * 2; M.add(GEO.sph, x + .5 * s + Math.cos(a) * 1.1 * s, 4.3 * s, z + Math.sin(a) * 1.1 * s, 1.2 * s, .12, .36 * s, 0, -a, -.35, i % 2 ? 0x46b85a : 0x5cc86a); } M.add(GEO.sph, x + .5 * s, 4.25 * s, z, .3, .3, .3, 0, 0, 0, 0x8a5a32); CIRCLES.push({ x, z, r:.35 }); };
    for(const [x, z] of [[-30, 39], [-22, 44], [-44, 42], [26, 40], [36, 44], [48, 39], [-54, 37], [56, 43]]) palm(x, z, .9 + srnd() * .3);
    const umb = (x, z, col) => { M.add(GEO.cyl8, x, 1.2, z, .05, 2.4, .05, 0, 0, 0, 0xffffff); M.add(GEO.cone, x, 2.45, z, 1.5, .6, 1.5, 0, 0, 0, col); M.add(GEO.box, x + .6, .03, z + 1.2, 1, .03, 1.9, 0, .2, 0, col); CIRCLES.push({ x, z, r:.15 }); };
    umb(-16, 45, 0x3f8ef0); umb(-30, 46, 0xff8fb1); umb(22, 45, 0xffc23d); umb(32, 46.5, 0x5ed6a0); umb(-40, 46, 0xff9f43);
    M.add(GEO.cyl, 4, .3, 46, .6, .6, .6, 0, 0, 0, 0xf6e2b0); M.add(GEO.cone4, 4, .9, 46, .45, .6, .45, 0, Math.PI / 4, 0, 0xf6e2b0);     // sandcastle
    for(const [x, z] of [[-48, 48], [52, 47], [44, 49]]) M.add(GEO.dode, x, .25, z, .9, .5, .7, srnd(), srnd() * 3, 0, 0xc8c0b0);
    // ice-cream kiosk
    M.add(GEO.box, -8, 1.3, 43, 3.6, 2.6, 2.6, 0, 0, 0, 0xffffff); M.add(GEO.box, -8, 2.75, 43, 4.2, .2, 3.2, 0, 0, 0, 0xff8fb1);
    M.add(GEO.box, -8, 1.65, 41.68, 2.4, .9, .06, 0, 0, 0, 0x9a6b4a); M.add(GEO.box, -8, 1.1, 41.4, 3, .12, .7, 0, 0, 0, 0xff8fb1);
    M.add(GEO.cone, -8, 3.4, 43, .35, .9, .35, Math.PI, 0, 0, 0xf2c27a); M.add(GEO.sph, -8, 3.95, 43, .45, .4, .45, 0, 0, 0, 0xff9fc0); shopDisplay(M, 'kiosk', -8, 1.16, 41.4);
    BOXES.push({ x0:-9.9, z0:41.6, x1:-6.1, z1:44.4 });
    const bm = meshOf(M); world.add(bm); addCull(bm, 0, 44, 40);
    const sg = signMesh(SHOPS.kiosk.name, '#ff8fb1', '#fff', 2.4, .6); sg.position.set(-8, 2.3, 41.66); sg.rotation.y = Math.PI; world.add(sg);
  }
  /* ---------- the pier (deck at y = 1), posts, ramp, ladder ---------- */
  {
    const M = new Merge(), cx = (PIER.x0 + PIER.x1) / 2, w = PIER.x1 - PIER.x0;
    M.add(GEO.box, cx, PIER.y - .1, (PIER.zDeck + PIER.z1) / 2, w, .2, PIER.z1 - PIER.zDeck, 0, 0, 0, 0xc9965e);
    for(let z = PIER.zDeck + .5; z < PIER.z1; z += .9) M.add(GEO.box, cx, PIER.y + .005, z, w - .1, .02, .06, 0, 0, 0, 0xa87a46);
    const rl = PIER.zDeck - PIER.z0, ra = Math.atan2(PIER.y, rl);
    M.add(GEO.box, cx, PIER.y / 2 - .08, (PIER.z0 + PIER.zDeck) / 2, w, .16, Math.hypot(rl, PIER.y), ra, 0, 0, 0xc9965e);
    for(let z = PIER.zDeck; z <= PIER.z1; z += 3) for(const x of [PIER.x0 + .15, PIER.x1 - .15]) M.add(GEO.cyl8, x, -.3, z, .16, 2.6, .16, 0, 0, 0, 0x8a5a32);
    for(const x of [PIER.x0 + .05, PIER.x1 - .05]){ for(let z = PIER.zDeck; z <= 52; z += 2) M.add(GEO.cyl8, x, PIER.y + .45, z, .05, .9, .05, 0, 0, 0, 0xffffff); M.add(GEO.box, x, PIER.y + .85, (PIER.zDeck + 52) / 2, .08, .08, 52 - PIER.zDeck, 0, 0, 0, 0xffffff); }
    for(let i = 0; i < 6; i++) M.add(GEO.box, PIER.x1 + .25, PIER.y - .2 - i * .32, 63.5, .5, .05, .05, 0, 0, 0, 0xdddddd); for(const s of [-1, 1]) M.add(GEO.box, PIER.x1 + .25, .1, 63.5 + s * .25, .05, 2, .05, 0, 0, 0, 0xdddddd);
    M.add(GEO.cyl, cx, PIER.y + .3, PIER.z1 - .4, .25, .6, .25, 0, 0, 0, 0xff8a3d); M.add(GEO.torus, PIER.x0 - .05, PIER.y + .4, 58, .35, .35, .5, 0, Math.PI / 2, 0, 0xff5d73);
    const m = meshOf(M); world.add(m); addCull(m, 12, 55, 20);
    // the deck is walkable only from the ramp: its sides and end are walls for walking and swimming
    SEGS.push({ x1:PIER.x0, z1:PIER.z0 + .6, x2:PIER.x0, z2:PIER.z1, t:.12, pier:true }, { x1:PIER.x1, z1:PIER.z0 + .6, x2:PIER.x1, z2:PIER.z1, t:.12, pier:true }, { x1:PIER.x0, z1:PIER.z1, x2:PIER.x1, z2:PIER.z1, t:.12, pier:true });
    VBOXES.push({ x0:PIER.x0 - .3, z0:PIER.z0, x1:PIER.x1 + .3, z1:PIER.z1 + .3 });
  }
  /* ---------- the airfield: runway, hangar, windsock, the little plane ---------- */
  {
    const M = new Merge();
    M.add(GEO.box, -50, .05, 2, 7, .06, 52, 0, 0, 0, 0x7a7f8c); for(let z = -22; z < 26; z += 5) M.add(GEO.box, -50, .085, z, .4, .02, 2.6, 0, 0, 0, 0xffffff);
    M.add(GEO.box, -50, .06, 26, 9, .05, 6, 0, 0, 0, 0x8a8f9c);
    M.add(GEO.box, -58, 2.5, 14, 6, 5, 9, 0, 0, 0, 0xdfe6f2); M.add(GEO.cyl, -58, 5, 14, 3, 9, 3, Math.PI / 2, 0, 0, 0xdfe6f2); M.add(GEO.box, -54.96, 2, 14, .1, 3.8, 6, 0, 0, 0, 0x9aa7b4);
    M.add(GEO.cyl8, -44, 2, 26, .06, 4, .06, 0, 0, 0, 0xffffff); M.add(GEO.cone, -43.4, 3.8, 26, .25, 1.2, .25, 0, 0, -Math.PI / 2 + .2, 0xff8a3d);
    world.add(meshOf(M)); BOXES.push({ x0:-61, z0:9.5, x1:-55, z1:18.5 }); CIRCLES.push({ x:-44, z:26, r:.2 });
    const sg = signMesh(L('مطار', 'Airfield', 'Havaalanı'), '#ff9f43', '#fff', 4, 1); sg.position.set(-54.9, 4.2, 14); sg.rotation.y = Math.PI / 2; world.add(sg);
    planeParked = CM.buildVehicle('plane'); planeParked.grp.position.set(PLACES.plane.x, 0, PLACES.plane.z); planeParked.grp.rotation.y = Math.PI; world.add(planeParked.grp);
  }
  /* ---------- the 6 houses ---------- */
  for(let i = 0; i < 6; i++) buildHouse(i);
  /* ---------- street lamps (instanced) ---------- */
  {
    const LP = [];
    for(const [x1, z1, x2, z2] of ROADS){
      const len = Math.hypot(x2 - x1, z2 - z1), al = x1 === x2 ? 'z' : 'x';
      for(let t = 6, k = 0; t < len - 3; t += 14, k++){
        const s = k % 2 ? 1 : -1, off = ROAD_HW + WALK_W - .4;
        const x = al === 'x' ? Math.min(x1, x2) + t : x1 + s * off, z = al === 'z' ? Math.min(z1, z2) + t : z1 + s * off;
        if(LP.some(p => Math.hypot(p[0] - x, p[1] - z) < 6)) continue;
        if(ROADS.some(r => { const ra = r[0] === r[2] ? 'z' : 'x'; if(ra === al) return false; return ra === 'x' ? Math.abs(z - r[1]) < ROAD_HW + .2 && x > Math.min(r[0], r[2]) - ROAD_HW && x < Math.max(r[0], r[2]) + ROAD_HW : Math.abs(x - r[0]) < ROAD_HW + .2 && z > Math.min(r[1], r[3]) - ROAD_HW && z < Math.max(r[1], r[3]) + ROAD_HW; })) continue;
        LP.push([x, z]);
      }
    }
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.07, .1, 3.6, 8), new THREE.MeshStandardMaterial({ color:0x4a4a5a, roughness:.6 }), LP.length);
    const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 12, 8), new THREE.MeshStandardMaterial({ color:0xfff4c8, emissive:0xffe8a0, emissiveIntensity:.35, roughness:.4 }), LP.length);
    LP.forEach(([x, z], i) => { _m.compose(_v.set(x, 1.8, z), _q.identity(), _s.set(1, 1, 1)); pole.setMatrixAt(i, _m); _m.compose(_v.set(x, 3.7, z), _q.identity(), _s.set(1, 1, 1)); head.setMatrixAt(i, _m); CIRCLES.push({ x, z, r:.2 }); });
    pole.castShadow = true; world.add(pole, head);
  }
  /* ---------- trees (instanced trunks + crowns) and bushes ---------- */
  {
    const T = [];
    const free = (x, z, pad) => !onRoad(x, z, pad) && !inBox(x, z, pad + .5) && !(x > -54 && x < -45 && z > -25 && z < 30) && !(z > 33) && !HOUSE_X.some(hx => Math.abs(x - hx) < 6.5 && z > -51 && z < -33);
    const tree = (x, z, s = 1, check = true) => { if(check && !free(x, z, 1.2)) return; T.push([x, z, s]); if(x > BOUND.x0 - 2 && x < BOUND.x1 + 2 && z > BOUND.z0 - 2) CIRCLES.push({ x, z, r:.5 * s }); };
    for(const [x, z] of [[-30, 5], [-31, 13], [-30, 24], [-23, 25], [-16, 25.5], [-6, 9], [-24, 4.8], [-4.8, 25]]) tree(x, z, 1.1 + srnd() * .3);
    for(let i = 0; i < 40; i++) tree(-60 + srnd() * 120, -27 + srnd() * 58, .9 + srnd() * .5);
    for(const hx of HOUSE_X) for(const s of [-1, 1]) tree(hx + s * 7.5, -48 + srnd() * 6, 1 + srnd() * .3, false);
    for(let i = 0; i < 110; i++){ const a = srnd() * Math.PI * 2, r = 72 + srnd() * 40, x = Math.cos(a) * r * 1.1, z = -10 + Math.sin(a) * r * .9; if(z > 30) continue; tree(x, z, 1.3 + srnd() * .9, false); }
    for(let i = 0; i < 26; i++){ const x = -62 + i * 5 + srnd() * 2, z = -56 + srnd() * 3; tree(x, z, 1.1 + srnd() * .5, false); }
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1.15, 1), new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
    T.forEach(([x, z, s], i) => {
      _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
      _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
      _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
    });
    trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
    const BU = [];
    for(const hx of HOUSE_X) for(const s of [-1, 1]) for(let k = 0; k < 3; k++) BU.push([hx + s * (2.2 + k * 1.1), -41.3]);
    for(let i = 0; i < 16; i++){ const a = i / 16 * Math.PI * 2; BU.push([-20 + Math.cos(a) * 6.3, 12 + Math.sin(a) * 6.3]); }
    const BU2 = BU.filter(([x, z]) => !onRoad(x, z) && Math.abs(Math.hypot(x + 20, z - 12) - 6.3) > .1 || z === -41.3).filter(([x, z]) => !(Math.abs(x + 20) < 1.4 && z < 12) && !(Math.abs(z - 12) < 1.4));
    const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.6, 1), new THREE.MeshStandardMaterial({ color:0x58b84e, roughness:.85, flatShading:true }), BU2.length);
    BU2.forEach(([x, z], i) => { _m.compose(_v.set(x, .4, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(1, .75, 1)); bush.setMatrixAt(i, _m); CIRCLES.push({ x, z, r:.5 }); });
    bush.castShadow = true; world.add(bush);
  }
  /* soft hills far away and a few clouds */
  {
    const HL = new Merge();
    for(let i = 0; i < 16; i++){ const a = Math.PI + i / 15 * Math.PI, r = 150 + srnd() * 30; HL.add(GEO.sph, Math.cos(a) * r, -6, -10 + Math.sin(a) * r * .8, 30 + srnd() * 16, 16 + srnd() * 12, 22, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
    world.add(meshOf(HL, false, false));
    const CL = new Merge();
    for(let i = 0; i < 9; i++){ const a = i / 9 * Math.PI * 2, r = 90 + srnd() * 60, x = Math.cos(a) * r, z = Math.sin(a) * r, y = 55 + srnd() * 15; for(let k = 0; k < 4; k++) CL.add(GEO.ico1, x + k * 4 - 6, y + (k % 2) * 1.5, z + srnd() * 3, 4 + srnd() * 2, 2.6, 3.5, 0, 0, 0, 0xffffff); }
    cloudGrp = new THREE.Mesh(CL.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1, flatShading:true, fog:false, emissive:0xffffff, emissiveIntensity:.25 }));
    world.add(cloudGrp);
  }
  /* guide: a bouncing arrow over the place to go, a ring on the ground and a chevron path */
  {
    const GA = new Merge(); GA.add(GEO.cone, 0, 0, 0, .55, .85, .55, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .7, 0, .22, .7, .22, 0, 0, 0, 0xffc23d);
    guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
    guideRing = new THREE.Mesh(new THREE.RingGeometry(1, 1.3, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
    guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
    const sh = new THREE.Shape(); sh.moveTo(0, .5); sh.lineTo(.55, -.1); sh.lineTo(.3, -.1); sh.lineTo(0, .22); sh.lineTo(-.3, -.1); sh.lineTo(-.55, -.1); sh.closePath();
    const cg = new THREE.ShapeGeometry(sh); cg.rotateX(-Math.PI / 2);
    chevrons = new THREE.InstancedMesh(cg, new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide }), 14);
    chevrons.frustumCulled = false; chevrons.count = 0; world.add(chevrons);
  }
}
/* the item on show on a shop counter */
function shopDisplay(M, k, x, y, z){
  if(k === 'bakery'){ for(let i = 0; i < 3; i++) M.add(GEO.sph, x - .7 + i * .7, y + .08, z, .1, .1, .32, 0, .4, 0, 0xe0a050); }
  else if(k === 'toys'){ for(let i = 0; i < 3; i++){ M.add(GEO.cyl8, x - .7 + i * .7, y + .5, z, .01, 1, .01, 0, 0, 0, 0xffffff); M.add(GEO.sph, x - .7 + i * .7, y + 1.15, z, .25, .3, .25, 0, 0, 0, [0xff5d73, 0x3f8ef0, 0xffc23d][i]); } }
  else if(k === 'market'){ for(let i = 0; i < 5; i++) M.add(GEO.sph, x - .8 + i * .4, y + .1, z + (i % 2) * .15, .12, .11, .12, 0, 0, 0, i % 2 ? 0x6ccf4a : 0xff4d5e); M.add(GEO.box, x + .9, y + .12, z, .25, .3, .18, 0, 0, 0, 0xffa23d); }
  else if(k === 'library'){ for(let i = 0; i < 4; i++) M.add(GEO.box, x - .75 + i * .5, y + .14, z, .35, .28, .08, -.2, 0, 0, [0x5ed6a0, 0x3f8ef0, 0xff8a7e, 0xb99cff][i]); }
  else if(k === 'kiosk'){ for(let i = 0; i < 3; i++){ M.add(GEO.cone, x - .6 + i * .6, y + .12, z, .07, .2, .07, Math.PI, 0, 0, 0xf2c27a); M.add(GEO.sph, x - .6 + i * .6, y + .26, z, .09, .08, .09, 0, 0, 0, [0xff9fc0, 0xfff1d6, 0xa5e3c0][i]); } }
}
/* one house: outside walls in the house colour, an inside lining and floor in the chosen colours, a gable roof,
   a front path, a flag pole (single-colour flag when someone lives here), a «pick me» sign when free */
const floorTex = canvasTex(256, 256, x => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256); for(let i = 0; i < 8; i++){ x.fillStyle = i % 2 ? '#f2f2f2' : '#fafafa'; x.fillRect(0, i * 32, 256, 30); x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, i * 32 + 30, 256, 2); x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 30); } });
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 2.4);
function buildHouse(i){
  const hx = HOUSE_X[i], hz = HOUSE_Z, x0 = hx - HW / 2, x1 = hx + HW / 2, z0 = hz - HD / 2, z1 = hz + HD / 2;
  const grp = new THREE.Group(); world.add(grp);
  const segs = [[x0, z0, x1, z0, 0, 1], [x0, z0, x0, z1, 1, 0], [x1, z0, x1, z1, -1, 0], [x0, z1, hx - 1, z1, 0, -1], [hx + 1, z1, x1, z1, 0, -1]];
  const W = new Merge(), Li = new Merge(), col = HOUSE_COL[i];
  for(const [a, b, c, d, nx, nz] of segs){
    const L2 = Math.hypot(c - a, d - b), cx = (a + c) / 2, cz = (b + d) / 2, ry = Math.atan2(c - a, d - b);
    W.add(GEO.box, cx, WALL_H / 2, cz, WALL_T, WALL_H, L2 + WALL_T, 0, ry, 0, col);
    W.add(GEO.box, cx, WALL_H + .06, cz, WALL_T + .14, .12, L2 + WALL_T + .14, 0, ry, 0, 0xffffff);
    W.add(GEO.box, cx, .15, cz, WALL_T + .06, .3, L2 + WALL_T + .02, 0, ry, 0, 0xd9c7a8);
    Li.add(GEO.box, cx + nx * (WALL_T / 2 + .02), WALL_H / 2 + .04, cz + nz * (WALL_T / 2 + .02), .04, WALL_H - .1, L2 - (nx ? .1 : .34), 0, ry, 0, 0xffffff);
    SEGS.push({ x1:a, z1:b, x2:c, z2:d, t:WALL_T / 2 });
  }
  for(const x of [hx - 3, hx + 3]) W.add(GEO.box, x, 1.5, z1, 1.4, 1.1, WALL_T + .08, 0, 0, 0, 0xa8dcff);
  for(const z of [hz - 1.5]) for(const x of [x0, x1]) W.add(GEO.box, x, 1.5, z, WALL_T + .08, 1.1, 1.6, 0, 0, 0, 0xa8dcff);
  W.add(GEO.box, hx, 1.5, z0, 1.6, 1.1, WALL_T + .08, 0, 0, 0, 0xa8dcff);
  for(const x of [hx - 1.1, hx + 1.1]) W.add(GEO.box, x, WALL_H / 2, z1, .22, WALL_H, .42, 0, 0, 0, 0xffffff);
  W.add(GEO.box, hx - .95, 1.05, z1 + .45, .1, 2.1, .9, 0, 0, 0, 0xc98a52);                 // the open door
  const walls = new THREE.Group(); walls.add(meshOf(W)); grp.add(walls);
  const liningMat = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.8, color:WALLC[0] });
  const lining = new THREE.Mesh(Li.geometry(), liningMat); lining.receiveShadow = true; walls.add(lining);
  const floorMat = new THREE.MeshStandardMaterial({ map:floorTex, color:FLOORC[0], roughness:.85 });
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(HW, HD), floorMat); fl.rotation.x = -Math.PI / 2; fl.position.set(hx, .07, hz); fl.receiveShadow = true; grp.add(fl);
  const B = new Merge();
  B.add(GEO.box, hx, .03, hz, HW + .8, .06, HD + .8, 0, 0, 0, 0xe8d2ad);
  B.add(GEO.box, hx, .045, (z1 + -35) / 2 + .2, 2, .05, -35 - z1 + .4, 0, 0, 0, 0xf3dfb4);              // front path to the sidewalk
  B.add(GEO.box, hx + 3.6, .5, -37.6, .1, 1, .1, 0, 0, 0, 0x8a5a32); B.add(GEO.box, hx + 3.6, 1.1, -37.6, .4, .3, .55, 0, 0, 0, ROOF_COL[i]);   // mailbox
  B.add(GEO.cyl8, hx - 3.6, 2.2, -38.4, .06, 4.4, .06, 0, 0, 0, 0xffffff); B.add(GEO.sph, hx - 3.6, 4.45, -38.4, .1, .1, .1, 0, 0, 0, 0xffc23d);
  grp.add(meshOf(B, true, true));
  CIRCLES.push({ x:hx + 3.6, z:-37.6, r:.3 }, { x:hx - 3.6, z:-38.4, r:.2 });
  VBOXES.push({ x0:x0 - .6, z0:z0 - .6, x1:x1 + .6, z1:-40.6 });
  const roof = new THREE.Group(); roof.position.y = WALL_H; grp.add(roof);
  const R = new Merge();
  R.add(PRISM, hx, 0, hz, HD + 1.2, 2.3, HW + .9, 0, Math.PI / 2, 0, ROOF_COL[i]);
  R.add(GEO.box, hx + 2.6, 1.6, hz - 1.4, .8, 1.8, .8, 0, 0, 0, 0xd7b08a); R.add(GEO.box, hx + 2.6, 2.55, hz - 1.4, 1, .16, 1, 0, 0, 0, 0xbf9670);
  R.add(GEO.box, hx, 0, hz, HW + .5, .14, HD + .5, 0, 0, 0, ROOF_COL[i]);
  roof.add(meshOf(R));
  const flagMat = new THREE.MeshStandardMaterial({ color:FLAGS[0], roughness:.7, side:THREE.DoubleSide });
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .8, 6, 1), flagMat); flag.position.set(hx - 3.6 + .62, 3.9, -38.4); flag.castShadow = true; flag.visible = false; grp.add(flag);
  const fpos = flag.geometry.attributes.position; flag.userData.base = Float32Array.from(fpos.array);
  const plateMat = new THREE.MeshBasicMaterial({ transparent:true });
  const plate = new THREE.Mesh(new THREE.CircleGeometry(.55, 28), plateMat); plate.position.set(hx, .75, z1 + .62); plate.visible = false; roof.add(plate);
  const plateRim = new THREE.Mesh(new THREE.RingGeometry(.55, .66, 28), new THREE.MeshBasicMaterial({ color:0xffffff })); plate.add(plateRim); plateRim.position.z = -.005;
  const sale = new THREE.Group(); grp.add(sale);
  { const M = new Merge(); M.add(GEO.box, 0, .7, 0, .1, 1.4, .1, 0, 0, 0, 0x8a5a32); sale.add(meshOf(M)); const sg = signMesh(L('اختارني! 🏠', 'Pick me!', 'Beni seç!'), '#ffc23d', '#4a2c00', 1.8, .45); sg.position.y = 1.45; sale.add(sg); sale.position.set(hx + 1.8, 0, -39.6); }
  const furnGrp = new THREE.Group(); grp.add(furnGrp);
  const H = { i, grp, walls, roof, liningMat, floorMat, furnGrp, flag, flagMat, plate, plateMat, sale, key:'', owner:'', wallK:1, x:hx, z:hz };
  HOUSES.push(H); addCull(grp, hx, hz, 9);
}

/* ======================================================================
   Houses: who lives where (the host's TOWN.own is the truth online), furniture, colours, flags
   ====================================================================== */
const HS = new Map();                        // player id → { h, flag, wall, floor, furn:[[k,ix,iz,r]], hero }
const TOWN = { own:['', '', '', '', '', ''] };
let ME = '';                                 // my id (also used offline)
const myHS = () => ({ h:SAVE.house, flag:SAVE.flag, wall:SAVE.wall, floor:SAVE.floor, furn:SAVE.furn.map(it => [it.k, it.ix, it.iz, it.r]), hero:heroId });
const hsOf = id => id === ME ? myHS() : HS.get(id) || null;
const myHouse = () => TOWN.own.indexOf(ME);
function hsIn(p){
  if(!p || typeof p !== 'object') return null;
  const h = Number.isInteger(p.h) && p.h >= 0 && p.h < 6 ? p.h : -1;
  const furn = (Array.isArray(p.furn) ? p.furn : []).slice(0, FURN_MAX).map(r => Array.isArray(r) ? okFurn({ k:r[0], ix:r[1], iz:r[2], r:r[3] }) : null).filter(Boolean).map(it => [it.k, it.ix, it.iz, it.r]);
  return { h, flag:clamp(p.flag | 0, 0, FLAGS.length - 1), wall:clamp(p.wall | 0, 0, WALLC.length - 1), floor:clamp(p.floor | 0, 0, FLOORC.length - 1), furn, hero:HEROES[p.hero] ? p.hero : 'sara' };
}
/* who gets which house: players in join order keep the house they picked; if two want the same one, the later one gets a free one */
function computeOwn(ids){
  const own = ['', '', '', '', '', ''], later = [];
  for(const id of ids){ const hs = hsOf(id); if(!hs || hs.h < 0) continue; if(!own[hs.h]) own[hs.h] = id; else later.push(id); }
  for(const id of later){ const f = own.indexOf(''); if(f >= 0) own[f] = id; }
  return own;
}
function townIds(){ return mpActive() ? MP.players.map(p => p.id) : [ME]; }
function setOwn(own){
  const before = TOWN.own.join('|'); TOWN.own = own.slice(0, 6).map(v => typeof v === 'string' ? v : '');
  if(TOWN.own.join('|') !== before){ refreshHouses(); hudKey = ''; }
}
function localOwn(){ if(!mpActive() || MP.isHost) setOwn(computeOwn(townIds())); }
const plateTex = {};
function heroPlate(id){ if(!plateTex[id]){ const t = new THREE.TextureLoader().load(charImg(id)); t.colorSpace = THREE.SRGBColorSpace; plateTex[id] = t; } return plateTex[id]; }
function houseItems(i){ const o = TOWN.own[i], hs = o && hsOf(o); return hs ? hs.furn.map(r => ({ k:r[0], ix:r[1], iz:r[2], r:r[3] })) : []; }
const fdim = (k, r) => { const f = FURN[k]; return r % 2 ? [f.d, f.w] : [f.w, f.d]; };
const wallSide = it => it.iz === 0 ? 0 : it.ix === 0 ? 1 : it.ix === CX - 1 ? 3 : -1;
function fcenter(i, it){
  const [w, d] = fdim(it.k, it.r), x0 = houseX0(i), z0 = houseZ0();
  if(FURN[it.k].wall){
    const s = wallSide(it), x = x0 + it.ix + .5, z = z0 + it.iz + .5;
    return s === 0 ? { x, z:z0 + .7, w:1, d:1, r:0 } : s === 1 ? { x:x0 + .7, z, w:1, d:1, r:1 } : { x:x0 + CX - .7, z, w:1, d:1, r:3 };
  }
  return { x:x0 + it.ix + w / 2, z:z0 + it.iz + d / 2, w, d, r:it.r };
}
const SOLID = new Set(['bed', 'bigbed', 'bunk', 'sofa', 'tv', 'counter', 'stove', 'fridge', 'dining', 'shelf', 'wardrobe', 'piano', 'bath', 'deskLamp', 'bigplant', 'plant', 'lamp', 'toybox', 'flowers']);
let FBOX = [];
function refreshHouses(force){
  FBOX = [];
  for(const H of HOUSES){
    const o = TOWN.own[H.i], hs = o ? hsOf(o) : null;
    const key = o + '|' + (hs ? JSON.stringify([hs.flag, hs.wall, hs.floor, hs.furn, hs.hero]) : '');
    if(key !== H.key || force){
      H.key = key; H.owner = o;
      while(H.furnGrp.children.length) H.furnGrp.remove(H.furnGrp.children[0]);
      H.liningMat.color.set(WALLC[hs ? hs.wall : 0]); H.floorMat.color.set(FLOORC[hs ? hs.floor : 0]);
      H.flag.visible = !!hs; H.sale.visible = !hs; H.plate.visible = !!hs;
      if(hs){ H.flagMat.color.set(FLAGS[hs.flag]); H.plateMat.map = heroPlate(o === ME ? heroId : hs.hero); H.plateMat.needsUpdate = true; }
      houseItems(H.i).forEach((it, idx) => {
        const m = CM.buildFurn(it.k), c = fcenter(H.i, it);
        m.position.set(c.x, .07, c.z); m.rotation.y = c.r * Math.PI / 2; m.userData.idx = idx; H.furnGrp.add(m);
      });
    }
    houseItems(H.i).forEach(it => {
      if(!SOLID.has(it.k)) return;
      const c = fcenter(H.i, it), sh = Math.max(c.w, c.d) <= 1 ? .22 : .12;
      FBOX.push({ x0:c.x - c.w / 2 + sh, z0:c.z - c.d / 2 + sh, x1:c.x + c.w / 2 - sh, z1:c.z + c.d / 2 - sh });
    });
  }
}
const inHouseRect = (i, x, z, m = 0) => x > houseX0(i) + m && x < houseX0(i) + HW - m && z > houseZ0() + m && z < houseZ0() + HD - m;
function houseAt(x, z, m = 0){ for(let i = 0; i < 6; i++) if(inHouseRect(i, x, z, m)) return i; return -1; }
const DOOR_CELLS = new Set(['4,7', '5,7', '4,6', '5,6']);
function cellsOf(it){ const [w, d] = fdim(it.k, it.r), out = []; for(let x = 0; x < w; x++) for(let z = 0; z < d; z++) out.push([it.ix + x, it.iz + z]); return out; }
const layer = k => FURN[k].wall ? 2 : FURN[k].rug ? 1 : 0;
function canPlace(it, list){
  const F = FURN[it.k];
  if(F.wall){ if(wallSide(it) < 0 || it.ix < 0 || it.ix >= CX || it.iz < 0 || it.iz >= CZ) return false; }
  else { const [w, d] = fdim(it.k, it.r); if(it.ix < 0 || it.iz < 0 || it.ix + w > CX || it.iz + d > CZ) return false; }
  const mine = cellsOf(F.wall ? Object.assign({}, it, { r:0 }) : it);
  if(layer(it.k) === 0) for(const [x, z] of mine) if(DOOR_CELLS.has(x + ',' + z)) return false;
  const set = new Set(mine.map(c => c + ''));
  for(const o of list){ if(layer(o.k) !== layer(it.k)) continue; if(FURN[o.k].wall && FURN[it.k].wall && wallSide(o) !== wallSide(it)) continue; for(const c of cellsOf(FURN[o.k].wall ? Object.assign({}, o, { r:0 }) : o)) if(set.has(c + '')) return false; }
  return true;
}
function freeSpot(k){
  if(FURN[k].wall){ for(let ix = 1; ix < CX - 1; ix++){ const it = { k, ix, iz:0, r:0 }; if(canPlace(it, SAVE.furn)) return it; } for(let iz = 1; iz < CZ; iz++) for(const ix of [0, CX - 1]){ const it = { k, ix, iz, r:0 }; if(canPlace(it, SAVE.furn)) return it; } return { k, ix:4, iz:0, r:0 }; }
  for(let r = 0; r < 6; r++) for(let dx = -r; dx <= r; dx++) for(let dz = -r; dz <= r; dz++){ const it = { k, ix:4 + dx, iz:3 + dz, r:0 }; if(canPlace(it, SAVE.furn)) return it; }
  return { k, ix:4, iz:3, r:0 };
}

/* ---------- collisions: circles, boxes, wall segments, furniture, moving things, the edge of town ---------- */
let DYN = [];                                  // traffic cars and parked/driven vehicles of others: circles
function pushOutBox(o, r, b){
  const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
  if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rr) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; } return true; }
  return false;
}
function pushOutCircle(o, r, c){ const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz; if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; return true; } return false; }
/* mode: 'foot' | 'veh' | 'boat'. Returns true when something was hit. */
function collide(o, r, mode = 'foot'){
  let hit = false;
  const b = mode === 'boat' ? { x0:-90, x1:90, z0:SEA_Z + 2.2, z1:120 } : mode === 'veh' ? { x0:BOUND.x0, x1:BOUND.x1, z0:BOUND.z0, z1:SEA_Z - 1 } : BOUND;
  if(o.x < b.x0){ o.x = b.x0; hit = true; } if(o.x > b.x1){ o.x = b.x1; hit = true; } if(o.z < b.z0){ o.z = b.z0; hit = true; } if(o.z > b.z1){ o.z = b.z1; hit = true; }
  if(mode !== 'boat') for(const c of CIRCLES) if(pushOutCircle(o, r, c)) hit = true;
  for(const c of DYN) if(c.id !== o.id && pushOutCircle(o, r, c)) hit = true;
  const boxes = mode === 'foot' ? BOXES.concat(FBOX) : mode === 'veh' ? BOXES.concat(VBOXES) : VBOXES;
  for(const bx of boxes) if(pushOutBox(o, r, bx)) hit = true;
  if(mode === 'foot') for(const s of SEGS){
    const vx = s.x2 - s.x1, vz = s.z2 - s.z1, L2 = vx * vx + vz * vz, t = clamp(((o.x - s.x1) * vx + (o.z - s.z1) * vz) / L2, 0, 1);
    const px = s.x1 + vx * t, pz = s.z1 + vz * t, dx = o.x - px, dz = o.z - pz, q = dx * dx + dz * dz, m = r + s.t;
    if(q < m * m && q > 1e-6){ const k = Math.sqrt(q); o.x = px + dx / k * m; o.z = pz + dz / k * m; hit = true; }
  }
  return hit;
}
const onPier = (x, z) => x > PIER.x0 && x < PIER.x1 && z > PIER.z0 && z < PIER.z1;
function groundAt(x, z){
  if(onPier(x, z)) return z < PIER.zDeck ? (z - PIER.z0) / (PIER.zDeck - PIER.z0) * PIER.y : PIER.y;
  if(z > SEA_Z + .3) return -.78;
  if(houseAt(x, z) >= 0) return .07;
  return 0;
}
const isSwim = (x, z) => z > SEA_Z + .3 && !onPier(x, z);

/* ======================================================================
   The player: character, outfit, held item, a pet that follows
   ====================================================================== */
const P = { x:SPAWN.x, z:SPAWN.z, y:0, vx:0, vz:0, face:SPAWN.f, move:0, trail:[], act:null, ride:null, jump:null, item:null, itemCol:0 };
let heroM = null, T = 0;
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
/* outfit and held item on a character model; h.dress remembers what is on */
function dress(h, role, item, itemCol){
  const key = (role || '') + '|' + (item || '') + '|' + (itemCol || 0);
  if(h.dressKey === key) return; h.dressKey = key;
  (h.att || []).forEach(m => m.parent && m.parent.remove(m)); h.att = []; h.balloon = null;
  const add = (parent, obj, x, y, z) => { obj.position.set(x, y, z); parent.add(obj); h.att.push(obj); obj.traverse(o => { if(o.isMesh) o.castShadow = true; }); return obj; };
  const quad = !!h.quad || !h.arms || !h.arms.length;
  if(role && ROLES[role]){
    const O = CM.outfit(role);
    if(O.hat){ const m = new THREE.Mesh(O.hat, MAT); if(quad) m.scale.setScalar(.9); add(h.head, m, 0, quad ? .02 : 0, 0); }
    if(O.vest && !quad && h.type !== 'zaqzouq' && h.type !== 'laila') add(h.body, new THREE.Mesh(O.vest, MAT), 0, 0, 0);
    if(O.prop){ const m = new THREE.Mesh(O.prop, MAT); if(quad) add(h.body, m, .16, .42, .36); else { m.rotation.x = 1.2; add(h.arms[1], m, 0, -.29, 0); } }
  }
  if(item && ITEMS[item]){
    if(item === 'balloon'){ const g = CM.buildItem('balloon', BALLOON_COLS[itemCol % BALLOON_COLS.length]); add(h.grp, g, quad ? .2 : -.32, .55, quad ? .3 : .05); h.balloon = g; }
    else { const m = CM.buildItem(item); if(quad) add(h.body, m, -.16, .42, .36); else { m.rotation.x = 1.2; add(h.arms[0], m, 0, -.29, 0); } }
  }
}
function setHero(id){
  heroId = HEROES[id] ? id : 'sara';
  if(heroM) scene.remove(heroM.grp);
  heroM = HEROES[heroId](); shadowAll(heroM.grp); scene.add(heroM.grp);
  heroM.grp.rotation.order = 'YXZ';
  dress(heroM, SAVE.role, P.item, P.itemCol);
}
/* poses on top of poseHero: sit (vehicles, swings), lie (hospital bed), bike, swim */
function poseExtra(h, a, t){
  if(!a) return;
  if(a === 'sit' || a === 'bike'){
    h.legs.forEach((l, i) => { l.rotation.x = h.quad ? (i < 2 ? -.6 : .6) : a === 'bike' ? -1.1 + Math.sin(t * 9 + i * Math.PI) * .45 : -1.45; });
    if(!h.quad && h.arms.length && a === 'bike') h.arms.forEach(m => { if(!m.userData.hold) m.rotation.x = -1.1; });
  } else if(a === 'swim'){
    h.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 8 + i * Math.PI) * .5; });
    if(h.arms.length) h.arms.forEach((m, i) => { if(!m.userData.hold){ m.rotation.x = -2.6 + Math.sin(t * 5 + i * Math.PI) * .6; } });
  } else if(a === 'fish'){ if(h.arms.length) h.arms.forEach(m => { if(!m.userData.hold) m.rotation.x = -1.3; }); }
  else if(a === 'wave'){ if(h.arms.length){ const m = h.arms[1]; if(!m.userData.hold){ m.rotation.x = -2.8; m.rotation.z = Math.sin(t * 12) * .4 - .3; } } }
}
const HIP = h => h.quad ? .3 : .38;

/* ---------- pets that follow (trail like heist / pets) ---------- */
function pushTrail(tr, x, z){ const l = tr[tr.length - 1]; if(!l || Math.hypot(l.x - x, l.z - z) > .25){ tr.push({ x, z }); if(tr.length > 60) tr.shift(); } }
function trailTarget(tr, lx, lz, back){
  let px = lx, pz = lz, acc = 0;
  for(let i = tr.length - 1; i >= 0; i--){ const q = tr[i], d = Math.hypot(q.x - px, q.z - pz); if(acc + d >= back && d > 0){ const t = (back - acc) / d; return { x:px + (q.x - px) * t, z:pz + (q.z - pz) * t }; } acc += d; px = q.x; pz = q.z; }
  return { x:px, z:pz };
}
function makePet(id, x, z){ const M = CM.buildPet(id); shadowAll(M.grp); scene.add(M.grp); return { id, M, x, z, y:0, f:0, move:0, t:Math.random() * 5, happy:0 }; }
function dropPet(pt){ if(pt) scene.remove(pt.M.grp); }
function stepPet(pt, trail, lx, lz, ly, dt, hidden){
  pt.t += dt; if(pt.happy > 0) pt.happy -= dt;
  pt.M.grp.visible = !hidden;
  if(hidden){ pt.x = lx; pt.z = lz; return; }
  const tg = trailTarget(trail, lx, lz, 1.3);
  if(Math.hypot(pt.x - lx, pt.z - lz) > 12){ pt.x = tg.x; pt.z = tg.z; burst(pt.x, .5, pt.z, 10, [0xffffff, 0xffc23d], 3, .8); }
  const dx = tg.x - pt.x, dz = tg.z - pt.z, d = Math.hypot(dx, dz);
  if(d > .15){ const v = Math.min(7.5, d * 5); pt.x += dx / d * v * dt; pt.z += dz / d * v * dt; pt.move = lerp(pt.move, clamp(v / 5, 0, 1), Math.min(1, dt * 10)); pt.f += angDiff(Math.atan2(dx, dz), pt.f) * Math.min(1, dt * 10); }
  else { pt.move = lerp(pt.move, 0, Math.min(1, dt * 8)); pt.f += angDiff(Math.atan2(lx - pt.x, lz - pt.z), pt.f) * Math.min(1, dt * 3); }
  const sw = isSwim(pt.x, pt.z);
  pt.y = lerp(pt.y, sw ? -.32 : groundAt(pt.x, pt.z), Math.min(1, dt * 10));
  pt.M.grp.position.set(pt.x, pt.y, pt.z); pt.M.grp.rotation.y = pt.f;
  CM.posePet(pt.M, pt.t, pt.move, pt.happy > 0);
}
let myPet = null;
function syncMyPet(){
  if(myPet && myPet.id !== SAVE.pet){ dropPet(myPet); myPet = null; }
  if(SAVE.pet && !myPet){ const t = trailTarget(P.trail, P.x, P.z, 1.3); myPet = makePet(SAVE.pet, t.x, t.z + .01); }
}

/* ======================================================================
   Vehicles: mine (driven or parked), friends' (from their 'pos'), seats and passengers
   ====================================================================== */
let V = null;                         // my vehicle { k, M, x, y, z, h, p, rl, s, on, sir, spr, jin, plane }
const veh = { gas:false, brake:false };
function spawnVehicle(k, x, z, h){
  if(V){ scene.remove(V.M.grp); V = null; }
  const M = CM.buildVehicle(k); scene.add(M.grp); M.grp.rotation.order = 'YXZ';
  V = { k, M, x, z, y:0, h, p:0, rl:0, s:0, on:false, sir:false, spr:0, jin:0, plane:null };
  placeVehicle(V, M); return V;
}
function placeVehicle(v, M){ M.grp.position.set(v.x, v.y, v.z); M.grp.rotation.set(v.p || 0, v.h, v.rl || 0); }
function seatWorld(M, i, out){ const s = M.seats[Math.min(i, M.seats.length - 1)]; M.grp.updateMatrixWorld(true); return out.set(s.x, s.y, s.z).applyMatrix4(M.grp.matrixWorld); }
function despawnVehicle(){ if(V){ scene.remove(V.M.grp); V = null; } }
/* plane: a looped path from the runway around the town and back */
const PLANE_PATH = new THREE.CatmullRomCurve3([
  [-50, 0, 18], [-50, 0, 4], [-50, 3, -12], [-44, 12, -34], [-20, 20, -54], [20, 22, -54], [50, 22, -32], [60, 20, 6], [46, 18, 40], [12, 16, 66], [-28, 13, 66], [-48, 8, 52], [-50, 3, 38], [-50, 0, 28]
].map(p => new THREE.Vector3(...p)), true, 'centripetal');
const FLIGHT_T = 46, BOARD_T = 5;
function seatsFree(ownerId, M){
  const used = new Set();
  if(ownerId === ME && V && V.on) used.add(0);
  for(const a of RM.values()) if(a.ride && a.ride[0] === ownerId) used.add(a.ride[1]);
  if(ownerId !== ME){ const o = RM.get(ownerId); if(o && o.v && o.v.on) used.add(0); }
  const out = []; for(let i = 1; i < M.seats.length; i++) if(!used.has(i)) out.push(i);
  return out;
}

/* ======================================================================
   Gentle traffic on the ring road (instanced), friendly townsfolk on the sidewalks
   ====================================================================== */
function makeLoop(hx, hz, cw, r = 3){
  const pts = [], c = [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]];
  const corner = (cx, cz, a0) => { for(let k = 0; k <= 5; k++){ const a = a0 + k / 5 * Math.PI / 2; pts.push({ x:cx + Math.cos(a) * r, z:cz + Math.sin(a) * r }); } };
  corner(c[0][0] + r, c[0][1] + r, Math.PI); corner(c[1][0] - r, c[1][1] + r, -Math.PI / 2); corner(c[2][0] - r, c[2][1] - r, 0); corner(c[3][0] + r, c[3][1] - r, Math.PI / 2);
  if(!cw) pts.reverse();
  const cum = [0]; for(let i = 1; i <= pts.length; i++){ const a = pts[i - 1], b = pts[i % pts.length]; cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z)); }
  return { pts, cum, L:cum[pts.length] };
}
function loopAt(lp, s, out){
  s = ((s % lp.L) + lp.L) % lp.L;
  let lo = 0, hi = lp.pts.length; while(hi - lo > 1){ const m = (lo + hi) >> 1; if(lp.cum[m] <= s) lo = m; else hi = m; }
  const a = lp.pts[lo], b = lp.pts[(lo + 1) % lp.pts.length], t = (s - lp.cum[lo]) / Math.max(1e-6, lp.cum[lo + 1] - lp.cum[lo]);
  out.x = lerp(a.x, b.x, t); out.z = lerp(a.z, b.z, t); out.h = Math.atan2(b.x - a.x, b.z - a.z); return out;
}
const LOOPS = [makeLoop(36 - 1.75, 30 - 1.75, true), makeLoop(36 + 1.75, 30 + 1.75, false)];
const CAR_COLS = [0x6cc4ff, 0xff8fb1, 0x5ed6a0, 0xffc23d, 0xb99cff, 0xff9f43, 0xf4f1ea, 0x7fd0c8, 0xf28b82, 0x9ad7ff];
const CARS = [];
for(let l = 0; l < 2; l++) for(let i = 0; i < 5; i++) CARS.push({ l, s:LOOPS[l].L * i / 5 + l * 9, v:5, x:0, z:0, h:0 });
let carBody, carDetail, TC = 0;     // TC: the town clock (the host's is the truth)
function buildTraffic(){
  const g = CM.trafficGeo();
  carBody = new THREE.InstancedMesh(g.body, new THREE.MeshStandardMaterial({ roughness:.5 }), CARS.length);
  carDetail = new THREE.InstancedMesh(g.detail, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.5 }), CARS.length);
  CARS.forEach((c, i) => carBody.setColorAt(i, _c.set(CAR_COLS[i % CAR_COLS.length])));
  carBody.castShadow = carDetail.castShadow = true; carBody.frustumCulled = carDetail.frustumCulled = false; scene.add(carBody, carDetail);
}
const _lp = { x:0, z:0, h:0 };
function blockers(){
  const out = [];
  if(!P.ride && !(V && V.on)) out.push([P.x, P.z]);
  if(V && V.k !== 'plane' && V.k !== 'boat') out.push([V.x, V.z]);
  for(const a of RM.values()){ out.push([a.x, a.z]); if(a.v && a.v.k !== 'plane') out.push([a.v.x, a.v.z]); }
  return out;
}
function stepTraffic(dt){
  const bl = blockers();
  for(const c of CARS){
    const lp = LOOPS[c.l]; loopAt(lp, c.s, _lp); c.x = _lp.x; c.z = _lp.z; c.h = _lp.h;
    const fx = Math.sin(c.h), fz = Math.cos(c.h);
    let want = 5.5;
    for(const [bx, bz] of bl){ const dx = bx - c.x, dz = bz - c.z, f = dx * fx + dz * fz, l = Math.abs(dx * fz - dz * fx); if(f > 1 && f < 8 && l < 2.3){ want = 0; break; } }
    for(const o of CARS){ if(o === c || o.l !== c.l) continue; let gap = o.s - c.s; if(gap < 0) gap += lp.L; if(gap < 7.5){ want = Math.min(want, Math.max(0, (gap - 4.5) * 1.5)); } }
    c.v += clamp(want - c.v, -10 * dt, 3 * dt); c.s = (c.s + c.v * dt) % lp.L;
  }
  CARS.forEach((c, i) => { _m.compose(_v.set(c.x, 0, c.z), _q.setFromEuler(_e.set(0, c.h, 0)), _s.set(1, 1, 1)); carBody.setMatrixAt(i, _m); carDetail.setMatrixAt(i, _m); });
  carBody.instanceMatrix.needsUpdate = carDetail.instanceMatrix.needsUpdate = true;
}
const WALK_LOOPS = [makeLoop(36 - 4.3, 30 - 4.3, true, 2), makeLoop(36 + 4.3, 30 + 4.3, false, 2)];
const FOLK = [];
function buildFolk(){
  for(let i = 0; i < 8; i++){
    const F = CM.buildFolk(i); shadowAll(F.grp); scene.add(F.grp);
    FOLK.push({ F, l:i % 2, s0:WALK_LOOPS[i % 2].L * i / 8, dir:i % 4 < 2 ? 1 : -1, x:0, z:0, h:0, happy:0, t:i });
  }
}
function stepFolk(dt){
  for(const f of FOLK){
    const lp = WALK_LOOPS[f.l]; loopAt(lp, f.s0 + f.dir * TC * 1.1, _lp);
    f.x = _lp.x; f.z = _lp.z; f.h = _lp.h + (f.dir < 0 ? Math.PI : 0); f.t += dt; if(f.happy > 0) f.happy -= dt;
    f.F.grp.position.set(f.x, .06 + (f.happy > 0 ? Math.abs(Math.sin(f.t * 9)) * .2 : 0), f.z); f.F.grp.rotation.y = f.h;
    CM.poseFolk(f.F, f.t, 1);
  }
}

/* ======================================================================
   Camera and input
   ====================================================================== */
const cam = { yaw:Math.PI, pitch:.6, dist:9, tx:P.x, tz:P.z, ty:1, auto:null, pAdj:0, lookT:0 };
let snapCam = true, wasInside = false, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function camTarget(){
  if(P.ride){ const M = rideModel(); if(M){ const p = M.grp.position; return { x:p.x, y:p.y + 1, z:p.z, h:M.grp.rotation.y, veh:true, len:3, fly:p.y > 3 }; } }
  if(V && V.on) return { x:V.x, y:V.y + 1, z:V.z, h:V.h, veh:true, len:V.k === 'plane' ? 6 : VEH[V.k].len, fly:V.k === 'plane' };
  return { x:P.x, y:P.y + 1, z:P.z, veh:false };
}
function updateCamera(dt){
  if(closeup){
    camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  if(edit){
    const H = HOUSES[edit.house];
    camPos.lerp(_v.set(H.x, 15.5, H.z + 7.5), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(H.x, 0, H.z - .4), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  const tg = camTarget();
  const inside = !tg.veh && houseAt(P.x, P.z, -.4) >= 0;
  if(inside !== wasInside){ wasInside = inside; if(look.id == null) cam.auto = Math.PI; }
  cam.lookT -= dt;
  if(tg.veh && look.id == null && cam.lookT <= 0) cam.yaw += angDiff(tg.h + Math.PI, cam.yaw) * Math.min(1, dt * 2.2);
  else if(cam.auto != null){ const dd = angDiff(cam.auto, cam.yaw); cam.yaw += dd * Math.min(1, dt * 2.5); if(Math.abs(dd) < .02) cam.auto = null; }
  const wantPitch = inside ? .95 : tg.fly ? .32 : tg.veh ? .45 : .55, wantDist = inside ? 10.5 : tg.fly ? 18 : tg.veh ? 8 + tg.len * .9 : 9;
  cam.pitch = lerp(cam.pitch, clamp(wantPitch + cam.pAdj, .2, 1.25), Math.min(1, dt * 3)); cam.dist = lerp(cam.dist, wantDist, Math.min(1, dt * 3));
  const k = snapCam ? 1 : 1 - Math.exp(-(tg.veh ? 12 : 8) * dt);
  cam.tx = lerp(cam.tx, tg.x, k); cam.tz = lerp(cam.tz, tg.z, k); cam.ty = lerp(cam.ty, tg.y, k);
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  _v.set(cam.tx + dx * cam.dist, Math.max(cam.ty + dy * cam.dist, .8), cam.tz + dz * cam.dist);
  if(snapCam){ camPos.copy(_v); snapCam = false; } else camPos.lerp(_v, 1 - Math.exp(-10 * dt));
  camLook.set(cam.tx, cam.ty, cam.tz);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), itemBtn = $('#btnItem'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state === 'edit'){ look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; look.t0 = performance.now(); return; }
  if(state !== 'play') return;
  if(p.x < SW * .4 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .4); joy.oy = clamp(p.y, 140, SH - 70);
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.35, .35); cam.auto = null; cam.lookT = 1.5; look.x = p.x; look.y = p.y; }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){
    look.id = null;
    const p = toLayer(e.clientX, e.clientY);
    if(Math.hypot(p.x - look.sx, p.y - look.sy) < 14 && performance.now() - look.t0 < 450 && e.type === 'pointerup') tapAt(p.x, p.y);
  }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
const holdBtn = (el, on, off) => {
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); el.classList.add('on'); on(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => { el.classList.remove('on'); if(off) off(); }));
};
holdBtn(actBtn, () => doAction());
holdBtn(itemBtn, () => useItem());
holdBtn($('#btnGas'), () => { veh.gas = true; }, () => { veh.gas = false; });
holdBtn($('#btnBrake'), () => { veh.brake = true; }, () => { veh.brake = false; });
holdBtn($('#btnHorn'), () => vehHorn());
holdBtn($('#btnSp1'), () => vehSpecial(1), () => vehSpecialOff(1));
holdBtn($('#btnSp2'), () => vehSpecial(2), () => vehSpecialOff(2));
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat){ doAction(); e.preventDefault(); }
  if(e.code === 'KeyH' && state === 'play') vehHorn();
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; veh.gas = veh.brake = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; veh.gas = veh.brake = false; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.07);
function rayAt(x, y){ ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
function tapAt(x, y){
  const r = rayAt(x, y);
  if(state === 'edit'){ editTap(r); return; }
  if(state !== 'play') return;
  const pets = [myPet, ...[...RM.values()].map(a => a.pet)].filter(Boolean);
  for(const pt of pets){ _v.set(pt.x, pt.y + .4, pt.z); if(r.ray.distanceToPoint(_v) < .7){ petTap(pt); return; } }
}
function petTap(pt){ pt.happy = 1.6; SFX.heart(); floatIcon('heart', pt.x, pt.y + .9, pt.z, 3, .4); if(pt === myPet && mpActive()) mpSend('fx', { k:'pet' }); }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m; inp.sx = ix; inp.sy = iy;
}

/* ======================================================================
   Moving: walking, swimming, jumping off the pier, driving, flying, riding
   ====================================================================== */
const SPEED = 5.4, SWIM = 2.8;
function stepPlayer(dt){
  if(P.jump){
    const J = P.jump; J.t += dt; const k = Math.min(1, J.t / .9);
    P.x = lerp(J.x0, J.x1, k); P.z = lerp(J.z0, J.z1, k); P.y = lerp(PIER.y, -.78, k) + Math.sin(k * Math.PI) * 1.6;
    if(k >= 1){ P.jump = null; splashAt(P.x, P.z, true); }
    P.move = 0; return;
  }
  if(P.act){ stepAct(dt); return; }
  const swim = isSwim(P.x, P.z), sp = swim ? SWIM : SPEED;
  P.vx += (inp.x * sp - P.vx) * Math.min(1, 14 * dt); P.vz += (inp.z * sp - P.vz) * Math.min(1, 14 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42, 'foot');
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / sp);
  const gy = groundAt(P.x, P.z) + (swim ? Math.sin(T * 2.5) * .06 : 0);
  P.y = lerp(P.y, gy, Math.min(1, dt * (swim ? 6 : 14)));
  if(swim && !P.wasSwim && P.y > -.4) splashAt(P.x, P.z, false);
  P.wasSwim = swim;
  pushTrail(P.trail, P.x, P.z);
  if(!SAVE.veh.includes('boat') && onPier(P.x, P.z) && P.z > 52) unlockVeh('boat');
}
function splashAt(x, z, big){ burst(x, -.2, z, big ? 40 : 14, WATER, big ? 5 : 3, big ? 1.2 : .8, 10); SFX.splash(); if(mpActive()) mpSend('fx', { k:'splash', x:Math.round(x * 10) / 10, z:Math.round(z * 10) / 10 }); }
/* driving: joystick (or A/D) steers, the gas/brake buttons (or W/S) go and stop */
function stepVehicle(dt){
  if(!V) return;
  if(V.k === 'plane'){ stepPlane(dt); return; }
  const D = VEH[V.k], boat = !!D.water;
  if(V.on){
    let steer = clamp((joy.id != null ? joy.x : 0) + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), -1, 1);
    const gas = veh.gas || keys.f || (joy.id != null && joy.y < -.6), brake = veh.brake || keys.b;
    if(gas) V.s = Math.min(D.speed, V.s + D.acc * dt);
    else if(brake){ V.s = V.s > .3 ? Math.max(0, V.s - D.acc * 2.2 * dt) : Math.max(-D.speed * .4, V.s - D.acc * .6 * dt); }
    else V.s *= Math.exp(-(boat ? .5 : 1.1) * dt);
    if(Math.abs(V.s) < .05 && !gas) V.s = 0;
    V.h -= steer * D.turn * dt * clamp(V.s / 4, -1, 1);
    V.steer = lerp(V.steer || 0, steer, Math.min(1, dt * 8));
  } else V.s *= Math.exp(-4 * dt);
  const ox = V.x, oz = V.z;
  V.x += Math.sin(V.h) * V.s * dt; V.z += Math.cos(V.h) * V.s * dt;
  const o = { x:V.x, z:V.z, id:ME };
  if(collide(o, D.r, boat ? 'boat' : 'veh')){  const moved = Math.hypot(o.x - V.x, o.z - V.z); if(moved > .02) V.s *= Math.max(0, 1 - moved * 3); }
  V.x = o.x; V.z = o.z;
  if(boat){ V.y = Math.sin(T * 2) * .06 - .05; V.rl = Math.sin(T * 1.6) * .04 - (V.steer || 0) * .08 * clamp(V.s / D.speed, 0, 1); V.p = -clamp(V.s / D.speed, 0, 1) * .06; if(V.on && Math.abs(V.s) > 2 && Math.random() < dt * 10) burst(V.x - Math.sin(V.h) * 2.2, .1, V.z - Math.cos(V.h) * 2.2, 3, WATER, 1.5, .8, 8); }
  else { V.y = 0; V.p = 0; V.rl = (V.k === 'bicycle' || V.k === 'scooter') ? -(V.steer || 0) * .12 * clamp(V.s / D.speed, 0, 1) : 0; }
  placeVehicle(V, V.M);
  for(const w of V.M.wheels) w.rotation.x += V.s * dt / .35;
  if(V.M.siren){ const on = V.sir && Math.sin(T * 14) > 0; V.M.siren.forEach((s, i) => { s.visible = !V.sir || (i % 2 ? on : !on); }); }
  if(V.sir){ V.sirT = (V.sirT || 0) - dt; if(V.sirT <= 0){ V.sirT = 1; SFX.siren(); } }
  if(V.spr > 0 && V.k === 'firetruck'){ const n = V.M.extra.nozzle; _v.set(n[0], n[1], n[2]); V.M.grp.localToWorld(_v); const a = V.h + Math.PI; spray(_v.x, _v.y, _v.z, Math.sin(a), .35, Math.cos(a), 3); }
  if(V.jin > 0){ V.jin -= dt; }
}
function stepPlane(dt){
  const PL = V.plane;
  if(PL.phase === 'board'){ PL.t += dt; if(PL.t >= BOARD_T){ PL.phase = 'fly'; PL.t = 0; SFX.plane(); say(L('يلّا نطير! ✈️', "Let's fly! ✈️", 'Haydi uçalım! ✈️'), 2500); } }
  else if(PL.phase === 'fly'){
    PL.t += dt; const k = PL.t / FLIGHT_T;
    if(k >= 1){ landPlane(); return; }
    const u = k < .06 ? k * k / .12 : k > .94 ? 1 - (1 - k) * (1 - k) / .12 : k - .03;      // slow on the runway at both ends
    const p = PLANE_PATH.getPointAt(clamp(u, 0, .9999)), tg = PLANE_PATH.getTangentAt(clamp(u, 0, .9999));
    V.x = p.x; V.y = p.y; V.z = p.z; const nh = Math.atan2(tg.x, tg.z);
    V.rl = clamp(angDiff(nh, V.h) / Math.max(dt, .001) * .15, -.5, .5) * .5 + (V.rl || 0) * .5; V.h = nh; V.p = -Math.asin(clamp(tg.y, -1, 1)) * .8;
    V.s = 12; if(Math.random() < dt * 2) SFX.engine();
  }
  placeVehicle(V, V.M);
  if(V.M.prop) V.M.prop.rotation.z += dt * (PL.phase === 'fly' ? 40 : 6);
  planeParked.grp.visible = false;
}
function landPlane(){
  if(!V || V.k !== 'plane') return;
  despawnVehicle(); planeParked.grp.visible = true;
  P.x = PLACES.plane.x + 3; P.z = PLACES.plane.z + 1; P.face = -Math.PI / 2; P.y = 0; snapCam = true;
  SFX.flag(); burst(P.x, 1, P.z, 30, CONFETTI, 4, 1);
  say(L('هبطنا بالسلامة! برافو يا كابتن 👨‍✈️', 'We landed safely! Well done, captain 👨‍✈️', 'Güvenle indik! Aferin kaptan 👨‍✈️'), 3500);
  hudKey = '';
}
function startFlight(){
  spawnVehicle('plane', PLACES.plane.x, PLACES.plane.z, Math.PI); V.on = true; V.plane = { phase:'board', t:0 };
  P.act = null; SFX.plane(); hudKey = '';
  say(L('اصحابك فيهن يركبوا معك! بعد شوي منطير ✈️', 'Friends can hop in! Taking off soon ✈️', 'Arkadaşların binebilir! Birazdan kalkıyoruz ✈️'), 4000);
}
function getIn(){
  if(!V) return; V.on = true; V.s = 0; P.act = null; SFX.engine(); hudKey = ''; cam.lookT = 0;
  if(!SAVE.seen['v_' + V.k]){ SAVE.seen['v_' + V.k] = 1; persist(); }
  if(SAVE.tut === 3){ SAVE.tut = 4; persist(); setTimeout(() => { if(state === 'play' && SAVE.tut === 4) say(L('روح عالحديقة 🌳 لعند النافورة! اتبع الأسهم', 'Drive to the park 🌳 fountain! Follow the arrows', 'Parktaki çeşmeye 🌳 git! Okları takip et'), 5000); }, 600); }
}
function getOut(){
  if(!V || !V.on) return;
  if(V.k === 'plane' && V.plane && V.plane.phase === 'fly') return;
  V.on = false; V.sir = false; V.spr = 0; veh.gas = veh.brake = false;
  if(V.k === 'plane'){ despawnVehicle(); planeParked.grp.visible = true; P.x = PLACES.plane.x + 3; P.z = PLACES.plane.z; P.y = 0; hudKey = ''; return; }
  const side = VEH[V.k].r + .6;
  P.x = V.x - Math.cos(V.h) * side; P.z = V.z + Math.sin(V.h) * side; P.face = V.h;
  if(VEH[V.k].water){
    // near the pier or the beach: step out there; otherwise splash into the sea
    if(Math.abs(V.x - (PIER.x0 + PIER.x1) / 2) < 6 && V.z > PIER.zDeck && V.z < PIER.z1){ P.x = (PIER.x0 + PIER.x1) / 2; P.z = clamp(V.z, PIER.zDeck + 1, PIER.z1 - 1); }
    else if(V.z < SEA_Z + 4){ P.z = SEA_Z - 1; }
    else splashAt(P.x, P.z, false);
  }
  const o = { x:P.x, z:P.z }; collide(o, .42, 'foot'); P.x = o.x; P.z = o.z; P.y = groundAt(P.x, P.z);
  P.trail = []; pushTrail(P.trail, P.x, P.z); SFX.tap(); hudKey = '';
}
/* riding in a friend's vehicle (they drive; the seat follows their vehicle) */
function rideModel(){ if(!P.ride) return null; const a = RM.get(P.ride[0]); return a && a.vm ? a.vm : null; }
function stepRide(){
  const M = rideModel();
  if(!M){ hopOff(true); return; }
  seatWorld(M, P.ride[1], _v); P.x = _v.x; P.z = _v.z; P.y = _v.y; P.face = M.grp.rotation.y;
}
function hopOff(silent){
  if(!P.ride) return;
  const M = rideModel(); P.ride = null; hudKey = '';
  if(M){ const h = M.grp.rotation.y, p = M.grp.position; P.x = p.x - Math.cos(h) * 2.4; P.z = p.z + Math.sin(h) * 2.4; }
  const o = { x:P.x, z:P.z }; collide(o, .42, 'foot'); P.x = o.x; P.z = o.z; P.y = groundAt(P.x, P.z);
  if(isSwim(P.x, P.z) && !silent) splashAt(P.x, P.z, false);
  P.trail = []; pushTrail(P.trail, P.x, P.z); if(!silent) SFX.tap();
}
function vehHorn(){ if(!V || !V.on || V.k === 'plane') return; SFX.horn(); if(mpActive()) mpSend('fx', { k:'horn' }); }
function vehSpecial(n){
  if(!V || !V.on) return;
  if(V.k === 'firetruck'){ if(n === 1){ V.sir = !V.sir; V.sirT = 0; $('#btnSp1').classList.toggle('lit', V.sir); } else V.spr = 1; }
  else if(V.k === 'icecream'){ if(n === 1){ V.jin = 3; SFX.jingle(); if(mpActive()) mpSend('fx', { k:'jingle' }); } else serveIceCream(); }
}
function vehSpecialOff(n){ if(V && n === 2 && V.k === 'firetruck') V.spr = 0; }
function serveIceCream(){
  const from = V && V.on ? V : P, t = nearestBuddy(from.x, from.z, 5.5);
  if(!t){ pop('🍦 ' + L('ما في حدا قريب', 'Nobody close by', 'Yakında kimse yok')); SFX.bonk(); return; }
  giveTo(t, 'icecream', Math.floor(Math.random() * 3));
}
function unlockVeh(k){
  if(SAVE.veh.includes(k)) return;
  SAVE.veh.push(k); persist(); SFX.flag();
  setTimeout(() => { if(state === 'play') say(VEH[k].e + ' ' + L('فتحت ', 'You unlocked the ', 'Açıldı: ') + VEH[k].name + L('! لاقيها بالكراج 🚗', '! Find it in the garage 🚗', '! Garajda bul 🚗'), 4000); }, 400);
}

/* ======================================================================
   Activities: swings, slide, seesaw, hospital bed, fishing, reading
   ====================================================================== */
let bellT = 0, fountainT = 0;
const bobber = (() => { const M = new Merge(); M.add(GEO.sm, 0, 0, 0, .09, .09, .09, 0, 0, 0, 0xff5d73); M.add(GEO.sm, 0, .07, 0, .07, .05, .07, 0, 0, 0, 0xffffff); const m = new THREE.Mesh(M.geometry(), MAT); m.visible = false; scene.add(m); return m; })();
const fishLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color:0xffffff }));
fishLine.visible = false; fishLine.frustumCulled = false; scene.add(fishLine);
const rodMesh = (() => { const M = new Merge(); M.add(GEO.cyl8, 0, 0, .55, .02, 1.2, .02, Math.PI / 2, 0, 0, 0x8a5a32); M.add(GEO.cyl8, 0, 0, .1, .04, .14, .04, Math.PI / 2, 0, 0, 0x333333); return new THREE.Mesh(M.geometry(), MAT); })();
function startAct(sp){
  const k = sp.k;
  P.vx = P.vz = 0;
  if(k === 'swing'){ P.act = { k, i:sp.i, t:0 }; SFX.whee(); }
  else if(k === 'slide'){ P.act = { k, t:0 }; }
  else if(k === 'seesaw'){ P.act = { k, side:sp.side, t:0 }; SFX.boing(); }
  else if(k === 'bed'){ P.act = { k, i:sp.i, x:sp.x, z:sp.z, t:0, fx:0, done:false }; SFX.heart(); }
  else if(k === 'fish'){
    const side = P.x < (PIER.x0 + PIER.x1) / 2 ? -1 : 1, bx = side < 0 ? PIER.x0 - 2.6 : PIER.x1 + 2.6;
    P.x = side < 0 ? PIER.x0 + .5 : PIER.x1 - .5; P.face = side < 0 ? -Math.PI / 2 : Math.PI / 2;
    P.act = { k, t:0, side, bx, bz:P.z, bite:2 + Math.random() * 2.5, phase:'wait' };
    bobber.position.set(bx, .1, P.z); bobber.visible = true; fishLine.visible = true; SFX.pop();
  }
  else if(k === 'read'){ P.act = { k, t:0, fx:0 }; }
  hudKey = ''; actKey = null;
}
function endAct(){
  const A = P.act; if(!A) return; P.act = null;
  if(A.k === 'swing'){ P.y = 0; P.z = 23.8; P.x = swingSeats[A.i].position.x; }
  if(A.k === 'seesaw'){ P.x = -5.5 + A.side * 2.6; P.z = 15.5; P.y = 0; }
  if(A.k === 'bed'){ P.x = A.x; P.z = A.z + 1.6; P.y = 0; }
  if(A.k === 'fish'){ bobber.visible = false; fishLine.visible = false; }
  heroM.grp.rotation.x = 0; heroM.grp.rotation.z = 0;
  P.trail = []; pushTrail(P.trail, P.x, P.z); hudKey = ''; actKey = null;
}
function stepAct(dt){
  const A = P.act; A.t += dt; P.move = 0;
  const wantsOut = inp.m > .6 && A.t > .6 && A.k !== 'slide';
  if(wantsOut && A.k !== 'fish'){ endAct(); return; }
  if(A.k === 'swing'){
    const g = swingSeats[A.i], a = Math.sin(A.t * 2.4) * Math.min(1, A.t / 1.5) * .75;
    g.rotation.x = a; P.x = g.position.x; P.z = g.position.z - 2.25 * Math.sin(a); P.y = 3 - 2.25 * Math.cos(a) + .05; P.face = 0; P.tilt = a;
  } else if(A.k === 'slide'){
    const sx = -14.6, sz = 18;
    if(A.t < .5){ P.x = sx - .9; P.z = sz; P.y = A.t / .5 * 2.2; P.face = Math.PI / 2; P.tilt = 0; }
    else if(A.t < 1.7){ if(!A.wh){ A.wh = true; SFX.whee(); } const k = (A.t - .5) / 1.2, e = k * k; P.x = sx + .2 + e * 3.4; P.z = sz; P.y = 2.26 - e * 2.0 + .05; P.face = Math.PI / 2; P.tilt = .55; }
    else { P.x = sx + 4.4; P.z = sz; P.y = 0; P.tilt = 0; burst(P.x, .3, P.z, 10, [0xf7dc9c, 0xffffff], 2, .7); endAct(); return; }
  } else if(A.k === 'seesaw'){
    const th = Math.sin(A.t * 2.2) * .3 * A.side * -1;
    seesawBoard.rotation.z = th;
    P.x = -5.5 + A.side * 1.75 * Math.cos(th); P.y = .62 + A.side * 1.75 * Math.sin(th) + .08; P.z = 15.5; P.face = A.side < 0 ? Math.PI / 2 : -Math.PI / 2; P.tilt = 0;
  } else if(A.k === 'bed'){
    P.x = A.x; P.z = A.z + .45; P.y = .86; P.face = 0;
    A.fx -= dt; if(A.fx <= 0){ A.fx = .6; floatIcon('heart', A.x, 1.4, A.z, 1, .4); }
    if(A.t > 4 && !A.done){ A.done = true; SFX.star(); pop('💗 ' + L('صرت أحسن!', 'All better!', 'İyileştin!')); burst(A.x, 1.2, A.z, 20, [0xff8fb1, 0xffffff], 3, .9); }
  } else if(A.k === 'fish'){
    if(wantsOut && A.phase === 'wait'){ endAct(); return; }
    const by = .08 + (A.phase === 'bite' ? -.12 + Math.sin(A.t * 30) * .05 : Math.sin(A.t * 3) * .03);
    bobber.position.set(A.bx, by, A.bz);
    heroM.grp.updateMatrixWorld(true); _v.set(.25, 1.25, 1.2).applyMatrix4(heroM.grp.matrixWorld);
    const lp = fishLine.geometry.attributes.position; lp.setXYZ(0, _v.x, _v.y, _v.z); lp.setXYZ(1, A.bx, by + .05, A.bz); lp.needsUpdate = true;
    if(A.phase === 'wait' && A.t > A.bite){ A.phase = 'bite'; A.t = 0; SFX.pop(); burst(A.bx, .1, A.bz, 8, WATER, 2, .6); actKey = null; }
    else if(A.phase === 'bite' && A.t > 1.8){ A.phase = 'miss'; pop(L('هربت السمكة 🙂 جرّب كمان', 'The fish swam away 🙂 try again', 'Balık kaçtı 🙂 tekrar dene')); endAct(); }
  } else if(A.k === 'read'){
    A.fx -= dt; if(A.fx <= 0){ A.fx = .5; floatIcon('letters', P.x, P.y + 1.6, P.z, 1, .4); }
    if(A.t > 3.5){ endAct(); return; }
  }
}
function reelIn(){
  const A = P.act; if(!A || A.k !== 'fish' || A.phase !== 'bite') return false;
  SAVE.fish++; persist(); SFX.fish(); burst(A.bx, .4, A.bz, 24, WATER, 3, 1); endAct();
  holdItem('fish'); pop('🐟 ' + L('صدت سمكة!', 'You caught a fish!', 'Balık tuttun!') + ' (' + N(SAVE.fish) + ')');
  if(SAVE.fish % 5 === 0) reward('fish' + SAVE.fish, 2);
  if(mpActive()) mpSend('fx', { k:'fish' });
  return true;
}
function jumpOff(){
  const cx = (PIER.x0 + PIER.x1) / 2, side = P.x < cx ? -1 : 1;
  const tx = side < 0 ? PIER.x0 - 2.4 : PIER.x1 + 2.4, tz = Math.min(P.z + 1.2, PIER.z1 + 1.5);
  const endJump = P.z > PIER.z1 - 2;
  P.jump = { t:0, x0:P.x, z0:P.z, x1:endJump ? cx : tx, z1:endJump ? PIER.z1 + 2.6 : tz };
  P.face = Math.atan2(P.jump.x1 - P.x, P.jump.z1 - P.z); SFX.boing(); hudKey = '';
}

/* ======================================================================
   Things in your hands
   ====================================================================== */
function holdItem(k, col){
  P.item = k; P.itemCol = col != null ? col : Math.floor(Math.random() * BALLOON_COLS.length);
  dress(heroM, SAVE.role, P.item, P.itemCol); hudKey = ''; if(mpActive()) mpTrack();
}
const floatBalloons = [];
function useItem(){
  if(state !== 'play' || !P.item) return;
  const near = nearestFriend(P.x, P.z, 2.8);
  if(near){ giveTo({ kind:'friend', a:near }, P.item, P.itemCol); holdItem(null); return; }
  const I = ITEMS[P.item];
  if(P.item === 'balloon'){
    const g = CM.buildItem('balloon', BALLOON_COLS[P.itemCol % BALLOON_COLS.length]); g.position.set(P.x, P.y + .6, P.z); scene.add(g); floatBalloons.push({ g, t:0 }); SFX.whee();
    if(mpActive()) mpSend('fx', { k:'balloon', c:P.itemCol });
  } else if(P.item === 'book'){ if(!P.act && !V?.on && !P.ride){ startAct({ k:'read' }); return; } }
  else if(P.item === 'fish'){ pop('🪣 ' + L('السمكة رجعت عالبحر 🐟', 'The fish went back to the sea 🐟', 'Balık denize döndü 🐟')); burst(P.x, P.y + 1, P.z, 10, WATER, 2, .7); }
  else if(I.eat){ SFX.eat(); burst(P.x, P.y + 1.1, P.z, 10, [0xf6d89a, 0xffffff, 0xff9fc0], 2, .6); floatIcon('heart', P.x, P.y + 1.6, P.z, 2, .4); pop('😋 ' + L('يمّ!', 'Yum!', 'Nefis!')); }
  holdItem(null);
}
function nearestFriend(x, z, r){ let best = null, bd = r; for(const a of RM.values()){ if(a.ride || (a.v && a.v.on)) continue; const d = Math.hypot(a.x - x, a.z - z); if(d < bd){ bd = d; best = a; } } return best; }
/* a buddy: a friend in the room or a townsperson */
function nearestBuddy(x, z, r){
  const f = nearestFriend(x, z, r); if(f) return { kind:'friend', a:f };
  let best = null, bd = r; for(const p of FOLK){ const d = Math.hypot(p.x - x, p.z - z); if(d < bd){ bd = d; best = p; } }
  return best ? { kind:'folk', f:best } : null;
}
function giveTo(t, item, col){
  if(t.kind === 'friend'){ mpSend('give', { to:t.a.id, item, c:col | 0 }); floatIcon('heart', t.a.x, 1.8, t.a.z, 3, .4); burst(t.a.x, 1.2, t.a.z, 12, CONFETTI, 2.5, .7); }
  else { t.f.happy = 2; floatIcon('heart', t.f.x, 1.8, t.f.z, 3, .4); }
  SFX.heart(); pop(ITEMS[item].e + ' ' + L('عطيتو! 💗', 'You gave it! 💗', 'Verdin! 💗'));
}

/* ======================================================================
   Roles: put on an outfit, the action button does the job
   ====================================================================== */
const builds = [];
const crateGeo = (() => { const M = new Merge(); M.add(GEO.box, 0, .3, 0, .6, .6, .6, 0, 0, 0, 0xffc23d); M.add(GEO.box, 0, .3, 0, .62, .1, .62, 0, 0, 0, 0xe8a92a); return M.geometry(); })();
function buildTower(x, z){
  const g = new THREE.Group(); for(let i = 0; i < 3; i++){ const m = new THREE.Mesh(crateGeo, MAT); m.position.y = i * .6; m.rotation.y = i * .3; m.castShadow = true; g.add(m); }
  g.position.set(x, groundAt(x, z), z); scene.add(g); builds.push({ g, t:0 }); if(builds.length > 4){ const b = builds.shift(); scene.remove(b.g); }
  burst(x, 1, z, 16, [0xffc23d, 0xffffff], 3, .8);
}
let roleCd = 0;
function roleAction(){
  const r = SAVE.role; if(!r || roleCd > 0) return; roleCd = .6;
  const fx = Math.sin(P.face), fz = Math.cos(P.face);
  if(r === 'doctor'){
    const t = nearestBuddy(P.x, P.z, 3.2);
    if(!t){ pop('🩺 ' + L('قرّب على حدا لتفحصه', 'Get close to someone to check them', 'Muayene için birine yaklaş')); SFX.bonk(); return; }
    const tx = t.kind === 'friend' ? t.a.x : t.f.x, tz = t.kind === 'friend' ? t.a.z : t.f.z;
    P.face = Math.atan2(tx - P.x, tz - P.z); floatIcon('heart', tx, 1.9, tz, 4, .45); SFX.heart();
    pop('🩺 ' + L('صحته ممتازة! 💪', 'Healthy and strong! 💪', 'Sapasağlam! 💪'));
    if(t.kind === 'friend') mpSend('fx', { k:'check', to:t.a.id }); else t.f.happy = 2;
  } else if(r === 'firefighter'){ P.sprayT = 1.6; SFX.splash(); if(mpActive()) mpSend('fx', { k:'hose' }); }
  else if(r === 'chef'){ holdItem('cake'); burst(P.x + fx * .5, 1.2, P.z + fz * .5, 16, [0xffe0ec, 0xffffff, 0x8fd8ff], 2.5, .7); SFX.star(); pop('🧁 ' + L('طبخت كاب كيك!', 'You baked a cupcake!', 'Kek pişirdin!')); }
  else if(r === 'teacher'){ floatIcon('letters', P.x, P.y + 1.8, P.z, 5, .5); SFX.bell(); pop('📚 ' + L('درس اليوم: أ ب ت!', "Today's lesson: A B C!", 'Bugünün dersi: A B C!')); if(mpActive()) mpSend('fx', { k:'teach' }); }
  else if(r === 'builder'){ const x = P.x + fx * 1.4, z = P.z + fz * 1.4; buildTower(x, z); SFX.place(); if(mpActive()) mpSend('fx', { k:'build', x:Math.round(x * 10) / 10, z:Math.round(z * 10) / 10 }); }
  else if(r === 'icecream'){ const t = nearestBuddy(P.x, P.z, 3.2); if(t) giveTo(t, 'icecream', Math.floor(Math.random() * 3)); else { holdItem('icecream', Math.floor(Math.random() * 3)); SFX.pop(); } }
  else if(r === 'pilot'){ guideTo = { x:PLACES.plane.x, z:PLACES.plane.z, t:20 }; say(L('روح عالمطار ✈️ اتبع الأسهم', 'Go to the airfield ✈️ follow the arrows', 'Havaalanına git ✈️ okları takip et'), 3500); }
}
function setRole(r){
  SAVE.role = ROLES[r] ? r : null; persist();
  dress(heroM, SAVE.role, P.item, P.itemCol);
  if(SAVE.role){ burst(P.x, 1.2, P.z, 30, CONFETTI, 3.5, 1); SFX.star(); reward('role_' + r, 1);
    if(r === 'icecream') unlockVeh('icecream'); if(r === 'firefighter') unlockVeh('firetruck'); }
  hudKey = ''; actKey = null; if(mpActive()) mpTrack();
}

/* ======================================================================
   What the action button does right now
   ====================================================================== */
let ctxNow = null, guideTo = null;
/* distance from a point to a vehicle's body (a line along its length) */
function vehDist(px, pz, x, z, h, len){ const fx = Math.sin(h), fz = Math.cos(h), t = clamp((px - x) * fx + (pz - z) * fz, -len / 2, len / 2); return Math.hypot(px - (x + fx * t), pz - (z + fz * t)); }
function nearSpot(){
  let best = null, bd = 1e9;
  for(const s of SPOTS){
    if(s.drive || (s.swim && !isSwim(P.x, P.z)) || (!s.swim && isSwim(P.x, P.z))) continue;
    const d = Math.hypot(s.x - P.x, s.z - P.z); if(d < s.r && d < bd){ bd = d; best = s; }
  }
  return best;
}
function context(){
  if(state !== 'play' || P.jump || P.ride) return null;
  if(P.act){
    const A = P.act;
    if(A.k === 'fish') return A.phase === 'bite' ? { k:'reel' } : { k:'stop' };
    return A.k === 'slide' || A.k === 'read' ? null : { k:'stop' };
  }
  if(V && V.on){
    if(V.k !== 'plane') for(const s of SPOTS) if(s.drive && Math.hypot(s.x - V.x, s.z - V.z) < s.r + 1) return { k:'pump' };
    return null;
  }
  // a friend's vehicle with a free seat
  for(const a of RM.values()){
    if(!a.v || !a.vm) continue;
    const fly = a.v.k === 'plane' && (a.v.y > .3 || a.v.ph !== 'board');
    if(fly) continue;
    const D = VEH[a.v.k], len = D ? D.len : 7, wid = D ? Math.min(D.r, 1.2) : 1.5;
    if(vehDist(P.x, P.z, a.v.x, a.v.z, a.v.h, len) < wid + 1.8 && seatsFree(a.id, a.vm).length) return { k:'ride', a };
  }
  if(V && !V.on && V.k !== 'plane' && vehDist(P.x, P.z, V.x, V.z, V.h, VEH[V.k].len) < Math.min(VEH[V.k].r, 1.2) + 1.8) return { k:'getin' };
  for(let i = 0; i < 6; i++){
    if(Math.hypot(HOUSE_X[i] - P.x, DOOR_Z + 1.2 - P.z) < 2.6){ const o = TOWN.own[i]; if(!o) return { k:'claim', i }; }
  }
  if(onPier(P.x, P.z) && P.z > PIER.zDeck + 4){ return P.z > PIER.z1 - 5 ? { k:'jump' } : { k:'fish' }; }
  const s = nearSpot(); if(s) return { k:'spot', s };
  if(SAVE.role) return { k:'role' };
  return null;
}
const SPOT_LOOK = {
  swing:() => ['🎠', L('مرجوحة', 'Swing', 'Salıncak'), '#ffc23d'], slide:() => ['🛝', L('زحليطة', 'Slide', 'Kaydırak'), '#5ed6a0'],
  seesaw:() => ['⚖️', L('ميزان', 'See-saw', 'Tahterevalli'), '#b99cff'], fountain:() => ['🪙', L('تمنّى', 'Make a wish', 'Dilek tut'), '#7fd0ff'],
  bell:() => ['🔔', L('الجرس', 'Ring bell', 'Zil çal'), '#ffc23d'], board:() => ['✏️', L('اكتب', 'Write', 'Yaz'), '#5ed6a0'],
  bed:() => ['🛏️', L('ارتاح', 'Rest', 'Dinlen'), '#ff8fb1'], plane:() => SAVE.role === 'pilot' ? ['✈️', L('طير!', 'Fly!', 'Uç!'), '#ff9f43'] : ['✈️', L('صير طيّار', 'Be a pilot', 'Pilot ol'), '#fff8ec'],
  ladder:() => ['🪜', L('اطلع', 'Climb up', 'Tırman'), '#7fd0ff']
};
const ACT_LOOK = {
  stop:() => ['✋', L('خلص', 'Get up', 'Kalk'), '#fff8ec', false], reel:() => ['🐟', L('اسحب!', 'Pull!', 'Çek!'), '#ff8fb1', true],
  pump:() => ['⛽', L('عبّي بنزين', 'Fill up', 'Depoyu doldur'), '#ff8a3d', true],
  ride:c => ['🪑', L('اركب', 'Hop in', 'Bin'), '#6cc4ff', true], getin:() => [VEH[V.k].e, L('اركب', 'Get in', 'Bin'), '#6cc4ff', false],
  claim:() => ['🏠', L('هاد بيتي!', 'My house!', 'Bu benim evim!'), '#ffc23d', true],
  jump:() => ['🤸', L('نط بالمي', 'Jump in', 'Suya atla'), '#7fd0ff', true], fish:() => ['🎣', L('صيد سمك', 'Fish', 'Balık tut'), '#5ed6a0', false],
  spot:c => { const l = c.s.k === 'shop' ? [SHOPS[c.s.shop].e, SHOPS[c.s.shop].name, '#ffc4d6'] : SPOT_LOOK[c.s.k](); return [l[0], l[1], l[2], false]; },
  role:() => { const r = SAVE.role, R = ROLES[r]; const lab = { doctor:L('افحص', 'Check up', 'Muayene'), firefighter:L('رش مي', 'Spray', 'Su sık'), chef:L('اطبخ', 'Cook', 'Pişir'), teacher:L('علّم', 'Teach', 'Öğret'), builder:L('ابني', 'Build', 'İnşa et'), icecream:L('وزّع بوظة', 'Give ice cream', 'Dondurma ver'), pilot:L('المطار', 'Airfield', 'Havaalanı') }[r];
    return [R.e, lab, R.col, false]; }
};
let actKey = '';
function updateActBtn(){
  const c = ctxNow = context();
  const lk = c && ACT_LOOK[c.k] ? ACT_LOOK[c.k](c) : null;
  const key = lk ? lk.join('|') + c.k : '';
  if(key !== actKey){
    actKey = key;
    if(!lk) actBtn.hidden = true;
    else { actBtn.hidden = false; $('#actI').textContent = lk[0]; $('#actB').textContent = lk[1]; actBtn.style.setProperty('--ac', lk[2]); actBtn.classList.toggle('pulse', lk[3]); actBtn.classList.toggle('dim', c.k === 'spot' && c.s.k === 'plane' && SAVE.role !== 'pilot'); }
  }
  const showItem = !!P.item && !P.act && !P.ride && !(V && V.on) && state === 'play';
  itemBtn.hidden = !showItem;
  if(showItem){ const ik = P.item + (nearestFriend(P.x, P.z, 2.8) ? 'g' : ''); if(itemBtn.dataset.k !== ik){ itemBtn.dataset.k = ik; const I = ITEMS[P.item];
    $('#itemI').textContent = I.e; $('#itemB').textContent = ik.endsWith('g') ? L('اعطي', 'Give', 'Ver') : P.item === 'balloon' ? L('طيّر', 'Let go', 'Bırak') : P.item === 'book' ? L('اقرا', 'Read', 'Oku') : P.item === 'fish' ? L('رجّعها', 'Let go', 'Bırak') : L('كول', 'Eat', 'Ye'); } }
}
function doAction(){
  if(state !== 'play') return;
  const c = ctxNow || context(); if(!c) return;
  actKey = null;
  if(c.k === 'stop'){ SFX.tap(); endAct(); }
  else if(c.k === 'reel') reelIn();
  else if(c.k === 'pump'){ SFX.pump(); burst(V.x, 1.5, V.z, 16, [0xffc23d, 0xffffff], 2, .7); pop('⛽ ' + L('مليانة! يلّا', 'Full tank! Off you go', 'Depo dolu! Haydi')); }
  else if(c.k === 'ride'){ const seats = seatsFree(c.a.id, c.a.vm); if(!seats.length) return; P.ride = [c.a.id, seats[0]]; P.act = null; SFX.pop(); hudKey = ''; cam.lookT = 0; }
  else if(c.k === 'getin') getIn();
  else if(c.k === 'claim'){ SFX.tap(); claimCard(c.i); }
  else if(c.k === 'jump') jumpOff();
  else if(c.k === 'fish') startAct({ k:'fish' });
  else if(c.k === 'spot') useSpot(c.s);
  else if(c.k === 'role') roleAction();
}
function useSpot(s){
  if(s.k === 'swing' || s.k === 'slide' || s.k === 'seesaw' || s.k === 'bed') startAct(s);
  else if(s.k === 'fountain'){ fountainT = 1.5; SFX.star(); burst(-20, 1.2, 12, 26, [0xffc23d, 0xffffff, 0xbfe8ff], 3, .8); floatIcon('star', -20, 2.5, 12, 3, .5); pop('🪙 ' + L('تمنّيت أمنية! ✨', 'You made a wish! ✨', 'Dilek tuttun! ✨')); if(mpActive()) mpSend('fx', { k:'wish' }); }
  else if(s.k === 'bell'){ ringBell(true); }
  else if(s.k === 'board'){ floatIcon('letters', -24, 2.4, -8.4, 5, .5); SFX.pop(); pop('✏️ ' + L('كتبت عاللوح!', 'You wrote on the board!', 'Tahtaya yazdın!')); }
  else if(s.k === 'shop'){
    const S = SHOPS[s.shop], k = S.items.length > 1 ? S.items[(SAVE.seen['s_' + s.shop] = ((SAVE.seen['s_' + s.shop] | 0) + 1)) % S.items.length] : S.items[0];
    holdItem(k, k === 'icecream' ? Math.floor(Math.random() * 3) : undefined); SFX.star(); burst(P.x, 1.4, P.z, 14, CONFETTI, 2.5, .7);
    pop(ITEMS[k].e + ' ' + ITEMS[k].name + '!');
  }
  else if(s.k === 'plane'){ if(SAVE.role === 'pilot') startFlight(); else { SFX.bonk(); say(L('لتطير لازم تكون طيّار ✈️ اكبس 👔 واختار طيّار', 'To fly you need to be a pilot ✈️ press 👔 and pick Pilot', 'Uçmak için pilot olmalısın ✈️ 👔 bas ve Pilot seç'), 4000); } }
  else if(s.k === 'ladder'){ P.x = (PIER.x0 + PIER.x1) / 2 + .6; P.z = 63.5; P.y = PIER.y; SFX.pop(); burst(P.x, 1, P.z, 10, WATER, 2, .6); P.trail = []; }
}
function ringBell(send){
  bellT = 2; SFX.bell(); floatIcon('note', -11, 3.4, -8.4, 3, .4);
  if(send){ pop('🔔 ' + L('صار وقت المدرسة!', 'School time!', 'Okul zamanı!')); if(mpActive()) mpSend('fx', { k:'bell' }); }
}

/* ======================================================================
   Aunt Laila: lines, the welcome tour with a guided arrow path
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
  hi:   L('أهلا وسهلا بمدينة بوبو! 🏙️ أنا العمة ليلى، تعا فرجيك', "Welcome to Bobo City! 🏙️ I'm Aunt Laila, let me show you around", 'Bobo Şehri\'ne hoş geldin! 🏙️ Ben Leyla Teyze, sana gezdireyim'),
  house:L('أول شي اختار بيت 🏠 اتبع الأسهم الصفرا لعند الباب', 'First pick a house 🏠 follow the yellow arrows to the door', 'Önce bir ev seç 🏠 sarı okları kapıya kadar takip et'),
  home: L('صار عندك بيت! 🎉 فوت لجوّا واكبس 🔨 لتفرشه', 'You have a house! 🎉 Go inside and press 🔨 to furnish it', 'Artık bir evin var! 🎉 İçeri gir ve döşemek için 🔨 bas'),
  inside:L('اكبس 🔨 فوق لتحط سرير وكنباية وتلفزيون وتغيّر الألوان 🎨', 'Press 🔨 at the top to add a bed, a sofa, a TV and change colours 🎨', 'Yatak, kanepe, TV eklemek ve renkleri değiştirmek için üstteki 🔨 bas 🎨'),
  garage:L('هلأ اكبس 🚗 فوق وجيب سيارة أو بسكليت!', 'Now press 🚗 at the top and get a car or a bike!', 'Şimdi üstteki 🚗 bas ve bir araba ya da bisiklet al!'),
  done: L('برافو! بالمدينة في مدرسة ومستشفى وبحر ومطار… العب متل ما بدّك 🎉', 'Well done! There is a school, a hospital, a beach, an airfield… play as you like 🎉', 'Aferin! Okul, hastane, plaj, havaalanı var… istediğin gibi oyna 🎉'),
  back: L('أهلا فيك من جديد بمدينة بوبو! 🏙️', 'Welcome back to Bobo City! 🏙️', 'Bobo Şehri\'ne tekrar hoş geldin! 🏙️')
};
let tutSaid = '';
function tourTarget(){
  if(guideTo){ return guideTo; }
  if(state !== 'play' || P.ride) return null;
  const t = SAVE.tut;
  if(t === 1){ let best = null, bd = 1e9; for(let i = 0; i < 6; i++) if(!TOWN.own[i]){ const d = Math.hypot(HOUSE_X[i] - P.x, DOOR_Z + 1.2 - P.z); if(d < bd){ bd = d; best = { x:HOUSE_X[i], z:DOOR_Z + 1.2 }; } } return best; }
  if(t === 2){ const h = myHouse(); if(h < 0) return null; if(houseAt(P.x, P.z) === h){ if(tutSaid !== 'inside'){ tutSaid = 'inside'; say(LINES.inside, 6000); setTimeout(() => { if(SAVE.tut === 2){ SAVE.tut = 3; persist(); hudKey = ''; if(state === 'play') say(LINES.garage, 6000); } }, 12000); } return null; } return { x:HOUSE_X[h], z:HOUSE_Z }; }
  if(t === 4){ const d = Math.hypot(PLACES.fountain.x - P.x, PLACES.fountain.z - P.z); if(d < 8){ SAVE.tut = 9; persist(); say(LINES.done, 6500); reward('tour', 3); return null; } return PLACES.fountain; }
  return null;
}
function animGuide(dt){
  if(guideTo){ guideTo.t -= dt; const d = Math.hypot(guideTo.x - P.x, guideTo.z - P.z); if(guideTo.t <= 0 || d < 5) guideTo = null; }
  const g = state === 'play' ? tourTarget() : null, from = V && V.on ? V : P;
  const dist = g ? Math.hypot(g.x - from.x, g.z - from.z) : 0, show = !!g && dist > 2.5;
  guideArrow.visible = guideRing.visible = show; chevrons.count = 0;
  if(!show) return;
  guideArrow.position.set(g.x, 3.2 + Math.abs(Math.sin(T * 3.5)) * .6, g.z); guideArrow.rotation.y = T * 2;
  guideRing.position.set(g.x, .12, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
  const dx = (g.x - from.x) / dist, dz = (g.z - from.z) / dist, a = Math.atan2(dx, dz) + Math.PI, off = (T * 2.5) % 2.2;
  let n = 0;
  for(let d = 1.6 + off; d < dist - 2 && n < 14; d += 2.2, n++){
    const x = from.x + dx * d, z = from.z + dz * d;
    _m.compose(_v.set(x, Math.max(groundAt(x, z), 0) + .13, z), _q.setFromEuler(_e.set(0, a, 0)), _s.set(1, 1, 1)); chevrons.setMatrixAt(n, _m);
  }
  chevrons.count = n; chevrons.instanceMatrix.needsUpdate = true;
}

/* ======================================================================
   HUD
   ====================================================================== */
const hudEl = $('#hud'), driveEl = $('#drive');
let hudKey = '';
function hudFrame(){
  const mp = mpActive(), driving = !!(V && V.on), flying = driving && V.k === 'plane', riding = !!P.ride, myH = myHouse();
  const inOwn = !driving && !riding && myH >= 0 && houseAt(P.x, P.z) === myH;
  const key = [SAVE.role, P.item, SAVE.fish, driving, flying, riding, V ? V.k : '', inOwn, SAVE.tut, mp ? MP.players.map(p => p.id + p.hero + (p.role || '')).join(',') : '', MP.code].join('|');
  if(key === hudKey) return; hudKey = key;
  const rc = $('#hudRole'); rc.hidden = !SAVE.role; if(SAVE.role) rc.textContent = ROLES[SAVE.role].e + ' ' + ROLES[SAVE.role].name;
  const fc = $('#hudFish'); fc.hidden = !SAVE.fish; fc.textContent = '🐟 ' + N(SAVE.fish);
  $('#btnGarage').hidden = $('#btnRole').hidden = $('#btnPet').hidden = $('#btnMap').hidden = driving || riding;
  $('#btnGarage').classList.toggle('dot', SAVE.tut === 3);
  $('#btnEdit').hidden = !inOwn; $('#btnEdit').classList.toggle('dot', SAVE.tut === 2 && inOwn);
  $('#btnOut').hidden = !(driving && !flying) && !riding;
  driveEl.hidden = !driving || flying;
  $('#flyChip').hidden = !flying && !(riding && rideModel() && rideModel().grp.position.y > 2);
  if(driving && !flying){
    const s1 = $('#btnSp1'), s2 = $('#btnSp2');
    s1.hidden = s2.hidden = !(V.k === 'firetruck' || V.k === 'icecream');
    if(V.k === 'firetruck'){ s1.innerHTML = '🚨'; s2.innerHTML = '💦'; s1.classList.toggle('lit', V.sir); }
    if(V.k === 'icecream'){ s1.innerHTML = '🎵'; s2.innerHTML = '🍦'; s1.classList.remove('lit'); }
  }
  const bar = $('#mpBar');
  bar.hidden = !mp;
  if(mp){
    bar.innerHTML = `<span class="chip roomchip">🏙️ ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${p.role && ROLES[p.role] ? ROLES[p.role].e : ''}</span>`).join('');
  }
}

/* ======================================================================
   Cards: garage, roles, pets, places, choosing a house
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu', cardBack = 'play';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on;
  if(!on){ actBtn.hidden = true; itemBtn.hidden = true; actKey = null; driveEl.hidden = true; }
  hudKey = ''; itemBtn.dataset.k = '';
}
function openCard(wide, back){
  if(state === 'play' || state === 'edit') cardBack = back || state;
  state = 'card'; setPlayUI(false); clearInput(); hideEditUI();
  overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : '');
}
function closeCard(){
  overlay.hidden = true;
  if(cardBack === 'edit'){ state = 'edit'; showEditUI(); }
  else { state = 'play'; setPlayUI(true); placeJoyHome(); }
}
const xBtn = `<button class="x-btn" id="bX" aria-label="${L('سكّر', 'Close', 'Kapat')}">✖</button>`;
function wireX(fn){ const b = $('#bX'); if(b) b.onclick = () => { SFX.tap(); (fn || closeCard)(); }; }

function openGarage(){
  openCard(true);
  const items = VEH_IDS.map(k => { const D = VEH[k], own = SAVE.veh.includes(k);
    const hint = { icecream:L('صير بيّاع بوظة 👔', 'Be an ice-cream seller 👔', 'Dondurmacı ol 👔'), firetruck:L('صير إطفائي 👔', 'Be a firefighter 👔', 'İtfaiyeci ol 👔'), boat:L('امشي عالرصيف 🌊', 'Walk on the pier 🌊', 'İskelede yürü 🌊') }[k];
    return `<button class="item${own ? '' : ' poor'}" data-v="${k}"><span class="em">${own ? D.e : '🔒'}</span><b>${D.name}</b><small>${own ? (VEH_SEATS[k] > 1 ? '🪑 ' + N(VEH_SEATS[k]) : '&nbsp;') : hint}</small></button>`; }).join('');
  card.innerHTML = `${xBtn}<h2>🚗 ${L('الكراج', 'Garage', 'Garaj')}</h2>
    <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${items}</div>
    ${V ? `<button class="ghost-btn" id="bPark">🧹 ${L('رجّع', 'Put back', 'Geri koy')} ${VEH[V.k] ? VEH[V.k].e : ''}</button>` : ''}
    <p class="mp-msg" id="gMsg"></p>`;
  wireX();
  card.querySelectorAll('[data-v]').forEach(b => b.onclick = () => {
    const k = b.dataset.v;
    if(!SAVE.veh.includes(k)){ SFX.bonk(); $('#gMsg').textContent = '🔒 ' + b.querySelector('small').textContent; return; }
    SFX.tap(); closeCard(); garageSpawn(k);
  });
  const bp = $('#bPark'); if(bp) bp.onclick = () => { SFX.tap(); despawnVehicle(); planeParked.grp.visible = true; closeCard(); };
}
const VEH_SEATS = {}; for(const k of VEH_IDS) VEH_SEATS[k] = CM.buildVehicle(k).seats.length;
function garageSpawn(k){
  if(P.act) endAct();
  let x, z, h;
  if(VEH[k].water){
    if(isSwim(P.x, P.z) && P.z > SEA_Z + 2.5){ x = P.x; z = Math.max(P.z, SEA_Z + 3); h = P.face; }
    else { x = PIER.x1 + 3.6; z = 58; h = 0; poof(P.x, P.z); }
  } else {
    if(isSwim(P.x, P.z) || onPier(P.x, P.z)){ x = 6; z = 38; h = Math.PI; poof(P.x, P.z); }
    else { const hi = houseAt(P.x, P.z, -1); if(hi >= 0){ x = HOUSE_X[hi]; z = -38; h = Math.PI / 2; } else { x = P.x + Math.cos(P.face) * 2.2; z = P.z - Math.sin(P.face) * 2.2; h = P.face; } }
    const o = { x, z }; for(let i = 0; i < 4; i++) collide(o, VEH[k].r, 'veh'); x = o.x; z = o.z;
  }
  spawnVehicle(k, x, z, h); burst(x, 1, z, 26, CONFETTI, 3.5, 1); SFX.pop();
  getIn();
}
function poof(x, z){ burst(x, 1, z, 20, [0xffffff, 0xffc23d], 3, 1); }

function openRoles(){
  openCard(true);
  const n = ROLE_IDS.length;
  const wheel = ROLE_IDS.map((r, i) => { const a = -Math.PI / 2 + i / n * Math.PI * 2, R = ROLES[r];
    return `<button class="wheel-b${SAVE.role === r ? ' on' : ''}" data-r="${r}" style="--x:${(Math.cos(a) * 152).toFixed(1)}%;--y:${(Math.sin(a) * 152).toFixed(1)}%;--rc:${R.col}"><i>${R.e}</i><b>${R.name}</b></button>`; }).join('');
  card.innerHTML = `${xBtn}<h2>👔 ${L('شو بدّك تصير؟', 'What do you want to be?', 'Ne olmak istersin?')}</h2>
    <div class="wheel">${wheel}<button class="wheel-mid" data-r=""><img src="${charImg(heroId)}" alt=""><b>${SAVE.role ? '🚫 ' + L('بلا', 'None', 'Hiçbiri') : '🙂'}</b></button></div>`;
  wireX();
  card.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { SFX.tap(); setRole(b.dataset.r || null); closeCard();
    if(SAVE.role){ const lines = { doctor:L('اكبس 🩺 جنب أي حدا لتفحصه، ومن المستشفى في أسرّة', 'Press 🩺 next to anyone to check them up', 'Birinin yanında 🩺 bas ve muayene et'), firefighter:L('اكبس 💦 لترش مي! وسيارة الإطفاء صارت بالكراج 🚒', 'Press 💦 to spray water! The fire truck is in the garage now 🚒', 'Su sıkmak için 💦 bas! İtfaiye aracı artık garajda 🚒'), chef:L('اكبس 🍳 لتطبخ كاب كيك وتعطيه لأصحابك', 'Press 🍳 to bake cupcakes and give them to friends', 'Kek pişirmek için 🍳 bas ve arkadaşlarına ver'), teacher:L('روح عالمدرسة ودقّ الجرس 🔔', 'Go to the school and ring the bell 🔔', 'Okula git ve zili çal 🔔'), builder:L('اكبس 🔨 لتبني برج صناديق', 'Press 🔨 to build a crate tower', 'Kasa kulesi yapmak için 🔨 bas'), icecream:L('وزّع بوظة 🍦 وسيارة البوظة صارت بالكراج!', 'Give out ice cream 🍦 — the ice-cream truck is in the garage now!', 'Dondurma dağıt 🍦 — dondurma arabası artık garajda!'), pilot:L('روح عالمطار ✈️ وطيّر الطيارة! أصحابك بيركبوا معك', 'Go to the airfield ✈️ and fly the plane! Friends can ride along', 'Havaalanına git ✈️ ve uçağı uçur! Arkadaşların da binebilir') };
      say(ROLES[SAVE.role].e + ' ' + lines[SAVE.role], 4500); } });
}
function openPets(){
  openCard(true);
  card.innerHTML = `${xBtn}<h2>🐾 ${L('حيوان بيمشي معك', 'A pet to walk with you', 'Seninle yürüyen bir hayvan')}</h2>
    <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${PET_IDS.map(k => `<button class="item${SAVE.pet === k ? ' on' : ''}" data-p="${k}"><span class="em">${PETS[k].e}</span><b>${PETS[k].name}</b></button>`).join('')}
    <button class="item${!SAVE.pet ? ' on' : ''}" data-p=""><span class="em">🚫</span><b>${L('بلا حيوان', 'No pet', 'Hayvansız')}</b></button></div>`;
  wireX();
  card.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { SFX.tap(); SAVE.pet = b.dataset.p || null; persist(); syncMyPet(); if(myPet){ myPet.happy = 2; SFX.heart(); } if(mpActive()) mpTrack(); closeCard(); });
}
const PLACE_LIST = [
  ['fountain', '⛲', L('الحديقة', 'Park', 'Park'), -20, 7.6, Math.PI], ['playground', '🛝', L('الملعب', 'Playground', 'Oyun parkı'), -8, 18, 0], ['school', '🏫', L('المدرسة', 'School', 'Okul'), -16, -6, Math.PI],
  ['hospital', '🏥', L('المستشفى', 'Hospital', 'Hastane'), 14, -5.4, Math.PI], ['fire', '🚒', L('الإطفائية', 'Fire station', 'İtfaiye'), 28, -6, Math.PI], ['bakery', '🥖', SHOPS.bakery.name, 9, 4.6, 0],
  ['toys', '🎈', SHOPS.toys.name, 18.5, 4.6, 0], ['market', '🛒', SHOPS.market.name, 28, 4.6, 0], ['library', '📚', SHOPS.library.name, 18, 26.2, Math.PI],
  ['beach', '🏖️', L('البحر', 'Beach', 'Plaj'), -2, 44, 0], ['pier', '🎣', L('الرصيف', 'Pier', 'İskele'), 12, 47, 0], ['plane', '✈️', L('المطار', 'Airfield', 'Havaalanı'), -46, 22, Math.PI], ['gas', '⛽', L('البنزين', 'Gas station', 'Benzinlik'), 47, -1.8, Math.PI]
];
function openPlaces(){
  openCard(true);
  const homes = []; const mh = myHouse();
  if(mh >= 0) homes.push(`<button class="item" data-h="${mh}"><span class="em">🏠</span><b>${L('بيتي', 'My house', 'Evim')}</b></button>`);
  if(mpActive()) TOWN.own.forEach((o, i) => { if(o && o !== ME){ const a = RM.get(o); if(a) homes.push(`<button class="item" data-h="${i}"><img src="${charImg(a.hero)}" alt="" style="width:60%;border-radius:50%;box-shadow:0 0 0 3px ${MCOL[a.c] || '#fff'}"><b>${L('بيت صاحبي', "Friend's house", 'Arkadaşımın evi')}</b></button>`); } });
  card.innerHTML = `${xBtn}<h2>🗺️ ${L('وين بدّك تروح؟', 'Where do you want to go?', 'Nereye gitmek istersin?')}</h2>
    <div class="grid" style="grid-template-columns:repeat(6,minmax(0,1fr))">${homes.join('')}${PLACE_LIST.map((p, i) => `<button class="item" data-pl="${i}"><span class="em">${p[1]}</span><b>${p[2]}</b></button>`).join('')}</div>`;
  wireX();
  const go = (x, z, f) => {
    closeCard(); if(P.ride) hopOff(true); if(P.act) endAct();
    if(V && V.on){ if(V.k === 'boat' || V.k === 'plane'){ say(L('انزل أول 🙂', 'Get out first 🙂', 'Önce in 🙂'), 2500); return; } getOut(); }
    poof(P.x, P.z); P.x = x; P.z = z; P.face = f; P.y = groundAt(x, z); P.trail = []; pushTrail(P.trail, x, z); snapCam = true; cam.yaw = f + Math.PI; SFX.pop(); poof(x, z);
  };
  card.querySelectorAll('[data-h]').forEach(b => b.onclick = () => { SFX.tap(); const i = +b.dataset.h; go(HOUSE_X[i], DOOR_Z + 2.4, Math.PI); });
  card.querySelectorAll('[data-pl]').forEach(b => b.onclick = () => { SFX.tap(); const p = PLACE_LIST[+b.dataset.pl]; go(p[3], p[4], p[5]); });
}
function claimCard(i){
  openCard(false);
  let pickF = SAVE.flag;
  const draw = () => {
    card.innerHTML = `${xBtn}<h2>🏠 ${L('هاد بيتك؟', 'Is this your house?', 'Bu senin evin mi?')}</h2>
      <p>${L('اختار لون علمك', 'Pick your flag colour', 'Bayrak rengini seç')}</p>
      <div class="swatches">${FLAGS.map((c, k) => `<button class="sw${k === pickF ? ' on' : ''}" data-f="${k}" style="--sc:${hexCss(c)}" aria-label="${k + 1}"></button>`).join('')}</div>
      ${SAVE.house >= 0 && SAVE.house !== i ? `<p>📦 ${L('أغراضك بتنتقل معك للبيت الجديد', 'Your furniture moves with you', 'Eşyaların seninle taşınır')}</p>` : ''}
      <button class="big-btn mint" id="bClaim">✅ ${L('إي، هاد بيتي!', 'Yes, my house!', 'Evet, benim evim!')}</button>`;
    wireX();
    card.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { SFX.tap(); pickF = +b.dataset.f; draw(); });
    $('#bClaim').onclick = () => { SFX.tap(); closeCard(); claimHouse(i, pickF); };
  };
  draw();
}
function claimHouse(i, flag){
  if(TOWN.own[i] && TOWN.own[i] !== ME) return false;
  SAVE.house = i; SAVE.flag = clamp(flag | 0, 0, FLAGS.length - 1); persist();
  const own = TOWN.own.map(o => o === ME ? '' : o); own[i] = ME; setOwn(own);
  refreshHouses(true); mpHouseSend(true); localOwn();
  SFX.flag(); burst(HOUSE_X[i] - 3, 4, -38.4, 50, CONFETTI, 5, 1.2); burst(HOUSE_X[i], 2, DOOR_Z + 1, 30, CONFETTI, 4, 1);
  reward('house', 5);
  if(SAVE.tut <= 1){ SAVE.tut = 2; persist(); say(LINES.home, 5000); }
  hudKey = ''; return true;
}

/* ======================================================================
   Furnishing your house: a top view with a grid; tap things to move them
   ====================================================================== */
const editBar = $('#editBar'), editHint = $('#editHint');
let edit = null, heldMesh = null, heldFoot = null;
const GHOST = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.6, transparent:true, opacity:.8 });
function enterEdit(){
  const h = myHouse(); if(h < 0 || state !== 'play' || V?.on || P.ride) return;
  if(P.act) endAct();
  state = 'edit'; setPlayUI(false); clearInput(); edit = { house:h, held:null };
  gridMesh.position.set(HOUSE_X[h], .1, HOUSE_Z); gridMesh.visible = true; showEditUI();
  if(SAVE.tut === 2){ SAVE.tut = 3; persist(); }
}
function showEditUI(){
  if(!edit) return;
  gridMesh.visible = true; editHint.hidden = false; editBar.hidden = false;
  const held = edit.held;
  editHint.textContent = held ? L('اكبس عالأرض لتحرّكه 👆', 'Tap the floor to move it 👆', 'Taşımak için zemine dokun 👆') : L('اكبس على أي غرض لتحرّكه', 'Tap anything to move it', 'Taşımak için bir eşyaya dokun') + ' · ' + N(SAVE.furn.length) + '/' + N(FURN_MAX);
  editBar.innerHTML = held
    ? `${FURN[held.k].wall ? '' : `<button class="big-btn sky" id="eRot">🔄 ${L('لفّ', 'Turn', 'Çevir')}</button>`}<button class="big-btn mint" id="ePut">✅ ${L('حطّ', 'Place', 'Koy')}</button><button class="big-btn no" id="eDel">🗑️ ${L('شيل', 'Remove', 'Kaldır')}</button>`
    : `<button class="big-btn pink" id="eShop">🛋️ ${L('أغراض', 'Furniture', 'Eşyalar')}</button><button class="big-btn sky" id="eWall">🎨 ${L('الحيطان', 'Walls', 'Duvarlar')}</button><button class="big-btn" id="eFloor">🟫 ${L('الأرض', 'Floor', 'Zemin')}</button><button class="big-btn mint" id="eDone">✅ ${L('خلصت', 'Done', 'Bitti')}</button>`;
  const on = (id, fn) => { const b = $('#' + id); if(b) b.onclick = () => { ac(); fn(); }; };
  on('eRot', editRotate); on('ePut', editPlace); on('eDel', editRemove); on('eShop', () => { SFX.tap(); openCatalog(FCATS[0][0]); });
  on('eWall', () => { SFX.tap(); openColors('wall'); }); on('eFloor', () => { SFX.tap(); openColors('floor'); }); on('eDone', exitEdit);
  drawHeld();
}
function hideEditUI(){ editHint.hidden = true; editBar.hidden = true; }
function drawHeld(){
  if(heldMesh){ scene.remove(heldMesh); heldMesh = null; }
  if(heldFoot){ scene.remove(heldFoot); heldFoot.geometry.dispose(); heldFoot = null; }
  if(!edit || !edit.held) return;
  const held = edit.held, c = fcenter(edit.house, held), ok = canPlace(held, SAVE.furn);
  heldMesh = new THREE.Mesh(CM.furnGeo(held.k), GHOST); heldMesh.position.set(c.x, FURN[held.k].wall ? .07 : .35, c.z); heldMesh.rotation.y = c.r * Math.PI / 2; scene.add(heldMesh);
  heldFoot = new THREE.Mesh(new THREE.PlaneGeometry(c.w - .06, c.d - .06), new THREE.MeshBasicMaterial({ color:ok ? 0x5ed6a0 : 0xff5d73, transparent:true, opacity:.55, depthWrite:false }));
  heldFoot.rotation.x = -Math.PI / 2; heldFoot.position.set(FURN[held.k].wall ? houseX0(edit.house) + held.ix + .5 : c.x, .11, FURN[held.k].wall ? houseZ0() + held.iz + .5 : c.z); scene.add(heldFoot);
}
function editTap(r){
  if(!edit) return;
  const held = edit.held;
  if(held){
    const hit = r.ray.intersectPlane(floorPlane, _v); if(!hit) return;
    const lx = hit.x - houseX0(edit.house), lz = hit.z - houseZ0();
    if(FURN[held.k].wall){
      const ix = clamp(Math.floor(lx), 0, CX - 1), iz = clamp(Math.floor(lz), 0, CZ - 1);
      const dB = iz, dL = ix, dR = CX - 1 - ix;
      if(dB <= dL && dB <= dR){ held.ix = ix; held.iz = 0; } else if(dL <= dR){ held.ix = 0; held.iz = Math.max(1, iz); } else { held.ix = CX - 1; held.iz = Math.max(1, iz); }
    } else { const [w, d] = fdim(held.k, held.r); held.ix = clamp(Math.round(lx - w / 2), 0, CX - w); held.iz = clamp(Math.round(lz - d / 2), 0, CZ - d); }
    SFX.tap(); drawHeld(); return;
  }
  const hits = r.intersectObjects(HOUSES[edit.house].furnGrp.children, false);
  if(!hits.length) return;
  const i = hits[0].object.userData.idx, it = SAVE.furn[i]; if(!it) return;
  edit.held = Object.assign({}, it, { from:Object.assign({}, it) }); SAVE.furn.splice(i, 1); refreshHouses(); SFX.tap(); showEditUI();
}
function editRotate(){
  const held = edit && edit.held; if(!held || FURN[held.k].wall) return; held.r = (held.r + 1) & 3; const [w, d] = fdim(held.k, held.r);
  held.ix = clamp(held.ix, 0, CX - w); held.iz = clamp(held.iz, 0, CZ - d); SFX.tap(); drawHeld();
}
function editPlace(){
  const held = edit && edit.held; if(!held) return true;
  const it = { k:held.k, ix:held.ix, iz:held.iz, r:FURN[held.k].wall ? 0 : held.r };
  if(!canPlace(it, SAVE.furn)){ SFX.bonk(); editHint.textContent = L('ما بيزبط هون، جرّب مكان تاني 🙂', "It doesn't fit there — try another spot 🙂", 'Oraya sığmıyor, başka yer dene 🙂'); return false; }
  SAVE.furn.push(it); edit.held = null; refreshHouses(); persist(); SFX.place();
  const c = fcenter(edit.house, it); burst(c.x, .8, c.z, 16, CONFETTI, 3, .8); showEditUI(); mpHouseSend(); return true;
}
function editRemove(){ if(!edit || !edit.held) return; const c = fcenter(edit.house, edit.held); edit.held = null; persist(); SFX.pop(); poof(c.x, c.z); showEditUI(); mpHouseSend(); }
function exitEdit(){
  if(!edit) return;
  if(edit.held && !editPlace()){ const f = edit.held.from; if(f && canPlace(f, SAVE.furn)) SAVE.furn.push({ k:f.k, ix:f.ix, iz:f.iz, r:f.r }); edit.held = null; }
  edit.held = null; drawHeld(); refreshHouses(); persist();
  edit = null; SFX.tap(); hideEditUI(); gridMesh.visible = false; state = 'play'; setPlayUI(true); placeJoyHome(); mpHouseSend();
}
function openCatalog(cat){
  openCard(true, 'edit');
  const full = SAVE.furn.length >= FURN_MAX;
  card.innerHTML = `${xBtn}<h2>🛋️ ${L('أغراض للبيت', 'Things for the house', 'Ev eşyaları')}</h2>
    <div class="tabs">${FCATS.map(([k, e, n]) => `<button data-c="${k}" class="${k === cat ? 'on' : ''}" aria-label="${n}">${e}</button>`).join('')}</div>
    <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${FURN_IDS.filter(k => FURN[k].cat === cat).map(k => `<button class="item${full ? ' poor' : ''}" data-b="${k}"><span class="em">${FURN[k].e}</span><b>${FURN[k].name}</b></button>`).join('')}</div>
    <p class="mp-msg" id="catMsg">${full ? L('البيت مليان! شيل شي أول 🙂', 'The house is full! Remove something first 🙂', 'Ev dolu! Önce bir şey kaldır 🙂') : ''}</p>`;
  wireX();
  card.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { SFX.tap(); openCatalog(b.dataset.c); });
  card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
    if(SAVE.furn.length >= FURN_MAX){ SFX.bonk(); return; }
    SFX.tap(); edit.held = freeSpot(b.dataset.b); closeCard();
  });
}
function openColors(which){
  openCard(false, 'edit');
  const list = which === 'wall' ? WALLC : FLOORC, cur = which === 'wall' ? SAVE.wall : SAVE.floor;
  card.innerHTML = `${xBtn}<h2>${which === 'wall' ? '🎨 ' + L('لون الحيطان', 'Wall colour', 'Duvar rengi') : '🟫 ' + L('لون الأرض', 'Floor colour', 'Zemin rengi')}</h2>
    <div class="swatches big">${list.map((c, k) => `<button class="sw${k === cur ? ' on' : ''}" data-k="${k}" style="--sc:${hexCss(c)}" aria-label="${k + 1}"></button>`).join('')}</div>
    <button class="big-btn mint" id="bOkC">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  wireX();
  card.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { SFX.tap(); if(which === 'wall') SAVE.wall = +b.dataset.k; else SAVE.floor = +b.dataset.k; persist(); refreshHouses(); mpHouseSend(); openColors(which); });
  $('#bOkC').onclick = () => { SFX.tap(); closeCard(); };
}
$('#btnGarage').onclick = () => { if(state !== 'play') return; SFX.tap(); openGarage(); };
$('#btnRole').onclick = () => { if(state !== 'play') return; SFX.tap(); openRoles(); };
$('#btnPet').onclick = () => { if(state !== 'play') return; SFX.tap(); openPets(); };
$('#btnMap').onclick = () => { if(state !== 'play') return; SFX.tap(); openPlaces(); };
$('#btnEdit').onclick = () => { SFX.tap(); enterEdit(); };
$('#btnOut').onclick = () => { if(state !== 'play') return; if(P.ride) hopOff(); else getOut(); };

/* ======================================================================
   Menu, hero picker, pause, starting to play
   ====================================================================== */
function showMenu(){
  if(MP.t){ mpLeave(true); }
  if(edit){ edit = null; gridMesh.visible = false; drawHeld(); }
  state = 'menu'; setPlayUI(false); hideEditUI(); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('city_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🏙️</div><h1>${L('مدينة بوبو', 'Bobo City', 'Bobo Şehri')}</h1>
    <p class="sub">${L('اختار بيتك، سوق سيارتك، وصير أي شي بدّك!', 'Pick your house, drive around and be anything you like!', 'Evini seç, araba sür, ne istersen ol!')}</p>
    <div class="row"><button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
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
    SFX.tap(); SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setHero(selPick); refreshHouses(true);
    if(mpActive()){ mpTrack(); mpHouseSend(true); }
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
function startPlay(){
  if(ROT) rawSet('city_rothint', '1');
  overlay.hidden = true; hideEditUI();
  localOwn(); refreshHouses(true);
  const mh = myHouse(), sp = mh >= 0 ? { x:HOUSE_X[mh], z:DOOR_Z + 2.6, f:Math.PI } : SPAWN;
  if(V){ despawnVehicle(); planeParked.grp.visible = true; } P.ride = null; P.act = null; P.jump = null;
  P.x = sp.x; P.z = sp.z; P.face = sp.f; P.vx = P.vz = 0; P.y = 0; P.trail = []; for(let i = 6; i >= 0; i--) pushTrail(P.trail, P.x - Math.sin(P.face) * i * .3, P.z - Math.cos(P.face) * i * .3);
  wasInside = false; cam.yaw = P.face + Math.PI; cam.pAdj = 0; cam.auto = null; snapCam = true; closeup = null;
  if(myPet){ dropPet(myPet); myPet = null; } syncMyPet();
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(LINES.hi, 4000); setTimeout(() => { if(state === 'play' && SAVE.tut === 1) say(LINES.house, 6000); }, 4100); }
  else if(SAVE.tut === 1) say(LINES.house, 5000);
  else if(SAVE.tut === 2) say(LINES.home, 4500);
  else if(SAVE.tut === 3) say(LINES.garage, 4500);
  else say(LINES.back, 2500);
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0, cullT = 0;
const _rv = new THREE.Vector3();
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; TC += dt; fpsN++; fpsT += dt; if(roleCd > 0) roleCd -= dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  const playing = state === 'play';
  if(playing) readInput(dt); else { inp.x = inp.z = inp.m = 0; }
  if(P.ride) stepRide();
  else if(V && V.on){ if(playing || V.k === 'plane') stepVehicle(dt); if(V && V.on){ seatWorld(V.M, 0, _v); P.x = _v.x; P.z = _v.z; P.y = _v.y; P.face = V.h; P.move = 0; } }
  else { if(playing) stepPlayer(dt); else { P.vx = P.vz = 0; P.move = lerp(P.move, 0, Math.min(1, dt * 10)); if(P.act) stepAct(dt); } if(V) stepVehicle(dt); }
  // DYN: the moving and parked things you bump into
  DYN = [];
  for(const c of CARS){ for(const s of [-.8, .8]) DYN.push({ x:c.x + Math.sin(c.h) * s, z:c.z + Math.cos(c.h) * s, r:.95 }); }
  if(V && !V.on && V.k !== 'boat' && V.k !== 'plane') DYN.push({ x:V.x, z:V.z, r:VEH[V.k].r * .8, id:'myv' });
  for(const a of RM.values()) if(a.v && a.v.k !== 'boat' && a.v.k !== 'plane' && a.v.y < .5) DYN.push({ x:a.v.x, z:a.v.z, r:(VEH[a.v.k] ? VEH[a.v.k].r : 1) * .8, id:a.id });
  // my character
  if(heroM){
    const riding = !!P.ride || !!(V && V.on), seat = riding ? (P.ride ? (rideModel() || {}).seats?.[P.ride[1]] : V.M.seats[0]) : null;
    const anim = riding ? (seat && seat.pose === 'bike' ? 'bike' : 'sit') : P.act ? ({ swing:'sit', slide:'sit', seesaw:'sit', bed:'lie', fish:'fish', read:'sit' }[P.act.k]) : isSwim(P.x, P.z) && !P.jump ? 'swim' : null;
    P.anim = anim;
    const sitting = anim === 'sit' || anim === 'bike';
    heroM.grp.position.set(P.x, sitting ? P.y - HIP(heroM) + .05 : P.y, P.z);
    heroM.grp.rotation.set(anim === 'lie' ? -Math.PI / 2 : (P.act && (P.act.k === 'swing' || P.act.k === 'slide') ? (P.tilt || 0) * (P.act.k === 'slide' ? -1 : 1) : 0), riding ? P.face + (P.ride ? 0 : 0) : P.face, 0);
    if(P.act && P.act.k === 'slide') heroM.grp.rotation.set(0, P.face, -(P.tilt || 0) * .0);
    poseHero(heroM, { t:T, dt, run:sitting || anim === 'lie' ? 0 : P.move, grounded:!P.jump, vy:P.jump ? 4 - P.jump.t * 9 : 0, sq:0, flip:0 });
    poseExtra(heroM, P.sprayT > 0 ? 'fish' : anim, T);
    if(heroM.balloon) heroM.balloon.rotation.z = Math.sin(T * 1.7) * .12;
    if(P.act && P.act.k === 'fish'){ if(!rodMesh.parent && heroM.arms.length) heroM.arms[1].add(rodMesh), rodMesh.position.set(0, -.29, 0), rodMesh.rotation.set(1.6, 0, 0); }
    else if(rodMesh.parent) rodMesh.parent.remove(rodMesh);
  }
  if(P.sprayT > 0){ P.sprayT -= dt; if(heroM){ heroM.grp.updateMatrixWorld(true); _v.set(.25, .8, .5).applyMatrix4(heroM.grp.matrixWorld); spray(_v.x, _v.y, _v.z, Math.sin(P.face), .25, Math.cos(P.face), 2); } }
  if(myPet) stepPet(myPet, P.trail, P.x, P.z, P.y, dt, !!(P.ride || (V && V.on)));
  stepTraffic(dt); stepFolk(dt);
  if(playing){ updateActBtn(); hudFrame(); saveT += dt; if(saveT > 10) persist(); }
  // swings, seesaw and bell relax when nobody uses them
  swingSeats.forEach((g, i) => { const mine = P.act && P.act.k === 'swing' && P.act.i === i; if(!mine && !g.userData.remote) g.rotation.x *= Math.exp(-2 * dt); g.userData.remote = false; });
  if(!(P.act && P.act.k === 'seesaw') && !seesawBoard.userData.remote) seesawBoard.rotation.z *= Math.exp(-2 * dt); seesawBoard.userData.remote = false;
  if(bellT > 0){ bellT -= dt; bellMesh.rotation.z = Math.sin(T * 14) * .5 * Math.min(1, bellT); } else bellMesh.rotation.z = 0;
  for(let i = floatBalloons.length - 1; i >= 0; i--){ const b = floatBalloons[i]; b.t += dt; b.g.position.y += dt * 2.2; b.g.position.x += Math.sin(b.t * 2) * dt * .5; if(b.t > 8){ scene.remove(b.g); floatBalloons.splice(i, 1); } }
  for(let i = builds.length - 1; i >= 0; i--){ const b = builds[i]; b.t += dt; const s = b.t < .4 ? b.t / .4 : b.t > 24 ? Math.max(0, 25 - b.t) : 1; b.g.scale.setScalar(Math.max(.001, s)); if(b.t > 25){ scene.remove(b.g); builds.splice(i, 1); } }
  // camera
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .04 + 2.6;
    camera.position.set(-6 + Math.sin(a) * 34, 19, 4 + Math.cos(a) * 34); camera.lookAt(-4, 0, 0); camLook.set(-4, 0, 0); aimSun(-4, 0);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  // dollhouse: the walls of the house you are in go low, its roof hides
  const inH = state === 'menu' || state === 'select' ? -1 : edit ? edit.house : (!P.ride && !(V && V.on)) ? houseAt(P.x, P.z, -.4) : -1;
  for(const H of HOUSES){ H.wallK = lerp(H.wallK, H.i === inH ? .3 : 1, Math.min(1, dt * 6)); H.walls.scale.y = H.wallK; H.roof.visible = H.wallK > .9; H.roof.position.y = WALL_H * H.wallK;
    if(H.flag.visible){ const p = H.flag.geometry.attributes.position, b = H.flag.userData.base; for(let k = 0; k < p.count; k++){ const x = b[k * 3]; p.setZ(k, Math.sin(T * 5 + x * 4 + H.i) * .1 * (x + .6)); } p.needsUpdate = true; } }
  if(seaTex) seaTex.offset.set(T * .01, T * .006);
  if(fountainWater && Math.random() < dt * (fountainT > 0 ? 30 : 8)) burst(-20, 2.8, 12, 2, WATER, 1.8, .5, 6);
  if(fountainT > 0) fountainT -= dt;
  if(cloudGrp) cloudGrp.rotation.y += dt * .004;
  animGuide(dt);
  mpFrame(dt);
  updateParts(dt); updateFloaters(dt);
  // distance culling of far buildings
  cullT -= dt; if(cullT <= 0){ cullT = .3; const cx = camLook.x, cz = camLook.z, far = state === 'menu' ? 999 : 95; for(const c of CULL) c.o.visible = Math.hypot(c.x - cx, c.z - cz) < far + c.r; }
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   Events: pos (character, vehicle, seat), fx, hs (my house: pick, flag, colours, furniture), hsreq,
   town (host only: who lives where + the town clock + traffic), give. No names, no chat.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'fx', 'hs', 'hsreq', 'town', 'give'];
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-city-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-city-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, townT:0, hsT:-1, inviteFor:null, typed:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'city';
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
/* friends in the room: character (+ outfit, item), pet, vehicle, seat */
const RM = new Map();
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, c:p.c, x:SPAWN.x + 1.5, y:0, z:SPAWN.z, f:0, m:0, tx:SPAWN.x + 1.5, ty:0, tz:SPAWN.z, tf:0, tm:0, anim:null, tl:0, v:null, vm:null, vt:null, ride:null, pet:null, trail:[], t:Math.random() * 5, seen:false, sprayT:0 }; RM.set(p.id, a); }
    a.c = p.c; a.role = ROLES[p.role] ? p.role : null; a.item = ITEMS[p.item] ? p.item : null; a.ic = p.ic | 0;
    const hero = okHero(p.hero);
    if(a.hero !== hero){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); a.h.grp.rotation.order = 'YXZ'; scene.add(a.h.grp); }
    dress(a.h, a.role, a.item, a.ic);
    const pid = PETS[p.pet] ? p.pet : null;
    if((a.pet ? a.pet.id : null) !== pid){ dropPet(a.pet); a.pet = pid ? makePet(pid, a.x - .8, a.z - .8) : null; }
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); if(a.vm) scene.remove(a.vm.grp); dropPet(a.pet); RM.delete(id); HS.delete(id); if(P.ride && P.ride[0] === id) hopOff(true); }
  hudKey = '';
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
  remoteSync(); HS.clear(); localOwn();
  $('#mpBar').hidden = true; hudKey = '';
}
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || ME;
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play', role:SAVE.role, pet:SAVE.pet, item:P.item, ic:P.itemCol | 0 };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ Object.assign(MP.meta, { hero:heroId, role:SAVE.role, pet:SAVE.pet, item:P.item, ic:P.itemCol | 0 }); MP.t.track(MP.meta); hudKey = ''; } }
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
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); say(L('صاحب الغرفة طلع 🚪 رجعنا لمدينتك', 'The room owner left 🚪 back to your town', 'Oda sahibi çıktı 🚪 kendi şehrine döndün'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  remoteSync();
  if(joined.length){ if(before.length) SFX.flag(); mpHouseSend(true); }
  if(MP.isHost){ setOwn(computeOwn(townIds())); mpTown(); }
  hudKey = '';
}
function mpHouseSend(now){ if(!mpActive()) return; if(now){ MP.hsT = -1; mpSend('hs', myHS()); } else MP.hsT = .35; }
function mpTown(){ if(!mpActive() || !MP.isHost) return; MP.townT = 1.5; mpSend('town', { own:TOWN.own, tc:Math.round(TC * 100) / 100, cars:CARS.map(c => Math.round(c.s * 10) / 10) }); }
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){
    if(!a) return;
    a.tx = clamp(+p.x || 0, -120, 120); a.ty = clamp(+p.y || 0, -2, 40); a.tz = clamp(+p.z || 0, -120, 160); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1);
    a.anim = typeof p.a === 'string' ? p.a : null; a.tl = clamp(+p.tl || 0, -2, 2);
    a.ride = Array.isArray(p.ride) && typeof p.ride[0] === 'string' ? [p.ride[0], clamp(p.ride[1] | 0, 1, 5)] : null;
    const v = p.v && (VEH[p.v.k] || p.v.k === 'plane') ? p.v : null;
    if(v){ a.v = { k:v.k, x:+v.x || 0, y:clamp(+v.y || 0, -1, 40), z:+v.z || 0, h:+v.h || 0, p:+v.p || 0, rl:+v.rl || 0, s:+v.s || 0, on:!!v.on, sir:!!v.sir, spr:!!v.spr, ph:v.ph || null }; if(!a.vm || a.vm.k !== v.k){ if(a.vm) scene.remove(a.vm.grp); a.vm = CM.buildVehicle(v.k); a.vm.grp.rotation.order = 'YXZ'; scene.add(a.vm.grp); a.vt = null; } }
    else if(a.v){ a.v = null; if(a.vm){ scene.remove(a.vm.grp); a.vm = null; } if(P.ride && P.ride[0] === a.id) hopOff(true); }
    if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; a.f = a.tf; if(a.pet){ a.pet.x = a.x - .8; a.pet.z = a.z - .8; } }
  }
  else if(ev === 'fx'){
    const x = a ? a.x : 0, z = a ? a.z : 0;
    if(p.k === 'horn' && a) SFX.horn();
    else if(p.k === 'splash'){ burst(+p.x || x, -.2, +p.z || z, 30, WATER, 4, 1, 10); SFX.splash(); }
    else if(p.k === 'bell') ringBell(false);
    else if(p.k === 'wish'){ burst(-20, 1.2, 12, 20, [0xffc23d, 0xffffff], 3, .8); floatIcon('star', -20, 2.5, 12, 2, .5); }
    else if(p.k === 'teach' && a) floatIcon('letters', x, a.y + 1.8, z, 5, .5);
    else if(p.k === 'build') buildTower(clamp(+p.x || 0, -70, 70), clamp(+p.z || 0, -70, 80));
    else if(p.k === 'hose' && a) a.sprayT = 1.6;
    else if(p.k === 'check' && p.to === MP.id){ floatIcon('heart', P.x, P.y + 1.9, P.z, 5, .45); SFX.heart(); pop('🩺 ' + L('الدكتور فحصك: صحتك ممتازة! 💪', 'The doctor says: you are healthy! 💪', 'Doktor dedi ki: sapasağlamsın! 💪')); }
    else if(p.k === 'pet' && a && a.pet){ a.pet.happy = 1.6; floatIcon('heart', a.pet.x, a.pet.y + .9, a.pet.z, 3, .4); }
    else if(p.k === 'jingle' && a && Math.hypot(a.x - P.x, a.z - P.z) < 40) SFX.jingle();
    else if(p.k === 'balloon' && a){ const g = CM.buildItem('balloon', BALLOON_COLS[(p.c | 0) % BALLOON_COLS.length]); g.position.set(x, a.y + .6, z); scene.add(g); floatBalloons.push({ g, t:0 }); }
    else if(p.k === 'fish' && a) burst(x, 1, z, 14, WATER, 2.5, .8);
  }
  else if(ev === 'give'){ if(p.to === MP.id && ITEMS[p.item]){ holdItem(p.item, p.c | 0); floatIcon('heart', P.x, P.y + 1.9, P.z, 4, .45); SFX.heart(); pop('🎁 ' + L('صاحبك عطاك ', 'Your friend gave you ', 'Arkadaşın verdi: ') + ITEMS[p.item].e); } }
  else if(ev === 'hs'){ if(!MP.players.some(q => q.id === p.id)) return; const hs = hsIn(p); if(!hs) return; HS.set(p.id, hs); if(MP.isHost){ setOwn(computeOwn(townIds())); mpTown(); } refreshHouses(); }
  else if(ev === 'hsreq') mpHouseSend(true);
  else if(ev === 'town'){
    if(MP.isHost || p.id !== MP.hostId || !Array.isArray(p.own)) return;
    setOwn(p.own.slice(0, 6).map(v => typeof v === 'string' && v.length < 40 ? v : ''));
    const tc = +p.tc; if(isFinite(tc) && Math.abs(tc - TC) > .5) TC = tc;
    if(Array.isArray(p.cars)) p.cars.forEach((s, i) => { const c = CARS[i]; if(!c || !isFinite(+s)) return; const L2 = LOOPS[c.l].L; let d = +s - c.s; if(d > L2 / 2) d -= L2; if(d < -L2 / 2) d += L2; c.s = ((c.s + (Math.abs(d) > 6 ? d : d * .5)) % L2 + L2) % L2; });
  }
}
function vehMsg(){
  if(!V) return null;
  const r2 = v => Math.round(v * 100) / 100;
  return { k:V.k, x:r2(V.x), y:r2(V.y), z:r2(V.z), h:r2(V.h), p:r2(V.p || 0), rl:r2(V.rl || 0), s:r2(V.s), on:V.on ? 1 : 0, sir:V.sir ? 1 : 0, spr:V.spr ? 1 : 0, ph:V.plane ? V.plane.phase : null };
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && state !== 'menu' && state !== 'select'){ MP.sendT = .1; const r2 = v => Math.round(v * 100) / 100;
    mpSend('pos', { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.face), m:r2(P.move), a:P.anim || null, tl:r2(P.tilt || 0), v:vehMsg(), ride:P.ride }); }
  if(MP.hsT >= 0){ MP.hsT -= dt; if(MP.hsT < 0) mpHouseSend(true); }
  if(MP.isHost){ MP.townT -= dt; if(MP.townT <= 0) mpTown(); }
  const k = 1 - Math.exp(-10 * dt);
  for(const a of RM.values()){
    a.t += dt;
    if(a.vm && a.v){
      const v = a.v; if(!a.vt) a.vt = { x:v.x, y:v.y, z:v.z, h:v.h, p:v.p, rl:v.rl };
      const q = a.vt; q.x = lerp(q.x, v.x, k); q.y = lerp(q.y, v.y, k); q.z = lerp(q.z, v.z, k); q.h += angDiff(v.h, q.h) * k; q.p = lerp(q.p, v.p, k); q.rl = lerp(q.rl, v.rl, k);
      a.vm.grp.position.set(q.x, q.y, q.z); a.vm.grp.rotation.set(q.p, q.h, q.rl);
      for(const w of a.vm.wheels) w.rotation.x += v.s * dt / .35;
      if(a.vm.siren){ const on = v.sir && Math.sin(T * 14) > 0; a.vm.siren.forEach((s, i) => { s.visible = !v.sir || (i % 2 ? on : !on); }); }
      if(a.vm.prop) a.vm.prop.rotation.z += dt * (v.y > .2 || v.ph === 'fly' ? 40 : 6);
      if(v.spr && a.vm.extra.nozzle){ const n = a.vm.extra.nozzle; _v.set(n[0], n[1], n[2]); a.vm.grp.localToWorld(_v); const ang = q.h + Math.PI; spray(_v.x, _v.y, _v.z, Math.sin(ang), .35, Math.cos(ang), 2); }
    }
    // where the character is: in a seat (own vehicle or someone's), or walking
    let seatM = null, seatI = 0;
    if(a.ride){ const o = a.ride[0]; seatM = o === ME ? (V ? V.M : null) : (RM.get(o) || {}).vm || null; seatI = a.ride[1]; }
    else if(a.v && a.v.on && a.vm) seatM = a.vm;
    if(seatM){ seatWorld(seatM, seatI, _rv); a.x = _rv.x; a.y = _rv.y; a.z = _rv.z; a.f = seatM.grp.rotation.y; a.m = 0; }
    else { a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k); }
    pushTrail(a.trail, a.x, a.z);
    if(a.h){
      const st = seatM ? (seatM.seats[seatI] && seatM.seats[seatI].pose === 'bike' ? 'bike' : 'sit') : a.anim;
      const sitting = st === 'sit' || st === 'bike';
      a.h.grp.position.set(a.x, sitting ? a.y - HIP(a.h) + .05 : a.y, a.z);
      a.h.grp.rotation.set(st === 'lie' ? -Math.PI / 2 : (st === 'sit' && !seatM ? a.tl : 0), a.f, 0);
      poseHero(a.h, { t:a.t, dt, run:sitting || st === 'lie' ? 0 : a.m, grounded:true, vy:0, sq:0, flip:0 });
      poseExtra(a.h, a.sprayT > 0 ? 'fish' : st, a.t);
      if(a.h.balloon) a.h.balloon.rotation.z = Math.sin(a.t * 1.7) * .12;
      // a friend on a swing or the seesaw moves the swing seat / board too
      if(st === 'sit' && !seatM){ swingSeats.forEach(g => { if(Math.abs(g.position.x - a.x) < .4 && Math.abs(a.z - 22.4) < 3){ g.rotation.x = a.tl; g.userData.remote = true; } }); if(Math.abs(a.z - 15.5) < .5 && Math.abs(a.x + 5.5) < 2.2){ seesawBoard.rotation.z = Math.asin(clamp((a.y - .7) / ((a.x + 5.5) || 1), -.5, .5)); seesawBoard.userData.remote = true; } }
    }
    if(a.sprayT > 0){ a.sprayT -= dt; spray(a.x + Math.sin(a.f) * .4, a.y + .8, a.z + Math.cos(a.f) * .4, Math.sin(a.f), .25, Math.cos(a.f), 2); }
    if(a.pet) stepPet(a.pet, a.trail, a.x, a.z, a.y, dt, !!seatM);
  }
  // the parked plane hides while someone is using it
  let planeBusy = !!(V && V.k === 'plane'); for(const a of RM.values()) if(a.v && a.v.k === 'plane') planeBusy = true;
  planeParked.grp.visible = !planeBusy;
}
function mpLeave(silent){
  MP.tok++; if(P.ride) hopOff(true); mpClose(); MP.screen = 'off';
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏙️ ${L('أصحابك بيجوا على مدينتك: بتسوقوا سوا وبتزوروا بيوت بعض', 'Friends come to your town: drive together and visit each other\'s houses', 'Arkadaşların şehrine gelir: birlikte araba sürün ve birbirinizin evini ziyaret edin')}</p>
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
  mpHouseSend(true); if(!MP.isHost) mpSend('hsreq', {}); else mpTown();
  startPlay();
  if(MP.isHost) say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000);
  else say(L('أهلا! هاي مدينة صاحبك 🏙️', "Welcome! This is your friend's town 🏙️", 'Hoş geldin! Burası arkadaşının şehri 🏙️'), 3500);
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'city' yet: guarded. */
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
window.__city = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:() => startPlay(),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), get me(){ return ME; },
  P, tp(x, z, f){ if(P.act) endAct(); P.x = x; P.z = z; P.y = groundAt(x, z); if(f != null) P.face = f; P.trail = []; pushTrail(P.trail, x, z); if(myPet){ myPet.x = x - .8; myPet.z = z - .8; } snapCam = true; if(f != null) cam.yaw = f + Math.PI; },
  act:() => { ctxNow = context(); doAction(); }, ctx:() => { const c = context(); return c ? { k:c.k, spot:c.s ? c.s.k : null, shop:c.s ? c.s.shop : null, i:c.i } : null; },
  get act0(){ return P.act ? { k:P.act.k, phase:P.act.phase, t:P.act.t } : null; }, forceBite(){ if(P.act && P.act.k === 'fish') P.act.bite = 0; },
  claim:(i, f) => claimHouse(i, f || 0), get own(){ return TOWN.own.slice(); }, myHouse:() => myHouse(), SPOTS, PLACES, PIER, HOUSE_X, DOOR_Z,
  houseFurn:i => houseItems(i), houseColors:i => ({ wall:'#' + HOUSES[i].liningMat.color.getHexString(), floor:'#' + HOUSES[i].floorMat.color.getHexString(), flag:HOUSES[i].flag.visible ? '#' + HOUSES[i].flagMat.color.getHexString() : null }),
  edit:{ enter:() => enterEdit(), exit:() => exitEdit(), get on(){ return !!edit; }, get held(){ return edit && edit.held ? { k:edit.held.k, ix:edit.held.ix, iz:edit.held.iz, r:edit.held.r } : null; },
    pick(k){ if(edit) edit.held = freeSpot(k); showEditUI(); }, moveTo(ix, iz){ if(edit && edit.held){ edit.held.ix = ix; edit.held.iz = iz; drawHeld(); } }, rotate:() => editRotate(), place:() => editPlace(), remove:() => editRemove(),
    color(w, k){ if(w === 'wall') SAVE.wall = k; else SAVE.floor = k; persist(); refreshHouses(); mpHouseSend(); }, catalog:c => openCatalog(c || 'bed'), colors:w => openColors(w) },
  garage:() => openGarage(), roles:() => openRoles(), pets:() => openPets(), places:() => openPlaces(),
  spawn:k => { if(!SAVE.veh.includes(k)) SAVE.veh.push(k); garageSpawn(k); }, unlock:k => unlockVeh(k), getOut:() => getOut(), getIn:() => getIn(),
  get veh(){ return V ? { k:V.k, x:V.x, y:V.y, z:V.z, h:V.h, s:V.s, on:V.on, sir:V.sir, phase:V.plane ? V.plane.phase : null, t:V.plane ? V.plane.t : 0 } : null; },
  drive(o){ veh.gas = !!o.gas; veh.brake = !!o.brake; keys.r = o.steer > 0; keys.l = o.steer < 0; }, special:n => vehSpecial(n), specialOff:n => vehSpecialOff(n), horn:() => vehHorn(),
  role:r => setRole(r), pet:k => { SAVE.pet = k; persist(); syncMyPet(); if(mpActive()) mpTrack(); }, get petPos(){ return myPet ? { x:myPet.x, z:myPet.z } : null; },
  hold:(k, c) => holdItem(k, c), useItem:() => useItem(), get item(){ return P.item; }, get dress(){ return heroM.dressKey; }, get att(){ return (heroM.att || []).length; },
  fly:() => startFlight(), flyFast(sec){ if(V && V.plane){ V.plane.phase = 'fly'; V.plane.t = sec; } }, landNow:() => landPlane(),
  ride:() => P.ride ? P.ride.slice() : null, hopOff:() => hopOff(), get traffic(){ return CARS.map(c => ({ s:c.s, v:c.v, x:c.x, z:c.z })); }, get tc(){ return TC; },
  get folk(){ return FOLK.map(f => ({ x:f.x, z:f.z })); },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero, role:p.role })), remotes:[...RM.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, y:a.y, z:a.z, role:a.role, item:a.item, v:a.v ? a.v.k : null, von:a.v ? a.v.on : null, ride:a.ride, vis:!!(a.h && a.h.grp.visible) })), hs:[...HS.keys()] }; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; }, get tour(){ return SAVE.tut; },
  setTut(n){ SAVE.tut = n; persist(); hudKey = ''; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; driveEl.style.visibility = on ? '' : 'hidden'; actBtn.style.visibility = itemBtn.style.visibility = on ? '' : 'hidden'; joyEl.style.visibility = on ? '' : 'hidden'; },
  cam(yaw, pitch){ cam.yaw = yaw; if(pitch != null) cam.pAdj = pitch; cam.auto = null; cam.lookT = 99; }
};

/* ---------- boot ---------- */
ME = mpNewId(); MP.id = ME;
buildWorld();
{ const gt = canvasTex(64, 64, x => { x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61); });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(CX, CZ);
  gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(CX, CZ), new THREE.MeshBasicMaterial({ map:gt, transparent:true, depthWrite:false })); gridMesh.rotation.x = -Math.PI / 2; gridMesh.visible = false; scene.add(gridMesh); }
buildTraffic(); buildFolk();
setHero(heroId);
localOwn(); refreshHouses(true);
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
