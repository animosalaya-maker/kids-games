/* «بوبو الصغير» (Tiny Bobo / Minik Bobo) — an original 3D platformer-adventure for kids.
   The hero is «بوبو الدبدوب», a tiny blocky bear cub with a star backpack (or one of our 7 characters / the kid's own 'me' avatar).
   Explore a GIANT house (living room, kitchen, kids' room, bathroom) and the little outdoor village: jump on furniture,
   collect coins and hidden golden buttons, pop cute wind-up toys, ride the toy cannon, help villagers with small quests,
   and spend coins on fur colours and hats at the bunny's market stall.
   Jumping is the core: variable height (tap = hop, hold = high), double jump with a front flip, coyote time + jump buffer,
   lower gravity at the apex and a faster fall, squash & stretch, dust puffs, bouncy cushions/bed/trampoline,
   launch pads (straight up or aimed across gaps), B on the ground = spin attack, B in the air = ground pound.
   Progress is saved on this phone (localStorage); quests and golden buttons also give a few Bobo Land coins (capped per day). */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeTextures } from './tex.js';
import { makeGeo } from './geo.js';
import { makeModels } from './models.js';
import { makeWorld } from './world.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const LANG = window.I18N ? I18N.lang : 'ar';
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const QS = new URLSearchParams(location.search);
const AU = makeAudio(), SFX = AU.SFX;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const BEAR_NAME = L('بوبو الدبدوب', 'Bobo the Bear', 'Ayıcık Bobo');
const ALL_HEROES = ['bear', ...HERO_IDS];
const heroName = id => id === 'bear' ? BEAR_NAME : HERO_NAME[id];
const heroCol = id => id === 'bear' ? '#f0a640' : HERO_COLOR[id];

/* ======================================================================
   Save (this phone)
   ====================================================================== */
