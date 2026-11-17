/* «بيت الجدّة نونا» — Escape Grandma Nona's House.
   A gentle sneak-and-escape game: find the key (in the cookie jar), the pliers and the colour note,
   open the three locks on the front door, and don't wake the sleepy grandma. If she catches you: a soft
   pillow "boop", and you wake up in bed for the next day. 5 days to escape.
   Online co-op («👫 العب مع أصحابك», up to 4 kids in the same house): the room owner (host) runs Grandma, noise, items,
   locks and the shared day counter; the friends send what they do (move, noise, pick up, drop, open a lock…) and follow the
   host's state. See the «Online co-op» part at the end. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { buildHouse, LY, makeKeyMesh, roundBox } from './house.js';
import { makeNona, poseNona } from './nona.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
const L = window.L || ((a) => a);
const N = n => (window.I18N ? I18N.num(n) : String(n));
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RTL = (window.I18N ? I18N.dir : 'rtl') === 'rtl';
const K = makeKit(THREE, { rim:.38 });
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero, glowTex, canvasTex } = K;
const A = makeAudio(), SFX = A.SFX;
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
/* co-op run in progress (set by the online part below) */
const R = { co:false, n:0 };
const CO = () => R.co;
let isHostCo = () => false;            // replaced by the online part
const aiHere = () => !R.co || isHostCo();
const R_co = () => R.co;          // (inside makeNoise the name R is the noise radius)

/* ---------- difficulty ---------- */
const DIFF = {
  easy:  { chase:2.45, curious:1.5, wander:1.35, tired:1.1, sight:6,   spot:1.0,  lose:2.2, wake:.5,  selfWake:[100, 140], firstWake:70, wanderT:14, chaseMax:11, catchR:.85, tiredSee:0 },
  normal:{ chase:3.0,  curious:1.9, wander:1.6,  tired:1.3, sight:8.5, spot:.55,  lose:3.5, wake:.78, selfWake:[55, 85],   firstWake:40, wanderT:24, chaseMax:17, catchR:1.0, tiredSee:3.2 }
};
const SPD = { sneak:1.7, walk:3.4, run:4.7 };
const DAYS = 5, HINT_AFTER = 60;
let diffId = rawGet('granny_diff') === 'normal' ? 'normal' : 'easy';
let heroId = HEROES[rawGet('granny_hero')] ? rawGet('granny_hero') : 'sara';
const D = () => DIFF[diffId];

/* ---------- always-landscape stage (rotated layer, never screen.orientation.lock) ---------- */
const stage = $('#stage'), saProbe = $('#saProbe');
let ROT = false, VW = innerWidth, SW = innerWidth, SH = innerHeight, SAL = 0, SAB = 0;
function layout(){
  VW = innerWidth; const vh = innerHeight; ROT = vh > VW;
  SW = ROT ? vh : VW; SH = ROT ? VW : vh;
  const st = stage.style; st.width = SW + 'px'; st.height = SH + 'px';
  st.transform = ROT ? `translateX(${VW}px) rotate(90deg)` : 'none';
  st.setProperty('--sw', SW + 'px'); st.setProperty('--sh', SH + 'px');
  stage.classList.toggle('rot', ROT); stage.classList.toggle('short', SH <= 520);
  SAL = saProbe.offsetWidth; SAB = saProbe.offsetHeight;
}
const toLayer = (cx, cy) => ROT ? { x:cy, y:VW - cx } : { x:cx, y:cy };
layout();

/* ---------- renderer, lights ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5), quality = 2;
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x4a3f7a, 45, 160);
const camera = new THREE.PerspectiveCamera(62, 1, .05, 700);
const hemi = new THREE.HemisphereLight(0xfff0dc, 0x9a7f86, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe2b8, 1.25);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left:-7.5, right:7.5, top:7.5, bottom:-7.5, near:.45, far:5.5 }); sun.shadow.camera.updateProjectionMatrix();
sun.shadow.bias = -.0008; sun.shadow.normalBias = .03; sun.shadow.radius = 2;
scene.add(sun, sun.target);
function resize(){ layout(); renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.updateProjectionMatrix(); placeJoyHome(); if(state === 'title' || state === 'select') setTitleView(true); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ---------- the house ---------- */
const H = buildHouse(THREE, K, scene, renderer);
const { HIDES, SPOTS, VASES, LOCK } = H;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();
const RB = roundBox(THREE, 4, .25);

/* ---------- characters ---------- */
let hero = null;
function setHero(id){ if(hero) scene.remove(hero.grp); hero = K.shadowHero(HEROES[id]()); scene.add(hero.grp); hero.grp.add(holder); }
const holder = new THREE.Group(); holder.position.set(0, .62, .34);
const nona = makeNona(THREE, K); scene.add(nona.grp);
const blanket = new THREE.Mesh(RB, new THREE.MeshLambertMaterial({ color:0xff9ec4 })); blanket.scale.set(1.35, .72, 1.5); blanket.castShadow = true; scene.add(blanket);
const blanketFold = new THREE.Mesh(RB, new THREE.MeshLambertMaterial({ color:0xffffff })); blanketFold.scale.set(.3, .76, 1.53); scene.add(blanketFold);

/* ---------- sprites: Zzz, !, ? ---------- */
function textSprite(txt, col, size = 1){
  const t = canvasTex(128, 128, (x) => { x.font = '900 92px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 14; x.strokeStyle = '#2a1f4a'; x.strokeText(txt, 64, 70); x.fillStyle = col; x.fillText(txt, 64, 70); });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, transparent:true, depthWrite:false, depthTest:false })); s.scale.set(size, size, 1); s.renderOrder = 10; s.visible = false; scene.add(s); return s;
}
const zzz = [0, 1, 2].map(i => textSprite('z', '#bfe1ff', .45 + i * .12));
const excl = textSprite('!', '#ff5d73', .9), ques = textSprite('?', '#ffcd4d', .85);

/* ---------- particles: feathers, confetti, sparkles ---------- */
const PMAX = 260, parts = [];
const pMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(.12, .06), new THREE.MeshBasicMaterial({ side:THREE.DoubleSide }), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
function burst(x, y, z, n, colors, o = {}){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.283, sp = (o.speed || 2) * (.4 + Math.random());
    Object.assign(p, { life:(o.life || 1.6) * (.6 + Math.random() * .6), x, y, z, vx:Math.cos(a) * sp, vz:Math.sin(a) * sp, vy:(o.up || 2) * (.5 + Math.random()), g:o.g != null ? o.g : 3, drag:o.drag || 1.5, rx:Math.random() * 6, ry:Math.random() * 6, spin:(Math.random() - .5) * 10, s:(o.size || 1) * (.7 + Math.random() * .6), sway:o.sway || 0, ph:Math.random() * 6 });
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0) continue;
    p.life -= dt; p.vy -= p.g * dt; const dk = Math.exp(-p.drag * dt); p.vx *= dk; p.vz *= dk; if(p.g < 4) p.vy = Math.max(p.vy, -1.1);
    p.x += (p.vx + Math.sin(T * 3 + p.ph) * p.sway) * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rx += p.spin * dt; p.ry += p.spin * .7 * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 2) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.setFromEuler(new THREE.Euler(p.rx, p.ry, 0)), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- noise rings ---------- */
const rings = [];
for(let i = 0; i < 6; i++){ const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0, depthWrite:false })); m.visible = false; m.renderOrder = 3; scene.add(m); rings.push({ m, t:9, R:1 }); }
let ringNext = 0;
function ring(x, y, z, R, col){ const r = rings[ringNext]; ringNext = (ringNext + 1) % rings.length; r.t = 0; r.R = R; r.m.position.set(x, y + .06, z); r.m.material.color.set(col || 0xfff3a0); r.m.visible = true; }
function updateRings(dt){ for(const r of rings){ if(!r.m.visible) continue; r.t += dt; const k = r.t / .9; if(k >= 1){ r.m.visible = false; continue; } const s = .3 + k * Math.min(r.R, 9) * .55; r.m.scale.set(s, 1, s); r.m.material.opacity = (1 - k) * .85; } }

/* ---------- items ---------- */
const SYM = [
  { c:'#ff5d73', n:L('قلب أحمر', 'red heart', 'kırmızı kalp'), d:'M20 34 C6 24 4 14 10 9 C15 5 19 8 20 12 C21 8 25 5 30 9 C36 14 34 24 20 34Z' },
  { c:'#3f8cff', n:L('نجمة زرقا', 'blue star', 'mavi yıldız'), d:'M20 4 L24.7 15 L36 15.6 L27 23 L30 34.5 L20 28 L10 34.5 L13 23 L4 15.6 L15.3 15Z' },
  { c:'#3fbf5a', n:L('دائرة خضرا', 'green circle', 'yeşil daire'), d:'M20 5 A15 15 0 1 1 19.9 5Z' },
  { c:'#ffbf1f', n:L('مثلث أصفر', 'yellow triangle', 'sarı üçgen'), d:'M20 5 L36 33 L4 33Z' },
  { c:'#9b6bff', n:L('مربع بنفسجي', 'purple square', 'mor kare'), d:'M7 7 H33 V33 H7Z' },
  { c:'#ff8a2a', n:L('هلال برتقالي', 'orange moon', 'turuncu hilal'), d:'M26 5 A15 15 0 1 0 34 29 A12 12 0 1 1 26 5Z' }
];
const symSVG = (i, s = 40) => `<svg viewBox="0 0 40 40" width="${s}" height="${s}" aria-hidden="true"><path d="${SYM[i].d}" fill="${SYM[i].c}" stroke="#2a1f4a" stroke-width="2.4" stroke-linejoin="round"/></svg>`;
const INFO = {
  key:{ e:'🔑', n:L('المفتاح', 'Key', 'Anahtar') }, pliers:{ e:'🔧', n:L('الكمّاشة', 'Pliers', 'Pense') }, note:{ e:'📜', n:L('ورقة الألوان', 'Colour note', 'Renk notu') }, jar:{ e:'🍪', n:L('علبة البسكوت', 'Cookie jar', 'Kurabiye kavanozu') }
};
function sparkle(){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:glowTex, color:0xfff1a0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); s.scale.set(.7, .7, 1); scene.add(s); return s; }
function makeJar(){
  const g = new THREE.Group();
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(.15, .14, .28, 24), new THREE.MeshLambertMaterial({ color:0xe8f6ff, transparent:true, opacity:.55, depthWrite:false })); glass.position.y = .14; g.add(glass);
  const M = new K.Merge(); for(let i = 0; i < 4; i++) M.add(K.CG.cyl, Math.sin(i * 2.1) * .05, .05 + i * .055, Math.cos(i * 2.1) * .05, .07, .02, .07, .4 * i, 0, .3, i % 2 ? 0xc98a4a : 0xb57436);
  g.add(new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })));
  const lidM = new K.Merge(); lidM.add(K.CG.cyl, 0, 0, 0, .165, .05, .165, 0, 0, 0, 0xff6f61).add(K.CG.sph, 0, .05, 0, .05, .04, .05, 0, 0, 0, 0xffcd4d);
  const lid = new THREE.Mesh(lidM.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); lid.position.y = .3; g.add(lid);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(.152, .142, .09, 24, 1, true, -.7, 1.4), new THREE.MeshLambertMaterial({ color:0xffd36a, side:THREE.DoubleSide })); lab.position.y = .15; g.add(lab);
  g.traverse(o => { if(o.isMesh) o.castShadow = true; }); g.userData.lid = lid; return g;
}
function makePliers(){
  const M = new K.Merge();
  for(const s of [-1, 1]){ M.add(K.capsule(.025, .2), s * .04, -.15, 0, 1, 1, 1, 0, 0, s * .12, 0xff5d73); M.add(new THREE.BoxGeometry(1, 1, 1), s * .015, .05, 0, .03, .14, .025, 0, 0, -s * .1, 0xb9c0c8); }
  M.add(K.CG.cyl, 0, -.01, 0, .035, .04, .035, Math.PI / 2, 0, 0, 0x8a959e);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = true;
  const g = new THREE.Group(); m.rotation.set(Math.PI / 2, 0, .6); m.position.y = .03; g.add(m); g.scale.setScalar(1.4); return g;
}
let codeTex = null;
function makeNote(code){
  if(codeTex) codeTex.dispose();
  codeTex = canvasTex(256, 176, (x, w, h) => {
    x.fillStyle = '#fffaf0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#e8d9b8'; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    code.forEach((ci, i) => { x.save(); x.translate(18 + i * 76, 48); x.scale(1.8, 1.8); x.fillStyle = SYM[ci].c; x.strokeStyle = '#2a1f4a'; x.lineWidth = 2.4; const p = new Path2D(SYM[ci].d); x.fill(p); x.stroke(p); x.restore(); });
    x.fillStyle = '#d9c8a0'; x.fillRect(30, 150, 196, 6);
  });
  const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(.32, .008, .22), [0, 0, 1, 0, 0, 0].map(k => k ? new THREE.MeshLambertMaterial({ map:codeTex }) : new THREE.MeshLambertMaterial({ color:0xfffaf0 })));
  m.position.y = .006; m.rotation.y = .3; m.castShadow = true; g.add(m); return g;
}
function makeToy(kind){
  const M = new K.Merge();
  if(kind === 'duck'){ M.add(K.CG.sph, 0, .09, 0, .12, .09, .14, 0, 0, 0, 0xffd23f).add(K.CG.sph, 0, .2, .07, .07, .07, .07, 0, 0, 0, 0xffd23f).add(K.CG.sm, 0, .19, .14, .035, .02, .04, 0, 0, 0, 0xff8a2a).add(K.CG.sm, .03, .22, .12, .012, .012, .012, 0, 0, 0, 0x222222).add(K.CG.sm, -.03, .22, .12, .012, .012, .012, 0, 0, 0, 0x222222); }
  else if(kind === 'ball'){ M.add(K.CG.sph, 0, .11, 0, .11, .11, .11, 0, 0, 0, 0xff5d73).add(new THREE.TorusGeometry(.11, .015, 6, 24), 0, .11, 0, 1, 1, 1, Math.PI / 2, 0, 0, 0xffffff); }
  else { M.add(K.CG.sph, 0, .1, 0, .1, .1, .09, 0, 0, 0, 0xb5794a).add(K.CG.sph, 0, .23, 0, .08, .075, .075, 0, 0, 0, 0xb5794a).add(K.CG.sm, -.06, .3, 0, .03, .03, .02, 0, 0, 0, 0xb5794a).add(K.CG.sm, .06, .3, 0, .03, .03, .02, 0, 0, 0, 0xb5794a).add(K.CG.sm, 0, .21, .07, .03, .025, .02, 0, 0, 0, 0xf2d0b0); }
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true })); m.castShadow = true; return m;
}
function makeVase(col){
  const pts = [[0, 0], [.09, 0], [.13, .08], [.14, .18], [.09, .3], [.06, .36], [.08, .42]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.Group(); const v = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), new THREE.MeshLambertMaterial({ color:col, side:THREE.DoubleSide })); v.castShadow = true; g.add(v);
  const F = new K.Merge(); F.add(K.CG.cyl, 0, .55, 0, .008, .3, .008, 0, 0, .1, 0x3f9a45).add(K.CG.sm, .02, .7, 0, .06, .06, .06, 0, 0, 0, 0xffffff).add(K.CG.sm, -.04, .64, .03, .05, .05, .05, 0, 0, 0, 0xff8fb8).add(K.CG.sm, .05, .6, -.03, .05, .05, .05, 0, 0, 0, 0xffcd4d);
  g.add(new THREE.Mesh(F.geometry(), new THREE.MeshLambertMaterial({ vertexColors:true }))); return g;
}
const creakTex = canvasTex(128, 48, (x, w, h) => { x.fillStyle = '#e8c48e'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(120,70,30,.5)'; x.lineWidth = 2; for(let i = 0; i < 3; i++){ x.beginPath(); x.moveTo(0, 12 + i * 12); x.bezierCurveTo(40, 8 + i * 12, 80, 18 + i * 12, w, 12 + i * 12); x.stroke(); } x.fillStyle = '#5a3a20'; for(const [a, b] of [[8, 8], [8, 40], [120, 8], [120, 40]]){ x.beginPath(); x.arc(a, b, 3, 0, 6.3); x.fill(); } x.strokeStyle = 'rgba(80,45,20,.7)'; x.lineWidth = 3; x.strokeRect(1, 1, w - 2, h - 2); });
const creakMat = new THREE.MeshLambertMaterial({ map:creakTex, polygonOffset:true, polygonOffsetFactor:-2 });
const creakGeo = new THREE.PlaneGeometry(.9, .32).rotateX(-Math.PI / 2);

// meshes that live for the whole session
const IT = {
  jar:{ id:'jar', mesh:makeJar(), spr:sparkle() },
  key:{ id:'key', mesh:(() => { const g = new THREE.Group(); const k = makeKeyMesh(THREE, K); k.rotation.x = -Math.PI / 2; k.position.y = .03; g.add(k); g.scale.setScalar(1.3); return g; })(), spr:sparkle() },
  pliers:{ id:'pliers', mesh:makePliers(), spr:sparkle() },
  note:{ id:'note', mesh:new THREE.Group(), spr:sparkle() }
};
Object.values(IT).forEach(it => scene.add(it.mesh));
const vaseMeshes = VASES.map(v => { const m = makeVase(v.col); scene.add(m); return m; });
const toyPool = ['duck', 'ball', 'bear', 'duck', 'ball', 'bear'].map(k => { const m = makeToy(k); m.visible = false; scene.add(m); return { m, kind:k }; });
const creakPool = []; for(let i = 0; i < 7; i++){ const m = new THREE.Mesh(creakGeo, creakMat); m.receiveShadow = true; m.visible = false; scene.add(m); creakPool.push(m); }
// hint arrow
const arrow = new THREE.Group();
{ const mat = new THREE.MeshLambertMaterial({ color:0xffcd4d, emissive:0x8a5a00 }); const head = new THREE.Mesh(new THREE.ConeGeometry(.2, .36, 16), mat); head.rotation.x = Math.PI / 2; head.position.z = .3; const tail = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .4, 12), mat); tail.rotation.x = Math.PI / 2; arrow.add(head, tail); arrow.visible = false; scene.add(arrow); }

