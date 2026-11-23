/* «حديقة الحارة» (Neighbourhood Park / Mahalle Parkı) — our own neighbourhood park in 3D, for kids.
   The hero is one of our 7 characters or the kid's own 'me' avatar. Real playground play: walk the paver paths, climb the
   black stair or the teal climbing wall, slide down the purple WAVY slide and the YELLOW slide, swing (tap A to pump
   higher), ride the purple seesaw with a friend or a bot, bounce on the spring riders, sit on the benches, hide behind
   the round shrubs, feed the pigeons and pet the cats. Collect the hidden stars and the golden autumn leaves.
   Small games: «لقّيطة» (tag: catch the bots, and friends) and «غمّيضة» (hide-and-seek: the bots hide behind bushes).
   Day / dusk / night toggle: soft lavender evening by default, lamps light up warm at dusk and night.
   Online («👫 العب مع أصحابك»): up to 4 friends in the same park, names over heads, everyone sees the others walk,
   slide, swing, bounce and ride the seesaw together. Progress is saved on this phone; stars and leaves give a few
   Bobo Land coins (capped per day). */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeTextures } from './tex.js';
import { makePark } from './park.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const AU = makeAudio(), SFX = AU.SFX;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const ALL_HEROES = HERO_IDS.slice();
const heroName = id => HERO_NAME[id] || HERO_NAME.sara;
const heroCol = id => HERO_COLOR[id] || '#9c7be3';
const PLACE = L('حديقة الحارة', 'Neighbourhood Park', 'Mahalle Parkı');

/* ======================================================================
   Save (this phone)
   ====================================================================== */
const SAVE_KEY = 'hara_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1, COIN_CAP = 40;
function freshSave(){ return { v:SAVE_V, hero:'sara', coins:0, total:0, stars:[], leaves:0, wins:{ tag:0, seek:0 }, tod:1, cd:{ d:'', n:0 }, fed:'', pet:[] }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.coins = clamp(s.coins | 0, 0, 999999); s.total = clamp(s.total | 0, 0, 9999999); s.leaves = clamp(s.leaves | 0, 0, 999999);
      if(!Array.isArray(s.stars)) s.stars = []; s.stars = s.stars.filter(n => Number.isInteger(n) && n >= 0 && n < 40);
      if(!Array.isArray(s.pet)) s.pet = [];
      if(!s.wins || typeof s.wins !== 'object') s.wins = { tag:0, seek:0 };
      if(!s.cd || typeof s.cd !== 'object') s.cd = { d:'', n:0 };
      s.tod = [0, 1, 2].includes(s.tod) ? s.tod : 1;
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
let saveTO = 0;
function persist(now){ clearTimeout(saveTO); if(now) rawSet(SAVE_KEY, JSON.stringify(SAVE)); else saveTO = setTimeout(() => rawSet(SAVE_KEY, JSON.stringify(SAVE)), 400); }
addEventListener('pagehide', () => persist(true));
let heroId = ALL_HEROES.includes(QS.get('hero')) ? QS.get('hero') : ALL_HEROES.includes(SAVE.hero) ? SAVE.hero : 'sara';
function worldCoins(n, why){
  if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
  SAVE.coins += n; SAVE.total += n; coinBump = .3; hudKey = '';
  const k = Math.min(n, COIN_CAP - SAVE.cd.n);
  if(k > 0){ SAVE.cd.n += k; try{ if(window.World) World.addCoins(k, why); }catch(e){} }
  persist(); return k;
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
   Renderer, camera, sky, lights
   ====================================================================== */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const MAXDPR = Math.min(window.devicePixelRatio || 1, 1.6);
let quality = QS.get('q') != null ? clamp(+QS.get('q') | 0, 0, 2) : 2;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, .2, 600);
const hemi = new THREE.HemisphereLight(0xffffff, 0x6a6050, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8d0, 1.6);
sun.castShadow = true; sun.shadow.bias = -.0005; sun.shadow.normalBias = .05;
Object.assign(sun.shadow.camera, { left:-24, right:24, top:24, bottom:-24, near:1, far:140 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
function applyQuality(){
  const d = quality === 2 ? MAXDPR : quality === 1 ? Math.min(MAXDPR, 1.1) : .85;
  renderer.setPixelRatio(d);
  renderer.shadowMap.enabled = quality > 0; sun.castShadow = quality > 0;
  sun.shadow.mapSize.set(quality === 2 ? 2048 : 1024, quality === 2 ? 2048 : 1024);
  if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; }
  for(const l of ptLights) l.visible = quality > 0;
  scene.traverse(o => { if(o.material && o.material.needsUpdate !== undefined) o.material.needsUpdate = true; });
  resize();
}
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', () => resize());
addEventListener('orientationchange', () => setTimeout(resize, 120));
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();

/* sky dome: vertical gradient (top / horizon / below) + night stars + moon */
const skyU = { top:{ value:new THREE.Color() }, hor:{ value:new THREE.Color() }, low:{ value:new THREE.Color() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false, uniforms:skyU,
  vertexShader:'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:'uniform vec3 top; uniform vec3 hor; uniform vec3 low; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > 0.0 ? mix(hor, top, pow(clamp(h * 1.6, 0.0, 1.0), 0.7)) : mix(hor, low, clamp(-h * 4.0, 0.0, 1.0)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}' }));
sky.renderOrder = -10; scene.add(sky);
const starPts = (() => { const p = []; for(let i = 0; i < 500; i++){ const a = Math.random() * 6.283, e = .15 + Math.random() * 1.3; p.push(Math.cos(a) * Math.cos(e) * 380, Math.sin(e) * 380, Math.sin(a) * Math.cos(e) * 380); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color:0xffffff, size:1.6, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false })); scene.add(m); return m; })();
scene.fog = new THREE.Fog(0xcfc4dc, 60, 240);

/* ======================================================================
   The park
   ====================================================================== */
const TX = makeTextures(THREE, Math.min(8, renderer.capabilities.getMaxAnisotropy()));
const PK = makePark(THREE, K, TX);
scene.add(PK.group);
const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map:TX.glow, color:0xdfe8ff, transparent:true, opacity:0, fog:false, depthWrite:false })); moon.scale.setScalar(26); moon.position.set(-120, 140, -260); scene.add(moon);
/* warm point lights near the playground (night only; off on the lowest quality) */
const ptLights = [];
for(const l of PK.LAMPS.filter(l => l.big).concat(PK.LAMPS.filter(l => !l.big).slice(0, 2))){
  const p = new THREE.PointLight(0xffc98a, 0, l.big ? 36 : 18, 1.4); p.position.set(l.x, l.y - .3, l.z); scene.add(p); ptLights.push(p);
}
/* ---------- day / dusk / night ---------- */
const TODS = [
  { top:0x6fa6e0, hor:0xdfe6ee, low:0x8c8f96, fog:0xd6dde6, sun:0xfff2dc, si:2.0, hs:0xeaf2ff, hg:0x6a6050, hi:1.15, dusk:0, night:0, exp:1.0, sy:60 },
  { top:0x8f93c4, hor:0xe4dae6, low:0x7a7688, fog:0xcfc6d8, sun:0xffd6c0, si:.85, hs:0xdcd6f0, hg:0x6a6058, hi:1.25, dusk:1, night:0, exp:1.08, sy:14 },
  { top:0x0e1330, hor:0x2c2b55, low:0x1a1a2a, fog:0x24264a, sun:0x9fb4ff, si:.32, hs:0x5866a8, hg:0x1c1a22, hi:.42, dusk:1, night:1, exp:1.15, sy:40 }
];
let todT = SAVE.tod, tod = SAVE.tod;
if(['0', '1', '2'].includes(QS.get('tod'))) todT = tod = +QS.get('tod');
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function mixC(key, a, b, k, out){ return out.copy(_c1.set(a[key])).lerp(_c2.set(b[key]), k); }
function applyTod(){
  const i = Math.min(1, Math.floor(tod)), k = tod - i, a = TODS[i], b = TODS[i + 1];
  mixC('top', a, b, k, skyU.top.value); mixC('hor', a, b, k, skyU.hor.value); mixC('low', a, b, k, skyU.low.value);
  mixC('fog', a, b, k, scene.fog.color);
  mixC('sun', a, b, k, sun.color); sun.intensity = lerp(a.si, b.si, k);
  mixC('hs', a, b, k, hemi.color); mixC('hg', a, b, k, hemi.groundColor); hemi.intensity = lerp(a.hi, b.hi, k);
  const dusk = lerp(a.dusk, b.dusk, k), night = lerp(a.night, b.night, k);
  PK.setNight(dusk, night);
  for(const p of ptLights) p.intensity = night * 30 + dusk * 4;
  renderer.toneMappingExposure = lerp(a.exp, b.exp, k);
  starPts.material.opacity = night * .9; moon.material.opacity = night * .9;
  sunElev = lerp(a.sy, b.sy, k);
  AU.ambience(AU.muted ? false : ambWanted, night);
}
let sunElev = 30, ambWanted = false;
const TOD_ICON = ['☀️', '🌆', '🌙'];
function cycleTod(){ todT = (Math.round(todT) + 1) % 3; SAVE.tod = todT; persist(); $('#btnTod').textContent = TOD_ICON[todT]; SFX.tap(); popText(TOD_ICON[todT] + ' ' + [L('نهار', 'Day', 'Gündüz'), L('مسا', 'Evening', 'Akşam'), L('ليل', 'Night', 'Gece')][todT]); }
applyTod();

/* ---------- particles: leaves, sparkles, seeds, hearts ---------- */
const PMAX = 300, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.07, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0 }); pMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); pMesh.setColorAt(i, _c.set(0xffffff)); }
let pNext = 0;
function burst(x, y, z, n, colors, speed = 3, size = 1, grav = 6, up = 2, life = .7){
  for(let k = 0; k < n; k++){ const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX; const a = Math.random() * 6.283, s = speed * (.4 + Math.random() * .6);
    Object.assign(p, { life, max:life, x, y, z, vx:Math.cos(a) * s, vz:Math.sin(a) * s, vy:up + Math.random() * up, s:size * (.6 + Math.random() * .6), g:grav }); pMesh.setColorAt(i, _c.set(colors[k % colors.length])); }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){ const p = parts[i]; if(p.life <= 0) continue; p.life -= dt;
    if(p.life <= 0){ pMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
    p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - 2 * dt; p.vz *= 1 - 2 * dt; if(p.y < .05){ p.y = .05; p.vy *= -.3; }
    const s = p.s * Math.min(1, p.life / p.max * 2); pMesh.setMatrixAt(i, _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s))); }
  pMesh.instanceMatrix.needsUpdate = true;
}
const LEAFC = [0xd9a23a, 0xc9772a, 0xe8c04a, 0xa8642a], STARC = [0xffd23f, 0xfff3a0, 0xffffff], HEART = [0xff6f9a, 0xff9ab8, 0xffffff];
const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map:TX.blob, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-6 }));
blob.renderOrder = 6; scene.add(blob);

/* ======================================================================
   Characters: hero, bots, friends
   ====================================================================== */
