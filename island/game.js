/* «جزيرة بوبو الكبيرة 🏝️ / Bobo Big Island» — the shared hub world.
   Every kid online walks around the same island (public shards of up to 16: Supabase Realtime channels
   `bobo-island-<n>`; ?mp=local = BroadcastChannel for tests) and sees the others with their NAME above their head.
   Child safety: presence carries only the friend code + character; names are fetched from the server
   (Friends.names → bobo_island_names, filtered there) and never taken from other clients. No chat, no free text
   (the only text box is the «شو اسمك؟» screen, checked by bobo_fr_set_name).
   Glowing portals open the games; kids standing in a portal ring together go into the same room
   (the first kid by join order hosts: <game>/?host=1&room=<code>, the others <game>/?join=<code>). */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makePetModels } from '../pets/models.js';
import { makeGardenModels } from '../garden/models.js';
import { buildIsland, ISL } from './world.js';

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
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const CAP = clamp(parseInt(QS.get('cap'), 10) || 16, 1, 16), SHARDS = 20;
const hasFr = () => !!window.Friends;
const cleanName = s => String(s || '').replace(/[^\p{L} ]/gu, '').replace(/\s+/g, ' ').slice(0, 14);

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'island_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : '');
function loadSave(){
  try{ const v = JSON.parse(rawGet(SAVE_KEY)); if(v && typeof v === 'object' && v.v === 1) return { v:1, hero:v.hero, tut:clamp(v.tut | 0, 0, 3), seen:Array.isArray(v.seen) ? v.seen.filter(s => typeof s === 'string').slice(0, 8) : [], done:!!v.done }; }catch(e){}
  return { v:1, hero:null, tut:0, seen:[], done:false };
}
const SAVE = loadSave();
const persist = () => rawSet(SAVE_KEY, JSON.stringify(SAVE));
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : HERO_IDS[0];

/* ---------- always-landscape stage ---------- */
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

/* ---------- sound (tiny synth) ---------- */
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
  jump(){ tone(330, .16, 'sine', .1, 0, 660); },
  star(){ [1046, 1318, 1568, 2093].forEach((f, i) => tone(f, .09, 'triangle', .08, i * .05)); },
  heart(){ tone(880, .1, 'sine', .1, 0, 1320); tone(1320, .12, 'sine', .07, .08, 1760); },
  splash(){ [0, .2, .4].forEach(d => tone(700, .15, 'sine', .06, d, 200)); },
  pop(){ tone(600, .08, 'triangle', .1, 0, 900); },
  tick(){ tone(880, .06, 'triangle', .08); },
  go(){ [523, 659, 784, 1046].forEach((f, i) => tone(f, .16, 'triangle', .12, i * .08)); },
  join(){ [523, 659].forEach((f, i) => tone(f, .12, 'triangle', .08, i * .08)); }
};

/* ---------- renderer, sky, light ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = (window.BoboGfx ? BoboGfx.dpr(1.5, renderer) : Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = window.BoboGfx && BoboGfx.weak(renderer) ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcdeeff, 75, 190);
const camera = new THREE.PerspectiveCamera(55, 1, 0.3, 900);
function resize(){ layout(); renderer.setSize(SW, SH, false); camera.aspect = SW / SH; camera.updateProjectionMatrix(); placeJoyHome(); }
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
scene.add(new THREE.HemisphereLight(0xfff4e2, 0x7f9a6c, 1.9));
const sun = new THREE.DirectionalLight(0xfff0d4, 2.2);
sun.castShadow = true; sun.shadow.mapSize.setScalar(window.BoboGfx ? BoboGfx.shadow(1024, renderer) : 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .02;
Object.assign(sun.shadow.camera, { left:-20, right:20, top:20, bottom:-20, near:1, far:100 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(18, 34, 14);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const sky = (() => {
  const g = new THREE.SphereGeometry(600, 24, 16), col = new Float32Array(g.attributes.position.count * 3);
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors:true, side:THREE.BackSide, fog:false, depthWrite:false }));
  const pa = g.attributes.position, a = new THREE.Color(0x67bdf5), h = new THREE.Color(0xeaf7ff), b = new THREE.Color(0xbfe6ff), t = new THREE.Color();
  for(let i = 0; i < pa.count; i++){ const y = pa.getY(i) / 600; if(y >= 0) t.copy(h).lerp(a, clamp(Math.pow(y, .6) * 1.5, 0, 1)); else t.copy(h).lerp(b, clamp(-y * 2.2, 0, 1)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
  m.renderOrder = -1; scene.add(m); return m;
})();
// a few soft clouds
const clouds = new THREE.Group(); scene.add(clouds);
{ const cm = new THREE.MeshLambertMaterial({ color:0xffffff, emissive:0xffffff, emissiveIntensity:.35, fog:false });
  for(let k = 0; k < 12; k++){ const c = new THREE.Group(), a = k / 12 * Math.PI * 2, r = 150 + (k % 3) * 40; for(let j = 0; j < 4; j++){ const s = new THREE.Mesh(K.G.sm, cm); s.scale.set(9 - j, 5 - j * .6, 7 - j * .5); s.position.set(j * 6 - 9, Math.sin(j) * 2, (j % 2) * 3); c.add(s); } c.position.set(Math.sin(a) * r, 55 + (k % 4) * 8, Math.cos(a) * r); c.rotation.y = a; clouds.add(c); } }
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color();

/* ---------- particles (confetti, water drops) + floating hearts ---------- */
const PMAX = 220, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.08, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = .7 + Math.random() * .6; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + 2; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(colors[Math.floor(Math.random() * colors.length)]));
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
const heartTex = K.canvasTex(64, 64, x => { x.fillStyle = '#ff5d8f'; x.beginPath(); x.moveTo(32, 56); x.bezierCurveTo(4, 36, 6, 10, 22, 10); x.bezierCurveTo(28, 10, 32, 16, 32, 20); x.bezierCurveTo(32, 16, 36, 10, 42, 10); x.bezierCurveTo(58, 10, 60, 36, 32, 56); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(20, 22, 5, 7, -.5, 0, 6.3); x.fill(); });
const floaters = [];
for(let i = 0; i < 30; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:heartTex, transparent:true, depthWrite:false })); s.visible = false; scene.add(s); floaters.push({ s, life:0, vx:0, vy:0, vz:0 }); }
let fNext = 0;
function hearts(x, y, z, n = 3, size = .45){
  for(let k = 0; k < n; k++){
    const f = floaters[fNext]; fNext = (fNext + 1) % floaters.length; f.s.visible = true;
    f.s.position.set(x + (Math.random() - .5) * .6, y, z + (Math.random() - .5) * .6); f.s.scale.setScalar(size * (.8 + Math.random() * .4));
    f.life = 1.3 + Math.random() * .4; f.vx = (Math.random() - .5) * .5; f.vy = 1 + Math.random() * .6; f.vz = (Math.random() - .5) * .5;
  }
}
function updateFloaters(dt){ for(const f of floaters){ if(f.life <= 0) continue; f.life -= dt; f.s.position.x += f.vx * dt; f.s.position.y += f.vy * dt; f.s.position.z += f.vz * dt; f.s.material.opacity = clamp(f.life * 1.5, 0, 1); if(f.life <= 0) f.s.visible = false; } }

/* ---------- the island ---------- */
const PM = makePetModels(THREE, K), GM = makeGardenModels(THREE, K);
const W = buildIsland(THREE, K, scene, { PM, GM });
const ZONES = W.zones, PORTALS = W.portals;
const GAME_ZONES = ZONES.filter(z => !z.soon);
const zoneById = id => ZONES.find(z => z.id === id);

/* ---------- the player ---------- */
const P = { x:W.spawn.x, z:W.spawn.z, y:0, vx:0, vz:0, vy:0, face:W.spawn.f, move:0, grounded:true, cup:null, carry:false, emo:null, act:null };
let heroM = null, T = 0;
const eggGeo = (() => { const g = new THREE.SphereGeometry(.5, 14, 10), p = g.attributes.position; for(let i = 0; i < p.count; i++){ const y = p.getY(i), k = y > 0 ? 1 - y * .36 : 1 + y * .06; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); p.setY(i, y * 1.28 + .64); } g.computeVertexNormals(); return g; })();
const eggMat = new THREE.MeshLambertMaterial({ color:0xfff3d6 });
function makeHero(id, av){ const h = id === 'me' ? HEROES.me(av || undefined) : HEROES[id](); K.shadowHero(h); const egg = new THREE.Mesh(eggGeo, eggMat); egg.scale.setScalar(.5); egg.position.set(0, 1.62, 0); egg.visible = false; egg.castShadow = true; h.grp.add(egg); h.egg = egg; return h; }
function setHero(id){ heroId = HERO_IDS.includes(id) ? id : 'sara'; if(heroM) scene.remove(heroM.grp); heroM = makeHero(heroId); scene.add(heroM.grp); }
const canMesh = new THREE.Mesh(GM.canGeo(), GM.MAT); canMesh.visible = false; canMesh.scale.setScalar(1.3); scene.add(canMesh);

