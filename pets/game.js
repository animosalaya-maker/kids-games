/* Bobo Pets («حيوانات بوبو 🐾») — main game.
   One small world: your cosy house (3 rooms, furniture on a 1 m grid) and a bright town (park, pond, playground,
   pet shop, ice-cream stand, dress-up corner). Hatch eggs, care for your pet's needs, it grows baby → kid → big.
   Online rooms (Supabase presence like heist; ?mp=local = BroadcastChannel): friends visit the host's house,
   see each other's characters and pets, and can trade pet-for-pet with a two-step double confirmation. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makePetModels } from './models.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { Merge, G:GEO, canvasTex, blobTex, HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const PM = makePetModels(THREE, K);
const { SPECIES, SP_IDS, RAR, STAGES, HATS, HAT_IDS, EGGS, EGG_IDS, FURN, FURN_IDS } = PM;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const NEEDS = {
  hungry: { e:'🍎', name:L('جوعان', 'Hungry', 'Aç'), verb:L('أطعمه', 'Feed', 'Besle'), anim:'eat', dur:2.6 },
  thirsty:{ e:'💧', name:L('عطشان', 'Thirsty', 'Susuz'), verb:L('اسقيه', 'Water', 'Su ver'), anim:'drink', dur:2.4 },
  sleepy: { e:'😴', name:L('نعسان', 'Sleepy', 'Uykulu'), verb:L('نيّمه', 'Nap time', 'Uyut'), anim:'sleep', dur:3.4 },
  dirty:  { e:'🛁', name:L('وسخان', 'Dirty', 'Kirli'), verb:L('حمّمه', 'Bath', 'Yıka'), anim:'bath', dur:3 },
  bored:  { e:'⚽', name:L('زهقان', 'Bored', 'Sıkılmış'), verb:L('العب معه', 'Play', 'Oyna'), anim:'play', dur:3 },
  walk:   { e:'🌳', name:L('بدّو يتمشّى', 'Wants a walk', 'Gezmek istiyor'), verb:L('مشّيه', 'Walk', 'Gezdir'), anim:'walk', dur:0 }
};
const NEED_IDS = Object.keys(NEEDS);
const NEED_HINT = {
  hungry: L('صحن الأكل 🍎 بالبيت، أو البوظة 🍦 بالبلد', 'the food bowl 🍎 at home, or ice cream 🍦 in town', 'evdeki mama kabı 🍎 ya da kasabada dondurma 🍦'),
  thirsty:L('صحن المي 💧 بالبيت، أو البحيرة بالبلد', 'the water bowl 💧 at home, or the pond in town', 'evdeki su kabı 💧 ya da kasabadaki gölet'),
  sleepy: L('السرير 🛏️ بغرفة النوم', 'the bed 🛏️ in the bedroom', 'yatak odasındaki yatak 🛏️'),
  dirty:  L('البانيو 🛁 بالحمّام', 'the bathtub 🛁 in the bathroom', 'banyodaki küvet 🛁'),
  bored:  L('الطابة ⚽ بالبيت، أو الملعب بالبلد', 'the ball ⚽ at home, or the playground in town', 'evdeki top ⚽ ya da kasabadaki oyun parkı'),
  walk:   L('الحديقة 🌳 بالبلد، امشي فيها شوي', 'the park 🌳 in town — walk around in it', 'kasabadaki park 🌳 — içinde biraz yürü')
};
const XP_NEED = 20, GROW = [0, 60, 180], START_STARS = 30, TEAM_MAX = 3, EGG_MAX = 3, TREAT = 5;
const starReward = d => 8 + RAR[SPECIES[d.sp].rar].stars + d.st * 2;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const newUid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
const petName = sp => (SPECIES[sp] || SPECIES.kitten).name;
const stageOf = xp => xp >= GROW[2] ? 2 : xp >= GROW[1] ? 1 : 0;

/* ---------- house: floor x −9..9, z −28..−16; 3 rooms; 1 m grid ---------- */
const HX0 = -9, HZ0 = -28, CX = 18, CZ = 12, HX1 = HX0 + CX, HZ1 = HZ0 + CZ;
const WALL_T = .3, WALL_H = 2.2;
const WALLS = [[-9, -28, 9, -28], [-9, -28, -9, -16], [9, -28, 9, -16], [-9, -16, -5, -16], [-3, -16, 9, -16],
  [1, -28, 1, -26], [1, -24, 1, -20], [1, -18, 1, -16], [1, -22, 9, -22]];
const DOOR_CELLS = new Set(['4,11', '5,11', '9,2', '9,3', '10,2', '10,3', '9,8', '9,9', '10,8', '10,9']);
const NEST = { ix:1, iz:1, x:-7, z:-26 };
const roomOfCell = (ix, iz) => { const x = HX0 + ix + .5, z = HZ0 + iz + .5; return x < 1 ? 0 : z < -22 ? 1 : 2; };
const inHouse = (x, z, m = 0) => x > HX0 + m && x < HX1 - m && z > HZ0 + m && z < HZ1 - m;
const SPAWN_IN = { x:-4, z:-18.2, f:Math.PI }, SPAWN_OUT = { x:-4, z:-13.5, f:0 };
function defaultFurn(){
  return [['sofa', 5, 0, 0], ['rugRound', 5, 4, 0], ['lamp', 9, 0, 0], ['foodbowl', 0, 7, 1], ['waterbowl', 0, 8, 1], ['ball', 6, 8, 0], ['plant', 0, 11, 0], ['plant', 8, 11, 0],
    ['petbed', 12, 1, 0], ['rugRect', 11, 3, 0], ['shelf', 15, 0, 0], ['bigplant', 17, 0, 0], ['tub', 14, 7, 0], ['plant', 17, 11, 0], ['bigplant', 11, 11, 0]]
    .map(([k, ix, iz, r]) => ({ k, ix, iz, r }));
}
const fdim = (k, r) => { const f = FURN[k]; return r % 2 ? [f.d, f.w] : [f.w, f.d]; };
const fcenter = it => { const [w, d] = fdim(it.k, it.r); return { x:HX0 + it.ix + w / 2, z:HZ0 + it.iz + d / 2, w, d }; };

/* ---------- town ---------- */
const BOUND = 40;
const SPOTS = {
  shop:      { x:-12, z:7.6, r:2.4 },
  dress:     { x:12, z:7.6, r:2.4 },
  icecream:  { x:7.4, z:17.5, r:2.6, cx:9.6, cz:18 },
  pond:      { x:22, z:21, r:7.6, pr:5 },
  playground:{ x:0, z:30, r:6.5 },
  park:      { x:-22, z:19, r:8.5 }
};
const SPOT_NEED = { icecream:'hungry', pond:'thirsty', playground:'bored', park:'walk' };
const ITEM_NEED = {}; for(const k in FURN) if(FURN[k].need) ITEM_NEED[k] = FURN[k].need;

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'pets_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function okPet(p){
  if(!p || typeof p !== 'object' || !SPECIES[p.sp]) return null;
  const xp = clamp(Math.floor(+p.xp || 0), 0, 99999);
  return { uid:typeof p.uid === 'string' && p.uid.length < 30 ? p.uid : newUid(), sp:p.sp, xp, st:stageOf(xp), hat:HATS[p.hat] ? p.hat : null,
    needs:Array.isArray(p.needs) ? p.needs.filter(n => NEEDS[n]).slice(0, 2) : [], nt:clamp(+p.nt || 15, 0, 120) };
}
function freshSave(){ return { v:SAVE_V, stars:START_STARS, team:[], farm:[], active:null, eggs:['basic'], furn:defaultFurn(), inv:{}, hats:[], daily:today(), tut:0, hero:null, hatched:0, cared:0 }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.stars = clamp(Math.floor(+s.stars || 0), 0, 999999);
      s.team = (Array.isArray(s.team) ? s.team : []).map(okPet).filter(Boolean).slice(0, TEAM_MAX);
      s.farm = (Array.isArray(s.farm) ? s.farm : []).map(okPet).filter(Boolean).slice(0, 60);
      s.eggs = (Array.isArray(s.eggs) ? s.eggs : []).filter(e => EGGS[e]).slice(0, EGG_MAX);
      s.furn = (Array.isArray(s.furn) ? s.furn : []).filter(it => it && FURN[it.k] && !FURN[it.k].fixed).map(it => ({ k:it.k, ix:it.ix | 0, iz:it.iz | 0, r:(it.r | 0) & 3 })).slice(0, 80);
      s.inv = {}; if(v.inv && typeof v.inv === 'object') for(const k in v.inv) if(FURN[k] && !FURN[k].fixed) s.inv[k] = clamp(v.inv[k] | 0, 0, 99);
      s.hats = (Array.isArray(s.hats) ? s.hats : []).filter(h => HATS[h]);
      if(!s.team.some(p => p.uid === s.active)) s.active = s.team.length ? s.team[0].uid : null;
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveT = 0;
function persist(){ saveT = 0; rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
const activeData = () => SAVE.team.find(p => p.uid === SAVE.active) || null;
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';

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
  place(){ tone(320, .14, 'sine', .12, 0, 640); tone(980, .1, 'triangle', .08, .1); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  crack(){ tone(900, .06, 'square', .06, 0, 300); tone(500, .08, 'triangle', .08, .04, 200); },
  hatch(){ [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, .18, 'triangle', .13, i * .09)); },
  heart(){ tone(880, .1, 'sine', .1, 0, 1320); tone(1320, .12, 'sine', .07, .08, 1760); },
  eat(){ [0, .25, .5, .75].forEach(d => tone(260, .08, 'square', .04, d, 200)); },
  splash(){ [0, .2, .4].forEach(d => tone(700, .15, 'sine', .06, d, 200)); },
  sleep(){ tone(440, .5, 'sine', .07, 0, 330); tone(330, .6, 'sine', .06, .5, 260); },
  boing(){ tone(220, .25, 'sine', .1, 0, 660); },
  grow(){ [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .13, i * .12)); },
  need(){ tone(784, .1, 'sine', .08); tone(988, .14, 'sine', .08, .1); },
  flag(){ [523, 659, 784].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); }
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
scene.fog = new THREE.Fog(0xcdeeff, 60, 150);
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 700);
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
Object.assign(sun.shadow.camera, { left:-17, right:17, top:17, bottom:-17, near:1, far:90 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(18, 34, 14);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const sky = (() => {
  const g = new THREE.SphereGeometry(500, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false }));
  const pa = g.attributes.position, a = new THREE.Color(0x67bdf5), h = new THREE.Color(0xfff0d8), b = new THREE.Color(0xbfe6ff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 500; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
const MAT = PM.MAT;
function meshOf(M, cast = true, receive = true, mat = MAT){ const m = new THREE.Mesh(M.geometry(), mat); m.castShadow = cast; m.receiveShadow = receive; return m; }

/* ---------- Particles (instanced confetti) ---------- */
const PMAX = 260, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .7 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + 2; p.s = size * (.7 + Math.random() * .8); p.g = grav;
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
/* floating sprites: hearts, Zz, bubbles, stars (drawn shapes, no emoji in textures) */
function iconTex(draw){ return canvasTex(64, 64, x => draw(x)); }
const TEX = {
  heart:iconTex(x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); }),
  z:iconTex(x => { x.fillStyle = '#6a7cff'; x.font = '900 48px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', 32, 34); }),
  bub:iconTex(x => { x.strokeStyle = '#7fd0ff'; x.lineWidth = 5; x.fillStyle = 'rgba(200,240,255,.55)'; x.beginPath(); x.arc(32, 32, 24, 0, 6.3); x.fill(); x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(24, 24, 6, 0, 6.3); x.fill(); }),
  star:iconTex(x => { x.fillStyle = '#ffc23d'; x.beginPath(); for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2 - Math.PI / 2, r = i % 2 ? 11 : 28; x.lineTo(32 + Math.cos(a) * r, 34 + Math.sin(a) * r); } x.closePath(); x.fill(); x.strokeStyle = '#c98f12'; x.lineWidth = 3; x.stroke(); }),
  note:iconTex(x => { x.fillStyle = '#ff8fb1'; x.beginPath(); x.ellipse(22, 46, 11, 8, -.4, 0, 6.3); x.fill(); x.fillRect(30, 10, 5, 36); x.fillRect(30, 10, 18, 7); })
};
const floaters = [];
for(let i = 0; i < 40; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:TEX.heart, transparent:true, depthWrite:false })); s.visible = false; scene.add(s); floaters.push({ s, life:0, vx:0, vy:0, vz:0 }); }
let fNext = 0;
function floatIcon(kind, x, y, z, n = 1, size = .45){
  for(let k = 0; k < n; k++){
    const f = floaters[fNext]; fNext = (fNext + 1) % floaters.length;
    f.s.material.map = TEX[kind]; f.s.material.needsUpdate = true; f.s.visible = true;
    f.s.position.set(x + (Math.random() - .5) * .5, y, z + (Math.random() - .5) * .5); f.s.scale.setScalar(size * (.8 + Math.random() * .4));
    f.life = 1.3 + Math.random() * .4; f.vx = (Math.random() - .5) * .5; f.vy = 1 + Math.random() * .6; f.vz = (Math.random() - .5) * .5;
  }
}
function updateFloaters(dt){
  for(const f of floaters){ if(f.life <= 0) continue; f.life -= dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = clamp(f.life * 1.5, 0, 1); if(f.life <= 0) f.s.visible = false; }
}

/* ======================================================================
   The world: ground, paths, house, garden and town
   ====================================================================== */
const CIRCLES = [], BOXES = [], SEGS = [];
WALLS.forEach(w => SEGS.push({ x1:w[0], z1:w[1], x2:w[2], z2:w[3], t:WALL_T / 2 }));
let seed = 7;
const srnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function signTex(text, bg, fg, icon){
  return canvasTex(512, 128, x => {
    x.fillStyle = bg; x.beginPath(); x.roundRect(4, 4, 504, 120, 36); x.fill();
    x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke();
    x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = (window.I18N && I18N.dir) || 'rtl';
    x.font = '800 62px "Baloo Bhaijaan 2","Tajawal",system-ui,sans-serif'; x.fillText(text, 286, 70);
    if(icon) icon(x);
  });
}
function pawIcon(x, cx = 70, cy = 64, col = '#fff'){ x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy + 10, 22, 18, 0, 0, 6.3); x.fill(); for(const [dx, dy] of [[-24, -14], [-9, -28], [9, -28], [24, -14]]){ x.beginPath(); x.ellipse(cx + dx, cy + dy, 8, 10, 0, 0, 6.3); x.fill(); } }
function hatIcon(x){ x.fillStyle = '#fff'; x.fillRect(46, 34, 48, 44); x.fillRect(32, 76, 76, 10); x.fillStyle = '#e8304f'; x.fillRect(46, 64, 48, 10); }
function coneIcon(x){ x.fillStyle = '#f2c27a'; x.beginPath(); x.moveTo(52, 60); x.lineTo(88, 60); x.lineTo(70, 112); x.closePath(); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(70, 50, 20, 0, 6.3); x.fill(); }
function plane(w, h, tex, rep){ if(tex && rep){ tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rep[0], rep[1]); } return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map:tex || null, roughness:.9 })); }