const myAv = () => { try{ return window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
function makeHero(id, av){
  let h; try{ h = HEROES[id](id === 'me' ? (av || myAv()) : undefined); }catch(e){ h = HEROES.sara(); }
  K.shadowHero(h);
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner); inner.add(h.grp);
  root.rotation.order = 'YXZ';
  return { grp:root, inner, kit:h, top:1.3 };
}
/* pose: s = { t, dt, run, air, vy, sit (0..1), slide, climb, arms (raise), crouch } */
function poseAny(h, s){
  poseHero(h.kit, { t:s.t, dt:s.dt, run:s.sit ? 0 : s.run, grounded:s.sit ? true : !s.air, vy:s.vy || 0, sq:0, flip:0 });
  const k = h.kit;
  if(s.sit){
    k.legs.forEach((l, i) => { l.rotation.x = -1.45 + (s.kick ? Math.sin(s.t * 6 + i * Math.PI) * .25 : 0); });
    k.arms.forEach(a => { a.rotation.x = s.slide ? -2.6 : -1.05; a.rotation.z = -a.userData.side * (s.slide ? .5 : .15); });
    k.body.rotation.x = s.slide ? -.25 : 0;
  }
  if(s.climb){ k.arms.forEach((a, i) => { a.rotation.x = -2.6 + Math.sin(s.t * 9 + i * Math.PI) * .5; a.rotation.z = -a.userData.side * .2; }); k.body.rotation.x = -.15; }
  if(s.cheer){ k.arms.forEach((a, i) => { a.rotation.x = -.3; a.rotation.z = -a.userData.side * (2.4 + Math.sin(s.t * 12 + i) * .3); }); }
  if(s.feed){ k.arms.forEach((a, i) => { a.rotation.x = -1.2 + (i ? Math.sin(s.t * 10) * .3 : 0); }); }
  h.inner.scale.y = s.crouch ? .62 : 1;
  h.inner.position.y = s.sit ? -.42 : 0;
}

const P = { x:0, y:0, z:0, vx:0, vz:0, vy:0, f:0, gr:true, act:null, jumpT:-9, climb:false, stepT:0 };
const RUN = 4.6, JUMP = 6.4, GRAV = 17;
let hero = null;
function setHero(id){
  heroId = ALL_HEROES.includes(id) ? id : 'sara';
  if(hero) scene.remove(hero.grp);
  hero = makeHero(heroId); scene.add(hero.grp);
  if(typeof mpTrack === 'function') try{ mpTrack(); }catch(e){}
}
function placeAt(x, z, f = 0){ const y = PK.groundAt(x, z, 2); Object.assign(P, { x, y, z, vx:0, vz:0, vy:0, f, gr:true, act:null }); cam.yaw = f + Math.PI; cam.snap = true; }

/* ---------- bots: other kids playing in the park ---------- */
const BOT_N = 3;
const bots = [];
function makeBots(){
  for(const b of bots){ scene.remove(b.h.grp); b.lbl.remove(); }
  bots.length = 0;
  const pool = HERO_IDS.filter(id => id !== 'me' && id !== heroId && id !== 'laila');
  for(let i = 0; i < BOT_N; i++){
    const id = pool[(i * 2 + 1) % pool.length], h = makeHero(id); scene.add(h.grp);
    const lbl = document.createElement('div'); lbl.className = 'dname'; lbl.hidden = true; lbl.textContent = heroName(id); labelsEl.appendChild(lbl);
    const a = i / BOT_N * 6.28 + .4;
    bots.push({ id, h, lbl, x:PK.C.x + Math.cos(a) * 12, z:PK.C.z + Math.sin(a) * 12, y:0, f:a, vx:0, vz:0, vy:0, run:0, t:Math.random() * 9, task:null, wp:[], act:null, wait:1 + i, mode:'free' });
  }
}

/* ======================================================================
   Collectibles: hidden stars and golden autumn leaves
   ====================================================================== */
const C = PK.C;
const S0 = PK.SLIDES[0], S1 = PK.SLIDES[1];
const at = (s, k) => { const p = s.sample(s.len * k); return [p.x, p.y + .55, p.z]; };
const swingStar = (() => { const sw = PK.SWINGS[0]; const c = Math.cos(sw.yaw), s = Math.sin(sw.yaw); return [sw.x + s * 1.5, 1.95, sw.z + c * 1.5]; })();
const STAR_SPOTS = [
  [C.x - 2.5, 1.95, C.z - 4.0], [C.x + 1.0, 1.7, C.z - 4.6], [C.x - .75, 2.25, C.z - 4.3], [C.x - 6.5, .75, C.z + 1.5],
  at(S0, .55), at(S1, .5), swingStar, [PK.KIOSK.x - 1.2, .7, PK.KIOSK.z - 1.6],
  [PK.PITS[0].x, 1.0, PK.PITS[0].z], [-6, .8, -11.6], (() => { const e = PK.ENT[2], dx = C.x - e.x, dz = C.z - e.z, l = Math.hypot(dx, dz); return [e.x + dx / l * 1.2, .8, e.z + dz / l * 1.2]; })(),
  (() => { const p = PK.PANELS[2]; return [p.x + Math.sin(p.yaw) * .9, .8, p.z + Math.cos(p.yaw) * .9]; })(),
  (() => { const b = PK.BENCHES[1]; return [b.x - Math.sin(b.f) * .9, .7, b.z - Math.cos(b.f) * .9]; })(),
  (() => { const h = PK.HIDES[3] || PK.HIDES[0]; return [h.x, .7, h.z]; })()
];
const TOTAL_STARS = STAR_SPOTS.length;
const starGeo = (() => { const g = new THREE.ExtrudeGeometry(K.starShape(.32, .14), { depth:.1, bevelEnabled:true, bevelThickness:.04, bevelSize:.03, bevelSegments:1 }); g.translate(0, 0, -.05); return g; })();
const starMat = new THREE.MeshLambertMaterial({ color:0xffd23f, emissive:0x8a6a00 });
const stars = STAR_SPOTS.map((p, i) => { const m = new THREE.Mesh(starGeo, starMat); m.position.set(p[0], p[1], p[2]); m.castShadow = true; scene.add(m); return { i, x:p[0], y:p[1], z:p[2], m, on:!SAVE.stars.includes(i) }; });
stars.forEach(s => { s.m.visible = s.on; });
/* golden leaves: respawn every visit, scattered on lawns and paths */
const LEAF_N = 30;
const leafGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, -.22); s.quadraticCurveTo(.2, -.05, 0, .22); s.quadraticCurveTo(-.2, -.05, 0, -.22); return new THREE.ShapeGeometry(s); })();
const leafMesh = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color:0xffffff, emissive:0x5a3a00, side:THREE.DoubleSide }), LEAF_N);
scene.add(leafMesh);
const leaves = [];
{ let seed = 99; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for(let tries = 0; leaves.length < LEAF_N && tries < 3000; tries++){
    const x = -42 + r() * 78, z = -28 + r() * 54;
    if(!PK.inPark(x, z) || Math.hypot(x - C.x, z - C.z) < 10.5) continue;
    const pp = { x, z, y:0 }; if(PK.collide(Object.assign({}, pp, { y:0 }), .5)) continue;
    if(leaves.some(l => Math.hypot(l.x - x, l.z - z) < 3)) continue;
    leaves.push({ x, z, y:.55, on:true, ph:r() * 6 });
    leafMesh.setColorAt(leaves.length - 1, _c.set([0xf2b230, 0xe8862a, 0xf5cf4a][leaves.length % 3]));
  } }
function drawLeaves(t){
  leaves.forEach((l, i) => { if(!l.on){ leafMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); return; } _q.setFromEuler(_e.set(.4, t * 1.5 + l.ph, Math.sin(t * 2 + l.ph) * .4)); leafMesh.setMatrixAt(i, _m.compose(_v.set(l.x, l.y + Math.sin(t * 2 + l.ph) * .1, l.z), _q, _s.set(1.5, 1.5, 1.5))); });
  leafMesh.instanceMatrix.needsUpdate = true;
}
function collectAll(){
  for(const s of stars){ if(!s.on) continue; if(Math.hypot(s.x - P.x, s.z - P.z) < .9 && Math.abs(s.y - (P.y + .6)) < 1.0) gotStar(s); }
  for(const l of leaves){ if(!l.on) continue; if(Math.hypot(l.x - P.x, l.z - P.z) < .9 && Math.abs(l.y - (P.y + .5)) < 1.1){ l.on = false; SAVE.leaves++; leafRun++; SFX.leaf(); burst(l.x, l.y, l.z, 10, LEAFC, 2, 1, 3, 1); if(leafRun % 10 === 0){ worldCoins(1, L('ورق الخريف', 'autumn leaves', 'sonbahar yaprakları')); popText('🍂 ×10 → 🪙'); } hudKey = ''; persist(); } }
}
let leafRun = 0;
function gotStar(s){
  s.on = false; s.m.visible = false; if(!SAVE.stars.includes(s.i)) SAVE.stars.push(s.i);
  SFX.star(); burst(s.x, s.y, s.z, 24, STARC, 4, 1.2, 5, 3, .9);
  worldCoins(2, PLACE); popText('⭐ ' + N(SAVE.stars.length) + '/' + N(TOTAL_STARS));
  if(SAVE.stars.length === TOTAL_STARS){ setTimeout(() => { SFX.win(); popText('🏆 ' + L('لقيت كل النجوم!', 'You found all the stars!', 'Bütün yıldızları buldun!')); worldCoins(5, PLACE); }, 1200); }
  hudKey = ''; persist();
}

/* ======================================================================
   Pigeons and cats
   ====================================================================== */