/* ---------- camera + input ---------- */
const cam = { yaw:0, pitch:.5, dist:9.5, tx:P.x, ty:0, tz:P.z, pAdj:0 };
let snapCam = true;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
const inGiant = () => { const z = ZONES[6]; const lx = (P.x - z.cx) * z.c - (P.z - z.cz) * z.s, lz = (P.x - z.cx) * z.s + (P.z - z.cz) * z.c; return lx > -11.5 && lx < 11.5 && lz > -15.5 && lz < 4.5; };
function updateCamera(dt){
  const giant = inGiant();
  const wantPitch = giant ? .85 : P.cup ? .95 : .5, wantDist = giant ? 11 : 9.5;
  cam.pitch = lerp(cam.pitch, clamp(wantPitch + cam.pAdj, .2, 1.25), Math.min(1, dt * 3)); cam.dist = lerp(cam.dist, wantDist, Math.min(1, dt * 3));
  const k = snapCam ? 1 : 1 - Math.exp(-8 * dt);
  cam.tx = lerp(cam.tx, P.x, k); cam.tz = lerp(cam.tz, P.z, k); cam.ty = lerp(cam.ty, P.y, snapCam ? 1 : 1 - Math.exp(-5 * dt));
  const dx = Math.sin(cam.yaw) * Math.cos(cam.pitch), dy = Math.sin(cam.pitch), dz = Math.cos(cam.yaw) * Math.cos(cam.pitch);
  // don't let walls, houses and towers come between the camera and the kid: pull the camera in
  let dist = cam.dist;
  for(let i = 1; i <= 10; i++){ const d = cam.dist * i / 10, h = W.solidTop(cam.tx + dx * d, cam.tz + dz * d); if(h > cam.ty + 1.2 + dy * d - .3){ dist = Math.max(1.6, d - cam.dist * .12); break; } }
  cam.d2 = cam.d2 == null || snapCam ? dist : (dist < cam.d2 ? dist : lerp(cam.d2, dist, Math.min(1, dt * 2.5)));
  _v.set(cam.tx + dx * cam.d2, cam.ty + 1.2 + dy * cam.d2, cam.tz + dz * cam.d2);
  if(snapCam){ camPos.copy(_v); snapCam = false; } else camPos.lerp(_v, 1 - Math.exp(-10 * dt));
  camLook.set(cam.tx, cam.ty + 1.1, cam.tz);
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), actBtn = $('#btnAct'), touch = $('#touch'), jumpBtn = $('#btnJump'), emoBtn = $('#btnEmo'), emosEl = $('#emos');
let joyHome = [90, 0];
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); ac(); emosEl.hidden = true;
  if(state !== 'play') return;
  const p = toLayer(e.clientX, e.clientY);
  if(p.x < SW * .4 && joy.id == null){
    joy.id = e.pointerId; joy.ox = clamp(p.x, Math.max(70, SAL + 64), SW * .4); joy.oy = clamp(p.y, 140, SH - 70);
    setJoy(joy.ox, joy.oy); joyEl.classList.add('on'); moveJoy(p.x, p.y);
  } else if(look.id == null){ look.id = e.pointerId; look.sx = look.x = p.x; look.sy = look.y = p.y; look.t0 = performance.now(); }
  try{ touch.setPointerCapture(e.pointerId); }catch(err){}
});
function moveJoy(x, y){
  let dx = x - joy.ox, dy = y - joy.oy; const d = Math.hypot(dx, dy), m = 52;
  if(d > m){ dx *= m / d; dy *= m / d; }
  knob.style.transform = `translate(${dx}px,${dy}px)`; joy.x = dx / m; joy.y = dy / m;
}
touch.addEventListener('pointermove', e => {
  const p = toLayer(e.clientX, e.clientY);
  if(e.pointerId === joy.id) moveJoy(p.x, p.y);
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.3, .45); look.x = p.x; look.y = p.y; }
});
function endPtr(e){
  if(e.pointerId === joy.id){ joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; joyEl.classList.remove('on'); setJoy(...joyHome); }
  if(e.pointerId === look.id){ look.id = null; const p = toLayer(e.clientX, e.clientY); if(Math.hypot(p.x - look.sx, p.y - look.sy) < 14 && performance.now() - look.t0 < 450 && e.type === 'pointerup') tapAt(p.x, p.y); }
}
touch.addEventListener('pointerup', endPtr); touch.addEventListener('pointercancel', endPtr);
const holdBtn = (b, fn) => { b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); ac(); fn(); }); };
holdBtn(actBtn, () => doAction());
holdBtn(jumpBtn, () => doJump());
holdBtn(emoBtn, () => { SFX.tap(); emosEl.hidden = !emosEl.hidden; });
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(e.target && e.target.tagName === 'INPUT') return;
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if(state !== 'play' || e.repeat) return;
  if(e.code === 'Space'){ doJump(); e.preventDefault(); }
  else if(e.code === 'Enter' || e.code === 'KeyF'){ doAction(); e.preventDefault(); }
  else if(e.code === 'Escape' || e.code === 'KeyP') showPause();
  else if(/^Digit[1-4]$/.test(e.code)) emote(EMOTES[+e.code.slice(5) - 1].k);
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}

/* ---------- walking: ground height (stairs, bridges, the bed), water, solid things ---------- */
const SPEED = 6, GRAV = 22, JUMP_V = 7.6, STEP = .6;
const okAt = (x, z) => { const g = W.heightAt(x, z); return g > -.5 && g <= P.y + STEP; };
function stepPlayer(dt){
  if(P.cup){ P.vx = P.vz = 0; P.move = 0; if(inp.m > .5) leaveCup(); return; }
  P.vx += (inp.x * SPEED - P.vx) * Math.min(1, 12 * dt); P.vz += (inp.z * SPEED - P.vz) * Math.min(1, 12 * dt);
  const nx = P.x + P.vx * dt, nz = P.z + P.vz * dt;
  if(okAt(nx, nz)){ P.x = nx; P.z = nz; } else if(okAt(nx, P.z)){ P.x = nx; P.vz *= .5; } else if(okAt(P.x, nz)){ P.z = nz; P.vx *= .5; } else { P.vx = P.vz = 0; }
  const o = { x:P.x, z:P.z }; W.pushOut(o, .42, P.y);
  if(okAt(o.x, o.z)){ P.x = o.x; P.z = o.z; }
  const g = W.heightAt(P.x, P.z);
  if(P.grounded){ if(g >= P.y - .75 && g <= P.y + STEP) P.y = g; else P.grounded = false; }
  if(!P.grounded){ P.vy -= GRAV * dt; P.y += P.vy * dt; if(P.y <= g && P.vy <= 0){ P.y = Math.max(g, 0); P.vy = 0; P.grounded = true; } }
  if(inp.m > 0) P.face += angDiff(Math.atan2(inp.x, inp.z), P.face) * Math.min(1, 12 * dt);
  P.move = Math.min(1, Math.hypot(P.vx, P.vz) / SPEED);
}
function doJump(){
  if(state !== 'play') return;
  if(P.cup){ leaveCup(); return; }
  if(!P.grounded) return;
  P.vy = JUMP_V; P.grounded = false; SFX.jump(); mpPos(true, { j:1 });
}

/* ---------- emotes (👋 💃 🎉 ❤️, shown as bubbles; no text) ---------- */
const EMOTES = [{ k:'wave', e:'👋' }, { k:'dance', e:'💃' }, { k:'joy', e:'🎉' }, { k:'heart', e:'❤️' }];
const EMO = Object.fromEntries(EMOTES.map(x => [x.k, x.e]));
emosEl.innerHTML = EMOTES.map(x => `<button data-k="${x.k}" aria-label="${x.k}">${x.e}</button>`).join('');
emosEl.querySelectorAll('button').forEach(b => holdBtn(b, () => { emote(b.dataset.k); emosEl.hidden = true; }));
const labelsEl = $('#labels');
function bubbleEl(){ const d = document.createElement('div'); d.className = 'emo'; d.hidden = true; labelsEl.appendChild(d); return d; }
const myBubble = bubbleEl();
function emote(k, silent){
  if(!EMO[k] || state !== 'play') return;
  P.emo = { k, t:0 }; SFX.pop();
  showBubble(myBubble, k);
  if(k === 'heart') hearts(P.x, P.y + 1.8, P.z, 4);
  if(k === 'joy'){ if(P.grounded && !P.cup){ P.vy = 6; P.grounded = false; } burst(P.x, P.y + 1.6, P.z, 18, CONFETTI, 3, .8); }
  if(!silent) mpSend('emo', { k });
}
function showBubble(el, k){ el.textContent = EMO[k]; el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; el._t = performance.now(); }
function emoPose(h, emo, t){
  if(!emo) return;
  emo.t += 1 / 60;
  if(emo.k === 'wave' && h.arms[1]){ h.arms[1].rotation.z = -h.arms[1].userData.side * (2.6 + Math.sin(t * 14) * .35); h.arms[1].rotation.x = 0; }
  if(emo.k === 'dance'){ h.grp.rotation.y += Math.sin(t * 6) * .5; h.body.position.y += Math.abs(Math.sin(t * 9)) * .12; h.arms.forEach((a, i) => { a.rotation.z = -a.userData.side * (1.4 + Math.sin(t * 9 + i * 3) * .6); }); }
  if(emo.k === 'joy') h.arms.forEach(a => { a.rotation.z = -a.userData.side * 2.7; a.rotation.x = 0; });
  if(emo.k === 'heart') h.arms.forEach(a => { a.rotation.x = -1.3; a.rotation.z = -a.userData.side * .6; });
}