const world = new THREE.Group(); scene.add(world);
let roofGrp, wallsMesh, pondTex, fountainWater, nestMesh, guideArrow, guideRing, gridMesh;
function buildWorld(){
  /* ground with gentle colour variation */
  {
    const g = new THREE.CircleGeometry(150, 64, 0, Math.PI * 2); g.rotateX(-Math.PI / 2);
    const pa = g.attributes.position, col = new Float32Array(pa.count * 3), a = new THREE.Color(0x96d86c), b = new THREE.Color(0x7cc75c), far = new THREE.Color(0xa6d98a);
    for(let i = 0; i < pa.count; i++){ const x = pa.getX(i), z = pa.getZ(i), d = Math.hypot(x, z), n = (Math.sin(x * .21) + Math.cos(z * .17)) * .5 + .5; _c.copy(a).lerp(b, n * .6).lerp(far, clamp((d - 45) / 50, 0, 1)); col.set([_c.r, _c.g, _c.b], i * 3); }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors:true, roughness:1 })); m.receiveShadow = true; world.add(m);
  }
  /* paths, plaza, play areas (flat discs and strips) */
  const F = new Merge(), PATH = 0xf3dfb4;
  const seg = (x1, z1, x2, z2, w = 2.4) => { const L2 = Math.hypot(x2 - x1, z2 - z1); F.add(GEO.box, (x1 + x2) / 2, .02, (z1 + z2) / 2, w, .04, L2, 0, Math.atan2(x2 - x1, z2 - z1), 0, PATH); F.add(GEO.cyl, x2, .02, z2, w / 2, .04, w / 2, 0, 0, 0, PATH); };
  seg(-4, -15.5, -4, -8); seg(-4, -8, 0, 4); seg(0, 10, -12, 7.6); seg(0, 10, 12, 7.6); seg(0, 10, 7.4, 17.5); seg(0, 10, 0, 24); seg(0, 10, -15, 16); seg(0, 10, 16, 19);
  F.add(GEO.cyl, 0, .025, 10, 7.2, .05, 7.2, 0, 0, 0, 0xf6e6c4); F.add(GEO.cyl, 0, .03, 10, 6.6, .05, 6.6, 0, 0, 0, 0xfbefd6);
  F.add(GEO.cyl, 0, .025, 30, 6.8, .05, 6.8, 0, 0, 0, 0xf7dc9c);
  F.add(GEO.cyl, -22, .015, 19, 8.6, .03, 8.6, 0, 0, 0, 0x86d164);
  F.add(GEO.box, 0, .03, -22, 24.5, .05, 18.5, 0, 0, 0, 0x8bd66a);     // garden lawn
  const fm = meshOf(F, false, true); world.add(fm);

  /* ---------- the house ---------- */
  const woodTex = canvasTex(256, 256, x => { x.fillStyle = '#e6b67e'; x.fillRect(0, 0, 256, 256); for(let i = 0; i < 8; i++){ x.fillStyle = i % 2 ? '#e0ae74' : '#eabd86'; x.fillRect(0, i * 32, 256, 30); x.fillStyle = 'rgba(120,70,30,.25)'; x.fillRect(0, i * 32 + 30, 256, 2); x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 30); } });
  const carpetTex = canvasTex(128, 128, x => { x.fillStyle = '#dccdf3'; x.fillRect(0, 0, 128, 128); x.fillStyle = 'rgba(255,255,255,.25)'; for(let i = 0; i < 40; i++) x.fillRect((i * 37) % 128, (i * 61) % 128, 3, 3); });
  const tileTex = canvasTex(128, 128, x => { x.fillStyle = '#c4ecf4'; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#ffffff'; x.lineWidth = 4; for(let i = 0; i <= 2; i++){ x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 128); x.moveTo(0, i * 64); x.lineTo(128, i * 64); x.stroke(); } });
  const floors = [[-9, 1, -28, -16, woodTex, [5, 6]], [1, 9, -28, -22, carpetTex, [4, 3]], [1, 9, -22, -16, tileTex, [4, 3]]];
  for(const [x0, x1, z0, z1, tex, rep] of floors){ const p = plane(x1 - x0, z1 - z0, tex, rep); p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, .075, (z0 + z1) / 2); p.receiveShadow = true; world.add(p); }
  const B = new Merge();
  B.add(GEO.box, 0, .025, -22, 18.8, .07, 12.8, 0, 0, 0, 0xe8d2ad);
  B.add(GEO.box, -4, .05, -15.3, 2.4, .1, 1.2, 0, 0, 0, 0xd9a46a);   // door step
  world.add(meshOf(B, false, true));
  /* walls (scaled down when you are inside: a dollhouse view) */
  const W = new Merge(), WALL = 0xfff3df, TRIM = 0xf0a46a;
  for(const s of SEGS){
    const L2 = Math.hypot(s.x2 - s.x1, s.z2 - s.z1), cx = (s.x1 + s.x2) / 2, cz = (s.z1 + s.z2) / 2, ry = Math.atan2(s.x2 - s.x1, s.z2 - s.z1);
    W.add(GEO.box, cx, WALL_H / 2, cz, WALL_T, WALL_H, L2 + WALL_T, 0, ry, 0, WALL);
    W.add(GEO.box, cx, WALL_H + .06, cz, WALL_T + .12, .12, L2 + WALL_T + .12, 0, ry, 0, TRIM);
    W.add(GEO.box, cx, .15, cz, WALL_T + .06, .3, L2 + WALL_T + .02, 0, ry, 0, 0xe2b98c);
  }
  // windows on the outer walls, a front door frame
  for(const x of [-7, 4, 7]) W.add(GEO.box, x, 1.35, -16, 1.4, 1, WALL_T + .1, 0, 0, 0, 0xa8dcff);
  for(const z of [-25, -19]){ W.add(GEO.box, -9, 1.35, z, WALL_T + .1, 1, 1.4, 0, 0, 0, 0xa8dcff); W.add(GEO.box, 9, 1.35, z, WALL_T + .1, 1, 1.4, 0, 0, 0, 0xa8dcff); }
  for(const x of [-5, 5]) W.add(GEO.box, x, 1.35, -28, 1.4, 1, WALL_T + .1, 0, 0, 0, 0xa8dcff);
  for(const x of [-5.1, -2.9]) W.add(GEO.box, x, WALL_H / 2, -16, .25, WALL_H, .45, 0, 0, 0, 0xc98a52);
  wallsMesh = meshOf(W); world.add(wallsMesh);
  /* hip roof + chimney (hidden while you are inside) */
  roofGrp = new THREE.Group(); roofGrp.position.y = WALL_H;
  const R = new Merge();
  R.add(GEO.cone4, 0, 1.75, -22, 10.6 / .707, 3.5, 7.4 / .707, 0, Math.PI / 4, 0, 0xe46f4f);
  R.add(GEO.box, 0, .08, -22, 19.6, .16, 13.6, 0, 0, 0, 0xd8603f);
  R.add(GEO.box, 5, 2.2, -24, 1.2, 2.4, 1.2, 0, 0, 0, 0xd7b08a); R.add(GEO.box, 5, 3.45, -24, 1.4, .2, 1.4, 0, 0, 0, 0xbf9670);
  roofGrp.add(meshOf(R)); world.add(roofGrp);
  /* house sign */
  const hs = new THREE.Mesh(new THREE.PlaneGeometry(3.2, .8), new THREE.MeshBasicMaterial({ map:signTex(L('بيتي', 'My house', 'Evim'), '#f0a46a', '#fff', x => pawIcon(x)), transparent:true }));
  hs.position.set(-4, WALL_H + .55, -15.82); roofGrp.add(hs); hs.position.y = .55;
  /* the egg nest (fixed) */
  nestMesh = PM.buildFurn('nest'); nestMesh.position.set(NEST.x, .07, NEST.z); world.add(nestMesh);
  /* garden fence with a gate gap at the path */
  const FN = new Merge(), fcol = 0xffffff;
  const fence = (x1, z1, x2, z2) => {
    const L2 = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L2 / 1.2)), ry = Math.atan2(x2 - x1, z2 - z1);
    for(let i = 0; i <= n; i++){ const t = i / n; FN.add(GEO.box, lerp(x1, x2, t), .45, lerp(z1, z2, t), .16, .9, .16, 0, ry, 0, fcol); FN.add(GEO.cone4, lerp(x1, x2, t), .97, lerp(z1, z2, t), .12, .14, .12, 0, ry + Math.PI / 4, 0, fcol); }
    for(const y of [.35, .7]) FN.add(GEO.box, (x1 + x2) / 2, y, (z1 + z2) / 2, .08, .1, L2, 0, ry, 0, fcol);
    SEGS.push({ x1, z1, x2, z2, t:.12 });
  };
  fence(-12, -31, 12, -31); fence(-12, -31, -12, -13); fence(12, -31, 12, -13); fence(-12, -13, -5.6, -13); fence(-2.4, -13, 12, -13);
  world.add(meshOf(FN));
  /* flower beds in the garden (one colour per bed) */
  const FL = new Merge();
  const bed = (x, z, w, d, col) => { FL.add(GEO.box, x, .12, z, w, .24, d, 0, 0, 0, 0x9a6b44); for(let i = 0; i < w * d * 3; i++){ const fx = x + (srnd() - .5) * (w - .3), fz = z + (srnd() - .5) * (d - .3); FL.add(GEO.sm, fx, .32, fz, .1, .07, .1, 0, 0, 0, col); FL.add(GEO.sm, fx, .27, fz, .14, .05, .14, 0, 0, 0, 0x4fae4a); } };
  bed(-9.5, -14.4, 3, .8, 0xff8fb1); bed(2, -14.4, 4, .8, 0xffd23f); bed(8.5, -14.4, 3, .8, 0xffffff); bed(-23, 24.5, 3, 1, 0xff8fb1); bed(-17, 14.5, 3, 1, 0xffd23f); bed(-27, 15, 1, 3, 0xb99cff);
  bed(5.5, 5.6, 3, .8, 0xff8fb1); bed(-5.5, 5.6, 3, .8, 0xffffff);
  world.add(meshOf(FL));

  /* ---------- town buildings ---------- */
  const building = (cx, cz, wcol, roofCol, sign) => {
    const M = new Merge(), w = 7, d = 5, h = 3.2;
    M.add(GEO.box, cx, h / 2, cz, w, h, d, 0, 0, 0, wcol);
    M.add(GEO.box, cx, h + .15, cz, w + .6, .3, d + .6, 0, 0, 0, roofCol);
    M.add(GEO.box, cx, h + .5, cz, w - .4, .5, d - .4, 0, 0, 0, wcol);
    M.add(GEO.box, cx, 1.05, cz + d / 2 + .01, 1.5, 2.1, .1, 0, 0, 0, 0xc98a52);                     // door
    M.add(GEO.sm, cx + .5, 1.05, cz + d / 2 + .1, .08, .08, .08, 0, 0, 0, 0xffc83a);
    for(const s of [-1, 1]){ M.add(GEO.box, cx + s * 2.2, 1.5, cz + d / 2 + .02, 1.7, 1.2, .1, 0, 0, 0, 0xbfe8ff); M.add(GEO.box, cx + s * 2.2, .85, cz + d / 2 + .12, 1.9, .14, .3, 0, 0, 0, 0xffffff); }
    M.add(GEO.box, cx, 2.45, cz + d / 2 + .5, w - .6, .08, 1.1, -.35, 0, 0, roofCol);                  // awning (one colour)
    world.add(meshOf(M));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.1), new THREE.MeshBasicMaterial({ map:sign, transparent:true }));
    sg.position.set(cx, h + .45, cz + d / 2 - .19); world.add(sg);
    BOXES.push({ x0:cx - w / 2, z0:cz - d / 2, x1:cx + w / 2, z1:cz + d / 2 });
  };
  building(-12, 2.5, 0xa6e3c8, 0xff8fa3, signTex(L('محل الحيوانات', 'Pet shop', 'Pet shop'), '#ff8fa3', '#fff', x => pawIcon(x)));
  building(12, 2.5, 0xdccbff, 0x9b7bff, signTex(L('ركن الزينة', 'Dress-up', 'Süslenme'), '#9b7bff', '#fff', hatIcon));
  { // hats on stands and a mirror next to the dress-up corner
    const M = new Merge();
    for(const [x, z] of [[16.2, 6.2], [17.4, 5]]){ M.add(GEO.cyl8, x, .6, z, .05, 1.2, .05, 0, 0, 0, 0xc98a52); M.add(GEO.cyl, x, .03, z, .3, .06, .3, 0, 0, 0, 0xc98a52); M.add(GEO.sph, x, 1.3, z, .22, .22, .22, 0, 0, 0, 0xfff1d6); }
    M.add(GEO.box, 7.8, 1.1, 6.3, .14, 2, 1.1, 0, -.4, 0, 0xc98a52); M.add(GEO.box, 7.86, 1.1, 6.3, .06, 1.8, .9, 0, -.4, 0, 0xd8f1ff);
    world.add(meshOf(M));
    for(const [k, x, z] of [['top', 16.2, 6.2], ['crown', 17.4, 5]]){ const h = new THREE.Mesh(PM.hatGeo(k), MAT); h.scale.setScalar(.26); h.position.set(x, 1.48, z); h.castShadow = true; world.add(h); }
    CIRCLES.push({ x:16.2, z:6.2, r:.35 }, { x:17.4, z:5, r:.35 }, { x:7.8, z:6.3, r:.6 });
  }
  { // ice-cream stand: cart, umbrella (one colour), a giant cone
    const M = new Merge(), cx = SPOTS.icecream.cx, cz = SPOTS.icecream.cz;
    M.add(GEO.box, cx, .85, cz, 1.6, 1, 2.4, 0, 0, 0, 0xffffff); M.add(GEO.box, cx, 1.38, cz, 1.75, .1, 2.55, 0, 0, 0, 0xffb3c7);
    for(const s of [-1, 1]) M.add(GEO.cyl, cx + s * .82, .38, cz - .6, .36, .1, .36, 0, 0, Math.PI / 2, 0x6a5a8a);
    M.add(GEO.cyl8, cx, 2.3, cz, .05, 1.9, .05, 0, 0, 0, 0xdedede); M.add(GEO.cone, cx, 3.35, cz, 1.6, .6, 1.6, 0, 0, 0, 0xffb3c7); M.add(GEO.sm, cx, 3.7, cz, .12, .12, .12, 0, 0, 0, 0xffffff);
    M.add(GEO.cone, cx, 1.95, cz + .6, .26, .7, .26, Math.PI, 0, 0, 0xf2c27a); M.add(GEO.sph, cx, 2.42, cz + .6, .3, .28, .3, 0, 0, 0, 0xff9fc0); M.add(GEO.sph, cx, 2.7, cz + .6, .24, .22, .24, 0, 0, 0, 0xfff1d6);
    for(let i = 0; i < 3; i++) M.add(GEO.sph, cx - .82, 1.55, cz - .7 + i * .7, .2, .18, .2, 0, 0, 0, [0xff9fc0, 0xfff1d6, 0xa5e3c0][i]);
    world.add(meshOf(M));
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .6), new THREE.MeshBasicMaterial({ map:signTex(L('بوظة', 'Ice cream', 'Dondurma'), '#ff8fb1', '#fff', coneIcon), transparent:true, side:THREE.DoubleSide }));
    sg.position.set(cx - .83, .9, cz); sg.rotation.y = -Math.PI / 2; world.add(sg);
    BOXES.push({ x0:cx - .85, z0:cz - 1.25, x1:cx + .85, z1:cz + 1.25 });
  }
  { // pond with stones, lily pads, reeds and a tiny dock
    const S = SPOTS.pond, M = new Merge();
    for(let i = 0; i < 26; i++){ const a = i / 26 * Math.PI * 2; M.add(GEO.dode, S.x + Math.cos(a) * (S.pr + .25), .12, S.z + Math.sin(a) * (S.pr + .25), .45 + srnd() * .2, .25, .4, srnd(), srnd() * 3, 0, i % 2 ? 0xd8d2c4 : 0xc8c0b0); }
    M.add(GEO.cyl, S.x, .02, S.z, S.pr + .1, .04, S.pr + .1, 0, 0, 0, 0x6aa8c8);
    for(const [dx, dz] of [[1.5, 1], [-2, -.5], [.5, -2.2], [-1, 2.4]]){ M.add(GEO.cyl, S.x + dx, .1, S.z + dz, .45, .03, .45, 0, 0, 0, 0x5cb85a); }
    M.add(GEO.sm, S.x - 1, .16, S.z + 2.4, .12, .1, .12, 0, 0, 0, 0xff8fb1);
    for(let i = 0; i < 14; i++){ const a = 3.6 + i * .12, r = S.pr + .4 + (i % 3) * .2; M.add(GEO.cyl8, S.x + Math.cos(a) * r, .55, S.z + Math.sin(a) * r, .03, 1.1 + (i % 3) * .25, .03, 0, 0, (i % 2 - .5) * .2, 0x5a9e46); if(i % 3 === 0) M.add(GEO.cyl8, S.x + Math.cos(a) * r, 1.1 + (i % 3) * .12, S.z + Math.sin(a) * r, .07, .3, .07, 0, 0, 0, 0x9a6b3c); }
    world.add(meshOf(M));
    pondTex = canvasTex(256, 256, x => { x.fillStyle = '#62c3f0'; x.fillRect(0, 0, 256, 256); x.strokeStyle = 'rgba(255,255,255,.45)'; x.lineWidth = 3; for(let i = 0; i < 18; i++){ x.beginPath(); const cx = (i * 71) % 256, cy = (i * 113) % 256; x.arc(cx, cy, 10 + (i % 4) * 6, .2, 2.2); x.stroke(); } });
    pondTex.wrapS = pondTex.wrapT = THREE.RepeatWrapping; pondTex.repeat.set(2, 2);
    const wm = new THREE.Mesh(new THREE.CircleGeometry(S.pr, 40), new THREE.MeshStandardMaterial({ map:pondTex, roughness:.15, metalness:.05, transparent:true, opacity:.92 }));
    wm.rotation.x = -Math.PI / 2; wm.position.set(S.x, .08, S.z); wm.receiveShadow = true; world.add(wm);
    CIRCLES.push({ x:S.x, z:S.z, r:S.pr - .3 });
  }
  { // fountain on the plaza
    const M = new Merge();
    M.add(GEO.cyl, 0, .35, 10, 2.3, .7, 2.3, 0, 0, 0, 0xe9dcc6); M.add(GEO.torus, 0, .7, 10, 2.25, 2.25, 1.2, Math.PI / 2, 0, 0, 0xf6ecdc);
    M.add(GEO.cyl, 0, 1.2, 10, .3, 1.6, .3, 0, 0, 0, 0xf6ecdc); M.add(GEO.cyl, 0, 1.95, 10, .9, .2, .9, 0, 0, 0, 0xe9dcc6); M.add(GEO.sph, 0, 2.3, 10, .3, .3, .3, 0, 0, 0, 0xf6ecdc);
    world.add(meshOf(M));
    fountainWater = new THREE.Mesh(new THREE.CircleGeometry(2.1, 32), new THREE.MeshStandardMaterial({ map:pondTex, roughness:.15, transparent:true, opacity:.9 }));
    fountainWater.rotation.x = -Math.PI / 2; fountainWater.position.set(0, .62, 10); world.add(fountainWater);
    CIRCLES.push({ x:0, z:10, r:2.35 });
  }
  { // playground: slide, swings, seesaw, sandbox (bright single colours)
    const M = new Merge(), px = SPOTS.playground.x, pz = SPOTS.playground.z;
    const sx = px - 3.4, sz = pz + 1.2;
    for(const [dx, dz] of [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]]) M.add(GEO.cyl8, sx + dx, 1, sz + dz, .07, 2, .07, 0, 0, 0, 0x3f8ef0);
    M.add(GEO.box, sx, 2, sz, 1.2, .12, 1.2, 0, 0, 0, 0xffc23d); M.add(GEO.cone4, sx, 2.7, sz, .95, .8, .95, 0, Math.PI / 4, 0, 0xff6f6f);
    M.add(GEO.box, sx + 1.75, 1.05, sz, .9, .08, 3, 0, Math.PI / 2, .58, 0xff6f6f);
    for(let i = 0; i < 5; i++) M.add(GEO.box, sx - .62, .3 + i * .38, sz, .08, .06, .9, 0, 0, 0, 0x3f8ef0);
    const wx = px + 3.2, wz = pz + 1;
    for(const s of [-1, 1]){ M.add(GEO.cyl8, wx + s * 1.6, 1.2, wz - .5, .07, 2.6, .07, -.2, 0, 0, 0x5ed6a0); M.add(GEO.cyl8, wx + s * 1.6, 1.2, wz + .5, .07, 2.6, .07, .2, 0, 0, 0x5ed6a0); }
    M.add(GEO.cyl8, wx, 2.45, wz, .07, 3.4, .07, 0, 0, Math.PI / 2, 0x5ed6a0);
    for(const s of [-.7, .7]){ M.add(GEO.cyl8, wx + s - .22, 1.6, wz, .015, 1.7, .015, 0, 0, 0, 0x777777); M.add(GEO.cyl8, wx + s + .22, 1.6, wz, .015, 1.7, .015, 0, 0, 0, 0x777777); M.add(GEO.box, wx + s, .72, wz, .6, .06, .3, 0, 0, 0, 0xffc23d); }
    M.add(GEO.box, px, .45, pz - 2.4, 3.2, .1, .4, 0, 0, .18, 0xb99cff); M.add(GEO.cone4, px, .22, pz - 2.4, .3, .45, .3, 0, Math.PI / 4, 0, 0x9b7bff);
    M.add(GEO.box, px, .12, pz + 4.4, 3, .24, 2, 0, 0, 0, 0xd9a46a); M.add(GEO.box, px, .2, pz + 4.4, 2.6, .1, 1.6, 0, 0, 0, 0xffe7a8);
    M.add(GEO.sph, px - .6, .3, pz + 4.4, .3, .2, .3, 0, 0, 0, 0xffe7a8); M.add(GEO.cone, px + .6, .4, pz + 4.6, .14, .3, .14, Math.PI, 0, 0, 0xff8fb1);
    world.add(meshOf(M));
    CIRCLES.push({ x:sx, z:sz, r:.95 }, { x:wx - 1.6, z:wz, r:.5 }, { x:wx + 1.6, z:wz, r:.5 });
    BOXES.push({ x0:px - 1.5, z0:pz + 3.4, x1:px + 1.5, z1:pz + 5.4 });
  }
  { // park: benches, lamp posts, picnic blanket
    const M = new Merge(), px = SPOTS.park.x, pz = SPOTS.park.z;
    const bench = (x, z, ry) => { M.add(GEO.box, x, .45, z, 1.8, .1, .5, 0, ry, 0, 0xc98a52); M.add(GEO.box, x - Math.cos(ry) * 0, .8, z - Math.sin(ry) * 0 - .22 * Math.cos(ry), 1.8, .4, .08, 0, ry, 0, 0xc98a52);
      for(const s of [-1, 1]) M.add(GEO.box, x + s * .75 * Math.cos(ry), .22, z - s * .75 * Math.sin(ry), .1, .44, .5, 0, ry, 0, 0x6a5a8a); CIRCLES.push({ x, z, r:.7 }); };
    bench(px + 3, pz - 4.6, 0); bench(px - 4.5, pz + 2, Math.PI / 2);
    M.add(GEO.box, px + 1, .04, pz + 1.5, 2.6, .04, 2, 0, .3, 0, 0x7fc8ff);
    M.add(GEO.cyl, px + .6, .14, pz + 1.3, .3, .2, .25, 0, 0, 0, 0xc98a52);
    for(const [x, z] of [[px + 6.5, pz - 2], [px - 2, pz - 6.5], [px - 5, pz + 6], [-6, -6], [6, -6], [-8, 14], [8, 14], [4, 22], [-4, 22]]){ M.add(GEO.cyl8, x, 1.5, z, .08, 3, .08, 0, 0, 0, 0x4a4a5a); M.add(GEO.sph, x, 3.1, z, .28, .28, .28, 0, 0, 0, 0xfff4c8); CIRCLES.push({ x, z, r:.25 }); }
    world.add(meshOf(M));
  }
  /* trees: instanced trunks and crowns (park, garden, the ring around town) */
  const T = [];
  const tree = (x, z, s = 1) => { T.push([x, z, s]); if(Math.hypot(x, z) < BOUND + 2) CIRCLES.push({ x, z, r:.55 * s }); };
  for(const [x, z] of [[-27, 13], [-29, 21], [-24, 26.5], [-16.5, 23], [-18, 12.5], [-28, 17]]) tree(x, z, 1.1 + srnd() * .3);
  for(const [x, z] of [[-10.5, -29.5], [10.5, -29.5], [-10.8, -19], [10.8, -14.5]]) tree(x, z, .9);
  for(const [x, z] of [[-18, -4], [18, -4], [-24, -14], [24, -12], [26, 8], [-26, 4], [15, 30], [-14, 32], [28, 28], [30, 14], [17, -22], [-19, -24], [-6, 38], [8, 37]]) tree(x, z, 1 + srnd() * .4);
  for(let i = 0; i < 64; i++){ const a = i / 64 * Math.PI * 2 + srnd() * .05, r = 43 + srnd() * 9; tree(Math.cos(a) * r, Math.sin(a) * r, 1.2 + srnd() * .7); }
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(.16, .24, 1.6, 7), new THREE.MeshStandardMaterial({ color:0x9a6b3c, roughness:.9 }), T.length);
  const crownG = new THREE.IcosahedronGeometry(1.15, 1);
  const crown = new THREE.InstancedMesh(crownG, new THREE.MeshStandardMaterial({ roughness:.8, flatShading:true }), T.length * 2);
  T.forEach(([x, z, s], i) => {
    _m.compose(_v.set(x, .8 * s, z), _q.identity(), _s.set(s, s, s)); trunk.setMatrixAt(i, _m);
    _m.compose(_v.set(x, 2.25 * s, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(s, s * .95, s)); crown.setMatrixAt(i * 2, _m); crown.setColorAt(i * 2, _c.set(i % 3 ? 0x5cbf54 : 0x4fae4a));
    _m.compose(_v.set(x + .3 * s, 3.05 * s, z - .2 * s), _q.identity(), _s.set(s * .62, s * .6, s * .62)); crown.setMatrixAt(i * 2 + 1, _m); crown.setColorAt(i * 2 + 1, _c.set(0x7ad46a));
  });
  trunk.castShadow = crown.castShadow = true; world.add(trunk, crown);
  /* bushes along the fence and around the plaza (instanced) */
  const BU = [];
  for(let i = 0; i < 12; i++) BU.push([-11.4 + (i % 2) * .3, -30 + i * 1.5]);
  for(let i = 0; i < 12; i++) BU.push([11.4 - (i % 2) * .3, -30 + i * 1.5]);
  for(let i = 0; i < 20; i++){ const a = i / 20 * Math.PI * 2; if(Math.abs(Math.sin(a)) < .35 || Math.cos(a) > .9 || Math.cos(a) < -.9) continue; BU.push([Math.cos(a) * 7.6, 10 + Math.sin(a) * 7.6]); }
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.6, 1), new THREE.MeshStandardMaterial({ color:0x58b84e, roughness:.85, flatShading:true }), BU.length);
  BU.forEach(([x, z], i) => { _m.compose(_v.set(x, .4, z), _q.setFromEuler(_e.set(0, i, 0)), _s.set(1, .75, 1)); bush.setMatrixAt(i, _m); });
  bush.castShadow = true; world.add(bush);
  /* soft hills far away */
  const HL = new Merge();
  for(let i = 0; i < 14; i++){ const a = i / 14 * Math.PI * 2, r = 90 + srnd() * 20; HL.add(GEO.sph, Math.cos(a) * r, -4, Math.sin(a) * r, 22 + srnd() * 14, 12 + srnd() * 10, 18, 0, a, 0, i % 2 ? 0x9fd88a : 0x8ccf7a); }
  world.add(meshOf(HL, false, false));
  /* guide: a bouncing arrow over the place to go, and a ring on the ground */
  const GA = new Merge(); GA.add(GEO.cone, 0, 0, 0, .45, .7, .45, Math.PI, 0, 0, 0xffc23d); GA.add(GEO.cyl, 0, .55, 0, .18, .6, .18, 0, 0, 0, 0xffc23d);
  guideArrow = new THREE.Mesh(GA.geometry(), new THREE.MeshBasicMaterial({ vertexColors:true })); guideArrow.visible = false; world.add(guideArrow);
  guideRing = new THREE.Mesh(new THREE.RingGeometry(.8, 1.05, 32), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false }));
  guideRing.rotation.x = -Math.PI / 2; guideRing.visible = false; world.add(guideRing);
  /* placement grid over the house floor (edit mode) */
  const gt = canvasTex(64, 64, x => { x.strokeStyle = 'rgba(255,255,255,.85)'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, 61, 61); });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(CX, CZ);
  gridMesh = new THREE.Mesh(new THREE.PlaneGeometry(CX, CZ), new THREE.MeshBasicMaterial({ map:gt, transparent:true, depthWrite:false }));
  gridMesh.rotation.x = -Math.PI / 2; gridMesh.position.set(0, .09, -22); gridMesh.visible = false; world.add(gridMesh);
}