const SAVE_KEY = 'tiny_save', SAVE_V = 1, COIN_CAP = 80;
function freshSave(){ return { v:SAVE_V, hero:'bear', coins:0, total:0, got:{}, btn:[], q:{}, pops:0, popsAt:0, fur:'honey', hat:'cap', owned:['fur:honey', 'hat:cap', 'hat:none'], drum:0, bells:[], seen:[], tut:0, cd:{ d:'', n:0 }, cp:null, area:'hub' }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.coins = clamp(s.coins | 0, 0, 999999); s.total = clamp(s.total | 0, 0, 9999999); s.pops = clamp(s.pops | 0, 0, 999999);
      if(!s.got || typeof s.got !== 'object') s.got = {};
      for(const k of Object.keys(s.got)) if(!Array.isArray(s.got[k])) delete s.got[k];
      for(const k of ['btn', 'owned', 'bells', 'seen']) if(!Array.isArray(s[k])) s[k] = freshSave()[k];
      if(!s.q || typeof s.q !== 'object') s.q = {};
      if(!s.cd || typeof s.cd !== 'object') s.cd = { d:'', n:0 };
      if(!['hub', 'down', 'up'].includes(s.area)) s.area = 'hub';
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveTO = 0;
function persist(now){ clearTimeout(saveTO); if(now) rawSet(SAVE_KEY, JSON.stringify(SAVE)); else saveTO = setTimeout(() => rawSet(SAVE_KEY, JSON.stringify(SAVE)), 400); }
addEventListener('pagehide', () => persist(true));
let heroId = ALL_HEROES.includes(QS.get('hero')) ? QS.get('hero') : ALL_HEROES.includes(SAVE.hero) ? SAVE.hero : 'bear';
/* a few Bobo Land coins for big moments, at most COIN_CAP a day */
function worldCoins(n, why){
  if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
  const k = Math.min(n, COIN_CAP - SAVE.cd.n); if(k <= 0) return 0;
  SAVE.cd.n += k; persist();
  try{ if(window.World) World.addCoins(k, why); }catch(e){}
  return k;
}

/* ======================================================================
   Always-landscape stage (rotated layer when the phone is held upright)
   ====================================================================== */
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

/* ======================================================================
   Renderer, camera, lights
   ====================================================================== */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAXDPR = Math.min(window.devicePixelRatio || 1, 1.75);
let quality = QS.get('q') != null ? clamp(+QS.get('q') | 0, 0, 2) : 2;
function applyQuality(){
  const d = quality === 2 ? MAXDPR : quality === 1 ? Math.min(MAXDPR, 1.1) : .85;
  renderer.setPixelRatio(d);
  renderer.shadowMap.enabled = quality > 0;
  sun.castShadow = quality > 0;
  sun.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  scene.traverse(o => { if(o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  resize();
}
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, 1, .15, 900);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', () => resize());
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1.3); scene.add(hemi);
const amb = new THREE.AmbientLight(0xfff0e0, .25); scene.add(amb);
const sun = new THREE.DirectionalLight(0xffe8c8, 2.3);
sun.castShadow = true; sun.shadow.bias = -.0006; sun.shadow.normalBias = .04; sun.shadow.radius = 3;
Object.assign(sun.shadow.camera, { left:-26, right:26, top:26, bottom:-26, near:1, far:160 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();

/* ======================================================================
   Assets
   ====================================================================== */
const TX = makeTextures(THREE, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
const GEO = makeGeo(THREE);
const MD = makeModels(THREE, GEO, TX);
const WORLD = makeWorld(THREE, GEO, TX, MD, L);

/* ---------- particles: dust, sparkles, confetti ---------- */
const PMAX = 500, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12, dr:0 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff, 0xc77dff], GOLD = [0xffcf3a, 0xffe680, 0xffffff], DUST = [0xf6ead6, 0xe8d8bc, 0xffffff], SPLASH = [0xbff3ff, 0xffffff, 0x7fe0f5], POPC = [0xff8fb1, 0xffd23f, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2, life = .5, drag = 0){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = life + Math.random() * life; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav; p.dr = drag;
    pMesh.setColorAt(i, _c.set(colors[Math.floor(Math.random() * colors.length)]));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function ringDust(x, y, z, n = 14, sp = 5){ for(let k = 0; k < n; k++){ const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX; const a = k / n * 6.283; p.life = .35 + Math.random() * .2; p.x = x; p.y = y + .1; p.z = z; p.vx = Math.cos(a) * sp; p.vz = Math.sin(a) * sp; p.vy = .8; p.s = 1.6; p.g = 2; p.dr = 4; pMesh.setColorAt(i, _c.set(DUST[k % 3])); } pMesh.instanceColor.needsUpdate = true; }
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; if(p.dr){ const k = Math.exp(-p.dr * dt); p.vx *= k; p.vz *= k; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}
/* soft blob shadow under the hero (always, also when real shadows are off) */
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map:TX.blob, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-6 }));
blob.renderOrder = 6; scene.add(blob);

/* ======================================================================
   The hero (bear cub, or one of our characters wearing the star backpack)
   ====================================================================== */
const myAv = () => { try{ return window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
function makeHero(id){
  if(id === 'bear') return MD.bear({ fur:SAVE.fur, hat:SAVE.hat });
  let h; try{ h = HEROES[id](id === 'me' ? myAv() : undefined); }catch(e){ h = HEROES.sara(); }
  K.shadowHero(h);
  const root = new THREE.Group(), spin = new THREE.Group(), inner = new THREE.Group();
  spin.position.y = .6; inner.position.y = -.6; root.add(spin); spin.add(inner); inner.add(h.grp); h.grp.scale.setScalar(.95);
  const pack = MD.backpackGeo(); pack.position.set(0, .64, -.22); pack.rotation.y = Math.PI; pack.scale.setScalar(.8); h.body.add(pack);
  return { grp:root, spin, kit:h, kind:'kit', top:1.3 };
}
function poseAny(h, s){
  if(h.kind === 'bear'){ MD.poseBear(h, s); return; }
  poseHero(h.kit, { t:s.t, dt:s.dt, run:s.run, grounded:!s.air, vy:s.vy, sq:0, flip:0 });
  h.spin.scale.set(1 - s.sq * .5, 1 + s.sq, 1 - s.sq * .5);
  h.spin.rotation.x = s.flip > 0 ? (1 - s.flip) * Math.PI * 2 : 0;
  h.spin.rotation.y = s.spin > 0 ? (1 - s.spin) * Math.PI * 4 : 0;
}
let hero = null;
function setHero(id){
  heroId = ALL_HEROES.includes(id) ? id : 'bear';
  if(hero) scene.remove(hero.grp);
  hero = makeHero(heroId); scene.add(hero.grp);
  if(P.ride && cannonObj) placeRider();
}
function refreshLook(){ if(heroId === 'bear') setHero('bear'); }

/* ======================================================================
   Places and what is in them
   ====================================================================== */
let AR = null;           // the current area (world data)
let RT = null;           // runtime objects for the current area
const COIN_GEO = MD.coinGeo, COIN_MAT = MD.coinMat;
const glintMat = new THREE.SpriteMaterial({ map:TX.glint, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
const glints = []; for(let i = 0; i < 6; i++){ const s = new THREE.Sprite(glintMat.clone()); s.visible = false; s.renderOrder = 8; scene.add(s); glints.push({ s, t:0 }); }
function markSprite(text, bg){ const c = TX.cv(128, 128, (x) => { x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.fill(); x.lineWidth = 8; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.font = '800 78px Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 70); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.SpriteMaterial({ map:t, depthTest:false, transparent:true }); }
const MARK_EX = markSprite('!', '#ffb43d'), MARK_Q = markSprite('?', '#3fbf4a');
function iconSprite(emoji, ring){ const c = TX.cv(128, 128, (x) => { x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(64, 64, 58, 0, 7); x.fill(); x.lineWidth = 7; x.strokeStyle = ring; x.stroke(); x.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 64, 70); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, transparent:true })); return s; }

const ENEMY_SCORE = { mouse:3, ball:3, soldier:4 };
function buildRuntime(A){
  const R = { coins:[], coinMesh:null, buttons:[], enemies:[], npcs:[], pads:[], doors:[], checks:[], crates:[], bells:[], drum:null, cannon:null, balls:[], flying:[] };
  const grp = new THREE.Group(); A.group.add(grp); R.grp = grp;
  /* coins (instanced): those already collected stay gone */
  const got = new Set(SAVE.got[A.id] || []);
  R.coins = A.coins.map((c, i) => ({ i, x:c[0], y:c[1], z:c[2], on:!got.has(i) }));
  R.coinMesh = new THREE.InstancedMesh(COIN_GEO, COIN_MAT, Math.max(1, R.coins.length)); R.coinMesh.castShadow = true; R.coinMesh.frustumCulled = false; grp.add(R.coinMesh);
  /* coins that fly out of popped toys / crates (pool) */
  R.flyMesh = new THREE.InstancedMesh(COIN_GEO, COIN_MAT, 40); R.flyMesh.frustumCulled = false; grp.add(R.flyMesh);
  for(let i = 0; i < 40; i++) R.flying.push({ on:false, x:0, y:0, z:0, vx:0, vy:0, vz:0, t:0 });
  /* golden buttons */
  for(const b of A.buttons){ if(SAVE.btn.includes(b.id)) continue; const m = new THREE.Mesh(MD.buttonGeo, COIN_MAT); m.position.set(b.x, b.y, b.z); m.scale.setScalar(1.6); m.castShadow = true; grp.add(m);
    const g = new THREE.Sprite(new THREE.SpriteMaterial({ map:TX.glint, color:0xffd86a, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:.8 })); g.scale.set(3.4, 3.4, 1); g.position.copy(m.position); grp.add(g);
    R.buttons.push({ def:b, m, g }); }
  /* enemies */
  for(const d of A.enemies){ const e = MD.enemy(d.kind); grp.add(e.grp); e.grp.traverse(o => { if(o.isMesh) o.castShadow = true; });
    R.enemies.push({ d, m:e, u:Math.random(), dir:1, alive:true, back:0, x:d.path[0][0], z:d.path[0][1], y:0, f:0, t:Math.random() * 5, hitT:0 }); }
  /* villagers */
  for(const d of A.npcs){ const n = MD.animal(d.kind); n.grp.position.set(d.x, d.y, d.z); n.grp.rotation.y = d.f; grp.add(n.grp); n.grp.traverse(o => { if(o.isMesh) o.castShadow = true; });
    const mk = new THREE.Sprite(MARK_EX); mk.scale.set(.9, .9, 1); mk.position.set(d.x, d.y + n.top + .8, d.z); grp.add(mk);
    A.col(d.x - .55, d.y, d.z - .55, d.x + .55, d.y + n.top - .2, d.z + .55, { cam:false });
    R.npcs.push({ d, m:n, mk, t:Math.random() * 4 }); }
  /* launch pads (velocity precomputed by simulating the real jump physics) */
  for(const d of A.pads){ const p = MD.pad(); p.grp.position.set(d.x, d.y, d.z); grp.add(p.grp); p.grp.traverse(o => { if(o.isMesh) o.receiveShadow = true; });
    const pc = A.col(d.x - 1.15, d.y, d.z - 1.15, d.x + 1.15, d.y + .66, d.z + 1.15, { cam:false });
    const v = padVelocity(d); if(d.to){ const a = Math.atan2(d.to[0] - d.x, d.to[2] - d.z); p.top.rotation.y = a; }
    const rec = { d, m:p, v, sq:0 }; pc.pad = rec; R.pads.push(rec); }
  /* doors: glowing icon + name */
  for(const d of A.doors){ const s = iconSprite(d.icon, '#ffc23d'); s.scale.set(1.5, 1.5, 1); s.position.set(d.x, d.y + 3.6, d.z); grp.add(s);
    const ring = new THREE.Mesh(new THREE.RingGeometry(d.r * .7, d.r, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffd23f, transparent:true, opacity:.55, depthWrite:false }));
    ring.position.set(d.x, d.y + .06, d.z); grp.add(ring); R.doors.push({ d, s, ring }); }
  /* checkpoint flags */
  for(const c of A.checks){ const f = MD.flagPole(); f.position.set(c.x, c.y, c.z); grp.add(f); R.checks.push({ c, m:f, on:false }); }
  /* floor crates (ground pound / cannon ball opens them) */
  for(const c of A.crates){ const m = MD.crate(); m.scale.setScalar(1.4); m.position.set(c.x, c.y, c.z); grp.add(m); const col = A.col(c.x - .84, c.y, c.z - .84, c.x + .84, c.y + 1.68, c.z + .84, { cam:false }); R.crates.push({ c, m, col, on:true }); }
  /* bells for the toy cannon */
  for(let i = 0; i < A.bells.length; i++){ const b = A.bells[i], m = MD.bell(); m.scale.setScalar(1.3); m.position.set(b.x, b.y, b.z); grp.add(m);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 30 - b.y), new THREE.MeshLambertMaterial({ color:0xfff6e0 })); str.position.set(b.x, (30 + b.y) / 2 + 1.4, b.z); grp.add(str);
    R.bells.push({ b, m, i, sw:0, rung:SAVE.bells.includes(i) }); }
  /* the lost toy drum (on top of the fridge) */
  if(A.props.drumAt && !SAVE.drum){ const d = MD.drum(); d.position.set(...A.props.drumAt); d.scale.setScalar(1.4); grp.add(d); R.drum = d; }
  /* the wind-up toy cannon */
  if(A.props.cannonAt){ const c = MD.cannon(); const [x, y, z, f] = A.props.cannonAt; c.grp.position.set(x, y, z); c.grp.rotation.y = f; grp.add(c.grp); c.grp.traverse(o => { if(o.isMesh) o.castShadow = true; });
    R.cannon = { m:c, x, y, z, f, col:A.col(x - 1.1, y, z - 1.1, x + 1.1, y + 1.2, z + 1.1, { cam:false }) };
    const hint = iconSprite('🎯', '#3a7fd8'); hint.scale.set(1.6, 1.6, 1); hint.position.set(x, y + 3.6, z); grp.add(hint); R.cannon.icon = hint; }
  /* soft balls (pool) */
  const bm = new THREE.MeshLambertMaterial({ color:0xffffff });
  for(let i = 0; i < 8; i++){ const m = new THREE.Mesh(new THREE.SphereGeometry(.42, 14, 10), bm.clone()); m.visible = false; m.castShadow = true; grp.add(m); R.balls.push({ m, on:false, x:0, y:0, z:0, vx:0, vy:0, vz:0, t:0 }); }
  return R;
}
let cannonObj = null;
function loadArea(id, at, keepPos){
  if(AR){ scene.remove(AR.group); if(RT && RT.grp) AR.group.remove(RT.grp); for(const c of AR.cols.splice(AR.baseCols)) void c; }
  AR = WORLD.get(id);
  if(AR.baseCols == null) AR.baseCols = AR.cols.length;
  AR.cols.length = AR.baseCols;
  scene.add(AR.group);
  RT = buildRuntime(AR);
  cannonObj = RT.cannon;
  const S = AR.sun;
  sun.color.set(S.col); sun.intensity = S.int; hemi.color.set(S.hemi[0]); hemi.groundColor.set(S.hemi[1]); hemi.intensity = S.hemi[2];
  _v.set(...S.dir).normalize(); sunDir.copy(_v);
  scene.background = new THREE.Color(S.bg);
  scene.fog = S.fog ? new THREE.Fog(S.fog[0], S.fog[1], S.fog[2]) : null;
  camera.far = id === 'hub' ? 900 : 260; camera.updateProjectionMatrix();
  if(!keepPos){
    const sp = AR.spawns[at] || AR.spawns.start;
    placeAt(sp[0], sp[1], sp[2], sp[3]);
    checkpoint = { a:id, x:sp[0], y:sp[1], z:sp[2], f:sp[3] };
  }
  SAVE.area = id; persist();
  roomNow = ''; doorLock = 1.2;
  if(P.ride){ P.ride = false; }
  hudKey = '';
}
const sunDir = new THREE.Vector3(1, 1, 0);

/* ======================================================================
   Jump physics — the heart of the game
   ====================================================================== */
const RUN = 7.6, RIDE_SPEED = 8.5, PR = .34, PH = 1.15;
const JUMP_V = 12.3, DJUMP_V = 11, G_UP_HOLD = 30, G_UP_REL = 78, G_APEX = .55, G_FALL = 50, MAX_FALL = 32, APEX_V = 2.6;
const COYOTE = .12, BUFFER = .12, STOMP_V = 13.5, POUND_V = -30;
const P = { x:0, y:0, z:0, vx:0, vz:0, vy:0, f:0, gr:true, t:0, sq:0, sqv:0, lastGround:0, jumpT:-1, holdJ:false, jumps:0, flip:0, spin:0, spinCd:0, pound:0, poundHold:0,
  launch:0, on:null, inv:0, swim:false, ride:false, prevY:0, airT:0, fallMax:0, knock:0 };
let simT = 0, checkpoint = null, lives = 5;
function placeAt(x, y, z, f = 0){ Object.assign(P, { x, y, z, vx:0, vz:0, vy:0, f, gr:true, launch:0, on:null, flip:0, spin:0, pound:0, swim:false, knock:0 }); cam.yaw = f + Math.PI; cam.tx = x; cam.ty = y + 1.3; cam.tz = z; cam.snap = true; }
/* gravity for a vertical speed: strong when the button is let go early, softer at the top, faster on the way down */
function gravity(vy, hold){
  if(vy > APEX_V) return hold ? G_UP_HOLD : G_UP_REL;
  if(vy > -APEX_V) return G_UP_HOLD * G_APEX;
  return G_FALL;
}
/* launch pad velocity: straight up (d.up) or aimed at d.to — the flight time comes from the same gravity as the real jump */
function padVelocity(d){
  const DT = 1 / 240;
  if(!d.to){ return { vx:0, vy:Math.sqrt(2 * G_UP_HOLD * (d.up || 12)), vz:0 }; }
  const [tx, ty, tz] = d.to, py = d.y + .66, apex = Math.max(ty, py) + 3.2 + Math.hypot(tx - d.x, tz - d.z) * .06;
  const vy = Math.sqrt(2 * G_UP_HOLD * (apex - py)) * 1.02;
  let y = py, v = vy, t = 0;
  while(t < 8){ v -= gravity(v, true) * DT; v = Math.max(v, -MAX_FALL); y += v * DT; t += DT; if(v < 0 && y <= ty + .05) break; }
  return { vx:(tx - d.x) / t, vy, vz:(tz - d.z) / t };
}
/* colliders near the hero (refreshed every frame) */
let near = [];
function gatherNear(){
  near.length = 0; const R = 14;
  for(const c of AR.cols){ if(c.off) continue; if(c.x1 > P.x - R && c.x0 < P.x + R && c.z1 > P.z - R && c.z0 < P.z + R && c.y1 > P.y - 30 && c.y0 < P.y + 30) near.push(c); }
  for(const c of AR.dyn) near.push(c);
}
function hitsXZ(c, x, z, r){ return x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1; }
function groundAt(x, z){ return AR.ground ? AR.ground(x, z) : -50; }
function stepPhysics(dt){
  const r = P.ride ? .95 : PR, h = P.ride ? 2.0 : PH;
  const step = P.gr ? .55 : (P.vy <= 0 ? .4 : .06);
  // --- X ---
  P.x += P.vx * dt;
  for(const c of near){ if(c.y1 <= P.y + step || c.y0 >= P.y + h) continue; if(!hitsXZ(c, P.x, P.z, r)) continue;
    if(P.vx > 0) P.x = c.x0 - r - .001; else if(P.vx < 0) P.x = c.x1 + r + .001; else { const a = c.x1 - (P.x - r), b = (P.x + r) - c.x0; P.x += a < b ? a : -b; } }
  // --- Z ---
  P.z += P.vz * dt;
  for(const c of near){ if(c.y1 <= P.y + step || c.y0 >= P.y + h) continue; if(!hitsXZ(c, P.x, P.z, r)) continue;
    if(P.vz > 0) P.z = c.z0 - r - .001; else if(P.vz < 0) P.z = c.z1 + r + .001; else { const a = c.z1 - (P.z - r), b = (P.z + r) - c.z0; P.z += a < b ? a : -b; } }
  // --- Y ---
  const hold = P.holdJ || P.launch > 0 || P.bounceHold > 0;
  if(P.pound > 0){ P.pound -= dt; P.vy = P.pound > 0 ? 1.5 : POUND_V; }
  else if(!P.gr || P.vy > 0) P.vy = Math.max(-MAX_FALL, P.vy - gravity(P.vy, hold) * dt);
  const y0 = P.y; P.y += P.vy * dt;
  let land = null, landY = -1e9;
  const wasGr = P.gr;
  if(P.vy <= 0){
    const snap = wasGr ? .55 : 0;
    for(const c of near){ if(!hitsXZ(c, P.x, P.z, r * .85)) continue; if(c.y1 <= y0 + .05 + (wasGr ? .05 : 0) && c.y1 >= P.y - snap && c.y1 > landY){ landY = c.y1; land = c; } }
    const g = groundAt(P.x, P.z); if(g > landY && g >= P.y - (wasGr ? .6 : 0)){ landY = g; land = 'g'; }
  } else {
    for(const c of near){ if(!hitsXZ(c, P.x, P.z, r * .85)) continue; if(c.y0 >= y0 + h - .05 && c.y0 < P.y + h){ P.y = c.y0 - h; P.vy = 0; } }
    const g = groundAt(P.x, P.z); if(P.y < g){ P.y = g; }
  }
  // water: float at the surface
  P.swim = false;
  for(const w of AR.water){ if(P.x > w.x0 && P.x < w.x1 && P.z > w.z0 && P.z < w.z1 && P.y < w.y - .55 && (!land || landY < w.y - .55)){ if(P.vy < 0 && !P.swimWas) splash(); P.y = Math.max(P.y, w.y - .75); if(P.vy < 0) P.vy *= .5; if(P.y <= w.y - .7){ P.y = w.y - .75; P.vy = Math.max(P.vy, 0); } P.swim = true; land = null; } }
  P.swimWas = P.swim;
  if(land){ onLand(land, landY); }
  else if(P.swim){ P.gr = true; P.lastGround = simT; P.on = null; P.jumps = 0; }
  else { if(P.gr) P.lastGround = simT; P.gr = false; P.on = null; }
}
function onLand(c, y){
  const fall = -P.vy;
  P.y = y;
  const pounded = P.pound < 0 || (P.pound <= 0 && P.vy <= POUND_V + 1 && P.pounding);
  if(c !== 'g' && c.b && fall > 3 && !P.ride){ // bouncy furniture
    P.vy = c.b + (P.holdJ ? 2.5 : 0) + (pounded ? 4 : 0); P.gr = false; P.jumps = 1; P.flip = 0; P.bounceHold = .25; P.pounding = false; P.pound = 0;
    P.sq = -.35; SFX.bounce(); burst(P.x, y + .1, P.z, 8, DUST, 3, 1.2, 4, 1); cam.bump = .25; return;
  }
  if(!P.gr){
    const k = clamp(fall / 25, 0, 1);
    P.sq = -(.12 + k * .3);
    if(fall > 7){ ringDust(P.x, y, P.z, 10 + Math.round(k * 8), 3 + k * 4); SFX.land(k); }
    if(P.pounding){ groundPound(y); }
    P.launch = 0; P.flip = 0;
  }
  P.gr = true; P.vy = 0; P.lastGround = simT; P.jumps = 0; P.on = c === 'g' ? null : c; P.pounding = false; P.pound = 0;
  if(c !== 'g' && c.pad && !P.ride) launchPad(c.pad);
}
function splash(){ burst(P.x, P.y + .6, P.z, 16, SPLASH, 4, 1.1, 12, 3); SFX.splash(); }
function doJump(){
  const fromGround = P.gr || simT - P.lastGround < COYOTE;
  if(P.ride){ if(fromGround){ P.vy = 10.5; P.gr = false; P.lastGround = -9; SFX.jump(); P.sq = .3; } return true; }
  if(fromGround && P.jumps === 0){
    const b = P.on && P.on.b ? P.on.b : 0;
    P.vy = Math.max(JUMP_V, b ? b + 1 : 0) + (P.on && P.on.dy > 0 ? P.on.dy * 30 : 0);
    P.gr = false; P.jumps = 1; P.lastGround = -9; P.sq = .28; P.on = null;
    if(P.swim){ P.vy = 11.5; splash(); }
    SFX.jump(); burst(P.x, P.y + .05, P.z, 5, DUST, 2, .9, 3, .5);
    return true;
  }
  if(P.jumps < 2 && !P.swim){
    P.vy = DJUMP_V; P.jumps = 2; P.flip = 1; P.sq = .2; P.launch = 0; SFX.djump();
    burst(P.x, P.y + .4, P.z, 10, [0xffffff, 0xfff3b0, 0xbfe6ff], 2.5, .9, 2, .3);
    stats.dj++;
    return true;
  }
  return false;
}
function launchPad(pd){
  P.x = pd.d.x; P.z = pd.d.z; P.vx = pd.v.vx; P.vz = pd.v.vz; P.vy = pd.v.vy; P.gr = false; P.jumps = 1; P.launch = 1; P.on = null; P.lastGround = -9; P.sq = .45; P.flip = 0;
  pd.sq = 1; SFX.boing(); cam.bump = .35; stats.pads++;
  burst(pd.d.x, pd.d.y + .8, pd.d.z, 18, [0xffd23f, 0xffffff, 0x5ed67a], 5, 1, 8, 3);
  if(pd.v.vx || pd.v.vz) P.f = Math.atan2(pd.v.vx, pd.v.vz);
}
function startSpin(){ if(P.spinCd > 0) return; P.spin = 1; P.spinCd = .55; SFX.spin(); stats.spins++; }
function startPound(){ if(P.pound > 0 || P.pounding) return; P.pound = .16; P.pounding = true; P.flip = 0; P.vx *= .2; P.vz *= .2; SFX.pound(); }
function groundPound(y){
  SFX.thud(); cam.shake = .45; ringDust(P.x, y, P.z, 20, 7);
  stats.pounds++;
  for(const e of RT.enemies){ if(!e.alive) continue; if(Math.hypot(e.x - P.x, e.z - P.z) < 3 && Math.abs(e.y - y) < 2.5) popEnemy(e); }
  for(const c of RT.crates){ if(!c.on) continue; if(Math.hypot(c.c.x - P.x, c.c.z - P.z) < 2.6 && Math.abs(c.c.y + 1.68 - y) < 2.4) breakCrate(c); }
}

/* ======================================================================
   Input: joystick (left), camera drag (right), A / B / talk buttons, keyboard
   ====================================================================== */
const touch = $('#touch'), joyEl = $('#joy'), knob = $('#knob');
const aBtn = $('#btnA'), bBtn = $('#btnB'), talkBtn = $('#btnTalk'), exitBtn = $('#btnExit');
const joy = { id:null, x:0, y:0, ox:0, oy:0 }, look = { id:null, x:0, y:0 };
const keys = {};
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(90, SAL + 84), SH - Math.max(96, SH * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state !== 'play') return;
  if(dlg.open){ nextDlg(); return; }
  if(p.x < SW * .42 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .42); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.x = p.x; look.y = p.y; }
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.25, .55); look.x = p.x; look.y = p.y; cam.lookT = performance.now(); }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){ look.id = null; cam.lookT = performance.now(); }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function holdBtn(btn, down, up){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); down(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => { if(btn.classList.contains('on') && up) up(); btn.classList.remove('on'); }));
}
const pressA = () => { if(state !== 'play') return; if(dlg.open){ nextDlg(); return; } P.jumpT = simT; P.holdJ = true; };
const releaseA = () => { P.holdJ = false; };
const pressB = () => { if(state !== 'play' || dlg.open) return; wantB = true; };
let wantB = false;
holdBtn(aBtn, pressA, releaseA);
holdBtn(bBtn, pressB);
holdBtn(talkBtn, () => { if(state === 'play') doAction(); });
holdBtn(exitBtn, () => { if(state === 'play' && P.ride) dismount(); });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'play') e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'Space' || e.code === 'KeyJ'){ pressA(); e.preventDefault(); }
    if(e.code === 'KeyK' || e.code === 'ShiftLeft' || e.code === 'KeyX'){ pressB(); e.preventDefault(); }
    if(e.code === 'KeyF' || e.code === 'Enter' || e.code === 'KeyT'){ if(dlg.open) nextDlg(); else doAction(); }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; if(e.code === 'Space' || e.code === 'KeyJ') releaseA(); });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; P.holdJ = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; P.holdJ = false; wantB = false; }