/* ---------- free play: water a plant, pet a pet, carry an egg, hide in a cup, climb ---------- */
let ctx = null, actKey = '?';
function context(){
  if(P.cup) return { k:'out', e:'👀', b:L('اطلع', 'Come out', 'Çık') };
  if(!P.grounded) return null;
  let best = null, bd = 1e9;
  const cand = (k, o, r, e, b) => { const d = Math.hypot(P.x - o.x, P.z - o.z); if(d < r && d < bd){ bd = d; best = { k, o, e, b }; } };
  for(const p of W.plants) cand('water', p, 1.6, '💧', L('اسقي', 'Water', 'Sula'));
  for(const p of W.roamPets) cand('pet', p, 1.9, '❤️', L('دلّعه', 'Pet it', 'Sev'));
  for(const c of W.cups) if(P.y < .3) cand('cup', c, 2.1, '🙈', L('اختبي', 'Hide', 'Saklan'));
  if(P.carry){ for(const n of W.nests) cand('nest', n, 3.1, '🪺', L('حطّها', 'Put it in', 'Koy')); }
  else for(const s of W.eggStalls) cand('egg', s, 2.6, '🥚', L('خد بيضة', 'Take an egg', 'Yumurta al'));
  return best;
}
function updateActBtn(){
  ctx = state === 'play' ? context() : null;
  const k = ctx ? ctx.k + ctx.b : '';
  if(k === actKey) return; actKey = k;
  actBtn.hidden = !ctx;
  if(ctx){ $('#actI').textContent = ctx.e; $('#actB').textContent = ctx.b; actBtn.classList.add('pulse'); }
}
function doAction(){
  if(state !== 'play' || !ctx) return;
  const c = ctx, o = c.o;
  if(c.k === 'water'){
    P.face = Math.atan2(o.x - P.x, o.z - P.z); P.act = { k:'water', t:1.1 };
    SFX.splash(); burst(o.x, (o.h || .6) + .9, o.z, 22, [0x6cc4ff, 0xbfe8ff, 0xffffff], 2.4, .7, 9);
    setTimeout(() => { if(o.st < 4){ W.setPlant(o, o.st + 1); burst(o.x, o.h + .4, o.z, 14, [0x5ed6a0, 0xffc23d], 3, .7); SFX.star(); } else { hearts(o.x, o.h + .4, o.z, 2); SFX.heart(); } }, 700);
    mpSend('fx', { k:'water', x:Math.round(o.x * 10) / 10, z:Math.round(o.z * 10) / 10 });
  } else if(c.k === 'pet'){
    P.face = Math.atan2(o.x - P.x, o.z - P.z); o.happyT = 1.6; o.tgt = null; o.f = Math.atan2(P.x - o.x, P.z - o.z);
    SFX.heart(); hearts(o.x, (o.M.h || .6) + .3, o.z, 4, .4);
    mpSend('fx', { k:'pet', x:Math.round(o.x * 10) / 10, z:Math.round(o.z * 10) / 10 });
  } else if(c.k === 'cup'){ enterCup(o); }
  else if(c.k === 'out'){ leaveCup(); }
  else if(c.k === 'egg'){ P.carry = true; SFX.pop(); burst(P.x, 1.8, P.z, 10, [0xfff3d6, 0xffc23d], 2, .6); mpPos(true); say(L('خدها لعش من الأعشاش 🪺', 'Take it to one of the nests 🪺', 'Onu bir yuvaya götür 🪺'), 2600); }
  else if(c.k === 'nest'){ P.carry = false; W.addNestEgg(o); SFX.star(); burst(o.x, .8, o.z, 22, CONFETTI, 3.4, .8); mpPos(true); mpSend('fx', { k:'egg', x:Math.round(o.x * 10) / 10, z:Math.round(o.z * 10) / 10 }); }
  actKey = '?';
}
function enterCup(c){ P.cup = c; P.x = c.x; P.z = c.z; P.vx = P.vz = 0; P.y = 0; SFX.pop(); burst(c.x, 1.7, c.z, 10, [0xffffff, 0xffc23d], 2, .6); mpPos(true); actKey = '?'; }
function leaveCup(){ const c = P.cup; if(!c) return; P.cup = null; const a = cam.yaw; P.x = c.x + Math.sin(a) * (c.r + .7); P.z = c.z + Math.cos(a) * (c.r + .7); P.y = 0; P.vy = 5; P.grounded = false; SFX.jump(); mpPos(true); actKey = '?'; }
function remoteFx(p){
  const x = +p.x || 0, z = +p.z || 0;
  if(p.k === 'water'){ burst(x, 1.4, z, 14, [0x6cc4ff, 0xbfe8ff], 2.2, .6, 9); const pl = W.plants.find(q => Math.hypot(q.x - x, q.z - z) < .5); if(pl && pl.st < 4) setTimeout(() => W.setPlant(pl, pl.st + 1), 700); }
  else if(p.k === 'pet'){ const pt = W.roamPets.find(q => Math.hypot(q.x - x, q.z - z) < 2.5); if(pt){ pt.happyT = 1.6; hearts(pt.x, (pt.M.h || .6) + .3, pt.z, 3, .4); } }
  else if(p.k === 'egg'){ const n = W.nests.find(q => Math.hypot(q.x - x, q.z - z) < 1); if(n){ W.addNestEgg(n); burst(n.x, .8, n.z, 14, CONFETTI, 3, .7); } }
}
function tapAt(x, y){
  // tap a pet to pet it
  const ndc = new THREE.Vector2(x / SW * 2 - 1, -(y / SH * 2 - 1)), ray = new THREE.Raycaster(); ray.setFromCamera(ndc, camera);
  for(const p of W.roamPets){ if(!p.M.grp.visible) continue; _v.set(p.x, .4, p.z); if(ray.ray.distanceToPoint(_v) < .8 && Math.hypot(P.x - p.x, P.z - p.z) < 6){ ctx = { k:'pet', o:p }; doAction(); return; } }
}

/* ---------- Aunt Laila, pop-ups ---------- */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200){ clearTimeout(sayTO); guideT.textContent = text; guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = ''; sayTO = setTimeout(() => { guideEl.hidden = true; }, ms); }
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }

/* welcome tour: a short guided arrow path (fountain → castle portal) */
const castleP = PORTALS.find(p => p.id === 'castle');
const TOUR = [
  { x:0, z:-4.5, r:2.6, say:L('امشي ورا السهم ⭐ للنافورة', 'Follow the arrow ⭐ to the fountain', 'Oku ⭐ takip et, çeşmeye git') },
  { x:castleP.x * .88, z:castleP.z * .88, r:3.2, say:L('كل منطقة فيها بوابة بتلمع ✨ تعا نشوف القلعة 🏰', 'Every zone has a glowing portal ✨ let\'s see the castle 🏰', 'Her bölgede parlayan bir kapı var ✨ hadi kaleyi görelim 🏰') }
];
const marker = (() => {
  const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color:0xffc23d });
  const c = new THREE.Mesh(new THREE.ConeGeometry(.55, 1.1, 4), m); c.rotation.x = Math.PI; c.position.y = 3; g.add(c);
  const r = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.5, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.8, depthWrite:false })); r.position.y = .12; g.add(r);
  g.visible = false; scene.add(g); return g;
})();
const chevron = (() => { const s = new THREE.Shape(); s.moveTo(0, .9); s.lineTo(.6, 0); s.lineTo(.25, 0); s.lineTo(.25, -.7); s.lineTo(-.25, -.7); s.lineTo(-.25, 0); s.lineTo(-.6, 0); s.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color:0xffc23d, transparent:true, opacity:.9, depthWrite:false, side:THREE.DoubleSide })); m.visible = false; scene.add(m); return m; })();
function tourStep(){
  const s = SAVE.tut; if(s >= TOUR.length || state !== 'play'){ marker.visible = chevron.visible = false; return; }
  const t = TOUR[s]; marker.visible = true; marker.position.set(t.x, 0, t.z); marker.children[0].position.y = 3 + Math.sin(T * 4) * .3; marker.rotation.y = T;
  const a = Math.atan2(t.x - P.x, t.z - P.z); chevron.visible = true; chevron.position.set(P.x + Math.sin(a) * 1.8, P.y + .15, P.z + Math.cos(a) * 1.8); chevron.rotation.y = a + Math.PI;
  if(Math.hypot(P.x - t.x, P.z - t.z) < t.r){
    SAVE.tut++; persist(); SFX.star(); burst(t.x, 1, t.z, 20, CONFETTI, 3.5, .8);
    if(SAVE.tut < TOUR.length) say(TOUR[SAVE.tut].say, 6000);
    else { say(L('وقفوا بالدائرة سوا 👫 وبعد 5 ثواني بتفوتوا عاللعبة مع بعض!', 'Stand in the ring together 👫 — after 5 seconds you all go into the game!', 'Halkada birlikte durun 👫 — 5 saniye sonra hep birlikte oyuna girersiniz!'), 7000); SAVE.tut = 3; persist(); }
  }
}