/* ---------- collisions: circles, boxes, wall/fence segments, solid furniture, the edge of town ---------- */
let FBOX = [];
function collide(o, r){
  const d = Math.hypot(o.x, o.z); if(d > BOUND){ o.x *= BOUND / d; o.z *= BOUND / d; }
  for(const c of CIRCLES){ const dx = o.x - c.x, dz = o.z - c.z, m = c.r + r, q = dx * dx + dz * dz; if(q < m * m && q > 1e-6){ const s = Math.sqrt(q); o.x = c.x + dx / s * m; o.z = c.z + dz / s * m; } }
  for(const b of BOXES.concat(FBOX)){
    const cx = clamp(o.x, b.x0, b.x1), cz = clamp(o.z, b.z0, b.z1), dx = o.x - cx, dz = o.z - cz, q = dx * dx + dz * dz;
    if(q < r * r){ if(q > 1e-6){ const s = Math.sqrt(q); o.x = cx + dx / s * r; o.z = cz + dz / s * r; } else { const l = o.x - b.x0, rr = b.x1 - o.x, t = o.z - b.z0, bt = b.z1 - o.z, mn = Math.min(l, rr, t, bt); if(mn === l) o.x = b.x0 - r; else if(mn === rr) o.x = b.x1 + r; else if(mn === t) o.z = b.z0 - r; else o.z = b.z1 + r; } }
  }
  for(const s of SEGS){
    const vx = s.x2 - s.x1, vz = s.z2 - s.z1, L2 = vx * vx + vz * vz, t = clamp(((o.x - s.x1) * vx + (o.z - s.z1) * vz) / L2, 0, 1);
    const px = s.x1 + vx * t, pz = s.z1 + vz * t, dx = o.x - px, dz = o.z - pz, q = dx * dx + dz * dz, m = r + s.t;
    if(q < m * m && q > 1e-6){ const k = Math.sqrt(q); o.x = px + dx / k * m; o.z = pz + dz / k * m; }
  }
}

/* ======================================================================
   House furniture (own house, or the room owner's house while visiting)
   ====================================================================== */