const PIGEON_HOME = { x:C.x - 9.5, z:C.z + 11.2 };
const pigeonGeo = (() => { const M = new K.Merge(); M.add(K.G.sph, 0, .16, 0, .11, .1, .17, 0, 0, 0, 0x8a93a8); M.add(K.G.sph, 0, .27, .12, .065, .065, .065, 0, 0, 0, 0x6f7890); M.add(K.G.sm, 0, .25, .17, .03, .03, .03, 0, 0, 0, 0x5aa070); M.add(K.G.cone, 0, .26, .2, .015, .05, .015, Math.PI / 2, 0, 0, 0xe0a060); M.add(K.G.box, 0, .15, -.17, .1, .03, .1, -.3, 0, 0, 0x5a6278); for(const s of [-1, 1]){ M.add(K.G.sph, s * .1, .17, -.01, .03, .07, .13, 0, 0, 0, 0x707a92); M.add(K.G.cyl8, s * .04, .03, 0, .01, .08, .01, 0, 0, 0, 0xe07a7a); } return M.geometry(); })();
const pigeonMesh = new THREE.InstancedMesh(pigeonGeo, new THREE.MeshLambertMaterial({ vertexColors:true }), 9);
pigeonMesh.castShadow = true; scene.add(pigeonMesh);
const pigeons = []; for(let i = 0; i < 9; i++){ const a = Math.random() * 6.28, r = Math.random() * 2.5; pigeons.push({ x:PIGEON_HOME.x + Math.cos(a) * r, z:PIGEON_HOME.z + Math.sin(a) * r, y:0, f:Math.random() * 6, tx:0, tz:0, t:Math.random() * 3, fly:0, peck:0 }); }
let feedT = 0, feedAt = null;
function stepPigeons(t, dt){
  pigeons.forEach((p, i) => {
    p.t -= dt;
    const dp = Math.hypot(p.x - P.x, p.z - P.z), fast = Math.hypot(P.vx, P.vz) > 3.6;
    if(p.fly <= 0 && dp < 2.2 && fast && !feedAt){ p.fly = 3.5; SFX.flap(); const a = Math.atan2(p.x - P.x, p.z - P.z); p.vx = Math.sin(a) * 4; p.vz = Math.cos(a) * 4; }
    if(p.fly > 0){ p.fly -= dt; p.y = Math.min(6, p.y + dt * 3.5 * (p.fly > 1.2 ? 1 : -1.4)); p.x += p.vx * dt; p.z += p.vz * dt; p.f = Math.atan2(p.vx, p.vz); if(p.fly <= 1.2){ const dx = PIGEON_HOME.x - p.x, dz = PIGEON_HOME.z - p.z, l = Math.hypot(dx, dz) || 1; p.vx = dx / l * 4; p.vz = dz / l * 4; } if(p.fly <= 0){ p.y = PK.groundAt(p.x, p.z); } }
    else {
      const tgt = feedAt && feedT > 0 ? feedAt : null;
      if(p.t <= 0){ p.t = 1 + Math.random() * 2.5; const a = Math.random() * 6.28, r = Math.random() * (tgt ? 1.4 : 2.8); const c = tgt || PIGEON_HOME; p.tx = c.x + Math.cos(a) * (r + (tgt ? .5 : 0)); p.tz = c.z + Math.sin(a) * (r + (tgt ? .5 : 0)); p.peck = 0; }
      const dx = p.tx - p.x, dz = p.tz - p.z, l = Math.hypot(dx, dz);
      if(l > .1){ const sp = tgt ? 1.6 : .6; p.x += dx / l * Math.min(l, sp * dt); p.z += dz / l * Math.min(l, sp * dt); p.f = Math.atan2(dx, dz); p.peck = 0; } else p.peck += dt;
      p.y = PK.groundAt(p.x, p.z);
    }
    const bob = p.fly > 0 ? Math.sin(t * 30) * .05 : 0, pk = p.peck > 0 ? Math.max(0, Math.sin(p.peck * 9)) * .5 : Math.abs(Math.sin(t * 8 + i)) * .1;
    pigeonMesh.setMatrixAt(i, _m.compose(_v.set(p.x, p.y + bob, p.z), _q.setFromEuler(_e.set(pk, p.f, 0)), _s.set(1, 1, 1)));
  });
  pigeonMesh.instanceMatrix.needsUpdate = true;
  if(feedT > 0){ feedT -= dt; if(feedT <= 0) feedAt = null; }
}
function feedPigeons(){
  feedAt = { x:P.x + Math.sin(P.f) * .8, z:P.z + Math.cos(P.f) * .8 }; feedT = 7; SFX.seeds(); setTimeout(() => SFX.coo(), 500);
  burst(feedAt.x, .6, feedAt.z, 16, [0xe8d6a0, 0xc9b070], 1.5, .6, 8, 1, .6);
  for(const p of pigeons) p.t = 0;
  if(SAVE.fed !== today()){ SAVE.fed = today(); persist(); setTimeout(() => { popText('🐦💕'); worldCoins(1, L('طعميت الحمام', 'fed the pigeons', 'güvercinleri besledin')); }, 1500); }
}
const catGeo = col => { const M = new K.Merge(); M.add(K.G.sph, 0, .2, 0, .15, .15, .26, 0, 0, 0, col[0]); M.add(K.G.sph, 0, .38, .2, .13, .12, .12, 0, 0, 0, col[0]); for(const s of [-1, 1]){ M.add(K.G.cone4, s * .07, .5, .2, .045, .08, .03, 0, 0, s * -.2, col[0]); M.add(K.G.sm, s * .05, .39, .31, .022, .026, .01, 0, 0, 0, 0x1a1a1a); M.add(K.G.cyl8, s * .07, .07, .15, .03, .14, .03, 0, 0, 0, col[1]); M.add(K.G.cyl8, s * .07, .07, -.15, .03, .14, .03, 0, 0, 0, col[1]); } M.add(K.G.sm, 0, .35, .33, .02, .015, .01, 0, 0, 0, 0xff8fa8); M.add(K.G.cyl8, 0, .32, -.32, .025, .32, .025, -.7, 0, 0, col[0]); M.add(K.G.sph, 0, .22, .1, .1, .1, .12, 0, 0, 0, col[1]); return M.geometry(); };
const cats = [];
{ const b = PK.BENCHES[1], c1 = new THREE.Mesh(catGeo([0xe8953a, 0xfbe6c8]), new THREE.MeshLambertMaterial({ vertexColors:true }));
  c1.position.set(b.x + Math.cos(b.f) * .55, .45, b.z - Math.sin(b.f) * .55); c1.rotation.y = b.f + .6; c1.castShadow = true; scene.add(c1); cats.push({ id:0, m:c1, x:c1.position.x, z:c1.position.z, y:.45, hap:0 });
  const c2 = new THREE.Mesh(catGeo([0x2a2a2e, 0xf4f4f4]), c1.material); c2.position.set(-22.5, 0, -.8); c2.rotation.y = 1.2; c2.castShadow = true; scene.add(c2); cats.push({ id:1, m:c2, x:-22.5, z:-.8, y:0, hap:0 }); }
function petCat(c){ c.hap = 2.2; SFX.meow(); setTimeout(() => SFX.purr(), 450); burst(c.x, c.y + .6, c.z, 10, HEART, 1.2, 1, -1, .6, 1.2); popText('🐱💕');
  if(!SAVE.pet.includes(c.id)){ SAVE.pet.push(c.id); persist(); worldCoins(1, L('دلّلت البسّة', 'petted the cat', 'kediyi sevdin')); } }
function stepCats(t, dt){ for(const c of cats){ c.hap = Math.max(0, c.hap - dt); c.m.scale.y = 1 + Math.sin(t * (c.hap ? 14 : 2)) * (c.hap ? .04 : .015); c.m.rotation.z = c.hap ? Math.sin(t * 9) * .08 : 0; } }

/* ======================================================================
   Input: joystick (left), camera drag (right), A, use, get off, keyboard
   ====================================================================== */
const touch = $('#touch'), joyEl = $('#joy'), knob = $('#knob');
const aBtn = $('#btnA'), useBtn = $('#btnTalk'), exitBtn = $('#btnExit');
const joy = { id:null, x:0, y:0, ox:0, oy:0 }, look = { id:null, x:0, y:0 };
const keys = {};
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(90, SAL + 84), SH - Math.max(96, SH * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state !== 'play') return;
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.25, .6); look.x = p.x; look.y = p.y; cam.lookT = performance.now(); }
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
const pressA = () => { if(state !== 'play') return; if(P.act) actA(); else P.jumpT = simT; };
holdBtn(aBtn, pressA);
holdBtn(useBtn, () => { if(state === 'play') doUse(); });
holdBtn(exitBtn, () => { if(state === 'play' && P.act) leaveAct(); });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'play') e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'Space' || e.code === 'KeyJ'){ pressA(); e.preventDefault(); }
    if(e.code === 'KeyF' || e.code === 'Enter'){ if(P.act) leaveAct(); else doUse(); }
    if(e.code === 'KeyX' && P.act) leaveAct();
    if(e.code === 'KeyN') cycleTod();
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }
const inp = { x:0, z:0, m:0 };
let testInput = null, testGo = null, simT = 0;
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  if(testGo){ const dx = testGo.x - P.x, dz = testGo.z - P.z, l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    if(l < (testGo.r || .4)){ testGo = null; ix = iy = 0; }
    else { const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw); ix = ux * rx + uz * rz; iy = -(ux * fx + uz * fz); } }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}

/* ======================================================================
   Camera
   ====================================================================== */
const cam = { yaw:Math.PI, pAdj:0, dist:5.6, lookT:0, snap:true, x:0, y:2, z:0, tx:0, ty:1, tz:0 };
let camFix = null;
function updateCamera(dt){
  if(camFix){ camera.position.set(camFix[0], camFix[1], camFix[2]); camera.lookAt(camFix[3], camFix[4], camFix[5]); return; }
  const moving = inp.m > .2 && !P.act;
  if(moving && performance.now() - cam.lookT > 1200){ cam.yaw += angDiff(P.f + Math.PI, cam.yaw) * Math.min(1, dt * 1.6 * inp.m); }
  if(P.act && (P.act.k === 'slide') && performance.now() - cam.lookT > 900) cam.yaw += angDiff(P.f + Math.PI, cam.yaw) * Math.min(1, dt * 2.5);
  const pitch = .34 + cam.pAdj, dist = P.act && P.act.k === 'swing' ? 6.4 : cam.dist;
  const tx = P.x, ty = P.y + 1.0, tz = P.z;
  const k = cam.snap ? 1 : 1 - Math.exp(-10 * dt);
  cam.tx = lerp(cam.tx, tx, k); cam.ty = lerp(cam.ty, ty, k); cam.tz = lerp(cam.tz, tz, k);
  let cx = cam.tx + Math.sin(cam.yaw) * Math.cos(pitch) * dist, cy = cam.ty + Math.sin(pitch) * dist, cz = cam.tz + Math.cos(cam.yaw) * Math.cos(pitch) * dist;
  cy = Math.max(cy, PK.groundAt(cx, cz) + .4);
  const k2 = cam.snap ? 1 : 1 - Math.exp(-12 * dt);
  cam.x = lerp(cam.x, cx, k2); cam.y = lerp(cam.y, cy, k2); cam.z = lerp(cam.z, cz, k2); cam.snap = false;
  camera.position.set(cam.x, cam.y, cam.z); camera.lookAt(cam.tx, cam.ty, cam.tz);
}

/* ======================================================================
   Hero movement and the playground activities
   ====================================================================== */
