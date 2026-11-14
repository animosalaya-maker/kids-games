/* «بيت الجدّة نونا» — Escape Grandma Nona's House.
   A gentle sneak-and-escape game: find the key (in the cookie jar), the pliers and the colour note,
   open the three locks on the front door, and don't wake the sleepy grandma. If she catches you: a soft
   pillow "boop", and you wake up in bed for the next day. 5 days to escape. */
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

function newRun(){
  const used = [];
  const far = (s) => used.every(u => Math.hypot(u.x - s.x, u.z - s.z) > 1 || u.lv !== s.lv);
  const choose = (list) => { const l = shuffle(list.slice()); const s = l.find(s => far(s) && !used.some(u => u.room === s.room)) || l.find(far) || l[0]; used.push(s); return s; };
  const jarS = choose(SPOTS.jar), plS = choose(SPOTS.pliers), noS = choose(SPOTS.note);
  const code = shuffle([0, 1, 2, 3, 4, 5]).slice(0, 3);
  IT.note.mesh.clear(); IT.note.mesh.add(makeNote(code));
  GS = { day:1, t:0, code, jarOpen:false, locks:{ key:false, chain:false, pad:false }, progressT:0, hint:false, over:false, stats:{ noise:0 },
    toys:[], creaks:[], items:{
      jar:{ x:jarS.x, y:jarS.y, z:jarS.z, lv:jarS.lv, state:'world', home:jarS },
      key:{ x:jarS.x, y:jarS.y, z:jarS.z, lv:jarS.lv, state:'injar', home:null },
      pliers:{ x:plS.x, y:plS.y, z:plS.z, lv:plS.lv, state:'world', home:plS },
      note:{ x:noS.x, y:noS.y, z:noS.z, lv:noS.lv, state:'world', home:noS }
    } };
  IT.jar.mesh.userData.lid.position.set(0, .3, 0); IT.jar.mesh.userData.lid.rotation.set(0, 0, 0);
  // squeaky toys (away from items, hide spots and doors)
  const bad = (s) => used.some(u => u.lv === s.lv && Math.hypot(u.x - s.x, u.z - s.z) < 1.4) || HIDES.some(h => h.lv === s.lv && Math.hypot(h.out.x - s.x, h.out.z - s.z) < 1.1);
  const toys = shuffle(SPOTS.toy.filter(s => !bad(s))).slice(0, 5);
  toyPool.forEach((t, i) => { const s = toys[i]; t.m.visible = !!s; if(s){ t.m.position.set(s.x, s.y, s.z); t.m.rotation.y = Math.random() * 6; GS.toys.push({ x:s.x, y:s.y, z:s.z, lv:s.lv, m:t.m, cd:0 }); } });
  const woody = SPOTS.creak.filter(s => { const r = H.roomAt(s.lv, s.x, s.z); return r && (r.floor === 'wood' || r.floor === 'attic'); });
  shuffle(woody).slice(0, 6).forEach((s, i) => { const m = creakPool[i]; m.visible = true; m.position.set(s.x, s.y + .013, s.z); m.rotation.y = (i % 2) * Math.PI / 2; GS.creaks.push({ x:s.x, y:s.y, z:s.z, lv:s.lv, cd:0 }); });
  creakPool.forEach((m, i) => { if(i >= GS.creaks.length) m.visible = false; });
  VASES.forEach((v, i) => { v.down = false; v.cb.off = false; const m = vaseMeshes[i]; m.position.set(v.x, v.y, v.z); m.rotation.set(0, 0, 0); });
  // door and locks
  LOCK.key.done = LOCK.chain.done = LOCK.pad.done = false;
  LOCK.key.key.visible = false; LOCK.key.key.rotation.set(0, Math.PI / 2, 0);
  LOCK.chain.obj.visible = true; LOCK.chain.obj.position.set(0, 0, -6.86); LOCK.chain.obj.rotation.set(0, 0, 0);
  LOCK.pad.obj.visible = true; LOCK.pad.obj.position.set(.5, .62, -6.82); LOCK.pad.obj.rotation.set(0, 0, 0); LOCK.pad.dots.forEach(d => d.material.color.set(0xffffff));
  H.leaves.forEach(l => l.rotation.y = 0); H.doorCol.off = false;
  H.setSunny(false); scene.fog.color.set(0x4a3f7a); hemi.color.set(0xfff0dc); hemi.groundColor.set(0x9a7f86); hemi.intensity = 1.6;
  held = null; holder.clear();
  newDay(true);
}
function newDay(first){
  // you wake up in your bed
  P.x = -7.25; P.z = -4.55; P.y = LY[2]; P.vx = P.vz = 0; P.face = Math.PI / 2; P.hidden = null; P.move = 0;
  if(hero) hero.grp.visible = true;
  cam.yaw = P.face + Math.PI; cam.pitch = .38; snapCam = true; peek(null);
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
function knockVase(i){
  const v = VASES[i]; if(v.down) return;
  v.down = true; v.cb.off = true; v.fall = 0; v.fdir = Math.atan2(v.x - P.x, v.z - P.z);
  SFX.vase(); makeNoise(v.x, v.y, v.z, 11, 'vase');
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
  if(state !== 'play' || G.mode === 'chase' || G.mode === 'boop' || G.mode === 'wave') return;
  const d = Math.hypot(G.x - x, G.z - z) + Math.abs(G.y - y) * 1.3;
  const eff = R * (G.mode === 'sleep' ? D().wake : 1);
  if(d > eff) return;
  if(G.mode === 'sleep'){ wakeNona({ x, y, z }, 'noise'); return; }
  G.tgt = { x, y, z }; G.mode = 'curious'; G.path = H.path(G, G.tgt); G.t = 0; showMark(ques, 1.4);
  if(Math.random() < .6) say('hear');
}
function wakeNona(tgt, why){
  G.mode = 'wake'; G.t = 0; G.tgt = tgt; G.spotT = 0; G.chaseT = 0;
  placeNonaInBed(); G.face = Math.PI * .8;
  SFX.wake(); showMark(why === 'noise' ? excl : ques, 1.4);
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
function say(cat){ const t = pick(LINES[cat]); A.mumble(4 + Math.floor(Math.random() * 3), cat === 'spot' ? 260 : 210); bubbleNona(t, 2.6); }
function bubbleNona(t, s){ $('#bubbleT').textContent = t; bubbleUntil = T + s; bubbleWho = 'nona'; }
let topUntil = 0;
function bubbleTop(t, s){ const h = $('#hint'); h.textContent = t; h.hidden = false; h.classList.remove('arrow'); topUntil = T + s; }
function showMark(spr, s){ spr.visible = true; spr.userData.until = T + s; }

function canSeeKid(){
  if(P.hidden || state !== 'play') return false;
  const dy = Math.abs(G.y - P.y); if(dy > 1.4) return false;
  const dx = P.x - G.x, dz = P.z - G.z, d = Math.hypot(dx, dz);
  let range = D().sight * (P.mode === 'sneak' || P.mode === 'still' ? .72 : 1);
  if(G.mode === 'tired') range = D().tiredSee;
  if(G.mode === 'search' || G.mode === 'shrug') range *= .9;
  if(d > range) return false;
  const fx = Math.sin(G.face), fz = Math.cos(G.face), cos = (dx * fx + dz * fz) / (d || 1);
  if(d > 1.5 && cos < .42) return false;
  return H.los({ x:G.x, y:G.y + 1.45, z:G.z }, { x:P.x, y:P.y + .7, z:P.z });
}
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
  const kidRoom = H.roomOf(P.x, P.y, P.z);
  const pool = WANDER_ROOMS.slice(); if(diffId === 'normal' && kidRoom && H.ROOM[kidRoom]) pool.push(kidRoom, kidRoom);
  if(GS && GS.t > 120) pool.push('basement', 'attic');
  const p = H.freePoint(pick(pool)); goTo(p);
}
function updateNona(dt){
  const d = D(); G.t += dt;
  const seeing = (G.mode !== 'sleep' && G.mode !== 'wake' && G.mode !== 'boop' && G.mode !== 'shrug') ? canSeeKid() : false;
  if(seeing && G.mode !== 'chase' && (G.mode !== 'tired' || d.tiredSee > 0)){
    G.spotT += dt; if(!excl.visible) showMark(excl, .8);
    if(G.spotT > d.spot){ G.mode = 'chase'; G.t = 0; G.chaseT = 0; G.lostT = 0; SFX.spot(); say('spot'); A.setMode('chase'); }
  } else if(!seeing) G.spotT = Math.max(0, G.spotT - dt * .5);
  G.act = 'walk'; G.actK = 0;
  switch(G.mode){
    case 'sleep':
      G.sleepT += dt;
      if(G.sleepT > G.wakeAt){ wakeNona(null, 'self'); }
      G.snoreT -= dt; if(G.snoreT <= 0){ G.snoreT = 2.7; const dd = Math.hypot(P.x - H.nonaBed.x, P.z - H.nonaBed.z) + Math.abs(P.y - LY[2]) * 2; A.snore(clamp(1 - dd / 16, 0, 1)); }
      break;
    case 'wake':
      G.act = 'yawn'; G.actK = G.t / 1.4; G.speed = 0;
      if(G.t > 1.4){ if(G.tgt){ G.mode = 'curious'; goTo(G.tgt); } else { G.mode = 'wander'; G.wanderLeft = d.wanderT; goTo(H.freePoint(pick(['kitchen', 'bath', 'kitchen']))); } G.t = 0; }
      break;
    case 'curious':
      if(moveNona(dt, d.curious)){ G.mode = 'search'; G.t = 0; if(Math.random() < .7) say('search'); }
      break;
    case 'search':
      G.act = 'look'; G.speed = 0; G.face += Math.sin(G.t * 1.7) * dt * .8;
      if(G.t > 3.4){ G.mode = 'wander'; G.t = 0; if(!(G.wanderLeft > 0)) G.wanderLeft = d.wanderT; wanderNext(); }
      break;
    case 'wander':
      G.wanderLeft -= dt;
      if(moveNona(dt, d.wander)){ if(G.wanderLeft <= 0){ toTired(); } else { G.mode = 'search'; G.t = 1.6; } }
      break;
    case 'chase': {
      G.chaseT += dt;
      if(seeing){ G.lostT = 0; G.lastSeen = { x:P.x, y:P.y, z:P.z }; if(T - G.lastPathT > .4 || !G.path.length){ goTo(G.lastSeen); } }
      else { G.lostT += dt; if(!G.path.length && G.lastSeen) goTo(G.lastSeen); }
      moveNona(dt, d.chase);
      if(!P.hidden && Math.abs(G.y - P.y) < 1 && Math.hypot(G.x - P.x, G.z - P.z) < d.catchR){ startBoop(); break; }
      if(G.lostT > d.lose){ G.mode = 'search'; G.t = 0; G.wanderLeft = d.wanderT * .4; say('lost'); A.setMode('calm'); }
      else if(G.chaseT > d.chaseMax){ toTired(); A.setMode('calm'); }
      break;
    }
    case 'toHide':
      if(moveNona(dt, d.curious * 1.2)){ G.mode = 'shrug'; G.t = 0; say('shrug'); }
      break;
    case 'shrug':
      G.act = 'shrug'; G.actK = G.t / 2.4; G.speed = 0; if(P.hidden) G.face += angDiff(Math.atan2(P.hidden.x - G.x, P.hidden.z - G.z), G.face) * Math.min(1, 4 * dt);
      if(G.t > 2.4) toTired();
      break;
    case 'tired':
      if(G.t < 1.6){ G.act = 'yawn'; G.actK = G.t / 1.6; G.speed = 0; break; }
      if(moveNona(dt, d.tired)){ G.mode = 'sleep'; G.sleepT = 0; G.wakeAt = lerp(d.selfWake[0], d.selfWake[1], Math.random()); G.t = 0; }
      break;
    case 'boop':
      G.act = 'boop'; G.actK = Math.min(1, G.t / .8); G.speed = 0; G.face += angDiff(Math.atan2(P.x - G.x, P.z - G.z), G.face) * Math.min(1, 10 * dt);
      break;
  }
  if(G.mode !== 'chase' && A.musicMode === 'chase') A.setMode('calm');
}
function toTired(){ G.mode = 'tired'; G.t = 0; G.wanderLeft = 0; say('tired'); goTo({ x:H.nonaBed.out.x, y:LY[2], z:H.nonaBed.out.z }); }
function renderNona(dt){
  const n = nona;
  const sleeping = G.mode === 'sleep' || (state === 'title' || state === 'select' || state === 'overview');
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
  const d = Math.hypot(G.x - P.x, G.z - P.z);
  if(G.mode === 'chase' || ((G.mode === 'curious' || G.mode === 'wander' || G.mode === 'search') && d < 6 && G.spotT > 0)){
    G.mode = 'toHide'; goTo({ x:h.out.x, y:h.y, z:h.out.z }); A.setMode('calm');
  }
  bubbleTop(L('تخبّيت! 🤫 استنّى الجدّة تروح', 'Hidden! 🤫 Wait for Grandma to leave', 'Saklandın! 🤫 Büyükannenin gitmesini bekle'), 2.5);
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
  else if(c.k === 'pick') pickUp(c.id);
  else if(c.k === 'drop') dropHeld(true);
  else if(c.k === 'jar') openJar();
  else if(c.k === 'use') useOnDoor();
  else if(c.k === 'door') doorHint();
}
function attach(id){ holder.clear(); const m = IT[id].mesh; holder.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); if(id === 'note'){ m.rotation.x = -1.1; m.position.y = .05; } if(id === 'key'){ m.rotation.set(-1.0, 0, 0); } }
function detach(id){ const m = IT[id].mesh; holder.remove(m); scene.add(m); }
function pickUp(id){
  if(held) dropHeld(false);
  const it = GS.items[id]; it.state = 'held'; held = id; attach(id); SFX.pickup();
  burst(it.x, it.y + .2, it.z, 14, ['#fff1a0', '#ffffff', '#ffcd4d'], { speed:1.5, up:2, g:3, life:.8, size:.7 });
  if(!GS.locks[NEED[id]]){ progress(); bubbleTop(INFO[id].e + ' ' + INFO[id].n + ' — ' + L('روح عالباب الكبير تحت 🚪', 'take it to the big front door downstairs 🚪', 'aşağıdaki büyük kapıya götür 🚪'), 3); }
  updateNoteCard();
}
function dropHeld(noisy){
  if(!held) return;
  const id = held, it = GS.items[id]; held = null; detach(id);
  const fx = P.x + Math.sin(P.face) * .45, fz = P.z + Math.cos(P.face) * .45;
  const o = { x:fx, z:fz }; H.collide(o, .15, P.y);
  it.x = o.x; it.z = o.z; it.y = H.groundY(o.x, o.z, P.y); it.lv = H.lvOf(it.y); it.state = 'world';
  if(noisy){ SFX.drop(); makeNoise(it.x, it.y, it.z, 5, 'drop'); }
  updateNoteCard();
}
function openJar(){
  GS.jarOpen = true; const j = GS.items.jar; SFX.jar(); makeNoise(j.x, j.y, j.z, 4.5, 'jar');
  const k = GS.items.key; k.state = 'world';
  // the key pops out next to the jar (towards the kid)
  const dx = P.x - j.x, dz = P.z - j.z, d = Math.hypot(dx, dz) || 1; k.x = j.x + dx / d * .3; k.z = j.z + dz / d * .3; k.y = j.y; k.lv = j.lv;
  keyPop = 0; progress();
  burst(j.x, j.y + .35, j.z, 18, ['#c98a4a', '#ffcd4d', '#ffffff'], { speed:1.4, up:2.5, g:6, life:.9, size:.8 });
  bubbleTop(L('لقيت المفتاح بعلبة البسكوت! 🔑🍪', 'The key was in the cookie jar! 🔑🍪', 'Anahtar kurabiye kavanozundaymış! 🔑🍪'), 2.6);
}
let keyPop = 1;
function useOnDoor(){
  const id = held, lk = NEED[id];
  if(id === 'note'){ openCode(); return; }
  held = null; holder.clear(); GS.items[id].state = 'used';
  if(id === 'key'){ LOCK.key.key.visible = true; LOCK.key.anim = 0; SFX.unlock(); }
  if(id === 'pliers'){ LOCK.chain.anim = 0; SFX.chain(); burst(.5, 1.5, -6.75, 16, ['#fff3a0', '#ffffff', '#b9c0c8'], { speed:2, up:1.5, g:6, life:.6, size:.6 }); }
  GS.locks[lk] = true; makeNoise(.5, 0, -6.4, 8, 'lock'); progress(); afterLock();
}
function afterLock(){
  updateNoteCard();
  const left = Object.values(GS.locks).filter(v => !v).length;
  if(left === 0){ setTimeout(() => startWin(), 900); bubbleTop(L('انفتح الباب! 🎉', 'The door is open! 🎉', 'Kapı açıldı! 🎉'), 2); }
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
  if(entry.length >= 3) return;
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
  $('#code').hidden = true; state = 'play';
  if(solved){
    held = null; holder.clear(); GS.items.note.state = 'used'; GS.locks.pad = true;
    LOCK.pad.anim = 0; LOCK.pad.dots.forEach((d, i) => d.material.color.set(SYM[GS.code[i]].c));
    SFX.unlock(); makeNoise(.5, 0, -6.4, 8, 'lock'); progress(); afterLock();
  }
}