const furnGrp = new THREE.Group(); world.add(furnGrp);
const SOLID = new Set(['sofa', 'table', 'shelf', 'tub', 'toybox', 'scratch', 'plant', 'bigplant', 'lamp']);
let visiting = null;               // the host's furniture list while visiting a friend's house
const houseList = () => visiting || SAVE.furn;
const isOwnHouse = () => !visiting;
let held = null;                   // edit mode: the item in hand { k, ix, iz, r, from }
function rebuildFurn(){
  while(furnGrp.children.length) furnGrp.remove(furnGrp.children[0]);
  FBOX = [];
  houseList().forEach((it, i) => {
    const m = PM.buildFurn(it.k), c = fcenter(it);
    m.position.set(c.x, .07, c.z); m.rotation.y = it.r * Math.PI / 2; m.userData.idx = i; furnGrp.add(m);
    if(SOLID.has(it.k)){ const sh = Math.max(c.w, c.d) <= 1 ? .22 : .12; FBOX.push({ x0:c.x - c.w / 2 + sh, z0:c.z - c.d / 2 + sh, x1:c.x + c.w / 2 - sh, z1:c.z + c.d / 2 - sh }); }
  });
}
function cellsOf(it){ const [w, d] = fdim(it.k, it.r), out = []; for(let x = 0; x < w; x++) for(let z = 0; z < d; z++) out.push([it.ix + x, it.iz + z]); return out; }
function canPlace(it, list){
  const [w, d] = fdim(it.k, it.r);
  if(it.ix < 0 || it.iz < 0 || it.ix + w > CX || it.iz + d > CZ) return false;
  const room = roomOfCell(it.ix, it.iz), rug = !!FURN[it.k].rug;
  const mine = cellsOf(it);
  for(const [x, z] of mine){
    if(roomOfCell(x, z) !== room) return false;
    if(x >= NEST.ix && x < NEST.ix + 2 && z >= NEST.iz && z < NEST.iz + 2) return false;
    if(!rug && DOOR_CELLS.has(x + ',' + z)) return false;
  }
  const set = new Set(mine.map(c => c + ''));
  for(const o of list){ if(!!FURN[o.k].rug !== rug) continue; for(const c of cellsOf(o)) if(set.has(c + '')) return false; }
  return true;
}
/* find a free spot for a new item (centre of the living room first) */
function freeSpot(k){
  for(const [x0, z0] of [[4, 6], [3, 4], [6, 5], [12, 3], [13, 8]]) for(let r = 0; r < 6; r++) for(let dx = -r; dx <= r; dx++) for(let dz = -r; dz <= r; dz++){
    const it = { k, ix:x0 + dx, iz:z0 + dz, r:0 }; if(canPlace(it, SAVE.furn)) return it;
  }
  return { k, ix:4, iz:6, r:0 };
}

/* ======================================================================
   The player, pets (following / at home / friends')
   ====================================================================== */
const P = { x:SPAWN_IN.x, z:SPAWN_IN.z, vx:0, vz:0, face:SPAWN_IN.f, move:0, trail:[] };
let heroM = null, T = 0;
function shadowAll(g){ g.traverse(o => { if(o.isMesh) o.castShadow = true; }); }
function setHero(id){
  heroId = HEROES[id] ? id : 'sara';
  if(heroM) scene.remove(heroM.grp);
  heroM = HEROES[heroId](); shadowAll(heroM.grp); scene.add(heroM.grp);
}
function pushTrail(tr, x, z){ const l = tr[tr.length - 1]; if(!l || Math.hypot(l.x - x, l.z - z) > .25){ tr.push({ x, z }); if(tr.length > 60) tr.shift(); } }
function trailTarget(tr, lx, lz, back){
  let px = lx, pz = lz, acc = 0;
  for(let i = tr.length - 1; i >= 0; i--){ const q = tr[i], d = Math.hypot(q.x - px, q.z - pz); if(acc + d >= back && d > 0){ const t = (back - acc) / d; return { x:px + (q.x - px) * t, z:pz + (q.z - pz) * t }; } acc += d; px = q.x; pz = q.z; }
  return { x:px, z:pz };
}
const floorY = (x, z) => inHouse(x, z) ? .07 : 0;
function makeRt(d, x, z){ const M = PM.buildPet(d.sp, d.st, d.hat); scene.add(M.grp); return { d, M, x, z, y:0, f:0, move:0, mode:'idle', task:null, happyT:0, t:Math.random() * 9, wander:null, idleT:0 }; }
function dropRt(rt){ if(rt) PM.disposePet(rt.M); }
function rtRebuild(rt){ PM.disposePet(rt.M); rt.M = PM.buildPet(rt.d.sp, rt.d.st, rt.d.hat); scene.add(rt.M.grp); }
let pet = null;                          // the pet following you
const homePets = [];                     // your other pets, wandering at home
function syncPets(){
  const d = activeData();
  if(pet && (!d || pet.d.uid !== d.uid)){ dropRt(pet); pet = null; }
  if(d && !pet){ const t = trailTarget(P.trail, P.x, P.z, 1.3); pet = makeRt(d, t.x, t.z + .01); pet.f = P.face; }
  if(pet && (pet.M.st !== pet.d.st || pet.M.hatKind !== (pet.d.hat || null) || pet.M.sp !== pet.d.sp)) rtRebuild(pet);
  const want = visiting ? [] : SAVE.team.filter(p => p.uid !== SAVE.active);
  for(let i = homePets.length - 1; i >= 0; i--){ const h = homePets[i]; if(!want.includes(h.d)){ dropRt(h); homePets.splice(i, 1); } else if(h.M.st !== h.d.st || h.M.hatKind !== (h.d.hat || null)) rtRebuild(h); }
  for(const d2 of want) if(!homePets.some(h => h.d === d2)){ const h = makeRt(d2, -6 + homePets.length * 1.5, -21); homePets.push(h); }
}
/* move a pet toward (tx,tz); returns distance left */
function stepToward(rt, tx, tz, dt, speed){
  const dx = tx - rt.x, dz = tz - rt.z, d = Math.hypot(dx, dz);
  if(d > .12){ const v = Math.min(speed, d * 5); rt.x += dx / d * v * dt; rt.z += dz / d * v * dt; rt.move = lerp(rt.move, clamp(v / 5, 0, 1), Math.min(1, dt * 10)); rt.f += angDiff(Math.atan2(dx, dz), rt.f) * Math.min(1, dt * 10); }
  else rt.move = lerp(rt.move, 0, Math.min(1, dt * 8));
  return d;
}
function followLeader(rt, trail, lx, lz, lf, dt){
  const tg = trailTarget(trail, lx, lz, 1.25 + rt.M.r);
  if(Math.hypot(rt.x - lx, rt.z - lz) > 14){ rt.x = tg.x; rt.z = tg.z; burst(rt.x, .5, rt.z, 14, [0xffffff, 0xffc23d], 3, .8); }
  const d = stepToward(rt, tg.x, tg.z, dt, 7.5);
  if(d < .3 && rt.move < .2){ rt.f += angDiff(Math.atan2(lx - rt.x, lz - rt.z), rt.f) * Math.min(1, dt * 3); }
  rt.mode = rt.happyT > 0 ? 'happy' : 'idle';
}
function poseRt(rt, dt){
  rt.t += dt; if(rt.happyT > 0) rt.happyT -= dt;
  const mode = rt.task && rt.task.phase === 'do' ? rt.task.anim : rt.happyT > 0 ? 'happy' : rt.mode;
  rt.M.grp.position.set(rt.x, (rt.y || floorY(rt.x, rt.z)), rt.z); rt.M.grp.rotation.y = rt.f;
  if(mode === 'play' && rt.task) rt.M.grp.rotation.y = rt.f + rt.t * 4;
  PM.posePet(rt.M, { t:rt.t, dt, move:mode === 'walk' || mode === 'idle' || mode === 'happy' ? rt.move : 0, mode:mode === 'walk' ? 'idle' : mode });
}
function homeStep(h, dt){
  h.idleT -= dt;
  if(!h.wander || h.idleT < -6){ h.wander = { x:-8 + Math.random() * 8, z:-24 + Math.random() * 7 }; h.idleT = 2 + Math.random() * 4; h.mode = 'idle'; }
  if(h.idleT > 0){ h.move = lerp(h.move, 0, dt * 6); h.mode = h.idleT > 3.5 ? 'sit' : 'idle'; return; }
  if(stepToward(h, h.wander.x, h.wander.z, dt, 2.2) < .2) h.wander = null;
  h.mode = 'idle';
}
function petTap(rt){
  if(!rt) return;
  rt.happyT = 1.4; SFX.heart(); floatIcon('heart', rt.x, (rt.y || floorY(rt.x, rt.z)) + rt.M.h + .2, rt.z, 4, .4);
  if(rt === pet && mpActive()) mpSend('fx', { k:'heart' });
}

/* ======================================================================
   Camera and input
   ====================================================================== */
const cam = { yaw:0, pitch:.62, dist:9, tx:P.x, tz:P.z, ty:1, auto:null };
let snapCam = true, wasInside = true, editView = false, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(closeup){
    camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  if(editView){
    camPos.lerp(_v.set(0, 21, -12.5), 1 - Math.exp(-5 * dt)); camLook.lerp(_s.set(0, 0, -22.3), 1 - Math.exp(-6 * dt));
    camera.position.copy(camPos); camera.lookAt(camLook); return;
  }
  const inside = inHouse(P.x, P.z, -.4);
  if(inside !== wasInside){ wasInside = inside; if(look.id == null) cam.auto = inside ? 0 : Math.PI; }
  if(cam.auto != null){ const dd = angDiff(cam.auto, cam.yaw); cam.yaw += dd * Math.min(1, dt * 2.5); if(Math.abs(dd) < .02) cam.auto = null; }
  const wantPitch = inside ? .92 : .58, wantDist = inside ? 10.5 : 9;
  cam.pitch = lerp(cam.pitch, clamp(wantPitch + cam.pAdj, .3, 1.2), Math.min(1, dt * 3)); cam.dist = lerp(cam.dist, wantDist, Math.min(1, dt * 3));
  const k = snapCam ? 1 : 1 - Math.exp(-8 * dt);
  cam.tx = lerp(cam.tx, P.x, k); cam.tz = lerp(cam.tz, P.z, k);
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  _v.set(cam.tx + dx * cam.dist, 1 + dy * cam.dist, cam.tz + dz * cam.dist);
  if(snapCam){ camPos.copy(_v); camLook.set(cam.tx, 1, cam.tz); snapCam = false; } else { camPos.lerp(_v, 1 - Math.exp(-10 * dt)); camLook.set(cam.tx, 1, cam.tz); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
cam.pAdj = 0;
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), touch = $('#touch');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state === 'hatch'){ hatchTap(); return; }
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.35, .35); cam.auto = null; look.x = p.x; look.y = p.y; }
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
actBtn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); actBtn.classList.add('on'); doAction(); });
['pointerup', 'pointercancel', 'pointerleave'].forEach(t => actBtn.addEventListener(t, () => actBtn.classList.remove('on')));
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat){ doAction(); e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'hatch' && !e.repeat){ hatchTap(); e.preventDefault(); }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -.07);
function rayAt(x, y){ ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera); return ray; }
function tapAt(x, y){
  const r = rayAt(x, y);
  if(state === 'edit'){ editTap(r); return; }
  if(state !== 'play') return;
  const cands = [pet, ...homePets, ...remotes().map(a => a.pet)].filter(Boolean);
  let best = null, bd = 1e9;
  for(const rt of cands){
    const hits = r.intersectObject(rt.M.grp, true);
    if(hits.length && hits[0].distance < bd){ bd = hits[0].distance; best = rt; }
    else { _v.set(rt.x, floorY(rt.x, rt.z) + rt.M.h * .5, rt.z); const dd = r.ray.distanceToPoint(_v); if(dd < .55 + rt.M.r * .5){ const dist = camera.position.distanceTo(_v); if(dist < bd){ bd = dist; best = rt; } } }
  }
  if(best) petTap(best);
}
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}
const SPEED = 5.4;
function stepPlayer(dt){
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 14 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 14 * dt);
  P.x += P.vx * dt; P.z += P.vz * dt; collide(P, .42);
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
  pushTrail(P.trail, P.x, P.z);
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
  hi:   L('أهلا حبيبي! أنا العمة ليلى 👵 جبتلك بيضة هدية 🥚', "Hello sweetie! I'm Aunt Laila 👵 I brought you an egg 🥚", 'Merhaba tatlım! Ben Leyla Teyze 👵 Sana bir yumurta getirdim 🥚'),
  nest: L('روح عالعش 🪺 بالصالون، وكبوس على الزر الكبير', 'Go to the nest 🪺 in the living room and press the big button', 'Oturma odasındaki yuvaya 🪺 git ve büyük düğmeye bas'),
  born: L('شوف شو حلو! صار عندك صاحب جديد 🐾', 'How cute! You have a new friend 🐾', 'Ne tatlı! Yeni bir arkadaşın var 🐾'),
  need: L('شايف الفقاعة فوق راسه؟ هيك بيقلّك شو بدّو. اتبع السهم الأصفر ⬇️', 'See the bubble over its head? That is what it wants. Follow the yellow arrow ⬇️', 'Başının üstündeki baloncuğu görüyor musun? Ne istediğini söylüyor. Sarı oku takip et ⬇️'),
  stars:L('برافو! أخدت نجمات ⭐ فيهن بتشتري أغراض وبيض', 'Well done! You got stars ⭐ — use them for furniture and eggs', 'Aferin! Yıldız ⭐ kazandın — eşya ve yumurta alabilirsin'),
  town: L('اطلع من الباب 🚪 عالبلد: في حديقة وبحيرة وملعب ومحل حيوانات!', 'Go out the door 🚪 to town: a park, a pond, a playground and a pet shop!', 'Kapıdan 🚪 kasabaya çık: park, gölet, oyun parkı ve pet shop var!'),
  grow: L('كبر! كل ما تهتم فيه بيكبر أكتر 🌟', "It grew! The more you care, the bigger it gets 🌟", 'Büyüdü! Ne kadar ilgilenirsen o kadar büyür 🌟'),
  back: L('أهلا فيك من جديد! 🐾', 'Welcome back! 🐾', 'Tekrar hoş geldin! 🐾')
};

/* ======================================================================
   Needs: bubbles, tasks at house items and town spots, rewards, growing
   ====================================================================== */
