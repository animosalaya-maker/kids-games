/* Bobo Desert («صحرا بوبو 🏜️») — main game.
   A big open low-poly desert: walk around, hop into your sand buggy (A near it) and drive over the dunes and jump ramps.
   On foot: A = jump, B = action (open a chest, pat a camel, wave). In the buggy: A = turbo hop, B = horn, 🚶 = get out.
   Goals: coins and gold rings, 5 hidden treasure chests (one in the pyramid tunnel) and «سباق الرمل», a 10-gate race
   around the pyramids with a timer and stars. Coins go to the shared World purse (batched, with a daily cap).
   Online («👫 العب مع أصحابك»): rooms of up to 4 (Supabase presence through ../rt.js; ?mp=local = BroadcastChannel). Everyone is
   equal: each phone sends its own kid + buggy position about 8 times a second while moving. No chat, names come from the server. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeDesert, makeBuggy } from './world.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
const { HEROES, HERO_IDS, HERO_NAME, HERO_COLOR, poseHero } = K;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI * 2; while(d < -Math.PI) d += Math.PI * 2; return d; };
const pick = a => a[Math.floor(Math.random() * a.length)];
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const AU = makeAudio(), SFX = AU.SFX;
const today = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };

/* ======================================================================
   Numbers
   ====================================================================== */
const WALK = 6.4, JUMP_V = 8.8, GRAV = 24, STEP_UP = .62;
const B_MAX = 19, B_BOOST = 29, B_ACC = 15, B_TURN = 2.4, B_GRAV = 22, BOOST_T = 1.4, BOOST_CD = 2.6, B_R = 1.15;
const COIN_CAP = 250, CHEST_COINS = 15, RING_COINS = 3;
const BCOL = [0xff6b3d, 0x3aa0ff, 0x35c76f, 0xc77dff];
const MCOL = ['#ff8a5a', '#6cc4ff', '#5ed6a0', '#d29bff'];

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'desert_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, hero:null, chests:[], best:0, stars:0, races:0, tut:0, cd:{ d:'', n:0 } }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      s.chests = Array.isArray(s.chests) ? s.chests.filter(x => typeof x === 'string').slice(0, 5) : [];
      s.best = clamp(+s.best || 0, 0, 3600); s.stars = clamp(s.stars | 0, 0, 3); s.races = clamp(s.races | 0, 0, 99999); s.tut = clamp(s.tut | 0, 0, 9);
      if(!s.cd || typeof s.cd !== 'object') s.cd = { d:'', n:0 }; s.cd.n = clamp(s.cd.n | 0, 0, COIN_CAP);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
function persist(){ rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
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

/* ---------- Renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = Math.min(window.devicePixelRatio || 1, 1.5);
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const HORIZON = 0xffeacb;
scene.background = new THREE.Color(HORIZON);
scene.fog = new THREE.Fog(HORIZON, 140, 420);
const camera = new THREE.PerspectiveCamera(60, 1, 0.15, 900);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0xf0c48a, 1.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1d8, 2.25);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0008; sun.shadow.normalBias = .04;
Object.assign(sun.shadow.camera, { left:-42, right:42, top:42, bottom:-42, near:1, far:160 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(34, 60, 30);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();

/* ---------- the world ---------- */
const W = makeDesert(THREE, K);
scene.add(W.root);
const SKY = W.root.userData.sky, SUNG = W.root.userData.sunG;

/* ---------- Particles: confetti, sand dust, splashes, hearts ---------- */
const PMAX = 360, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff], GOLD = [0xffcf3a, 0xffe680, 0xffffff], DUST = [0xf3d29a, 0xe9c084, 0xfbe2b4], SPLASH = [0xbff3ff, 0xffffff, 0x7fe0f5], HEART = [0xff6f9e, 0xff9fbf];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .6 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
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

/* ---------- heroes, buggies ---------- */
const myAv = () => { try{ return heroId === 'me' && window.Avatar ? Avatar.load() : null; }catch(e){ return null; } };
const okAv = av => {
  try{
    if(!window.Avatar || !av || typeof av !== 'object') return null;
    const o = {};
    for(const k of Object.keys(av).slice(0, 30)){ const v = av[k]; if(v === null || typeof v === 'boolean' || (typeof v === 'number' && isFinite(v)) || (typeof v === 'string' && /^[A-Za-z][A-Za-z0-9]{0,15}$/.test(v) && !(v in Object.prototype))) o[k] = v; }
    return Avatar.normalize(o);
  }catch(e){ return null; }
};
const okHero = id => HEROES[id] ? id : 'sara';
function makeHero(id, av){ const h = id === 'me' ? HEROES.me(av || undefined) : HEROES[id](); K.shadowHero(h); return h; }
const flameGeo = new THREE.ConeGeometry(.16, .7, 7).rotateX(-Math.PI / 2).translate(0, 0, -.35), flameMat = new THREE.MeshBasicMaterial({ color:0xffa53d, transparent:true, opacity:.9 });
function buggyModel(color){
  const b = makeBuggy(THREE, K, color);
  b.flames = [-.35, .35].map(x => { const f = new THREE.Mesh(flameGeo, flameMat); f.position.set(x, .62, -1.42); f.visible = false; b.body.add(f); return f; });
  return b;
}
/* sit a hero in a buggy seat (legs forward, hands on the wheel) */
function seatPose(h, t, steer){
  h.body.position.y = 0; h.body.rotation.set(-.05, 0, 0); h.body.scale.set(1, 1, 1);
  h.head.rotation.set(Math.sin(t * 2) * .03, -steer * .25, Math.sin(t * 1.3) * .03);
  h.legs.forEach(l => { l.rotation.x = -1.45; });
  h.arms.forEach(a => { a.rotation.x = -1.05; a.rotation.z = -a.userData.side * (.1 - steer * .12 * a.userData.side); });
  h.sway.forEach(p => { p.rotation.x = -.4; });
}
const SEAT_Y = -.36;          // hero group offset in the seat so the hips sit on the cushion

/* ---------- me ---------- */
const P = { x:0, y:0, z:0, vx:0, vz:0, vy:0, f:Math.PI, m:0, gr:true, t:0, drive:false, wave:0, sq:0, inWater:false };
const B = { x:0, y:0, z:0, h:Math.PI, s:0, vy:0, vyG:0, air:false, steer:0, pit:0, rol:0, boost:0, cd:0, spin:0, bob:0, land:0, dust:0 };
let heroM = null, bugM = null, myColor = BCOL[0];
function setHero(id){
  heroId = HERO_IDS.includes(id) ? id : 'sara';
  if(heroM){ heroM.grp.parent && heroM.grp.parent.remove(heroM.grp); }
  heroM = makeHero(heroId); attachHero();
}
function setBuggyColor(col){
  myColor = col;
  if(bugM) scene.remove(bugM.grp);
  bugM = buggyModel(col); scene.add(bugM.grp); attachHero();
}
function attachHero(){
  if(!heroM || !bugM) return;
  if(P.drive){ bugM.seat.add(heroM.grp); heroM.grp.position.set(0, SEAT_Y, 0); heroM.grp.rotation.set(0, 0, 0); }
  else { scene.add(heroM.grp); }
}
setBuggyColor(BCOL[0]); setHero(heroId);