/* ---------- caught: a soft boop, feathers, cosy fade, next day ---------- */
let boopT = 0;
function startBoop(){
  G.mode = 'boop'; G.t = 0; state = 'caught'; boopT = 0; clearInput(); A.setMode('calm');
  say('boop'); SFX.boop();
  setTimeout(() => { SFX.feathers(); burst(P.x, P.y + 1.0, P.z, 40, ['#ffffff', '#fff3f8', '#ffe3ef'], { speed:2.2, up:2.2, g:1.2, drag:2.4, life:2.6, size:1.4, sway:.8 }); }, 380);
}
function updateCaught(dt){
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
    if(held){ const id = held, it = GS.items[id]; detach(id); held = null; const h = id === 'key' ? GS.items.jar : it.home; it.x = h.x + (id === 'key' ? .3 : 0); it.y = h.y; it.z = h.z; it.lv = h.lv; it.state = 'world'; updateNoteCard(); }
    GS.day++;
    if(GS.day > DAYS){ ov.hidden = true; showLose(); updateCaught.reset = false; return; }
    newDay(false);
  }
  if(boopT > 3.4){ updateCaught.reset = false; ov.classList.add('out'); setTimeout(() => { ov.hidden = true; }, 500); state = 'play'; A.music(true, 'calm'); bubbleTop(L('يوم جديد! انتبه عالجدّة 👵🏻', 'A new day! Watch out for Grandma 👵🏻', 'Yeni bir gün! Büyükanneye dikkat 👵🏻'), 2.5); }
}