const inp = { x:0, z:0, m:0 };
let testInput = null, testGo = null;
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(dlg.open){ ix = iy = 0; }
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  if(testGo){ const dx = testGo.x - P.x, dz = testGo.z - P.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    if(l < (testGo.r || .5)){ testGo = null; ix = iy = 0; }
    else { const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw); ix = ux * rx + uz * rz; iy = -(ux * fx + uz * fz); } }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}

/* ======================================================================
   Camera: low behind the hero (furniture looks GIANT), smooth lag, pulls back during launches
   ====================================================================== */
const cam = { yaw:Math.PI, pAdj:0, lookT:0, tx:0, ty:0, tz:0, dist:6.2, shake:0, bump:0, snap:true, px:0, py:0, pz:0 };
const _ray = new THREE.Vector3();
function rayBox(ox, oy, oz, dx, dy, dz, c){
  let tmin = 0, tmax = 1;
  for(const [o, d, a, b] of [[ox, dx, c.x0, c.x1], [oy, dy, c.y0, c.y1], [oz, dz, c.z0, c.z1]]){
    if(Math.abs(d) < 1e-6){ if(o < a || o > b) return 2; continue; }
    let t1 = (a - o) / d, t2 = (b - o) / d; if(t1 > t2){ const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if(tmin > tmax) return 2;
  }
  return tmin;
}
function updateCamera(dt){
  const kxz = 1 - Math.exp(-dt * (cam.snap ? 1e3 : 9)), ky = 1 - Math.exp(-dt * (cam.snap ? 1e3 : P.gr ? 7 : 3.2));
  cam.tx = lerp(cam.tx, P.x, kxz); cam.tz = lerp(cam.tz, P.z, kxz); cam.ty = lerp(cam.ty, P.y + 1.3, ky);
  // auto-follow behind the hero while moving (unless the kid turned the camera a moment ago)
  if(performance.now() - cam.lookT > 2200 && inp.m > .2 && !testGo){ const want = P.f + Math.PI; cam.yaw += angDiff(want, cam.yaw) * (1 - Math.exp(-dt * 1.1)) * inp.m; }
  if(testGo){ const want = P.f + Math.PI; cam.yaw += angDiff(want, cam.yaw) * (1 - Math.exp(-dt * 3)); }
  const wantD = camOverride || (P.launch > 0 ? 8.5 : P.ride ? 7 : AR.id === 'hub' ? 5.6 : 4.8) + cam.bump * 4;
  cam.dist = lerp(cam.dist, wantD, 1 - Math.exp(-dt * (wantD > cam.dist ? 3 : 1.5)));
  cam.bump = Math.max(0, cam.bump - dt);
  const pitch = .2 + cam.pAdj + (P.launch > 0 ? .1 : 0);
  let dx = Math.sin(cam.yaw) * Math.cos(pitch) * cam.dist, dz = Math.cos(cam.yaw) * Math.cos(pitch) * cam.dist, dy = Math.sin(pitch) * cam.dist;
  // keep the camera inside the room (shorten the ray at walls)
  let tHit = 1;
  for(const c of AR.cols){ if(!c.cam || c.off) continue; if(c.x1 < cam.tx - 16 || c.x0 > cam.tx + 16 || c.z1 < cam.tz - 16 || c.z0 > cam.tz + 16) continue; const t = rayBox(cam.tx, cam.ty, cam.tz, dx, dy, dz, c); if(t < tHit) tHit = t; }
  if(tHit < 1){ const k = Math.max(.12, tHit - .35 / cam.dist); dx *= k; dz *= k; dy *= k; }
  let cy = cam.ty + dy; if(AR.ground){ cy = Math.max(cy, AR.ground(cam.tx + dx, cam.tz + dz) + .6); }
  const sh = cam.shake > 0 ? cam.shake * .25 : 0; cam.shake = Math.max(0, cam.shake - dt * 1.6);
  camera.position.set(cam.tx + dx + (Math.random() - .5) * sh, cy + (Math.random() - .5) * sh, cam.tz + dz + (Math.random() - .5) * sh);
  camera.lookAt(cam.tx, cam.ty + .2, cam.tz);
  cam.snap = false;
  // sun + shadow box follow the hero
  sun.target.position.set(P.x, P.y, P.z); sun.position.set(P.x + sunDir.x * 60, P.y + sunDir.y * 60, P.z + sunDir.z * 60);
}

/* ======================================================================
   The hero each frame
   ====================================================================== */
const stats = { dj:0, pads:0, spins:0, pounds:0, stomps:0, bounces:0, hurt:0 };
function stepHero(dt){
  readInput(dt);
  // carried by moving platforms (train cars, duck, boat, soap)
  if(P.on && P.on.dx !== undefined){ P.x += P.on.dx; P.z += P.on.dz; P.on.dx = 0; P.on.dz = 0; }
  const spd = (P.ride ? RIDE_SPEED : RUN) * (P.swim ? .6 : 1);
  const tx = inp.x * spd, tz = inp.z * spd;
  if(P.knock > 0){ P.knock -= dt; }
  else if(P.launch > 0){ // flying from a pad: keep the aimed speed, steer a little
    if(inp.m > 0){ const k = 1 - Math.exp(-dt * 1.6); P.vx += (tx - P.vx) * k * .6; P.vz += (tz - P.vz) * k * .6; }
  } else if(P.pound > 0 || P.pounding){ P.vx *= Math.exp(-dt * 8); P.vz *= Math.exp(-dt * 8); }
  else {
    const slip = P.on && P.on.slip;
    const k = 1 - Math.exp(-dt * (P.gr ? (slip ? 2.2 : 16) : 7.5));
    P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  }
  if(inp.m > .05 && P.knock <= 0){ const want = Math.atan2(inp.x, inp.z); P.f += angDiff(want, P.f) * (1 - Math.exp(-dt * (P.ride ? 6 : 14))); }
  else if(P.launch > 0 && Math.hypot(P.vx, P.vz) > 1) P.f += angDiff(Math.atan2(P.vx, P.vz), P.f) * (1 - Math.exp(-dt * 6));
  // jump buffer + coyote time
  if(P.jumpT >= 0 && simT - P.jumpT < BUFFER){ if(doJump()) P.jumpT = -1; }
  else if(P.jumpT >= 0 && simT - P.jumpT >= BUFFER) P.jumpT = -1;
  if(wantB){ wantB = false; if(P.ride) shootBall(); else if(P.gr || P.swim) startSpin(); else startPound(); }
  // fixed physics substeps
  P.prevY = P.y; P.vyPrev = P.vy; const wasGr = P.gr;
  gatherNear();
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), sdt = dt / n;
  for(let i = 0; i < n; i++){ simT += sdt; stepPhysics(sdt); }
  if(!P.gr){ P.airT += dt; } else P.airT = 0;
  if(P.gr && !wasGr && P.launch > 0) P.launch = 0;
  if(P.launch > 0 && Math.random() < dt * 40) burst(P.x, P.y + .6, P.z, 1, [0xffe27a, 0xffffff, 0xff8fb1], .6, 1, 0, 0, .5);
  P.bounceHold = Math.max(0, (P.bounceHold || 0) - dt);
  P.spin = Math.max(0, P.spin - dt / .45); P.spinCd = Math.max(0, P.spinCd - dt);
  P.flip = Math.max(0, P.flip - dt / .42);
  // squash & stretch spring
  for(let i = 0; i < n; i++){ P.sqv += (-P.sq * 260 - P.sqv * 16) * sdt; P.sq += P.sqv * sdt; }
  if(!P.gr && P.vy > 2) P.sq = Math.max(P.sq, .1);
  P.inv = Math.max(0, P.inv - dt);
  // fell out of the world?
  if(P.y < (AR.ground ? -12 : -6)){ hurt(true); }
}
function drawHero(t, dt){
  if(!hero) return;
  const g = hero.grp;
  if(P.ride && cannonObj){ placeRider(); }
  else { g.position.set(P.x, P.y, P.z); g.rotation.y = P.f; }
  const run = clamp(Math.hypot(P.vx, P.vz) / RUN, 0, 1);
  poseAny(hero, { t, dt, run, air:!P.gr && !P.swim, vy:P.vy, sq:clamp(P.sq, -.4, .5), flip:P.flip, spin:P.spin, pound:P.pound > 0 || P.pounding, ride:P.ride });
  g.visible = !(P.inv > 0 && Math.floor(P.inv * 12) % 2 === 0);
  // blob shadow on the surface below
  let gy = groundAt(P.x, P.z); for(const c of near){ if(hitsXZ(c, P.x, P.z, .1) && c.y1 <= P.y + .1 && c.y1 > gy) gy = c.y1; }
  const hgt = P.y - gy, s = clamp(1.1 - hgt * .05, .4, 1.1) * (P.ride ? 2.4 : 1);
  blob.position.set(P.x, gy + .02, P.z); blob.scale.set(s, 1, s); blob.material.opacity = clamp(1 - hgt * .06, .25, 1);
}