/* ---------- zones visited (small World coins) ---------- */
let zoneHere = -1;
function checkZones(){
  let here = -1;
  for(const Z of ZONES) if(Math.hypot(P.x - Z.cx, P.z - Z.cz) < ISL.ZRAD) here = Z.i;
  if(here === zoneHere) return; zoneHere = here; hudKey = '';
  if(here < 0) return;
  const Z = ZONES[here];
  if(Z.soon){ say(Z.emoji + ' ' + Z.name + ' — ' + L('قريباً! 🚧', 'coming soon! 🚧', 'yakında! 🚧'), 3000); return; }
  if(!SAVE.seen.includes(Z.id)){
    SAVE.seen.push(Z.id); persist(); SFX.star(); pop(Z.emoji + ' +' + N(3) + ' 🪙');
    try{ if(window.World) World.addCoins(3, L('من جزيرة بوبو', 'from Bobo Island', 'Bobo Adası\'ndan')); }catch(e){}
    say(Z.emoji + ' ' + Z.name + '! ' + FREE_HINT[Z.id], 5000);
    if(GAME_ZONES.every(z => SAVE.seen.includes(z.id)) && !SAVE.done){
      SAVE.done = true; persist();
      setTimeout(() => { try{ if(window.World) World.addCoins(20, L('زرت كل الجزيرة!', 'you visited the whole island!', 'tüm adayı gezdin!')); }catch(e){}
        say(L('برافو! زرت كل مناطق الجزيرة 🏝️🎉', 'Bravo! You visited every zone of the island 🏝️🎉', 'Bravo! Adanın tüm bölgelerini gezdin 🏝️🎉'), 5000); burst(P.x, 2, P.z, 40, CONFETTI, 5, 1); }, 2500);
    }
  }
}
const FREE_HINT = {
  castle:L('اطلع عالدرج 🏰', 'Climb the steps 🏰', 'Merdivenlerden çık 🏰'), garden:L('اسقي النباتات 💧', 'Water the plants 💧', 'Bitkileri sula 💧'),
  pets:L('دلّع الحيوانات ❤️', 'Pet the animals ❤️', 'Hayvanları sev ❤️'), hide:L('اختبي بالكاسة 🙈', 'Hide in a cup 🙈', 'Bardağa saklan 🙈'),
  heist:L('خد بيضة وحطها بعش 🥚', 'Take an egg to a nest 🥚', 'Bir yumurtayı yuvaya götür 🥚'), granny:L('البوابة عالباب 🚪', 'The portal is at the door 🚪', 'Kapı girişte 🚪')
};
let climbed = new Set();
function checkClimb(){ for(const c of W.climbTops){ if(!climbed.has(c) && P.grounded && P.y > c.h - .2 && Math.hypot(P.x - c.x, P.z - c.z) < 2.6){ climbed.add(c); SFX.star(); burst(P.x, P.y + 1.5, P.z, 26, CONFETTI, 4, .9); pop('⭐'); } } }

/* ======================================================================
   Online: shards `bobo-island-<n>` (max 16 each), presence {code, hero, c, o}, broadcast pos ≤ 4 Hz
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'emo', 'fx', 'cd', 'go', 'hi'];
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
  async open(name, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(!SupabaseTransport.client) SupabaseTransport.client = window.supabase.createClient(MP_URL, MP_KEY, {
      auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false }, realtime:{ params:{ eventsPerSecond:20 } } });
    const sb = SupabaseTransport.client;
    const ch = this.ch = sb.channel(name, { config:{ broadcast:{ self:false, ack:false }, presence:{ key:id, enabled:true } } });
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
        else if(status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED'){ if(first){ first = false; clearTimeout(to); rej(new Error(status)); } else if(!this.closed) h.status('down'); }
      });
    });
  }
  track(meta){ if(!this.joined()) return; try{ const p = this.ch && this.ch.track(Object.assign({}, meta)); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  /* never send on a channel that is not joined: supabase-js would silently fall back to HTTP and we would stop receiving */
  joined(){ return !!this.ch && this.ch.state === 'joined'; }
  send(ev, payload){ if(!this.joined()) return; try{ const p = this.ch && this.ch.send({ type:'broadcast', event:ev, payload }); if(p && p.catch) p.catch(() => {}); }catch(e){} }
  close(){
    this.closed = true; const ch = this.ch, sb = SupabaseTransport.client; this.ch = null;
    if(!ch || !sb) return;
    try{ const p = ch.untrack(); if(p && p.catch) p.catch(() => {}); }catch(e){}
    try{ const p = sb.removeChannel(ch); if(p && p.catch) p.catch(() => {}); }catch(e){}
  }
}
class LocalTransport{
  open(name, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel(name);
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
  joined(){ return !!this.bc; }
  beat(){ if(this.bc) this.bc.postMessage({ k:'hb', from:this.id, meta:this.meta }); }
  track(meta){ this.meta = Object.assign({}, meta); this.beat(); setTimeout(() => this.sync(), 0); }
  send(ev, p){ if(this.bc) this.bc.postMessage({ k:'b', ev, p }); }
  close(){ clearInterval(this.iv); if(this.bc){ if(this.meta) this.bc.postMessage({ k:'bye', from:this.id }); this.bc.close(); this.bc = null; } }
}
const MP = { t:null, id:Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4), shard:0, list:[], meta:null, synced:false, tok:0, sendT:0, wasMoving:false, last:'', status:'off', joining:false };
const mpActive = () => !!(MP.t && MP.meta && MP.t.joined());
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
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
let ME = null;                                  // Friends.me(): { code, name, ... }
function mpClose(){
  if(MP.t){ try{ MP.t.close(); }catch(e){} }
  MP.t = null; MP.meta = null; MP.list = []; MP.synced = false; MP.shard = 0;
  remoteSync([]);
}
/* join the first shard with room (≤ CAP players), up to SHARDS shards */
async function mpJoin(from = 1){
  if(MP.joining || !ME || !ME.code) return;
  MP.joining = true; MP.status = 'connecting'; hudKey = '';
  const tok = ++MP.tok;
  try{
    for(let n = from; n <= SHARDS; n++){
      mpClose();
      const t = MP_LOCAL ? new LocalTransport() : new SupabaseTransport();
      MP.t = t; const live = () => MP.t === t && MP.tok === tok;
      await t.open('bobo-island-' + n, MP.id, {
        presence:list => { if(live()) mpPresence(list); },
        msg:(ev, p) => { if(live() && p && typeof p === 'object' && typeof p.id === 'string') mpMsg(ev, p); },
        status:s => { if(!live()) return; if(s === 'up'){ mpTrack(); MP.status = 'on'; } else { MP.status = 'down'; mpRejoin(); } hudKey = ''; }
      });
      if(!live()) return;
      // the server only sends the member list after we track something: a short 'probe' first, then wait for the list
      const t0 = performance.now(); t.track({ ph:'probe' });
      await new Promise(res => { const chk = () => (MP.synced || performance.now() - t0 > 6000 || !live()) ? res() : setTimeout(chk, 40); chk(); });
      if(MP.synced) await new Promise(r => setTimeout(r, 250));
      if(!live()) return;
      const others = MP.list.filter(p => p.id !== MP.id && p.ph === 'play');
      if(others.length >= CAP) continue;
      const used = new Set(others.map(p => p.c)); let c = 0; while(used.has(c)) c++;
      MP.shard = n;
      MP.meta = { ph:'play', code:ME.code, hero:heroId, av:myAv(), c, o:others.reduce((m, p) => Math.max(m, +p.o || 0), 0) + 1 };
      t.track(MP.meta); MP.status = 'on'; MP.back = 0; hudKey = '';
      mpPresence(MP.list);
      mpPos(true); mpSend('hi', {});
      return;
    }
    mpClose(); MP.status = 'full';
  }catch(e){ if(MP.tok === tok){ mpClose(); MP.status = 'down'; MP.joining = false; mpRejoin(); } }
  finally{ if(MP.tok === tok){ MP.joining = false; if(MP.meta) mpPresence(MP.list); } hudKey = ''; }
}
/* the channel dropped (CHANNEL_ERROR / TIMED_OUT / CLOSED, or found not joined): open it again with backoff and re-track */
function mpRejoin(now){
  if(!ME || !ME.code || state === 'leaving' || MP.joining || MP.reT) return;
  MP.back = Math.min(30000, MP.back ? MP.back * 2 : 1500);
  const from = MP.shard || 1;
  MP.reT = setTimeout(() => { MP.reT = 0; if(navigator.onLine === false){ mpRejoin(); return; } if(!MP.joining && !(MP.t && MP.meta && MP.t.joined())) mpJoin(from); }, now ? 50 : MP.back);
}
function mpHealth(now){ if(MP.joining || state === 'leaving' || !ME || !ME.code) return; if(!(MP.t && MP.meta && MP.t.joined())){ if(now && MP.reT){ clearTimeout(MP.reT); MP.reT = 0; } MP.status = MP.status === 'on' ? 'down' : MP.status; hudKey = ''; mpRejoin(now); } }
setInterval(() => mpHealth(false), 4000);
document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') mpHealth(true); });
addEventListener('online', () => mpHealth(true));
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.meta.av = myAv(); MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(mpActive()) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph === 'play');
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  // two kids joined at the same moment and the shard went over the cap: the later one moves to the next shard
  if(all.findIndex(p => p.id === MP.id) >= CAP && !MP.joining){ const n = MP.shard + 1; setTimeout(() => mpJoin(n), 50); return; }
  remoteSync(all.filter(p => p.id !== MP.id));
}