/* ---------- win: the door opens to a sunny garden ---------- */
let winT = 0;
function startWin(){
  if(state !== 'play' && state !== 'code') return;
  state = 'win'; winT = 0; clearInput(); exitHide(); fp = false; $('#btnEye').classList.remove('lit');
  GS.over = true; H.doorCol.off = true; SFX.door(); setPlayUI(false);
  if(held){ holder.clear(); held = null; }
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
  G.act = 'wave'; G.speed = 0;
  camera.position.set(2.4, 1.7, -15.2); camera.lookAt(.4, 1.3, -8.5);
  if(winT > 2.4 && Math.random() < dt * 9) burst(P.x + (Math.random() - .5) * 4, 3.5, P.z + (Math.random() - .5) * 2, 10, ['#ff5d73', '#ffcd4d', '#5fb8ff', '#5fe3b1', '#b99bff'], { speed:2, up:1, g:2.2, drag:1.2, life:2.6, size:1.2, sway:.6 });
  if(winT > 4.2 && !updateWin.shown){ updateWin.shown = true; showWin(); }
}

/* ---------- HUD ---------- */
const hudCache = {};
const setTxt = (id, t) => { if(hudCache[id] !== t){ hudCache[id] = t; $('#' + id).textContent = t; } };
function setPlayUI(on){ ['#hud', '#joy', '#btnRun'].forEach(s => $(s).hidden = !on); if(!on){ $('#btnAct').hidden = true; $('#slot').hidden = true; $('#bubble').hidden = true; $('#hint').hidden = true; } }
function hudFrame(){
  setTxt('hDay', '☀️ ' + L('اليوم ', 'Day ', 'Gün ') + N(GS.day) + '/' + N(DAYS));
  for(const [id, lk] of [['hKey', 'key'], ['hChain', 'chain'], ['hPad', 'pad']]) $('#' + id).classList.toggle('done', GS.locks[lk]);
  const m = G.mode, mood = m === 'sleep' ? ['😴', L('الجدّة نايمة', 'Grandma is asleep', 'Büyükanne uyuyor'), 'sleep'] : m === 'chase' || m === 'boop' ? ['😠', L('الجدّة شافتك!', 'Grandma sees you!', 'Büyükanne seni gördü!'), 'chase'] :
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
    ${best ? `<div class="mine"><span>${'⭐'.repeat(best)}</span></div>` : ''}
  </div>`;
  card.querySelectorAll('.seg button').forEach(b => b.onclick = () => { diffId = b.dataset.d; rawSet('granny_diff', diffId); SFX.tap(); card.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); });
  $('#bPlay').onclick = () => { A.ac(); SFX.tap(); startGame(); };
  $('#bHero').onclick = () => { A.ac(); SFX.tap(); showSelect('title'); };
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
  $('#bOkHero').onclick = () => { SFX.tap(); if(selPick !== heroId){ heroId = selPick; rawSet('granny_hero', heroId); setHero(heroId); if(held) attach(held); } if(selFrom === 'pause') showPause(true); else showTitle(); };
}
function startGame(){
  newRun(); setTitleView(false); H.setTitle(false);
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
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bRestart">🔁 ${L('من الأول', 'Start over', 'Baştan')}</button>
    <button class="ghost-btn" id="bChar">🦸 ${L('غيّر الشخصية', 'Change hero', 'Kahraman değiştir')}</button>
    <button class="ghost-btn" id="bSnd2">${A.muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button></div>
    <button class="exit-btn">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bRestart').onclick = () => { SFX.tap(); startGame(); };
  $('#bChar').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd2').onclick = () => { A.setMuted(!A.muted); $('#bSnd2').innerHTML = (A.muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); $('#btnSnd').textContent = A.muted ? '🔇' : '🔊'; if(!A.muted) SFX.tap(); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); for(const k in hudCache) delete hudCache[k]; A.music(true, G.mode === 'chase' ? 'chase' : 'calm'); snapCam = true; }
function showWin(){
  const days = GS.day, secs = Math.round(GS.t);
  const stars = days === 1 && secs < 420 ? 3 : (days <= 2 || (days <= 3 && secs < 600)) ? 2 : 1;
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
    const visible = it.state === 'world' || it.state === 'held' || (id === 'key' && it.state === 'injar' && false);
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
  stepPlayer(dt); updateNona(dt); updateVases(dt); updateLocks(dt); updateHint(dt);
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
  if(state === 'play'){ update(dt); updateCamera(dt); hudFrame(); }
  else if(state === 'caught'){ GS.t += dt; updateNona(dt); updateCaught(dt); updateCamera(dt); }
  else if(state === 'win' || state === 'won'){ updateWin(dt); }
  else if(state === 'code'){ updateCamera(dt); }
  else if(state === 'title' || state === 'select' || state === 'overview'){
    menuT += dt; const a = Math.sin(menuT * .12) * .12;
    const ov = state === 'overview';
    camera.position.set(Math.sin(a) * 33 + .5, ov ? 9 : 4.6, -Math.cos(a) * 33); camera.lookAt(.5, ov ? 2.6 : 3.3, 0);
    camera.fov = 36; camera.updateProjectionMatrix();
  }
  if(state === 'play' || state === 'caught' || state === 'code' || state === 'pause'){ if(camera.fov !== 62){ camera.fov = 62; camera.updateProjectionMatrix(); } }
  if(camOverride){ camera.position.set(camOverride[0], camOverride[1], camOverride[2]); camera.lookAt(camOverride[3], camOverride[4], camOverride[5]); }
  shadowFollow();
  renderKid(dt); renderNona(dt); renderItems(dt); updateParts(dt); updateRings(dt); H.update(dt, T);
  if(GS) for(const t of GS.toys) if(!(t.squash > 0)) t.m.scale.set(1, 1, 1);
  if(T < topUntil || (GS && GS.hint)){}
  H.sky.position.copy(camera.position);
  renderer.render(scene, camera);
}
function degrade(){
  if(quality === 2 && dpr > 1){ dpr = 1; renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); quality = 1; return; }
  if(quality >= 1){ quality = 0; sun.shadow.mapSize.set(512, 512); if(sun.shadow.map){ sun.shadow.map.dispose(); sun.shadow.map = null; } renderer.shadowMap.type = THREE.BasicShadowMap; return; }
}

/* ---------- test hook ---------- */
window.__granny = {
  get state(){ return state; }, get diff(){ return diffId; }, get fps(){ return fps; }, get dpr(){ return dpr; }, get hero(){ return heroId; },
  get day(){ return GS && GS.day; }, get locks(){ return GS && Object.assign({}, GS.locks); }, get held(){ return held; }, get code(){ return GS && GS.code.slice(); },
  get player(){ return { x:P.x, y:P.y, z:P.z, lv:H.lvOf(P.y), hidden:P.hidden && P.hidden.kind, mode:P.mode, room:H.roomOf(P.x, P.y, P.z) }; },
  get grandma(){ return { x:G.x, y:G.y, z:G.z, mode:G.mode, lv:H.lvOf(G.y), room:H.roomOf(G.x, G.y, G.z), tgt:G.tgt, path:G.path.length }; },
  get items(){ return GS ? Object.fromEntries(Object.entries(GS.items).map(([k, v]) => [k, { x:v.x, y:v.y, z:v.z, lv:v.lv, state:v.state }])) : null; },
  get ctx(){ const c = context(); return c && c.k; }, get result(){ return GS && GS.result; }, get hides(){ return HIDES.map(h => ({ kind:h.kind, x:h.x, z:h.z, lv:h.lv, out:h.out })); },
  start(d){ if(d) diffId = d; startGame(); }, title:() => showTitle(), back(){ if(state === 'select' && selFrom === 'pause') showPause(true); else showTitle(); }, pause:() => showPause(), resume:() => resume(), act:() => doAction(),
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
  H, wakeNona:() => wakeNona(null, 'self'), knock:(i) => knockVase(i), get vases(){ return VASES.map(v => v.down); }
};

/* ---------- boot ---------- */
setHero(heroId);
resize();
showTitle();
requestAnimationFrame(frame);