/* ---------- camera + input ---------- */
const cam = { yaw:0, pitch:.32, dist:7.5, pAdj:0, lookT:0, shake:0 };
const camPos = new THREE.Vector3(0, 20, 60), camLook = new THREE.Vector3();
let snapCam = true;
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), touch = $('#touch'), aBtn = $('#btnA'), bBtn = $('#btnB'), outBtn = $('#btnOut');
let joyHome = [90, 0], wantA = false, wantB = false;
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.25, .7); look.x = p.x; look.y = p.y; cam.lookT = performance.now(); }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){ look.id = null; cam.lookT = performance.now(); }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
function holdBtn(btn, fn){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); fn(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('on')));
}
holdBtn(aBtn, () => { wantA = true; });
holdBtn(bBtn, () => { wantB = true; });
holdBtn(outBtn, () => exitBuggy());
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'Space' || e.code === 'KeyJ'){ wantA = true; e.preventDefault(); }
    if(e.code === 'KeyK' || e.code === 'KeyH' || e.code === 'Enter'){ wantB = true; e.preventDefault(); }
    if(e.code === 'KeyX'){ exitBuggy(); }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; wantA = wantB = false; }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  if(testInput){ ix = testInput.x; iy = testInput.y; }
  if(testGo){ const dx = testGo.x - (P.drive ? B.x : P.x), dz = testGo.z - (P.drive ? B.z : P.z), l = Math.hypot(dx, dz) || 1, ux = dx / l, uz = dz / l;
    ix = (ux * Math.cos(cam.yaw) - uz * Math.sin(cam.yaw)) * testGo.k; iy = -(ux * -Math.sin(cam.yaw) + uz * -Math.cos(cam.yaw)) * testGo.k; }
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}
let testInput = null, testGo = null;

/* ======================================================================
   Physics
   ====================================================================== */