const _o = { x:0, y:0, z:0 };
function stepHero(dt){
  simT += dt;
  readInput(dt);
  if(P.act){ stepAct(dt); collectAll(); return; }
  const want = RUN * inp.m;
  const ax = inp.x * want, az = inp.z * want, acc = P.gr ? 14 : 6;
  P.vx += clamp(ax - P.vx, -acc * dt, acc * dt) * 1; P.vz += clamp(az - P.vz, -acc * dt, acc * dt);
  if(inp.m > .1) P.f += angDiff(Math.atan2(inp.x, inp.z), P.f) * Math.min(1, dt * 12);
  // jump (buffered a little)
  if(simT - P.jumpT < .15 && P.gr){ P.vy = JUMP; P.gr = false; P.jumpT = -9; SFX.jump(); }
  P.vy -= GRAV * dt; if(P.vy < -20) P.vy = -20;
  const nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  _o.x = nx; _o.z = nz; _o.y = P.y; PK.collide(_o, .34);
  P.x = _o.x; P.z = _o.z;
  const g = PK.groundAt(P.x, P.z, P.y); P.climb = PK.groundAt.climb && P.gr && inp.m > .1;
  let ny = P.y + P.vy * dt;
  if(ny <= g){ if(!P.gr && P.vy < -4) SFX.land(); ny = g; P.vy = 0; P.gr = true; }
  else if(P.gr && ny - g < .3 && P.vy <= 0){ ny = g; P.vy = 0; } // stick to stairs / ramps going down
  else P.gr = false;
  P.y = ny;
  if(P.gr && inp.m > .3){ P.stepT -= dt * inp.m; if(P.stepT <= 0){ P.stepT = .32; SFX.step(); } }
  // walking into a slide top while going forward starts it too
  collectAll();
}
const ACT_ICON = { slide:'🛝', swing:'🎠', seesaw:'⚖️', spring:'🐎', bench:'🪑', hide:'🌳', feed:'🐦', pet:'🐱', panel:'🎲' };
function nearestUse(){
  if(P.act) return null;
  let best = null, bd = 9;
  const cand = (k, i, x, z, r, y) => { const d = Math.hypot(x - P.x, z - P.z); if(d < r && d < bd && (y == null || Math.abs(y - P.y) < .45)){ bd = d; best = { k, i }; } };
  PK.SLIDES.forEach((s, i) => cand('slide', i, s.top.x, s.top.z, 1.0, s.top.y));
  if(P.y < .6){
    PK.SWINGS.forEach((s, i) => { if(!busySwing(i)) cand('swing', i, s.x, s.z, 1.15); });
    for(const side of [0, 1]){ const e = PK.SEESAW.end(side, _v); if(!busySeesaw(side)) cand('seesaw', side, e.x, e.z, 1.3); }
    PK.SPRINGS.forEach((s, i) => { if(!busySpring(i)) cand('spring', i, s.x, s.z, 1.2); });
    PK.BENCHES.forEach((b, i) => cand('bench', i, b.x, b.z, 1.4));
    PK.HIDES.forEach((h, i) => cand('hide', i, h.x, h.z, 1.0));
    PK.PANELS.forEach((p, i) => cand('panel', i, p.x + Math.sin(p.yaw) * .5, p.z + Math.cos(p.yaw) * .5, 1.2));
    cats.forEach((c, i) => cand('pet', i, c.x, c.z, 1.7));
    const pc = pigeons.reduce((a, p) => (p.fly > 0 ? a : (Math.hypot(p.x - P.x, p.z - P.z) < 3.2 ? a + 1 : a)), 0); if(pc >= 2 && bd > 1.0){ best = { k:'feed', i:0 }; bd = 1; }
  }
  return best;
}
const busySwing = i => bots.some(b => b.act && b.act.k === 'swing' && b.act.i === i) || [...RM.values()].some(a => a.k === 'swing' && a.i === i && a.vis);
const busySpring = i => bots.some(b => b.act && b.act.k === 'spring' && b.act.i === i) || [...RM.values()].some(a => a.k === 'spring' && a.i === i && a.vis);
const busySeesaw = side => bots.some(b => b.act && b.act.k === 'seesaw' && b.act.i === side) || [...RM.values()].some(a => a.k === 'seesaw' && a.i === side && a.vis);
function doUse(){
  const n = nearestUse(); if(!n){ SFX.nope(); return; }
  startAct(n.k, n.i);
}
function startAct(k, i){
  if(k === 'feed'){ feedPigeons(); return; }
  if(k === 'pet'){ petCat(cats[i]); return; }
  if(k === 'panel'){ const p = PK.PANELS[i]; p.spin = 1; SFX.spin(); burst(p.x, 1.2, p.z, 12, [0xe8454f, 0x3a8fd8, 0x3fbf6a, 0xf2a020], 2, 1, 4, 1); return; }
  P.vx = P.vz = P.vy = 0;
  if(k === 'slide'){ const s = PK.SLIDES[i]; P.act = { k, i, d:0, v:1.4, s }; SFX.whoosh(); }
  else if(k === 'swing'){ P.act = { k, i }; SFX.sit(); }
  else if(k === 'seesaw'){ P.act = { k, i }; SFX.sit(); seesawPartnerNeeded(i); }
  else if(k === 'spring'){ P.act = { k, i }; SFX.boing(); PK.SPRINGS[i].vz += 1.5; }
  else if(k === 'bench'){ P.act = { k, i }; SFX.sit(); }
  else if(k === 'hide'){ P.act = { k, i }; SFX.rustle(); const h = PK.HIDES[i]; if(h.bush) burst(h.bush.x, h.bush.y, h.bush.z, 8, [0x3a6a2a, 0x5a8a3a], 1.5, 1, 4, 1); }
  hudKey = '';
}
function leaveAct(){
  const a = P.act; if(!a) return;
  P.act = null;
  if(a.k === 'swing'){ const s = PK.SWINGS[a.i], c = Math.sin(s.ang); P.x += Math.sin(s.yaw) * (c * 1.85 + .6); P.z += Math.cos(s.yaw) * (c * 1.85 + .6); P.vy = 2.5; P.gr = false; }
  else if(a.k === 'seesaw' || a.k === 'spring' || a.k === 'bench'){ P.x += Math.sin(P.f) * .7; P.z += Math.cos(P.f) * .7; }
  _o.x = P.x; _o.z = P.z; _o.y = 0; PK.collide(_o, .34); P.x = _o.x; P.z = _o.z;
  if(a.k !== 'slide') P.y = Math.max(PK.groundAt(P.x, P.z, P.y + .3), P.y);
  hudKey = '';
}
/* A while riding: pump the swing, push the seesaw, bounce the spring rider */
function actA(){
  const a = P.act;
  if(a.k === 'swing'){ const s = PK.SWINGS[a.i]; const dir = s.vel === 0 ? 1 : Math.sign(s.vel); if(Math.abs(s.ang) < 1.15){ s.vel += dir * .75; SFX.pump(); } }
  else if(a.k === 'seesaw'){ seesawPush(a.i, true); }
  else if(a.k === 'spring'){ const s = PK.SPRINGS[a.i]; s.vz += 1.6 * (Math.random() < .5 ? 1 : -1); s.vx += (Math.random() - .5) * 1.2; s.bounce = .35; SFX.boing(); }
  else if(a.k === 'bench' || a.k === 'hide') leaveAct();
}
function seesawPush(side, mine){
  const S = PK.SEESAW, A = .3;
  const down = side === 0 ? S.ang > A - .05 : S.ang < -A + .05;
  if(!down) return false;
  S.v = side === 0 ? -2.5 : 2.5; SFX.boing();
  if(mine) mpSend('ss', { s:side });
  return true;
}
function stepSwings(dt){
  for(const [i, s] of PK.SWINGS.entries()){
    const rider = (P.act && P.act.k === 'swing' && P.act.i === i) || bots.some(b => b.act && b.act.k === 'swing' && b.act.i === i);
    const remote = [...RM.values()].find(a => a.k === 'swing' && a.i === i && a.vis);
    if(remote && !rider){ s.ang = lerp(s.ang, remote.a, 1 - Math.exp(-14 * dt)); s.vel = 0; }
    else {
      const prev = s.vel;
      s.vel += -9.8 / s.L * Math.sin(s.ang) * dt; s.vel *= 1 - (rider ? .12 : .9) * dt; s.ang += s.vel * dt; s.ang = clamp(s.ang, -1.3, 1.3);
      if(rider && Math.sign(prev) !== Math.sign(s.vel) && Math.abs(s.ang) > .25 && P.act && P.act.i === i && P.act.k === 'swing') SFX.creak(Math.min(1, Math.abs(s.ang)));
    }
    s.piv.rotation.set(s.ang, s.yaw, 0, 'YXZ');
  }
}
function stepSeesaw(dt){
  const S = PK.SEESAW, A = .3;
  const sides = [0, 1].map(sd => (P.act && P.act.k === 'seesaw' && P.act.i === sd) || bots.some(b => b.act && b.act.k === 'seesaw' && b.act.i === sd) || [...RM.values()].some(a => a.k === 'seesaw' && a.i === sd && a.vis));
  const remoteOnly = !(P.act && P.act.k === 'seesaw') ? [...RM.values()].find(a => a.k === 'seesaw' && a.vis) : null;
  if(remoteOnly && !bots.some(b => b.act && b.act.k === 'seesaw')){ S.ang = lerp(S.ang, remoteOnly.a, 1 - Math.exp(-12 * dt)); S.v = 0; }
  else {
    const torque = (sides[0] ? 1 : 0) - (sides[1] ? 1 : 0);
    S.v += torque * 3 * dt; S.ang += S.v * dt;
    if(S.ang > A){ if(S.v > 1) SFX.thump(); S.ang = A; S.v = S.v > 0 ? -S.v * .12 : S.v; }
    if(S.ang < -A){ if(S.v < -1) SFX.thump(); S.ang = -A; S.v = S.v < 0 ? -S.v * .12 : S.v; }
  }
  S.beam.rotation.z = S.ang;
}
function stepSprings(dt){
  for(const [i, s] of PK.SPRINGS.entries()){
    const remote = [...RM.values()].find(a => a.k === 'spring' && a.i === i && a.vis);
    const mine = P.act && P.act.k === 'spring' && P.act.i === i;
    if(remote && !mine){ s.ax = lerp(s.ax, remote.a, .3); s.az = lerp(s.az, remote.b, .3); }
    else {
      s.vx += (-30 * s.ax - 1.6 * s.vx) * dt; s.vz += (-30 * s.az - 1.6 * s.vz) * dt; s.ax += s.vx * dt; s.az += s.vz * dt;
      s.ax = clamp(s.ax, -.5, .5); s.az = clamp(s.az, -.5, .5);
    }
    s.bounce = Math.max(0, (s.bounce || 0) - dt);
    s.body.rotation.set(s.az, 0, s.ax); s.body.position.y = .5 + Math.sin(s.bounce * 18) * s.bounce * .2;
  }
}
/* where a rider sits, by activity */
function seatOf(k, i, out){
  if(k === 'swing'){ const s = PK.SWINGS[i]; s.piv.updateMatrixWorld(); out.set(0, -s.L + .02, 0).applyMatrix4(s.piv.matrixWorld); return { f:s.yaw, pitch:s.ang }; }
  if(k === 'seesaw'){ const S = PK.SEESAW; S.end(i, out); return { f:S.yaw + (i === 0 ? Math.PI / 2 : -Math.PI / 2), pitch:0, roll:0 }; }
  if(k === 'spring'){ const s = PK.SPRINGS[i]; s.body.updateWorldMatrix(true, false); out.set(0, .3, -.05).applyMatrix4(s.body.matrixWorld); return { f:0, pitch:s.az }; }
  if(k === 'bench'){ const b = PK.BENCHES[i]; out.set(b.x + Math.sin(b.f) * .02, .47, b.z + Math.cos(b.f) * .02); return { f:b.f, pitch:0 }; }
  if(k === 'hide'){ const h = PK.HIDES[i]; out.set(h.x, 0, h.z); return { f:h.bush ? Math.atan2(h.bush.x - h.x, h.bush.z - h.z) : 0, pitch:0 }; }
  return { f:0, pitch:0 };
}
function stepAct(dt){
  const a = P.act;
  if(a.k === 'slide'){
    const s = a.s, p = s.sample(a.d), slope = p.dy / Math.max(.001, p.seg);
    a.v += (-slope * 9.8 * .85 - .35 * a.v) * dt; a.v = clamp(a.v, .9, 7);
    a.d += a.v * dt;
    const q = s.sample(a.d); P.x = q.x; P.y = q.y; P.z = q.z; P.f = Math.atan2(q.dx, q.dz);
    a.pitch = Math.atan2(-q.dy, Math.hypot(q.dx, q.dz));
    if(Math.random() < dt * 20) burst(P.x, P.y + .1, P.z, 1, [s.col === '#f5cf1f' ? 0xfff3a0 : 0xd8c8ff, 0xffffff], .6, .8, 1, .3, .4);
    if(a.d >= s.len){ P.act = null; P.vx = Math.sin(P.f) * a.v * .9; P.vz = Math.cos(P.f) * a.v * .9; P.vy = 2.2; P.gr = false; SFX.plop(); popText('🛝 ' + L('ويييي!', 'Wheee!', 'Vııı!')); hudKey = ''; stats.slides++; }
    return;
  }
  const r = seatOf(a.k, a.i, _v);
  P.x = _v.x; P.y = _v.y; P.z = _v.z; P.f = r.f; a.pitch = r.pitch || 0;
  if(a.k === 'swing') stats.swingMax = Math.max(stats.swingMax, Math.abs(PK.SWINGS[a.i].ang));
}
function seesawPartnerNeeded(side){
  const other = 1 - side;
  if(busySeesaw(other)) return;
  const b = bots.filter(b => b.mode === 'free').sort((p, q) => Math.hypot(p.x - P.x, p.z - P.z) - Math.hypot(q.x - P.x, q.z - P.z))[0];
  if(!b) return;
  botLeave(b);
  const e = PK.SEESAW.end(other, new THREE.Vector3()), S = PK.SEESAW, out = other ? 1 : -1;
  b.task = { k:'seesaw', i:other, until:1e9 }; b.wp = [{ x:e.x + Math.cos(S.yaw) * out * .7, z:e.z - Math.sin(S.yaw) * out * .7 }];
  popText('👫 ' + heroName(b.id) + ' ' + L('جاي يلعب معك!', 'is coming to play!', 'seninle oynamaya geliyor!'));
}