/* ---------- game state ---------- */
let state = 'boot', T = 0, menuT = 0;
const P = { x:0, y:0, z:0, vx:0, vz:0, face:0, move:0, mode:'walk', hidden:null, stepT:0, noiseT:0, bump:0 };
const G = { x:0, y:0, z:0, face:0, mode:'sleep', t:0, path:[], tgt:null, lastSeen:null, lostT:0, spotT:0, chaseT:0, sleepT:0, wakeAt:40, speed:0, stuck:0, wanderLeft:0, act:'walk', actK:0, lastPathT:0, snoreT:0, sayT:0 };
let GS = null;   // run state
let held = null, runOn = false, fp = false;

/* a run's random layout as plain indices (the host sends it to the friends so every phone builds the same house) */
function makePlan(){
  const used = [];
  const far = (s) => used.every(u => Math.hypot(u.x - s.x, u.z - s.z) > 1 || u.lv !== s.lv);
  const choose = (list) => { const l = shuffle(list.slice()); const s = l.find(s => far(s) && !used.some(u => u.room === s.room)) || l.find(far) || l[0]; used.push(s); return list.indexOf(s); };
  const jar = choose(SPOTS.jar), pliers = choose(SPOTS.pliers), note = choose(SPOTS.note);
  const code = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
  // squeaky toys (away from items, hide spots and doors)
  const bad = (s) => used.some(u => u.lv === s.lv && Math.hypot(u.x - s.x, u.z - s.z) < 1.4) || HIDES.some(h => h.lv === s.lv && Math.hypot(h.out.x - s.x, h.out.z - s.z) < 1.1);
  const toys = shuffle(SPOTS.toy.filter(s => !bad(s))).slice(0, 5).map(s => SPOTS.toy.indexOf(s));
  const woody = SPOTS.creak.filter(s => { const r = H.roomAt(s.lv, s.x, s.z); return r && (r.floor === 'wood' || r.floor === 'attic'); });
  const creaks = shuffle(woody).slice(0, 6).map(s => SPOTS.creak.indexOf(s));
  return { jar, pliers, note, code, toys, creaks };
}
/* a plan from the network: indices must point at real spots */
function okPlan(p){
  try{
    const ix = (v, list) => Number.isInteger(v) && v >= 0 && v < list.length;
    if(!p || !ix(p.jar, SPOTS.jar) || !ix(p.pliers, SPOTS.pliers) || !ix(p.note, SPOTS.note)) return null;
    if(!Array.isArray(p.code) || p.code.length !== 3 || !p.code.every(c => Number.isInteger(c) && c >= 0 && c < 6)) return null;
    const toys = (Array.isArray(p.toys) ? p.toys : []).filter(v => ix(v, SPOTS.toy)).slice(0, 6);
    const creaks = (Array.isArray(p.creaks) ? p.creaks : []).filter(v => ix(v, SPOTS.creak)).slice(0, 7);
    return { jar:p.jar, pliers:p.pliers, note:p.note, code:p.code.slice(), toys, creaks };
  }catch(e){ return null; }
}
function newRun(plan){
  plan = plan || makePlan();
  const jarS = SPOTS.jar[plan.jar], plS = SPOTS.pliers[plan.pliers], noS = SPOTS.note[plan.note];
  const code = plan.code.slice();
  IT.note.mesh.clear(); IT.note.mesh.add(makeNote(code));
  GS = { day:1, t:0, code, plan, jarOpen:false, locks:{ key:false, chain:false, pad:false }, progressT:0, hint:false, over:false, stats:{ noise:0 },
    toys:[], creaks:[], items:{
      jar:{ x:jarS.x, y:jarS.y, z:jarS.z, lv:jarS.lv, state:'world', home:jarS, by:'' },
      key:{ x:jarS.x, y:jarS.y, z:jarS.z, lv:jarS.lv, state:'injar', home:null, by:'' },
      pliers:{ x:plS.x, y:plS.y, z:plS.z, lv:plS.lv, state:'world', home:plS, by:'' },
      note:{ x:noS.x, y:noS.y, z:noS.z, lv:noS.lv, state:'world', home:noS, by:'' }
    } };
  IT.jar.mesh.userData.lid.position.set(0, .3, 0); IT.jar.mesh.userData.lid.rotation.set(0, 0, 0);
  toyPool.forEach((t, i) => { const s = SPOTS.toy[plan.toys[i]]; t.m.visible = !!s; if(s){ t.m.position.set(s.x, s.y, s.z); t.m.rotation.y = Math.random() * 6; GS.toys.push({ x:s.x, y:s.y, z:s.z, lv:s.lv, m:t.m, cd:0 }); } });
  plan.creaks.forEach((ci, i) => { const s = SPOTS.creak[ci], m = creakPool[i]; if(!m) return; m.visible = true; m.position.set(s.x, s.y + .013, s.z); m.rotation.y = (i % 2) * Math.PI / 2; GS.creaks.push({ x:s.x, y:s.y, z:s.z, lv:s.lv, cd:0 }); });
  creakPool.forEach((m, i) => { if(i >= GS.creaks.length) m.visible = false; });
  VASES.forEach((v, i) => { v.down = false; v.cb.off = false; const m = vaseMeshes[i]; m.position.set(v.x, v.y, v.z); m.rotation.set(0, 0, 0); });
  // door and locks
  LOCK.key.done = LOCK.chain.done = LOCK.pad.done = false;
  LOCK.key.key.visible = false; LOCK.key.key.rotation.set(0, Math.PI / 2, 0); LOCK.key.anim = null; LOCK.chain.anim = null; LOCK.pad.anim = null;
  LOCK.chain.obj.visible = true; LOCK.chain.obj.position.set(0, 0, -6.86); LOCK.chain.obj.rotation.set(0, 0, 0);
  LOCK.pad.obj.visible = true; LOCK.pad.obj.position.set(.5, .62, -6.82); LOCK.pad.obj.rotation.set(0, 0, 0); LOCK.pad.dots.forEach(d => d.material.color.set(0xffffff));
  H.leaves.forEach(l => l.rotation.y = 0); H.doorCol.off = false;
  H.setSunny(false); scene.fog.color.set(0x4a3f7a); hemi.color.set(0xfff0dc); hemi.groundColor.set(0x9a7f86); hemi.intensity = 1.6;
  held = null; Object.values(IT).forEach(it => { if(it.mesh.parent !== scene) scene.add(it.mesh); });
  newDay(true);
}
function wakeInBed(){
  // you wake up in your bed (in co-op each kid gets a spot of their own next to it)
  const o = bedOff(); P.x = -7.25 + o[0]; P.z = -4.55 + o[1]; P.y = LY[2]; P.vx = P.vz = 0; P.face = Math.PI / 2; P.hidden = null; P.move = 0;
  if(hero) hero.grp.visible = true;
  cam.yaw = P.face + Math.PI; cam.pitch = .38; snapCam = true; peek(null);
}
let bedOff = () => [0, 0];             // replaced by the online part
function newDay(first){
  wakeInBed();
  G.mode = 'sleep'; G.t = 0; G.sleepT = 0; G.wakeAt = first ? D().firstWake : lerp(D().selfWake[0], D().selfWake[1], Math.random()); G.path = []; G.tgt = null; G.spotT = 0; G.chaseT = 0; G.speed = 0;
  placeNonaInBed();
  if(GS){ GS.progressT = GS.t; GS.hint = false; }
  A.setMode('calm');
}
function placeNonaInBed(){
  const b = H.nonaBed; G.x = b.out.x; G.z = b.out.z; G.y = LY[2]; G.face = Math.PI;
}

/* ---------- input ---------- */
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, t:0 };
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), runBtn = $('#btnRun');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(86, SAL + 80), SH - Math.max(96, SH * .2) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
const touch = $('#touch'), keys = {};
touch.addEventListener('pointerdown', e => {
  if(state !== 'play') return;
  e.preventDefault(); A.ac();
  const p = toLayer(e.clientX, e.clientY);
  if(p.x < SW * .45 && joy.id == null && !P.hidden){ joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(72, SAL + 66), SW * .45); joy.oy = clamp(p.y, 130, SH - 72); setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y); }
  else if(look.id == null){ look.id = e.pointerId; look.x = p.x; look.y = p.y; }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){ let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 54; if(d > m){ dx *= m / d; dy *= m / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m; }
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id){ const dx = p.x - look.x, dy = p.y - look.y; look.x = p.x; look.y = p.y; look.t = T;
    if(P.hidden){ cam.peekY = clamp(cam.peekY - dx * .006, -.8, .8); cam.peekP = clamp(cam.peekP + dy * .004, -.35, .35); }
    else { cam.yaw -= dx * .0075; if(fp) cam.fpPitch = clamp(cam.fpPitch - dy * .004, -.7, .6); else cam.pitch = clamp(cam.pitch + dy * .004, .05, .95); } }
});
function endPtr(e){ if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); } if(e.pointerId === look.id) look.id = null; }
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function btn(el, fn){ el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); A.ac(); el.classList.add('on'); fn(); }); ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => el.addEventListener(t, () => el.classList.remove('on'))); }
btn(actBtn, () => doAction());
btn(runBtn, () => { runOn = !runOn; runBtn.classList.toggle('lit', runOn); SFX.tap(); });
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
$('#btnEye').onclick = () => { fp = !fp; SFX.tap(); $('#btnEye').classList.toggle('lit', fp); snapCam = true; };
$('#btnSnd').onclick = () => { A.setMuted(!A.muted); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊'; if(!A.muted) SFX.tap(); };
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr', ShiftLeft:'run', ShiftRight:'run', ControlLeft:'sn', AltLeft:'sn' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if((e.code === 'Space' || e.code === 'Enter') && state === 'play' && !e.repeat){ doAction(); e.preventDefault(); }
  if(e.code === 'KeyV' && state === 'play') $('#btnEye').click();
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
document.addEventListener('visibilitychange', () => { if(document.hidden && state === 'play') showPause(); if(document.hidden) A.music(false); });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }

/* ---------- camera ---------- */
const cam = { yaw:0, pitch:.38, dist:3.1, fpPitch:-.05, peekY:0, peekP:0 };
let snapCam = true, camOverride = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(P.hidden){
    const h = P.hidden; const base = Math.atan2(h.look.x - h.cam.x, h.look.z - h.cam.z) + cam.peekY;
    camera.position.set(h.cam.x, h.cam.y, h.cam.z);
    camera.lookAt(h.cam.x + Math.sin(base) * 3, h.cam.y + (h.look.y - h.cam.y) + cam.peekP * 3, h.cam.z + Math.cos(base) * 3);
    return;
  }
  if(fp){
    const ey = P.y + (hero && hero.type === 'qamar' ? .85 : .98);
    camera.position.set(P.x - Math.sin(cam.yaw) * .1, ey, P.z - Math.cos(cam.yaw) * .1);
    camera.lookAt(P.x - Math.sin(cam.yaw) * 3 * Math.cos(cam.fpPitch), ey + Math.sin(cam.fpPitch) * 3, P.z - Math.cos(cam.yaw) * 3 * Math.cos(cam.fpPitch));
    return;
  }
  const px = P.x, py = P.y + 1.15, pz = P.z;
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  // collide with walls and tall furniture: march from the head out
  let d = cam.dist; const n = 14;
  for(let i = 1; i <= n; i++){ const t = cam.dist * i / n; if(H.blocked(px + dx * t, py + dy * t, pz + dz * t, .16)){ d = Math.max(.35, cam.dist * (i - 1) / n - .05); break; } }
  const lv = H.lvOf(P.y), st = H.stairAt(P.x, P.z, P.y), ceil = (st ? LY[st.hi] : LY[lv]) + 2.82;
  const tx = px + dx * d, ty = Math.min(ceil, py + dy * d), tz = pz + dz * d;
  if(snapCam){ camPos.set(tx, ty, tz); camLook.set(px, py + .12, pz); snapCam = false; }
  else { const k = 1 - Math.exp(-12 * dt); camPos.lerp(_v.set(tx, ty, tz), k); camLook.lerp(_v2.set(px, py + .12, pz), 1 - Math.exp(-16 * dt)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
function setTitleView(on){
  if(on){ const off = (RTL ? -1 : 1) * SW * .23; camera.setViewOffset(SW, SH, off, 0, SW, SH); }
  else camera.clearViewOffset();
}

/* ---------- player ---------- */
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .1){ ix = iy = 0; m = 0; }
  if(keys.sn && m > 0) m = Math.min(m, .5);
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  return { x:rx * ix - fx * iy, z:rz * ix - fz * iy, m, ix, iy };
}
function stepPlayer(dt){
  if(P.hidden){ P.move = 0; return; }
  const inp = readInput(dt);
  const run = (runOn || keys.run) && inp.m > .3;
  P.mode = inp.m === 0 ? 'still' : inp.m < .6 ? 'sneak' : run ? 'run' : 'walk';
  const sp = P.mode === 'sneak' ? SPD.sneak * Math.max(.45, inp.m / .6) : P.mode === 'run' ? SPD.run : SPD.walk * inp.m;
  const k = Math.min(1, 14 * dt), dirl = Math.hypot(inp.x, inp.z) || 1;
  P.vx += (inp.x / dirl * sp * (inp.m ? 1 : 0) - P.vx) * k; P.vz += (inp.z / dirl * sp * (inp.m ? 1 : 0) - P.vz) * k;
  P.x += P.vx * dt; P.z += P.vz * dt;
  const o = { x:P.x, z:P.z };
  H.collide(o, .3, P.y, c => { if(c.vase != null && P.mode !== 'sneak' && P.mode !== 'still') knockVase(c.vase); });
  P.x = o.x; P.z = o.z;
  const gy = H.groundY(P.x, P.z, P.y); P.y = gy > P.y ? Math.min(gy, P.y + 8 * dt + .02) : gy;
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPD.walk);
  // camera follows behind when walking forward
  if(!fp && inp.m > .2 && Math.abs(inp.ix) < .45 && T - look.t > .8){ cam.yaw += angDiff(P.face + Math.PI, cam.yaw) * Math.min(1, 1.6 * dt * inp.m); }
  // footsteps and noise
  const r = H.roomAt(H.lvOf(P.y), P.x, P.z), wood = !r || r.floor === 'wood' || r.floor === 'attic';
  P.stepT -= dt * P.move * (P.mode === 'run' ? 1.6 : 1);
  if(P.stepT <= 0 && P.move > .15){ P.stepT = .36; if(P.mode === 'run'){ SFX.step(false); } else if(P.mode === 'walk') SFX.step(true); }
  P.noiseT -= dt;
  if(P.noiseT <= 0 && P.mode === 'run'){ P.noiseT = .55; makeNoise(P.x, P.y, P.z, wood ? 7.5 : 5, 'run'); }
  else if(P.noiseT <= 0 && P.mode === 'walk' && P.move > .5){ P.noiseT = .8; makeNoise(P.x, P.y, P.z, 2.6, 'walk', true); }
  // squeaky toys and creaky boards
  for(const t of GS.toys){ t.cd -= dt; if(t.cd <= 0 && Math.abs(t.y - P.y) < .8 && Math.hypot(t.x - P.x, t.z - P.z) < .45){ t.cd = 2.5; SFX.squeak(); t.squash = .4; makeNoise(t.x, t.y, t.z, 10, 'squeak'); bubbleTop(L('إييك! لعبة بتزمّر 🦆', 'Squeak! A squeaky toy 🦆', 'Vık! Ötücü oyuncak 🦆'), 1.6); } if(t.squash > 0){ t.squash -= dt; const s = 1 - Math.sin(t.squash / .4 * Math.PI) * .35; t.m.scale.set(1 + (1 - s) * .6, s, 1 + (1 - s) * .6); } }
  for(const c of GS.creaks){ c.cd -= dt; if(c.cd <= 0 && P.mode !== 'sneak' && P.mode !== 'still' && Math.abs(c.y - P.y) < .5 && Math.hypot(c.x - P.x, c.z - P.z) < .5){ c.cd = 2.2; SFX.creak(); makeNoise(c.x, c.y, c.z, 6.5, 'creak'); bubbleTop(L('إيييي… الأرض بتطقطق! امشِ بشويش 🤫', 'Creeeak… a squeaky board! Tiptoe 🤫', 'Gıcırrr… gıcırdayan tahta! Parmak ucunda yürü 🤫'), 1.8); } }
}
function knockVase(i, fx, fz){
  const v = VASES[i]; if(!v || v.down) return;
  if(fx == null){ fx = P.x; fz = P.z; }
  vaseFx(i, Math.atan2(v.x - fx, v.z - fz));
  if(aiHere()){ makeNoise(v.x, v.y, v.z, 11, 'vase'); coShare('vase', { i, f:v.fdir }); }
  else { ring(v.x, v.y, v.z, 11); coReq({ k:'vase', i, f:Math.round(v.fdir * 100) / 100 }); }
}
function vaseFx(i, fdir){
  const v = VASES[i]; if(!v || v.down) return;
  v.down = true; v.cb.off = true; v.fall = 0; v.fdir = +fdir || 0;
  SFX.vase();
  bubbleTop(L('أوبس! وقعت المزهرية 🌷 (ما انكسرت!)', "Oops! The vase fell 🌷 (it didn't break!)", 'Hoppala! Vazo düştü 🌷 (kırılmadı!)'), 2.2);
}
function updateVases(dt){
  VASES.forEach((v, i) => { if(!v.down || v.fall >= 1) return; v.fall = Math.min(1, v.fall + dt * 2.2); const m = vaseMeshes[i], k = v.fall;
    const dx = Math.sin(v.fdir), dz = Math.cos(v.fdir); m.position.set(v.x + dx * .55 * k, lerp(v.y, LY[H.lvOf(v.y)] + .12, k * k) + Math.sin(k * Math.PI) * .25, v.z + dz * .55 * k);
    m.rotation.set(Math.cos(v.fdir) * k * 1.5, 0, -Math.sin(v.fdir) * k * 1.5); if(v.fall >= 1) burst(m.position.x, m.position.y, m.position.z, 8, ['#ff8fb8', '#ffcd4d', '#ffffff'], { speed:1.2, up:1.5, g:5, life:.8 }); });
}

