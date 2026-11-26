/* Bobo Blocks («عالم مكعّبات بوبو 🧱») — an original 3D block building sandbox for kids.
   A voxel world of hills, a river, a lake and a little village. Walk, jump, swim or fly ✈️; tap a block face to put the
   chosen block there (a see-through ghost shows where), switch to the pickaxe ⛏️ to take blocks away. Six hotbar slots
   and ▦ the full palette (nature, wood, building, colours, decor). Creative: every block is free and never runs out.
   «قريتي» 🏡: name your village (fixed word lists, no typing), pick ready-made buildings that rise block by block in a few
   seconds on the village plots for in-game coins 🪙; earn coins and stars ⭐ (levels) by building and by small tasks.
   Animals wander (a horse to ride 🐴, sheep, chickens, a cat, a dog) and send hearts when you pet them.
   Day and night (torches and lamps light up the dark), 3 saved worlds on this phone.
   Online («👫 العب مع أصحابك», ../rt.js): up to 4 friends build in the host's world. The host owns the world: a friend who
   comes in gets its seed and the list of changed blocks; then every block change (x, y, z, block) is sent to everyone.
   Names over heads come from the server (BoboRT.who); nothing is typed, there is no chat. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { BL, ID, CATS, PALETTE, OPAQUE, SOLID, SHAPE, LIGHT, TOP, SIDE, BOT, VALID, SH, PER, drawAtlas, makeIcons, isDoor } from './blocks.js';
import { makeWorld, meshChunk, raycast, unpackEdits, WX, WZ, WH, CS, NCX, NCZ, SEA, VH, PLOTS, SPAWN, VX0, VZ0, VW, VD, PLOT, rng } from './world.js';
import { BLUEPRINTS, BP, bpCells, treeCells } from './blueprints.js';
import { KINDS, makeAnimal, poseAnimal } from './models.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const L = window.L || ((a) => a);
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); return true; }catch(e){ return false; } };
const rawDel = k => { try{ localStorage.removeItem(k); }catch(e){} };
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const r2 = v => Math.round(v * 100) / 100;
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const AU = makeAudio(), SFX = AU.SFX;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const bname = id => BL[id] ? L(...BL[id].n) : '';

/* ======================================================================
   Village names (fixed word lists: no typing)
   ====================================================================== */
const NOUNS = [['الشمس', 'Sun', 'Güneş', '☀️'], ['القمر', 'Moon', 'Ay', '🌙'], ['النجوم', 'Star', 'Yıldız', '⭐'], ['الورد', 'Rose', 'Gül', '🌹'], ['التفاح', 'Apple', 'Elma', '🍎'],
  ['الغيوم', 'Cloud', 'Bulut', '☁️'], ['النهر', 'River', 'Nehir', '🏞️'], ['الفراشات', 'Butterfly', 'Kelebek', '🦋'], ['العسل', 'Honey', 'Bal', '🍯'], ['قوس قزح', 'Rainbow', 'Gökkuşağı', '🌈'],
  ['الكرز', 'Cherry', 'Kiraz', '🍒'], ['الصنوبر', 'Pine', 'Çam', '🌲']];
const ADJS = [['السعيدة', 'Happy', 'Mutlu'], ['الحلوة', 'Sweet', 'Tatlı'], ['الذهبية', 'Golden', 'Altın'], ['الخضرا', 'Green', 'Yeşil'], ['الكبيرة', 'Big', 'Büyük'],
  ['الصغيرة', 'Little', 'Küçük'], ['اللامعة', 'Shiny', 'Parlak'], ['الهادية', 'Calm', 'Sakin'], ['السحرية', 'Magic', 'Sihirli'], ['الملوّنة', 'Colourful', 'Renkli']];
const okNi = i => (i | 0) >= 0 && (i | 0) < NOUNS.length ? i | 0 : 0;
const okAi = i => (i | 0) >= 0 && (i | 0) < ADJS.length ? i | 0 : 0;
function villageName(a, n){ const A = ADJS[okAi(a)], Nn = NOUNS[okNi(n)]; return L('قرية ' + Nn[0] + ' ' + A[0], A[1] + ' ' + Nn[1] + ' Village', A[2] + ' ' + Nn[2] + ' Köyü'); }

/* ======================================================================
   Save: the player (coins, stars, tasks, hero, hotbar) and up to 3 worlds on this phone
   ====================================================================== */
const SFXK = MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : '';
const PKEY = 'blocks_profile' + SFXK, WKEY = i => 'blocks_world' + SFXK + '_' + i, NSLOT = 3, COIN_CAP = 60;
const DEF_HOT = [ID.plankOak, ID.cobble, ID.window, ID.roofRed, ID.torch, ID.doorX];
function freshProfile(){ return { v:1, hero:null, coins:100, xp:0, lvl:1, tasks:null, tn:0, cyc:0, cd:{ d:'', n:0 }, hot:DEF_HOT.slice(), sel:0, cam:0, tut:0, bc:0, last:-1 }; }
function loadProfile(){
  try{
    const v = JSON.parse(rawGet(PKEY));
    if(v && typeof v === 'object' && v.v === 1){
      const p = Object.assign(freshProfile(), v);
      p.coins = clamp(p.coins | 0, 0, 999999); p.xp = clamp(p.xp | 0, 0, 9999999); p.lvl = clamp(p.lvl | 0, 1, 99); p.tn = clamp(p.tn | 0, 0, 9999); p.cyc = clamp(p.cyc | 0, 0, 99);
      p.hot = Array.isArray(p.hot) && p.hot.length === 6 ? p.hot.map(i => (VALID[i] && !BL[i].hide) ? i | 0 : ID.plankOak) : DEF_HOT.slice();
      p.sel = clamp(p.sel | 0, 0, 5); p.cam = clamp(p.cam | 0, 0, 2); p.bc = clamp(p.bc | 0, 0, 999); p.last = clamp(p.last | 0, -1, NSLOT - 1);
      if(!p.cd || typeof p.cd !== 'object') p.cd = { d:'', n:0 }; p.cd.n = clamp(p.cd.n | 0, 0, COIN_CAP);
      if(!Array.isArray(p.tasks)) p.tasks = null; else p.tasks = p.tasks.filter(t => t && TASKS.some(d => d.id === t.id)).slice(0, 3).map(t => ({ id:t.id, c:clamp(t.c | 0, 0, 9999), g:clamp(t.g | 0, 1, 9999) }));
      return p;
    }
  }catch(e){}
  return null;
}
const TASKS = [
  { id:'place', k:'place', n:10, e:'🧱', t:['ابني {n} مكعّبات', 'Build {n} blocks', '{n} blok koy'], c:20, x:15 },
  { id:'tree', k:'tree', n:5, e:'🌳', t:['ازرع {n} شجرات', 'Plant {n} trees', '{n} ağaç dik'], c:25, x:20 },
  { id:'petHorse', k:'petHorse', n:1, e:'🐴', t:['ملّس عالحصان', 'Pet the horse', 'Atı sev'], c:15, x:10 },
  { id:'bp', k:'bp', n:1, e:'🏠', t:['ابني بناية جاهزة بقريتك', 'Build a ready building', 'Köyüne hazır bina yap'], c:30, x:25 },
  { id:'ride', k:'ride', n:1, e:'🏇', t:['اركب الحصان', 'Ride the horse', 'Ata bin'], c:15, x:10 },
  { id:'torch', k:'torch', n:3, e:'🔥', t:['حطّ {n} شعلات', 'Place {n} torches', '{n} meşale koy'], c:15, x:12 },
  { id:'break', k:'break', n:10, e:'⛏️', t:['كسّر {n} مكعّبات', 'Break {n} blocks', '{n} blok kır'], c:15, x:12 },
  { id:'fly', k:'flyHigh', n:1, e:'✈️', t:['طير لفوق عالي', 'Fly up high', 'Yükseğe uç'], c:15, x:10 },
  { id:'pet', k:'pet', n:3, e:'💕', t:['ملّس {n} حيوانات', 'Pet {n} animals', '{n} hayvan sev'], c:20, x:15 },
  { id:'wool', k:'wool', n:8, e:'🎨', t:['ابني {n} مكعّبات صوف ملوّنة', 'Build {n} colour wool blocks', '{n} renkli yün koy'], c:20, x:15 },
  { id:'place2', k:'place', n:40, e:'🏗️', t:['ابني {n} مكعّب', 'Build {n} blocks', '{n} blok koy'], c:40, x:30 },
  { id:'bp2', k:'bp', n:2, e:'🏘️', t:['ابني {n} بنايات جاهزة', 'Build {n} ready buildings', '{n} hazır bina yap'], c:45, x:40 }
];
let PRO = loadProfile() || freshProfile();
function persistPro(){ rawSet(PKEY, JSON.stringify(PRO)); }
let heroId = HERO_IDS.includes(PRO.hero) ? PRO.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
const needXp = l => 30 + l * 25;
function readSlot(i){
  try{ const v = JSON.parse(rawGet(WKEY(i))); if(v && typeof v === 'object' && v.v === 1 && Number.isFinite(v.seed)) return v; }catch(e){}
  return null;
}

/* ---------- always-landscape stage ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW_ = innerWidth, SW = innerWidth, SHh = innerHeight, SAL = 0, SAB = 0;
function layout(){
  VW_ = innerWidth; const vh = innerHeight; ROT = vh > VW_;
  SW = ROT ? vh : VW_; SHh = ROT ? VW_ : vh;
  const st = stage.style;
  st.width = SW + 'px'; st.height = SHh + 'px';
  st.transform = ROT ? `translateX(${VW_}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SHh + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SHh <= 520);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
}
function toLayer(cx, cy){ return ROT ? { x:cy, y:VW_ - cx } : { x:cx, y:cy }; }
layout();

/* ======================================================================
   Renderer, sky, light
   ====================================================================== */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:false, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; $('#loading').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(66, 1, .1, 900);
function resize(){
  layout();
  renderer.setSize(SW, SHh, false);
  camera.aspect = SW / SHh; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));

const hemi = new THREE.HemisphereLight(0xdff2ff, 0x7a6a50, 1.1); scene.add(hemi);
const sunL = new THREE.DirectionalLight(0xffffff, 1.6); sunL.position.set(30, 60, 20); scene.add(sunL);
scene.fog = new THREE.Fog(0xbfe8ff, 40, 80);
const v3 = (r, g, b) => new THREE.Vector3(r, g, b);
const hexV = h => v3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
/* atlas: raw (for the block shader, colours used as they are) and sRGB (for normal three.js materials) */
const atlasCv = drawAtlas();
const ICONS = makeIcons(atlasCv);
const atlasRaw = new THREE.CanvasTexture(atlasCv); atlasRaw.flipY = false; atlasRaw.magFilter = atlasRaw.minFilter = THREE.NearestFilter; atlasRaw.generateMipmaps = false;
const atlasS = new THREE.CanvasTexture(atlasCv); atlasS.flipY = false; atlasS.magFilter = atlasS.minFilter = THREE.NearestFilter; atlasS.generateMipmaps = false; atlasS.colorSpace = THREE.SRGBColorSpace;
const TILE_COL = (() => { const x = atlasCv.getContext('2d'), out = []; for(let i = 0; i < 256; i++){ const d = x.getImageData((i % PER) * 16, Math.floor(i / PER) * 16, 16, 16).data; let r = 0, g = 0, b = 0, n = 0; for(let k = 0; k < d.length; k += 4) if(d[k + 3] > 100){ r += d[k]; g += d[k + 1]; b += d[k + 2]; n++; } out.push(n ? [r / n | 0, g / n | 0, b / n | 0] : [0, 0, 0]); } return out; })();

const U = {
  map:{ value:atlasRaw }, uAmb:{ value:v3(1, 1, 1) }, uTorch:{ value:v3(1, .78, .45) }, uFog:{ value:v3(.75, .9, 1) }, uNear:{ value:40 }, uFar:{ value:80 }, uTime:{ value:0 }, uAlpha:{ value:1 }
};
const VS = `attribute vec2 buv; attribute float tile; attribute float shd; attribute float tl;
varying vec2 vUv; varying float vTile; varying float vSh; varying float vTl; varying float vDepth;
void main(){ vUv = buv; vTile = tile; vSh = shd; vTl = tl; vec4 mv = modelViewMatrix * vec4(position, 1.0); vDepth = length(mv.xyz); gl_Position = projectionMatrix * mv; }`;
const FS = `uniform sampler2D map; uniform vec3 uAmb; uniform vec3 uTorch; uniform vec3 uFog; uniform float uNear; uniform float uFar; uniform float uTime; uniform float uAlpha;
varying vec2 vUv; varying float vTile; varying float vSh; varying float vTl; varying float vDepth;
void main(){
  vec2 f = vUv;
#ifdef WATER
  f += vec2(uTime * 0.21, uTime * 0.13) + vec2(sin(uTime * 1.3 + vUv.y * 2.0), cos(uTime * 1.1 + vUv.x * 2.0)) * 0.06;
#endif
  f = clamp(fract(f), 0.002, 0.998);
  float tx = mod(vTile + 0.5, 16.0) - 0.5, ty = floor((vTile + 0.5) / 16.0);
  vec4 c = texture2D(map, (vec2(tx, ty) + f) / 16.0);
#ifndef WATER
  if(c.a < 0.5) discard;
#endif
  float t = vTl * vTl;
  vec3 Lc = max(uAmb, uTorch * t * 1.3);
  vec3 col = c.rgb * vSh * Lc;
  float fg = smoothstep(uNear, uFar, vDepth);
  gl_FragColor = vec4(mix(col, uFog, fg), uAlpha);
}`;
const chunkMat = new THREE.ShaderMaterial({ uniforms:U, vertexShader:VS, fragmentShader:FS });
const waterMat = new THREE.ShaderMaterial({ uniforms:Object.assign({}, U, { uAlpha:{ value:.78 } }), vertexShader:VS, fragmentShader:FS, defines:{ WATER:1 }, transparent:true, depthWrite:false });
for(const k of Object.keys(U)) if(k !== 'uAlpha') waterMat.uniforms[k] = U[k];