const BOUND = 146;
/* round obstacles near a point: static scenery + walking camels + other buggies */
function pushCircles(o, r, y, list){
  let hit = 0;
  const test = c => {
    if(y > c.top) return;
    const dx = o.x - c.x, dz = o.z - c.z, d = Math.hypot(dx, dz), min = c.r + r;
    if(d < min && d > 1e-4){ const k = (min - d) / d; o.x += dx * k; o.z += dz * k; hit = Math.max(hit, c.hard == null ? 1 : c.hard); if(c.camel) c.camel.bumped = 1; }
  };
  for(const c of W.circlesNear(o.x, o.z)) test(c);
  for(const c of list) test(c);
  return hit;
}
function dynCircles(self){
  const out = [];
  for(const c of W.CAMELS) out.push({ x:c.x + Math.sin(c.f) * .4, z:c.z + Math.cos(c.f) * .4, r:1.3, top:c.y + 3, hard:.6, camel:c });
  if(self !== 'bug' && !P.drive) out.push({ x:B.x, z:B.z, r:1.2, top:B.y + 1.2, hard:.5 });
  for(const a of RM.values()) if(a.seen && a.b) out.push({ x:a.b.x, z:a.b.z, r:1.2, top:a.b.y + 1.4, hard:.5 });
  return out;
}
const blocked = (x, z, y, up) => W.groundAt(x, z, y + .5) > y + up || W.ceilAt(x, z) < y + 1.1;
function stepWalk(dt){
  readInput(dt);
  const sp = WALK * (P.inWater ? .6 : 1);
  const k = 1 - Math.exp(-(P.gr ? 12 : 4) * dt);
  P.vx = lerp(P.vx, inp.x * sp, k); P.vz = lerp(P.vz, inp.z * sp, k);
  let nx = clamp(P.x + P.vx * dt, -BOUND, BOUND), nz = clamp(P.z + P.vz * dt, -BOUND, BOUND);
  if(blocked(nx, nz, P.y, STEP_UP)){
    if(!blocked(nx, P.z, P.y, STEP_UP)){ nz = P.z; P.vz = 0; } else if(!blocked(P.x, nz, P.y, STEP_UP)){ nx = P.x; P.vx = 0; } else { nx = P.x; nz = P.z; P.vx = P.vz = 0; }
  }
  const o = { x:nx, z:nz }; pushCircles(o, .42, P.y, dynCircles('kid'));
  if(!blocked(o.x, o.z, P.y, STEP_UP)){ P.x = o.x; P.z = o.z; } else { P.x = nx; P.z = nz; }
  if(wantA && P.gr){ P.vy = JUMP_V; P.gr = false; SFX.jump(); P.sq = -.12; }
  wantA = false;
  P.vy -= GRAV * dt; let ny = P.y + P.vy * dt;
  const g = W.groundAt(P.x, P.z, P.y + .5), c = W.ceilAt(P.x, P.z);
  if(ny + 1.2 > c){ ny = c - 1.2; if(P.vy > 0) P.vy = 0; }
  if(ny <= g || (P.gr && P.vy <= 0 && ny > g - .45)){ if(!P.gr && P.vy < -6){ SFX.land(); P.sq = .14; burst(P.x, g + .1, P.z, 5, DUST, 1.6, .9, 6, .8); } ny = g; P.vy = 0; P.gr = true; }
  else P.gr = false;
  P.y = ny;
  const wy = W.waterAt(P.x, P.z), wasW = P.inWater; P.inWater = wy > P.y + .05;
  if(P.inWater && !wasW){ SFX.splash(); burst(P.x, wy, P.z, 12, SPLASH, 3, 1, 12, 2); }
  if(P.inWater && inp.m > .2 && Math.random() < dt * 8) burst(P.x, wy, P.z, 2, SPLASH, 1.5, .7, 10, 1);
  if(inp.m > 0) P.f += angDiff(Math.atan2(inp.x, inp.z), P.f) * Math.min(1, 12 * dt);
  P.m = Math.min(1, Math.hypot(P.vx, P.vz) / WALK);
}
function stepBuggy(dt, frozen){
  readInput(dt);
  if(frozen){ inp.x = inp.z = inp.m = 0; }
  B.boost = Math.max(0, B.boost - dt); B.cd = Math.max(0, B.cd - dt);
  // turbo hop
  if(wantA && !frozen && B.cd <= 0){ B.boost = BOOST_T; B.cd = BOOST_CD; if(!B.air){ B.air = true; B.vy = 6.4; } SFX.boost(); cam.shake = .25; mpFx('boost'); if(B.s < 8) B.s = 8; }
  wantA = false;
  const inW = W.waterAt(B.x, B.z) > B.y - .1;
  let d = 0, throttle = 0;
  if(inp.m > 0){ d = angDiff(Math.atan2(inp.x, inp.z), B.h); throttle = inp.m * (Math.abs(d) < 2.1 ? 1 : .45); }
  const steerT = inp.m > 0 ? clamp(d * 1.7, -1, 1) : 0;
  B.steer = lerp(B.steer, steerT, 1 - Math.exp(-10 * dt));
  const turn = B_TURN * clamp(.4 + Math.abs(B.s) / 9, 0, 1.1) * (B.air ? .45 : 1);
  B.h += B.steer * turn * dt;
  const top = (B.boost > 0 ? B_BOOST : B_MAX) * (inW ? .45 : 1), want = throttle * top;
  if(!B.air){
    if(B.s < want) B.s = Math.min(want, B.s + B_ACC * (B.boost > 0 ? 2 : 1) * dt);
    else B.s = Math.max(want, B.s - (throttle > 0 ? 9 : 6) * dt);
    if(B.s < 0) B.s = Math.min(0, B.s + 8 * dt);
  } else if(B.boost > 0 && B.s < want) B.s = Math.min(want, B.s + B_ACC * dt);
  // move with walls (pyramid steps, ruins) and round obstacles
  const sh = Math.sin(B.h), ch = Math.cos(B.h);
  let nx = clamp(B.x + sh * B.s * dt, -BOUND, BOUND), nz = clamp(B.z + ch * B.s * dt, -BOUND, BOUND);
  const lip = B.air ? .4 : .75, fwd = Math.sign(B.s) || 1;
  const wall = (x, z) => W.groundAt(x, z, B.y + .6) > B.y + lip || W.ceilAt(x, z) < B.y + 1.4;
  if(wall(nx, nz) || wall(nx + sh * 1.1 * fwd, nz + ch * 1.1 * fwd)){
    if(Math.abs(B.s) > 7){ SFX.bump(); cam.shake = .3; burst(nx + sh * 1.2, B.y + .6, nz + ch * 1.2, 8, DUST, 3, 1, 10); }
    nx = B.x; nz = B.z; B.s = -B.s * .25;
  }
  const o = { x:nx, z:nz }, hit = pushCircles(o, B_R, B.y + .3, dynCircles('bug'));
  if(hit){ if(Math.abs(B.s) > 7){ SFX.bump(); cam.shake = .2; } B.s *= Math.pow(.25, dt * 8 * hit); for(const c of W.CAMELS) if(c.bumped){ c.bumped = 0; if(c.happy <= 0){ c.stop = 2; c.happy = 1.5; SFX.camel(); } } }
  if(!wall(o.x, o.z)){ B.x = o.x; B.z = o.z; } else { B.x = nx; B.z = nz; }
  // vertical: follow the ground, fly off ramps and dune tops
  const g = W.groundAt(B.x, B.z, B.y + .6), c = W.ceilAt(B.x, B.z);
  if(!B.air){
    const climb = (g - B.y) / Math.max(dt, .001);
    if(B.vyG > 2.4 && B.y + B.vyG * dt > g + .05){ B.air = true; B.vy = Math.min(B.vyG, 12); }
    else if(g < B.y - .7){ B.air = true; B.vy = 0; }
    else { B.y = g; B.vyG = lerp(B.vyG, clamp(climb, -20, 14), .5); }
  }
  if(B.air){
    B.vy -= B_GRAV * dt; B.y += B.vy * dt;
    if(B.y + 1.5 > c){ B.y = c - 1.5; if(B.vy > 0) B.vy = 0; }
    if(B.y <= g){ if(B.vy < -6){ SFX.thud(); B.land = .25; cam.shake = Math.min(.35, -B.vy * .03); burst(B.x, g + .2, B.z, 12, DUST, 3.5, 1.1, 8, 1); } B.y = g; B.air = false; B.vy = 0; B.vyG = 0; }
  }
  // tilt with the ground
  if(!B.air){
    const gf = W.groundAt(B.x + sh * 1.1, B.z + ch * 1.1, B.y + .6), gb = W.groundAt(B.x - sh * 1.1, B.z - ch * 1.1, B.y + .6);
    const gl = W.groundAt(B.x + ch * .8, B.z - sh * .8, B.y + .6), gr = W.groundAt(B.x - ch * .8, B.z + sh * .8, B.y + .6);
    B.pit = lerp(B.pit, clamp(-Math.atan2(gf - gb, 2.2), -.6, .6), 1 - Math.exp(-12 * dt)); B.rol = lerp(B.rol, clamp(Math.atan2(gl - gr, 1.6) * .8, -.5, .5), 1 - Math.exp(-12 * dt));
  } else { B.pit = lerp(B.pit, clamp(-B.vy * .035, -.4, .4), 1 - Math.exp(-3 * dt)); B.rol = lerp(B.rol, 0, 1 - Math.exp(-3 * dt)); }
  B.spin += B.s * dt / .44; B.land = Math.max(0, B.land - dt);
  // dust and splashes
  if(!B.air && Math.abs(B.s) > 5){
    B.dust -= dt * (Math.abs(B.s) / 6);
    if(B.dust <= 0){ B.dust = .08; const bx = B.x - sh * 1.2, bz = B.z - ch * 1.2;
      if(inW){ burst(bx, W.waterAt(B.x, B.z) + .1, bz, 3, SPLASH, 2.5, 1, 10, 2.5); }
      else burst(bx + ch * (Math.random() - .5) * 1.6, B.y + .2, bz - sh * (Math.random() - .5) * 1.6, 2, DUST, 1.2, 1.4, 1.5, .6); }
  }
  if(inW && !B.wasW && Math.abs(B.s) > 3){ SFX.splash(); burst(B.x, W.waterAt(B.x, B.z), B.z, 18, SPLASH, 4, 1.1, 12, 3); }
  B.wasW = inW;
  // the kid rides along
  P.x = B.x; P.z = B.z; P.y = B.y + .5; P.f = B.h; P.m = 0; P.gr = !B.air; P.vy = 0;
}
function poseBuggy(M, b, t, boosting){
  M.grp.position.set(b.x, b.y, b.z); M.grp.rotation.y = b.h;
  const squash = b.land > 0 ? Math.sin(b.land / .25 * Math.PI) * .08 : 0;
  M.body.rotation.x = b.pit; M.body.rotation.z = b.rol; M.body.position.y = Math.sin(t * 22) * .012 * Math.min(1, Math.abs(b.s) / 5) - squash;
  for(const w of M.wheels){ w.w.rotation.x = b.spin; if(w.front) w.piv.rotation.y = b.steer * .45; }
  M.flames.forEach((f, i) => { f.visible = !!boosting; if(boosting){ const s = .8 + Math.sin(t * 40 + i * 2) * .25; f.scale.set(s, s, s * 1.2); } });
}
function enterBuggy(){
  if(P.drive) return;
  P.drive = true; B.s = 0; B.vy = 0; B.air = false; snapYaw = true; attachHero(); SFX.door(); mpPos(true);
  cam.lookT = 0;
  if(SAVE.tut < 2){ SAVE.tut = 2; persist(); say(LINES.drive, 6500); }
}
function exitBuggy(){
  if(!P.drive || R.ph === 'count') return;
  if(R.ph === 'go') stopRace(true);
  P.drive = false; attachHero();
  // step out on the left side (or anywhere free)
  const sh = Math.sin(B.h), ch = Math.cos(B.h);
  for(const [ox, oz] of [[ch * 1.9, -sh * 1.9], [-ch * 1.9, sh * 1.9], [-sh * 2.2, -ch * 2.2], [sh * 2.2, ch * 2.2]]){
    const x = B.x + ox, z = B.z + oz; if(!blocked(x, z, B.y, 1)){ P.x = x; P.z = z; break; }
  }
  P.y = W.groundAt(P.x, P.z, B.y + .5); P.vx = P.vz = P.vy = 0; P.gr = true; P.f = B.h;
  B.s = 0; B.boost = 0; SFX.out(); AU.engine(false); mpPos(true);
}

/* ======================================================================
   Pickups: coins, rings, chests, camels
   ====================================================================== */