/* ---------- noise and the grandma's ears ---------- */
function makeNoise(x, y, z, R, kind, quiet){
  if(!quiet) ring(x, y, z, R, kind === 'run' ? 0xffd36a : 0xffffff);
  GS.stats.noise++;
  if(!aiHere()){ coNoise(x, y, z, R, kind); return; }      // a friend's phone: the host's grandma listens
  hearNoise(x, y, z, R);
}
function hearNoise(x, y, z, R){
  if((R_co() ? GS.over : state !== 'play') || G.mode === 'chase' || G.mode === 'boop' || G.mode === 'wave') return;
  const d = Math.hypot(G.x - x, G.z - z) + Math.abs(G.y - y) * 1.3;
  const eff = R * (G.mode === 'sleep' ? D().wake : 1);
  if(d > eff) return;
  if(G.mode === 'sleep'){ wakeNona({ x, y, z }, 'noise'); return; }
  // co-op: several kids can make noise at once; she goes for the nearest one
  if(R_co() && G.mode === 'curious' && G.tgt && Math.hypot(G.x - G.tgt.x, G.z - G.tgt.z) + Math.abs(G.y - G.tgt.y) * 1.3 < d) return;
  G.tgt = { x, y, z }; G.mode = 'curious'; G.path = H.path(G, G.tgt); G.t = 0; showMark(ques, 1.4);
  if(Math.random() < .6) say('hear');
}
function wakeNona(tgt, why){
  G.mode = 'wake'; G.t = 0; G.tgt = tgt; G.spotT = 0; G.chaseT = 0;
  placeNonaInBed(); G.face = Math.PI * .8;
  SFX.wake(); netFx({ k:'sfx', n:'wake' }); showMark(why === 'noise' ? excl : ques, 1.4);
  say(why === 'noise' ? 'wake' : 'self');
}

/* ---------- the grandma's brain: sleep → curious → (chase) → tired → sleep ---------- */
const LINES = {
  wake:[L('مين هون؟ 😤', 'Who\'s there? 😤', 'Kim var orada? 😤'), L('مين عم يعمل هالصوت؟! 😤', 'Who\'s making that noise?! 😤', 'Bu sesi kim yapıyor?! 😤')],
  self:[L('بدي كاسة مي… 🥛', 'I need a glass of water… 🥛', 'Bir bardak su lazım… 🥛'), L('بطني بدّو بسكوتة… 🍪', 'My tummy wants a cookie… 🍪', 'Karnım kurabiye istiyor… 🍪')],
  hear:[L('شو هالصوت؟ 🤔', 'What was that? 🤔', 'Bu ne sesiydi? 🤔'), L('همممم… 🤔', 'Hmmmm… 🤔', 'Hımmm… 🤔')],
  search:[L('بدي نام! 😩', 'I want to sleep! 😩', 'Uyumak istiyorum! 😩'), L('وين راح هالولد؟ 🤔', 'Where did that kid go? 🤔', 'O çocuk nereye gitti? 🤔'), L('همممم… ما في حدا؟ 👀', 'Hmmm… nobody? 👀', 'Hımm… kimse yok mu? 👀')],
  spot:[L('يا ولد رجاع عالتخت! 😠', 'Hey you! Back to bed! 😠', 'Hey sen! Yatağa dön! 😠'), L('شفتك! 👀', 'I see you! 👀', 'Seni gördüm! 👀')],
  lost:[L('وين راح؟ 🤷‍♀️', 'Where did you go? 🤷‍♀️', 'Nereye gitti? 🤷‍♀️')],
  shrug:[L('ما في حدا… 🤷‍♀️', 'Nobody here… 🤷‍♀️', 'Kimse yok… 🤷‍♀️'), L('يمكن عم بحلم… 🤷‍♀️', 'Maybe I\'m dreaming… 🤷‍♀️', 'Belki rüya görüyorum… 🤷‍♀️')],
  tired:[L('أوف تعبت… رجعة عالتخت 🥱', 'Phew, I\'m tired… back to bed 🥱', 'Of, yoruldum… yatağa dönüyorum 🥱'), L('تعبت! 😮‍💨', 'I\'m pooped! 😮‍💨', 'Yoruldum! 😮‍💨')],
  boop:[L('بوووب! 🪶 عالتخت!', 'Boop! 🪶 Off to bed!', 'Bup! 🪶 Haydi yatağa!')]
};
let bubbleUntil = 0, bubbleWho = '';
function say(cat, i){ const l = LINES[cat]; if(!l) return; if(!(i >= 0 && i < l.length)) i = Math.floor(Math.random() * l.length); netFx({ k:'say', c:cat, i }); A.mumble(4 + Math.floor(Math.random() * 3), cat === 'spot' ? 260 : 210); bubbleNona(l[i], 2.6); }
function bubbleNona(t, s){ $('#bubbleT').textContent = t; bubbleUntil = T + s; bubbleWho = 'nona'; }
let topUntil = 0;
function bubbleTop(t, s){ const h = $('#hint'); h.textContent = t; h.hidden = false; h.classList.remove('arrow'); topUntil = T + s; }
function showMark(spr, s){ spr.visible = true; spr.userData.until = T + s; netFx({ k:'mk', m:spr === excl ? 1 : 0, s }); }
let netFx = () => {};                  // co-op host: grandma's lines, marks and sounds go to the friends too (online part)

/* the kids grandma can catch: just you in solo; in co-op (host) you and the friends */
function kids(){
  const out = [];
  if(!R.co){ out.push({ id:'me', me:true, x:P.x, y:P.y, z:P.z, mode:P.mode, hidden:P.hidden, off:state !== 'play' }); return out; }
  out.push({ id:MP.id, me:true, x:P.x, y:P.y, z:P.z, mode:P.mode, hidden:P.hidden, off:!(state === 'play' || state === 'pause' || state === 'code') || T < meSafe });
  for(const p of PEERS.values()) if(p.inRun && p.seen) out.push({ id:p.id, x:p.tx, y:p.ty, z:p.tz, mode:p.md, hidden:p.hid >= 0 ? HIDES[p.hid] : null, off:T < p.safe, peer:p });
  return out;
}
const kidById = id => kids().find(k => k.id === id) || null;
function canSeeKid(k){
  k = k || kids()[0];
  if(!k || k.hidden || k.off) return false;
  const dy = Math.abs(G.y - k.y); if(dy > 1.4) return false;
  const dx = k.x - G.x, dz = k.z - G.z, d = Math.hypot(dx, dz);
  let range = D().sight * (k.mode === 'sneak' || k.mode === 'still' ? .72 : 1);
  if(G.mode === 'tired') range = D().tiredSee;
  if(G.mode === 'search' || G.mode === 'shrug') range *= .9;
  if(d > range) return false;
  const fx = Math.sin(G.face), fz = Math.cos(G.face), cos = (dx * fx + dz * fz) / (d || 1);
  if(d > 1.5 && cos < .42) return false;
  return H.los({ x:G.x, y:G.y + 1.45, z:G.z }, { x:k.x, y:k.y + .7, z:k.z });
}
/* the nearest kid grandma can see (or null) */
function seenKid(){
  let best = null, bd = 1e9;
  for(const k of kids()){ if(!canSeeKid(k)) continue; const d = Math.hypot(k.x - G.x, k.z - G.z); if(d < bd){ bd = d; best = k; } }
  return best;
}
/* co-op: grandma is a bit slower for each extra kid so it stays fun */
const coSlow = () => R.co ? Math.max(.78, 1 - .07 * (kids().length - 1)) : 1;
function goTo(tgt){ G.tgt = tgt; G.path = H.path(G, tgt); G.lastPathT = T; }
function moveNona(dt, speed){
  if(!G.path.length){ G.speed = 0; return true; }
  const n = G.path[0], dx = n.x - G.x, dz = n.z - G.z, d = Math.hypot(dx, dz);
  if(d < .35 || (G.path.length > 1 && d < .55)){ G.path.shift(); return !G.path.length; }
  const s = Math.min(speed, d / dt), ox = G.x, oz = G.z;
  G.x += dx / d * s * dt; G.z += dz / d * s * dt;
  const o = { x:G.x, z:G.z }; H.collide(o, .4, G.y); G.x = o.x; G.z = o.z;
  G.y = H.groundY(G.x, G.z, G.y);
  G.face += angDiff(Math.atan2(dx, dz), G.face) * Math.min(1, 8 * dt);
  const prog = Math.hypot(G.x - ox, G.z - oz); G.speed = prog / dt;
  if(prog < s * dt * .3){ G.stuck += dt; if(G.stuck > .9){ G.stuck = 0; G.x += (Math.random() - .5) * .6; G.z += (Math.random() - .5) * .6; if(G.tgt) G.path = H.path(G, G.tgt); } } else G.stuck = 0;
  return false;
}
const WANDER_ROOMS = ['kitchen', 'living', 'hall', 'landing', 'bath', 'kids', 'nona', 'landing', 'hall', 'kitchen'];
function wanderNext(){
  const kk = pick(kids()), kidRoom = H.roomOf(kk.x, kk.y, kk.z);
  const pool = WANDER_ROOMS.slice(); if(diffId === 'normal' && kidRoom && H.ROOM[kidRoom]) pool.push(kidRoom, kidRoom);
  if(GS && GS.t > 120) pool.push('basement', 'attic');
  const p = H.freePoint(pick(pool)); goTo(p);
}
function updateNona(dt){
  const d = D(); G.t += dt;
  const sk = (G.mode !== 'sleep' && G.mode !== 'wake' && G.mode !== 'boop' && G.mode !== 'shrug') ? seenKid() : null, seeing = !!sk;
  if(sk && (G.mode !== 'chase' || !canSeeKid(kidById(G.kid)))) G.kid = sk.id;      // chase the nearest kid she can see
  if(seeing && G.mode !== 'chase' && (G.mode !== 'tired' || d.tiredSee > 0)){
    G.spotT += dt; if(!excl.visible) showMark(excl, .8);
    if(G.spotT > d.spot){ G.mode = 'chase'; G.t = 0; G.chaseT = 0; G.lostT = 0; SFX.spot(); netFx({ k:'sfx', n:'spot' }); say('spot'); if(!R.co || G.kid === MP.id) A.setMode('chase'); }
  } else if(!seeing) G.spotT = Math.max(0, G.spotT - dt * .5);
  const slow = coSlow();
  G.act = 'walk'; G.actK = 0;
  switch(G.mode){
    case 'sleep':
      G.sleepT += dt;
      if(G.sleepT > G.wakeAt){ wakeNona(null, 'self'); }
      snore(dt);
      break;
    case 'wake':
      G.act = 'yawn'; G.actK = G.t / 1.4; G.speed = 0;
      if(G.t > 1.4){ if(G.tgt){ G.mode = 'curious'; goTo(G.tgt); } else { G.mode = 'wander'; G.wanderLeft = d.wanderT; goTo(H.freePoint(pick(['kitchen', 'bath', 'kitchen']))); } G.t = 0; }
      break;
    case 'curious':
      if(moveNona(dt, d.curious * slow)){ G.mode = 'search'; G.t = 0; if(Math.random() < .7) say('search'); }
      break;
    case 'search':
      G.act = 'look'; G.speed = 0; G.face += Math.sin(G.t * 1.7) * dt * .8;
      if(G.t > 3.4){ G.mode = 'wander'; G.t = 0; if(!(G.wanderLeft > 0)) G.wanderLeft = d.wanderT; wanderNext(); }
      break;
    case 'wander':
      G.wanderLeft -= dt;
      if(moveNona(dt, d.wander * slow)){ if(G.wanderLeft <= 0){ toTired(); } else { G.mode = 'search'; G.t = 1.6; } }
      break;
    case 'chase': {
      G.chaseT += dt;
      if(seeing){ G.lostT = 0; G.lastSeen = { x:sk.x, y:sk.y, z:sk.z }; if(T - G.lastPathT > .4 || !G.path.length){ goTo(G.lastSeen); } }
      else { G.lostT += dt; if(!G.path.length && G.lastSeen) goTo(G.lastSeen); }
      moveNona(dt, d.chase * slow);
      if(!R.co){ if(!P.hidden && Math.abs(G.y - P.y) < 1 && Math.hypot(G.x - P.x, G.z - P.z) < d.catchR){ startBoop(); break; } }
      else { const kc = kids().find(k => !k.hidden && !k.off && Math.abs(G.y - k.y) < 1 && Math.hypot(G.x - k.x, G.z - k.z) < d.catchR); if(kc){ coBoop(kc); break; } }
      if(G.lostT > d.lose){ G.mode = 'search'; G.t = 0; G.wanderLeft = d.wanderT * .4; say('lost'); A.setMode('calm'); }
      else if(G.chaseT > d.chaseMax){ toTired(); A.setMode('calm'); }
      break;
    }
    case 'toHide':
      if(moveNona(dt, d.curious * 1.2)){ G.mode = 'shrug'; G.t = 0; say('shrug'); }
      break;
    case 'shrug':
      { const kh = R.co ? kidById(G.kid) : { hidden:P.hidden }, hh = kh && kh.hidden; G.act = 'shrug'; G.actK = G.t / 2.4; G.speed = 0; if(hh) G.face += angDiff(Math.atan2(hh.x - G.x, hh.z - G.z), G.face) * Math.min(1, 4 * dt); }
      if(G.t > 2.4) toTired();
      break;
    case 'tired':
      if(G.t < 1.6){ G.act = 'yawn'; G.actK = G.t / 1.6; G.speed = 0; break; }
      if(moveNona(dt, d.tired)){ G.mode = 'sleep'; G.sleepT = 0; G.wakeAt = lerp(d.selfWake[0], d.selfWake[1], Math.random()); G.t = 0; }
      break;
    case 'boop':
      { const kb = R.co ? (kidById(G.kid) || P) : P; G.act = 'boop'; G.actK = Math.min(1, G.t / .8); G.speed = 0; G.face += angDiff(Math.atan2(kb.x - G.x, kb.z - G.z), G.face) * Math.min(1, 10 * dt); }
      if(R.co && G.t > 2.2) coAfterBoop();
      break;
  }
  if(G.mode !== 'chase' && A.musicMode === 'chase') A.setMode('calm');
}
function snore(dt){ G.snoreT -= dt; if(G.snoreT <= 0){ G.snoreT = 2.7; const dd = Math.hypot(P.x - H.nonaBed.x, P.z - H.nonaBed.z) + Math.abs(P.y - LY[2]) * 2; A.snore(clamp(1 - dd / 16, 0, 1)); } }
function toTired(){ G.mode = 'tired'; G.t = 0; G.wanderLeft = 0; say('tired'); goTo({ x:H.nonaBed.out.x, y:LY[2], z:H.nonaBed.out.z }); }
function renderNona(dt){
  const n = nona;
  const sleeping = G.mode === 'sleep' || (state === 'title' || state === 'select' || state === 'overview' || (state === 'mp' && !R.co));
  blanket.visible = blanketFold.visible = sleeping; n.pillow.visible = !sleeping;
  if(sleeping){
    const b = H.nonaBed, top = b.top;
    n.grp.position.set(7.95, top + .34, b.z);
    _m.makeBasis(_v.set(0, 0, 1), _v2.set(1, 0, 0), new THREE.Vector3(0, 1, 0)); n.grp.quaternion.setFromRotationMatrix(_m);
    blanket.position.set(8.05, top + .4, b.z); blanketFold.position.set(8.72, top + .42, b.z);
    poseNona(n, { t:T, act:'sleep' });
    zzz.forEach((z, i) => { const k = ((T * .45 + i / 3) % 1); z.visible = true; z.position.set(9.3 + k * .5, top + 1.0 + k * 1.1, b.z + Math.sin(k * 6 + i) * .2); z.material.opacity = Math.sin(k * Math.PI); });
  } else {
    zzz.forEach(z => z.visible = false);
    n.grp.quaternion.identity(); n.grp.position.set(G.x, G.y, G.z); n.grp.rotation.y = G.face;
    poseNona(n, { t:T, move:clamp(G.speed / 2.4, 0, 1), act:G.act, k:G.actK });
  }
  for(const s of [excl, ques]){ if(!s.visible) continue; if(T > s.userData.until){ s.visible = false; continue; } const p = sleeping ? H.nonaBed : G; s.position.set(p.x, (sleeping ? H.nonaBed.top + .4 : G.y) + 2.2 + Math.sin(T * 8) * .05, p.z); }
}