let walkProg = 0;
function addNeed(d, k){
  const opts = NEED_IDS.filter(n => !d.needs.includes(n));
  if(!opts.length) return;
  k = k && opts.includes(k) ? k : pick(opts);
  d.needs.push(k); d.nt = 22 + Math.random() * 26; SFX.need(); hudKey = '';
}
function tickNeeds(dt){
  const d = pet && pet.d; if(!d || pet.task) return;
  if(d.needs.length < 2){ d.nt -= dt; if(d.nt <= 0) addNeed(d); }
}
function fulfil(need){
  const d = pet.d; if(!d.needs.includes(need)) return;
  d.needs = d.needs.filter(n => n !== need);
  const st = starReward(d); SAVE.stars += st; d.xp += XP_NEED; SAVE.cared = (SAVE.cared || 0) + 1;
  if(!d.needs.length) d.nt = Math.min(d.nt, 10 + Math.random() * 10);
  const y = floorY(pet.x, pet.z) + pet.M.h;
  pop('+' + N(st) + ' ⭐'); floatIcon('star', pet.x, y + .3, pet.z, 3, .5); floatIcon('heart', pet.x, y + .2, pet.z, 2, .35);
  burst(pet.x, y, pet.z, 18, CONFETTI, 3.5, .9); SFX.star(); pet.happyT = 1.2;
  if(mpActive()) mpSend('fx', { k:'need' });
  hudKey = '';
  const grew = checkGrow(d);
  persist();
  if(SAVE.tut === 2 && !grew){ SAVE.tut = 3; persist(); say(LINES.stars, 4500); setTimeout(() => { if(state === 'play') say(LINES.town, 5500); }, 5200); }
}
function checkGrow(d){
  const ns = stageOf(d.xp);
  if(ns <= d.st) return false;
  d.st = ns; persist();
  setTimeout(() => {
    syncPets(); SFX.grow();
    if(pet){ const y = floorY(pet.x, pet.z); burst(pet.x, y + .6, pet.z, 50, CONFETTI, 5, 1.2); pet.happyT = 2.5; }
    try{ if(window.World) World.addCoins(5, L('من حيوانات بوبو', 'from Bobo Pets', 'Bobo Hayvanları\'ndan')); }catch(e){}
    if(mpActive()) mpTrack();
    setTimeout(() => growCard(d), 900);
  }, 300);
  return true;
}
function growCard(d){
  if(state !== 'play') return;
  if(SAVE.tut === 2){ SAVE.tut = 3; persist(); }
  openCard(false);
  card.innerHTML = `<div class="bigstar">🌟</div><h2>${L('كبر!', 'It grew!', 'Büyüdü!')} ${SPECIES[d.sp].e}</h2>
    <img class="portrait" src="${portrait(d)}" alt="" style="--rc:${RAR[SPECIES[d.sp].rar].col}">
    <p>${petName(d.sp)} · ${STAGES[d.st]}</p>
    <button class="big-btn" id="bOk">🎉 ${L('يا سلام!', 'Hooray!', 'Yaşasın!')}</button>`;
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); say(LINES.grow, 3500); };
}
/* where to stand for a need at an item or spot */
function startTask(need, c){
  if(!pet || pet.task) return;
  const N0 = NEEDS[need]; let x, z, y = 0, fx, fz;
  if(c.it){
    const cc = c.c; fx = cc.x; fz = cc.z;
    if(need === 'sleepy' || need === 'dirty'){ x = cc.x; z = cc.z; y = need === 'dirty' ? .38 : .2; fx = P.x; fz = P.z; }
    else { const dx = P.x - cc.x, dz = P.z - cc.z, dd = Math.hypot(dx, dz) || 1; x = cc.x + dx / dd * .6; z = cc.z + dz / dd * .6; }
  } else if(c.spot === 'pond'){
    const S = SPOTS.pond, dx = P.x - S.x, dz = P.z - S.z, dd = Math.hypot(dx, dz) || 1; x = S.x + dx / dd * (S.pr + .15); z = S.z + dz / dd * (S.pr + .15); fx = S.x; fz = S.z;
  } else if(c.spot === 'icecream'){ x = P.x + Math.sin(P.face + 1) * .9; z = P.z + Math.cos(P.face + 1) * .9; fx = P.x; fz = P.z; }
  else { const a = Math.random() * 6.28; x = P.x + Math.sin(a) * 1.3; z = P.z + Math.cos(a) * 1.3; fx = P.x; fz = P.z; }
  pet.task = { need, anim:N0.anim, dur:N0.dur, x, z, y, fx, fz, t:0, go:0, phase:'go', fxT:0 };
  hudKey = '';
}
function stepTask(dt){
  const tk = pet.task;
  if(tk.phase === 'go'){
    tk.go += dt;
    if(stepToward(pet, tk.x, tk.z, dt, 6.5) < .15 || tk.go > 3){
      pet.x = tk.x; pet.z = tk.z; tk.phase = 'do'; pet.move = 0;
      if(tk.y) pet.y = floorY(tk.x, tk.z) + tk.y;
      ({ eat:SFX.eat, drink:SFX.splash, sleep:SFX.sleep, bath:SFX.splash, play:SFX.boing }[tk.anim] || SFX.tap)();
    }
    return;
  }
  tk.t += dt; tk.fxT -= dt;
  if(tk.anim !== 'play') pet.f += angDiff(Math.atan2(tk.fx - pet.x, tk.fz - pet.z), pet.f) * Math.min(1, dt * 6);
  const y = (pet.y || floorY(pet.x, pet.z)) + pet.M.h;
  if(tk.fxT <= 0){
    tk.fxT = { sleep:.8, bath:.25, play:.45, eat:.4, drink:.4 }[tk.anim] || .5;
    if(tk.anim === 'sleep') floatIcon('z', pet.x + .2, y, pet.z, 1, .4);
    else if(tk.anim === 'bath') floatIcon('bub', pet.x, y - .1, pet.z, 2, .35);
    else if(tk.anim === 'play') floatIcon('note', pet.x, y, pet.z, 1, .35);
    else if(tk.anim === 'eat') burst(pet.x + Math.sin(pet.f) * .3, y * .5, pet.z + Math.cos(pet.f) * .3, 4, [0xc9803f, 0xff6b5e], 1.2, .5);
    else if(tk.anim === 'drink') burst(pet.x + Math.sin(pet.f) * .35, .15, pet.z + Math.cos(pet.f) * .35, 4, [0x8fd8ff, 0xffffff], 1.2, .5);
  }
  if(tk.t >= tk.dur){ pet.task = null; pet.y = 0; fulfil(tk.need); }
}

/* ---------- what the action button does right now ---------- */
let ctxNow = null;
function context(){
  if(state !== 'play') return null;
  if(pet && pet.task) return null;
  const d = pet && pet.d;
  for(const a of remotes()) if(d && a.pet && Math.hypot(a.x - P.x, a.z - P.z) < 2.6) return { k:'trade', a };
  if(isOwnHouse() && SAVE.eggs.length && Math.hypot(NEST.x - P.x, NEST.z - P.z) < 2.4) return { k:'hatch' };
  let best = null, bd = 1.35;
  for(const it of houseList()){
    const nd = ITEM_NEED[it.k]; if(!nd) continue;
    const c = fcenter(it), dd = Math.hypot(c.x - P.x, c.z - P.z) - Math.max(c.w, c.d) / 2;
    if(dd < bd){ bd = dd; best = { k:!d ? 'nopet' : d.needs.includes(nd) ? 'need' : 'noneed', need:nd, it, c }; }
  }
  if(best && best.k === 'need') return best;
  const near = (s, m = 0) => Math.hypot(SPOTS[s].x - P.x, SPOTS[s].z - P.z) < SPOTS[s].r + m;
  if(near('shop')) return { k:'shop' };
  if(near('dress')) return { k:'dress' };
  if(near('icecream') && d) return d.needs.includes('hungry') ? { k:'need', need:'hungry', spot:'icecream' } : { k:'treat' };
  if(near('pond') && d) return { k:d.needs.includes('thirsty') ? 'need' : 'noneed', need:'thirsty', spot:'pond' };
  if(near('playground') && d) return { k:d.needs.includes('bored') ? 'need' : 'noneed', need:'bored', spot:'playground' };
  if(best && best.k !== 'nopet') return best;
  return null;
}
const ACT_LOOK = {
  hatch:() => ['🥚', L('فقّس', 'Hatch', 'Çatlat'), '#ffc23d', true],
  shop:() => ['🛒', L('المحل', 'Shop', 'Dükkân'), '#ff8fb1', false],
  dress:() => ['🎩', L('زيّنه', 'Dress up', 'Süsle'), '#c49bff', false],
  treat:() => ['🍦', L('بوظة', 'Treat', 'Dondurma') + ' ' + N(TREAT) + '⭐', '#ffd1e0', false],
  trade:() => ['🤝', L('تبادل', 'Trade', 'Takas'), '#6cc4ff', false],
  need:c => [NEEDS[c.need].e, NEEDS[c.need].verb, '#5ed6a0', true],
  noneed:c => [NEEDS[c.need].e, L('مش ', 'Not ', 'Değil ') + NEEDS[c.need].name, '#fff8ec', false]
};
let actKey = '';
function updateActBtn(){
  const c = ctxNow = context();
  const look = c && ACT_LOOK[c.k] ? ACT_LOOK[c.k](c) : null;
  const key = look ? look.join('|') + c.k : '';
  if(key === actKey) return; actKey = key;
  if(!look){ actBtn.hidden = true; return; }
  actBtn.hidden = false; $('#actI').textContent = look[0]; $('#actB').textContent = look[1];
  actBtn.style.setProperty('--ac', look[2]); actBtn.classList.toggle('pulse', look[3]); actBtn.classList.toggle('dim', c.k === 'noneed');
}
function doAction(){
  if(state !== 'play') return;
  const c = ctxNow || context(); if(!c) return;
  if(c.k === 'need'){ SFX.tap(); startTask(c.need, c); }
  else if(c.k === 'noneed'){ SFX.bonk(); pop(L('مش ', 'Not ', 'Değil ') + NEEDS[c.need].name + ' 🙂'); if(pet) pet.happyT = .4; }
  else if(c.k === 'hatch'){ SFX.tap(); startHatch(); }
  else if(c.k === 'shop'){ SFX.tap(); openShop(); }
  else if(c.k === 'dress'){ SFX.tap(); openDress(); }
  else if(c.k === 'treat'){
    if(SAVE.stars < TREAT){ SFX.bonk(); pop(L('بدّك ', 'You need ', 'Gerekli: ') + N(TREAT) + ' ⭐'); return; }
    SAVE.stars -= TREAT; pet.d.xp += 5; SFX.eat(); pet.happyT = 1.6; floatIcon('heart', pet.x, pet.M.h + .3, pet.z, 4, .4); persist(); hudKey = ''; checkGrow(pet.d);
  }
  else if(c.k === 'trade') tradeAsk(c.a);
  actKey = '';
}
/* walking in the park fills the «walk» need */
function stepWalk(dt){
  const d = pet && pet.d, S = SPOTS.park;
  const on = state === 'play' && d && d.needs.includes('walk') && !pet.task && Math.hypot(S.x - P.x, S.z - P.z) < S.r;
  meterEl.hidden = !on;
  if(!on) return;
  walkProg += dt * P.move;
  meterBar.style.width = clamp(walkProg / 6 * 100, 0, 100) + '%';
  if(walkProg >= 6){ walkProg = 0; fulfil('walk'); }
}
const meterEl = $('#meter'), meterBar = $('#meterBar');

/* ---------- guide arrow to the closest place for the first need ---------- */
function guideTarget(){
  if(state !== 'play' || !pet || pet.task || !pet.d.needs.length) return null;
  const need = pet.d.needs[0]; let best = null, bd = 1e9;
  for(const it of houseList()) if(ITEM_NEED[it.k] === need){ const c = fcenter(it), d = Math.hypot(c.x - P.x, c.z - P.z); if(d < bd){ bd = d; best = { x:c.x, z:c.z }; } }
  for(const s in SPOT_NEED) if(SPOT_NEED[s] === need){ const S = SPOTS[s], x = s === 'icecream' ? S.cx : S.x, z = s === 'icecream' ? S.cz : S.z, d = Math.hypot(x - P.x, z - P.z) + (inHouse(P.x, P.z) ? 12 : 0); if(d < bd){ bd = d; best = { x, z }; } }
  return best;
}
function hatchGuide(){ return state === 'play' && isOwnHouse() && SAVE.eggs.length && !SAVE.team.length ? { x:NEST.x, z:NEST.z } : null; }
function animGuide(){
  const g = hatchGuide() || guideTarget();
  const show = !!g && Math.hypot(g.x - P.x, g.z - P.z) > 2.2;
  guideArrow.visible = guideRing.visible = show;
  if(!show) return;
  guideArrow.position.set(g.x, (inHouse(g.x, g.z) ? 1.5 : 2.6) + Math.abs(Math.sin(T * 3.5)) * .5, g.z); guideArrow.rotation.y = T * 2;
  guideRing.position.set(g.x, .11, g.z); const s = 1 + (T * .8 % 1) * .6; guideRing.scale.set(s, s, s); guideRing.material.opacity = .9 * (1 - T * .8 % 1);
}

/* ======================================================================
   HUD
   ====================================================================== */
const hudEl = $('#hud'), needsEl = $('#needs'), bubblesEl = $('#bubbles');
let hudKey = '';
function hudFrame(){
  const d = pet && pet.d, mp = mpActive();
  const key = [SAVE.stars, SAVE.eggs.length, d ? d.uid + d.needs.join(',') + d.st + d.hat : '-', inHouse(P.x, P.z), isOwnHouse(), mp ? MP.players.map(p => p.id + p.hero).join(',') : '', MP.code].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudStars').textContent = '⭐ ' + N(SAVE.stars);
  const he = $('#hudEggs'); he.hidden = !SAVE.eggs.length; he.textContent = '🥚 ' + N(SAVE.eggs.length);
  needsEl.innerHTML = d ? d.needs.map(n => `<button class="need" data-n="${n}"><i>${NEEDS[n].e}</i>${NEEDS[n].name}</button>`).join('') : '';
  needsEl.querySelectorAll('.need').forEach(b => b.onclick = () => { SFX.tap(); say(NEEDS[b.dataset.n].e + ' ' + NEED_HINT[b.dataset.n], 4200); });
  const bp = $('#btnPets'); bp.innerHTML = d ? `<img src="${portrait(d)}" alt="">` : '🐾';
  $('#btnEdit').hidden = !(isOwnHouse() && inHouse(P.x, P.z));
  const bar = $('#mpBar');
  bar.hidden = !mp;
  if(mp){
    bar.innerHTML = `<span class="chip roomchip">🏠 ${[...MP.code].map(N).join('')}</span>` + MP.players.map(p => `<span class="chip ps${p.id === MP.id ? ' me' : ''}" style="--c:${MCOL[p.c] || '#fff'}"><img src="${charImg(p.hero)}" alt="">${p.pet && SPECIES[p.pet.sp] ? SPECIES[p.pet.sp].e : ''}</span>`).join('');
  }
}
let bubKey = '';
const bubEl = document.createElement('div'); bubEl.className = 'bub'; bubEl.hidden = true; bubblesEl.appendChild(bubEl);
function placeBubbles(){
  const d = pet && pet.d, show = state === 'play' && d && d.needs.length && !pet.task;
  if(!show){ bubEl.hidden = true; return; }
  const k = d.needs.join(','); if(k !== bubKey){ bubKey = k; bubEl.innerHTML = d.needs.map(n => `<i>${NEEDS[n].e}</i>`).join(''); }
  _v.set(pet.x, floorY(pet.x, pet.z) + pet.M.h + .75, pet.z).project(camera);
  if(_v.z > 1){ bubEl.hidden = true; return; }
  bubEl.hidden = false;
  bubEl.style.transform = `translate(${(_v.x * .5 + .5) * SW}px,${(-_v.y * .5 + .5) * SH}px) translate(-50%,-100%)`;
}

/* ======================================================================
   Hatching: tap the egg 5 times
   ====================================================================== */