/* ---------- remote players ---------- */
const RM = new Map();
const lowGeo = (() => { const g = new THREE.CapsuleGeometry(.38, .5, 3, 8); g.translate(0, .63, 0); return g; })();
const LOW_MAX = 24, lowMesh = new THREE.InstancedMesh(lowGeo, new THREE.MeshLambertMaterial(), LOW_MAX);
lowMesh.count = 0; lowMesh.frustumCulled = false; scene.add(lowMesh);
for(let i = 0; i < LOW_MAX; i++) lowMesh.setColorAt(i, _c.set(0xffffff));
const blobMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map:K.blobTex, transparent:true, depthWrite:false }), LOW_MAX);
blobMesh.count = 0; blobMesh.frustumCulled = false; blobMesh.renderOrder = 1; scene.add(blobMesh);
function labelEl(){ const d = document.createElement('div'); d.className = 'nm'; d.hidden = true; labelsEl.appendChild(d); return d; }
function remoteSync(list){
  const here = new Set();
  for(const p of list){
    here.add(p.id);
    let a = RM.get(p.id);
    if(!a){ a = { id:p.id, hero:null, h:null, x:0, z:0, y:0, f:0, m:0, buf:[], seen:false, t:Math.random() * 5, vy:0, jy:0, r:-1, e:0, hid:0, emo:null, lbl:labelEl(), bub:bubbleEl(), code:null, o:0, c:0, lastPos:0, born:performance.now() }; RM.set(p.id, a); if(mpActive()) setTimeout(() => mpPos(true), 100 + Math.random() * 400); SFX.join(); }
    // only the friend code, character and join order come from presence. A name in presence is never read.
    a.code = (typeof p.code === 'string' && /^[A-Z2-9]{6}$/.test(p.code)) ? p.code : null;
    a.o = +p.o || 0; a.c = p.c | 0;
    const hero = okHero(p.hero);
    const av = hero === 'me' ? okAv(p.av) : null, avK = av ? JSON.stringify(av) : '';
    if(a.hero !== hero || a.avK !== avK){ if(a.h) scene.remove(a.h.grp); a.hero = hero; a.av = av; a.avK = avK; a.h = makeHero(hero, av); a.h.grp.traverse(o => { if(o.isMesh) o.castShadow = false; }); a.h.grp.visible = false; scene.add(a.h.grp); }
  }
  for(const [id, a] of RM) if(!here.has(id)){ if(a.h) scene.remove(a.h.grp); a.lbl.remove(); a.bub.remove(); RM.delete(id); }
  needNames();
  hudKey = '';
}
/* pos: {x, z, f, m, y, r (portal ring zone or −1), e (carrying an egg), h (hiding in a cup), j (jump)} */
function mpPos(force, extra){
  if(!mpActive()) return;
  const ring = myRing();
  MP.sendT = 0;
  mpSend('pos', Object.assign({ x:Math.round(P.x * 100) / 100, z:Math.round(P.z * 100) / 100, f:Math.round(P.face * 100) / 100, m:Math.round(P.move * 100) / 100,
    y:Math.round((P.grounded ? P.y : W.heightAt(P.x, P.z)) * 100) / 100, r:ring, e:P.carry ? 1 : 0, h:P.cup ? 1 : 0 }, extra || {}));
  MP.last = ring + ':' + (P.carry ? 1 : 0) + ':' + (P.cup ? 1 : 0);
}
function mpMsg(ev, p){
  const a = RM.get(p.id);
  if(ev === 'pos'){
    if(!a) return;
    const now = performance.now(), x = clamp(+p.x || 0, -120, 120), z = clamp(+p.z || 0, -120, 120);
    a.buf.push({ t:now, x, z, f:+p.f || 0, m:clamp(+p.m || 0, 0, 1), y:clamp(+p.y || 0, 0, 10) }); if(a.buf.length > 8) a.buf.shift();
    a.r = Number.isInteger(p.r) ? p.r : -1; a.e = p.e ? 1 : 0; a.hid = p.h ? 1 : 0; a.lastPos = now;
    if(p.j){ a.vy = 6.6; a.jy = .001; }
    if(!a.seen){ a.seen = true; a.x = x; a.z = z; a.f = +p.f || 0; }
  } else if(ev === 'emo'){ if(a && EMO[p.k]){ a.emo = { k:p.k, t:0 }; showBubble(a.bub, p.k); if(p.k === 'heart') hearts(a.x, a.y + 1.8, a.z, 3); if(p.k === 'joy'){ a.vy = 6; a.jy = .001; burst(a.x, a.y + 1.6, a.z, 14, CONFETTI, 3, .7); } } }
  else if(ev === 'fx'){ if(a) remoteFx(p); }
  else if(ev === 'hi'){ if(mpActive()) setTimeout(() => mpPos(true), 50 + Math.random() * 300); }
  else if(ev === 'cd'){ if(a) onCountdown(p); }
  else if(ev === 'go'){ if(a) onGo(p); }
}
const INTERP = 300, FULL_MAX = 10;
function stepRemotes(dt){
  const now = performance.now(), rt = now - INTERP;
  let low = 0, blob = 0;
  // only the nearest FULL_MAX kids get the full character (draw calls); the others are simple capsules
  const cx = camera.position.x, cz = camera.position.z;
  for(const a of RM.values()) a.dc = Math.hypot(a.x - cx, a.z - cz);
  const fullSet = new Set([...RM.values()].filter(a => a.seen && a.dc < 46).sort((p, q) => p.dc - q.dc).slice(0, FULL_MAX));
  for(const a of RM.values()){
    a.t += dt;
    if(a.buf.length){
      let i = a.buf.length - 1; while(i > 0 && a.buf[i - 1].t > rt) i--;
      const b = a.buf[i], pr = i > 0 ? a.buf[i - 1] : null;
      let tx = b.x, tz = b.z, tf = b.f, tm = b.m, ty = b.y;
      if(pr && b.t > rt){ const k = clamp((rt - pr.t) / Math.max(1, b.t - pr.t), 0, 1); tx = lerp(pr.x, b.x, k); tz = lerp(pr.z, b.z, k); tf = pr.f + angDiff(b.f, pr.f) * k; ty = lerp(pr.y, b.y, k); tm = Math.max(pr.m, b.m); }
      else if(now - b.t > 600) tm = b.m;
      const k = 1 - Math.exp(-14 * dt);
      a.x = lerp(a.x, tx, k); a.z = lerp(a.z, tz, k); a.f += angDiff(tf, a.f) * k; a.m = lerp(a.m, tm, k); a.y = lerp(a.y, ty, k);
    }
    if(a.jy > 0){ a.vy -= GRAV * dt; a.jy += a.vy * dt; if(a.jy <= 0){ a.jy = 0; a.vy = 0; } }
    if(!a.h) continue;
    const full = fullSet.has(a), show = a.seen && a.dc < 140;
    a.h.grp.visible = full;
    const yy = a.y + a.jy - (a.hid ? 1.05 : 0);
    if(show && blob < LOW_MAX){ _m.compose(_v.set(a.x, a.y + .1, a.z), _q.identity(), _s.set(1, 1, 1)); blobMesh.setMatrixAt(blob++, _m); }
    if(full){
      a.h.grp.position.set(a.x, yy, a.z); a.h.grp.rotation.y = a.f;
      poseHero(a.h, { t:a.t, dt, run:a.jy > 0 ? 0 : a.m, grounded:a.jy <= 0, vy:a.vy, sq:0, flip:0 });
      if(a.emo){ emoPose(a.h, a.emo, a.t); a.emo.t += dt; if(a.emo.t > 2.6) a.emo = null; }
      a.h.egg.visible = !!a.e;
    } else if(show && low < LOW_MAX){
      _m.compose(_v.set(a.x, yy, a.z), _q.identity(), _s.set(1, 1, 1)); lowMesh.setMatrixAt(low, _m); lowMesh.setColorAt(low, _c.set(HERO_COLOR[a.hero] || '#9c7be3')); low++;
    }
  }
  // someone we can't place yet (missed their last position): ask everyone for a position once in a while
  if(mpActive() && now - (MP.askT || 0) > 2500 && [...RM.values()].some(a => !a.seen && now - (a.born || now) > 1500)){ MP.askT = now; mpSend('hi', {}); }
  lowMesh.count = low; lowMesh.instanceMatrix.needsUpdate = true; blobMesh.count = blob; blobMesh.instanceMatrix.needsUpdate = true; if(lowMesh.instanceColor) lowMesh.instanceColor.needsUpdate = true;
}