/* ======================================================================
   Collectibles, enemies, pads, doors, checkpoints
   ====================================================================== */
let coinBump = 0;
function addCoins(n){ SAVE.coins += n; SAVE.total += n; persist(); coinBump = .3; hudKey = ''; }
function collectCoin(c){
  c.on = false; const arr = SAVE.got[AR.id] || (SAVE.got[AR.id] = []); arr.push(c.i);
  addCoins(1); SFX.coin(); burst(c.x, c.y, c.z, 6, GOLD, 2.5, .8, 4, 1, .35);
}
function spawnFlyCoins(x, y, z, n){
  let k = 0; for(const f of RT.flying){ if(f.on) continue; const a = Math.random() * 6.28, sp = 2 + Math.random() * 2.5; Object.assign(f, { on:true, x, y:y + .5, z, vx:Math.cos(a) * sp, vz:Math.sin(a) * sp, vy:7 + Math.random() * 3, t:0 }); if(++k >= n) break; }
}
function popEnemy(e, by){
  if(!e.alive) return;
  e.alive = false; e.back = 25; e.m.grp.visible = false;
  burst(e.x, e.y + .6, e.z, 22, POPC, 5, 1.2, 10, 3); burst(e.x, e.y + .6, e.z, 10, [0xffffff], 3, 1.6, 2, 1, .4, 3);
  SFX.pop(); spawnFlyCoins(e.x, e.y + .5, e.z, ENEMY_SCORE[e.d.kind] || 3);
  SAVE.pops++; persist(); hudKey = '';
  popText('💥 ' + L('بوب!', 'Pop!', 'Pat!'));
  void by;
}
function breakCrate(c){
  c.on = false; c.m.visible = false; c.col.off = true;
  burst(c.c.x, c.c.y + 1, c.c.z, 18, [0xc98a4b, 0xe8c48a, 0x8a5a2e], 5, 1.2, 12, 3); SFX.crate(); spawnFlyCoins(c.c.x, c.c.y + 1, c.c.z, 5);
}
function hurt(fall){
  if(P.inv > 0 && !fall) return;
  lives--; stats.hurt++; hudKey = ''; SFX.hurt(); cam.shake = .3;
  const lb = $('#hudLives'); lb.classList.remove('hit'); void lb.offsetWidth; lb.classList.add('hit');
  if(lives <= 0 || fall){
    if(lives <= 0){ lives = 5; popText('🔄 ' + L('رجعنا لآخر علم!', 'Back to the last flag!', 'Son bayrağa döndük!')); }
    respawn(); return;
  }
  P.inv = 2; P.knock = .35;
}
function respawn(){
  const c = checkpoint; fadeTo(() => { if(c.a !== AR.id) loadArea(c.a, null, true); placeAt(c.x, c.y, c.z, c.f); P.inv = 1.5; });
}
function updateWorld(t, dt){
  for(const f of AR.tick) f(t, dt);
  const R = RT;
  // coins
  const ct = t * 3.2;
  for(let i = 0; i < R.coins.length; i++){
    const c = R.coins[i];
    if(c.on){ const d2 = (c.x - P.x) ** 2 + (c.z - P.z) ** 2, dy = c.y - (P.y + .6); if(d2 < (P.ride ? 2.2 : 1.1) && Math.abs(dy) < (P.ride ? 1.6 : 1.1)) collectCoin(c); }
    const s = c.on ? 1 : 0;
    _m.compose(_v.set(c.x, c.y + Math.sin(t * 2 + i) * .08, c.z), _q.setFromEuler(_e.set(0, ct + i * .3, 0)), _s.set(s, s, s)); R.coinMesh.setMatrixAt(i, _m);
  }
  R.coinMesh.instanceMatrix.needsUpdate = true;
  // glints on coins near the camera
  for(const g of glints){
    if(g.t > 0){ g.t -= dt; const k = Math.sin(clamp(g.t / .5, 0, 1) * Math.PI); g.s.material.opacity = k; g.s.scale.setScalar(.4 + k * .6); if(g.t <= 0) g.s.visible = false; continue; }
    if(Math.random() < dt * 2.5 && R.coins.length){ const c = R.coins[Math.floor(Math.random() * R.coins.length)]; const dc = (c.x - camera.position.x) ** 2 + (c.y - camera.position.y) ** 2 + (c.z - camera.position.z) ** 2; if(c.on && dc > 25 && dc < 900){ g.s.position.set(c.x + .2, c.y + .2, c.z); g.s.visible = true; g.t = .5; } }
  }
  // flying coins: arc, land, then home in
  for(let i = 0; i < R.flying.length; i++){
    const f = R.flying[i];
    if(f.on){ f.t += dt; const dx = P.x - f.x, dz = P.z - f.z, dy = P.y + .6 - f.y, d = Math.hypot(dx, dy, dz);
      if(f.t > .55){ const k = 1 - Math.exp(-dt * 6); f.vx = lerp(f.vx, dx / d * 16, k); f.vy = lerp(f.vy, dy / d * 16, k); f.vz = lerp(f.vz, dz / d * 16, k); }
      else f.vy -= 22 * dt;
      f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt;
      if(d < 1 || f.t > 3){ f.on = false; addCoins(1); SFX.coin(); } }
    const s = f.on ? .8 : 0; _m.compose(_v.set(f.x, f.y, f.z), _q.setFromEuler(_e.set(0, t * 8, 0)), _s.set(s, s, s)); R.flyMesh.setMatrixAt(i, _m);
  }
  let fc = 0; for(let i = 0; i < R.flying.length; i++) if(R.flying[i].on) fc = i + 1; R.flyMesh.count = fc;
  R.flyMesh.instanceMatrix.needsUpdate = true;
  // golden buttons
  for(const b of R.buttons){
    if(!b.m.visible) continue;
    b.m.rotation.y = t * 2; b.m.position.y = b.def.y + Math.sin(t * 2.5) * .15; b.g.material.opacity = .55 + Math.sin(t * 4) * .25;
    if(Math.hypot(b.def.x - P.x, b.def.z - P.z) < 1.2 && Math.abs(b.def.y - (P.y + .6)) < 1.4) gotButton(b);
  }
  // enemies
  for(const e of R.enemies){
    if(!e.alive){ e.back -= dt; if(e.back <= 0 && Math.hypot(e.x - P.x, e.z - P.z) > 14){ e.alive = true; e.m.grp.visible = true; } continue; }
    e.t += dt; const [a, b] = e.d.path, len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    e.u += e.dir * e.d.sp * dt / len * enemySpeed; if(e.u > 1){ e.u = 1; e.dir = -1; } if(e.u < 0){ e.u = 0; e.dir = 1; }
    e.x = lerp(a[0], b[0], e.u); e.z = lerp(a[1], b[1], e.u);
    e.y = e.d.y != null ? e.d.y : groundAt(e.x, e.z);
    const fw = Math.atan2((b[0] - a[0]) * e.dir, (b[1] - a[1]) * e.dir); e.f += angDiff(fw, e.f) * (1 - Math.exp(-dt * 6));
    let yo = 0;
    if(e.d.kind === 'ball'){ yo = Math.abs(Math.sin(e.t * 3.2)) * 1.6; const sq = 1 - Math.max(0, .25 - yo) * 1.2; e.m.body.scale.set(2 - sq, sq, 2 - sq); }
    else if(e.d.kind === 'mouse'){ e.m.body.rotation.z = Math.sin(e.t * 14) * .06; if(e.m.extra) e.m.extra.rotation.z = e.t * 4; }
    else { e.m.body.rotation.z = Math.sin(e.t * 5) * .1; e.m.body.position.y = Math.abs(Math.sin(e.t * 5)) * .12; }
    e.m.grp.position.set(e.x, e.y + yo, e.z); e.m.grp.rotation.y = e.f;
    // touch: stomp from above, spin attack, or ouch
    const dx = e.x - P.x, dz = e.z - P.z, dist = Math.hypot(dx, dz), ey = e.y + yo;
    const er = e.m.r * (P.ride ? 1.8 : 1);
    if(P.spin > 0 && dist < 1.9 && Math.abs(ey - P.y) < 1.6){ popEnemy(e, 'spin'); continue; }
    if(dist < er + PR && Math.min(P.y, P.prevY) < ey + e.m.h && P.y + PH > ey){
      if((P.vy < -1 || P.vyPrev < -1) && Math.max(P.y, P.prevY) > ey + e.m.h * .45){ popEnemy(e, 'stomp'); P.vy = STOMP_V + (P.holdJ ? 2.5 : 0); P.jumps = 1; P.gr = false; P.sq = -.3; P.bounceHold = .2; stats.stomps++; P.pounding = false; P.pound = 0; }
      else if(P.pounding){ popEnemy(e, 'pound'); }
      else if(P.ride){ popEnemy(e, 'ride'); }
      else if(P.inv <= 0){ hurt(false); P.vx = -dx / (dist || 1) * 9; P.vz = -dz / (dist || 1) * 9; P.vy = 7; P.gr = false; }
    }
  }
  // launch pads: squash animation
  for(const p of R.pads){ p.sq = Math.max(0, p.sq - dt * 3); const k = p.sq > 0 ? Math.sin(p.sq * Math.PI * 3) * p.sq : 0; p.m.top.position.y = -k * .35; p.m.spring.scale.y = 1 - k * .6; p.m.top.scale.set(1 + k * .2, 1, 1 + k * .2); }
  // doors
  doorLock = Math.max(0, doorLock - dt);
  for(const d of R.doors){ d.s.position.y = d.d.y + 3.6 + Math.sin(t * 2) * .2; d.ring.material.opacity = .35 + Math.sin(t * 3) * .2; d.s.material.opacity = clamp((camera.position.distanceTo(d.s.position) - 4) / 5, 0, 1);
    if(doorLock <= 0 && !P.ride && Math.hypot(d.d.x - P.x, d.d.z - P.z) < d.d.r && Math.abs(P.y - d.d.y) < 2.5) goDoor(d.d); }
  // checkpoints
  for(const c of R.checks){ const on = checkpoint && checkpoint.a === AR.id && Math.hypot(checkpoint.x - c.c.x, checkpoint.z - c.c.z) < .5;
    c.m.children.forEach(m => void m); c.m.rotation.y = on ? Math.sin(t * 3) * .2 : 0;
    if(!on && Math.hypot(c.c.x - P.x, c.c.z - P.z) < 1.6 && Math.abs(c.c.y - P.y) < 2){ checkpoint = { a:AR.id, x:c.c.x + .2, y:c.c.y, z:c.c.z + 1.2, f:P.f }; SFX.check(); burst(c.c.x, c.c.y + 2.4, c.c.z, 14, CONFETTI, 4, 1, 8, 2); popText('🚩 ' + L('نقطة حفظ', 'Checkpoint', 'Kayıt noktası')); } }
  // crates
  for(const c of R.crates) if(c.on) c.m.rotation.y = Math.sin(t * 1.3 + c.c.x) * .05;
  // bells
  for(const b of R.bells){ b.sw *= Math.exp(-dt * 1.2); b.m.rotation.z = Math.sin(t * 7) * b.sw; }
  // the lost drum
  if(R.drum){ R.drum.rotation.y = t; R.drum.position.y = AR.props.drumAt[1] + Math.sin(t * 2) * .2;
    if(Math.hypot(AR.props.drumAt[0] - P.x, AR.props.drumAt[2] - P.z) < 1.6 && Math.abs(AR.props.drumAt[1] - P.y) < 2){ R.drum.visible = false; R.drum = null; SAVE.drum = 1; persist(); SFX.button(); burst(P.x, P.y + 1, P.z, 20, CONFETTI, 5, 1, 8, 3);
      say(null, L('لقيت {الطبلة الضايعة}! 🥁 رجّعها لـ [فيلو] بغرفة الولاد.', 'You found the {lost toy drum}! 🥁 Bring it back to [Filo] in the kids\' room.', '{Kayıp oyuncak davul}u buldun! 🥁 Çocuk odasındaki [Filo]\'ya götür.')); } }
  // villagers
  for(const n of R.npcs){ n.t += dt; const talking = dlg.open && dlg.npc === n; MD.poseNpc(n.m, n.t, talking);
    const qs = npcMark(n.d.id); n.mk.visible = !!qs; if(qs) n.mk.material = qs === '?' ? MARK_Q : MARK_EX; n.mk.position.y = n.d.y + n.m.top + .8 + Math.sin(t * 3) * .12;
    const want = Math.atan2(P.x - n.d.x, P.z - n.d.z), close = Math.hypot(P.x - n.d.x, P.z - n.d.z) < 5; n.m.grp.rotation.y += angDiff(close ? want : n.d.f, n.m.grp.rotation.y) * (1 - Math.exp(-dt * 4)); }
  if(R.cannon && !P.ride){ R.cannon.icon.visible = true; R.cannon.icon.position.y = R.cannon.y + 3.6 + Math.sin(t * 2.5) * .2; }
  stepBalls(dt);
  // room name when entering a new room
  const rm = AR.rooms.find(r => P.x > r.x0 && P.x < r.x1 && P.z > r.z0 && P.z < r.z1);
  if(rm && rm.id !== roomNow){ roomNow = rm.id; showRoom(rm.id); if(!SAVE.seen.includes(rm.id)){ SAVE.seen.push(rm.id); persist(); } }
}
let roomNow = '', doorLock = 0, enemySpeed = 1, camOverride = 0;
function gotButton(b){
  b.m.visible = false; b.g.visible = false; SAVE.btn.push(b.def.id); persist(); hudKey = '';
  SFX.button(); burst(b.def.x, b.def.y, b.def.z, 30, GOLD.concat(CONFETTI), 6, 1.2, 8, 3); cam.bump = .2;
  popText('🔘 ' + L('زر ذهبي!', 'Golden button!', 'Altın düğme!') + ' ' + N(SAVE.btn.length) + '/' + N(TOTAL_BTNS));
  worldCoins(3, L('زر ذهبي', 'Golden button', 'Altın düğme'));
}
function goDoor(d){
  SFX.door(); doorLock = 2;
  fadeTo(() => { loadArea(d.to, d.at); checkpoint = { a:AR.id, x:P.x, y:P.y, z:P.z, f:P.f }; });
}
let fading = false;
function fadeTo(fn){
  if(fading) return; fading = true; const f = $('#fade'); f.classList.add('on');
  setTimeout(() => { try{ fn(); }finally{ setTimeout(() => { f.classList.remove('on'); fading = false; }, 120); } }, 300);
}