/* ---------- bots ---------- */
const STAIR_BOTTOM = { x:C.x - 2.5, z:C.z - 7.5 }, STAIR_TOP = { x:C.x - 2.5, z:C.z - 4.3 };
function botLeave(b){ if(b.act){ b.act = null; b.y = PK.groundAt(b.x, b.z, b.y); } b.task = null; b.wp = []; }
function botPickTask(b){
  const r = Math.random();
  const freeSwing = PK.SWINGS.map((s, i) => i).filter(i => !busySwing(i) && !(P.act && P.act.k === 'swing' && P.act.i === i));
  const freeSpring = PK.SPRINGS.map((s, i) => i).filter(i => !busySpring(i) && !(P.act && P.act.k === 'spring' && P.act.i === i));
  if(r < .35){ const si = Math.random() < .55 ? 0 : 1, s = PK.SLIDES[si]; b.task = { k:'slide', i:si }; b.wp = [STAIR_BOTTOM, STAIR_TOP].concat(si === 1 ? [{ x:C.x - .7, z:C.z - 4.3 }, { x:s.top.x, z:s.top.z }] : [{ x:s.top.x, z:s.top.z }]); }
  else if(r < .55 && freeSwing.length){ const i = freeSwing[(Math.random() * freeSwing.length) | 0], s = PK.SWINGS[i]; b.task = { k:'swing', i, until:simT + 6 + Math.random() * 6 }; b.wp = [{ x:s.x, z:s.z }]; }
  else if(r < .68 && freeSpring.length){ const i = freeSpring[(Math.random() * freeSpring.length) | 0], s = PK.SPRINGS[i]; b.task = { k:'spring', i, until:simT + 4 + Math.random() * 4 }; b.wp = [{ x:s.x + .8, z:s.z + .8 }]; }
  else { const a = Math.random() * 6.28, rr = 4 + Math.random() * 9; b.task = { k:'walk' }; b.wp = [{ x:C.x + Math.cos(a) * rr, z:C.z + Math.sin(a) * rr }]; }
}
function stepBot(b, dt){
  b.t += dt;
  if(b.act){
    const a = b.act;
    if(a.k === 'slide'){
      const s = PK.SLIDES[a.i], p = s.sample(a.d), slope = p.dy / Math.max(.001, p.seg);
      a.v += (-slope * 9.8 * .85 - .35 * a.v) * dt; a.v = clamp(a.v, .9, 7); a.d += a.v * dt;
      const q = s.sample(a.d); b.x = q.x; b.y = q.y; b.z = q.z; b.f = Math.atan2(q.dx, q.dz); a.pitch = Math.atan2(-q.dy, Math.hypot(q.dx, q.dz));
      if(a.d >= s.len){ b.act = null; b.vx = Math.sin(b.f) * 2; b.vz = Math.cos(b.f) * 2; b.vy = 2; b.task = null; b.wait = .8; }
      return;
    }
    const r = seatOf(a.k, a.i, _v2); b.x = _v2.x; b.y = _v2.y; b.z = _v2.z; b.f = r.f; a.pitch = r.pitch || 0;
    if(a.k === 'swing'){ const s = PK.SWINGS[a.i]; if(Math.abs(s.ang) < .7 && Math.abs(s.vel) < 1.6 && Math.random() < dt * 2.5) s.vel += (s.vel >= 0 ? 1 : -1) * .5; }
    if(a.k === 'spring' && Math.random() < dt * 1.2){ const s = PK.SPRINGS[a.i]; s.vz += 1.4 * (Math.random() < .5 ? 1 : -1); s.bounce = .3; }
    if(a.k === 'seesaw'){
      const S = PK.SEESAW, down = a.i === 0 ? S.ang > .25 : S.ang < -.25;
      if(down){ a.dt = (a.dt || 0) + dt; if(a.dt > .35 + Math.random() * .4){ seesawPush(a.i, false); a.dt = 0; } } else a.dt = 0;
      const partner = (P.act && P.act.k === 'seesaw') || [...RM.values()].some(x => x.k === 'seesaw' && x.vis);
      if(!partner){ a.lonely = (a.lonely || 0) + dt; if(a.lonely > 2){ botLeave(b); b.wait = 1; } }
    }
    if(b.task && b.task.until && simT > b.task.until){ botLeave(b); b.wait = 1; }
    return;
  }
  if(b.mode === 'caught' || b.mode === 'hidden') { b.vx = b.vz = 0; }
  else if(b.mode === 'flee'){ // run away from the player (and friends)
    let dx = b.x - P.x, dz = b.z - P.z, l = Math.hypot(dx, dz) || 1;
    if(b.dodge > 0){ b.dodge -= dt; dx = b.dx; dz = b.dz; l = 1; }
    const sp = l < 9 ? 3.7 : 1.6; b.vx = dx / l * sp; b.vz = dz / l * sp;
  } else {
    if(!b.task){ b.wait -= dt; if(b.wait <= 0) botPickTask(b); b.vx = b.vz = 0; }
    else {
      const w = b.wp[0];
      if(!w){
        const t = b.task;
        if(t.k === 'slide'){ b.act = { k:'slide', i:t.i, d:0, v:1.4 }; }
        else if(t.k === 'swing' && !busySwingOther(t.i, b)) b.act = { k:'swing', i:t.i };
        else if(t.k === 'spring' && !busySpringOther(t.i, b)) b.act = { k:'spring', i:t.i };
        else if(t.k === 'seesaw') b.act = { k:'seesaw', i:t.i };
        else { b.task = null; b.wait = 1 + Math.random() * 3; }
        b.vx = b.vz = 0;
      } else {
        const dx = w.x - b.x, dz = w.z - b.z, l = Math.hypot(dx, dz);
        if(l < (b.wp.length === 1 && b.task.k !== 'walk' && b.task.k !== 'slide' ? .9 : .45)){ b.wp.shift(); }
        else { const sp = b.task.k === 'seesaw' ? 3.8 : 2.6; let ux = dx / l, uz = dz / l;
          if(b.side > 0){ b.side -= dt; const s = b.sideDir; const px = -uz * s, pz = ux * s; ux = ux * .3 + px; uz = uz * .3 + pz; const m = Math.hypot(ux, uz); ux /= m; uz /= m; }
          b.vx = ux * sp; b.vz = uz * sp; }
        b.stuck = (b.stuck || 0) + dt; if(b.stuck > 14){ b.stuck = 0; b.wp = []; b.task = null; }
      }
    }
  }
  const ox = b.x, oz = b.z;
  _o.x = b.x + b.vx * dt; _o.z = b.z + b.vz * dt; _o.y = b.y;
  const hit = PK.collide(_o, .34);
  if(b.mode === 'flee' && hit && !(b.dodge > 0)){ const a = Math.atan2(C.x - b.x, C.z - b.z) + (Math.random() - .5) * 1.4; b.dx = Math.sin(a); b.dz = Math.cos(a); b.dodge = 1.2; }
  // blocked while walking somewhere: side-step around the obstacle for a moment
  if(b.mode === 'free' && b.task && !(b.side > 0)){ const want = Math.hypot(b.vx, b.vz) * dt, got = Math.hypot(_o.x - ox, _o.z - oz); if(want > 1e-3 && got < want * .35){ b.side = .7; b.sideDir = Math.random() < .5 ? 1 : -1; } }
  b.x = _o.x; b.z = _o.z;
  const g = PK.groundAt(b.x, b.z, b.y);
  b.vy -= GRAV * dt; b.y += b.vy * dt; if(b.y <= g){ b.y = g; b.vy = 0; } else if(b.y - g < .3 && b.vy <= 0){ b.y = g; b.vy = 0; }
  const sp = Math.hypot(b.x - ox, b.z - oz) / Math.max(dt, 1e-4);
  b.run = lerp(b.run, clamp(sp / RUN, 0, 1), .2);
  if(sp > .2) b.f += angDiff(Math.atan2(b.x - ox, b.z - oz), b.f) * Math.min(1, dt * 10);
}
const busySwingOther = (i, me) => bots.some(b => b !== me && b.act && b.act.k === 'swing' && b.act.i === i) || (P.act && P.act.k === 'swing' && P.act.i === i);
const busySpringOther = (i, me) => bots.some(b => b !== me && b.act && b.act.k === 'spring' && b.act.i === i) || (P.act && P.act.k === 'spring' && P.act.i === i);
function drawChar(h, s, x, y, z, f, pitch){
  h.grp.position.set(x, y, z); h.grp.rotation.set(pitch || 0, f, 0, 'YXZ');
  poseAny(h, s);
}

/* ======================================================================
   Small games: «لقّيطة» (tag) and «غمّيضة» (hide-and-seek)
   ====================================================================== */
let mode = null;   // { k:'tag'|'seek', t, phase, n }
const timerEl = $('#timer');
function startTag(){
  if(P.act) leaveAct();
  mode = { k:'tag', t:60, n:0 };
  for(const b of bots){ botLeave(b); b.mode = 'flee'; const a = Math.random() * 6.28; b.x = P.x + Math.sin(a) * 7; b.z = P.z + Math.cos(a) * 7; _o.x = b.x; _o.z = b.z; _o.y = 0; PK.collide(_o, .4); b.x = _o.x; b.z = _o.z; b.y = PK.groundAt(b.x, b.z, 0); }
  SFX.check(); popText('🏃 ' + L('لقّيطة! إلحق أصحابك والمسهن', 'Tag! Chase your friends and touch them', 'Kovalamaca! Arkadaşlarını kovala ve dokun'));
  hudKey = '';
}
function startSeek(){
  if(P.act) leaveAct();
  mode = { k:'seek', t:90, n:0, count:3 };
  const spots = PK.HIDES.slice().sort(() => Math.random() - .5);
  bots.forEach((b, i) => { botLeave(b); b.mode = 'hidden'; const h = spots[i % spots.length]; b.hide = h; b.x = h.x; b.z = h.z; b.y = 0; b.f = h.bush ? Math.atan2(h.bush.x - h.x, h.bush.z - h.z) : 0; });
  SFX.check(); popText('🙈 ' + L('غمّيضة! سكّر عيونك… 3', 'Hide-and-seek! Close your eyes… 3', 'Saklambaç! Gözlerini kapat… 3'));
  hudKey = '';
}
function endMode(win){
  if(!mode) return;
  const k = mode.k; mode = null; timerEl.hidden = true;
  for(const b of bots){ b.mode = 'free'; b.task = null; b.wait = 1 + Math.random() * 2; b.hide = null; }
  if(win){ SFX.win(); popText('🏆 ' + L('برافو! ربحت', 'Well done! You won', 'Aferin! Kazandın')); SAVE.wins[k] = (SAVE.wins[k] | 0) + 1; worldCoins(3, k === 'tag' ? L('لقّيطة', 'tag', 'kovalamaca') : L('غمّيضة', 'hide-and-seek', 'saklambaç')); }
  else { SFX.nope(); popText('⏰ ' + L('خلص الوقت! جرّب كمان مرة', "Time's up! Try again", 'Süre bitti! Tekrar dene')); }
  persist(); hudKey = '';
}
let tagCd = 0;
function stepMode(dt){
  if(!mode) return;
  if(mode.k === 'seek' && mode.count > 0){ const c0 = Math.ceil(mode.count); mode.count -= dt; const c1 = Math.ceil(mode.count); if(c1 !== c0 && c1 > 0){ SFX.tick(); popText('🙈 ' + N(c1)); } if(mode.count <= 0){ SFX.check(); popText('🔍 ' + L('يلّا دوّر!', 'Go find them!', 'Hadi bul!')); } timerEl.hidden = false; timerEl.textContent = '🙈 ' + N(Math.max(1, Math.ceil(mode.count))); return; }
  mode.t -= dt;
  timerEl.hidden = false; timerEl.textContent = (mode.k === 'tag' ? '🏃 ' : '🔍 ') + N(mode.n) + '/' + N(bots.length) + '  ⏱️ ' + N(Math.max(0, Math.ceil(mode.t)));
  if(mode.k === 'tag'){
    for(const b of bots){ if(b.mode === 'flee' && Math.hypot(b.x - P.x, b.z - P.z) < 1.15 && Math.abs(b.y - P.y) < 1.2){ b.mode = 'caught'; mode.n++; SFX.tag(); burst(b.x, b.y + 1, b.z, 14, STARC, 3, 1, 5, 2); popText('🙌 ' + heroName(b.id) + '!'); } }
    tagCd -= dt;
    if(tagCd <= 0) for(const a of RM.values()) if(a.vis && Math.hypot(a.x - P.x, a.z - P.z) < 1.15 && Math.abs(a.y - P.y) < 1.2){ mpSend('tag', { to:a.id }); SFX.tag(); popText('🙌 ' + (BoboRT.who(a.id, '') || heroName(a.hero)) + '!'); tagCd = 3; break; }
  } else {
    for(const b of bots){ if(b.mode === 'hidden' && Math.hypot(b.x - P.x, b.z - P.z) < 1.7){ b.mode = 'caught'; mode.n++; SFX.found(); burst(b.x, 1, b.z, 14, STARC, 3, 1, 5, 2); popText('👀 ' + L('لقيت', 'Found', 'Buldun:') + ' ' + heroName(b.id) + '!'); } }
    for(const b of bots) if(b.mode === 'hidden' && Math.hypot(b.x - P.x, b.z - P.z) < 4 && Math.random() < dt * .7) SFX.rustle();
  }
  if(mode.n >= bots.length) endMode(true);
  else if(mode.t <= 0) endMode(false);
}