/* ---------- hiding ---------- */
function nearHide(){ let best = null, bd = 1e9; for(const h of HIDES){ if(Math.abs(h.y - P.y) > .8) continue; const d = Math.min(Math.hypot(h.out.x - P.x, h.out.z - P.z), Math.hypot(h.x - P.x, h.z - P.z) - .25); if(d < h.near && d < bd){ bd = d; best = h; } } return best; }
function enterHide(h){
  P.hidden = h; P.vx = P.vz = 0; hero.grp.visible = false; cam.peekY = 0; cam.peekP = 0; clearInput();
  SFX.hide(); peek(h.kind);
  if(aiHere()){ if(hideReact(R.co ? MP.id : 'me', h, P.x, P.z)) A.setMode('calm'); }
  else coPosNow();
  bubbleTop(L('تخبّيت! 🤫 استنّى الجدّة تروح', 'Hidden! 🤫 Wait for Grandma to leave', 'Saklandın! 🤫 Büyükannenin gitmesini bekle'), 2.5);
}
/* grandma saw a kid slip into a hiding spot: she walks over, shrugs, and goes back to bed */
function hideReact(id, h, x, z){
  const d = Math.hypot(G.x - x, G.z - z);
  if((G.mode === 'chase' && (!R.co || G.kid === id)) || ((G.mode === 'curious' || G.mode === 'wander' || G.mode === 'search') && d < 6 && G.spotT > 0)){
    G.mode = 'toHide'; G.kid = id; goTo({ x:h.out.x, y:h.y, z:h.out.z }); return true;
  }
  return false;
}
function exitHide(){
  const h = P.hidden; if(!h) return;
  P.hidden = null; P.x = h.out.x; P.z = h.out.z; P.y = H.groundY(P.x, P.z, h.y + .1); P.face = Math.atan2(h.out.x - h.x, h.out.z - h.z);
  hero.grp.visible = true; cam.yaw = P.face + Math.PI; snapCam = true; peek(null); SFX.hide();
}
function peek(kind){ const el = $('#peek'); el.className = 'peek' + (kind ? ' ' + kind : ''); el.hidden = !kind; }

/* ---------- items: pick up, drop, jar, door locks ---------- */
const NEED = { key:'key', pliers:'chain', note:'pad' };
function itemPos(id){ return GS.items[id]; }
function nearItem(){
  let best = null, bd = 1.25;
  for(const id of ['key', 'pliers', 'note']){ const it = GS.items[id]; if(it.state !== 'world') continue; if(Math.abs(it.y - P.y) > 1.6) continue; const d = Math.hypot(it.x - P.x, it.z - P.z); if(d < bd){ bd = d; best = id; } }
  return best;
}
function nearJar(){ const j = GS.items.jar; return !GS.jarOpen && Math.abs(j.y - P.y) < 1.6 && Math.hypot(j.x - P.x, j.z - P.z) < 1.3; }
function nearDoor(){ return H.lvOf(P.y) === 1 && Math.abs(P.y) < .5 && Math.hypot(P.x - .5, P.z + 6.3) < 1.6; }
function context(){
  if(state !== 'play' || !GS) return null;
  if(P.hidden) return { k:'out', i:'👀', t:L('اطلع', 'Get out', 'Çık'), c:'#8fd0ff' };
  if(nearDoor()){
    if(held && !GS.locks[NEED[held]]) return { k:'use', i:INFO[held].e, t:L('افتح', 'Open', 'Aç'), c:'#5fe3b1', pulse:true };
    if(!nearItem()) return { k:'door', i:'🚪', t:L('الباب', 'Door', 'Kapı'), c:'#ffcd4d', dim:true };
  }
  if(nearJar()) return { k:'jar', i:'🍪', t:L('افتح', 'Open', 'Aç'), c:'#ff9ec4', pulse:true };
  const it = nearItem(); if(it) return { k:'pick', id:it, i:INFO[it].e, t:L('التقط', 'Pick up', 'Al'), c:'#ffcd4d', pulse:true };
  const h = nearHide(); if(h) return { k:'hide', h, i:'🫣', t:L('تخبّى', 'Hide', 'Saklan'), c:'#b99bff' };
  if(held) return { k:'drop', i:INFO[held].e, t:L('حط', 'Put down', 'Bırak'), c:'#ffb38a' };
  return null;
}
function doAction(){
  const c = context(); if(!c) return;
  if(c.k === 'out') exitHide();
  else if(c.k === 'hide') enterHide(c.h);
  else if(c.k === 'door') doorHint();
  else if(c.k === 'use' && held === 'note') openCode();
  else if(!aiHere()) coAsk(c);              // a friend's phone asks the host, who answers for everyone
  else if(c.k === 'pick') pickUp(c.id);
  else if(c.k === 'drop') dropHeld(true);
  else if(c.k === 'jar') openJar();
  else if(c.k === 'use') useOnDoor();
}
/* items are shared in the house: each one is lying around ('world'), carried by someone ('held', by = player id),
   still in the cookie jar ('injar', the key) or used on the door ('used'). Each kid carries one at a time. */
const myId = () => R.co ? MP.id : 'me';
function heldBy(who){ if(!GS) return null; for(const id of ['key', 'pliers', 'note']){ const it = GS.items[id]; if(it.state === 'held' && it.by === who) return id; } return null; }
function poseHeldMesh(m, id){ m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); if(id === 'note'){ m.rotation.x = -1.1; m.position.y = .05; } if(id === 'key'){ m.rotation.set(-1.0, 0, 0); } }
function holderOf(who){ if(who === myId()) return holder; const p = R.co && PEERS.get(who); return (p && p.holder) || null; }
function attach(id){ const m = IT[id].mesh; holder.add(m); poseHeldMesh(m, id); }
/* put every carried item in the right kid's hands (and the rest back in the house) */
function syncHeld(){
  if(!GS) return;
  const was = held; held = heldBy(myId());
  for(const id of ['key', 'pliers', 'note']){
    const it = GS.items[id], m = IT[id].mesh;
    const hd = it.state === 'held' ? holderOf(it.by) : null;
    if(hd){ if(m.parent !== hd){ hd.add(m); poseHeldMesh(m, id); } }
    else if(m.parent !== scene) scene.add(m);
  }
  if(was !== held) updateNoteCard();
}
function pickUp(id, who = myId()){
  const it = GS.items[id]; if(!it || it.state !== 'world') return false;
  if(heldBy(who)) dropHeld(false, who);
  it.state = 'held'; it.by = who; syncHeld();
  burst(it.x, it.y + .2, it.z, 14, ['#fff1a0', '#ffffff', '#ffcd4d'], { speed:1.5, up:2, g:3, life:.8, size:.7 });
  if(who === myId()){ SFX.pickup(); if(!GS.locks[NEED[id]]){ progress(); bubbleTop(INFO[id].e + ' ' + INFO[id].n + ' — ' + L('روح عالباب الكبير تحت 🚪', 'take it to the big front door downstairs 🚪', 'aşağıdaki büyük kapıya götür 🚪'), 3); } }
  updateNoteCard();
  coShare('pick', { by:who, i:id });
  return true;
}
/* at = where a friend's phone put it (checked to be next to them) */
function dropHeld(noisy, who = myId(), at){
  const id = heldBy(who); if(!id) return;
  const it = GS.items[id];
  let fx, fz, py;
  if(who === myId()){ fx = P.x + Math.sin(P.face) * .45; fz = P.z + Math.cos(P.face) * .45; py = P.y; }
  else { const k = kidById(who) || { x:it.x, y:it.y, z:it.z }; py = k.y; fx = k.x; fz = k.z; if(at && Math.hypot(at.x - k.x, at.z - k.z) < 1.2){ fx = at.x; fz = at.z; } }
  const o = { x:fx, z:fz }; H.collide(o, .15, py);
  it.x = o.x; it.z = o.z; it.y = H.groundY(o.x, o.z, py); it.lv = H.lvOf(it.y); it.state = 'world'; it.by = '';
  syncHeld();
  if(noisy){ if(who === myId()) SFX.drop(); makeNoise(it.x, it.y, it.z, 5, 'drop'); }
  updateNoteCard();
  coShare('drop', { by:who, i:id });
}
function openJar(who = myId()){
  if(GS.jarOpen) return;
  GS.jarOpen = true; const j = GS.items.jar; SFX.jar(); makeNoise(j.x, j.y, j.z, 4.5, 'jar');
  const k = GS.items.key; k.state = 'world';
  // the key pops out next to the jar (towards the kid)
  const kid = who === myId() ? P : (kidById(who) || P);
  const dx = kid.x - j.x, dz = kid.z - j.z, d = Math.hypot(dx, dz) || 1; k.x = j.x + dx / d * .3; k.z = j.z + dz / d * .3; k.y = j.y; k.lv = j.lv;
  jarFx();
  coShare('jar', { by:who });
}
function jarFx(){
  const j = GS.items.jar;
  keyPop = 0; progress();
  burst(j.x, j.y + .35, j.z, 18, ['#c98a4a', '#ffcd4d', '#ffffff'], { speed:1.4, up:2.5, g:6, life:.9, size:.8 });
  bubbleTop(L('لقيت المفتاح بعلبة البسكوت! 🔑🍪', 'The key was in the cookie jar! 🔑🍪', 'Anahtar kurabiye kavanozundaymış! 🔑🍪'), 2.6);
}
let keyPop = 1;
function useOnDoor(who = myId()){
  const id = heldBy(who), lk = NEED[id];
  if(!id) return;
  if(id === 'note'){ if(who === myId()) openCode(); return; }
  if(GS.locks[lk]) return;
  GS.items[id].state = 'used'; GS.items[id].by = ''; syncHeld();
  lockFx(lk);
  GS.locks[lk] = true; makeNoise(.5, 0, -6.4, 8, 'lock'); progress(); afterLock();
  coShare('lock', { by:who, lk });
}
function lockFx(lk){
  if(lk === 'key'){ LOCK.key.key.visible = true; LOCK.key.anim = 0; SFX.unlock(); }
  if(lk === 'chain'){ LOCK.chain.anim = 0; SFX.chain(); burst(.5, 1.5, -6.75, 16, ['#fff3a0', '#ffffff', '#b9c0c8'], { speed:2, up:1.5, g:6, life:.6, size:.6 }); }
  if(lk === 'pad'){ LOCK.pad.anim = 0; LOCK.pad.dots.forEach((d, i) => d.material.color.set(SYM[GS.code[i]].c)); SFX.unlock(); }
}
function padOpen(who = myId()){
  if(GS.locks.pad || heldBy(who) !== 'note') return;
  GS.items.note.state = 'used'; GS.items.note.by = ''; syncHeld(); GS.locks.pad = true;
  lockFx('pad'); makeNoise(.5, 0, -6.4, 8, 'lock'); progress(); afterLock();
  coShare('lock', { by:who, lk:'pad' });
}
function afterLock(){
  updateNoteCard();
  const left = Object.values(GS.locks).filter(v => !v).length;
  if(left === 0){ if(aiHere()) setTimeout(() => { if(R.co) coWin(); else startWin(); }, 900); bubbleTop(L('انفتح الباب! 🎉', 'The door is open! 🎉', 'Kapı açıldı! 🎉'), 2); }
  else bubbleTop(L('برافو! ضل ', 'Bravo! ', 'Aferin! ') + N(left) + L(' قفل 🔓', left === 1 ? ' lock left 🔓' : ' locks left 🔓', ' kilit kaldı 🔓'), 2.4);
}
function doorHint(){
  const need = [];
  if(!GS.locks.key) need.push('🔑 ' + INFO.key.n); if(!GS.locks.chain) need.push('🔧 ' + INFO.pliers.n); if(!GS.locks.pad) need.push('📜 ' + INFO.note.n);
  bubbleTop(L('الباب بدّو: ', 'The door needs: ', 'Kapının ihtiyacı: ') + need.join(' · '), 3);
  SFX.tap();
}
function progress(){ GS.progressT = GS.t; GS.hint = false; arrow.visible = false; }
function updateLocks(dt){
  const k = LOCK.key; if(k.anim != null && k.anim < 1){ k.anim = Math.min(1, k.anim + dt * 1.5); k.key.rotation.set(0, Math.PI / 2, 0); k.key.rotateX(k.anim * Math.PI / 2); if(k.anim >= 1) burst(.5, 1.1, -6.75, 10, ['#ffcd4d', '#ffffff'], { speed:1.2, up:1, g:3, life:.6, size:.6 }); }
  const c = LOCK.chain; if(c.anim != null && c.anim < 1){ c.anim = Math.min(1, c.anim + dt * .9); c.obj.position.y = -c.anim * c.anim * 1.3; c.obj.rotation.z = c.anim * .4; if(c.anim >= 1) c.obj.visible = false; }
  const p = LOCK.pad; if(p.anim != null && p.anim < 1){ p.anim = Math.min(1, p.anim + dt * 1.1); p.obj.position.y = .62 - (p.anim > .3 ? ((p.anim - .3) / .7) ** 2 * .6 : 0) ; p.obj.rotation.z = p.anim * .8; p.obj.position.z = -6.82 + p.anim * .3; }
}