/* ======================================================================
   Villagers, dialogue (fixed text, coloured keywords) and quests
   ====================================================================== */
const BTN_ROOM = { d_sofa:'living', d_shelf:'living', d_table:'living', d_fridge:'kitchen', u_shelf:'kids', u_blocks:'kids', b_dish:'bath', b_sink:'bath', h_fall:'hub', h_window:'hub', h_roof:'hub' };
const TOTAL_BTNS = Object.keys(BTN_ROOM).length;
const NPC = {
  frog:{ n:L('ضفدوع', 'Froggo', 'Kurbağacık'), c:'#3fae3a' },
  hen:{ n:L('الست جاجة', 'Mrs. Hen', 'Tavuk Hanım'), c:'#e8304f' },
  hog:{ n:L('قنفود', 'Spiky', 'Dikenli'), c:'#9a6a42' },
  bunny:{ n:L('أرنوبة', 'Bunny Bella', 'Tavşan Bella'), c:'#3fa7e0' },
  filo:{ n:L('فيلو', 'Filo', 'Filo'), c:'#7a8fd0' }
};
const QUESTS = {
  frog:{ need:() => SAVE.btn.length >= 5, prog:() => N(Math.min(5, SAVE.btn.length)) + '/' + N(5), coins:50, wc:15 },
  hen:{ need:() => SAVE.pops - SAVE.popsAt >= 5, prog:() => N(clamp(SAVE.pops - SAVE.popsAt, 0, 5)) + '/' + N(5), coins:40, wc:12 },
  filo:{ need:() => !!SAVE.drum, prog:() => SAVE.drum ? '🥁' : '…', coins:40, wc:12 },
  hog:{ need:() => SAVE.bells.length >= 3, prog:() => N(SAVE.bells.length) + '/' + N(3), coins:40, wc:12 }
};
const qState = id => SAVE.q[id] | 0;
const starsNow = () => Object.keys(QUESTS).filter(k => qState(k) === 2).length;
function npcMark(id){ const q = QUESTS[id]; if(!q) return id === 'bunny' ? null : null; const s = qState(id); if(s === 0) return '!'; if(s === 1 && q.need()) return '?'; return null; }
function npcLines(id){
  const s = qState(id), q = QUESTS[id];
  if(id === 'bunny') return { pages:[L('أهلين يا {بوبو}! عندي [ألوان فرو] و[قبعات] حلوين. شو بدك تشتري بـ{عملاتك}؟', 'Hi {Bobo}! I have lovely [fur colours] and [hats]. What will you buy with your {coins}?', 'Merhaba {Bobo}! Güzel [kürk renkleri] ve [şapkalarım] var. {Jetonlarınla} ne alacaksın?')], end:() => showShop() };
  if(id === 'frog'){
    if(s === 0) return { pages:[L('كروك! أنا {ضفدوع}. ضيّعت [أزرار ذهبية] من معطفي بالبيت الكبير وبالقرية…', 'Croak! I\'m {Froggo}. I lost the [golden buttons] of my coat in the big house and around the village…', 'Vrak! Ben {Kurbağacık}. Ceketimin [altın düğmelerini] büyük evde ve köyde kaybettim…'),
      L('بتلاقيلي {5 أزرار ذهبية}؟ بتكون مخبّاية فوق الأغراض العالية!', 'Can you find {5 golden buttons}? They hide on top of tall things!', 'Bana {5 altın düğme} bulur musun? Yüksek eşyaların üstünde saklanıyorlar!')], end:() => acceptQ('frog') };
    if(s === 1 && q.need()) return { pages:[L('واو! {5 أزرار}! معطفي رجع حلو. خود هالنجمة ⭐', 'Wow! {5 buttons}! My coat is fine again. Take this star ⭐', 'Vay! {5 düğme}! Ceketim yine güzel. Al bu yıldızı ⭐')], end:() => finishQ('frog') };
    if(s === 1) return { pages:[L('لسّا بدي [أزرار ذهبية]: ' + q.prog() + '. جرّب {منصّات القفز} الصفرا!', 'I still need [golden buttons]: ' + q.prog() + '. Try the yellow {launch pads}!', 'Hâlâ [altın düğme] lazım: ' + q.prog() + '. Sarı {zıplama pedlerini} dene!')] };
    return { pages:[L('معطفي صار أحلى معطف بالقرية! شكراً {بوبو}!', 'My coat is the nicest in the village! Thanks {Bobo}!', 'Ceketim köyün en güzeli! Teşekkürler {Bobo}!')] };
  }
  if(id === 'hen'){
    if(s === 0) return { pages:[L('بوك بوك! {ألعاب الكوك} الزعلانة عم تركض بكل مكان!', 'Cluck cluck! Grumpy {wind-up toys} are running everywhere!', 'Gıt gıt! Huysuz {kurmalı oyuncaklar} her yerde koşuyor!'),
      L('نطّ فوقهن أو اعمل [لفّة] بزر B، بيفرقعوا [عملات]! فرقع {5} منهن.', 'Jump on them or [spin] with B and they pop into [coins]! Pop {5} of them.', 'Üstlerine zıpla ya da B ile [dön], [jetona] dönüşürler! {5} tanesini patlat.')], end:() => { SAVE.popsAt = SAVE.pops; acceptQ('hen'); } };
    if(s === 1 && q.need()) return { pages:[L('برافو! صار في هدوء. هي {نجمة} إلك ⭐', 'Bravo! It\'s calm again. Here\'s a {star} for you ⭐', 'Bravo! Ortalık sakinleşti. İşte sana bir {yıldız} ⭐')], end:() => finishQ('hen') };
    if(s === 1) return { pages:[L('فرقعت ' + q.prog() + ' من [الألعاب]. كمّل!', 'You popped ' + q.prog() + ' [toys]. Keep going!', q.prog() + ' [oyuncak] patlattın. Devam!')] };
    return { pages:[L('بوك! فراخي نايمين براحة هلّق. شكراً!', 'Cluck! My chicks sleep peacefully now. Thanks!', 'Gıt! Civcivlerim artık rahat uyuyor. Teşekkürler!')] };
  }
  if(id === 'hog'){
    if(s === 0) return { pages:[L('أهلا! أنا {قنفود}. زر [A] للنطّ: كبسة قصيرة = نطة صغيرة، اضغط كتير = نطة عالية، وكمان مرة بالهوا = {نطة دبل}!', 'Hi! I\'m {Spiky}. [A] jumps: a tap = small hop, hold = high jump, and again in the air = {double jump}!', 'Merhaba! Ben {Dikenli}. [A] zıplar: dokun = küçük zıplama, basılı tut = yüksek, havada tekrar = {çift zıplama}!'),
      L('زر [B] = {لفّة}، وB بالهوا = {خبطة عالأرض} بتفتح الصناديق!', '[B] = {spin attack}, and B in the air = {ground pound} that opens crates!', '[B] = {dönme saldırısı}, havada B = sandıkları açan {yere vuruş}!'),
      L('بغرفة الولاد في {مدفع لعبة}. اركبه وضرب {3 أجراس} بالطابات!', 'In the kids\' room there\'s a {toy cannon}. Ride it and ring the {3 bells} with soft balls!', 'Çocuk odasında bir {oyuncak top} var. Bin ve yumuşak toplarla {3 zili} çal!')], end:() => acceptQ('hog') };
    if(s === 1 && q.need()) return { pages:[L('سمعت {الأجراس} لهون! دينغ دونغ! خود {نجمة} ⭐', 'I heard the {bells} all the way here! Ding dong! Take a {star} ⭐', '{Zilleri} buradan duydum! Ding dong! Al bir {yıldız} ⭐')], end:() => finishQ('hog') };
    if(s === 1) return { pages:[L('[الأجراس]: ' + q.prog() + '. المدفع بـ{غرفة الولاد}، فوت من {البوابة الملوّنة}!', '[Bells]: ' + q.prog() + '. The cannon is in the {kids\' room}, take the {rainbow portal}!', '[Ziller]: ' + q.prog() + '. Top {çocuk odasında}, {gökkuşağı kapısından} geç!')] };
    return { pages:[L('جرّب تعمل {نطة دبل} من عالكنباية لفوق! 🛋️', 'Try a {double jump} from the sofa cushions! 🛋️', 'Kanepe minderlerinden {çift zıplama} dene! 🛋️')] };
  }
  if(id === 'filo'){
    if(s === 0 && !SAVE.drum) return { pages:[L('أنا {فيلو} الفيل القماش. ضاعت [طبلتي] الحمرا! 🥁', 'I\'m {Filo}, the plush elephant. My red [drum] is lost! 🥁', 'Ben {Filo}, pelüş fil. Kırmızı [davulum] kayboldu! 🥁'),
      L('آخر مرة شفتها كانت عالي… فوق {البرّاد} بـ[المطبخ]!', 'Last time I saw it, it was way up… on top of the {fridge} in the [kitchen]!', 'En son yukarıda… [mutfaktaki] {buzdolabının} üstündeydi!')], end:() => acceptQ('filo') };
    if(SAVE.drum && s !== 2) return { pages:[L('{طبلتي}! بوم بوم! إنت أحلى صاحب. هي {نجمة} ⭐', 'My {drum}! Boom boom! You\'re the best friend. Here\'s a {star} ⭐', '{Davulum}! Bum bum! Sen en iyi arkadaşsın. İşte bir {yıldız} ⭐')], end:() => { if(qState('filo') === 0) acceptQ('filo', true); finishQ('filo'); } };
    if(s === 1) return { pages:[L('[الطبلة] فوق {البرّاد} بالمطبخ. نطّ عـ[الخزاين الخضرا]!', 'The [drum] is on the {fridge} in the kitchen. Jump along the [green cupboards]!', '[Davul] mutfakta {buzdolabının} üstünde. [Yeşil dolaplar] boyunca zıpla!')] };
    return { pages:[L('بوم بوم بوم! 🥁 شكراً يا {بوبو}!', 'Boom boom boom! 🥁 Thank you {Bobo}!', 'Bum bum bum! 🥁 Teşekkürler {Bobo}!')] };
  }
  return { pages:['…'] };
}
function acceptQ(id, quiet){ if(qState(id) === 0){ SAVE.q[id] = 1; persist(); if(!quiet){ SFX.check(); popText('📜 ' + L('مهمة جديدة!', 'New quest!', 'Yeni görev!')); } } }
function finishQ(id){
  if(qState(id) === 2) return; SAVE.q[id] = 2; persist(); hudKey = '';
  const q = QUESTS[id]; addCoins(q.coins); SFX.star(); burst(P.x, P.y + 1.5, P.z, 40, CONFETTI, 6, 1.2, 8, 4);
  popText('⭐ ' + L('نجمة!', 'Star!', 'Yıldız!') + ' +' + N(q.coins) + ' 🪙');
  worldCoins(q.wc, L('بوبو الصغير', 'Tiny Bobo', 'Minik Bobo'));
}
/* dialogue box */
const dlg = { open:false, npc:null, pages:[], i:0, end:null, txt:'', shown:0 };
const dlgEl = $('#dlg'), dlgT = $('#dlgT');
function fmt(s){ return s.replace(/[&<>]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[c]).replace(/\{([^}]+)\}/g, '<b class="k1">$1</b>').replace(/\[([^\]]+)\]/g, '<b class="k2">$1</b>'); }
function openDlg(npc, who, col, pages, end){
  Object.assign(dlg, { open:true, npc, pages, i:0, end });
  $('#dlgWho').textContent = who; dlgEl.style.setProperty('--c', col); dlgEl.hidden = false; $('#dlgActs').innerHTML = '';
  showPage();
}
function showPage(){ dlg.txt = dlg.pages[dlg.i]; dlgT.innerHTML = fmt(dlg.txt); dlg.shown = 0; SFX.talk(); }
function nextDlg(){
  if(!dlg.open) return;
  if(dlg.i < dlg.pages.length - 1){ dlg.i++; showPage(); return; }
  dlg.open = false; dlgEl.hidden = true; const e = dlg.end; dlg.end = null; dlg.npc = null; if(e) e();
}
dlgEl.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); nextDlg(); });
function say(id, text){ const n = id && NPC[id]; openDlg(null, n ? n.n : '🧸 ' + BEAR_NAME, n ? n.c : '#f0a640', [text], null); }
function talkTo(n){ const id = n.d.id, info = NPC[id], ls = npcLines(id); openDlg(n, info.n, info.c, ls.pages, ls.end || null); }
function nearestNpc(){ let b = null, bd = 3.2; for(const n of RT.npcs){ const d = Math.hypot(n.d.x - P.x, n.d.z - P.z); if(d < bd && Math.abs(n.d.y - P.y) < 2.5){ bd = d; b = n; } } return b; }
function nearCannon(){ const c = RT.cannon; return c && !P.ride && Math.hypot(c.x - P.x, c.z - P.z) < 3 && Math.abs(c.y - P.y) < 2 ? c : null; }
function doAction(){
  if(dlg.open){ nextDlg(); return; }
  if(P.ride){ dismount(); return; }
  const n = nearestNpc(); if(n){ SFX.tap(); talkTo(n); return; }
  const c = nearCannon(); if(c){ mount(); return; }
  SFX.nope();
}