/* ======================================================================
   HUD, labels
   ====================================================================== */
const hudEl = $('#hud'), labelsEl = $('#labels');
let hudKey = '', state = 'menu', coinBump = 0;
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on; aBtn.hidden = !on; useBtn.hidden = !on;
  if(!on){ exitBtn.hidden = true; $('#hint').hidden = true; timerEl.hidden = true; for(const b of bots) b.lbl.hidden = true; }
}
function hudFrame(dt){
  coinBump = Math.max(0, coinBump - dt);
  const n = nearestUse(), ak = P.act ? P.act.k : '';
  const tk = [SAVE.coins, SAVE.stars.length, SAVE.leaves, n ? n.k : '', ak, todT].join('|');
  if(tk !== hudKey){
    hudKey = tk;
    $('#hudCoins').textContent = N(SAVE.coins); $('#hudStars').textContent = '⭐ ' + N(SAVE.stars.length) + '/' + N(TOTAL_STARS); $('#hudLeaves').textContent = '🍂 ' + N(SAVE.leaves);
    useBtn.hidden = !!P.act; useBtn.classList.toggle('ready', !!n); useBtn.textContent = n ? ACT_ICON[n.k] : '👋';
    exitBtn.hidden = !P.act || ak === 'slide';
    aBtn.textContent = ak === 'swing' || ak === 'spring' || ak === 'seesaw' ? '💪' : 'A';
    const h = $('#hint'); const ht = ak === 'swing' ? L('اضغط 💪 لتطير أعلى!', 'Tap 💪 to swing higher!', 'Daha yükseğe için 💪 bas!') : ak === 'seesaw' ? L('لما تنزل، اضغط 💪 لتطلع!', 'When you are down, tap 💪 to go up!', 'Aşağıdayken 💪 bas, yukarı çık!') : ak === 'spring' ? L('اضغط 💪 لتنطّ!', 'Tap 💪 to bounce!', 'Zıplamak için 💪 bas!') : ak === 'hide' ? L('إنت مخبّى ورا الشجيرة 🤫', 'You are hiding behind the bush 🤫', 'Çalının arkasında saklanıyorsun 🤫') : '';
    h.hidden = !ht; if(ht) h.textContent = ht;
    $('#btnTod').textContent = TOD_ICON[todT];
  }
  const bc = $('#bigcoin'); if(coinBump > .25 && !bc.classList.contains('bump')){ bc.classList.add('bump'); setTimeout(() => bc.classList.remove('bump'), 300); }
}
function popText(text){ const box = $('#pops'); while(box.children.length > 2) box.firstChild.remove(); const d = document.createElement('div'); d.className = 'pop'; d.textContent = text; box.appendChild(d); setTimeout(() => d.remove(), 1700); }
function placeBotLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  for(const b of bots){
    const show = state === 'play' && b.mode !== 'hidden' && Math.hypot(b.x - P.x, b.z - P.z) < 13;
    if(!show){ b.lbl.hidden = true; continue; }
    _v.set(b.x, b.y + 1.75, b.z).project(camera); if(_v.z > 1){ b.lbl.hidden = true; continue; }
    b.lbl.hidden = false; b.lbl.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

/* ======================================================================
   Cards: title, hero picker, pause, games
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function hideOverlay(){ overlay.hidden = true; }
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
function myHeroBtn(id = 'bMyHero'){ return `<button class="hero-btn" id="${id}" style="--c:${heroCol(heroId)}"><img src="${charImg(heroId)}" alt=""><span>${heroName(heroId)}</span> 🔄</button>`; }
function sndBtn(){ return `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`; }
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); applyTod(); }; }
function menuView(){ cam.yaw = 2.6; cam.pAdj = .12; P.x = C.x - 2; P.z = C.z + 4; P.y = .12; P.act = null; cam.snap = true; }
function showTitle(){
  if(MP.t) coStop();
  if(mode) endMode(false);
  state = 'menu'; setPlayUI(false); AU.music(false); clearInput(); ambWanted = false; AU.ambience(false);
  menuView();
  showOverlay('clear'); card.className = 'card bare';
  card.innerHTML = `${sndBtn()}<div class="menu">
    <div class="logo">🛝</div>
    <h1>${PLACE}</h1>
    <p class="sub">🌳 ${L('حديقتنا بالحارة! تزحلق، تمرجح، العب عالميزان، لمّ النجوم وورق الخريف.', 'Our neighbourhood park! Slide, swing, ride the seesaw, collect stars and autumn leaves.', 'Mahallemizin parkı! Kay, sallan, tahterevalliye bin, yıldız ve yaprak topla.')}</p>
    ${myHeroBtn()}
    <div class="stars"><span>🪙 ${N(SAVE.coins)}</span><span>⭐ ${N(SAVE.stars.length)}/${N(TOTAL_STARS)}</span><span>🍂 ${N(SAVE.leaves)}</span></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${SAVE.total ? L('كمّل', 'Continue', 'Devam') : L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMP">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  wireSnd();
  $('#bMP').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('menu'); };
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); beginGame(); };
}
let selFrom = 'menu';
function showSelect(from){
  selFrom = from || 'menu'; state = 'select';
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🛝 ${L('مين بدو يلعب؟', 'Who will play?', 'Kim oynayacak?')}</h2>
    <div class="heroes">${ALL_HEROES.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${heroCol(id)}"><img src="${charImg(id)}" alt=""><b>${heroName(id)}</b></button>`).join('')}</div>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { SAVE.hero = b.dataset.h; persist(); setHero(b.dataset.h); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bOk').onclick = () => { SFX.tap(); backFromSelect(); };
}
function backFromSelect(){ makeBots(); if(selFrom === 'pause') showPause(true); else if(selFrom === 'mp'){ if(mpActive() && MP.screen === 'lobby') mpLobby(); else mpMenu(); } else showTitle(); }
function showPause(force){
  if(state !== 'play' && !force) return;
  state = 'pause'; clearInput(); AU.music(false);
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `${sndBtn()}<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    ${mpActive() ? `<p>👫 ${L('أصحابك لسّا عم يلعبوا · غرفة', 'Your friends keep playing · room', 'Arkadaşların oynuyor · oda')} <bdi dir="ltr">${MP.code}</bdi></p>` : ''}
    <div class="row"><span class="tag" style="--rc:#ffe27a">⭐ ${N(SAVE.stars.length)}/${N(TOTAL_STARS)}</span><span class="tag" style="--rc:#ffd2a0">🍂 ${N(SAVE.leaves)}</span><span class="tag" style="--rc:#c8f0d8">🏃 ${N(SAVE.wins.tag | 0)} · 🙈 ${N(SAVE.wins.seek | 0)}</span></div>
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>${myHeroBtn()}</div>
    <div class="row"><button class="ghost-btn" id="bTod2">${TOD_ICON[todT]} ${L('نهار / مسا / ليل', 'Day / evening / night', 'Gündüz / akşam / gece')}</button><button class="ghost-btn" id="bMenu">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); resume(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bTod2').onclick = () => { cycleTod(); $('#bTod2').textContent = TOD_ICON[todT] + ' ' + L('نهار / مسا / ليل', 'Day / evening / night', 'Gündüz / akşam / gece'); };
  $('#bMenu').onclick = () => { SFX.tap(); persist(true); showTitle(); };
  $('#bExit').onclick = () => { persist(true); try{ coStop(); }catch(e){} location.href = '../'; };
}
function resume(){ hideOverlay(); state = 'play'; setPlayUI(true); hudKey = ''; AU.music(true); ambWanted = true; applyTod(); last = performance.now(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
$('#btnTod').onclick = () => { if(state === 'play') cycleTod(); };
$('#btnGames').onclick = () => { if(state !== 'play') return; SFX.tap(); showGames(); };
function showGames(){
  state = 'games'; clearInput();
  showOverlay('dim'); card.className = 'card';
  card.innerHTML = `<button class="x-btn" id="bX">✕</button><h2>🏃 ${L('شو بدنا نلعب؟', 'What shall we play?', 'Ne oynayalım?')}</h2>
    <div class="row"><button class="gamebtn" id="gTag"><i>🏃</i>${L('لقّيطة', 'Tag', 'Kovalamaca')}<small>${L('إلحق أصحابك والمسهن', 'Chase and touch them', 'Kovala ve dokun')}</small></button>
    <button class="gamebtn" id="gSeek"><i>🙈</i>${L('غمّيضة', 'Hide-and-seek', 'Saklambaç')}<small>${L('دوّر عليهن ورا الشجيرات', 'Find them behind the bushes', 'Çalıların arkasında bul')}</small></button></div>
    ${mode ? `<button class="ghost-btn" id="gStop">⏹️ ${L('وقّف اللعبة', 'Stop the game', 'Oyunu durdur')}</button>` : ''}`;
  $('#bX').onclick = () => { SFX.tap(); resume(); };
  $('#gTag').onclick = () => { SFX.tap(); resume(); startTag(); };
  $('#gSeek').onclick = () => { SFX.tap(); resume(); startSeek(); };
  const st = $('#gStop'); if(st) st.onclick = () => { SFX.tap(); resume(); mode = null; timerEl.hidden = true; for(const b of bots){ b.mode = 'free'; b.task = null; } };
}

/* ======================================================================
   Start / main loop / auto quality
   ====================================================================== */
const stats = { slides:0, swingMax:0 };
let started = false;
function beginGame(){
  hideOverlay(); state = 'play'; setPlayUI(true); hudKey = '';
  if(!started){ started = true; placeAt(PK.spawn.x, PK.spawn.z, PK.spawn.f); }
  cam.snap = true;
  AU.music(true); ambWanted = true; applyTod();
}
let last = performance.now(), fpsT = 0, fpsN = 0, lowT = 0, frozen = false;
function frame(now){
  requestAnimationFrame(frame);
  if(frozen) return;
  const rdt = Math.min(.5, Math.max(0, (now - last) / 1000)); let dt = Math.min(.05, rdt); last = now;
  const t = now / 1000;
  if(Math.abs(tod - todT) > .001){ tod += clamp(todT - tod, -rdt * .8, rdt * .8); applyTod(); }
  const live = state !== 'menu' && state !== 'select' && state !== 'mp';
  if(state === 'play') stepHero(dt);
  if(live){ for(const b of bots) stepBot(b, dt); stepMode(state === 'play' ? rdt : 0); }
  stepSwings(dt); stepSeesaw(dt); stepSprings(dt); stepPigeons(t, dt); stepCats(t, dt); PK.tick(t, dt);
  if(state === 'play') hudFrame(dt);
  mpFrame(dt); stepRemotes(dt);
  if(state === 'menu' || state === 'mp' || state === 'select'){ cam.yaw += dt * .07; }
  // draw the hero and bots
  const a = P.act;
  drawChar(hero, { t, dt, run:clamp(Math.hypot(P.vx, P.vz) / RUN, 0, 1), air:!P.gr && !a, vy:P.vy, sit:a && a.k !== 'hide' ? 1 : 0, slide:a && a.k === 'slide', climb:P.climb, crouch:a && a.k === 'hide', kick:a && a.k === 'swing' }, P.x, P.y, P.z, P.f, a ? (a.k === 'slide' ? a.pitch * .6 : a.pitch) : 0);
  hero.grp.visible = state !== 'menu' || true;
  blob.position.set(P.x, PK.groundAt(P.x, P.z, P.y) + .02, P.z); const bs = clamp(1 - (P.y - PK.groundAt(P.x, P.z, P.y)) * .3, .4, 1); blob.scale.set(bs, 1, bs);
  for(const b of bots){ const ba = b.act; b.h.grp.visible = live || state === 'menu'; drawChar(b.h, { t:b.t, dt, run:b.run, air:false, vy:0, sit:ba ? 1 : 0, slide:ba && ba.k === 'slide', crouch:b.mode === 'hidden', cheer:b.mode === 'caught' && b.t % 3 < 1.5, kick:ba && ba.k === 'swing' }, b.x, b.y, b.z, b.f, ba ? (ba.k === 'slide' ? (ba.pitch || 0) * .6 : (ba.pitch || 0)) : 0); }
  drawLeaves(t);
  for(const s of stars) if(s.on){ s.m.rotation.y = t * 2 + s.i; s.m.position.y = s.y + Math.sin(t * 2.4 + s.i) * .08; }
  PK.PANELS.forEach(() => {});
  updateCamera(dt); updateParts(dt);
  // shadows follow the hero
  const se = sunElev * Math.PI / 180;
  sun.position.set(P.x + Math.cos(se) * 40 * .6, Math.sin(se) * 40 + 6, P.z + Math.cos(se) * 40 * .8); sun.target.position.set(P.x, 0, P.z);
  sky.position.copy(camera.position); starPts.position.copy(camera.position);
  if(state === 'play' || state === 'pause' || state === 'games') placeBotLabels();
  placeRemoteLabels();
  renderer.render(scene, camera);
  fpsT += dt; fpsN++;
  if(fpsT > 2){ const fps = fpsN / fpsT; lastFps = fps; fpsT = 0; fpsN = 0; if(fps < 42 && state === 'play' && quality > 0 && QS.get('q') == null){ lowT++; if(lowT >= 2){ quality--; lowT = 0; applyQuality(); } } else lowT = 0; }
}
let lastFps = 0;

/* ======================================================================
   Online («👫 العب مع أصحابك»): up to 4 friends in the same park. Only positions and what each one is riding travel
   (event 'pos' ~10×/s; 'hi' asks the others to send theirs now; 'ss' = a seesaw push; 'tag' = «got you!» in tag).
   Names never travel: only the friend code (presence 'fc'); every phone asks the server for the name (../rt.js).
   Nothing is stored on a server.
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'hi', 'ss', 'tag'];
const MP_MAX = 4;
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
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-hara-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
/* ?mp=local: tabs of the same browser talk through a BroadcastChannel (tests) */
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-hara-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, hostId:null, synced:false, screen:'off', tok:0, posT:0, typed:'', inviteFor:null, err:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = h => ALL_HEROES.includes(h) ? h : 'sara';
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
const r2 = v => Math.round(v * 100) / 100;
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }

/* «أصحابي»: tell friends which room I'm in (every call is guarded). */
const FR_GAME = 'hara';
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
addEventListener('pagehide', () => { try{ if(MP.t) mpClose(); }catch(e){} });

function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.hostId = null; MP.synced = false;
  for(const id of [...RM.keys()]) dropRemote(id);
}
function myMeta(){ return { fc:BoboRT.fc(), hero:heroId, av:heroId === 'me' ? myAv() : null }; }
async function mpOpen(code, how){
  mpClose();
  const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport(), tok = ++MP.tok;
  MP.t = t; MP.code = code; MP.id = MP.id || mpNewId();
  const live = () => MP.t === t && MP.tok === tok;
  try{
    await t.open(code, MP.id, {
      presence:list => { if(live()) mpPresence(list); },
      msg:(ev, p) => { if(live() && p && typeof p === 'object' && typeof p.id === 'string') mpMsg(ev, p); },
      status:s => { if(live() && s === 'up') mpTrack(); }
    });
  }catch(e){ if(live()) mpClose(); throw e; }
  if(!live()) throw new Error('cancelled');
  const t0 = performance.now();
  t.track({ ph:'probe' });
  await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
  if(MP.synced) await new Promise(r => setTimeout(r, 300));
  if(!live()) throw new Error('cancelled');
  const others = MP.list.filter(p => p.id !== MP.id);
  if(how === 'create' && others.length){ mpClose(); return 'busy'; }
  if(how === 'join' && !others.length){ mpClose(); return 'nobody'; }
  if(others.length >= MP_MAX){ mpClose(); return 'full'; }
  MP.meta = Object.assign(myMeta(), { o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' });
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ Object.assign(MP.meta, myMeta()); MP.meta.fc = MP.meta.fc || BoboRT.fc(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t && MP.meta) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { if(MP.screen === 'lobby') mpLobbyDraw(); });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  if(all.findIndex(p => p.id === MP.id) >= MP_MAX){ coStop(); showTitle(); toast(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  if(MP.hostId && !MP.players.some(p => p.id === MP.hostId)) MP.hostId = MP.players[0] && MP.players[0].id;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.check(); toast('👋 ' + joined.map(p => BoboRT.who(p.id, '') || heroName(okHero(p.hero))).join('، ') + ' ' + L('فات عالحديقة!', 'came to the park!', 'parka geldi!')); }
  remoteSync(MP.players);
  MP.posT = 0;
  if(MP.screen === 'lobby') mpLobbyDraw();
}
const ACT_CODE = ['', 'slide', 'swing', 'seesaw', 'spring', 'bench', 'hide'];
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'hi'){ MP.posT = 0; return; }
  if(ev === 'ss'){ const a = RM.get(p.id); if(a && (p.s === 0 || p.s === 1) && P.act && P.act.k === 'seesaw') seesawPush(p.s, false); return; }
  if(ev === 'tag'){ if(p.to === MP.id && state === 'play'){ const a = RM.get(p.id); SFX.tag(); toast('🙌 ' + ((a && BoboRT.who(a.id, '')) || heroName(a ? a.hero : 'sara')) + ' ' + L('لقطك! إلحقه إنت هلّق', 'tagged you! Now you chase', 'seni yakaladı! Şimdi sen kovala'), 2600); } return; }
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.posT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  if(MP.posT <= 0 && (state === 'play' || state === 'pause' || state === 'games')){
    MP.posT = .1;
    const a = P.act, k = a ? ACT_CODE.indexOf(a.k) : 0;
    let av = 0, bv = 0;
    if(a && a.k === 'swing') av = PK.SWINGS[a.i].ang; else if(a && a.k === 'seesaw') av = PK.SEESAW.ang; else if(a && a.k === 'spring'){ av = PK.SPRINGS[a.i].ax; bv = PK.SPRINGS[a.i].az; } else if(a && a.k === 'slide') av = a.pitch || 0;
    mpSend('pos', { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), m:r2(clamp(Math.hypot(P.vx, P.vz) / RUN, 0, 1)), air:P.gr ? 0 : 1, vy:r2(P.vy), k, i:a ? (a.i | 0) : 0, a:r2(av), b:r2(bv) });
  }
}
function coStop(){ MP.tok++; mpClose(); MP.screen = 'off'; }