/* ---------- colour padlock ---------- */
let entry = [];
function openCode(){
  state = 'code'; clearInput(); entry = [];
  const el = $('#code');
  const noteRow = held === 'note' ? GS.code.map(i => symSVG(i, 42)).join('') : '';
  el.innerHTML = `<div class="code-card"><button class="x" id="cX" aria-label="${L('سكّر', 'Close', 'Kapat')}">✖️</button>
    <h2>🎨 ${L('القفل الملوّن', 'Colour lock', 'Renkli kilit')}</h2>
    ${noteRow ? `<div class="note-row"><span>📜</span>${noteRow}</div>` : ''}
    <p>${L('اكبس الأشكال متل الورقة', 'Tap the shapes like on the note', 'Nottaki gibi şekillere bas')}</p>
    <div class="slots3" id="cSlots"><b></b><b></b><b></b></div>
    <div class="pad6">${SYM.map((s, i) => `<button data-i="${i}" aria-label="${s.n}">${symSVG(i, 46)}</button>`).join('')}</div></div>`;
  el.hidden = false;
  el.querySelectorAll('.pad6 button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); codeTap(+b.dataset.i); }));
  $('#cX').onclick = () => closeCode();
}
function codeTap(i){
  if(entry.length >= 3 || $('#code').hidden) return;
  entry.push(i); SFX.code(i);
  const sl = $('#cSlots').children; sl[entry.length - 1].innerHTML = symSVG(i, 36);
  if(entry.length === 3){
    const ok = entry.every((v, k) => v === GS.code[k]);
    setTimeout(() => {
      if(ok){ closeCode(true); }
      else { $('#code .code-card').classList.add('shake'); SFX.wrong(); setTimeout(() => { const c = $('#code .code-card'); if(c) c.classList.remove('shake'); entry = []; [...$('#cSlots').children].forEach(b => b.innerHTML = ''); }, 500); makeNoise(.5, 0, -6.4, 6, 'wrong'); }
    }, 250);
  }
}
function closeCode(solved){
  $('#code').hidden = true; if(state === 'code') state = 'play';
  if(solved){ if(aiHere()) padOpen(); else coReq({ k:'pad' }); }
}

/* ---------- caught: a soft boop, feathers, cosy fade, next day ---------- */
let boopT = 0;
function startBoop(){
  G.mode = 'boop'; G.t = 0; state = 'caught'; boopT = 0; clearInput(); A.setMode('calm');
  say('boop'); SFX.boop();
  setTimeout(() => { SFX.feathers(); burst(P.x, P.y + 1.0, P.z, 40, ['#ffffff', '#fff3f8', '#ffe3ef'], { speed:2.2, up:2.2, g:1.2, drag:2.4, life:2.6, size:1.4, sway:.8 }); }, 380);
}
function updateCaught(dt){
  if(R.co){ updateCaughtCo(dt); return; }
  boopT += dt;
  const ov = $('#sleepov');
  if(boopT > .9 && ov.hidden){
    ov.hidden = false; ov.classList.remove('out');
    const left = DAYS - GS.day;
    $('#sleepT').textContent = L('بوووب! 🪶 رجعت عالتخت', 'Boop! 🪶 Back to bed', 'Bup! 🪶 Yatağa geri');
    $('#sleepS').textContent = left > 0 ? L('اليوم ', 'Day ', 'Gün ') + N(GS.day + 1) + L(' من ', ' of ', ' / ') + N(DAYS) + ' ☀️' : L('خلصت الأيام…', 'No more days…', 'Günler bitti…');
    A.music(false);
  }
  if(boopT > 2.2 && !updateCaught.reset){
    updateCaught.reset = true;
    // carried item goes back to where it was found
    if(held) itemHome(held);
    GS.day++;
    if(GS.day > DAYS){ ov.hidden = true; showLose(); updateCaught.reset = false; return; }
    newDay(false);
  }
  if(boopT > 3.4){ updateCaught.reset = false; ov.classList.add('out'); setTimeout(() => { ov.hidden = true; }, 500); state = 'play'; A.music(true, 'calm'); bubbleTop(L('يوم جديد! انتبه عالجدّة 👵🏻', 'A new day! Watch out for Grandma 👵🏻', 'Yeni bir gün! Büyükanneye dikkat 👵🏻'), 2.5); }
}

/* a carried item goes back to where it was found */
function itemHome(id){ const it = GS.items[id], h = id === 'key' ? GS.items.jar : it.home; it.x = h.x + (id === 'key' ? .3 : 0); it.y = h.y; it.z = h.z; it.lv = h.lv; it.state = 'world'; it.by = ''; syncHeld(); updateNoteCard(); }

/* ---------- win: the door opens to a sunny garden ---------- */
let winT = 0;
function startWin(){
  if(!R.co && state !== 'play' && state !== 'code') return;
  if(R.co){ if(state === 'win' || state === 'won') return; $('#code').hidden = true; $('#sleepov').hidden = true; overlay.hidden = true; updateCaught.reset = false; updateWin.shown = false; }
  state = 'win'; winT = 0; clearInput(); exitHide(); fp = false; $('#btnEye').classList.remove('lit');
  GS.over = true; H.doorCol.off = true; SFX.door(); setPlayUI(false);
  for(const id of ['key', 'pliers', 'note']){ const it = GS.items[id]; if(it.state === 'held'){ it.state = 'used'; it.by = ''; } } syncHeld();
  for(const id of ['key', 'pliers', 'note']) if(GS.items[id].state === 'used') IT[id].mesh.visible = false;
  coWinPlace();
  // grandma waves from the hallway
  G.mode = 'wave'; G.x = .5; G.z = -3.8; G.y = 0; G.face = Math.PI; G.path = [];
  P.x = .5; P.z = -5.6; P.y = 0; P.face = Math.PI;
  const fl = $('#flash'); fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
  setTimeout(() => { H.setSunny(true); scene.fog.color.set(0xbfe6ff); hemi.color.set(0xffffff); hemi.groundColor.set(0x8fbf6a); hemi.intensity = 2.7; }, 350);
  A.music(false); setTimeout(() => SFX.fanfare(), 600);
}
function updateWin(dt){
  winT += dt;
  const k = Math.min(1, winT / 1.2); H.leaves[0].rotation.y = k * 1.75; H.leaves[1].rotation.y = -k * 1.75;
  if(winT > 1.0){ const w = Math.min(1, (winT - 1.0) / 2.6); P.z = lerp(-5.6, -12.5, w); P.x = .5 + Math.sin(w * 6) * .2; P.face = Math.PI; P.move = w < 1 ? 1 : 0; P.y = H.groundY(P.x, P.z, P.y); }
  coWinFrame(winT);
  G.act = 'wave'; G.speed = 0;
  camera.position.set(2.4, 1.7, -15.2); camera.lookAt(.4, 1.3, -8.5);
  if(winT > 2.4 && Math.random() < dt * 9) burst(P.x + (Math.random() - .5) * 4, 3.5, P.z + (Math.random() - .5) * 2, 10, ['#ff5d73', '#ffcd4d', '#5fb8ff', '#5fe3b1', '#b99bff'], { speed:2, up:1, g:2.2, drag:1.2, life:2.6, size:1.2, sway:.6 });
  if(winT > 4.2 && !updateWin.shown && state === 'win'){ updateWin.shown = true; showWin(); }
}

/* ---------- HUD ---------- */
const hudCache = {};
const setTxt = (id, t) => { if(hudCache[id] !== t){ hudCache[id] = t; $('#' + id).textContent = t; } };
function setPlayUI(on){ ['#hud', '#joy', '#btnRun'].forEach(s => $(s).hidden = !on); if(!on){ $('#btnAct').hidden = true; $('#slot').hidden = true; $('#bubble').hidden = true; $('#hint').hidden = true; } }
function hudFrame(){
  setTxt('hDay', '☀️ ' + L('اليوم ', 'Day ', 'Gün ') + N(GS.day) + '/' + N(DAYS));
  for(const [id, lk] of [['hKey', 'key'], ['hChain', 'chain'], ['hPad', 'pad']]) $('#' + id).classList.toggle('done', GS.locks[lk]);
  const m = G.mode, mood = m === 'sleep' ? ['😴', L('الجدّة نايمة', 'Grandma is asleep', 'Büyükanne uyuyor'), 'sleep'] : m === 'chase' || m === 'boop' ? (R.co && G.kid !== MP.id ? ['🏃‍♀️', L('الجدّة عم تلحق صاحبك!', 'Grandma is chasing your friend!', 'Büyükanne arkadaşını kovalıyor!'), 'chase'] : ['😠', L('الجدّة شافتك!', 'Grandma sees you!', 'Büyükanne seni gördü!'), 'chase']) :
    m === 'tired' || m === 'shrug' ? ['🥱', L('الجدّة تعبانة', 'Grandma is sleepy', 'Büyükanne yorgun'), 'tired'] : ['🤔', L('الجدّة صاحية!', 'Grandma is awake!', 'Büyükanne uyandı!'), 'awake'];
  setTxt('hMood', mood[0] + ' ' + mood[1]); $('#hMood').dataset.m = mood[2];
  // held item slot
  const sl = $('#slot'); sl.hidden = !held; if(held){ setTxt('slotI', INFO[held].e); setTxt('slotB', INFO[held].n); }
  // action button
  const c = context(), key = c ? c.k + (c.id || '') + c.t : '';
  if(hudCache.act !== key){ hudCache.act = key; actBtn.hidden = !c; if(c){ $('#actI').textContent = c.i; $('#actB').textContent = c.t; actBtn.style.setProperty('--ac', c.c); actBtn.classList.toggle('pulse', !!c.pulse); actBtn.classList.toggle('dim', !!c.dim); } }
  runBtn.hidden = !!P.hidden; joyEl.hidden = !!P.hidden;
  // grandma's speech bubble follows her head when she is on screen
  const bub = $('#bubble');
  if(T < bubbleUntil){
    const p = G.mode === 'sleep' ? _v.set(H.nonaBed.x, H.nonaBed.top + 1.2, H.nonaBed.z) : _v.set(G.x, G.y + 2.15, G.z);
    p.project(camera); const on = p.z < 1 && Math.abs(p.x) < .92 && Math.abs(p.y) < .9;
    const seen = on && (P.hidden || H.los({ x:camera.position.x, y:camera.position.y, z:camera.position.z }, { x:G.x, y:G.y + 1.6, z:G.z }));
    bub.hidden = false; bub.classList.toggle('top', !seen);
    if(seen){ bub.style.left = ((p.x + 1) / 2 * SW) + 'px'; bub.style.top = ((1 - p.y) / 2 * SH) + 'px'; } else { bub.style.left = ''; bub.style.top = ''; }
  } else bub.hidden = true;
  const hint = $('#hint'); if(T > topUntil && !GS.hint) hint.hidden = true;
}
function updateNoteCard(){
  const nc = $('#noteCard');
  if(held === 'note' && GS){ nc.innerHTML = '<span>📜</span>' + GS.code.map(i => symSVG(i, 30)).join(''); nc.hidden = false; } else nc.hidden = true;
}

/* ---------- stuck for 60 s? a friendly arrow ---------- */
function hintTarget(){
  if(held && !GS.locks[NEED[held]]) return { x:.5, y:0, z:-5.8 };
  const c = [];
  if(!GS.locks.key){ const k = GS.items.key; if(k.state === 'injar') c.push(GS.items.jar); else if(k.state === 'world') c.push(k); }
  if(!GS.locks.chain && GS.items.pliers.state === 'world') c.push(GS.items.pliers);
  if(!GS.locks.pad && GS.items.note.state === 'world') c.push(GS.items.note);
  if(!c.length) return null;
  c.sort((a, b) => (Math.hypot(a.x - P.x, a.z - P.z) + Math.abs(a.y - P.y) * 4) - (Math.hypot(b.x - P.x, b.z - P.z) + Math.abs(b.y - P.y) * 4));
  return c[0];
}
function updateHint(dt){
  if(!GS.hint && GS.t - GS.progressT > HINT_AFTER){ GS.hint = true; const h = $('#hint'); h.textContent = L('اتبع السهم الأصفر ⬆️', 'Follow the yellow arrow ⬆️', 'Sarı oku takip et ⬆️'); h.hidden = false; h.classList.add('arrow'); SFX.yay(); }
  arrow.visible = GS.hint && !P.hidden && !fp;
  if(!arrow.visible) return;
  const t = hintTarget(); if(!t){ arrow.visible = false; return; }
  const path = H.path({ x:P.x, y:P.y, z:P.z }, { x:t.x, y:t.y, z:t.z }), n = path[0];
  arrow.position.set(P.x, P.y + 1.75 + Math.sin(T * 4) * .08, P.z);
  arrow.rotation.set(0, Math.atan2(n.x - P.x, n.z - P.z), 0);
  if(Math.abs(n.y - P.y) > 1.2 && Math.hypot(n.x - P.x, n.z - P.z) < 1.5) arrow.rotation.x = n.y > P.y ? -.6 : .6;
}

/* ---------- screens ---------- */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function showTitle(){
  if(R.co || MP.t) coStop();
  state = 'title'; setPlayUI(false); showOverlay('clear'); card.className = 'card bare'; clearInput(); peek(null); A.music(false);
  if(!GS) newRun(); placeTitleScene(); setTitleView(true); H.setTitle(true);
  const best = +rawGet('granny_best') || 0;
  card.innerHTML = `<div class="menu">
    ${ROT ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="top"><div class="logo">👵🏻</div><h1>${L('بيت الجدّة نونا', "Grandma Nona's House", 'Nona Ninenin Evi')}</h1></div>
    <p class="sub">${L('الجدّة نايمة… لاقي المفتاح وافتح الباب بشويش! 🤫', 'Grandma is asleep… find the key and sneak out! 🤫', 'Nine uyuyor… anahtarı bul ve sessizce kaç! 🤫')}</p>
    <div class="row" style="align-items:center">
      <div class="seg" role="radiogroup"><button class="${diffId === 'easy' ? 'on' : ''}" data-d="easy" role="radio" aria-checked="${diffId === 'easy'}">😊 ${L('سهل', 'Easy', 'Kolay')}</button><button class="${diffId === 'normal' ? 'on' : ''}" data-d="normal" role="radio" aria-checked="${diffId === 'normal'}">🙂 ${L('عادي', 'Normal', 'Normal')}</button></div>
      <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    </div>
    <button class="big-btn" id="bPlay">▶️ ${L('يلّا نهرب!', "Let's escape!", 'Hadi kaçalım!')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button>
    ${best ? `<div class="mine"><span>${'⭐'.repeat(best)}</span></div>` : ''}
  </div>`;
  card.querySelectorAll('.seg button').forEach(b => b.onclick = () => { diffId = b.dataset.d; rawSet('granny_diff', diffId); SFX.tap(); card.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); });
  $('#bPlay').onclick = () => { A.ac(); SFX.tap(); startGame(); };
  $('#bHero').onclick = () => { A.ac(); SFX.tap(); showSelect('title'); };
  $('#bMp').onclick = () => { A.ac(); SFX.tap(); mpMenu(); };
}
function placeTitleScene(){
  P.x = -6.6; P.z = -4.2; P.y = LY[2]; P.face = 0; P.hidden = null; P.move = 0; if(hero) hero.grp.visible = true;
  G.mode = 'sleep';
}
let selFrom = 'title', selPick = heroId;
function showSelect(from){
  selFrom = from; state = 'select'; setPlayUI(false); showOverlay('dim'); card.className = 'card wide'; selPick = heroId;
  card.innerHTML = `<h2>🦸 ${L('اختار شخصيتك', 'Pick your hero', 'Kahramanını seç')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === selPick ? ' on' : ''}" data-id="${id}" style="--c:${HERO_COLOR[id]}" aria-pressed="${id === selPick}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b></button>`).join('')}</div>
    <button class="big-btn" id="bOkHero">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const btns = [...card.querySelectorAll('.hero')];
  btns.forEach(b => b.onclick = () => { selPick = b.dataset.id; SFX.tap(); btns.forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); });
  $('#bOkHero').onclick = () => { SFX.tap(); if(selPick !== heroId){ heroId = selPick; rawSet('granny_hero', heroId); setHero(heroId); if(held) attach(held); if(MP.t) mpTrack(); } if(selFrom === 'pause') showPause(true); else if(selFrom === 'mp') mpBackFromSelect(); else showTitle(); };
}
function startGame(plan){
  newRun(plan); setTitleView(false); H.setTitle(false);
  overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); for(const k in hudCache) delete hudCache[k];
  runOn = false; runBtn.classList.remove('lit'); fp = false; $('#btnEye').classList.remove('lit'); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊';
  A.music(true, 'calm');
  bubbleTop(L('لاقي 🔑 و 🔧 و 📜 وافتح الباب الكبير! امشِ بشويش 🤫', 'Find 🔑, 🔧 and 📜 and open the big door! Tiptoe 🤫', '🔑, 🔧 ve 📜 bul, büyük kapıyı aç! Sessiz ol 🤫'), 5);
}
function showPause(fromSelect){
  if(state !== 'play' && !fromSelect) return;
  state = 'pause'; setPlayUI(false); showOverlay('dim'); card.className = 'card'; clearInput(); A.music(false);
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <p>☀️ ${L('اليوم ', 'Day ', 'Gün ') + N(GS.day) + '/' + N(DAYS)} · ${GS.locks.key ? '✅' : '🔒'}🔑 ${GS.locks.chain ? '✅' : '🔒'}⛓️ ${GS.locks.pad ? '✅' : '🔒'}🎨</p>
    ${R.co ? `<p>👫 ${L('أصحابك لسّا عم يلعبوا، الجدّة ما بتستنّى!', "Your friends are still playing — Grandma doesn't wait!", 'Arkadaşların hâlâ oynuyor — Büyükanne beklemez!')}</p>` : ''}
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row">${R.co ? `<button class="ghost-btn" id="bLeaveP">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button>` : `<button class="ghost-btn" id="bRestart">🔁 ${L('من الأول', 'Start over', 'Baştan')}</button>`}
    <button class="ghost-btn" id="bChar">🦸 ${L('غيّر الشخصية', 'Change hero', 'Kahraman değiştir')}</button>
    <button class="ghost-btn" id="bSnd2">${A.muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button></div>
    <button class="exit-btn">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  if(R.co) $('#bLeaveP').onclick = () => { SFX.tap(); coStop(); showTitle(); };
  else $('#bRestart').onclick = () => { SFX.tap(); startGame(); };
  $('#bChar').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd2').onclick = () => { A.setMuted(!A.muted); $('#bSnd2').innerHTML = (A.muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊'; if(!A.muted) SFX.tap(); };
}
function resume(){ if(state !== 'pause' && state !== 'select') return; overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); for(const k in hudCache) delete hudCache[k]; A.music(true, G.mode === 'chase' ? 'chase' : 'calm'); snapCam = true; }
const starsFor = (days, secs) => days === 1 && secs < 420 ? 3 : (days <= 2 || (days <= 3 && secs < 600)) ? 2 : 1;
function showWin(){
  if(R.co){ showWinCo(); return; }
  const days = GS.day, secs = Math.round(GS.t);
  const stars = starsFor(days, secs);
  const coins = [0, 5, 10, 15][stars];
  if(window.World) World.addCoins(coins, L('من بيت الجدّة نونا', "for Grandma Nona's House", 'Nona Ninenin Evi için'));
  if(window.World && World.track) try{ World.track('win', 'granny'); }catch(e){}
  if(stars > (+rawGet('granny_best') || 0)) rawSet('granny_best', String(stars));
  GS.result = { stars, coins, days, secs };
  state = 'won'; showOverlay('clear'); card.className = 'card';
  const mm = Math.floor(secs / 60), ss = secs % 60;
  card.innerHTML = `<div class="bigstar">${'⭐'.repeat(stars)}${'<span class="off">⭐</span>'.repeat(3 - stars)}</div>
    <h2>🎉 ${L('هربت من البيت!', 'You escaped!', 'Evden kaçtın!')}</h2>
    <p>${L('الجدّة نونا عم تقلّك: ارجع عالعشا! 😄', 'Grandma Nona says: be back for dinner! 😄', 'Nona Nine diyor ki: akşam yemeğine dön! 😄')}</p>
    <div class="tally"><span>☀️ ${N(days)} ${L(days === 1 ? 'يوم' : 'أيام', days === 1 ? 'day' : 'days', 'gün')}</span><span>⏱️ ${N(mm)}:${N((ss < 10 ? '0' : '') + ss)}</span><span>🪙 +${N(coins)}</span></div>
    <div class="row"><button class="big-btn" id="bAgain">🔁 ${L('كمان مرة', 'Play again', 'Tekrar oyna')}</button><button class="ghost-btn" id="bMenuW">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  $('#bAgain').onclick = () => { SFX.tap(); updateWin.shown = false; startGame(); };
  $('#bMenuW').onclick = () => { SFX.tap(); updateWin.shown = false; GS = null; showTitle(); };
}
function showLose(){
  if(R.co){ showLoseCo(); return; }
  state = 'lost'; setPlayUI(false); showOverlay('dim'); card.className = 'card'; A.music(false);
  card.innerHTML = `<div class="bigstar">🌙</div><h2>${L('بكرا منجرّب!', "We'll try again tomorrow!", 'Yarın yine deneriz!')}</h2>
    <p>${L('الجدّة نونا مسكتك ٥ مرات وصار وقت النوم 😴 بس إنت قرّبت كتير!', 'Grandma Nona booped you 5 times — bedtime 😴 but you got so close!', 'Nona Nine seni 5 kez yakaladı — uyku vakti 😴 ama çok yaklaştın!').replace('٥', N(5))}</p>
    <div class="row"><button class="big-btn" id="bRetry">🔁 ${L('من الأول', 'Start over', 'Baştan')}</button><button class="ghost-btn" id="bMenuL">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  $('#bRetry').onclick = () => { SFX.tap(); startGame(); };
  $('#bMenuL').onclick = () => { SFX.tap(); GS = null; showTitle(); };
}