/* sky dome, sun, moon, stars, clouds */
const SKY = { top:{ value:new THREE.Vector3() }, hor:{ value:new THREE.Vector3() }, sun:{ value:new THREE.Vector3(0, 1, 0) }, glow:{ value:new THREE.Vector3() } };
const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 16), new THREE.ShaderMaterial({ uniforms:SKY, side:THREE.BackSide, depthWrite:false, fog:false,
  vertexShader:'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader:'uniform vec3 top; uniform vec3 hor; uniform vec3 sun; uniform vec3 glow; varying vec3 vP; void main(){ float h = clamp(vP.y, -0.2, 1.0); vec3 c = mix(hor, top, pow(max(h, 0.0), 0.55)); float s = max(dot(vP, sun), 0.0); c += glow * pow(s, 6.0) * 0.55; gl_FragColor = vec4(c, 1.0); }' }));
sky.renderOrder = -10; scene.add(sky);
function glowSprite(col, size, add){
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, col); g.addColorStop(.35, col); g.addColorStop(.42, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, fog:false, depthWrite:false, transparent:true, blending:add ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.setScalar(size); return s;
}
const sunS = glowSprite('#fff6c9', 60, false), moonS = glowSprite('#eef3ff', 34, false);
sunS.renderOrder = moonS.renderOrder = -9; scene.add(sunS); scene.add(moonS);
const stars = (() => { const n = 500, p = new Float32Array(n * 3), R = rng(77); for(let i = 0; i < n; i++){ const a = R() * Math.PI * 2, y = .08 + R() * .92, r = Math.sqrt(1 - y * y); p[i * 3] = Math.cos(a) * r * 380; p[i * 3 + 1] = y * 380; p[i * 3 + 2] = Math.sin(a) * r * 380; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.Points(g, new THREE.PointsMaterial({ color:0xffffff, size:2.2, sizeAttenuation:false, transparent:true, opacity:0, fog:false, depthWrite:false })); m.renderOrder = -9; scene.add(m); return m; })();
const clouds = (() => {
  const R = rng(5), cells = [];
  for(let z = -30; z < 30; z++) for(let x = -30; x < 30; x++){ const v = Math.sin(x * .37 + Math.sin(z * .21) * 2) + Math.cos(z * .31 + Math.sin(x * .17) * 2) + R() * .6; if(v > 1.25) cells.push([x, z]); }
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(8, 2.4, 8), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:.88, fog:false, depthWrite:false }), cells.length);
  const o = new THREE.Object3D(); cells.forEach((c, i) => { o.position.set(c[0] * 8, 0, c[1] * 8); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
  m.position.y = 78; m.renderOrder = -8; m.frustumCulled = false; scene.add(m); return m;
})();

/* ======================================================================
   The world: chunk meshes, light sources (torch glows)
   ====================================================================== */
let W = null, chunks = [], lightSet = new Set(), worldInfo = null;
function disposeChunks(){ for(const c of chunks) if(c){ for(const m of [c.o, c.w]) if(m){ scene.remove(m); m.geometry.dispose(); } } chunks = []; }
function mkMesh(B, mat){
  if(!B.n) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
  g.setAttribute('buv', new THREE.Float32BufferAttribute(B.u, 2));
  g.setAttribute('tile', new THREE.Float32BufferAttribute(B.t, 1));
  g.setAttribute('shd', new THREE.Float32BufferAttribute(B.s, 1));
  g.setAttribute('tl', new THREE.Float32BufferAttribute(B.l, 1));
  g.setIndex(B.n > 65535 ? new THREE.Uint32BufferAttribute(B.i, 1) : new THREE.Uint16BufferAttribute(B.i, 1));
  g.computeBoundingSphere();
  const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false; scene.add(m); return m;
}
let meshCount = 0;
function buildChunk(ci){
  const cx = ci % NCX, cz = Math.floor(ci / NCX);
  const r = meshChunk(W, cx, cz);
  const old = chunks[ci];
  if(old) for(const m of [old.o, old.w]) if(m){ scene.remove(m); m.geometry.dispose(); }
  const c = { o:mkMesh(r.o, chunkMat), w:mkMesh(r.w, waterMat), cx:cx * CS + CS / 2, cz:cz * CS + CS / 2 };
  if(c.w) c.w.renderOrder = 2;
  chunks[ci] = c; meshCount++;
}
function remesh(budgetMs){
  if(!W || !W.dirty.size) return;
  const t0 = performance.now();
  const list = [...W.dirty].sort((a, b) => cdist(a) - cdist(b));
  for(const ci of list){ W.dirty.delete(ci); buildChunk(ci); if(performance.now() - t0 > budgetMs) break; }
}
function cdist(ci){ const cx = (ci % NCX) * CS + 8, cz = Math.floor(ci / NCX) * CS + 8; return Math.hypot(cx - P.x, cz - P.z); }
function scanLights(){ lightSet = new Set(); const d = W.data; for(let i = 0; i < d.length; i++) if(LIGHT[d[i]]) lightSet.add(i); }
/* make (or swap) the world; edits = Map of changes */
async function setWorld(info, edits, progress){
  disposeChunks();
  W = makeWorld(info.seed);
  if(edits && edits.size) W.applyEdits(edits);
  worldInfo = info;
  scanLights();
  spawnAnimals();
  jobs.length = 0; grows.length = 0; clearLabels();
  const all = [...Array(NCX * NCZ).keys()].sort((a, b) => cdist(a) - cdist(b));
  W.dirty.clear();
  for(let k = 0; k < all.length; k++){
    buildChunk(all[k]);
    if(k % 6 === 5){ if(progress) progress((k + 1) / all.length); await new Promise(r => setTimeout(r, 0)); }
  }
  if(progress) progress(1);
}
/* the one place every block change goes through; send = tell friends */
function setBlock(x, y, z, id, send = true){
  if(!W) return false;
  const i = W.idx(x, y, z), old = W.get(x, y, z);
  if(!W.set(x, y, z, id)) return false;
  if(LIGHT[old]) lightSet.delete(i); if(LIGHT[id]) lightSet.add(i);
  if(send) mpEdit(x, y, z, id);
  dirtyWorld = true;
  return true;
}
let dirtyWorld = false;

/* torch glows (sprites at the nearest light blocks) */
const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,120,1)'); g.addColorStop(.3, 'rgba(255,170,70,.5)'); g.addColorStop(1, 'rgba(255,150,50,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const GLOWS = []; for(let i = 0; i < 36; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false })); s.visible = false; scene.add(s); GLOWS.push(s); }
let glowT = 0, glowList = [];
function updateGlows(dt, night){
  glowT -= dt;
  if(glowT <= 0){
    glowT = .5; const cx = camera.position.x, cz = camera.position.z;
    const arr = []; for(const i of lightSet){ const x = i % WX, z = Math.floor(i / WX) % WZ, y = Math.floor(i / (WX * WZ)); const d = (x - cx) * (x - cx) + (z - cz) * (z - cz); if(d < 70 * 70) arr.push([d, x, y, z, W.data[i]]); }
    arr.sort((a, b) => a[0] - b[0]); glowList = arr.slice(0, GLOWS.length);
  }
  const t = performance.now() / 1000;
  GLOWS.forEach((s, k) => {
    const g = glowList[k];
    if(!g || night < .05){ s.visible = false; return; }
    const torch = g[4] === ID.torch;
    s.visible = true; s.position.set(g[1] + .5, g[2] + (torch ? .72 : .5), g[3] + .5);
    s.scale.setScalar((torch ? 1.5 : 2.6) * (1 + Math.sin(t * 9 + k * 3) * .06 * (torch ? 1 : .3)));
    s.material.opacity = night * .85;
  });
}

/* ======================================================================
   Heroes (me and friends) with a block in the hand
   ====================================================================== */
const HS = 1.38;
const myAv = () => { try{ return heroId === 'me' && window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const okHero = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(HEROES, id)) ? id : 'sara';
const boxGeoCache = new Map();
function tileBoxGeo(id){
  if(boxGeoCache.has(id)) return boxGeoCache.get(id);
  const g = new THREE.BoxGeometry(1, 1, 1), uv = g.attributes.uv;
  for(let f = 0; f < 6; f++){
    const t = f === 2 ? TOP[id] : f === 3 ? BOT[id] : SIDE[id], tx = t % PER, ty = Math.floor(t / PER);
    for(let k = 0; k < 4; k++){ const i = f * 4 + k; uv.setXY(i, (tx + uv.getX(i)) / PER, (ty + 1 - uv.getY(i)) / PER); }
  }
  boxGeoCache.set(id, g); return g;
}
const heldMat = new THREE.MeshLambertMaterial({ map:atlasS, alphaTest:.5 });
function setHeld(h, id){
  if(h.heldId === id) return;
  if(h.held){ h.held.parent && h.held.parent.remove(h.held); }
  h.heldId = id;
  const m = new THREE.Mesh(tileBoxGeo(id), heldMat); m.scale.setScalar(.2);
  const arm = h.arms.find(a => a.userData.side > 0) || h.arms[0];
  if(arm){ m.position.set(0, -.34, .08); arm.add(m); } else { m.position.set(.2, .5, .25); h.body.add(m); }
  h.held = m;
}
function makeHero(id, av){
  let h; try{ h = id === 'me' ? HEROES.me(av || undefined) : HEROES[id](); }catch(e){ h = HEROES.sara(); }
  h.grp.scale.setScalar(HS);
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map:K.blobTex, transparent:true, depthWrite:false }));
  blob.rotation.x = -Math.PI / 2; blob.scale.setScalar(.9); scene.add(blob); h.blob = blob;
  return h;
}
function dropHero(h){ if(!h) return; h.grp.parent && h.grp.parent.remove(h.grp); if(h.blob) scene.remove(h.blob); }
function buildPose(h, k){ const arm = h.arms.find(a => a.userData.side > 0) || h.arms[0]; if(!arm) return; const s = Math.sin(k * Math.PI); arm.rotation.x = -1.6 + s * -.9; arm.rotation.z = -.1; }
function sitPose(h, t){ h.body.position.y = 0; h.body.rotation.set(0, 0, 0); h.legs.forEach((l, i) => { l.rotation.x = -1.3; l.rotation.z = (i ? 1 : -1) * .5; }); h.arms.forEach(a => { a.rotation.x = -.9; a.rotation.z = -a.userData.side * .15; }); h.head.rotation.set(Math.sin(t * 2) * .04, 0, 0); }

/* ======================================================================
   Me
   ====================================================================== */
const P = { x:SPAWN.x, y:VH + 1, z:SPAWN.z, vx:0, vz:0, vy:0, f:0, m:0, gr:false, fly:false, swim:false, t:0, sq:0, act:0, actK:0, ride:-1, autoJ:0, lastGround:VH + 1 };
let heroM = null;
function setHero(id){
  heroId = HERO_IDS.includes(id) ? id : 'sara';
  dropHero(heroM);
  heroM = makeHero(heroId, myAv()); scene.add(heroM.grp); heroM.heldId = -1; setHeld(heroM, PRO.hot[PRO.sel]);
}
const PW = .3, PHt = 1.7;
function solidH(x, y, z){ const id = W.get(x, y, z); return SOLID[id] ? (SHAPE[id] === SH.slab ? .5 : 1) : 0; }
function hits(px, py, pz, ph = PHt){
  const x0 = Math.floor(px - PW), x1 = Math.floor(px + PW - 1e-6), z0 = Math.floor(pz - PW), z1 = Math.floor(pz + PW - 1e-6), y0 = Math.floor(py), y1 = Math.floor(py + ph - 1e-6);
  for(let y = y0; y <= y1; y++) for(let z = z0; z <= z1; z++) for(let x = x0; x <= x1; x++){ const h = solidH(x, y, z); if(h && py < y + h - 1e-4 && py + ph > y + 1e-4) return true; }
  return false;
}
function floorUnder(px, py, pz){
  const x0 = Math.floor(px - PW), x1 = Math.floor(px + PW - 1e-6), z0 = Math.floor(pz - PW), z1 = Math.floor(pz + PW - 1e-6);
  let best = -1e9;
  for(let y = Math.floor(py) + 1; y >= Math.floor(py) - 2; y--) for(let z = z0; z <= z1; z++) for(let x = x0; x <= x1; x++){ const h = solidH(x, y, z); if(h && y + h <= py + .51) best = Math.max(best, y + h); }
  return best;
}
const inWaterAt = (x, y, z) => W.get(Math.floor(x), Math.floor(y), Math.floor(z)) === ID.water;
const JUMPV = 8.4, GRAV = 25;
/* if I am inside blocks (a block was put on me, or I got on a horse next to a wall) find the nearest free spot */
function unstuck(){
  if(!hits(P.x, P.y, P.z)) return;
  for(const dy of [0, .5, 1, 1.5, 2]) for(const r of [0, .35, .7, 1.05]) for(let k = 0; k < (r ? 8 : 1); k++){
    const x = P.x + Math.cos(k * Math.PI / 4) * r, z = P.z + Math.sin(k * Math.PI / 4) * r;
    if(!hits(x, P.y + dy, z)){ P.x = x; P.z = z; P.y += dy; return; }
  }
  P.y += 1;
}
function physics(dt, ix, iz, mag){
  const riding = P.ride >= 0;
  unstuck();
  P.swim = !P.fly && inWaterAt(P.x, P.y + .5, P.z);
  const sp = P.fly ? 9.5 : riding ? 8.6 : P.swim ? 3 : 4.8;
  const tvx = ix * sp, tvz = iz * sp, acc = P.gr || P.fly ? 16 : 7;
  P.vx += (tvx - P.vx) * Math.min(1, acc * dt); P.vz += (tvz - P.vz) * Math.min(1, acc * dt);
  if(P.fly){ const up = (inp.up ? 1 : 0) - (inp.down ? 1 : 0); P.vy += (up * 8 - P.vy) * Math.min(1, 10 * dt); }
  else if(P.swim){ P.vy -= GRAV * .25 * dt; if(inp.up || inp.jumpHeld) P.vy = Math.min(P.vy + 18 * dt, 3.4); P.vy = Math.max(P.vy, -2.5); }
  else P.vy = Math.max(P.vy - GRAV * dt, -30);
  // horizontal (x then z), with step-up and auto-jump
  for(const ax of [0, 2]){
    const d = (ax === 0 ? P.vx : P.vz) * dt; if(!d) continue;
    const ox = P.x, oz = P.z;
    if(ax === 0) P.x += d; else P.z += d;
    P.x = clamp(P.x, .5, WX - .5); P.z = clamp(P.z, .5, WZ - .5);
    if(hits(P.x, P.y, P.z)){
      let ok = false;
      if((P.gr || P.swim || P.fly) && mag > .1){
        if(!hits(P.x, P.y + .51, P.z)){ const fl = floorUnder(P.x, P.y + .51, P.z); if(fl > P.y && fl - P.y <= .51){ P.y = fl; ok = true; } }
        if(!ok && !hits(P.x, P.y + 1.05, P.z) && (P.gr || P.swim) && P.autoJ <= 0 && !P.fly){ P.vy = riding ? 9.2 : JUMPV * .95; P.gr = false; P.autoJ = .35; }
      }
      if(!ok){ P.x = ox; P.z = oz; if(ax === 0) P.vx = 0; else P.vz = 0; }
    }
  }
  P.autoJ -= dt;
  // vertical
  const oy = P.y; P.y += P.vy * dt; let land = false;
  if(hits(P.x, P.y, P.z)){
    if(P.vy < 0){ const fl = floorUnder(P.x, oy, P.z); P.y = fl > -1e8 ? fl : oy; if(P.vy < -9) { SFX.land(); P.sq = -.12; } P.vy = 0; land = true; }
    else { P.y = oy; P.vy = 0; }
  }
  const wasGr = P.gr;
  P.gr = land || (!P.fly && P.vy <= 0 && hits(P.x, P.y - .05, P.z));
  if(P.gr && !wasGr && P.fly === false) P.lastGround = P.y;
  if(P.y < -8){ respawn(); }
  if(P.y > WH + 20) { P.y = WH + 20; P.vy = Math.min(P.vy, 0); }
  if(P.y > 40 && P.fly) track('flyHigh');
}
function respawn(){ P.x = SPAWN.x; P.z = SPAWN.z; P.y = W.surface(P.x, P.z) + 1.2; P.vx = P.vz = P.vy = 0; snapCam = true; }
function jump(){
  if(P.fly) return;
  if(P.gr || P.swim){ P.vy = P.ride >= 0 ? 10 : JUMPV; P.gr = false; P.sq = .14; SFX.jump(); if(P.ride >= 0) SFX.gallop(); }
}
function toggleFly(v){
  P.fly = v == null ? !P.fly : !!v;
  if(P.fly && P.ride >= 0) dismount();
  if(P.fly){ P.vy = 4; SFX.fly(); } else P.vy = 0;
  btnFly.classList.toggle('act', P.fly);
  hudKey = '';
}

/* ======================================================================
   Camera: 0 = behind me, 1 = my eyes, 2 = from above (build view)
   ====================================================================== */
const cam = { yaw:Math.PI, pitch:.38, lookT:0, mode:PRO.cam || 0 };
let snapCam = true;
const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), tmpV = new THREE.Vector3();
const CAM_NAMES = [['ورا الشخصية', 'Behind me', 'Arkamdan'], ['من عيوني', 'My eyes', 'Gözlerimden'], ['من فوق للبناء', 'From above to build', 'Yukarıdan inşa']];
function setCamMode(m){ cam.mode = ((m % 3) + 3) % 3; PRO.cam = cam.mode; persistPro(); snapCam = true; if(cam.mode === 1) cam.pitch = 0; else if(cam.mode === 0) cam.pitch = .38; else cam.pitch = 1.0; $('#cross').hidden = cam.mode !== 1 || state !== 'play'; }
function updateCamera(dt){
  if(state === 'menu' || state === 'worlds' || state === 'newworld' || state === 'select' || state === 'mpmenu' || (state === 'mp' && MP.screen !== 'in')){
    const t = performance.now() / 1000 * .05;
    const cx = VX0 + VW / 2, cz = VZ0 + VD / 2;
    camera.position.set(cx + Math.sin(t) * 36, VH + 21, cz + Math.cos(t) * 30);
    camera.lookAt(cx + Math.sin(t) * 4, VH + 1, cz + Math.cos(t) * 4);
    return;
  }
  const riding = P.ride >= 0, eye = P.y + (riding ? 2.75 : 1.55);
  const mode = G.placing ? 2 : cam.mode;
  const pitch = mode === 2 ? clamp(cam.pitch, .7, 1.35) : mode === 1 ? clamp(cam.pitch, -1.35, 1.35) : clamp(cam.pitch, -.35, 1.25);
  const dx = -Math.sin(cam.yaw) * Math.cos(pitch), dy = -Math.sin(pitch), dz = -Math.cos(cam.yaw) * Math.cos(pitch);
  if(mode === 1){
    camera.position.set(P.x, eye, P.z);
    camera.lookAt(P.x + dx, eye + dy, P.z + dz);
    return;
  }
  const pl = G.placing, pc = pl ? bpCells(pl.id, pl.rot) : null;
  const dist = pl ? Math.max(22, Math.max(pc.w, pc.d, pc.y1) * 2) : mode === 2 ? 22 : riding ? 7.5 : 6;
  if(pl) camTarget.set(pl.x + pc.w / 2, pl.y + pc.y1 * .4, pl.z + pc.d / 2);
  else camTarget.set(P.x, eye + (mode === 2 ? -1 : .1), P.z);
  // pull the camera in front of blocks
  let d = dist;
  if(!pl) for(let s = .5; s <= dist; s += .25){ const x = camTarget.x - dx * s, y = camTarget.y - dy * s, z = camTarget.z - dz * s; if(OPAQUE[W.get(Math.floor(x), Math.floor(y), Math.floor(z))]){ d = Math.max(.6, s - .35); break; } }
  tmpV.set(camTarget.x - dx * d, camTarget.y - dy * d, camTarget.z - dz * d);
  if(snapCam){ camPos.copy(tmpV); snapCam = false; } else camPos.lerp(tmpV, 1 - Math.exp(-14 * dt));
  camera.position.copy(camPos);
  camera.lookAt(camTarget);
}