let sessCoins = 0, bankPend = 0, bankT = 0;
function gain(n){
  sessCoins += n;
  if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
  const room = Math.max(0, COIN_CAP - SAVE.cd.n - bankPend), add = Math.min(n, room);
  bankPend += add; hudKey = '';
}
/* the world purse gets the coins in small batches (one toast every few seconds, not one per coin) */
function bank(force){
  if(bankPend <= 0) return;
  if(!force && performance.now() - bankT < 5000) return;
  bankT = performance.now();
  const n = bankPend; bankPend = 0;
  if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
  SAVE.cd.n = Math.min(COIN_CAP, SAVE.cd.n + n); persist();
  try{ if(window.World) World.addCoins(n, L('من صحرا بوبو', 'from Bobo Desert', 'Bobo Çölü\'nden')); }catch(e){}
}
function pickups(dt){
  const px = P.x, pz = P.z, py = P.drive ? B.y + .9 : P.y + .6, rr = P.drive ? 2.2 : 1.25;
  for(const c of W.COINS){
    if(c.got){ c.back -= dt; if(c.back <= 0) c.got = false; continue; }
    const dx = c.x - px, dz = c.z - pz;
    if(dx * dx + dz * dz < rr * rr && Math.abs(c.y - py) < 1.8){ c.got = true; c.back = 90; gain(1); SFX.coin(); burst(c.x, c.y, c.z, 6, GOLD, 2.5, .8, 6); }
  }
  for(const r of W.RINGS){
    if(r.got){ r.back -= dt; if(r.back <= 0) r.got = false; continue; }
    const dx = px - r.x, dz = pz - r.z, dy = py - r.y, sa = Math.sin(r.a), ca = Math.cos(r.a);
    const along = dx * sa + dz * ca, side = dx * ca - dz * sa;
    if(Math.abs(along) < 1.2 && Math.hypot(side, dy) < 2.3){ r.got = true; r.back = 45; gain(RING_COINS); SFX.ring(); pop('💫 +' + N(RING_COINS)); burst(r.x, r.y, r.z, 22, GOLD, 5, 1.1, 4); }
  }
  // driving into a chest opens it too
  if(P.drive) for(const c of W.CHESTS) if(!c.opened && Math.hypot(c.x - px, c.z - pz) < 2.8 && Math.abs(c.y - B.y) < 1.5) openChest(c);
}
function openChest(c){
  if(c.opened) return;
  c.opened = true; SFX.chest(); burst(c.x, c.y + 1, c.z, 40, GOLD.concat(CONFETTI), 5, 1.1, 8, 3);
  if(!SAVE.chests.includes(c.id)){
    SAVE.chests.push(c.id); persist(); gain(CHEST_COINS);
    banner('🎁 +' + N(CHEST_COINS), true);
    if(SAVE.chests.length === W.CHESTS.length){ setTimeout(() => { gain(25); SFX.fanfare(); banner('🏆 ' + L('لقيت كل الكنوز!', 'All treasure found!', 'Tüm hazineler bulundu!'), true); burst(P.x, P.y + 2, P.z, 60, CONFETTI, 6, 1.2, 8, 4); }, 1500); }
    else say(L('برافو! لقيت كنز 🎁 ', 'Bravo! You found a treasure 🎁 ', 'Bravo! Bir hazine buldun 🎁 ') + N(SAVE.chests.length) + '/' + N(W.CHESTS.length), 3200);
  }
  hudKey = '';
}
function patCamel(cm){ cm.stop = 3; cm.happy = 2.5; SFX.camel(); for(let i = 0; i < 3; i++) setTimeout(() => burst(cm.x, cm.y + 3.4, cm.z, 4, HEART, 1.5, 1.3, -1, .5), i * 250); }
function doWave(){ P.wave = 1.2; SFX.wave(); mpFx('wave'); }
function nearChest(){ for(const c of W.CHESTS) if(!c.opened && Math.hypot(c.x - P.x, c.z - P.z) < 2.4 && Math.abs(c.y - P.y) < 1.4) return c; return null; }
function nearCamel(){ for(const c of W.CAMELS) if(Math.hypot(c.x - P.x, c.z - P.z) < 3.2) return c; return null; }
const nearBuggy = () => !P.drive && Math.hypot(B.x - P.x, B.z - P.z) < 3.3 && Math.abs(B.y - P.y) < 1.6;
function doB(){
  if(P.drive){ SFX.horn(); mpFx('horn'); for(const cm of W.CAMELS) if(Math.hypot(cm.x - B.x, cm.z - B.z) < 10 && cm.happy <= 0){ cm.stop = 1.2; cm.happy = 1; } return; }
  const ch = nearChest(); if(ch){ openChest(ch); return; }
  const cm = nearCamel(); if(cm){ patCamel(cm); return; }
  doWave();
}

/* ======================================================================
   «سباق الرمل» — the race
   ====================================================================== */
const R = { ph:'idle', t:0, next:1, cd:0, lastN:0, res:null };
const arrow = (() => { const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color:0xffd23f });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(.5, .9, 4).rotateX(Math.PI / 2).translate(0, 0, .55), mat), tail = new THREE.Mesh(new THREE.BoxGeometry(.32, .14, .8).translate(0, 0, -.3), mat);
  g.add(tip); g.add(tail); g.visible = false; scene.add(g); return g; })();
const gateMark = (() => { const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color:0xffd23f });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.4, 6).rotateX(Math.PI), mat); g.add(cone);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:K.glowTex, color:0xffe680, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })); glow.scale.set(7, 7, 1); g.add(glow);
  g.visible = false; scene.add(g); return g; })();