/* ---------- animation of the kid, items, toys ---------- */
function renderKid(dt){
  if(!hero) return;
  hero.grp.position.set(P.x, P.y, P.z); hero.grp.rotation.y = P.face;
  hero.grp.visible = !P.hidden && !(fp && state === 'play');
  const sn = P.mode === 'sneak' ? 1 : 0;
  hero.snk = lerp(hero.snk || 0, sn, Math.min(1, 8 * dt));
  poseHero(hero, { t:T, dt, run:clamp(P.move * (P.mode === 'run' ? 1.15 : 1), 0, 1), grounded:true, vy:0, sq:0, flip:0, sneak:hero.snk, pace:P.mode === 'sneak' ? .6 : 1 });
  if(state === 'title' || state === 'select'){ hero.arms.forEach((a, i) => { if(i === 0 && !a.userData.hold){ a.rotation.z = 2.3 + Math.sin(T * 8) * .3; } }); }
}
function renderItems(dt){
  if(!GS) return;
  for(const id of ['jar', 'key', 'pliers', 'note']){
    const it = GS.items[id], o = IT[id];
    const visible = it.state === 'world' || (it.state === 'held' && o.mesh.parent !== scene);
    o.mesh.visible = visible; o.spr.visible = false;
    if(it.state === 'world'){
      if(o.mesh.parent !== scene) scene.add(o.mesh);
      let y = it.y; if(id === 'key' && keyPop < 1){ keyPop = Math.min(1, keyPop + dt * 2); y += Math.sin(keyPop * Math.PI) * .4; }
      o.mesh.position.set(it.x, y, it.z); if(id !== 'jar') o.mesh.rotation.y = T * .8;
      const needed = id === 'jar' ? !GS.jarOpen : !GS.locks[NEED[id]];
      if(needed && state !== 'title'){ o.spr.visible = true; o.spr.position.set(it.x, it.y + .32, it.z); const s = .55 + Math.sin(T * 3 + it.x) * .15; o.spr.scale.set(s, s, 1); }
    }
  }
  const lid = IT.jar.mesh.userData.lid; if(GS.jarOpen){ lid.position.lerp(_v.set(.18, .22, 0), .2); lid.rotation.z = lerp(lid.rotation.z, -1.2, .2); }
}

/* ---------- main loop ---------- */
let last = performance.now(), fps = 60, fpsN = 0, fpsT = 0, slowT = 0;
function update(dt){
  GS.t += dt;
  stepPlayer(dt); if(!R.co){ updateNona(dt); updateVases(dt); updateLocks(dt); } updateHint(dt);
}
function shadowFollow(){
  const lv = H.lvOf(P.y), st = H.stairAt(P.x, P.z, P.y), fy = st && P.y > LY[st.lo] + 1.8 ? LY[st.hi] : st ? LY[st.lo] : LY[lv];
  const tx = Math.round(P.x * 20) / 20, tz = Math.round(P.z * 20) / 20;
  sun.target.position.set(tx, fy, tz); sun.position.set(tx + .3, fy + 2.85, tz + .22);
}
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){ fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 40){ slowT++; if(slowT >= 2){ slowT = 0; degrade(); } } else slowT = 0; }
  if(R.co && GS) coWorld(dt);       // co-op: the house keeps going whatever this kid is doing (pause, padlock, boop)
  if(state === 'play'){ update(dt); updateCamera(dt); hudFrame(); }
  else if(state === 'caught'){ GS.t += dt; if(!R.co) updateNona(dt); updateCaught(dt); updateCamera(dt); }
  else if(state === 'win' || state === 'won'){ updateWin(dt); }
  else if(state === 'code'){ updateCamera(dt); }
  else if(state === 'title' || state === 'select' || state === 'overview' || state === 'mp'){
    menuT += dt; const a = Math.sin(menuT * .12) * .12;
    const ov = state === 'overview';
    camera.position.set(Math.sin(a) * 33 + .5, ov ? 9 : 4.6, -Math.cos(a) * 33); camera.lookAt(.5, ov ? 2.6 : 3.3, 0);
    camera.fov = 36; camera.updateProjectionMatrix();
  }
  if(state === 'play' || state === 'caught' || state === 'code' || state === 'pause'){ if(camera.fov !== 62){ camera.fov = 62; camera.updateProjectionMatrix(); } }
  if(camOverride){ camera.position.set(camOverride[0], camOverride[1], camOverride[2]); camera.lookAt(camOverride[3], camOverride[4], camOverride[5]); }
  shadowFollow();
  renderKid(dt); renderNona(dt); renderItems(dt); renderPeers(dt); updateParts(dt); updateRings(dt); H.update(dt, T);
  mpFrame(dt);
  if(GS) for(const t of GS.toys) if(!(t.squash > 0)) t.m.scale.set(1, 1, 1);
  if(T < topUntil || (GS && GS.hint)){}
  H.sky.position.copy(camera.position);
  if(state === 'mp' && MP.screen === 'connecting' && (fpsN & 7)) return;     // keep the phone free while it connects
  renderer.render(scene, camera);
}
function degrade(){
  if(quality === 2 && dpr > 1){ dpr = 1; renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); quality = 1; return; }
  if(quality >= 1){ quality = 0; sun.shadow.mapSize.set(512, 512); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } renderer.shadowMap.type = THREE.BasicShadowMap; return; }
}

/* ======================================================================
   Online co-op («👫 العب مع أصحابك»): up to 4 kids in the same house. Nothing is stored on a server.
   The room owner (host) runs Grandma's brain, the noise, the items, the locks and the shared day counter.
   Events: pos (every kid, ≤ 8 a second while moving), st (host snapshot), ev (host events), req (a friend asks the host), lob (lobby)
   Names never travel between phones: only the friend code (presence 'fc'); every phone asks the server for the name (../rt.js).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'st', 'ev', 'req', 'lob'];
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog, reconnect chip) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-granny-' + code, id, events:MP_EVENTS, eps:30, h });
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
    const bc = this.bc = new BroadcastChannel('bobo-granny-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, stT:0, lobT:0, posAt:0, posK:'', inviteFor:null, typed:'', hostGone:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
isHostCo = () => MP.isHost;
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => (typeof id === 'string' && Object.prototype.hasOwnProperty.call(HEROES, id)) ? id : 'sara';
const r2 = v => Math.round(v * 100) / 100;
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
const MODES = ['still', 'sneak', 'walk', 'run'];
/* the kid's own avatar ('me' hero): sent in presence, always repaired by Avatar.normalize before it is built */
const myAv = () => { try{ return heroId === 'me' && window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};                     // keep only small plain values (ids, numbers, flags) before Avatar.normalize looks them up
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }
/* each kid wakes up on their own spot next to the bed */
const BED_OFF = [[0, 0], [.75, 0], [0, .75], [.75, .75]];
bedOff = () => R.co && MP.meta ? BED_OFF[(MP.meta.c | 0) % 4] : [0, 0];
let meSafe = 0;                   // after a boop the kid is left alone for a few seconds

/* «أصحابي»: tell friends which room I'm in. The server may not know the game id: every call is guarded. */
const FR_GAME = 'granny';
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
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0;
  peersSync();
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
  MP.meta = { fc:BoboRT.fc(), hero:heroId, av:myAv(), c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.av = myAv(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { if(MP.screen === 'lobby') mpLobbyDraw(); peersNames(); if(state === 'won' || state === 'lost') redrawEnd(); });
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  if(all.findIndex(p => p.id === MP.id) >= MP_MAX){ coStop(); showTitle(); toast(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  // the owner missing from the list: wait a few seconds (a slow phone can miss a heartbeat) before leaving
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ if(!MP.hostGone) MP.hostGone = performance.now(); }
  else MP.hostGone = 0;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length) SFX.yay();
  peersSync();
  // a friend came in while the house is running: send them the run so they can join in
  if(MP.isHost && R.co && GS && !GS.over && joined.length) coSendStart();
  if(MP.screen === 'lobby') mpLobbyDraw();
}

/* ---------- the other kids in the house ---------- */
const PEERS = new Map();
function peersSync(){
  const ids = new Set();
  for(const p of MP.players){
    if(p.id === MP.id) continue;
    ids.add(p.id);
    let a = PEERS.get(p.id);
    if(!a){
      const lbl = document.createElement('div'); lbl.className = 'ntag'; lbl.hidden = true; stage.appendChild(lbl);
      const hd = new THREE.Group(); hd.position.set(0, .62, .34);
      a = { id:p.id, c:0, hero:null, av:null, avK:'', h:null, holder:hd, lbl, x:0, y:0, z:0, f:0, m:0, tx:0, ty:0, tz:0, tf:0, tm:0, md:'still', hid:-1, seen:false, inRun:false, safe:0, snk:0, nm:'' };
      PEERS.set(p.id, a);
    }
    a.c = p.c | 0;
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(a.hero !== hero || a.avK !== avK){
      if(a.h){ a.h.grp.remove(a.holder); scene.remove(a.h.grp); }
      a.hero = hero; a.av = av; a.avK = avK;
      try{ a.h = hero === 'me' ? HEROES.me(av || undefined) : HEROES[hero](); }catch(e){ a.h = HEROES.sara(); }
      a.h.grp.add(a.holder); a.h.grp.visible = false; scene.add(a.h.grp);
      a.lbl.style.setProperty('--c', HERO_COLOR[hero] || '#ffcd4d');
      if(GS) syncHeld();
    }
  }
  for(const a of [...PEERS.values()]) if(!ids.has(a.id)) peerGone(a);
  peersNames();
}
function peerName(id){ const a = PEERS.get(id); return BoboRT.who(id, a ? HERO_NAME[a.hero] : '') || L('صاحبك', 'Your friend', 'Arkadaşın'); }
function peersNames(){ for(const a of PEERS.values()){ const n = peerName(a.id); if(a.nm !== n){ a.nm = n; a.lbl.textContent = n; } } }
function peerGone(a){
  if(a.h) scene.remove(a.h.grp);
  a.lbl.remove(); PEERS.delete(a.id);
  if(!GS) return;
  if(R.co && MP.isHost && !GS.over){
    // whatever they carried stays where they were
    const id = heldBy(a.id);
    if(id){ const it = GS.items[id]; it.state = 'world'; it.by = ''; it.x = a.tx; it.z = a.tz; it.y = H.groundY(a.tx, a.tz, a.ty); it.lv = H.lvOf(it.y); coShare('drop', { by:a.id, i:id }); }
    if(G.kid === a.id && (G.mode === 'chase' || G.mode === 'toHide' || G.mode === 'shrug')) toTired();
  }
  syncHeld();
}
function renderPeers(dt){
  const inHouse = R.co && GS && (state === 'play' || state === 'pause' || state === 'code' || state === 'caught' || state === 'win' || state === 'won' || state === 'select');
  const k = 1 - Math.exp(-10 * dt), win = state === 'win' || state === 'won';
  for(const a of PEERS.values()){
    if(!a.h) continue;
    const vis = inHouse && a.inRun && a.seen && (a.hid < 0 || win);
    if(!win){
      if(Math.hypot(a.tx - a.x, a.tz - a.z) > 3 || Math.abs(a.ty - a.y) > 1.5){ a.x = a.tx; a.y = a.ty; a.z = a.tz; a.f = a.tf; }
      a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k);
    }
    a.h.grp.visible = vis;
    if(!vis){ a.lbl.hidden = true; continue; }
    a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
    a.snk = lerp(a.snk, a.md === 'sneak' ? 1 : 0, Math.min(1, 8 * dt));
    poseHero(a.h, { t:T + a.c, dt, run:clamp(a.m * (a.md === 'run' ? 1.15 : 1), 0, 1), grounded:true, vy:0, sq:0, flip:0, sneak:a.snk, pace:a.md === 'sneak' ? .6 : 1 });
    // name tag above the head (dimmer behind a wall)
    _v.set(a.x, a.y + (a.hero === 'qamar' ? 1.35 : 1.6), a.z).project(camera);
    const on = _v.z < 1 && Math.abs(_v.x) < 1.02 && Math.abs(_v.y) < 1.02 && !(state === 'caught' && boopT > .9);
    a.lbl.hidden = !on;
    if(on){
      a.lbl.style.left = ((_v.x + 1) / 2 * SW).toFixed(1) + 'px'; a.lbl.style.top = ((1 - _v.y) / 2 * SH).toFixed(1) + 'px';
      if(((T * 4) | 0) % 2 === (a.c & 1)) a.lbl.classList.toggle('far', !win && !H.los({ x:camera.position.x, y:camera.position.y, z:camera.position.z }, { x:a.x, y:a.y + 1.2, z:a.z }));
    }
  }
}

/* ---------- my position for everyone (≤ 8 a second while moving, a slow beat when still) ---------- */
function mpPos(force){
  if(!mpActive() || !R.co || !GS) return;
  const now = performance.now();
  const hid = P.hidden ? HIDES.indexOf(P.hidden) : -1;
  const key = hid + ':' + P.mode + ':' + (state === 'caught' ? 1 : 0);
  const moving = P.move > .03 || Math.hypot(P.vx, P.vz) > .05;
  if(!force){
    if(now - MP.posAt < 125) return;
    if(!moving && key === MP.posK && now - MP.posAt < 1000) return;
  }
  MP.posAt = now; MP.posK = key;
  mpSend('pos', { r:R.n, x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.face), m:r2(P.move), md:P.mode, h:hid });
}
function coPosNow(){ mpPos(true); }
function onPos(p){
  const a = PEERS.get(p.id); if(!a || !R.co || p.r !== R.n || state === 'win' || state === 'won') return;
  a.tx = numIn(p.x, -30, 30); a.ty = numIn(p.y, -6, 12); a.tz = numIn(p.z, -30, 30); a.tf = numIn(p.f, -1e4, 1e4); a.tm = numIn(p.m, 0, 1.5);
  a.md = MODES.includes(p.md) ? p.md : 'walk';
  const h = Number.isInteger(p.h) && p.h >= 0 && p.h < HIDES.length ? p.h : -1;
  if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; a.f = a.tf; }
  a.inRun = true;
  if(h !== a.hid){
    a.hid = h;
    if(h >= 0 && MP.isHost && GS && !GS.over) hideReact(a.id, HIDES[h], a.tx, a.tz);
  }
}