/* ======================================================================
   Input: joystick (lower left), drag = look, tap = build / break, buttons
   ====================================================================== */
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0, moved:false, long:false, lx:0, ly:0, mouse:false }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), touch = $('#touch');
const btnJump = $('#btnJump'), btnDown = $('#btnDown'), btnFly = $('#btnFly'), btnMode = $('#btnMode'), btnVillage = $('#btnVillage'), btnRide = $('#btnRide');
let joyHome = [90, 0];
const inp = { up:false, down:false, jumpHeld:false };
let hover = null, ghostFrom = null, ghostUntil = 0, longT = 0;
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 76), SHh - Math.max(90, SHh * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
const inJoyZone = p => p.x < SW * .36 && p.y > SHh * .38;
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
  const p = toLayer(e.clientX, e.clientY);
  if(state === 'map') return;
  if(state !== 'play') return;
  if(e.pointerType !== 'mouse' && inJoyZone(p) && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(66, SAL + 62), SW * .36); joy.oy = clamp(p.y, SHh * .38 + 20, SHh - 64);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){
    Object.assign(look, { id:e.pointerId, x:p.x, y:p.y, sx:p.x, sy:p.y, t0:performance.now(), moved:false, long:false, lx:p.x, ly:p.y, mouse:e.pointerType === 'mouse', btn:e.button });
    ghostFrom = { x:p.x, y:p.y }; ghostUntil = 1e15;
  }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){
  let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 50;
  if(d > m){ dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`;
  joy.x = dx / m; joy.y = dy / m;
}
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerType === 'mouse' && look.id == null){ hover = { x:p.x, y:p.y }; }
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id && state === 'play'){
    look.lx = p.x; look.ly = p.y;
    if(!look.moved && Math.hypot(p.x - look.sx, p.y - look.sy) > 12){ look.moved = true; ghostUntil = 0; clearTimeout(longT); }
    if(look.moved){
      const k = cam.mode === 1 ? .006 : .0075;
      cam.yaw -= (p.x - look.x) * k; cam.pitch = cam.pitch + (p.y - look.y) * (cam.mode === 1 ? -.005 : .004);
      cam.pitch = cam.mode === 1 ? clamp(cam.pitch, -1.35, 1.35) : cam.mode === 2 || G.placing ? clamp(cam.pitch, .7, 1.35) : clamp(cam.pitch, -.35, 1.25);
      cam.lookT = performance.now();
    } else ghostFrom = { x:p.x, y:p.y };
    look.x = p.x; look.y = p.y;
  }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){
    clearTimeout(longT);
    const tap = !look.moved && e.type === 'pointerup';
    if(tap && state === 'play') tapAt(look.lx, look.ly, look.mouse && look.btn === 2 ? 'break' : null);
    look.id = null; cam.lookT = performance.now();
    ghostFrom = { x:look.lx, y:look.ly }; ghostUntil = performance.now() + (look.mouse ? 0 : 1600);
  }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
touch.addEventListener('pointerleave', e => { if(e.pointerType === 'mouse') hover = null; });
touch.addEventListener('contextmenu', e => e.preventDefault());
function holdBtn(btn, down, up){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); down(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => { if(btn.classList.contains('on')){ btn.classList.remove('on'); if(up) up(); } }));
}
holdBtn(btnJump, () => { if(state !== 'play') return; if(P.fly) inp.up = true; else { inp.jumpHeld = true; jump(); } }, () => { inp.up = false; inp.jumpHeld = false; });
holdBtn(btnDown, () => { inp.down = true; }, () => { inp.down = false; });
holdBtn(btnFly, () => { if(state === 'play') toggleFly(); });
holdBtn(btnMode, () => { if(state === 'play'){ setMode(G.mode === 'build' ? 'break' : 'build'); SFX.tap(); } });
holdBtn(btnVillage, () => { if(state === 'play'){ SFX.tap(); if(G.placing) cancelPlace(); showVillage(); } });
holdBtn(btnRide, () => { if(state !== 'play') return; if(P.ride >= 0) dismount(); else { const a = nearHorse(); if(a) mount(a); } });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'play') e.preventDefault(); }
  if(state === 'play'){
    if(e.code === 'Space'){ e.preventDefault(); if(P.fly) inp.up = true; else if(!e.repeat){ inp.jumpHeld = true; jump(); } }
    if(e.code === 'ShiftLeft' || e.code === 'KeyC') inp.down = true;
    if(!e.repeat){
      if(e.code === 'KeyF') toggleFly();
      if(e.code === 'KeyV') setCamMode(cam.mode + 1);
      if(e.code === 'KeyE'){ showPalette(); }
      if(e.code === 'KeyM') showMap();
      if(e.code === 'KeyB'){ showVillage(); }
      if(e.code === 'KeyX'){ setMode(G.mode === 'build' ? 'break' : 'build'); }
      if(e.code === 'KeyR'){ if(G.placing) rotPlace(); else if(P.ride >= 0) dismount(); else { const a = nearHorse(); if(a) mount(a); } }
      const n = /^Digit([1-6])$/.exec(e.code); if(n) selectSlot(+n[1] - 1);
    }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play'){ if(G.placing) cancelPlace(); else showPause(); }
  else if(e.code === 'Escape' && ['palette', 'village', 'map', 'pause'].includes(state)) closePanel();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; if(e.code === 'Space'){ inp.up = false; inp.jumpHeld = false; } if(e.code === 'ShiftLeft' || e.code === 'KeyC') inp.down = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; inp.up = inp.down = inp.jumpHeld = false; });
touch.addEventListener('wheel', e => { if(state === 'play'){ selectSlot((PRO.sel + (e.deltaY > 0 ? 1 : 5)) % 6); e.preventDefault(); } }, { passive:false });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; inp.up = inp.down = inp.jumpHeld = false; clearTimeout(longT); [btnJump, btnDown].forEach(b => b.classList.remove('on')); }
let testInput = null, testGo = null;
function readInput(){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  let x = rx * ix - fx * iy, z = rz * ix - fz * iy;
  if(testGo){ const dx = testGo.x - P.x, dz = testGo.z - P.z, l = Math.hypot(dx, dz); if(l < (testGo.r || .5)){ testGo = null; x = z = 0; m = 0; } else { x = dx / l; z = dz / l; m = 1; } }
  return { x, z, m };
}

/* ======================================================================
   Building: tap → ray → place or break; the ghost; little pieces flying
   ====================================================================== */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function rayFrom(lx, ly){ ndc.set(lx / SW * 2 - 1, -(ly / SHh) * 2 + 1); ray.setFromCamera(ndc, camera); return ray.ray; }
const REACH = () => (cam.mode === 2 || G.placing) ? 40 : 11;
function eyePos(){ return { x:P.x, y:P.y + (P.ride >= 0 ? 2.6 : 1.5), z:P.z }; }
function pickBlock(lx, ly){
  const r = rayFrom(lx, ly), o = r.origin, d = r.direction;
  const hit = raycast(W, o.x, o.y, o.z, d.x, d.y, d.z, 70);
  if(!hit) return null;
  const e = eyePos(); hit.far = Math.hypot(hit.x + .5 - e.x, hit.y + .5 - e.y, hit.z + .5 - e.z) > REACH();
  return hit;
}
function setMode(m){ G.mode = m; btnMode.classList.toggle('brk', m === 'break'); $('#modeI').textContent = m === 'break' ? '⛏️' : '🧱'; $('#modeB').textContent = m === 'break' ? L('كسّر', 'Break', 'Kır') : L('ابني', 'Build', 'Yap'); }
function blocksPlayer(x, y, z){
  const pr = PW - .02;
  if(x + 1 > P.x - pr && x < P.x + pr && z + 1 > P.z - pr && z < P.z + pr && y + 1 > P.y + .02 && y < P.y + PHt) return true;
  for(const r of RM.values()) if(x + 1 > r.x - pr && x < r.x + pr && z + 1 > r.z - pr && z < r.z + pr && y + 1 > r.y + .02 && y < r.y + PHt) return true;
  return false;
}
const replaceable = id => id === 0 || id === ID.water || id === ID.tallGrass;
function placeTarget(hit, id){
  let x = hit.x, y = hit.y, z = hit.z;
  if(!(hit.id === ID.tallGrass)) { x += hit.nx; y += hit.ny; z += hit.nz; }
  if(x < 0 || z < 0 || x >= WX || z >= WZ || y < 1 || y >= WH - 1) return null;
  if(!replaceable(W.get(x, y, z))) return null;
  if(isDoor(id) && !replaceable(W.get(x, y + 1, z))) return null;
  if(BL[id].sapling){ const b = W.get(x, y - 1, z); if(b !== ID.grass && b !== ID.dirt && b !== ID.path) return null; }
  return { x, y, z };
}
function tapAt(lx, ly, force){
  if(state !== 'play' || !W) return;
  const r = rayFrom(lx, ly);
  const an = pickAnimal(r.origin, r.direction);
  if(G.placing){ placeAim(lx, ly); return; }
  if(an && force !== 'break'){ petAnimal(an.i, true); return; }
  const hit = pickBlock(lx, ly);
  if(!hit) return;
  if(hit.far){ toast(L('قرّب شوي 👣', 'Come a bit closer 👣', 'Biraz yaklaş 👣'), 1200); return; }
  if((force || G.mode) === 'break') breakBlock(hit.x, hit.y, hit.z);
  else placeBlock(hit, PRO.hot[PRO.sel]);
}
function placeBlock(hit, id){
  if(!VALID[id]) return false;
  const t = placeTarget(hit, id);
  if(!t){ SFX.nope(); return false; }
  let pid = id;
  if(isDoor(id)){ const alongX = Math.abs(Math.sin(cam.yaw)) > Math.abs(Math.cos(cam.yaw)); pid = alongX ? ID.doorZ : ID.doorX; }
  if(SOLID[pid] && blocksPlayer(t.x, t.y, t.z)){ SFX.nope(); return false; }
  setBlock(t.x, t.y, t.z, pid);
  if(isDoor(pid)) setBlock(t.x, t.y + 1, t.z, pid === ID.doorX ? ID.doorXH : ID.doorZH);
  SFX.place(); heroAct(); puff(t.x + .5, t.y + .5, t.z + .5, pid, 5);
  G.placed++; track('place'); if(pid === ID.torch) track('torch'); if(BL[pid].wool) track('wool');
  if(BL[pid].sapling){ grows.push({ x:t.x, y:t.y, z:t.z, t:0, dur:5 + Math.random() * 2, type:['oak', 'fruit', 'pine', 'birch'][Math.floor(Math.random() * 4)] }); track('tree'); }
  addXp(1); PRO.bc++; if(PRO.bc >= 4){ PRO.bc = 0; addCoins(1, true); }
  return true;
}
function breakBlock(x, y, z){
  const id = W.get(x, y, z);
  if(!id || id === ID.water || (y === 0)){ SFX.nope(); return false; }
  setBlock(x, y, z, 0);
  if(isDoor(id)){ const up = BL[id].upper; const oy = up ? y - 1 : y + 1; if(isDoor(W.get(x, oy, z))) setBlock(x, oy, z, 0); }
  // water next to it flows in (one block), so lakes don't get holes
  if(y <= SEA && [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0]].some(([a, b, c]) => W.get(x + a, y + b, z + c) === ID.water)) setBlock(x, y, z, ID.water);
  SFX.brk(); heroAct(); puff(x + .5, y + .5, z + .5, id, 10);
  track('break');
  return true;
}
function heroAct(){ P.act = .28; }
/* ghost: where the next block goes (or the block the pickaxe would take) */
const ghostMat = new THREE.MeshLambertMaterial({ map:atlasS, transparent:true, opacity:.62, depthWrite:false, alphaTest:.05, emissive:0x444444 });
const ghost = new THREE.Mesh(tileBoxGeo(ID.plankOak), ghostMat); ghost.scale.setScalar(1.002); ghost.renderOrder = 3; ghost.visible = false; scene.add(ghost);
const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04));
const ghostEdge = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color:0xffffff, transparent:true, opacity:.95, depthTest:false })); ghostEdge.visible = false; ghostEdge.renderOrder = 4; scene.add(ghostEdge);
const breakBox = new THREE.Mesh(new THREE.BoxGeometry(1.03, 1.03, 1.03), new THREE.MeshBasicMaterial({ color:0xff4040, transparent:true, opacity:.22, depthWrite:false })); breakBox.visible = false; scene.add(breakBox);
let ghostInfo = null;
function updateGhost(){
  ghost.visible = ghostEdge.visible = breakBox.visible = false; ghostInfo = null;
  if(state !== 'play' || G.placing || !W) return;
  let at = null;
  if(look.id != null && !look.moved) at = { x:look.lx, y:look.ly };
  else if(ghostFrom && performance.now() < ghostUntil) at = ghostFrom;
  else if(hover) at = hover;
  else if(cam.mode === 1) at = { x:SW / 2, y:SHh / 2 };
  if(!at) return;
  const hit = pickBlock(at.x, at.y);
  if(!hit || hit.far) return;
  const brk = G.mode === 'break';
  if(brk){ breakBox.visible = ghostEdge.visible = true; breakBox.position.set(hit.x + .5, hit.y + .5, hit.z + .5); ghostEdge.position.copy(breakBox.position); ghostEdge.material.color.setHex(0xff5050); ghostInfo = { k:'break', x:hit.x, y:hit.y, z:hit.z }; return; }
  const id = PRO.hot[PRO.sel], t = placeTarget(hit, id);
  if(!t) return;
  ghost.geometry = tileBoxGeo(isDoor(id) ? ID.doorX : id);
  const sh = SHAPE[id];
  ghost.visible = ghostEdge.visible = true;
  ghost.position.set(t.x + .5, t.y + .5, t.z + .5); ghostEdge.position.copy(ghost.position); ghostEdge.material.color.setHex(0xffffff);
  ghost.scale.set(sh === SH.torch ? .2 : 1.002, sh === SH.slab ? .5 : sh === SH.torch ? .7 : 1.002, sh === SH.torch ? .2 : 1.002);
  if(sh === SH.slab) ghost.position.y = t.y + .25; if(sh === SH.torch) ghost.position.y = t.y + .35;
  ghostInfo = { k:'place', x:t.x, y:t.y, z:t.z };
  const pz = .5 + Math.sin(performance.now() / 160) * .5; ghostMat.opacity = .62 + pz * .28; ghostEdge.material.color.setRGB(1, 1, .6 + pz * .4);
}
/* flying bits */
const BITS = 90;
const bitMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, .14, .14), new THREE.MeshLambertMaterial({ color:0xffffff }), BITS);
bitMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); bitMesh.frustumCulled = false; scene.add(bitMesh);
const bits = []; for(let i = 0; i < BITS; i++){ bits.push({ t:0, x:0, y:0, z:0, vx:0, vy:0, vz:0 }); bitMesh.setColorAt(i, new THREE.Color(1, 1, 1)); }
let bitI = 0; const bo = new THREE.Object3D(), bc = new THREE.Color();
function puff(x, y, z, id, n){
  const c = TILE_COL[SIDE[id]] || [200, 200, 200];
  for(let k = 0; k < n; k++){
    const b = bits[bitI]; bc.setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace); bitMesh.setColorAt(bitI, bc); bitI = (bitI + 1) % BITS;
    Object.assign(b, { t:.6 + Math.random() * .4, x:x + (Math.random() - .5) * .6, y:y + (Math.random() - .5) * .6, z:z + (Math.random() - .5) * .6, vx:(Math.random() - .5) * 4, vy:2 + Math.random() * 3, vz:(Math.random() - .5) * 4 });
  }
  bitMesh.instanceColor.needsUpdate = true;
}
function updateBits(dt){
  for(let i = 0; i < BITS; i++){
    const b = bits[i];
    if(b.t > 0){ b.t -= dt; b.vy -= 18 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if(SOLID[W.get(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z))]){ b.vy = Math.abs(b.vy) * .3; b.vx *= .5; b.vz *= .5; b.y += .05; } }
    bo.position.set(b.x, b.y, b.z); bo.scale.setScalar(b.t > 0 ? Math.min(1, b.t * 3) : 0); bo.updateMatrix(); bitMesh.setMatrixAt(i, bo.matrix);
  }
  bitMesh.instanceMatrix.needsUpdate = true;
}
/* hearts */
const heartTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.font = '52px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('❤️', 32, 36); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const HEARTS = []; for(let i = 0; i < 16; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:heartTex, transparent:true, depthWrite:false })); s.visible = false; s.scale.setScalar(.6); scene.add(s); HEARTS.push({ s, t:0 }); }
let heartI = 0;
function hearts(x, y, z, n = 4){ for(let k = 0; k < n; k++){ const h = HEARTS[heartI]; heartI = (heartI + 1) % HEARTS.length; h.t = 1.4; h.s.visible = true; h.s.position.set(x + (Math.random() - .5) * .8, y + Math.random() * .3, z + (Math.random() - .5) * .8); h.d = k * .15; } }
function updateHearts(dt){ for(const h of HEARTS){ if(h.t <= 0) continue; if(h.d > 0){ h.d -= dt; h.s.material.opacity = 0; continue; } h.t -= dt; h.s.position.y += dt * 1.1; h.s.material.opacity = Math.min(1, h.t * 1.6); h.s.scale.setScalar(.5 + (1.4 - h.t) * .2); if(h.t <= 0) h.s.visible = false; } }

/* ======================================================================
   Animals
   ====================================================================== */
let AN = [];
const ANIMAL_SET = [['horse', 3, 0], ['horse', 5, 2], ['sheep', -6, 4], ['sheep', -7, 6], ['sheep', -5, 7], ['sheep', -8, 5], ['chicken', 2, -6], ['chicken', 3, -7], ['chicken', 1, -8], ['cat', -2, -3], ['dog', 1, 3]];
function spawnAnimals(){
  for(const a of AN) a.mdl.grp.parent && scene.remove(a.mdl.grp);
  const R = rng(W.seed ^ 0xA11CE);
  const homes = { horse:[VX0 + VW + 10, VZ0 + 10], sheep:[VX0 - 10, VZ0 + 26], chicken:[VX0 + 25, VZ0 + 17], cat:[VX0 + 20, VZ0 + 16], dog:[VX0 + 27, VZ0 + 18] };
  AN = ANIMAL_SET.map(([k, dx, dz], i) => {
    const h = homes[k], x = h[0] + dx, z = h[1] + dz, mdl = makeAnimal(THREE, k, R);
    scene.add(mdl.grp);
    const a = { i, kind:k, mdl, x, z, y:standY(x, z, VH + 3), f:R() * 6.28, hx:h[0], hz:h[1], tx:x, tz:z, wait:R() * 3, m:0, happy:0, t:R() * 10, ny:0, sx:x, sz:z, sy:0 };
    a.sy = a.y; return a;
  });
}
function standY(x, z, y){
  const X = Math.floor(x), Z = Math.floor(z);
  for(let yy = Math.floor(y) + 1; yy >= Math.floor(y) - 3; yy--){ if(SOLID[W.get(X, yy - 1, Z)] && !SOLID[W.get(X, yy, Z)] && !SOLID[W.get(X, yy + 1, Z)]) return yy - 1 + (SHAPE[W.get(X, yy - 1, Z)] === SH.slab ? .5 : 1); }
  return W.surface(x, z) + 1;
}
const riddenBy = i => { if(P.ride === i) return MP.id || 'me'; for(const r of RM.values()) if(r.rd === i) return r.id; return null; };
function simAnimals(dt){
  for(const a of AN){
    a.t += dt; a.happy = Math.max(0, a.happy - dt);
    if(riddenBy(a.i)) continue;
    if(mpActive() && !MP.isHost){
      // friends: follow the host's animals smoothly
      a.x = lerp(a.x, a.sx, Math.min(1, dt * 6)); a.z = lerp(a.z, a.sz, Math.min(1, dt * 6)); a.y = lerp(a.y, a.sy, Math.min(1, dt * 8));
      a.f += angDiff(a.sf || 0, a.f) * Math.min(1, dt * 8);
      continue;
    }
    const sp = KINDS[a.kind].speed;
    if(a.wait > 0){ a.wait -= dt; a.m = Math.max(0, a.m - dt * 4); }
    else {
      if(a.kind === 'dog' && Math.hypot(P.x - a.x, P.z - a.z) < 14 && Math.hypot(P.x - a.x, P.z - a.z) > 3){ a.tx = P.x + Math.sin(a.t) * 1.5; a.tz = P.z + Math.cos(a.t) * 1.5; }
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      if(d < .3){ a.wait = 1 + Math.random() * 4; const R = Math.random() * Math.PI * 2, rr = 2 + Math.random() * 8; a.tx = clamp(a.hx + Math.cos(R) * rr, 2, WX - 3); a.tz = clamp(a.hz + Math.sin(R) * rr, 2, WZ - 3); }
      else {
        const nx = a.x + dx / d * sp * dt, nz = a.z + dz / d * sp * dt, ny = standY(nx, nz, a.y);
        const blocked = Math.abs(ny - a.y) > 1.05 || W.get(Math.floor(nx), Math.floor(ny), Math.floor(nz)) === ID.water || W.get(Math.floor(nx), Math.floor(ny - .5), Math.floor(nz)) === ID.water;
        if(blocked){ a.tx = a.x - dx; a.tz = a.z - dz; a.wait = .5; }
        else { a.x = nx; a.z = nz; a.y = ny > a.y ? Math.min(ny, a.y + dt * 6) : Math.max(ny, a.y - dt * 8); a.f += angDiff(Math.atan2(dx, dz), a.f) * Math.min(1, dt * 6); a.m = Math.min(1, a.m + dt * 4); }
      }
    }
  }
}
function drawAnimals(dt){
  const t = performance.now() / 1000;
  for(const a of AN){
    const by = riddenBy(a.i);
    if(by === (MP.id || 'me')){ a.x = P.x; a.z = P.z; a.y = P.y; a.f = P.f; a.m = clamp(Math.hypot(P.vx, P.vz) / 8, 0, 1); }
    else if(by){ const r = RM.get(by); if(r){ a.x = r.x; a.y = r.y; a.z = r.z; a.f = r.f; a.m = clamp(r.m, 0, 1); } }
    a.mdl.grp.position.set(a.x, a.y, a.z); a.mdl.grp.rotation.y = a.f;
    poseAnimal(a.mdl, a.m, t + a.i, dt, a.happy > 0);
  }
}
function pickAnimal(o, d){
  let best = null;
  for(const a of AN){
    const r = KINDS[a.kind].r + .25, cy = a.y + a.mdl.h * .45;
    const ox = a.x - o.x, oy = cy - o.y, oz = a.z - o.z, t = ox * d.x + oy * d.y + oz * d.z;
    if(t < 0) continue;
    const px = o.x + d.x * t - a.x, py = o.y + d.y * t - cy, pz = o.z + d.z * t - a.z;
    if(px * px + py * py * .5 + pz * pz < r * r * 1.6 && Math.hypot(a.x - P.x, a.z - P.z) < 9 && (!best || t < best.t)){
      const bh = raycast(W, o.x, o.y, o.z, d.x, d.y, d.z, t);
      if(bh && bh.t < t - .5) continue;
      best = { i:a.i, t };
    }
  }
  return best;
}
const ANI_SFX = { horse:'horse', sheep:'sheep', chicken:'chicken', cat:'cat', dog:'dog' };
function petAnimal(i, mine){
  const a = AN[i]; if(!a) return;
  a.happy = 1.6; a.wait = Math.max(a.wait, 1.2);
  hearts(a.x, a.y + a.mdl.h, a.z, 4);
  SFX.heart(); setTimeout(() => SFX[ANI_SFX[a.kind]](), 120);
  if(mine){ G.petted.add(i); track('pet'); if(a.kind === 'horse') track('petHorse'); mpSend('fx', { k:'h', i }); }
}
function nearHorse(){ let best = null, bd = 3.2; for(const a of AN){ if(a.kind !== 'horse' || riddenBy(a.i)) continue; const d = Math.hypot(a.x - P.x, a.z - P.z); if(d < bd){ bd = d; best = a; } } return best; }
function mount(a){
  if(P.fly) toggleFly(false);
  P.ride = a.i; P.x = a.x; P.z = a.z; P.y = a.y; P.f = a.f; P.vx = P.vz = 0; SFX.horse(); hearts(a.x, a.y + 2, a.z, 3);
  track('ride'); hudKey = '';
}
function dismount(){
  const a = AN[P.ride]; P.ride = -1;
  if(a){ a.wait = 2; a.tx = a.x; a.tz = a.z; a.hx = a.x; a.hz = a.z; const sx = Math.cos(P.f) * 1.1, sz = -Math.sin(P.f) * 1.1; if(!hits(P.x + sx, P.y, P.z + sz)){ P.x += sx; P.z += sz; } }
  hudKey = '';
}

/* ======================================================================
   «قريتي»: ready buildings rise block by block
   ====================================================================== */
const jobs = [], grows = [];
const G = { mode:'build', placing:null, placed:0, petted:new Set(), playT:0, slot:-1 };
function plotAt(x, z){ return PLOTS.find(p => x >= p.x - 3 && x < p.x + p.s + 3 && z >= p.z - 3 && z < p.z + p.s + 3); }
const plotBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color:0x5ed6a0, transparent:true, opacity:.28, depthWrite:false })); plotBox.visible = false; plotBox.renderOrder = 3; scene.add(plotBox);
const plotEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color:0xffffff })); plotEdge.visible = false; scene.add(plotEdge);
/* a see-through picture of the whole building where it will stand */
const prevMat = new THREE.MeshLambertMaterial({ map:atlasS, transparent:true, opacity:.6, depthWrite:false, alphaTest:.05 });
const prevMesh = new THREE.Mesh(new THREE.BufferGeometry(), prevMat); prevMesh.visible = false; prevMesh.renderOrder = 3; scene.add(prevMesh);
const prevCache = new Map();
function bpPreviewGeo(id, rot){
  const k = id + ':' + rot; if(prevCache.has(k)) return prevCache.get(k);
  const cells = bpCells(id, rot).cells.filter(c => c[3] && c[1] >= 0);
  const pos = [], nor = [], uv = [], ix = [];
  for(const [dx, dy, dz, bid] of cells){
    const g = tileBoxGeo(isDoor(bid) ? ID.doorX : bid), pa = g.attributes.position, na = g.attributes.normal, ua = g.attributes.uv, n0 = pos.length / 3;
    const sh = SHAPE[bid], sx = sh === SH.torch ? .2 : sh === SH.fence ? .3 : 1, sy = sh === SH.slab ? .5 : sh === SH.torch ? .7 : 1, oy = sh === SH.slab ? -.25 : sh === SH.torch ? -.15 : 0;
    for(let i = 0; i < pa.count; i++){ pos.push(dx + .5 + pa.getX(i) * sx, dy + .5 + oy + pa.getY(i) * sy, dz + .5 + pa.getZ(i) * sx); nor.push(na.getX(i), na.getY(i), na.getZ(i)); uv.push(ua.getX(i), ua.getY(i)); }
    const gi = g.index; for(let i = 0; i < gi.count; i++) ix.push(n0 + gi.getX(i));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(ix.length / 3 > 21000 ? new THREE.Uint32BufferAttribute(ix, 1) : new THREE.Uint16BufferAttribute(ix, 1)); geo.computeBoundingSphere();
  prevCache.set(k, geo); return geo;
}
function startPlace(id){
  const b = BP[id]; if(!b) return;
  closePanel();
  G.placing = { id, rot:0, x:0, y:0, z:0, ok:false, aim:null };
  // aim at the nearest free plot, or in front of me
  const free = PLOTS.filter(p => !(W.builtPlots.includes(p.i))).sort((a, c) => Math.hypot(a.x + 6 - P.x, a.z + 6 - P.z) - Math.hypot(c.x + 6 - P.x, c.z + 6 - P.z));
  const p0 = free[0];
  if(p0 && Math.hypot(p0.x + 6 - P.x, p0.z + 6 - P.z) < 40) G.placing.aim = { x:p0.x + 6.5, z:p0.z + 6.5 };
  else G.placing.aim = { x:P.x - Math.sin(cam.yaw) * 10, z:P.z - Math.cos(cam.yaw) * 10 };
  cam.pitch = 1.05; snapCam = true;
  $('#placebar').hidden = false; setPlayUI(true);
  updatePlace();
  say('👆 ' + L('اضغط عالأرض لتختار المكان، 🔄 لتلفّها، و ✅ لتبنيها', 'Tap the ground to choose the spot, 🔄 to turn, ✅ to build', 'Yer seçmek için zemine dokun, 🔄 döndür, ✅ inşa et'), 5000);
}
function placeAim(lx, ly){
  const r = rayFrom(lx, ly), o = r.origin, d = r.direction;
  const hit = raycast(W, o.x, o.y, o.z, d.x, d.y, d.z, 120, true);
  if(hit){ G.placing.aim = { x:hit.x + .5, z:hit.z + .5 }; SFX.tap(); updatePlace(); }
}
function rotPlace(){ if(!G.placing) return; G.placing.rot = (G.placing.rot + 1) & 3; SFX.tap(); updatePlace(); }
function updatePlace(){
  const pl = G.placing; if(!pl) return;
  const c = bpCells(pl.id, pl.rot), b = BP[pl.id];
  let x = Math.round(pl.aim.x - c.w / 2), z = Math.round(pl.aim.z - c.d / 2);
  const plot = plotAt(pl.aim.x, pl.aim.z);
  if(plot){ x = plot.x + Math.floor((plot.s - c.w) / 2); z = plot.z + Math.floor((plot.s - c.d) / 2); }
  x = clamp(x, 2, WX - c.w - 2); z = clamp(z, 2, WZ - c.d - 2);
  let y = plot ? VH : W.surface(x + c.w / 2, z + c.d / 2);
  if(W.get(Math.floor(x + c.w / 2), y, Math.floor(z + c.d / 2)) === ID.water) y = SEA;
  y = clamp(y, 2, WH - (c.y1 + 2));
  pl.x = x; pl.y = y; pl.z = z; pl.plot = plot ? plot.i : -1;
  const busy = jobs.some(j => j.x < x + c.w && j.x + j.w > x && j.z < z + c.d && j.z + j.d > z);
  pl.ok = !busy && PRO.coins >= b.cost && PRO.lvl >= b.lvl;
  plotBox.visible = plotEdge.visible = prevMesh.visible = true;
  plotBox.scale.set(c.w + .2, .3, c.d + .2); plotBox.position.set(x + c.w / 2, y + 1.1, z + c.d / 2);
  plotEdge.scale.copy(plotBox.scale); plotEdge.position.copy(plotBox.position);
  prevMesh.geometry = bpPreviewGeo(pl.id, pl.rot); prevMesh.position.set(x, y, z);
  prevMat.color.setHex(pl.ok ? 0xffffff : 0xff9090);
  plotBox.material.color.setHex(pl.ok ? 0x5ed6a0 : 0xff6060);
  $('#bpTxt').textContent = b.e + ' ' + L(...b.n) + '  🪙 ' + N(b.cost) + (busy ? '  ⏳' : PRO.coins < b.cost ? '  ' + L('(ما في مصاري كفاية)', '(not enough coins)', '(yeterli para yok)') : '');
  $('#bpOk').disabled = !pl.ok;
}
function cancelPlace(){ G.placing = null; plotBox.visible = plotEdge.visible = prevMesh.visible = false; $('#placebar').hidden = true; setPlayUI(true); cam.pitch = cam.mode === 2 ? 1 : .38; }
function confirmPlace(){
  const pl = G.placing; if(!pl) return;
  updatePlace();
  const b = BP[pl.id];
  if(!pl.ok){ SFX.nope(); if(PRO.coins < b.cost) toast(L('بدك مصاري أكتر 🪙 ابني وخلّص المهمات!', 'You need more coins 🪙 build and do tasks!', 'Daha çok para lazım 🪙 inşa et ve görevleri yap!'), 2500); return; }
  PRO.coins -= b.cost; persistPro(); hudKey = '';
  startJob(pl.id, pl.x, pl.y, pl.z, pl.rot, pl.plot, true);
  SFX.coin(); cancelPlace();
}
$('#bpRot').addEventListener('click', e => { e.stopPropagation(); rotPlace(); });
$('#bpOk').addEventListener('click', e => { e.stopPropagation(); confirmPlace(); });
$('#bpNo').addEventListener('click', e => { e.stopPropagation(); SFX.tap(); cancelPlace(); });
['pointerdown', 'touchstart'].forEach(t => $('#placebar').addEventListener(t, e => e.stopPropagation(), { passive:true }));
function startJob(id, x, y, z, rot, plot, mine){
  const c = bpCells(id, rot), b = BP[id];
  const cells = [];
  // ground under the building where the land is lower
  const foot = new Set(); for(const [dx, dy, dz, bid] of c.cells) if(dy === 0 && bid) foot.add(dx + ',' + dz);
  for(const k of foot){ const [dx, dz] = k.split(',').map(Number); for(let yy = y - 1; yy > y - 12 && yy > 0; yy--){ const id0 = W.get(x + dx, yy, z + dz); if(SOLID[id0] && id0 !== ID.water) break; cells.push([x + dx, yy, z + dz, yy === y - 1 ? ID.dirt : ID.dirt]); } }
  cells.sort((a, b2) => a[1] - b2[1]);
  for(const [dx, dy, dz, bid] of c.cells) cells.push([x + dx, y + dy, z + dz, bid]);
  const lbl = document.createElement('div'); lbl.className = 'nm bp'; $('#labels').appendChild(lbl);
  jobs.push({ id, x, y, z, w:c.w, d:c.d, h:c.y1 + 1, cells, i:0, t:0, dur:b.time, plot, mine, lbl, sndT:0 });
  if(plot >= 0 && !W.builtPlots.includes(plot)) W.builtPlots.push(plot);
  SFX.build();
}
function runJobs(dt){
  for(let k = jobs.length - 1; k >= 0; k--){
    const j = jobs[k];
    j.t += dt;
    const want = Math.min(j.cells.length, Math.ceil(j.cells.length * sstep(0, 1, j.t / j.dur) * 1.0001));
    let placed = 0;
    while(j.i < want){
      const [x, y, z, id] = j.cells[j.i++];
      if(setBlock(x, y, z, id, j.mine) && id){ placed++; if(Math.random() < .25) puff(x + .5, y + .5, z + .5, id, 2); }
    }
    j.sndT -= dt; if(placed && j.sndT <= 0){ j.sndT = .16; SFX.build(); }
    if(j.i >= j.cells.length){
      jobs.splice(k, 1); j.lbl.remove();
      const b = BP[j.id];
      hearts(j.x + j.w / 2, j.y + j.h + 1, j.z + j.d / 2, 6);
      if(j.mine){ SFX.built(); banner('🎉 ' + b.e + ' ' + L(...b.n) + '!'); addXp(Math.round(b.cost / 2)); track('bp'); bobo(4); }
    }
  }
}
function runGrows(dt){
  for(let k = grows.length - 1; k >= 0; k--){
    const g = grows[k]; g.t += dt;
    if(g.t < g.dur) continue;
    grows.splice(k, 1);
    if(W.get(g.x, g.y, g.z) !== ID.sapling) continue;
    setBlock(g.x, g.y, g.z, 0);
    const R = rng((g.x * 73856093) ^ (g.z * 19349663) ^ g.y);
    for(const [a, b, c, id, force] of treeCells(g.type, g.x, g.y, g.z, R)){ const cur = W.get(a, b, c); if(a >= 0 && c >= 0 && a < WX && c < WZ && b < WH - 1 && (cur === 0 || cur === ID.tallGrass || (force && cur === ID.sapling)) && !(SOLID[id] && blocksPlayer(a, b, c))) setBlock(a, b, c, id); }
    SFX.grow(); puff(g.x + .5, g.y + 2, g.z + .5, ID.leafOak, 12);
  }
}

/* ======================================================================
   Coins, stars (levels) and tasks
   ====================================================================== */
function addCoins(n, quiet){ PRO.coins = clamp(PRO.coins + n, 0, 999999); persistPro(); hudKey = ''; if(!quiet){ SFX.coin(); pop('+' + N(n) + ' 🪙'); } const el = $('#hudCoins'); el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
/* Bobo Land coins (shared wallet), with a daily cap */
function bobo(n){
  try{
    if(!window.World) return;
    if(PRO.cd.d !== today()) PRO.cd = { d:today(), n:0 };
    const give = Math.min(n, COIN_CAP - PRO.cd.n); if(give <= 0) return;
    PRO.cd.n += give; persistPro();
    World.addCoins(give, L('من مكعّبات بوبو', 'from Bobo Blocks', 'Bobo Bloklarından'));
  }catch(e){}
}
function addXp(n){
  PRO.xp += n;
  let up = false;
  while(PRO.xp >= needXp(PRO.lvl)){ PRO.xp -= needXp(PRO.lvl); PRO.lvl++; up = true; }
  persistPro(); hudKey = '';
  if(up){
    SFX.level(); banner('⭐ ' + L('مستوى', 'Level', 'Seviye') + ' ' + N(PRO.lvl) + '!');
    addCoins(25); bobo(5);
    const nb = BLUEPRINTS.filter(b => b.lvl === PRO.lvl);
    if(nb.length) setTimeout(() => toast('🔓 ' + nb.map(b => b.e + ' ' + L(...b.n)).join('، '), 3500), 1500);
  }
}
function taskDef(id){ return TASKS.find(t => t.id === id); }
function nextTask(){
  const used = new Set((PRO.tasks || []).map(t => t.id));
  for(let k = 0; k < TASKS.length; k++){
    const d = TASKS[(PRO.tn + k) % TASKS.length];
    if(used.has(d.id)) continue;
    PRO.tn = (PRO.tn + k + 1) % TASKS.length; if(PRO.tn === 0) PRO.cyc++;
    return { id:d.id, c:0, g:d.n * (1 + Math.min(PRO.cyc, 3)) };
  }
  return null;
}
function ensureTasks(){ if(!PRO.tasks) PRO.tasks = []; while(PRO.tasks.length < 3){ const t = nextTask(); if(!t) break; PRO.tasks.push(t); } }
const taskText = t => { const d = taskDef(t.id); return d.e + ' ' + L(...d.t).replace('{n}', N(t.g)); };
function track(kind, n = 1){
  if(!PRO.tasks) return;
  let ch = false;
  for(const t of PRO.tasks){
    const d = taskDef(t.id); if(!d || d.k !== kind || t.c >= t.g) continue;
    t.c = Math.min(t.g, t.c + n); ch = true;
    if(t.c >= t.g){
      SFX.task(); pop('✅ ' + taskText(t));
      setTimeout(() => { addCoins(d.c * (1 + Math.min(PRO.cyc, 2))); addXp(d.x); bobo(5); }, 400);
      setTimeout(() => { const i = PRO.tasks.indexOf(t); if(i >= 0){ PRO.tasks.splice(i, 1); ensureTasks(); persistPro(); hudKey = ''; } }, 2600);
    }
  }
  if(ch){ persistPro(); hudKey = ''; }
}

/* ======================================================================
   HUD
   ====================================================================== */
const hudEl = $('#hud'), hotEl = $('#hotbar');
let hudKey = '';
function drawHot(){
  hotEl.innerHTML = PRO.hot.map((id, i) => `<button class="hslot${i === PRO.sel ? ' on' : ''}" data-i="${i}" aria-label="${bname(id)}"><img src="${ICONS[id]}" alt=""></button>`).join('') +
    `<button class="hslot grid" id="btnGrid" aria-label="${L('كل المكعّبات', 'All blocks', 'Tüm bloklar')}">▦</button><span class="hname" id="hname"></span>`;
  hotEl.querySelectorAll('.hslot[data-i]').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); selectSlot(+b.dataset.i); }));
  $('#btnGrid').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); SFX.tap(); showPalette(); });
}
let hnameT = 0;
function selectSlot(i){
  PRO.sel = clamp(i, 0, 5); persistPro(); SFX.tap();
  hotEl.querySelectorAll('.hslot[data-i]').forEach(b => b.classList.toggle('on', +b.dataset.i === PRO.sel));
  if(G.mode === 'break') setMode('build');
  const hn = $('#hname'); if(hn){ hn.textContent = bname(PRO.hot[PRO.sel]); hn.style.opacity = 1; clearTimeout(hnameT); hnameT = setTimeout(() => { hn.style.opacity = 0; }, 1500); }
  if(heroM) setHeld(heroM, PRO.hot[PRO.sel]);
}
function drawHud(){
  const key = [PRO.coins, PRO.lvl, PRO.xp, JSON.stringify(PRO.tasks), worldInfo && worldInfo.n, worldInfo && worldInfo.a, MP.code, mpActive(), P.fly, P.ride, nearH ? 1 : 0].join('|');
  if(key === hudKey) return; hudKey = key;
  $('#hudCoins').textContent = '🪙 ' + N(PRO.coins);
  $('#lvlN').textContent = '⭐ ' + N(PRO.lvl);
  $('#lvlBar').style.setProperty('--p', Math.round(PRO.xp / needXp(PRO.lvl) * 100) + '%');
  $('#lvlTxt').textContent = N(PRO.xp) + '/' + N(needXp(PRO.lvl));
  $('#hudName').textContent = '🏡 ' + (worldInfo ? villageName(worldInfo.a, worldInfo.n) : '');
  const rm = $('#hudRoom'); rm.hidden = !mpActive(); if(mpActive()) rm.textContent = '👫 ' + N(MP.players.length) + ' · ' + [...(MP.code || '')].map(N).join('');
  const t = PRO.tasks || [];
  $('#tasks').innerHTML = `<h4>📋 ${L('المهمات', 'Tasks', 'Görevler')}</h4><ul>${t.map(x => `<li class="${x.c >= x.g ? 'done' : ''}"><span></span><em>${x.c >= x.g ? '✅' : N(x.c) + '/' + N(x.g)}</em></li>`).join('')}</ul>`;
  $('#tasks').querySelectorAll('li span').forEach((el, i) => { el.textContent = taskText(t[i]); });
  btnDown.hidden = !P.fly || state !== 'play';
  $('#jumpI').textContent = P.fly ? '⬆️' : '⤴️';
  $('#flyB').textContent = P.fly ? L('مشي', 'Walk', 'Yürü') : L('طير', 'Fly', 'Uç');
  btnRide.hidden = state !== 'play' || !(P.ride >= 0 || nearH);
  $('#rideI').textContent = P.ride >= 0 ? '⬇️' : '🐴'; $('#rideB').textContent = P.ride >= 0 ? L('انزل', 'Get off', 'İn') : L('اركب', 'Ride', 'Bin');
  btnRide.classList.toggle('pulse', P.ride < 0 && !!nearH);
}
let nearH = null;
function setPlayUI(on){
  const pl = on && !G.placing;
  hudEl.hidden = !on;
  for(const el of [joyEl, btnJump, btnFly]) el.hidden = !on;
  for(const el of [hotEl, btnMode, btnVillage]) el.hidden = !pl;
  btnDown.hidden = !on || !P.fly;
  btnRide.hidden = true;
  $('#cross').hidden = !(on && cam.mode === 1 && !G.placing);
  if(!on) $('#placebar').hidden = true;
  clearInput(); hudKey = ''; placeJoyHome();
}
let toastT = 0;
function toast(msg, ms = 2200){ const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms); }
function say(msg, ms){ toast(msg, ms); }
function banner(txt){ const b = $('#banner'); b.textContent = txt; b.classList.remove('go'); void b.offsetWidth; b.classList.add('go'); }
function pop(txt){ const p = document.createElement('div'); p.className = 'pop'; p.textContent = txt; $('#pops').appendChild(p); setTimeout(() => p.remove(), 1600); }

/* ======================================================================
   Screens
   ====================================================================== */
let state = 'loading';
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.className = 'overlay' + (cls ? ' ' + cls : ''); overlay.hidden = false; }
function hideOverlay(){ overlay.hidden = true; }
const sndBtn = () => `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`;
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); }; }
const myHeroBtn = () => `<button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt="">${HERO_NAME[heroId]} ✏️</button>`;
function showTitle(){
  if(G.placing) cancelPlace();
  if(mpActive() || MP.t) coStop();
  if(G.slot >= 0) saveWorld();
  state = 'menu'; setPlayUI(false); showOverlay('clear'); card.className = 'menu';
  if(heroM) heroM.grp.visible = false;
  AU.music(false);
  card.innerHTML = `${sndBtn()}<div class="logo">🧱</div><h1>${L('عالم مكعّبات بوبو', 'Bobo Blocks', 'Bobo Blokları')}</h1>
    <p class="sub">${L('ابني، ازرع، اركب الحصان، وعمّر قريتك!', 'Build, plant, ride the horse and grow your village!', 'İnşa et, ağaç dik, ata bin ve köyünü büyüt!')}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn grass" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button></div>
    <div class="row"><button class="big-btn pink" id="bOnline">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div>`;
  wireSnd();
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('menu'); };
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); showWorlds('play'); };
  $('#bOnline').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
  // the menu shows the last world behind it
  if(menuWorld !== backdropKey()) loadBackdrop();
}
let menuWorld = null;
const backdropKey = () => { const s = PRO.last >= 0 ? readSlot(PRO.last) : null; return s ? 'slot' + PRO.last + ':' + s.seed + ':' + (s.e || '').length : 'demo'; };
async function loadBackdrop(){
  const key = backdropKey(); menuWorld = key;
  const s = PRO.last >= 0 ? readSlot(PRO.last) : null;
  if(W && worldInfo && ((s && worldInfo.seed === s.seed && G.slot === PRO.last) || (!s && worldInfo.demo))) return;
  showLoading(L('عم نجهّز العالم…', 'Getting the world ready…', 'Dünya hazırlanıyor…'));
  await setWorld(s ? { seed:s.seed, a:okAi(s.a), n:okNi(s.n), slot:PRO.last } : { seed:20261126, a:0, n:0, demo:true, slot:-1 }, s ? unpackEdits(s.e) : null, loadProg);
  if(s){ if(Array.isArray(s.plots)) W.builtPlots = s.plots.filter(p => (p | 0) >= 0 && (p | 0) < PLOTS.length).map(p => p | 0); tm = Number.isFinite(s.tm) ? s.tm % 1 : tm; }
  G.slot = s ? PRO.last : -1;
  hideLoading();
}
function showSelect(from){
  state = 'select'; setPlayUI(false); showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🧍 ${L('اختار شخصيتك', 'Pick your character', 'Karakterini seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${HERO_COLOR[id]}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { heroId = b.dataset.h; PRO.hero = heroId; persistPro(); rawSet('worlds_hero', heroId); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bOk').onclick = () => { SFX.tap(); setHero(heroId); heroM.grp.visible = false; if(from === 'mp') mpMenu(); else showTitle(); };
  G.selFrom = from;
}
/* worlds: 3 slots */
function showWorlds(why){
  state = 'worlds'; G.worldsWhy = why; setPlayUI(false); showOverlay('dim'); card.className = 'card wide';
  const slots = [0, 1, 2].map(i => {
    const s = readSlot(i);
    if(!s) return `<button class="wslot new" data-new="${i}"><i>➕</i><b>${L('عالم جديد', 'New world', 'Yeni dünya')}</b><small>${N(i + 1)}</small></button>`;
    const nb = Math.round(((s.e || '').length * 3 / 4) / 2.2);
    return `<div class="wslot" data-i="${i}" role="button" tabindex="0"><i>${NOUNS[okNi(s.n)][3]}</i><b></b><small>🧱 ${N(nb)} · 🏡 ${N((s.plots || []).length)}</small><button class="del" data-del="${i}" aria-label="${L('امسح', 'Delete', 'Sil')}">🗑️</button></div>`;
  }).join('');
  card.innerHTML = `<h2>🌍 ${why === 'host' ? L('أي عالم بدك تشارك مع أصحابك؟', 'Which world do you want to share?', 'Hangi dünyayı paylaşmak istersin?') : L('عوالمي', 'My worlds', 'Dünyalarım')}</h2>
    <div class="slots">${slots}</div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  card.querySelectorAll('.wslot[data-i]').forEach(el => { const s = readSlot(+el.dataset.i); el.querySelector('b').textContent = villageName(s.a, s.n); });
  card.querySelectorAll('.wslot[data-i]').forEach(el => el.onclick = e => { if(e.target.closest('.del')) return; SFX.tap(); openSlot(+el.dataset.i); });
  card.querySelectorAll('[data-new]').forEach(el => el.onclick = () => { SFX.tap(); showNewWorld(+el.dataset.new); });
  card.querySelectorAll('[data-del]').forEach(el => el.onclick = e => { e.stopPropagation(); SFX.tap(); askDelete(+el.dataset.del); });
  $('#bBack').onclick = () => { SFX.tap(); if(why === 'host') mpMenu(); else showTitle(); };
}
function askDelete(i){
  const s = readSlot(i); if(!s) return;
  state = 'worlds'; card.className = 'card';
  card.innerHTML = `<div class="bigstar">🗑️</div><h2></h2><p>${L('أكيد بدك تمسح هالعالم؟ ما رح يرجع.', "Delete this world? It can't come back.", 'Bu dünya silinsin mi? Geri gelmez.')}</p>
    <div class="row"><button class="big-btn pink" id="bYes">🗑️ ${L('امسح', 'Delete', 'Sil')}</button><button class="ghost-btn" id="bNo">↩️ ${L('لأ', 'No', 'Hayır')}</button></div>`;
  card.querySelector('h2').textContent = villageName(s.a, s.n);
  $('#bYes').onclick = () => { rawDel(WKEY(i)); if(PRO.last === i){ PRO.last = -1; persistPro(); } if(G.slot === i) G.slot = -1; SFX.brk(); showWorlds(G.worldsWhy); };
  $('#bNo').onclick = () => { SFX.tap(); showWorlds(G.worldsWhy); };
}
function showNewWorld(slot){
  state = 'newworld'; card.className = 'card wide';
  const pick = { a:Math.floor(Math.random() * ADJS.length), n:Math.floor(Math.random() * NOUNS.length) };
  const draw = () => {
    card.innerHTML = `<h2>🏡 ${L('سمّي قريتك', 'Name your village', 'Köyüne isim ver')}</h2>
      <div class="vprev" id="vprev"></div>
      <div class="names" id="nn">${NOUNS.map((x, i) => `<button data-n="${i}" class="${i === pick.n ? 'on' : ''}">${x[3]} ${L(x[0], x[1], x[2])}</button>`).join('')}</div>
      <div class="names" id="aa">${ADJS.map((x, i) => `<button data-a="${i}" class="${i === pick.a ? 'on' : ''}">${L(x[0], x[1], x[2])}</button>`).join('')}</div>
      <div class="row"><button class="ghost-btn" id="bDice">🎲 ${L('اختيار عشوائي', 'Surprise me', 'Rastgele')}</button><button class="big-btn grass" id="bMake">✅ ${L('اعمل العالم', 'Make the world', 'Dünyayı yap')}</button><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
    $('#vprev').textContent = villageName(pick.a, pick.n);
    card.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { pick.n = +b.dataset.n; SFX.tap(); draw(); });
    card.querySelectorAll('[data-a]').forEach(b => b.onclick = () => { pick.a = +b.dataset.a; SFX.tap(); draw(); });
    $('#bDice').onclick = () => { pick.a = Math.floor(Math.random() * ADJS.length); pick.n = Math.floor(Math.random() * NOUNS.length); SFX.tap(); draw(); };
    $('#bMake').onclick = () => { SFX.tap(); createWorld(slot, pick.a, pick.n); };
    $('#bBack').onclick = () => { SFX.tap(); showWorlds(G.worldsWhy); };
  };
  draw();
}
async function createWorld(slot, a, n){
  const seed = (Math.floor(Math.random() * 2147483646) + 1) >>> 0;
  const s = { v:1, seed, a, n, e:'', tm:.08, plots:[1], made:Date.now() };
  rawSet(WKEY(slot), JSON.stringify(s));
  await openSlot(slot, true);
}
async function openSlot(i, fresh){
  const s = readSlot(i); if(!s){ showWorlds(G.worldsWhy); return; }
  if(G.slot >= 0 && G.slot !== i) saveWorld();
  hideOverlay();
  showLoading(fresh ? L('عم نعمّر عالمك الجديد…', 'Building your new world…', 'Yeni dünyan kuruluyor…') : L('عم نفتح عالمك…', 'Opening your world…', 'Dünyan açılıyor…'));
  if(!(W && worldInfo && worldInfo.seed === s.seed && worldInfo.slot === i)){
    await setWorld({ seed:s.seed, a:okAi(s.a), n:okNi(s.n), slot:i }, unpackEdits(s.e), loadProg);
    if(Array.isArray(s.plots)) W.builtPlots = s.plots.filter(p => (p | 0) >= 0 && (p | 0) < PLOTS.length).map(p => p | 0);
  }
  worldInfo = { seed:s.seed, a:okAi(s.a), n:okNi(s.n), slot:i };
  G.slot = i; PRO.last = i; persistPro(); menuWorld = backdropKey();
  tm = Number.isFinite(s.tm) ? s.tm % 1 : .08;
  hideLoading();
  const p = Array.isArray(s.p) && s.p.length === 4 && s.p.every(Number.isFinite) ? s.p : null;
  beginPlay(p);
  if(G.worldsWhy === 'host'){ G.worldsWhy = null; mpCreate(G.hostRoom || null); }
}
function beginPlay(p){
  state = 'play'; hideOverlay(); setHero(heroId); heroM.grp.visible = true;
  P.ride = -1; P.fly = false; btnFly.classList.remove('act'); P.vx = P.vy = P.vz = 0;
  if(p){ P.x = clamp(p[0], 1, WX - 1); P.y = clamp(p[1], 1, WH + 10); P.z = clamp(p[2], 1, WZ - 1); P.f = p[3]; if(hits(P.x, P.y, P.z)) respawn(); }
  else { P.x = SPAWN.x; P.z = SPAWN.z; P.y = W.surface(P.x, P.z) + 1.01; P.f = Math.PI; }
  cam.yaw = P.f + Math.PI; setCamMode(cam.mode); snapCam = true;
  setPlayUI(true); drawHot(); setMode('build'); ensureTasks(); persistPro(); hudKey = '';
  AU.music(true);
  if(!PRO.tut){ PRO.tut = 1; persistPro(); setTimeout(() => say('👆 ' + L('اضغط على أي مكعّب لتحطّ مكعّب جديد! ⛏️ للتكسير، ▦ لكل المكعّبات', 'Tap any block to put a new block on it! ⛏️ to break, ▦ for all blocks', 'Yeni blok koymak için bir bloğa dokun! ⛏️ kırmak için, ▦ tüm bloklar'), 6500), 600); }
}
function showPause(){
  if(state !== 'play') return; $('#toast').hidden = true;
  state = 'pause'; clearInput(); saveWorld();
  showOverlay('dim'); card.className = 'card';
  card.innerHTML = `${sndBtn()}<div class="bigstar">⏸️</div><h2 id="pName"></h2>
    ${mpActive() ? `<p>👫 ${L('رقم الغرفة', 'Room number', 'Oda numarası')}</p><div class="bigcode">${[...MP.code].map(N).join('')}</div>` : `<p>💾 ${G.slot >= 0 ? L('عالمك محفوظ على هالتلفون', 'Your world is saved on this phone', 'Dünyan bu telefonda kayıtlı') : L('هاد عالم صاحبك', "This is your friend's world", 'Bu arkadaşının dünyası')}</p>`}
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button></div>
    <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bMenu">🌍 ${mpActive() ? L('اطلع من الغرفة', 'Leave the room', 'Odadan çık') : L('عوالمي', 'My worlds', 'Dünyalarım')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  $('#pName').textContent = worldInfo ? villageName(worldInfo.a, worldInfo.n) : '';
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); closePanel(); };
  $('#bMyHero').onclick = () => { SFX.tap(); state = 'play'; showSelectInGame(); };
  $('#bMenu').onclick = () => { SFX.tap(); if(mpActive()){ coStop(); showTitle(); } else { saveWorld(); showWorlds('play'); } };
  $('#bExit').onclick = () => { try{ saveWorld(); coStop(); }catch(e){} location.href = '../'; };
}
function showSelectInGame(){
  state = 'pause'; showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🧍 ${L('اختار شخصيتك', 'Pick your character', 'Karakterini seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${HERO_COLOR[id]}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { heroId = b.dataset.h; PRO.hero = heroId; persistPro(); rawSet('worlds_hero', heroId); SFX.tap(); setHero(heroId); mpTrack(); closePanel(); });
}
function closePanel(){ if(['pause', 'palette', 'village', 'map'].includes(state)){ state = 'play'; hideOverlay(); setPlayUI(true); } }
$('#btnPause').onclick = () => { SFX.tap(); if(G.placing) cancelPlace(); showPause(); };
$('#btnCam').onclick = () => { if(state !== 'play') return; SFX.tap(); setCamMode(cam.mode + 1); toast('🎥 ' + L(...CAM_NAMES[cam.mode]), 1400); };
$('#btnMap').onclick = () => { if(state !== 'play') return; SFX.tap(); showMap(); };
/* palette */
let palCat = 'build';
function showPalette(){
  if(state !== 'play') return; $('#toast').hidden = true;
  state = 'palette'; clearInput(); showOverlay('dim'); card.className = 'card wide panel';
  const draw = () => {
    const list = PALETTE.filter(b => b.cat === palCat);
    card.innerHTML = `<h2>▦ ${L('كل المكعّبات', 'All blocks', 'Tüm bloklar')}</h2>
      <div class="tabs">${CATS.map(c => `<button data-c="${c.id}" class="${c.id === palCat ? 'on' : ''}">${c.e} ${L(...c.n)}</button>`).join('')}</div>
      <div class="pal">${list.map(b => `<button class="pb${PRO.hot[PRO.sel] === b.id ? ' on' : ''}" data-b="${b.id}"><img src="${ICONS[b.id]}" alt=""><b>${bname(b.id)}</b></button>`).join('')}</div>
      <p style="font-size:14px">${L('اختار مكعّب ليصير بالخانة رقم', 'Pick a block for slot', 'Bir blok seç, yuva')} ${N(PRO.sel + 1)} ✋</p>
      <div class="row"><button class="ghost-btn" id="bClose">✖️ ${L('سكّر', 'Close', 'Kapat')}</button></div>`;
    card.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { palCat = b.dataset.c; SFX.tap(); draw(); });
    card.querySelectorAll('[data-b]').forEach(b => b.onclick = () => { pickBlockForSlot(+b.dataset.b); });
    $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
  };
  draw();
}
function pickBlockForSlot(id){
  const have = PRO.hot.indexOf(id);
  if(have >= 0 && have !== PRO.sel){ PRO.hot[have] = PRO.hot[PRO.sel]; }
  PRO.hot[PRO.sel] = id; persistPro(); SFX.place(); closePanel(); drawHot(); selectSlot(PRO.sel);
}
/* village */
function showVillage(){
  if(state !== 'play') return; $('#toast').hidden = true;
  state = 'village'; clearInput(); showOverlay('dim'); card.className = 'card wide panel';
  card.innerHTML = `<h2>🏡 <span id="vn"></span></h2>
    <p>${L('اختار بناية جاهزة، وبتنبنى قدّامك بثواني! 🪙', 'Pick a ready building and watch it rise in seconds! 🪙', 'Hazır bir bina seç, saniyeler içinde yükselsin! 🪙')} <b style="direction:ltr;display:inline-block">🪙 ${N(PRO.coins)}</b></p>
    <div class="bps">${BLUEPRINTS.map(b => { const lock = PRO.lvl < b.lvl, rich = PRO.coins >= b.cost; return `<button class="bpc${lock ? ' lock' : rich ? ' ok' : ''}" data-bp="${b.id}"><i>${b.e}</i><b>${L(...b.n)}</b><div class="cost"><span class="${rich ? '' : 'no'}">🪙 ${N(b.cost)}</span><span>⏱️ ${N(b.time)}${L('ث', 's', 'sn')}</span>${lock ? `<span>⭐ ${N(b.lvl)}</span>` : ''}</div></button>`; }).join('')}</div>
    <div class="row"><button class="ghost-btn" id="bClose">✖️ ${L('سكّر', 'Close', 'Kapat')}</button></div>`;
  $('#vn').textContent = worldInfo ? villageName(worldInfo.a, worldInfo.n) : L('قريتي', 'My village', 'Köyüm');
  card.querySelectorAll('[data-bp]').forEach(el => el.onclick = () => {
    const b = BP[el.dataset.bp];
    if(PRO.lvl < b.lvl){ SFX.nope(); toast('🔒 ' + L('بتفتح بالمستوى', 'Opens at level', 'Açılır: seviye') + ' ⭐ ' + N(b.lvl), 2000); return; }
    SFX.tap(); state = 'play'; hideOverlay(); startPlace(b.id);
  });
  $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
}
/* map */
let mapCv = null;
function showMap(){
  if(state !== 'play') return; $('#toast').hidden = true;
  state = 'map'; clearInput(); showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🗺️ <span id="mn"></span></h2><div class="mapcols"><div class="mapwrap" id="mapw"><canvas id="mapc" width="160" height="160"></canvas></div>
    <div class="legend"><span>🔴 ${L('إنت', 'You', 'Sen')}</span>${mpActive() ? `<span>🔵 ${L('أصحابك', 'Friends', 'Arkadaşlar')}</span>` : ''}<span>🟤 ${L('الحيوانات', 'Animals', 'Hayvanlar')}</span><span>👆 ${L('اضغط لتروح لهونيك', 'Tap to go there', 'Gitmek için dokun')}</span></div></div>
    <div class="row"><button class="ghost-btn" id="bClose">✖️ ${L('سكّر', 'Close', 'Kapat')}</button></div>`;
  $('#mn').textContent = worldInfo ? villageName(worldInfo.a, worldInfo.n) : '';
  mapCv = $('#mapc'); drawMap();
  $('#mapw').addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const r = mapCv.getBoundingClientRect(), p = toLayer(e.clientX, e.clientY), q = toLayer(r.left, r.top), q2 = toLayer(r.right, r.bottom);
    const x0 = Math.min(q.x, q2.x), y0 = Math.min(q.y, q2.y), w = Math.abs(q2.x - q.x), h = Math.abs(q2.y - q.y);
    const mx = (p.x - x0) / w * WX, mz = (p.y - y0) / h * WZ;
    if(mx < 1 || mz < 1 || mx > WX - 1 || mz > WZ - 1) return;
    if(P.ride >= 0) dismount();
    P.x = mx; P.z = mz; P.y = W.surface(mx, mz) + 1.05; P.vx = P.vy = P.vz = 0; snapCam = true; SFX.fly();
    closePanel();
  });
  $('#bClose').onclick = () => { SFX.tap(); closePanel(); };
}
function drawMap(){
  if(!mapCv) return;
  const x = mapCv.getContext('2d'), img = x.createImageData(WX, WZ), d = img.data;
  for(let z = 0; z < WZ; z++) for(let xx = 0; xx < WX; xx++){
    let y = WH - 1, id = 0; for(; y > 0; y--){ id = W.get(xx, y, z); if(id && id !== ID.tallGrass && SHAPE[id] !== SH.cross) break; }
    const c = TILE_COL[id === ID.water ? SIDE[id] : TOP[id]] || [0, 0, 0], k = .75 + clamp((y - 8) / 30, 0, .45);
    const i = (z * WX + xx) * 4; d[i] = Math.min(255, c[0] * k); d[i + 1] = Math.min(255, c[1] * k); d[i + 2] = Math.min(255, c[2] * k); d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.fillStyle = '#7a4a2a'; for(const a of AN) x.fillRect(a.x - 1, a.z - 1, 2, 2);
  x.fillStyle = '#3b6fd6'; for(const r of RM.values()){ x.beginPath(); x.arc(r.x, r.z, 3, 0, 7); x.fill(); }
  x.fillStyle = '#e8304f'; x.strokeStyle = '#fff'; x.lineWidth = 1.2; x.beginPath(); x.arc(P.x, P.z, 3.4, 0, 7); x.fill(); x.stroke();
}

/* loading */
function showLoading(t){ $('#loading').hidden = false; $('#loadT').textContent = t; $('#loadP').style.width = '0%'; }
function loadProg(f){ $('#loadP').style.width = Math.round(f * 100) + '%'; }
function hideLoading(){ $('#loading').hidden = true; }

/* ---------- save the world ---------- */
let saveT = 0;
function saveWorld(){
  if(G.slot < 0 || !W || !worldInfo || worldInfo.demo) return true;
  const s = { v:1, seed:W.seed, a:worldInfo.a, n:worldInfo.n, e:W.packEdits(), tm:r2(tm), p:[r2(P.x), r2(P.y), r2(P.z), r2(P.f)], plots:W.builtPlots.slice(), t:Date.now() };
  const ok = rawSet(WKEY(G.slot), JSON.stringify(s));
  if(!ok) toast(L('ما في مكان كفاية للحفظ 🙈', 'Not enough space to save 🙈', 'Kaydetmek için yer yok 🙈'), 3000);
  return ok;
}
addEventListener('pagehide', () => { try{ saveWorld(); persistPro(); }catch(e){} });
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'hidden'){ try{ saveWorld(); persistPro(); }catch(e){} } });

/* ======================================================================
   Friends (remote players)
   ====================================================================== */
const RM = new Map();
function remoteSync(list){
  const ids = new Set(list.filter(p => p.id !== MP.id).map(p => p.id));
  for(const id of [...RM.keys()]) if(!ids.has(id)) dropRemote(id);
  for(const p of list){
    if(p.id === MP.id) continue;
    let r = RM.get(p.id);
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(r && (r.hero !== hero || r.avK !== avK)){ dropHero(r.h); r.h = null; }
    if(!r){ const lbl = document.createElement('div'); lbl.className = 'nm'; $('#labels').appendChild(lbl); r = { id:p.id, x:SPAWN.x, y:VH + 1, z:SPAWN.z, f:0, m:0, tx:SPAWN.x, ty:VH + 1, tz:SPAWN.z, tf:0, seen:false, lbl, rd:-1, fl:0, act:0 }; RM.set(p.id, r); }
    r.hero = hero; r.av = av; r.avK = avK; r.c = p.c | 0;
    if(!r.h){ r.h = makeHero(hero, av); scene.add(r.h.grp); r.h.heldId = -1; }
    r.lbl.style.setProperty('--c', HERO_COLOR[hero]);
    r.lbl.textContent = BoboRT.who(p.id, '') || HERO_NAME[hero];
  }
}
function dropRemote(id){ const r = RM.get(id); if(!r) return; dropHero(r.h); r.lbl.remove(); RM.delete(id); }
function onPos(p){
  const r = RM.get(p.id); if(!r) return;
  const num = (v, a, b, d) => Number.isFinite(v) ? clamp(v, a, b) : d;
  r.tx = num(p.x, 0, WX, r.tx); r.ty = num(p.y, -10, WH + 25, r.ty); r.tz = num(p.z, 0, WZ, r.tz); r.tf = num(p.f, -20, 20, r.tf); r.m = num(p.m, 0, 1, 0);
  r.fl = p.fl ? 1 : 0; r.rd = Number.isInteger(p.rd) && p.rd >= 0 && p.rd < AN.length && AN[p.rd].kind === 'horse' ? p.rd : -1; r.act = p.a ? 1 : 0;
  r.hb = Number.isInteger(p.hb) && VALID[p.hb] ? p.hb : ID.plankOak;
  if(!r.seen){ r.x = r.tx; r.y = r.ty; r.z = r.tz; r.f = r.tf; r.seen = true; }
}
function drawRemotes(dt, t){
  for(const r of RM.values()){
    if(!r.h) continue;
    r.x = lerp(r.x, r.tx, Math.min(1, dt * 10)); r.y = lerp(r.y, r.ty, Math.min(1, dt * 10)); r.z = lerp(r.z, r.tz, Math.min(1, dt * 10)); r.f += angDiff(r.tf, r.f) * Math.min(1, dt * 10);
    r.h.grp.visible = r.seen;
    const sit = r.rd >= 0;
    r.h.grp.position.set(r.x, r.y + (sit ? 1.3 : 0), r.z); r.h.grp.rotation.y = r.f;
    if(sit) sitPose(r.h, t); else poseHero(r.h, { t, dt, run:r.fl ? 0 : r.m, grounded:!r.fl, vy:0, sq:0, flip:0 });
    if(r.fl){ r.h.arms.forEach(a => { a.rotation.z = -a.userData.side * 1.3; }); }
    if(r.act) buildPose(r.h, (t * 4) % 1);
    setHeld(r.h, r.hb || ID.plankOak);
    r.h.blob.position.set(r.x, W ? W.surface(r.x, r.z) + 1.02 : 0, r.z);
    tmpV.set(r.x, r.y + (sit ? 3.4 : 2.25), r.z).project(camera);
    const on = r.seen && tmpV.z < 1 && Math.abs(tmpV.x) < 1.1 && Math.abs(tmpV.y) < 1.1 && state === 'play';
    r.lbl.hidden = !on || !r.lbl.textContent;
    if(on) r.lbl.style.transform = `translate(${(tmpV.x + 1) / 2 * SW}px,${(1 - tmpV.y) / 2 * SHh}px) translate(-50%,-100%)`;
  }
}
function clearLabels(){ for(const j of jobs) j.lbl && j.lbl.remove(); }

/* ======================================================================
   Online: rooms («👫 العب مع أصحابك»)
   Events: pos (each kid ~10×/s), ed (block changes, batched), hi (a friend asks the host for the world), ws (host → one friend:
   the seed + changed blocks, in parts), an (host: animals + time of day, 5×/s), fx (hearts).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'ed', 'hi', 'ws', 'an', 'fx'];
const MP_MAX = 4, PART = 20000;
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-blocks-' + code, id, events:MP_EVENTS, eps:40, h, volatile:['pos', 'an'] });
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
    const bc = this.bc = new BroadcastChannel('bobo-blocks-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, posT:0, anT:0, hiT:0, inviteFor:null, typed:'', hostGone:0, q:[], qT:0, sentT:[], parts:null, early:[], rx:new Map(), sentWorld:new Map() };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const FR_GAME = 'blocks';
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
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0; MP.q = []; MP.parts = null; MP.early = []; MP.sentWorld = new Map();
  for(const id of [...RM.keys()]) dropRemote(id);
}
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
  const used = new Set(others.map(p => p.c)); let c = 0; while(used.has(c)) c++;
  MP.meta = { fc:BoboRT.fc(), hero:heroId, av:myAv(), c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.av = myAv(); MP.meta.fc = MP.meta.fc || BoboRT.fc(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t && MP.meta) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { for(const p of list){ const r = RM.get(p.id); if(r) r.lbl.textContent = BoboRT.who(p.id, '') || HERO_NAME[r.hero]; } });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  if(all.findIndex(p => p.id === MP.id) >= MP_MAX){ coStop(); showTitle(); toast(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ if(!MP.hostGone) MP.hostGone = performance.now(); }
  else MP.hostGone = 0;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length){ SFX.join(); if(MP.screen === 'in') toast('👋 ' + L('صاحبك فات!', 'A friend came in!', 'Bir arkadaşın geldi!'), 1800); }
  remoteSync(MP.players);
  hudKey = '';
}
/* block changes: queued, sent ~10×/s in batches (at most 120 blocks a second from one phone) */
function mpEdit(x, y, z, id){ if(!mpActive() || MP.screen !== 'in') return; MP.q.push(x, y, z, id); }
function mpFlush(now){
  if(!MP.q.length || now - MP.qT < 100) return;
  MP.sentT = MP.sentT.filter(t => now - t[0] < 1000);
  const sent = MP.sentT.reduce((s, t) => s + t[1], 0), room = Math.max(0, 120 - sent);
  if(!room) return;
  const n = Math.min(room, 60, MP.q.length / 4) * 4;
  const e = MP.q.splice(0, n);
  MP.qT = now; MP.sentT.push([now, n / 4]);
  mpSend('ed', { e });
}
function onEdits(p){
  if(!Array.isArray(p.e) || p.e.length % 4) return;
  const now = performance.now();
  // a friend may send at most ~300 blocks a second
  const rx = MP.rx.get(p.id) || { t:now, n:0 }; if(now - rx.t > 1000){ rx.t = now; rx.n = 0; } rx.n += p.e.length / 4; MP.rx.set(p.id, rx);
  if(rx.n > 300) return;
  if(!W || MP.screen !== 'in'){ MP.early.push(p.e.slice(0, 2400)); return; }
  applyRemote(p.e);
}
function applyRemote(e){
  for(let i = 0; i + 3 < e.length; i += 4){
    const x = e[i], y = e[i + 1], z = e[i + 2], id = e[i + 3];
    if(![x, y, z, id].every(Number.isInteger) || x < 0 || z < 0 || x >= WX || z >= WZ || y < 1 || y >= WH || !(id === 0 || VALID[id])) continue;
    if(setBlock(x, y, z, id, false) && Math.random() < .3 && id) puff(x + .5, y + .5, z + .5, id, 2);
  }
}
function sendWorld(to){
  const now = performance.now(), last = MP.sentWorld.get(to) || 0;
  if(now - last < 3500) return; MP.sentWorld.set(to, now);
  const e = W.packEdits(), n = Math.max(1, Math.ceil(e.length / PART));
  for(let k = 0; k < n; k++) mpSend('ws', { to, k, of:n, s:W.seed, a:worldInfo.a, nn:worldInfo.n, tm:r2(tm), pl:W.builtPlots.slice(0, 6), e:e.slice(k * PART, (k + 1) * PART) });
}
async function onWorld(p){
  if(p.to !== MP.id || p.id !== MP.hostId || MP.screen !== 'loading') return;
  if(!Number.isInteger(p.k) || !Number.isInteger(p.of) || p.of < 1 || p.of > 400 || p.k < 0 || p.k >= p.of || typeof p.e !== 'string' || !Number.isFinite(p.s)) return;
  if(!MP.parts || MP.parts.of !== p.of || MP.parts.s !== p.s) MP.parts = { of:p.of, s:p.s, got:new Array(p.of).fill(null), n:0 };
  const P2 = MP.parts;
  if(P2.got[p.k] == null){ P2.got[p.k] = p.e; P2.n++; }
  $('#loadP') && loadProg(P2.n / P2.of * .3);
  if(P2.n < P2.of) return;
  MP.screen = 'building';
  showLoading(L('عم نجيب عالم صاحبك…', "Getting your friend's world…", 'Arkadaşının dünyası geliyor…'));
  await setWorld({ seed:p.s >>> 0, a:okAi(p.a), n:okNi(p.nn), slot:-1 }, unpackEdits(P2.got.join('')), f => loadProg(.3 + f * .7));
  if(Array.isArray(p.pl)) W.builtPlots = p.pl.filter(Number.isInteger).filter(i => i >= 0 && i < PLOTS.length);
  G.slot = -1; tm = Number.isFinite(p.tm) ? p.tm % 1 : tm;
  hideLoading();
  if(!mpActive()) return;
  MP.screen = 'in';
  for(const e of MP.early) applyRemote(e); MP.early = [];
  beginPlay(null);
  toast('👫 ' + L('فتت على عالم صاحبك! ابنوا سوا', "You're in your friend's world! Build together", 'Arkadaşının dünyasındasın! Birlikte inşa edin'), 3500);
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'ed'){ onEdits(p); return; }
  if(ev === 'fx'){ if(p.k === 'h' && Number.isInteger(p.i) && AN[p.i] && MP.screen === 'in') petAnimal(p.i, false); return; }
  if(ev === 'hi'){ if(MP.isHost && W && MP.screen === 'in' && MP.players.some(x => x.id === p.id)) sendWorld(p.id); return; }
  if(ev === 'ws'){ onWorld(p); return; }
  if(p.id !== MP.hostId || MP.isHost) return;
  if(ev === 'an' && MP.screen === 'in' && Array.isArray(p.a)){
    if(Number.isFinite(p.tm)) { const d = angDiff(p.tm * 6.283, tm * 6.283); if(Math.abs(d) > .05) tm = p.tm; }
    for(let i = 0; i < AN.length && i * 4 + 3 < p.a.length; i++){ const a = AN[i], x = p.a[i * 4], y = p.a[i * 4 + 1], z = p.a[i * 4 + 2], f = p.a[i * 4 + 3]; if([x, y, z, f].every(Number.isFinite)){ a.sx = clamp(x, 0, WX); a.sy = clamp(y, 0, WH); a.sz = clamp(z, 0, WZ); a.sf = f; const d = Math.hypot(a.sx - a.x, a.sz - a.z); a.m = clamp(d * 3, 0, 1); if(d > 6){ a.x = a.sx; a.z = a.sz; a.y = a.sy; } } }
  }
}
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){
    MP.hostGone = 0; coStop(); showTitle();
    toast(L('صاحب الغرفة طلع 🚪 بتقدر تلعب بعالمك أو تعمل غرفة جديدة', 'The room owner left 🚪 play your own world or make a new room', 'Oda sahibi çıktı 🚪 kendi dünyanda oyna ya da yeni oda kur'), 5000);
    return;
  }
  const now = performance.now();
  MP.posT -= dt; MP.anT -= dt; MP.hiT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  if(MP.screen === 'loading' && MP.hiT <= 0){ MP.hiT = 2.5; mpSend('hi', {}); }
  if(MP.screen !== 'in') return;
  mpFlush(now);
  if(MP.posT <= 0){
    MP.posT = .1;
    mpSend('pos', { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), m:r2(clamp(Math.hypot(P.vx, P.vz) / 5, 0, 1)), fl:P.fly ? 1 : 0, rd:P.ride, a:P.act > 0 ? 1 : 0, hb:PRO.hot[PRO.sel] });
  }
  if(MP.isHost && MP.anT <= 0){
    MP.anT = .2;
    const a = []; for(const x of AN) a.push(r2(x.x), r2(x.y), r2(x.z), r2(x.f));
    mpSend('an', { tm:Math.round(tm * 10000) / 10000, a });
  }
}
function coStop(){ MP.tok++; mpClose(); MP.screen = 'off'; hudKey = ''; }

/* ---------- room menus, keypad ---------- */
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); if(heroM) heroM.grp.visible = false; }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false); state = 'mpmenu'; AU.music(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🧱 ${L('لحتى 4 أصحاب يبنوا سوا بعالم واحد!', 'Up to 4 friends build together in one world!', '4 arkadaşa kadar aynı dünyada birlikte inşa edin!')}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة بعالمي', 'Make a room in my world', 'Dünyamda oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); G.hostRoom = null; showWorlds('host'); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function mpBack(){ if(MP.screen === 'menu') showTitle(); else mpMenu(); }
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
/* the host: already playing a world (opened from «اعمل غرفة» or ?host=1) */
async function mpCreate(want){
  if(!W || G.slot < 0){ showWorlds('host'); return; }
  const back = () => { state = 'play'; hideOverlay(); setPlayUI(true); if(heroM) heroM.grp.visible = true; };
  mpConnecting();
  const limit = performance.now() + 20000;
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpenRetry(code, 'create', limit);
      if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
      if(r === 'ok'){ MP.screen = 'in'; back(); hudKey = ''; toast('🏠 ' + L('قلّ لأصحابك رقم الغرفة:', 'Tell your friends the room number:', 'Arkadaşlarına oda numarasını söyle:') + ' ' + [...code].map(N).join(''), 6000); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(want)); }
}
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; }
async function mpOpenRetry(code, how, until){
  for(;;){
    try{ return await mpOpen(code, how); }
    catch(e){ if(String(e && e.message) === 'cancelled' || MP.screen !== 'connecting' || performance.now() > until - 3000) throw e; await new Promise(r => setTimeout(r, 800)); if(MP.screen !== 'connecting') throw new Error('cancelled'); }
  }
}
async function mpJoin(code, until){
  if(G.slot >= 0){ saveWorld(); }
  mpConnecting();
  const limit = until || performance.now() + 20000;
  try{
    let r = await mpOpenRetry(code, 'join', limit);
    if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpenRetry(code, 'join', limit); if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    }
    if(r === 'ok'){
      MP.screen = 'loading'; MP.hiT = 0; MP.parts = null; G.slot = -1;
      card.innerHTML = `<div class="bigstar"><span class="spin">🧱</span></div><h2>${L('عم نجيب عالم صاحبك…', "Getting your friend's world…", 'Arkadaşının dünyası geliyor…')}</h2><div class="pbar"><i id="mpP"></i></div>
        <button class="ghost-btn" id="bCancel">↩️ ${L('رجوع', 'Back', 'Geri')}</button>`;
      $('#bCancel').onclick = () => { SFX.tap(); mpMenu(); };
      mpSend('hi', {});
    }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
let retry = () => {};
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
  else if(k === 'ok'){ if(MP.typed.length === 4){ retry = () => mpJoin(MP.typed); mpJoin(MP.typed); } else SFX.nope(); return; }
  else if(/^\d$/.test(k) && MP.typed.length < 4){ MP.typed += k; SFX.tap(); }
  const m = $('#kpMsg'); if(m) m.textContent = '';
  mpKeyDraw();
  if(MP.typed.length === 4){ const code = MP.typed; setTimeout(() => { if(MP.screen === 'keypad' && MP.typed === code){ retry = () => mpJoin(code); mpJoin(code); } }, 300); }
}
addEventListener('keydown', e => {
  if(state !== 'mp' || MP.screen !== 'keypad') return;
  if(/^\d$/.test(e.key)) mpKey(e.key); else if(e.key === 'Backspace') mpKey('del'); else if(e.key === 'Enter') mpKey('ok');
});

/* ======================================================================
   Day and night
   ====================================================================== */
const DAY_LEN = 360;
let tm = .08, nightK = 0;
const cTop = new THREE.Color(), cHor = new THREE.Color(), cA = new THREE.Color(), cB = new THREE.Color();
function updateSky(dt){
  if(state === 'play' || state === 'pause' || state === 'palette' || state === 'village' || state === 'map'){ if(!mpActive() || MP.isHost) tm = (tm + dt / DAY_LEN) % 1; }
  const a = tm * Math.PI * 2, sy = Math.sin(a), sx = Math.cos(a);
  const day = sstep(-.16, .22, sy), dusk = Math.exp(-Math.pow(sy / .2, 2));
  nightK = 1 - day;
  cTop.set(0x0d1640).lerp(cA.set(0x3d8ff0), day);
  cHor.set(0x27325f).lerp(cB.set(0xbfe6ff), day); cHor.lerp(cA.set(0xffa27a), dusk * .55);
  SKY.top.value.copy(hexV(cTop.getHex(THREE.SRGBColorSpace))); SKY.hor.value.copy(hexV(cHor.getHex(THREE.SRGBColorSpace)));
  SKY.sun.value.set(sx, sy, .25).normalize(); SKY.glow.value.set(1, .85, .63).multiplyScalar(day * .8 + dusk * .6);
  const cp = camera.position;
  sky.position.copy(cp);
  sunS.position.set(cp.x + sx * 300, cp.y + sy * 300, cp.z + 75); sunS.visible = sy > -.15;
  moonS.position.set(cp.x - sx * 300, cp.y - sy * 300, cp.z - 75); moonS.visible = sy < .15;
  stars.position.copy(cp); stars.material.opacity = clamp((nightK - .4) * 1.8, 0, 1);
  clouds.position.x = WX / 2 + Math.sin(performance.now() / 1000 / 160) * 60; clouds.position.z = WZ / 2 + Math.cos(performance.now() / 1000 / 230) * 30;
  clouds.material.color.setRGB(lerp(.35, 1, day), lerp(.38, 1, day), lerp(.55, 1, day));
  // block light
  const amb = cA.setRGB(lerp(.2, 1, day), lerp(.24, 1, day), lerp(.42, 1, day)); amb.lerp(cB.setRGB(1, .82, .7), dusk * .25);
  U.uAmb.value.set(amb.r, amb.g, amb.b);
  // three.js lights for the characters
  hemi.intensity = lerp(.35, 1.1, day); sunL.intensity = lerp(.15, 1.6, day); sunL.color.setRGB(1, lerp(.75, 1, day), lerp(.6, 1, day));
  sunL.position.set(sx * 50, Math.max(10, sy * 60), 20);
  // fog = horizon colour (raw for the block shader, linear for three)
  const hc = cHor.getHex(THREE.SRGBColorSpace); U.uFog.value.copy(hexV(hc)); scene.fog.color.copy(cHor);
  const far = ((G.placing || cam.mode === 2) && state === 'play' ? 120 : qualityFar) + clamp(cp.y - 34, 0, 40) * 1.2, near = far * .55;
  U.uNear.value = near; U.uFar.value = far; scene.fog.near = near; scene.fog.far = far;
  if(state !== 'menu') AU.mood(nightK);
}

/* ======================================================================
   Frame
   ====================================================================== */
let last = performance.now(), fps = 60, fpsAcc = 0, fpsN = 0, qualityFar = 78, lowT = 0, saveTick = 0;
function frame(now){
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - last) / 1000); last = now;
  fpsAcc += dt; fpsN++; if(fpsAcc > 1){ fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0;
    if(state === 'play'){ if(fps < 32){ lowT++; if(lowT >= 4 && (dpr > 1 || qualityFar > 56)){ if(dpr > 1){ dpr = 1; renderer.setPixelRatio(1); resize(); } else qualityFar = 56; lowT = 0; } } else lowT = 0; } }
  const t = now / 1000;
  U.uTime.value = t;
  if(W){
    remesh(state === 'play' ? 7 : 4);
    if(state === 'play' || state === 'pause' || state === 'palette' || state === 'village' || state === 'map'){
      G.playT += dt;
      const playing = state === 'play';
      const I = playing ? readInput() : { x:0, z:0, m:0 };
      physics(dt, I.x, I.z, I.m);
      P.m = I.m;
      if(I.m > .1){ P.f += angDiff(Math.atan2(I.x, I.z), P.f) * Math.min(1, dt * 12); if(P.gr && !P.fly) (P.ride >= 0 ? SFX.gallop : SFX.step)(); }
      // camera slowly turns behind me while I walk (not while I look around)
      if(cam.mode === 0 && I.m > .1 && now - cam.lookT > 1800 && look.id == null && !G.placing && !testInput){ cam.yaw += angDiff(P.f + Math.PI, cam.yaw) * Math.min(1, dt * .9); }
      if(cam.mode === 1) P.f = cam.yaw + Math.PI;
      P.act = Math.max(0, P.act - dt); P.sq *= Math.exp(-dt * 10);
      runJobs(dt); runGrows(dt);
      simAnimals(dt);
      nearH = P.ride < 0 && !P.fly ? nearHorse() : null;
      if(G.placing) updatePlace();
      saveTick += dt; if(saveTick > 25 && G.slot >= 0){ saveTick = 0; saveWorld(); }
    } else simAnimals(dt);
    drawAnimals(dt);
    if(heroM){
      const riding = P.ride >= 0;
      heroM.grp.visible = cam.mode !== 1 && ['play', 'pause', 'palette', 'village', 'map'].includes(state);
      heroM.grp.position.set(P.x, P.y + (riding ? 1.3 : 0), P.z); heroM.grp.rotation.y = P.f;
      if(riding) sitPose(heroM, t);
      else poseHero(heroM, { t, dt, run:P.fly ? 0 : clamp(Math.hypot(P.vx, P.vz) / 4.8, 0, 1), grounded:P.gr || P.swim, vy:P.vy, sq:P.sq, flip:0 });
      if(P.fly && !riding){ heroM.arms.forEach(a => { a.rotation.z = -a.userData.side * 1.3; a.rotation.x = -.2; }); heroM.body.rotation.x = clamp(Math.hypot(P.vx, P.vz) / 10, 0, .5); }
      if(P.act > 0) buildPose(heroM, 1 - P.act / .28);
      heroM.blob.visible = heroM.grp.visible;
      heroM.blob.position.set(P.x, floorShadowY(), P.z);
    }
    drawRemotes(dt, t);
    updateBits(dt); updateHearts(dt);
    for(const j of jobs){ tmpV.set(j.x + j.w / 2, j.y + j.h + 1.5, j.z + j.d / 2).project(camera); const on = tmpV.z < 1 && state === 'play'; j.lbl.hidden = !on; if(on){ j.lbl.textContent = '🔨 ' + BP[j.id].e + ' ' + N(Math.round(j.i / j.cells.length * 100)) + '%'; j.lbl.style.transform = `translate(${(tmpV.x + 1) / 2 * SW}px,${(1 - tmpV.y) / 2 * SHh}px) translate(-50%,-100%)`; } }
    mpFrame(dt);
  }
  updateCamera(dt);
  updateSky(dt);
  if(W){
    updateGlows(dt, nightK);
    updateGhost();
    const cx = camera.position.x, cz = camera.position.z, lim = (U.uFar.value + 24) ** 2;
    for(const c of chunks) if(c){ const v = (c.cx - cx) ** 2 + (c.cz - cz) ** 2 < lim; if(c.o) c.o.visible = v; if(c.w) c.w.visible = v; }
  }
  if(state === 'play') drawHud();
  if(state === 'map' && mapCv && (now | 0) % 4 === 0) drawMap();
  renderer.render(scene, camera);
}
function floorShadowY(){ const fl = floorUnder(P.x, P.y + .05, P.z); return (fl > -1e8 ? fl : W.surface(P.x, P.z) + 1) + .03; }

/* ======================================================================
   Test hook
   ====================================================================== */
window.__blocks = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; },
  get me(){ return { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), gr:P.gr, fly:P.fly, swim:P.swim, ride:P.ride, vy:r2(P.vy) }; },
  get pro(){ return JSON.parse(JSON.stringify(PRO)); }, get coins(){ return PRO.coins; }, get lvl(){ return PRO.lvl; },
  get world(){ return W ? { seed:W.seed, edits:W.edits.size, chunks:chunks.filter(Boolean).length, dirty:W.dirty.size, meshes:meshCount, slot:G.slot, name:worldInfo && villageName(worldInfo.a, worldInfo.n), plots:W.builtPlots.slice() } : null; },
  get(x, y, z){ return W.get(x, y, z); }, surface:(x, z) => W.surface(x, z),
  get ghost(){ return ghostInfo; }, get ghostVis(){ return [ghost.visible, ghostEdge.visible, ghost.position.toArray(), ghost.scale.toArray(), ghost.material.opacity]; }, get jobs(){ return jobs.map(j => ({ id:j.id, i:j.i, n:j.cells.length, x:j.x, y:j.y, z:j.z })); }, get grows(){ return grows.length; },
  get placing(){ return G.placing ? Object.assign({}, G.placing) : null; },
  get animals(){ return AN.map(a => ({ kind:a.kind, x:r2(a.x), y:r2(a.y), z:r2(a.z), happy:a.happy > 0 })); },
  get remotes(){ return [...RM.values()].map(r => ({ id:r.id, x:r2(r.x), y:r2(r.y), z:r2(r.z), seen:r.seen, name:r.lbl.hidden ? null : r.lbl.textContent, label:r.lbl.textContent, rd:r.rd })); },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, hostId:MP.hostId, screen:MP.screen, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero })) }; }, get mpErr(){ return MP.err || ''; },
  get fps(){ return fps; }, get calls(){ return renderer.info.render.calls; }, get tris(){ return renderer.info.render.triangles; }, get night(){ return nightK; }, get tm(){ return tm; },
  get hot(){ return PRO.hot.slice(); }, get sel(){ return PRO.sel; }, get mode(){ return G.mode; }, get cam(){ return cam.mode; },
  tp:(x, y, z, f) => { P.x = x; P.z = z; P.y = y == null ? W.surface(x, z) + 1.02 : y; P.vx = P.vy = P.vz = 0; if(f != null){ P.f = f; cam.yaw = f + Math.PI; } snapCam = true; },
  look:(yaw, pitch) => { if(yaw != null) cam.yaw = yaw; if(pitch != null) cam.pitch = pitch; cam.lookT = performance.now(); snapCam = true; },
  face:(x, z) => { P.f = Math.atan2(x - P.x, z - P.z); cam.yaw = P.f + Math.PI; snapCam = true; },
  input:(x, y) => { testInput = x == null ? null : { x, y }; }, go:(x, z, r) => { testGo = x == null ? null : { x, z, r }; }, get going(){ return !!testGo; },
  jump:() => jump(), fly:v => toggleFly(v), up:v => { inp.up = !!v; }, down:v => { inp.down = !!v; },
  tap:(x, y, f) => tapAt(x, y, f), screenOf:(x, y, z) => { tmpV.set(x, y, z).project(camera); return { x:(tmpV.x + 1) / 2 * SW, y:(1 - tmpV.y) / 2 * SHh, z:tmpV.z }; },
  placeOn:(x, y, z, nx, ny, nz, id) => placeBlock({ x, y, z, nx, ny, nz, id:W.get(x, y, z) }, id == null ? PRO.hot[PRO.sel] : id), breakAt:(x, y, z) => breakBlock(x, y, z),
  set:(x, y, z, id) => setBlock(x, y, z, id),
  select:i => selectSlot(i), setMode:m => setMode(m), palette:() => showPalette(), pick:id => pickBlockForSlot(id), village:() => showVillage(), map:() => showMap(), pause:() => showPause(), close:() => closePanel(),
  place:id => startPlace(id), aim:(x, z) => { if(G.placing){ G.placing.aim = { x, z }; updatePlace(); } }, rot:() => rotPlace(), build:() => confirmPlace(), cancel:() => cancelPlace(),
  giveCoins:n => addCoins(n, true), giveXp:n => addXp(n), setLvl:l => { PRO.lvl = l; persistPro(); hudKey = ''; },
  pet:i => petAnimal(i, true), ride:() => { const a = nearHorse(); if(a){ mount(a); return true; } return false; }, unride:() => dismount(), horse:() => { const h = AN.find(a => a.kind === 'horse'); return h ? { i:h.i, x:r2(h.x), y:r2(h.y), z:r2(h.z) } : null; },
  setTime:v => { tm = v; }, camMode:m => setCamMode(m), save:() => saveWorld(), get saved(){ return [0, 1, 2].map(i => { const s = readSlot(i); return s ? { seed:s.seed, a:s.a, n:s.n, e:(s.e || '').length } : null; }); },
  menu:() => showTitle(), worlds:w => showWorlds(w || 'play'), newWorld:(slot, a, n) => createWorld(slot, a, n), open:i => openSlot(i), back:() => { if(state === 'mp' || state === 'mpmenu') mpBack(); else if(state === 'select') showTitle(); else if(state === 'worlds') { if(G.worldsWhy === 'host') mpMenu(); else showTitle(); } else if(state === 'newworld') showWorlds(G.worldsWhy); else showTitle(); },
  select2:() => showSelect('menu'),
  mpMenu:() => mpMenu(), mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c), mpLeave:() => { coStop(); showTitle(); },
  get labels(){ return [...document.querySelectorAll('#labels .nm')].filter(e => !e.hidden).map(e => e.textContent); }
};

/* ---------- boot ---------- */
(async function boot(){
  resize();
  setHero(heroId); heroM.grp.visible = false;
  requestAnimationFrame(frame);
  await loadBackdrop();
  /* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) opens my last world and makes a room;
     ?join=<room> joins one (it keeps trying for 20 s while nobody is there yet) */
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(/^\d{4}$/.test(join || '') || host){
    const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
    try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  }
  if(/^\d{4}$/.test(join || '')){ state = 'mp'; retry = () => mpJoin(join); mpJoin(join, performance.now() + 20000); return; }
  if(host){
    MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; G.hostRoom = /^\d{4}$/.test(room || '') ? room : null;
    let slot = PRO.last >= 0 && readSlot(PRO.last) ? PRO.last : [0, 1, 2].find(i => readSlot(i));
    G.worldsWhy = 'host';
    if(slot == null){ slot = [0, 1, 2].find(i => !readSlot(i)); await createWorld(slot, Math.floor(Math.random() * ADJS.length), Math.floor(Math.random() * NOUNS.length)); }
    else await openSlot(slot);
    return;
  }
  showTitle();
})();