/* ---------- names: only from the server (Friends.names), cached; friends get ⭐ ---------- */
const NAMES = new Map(), namePending = new Set();
let friendCodes = new Set(), friendList = [], nameT = 0;
function needNames(){ clearTimeout(nameT); nameT = setTimeout(fetchNames, 250); }
function fetchNames(all){
  if(!hasFr() || !Friends.names) return;
  const codes = [...new Set([...RM.values()].map(a => a.code).filter(c => c && (all || (!NAMES.has(c) && !namePending.has(c)))))].slice(0, 40);
  if(!codes.length) return;
  codes.forEach(c => namePending.add(c));
  Friends.names(codes).then(map => { codes.forEach(c => { namePending.delete(c); const n = map && typeof map[c] === 'string' ? cleanName(map[c]).trim() : ''; NAMES.set(c, n); }); },
    () => { codes.forEach(c => namePending.delete(c)); });
}
setInterval(() => fetchNames(true), 120000);
function refreshFriends(){
  if(!hasFr() || !Friends.has()) return Promise.resolve();
  return Friends.list().then(l => { friendList = Array.isArray(l) ? l : []; friendCodes = new Set(friendList.map(k => k.code)); }, () => {});
}
setInterval(refreshFriends, 60000);
const nameOf = a => (a.code && NAMES.get(a.code)) || '';
function placeLabels(){
  const w2 = SW / 2, h2 = SH / 2;
  const project = (x, y, z, el) => { _v.set(x, y, z).project(camera); if(_v.z > 1 || _v.z < -1 || Math.abs(_v.x) > 1.1 || Math.abs(_v.y) > 1.1){ el.style.visibility = 'hidden'; return; } el.style.visibility = ''; el.style.transform = `translate(${(_v.x * w2 + w2).toFixed(1)}px,${(-_v.y * h2 + h2).toFixed(1)}px) translate(-50%,-100%)`; };
  for(const a of RM.values()){
    const d = Math.hypot(a.x - camera.position.x, a.z - camera.position.z), name = nameOf(a), fr = !!(a.code && friendCodes.has(a.code));
    const showName = state === 'play' && a.seen && !a.hid && d < 36 && !!name;
    if(a.lbl.hidden !== !showName) a.lbl.hidden = !showName;
    if(showName){ const txt = fr ? name + ' ⭐' : name; if(a.lbl.textContent !== txt) a.lbl.textContent = txt; a.lbl.classList.toggle('fr', fr); project(a.x, a.y + a.jy + 1.75, a.z, a.lbl); }
    const bubOn = a.bub._t && performance.now() - a.bub._t < 2600 && a.seen && d < 46 && state === 'play';
    if(a.bub.hidden !== !bubOn) a.bub.hidden = !bubOn;
    if(bubOn) project(a.x, a.y + a.jy + (showName ? 2.35 : 1.9), a.z, a.bub);
  }
  const myOn = myBubble._t && performance.now() - myBubble._t < 2600 && state === 'play';
  if(myBubble.hidden !== !myOn) myBubble.hidden = !myOn;
  if(myOn) project(P.x, P.y + 1.95, P.z, myBubble);
}

/* ======================================================================
   Portals: walk into the ring → 5 s «يلّا نفوت!» listing who stands in it → everyone goes together
   ====================================================================== */
const CD_SEC = 5;
const cdEl = $('#cd');
let CD = null;          // { zone, left, host, ids, last }
const remoteCd = new Map();          // zone → { left, ids, at, host }
function myRing(){
  if(P.cup || state === 'leaving') return -1;
  for(const p of PORTALS) if(Math.hypot(P.x - p.x, P.z - p.z) < p.r && P.y < 1) return p.zone;
  return -1;
}
function ringMembers(z){
  const out = [];
  if(myRing() === z) out.push({ id:MP.id, o:MP.meta ? MP.meta.o : 0, me:true, hero:heroId, name:(ME && ME.name) || '' });
  if(mpActive()) for(const a of RM.values()) if(a.r === z && a.seen && performance.now() - a.lastPos < 20000) out.push({ id:a.id, o:a.o, hero:a.hero, av:a.av, name:nameOf(a), code:a.code });
  return out.sort(mpSort);
}
function stepPortal(dt){
  const z = myRing();
  if(z < 0){ if(CD){ CD = null; cdEl.hidden = true; } return; }
  const Z = ZONES[z], members = ringMembers(z);
  const now = performance.now();
  if(!CD || CD.zone !== z){ CD = { zone:z, left:CD_SEC, end:now + CD_SEC * 1000, host:null, ids:[], sendT:0, tick:Math.ceil(CD_SEC) }; SFX.go(); }
  const solo = !Z.mp || !mpActive() || members.length < 2;
  const host = members[0];
  const iHost = solo || (host && host.me);
  if(iHost){
    const newIds = members.map(m => m.id);
    if(CD.host !== MP.id) CD.end = Math.max(CD.end, now + 2000);                                     // just became the host: keep the clock going
    if(newIds.some(id => !CD.ids.includes(id)) && CD.ids.length) CD.end = Math.max(CD.end, now + 2000);   // someone hopped in: a bit more time
    CD.ids = newIds; CD.left = (CD.end - now) / 1000; CD.host = MP.id;
    if(!solo){ if(now >= CD.sendT){ CD.sendT = now + 500; mpSend('cd', { z, left:Math.max(0, Math.round(CD.left * 10) / 10), ids:CD.ids }); } }
    if(CD.left <= 0) launch(Z, members, solo);
  } else {
    const rc = remoteCd.get(z);
    CD.host = host.id;
    if(rc && rc.host === host.id && now - rc.at < 1600){ CD.left = rc.left - (now - rc.at) / 1000; }
    else CD.left = Math.max(.5, CD.left - dt);          // waiting for the host's clock
    CD.end = now + CD.left * 1000;
  }
  const sec = Math.max(0, Math.ceil(CD.left));
  if(sec !== CD.tick){ CD.tick = sec; if(sec > 0) SFX.tick(); }
  drawCountdown(Z, members, sec);
}
function drawCountdown(Z, members, sec){
  const key = Z.id + sec + members.map(m => m.id + m.name).join();
  if(cdEl._k === key && !cdEl.hidden) return; cdEl._k = key;
  cdEl.hidden = false; cdEl.style.setProperty('--c', Z.css);
  cdEl.innerHTML = `<h2>${Z.emoji} ${L('يلّا نفوت!', "Let's go in!", 'Hadi girelim!')}</h2><div class="num">${N(sec)}</div>
    <div class="who">${members.map(m => `<span><img src="${m.me ? charImg(m.hero) : heroPic(m.hero, m.av)}" alt="">${m.me ? '🙋' : esc(m.name || '')}</span>`).join('')}</div>
    <small>${Z.mp ? L('اللي واقفين بالدائرة بيفوتوا سوا 👫', 'Everyone in the ring goes in together 👫', 'Halkadaki herkes birlikte girer 👫') : L('بيت الجدّة للاعب واحد 👤', "Grandma's house is single player 👤", 'Büyükannenin evi tek oyunculu 👤')}</small>`;
}
function onCountdown(p){ const z = p.z | 0; if(!ZONES[z]) return; remoteCd.set(z, { left:+p.left || 0, ids:Array.isArray(p.ids) ? p.ids.slice(0, 16) : [], at:performance.now(), host:p.id }); }
function onGo(p){
  const z = p.z | 0, Z = ZONES[z]; if(!Z || !Z.mp || !/^\d{4}$/.test(p.room || '') || !Array.isArray(p.ids) || !p.ids.includes(MP.id)) return;
  if(myRing() !== z && !(CD && CD.zone === z)) return;
  navigate(Z, { join:p.room });
}
let NAV = null;
function launch(Z, members, solo){
  if(state === 'leaving') return;
  if(!Z.mp || solo){ navigate(Z, null); return; }
  const room = String(1000 + Math.floor(Math.random() * 9000)), ids = members.map(m => m.id);
  mpSend('go', { z:Z.i, room, ids }); setTimeout(() => mpSend('go', { z:Z.i, room, ids }), 150);
  setTimeout(() => navigate(Z, { host:'1', room }), 350);
  state = 'leaving';
}
function navigate(Z, params){
  const q = new URLSearchParams(params || {});
  if(MP_LOCAL) q.set('mp', 'local');
  const url = '../' + Z.path + (q.toString() ? '?' + q : '');
  NAV = url; state = 'leaving'; SFX.go(); persist();
  cdEl.innerHTML = `<h2>${Z.emoji} ${L('يلّا!', "Let's go!", 'Hadi!')}</h2><div class="num">🚀</div>`; cdEl.hidden = false;
  burst(P.x, 1.5, P.z, 40, CONFETTI, 5, 1);
  setTimeout(() => { try{ if(MP.t) MP.t.close(); }catch(e){} location.href = url; }, 400);
}