/* ---------- host: share the house ---------- */
const ITEM_ST = ['world', 'held', 'injar', 'used'];
function packShared(){
  const it = {};
  for(const id of ['jar', 'key', 'pliers', 'note']){ const v = GS.items[id]; it[id] = [v.state, r2(v.x), r2(v.y), r2(v.z), v.by || '']; }
  return { d:GS.day, l:[GS.locks.key ? 1 : 0, GS.locks.chain ? 1 : 0, GS.locks.pad ? 1 : 0], j:GS.jarOpen ? 1 : 0, it, v:VASES.map(v => v.down ? 1 : 0) };
}
function coShare(k, extra){ if(R.co && MP.isHost && GS) mpSend('ev', Object.assign({ r:R.n, k, s:packShared() }, extra || {})); }
netFx = o => { if(R.co && MP.isHost) mpSend('ev', Object.assign({ r:R.n }, o)); };
function hostSnap(){
  mpSend('st', { r:R.n, g:[r2(G.x), r2(G.y), r2(G.z), r2(G.face), G.mode, G.act, r2(G.actK), r2(G.speed)], k:G.kid || '', s:packShared() });
}
/* a friend's phone: apply the host's house state; changes play their little effects here too */
function applyShared(s, ev){
  if(!s || typeof s !== 'object' || !GS) return;
  if(s.j && !GS.jarOpen){ GS.jarOpen = true; SFX.jar(); }
  const jarNow = GS.jarOpen && keyPop >= 1 && GS.items.key.state === 'injar';
  if(s.it && typeof s.it === 'object') for(const id of ['jar', 'key', 'pliers', 'note']){
    const r = s.it[id]; if(!Array.isArray(r)) continue;
    const it = GS.items[id], st = ITEM_ST.includes(r[0]) ? r[0] : it.state, by = typeof r[4] === 'string' ? r[4].slice(0, 40) : '';
    if(st === 'held' && by === MP.id && !(it.state === 'held' && it.by === MP.id)){
      SFX.pickup(); burst(it.x, it.y + .2, it.z, 14, ['#fff1a0', '#ffffff', '#ffcd4d'], { speed:1.5, up:2, g:3, life:.8, size:.7 });
      if(!GS.locks[NEED[id]]) bubbleTop(INFO[id].e + ' ' + INFO[id].n + ' — ' + L('روح عالباب الكبير تحت 🚪', 'take it to the big front door downstairs 🚪', 'aşağıdaki büyük kapıya götür 🚪'), 3);
    }
    if(st !== it.state || by !== it.by) progress();
    it.state = st; it.by = st === 'held' ? by : '';
    it.x = numIn(r[1], -30, 30, it.x); it.y = numIn(r[2], -6, 12, it.y); it.z = numIn(r[3], -30, 30, it.z); it.lv = H.lvOf(it.y);
  }
  if(jarNow && GS.items.key.state === 'world') jarFx();
  syncHeld();
  if(Array.isArray(s.l)) ['key', 'chain', 'pad'].forEach((lk, i) => { if(s.l[i] && !GS.locks[lk]){ GS.locks[lk] = true; lockFx(lk); progress(); afterLock(); } });
  if(Array.isArray(s.v)) s.v.forEach((d, i) => { if(d && VASES[i] && !VASES[i].down) vaseFx(i, ev && ev.k === 'vase' && ev.i === i ? numIn(ev.f, -7, 7) : 0); });
  const d = numIn(s.d, 1, DAYS + 1, GS.day) | 0; if(d !== GS.day) GS.day = d;
}
const GT = { x:0, y:0, z:0, f:0, set:false };
function onSnap(p){
  if(MP.isHost || !R.co || !GS || p.r !== R.n || GS.over) return;
  const g = p.g;
  if(Array.isArray(g)){
    GT.x = numIn(g[0], -30, 30); GT.y = numIn(g[1], -6, 12); GT.z = numIn(g[2], -30, 30); GT.f = numIn(g[3], -1e4, 1e4);
    if(!GT.set){ GT.set = true; G.x = GT.x; G.y = GT.y; G.z = GT.z; G.face = GT.f; }
    const md = String(g[4]); if(['sleep', 'wake', 'curious', 'search', 'wander', 'chase', 'toHide', 'shrug', 'tired', 'boop', 'wave'].includes(md)){ if(md === 'sleep' && G.mode !== 'sleep'){ G.x = GT.x; G.y = GT.y; G.z = GT.z; } G.mode = md; }
    const act = String(g[5]); if(['walk', 'yawn', 'look', 'shrug', 'boop', 'wave'].includes(act)) G.act = act;
    G.actK = numIn(g[6], 0, 1.5); G.speed = numIn(g[7], 0, 8);
  }
  G.kid = typeof p.k === 'string' ? p.k : '';
  applyShared(p.s);
}
/* a friend's phone: grandma moves smoothly between the host's snapshots */
function clientNona(dt){
  const k = 1 - Math.exp(-10 * dt);
  if(Math.hypot(GT.x - G.x, GT.z - G.z) > 3 || Math.abs(GT.y - G.y) > 1.5){ G.x = GT.x; G.y = GT.y; G.z = GT.z; }
  G.x = lerp(G.x, GT.x, k); G.y = lerp(G.y, GT.y, k); G.z = lerp(G.z, GT.z, k); G.face += angDiff(GT.f, G.face) * k;
  if(G.mode === 'sleep') snore(dt);
  if(state === 'play'){ if(G.mode === 'chase' && G.kid === MP.id){ if(A.musicMode !== 'chase') A.setMode('chase'); } else if(A.musicMode === 'chase') A.setMode('calm'); }
}
/* the house keeps going in co-op whatever this kid is doing */
function coWorld(dt){
  if(!GS || GS.over || !(state === 'play' || state === 'pause' || state === 'code' || state === 'caught' || state === 'select')) return;
  if(state !== 'play' && state !== 'caught') GS.t += dt;
  if(MP.isHost) updateNona(dt); else clientNona(dt);
  updateVases(dt); updateLocks(dt);
}
/* a friend's phone: noise and actions go to the host */
function coReq(p){ coPosNow(); mpSend('req', Object.assign({ r:R.n }, p)); }
function coNoise(x, y, z, Rr, kind){ if(R.co && GS && !GS.over) coReq({ k:'n', x:r2(x), y:r2(y), z:r2(z), R:r2(Rr) }); }
function coAsk(c){
  if(c.k === 'pick') coReq({ k:'pick', i:c.id });
  else if(c.k === 'drop') coReq({ k:'drop', x:r2(P.x + Math.sin(P.face) * .45), z:r2(P.z + Math.cos(P.face) * .45) });
  else if(c.k === 'jar') coReq({ k:'jar' });
  else if(c.k === 'use') coReq({ k:'use' });
  SFX.tap();
}
/* host: a friend asks */
function onReq(p){
  if(!MP.isHost || !R.co || !GS || GS.over || p.r !== R.n) return;
  const a = PEERS.get(p.id); if(!a || !a.seen) return;
  const k = kidById(a.id); if(!k) return;
  const near = (x, y, z, r) => Math.hypot(k.x - x, k.z - z) < r && Math.abs(k.y - y) < 2;
  const nearDoorK = () => H.lvOf(k.y) === 1 && Math.abs(k.y) < .8 && Math.hypot(k.x - .5, k.z + 6.3) < 2.6;
  if(p.k === 'n'){
    const x = +p.x, y = +p.y, z = +p.z, rr = numIn(p.R, 0, 12);
    if(isFinite(x) && isFinite(y) && isFinite(z) && near(x, y, z, 5)){ ring(x, y, z, rr); hearNoise(x, y, z, rr); }
  }
  else if(p.k === 'pick'){ if(['key', 'pliers', 'note'].includes(p.i)){ const it = GS.items[p.i]; if(it.state === 'world' && near(it.x, it.y, it.z, 2.4)) pickUp(p.i, a.id); } }
  else if(p.k === 'drop'){ dropHeld(true, a.id, { x:numIn(p.x, -30, 30), z:numIn(p.z, -30, 30) }); }
  else if(p.k === 'jar'){ const j = GS.items.jar; if(!GS.jarOpen && near(j.x, j.y, j.z, 2.4)) openJar(a.id); }
  else if(p.k === 'use'){ if(nearDoorK()) useOnDoor(a.id); }
  else if(p.k === 'pad'){ if(nearDoorK()) padOpen(a.id); }
  else if(p.k === 'vase'){ const i = p.i | 0, v = VASES[i]; if(v && !v.down && near(v.x, v.y, v.z, 2.6)) knockVase(i, k.x, k.z); }
}

/* ---------- boops in co-op: only that kid goes to bed, the team keeps going; 5 boops for the team = «بكرا منجرّب!» ---------- */
function coBoop(k){
  G.mode = 'boop'; G.t = 0; G.kid = k.id; G.path = [];
  say('boop'); SFX.boop(); netFx({ k:'sfx', n:'boop' });
  if(k.peer) k.peer.safe = T + 5;
  mpSend('ev', { r:R.n, k:'boop', t:k.id, s:packShared() });
  onBoop(k.id);
}
function onBoop(t){
  if(t === MP.id) coBoopMe();
  else bubbleTop('🪶 ' + peerName(t) + ' ' + L('رجع عالتخت! كمّلوا 💪', 'went back to bed! Keep going 💪', 'yatağa döndü! Devam edin 💪'), 2.8);
}
function coAfterBoop(){
  const who = G.kid; const id = heldBy(who); if(id) itemHome(id);
  GS.day++;
  if(GS.day > DAYS){ GS.over = true; mpSend('ev', { r:R.n, k:'lose', s:packShared() }); showLose(); return; }
  G.mode = 'sleep'; G.t = 0; G.sleepT = 0; G.wakeAt = lerp(D().selfWake[0], D().selfWake[1], Math.random()); G.path = []; G.tgt = null; G.spotT = 0; G.chaseT = 0; G.speed = 0; G.kid = '';
  placeNonaInBed();
  coShare('day', { t:who });
  onDay();
}
function onDay(){ if(state === 'play') bubbleTop('☀️ ' + L('اليوم ', 'Day ', 'Gün ') + N(GS.day) + '/' + N(DAYS) + ' · ' + L('الجدّة رجعت تنام 😴', 'Grandma went back to sleep 😴', 'Büyükanne yine uyudu 😴'), 2.6); }
function coBoopMe(){
  if(state === 'win' || state === 'won' || state === 'lost') return;
  $('#code').hidden = true; if(state === 'pause' || state === 'select'){ overlay.hidden = true; setPlayUI(true); }
  if(P.hidden) exitHide();
  state = 'caught'; boopT = 0; updateCaught.reset = false; meSafe = T + 5; clearInput(); A.setMode('calm');
  setTimeout(() => { SFX.feathers(); burst(P.x, P.y + 1.0, P.z, 40, ['#ffffff', '#fff3f8', '#ffe3ef'], { speed:2.2, up:2.2, g:1.2, drag:2.4, life:2.6, size:1.4, sway:.8 }); }, 380);
}
function updateCaughtCo(dt){
  boopT += dt;
  const ov = $('#sleepov');
  if(boopT > .9 && ov.hidden && !updateCaught.reset){
    ov.hidden = false; ov.classList.remove('out');
    const next = GS.day + 1;
    $('#sleepT').textContent = L('بوووب! 🪶 رجعت عالتخت', 'Boop! 🪶 Back to bed', 'Bup! 🪶 Yatağa geri');
    $('#sleepS').textContent = next <= DAYS ? L('اليوم ', 'Day ', 'Gün ') + N(next) + L(' من ', ' of ', ' / ') + N(DAYS) + ' · 👫 ' + L('أصحابك لسّا عم يدوّروا!', 'your friends keep looking!', 'arkadaşların aramaya devam!') : L('خلصت الأيام…', 'No more days…', 'Günler bitti…');
    A.music(false);
  }
  if(boopT > 2.2 && !updateCaught.reset){ updateCaught.reset = true; wakeInBed(); coPosNow(); }
  if(boopT > 3.4){ updateCaught.reset = false; ov.classList.add('out'); setTimeout(() => { ov.hidden = true; }, 500); state = 'play'; setPlayUI(true); for(const k in hudCache) delete hudCache[k]; A.music(true, 'calm'); bubbleTop(L('يلّا كمّل! انتبه عالجدّة 👵🏻', 'Off you go! Watch out for Grandma 👵🏻', 'Hadi devam! Büyükanneye dikkat 👵🏻'), 2.5); }
}

/* ---------- win together ---------- */
function coWin(){
  if(!GS || GS.over) return;
  GS.over = true;
  const days = GS.day, secs = Math.round(GS.t), stars = starsFor(days, secs);
  GS.result = { stars, days, secs };
  mpSend('ev', { r:R.n, k:'win', res:GS.result, s:packShared() });
  startWin();
}
function coWinPlace(){
  if(!R.co) return;
  const offs = [[-.75, .5], [.75, .5], [0, 1.1]];
  [...PEERS.values()].filter(a => a.inRun).sort((p, q) => p.c - q.c).forEach((a, i) => { const o = offs[i % 3]; a.winI = i; a.wx = .5 + o[0]; a.wz = -5.6 + o[1]; a.x = a.wx; a.z = a.wz; a.y = 0; a.f = Math.PI; a.hid = -1; a.seen = true; });
}
function coWinFrame(t){
  if(!R.co) return;
  for(const a of PEERS.values()){
    if(a.winI == null || !a.inRun) continue;
    const w = clamp((t - 1.15 - a.winI * .2) / 2.6, 0, 1);
    a.z = lerp(a.wz, -12.5 + a.winI * .4, w); a.x = a.wx + Math.sin(w * 6 + a.winI) * .2; a.f = Math.PI; a.m = w > 0 && w < 1 ? 1 : 0; a.md = 'run'; a.y = H.groundY(a.x, a.z, a.y);
  }
}
/* everyone on one card, with the team's stars */
function teamList(){
  const out = [{ id:MP.id, hero:heroId, av:myAv(), me:true, c:MP.meta ? MP.meta.c : 0 }];
  for(const a of PEERS.values()) if(a.inRun && a.h) out.push({ id:a.id, hero:a.hero, av:a.av, c:a.c });
  return out.sort((p, q) => p.c - q.c);
}
function teamSlots(stars){
  return `<div class="pslots">${teamList().map(p => `<div class="pslot" style="--c:${HERO_COLOR[p.hero] || '#ffcd4d'}"><img src="${p.me ? charImg(p.hero) : heroPic(p.hero, p.av)}" alt=""><span dir="auto">${p.me ? L('إنت', 'You', 'Sen') : BoboRT.whoH(p.id, HERO_NAME[p.hero])}${p.id === MP.hostId ? ' 👑' : ''}</span>${stars != null ? `<small>${'⭐'.repeat(stars)}</small>` : ''}</div>`).join('')}</div>`;
}
function endButtons(){
  return `<div class="row">${MP.isHost ? `<button class="big-btn" id="bAgainCo">🔁 ${L('كمان مرة', 'Play again', 'Tekrar oyna')}</button>` : `<p>${L('استنّى صاحب الغرفة…', 'Waiting for the room owner…', 'Oda sahibini bekle…')}</p>`}
    <button class="ghost-btn" id="bLeaveCo">🚪 ${L('اطلع من الغرفة', 'Leave the room', 'Odadan çık')}</button></div>`;
}
function wireEnd(){
  const a = $('#bAgainCo'); if(a) a.onclick = () => { SFX.tap(); updateWin.shown = false; coStartRun(); };
  $('#bLeaveCo').onclick = () => { SFX.tap(); updateWin.shown = false; coStop(); showTitle(); };
}
let coinsGiven = -1;
function showWinCo(){
  const r = GS.result || { stars:starsFor(GS.day, Math.round(GS.t)), days:GS.day, secs:Math.round(GS.t) };
  const stars = clamp(r.stars | 0, 1, 3), days = clamp(r.days | 0, 1, DAYS), secs = clamp(r.secs | 0, 0, 36000);
  const coins = [0, 5, 10, 15][stars];
  if(coinsGiven !== R.n){
    coinsGiven = R.n;
    if(window.World) World.addCoins(coins, L('من بيت الجدّة نونا', "for Grandma Nona's House", 'Nona Ninenin Evi için'));
    if(window.World && World.track) try{ World.track('win', 'granny'); }catch(e){}
    if(stars > (+rawGet('granny_best') || 0)) rawSet('granny_best', String(stars));
  }
  GS.result = { stars, coins, days, secs, team:true };
  state = 'won'; showOverlay('clear'); card.className = 'card wide';
  redrawEnd();
}
function showLoseCo(){
  state = 'lost'; setPlayUI(false); $('#sleepov').hidden = true; $('#code').hidden = true; showOverlay('dim'); card.className = 'card wide'; A.music(false);
  redrawEnd();
}
function redrawEnd(){
  if(!R.co || !GS) return;
  if(state === 'won'){
    const r = GS.result, mm = Math.floor(r.secs / 60), ss = r.secs % 60;
    card.innerHTML = `<div class="bigstar">${'⭐'.repeat(r.stars)}${'<span class="off">⭐</span>'.repeat(3 - r.stars)}</div>
      <h2>🎉 ${L('هربنا من البيت سوا!', 'We escaped together!', 'Evden birlikte kaçtık!')}</h2>
      ${teamSlots(r.stars)}
      <div class="tally"><span>☀️ ${N(r.days)} ${L(r.days === 1 ? 'يوم' : 'أيام', r.days === 1 ? 'day' : 'days', 'gün')}</span><span>⏱️ ${N(mm)}:${N((ss < 10 ? '0' : '') + ss)}</span><span>🪙 +${N(r.coins)}</span></div>
      ${endButtons()}`;
  } else if(state === 'lost'){
    card.innerHTML = `<div class="bigstar">🌙</div><h2>${L('بكرا منجرّب!', "We'll try again tomorrow!", 'Yarın yine deneriz!')}</h2>
      <p>${L('الجدّة نونا مسكت الفريق ٥ مرات وصار وقت النوم 😴 بس قرّبتوا كتير!', 'Grandma Nona booped the team 5 times — bedtime 😴 but you got so close!', 'Nona Nine takımı 5 kez yakaladı — uyku vakti 😴 ama çok yaklaştınız!').replace('٥', N(5))}</p>
      ${teamSlots(null)}
      ${endButtons()}`;
  } else return;
  wireEnd();
}