let HATCH = null;
const hatchUI = $('#hatchUI');
function rollPet(type){
  const odds = (EGGS[type] || EGGS.basic).odds, sum = odds.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum, rar = 0; for(let i = 0; i < odds.length; i++){ if(r < odds[i]){ rar = i; break; } r -= odds[i]; }
  const pool = SP_IDS.filter(s => SPECIES[s].rar === rar);
  return pick(pool.length ? pool : SP_IDS);
}
function startHatch(){
  if(!SAVE.eggs.length || HATCH) return;
  state = 'hatch'; setPlayUI(false); overlay.hidden = true; hush();
  const type = SAVE.eggs[0], egg = PM.buildEgg(type);
  egg.mesh.scale.setScalar(.6); egg.mesh.position.set(NEST.x, .2, NEST.z); scene.add(egg.mesh);
  HATCH = { egg, type, taps:0, wob:0, done:false, show:null };
  closeup = { px:NEST.x + 1.7, py:1.7, pz:NEST.z + 2.5, lx:NEST.x, ly:.65, lz:NEST.z };
  hatchUI.hidden = false; $('#hatchT').textContent = L('اكبس عالبيضة 5 مرات! 👆', 'Tap the egg 5 times! 👆', 'Yumurtaya 5 kez dokun! 👆');
  hatchDots();
}
function hatchDots(){ $('#taps').innerHTML = [0, 1, 2, 3, 4].map(i => `<b class="${i < (HATCH ? HATCH.taps : 0) ? 'on' : ''}"></b>`).join(''); }
function hatchTap(){
  if(!HATCH || HATCH.done) return;
  HATCH.taps++; HATCH.wob = 1; HATCH.egg.setCracks(HATCH.taps); SFX.crack();
  burst(NEST.x, .7, NEST.z, 6, [0xffffff, 0xfff1d6], 2.5, .6);
  hatchDots();
  if(HATCH.taps >= 5) hatchOpen();
}
function hatchOpen(){
  const H = HATCH; H.done = true;
  scene.remove(H.egg.mesh); H.egg.dispose();
  burst(NEST.x, .7, NEST.z, 90, CONFETTI, 6, 1.3); burst(NEST.x, .6, NEST.z, 16, [0xfff3dc, 0xffffff], 3, 1.6);
  SFX.hatch();
  const sp = rollPet(H.type), d = okPet({ sp, xp:0 });
  SAVE.eggs.shift(); SAVE.hatched = (SAVE.hatched || 0) + 1;
  let where = 'team';
  if(SAVE.team.length < TEAM_MAX) SAVE.team.push(d); else { SAVE.farm.push(d); where = 'farm'; }
  const first = !SAVE.active;
  if(first) SAVE.active = d.uid;
  if(SAVE.tut <= 1){ SAVE.tut = 2; d.needs = []; d.nt = 3; }
  persist();
  H.show = makeRt(d, NEST.x, NEST.z); H.show.happyT = 99; H.show.f = Math.atan2(closeup.px - NEST.x, closeup.pz - NEST.z); H.show.y = .2;
  $('#hatchT').textContent = '🎉';
  setTimeout(() => hatchCard(d, where, first), 1500);
}
function hatchCard(d, where, first){
  const S = SPECIES[d.sp], R = RAR[S.rar];
  overlay.hidden = false; overlay.className = 'overlay'; card.className = 'card';
  card.innerHTML = `<h2>🎉 ${L('طلعلك', 'You got a', 'Çıktı:')} ${S.name}!</h2>
    <span class="tag" style="--rc:${R.col}">${R.name}</span>
    <img class="portrait" src="${portrait(d)}" alt="" style="--rc:${R.col}">
    ${where === 'farm' ? `<p>🏡 ${L('عندك 3 حيوانات، فراح يعيش بمزرعة العمة ليلى. بتقدر تبدّل من زر 🐾', 'You have 3 pets, so it went to live on Aunt Laila\'s farm. Swap from the 🐾 button', '3 hayvanın var, Leyla Teyze\'nin çiftliğine gitti. 🐾 düğmesinden değiştirebilirsin')}</p>` : ''}
    <div class="row">${where === 'team' && !first ? `<button class="big-btn mint" id="bFollow">🐾 ${L('خلّيه يمشي معي', 'Take it with me', 'Benimle gelsin')}</button>` : ''}
    <button class="big-btn" id="bOk">${L('يلّا!', "Let's go!", 'Hadi!')}</button></div>`;
  const done = follow => {
    SFX.tap();
    if(follow){ SAVE.active = d.uid; persist(); }
    if(HATCH){ if(HATCH.show) dropRt(HATCH.show); HATCH = null; }
    hatchUI.hidden = true; closeup = null; snapCam = false;
    if(pet && follow){ dropRt(pet); pet = null; }
    syncPets(); if(pet && (first || follow)){ pet.x = NEST.x + .8; pet.z = NEST.z + 1; }
    overlay.hidden = true; state = 'play'; setPlayUI(true); hudKey = '';
    if(SAVE.tut === 2 && first){ say(LINES.born, 3200); setTimeout(() => { if(pet && SAVE.tut === 2){ addNeed(pet.d, 'hungry'); say(LINES.need, 6000); } }, 3300); }
    if(mpActive()) mpTrack();
  };
  const bf = $('#bFollow'); if(bf) bf.onclick = () => done(true);
  $('#bOk').onclick = () => done(false);
}

/* ======================================================================
   Pet portraits (a tiny second renderer, cached as images)
   ====================================================================== */
let PR = null; const pCache = new Map();
function portrait(d){
  const key = d.sp + '|' + d.st + '|' + (d.hat || '');
  if(pCache.has(key)) return pCache.get(key);
  let url = '';
  try{
    if(!PR){
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const r = new THREE.WebGLRenderer({ canvas:c, alpha:true, antialias:true, preserveDrawingBuffer:true });
      const s = new THREE.Scene(); s.add(new THREE.HemisphereLight(0xfff6e8, 0x9a8a70, 2)); const dl = new THREE.DirectionalLight(0xfff0d8, 2.2); dl.position.set(2, 4, 5); s.add(dl);
      PR = { c, r, s, cam:new THREE.PerspectiveCamera(28, 1, .05, 50) };
    }
    const M = PM.buildPet(d.sp, d.st, d.hat); PM.posePet(M, { t:0, dt:0, move:0, mode:'sit' }); M.head.rotation.set(M.headRest - .08, 0, .08);
    M.grp.rotation.y = .45; PR.s.add(M.grp); M.grp.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(M.grp), ctr = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const R = Math.max(sz.x, sz.y, sz.z) * .5;
    PR.cam.position.set(ctr.x + R * .3, ctr.y + R * .55, ctr.z + R * 4.4); PR.cam.lookAt(ctr.x, ctr.y - R * .05, ctr.z);
    PR.r.render(PR.s, PR.cam); url = PR.c.toDataURL('image/png');
    PM.disposePet(M);
  }catch(e){ url = ''; }
  if(!url){ const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '90px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(SPECIES[d.sp].e, 64, 70); url = c.toDataURL(); }
  pCache.set(key, url); return url;
}
const eggCache = {};
function eggImg(type){
  if(eggCache[type]) return eggCache[type];
  const E = EGGS[type], c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d');
  x.save(); x.translate(80, 86); const r = 46;
  x.beginPath(); x.moveTo(0, -r * 1.3); x.bezierCurveTo(r * .9, -r * 1.25, r * 1.08, r * .2, r * .98, r * .5); x.bezierCurveTo(r * .82, r * 1.15, -r * .82, r * 1.15, -r * .98, r * .5); x.bezierCurveTo(-r * 1.08, r * .2, -r * .9, -r * 1.25, 0, -r * 1.3); x.closePath();
  x.fillStyle = E.col; x.fill(); x.save(); x.clip(); x.fillStyle = E.dot;
  for(const [dx, dy, s] of [[-22, -30, 8], [18, -18, 10], [-6, 6, 9], [26, 22, 8], [-28, 30, 9], [4, 40, 7], [8, -44, 6]]){
    if(E.stars){ x.beginPath(); for(let j = 0; j < 10; j++){ const a = j / 10 * Math.PI * 2 - Math.PI / 2, q = j % 2 ? s * .45 : s * 1.2; x.lineTo(dx + Math.cos(a) * q, dy + Math.sin(a) * q); } x.closePath(); x.fill(); }
    else { x.beginPath(); x.ellipse(dx, dy, s, s * 1.2, 0, 0, 6.3); x.fill(); }
  }
  x.restore(); x.lineWidth = 5; x.strokeStyle = 'rgba(74,47,29,.45)'; x.stroke();
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(-18, -26, 7, 12, -.4, 0, 6.3); x.fill(); x.restore();
  return (eggCache[type] = c.toDataURL());
}

/* ======================================================================
   Cards: shop, dress-up, my pets, furniture catalogue
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu', cardBack = 'play';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on;
  if(!on){ actBtn.hidden = true; actKey = ''; meterEl.hidden = true; bubEl.hidden = true; }
  hudKey = '';
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
const oddsHtml = odds => `<div class="odds">${odds.map((o, i) => o ? `<span style="--rc:${RAR[i].col}"><bdi>${RAR[i].name}</bdi> <bdi dir="ltr">${N(o)}%</bdi></span>` : '').join('')}</div>`;

function openShop(msg){
  openCard(true);
  const full = SAVE.eggs.length >= EGG_MAX;
  card.innerHTML = `${xBtn}<h2>🛒 ${L('محل الحيوانات', 'Pet shop', 'Pet shop')}</h2>
    <p>⭐ ${N(SAVE.stars)} · 🥚 ${N(SAVE.eggs.length)}/${N(EGG_MAX)}</p>
    <div class="grid g3">${EGG_IDS.map(id => { const E = EGGS[id], can = SAVE.stars >= E.price && !full;
      return `<button class="item${can ? '' : ' poor'}" data-e="${id}"><img src="${eggImg(id)}" alt=""><b>${E.name}</b><span class="price">⭐ ${N(E.price)}</span>${oddsHtml(E.odds)}</button>`; }).join('')}</div>
    <p class="mp-msg" id="shopMsg">${msg || (full ? L('عندك 3 بيضات! فقّسهن بالعش بالبيت 🪺', 'You have 3 eggs! Hatch them at the nest at home 🪺', '3 yumurtan var! Evdeki yuvada çatlat 🪺') : '')}</p>`;
  wireX();
  card.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    const E = EGGS[b.dataset.e];
    if(SAVE.eggs.length >= EGG_MAX){ SFX.bonk(); return; }
    if(SAVE.stars < E.price){ SFX.bonk(); $('#shopMsg').textContent = L('بدّك نجمات أكتر ⭐ اهتم بحيوانك لتجمع', 'You need more stars ⭐ — care for your pet to earn them', 'Daha çok yıldız ⭐ lazım — hayvanına bakarak kazan'); return; }
    SAVE.stars -= E.price; SAVE.eggs.push(b.dataset.e); persist(); SFX.buy();
    openShop('🥚 ' + L('اشتريت بيضة! روح عالعش 🪺 بالبيت وفقّسها', 'You bought an egg! Go to the nest 🪺 at home and hatch it', 'Yumurta aldın! Evdeki yuvaya 🪺 git ve çatlat'));
  });
}
function openDress(){
  const d = pet && pet.d; if(!d) return;
  openCard(true);
  const row = id => { const H = HATS[id], own = SAVE.hats.includes(id), on = d.hat === id;
    return `<button class="item${on ? ' on' : ''}${!own && SAVE.stars < H.price ? ' poor' : ''}" data-h="${id}"><span class="em">${H.e}</span><b>${H.name}</b>${on ? `<small>✅ ${L('لابسها', 'Wearing', 'Takılı')}</small>` : own ? `<small>${L('البسها', 'Wear', 'Tak')}</small>` : `<span class="price">⭐ ${N(H.price)}</span>`}</button>`; };
  card.innerHTML = `${xBtn}<h2>🎩 ${L('ركن الزينة', 'Dress-up corner', 'Süslenme köşesi')}</h2>
    <div class="mp-cols"><div class="mp-col" style="flex:0 1 220px"><img class="portrait" src="${portrait(d)}" alt="" style="--rc:${RAR[SPECIES[d.sp].rar].col}"><p>⭐ ${N(SAVE.stars)}</p></div>
    <div class="mp-col"><div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${HAT_IDS.map(row).join('')}
    <button class="item${!d.hat ? ' on' : ''}" data-h=""><span class="em">🚫</span><b>${L('بلا قبعة', 'No hat', 'Şapkasız')}</b></button></div></div></div>`;
  wireX();
  card.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
    const id = b.dataset.h;
    if(id && !SAVE.hats.includes(id)){
      if(SAVE.stars < HATS[id].price){ SFX.bonk(); return; }
      SAVE.stars -= HATS[id].price; SAVE.hats.push(id); SFX.buy();
    } else SFX.tap();
    d.hat = id || null; persist(); syncPets(); if(pet) pet.happyT = 1.2; if(mpActive()) mpTrack();
    openDress();
  });
}
let swapFrom = null;
function openPets(){
  openCard(true);
  const xpBar = d => { const n = GROW[d.st + 1]; return n ? clamp((d.xp - GROW[d.st]) / (n - GROW[d.st]) * 100, 0, 100) : 100; };
  const team = SAVE.team.map(d => { const S = SPECIES[d.sp], R = RAR[S.rar], on = d.uid === SAVE.active;
    return `<div class="petcard${on ? ' on' : ''}"><img src="${portrait(d)}" alt="" style="--rc:${R.col}"><b>${S.e} ${S.name}</b><span class="tag" style="--rc:${R.col}">${R.name} · ${STAGES[d.st]}</span>
      <div class="xp"><i style="width:${xpBar(d)}%"></i></div><small>${d.needs.map(n => NEEDS[n].e).join(' ')}</small>
      ${swapFrom != null ? `<button class="big-btn sky" data-sw="${d.uid}">🔁 ${L('بدّل هاد', 'Swap this', 'Bunu değiştir')}</button>` : on ? `<button class="big-btn mint" disabled>✅ ${L('معي', 'With me', 'Benimle')}</button>` : `<button class="big-btn" data-go="${d.uid}">🐾 ${L('يمشي معي', 'Walk with me', 'Benimle gelsin')}</button>`}</div>`; }).join('');
  const empty = Array.from({ length:TEAM_MAX - SAVE.team.length }, () => `<div class="petcard" style="justify-content:center;opacity:.6"><span style="font-size:60px">🥚</span><small>${L('مكان فاضي', 'Empty spot', 'Boş yer')}</small></div>`).join('');
  card.innerHTML = `${xBtn}<h2>🐾 ${L('حيواناتي', 'My pets', 'Hayvanlarım')}</h2>
    <div class="grid g3">${team}${empty}</div>
    ${SAVE.eggs.length ? `<p>🥚 × ${N(SAVE.eggs.length)} — ${L('فقّسهن بالعش 🪺 بالبيت', 'hatch them at the nest 🪺 at home', 'evdeki yuvada 🪺 çatlat')}</p>` : ''}
    ${SAVE.farm.length ? `<p>🏡 ${L('مزرعة العمة ليلى', "Aunt Laila's farm", 'Leyla Teyze\'nin çiftliği')}${swapFrom != null ? ' — ' + L('اختار مين يروح عالمزرعة', 'pick who goes to the farm', 'çiftliğe kim gitsin seç') : ''}</p>
      <div class="farm">${SAVE.farm.map((d, i) => `<button data-f="${i}" class="${swapFrom === i ? 'on' : ''}"><img src="${portrait(d)}" alt="">${SPECIES[d.sp].e} ${STAGES[d.st]}</button>`).join('')}</div>` : ''}`;
  wireX(() => { swapFrom = null; closeCard(); });
  card.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { SFX.tap(); if(TR) return; SAVE.active = b.dataset.go; walkProg = 0; persist(); syncPets(); if(mpActive()) mpTrack(); swapFrom = null; closeCard(); });
  card.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
    SFX.tap(); const i = +b.dataset.f;
    if(SAVE.team.length < TEAM_MAX){ SAVE.team.push(SAVE.farm.splice(i, 1)[0]); if(!SAVE.active) SAVE.active = SAVE.team[0].uid; persist(); syncPets(); swapFrom = null; openPets(); return; }
    swapFrom = swapFrom === i ? null : i; openPets();
  });
  card.querySelectorAll('[data-sw]').forEach(b => b.onclick = () => {
    if(TR) return; SFX.tap();
    const ti = SAVE.team.findIndex(p => p.uid === b.dataset.sw), fi = swapFrom; if(ti < 0 || fi == null) return;
    const out = SAVE.team[ti], inn = SAVE.farm[fi]; SAVE.team[ti] = inn; SAVE.farm[fi] = out;
    if(SAVE.active === out.uid) SAVE.active = inn.uid;
    swapFrom = null; persist(); syncPets(); if(mpActive()) mpTrack(); openPets();
  });
}
$('#btnPets').onclick = () => { if(state !== 'play') return; SFX.tap(); swapFrom = null; openPets(); };

/* ======================================================================
   Decorating the house: a top view with a grid; tap things to move them
   ====================================================================== */
const editBar = $('#editBar'), editHint = $('#editHint');
let heldMesh = null, heldFoot = null;
const GHOST = new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.6, transparent:true, opacity:.8 });
function enterEdit(){
  if(!isOwnHouse() || state !== 'play') return;
  state = 'edit'; setPlayUI(false); clearInput(); editView = true; gridMesh.visible = true; held = null; showEditUI();
}
function showEditUI(){
  gridMesh.visible = true; editHint.hidden = false; editBar.hidden = false;
  editHint.textContent = held ? L('اكبس عالأرض لتحرّكه 👆', 'Tap the floor to move it 👆', 'Taşımak için zemine dokun 👆') : L('اكبس على أي غرض لتحرّكه', 'Tap anything to move it', 'Taşımak için bir eşyaya dokun');
  editBar.innerHTML = held
    ? `<button class="big-btn sky" id="eRot">🔄 ${L('لفّ', 'Turn', 'Çevir')}</button><button class="big-btn mint" id="ePut">✅ ${L('حطّ', 'Place', 'Koy')}</button><button class="big-btn no" id="eStore">📦 ${L('خبّي', 'Put away', 'Kaldır')}</button>`
    : `<button class="big-btn pink" id="eShop">🛒 ${L('اشتري أغراض', 'Buy things', 'Eşya al')}</button><button class="big-btn mint" id="eDone">✅ ${L('خلصت', 'Done', 'Bitti')}</button>`;
  const on = (id, fn) => { const b = $('#' + id); if(b) b.onclick = () => { ac(); fn(); }; };
  on('eRot', editRotate); on('ePut', editPlace); on('eStore', editStore); on('eShop', () => { SFX.tap(); openCatalog('buy'); }); on('eDone', exitEdit);
  drawHeld();
}
function hideEditUI(){ editHint.hidden = true; editBar.hidden = true; }
function drawHeld(){
  if(heldMesh){ scene.remove(heldMesh); heldMesh = null; }
  if(heldFoot){ scene.remove(heldFoot); heldFoot.geometry.dispose(); heldFoot = null; }
  if(!held) return;
  const c = fcenter(held), ok = canPlace(held, SAVE.furn);
  heldMesh = new THREE.Mesh(PM.buildFurn(held.k).geometry, GHOST); heldMesh.position.set(c.x, .35, c.z); heldMesh.rotation.y = held.r * Math.PI / 2; scene.add(heldMesh);
  heldFoot = new THREE.Mesh(new THREE.PlaneGeometry(c.w - .06, c.d - .06), new THREE.MeshBasicMaterial({ color:ok ? 0x5ed6a0 : 0xff5d73, transparent:true, opacity:.55, depthWrite:false }));
  heldFoot.rotation.x = -Math.PI / 2; heldFoot.position.set(c.x, .1, c.z); scene.add(heldFoot);
}
function editTap(r){
  if(held){
    const hit = r.ray.intersectPlane(floorPlane, _v); if(!hit) return;
    const [w, d] = fdim(held.k, held.r);
    held.ix = clamp(Math.round(hit.x - HX0 - w / 2), 0, CX - w); held.iz = clamp(Math.round(hit.z - HZ0 - d / 2), 0, CZ - d);
    SFX.tap(); drawHeld(); return;
  }
  const hits = r.intersectObjects(furnGrp.children, false);
  if(!hits.length) return;
  const i = hits[0].object.userData.idx, it = SAVE.furn[i]; if(!it) return;
  held = Object.assign({}, it, { from:Object.assign({}, it) }); SAVE.furn.splice(i, 1); rebuildFurn(); SFX.tap(); showEditUI();
}
function editRotate(){
  if(!held) return; held.r = (held.r + 1) & 3; const [w, d] = fdim(held.k, held.r);
  held.ix = clamp(held.ix, 0, CX - w); held.iz = clamp(held.iz, 0, CZ - d); SFX.tap(); drawHeld();
}
function editPlace(){
  if(!held) return true;
  const it = { k:held.k, ix:held.ix, iz:held.iz, r:held.r };
  if(!canPlace(it, SAVE.furn)){ SFX.bonk(); editHint.textContent = L('ما بيزبط هون، جرّب مكان تاني 🙂', "It doesn't fit there — try another spot 🙂", 'Oraya sığmıyor, başka yer dene 🙂'); return false; }
  SAVE.furn.push(it); held = null; rebuildFurn(); persist(); SFX.place();
  const c = fcenter(it); burst(c.x, .5, c.z, 16, CONFETTI, 3, .8); showEditUI(); mpHouse(); return true;
}
function editStore(){ if(!held) return; SAVE.inv[held.k] = (SAVE.inv[held.k] || 0) + 1; held = null; persist(); SFX.tap(); showEditUI(); mpHouse(); }
function exitEdit(){
  if(held && !editPlace()){ if(held.from && canPlace(held.from, SAVE.furn)){ SAVE.furn.push({ k:held.k, ix:held.from.ix, iz:held.from.iz, r:held.from.r }); held = null; } else editStore(); }
  held = null; drawHeld(); rebuildFurn(); persist();
  SFX.tap(); hideEditUI(); gridMesh.visible = false; editView = false; state = 'play'; setPlayUI(true); placeJoyHome(); mpHouse();
}
function openCatalog(tab){
  openCard(true, 'edit');
  const inv = Object.keys(SAVE.inv).filter(k => SAVE.inv[k] > 0);
  const buy = FURN_IDS.filter(k => FURN[k].price > 0).map(k => { const F = FURN[k];
    return `<button class="item${SAVE.stars < F.price ? ' poor' : ''}" data-b="${k}"><span class="em">${F.e}</span><b>${F.name}</b>${F.need ? `<small>${NEEDS[F.need].e} ${NEEDS[F.need].name}</small>` : '<small>&nbsp;</small>'}<span class="price">⭐ ${N(F.price)}</span></button>`; }).join('');
  const mine = inv.map(k => `<button class="item" data-m="${k}"><span class="cnt">${N(SAVE.inv[k])}</span><span class="em">${FURN[k].e}</span><b>${FURN[k].name}</b></button>`).join('');
  card.innerHTML = `${xBtn}<h2>🛋️ ${L('أغراض للبيت', 'Things for the house', 'Ev eşyaları')}</h2>
    <div class="tabs"><button id="tBuy" class="${tab === 'buy' ? 'on' : ''}">🛒 ${L('اشتري', 'Buy', 'Satın al')}</button><button id="tMine" class="${tab === 'mine' ? 'on' : ''}">📦 ${L('عندي', 'Mine', 'Benim')} ${inv.length ? '(' + N(inv.reduce((a, k) => a + SAVE.inv[k], 0)) + ')' : ''}</button><span class="chip star">⭐ ${N(SAVE.stars)}</span></div>
    <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${tab === 'buy' ? buy : mine || `<p>${L('ما في شي مخبّى', 'Nothing put away', 'Kaldırılmış eşya yok')}</p>`}</div>
    <p class="mp-msg" id="catMsg"></p>`;
  wireX();
  $('#tBuy').onclick = () => { SFX.tap(); openCatalog('buy'); }; $('#tMine').onclick = () => { SFX.tap(); openCatalog('mine'); };
  card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => {
    const k = b.dataset.b, F = FURN[k];
    if(SAVE.stars < F.price){ SFX.bonk(); $('#catMsg').textContent = L('بدّك نجمات أكتر ⭐', 'You need more stars ⭐', 'Daha çok yıldız ⭐ lazım'); return; }
    SAVE.stars -= F.price; persist(); SFX.buy(); held = freeSpot(k); closeCard();
  });
  card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { const k = b.dataset.m; SAVE.inv[k]--; if(SAVE.inv[k] <= 0) delete SAVE.inv[k]; persist(); SFX.tap(); held = freeSpot(k); closeCard(); });
}
$('#btnEdit').onclick = () => { SFX.tap(); enterEdit(); };