/* ---------- friends in the park ---------- */
const RM = new Map();
function labelEl(){ const d = document.createElement('div'); d.className = 'nm'; d.hidden = true; labelsEl.appendChild(d); return d; }
function dropRemote(id){ const a = RM.get(id); if(!a) return; if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.lbl.remove(); RM.delete(id); }
function remoteSync(list){
  const here = new Set();
  for(const p of list){
    if(p.id === MP.id) continue;
    here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, key:'', h:null, lbl:labelEl(), buf:[], seen:false, t:Math.random() * 5, x:0, y:0, z:0, f:0, m:0, air:0, vy:0, k:'', i:0, a:0, b:0, vis:false }; RM.set(p.id, a); }
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null;
    const key = hero + '|' + (av ? JSON.stringify(av) : '');
    if(a.key !== key){ if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.key = key; a.hero = hero; a.h = makeHero(hero, av); a.h.grp.visible = false; scene.add(a.h.grp); }
  }
  for(const id of [...RM.keys()]) if(!here.has(id)) dropRemote(id);
}
function onPos(p){
  const a = RM.get(p.id); if(!a) return;
  a.buf.push({ t:performance.now(), x:numIn(p.x, -200, 200), y:numIn(p.y, -10, 30), z:numIn(p.z, -200, 200), f:numIn(p.f, -1e3, 1e3), m:numIn(p.m, 0, 1) });
  if(a.buf.length > 12) a.buf.shift();
  if(!a.seen){ const b = a.buf[0]; a.x = b.x; a.y = b.y; a.z = b.z; a.f = b.f; }
  a.seen = true; a.air = p.air ? 1 : 0; a.vy = numIn(p.vy, -40, 40);
  const k = ACT_CODE[numIn(p.k, 0, ACT_CODE.length - 1) | 0] || '';
  const maxI = k === 'swing' ? PK.SWINGS.length - 1 : k === 'spring' ? PK.SPRINGS.length - 1 : k === 'seesaw' ? 1 : k === 'bench' ? PK.BENCHES.length - 1 : k === 'hide' ? PK.HIDES.length - 1 : k === 'slide' ? PK.SLIDES.length - 1 : 0;
  a.k = k; a.i = numIn(p.i, 0, maxI) | 0; a.a = numIn(p.a, -1.5, 1.5); a.b = numIn(p.b, -1, 1);
}
function stepRemotes(dt){
  const now = performance.now(), rt = now - 200;
  for(const a of RM.values()){
    a.t += dt;
    if(a.buf.length){
      let i = a.buf.length - 1; while(i > 0 && a.buf[i - 1].t > rt) i--;
      const q = a.buf[i], pr = i > 0 ? a.buf[i - 1] : null; let s = q;
      if(pr && q.t > rt){ const k = clamp((rt - pr.t) / Math.max(1, q.t - pr.t), 0, 1); s = { x:lerp(pr.x, q.x, k), y:lerp(pr.y, q.y, k), z:lerp(pr.z, q.z, k), m:lerp(pr.m, q.m, k), f:pr.f + angDiff(q.f, pr.f) * k }; }
      const k = 1 - Math.exp(-16 * dt);
      a.x = lerp(a.x, s.x, k); a.y = lerp(a.y, s.y, k); a.z = lerp(a.z, s.z, k); a.f += angDiff(s.f, a.f) * k; a.m = lerp(a.m, s.m, k);
    }
    if(!a.h) continue;
    const show = a.seen && state !== 'menu' && state !== 'mp' && state !== 'select' && a.k !== 'hide';
    a.vis = a.seen && state !== 'menu' && state !== 'mp' && state !== 'select';
    a.h.grp.visible = show; if(!show) continue;
    let x = a.x, y = a.y, z = a.z, f = a.f, pitch = 0;
    if(a.k === 'swing' || a.k === 'seesaw' || a.k === 'spring' || a.k === 'bench'){ const r = seatOf(a.k, a.i, _v2); x = _v2.x; y = _v2.y; z = _v2.z; f = r.f; pitch = r.pitch || 0; }
    else if(a.k === 'slide') pitch = a.a * .6;
    drawChar(a.h, { t:a.t, dt, run:a.m, air:!!a.air, vy:a.vy, sit:a.k && a.k !== 'hide' ? 1 : 0, slide:a.k === 'slide', kick:a.k === 'swing' }, x, y, z, f, pitch);
    a.dx = x; a.dy = y; a.dz = z;
  }
}
function placeRemoteLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  for(const a of RM.values()){
    const show = (state === 'play' || state === 'pause' || state === 'games') && a.h && a.h.grp.visible;
    if(a.lbl.hidden !== !show) a.lbl.hidden = !show;
    if(!show) continue;
    const txt = BoboRT.who(a.id, '') || heroName(a.hero) || '';
    if(a.lbl.textContent !== txt) a.lbl.textContent = txt;
    _v.set(a.dx, a.dy + 1.75, a.dz).project(camera);
    if(_v.z > 1){ a.lbl.hidden = true; continue; }
    a.lbl.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

/* ---------- menu, lobby, keypad ---------- */
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false); AU.music(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🛝 ${L('لحتى 4 أصحاب سوا بحديقة الحارة: تزحلقوا وتمرجحوا والعبوا عالميزان سوا!', 'Up to 4 friends together in the Neighbourhood Park: slide, swing and ride the seesaw together!', "Mahalle Parkı'nda 4 arkadaşa kadar: birlikte kayın, sallanın, tahterevalliye binin!")}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function mpBack(){ if(MP.screen === 'menu') showTitle(); else if(MP.screen === 'lobby'){ coStop(); mpMenu(); } else mpMenu(); }
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
function mpLobby(){
  if(!mpActive()){ mpMenu(); return; }
  MP.screen = 'lobby'; mpCard(true); AU.music(false);
  mpLobbyDraw();
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wt">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), mine = p.id === MP.id;
    return `<div class="pslot" style="--c:${heroCol(hero)}"><img src="${mine ? charImg(heroId) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${mine ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  card.innerHTML = `<h2>🛝 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    <p>${L('قلّ لأصحابك رقم الغرفة 👆 وكل واحد بيقدر يبلّش هلّق، والباقي بيلحقوه عالحديقة!', 'Tell your friends the room number 👆 Everyone can start now, the others catch up in the park!', 'Arkadaşlarına oda numarasını söyle 👆 Herkes şimdi başlayabilir, diğerleri parka gelir!')}</p>
    <div class="row">${myHeroBtn()}<button class="big-btn" id="bGo">▶️ ${L('يلّا نلعب', "Let's play", 'Hadi oynayalım')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`;
  $('#bGo').onclick = () => { AU.ac(); SFX.tap(); MP.screen = 'in'; beginGame(); mpSend('hi', {}); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); coStop(); mpMenu(); };
}
async function mpOpenRetry(code, how, until){
  for(;;){
    try{ return await mpOpen(code, how); }
    catch(e){ if(String(e && e.message) === 'cancelled' || MP.screen !== 'connecting' || performance.now() > until - 3000) throw e; await new Promise(r => setTimeout(r, 800)); if(MP.screen !== 'connecting') throw new Error('cancelled'); }
  }
}
async function mpCreate(want){
  mpConnecting();
  const limit = performance.now() + 20000;
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpenRetry(code, 'create', limit);
      if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(want)); }
}
async function mpJoin(code, until){
  mpConnecting();
  const limit = until || performance.now() + 20000;
  try{
    let r = await mpOpenRetry(code, 'join', limit);
    if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpenRetry(code, 'join', limit); if(MP.screen !== 'connecting'){ if(r === 'ok') coStop(); return; }
    }
    if(r === 'ok'){ mpLobby(); mpSend('hi', {}); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
function mpSendInvite(){
  const who = MP.inviteFor; if(!who || !MP.code || !window.Friends) return;
  MP.inviteFor = null;
  const no = () => toast(L('ما قدرنا نبعت الدعوة 🙈 قلّو رقم الغرفة', "Couldn't send the invite 🙈 tell them the room number", 'Davet gönderilemedi 🙈 oda numarasını söyle'));
  try{
    Friends.invite(who, MP.code, FR_GAME).then(r => {
      if(r && r.status === 'sent') toast(L('✉️ بعتنا دعوة لصاحبك! استنّاه يفوت', '✉️ Invite sent! Wait for your friend to join', '✉️ Davet gönderildi! Arkadaşının gelmesini bekle'));
      else no();
    }, no);
  }catch(e){ no(); }
}
function mpKeypad(msg){
  MP.tok++; mpClose();
  MP.screen = 'keypad'; MP.typed = ''; mpCard(true);
  const keys9 = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => `<button data-k="${d}">${N(d)}</button>`).join('');
  card.innerHTML = `<h2>🔢 ${L('اكتب رقم الغرفة', 'Type the room number', 'Oda numarasını yaz')}</h2>
    <div class="mp-cols"><div class="mp-col"><div class="mp-code" id="kpCode"></div><p class="mp-msg" id="kpMsg"></p>
      <button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>
    <div class="keypad" id="keypad">${keys9}<button data-k="del" aria-label="${L('امسح', 'Delete', 'Sil')}">⌫</button><button data-k="0">${N(0)}</button><button class="ok" data-k="ok" aria-label="${L('تمام', 'OK', 'Tamam')}">✅</button></div></div>`;
  $('#kpMsg').textContent = msg || '';
  card.querySelectorAll('#keypad button').forEach(b => b.onclick = () => mpKey(b.dataset.k));
  $('#bBack').onclick = () => { SFX.tap(); mpMenu(); };
  mpKeyDraw();
}
function mpKeyDraw(){ const el = $('#kpCode'); if(!el) return; el.innerHTML = [0, 1, 2, 3].map(i => `<b class="${i === MP.typed.length ? 'cur' : ''}">${MP.typed[i] != null ? N(MP.typed[i]) : ''}</b>`).join(''); }
function mpKey(k){
  if(MP.screen !== 'keypad') return;
  if(k === 'del'){ MP.typed = MP.typed.slice(0, -1); SFX.tap(); }
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.nope(); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; SFX.tap(); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code) mpJoin(code); }, 300); }
}
addEventListener('keydown', e => {
  if(state !== 'mp' || MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(true); if(state === 'play' && !mpActive()) showPause(); } });

/* ======================================================================
   Test hooks (used by the automated tests only)
   ====================================================================== */
window.__hara = {
  get state(){ return state; }, get P(){ return { x:r2(P.x), y:r2(P.y), z:r2(P.z), gr:P.gr, f:r2(P.f), act:P.act ? { k:P.act.k, i:P.act.i, d:P.act.d } : null, climb:P.climb }; },
  get coins(){ return SAVE.coins; }, get stars(){ return SAVE.stars.slice(); }, get leaves(){ return SAVE.leaves; }, get total(){ return TOTAL_STARS; }, get save(){ return JSON.parse(JSON.stringify(SAVE)); }, get stats(){ return Object.assign({}, stats); },
  get tod(){ return { tod, todT }; }, get mode(){ return mode ? { k:mode.k, t:mode.t, n:mode.n, count:mode.count } : null; }, get quality(){ return quality; }, get fps(){ return lastFps; },
  get world(){ return { C, slides:PK.SLIDES.map(s => ({ top:s.top, len:s.len, end:s.pts[s.pts.length - 1] })), swings:PK.SWINGS.map(s => ({ x:s.x, z:s.z, ang:s.ang })), seesaw:{ x:PK.SEESAW.x, z:PK.SEESAW.z, ang:PK.SEESAW.ang }, springs:PK.SPRINGS.map(s => ({ x:s.x, z:s.z, ax:s.ax, az:s.az })), benches:PK.BENCHES, hides:PK.HIDES.map(h => ({ x:h.x, z:h.z })), stars:stars.map(s => ({ i:s.i, x:s.x, y:s.y, z:s.z, on:s.on })), leaves:leaves.filter(l => l.on).map(l => [l.x, l.z]), stair:STAIR_BOTTOM, climb:PK.climb, ent:PK.ENT, kiosk:PK.KIOSK, pigeons:PIGEON_HOME, cats:cats.map(c => ({ x:c.x, z:c.z })) }; },
  get bots(){ return bots.map(b => ({ id:b.id, x:r2(b.x), y:r2(b.y), z:r2(b.z), mode:b.mode, act:b.act ? b.act.k + ':' + b.act.i : null, task:b.task ? b.task.k : null })); },
  menu(){ showTitle(); }, play(){ beginGame(); }, pause(){ showPause(); }, resume(){ resume(); }, games(){ showGames(); }, select(){ showSelect('menu'); }, hero(id){ setHero(id); },
  tp(x, z, f){ placeAt(x, z, f != null ? f : P.f); }, tpy(x, y, z){ P.x = x; P.y = y; P.z = z; P.vy = 0; P.gr = false; P.act = null; }, go(x, z, r){ testGo = { x, z, r }; }, get going(){ return !!testGo; }, input(x, y){ testInput = x == null ? null : { x, y }; },
  A(){ pressA(); }, use(){ doUse(); }, start(k, i){ startAct(k, i); }, leave(){ leaveAct(); }, near(){ const n = nearestUse(); return n ? n.k + ':' + n.i : null; },
  yaw(a){ cam.yaw = a; cam.lookT = performance.now(); }, pitch(a){ cam.pAdj = a; cam.lookT = performance.now(); }, face(x, z){ P.f = Math.atan2(x - P.x, z - P.z); cam.yaw = P.f + Math.PI; cam.snap = true; cam.lookT = performance.now(); },
  camFix(a){ camFix = a || null; }, setTod(k){ todT = tod = k; SAVE.tod = k; applyTod(); hudKey = ''; }, cycleTod(){ cycleTod(); },
  tag(){ startTag(); }, seek(){ startSeek(); }, endMode(w){ endMode(w); }, setModeTime(t){ if(mode){ mode.t = t; if(mode.count) mode.count = Math.min(mode.count, t); } }, bot(i, x, z){ const b = bots[i]; if(b){ b.x = x; b.z = z; } },
  feed(){ feedPigeons(); }, pet(i){ petCat(cats[i]); }, freeze(v){ frozen = !!v; }, reset(){ SAVE = freshSave(); persist(true); stars.forEach(s => { s.on = true; s.m.visible = true; }); },
  setQuality(q){ quality = q; applyQuality(); }, info(){ const i = renderer.info.render; return { calls:i.calls, tris:i.triangles, geos:renderer.info.memory.geometries, tex:renderer.info.memory.textures }; },
  back(){ if(state === 'mp') mpBack(); else if(state === 'select') backFromSelect(); else showTitle(); },
  get mpScreen(){ return MP.screen; }, get mp(){ return { code:MP.code, active:mpActive(), hostId:MP.hostId, screen:MP.screen, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero })) }; }, get mpErr(){ return MP.err || ''; },
  get remotes(){ return [...RM.values()].map(a => ({ id:a.id, seen:a.seen, x:r2(a.x), y:r2(a.y), z:r2(a.z), k:a.k, i:a.i, a:a.a, vis:!!(a.h && a.h.grp.visible), name:a.lbl.hidden ? null : a.lbl.textContent })); },
  mpMenu(){ mpMenu(); }, mpCreate(c){ return mpCreate(c); }, mpJoin(c){ return mpJoin(c); }, mpGo(){ const b = document.querySelector('#bGo'); if(b) b.click(); }, mpLeave(){ coStop(); showTitle(); }
};

/* ---------- boot ---------- */
setHero(heroId);
const labelsInit = labelsEl; void labelsInit;
makeBots();
applyQuality();
showTitle();
requestAnimationFrame(t => { last = t; frame(t); });
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one
   (it keeps trying for 20 s while nobody is there yet) */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