/* ---------- starting a run ---------- */
function coSendStart(){ mpSend('ev', { r:R.n, k:'start', n:R.n, plan:GS.plan, diff:diffId, s:packShared(), t:Math.round(GS.t) }); }
function coStartRun(){
  if(!MP.isHost || !mpActive()) return;
  R.n++;
  const plan = makePlan();
  R.co = true; MP.screen = 'in';
  coBegin(plan);
  coSendStart();
}
function coBegin(plan){
  for(const a of PEERS.values()){ a.inRun = false; a.seen = false; a.hid = -1; a.safe = 0; a.winI = null; }
  GT.set = false; meSafe = 0; updateCaught.reset = false; updateWin.shown = false;
  $('#sleepov').hidden = true; $('#code').hidden = true;
  startGame(plan);
  G.kid = '';
  coPosNow();
}
function onStart(p){
  const plan = okPlan(p.plan); if(!plan) return;
  const n = p.n | 0;
  if(R.co && n === R.n && GS && !GS.over) return;     // already in this run
  if(MP.screen !== 'lobby' && MP.screen !== 'in') return;
  R.n = n; R.co = true; MP.screen = 'in';
  diffId = p.diff === 'normal' ? 'normal' : 'easy';
  coBegin(plan);
  applyShared(p.s); GS.t = numIn(p.t, 0, 36000);
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'req'){ onReq(p); return; }
  if(p.id !== MP.hostId) return;                    // only the room owner decides
  if(ev === 'lob'){ if(!MP.isHost){ if(p.diff === 'easy' || p.diff === 'normal') MP.diff = p.diff; if(MP.screen === 'lobby') mpLobbyDraw(); } return; }
  if(MP.isHost) return;
  if(ev === 'st'){ onSnap(p); return; }
  if(ev !== 'ev') return;
  if(p.k === 'start'){ onStart(p); return; }
  if(!R.co || !GS || p.r !== R.n) return;
  if(p.k === 'say'){ const l = Object.prototype.hasOwnProperty.call(LINES, p.c) ? LINES[p.c] : null; if(l && l[p.i | 0]){ A.mumble(5, p.c === 'spot' ? 260 : 210); bubbleNona(l[p.i | 0], 2.6); } }
  else if(p.k === 'mk'){ showMark(p.m ? excl : ques, numIn(p.s, .2, 3, 1)); }
  else if(p.k === 'sfx'){ if(p.n === 'wake') SFX.wake(); else if(p.n === 'spot') SFX.spot(); else if(p.n === 'boop') SFX.boop(); }
  else if(p.k === 'boop'){ applyShared(p.s); if(typeof p.t === 'string') onBoop(p.t); }
  else if(p.k === 'day'){ applyShared(p.s); onDay(); }
  else if(p.k === 'win'){ if(GS.over) return; applyShared(p.s); GS.over = true; GS.result = p.res && typeof p.res === 'object' ? { stars:p.res.stars, days:p.res.days, secs:p.res.secs } : null; startWin(); }
  else if(p.k === 'lose'){ if(GS.over) return; applyShared(p.s); GS.over = true; showLose(); }
  else applyShared(p.s, p);
}
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){
    MP.hostGone = 0; coStop(); showTitle();
    toast(L('صاحب الغرفة طلع 🚪 بتقدر تلعب لحالك أو تعمل غرفة جديدة', 'The room owner left 🚪 play alone or make a new room', 'Oda sahibi çıktı 🚪 tek başına oyna ya da yeni oda kur'), 5000);
    return;
  }
  MP.stT -= dt; MP.lobT -= dt;
  if(R.co && GS && !GS.over && state !== 'mp') mpPos(false);
  if(MP.isHost && R.co && GS && !GS.over && MP.stT <= 0){ MP.stT = .15; hostSnap(); }
  if(MP.isHost && MP.screen === 'lobby' && MP.lobT <= 0){ MP.lobT = 1; mpSend('lob', { diff:diffId, ph:'idle' }); }
}
/* leave the room and the co-op run */
function coStop(){
  const was = R.co;
  MP.tok++; mpClose(); MP.screen = 'off'; R.co = false; meSafe = 0; GT.set = false;
  for(const a of [...PEERS.values()]) peerGone(a);
  if(was){ GS = null; held = null; }
}

/* ---------- menu, lobby, keypad ---------- */
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }
function mpCard(wide){ state = 'mp'; setPlayUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function myHeroBtn(){ return `<button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>`; }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; R.co = false; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>👵🏻 ${L('لحتى 4 أصحاب ببيت الجدّة سوا: دوّروا عالأغراض وافتحوا الباب مع بعض!', "Up to 4 friends in Grandma's house: find the things and open the door together!", 'Büyükannenin evinde 4 arkadaşa kadar: eşyaları bulun, kapıyı birlikte açın!')}</p>
    ${myHeroBtn()}
    <div class="row"><button class="big-btn" id="bCreate">🏠 ${L('اعمل غرفة', 'Create room', 'Oda kur')}</button>
    <button class="big-btn mint" id="bJoin">🔢 ${L('فوت على غرفة', 'Join room', 'Odaya katıl')}</button></div>
    <div class="row"><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bCreate').onclick = () => { SFX.tap(); mpCreate(); };
  $('#bJoin').onclick = () => { SFX.tap(); mpKeypad(''); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function mpBack(){
  if(MP.screen === 'menu') showTitle();
  else if(MP.screen === 'lobby'){ mpLeave(); mpMenu(); }
  else mpMenu();
}
function mpBackFromSelect(){ if(mpActive() && MP.screen === 'lobby'){ mpTrack(); mpLobby(); } else mpMenu(); }
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; R.co = false; }
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
/* the room's waiting card: who is here, the room number and (for the owner) «ابدأ» */
function mpLobby(){
  if(!mpActive()){ mpMenu(); return; }
  R.co = false; MP.screen = 'lobby'; MP.diff = MP.diff || diffId; mpCard(true); mpLobbyDraw();
  if(MP.isHost) mpSend('lob', { diff:diffId, ph:'idle' });
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wait">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), me = p.id === MP.id;
    return `<div class="pslot" style="--c:${HERO_COLOR[hero]}"><img src="${me ? charImg(hero) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${me ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  const dname = d => d === 'normal' ? '🙂 ' + L('عادي', 'Normal', 'Normal') : '😊 ' + L('سهل', 'Easy', 'Kolay');
  card.innerHTML = `<h2>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    ${MP.isHost ? `<p>${L('قلّ لأصحابك رقم الغرفة 👆', 'Tell your friends the room number 👆', 'Arkadaşlarına oda numarasını söyle 👆')}</p>
      <div class="row" style="align-items:center"><div class="seg" role="radiogroup"><button class="${diffId === 'easy' ? 'on' : ''}" data-d="easy" role="radio" aria-checked="${diffId === 'easy'}">${dname('easy')}</button><button class="${diffId === 'normal' ? 'on' : ''}" data-d="normal" role="radio" aria-checked="${diffId === 'normal'}">${dname('normal')}</button></div>${myHeroBtn()}</div>
      <div class="row"><button class="big-btn" id="bStart">▶️ ${L('ابدأ', 'Start', 'Başla')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>${dname(MP.diff || 'easy')} · ${L('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    card.querySelectorAll('.seg button').forEach(b => b.onclick = () => { diffId = b.dataset.d; rawSet('granny_diff', diffId); SFX.tap(); mpSend('lob', { diff:diffId, ph:'idle' }); mpLobbyDraw(); });
    $('#bStart').onclick = () => { A.ac(); SFX.tap(); coStartRun(); };
  }
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); mpMenu(); };
}
async function mpCreate(want){
  mpConnecting();
  const limit = performance.now() + 20000;
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpenRetry(code, 'create', limit);
      if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
      if(r === 'ok'){ mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpCreate(want)); }
}
/* one more try when the connection was slow (a busy phone can miss the first join); gives up at `until` */
async function mpOpenRetry(code, how, until){
  for(;;){
    try{ return await mpOpen(code, how); }
    catch(e){ if(String(e && e.message) === 'cancelled' || MP.screen !== 'connecting' || performance.now() > until - 3000) throw e; await new Promise(r => setTimeout(r, 800)); if(MP.screen !== 'connecting') throw new Error('cancelled'); }
  }
}
async function mpJoin(code, until){
  mpConnecting();
  const limit = until || performance.now() + 20000;
  try{
    let r = await mpOpenRetry(code, 'join', limit);
    if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    while(r === 'nobody' && until && performance.now() < until){
      await new Promise(res => setTimeout(res, 700)); if(MP.screen !== 'connecting') return;
      r = await mpOpenRetry(code, 'join', limit); if(MP.screen !== 'connecting'){ if(r === 'ok') mpLeave(); return; }
    }
    if(r === 'ok'){ mpLobby(); mpSend('lob', { ask:1 }); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ MP.err = String(e && (e.stack || e.message)).slice(0, 400); if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'granny': guarded. */
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
  else if(k === 'ok'){ if(MP.typed.length === 4) mpJoin(MP.typed); else SFX.wrong(); return; }
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
window.__granny = {
  get state(){ return state; }, get diff(){ return diffId; }, get fps(){ return fps; }, get dpr(){ return dpr; }, get hero(){ return heroId; },
  get day(){ return GS && GS.day; }, get locks(){ return GS && Object.assign({}, GS.locks); }, get held(){ return held; }, get code(){ return GS && GS.code.slice(); },
  get player(){ return { x:P.x, y:P.y, z:P.z, lv:H.lvOf(P.y), hidden:P.hidden && P.hidden.kind, mode:P.mode, room:H.roomOf(P.x, P.y, P.z) }; },
  get grandma(){ return { x:G.x, y:G.y, z:G.z, mode:G.mode, lv:H.lvOf(G.y), room:H.roomOf(G.x, G.y, G.z), tgt:G.tgt, path:G.path.length }; },
  get items(){ return GS ? Object.fromEntries(Object.entries(GS.items).map(([k, v]) => [k, { x:v.x, y:v.y, z:v.z, lv:v.lv, state:v.state }])) : null; },
  get ctx(){ const c = context(); return c && c.k; }, get result(){ return GS && GS.result; }, get hides(){ return HIDES.map(h => ({ kind:h.kind, x:h.x, z:h.z, lv:h.lv, out:h.out })); },
  start(d){ if(d) diffId = d; startGame(); }, title:() => showTitle(), back(){ if(state === 'select' && selFrom === 'pause') showPause(true); else if(state === 'select' && selFrom === 'mp') mpBackFromSelect(); else if(state === 'mp') mpBack(); else showTitle(); }, pause:() => showPause(), resume:() => resume(), act:() => doAction(),
  teleport(x, z, lv){
    if(typeof x === 'string'){ const n = x; if(n === 'door'){ x = .5; z = -5.6; lv = 1; } else if(GS.items[n]){ const it = GS.items[n]; const o = { x:it.x + .6, z:it.z }; lv = it.lv; const free = [[.7, 0], [-.7, 0], [0, .7], [0, -.7], [.9, .5], [-.9, .5], [.5, -.9]].map(([a, b]) => ({ x:it.x + a, z:it.z + b })).find(q => H.floorAt(lv, q.x, q.z) && !H.blocked(q.x, LY[lv] + .5, q.z, .3) && !H.blocked(q.x, LY[lv] + .2, q.z, .3)) || o; x = free.x; z = free.z; } else if(H.ROOM[n]){ const r = H.ROOM[n]; x = r.c[0]; z = r.c[1]; lv = r.lv; } }
    if(P.hidden) exitHide(); P.x = x; P.z = z; P.y = LY[lv != null ? lv : H.lvOf(P.y)]; P.vx = P.vz = 0; snapCam = true; return this.player;
  },
  face(a){ P.face = a; cam.yaw = a + Math.PI; snapCam = true; },
  hideAt(kind){ const h = HIDES.find(h => h.kind === kind); if(!h) return null; this.teleport(h.out.x, h.out.z, H.lvOf(h.y + .1)); enterHide(h); return h.kind; },
  setGrandma(x, z, lv, mode){ G.x = x; G.z = z; G.y = LY[lv]; G.mode = mode || 'wander'; G.t = 0; G.path = []; G.wanderLeft = 30; if(mode === 'chase'){ G.chaseT = 0; G.lostT = 0; G.lastSeen = { x:P.x, y:P.y, z:P.z }; } return this.grandma; },
  faceGrandmaTo(x, z){ G.face = Math.atan2(x - G.x, z - G.z); },
  noise(x, y, z, R){ makeNoise(x, y, z, R, 'test'); return this.grandma; },
  setRun(b){ runOn = b; }, setFP(b){ fp = b; snapCam = true; }, setDiff(d){ diffId = d; },
  /* run the simulation n seconds without waiting for frames (deterministic tests) */
  sim(sec, input){ const dt = 1 / 30; for(let i = 0; i < sec * 30; i++){ T += dt; if(input){ joy.x = input.x || 0; joy.y = input.y || 0; } if(state === 'play') update(dt); else if(state === 'caught'){ GS.t += dt; updateNona(dt); updateCaught(dt); } else if(state === 'win' || state === 'won') updateWin(dt); } joy.x = joy.y = 0; return state; },
  enterCode(arr){ arr.forEach(i => codeTap(i)); }, openCode:() => openCode(),
  overview(){ state = 'overview'; overlay.hidden = true; setPlayUI(false); H.setTitle(true); camera.clearViewOffset(); placeTitleScene(); },
  cam(a){ camOverride = a; }, peek:(y, p) => { cam.peekY = y; cam.peekP = p || 0; }, yaw(a, p){ cam.yaw = a; if(p != null) cam.pitch = p; snapCam = true; },
  hint(){ if(GS){ GS.progressT = GS.t - HINT_AFTER - 1; } }, get arrow(){ return arrow.visible; },
  H, wakeNona:() => wakeNona(null, 'self'), knock:(i) => knockVase(i), get vases(){ return VASES.map(v => v.down); },
  /* online co-op */
  get mpScreen(){ return MP.screen; }, get co(){ return R.co; }, get run(){ return R.n; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, hostId:MP.hostId, screen:MP.screen, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero, c:p.c })) }; },
  get peers(){ return [...PEERS.values()].map(a => ({ id:a.id, hero:a.hero, x:a.x, y:a.y, z:a.z, hid:a.hid, inRun:a.inRun, seen:a.seen, visible:!!(a.h && a.h.grp.visible), label:a.lbl.hidden ? null : a.lbl.textContent, held:heldBy(a.id) })); },
  get itemsBy(){ return GS ? Object.fromEntries(['key', 'pliers', 'note'].map(id => [id, GS.items[id].state === 'held' ? GS.items[id].by : GS.items[id].state])) : null; },
  get kid(){ return G.kid; }, get mpErr(){ return MP.err || ''; }, get over(){ return GS && GS.over; },
  mpMenu:() => mpMenu(), mpCreate:(c) => mpCreate(c), mpJoin:(c) => mpJoin(c), mpStart:() => coStartRun(), mpLeave:() => { coStop(); showTitle(); },
  pos:() => coPosNow()
};

/* ---------- boot ---------- */
setHero(heroId);
resize();
showTitle();
requestAnimationFrame(frame);
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one
   (it keeps trying for 20 s while nobody is there yet, e.g. friends coming from the island portal at the same moment) */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