/* ======================================================================
   Menu, hero picker, pause, daily gift, starting to play
   ====================================================================== */
function showMenu(){
  if(MP.t){ mpLeave(true); }
  state = 'menu'; setPlayUI(false); hideEditUI(); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('pets_rothint');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🐾</div><h1>${L('حيوانات بوبو', 'Bobo Pets', 'Bobo Hayvanları')}</h1>
    <p class="sub">${L('فقّس بيضة، ربّي حيوانك، وزيّن بيتك!', 'Hatch an egg, raise your pet, decorate your house!', 'Yumurta çatlat, hayvanını büyüt, evini süsle!')}</p>
    <div class="row"><div class="mine"><span>⭐ ${N(SAVE.stars)}</span><span>🐾 ${N(SAVE.team.length + SAVE.farm.length)}</span>${SAVE.eggs.length ? `<span>🥚 ${N(SAVE.eggs.length)}</span>` : ''}</div>
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
function dailyCard(){
  openCard(false);
  card.innerHTML = `<div class="bigstar">🎁</div><h2>${L('هدية اليوم!', "Today's gift!", 'Günün hediyesi!')}</h2>
    <img src="${eggImg('basic')}" alt="" style="width:130px;animation:wob 1.6s ease-in-out infinite">
    <p>${L('كل يوم بتفوت فيه عندك بيضة هدية 🥚', 'Every day you visit, you get a gift egg 🥚', 'Her gün geldiğinde hediye yumurta 🥚')}</p>
    <button class="big-btn" id="bTake">🎁 ${L('خدها!', 'Take it!', 'Al!')}</button>`;
  $('#bTake').onclick = () => {
    SFX.hatch(); SAVE.daily = today();
    if(SAVE.eggs.length < EGG_MAX){ SAVE.eggs.push('basic'); pop('+🥚'); } else { SAVE.stars += 30; pop('+' + N(30) + ' ⭐'); }
    persist(); closeCard(); say(L('روح عالعش 🪺 بالبيت وفقّسها!', 'Go to the nest 🪺 at home and hatch it!', 'Evdeki yuvaya 🪺 git ve çatlat!'), 4000);
  };
}
function startPlay(where){
  if(ROT) rawSet('pets_rothint', '1');
  overlay.hidden = true; hideEditUI();
  const sp = where === 'out' ? SPAWN_OUT : SPAWN_IN;
  P.x = sp.x; P.z = sp.z; P.face = sp.f; P.vx = P.vz = 0; P.trail = []; for(let i = 6; i >= 0; i--) pushTrail(P.trail, P.x - Math.sin(P.face) * i * .3, P.z - Math.cos(P.face) * i * .3);
  wasInside = inHouse(P.x, P.z, -.4); cam.yaw = wasInside ? 0 : Math.PI; cam.pAdj = 0; cam.auto = null; snapCam = true; closeup = null; editView = false;
  if(pet){ dropRt(pet); pet = null; } syncPets();
  rebuildFurn();
  state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  if(SAVE.tut === 0){ SAVE.tut = 1; persist(); say(LINES.hi, 3800); setTimeout(() => { if(state === 'play' && SAVE.tut === 1) say(LINES.nest, 6000); }, 4000); }
  else if(SAVE.tut === 1) say(LINES.nest, 5000);
  else if(SAVE.daily !== today() && !mpActive()) setTimeout(() => { if(state === 'play') dailyCard(); }, 500);
  else say(LINES.back, 2500);
  if(SAVE.tut === 2 && pet && !pet.d.needs.length) addNeed(pet.d, 'hungry');
}

/* ======================================================================
   Main loop
   ====================================================================== */
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0, wallK = 1;
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
  // the player
  if(heroM){ heroM.grp.visible = !closeup || !!closeup.keepHero; heroM.grp.position.set(P.x, floorY(P.x, P.z), P.z); heroM.grp.rotation.y = P.face; poseHero(heroM, { t:T, dt, run:P.move, grounded:true, vy:0, sq:0, flip:0 }); }
  // pets
  if(pet){ if(pet.task) stepTask(dt); else followLeader(pet, P.trail, P.x, P.z, P.face, dt); poseRt(pet, dt); }
  for(const h of homePets){ homeStep(h, dt); poseRt(h, dt); }
  if(HATCH){
    if(HATCH.egg && !HATCH.done){ HATCH.wob = Math.max(0, HATCH.wob - dt * 2.5); const e = HATCH.egg.mesh; e.rotation.z = Math.sin(T * 28) * .3 * HATCH.wob + Math.sin(T * 3) * .04; e.position.y = .2 + HATCH.wob * .1; }
    if(HATCH.show) poseRt(HATCH.show, dt);
  }
  if(state === 'play'){ tickNeeds(dt); stepWalk(dt); updateActBtn(); hudFrame(); saveT += dt; if(saveT > 10) persist(); }
  // camera
  if(state === 'menu' || state === 'select' || (state === 'mp' && !mpActive())){
    menuT += dt; const a = menuT * .05 + 2.2;
    camera.position.set(Math.sin(a) * 30, 17, -4 + Math.cos(a) * 30); camera.lookAt(0, 0, -6); aimSun(0, -6);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  // dollhouse: walls go low and the roof hides while you are inside (or decorating / hatching)
  const inside = state !== 'menu' && state !== 'select' && (inHouse(P.x, P.z, -.4) || editView || !!closeup);
  wallK = lerp(wallK, inside ? .38 : 1, Math.min(1, dt * 6)); wallsMesh.scale.y = wallK;
  roofGrp.visible = wallK > .9; roofGrp.position.y = WALL_H * wallK;
  if(pondTex) pondTex.offset.set(T * .02, T * .012);
  if(fountainWater && Math.random() < dt * 6) burst(0, 2.4, 10, 2, [0xbfe8ff, 0xffffff], 1.6, .5, 6);
  animGuide(); placeBubbles();
  mpFrame(dt);
  updateParts(dt); updateFloaters(dt);
  sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => persist());

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   The room owner's house is the house everyone sees. Events: pos, fx, house, hreq, tr.
   No names, no chat: a player is a character + a colour badge.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'fx', 'house', 'hreq', 'tr'];
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
    const ch = this.ch = sb.channel('bobo-pets-' + code, { config:{ broadcast:{ self:false, ack:false }, presence:{ key:id, enabled:true } } });
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
    const bc = this.bc = new BroadcastChannel('bobo-pets-' + code);
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
      for(const [k, p] of this.peers) if(now - p.last > 3500){ this.peers.delete(k); ch = true; }
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
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
const petMeta = () => { const d = activeData(); return d ? { sp:d.sp, st:d.st, hat:d.hat || null } : null; };
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'pets';
/* «انضم»: invitepop.js answers a friend's join request with this room (and ?host=1&accept=<id> makes one first) */
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
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
/* friends in the room: their character + their pet, following them */
const RM = new Map();
const remotes = () => [...RM.values()];
function remoteSync(){
  const here = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue; here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, pet:null, petKey:'', x:SPAWN_OUT.x + 1, z:SPAWN_OUT.z, f:0, m:0, tx:SPAWN_OUT.x + 1, tz:SPAWN_OUT.z, tf:0, tm:0, trail:[], c:p.c, t:Math.random() * 5, seen:false }; RM.set(p.id, a); }
    a.c = p.c;
    const hero = okHero(p.hero);
    if(a.hero !== hero){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.h = HEROES[hero](); shadowAll(a.h.grp); scene.add(a.h.grp); }
    const pm = p.pet && SPECIES[p.pet.sp] ? { sp:p.pet.sp, st:clamp(p.pet.st | 0, 0, 2), hat:HATS[p.pet.hat] ? p.pet.hat : null } : null;
    const key = pm ? pm.sp + pm.st + pm.hat : '';
    if(key !== a.petKey){ a.petKey = key; if(a.pet) dropRt(a.pet); a.pet = pm ? makeRt(Object.assign({ uid:'r' + p.id, xp:0, needs:[] }, pm), a.x - .8, a.z - .8) : null; }
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); if(a.pet) dropRt(a.pet); RM.delete(id); if(TR && TR.peer === id) tradeCancel(L('صاحبك طلع من الغرفة', 'Your friend left the room', 'Arkadaşın odadan çıktı')); }
}
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false;
  remoteSync();
  if(TR){ TR = null; }
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play', pet:petMeta() };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.pet = petMeta(); MP.t.track(MP.meta); hudKey = ''; } }
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
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ mpLeave(); say(L('صاحب البيت طلع 🚪 رجعنا عبيتك', 'The house owner left 🚪 back to your house', 'Ev sahibi çıktı 🚪 evine döndün'), 4000); return; }
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.flag(); if(MP.isHost) mpHouse(); }
  remoteSync(); hudKey = '';
}
function mpHouse(){ if(mpActive() && MP.isHost) mpSend('house', { furn:SAVE.furn.map(it => [it.k, it.ix, it.iz, it.r]) }); }
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){ if(!a) return; a.tx = clamp(+p.x || 0, -45, 45); a.tz = clamp(+p.z || 0, -45, 45); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1); if(!a.seen){ a.seen = true; a.x = a.tx; a.z = a.tz; if(a.pet){ a.pet.x = a.x - .8; a.pet.z = a.z - .8; } } }
  else if(ev === 'fx'){ if(!a || !a.pet) return; const y = floorY(a.pet.x, a.pet.z) + a.pet.M.h; if(p.k === 'heart'){ a.pet.happyT = 1.4; floatIcon('heart', a.pet.x, y + .2, a.pet.z, 3, .4); } else if(p.k === 'need'){ a.pet.happyT = 1.2; floatIcon('star', a.pet.x, y + .3, a.pet.z, 2, .45); burst(a.pet.x, y, a.pet.z, 14, CONFETTI, 3, .8); } }
  else if(ev === 'hreq'){ if(MP.isHost) mpHouse(); }
  else if(ev === 'house'){
    if(MP.isHost || p.id !== MP.hostId || !Array.isArray(p.furn)) return;
    visiting = p.furn.slice(0, 80).filter(r => Array.isArray(r) && FURN[r[0]] && !FURN[r[0]].fixed).map(r => ({ k:r[0], ix:clamp(r[1] | 0, 0, CX - 1), iz:clamp(r[2] | 0, 0, CZ - 1), r:(r[3] | 0) & 3 }));
    rebuildFurn(); syncPets(); hudKey = '';
  }
  else if(ev === 'tr') onTrade(p);
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT -= dt;
  if(MP.sendT <= 0 && (state === 'play' || state === 'card' || state === 'pause' || state === 'edit' || state === 'hatch')){ MP.sendT = .12; mpSend('pos', { x:Math.round(P.x * 100) / 100, z:Math.round(P.z * 100) / 100, f:Math.round(P.face * 100) / 100, m:Math.round(P.move * 100) / 100 }); }
  for(const a of RM.values()){
    const k = 1 - Math.exp(-10 * dt);
    a.x = lerp(a.x, a.tx, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k); a.t += dt;
    pushTrail(a.trail, a.x, a.z);
    if(a.h){ a.h.grp.position.set(a.x, floorY(a.x, a.z), a.z); a.h.grp.rotation.y = a.f; poseHero(a.h, { t:a.t, dt, run:a.m, grounded:true, vy:0, sq:0, flip:0 }); }
    if(a.pet){ followLeader(a.pet, a.trail, a.x, a.z, a.f, dt); poseRt(a.pet, dt); }
  }
}
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off';
  if(visiting){ visiting = null; rebuildFurn(); syncPets(); }
  if(!silent) hudKey = '';
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏡 ${L('أصحابك بيزوروا بيتك، وبتتمشّوا بالبلد مع حيواناتكم', 'Friends visit your house and you walk in town with your pets', 'Arkadaşların evini ziyaret eder, hayvanlarınızla kasabada gezersiniz')}</p>
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
  startPlay(MP.isHost ? 'in' : 'out');
  if(MP.isHost) say(L('رقم غرفتك ', 'Your room number is ', 'Oda numaran ') + [...MP.code].map(N).join('') + L(' — قولو لأصحابك 👫', ' — tell your friends 👫', ' — arkadaşlarına söyle 👫'), 6000);
  else { mpSend('hreq', {}); say(L('أهلا! هاد بيت صاحبك 🏡', "Welcome! This is your friend's house 🏡", 'Hoş geldin! Burası arkadaşının evi 🏡'), 3500); }
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'pets' yet: guarded. */
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
   «تبادل» pet-for-pet trading. Both pets shown big; both kids press ✓, then ✓✓ again («متأكد؟»).
   «ما بدي» cancels at any step. Messages: ask → pick → ok1 → ok2 (or no).
   ====================================================================== */