/* ======================================================================
   HUD: zones chip, mini-map, «وين أصحابي؟»
   ====================================================================== */
const hudEl = $('#hud'), miniCv = $('#miniCv'), miniCx = miniCv.getContext('2d'), miniBase = document.createElement('canvas');
miniBase.width = miniBase.height = 264; W.drawMap(miniBase.getContext('2d'), 264);
let hudKey = '', frMode = 0;
function hudFrame(){
  const k = SAVE.seen.length + '|' + MP.status + '|' + MP.shard + '|' + RM.size;
  if(k !== hudKey){
    hudKey = k;
    $('#hudZones').textContent = '🗺️ ' + N(GAME_ZONES.filter(z => SAVE.seen.includes(z.id)).length) + '/' + N(GAME_ZONES.length);
    const net = $('#hudNet');
    net.hidden = false;
    net.textContent = MP.status === 'on' ? '👫 ' + N(RM.size + 1) : MP.status === 'connecting' ? '⏳' : '📡';
  }
}
function drawMini(){
  const S = 264, k = W.mapScale(S), c = S / 2, x = miniCx;
  x.clearRect(0, 0, S, S); x.drawImage(miniBase, 0, 0);
  const pt = (wx, wz) => [c + wx * k, c + wz * k];
  for(const a of RM.values()){ if(!a.seen) continue; const [px, py] = pt(a.x, a.z), fr = a.code && friendCodes.has(a.code);
    if(fr){ x.font = `${frMode > 0 ? 34 : 24}px system-ui,sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('⭐', px, py); }
    else { x.fillStyle = '#fff'; x.strokeStyle = 'rgba(42,31,79,.6)'; x.lineWidth = 3; x.beginPath(); x.arc(px, py, 6, 0, 7); x.fill(); x.stroke(); } }
  const [mx, my] = pt(P.x, P.z);
  x.save(); x.translate(mx, my); x.rotate(-P.face + Math.PI); x.fillStyle = '#e8304f'; x.strokeStyle = '#fff'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(0, -13); x.lineTo(10, 10); x.lineTo(0, 5); x.lineTo(-10, 10); x.closePath(); x.stroke(); x.fill(); x.restore();
}
const frBtn = $('#btnFr'), frPanel = $('#frPanel');
let frArrows = [];
holdBtn(frBtn, () => { SFX.tap(); if(frMode > 0){ frMode = 0; frPanel.hidden = true; } else { frMode = 15; refreshFriends().then(drawFrPanel); drawFrPanel(); } });
function drawFrPanel(){
  if(frMode <= 0) return;
  frPanel.style.setProperty('--mm2', ($('#mini').offsetWidth + 28) + 'px');
  const onIsland = new Set([...RM.values()].map(a => a.code).filter(Boolean));
  const on = friendList.filter(k => k.online || onIsland.has(k.code));
  const where = k => onIsland.has(k.code) ? L('هون عالجزيرة 🏝️', 'here on the island 🏝️', 'burada, adada 🏝️')
    : (k.playing && Friends.GAMES[k.playing]) ? L('عم يلعب ', 'playing ', 'oynuyor: ') + Friends.gameName(k.playing, true) : L('أونلاين', 'online', 'çevrimiçi');
  frPanel.innerHTML = `<h3>👫 ${L('أصحابي الأونلاين', 'My friends online', 'Çevrimiçi arkadaşlarım')}</h3>` +
    (on.length ? on.slice(0, 6).map(k => `<div class="frrow"><i class="dot"></i><div>${esc(Friends.nick(k) || '⭐')}<small>${esc(where(k))}</small></div></div>`).join('')
      : `<div class="frrow"><div>${L('ما في أصحاب أونلاين هلّق 🙈', 'No friends online right now 🙈', 'Şu an çevrimiçi arkadaş yok 🙈')}</div></div>`);
  frPanel.hidden = false;
}
function placeArrows(dt){
  if(frMode > 0){ frMode -= dt; if(frMode <= 0){ frPanel.hidden = true; } }
  const list = frMode > 0 && state === 'play' ? [...RM.values()].filter(a => a.seen && a.code && friendCodes.has(a.code)) : [];
  while(frArrows.length < list.length){ const d = document.createElement('div'); d.className = 'farr'; d.innerHTML = '<i></i><b></b>'; labelsEl.appendChild(d); frArrows.push(d); }
  frArrows.forEach((el, i) => {
    const a = list[i]; if(!a){ el.hidden = true; return; }
    el.hidden = false;
    const ang = Math.atan2(a.x - P.x, a.z - P.z), rel = ang - (cam.yaw + Math.PI), r = Math.min(SW, SH) * .3;
    const sx = SW / 2 + Math.sin(rel) * r * 1.3, sy = SH * .55 - Math.cos(rel) * r;
    el.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px)`;
    el.firstChild.style.transform = `rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg)`;
    el.lastChild.textContent = (nameOf(a) || '⭐') + ' · ' + N(Math.round(Math.hypot(a.x - P.x, a.z - P.z))) + 'm';
  });
  $('#mini').classList.toggle('fr', frMode > 0); frBtn.classList.toggle('on', frMode > 0);
}

/* ======================================================================
   Screens: loading, name («شو اسمك؟»), menu, hero picker, pause
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
let state = 'loading';
function setPlayUI(on){ hudEl.hidden = !on; joyEl.hidden = !on; jumpBtn.hidden = !on; emoBtn.hidden = !on; if(!on){ actBtn.hidden = true; actKey = '?'; emosEl.hidden = true; frPanel.hidden = true; } }
function showLoading(){
  state = 'loading'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare';
  card.innerHTML = `<div class="menu"><div class="logo">🏝️</div><h1>${L('جزيرة بوبو الكبيرة', 'Bobo Big Island', 'Büyük Bobo Adası')}</h1><p class="sub"><span class="spin">⏳</span></p></div>`;
}
function showName(msg){
  state = 'name'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card namecard'; clearInput();
  card.innerHTML = `<div class="bigq">👋</div><h1>${L('شو اسمك؟', "What's your name?", 'Adın ne?')}</h1>
    <p>${L('هيك أصحابك بيعرفوك عالجزيرة 🏝️', 'So your friends know you on the island 🏝️', 'Arkadaşların seni adada böyle tanır 🏝️')}</p>
    <input id="nameIn" maxlength="14" autocomplete="off" autocapitalize="words" spellcheck="false" dir="auto" aria-label="${L('اسمك', 'Your name', 'Adın')}">
    <p class="mp-msg" id="nameMsg">${msg || ''}</p>
    <button class="big-btn" id="bName">✅ ${L('تمام', 'OK', 'Tamam')}</button>`;
  const inp = $('#nameIn');
  inp.addEventListener('input', () => { const v = cleanName(inp.value); if(v !== inp.value) inp.value = v; $('#nameMsg').textContent = ''; });
  inp.addEventListener('keydown', e => { if(e.key === 'Enter') submitName(inp.value); });
  $('#bName').onclick = () => { SFX.tap(); submitName(inp.value); };
  setTimeout(() => { try{ inp.focus(); }catch(e){} }, 300);
}
let nameBusy = false;
async function submitName(raw, noClean){
  const n = noClean ? String(raw || '') : cleanName(raw).trim();
  if(!n){ SFX.bonk(); const m = $('#nameMsg'); if(m) m.textContent = L('اكتب اسمك 🙂', 'Type your name 🙂', 'Adını yaz 🙂'); return false; }
  if(nameBusy) return false; nameBusy = true;
  const b = $('#bName'); if(b) b.disabled = true;
  try{
    const c = await Friends.setName(n); ME = Object.assign({}, ME, c);
    if(!ME.name){ throw Object.assign(new Error('bad_name'), { code:'22023' }); }
    SFX.star(); nameBusy = false; showMenu(); if(!mpActive()) mpJoin(); return true;
  }catch(e){
    nameBusy = false;
    const off = e && e.offline;
    showName(off ? Friends.errText(e) : L('هالاسم ما بيصير، جرّب اسم تاني 🙈', "That name isn't allowed, try another 🙈", 'Bu isim olmaz, başka dene 🙈'));
    const inp = $('#nameIn'); if(inp) inp.value = cleanName(raw); SFX.bonk(); return false;
  }
}
function showMenu(){
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('island_rothint');
  const hi = ME && ME.name ? L('أهلا يا ', 'Hi ', 'Merhaba ') + ME.name + ' 👋' : L('امشوا سوا وفوتوا عالألعاب من البوابات!', 'Walk together and enter the games through the portals!', 'Birlikte yürüyün, kapılardan oyunlara girin!');
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🏝️</div><h1>${L('جزيرة بوبو الكبيرة', 'Bobo Big Island', 'Büyük Bobo Adası')}</h1>
    <p class="sub" id="menuHi"></p>
    <div class="row"><button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('يلّا عالجزيرة', 'To the island!', 'Adaya!')}</button></div></div>`;
  $('#menuHi').textContent = hi;
  $('#bPlay').onclick = () => { ac(); SFX.tap(); startPlay(); };
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
    SFX.tap(); SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick); setHero(selPick); mpTrack();
    if(selFrom === 'pause') resume(); else showMenu();
  };
}
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush(); persist();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { muted = !muted; rawSet('adv3d_muted', String(muted)); $('#bSnd').innerHTML = (muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  $('#bExit').onclick = () => { SFX.tap(); persist(); try{ if(MP.t) MP.t.close(); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = 'play'; setPlayUI(true); placeJoyHome(); hudKey = ''; }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };
let started = false;
function startPlay(){
  if(ROT) rawSet('island_rothint', '1');
  overlay.hidden = true; state = 'play'; setPlayUI(true); clearInput(); placeJoyHome(); hudKey = '';
  if(!started){
    started = true; P.x = W.spawn.x; P.z = W.spawn.z; P.face = W.spawn.f; cam.yaw = 0; snapCam = true;
    if(SAVE.tut === 0){ say(L('أهلا حبيبي! أنا العمة ليلى 👵 هاي جزيرة بوبو الكبيرة 🏝️ كل الألعاب هون!', "Hello sweetie! I'm Aunt Laila 👵 This is Bobo Big Island 🏝️ — all the games are here!", 'Merhaba tatlım! Ben Leyla Teyze 👵 Burası Büyük Bobo Adası 🏝️ — bütün oyunlar burada!'), 4200);
      setTimeout(() => { if(SAVE.tut === 0 && state === 'play') say(TOUR[0].say, 6000); }, 4300); }
    else say(L('أهلا فيك عالجزيرة! 🏝️', 'Welcome back to the island! 🏝️', 'Adaya tekrar hoş geldin! 🏝️'), 2500);
  }
  if(!mpActive() && !MP.joining) mpJoin();
}

/* ======================================================================
   Main loop (adaptive DPR 1.5 → 1, then shadows off)
   ====================================================================== */