/* ======================================================================
   The wind-up toy cannon: drive it, A hops, B shoots soft balls
   ====================================================================== */
function mount(){
  const c = RT.cannon; P.ride = true; c.col.off = true; P.x = c.x; P.z = c.z; P.y = c.y; P.f = c.m.grp.rotation.y; P.vx = P.vz = 0; c.icon.visible = false;
  SFX.wind(); stats.rides = (stats.rides || 0) + 1; showHint(true); hudKey = '';
}
function dismount(){
  const c = RT.cannon; P.ride = false; c.x = P.x; c.z = P.z; c.y = P.y; c.f = P.f;
  Object.assign(c.col, { x0:c.x - 1.1, x1:c.x + 1.1, z0:c.z - 1.1, z1:c.z + 1.1, y0:c.y, y1:c.y + 1.2, off:false });
  c.m.grp.position.set(c.x, c.y, c.z); c.m.grp.rotation.y = c.f;
  P.x = c.x + Math.cos(c.f) * 2; P.z = c.z - Math.sin(c.f) * 2; P.vy = 6; P.gr = false; P.jumps = 1;
  hero.grp.position.set(P.x, P.y, P.z); showHint(false); hudKey = '';
}
function placeRider(){
  const c = RT.cannon; if(!c) return;
  c.m.grp.position.set(P.x, P.y, P.z); c.m.grp.rotation.y = P.f;
  const sp = Math.hypot(P.vx, P.vz); c.m.wheels.forEach(w => { w.rotation.x += sp * .03; }); c.m.key.rotation.z += .05 + sp * .01;
  c.m.body.position.y = P.gr ? Math.abs(Math.sin(simT * 14)) * .05 * (sp > .5 ? 1 : 0) : 0;
  c.m.seat.getWorldPosition(_v); hero.grp.position.copy(_v); hero.grp.rotation.y = P.f;
}
let hintOn = false;
function showHint(on){ hintOn = on; const h = $('#hint'); h.hidden = !on; if(on) h.innerHTML = L('اضغط <span class="ka">A</span> للقفز، <span class="kb">B</span> للهجوم', 'Press <span class="ka">A</span> to jump, <span class="kb">B</span> to attack', 'Zıplamak için <span class="ka">A</span>, saldırı için <span class="kb">B</span>'); }
function shootBall(){
  const b = RT.balls.find(x => !x.on); if(!b) return;
  const c = RT.cannon; c.m.barrel.getWorldPosition(_v);
  const fx = Math.sin(P.f), fz = Math.cos(P.f);
  Object.assign(b, { on:true, x:_v.x + fx * 1.5, y:_v.y + .2, z:_v.z + fz * 1.5, vx:fx * 20 + P.vx, vy:11 + Math.max(0, P.vy * .5), vz:fz * 20 + P.vz, t:0 });
  b.m.material.color.set([0xff8fb1, 0x6cc4ff, 0xffd23f, 0x5ed67a][Math.floor(Math.random() * 4)]); b.m.visible = true;
  SFX.shoot(); burst(b.x, b.y, b.z, 8, [0xffffff, 0xfff3b0], 3, 1, 2, 1, .3); c.m.barrel.position.z = -.25; setTimeout(() => { c.m.barrel.position.z = .1; }, 120);
  stats.shots = (stats.shots || 0) + 1;
}
function stepBalls(dt){
  for(const b of RT.balls){
    if(!b.on) continue;
    b.t += dt; b.vy -= 14 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    let dead = b.t > 3;
    for(const e of RT.enemies){ if(e.alive && Math.hypot(e.x - b.x, e.z - b.z) < 1.4 && b.y > e.y - .5 && b.y < e.y + e.m.h + .8){ popEnemy(e, 'ball'); dead = true; } }
    for(const bl of RT.bells){ if(Math.hypot(bl.b.x - b.x, bl.b.y - b.y, bl.b.z - b.z) < 2){ ringBell(bl); dead = true; } }
    for(const c of RT.crates){ if(c.on && Math.hypot(c.c.x - b.x, c.c.z - b.z) < 1.3 && b.y < c.c.y + 2){ breakCrate(c); dead = true; } }
    if(!dead){ const g = groundAt(b.x, b.z); if(b.y < g + .4){ b.y = g + .4; b.vy = Math.abs(b.vy) * .55; b.vx *= .8; b.vz *= .8; }
      for(const c of near){ if(c.off) continue; if(b.x > c.x0 - .4 && b.x < c.x1 + .4 && b.z > c.z0 - .4 && b.z < c.z1 + .4 && b.y > c.y0 - .4 && b.y < c.y1 + .4){
        if(b.y - b.vy * dt >= c.y1){ b.y = c.y1 + .4; b.vy = Math.abs(b.vy) * .55; } else { dead = b.t > .05; burst(b.x, b.y, b.z, 6, [0xffffff], 2, .8, 4, 1, .3); } break; } } }
    if(dead){ b.on = false; b.m.visible = false; continue; }
    b.m.position.set(b.x, b.y, b.z);
  }
}
function ringBell(bl){
  bl.sw = .7; SFX.bell(); burst(bl.b.x, bl.b.y, bl.b.z, 16, GOLD, 4, 1, 6, 2);
  if(!bl.rung){ bl.rung = true; if(!SAVE.bells.includes(bl.i)) SAVE.bells.push(bl.i); persist(); popText('🔔 ' + N(SAVE.bells.length) + '/' + N(3)); }
}