let TR = null;
const petWire = d => ({ uid:d.uid, sp:d.sp, xp:d.xp, hat:d.hat || null });
const petIn = w => { const d = okPet(w); if(d){ d.needs = []; d.nt = 15; } return d; };
function tradeAsk(a){
  if(TR || !mpActive()) return;
  SFX.tap(); openCard(true);
  card.innerHTML = `${xBtn}<h2>🤝 ${L('تبادل', 'Trade', 'Takas')}</h2><p>${L('أي حيوان بدّك تعطي صاحبك؟', 'Which pet do you want to give your friend?', 'Arkadaşına hangi hayvanı vermek istersin?')}</p>
    <div class="grid g3">${SAVE.team.map(d => `<button class="item" data-u="${d.uid}"><img src="${portrait(d)}" alt=""><b>${SPECIES[d.sp].e} ${SPECIES[d.sp].name}</b><span class="tag" style="--rc:${RAR[SPECIES[d.sp].rar].col}">${RAR[SPECIES[d.sp].rar].name} · ${STAGES[d.st]}</span></button>`).join('')}</div>
    <button class="big-btn no" id="bNo">🙅 ${L('ما بدي', 'No thanks', 'İstemiyorum')}</button>`;
  wireX(); $('#bNo').onclick = () => { SFX.tap(); closeCard(); };
  card.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
    const d = SAVE.team.find(p => p.uid === b.dataset.u); if(!d || !RM.has(a.id)) return;
    SFX.tap(); TR = { tid:newUid(), peer:a.id, role:'a', mine:d, theirs:null, step:'wait', ok1:[false, false], ok2:[false, false] };
    mpSend('tr', { to:a.id, tid:TR.tid, k:'ask', pet:petWire(d) });
    tradeRender();
  });
}
function onTrade(p){
  if(p.to !== MP.id || typeof p.tid !== 'string') return;
  if(p.k === 'ask'){
    const theirs = petIn(p.pet);
    if(TR || !theirs || !SAVE.team.length || !(state === 'play' || state === 'pause')){ mpSend('tr', { to:p.id, tid:p.tid, k:'no' }); return; }
    if(state === 'pause'){ overlay.hidden = true; state = 'play'; }
    TR = { tid:p.tid, peer:p.id, role:'b', mine:null, theirs, step:'pick', ok1:[false, false], ok2:[false, false] };
    SFX.flag(); openCard(true); tradeRender(); return;
  }
  if(!TR || TR.tid !== p.tid || TR.peer !== p.id) return;
  if(p.k === 'no'){ tradeCancel(); return; }
  if(p.k === 'pick' && TR.role === 'a' && TR.step === 'wait'){ const d = petIn(p.pet); if(!d){ tradeNo(); return; } TR.theirs = d; TR.step = 'c1'; SFX.flag(); }
  else if(p.k === 'ok1' && TR.step === 'c1'){ TR.ok1[1] = true; if(TR.ok1[0]) TR.step = 'c2'; }
  else if(p.k === 'ok2' && TR.step === 'c2'){ TR.ok2[1] = true; if(TR.ok2[0]){ tradeCommit(); return; } }
  tradeRender();
}
function tradeNo(){ if(TR){ mpSend('tr', { to:TR.peer, tid:TR.tid, k:'no' }); TR = null; } }
function tradeCancel(msg){
  TR = null; if(state !== 'card') return;
  card.innerHTML = `<div class="bigstar">👍</div><h2>${L('ما صار تبادل', 'No trade', 'Takas olmadı')}</h2>${msg ? `<p>${msg}</p>` : ''}<button class="big-btn" id="bOk">${L('تمام', 'OK', 'Tamam')}</button>`;
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); };
}
function tradeCommit(){
  const t = TR; TR = null;
  const i = SAVE.team.findIndex(d => d.uid === t.mine.uid);
  if(i < 0){ tradeCancel(); return; }
  const got = t.theirs; if(SAVE.team.some(d => d.uid === got.uid) || SAVE.farm.some(d => d.uid === got.uid)) got.uid = newUid();
  const wasActive = SAVE.active === t.mine.uid;
  SAVE.team[i] = got; if(wasActive) SAVE.active = got.uid;
  persist(); syncPets(); mpTrack(); SFX.hatch();
  if(pet && wasActive){ pet.happyT = 2; burst(pet.x, .8, pet.z, 40, CONFETTI, 4.5, 1.1); }
  card.innerHTML = `<div class="bigstar">🎉</div><h2>${L('تبادلتوا!', 'You traded!', 'Takas yaptınız!')}</h2>
    <img class="portrait" src="${portrait(got)}" alt="" style="--rc:${RAR[SPECIES[got.sp].rar].col}"><p>${SPECIES[got.sp].e} ${SPECIES[got.sp].name} · ${STAGES[got.st]}</p>
    <button class="big-btn" id="bOk">🐾 ${L('يا سلام!', 'Hooray!', 'Yaşasın!')}</button>`;
  $('#bOk').onclick = () => { SFX.tap(); closeCard(); };
}
function tradeSide(d, who, ok, col){
  if(!d) return `<div class="side2" style="--c:${col}"><span class="who">${who}</span><div style="font-size:90px;line-height:1.6"><span class="spin">⏳</span></div><b>…</b></div>`;
  const S = SPECIES[d.sp], R = RAR[S.rar];
  return `<div class="side2" style="--c:${col}"><span class="who">${who}</span><img src="${portrait(d)}" alt="" style="--rc:${R.col}"><b>${S.e} ${S.name}</b><span class="tag" style="--rc:${R.col}">${R.name} · ${STAGES[d.st]}</span><span class="ok">${ok}</span></div>`;
}
function tradeRender(){
  if(!TR || state !== 'card') return;
  const a = RM.get(TR.peer), friendImg = a ? `<img src="${charImg(a.hero)}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover;object-position:top;vertical-align:middle;box-shadow:0 0 0 3px ${MCOL[a.c] || '#fff'}">` : '';
  const giveL = L('إنت بتعطي', 'You give', 'Sen veriyorsun'), getL = L('بتاخد', 'You get', 'Alıyorsun');
  const no = `<button class="big-btn no" id="bNo">🙅 ${L('ما بدي', 'No thanks', 'İstemiyorum')}</button>`;
  if(TR.step === 'wait'){
    card.innerHTML = `<h2>🤝 ${friendImg} ${L('استنّى صاحبك يختار…', 'Waiting for your friend to choose…', 'Arkadaşının seçmesini bekle…')}</h2>
      <div class="trade">${tradeSide(TR.mine, giveL, '', MCOL[MP.meta ? MP.meta.c : 0])}<span class="arrows">⇄</span>${tradeSide(null, getL, '', a ? MCOL[a.c] : '#ddd')}</div><div class="row">${no}</div>`;
  } else if(TR.step === 'pick'){
    card.innerHTML = `<h2>🤝 ${friendImg} ${L('صاحبك بدّو يبدّل معك!', 'Your friend wants to trade!', 'Arkadaşın takas yapmak istiyor!')}</h2>
      <div class="mp-cols"><div class="mp-col" style="flex:0 1 240px"><div class="trade">${tradeSide(TR.theirs, getL, '', a ? MCOL[a.c] : '#ddd')}</div></div>
      <div class="mp-col"><p>${L('شو بدّك تعطيه؟', 'What will you give?', 'Ne vereceksin?')}</p><div class="grid g3">${SAVE.team.map(d => `<button class="item" data-u="${d.uid}"><img src="${portrait(d)}" alt=""><b>${SPECIES[d.sp].e} ${STAGES[d.st]}</b></button>`).join('')}</div></div></div>
      <div class="row">${no}</div>`;
    card.querySelectorAll('[data-u]').forEach(b => b.onclick = () => {
      const d = SAVE.team.find(p => p.uid === b.dataset.u); if(!d || !TR) return;
      SFX.tap(); TR.mine = d; TR.step = 'c1'; mpSend('tr', { to:TR.peer, tid:TR.tid, k:'pick', pet:petWire(d) }); tradeRender();
    });
  } else {
    const c2 = TR.step === 'c2', ok = c2 ? TR.ok2 : TR.ok1, okIc = v => v ? '✅' : '⏳';
    card.innerHTML = `<h2>🤝 ${c2 ? L('متأكد؟ 🤔 كبوس كمان مرة', 'Are you sure? 🤔 Press again', 'Emin misin? 🤔 Tekrar bas') : L('شوف منيح وكبوس ✓', 'Look carefully, then press ✓', 'İyice bak ve ✓ bas')}</h2>
      <div class="trade${c2 ? ' big' : ''}">${tradeSide(TR.mine, giveL, okIc(ok[0]), MCOL[MP.meta ? MP.meta.c : 0])}<span class="arrows">⇄</span>${tradeSide(TR.theirs, getL + ' ' + friendImg, okIc(ok[1]), a ? MCOL[a.c] : '#ddd')}</div>
      <div class="row"><button class="big-btn mint" id="bYes"${ok[0] ? ' disabled' : ''}>${c2 ? '✓✓ ' + L('أكيد!', "I'm sure!", 'Eminim!') : '✓ ' + L('موافق', 'OK', 'Tamam')}</button>${no}</div>`;
    $('#bYes').onclick = () => {
      if(!TR) return; SFX.tap();
      if(TR.step === 'c1'){ TR.ok1[0] = true; mpSend('tr', { to:TR.peer, tid:TR.tid, k:'ok1' }); if(TR.ok1[1]) TR.step = 'c2'; tradeRender(); }
      else if(TR.step === 'c2'){ TR.ok2[0] = true; mpSend('tr', { to:TR.peer, tid:TR.tid, k:'ok2' }); if(TR.ok2[1]) tradeCommit(); else tradeRender(); }
    };
  }
  const bn = $('#bNo'); if(bn) bn.onclick = () => { SFX.tap(); tradeNo(); closeCard(); };
}

/* ---------- test hook ---------- */
window.__pets = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:where => startPlay(where),
  save:() => JSON.parse(JSON.stringify(SAVE)), saveNow:() => persist(), get stars(){ return SAVE.stars; }, addStars(n){ SAVE.stars += n; hudKey = ''; persist(); },
  P, tp(x, z, f){ P.x = x; P.z = z; if(f != null) P.face = f; P.trail = []; pushTrail(P.trail, x, z); if(pet){ pet.x = x - .8; pet.z = z - .8; } snapCam = true; },
  act:() => { ctxNow = context(); doAction(); }, ctx:() => { const c = context(); return c ? { k:c.k, need:c.need, spot:c.spot, item:c.it ? c.it.k : null } : null; },
  get pet(){ return pet ? { sp:pet.d.sp, st:pet.d.st, xp:pet.d.xp, needs:pet.d.needs.slice(), task:pet.task ? pet.task.phase : null, hat:pet.d.hat, x:pet.x, z:pet.z, modelSt:pet.M.st } : null; },
  get home(){ return homePets.length; }, forceNeed(k){ if(pet) addNeed(pet.d, k); }, setXp(x){ if(pet){ pet.d.xp = x; checkGrow(pet.d); } },
  SPOTS, NEST, items:() => houseList().map(it => Object.assign({}, it, fcenter(it))), hatchTap:() => hatchTap(), get hatching(){ return !!HATCH; },
  edit:{ enter:() => enterEdit(), exit:() => exitEdit(), get held(){ return held ? { k:held.k, ix:held.ix, iz:held.iz, r:held.r } : null; }, moveTo(ix, iz){ if(held){ held.ix = ix; held.iz = iz; drawHeld(); } }, place:() => editPlace(), canPlace:it => canPlace(it, SAVE.furn) },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, players:MP.players.map(p => ({ id:p.id, hero:p.hero, pet:p.pet })), remotes:remotes().map(a => ({ id:a.id, hero:a.hero, x:a.x, z:a.z, pet:a.pet ? a.pet.d.sp : null })), visiting:!!visiting }; },
  get trade(){ return TR ? { step:TR.step, role:TR.role, ok1:TR.ok1.slice(), ok2:TR.ok2.slice() } : null; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  hud(on){ hudEl.style.visibility = on ? '' : 'hidden'; }
};

/* ---------- boot ---------- */
buildWorld();
setHero(heroId);
rebuildFurn();
syncPets();
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