function startRace(){
  if(state !== 'play') return;
  hideResult();
  if(!P.drive){ P.drive = true; attachHero(); }
  const c0 = W.CP[0];
  B.h = c0.a; B.x = c0.x - Math.sin(c0.a) * 7; B.z = c0.z - Math.cos(c0.a) * 7; B.y = W.groundAt(B.x, B.z); B.s = 0; B.vy = 0; B.air = false; B.boost = 0; B.cd = 0; B.steer = 0;
  P.x = B.x; P.z = B.z; cam.yaw = B.h + Math.PI; snapCam = true;
  R.ph = 'count'; R.cd = 3.6; R.lastN = 4; R.t = 0; R.next = 1; R.res = null;
  say(LINES.race, 4200); mpPos(true); hudKey = '';
}
function stopRace(silent){ R.ph = 'idle'; arrow.visible = false; gateMark.visible = false; hudKey = ''; if(!silent) pop('🏁 ' + L('وقّفنا السباق', 'Race stopped', 'Yarış durdu')); }
function stepRace(dt){
  if(R.ph === 'count'){
    R.cd -= dt; const n = Math.ceil(R.cd - .6);
    if(n !== R.lastN && n >= 0){ R.lastN = n; if(n > 0){ banner(N(n)); SFX.beep(); } else { banner(L('يلا!', 'GO!', 'BAŞLA!')); SFX.go(); R.ph = 'go'; R.t = 0; } }
  } else if(R.ph === 'go'){
    R.t += dt;
    const g = W.CP[R.next % W.CP.length];
    if(Math.hypot(g.x - P.x, g.z - P.z) < 9){
      if(R.next === W.CP.length){ finishRace(); return; }
      R.next++; SFX.gate(); burst(g.x, W.terr(g.x, g.z) + 5.7, g.z, 16, [W.GCOL[g.i], 0xffffff], 4, 1, 8);
      pop('🚩 ' + N(R.next - 1) + '/' + N(W.CP.length));
    }
  }
  const on = R.ph === 'count' || R.ph === 'go';
  arrow.visible = on; gateMark.visible = on;
  if(on){
    const g = W.CP[R.next % W.CP.length];
    arrow.position.set(P.x, (P.drive ? B.y : P.y) + 3, P.z); arrow.rotation.y = Math.atan2(g.x - P.x, g.z - P.z);
    gateMark.position.set(g.x, W.terr(g.x, g.z) + 9 + Math.sin(T * 4) * .5, g.z); gateMark.children[0].rotation.y = T * 2;
  }
}
const parFor = s => s === 3 ? 46 : 62;
function finishRace(){
  const t = R.t, stars = t <= parFor(3) ? 3 : t <= parFor(2) ? 2 : 1, best = !SAVE.best || t < SAVE.best;
  R.ph = 'done'; arrow.visible = false; gateMark.visible = false;
  SAVE.races++; if(best) SAVE.best = Math.round(t * 10) / 10; SAVE.stars = Math.max(SAVE.stars, stars); if(SAVE.tut < 4) SAVE.tut = 4; persist();
  const coins = stars * 4; gain(coins); bank(true);
  SFX.fanfare(); for(let i = 0; i < stars; i++) setTimeout(() => SFX.star(i), 400 + i * 260);
  burst(P.x, P.y + 2, P.z, 60, CONFETTI, 6, 1.2, 8, 4);
  R.res = { t, stars, best, coins };
  showRaceResult(); mpFx('fin', { t:Math.round(t * 10) / 10 });
}
const fmtT = t => { t = Math.max(0, t); const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const resultEl = $('#result'), rcard = $('#rcard');
function showRaceResult(){
  const r = R.res; if(!r) return;
  rcard.innerHTML = `<h2>🏁 ${L('وصلت!', 'Finished!', 'Bitti!')}</h2>
    <div class="stars">${[0, 1, 2].map(i => `<span class="${i < r.stars ? '' : 'off'}">⭐</span>`).join('')}</div>
    <div class="bigtime">⏱ ${fmtT(r.t)}</div>
    <p>${r.best ? '🏆 ' + L('أحسن وقت إلك!', 'Your best time!', 'En iyi zamanın!') : L('أحسن وقت: ', 'Best: ', 'En iyi: ') + fmtT(SAVE.best)} · +${N(r.coins)} 🪙</p>
    <div class="row"><button class="big-btn" id="bAgainR">🔄 ${L('كمان مرة', 'Again', 'Tekrar')}</button><button class="ghost-btn" id="bFree">🏜️ ${L('كمّل لعب', 'Keep playing', 'Oynamaya devam')}</button></div>`;
  resultEl.hidden = false;
  $('#bAgainR').onclick = () => { SFX.tap(); startRace(); };
  $('#bFree').onclick = () => { SFX.tap(); hideResult(); R.ph = 'idle'; };
}
function hideResult(){ resultEl.hidden = true; }

/* ======================================================================
   Camera
   ====================================================================== */
let snapYaw = false;
function updateCamera(dt){
  const tx = P.drive ? B.x : P.x, tz = P.drive ? B.z : P.z, ty = (P.drive ? B.y + 1.3 : P.y + 1.1);
  const idle = look.id == null && performance.now() - cam.lookT > 1400;
  if(P.drive){
    if(snapYaw){ cam.yaw = B.h + Math.PI; snapYaw = false; }
    if(idle && (Math.abs(B.s) > .5 || R.ph === 'count')) cam.yaw += angDiff(B.h + Math.PI, cam.yaw) * Math.min(1, dt * (1.2 + Math.abs(B.s) * .12));
  }
  const tun = ty < 3.2 ? W.tunnelAt(tx, tz) : null;
  let px, py, pz;
  if(tun){
    // inside the pyramid tunnel: a low camera between the walls, looking in
    const lx = clamp(tx - tun.x, -1.1, 1.1);
    px = tun.x + lx * .6; pz = Math.min(tz + 3.6, tun.out + 2); py = 1.85;
    if(tz - tun.z < 3.5) { px = tun.x + clamp(tx - tun.x, -3, 3) * .5; pz = Math.min(tz + 4.2, tun.z + 12); }
    cam.yaw += angDiff(0, cam.yaw) * Math.min(1, dt * 3);
  } else {
    const pitch = clamp((P.drive ? .3 : .34) + cam.pAdj, .05, 1.1);
    const want = P.drive ? 8.6 + Math.abs(B.s) * .07 : 7.2;
    const dx = Math.sin(cam.yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(cam.yaw) * Math.cos(pitch);
    // keep the camera out of pyramids and dunes
    let dd = want;
    for(let i = 1; i <= 8; i++){ const k = i / 8 * want, x = tx + dx * k, y = ty + dy * k, z = tz + dz * k; if(W.groundAt(x, z, y) > y - .5){ dd = Math.max(1.6, k - .8); break; } }
    cam.dist = dd < cam.dist ? dd : lerp(cam.dist, dd, Math.min(1, dt * 2.5));
    px = tx + dx * cam.dist; py = ty + dy * cam.dist; pz = tz + dz * cam.dist;
    py = Math.max(py, W.groundAt(px, pz) + .8);
  }
  _v.set(px, py, pz);
  if(snapCam){ camPos.copy(_v); camLook.set(tx, ty, tz); snapCam = false; }
  else { camPos.lerp(_v, 1 - Math.exp(-(P.drive ? 9 : 12) * dt)); camLook.lerp(_s.set(tx, ty, tz), 1 - Math.exp(-16 * dt)); }
  camera.position.copy(camPos);
  if(cam.shake > 0){ cam.shake = Math.max(0, cam.shake - dt); const k = cam.shake * .5; camera.position.x += (Math.random() - .5) * k; camera.position.y += (Math.random() - .5) * k; }
  camera.lookAt(camLook);
}

/* ======================================================================
   HUD, tips
   ====================================================================== */
const hudEl = $('#hud'), hudCoins = $('#hudCoins'), hudChests = $('#hudChests'), hudTime = $('#hudTime'), hudGate = $('#hudGate'), hudRoom = $('#hudRoom'), raceBtn = $('#btnRace');
const guideEl = $('#guide'), guideT = $('#guideT'), bannerEl = $('#banner'), popEl = $('#pop');
let hudKey = '', aKey = '', bKey = '', sayTO = 0;
function say(text, ms = 4200){ clearTimeout(sayTO); guideT.textContent = text; guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = ''; sayTO = setTimeout(() => { guideEl.hidden = true; }, ms); }
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
function banner(text, long){ bannerEl.textContent = text; bannerEl.classList.remove('go'); bannerEl.classList.toggle('long', !!long); void bannerEl.offsetWidth; bannerEl.classList.add('go'); }
const LINES = {
  hi: L('أهلا بالصحرا! 🏜️ هاي سيارة الرمل تبعك 🚙 قرّب منها واكبس A', 'Welcome to the desert! 🏜️ That is your sand buggy 🚙 walk to it and press A', 'Çöle hoş geldin! 🏜️ Bu senin kum araban 🚙 yanına git ve A\'ya bas'),
  drive: L('دفّش الجويستك لتسوق 🕹️ A = تيربو 🔥  B = زمّور 📯', 'Push the joystick to drive 🕹️ A = turbo 🔥  B = horn 📯', 'Sürmek için joystiği it 🕹️ A = turbo 🔥  B = korna 📯'),
  chests: L('في 5 كنوز مخبّاية 🎁 دوّر على الضو الدهبي… وواحد جوّا نفق الهرم! 🔦', 'There are 5 hidden treasures 🎁 look for the golden light… one is inside the pyramid tunnel! 🔦', '5 gizli hazine var 🎁 altın ışığı ara… biri piramit tünelinin içinde! 🔦'),
  race: L('مر من كل البوابات 🚩 اتبع السهم الأصفر!', 'Drive through every gate 🚩 follow the yellow arrow!', 'Her kapıdan geç 🚩 sarı oku takip et!')
};
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on; aBtn.hidden = !on; bBtn.hidden = !on;
  if(!on){ outBtn.hidden = true; aKey = bKey = ''; }
  hudKey = '';
}
function hudFrame(){
  const opened = W.CHESTS.filter(c => c.opened).length, racing = R.ph === 'count' || R.ph === 'go';
  const key = sessCoins + '|' + opened + '|' + racing + '|' + R.next + '|' + (mpActive() ? MP.code + ':' + (RM.size + 1) : '') + '|' + P.drive;
  if(key !== hudKey){
    hudKey = key;
    hudCoins.textContent = '🪙 ' + N(sessCoins); hudChests.textContent = '🎁 ' + N(opened) + '/' + N(W.CHESTS.length);
    hudGate.hidden = !racing; hudTime.hidden = !racing;
    if(racing) hudGate.textContent = '🚩 ' + N(Math.min(R.next - 1, W.CP.length)) + '/' + N(W.CP.length);
    hudRoom.hidden = !mpActive(); if(mpActive()) hudRoom.textContent = '🏠 ' + [...MP.code].map(N).join('') + ' · 👫 ' + N(RM.size + 1);
    raceBtn.textContent = racing ? '✖️' : '🏁';
    outBtn.hidden = !P.drive; $('#outB').textContent = L('انزل', 'Get out', 'İn');
  }
  if(racing){ const ts = '⏱ ' + fmtT(R.t); if(hudTime.textContent !== ts) hudTime.textContent = ts; }
  // A
  const near = nearBuggy() && R.ph !== 'count';
  const a = P.drive ? ['🔥', L('تيربو', 'Turbo', 'Turbo'), 'var(--orange)'] : near ? ['🚙', L('اركب', 'Get in', 'Bin'), 'var(--mint)'] : ['⤴️', L('نط', 'Jump', 'Zıpla'), 'var(--sky)'];
  const ak = a[0] + a[1];
  if(ak !== aKey){ aKey = ak; $('#aI').textContent = a[0]; $('#aB').textContent = a[1]; aBtn.style.setProperty('--ac', a[2]); aBtn.classList.toggle('pulse', near); }
  const cdp = P.drive ? clamp(B.cd / BOOST_CD, 0, 1) : 0; $('#aCd').style.setProperty('--p', (cdp * 100).toFixed(1) + '%'); aBtn.classList.toggle('wait', cdp > 0);
  // B
  const ch = !P.drive && nearChest(), cm = !P.drive && !ch && nearCamel();
  const b = P.drive ? ['📯', L('زمّور', 'Horn', 'Korna')] : ch ? ['🎁', L('افتح', 'Open', 'Aç')] : cm ? ['🐪', L('مسّح', 'Pat', 'Sev')] : ['👋', L('سلام', 'Wave', 'El salla')];
  const bk = b[0] + b[1];
  if(bk !== bKey){ bKey = bk; $('#bI').textContent = b[0]; $('#bB').textContent = b[1]; bBtn.classList.toggle('pulse', !!ch); }
}
raceBtn.onclick = () => { SFX.tap(); if(R.ph === 'count' || R.ph === 'go') stopRace(); else startRace(); };

/* ======================================================================
   Menu, hero picker, pause
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'menu';
function spawn(){
  P.drive = false; attachHero();
  const c = W.CAMP, k = mpActive() ? MP.meta.c : 0;
  P.x = c.x - 2 - k * 5; P.z = c.z - 8; P.y = W.groundAt(P.x, P.z); P.vx = P.vz = P.vy = 0; P.f = Math.PI; P.gr = true;
  B.x = c.x + 3.5 - k * 5; B.z = c.z - 11; B.y = W.groundAt(B.x, B.z); B.h = Math.PI * .92; B.s = 0; B.air = false; B.vy = 0; B.boost = 0; B.cd = 0;
  cam.yaw = 0; cam.pAdj = 0; snapCam = true;
}
function showMenu(){
  if(MP.t) mpLeave(true);
  bank(true); AU.music(false); AU.engine(false);
  R.ph = 'idle'; arrow.visible = gateMark.visible = false; hideResult(); for(const a of [...RM.keys()]) dropRemote(a);
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('desert_rothint');
  const got = SAVE.chests.length;
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🏜️</div><h1>${L('صحرا بوبو', 'Bobo Desert', 'Bobo Çölü')}</h1>
    <p class="sub">${L('سوق سيارة الرمل، لاقي الكنوز، وتسابق حول الأهرامات!', 'Drive the sand buggy, find treasure and race around the pyramids!', 'Kum arabasını sür, hazine bul ve piramitlerin etrafında yarış!')}</p>
    <div class="mine"><span>🎁 ${N(got)}/${N(W.CHESTS.length)}</span>${SAVE.best ? `<span>🏁 ${fmtT(SAVE.best)} ${'⭐'.repeat(SAVE.stars)}</span>` : ''}</div>
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn orange" id="bRace">🏁 ${L('سباق الرمل', 'Sand Race', 'Kum Yarışı')}</button></div>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div>`;
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); startPlay(); };
  $('#bRace').onclick = () => { AU.ac(); SFX.tap(); startPlay(); startRace(); };
  $('#bMp').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
  $('#bHero').onclick = () => { AU.ac(); SFX.tap(); showSelect('menu'); };
}
function startPlay(){
  if(ROT) rawSet('desert_rothint', '1');
  spawn(); setBuggyColor(mpActive() ? BCOL[MP.meta.c % 4] : BCOL[0]);
  state = 'play'; overlay.hidden = true; setPlayUI(true); clearInput(); placeJoyHome(); hideResult();
  AU.music(true);
  if(SAVE.tut < 1){ SAVE.tut = 1; persist(); setTimeout(() => { if(state === 'play' && !P.drive) say(LINES.hi, 6500); }, 700); }
  else if(SAVE.tut < 3 && SAVE.chests.length === 0){ SAVE.tut = 3; persist(); setTimeout(() => { if(state === 'play') say(LINES.chests, 6500); }, 900); }
  if(mpActive()) mpPos(true);
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
    if(selFrom === 'pause') resume();
    else if(selFrom === 'mp'){ if(mpActive()) resume(); else mpMenu(); }
    else showMenu();
  };
}
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush(); AU.engine(false); bank(true);
  const mp = mpActive(), racing = R.ph === 'count' || R.ph === 'go';
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    ${mp ? `<p>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${[...MP.code].map(N).join('')}</bdi></p>` : ''}
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${AU.muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    ${racing ? `<button class="ghost-btn" id="bStopR">🏁 ${L('وقّف السباق', 'Stop the race', 'Yarışı durdur')}</button>` : ''}
    <button class="ghost-btn" id="bMenuP">🏠 ${mp ? L('اطلع من الغرفة', 'Leave the room', 'Odadan çık') : L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { AU.setMuted(!AU.muted); $('#bSnd').innerHTML = (AU.muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  if(racing) $('#bStopR').onclick = () => { SFX.tap(); stopRace(); resume(); };
  $('#bMenuP').onclick = () => { SFX.tap(); showMenu(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ bank(true); persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); hudKey = ''; aKey = ''; bKey = ''; if(R.res && R.ph === 'done') showRaceResult(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* ======================================================================
   Remote players (online)
   ====================================================================== */
const RM = new Map(), labelsEl = $('#labels');
function labelEl(){ const d = document.createElement('div'); d.className = 'nm'; d.hidden = true; labelsEl.appendChild(d); return d; }
function dropRemote(id){ const a = RM.get(id); if(!a) return; if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); if(a.bug) scene.remove(a.bug.grp); a.lbl.remove(); RM.delete(id); hudKey = ''; }
function remoteSync(list){
  const here = new Set();
  for(const p of list){
    if(p.id === MP.id) continue;
    here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, av:null, avK:'', h:null, bug:null, c:-1, lbl:labelEl(), buf:[], seen:false, born:performance.now(), t:Math.random() * 5, x:0, y:0, z:0, f:0, m:0, d:0, b:null, wave:0, last:0 }; RM.set(p.id, a); setTimeout(() => mpPos(true), 100 + Math.random() * 300); SFX.door(); hudKey = ''; }
    const hero = okHero(p.hero), av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(a.hero !== hero || a.avK !== avK){ if(a.h) a.h.grp.parent && a.h.grp.parent.remove(a.h.grp); a.hero = hero; a.av = av; a.avK = avK; a.h = makeHero(hero, av); a.h.grp.visible = false; scene.add(a.h.grp); a.sat = false; }
    const c = clamp(p.c | 0, 0, 3);
    if(a.c !== c){ if(a.bug) scene.remove(a.bug.grp); a.c = c; a.bug = buggyModel(BCOL[c]); a.bug.grp.visible = false; scene.add(a.bug.grp); a.sat = false; a.lbl.style.setProperty('--c', MCOL[c]); }
  }
  for(const id of [...RM.keys()]) if(!here.has(id)) dropRemote(id);
}
const INTERP = 220;
function stepRemotes(dt){
  const now = performance.now(), rt = now - INTERP;
  for(const a of RM.values()){
    a.t += dt;
    if(a.buf.length){
      let i = a.buf.length - 1; while(i > 0 && a.buf[i - 1].t > rt) i--;
      const q = a.buf[i], pr = i > 0 ? a.buf[i - 1] : null;
      let s = q;
      if(pr && q.t > rt){ const k = clamp((rt - pr.t) / Math.max(1, q.t - pr.t), 0, 1); s = {}; for(const key of ['x', 'y', 'z', 'm', 'bx', 'by', 'bz', 'bs', 'bp', 'br', 'st']) s[key] = lerp(pr[key], q[key], k); s.f = pr.f + angDiff(q.f, pr.f) * k; s.bh = pr.bh + angDiff(q.bh, pr.bh) * k; s.d = q.d; s.bo = q.bo; }
      const k = 1 - Math.exp(-16 * dt);
      a.x = lerp(a.x, s.x, k); a.y = lerp(a.y, s.y, k); a.z = lerp(a.z, s.z, k); a.f += angDiff(s.f, a.f) * k; a.m = lerp(a.m, s.m, k); a.d = s.d;
      if(!a.b) a.b = { x:s.bx, y:s.by, z:s.bz, h:s.bh, s:0, pit:0, rol:0, steer:0, spin:0, land:0 };
      const b = a.b; b.x = lerp(b.x, s.bx, k); b.y = lerp(b.y, s.by, k); b.z = lerp(b.z, s.bz, k); b.h += angDiff(s.bh, b.h) * k; b.s = lerp(b.s, s.bs, k); b.pit = lerp(b.pit, s.bp, k); b.rol = lerp(b.rol, s.br, k); b.steer = lerp(b.steer, s.st, k);
      b.spin += b.s * dt / .44; a.boost = s.bo;
    }
    if(!a.h || !a.bug) continue;
    const show = a.seen;
    a.bug.grp.visible = show; a.h.grp.visible = show;
    if(!show) continue;
    poseBuggy(a.bug, a.b, a.t, a.boost);
    if(a.d){
      if(!a.sat){ a.bug.seat.add(a.h.grp); a.h.grp.position.set(0, SEAT_Y, 0); a.h.grp.rotation.set(0, 0, 0); a.sat = true; }
      seatPose(a.h, a.t, a.b.steer);
    } else {
      if(a.sat){ scene.add(a.h.grp); a.sat = false; }
      a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
      poseHero(a.h, { t:a.t, dt, run:a.m, grounded:a.y - W.groundAt(a.x, a.z, a.y + .5) < .15, vy:2, sq:0, flip:0 });
      if(a.wave > 0){ a.wave -= dt; waveArm(a.h, a.t); }
    }
  }
  if(mpActive() && now - (MP.askT || 0) > 2500 && [...RM.values()].some(a => !a.seen && now - a.born > 1500)){ MP.askT = now; mpSend('hi', {}); }
}
function waveArm(h, t){ const arm = h.arms.find(x => x.userData.side < 0) || h.arms[0]; if(arm){ arm.rotation.x = -.3; arm.rotation.z = 2.5 + Math.sin(t * 14) * .35; } }
function placeLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  for(const a of RM.values()){
    const show = state === 'play' && a.seen && a.h && Math.hypot(a.x - camera.position.x, a.z - camera.position.z) < 70;
    if(a.lbl.hidden !== !show) a.lbl.hidden = !show;
    if(!show) continue;
    const txt = BoboRT.who(a.id, '') || HERO_NAME[a.hero] || '';
    if(a.lbl.textContent !== txt) a.lbl.textContent = txt;
    const y = a.d ? a.b.y + 2.6 : a.y + 1.75, x = a.d ? a.b.x : a.x, z = a.d ? a.b.z : a.z;
    _v.set(x, y, z).project(camera);
    if(_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1){ a.lbl.style.visibility = 'hidden'; continue; }
    a.lbl.style.visibility = ''; a.lbl.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`;
  }
}

/* ======================================================================
   Main loop
   ====================================================================== */
let T = 0, last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  const playing = state === 'play' || (mpActive() && (state === 'pause' || state === 'select'));
  if(playing){
    if(state === 'play'){
      if(!P.drive && wantA && nearBuggy() && R.ph !== 'count'){ wantA = false; enterBuggy(); }
      if(P.drive) stepBuggy(dt, R.ph === 'count'); else stepWalk(dt);
      if(wantB){ wantB = false; doB(); }
      pickups(dt); stepRace(dt);
    }
    if(P.drive){ heroM && seatPose(heroM, T, B.steer); }
    else if(heroM){
      P.t += dt; P.sq = lerp(P.sq, 0, Math.min(1, dt * 10));
      heroM.grp.position.set(P.x, P.y, P.z); heroM.grp.rotation.y = P.f;
      poseHero(heroM, { t:P.t, dt, run:P.m, grounded:P.gr, vy:P.vy, sq:P.sq, flip:0 });
      if(P.wave > 0){ P.wave -= dt; waveArm(heroM, P.t); }
    }
    poseBuggy(bugM, B, T, B.boost > 0);
    if(state === 'play'){ AU.engine(P.drive, clamp(Math.abs(B.s) / B_MAX, 0, 1.4), B.boost > 0); hudFrame(); }
    stepRemotes(dt);
    updateCamera(dt); aimSun(camLook.x, camLook.z);
    if(shotCam){ camera.position.set(shotCam[0], shotCam[1], shotCam[2]); camera.lookAt(shotCam[3], shotCam[4], shotCam[5]); }
  } else if(state === 'menu' || state === 'mp' || (state === 'select' && selFrom !== 'pause')){
    menuT += dt; const a = menuT * .05 + 2.2;
    camera.position.set(Math.sin(a) * 95 + 10, 34 + Math.sin(menuT * .2) * 4, Math.cos(a) * 95 - 35); camera.lookAt(0, 6, -40); aimSun(0, -30);
    if(bugM){ poseBuggy(bugM, B, T, false); }
    if(heroM && !P.drive){ heroM.grp.position.set(P.x, P.y, P.z); poseHero(heroM, { t:T, dt, run:0, grounded:true, vy:0, sq:0, flip:0 }); }
  }
  SKY.position.copy(camera.position); SUNG.position.set(camera.position.x + 250, 330, camera.position.z + 260);
  W.animate(dt, T, camera.position.x, camera.position.z);
  mpFrame(dt);
  if(state === 'play') bank(false);
  updateParts(dt);
  renderer.render(scene, camera);
  placeLabels();
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ bank(true); persist(); AU.engine(false); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => { bank(true); persist(); try{ if(MP.t) mpLeave(true); }catch(e){} });

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   Everyone sends their own kid + buggy. Events: pos (each player), fx (horn / wave / boost / finish), hi (ask for positions)
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'fx', 'hi'];
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-desert-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-desert-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, synced:false, screen:'off', tok:0, sendT:0, inviteFor:null, typed:'', askT:0, lastK:'' };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'desert';
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
function mpClose(){
  frRoom(null);
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.synced = false;
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
  MP.meta = { fc:BoboRT.fc(), hero:heroId, av:myAv(), c, o:others.reduce((m, p) => Math.max(m, +p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.av = myAv(); MP.meta.fc = BoboRT.fc(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe' && typeof p.id === 'string');
  BoboRT.see(list, () => {});
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  if(all.findIndex(p => p.id === MP.id) >= MP_MAX){ mpLeave(); showMenu(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  MP.players = all.slice(0, MP_MAX);
  remoteSync(MP.players);
}
const r2 = v => Math.round(v * 100) / 100;
/* my kid + my buggy for everyone: ~8 a second while moving, once a second when still */
function mpPos(force){
  if(!mpActive() || state === 'menu') return;
  MP.sendT = 0;
  mpSend('pos', { x:r2(P.x), y:r2(P.y), z:r2(P.z), f:r2(P.f), m:r2(P.m), d:P.drive ? 1 : 0,
    bx:r2(B.x), by:r2(B.y), bz:r2(B.z), bh:r2(B.h), bs:r2(B.s), bp:r2(B.pit), br:r2(B.rol), st:r2(B.steer), bo:B.boost > 0 ? 1 : 0 });
}
function mpFx(k, extra){ if(mpActive()) mpSend('fx', Object.assign({ k }, extra || {})); }
const num = (v, a, b) => clamp(+v || 0, a, b);
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){
    if(!a) return;
    const q = { t:performance.now(), x:num(p.x, -160, 160), y:num(p.y, -5, 60), z:num(p.z, -160, 160), f:+p.f || 0, m:num(p.m, 0, 1), d:p.d ? 1 : 0,
      bx:num(p.bx, -160, 160), by:num(p.by, -5, 60), bz:num(p.bz, -160, 160), bh:+p.bh || 0, bs:num(p.bs, -40, 40), bp:num(p.bp, -1, 1), br:num(p.br, -1, 1), st:num(p.st, -1, 1), bo:p.bo ? 1 : 0 };
    a.buf.push(q); if(a.buf.length > 10) a.buf.shift();
    if(!a.seen){ a.seen = true; a.x = q.x; a.y = q.y; a.z = q.z; a.f = q.f; a.b = { x:q.bx, y:q.by, z:q.bz, h:q.bh, s:0, pit:0, rol:0, steer:0, spin:0, land:0 }; }
    a.last = q.t;
  } else if(ev === 'fx'){
    if(!a || !a.seen) return;
    const x = a.d ? a.b.x : a.x, z = a.d ? a.b.z : a.z, d = Math.hypot(x - P.x, z - P.z), vol = clamp(1 - d / 60, 0, 1);
    if(p.k === 'horn' && vol > 0 && state === 'play') SFX.horn(vol);
    else if(p.k === 'wave'){ a.wave = 1.2; }
    else if(p.k === 'fin'){ burst(x, (a.d ? a.b.y : a.y) + 2, z, 30, CONFETTI, 5, 1, 8, 3); }
  } else if(ev === 'hi'){ setTimeout(() => mpPos(true), 50 + Math.random() * 300); }
}
function mpFrame(dt){
  if(!mpActive()) return;
  MP.sendT += dt;
  const moving = (P.drive ? Math.abs(B.s) > .2 || B.air : P.m > .05 || !P.gr) || P.wave > 0;
  if(MP.sendT >= (moving ? .125 : 1)) mpPos(false);
}
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; }
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏜️ ${L('لحتى 4 أصحاب بنفس الصحرا، كل واحد مع سيارته', 'Up to 4 friends in the same desert, each with a buggy', 'Aynı çölde 4 arkadaşa kadar, herkesin kendi arabası var')}</p>
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
/* in the room: straight into the shared desert (the room number is on the HUD and in the pause card) */
function mpEnter(created){
  MP.screen = 'in'; startPlay();
  const code = [...MP.code].map(N).join('');
  if(created) say(L('🏠 غرفتك رقم ', '🏠 Your room number is ', '🏠 Oda numaran ') + code + L(' — قول لأصحابك يفوتوا!', ' — tell your friends to join!', ' — arkadaşlarına söyle, katılsınlar!'), 7000);
  else say(L('👫 فتت على غرفة ', '👫 You joined room ', '👫 Odaya katıldın: ') + code, 4000);
}
async function mpCreate(want){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = i === 0 && /^\d{4}$/.test(want || '') ? String(want) : String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(r === 'ok'){ mpEnter(true); mpSendInvite(); return; }
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
    if(r === 'ok'){ mpEnter(false); mpSend('hi', {}); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'desert' yet: guarded. */
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
window.__desert = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(), play:() => startPlay(),
  get me(){ return { x:P.x, y:P.y, z:P.z, f:P.f, drive:P.drive, gr:P.gr, water:P.inWater }; },
  get buggy(){ return { x:B.x, y:B.y, z:B.z, h:B.h, s:B.s, air:B.air, boost:B.boost, cd:B.cd }; },
  get coins(){ return sessCoins; }, get banked(){ return SAVE.cd.n; }, get chests(){ return W.CHESTS.map(c => ({ id:c.id, x:c.x, y:c.y, z:c.z, opened:c.opened })); },
  get race(){ return { ph:R.ph, t:R.t, next:R.next, res:R.res }; }, get gates(){ return W.CP.map(c => ({ x:c.x, z:c.z, a:c.a })); },
  get save(){ return JSON.parse(JSON.stringify(SAVE)); },
  tp(x, z, y){ P.x = x; P.z = z; P.y = y != null ? y : W.groundAt(x, z, 30); P.vx = P.vz = P.vy = 0; if(P.drive){ B.x = x; B.z = z; B.y = P.y; } snapCam = true; },
  tpBuggy(x, z, h){ B.x = x; B.z = z; B.y = W.groundAt(x, z, 30); if(h != null) B.h = h; snapCam = true; },
  input(x, y){ testInput = (x == null) ? null : { x, y }; }, go(x, z, k = 1){ testGo = x == null ? null : { x, z, k }; }, a:() => { wantA = true; }, b:() => { wantB = true; }, out:() => exitBuggy(), enter:() => enterBuggy(),
  startRace:() => startRace(), stopRace:() => stopRace(), setT(t){ R.t = t; }, setYaw(y){ cam.yaw = y; cam.lookT = performance.now(); }, pitch(p){ cam.pAdj = p; },
  ground:(x, z, y) => W.groundAt(x, z, y), get coinList(){ return W.COINS.map(c => ({ x:c.x, y:c.y, z:c.z, got:c.got })); }, get rings(){ return W.RINGS.map(r => ({ x:r.x, y:r.y, z:r.z, a:r.a, got:r.got })); },
  get mp(){ return { code:MP.code, active:mpActive(), screen:MP.screen, id:MP.id, players:MP.players.map(p => ({ id:p.id, hero:p.hero, c:p.c })) }; },
  get remotes(){ return [...RM.values()].map(a => ({ id:a.id, hero:a.hero, seen:a.seen, d:a.d, x:a.x, z:a.z, bx:a.b && a.b.x, bz:a.b && a.b.z, label:a.lbl.hidden ? null : a.lbl.textContent })); },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get calls(){ return renderer.info.render.calls; }, get tris(){ return renderer.info.render.triangles; },
  hud(on){ for(const el of [hudEl, joyEl, aBtn, bBtn, outBtn, guideEl]) el.style.visibility = on ? '' : 'hidden'; },
  shot(v){ shotCam = v; }, hush, bank:() => bank(true),
  mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c, performance.now() + 20000)
};
let shotCam = null;

/* ---------- boot ---------- */
for(const c of W.CHESTS) if(SAVE.chests.includes(c.id)){ c.opened = true; c.open = 1; }
spawn();
resize();
showMenu();
requestAnimationFrame(frame);
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(room); }
})();