/* ======================================================================
   HUD, pop texts, labels
   ====================================================================== */
const hudEl = $('#hud'), labelsEl = $('#labels');
let hudKey = '', state = 'menu';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on; aBtn.hidden = !on; bBtn.hidden = !on; talkBtn.hidden = !on;
  if(!on){ exitBtn.hidden = true; $('#hint').hidden = true; dlgEl.hidden = true; dlg.open = false; $('#roomChip').hidden = true; labelsEl.innerHTML = ''; doorLbls.clear(); }
}
function hudFrame(dt){
  coinBump = Math.max(0, coinBump - dt);
  const near1 = !dlg.open && (P.ride || nearestNpc() || nearCannon());
  const tk = [SAVE.coins, SAVE.btn.length, starsNow(), lives, !!near1, P.ride].join('|');
  if(tk !== hudKey){
    hudKey = tk;
    $('#hudCoins').textContent = N(SAVE.coins); $('#hudBtns').textContent = N(SAVE.btn.length) + '/' + N(TOTAL_BTNS);
    $('#hudStars').textContent = '⭐ ' + N(starsNow()) + '/' + N(4); $('#hudLives').textContent = N(lives);
    talkBtn.classList.toggle('ready', !!near1); talkBtn.hidden = P.ride;
    talkBtn.textContent = P.ride ? '🚪' : nearCannon() ? '🎯' : '💬';
    exitBtn.hidden = !P.ride; $('#hint').hidden = !P.ride;
  }
  const bc = $('#bigcoin'); if(coinBump > .25 && !bc.classList.contains('bump')){ bc.classList.add('bump'); setTimeout(() => bc.classList.remove('bump'), 300); }
  // typewriter for the dialogue
  if(dlg.open && dlg.shown < dlg.txt.length){ dlg.shown = Math.min(dlg.txt.length, dlg.shown + dt * 60); if(Math.random() < .3) SFX.talk(); }
}
function popText(text){ const box = $('#pops'); while(box.children.length > 2) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; box.appendChild(d); setTimeout(() => d.remove(), 1700); }
let roomTO = 0;
function showRoom(id){ const el = $('#roomChip'); el.textContent = WORLD.ROOM_ICON[id] + ' ' + WORLD.ROOM_NAME[id]; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(roomTO); roomTO = setTimeout(() => { el.hidden = true; }, 2600); }
/* door names float over the doors when you are near */
const doorLbls = new Map();
function placeLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  for(const d of RT.doors){
    let el = doorLbls.get(d); const dist = Math.hypot(d.d.x - P.x, d.d.z - P.z), show = state === 'play' && dist < 16;
    if(!el){ el = document.createElement('div'); el.className = 'dname'; el.textContent = d.d.icon + ' ' + d.d.name; labelsEl.appendChild(el); doorLbls.set(d, el); }
    if(!show){ el.hidden = true; continue; }
    _v.set(d.d.x, d.d.y + 5, d.d.z).project(camera); if(_v.z > 1){ el.hidden = true; continue; }
    el.hidden = false; el.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

/* ======================================================================
   Cards: title, hero picker, pause + progress, shop
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function hideOverlay(){ overlay.hidden = true; }
const BEAR_PIC = (() => { const c = TX.cv(150, 200, (x) => {
  const R = (x0, y0, w, h, r, col) => { x.fillStyle = col; x.beginPath(); x.roundRect ? x.roundRect(x0, y0, w, h, r) : x.rect(x0, y0, w, h); x.fill(); };
  R(34, 118, 82, 70, 18, '#f0a640'); R(52, 130, 46, 44, 12, '#fff0d2');
  for(let i = 0; i < 8; i++) R(32 + i * 11, 110, 11, 14, 4, i % 2 ? '#ffffff' : '#e8304f');
  R(18, 40, 114, 86, 26, '#f0a640'); R(20, 28, 30, 30, 10, '#f0a640'); R(100, 28, 30, 30, 10, '#f0a640'); R(27, 35, 16, 16, 6, '#ffc9a0'); R(107, 35, 16, 16, 6, '#ffc9a0');
  R(30, 22, 90, 24, 10, '#3f9a4a'); R(52, 40, 70, 9, 4, '#2f7f3a');
  R(56, 92, 38, 26, 12, '#fff0d2');
  x.fillStyle = '#4a2414'; x.beginPath(); x.moveTo(75, 104); x.bezierCurveTo(70, 100, 64, 98, 66, 94); x.bezierCurveTo(68, 90, 74, 92, 75, 95); x.bezierCurveTo(76, 92, 82, 90, 84, 94); x.bezierCurveTo(86, 98, 80, 100, 75, 104); x.fill();
  for(const s of [-1, 1]){ const cx = 75 + s * 24; x.fillStyle = '#1c0f06'; x.beginPath(); x.ellipse(cx, 78, 10, 11, 0, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - 3, 74, 4, 0, 7); x.fill(); x.beginPath(); x.arc(cx + 3, 82, 1.6, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,110,130,.55)'; x.beginPath(); x.ellipse(75 + s * 38, 96, 8, 5, 0, 0, 7); x.fill(); }
}); return c.toDataURL(); })();
const charImg = id => id === 'bear' ? BEAR_PIC : '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
function myHeroBtn(id = 'bMyHero'){ return `<button class="hero-btn" id="${id}" style="--c:${heroCol(heroId)}"><img src="${charImg(heroId)}" alt=""><span>${heroName(heroId)}</span> 🔄</button>`; }
function sndBtn(){ return `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`; }
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); }; }
function showTitle(){
  state = 'menu'; setPlayUI(false); AU.music(false); clearInput();
  if(!AR) loadArea('hub', 'start');
  placeAt(4, AR.ground ? AR.ground(4, -2) : 0, -2, -2.4); cam.yaw = .9; cam.pAdj = .05;
  showOverlay('clear'); card.className = 'card bare';
  card.innerHTML = `${sndBtn()}<div class="menu">
    <div class="logo">🧸</div>
    <h1>${L('بوبو الصغير', 'Tiny Bobo', 'Minik Bobo')}</h1>
    <p class="sub">🏠 ${L('صغير كتير ببيت عملاق! نطّ، لمّ العملات والأزرار الذهبية، وساعد أهل القرية.', 'Tiny in a giant house! Jump, collect coins and golden buttons, and help the villagers.', 'Dev bir evde minicik! Zıpla, jeton ve altın düğme topla, köylülere yardım et.')}</p>
    ${myHeroBtn()}
    <div class="stars"><span>🪙 ${N(SAVE.coins)}</span><span>🔘 ${N(SAVE.btn.length)}/${N(TOTAL_BTNS)}</span><span>⭐ ${N(starsNow())}/${N(4)}</span></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${SAVE.total ? L('كمّل', 'Continue', 'Devam') : L('العب', 'Play', 'Oyna')}</button></div></div>`;
  wireSnd();
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('menu'); };
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); beginGame(); };
}
let selFrom = 'menu';
function showSelect(from){
  selFrom = from || 'menu'; state = 'select';
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🧸 ${L('مين بدو يلعب؟', 'Who will play?', 'Kim oynayacak?')}</h2>
    <div class="heroes nine">${ALL_HEROES.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${heroCol(id)}"><img src="${charImg(id)}" alt=""><b>${heroName(id)}</b></button>`).join('')}</div>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { SAVE.hero = b.dataset.h; persist(); setHero(b.dataset.h); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bOk').onclick = () => { SFX.tap(); if(selFrom === 'pause') showPause(true); else showTitle(); };
}
function progressHtml(){
  const rooms = ['hub', 'living', 'kitchen', 'kids', 'bath'], areaOf = { hub:'hub', living:'down', kitchen:'down', kids:'up', bath:'up' };
  return `<div class="prog">${rooms.map(r => {
    const A = WORLD.get(areaOf[r]), rm = A.rooms.find(x => x.id === r);
    const inRoom = c => c[0] > rm.x0 && c[0] < rm.x1 && c[2] > rm.z0 && c[2] < rm.z1;
    const got = new Set(SAVE.got[A.id] || []); let tot = 0, have = 0; A.coins.forEach((c, i) => { if(inRoom(c)){ tot++; if(got.has(i)) have++; } });
    const bt = Object.keys(BTN_ROOM).filter(k => BTN_ROOM[k] === r), bh = bt.filter(k => SAVE.btn.includes(k)).length;
    return `<div><i>${WORLD.ROOM_ICON[r]}</i><b>${WORLD.ROOM_NAME[r]}</b><span>🔘 ${N(bh)}/${N(bt.length)}</span><span>🪙 ${N(have)}/${N(tot)}</span></div>`; }).join('')}</div>`;
}
function questsHtml(){
  return Object.keys(QUESTS).filter(k => qState(k) === 1).map(k => `<span class="tag" style="--rc:#fff">${NPC[k].n}: ${QUESTS[k].prog()}</span>`).join(' ');
}
function showPause(force){
  if(state !== 'play' && !force) return;
  state = 'pause'; clearInput(); AU.music(false);
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `${sndBtn()}<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    ${progressHtml()}
    <div class="row">${questsHtml()}<span class="tag" style="--rc:#ffe27a">⭐ ${N(starsNow())}/${N(4)}</span></div>
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>${myHeroBtn()}</div>
    <div class="row"><button class="ghost-btn" id="bHome">🌳 ${L('رجوع عالقرية', 'Back to the village', 'Köye dön')}</button><button class="ghost-btn" id="bMenu">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); resume(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bHome').onclick = () => { SFX.tap(); resume(); fadeTo(() => { loadArea('hub', 'start'); }); };
  $('#bMenu').onclick = () => { SFX.tap(); persist(true); showTitle(); };
  $('#bExit').onclick = () => { persist(true); location.href = '../'; };
}
function resume(){ hideOverlay(); state = 'play'; setPlayUI(true); hudKey = ''; AU.music(true); last = performance.now(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
let shopTab = 'fur';
function showShop(){
  state = 'shop'; clearInput();
  showOverlay('dim'); card.className = 'card wide';
  const isBear = heroId === 'bear';
  const list = shopTab === 'fur' ? Object.keys(MD.FURS).map(k => ({ id:'fur:' + k, k, e:'', col:'#' + MD.FURS[k].c.toString(16).padStart(6, '0'), n:L(...MD.FURS[k].n), p:MD.FURS[k].price, on:SAVE.fur === k }))
    : Object.keys(MD.HATS).map(k => ({ id:'hat:' + k, k, e:MD.HATS[k].e, n:L(...MD.HATS[k].n), p:MD.HATS[k].price, on:SAVE.hat === k }));
  card.innerHTML = `<button class="x-btn" id="bX">✕</button><h2>🛍️ ${L('بسطة أرنوبة', "Bunny Bella's stall", "Tavşan Bella'nın tezgâhı")}</h2>
    <div class="wallet">🪙 ${N(SAVE.coins)}</div>
    <div class="tabs"><button class="tab${shopTab === 'fur' ? ' on' : ''}" data-t="fur">🎨 ${L('لون الفرو', 'Fur colour', 'Kürk rengi')}</button><button class="tab${shopTab === 'hat' ? ' on' : ''}" data-t="hat">🎩 ${L('قبعات', 'Hats', 'Şapkalar')}</button></div>
    <div class="items">${list.map(it => { const own = SAVE.owned.includes(it.id); return `<button class="item${it.on ? ' on' : ''}${!own && SAVE.coins < it.p ? ' no' : ''}" data-id="${it.id}">
      <i style="${it.col ? `background:${it.col};box-shadow:inset 0 -4px 0 rgba(0,0,0,.15)` : ''}">${it.e}</i><b>${it.n}</b><small>${own ? (it.on ? '✅' : L('البس', 'Wear', 'Giy')) : '🪙 ' + N(it.p)}</small></button>`; }).join('')}</div>
    ${isBear ? '' : `<p>🧸 ${L('هدول لـ«بوبو الدبدوب». اختارو من «مين بدو يلعب».', 'These are for Bobo the Bear. Pick him in «Who will play?».', 'Bunlar Ayıcık Bobo için. «Kim oynayacak?» kısmından onu seç.')}</p>`}`;
  card.querySelectorAll('.tab').forEach(b => b.onclick = () => { shopTab = b.dataset.t; SFX.tap(); showShop(); });
  card.querySelectorAll('.item').forEach(b => b.onclick = () => buyItem(b.dataset.id));
  $('#bX').onclick = () => { SFX.tap(); resume(); };
}
function buyItem(id){
  const [kind, k] = id.split(':'), price = kind === 'fur' ? MD.FURS[k].price : MD.HATS[k].price;
  if(!SAVE.owned.includes(id)){ if(SAVE.coins < price){ SFX.nope(); popText('🪙 ' + L('بدك عملات أكتر', 'You need more coins', 'Daha çok jeton lazım')); return false; } SAVE.coins -= price; SAVE.owned.push(id); SFX.buy(); }
  else SFX.tap();
  if(kind === 'fur') SAVE.fur = k; else SAVE.hat = k;
  persist(); refreshLook(); hudKey = ''; if(state === 'shop') showShop(); return true;
}

/* ======================================================================
   Start / main loop / auto quality
   ====================================================================== */
function beginGame(){
  hideOverlay(); state = 'play'; setPlayUI(true); hudKey = '';
  fadeTo(() => {
    loadArea(SAVE.area || 'hub', 'start'); setHero(heroId); lives = 5;
    if(!SAVE.tut){ SAVE.tut = 1; persist(); setTimeout(() => { if(state === 'play' && !dlg.open){ const n = RT.npcs.find(x => x.d.id === 'hog'); if(n) talkTo(n); } }, 900); }
  });
  AU.music(true);
}
let last = performance.now(), fpsT = 0, fpsN = 0, lowT = 0, frozen = false;
function frame(now){
  requestAnimationFrame(frame);
  if(frozen) return;
  let dt = Math.min(.1, (now - last) / 1000); last = now;
  const t = now / 1000;
  if(state === 'play' && !fading){ stepHero(dt); updateWorld(t, dt); hudFrame(dt); }
  else if(AR){ for(const f of AR.tick) f(t, dt); if(state === 'menu'){ cam.yaw += dt * .08; } }
  if(AR){ drawHero(t, state === 'play' ? dt : 0); updateCamera(dt); updateParts(dt); if(state === 'play') placeLabels(); }
  renderer.render(scene, camera);
  // auto quality: drop a level when the phone struggles for a few seconds
  fpsT += dt; fpsN++;
  if(fpsT > 2){ const fps = fpsN / fpsT; fpsT = 0; fpsN = 0; if(fps < 42 && state === 'play' && quality > 0 && QS.get('q') == null){ lowT++; if(lowT >= 2){ quality--; lowT = 0; applyQuality(); } } else lowT = 0; }
}

/* ======================================================================
   Test hooks (used by the automated tests only)
   ====================================================================== */
window.__tiny = {
  get state(){ return state; }, get P(){ return { x:P.x, y:P.y, z:P.z, vy:P.vy, gr:P.gr, jumps:P.jumps, launch:P.launch, ride:P.ride, swim:P.swim, f:P.f, inv:P.inv }; },
  get area(){ return AR && AR.id; }, get room(){ return roomNow; }, get coins(){ return SAVE.coins; }, get btns(){ return SAVE.btn.slice(); }, get lives(){ return lives; }, get stats(){ return Object.assign({}, stats); },
  get save(){ return JSON.parse(JSON.stringify(SAVE)); }, get dlg(){ return { open:dlg.open, i:dlg.i, n:dlg.pages.length, txt:dlg.txt }; }, get quality(){ return quality; },
  get world(){ return { pads:AR.pads.map(p => ({ x:p.x, y:p.y, z:p.z, to:p.to })), npcs:AR.npcs.map(n => ({ id:n.id, x:n.x, y:n.y, z:n.z })), doors:AR.doors.map(d => ({ x:d.x, y:d.y, z:d.z, to:d.to, at:d.at })),
    enemies:RT.enemies.map(e => ({ kind:e.d.kind, x:e.x, y:e.y, z:e.z, alive:e.alive })), coins:RT.coins.filter(c => c.on).map(c => [c.x, c.y, c.z]), buttons:RT.buttons.filter(b => b.m.visible).map(b => ({ id:b.def.id, x:b.def.x, y:b.def.y, z:b.def.z })),
    cannon:RT.cannon ? { x:RT.cannon.x, y:RT.cannon.y, z:RT.cannon.z } : null, bells:AR.bells, crates:RT.crates.map(c => ({ x:c.c.x, y:c.c.y, z:c.c.z, on:c.on })), rooms:AR.rooms }; },
  menu(){ showTitle(); }, play(){ beginGame(); }, pause(){ showPause(); }, resume(){ resume(); }, shop(){ showShop(); }, buy(id){ return buyItem(id); }, select(){ showSelect('menu'); }, hero(id){ setHero(id); },
  load(id, at){ loadArea(id, at); }, tp(x, y, z, f){ placeAt(x, y, z, f != null ? f : P.f); P.gr = false; }, go(x, z, r){ testGo = { x, z, r }; }, get going(){ return !!testGo; }, input(x, y){ testInput = x == null ? null : { x, y }; },
  A(){ pressA(); }, relA(){ releaseA(); }, B(){ pressB(); }, act(){ doAction(); }, next(){ nextDlg(); }, talk(id){ const n = RT.npcs.find(x => x.d.id === id); if(n){ placeAt(n.d.x + Math.sin(n.d.f) * 2, n.d.y, n.d.z + Math.cos(n.d.f) * 2, n.d.f + Math.PI); talkTo(n); return true; } return false; },
  yaw(a){ cam.yaw = a; cam.lookT = performance.now(); }, face(x, z){ P.f = Math.atan2(x - P.x, z - P.z); cam.yaw = P.f + Math.PI; cam.snap = true; cam.lookT = performance.now(); },
  setCoins(n){ SAVE.coins = n; hudKey = ''; }, padV(i){ const p = RT.pads[i]; return p && p.v; }, quests(){ return JSON.parse(JSON.stringify(SAVE.q)); }, freeze(v){ frozen = !!v; },
  reset(){ SAVE = freshSave(); persist(true); }, cam(){ return { x:camera.position.x, y:camera.position.y, z:camera.position.z, d:cam.dist }; }, mount(){ mount(); }, dismount(){ dismount(); }, setQuality(q){ quality = q; applyQuality(); }, info(){ const i = renderer.info.render; return { calls:i.calls, tris:i.triangles, geos:renderer.info.memory.geometries, tex:renderer.info.memory.textures }; }, still(v){ enemySpeed = v ? 0 : 1; }, camD(d){ camOverride = d || 0; }, revive(){ for(const e of RT.enemies){ e.alive = true; e.m.grp.visible = true; } }, pitch(a){ cam.pAdj = a; cam.lookT = performance.now(); }
};

/* ---------- boot ---------- */
applyQuality();
setHero(heroId);
showTitle();
requestAnimationFrame(t => { last = t; frame(t); });