let camOverride = null;
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0, miniT = 0;
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 45){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 32){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  if(state === 'play'){ readInput(dt); stepPlayer(dt); }
  else { P.vx = P.vz = 0; P.move = lerp(P.move, 0, Math.min(1, dt * 10)); if(!P.grounded){ P.vy -= GRAV * dt; P.y += P.vy * dt; const g = Math.max(0, W.heightAt(P.x, P.z)); if(P.y <= g){ P.y = g; P.vy = 0; P.grounded = true; } } }
  if(heroM){
    heroM.grp.position.set(P.x, P.y - (P.cup ? 1.05 : 0), P.z); heroM.grp.rotation.y = P.face;
    poseHero(heroM, { t:T, dt, run:P.move, grounded:P.grounded, vy:P.vy, sq:0, flip:0 });
    if(P.emo){ emoPose(heroM, P.emo, T); if(P.emo.t > 2.6) P.emo = null; }
    heroM.egg.visible = P.carry;
    if(P.act){ P.act.t -= dt; if(heroM.arms[1]) heroM.arms[1].rotation.x = -1.3; canMesh.visible = true; _v.set(.45, 1.05, .45).applyAxisAngle(_v2.set(0, 1, 0), P.face); canMesh.position.set(P.x + _v.x, P.y + _v.y, P.z + _v.z); canMesh.rotation.set(.6, P.face, 0, 'YXZ'); if(P.act.t <= 0){ P.act = null; canMesh.visible = false; } }
  }
  if(state === 'play'){ updateActBtn(); hudFrame(); checkZones(); checkClimb(); tourStep(); }
  stepPortal(state === 'play' ? dt : 0);
  // camera: a slow fly-around on the menu, follow cam in play
  if(state === 'menu' || state === 'select' || state === 'name' || state === 'loading'){
    menuT += dt; const a = menuT * .05 + .6;
    camera.position.set(Math.sin(a) * 120, 62, Math.cos(a) * 120); camera.lookAt(0, 0, 0); aimSun(Math.sin(a) * 60, Math.cos(a) * 60);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  if(camOverride){ camera.position.set(camOverride[0], camOverride[1], camOverride[2]); camera.lookAt(camOverride[3], camOverride[4], camOverride[5]); aimSun(camOverride[3], camOverride[5]); }
  W.animate(T, dt, camera.position, P);
  if(mpActive()){
    MP.sendT += dt;
    const moving = P.move > .05 || !P.grounded, sig = myRing() + ':' + (P.carry ? 1 : 0) + ':' + (P.cup ? 1 : 0);
    if(sig !== MP.last) mpPos(true);
    else if(moving && MP.sendT >= .25) mpPos(false);           // ≤ 4 Hz while moving
    else if(!moving && MP.wasMoving) mpPos(true);              // one last update when stopping, then silence
    MP.wasMoving = moving;
  }
  stepRemotes(dt);
  placeLabels(); placeArrows(dt);
  miniT -= dt; if(miniT <= 0 && state === 'play'){ miniT = .2; drawMini(); }
  updateParts(dt); updateFloaters(dt);
  sky.position.copy(camera.position); clouds.rotation.y = T * .004;
  renderer.render(scene, camera);
}
addEventListener('pagehide', () => { persist(); try{ if(MP.t) MP.t.close(); }catch(e){} });

/* ---------- test hook ---------- */
window.__island = {
  get state(){ return state; }, menu:() => showMenu(), play:() => startPlay(), P, get me(){ return ME; }, get shard(){ return MP.shard; }, get mpId(){ return MP.id; },
  get mpStatus(){ return MP.status; }, CAP, zones:ZONES.map(z => ({ id:z.id, x:z.cx, z:z.cz, soon:!!z.soon })), portals:PORTALS.map(p => ({ id:p.id, x:p.x, z:p.z, zone:p.zone })),
  players:() => [...RM.values()].map(a => ({ id:a.id, code:a.code, hero:a.hero, av:a.av, built:a.h && a.h.type, x:a.x, z:a.z, seen:a.seen, name:nameOf(a), r:a.r, emo:a.emo && a.emo.k, label:a.lbl.hidden ? null : a.lbl.textContent, hid:a.hid, e:a.e })),
  labels:() => [...labelsEl.querySelectorAll('.nm')].filter(e => !e.hidden).map(e => e.textContent),
  names:() => Object.fromEntries(NAMES), tp(x, z, f){ P.x = x; P.z = z; P.y = Math.max(0, W.heightAt(x, z)); P.vy = 0; P.grounded = true; P.cup = null; if(f != null) P.face = f; snapCam = true; },
  look(yaw, pitch){ cam.yaw = yaw; if(pitch != null) cam.pAdj = pitch; snapCam = true; },
  emote:k => emote(k), submitName:(n, raw) => submitName(n, raw), refreshFriends, get friends(){ return [...friendCodes]; },
  get cd(){ return CD ? { zone:CD.zone, left:CD.left } : null; }, get nav(){ return NAV; }, ring:() => myRing(), act:() => { updateActBtn(); const k = ctx && ctx.k; doAction(); return k; },
  ctx:() => (updateActBtn(), ctx && ctx.k), frMode:on => { frMode = on ? 15 : 0; if(on) refreshFriends().then(drawFrPanel); else frPanel.hidden = true; },
  W, get fps(){ return fps; }, get dpr(){ return dpr; }, renderer, COLL:W.COLL, plants:W.plants, cups:W.cups, nests:W.nests, eggStalls:W.eggStalls, pets:W.roamPets, climbTops:W.climbTops,
  dropChannel(){ const t = MP.t; if(!t) return; if(t.bc){ clearInterval(t.iv); t.bc.close(); t.bc = null; } else if(t.ch){ try{ t.ch.unsubscribe(); }catch(e){} } },
  setCam:c => { camOverride = c; }, setFog:(n, f) => { scene.fog.near = n; scene.fog.far = f; }, get carry(){ return P.carry; }, get inCup(){ return !!P.cup; }
};

/* ---------- boot ---------- */
setHero(heroId);
resize();
showLoading();
requestAnimationFrame(frame);
(async function boot(){
  if(!hasFr()){ showMenu(); return; }
  try{
    ME = await Friends.me();
    if(!ME || !ME.name) showName(); else { showMenu(); mpJoin(); }
    refreshFriends();
  }catch(e){
    // no internet: walk the island alone; try to connect again later
    showMenu(); MP.status = 'down';
    const retry = setInterval(() => { Friends.me().then(m => { ME = m; clearInterval(retry); if(!ME.name){ if(state === 'menu') showName(); } else mpJoin(); }, () => {}); }, 15000);
  }
})();
