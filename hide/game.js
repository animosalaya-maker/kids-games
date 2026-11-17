/* Bobo Hide & Seek («غميضة بوبو 🙈») — main game.
   Tiny toy-sized players in a giant room (kitchen, kids' bedroom, garden). One seeker, three hiders; bots fill empty slots.
   Round: 30 s to hide while the seeker counts with eyes covered, then the seeker has 2.5 min to find everyone.
   Hiders hop into cups, pots, the toy box or the sock drawer («اختبي»), or squeeze under the bed / behind the books,
   and can «تنكّر» into a small object for a few seconds. The seeker taps or touches hiders, searches containers
   («فتّش») and has a «صفّارة» that makes the nearest hider's spot sparkle. Found hiders become helpers.
   Online rooms of up to 4 (Supabase presence like heist; ?mp=local = BroadcastChannel): the room owner (host) runs
   the bots, the timer, the roles and every tag; the others send their own position. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { makeMaps, PHYS } from './maps.js';
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
const shuffle = a => { for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const charImg = id => '../worlds/chars/' + (HEROES[id] ? id : 'sara') + '.png';
const QS = new URLSearchParams(location.search);
const MP_LOCAL = QS.get('mp') === 'local';
const AU = makeAudio(), SFX = AU.SFX;

/* ======================================================================
   Rules and numbers
   ====================================================================== */
const HIDE_T = 30, SEEK_T = 150, DISG_T = 8, DISG_CD = 20, WH_CD = 18, WH_SHOW = 3;
const SPEED = 6.2, BOT_HIDE_SPEED = 5.2, BOT_SEEK_SPEED = 4.2, BOT_HELP_SPEED = 3.6;
const TOUCH_R = 1.15, TAP_R = 6.5, SEARCH_R = 2.6, NEAR_C = 2.4;
const MAP_IDS = ['kitchen', 'bedroom', 'garden'];
const MAP_E = { kitchen:'🍳', bedroom:'🧸', garden:'🌻' };
const MAP_NAME = { kitchen:L('المطبخ', 'Kitchen', 'Mutfak'), bedroom:L('غرفة النوم', 'Bedroom', 'Yatak odası'), garden:L('الجنينة', 'Garden', 'Bahçe') };
const MCOL = ['#ffc23d', '#6cc4ff', '#5ed6a0', '#ff8fb1'];
const isSeekSide = a => a.role === 'seeker' || a.st === 'found';

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'hide_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, hero:null, map:'kitchen', role:'hide', tut:0, rounds:0, wins:0, finds:0, best:{} }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      if(!MAP_IDS.includes(s.map)) s.map = 'kitchen';
      if(!['seek', 'hide', 'rand'].includes(s.role)) s.role = 'hide';
      for(const k of ['tut', 'rounds', 'wins', 'finds']) s[k] = clamp(Math.floor(+s[k] || 0), 0, 999999);
      const b = {}; if(s.best && typeof s.best === 'object') for(const m of MAP_IDS) if(s.best[m]) b[m] = clamp(s.best[m] | 0, 0, 3); s.best = b;
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
scene.background = new THREE.Color(0xffe9c7);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
  placeJoyHome();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xfff4e2, 0xcbb79a, 1.7); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d4, 2.1);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.0006; sun.shadow.normalBias = .03;
Object.assign(sun.shadow.camera, { left:-20, right:20, top:20, bottom:-20, near:1, far:120 }); sun.shadow.camera.updateProjectionMatrix();
scene.add(sun); scene.add(sun.target);
const SUN_OFF = new THREE.Vector3(16, 44, 22);
function aimSun(x, z){ sun.target.position.set(x, 0, z); sun.position.set(x + SUN_OFF.x, SUN_OFF.y, z + SUN_OFF.z); }
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();

/* ---------- Particles: confetti and sparkles ---------- */
const PMAX = 300, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.1, 0), new THREE.MeshBasicMaterial(), PMAX);
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
/* sparkle sprites for the whistle */
const starTex = K.canvasTex(64, 64, x => { x.fillStyle = '#fff6b0'; x.beginPath(); for(let i = 0; i < 8; i++){ const a = i / 8 * Math.PI * 2, r = i % 2 ? 8 : 30; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.closePath(); x.fill(); const g = x.createRadialGradient(32, 32, 0, 32, 32, 14); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
const sparks = [];
for(let i = 0; i < 26; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:starTex, transparent:true, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending })); s.visible = false; s.renderOrder = 5; scene.add(s); sparks.push({ s, life:0, x:0, y:0, z:0, ph:0 }); }
let sparkAt = null;
function sparkle(x, y, z, t = WH_SHOW){ sparkAt = { x, y, z, t }; SFX.spark(); }
function updateSparks(dt){
  if(sparkAt){ sparkAt.t -= dt; if(sparkAt.t <= 0) sparkAt = null; }
  sparks.forEach((p, i) => {
    if(!sparkAt){ p.s.visible = false; return; }
    const a = T * 2.2 + i * .9, r = .8 + (i % 4) * .45, h = ((T * 1.2 + i * .37) % 1);
    p.s.visible = true; p.s.position.set(sparkAt.x + Math.cos(a) * r, sparkAt.y + .3 + h * 3.2, sparkAt.z + Math.sin(a) * r);
    const sc = (.5 + Math.sin(T * 9 + i) * .25) * Math.min(1, sparkAt.t * 2); p.s.scale.setScalar(Math.max(.05, sc)); p.s.material.opacity = 1 - h * .7;
  });
}
/* a little text sprite (numbers above the counting seeker) */
function numTex(text, bg){
  return K.canvasTex(128, 128, x => { x.fillStyle = bg; x.beginPath(); x.arc(64, 64, 58, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#fff'; x.font = '900 64px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 64, 70); });
}
const countSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map:numTex('1', '#ff9a5a'), transparent:true, depthWrite:false })); countSpr.scale.setScalar(1.3); countSpr.visible = false; scene.add(countSpr);
let countShown = '';
const eyesTex = K.canvasTex(128, 128, x => { x.fillStyle = '#ff9a5a'; x.beginPath(); x.arc(64, 64, 58, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(); for(const s of [-1, 1]){ x.fillStyle = '#fff'; x.beginPath(); x.ellipse(64 + s * 22, 62, 16, 20, 0, 0, 6.3); x.fill(); x.fillStyle = '#3a1a08'; x.beginPath(); x.arc(64 + s * 22 + 4, 66, 8, 0, 6.3); x.fill(); } });
const helpTex = K.canvasTex(128, 128, x => { x.fillStyle = '#6cc4ff'; x.beginPath(); x.arc(64, 64, 58, 0, 6.3); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 8; x.stroke(); x.fillStyle = '#fff'; x.beginPath(); x.arc(56, 56, 22, 0, 6.3); x.lineWidth = 10; x.strokeStyle = '#fff'; x.stroke(); x.beginPath(); x.moveTo(72, 72); x.lineTo(96, 96); x.stroke(); });
const ringGeo = new THREE.RingGeometry(.48, .66, 28); ringGeo.rotateX(-Math.PI / 2);
const shadowGeo = new THREE.CircleGeometry(.5, 20); shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ map:K.blobTex, transparent:true, depthWrite:false });

/* ---------- disguise props (small objects you turn into) ---------- */
function propMesh(kind){
  const M = new K.Merge(), G = K.G;
  if(kind === 'cookie'){ M.add(G.cyl, 0, .2, 0, .75, .4, .75, 0, 0, 0, 0xd99a5b); for(let i = 0; i < 6; i++){ const a = i * 1.1; M.add(G.sm, Math.cos(a) * .4, .42, Math.sin(a) * .4, .1, .06, .1, 0, 0, 0, 0x5a3418); } }
  else if(kind === 'apple'){ M.add(G.sph, 0, .55, 0, .6, .55, .6, 0, 0, 0, 0xe8463e); M.add(G.cyl8, 0, 1.15, 0, .05, .3, .05, 0, 0, .2, 0x6a4a2a); M.add(G.sph, .18, 1.12, 0, .22, .07, .12, 0, 0, .4, 0x5cb85a); }
  else if(kind === 'sugar'){ M.add(G.box, 0, .4, 0, .8, .8, .8, 0, .3, 0, 0xffffff); }
  else if(kind === 'block'){ M.add(G.box, 0, .45, 0, .9, .9, .9, 0, .2, 0, 0x6cc4ff); M.add(G.cyl, 0, .91, 0, .3, .04, .3, 0, 0, 0, 0xffffff); }
  else if(kind === 'ball'){ M.add(G.sph, 0, .55, 0, .55, .55, .55, 0, 0, 0, 0xffc23d); for(let i = 0; i < 4; i++){ const a = i * 1.57; M.add(G.sm, Math.cos(a) * .48, .62, Math.sin(a) * .48, .14, .14, .14, 0, 0, 0, 0xffffff); } }
  else if(kind === 'sock'){ M.add(G.cyl, 0, .55, 0, .3, 1.1, .3, 0, 0, 0, 0xff8fb1); M.add(G.sph, 0, .12, .3, .32, .2, .5, 0, 0, 0, 0xff8fb1); M.add(G.cyl, 0, 1.05, 0, .32, .14, .32, 0, 0, 0, 0xffffff); }
  else if(kind === 'pebble'){ M.add(G.sph, 0, .35, 0, .7, .38, .55, 0, .4, 0, 0xbab3a8); }
  else if(kind === 'flower'){ M.add(G.cyl8, 0, .45, 0, .06, .9, .06, 0, 0, 0, 0x48a34a); for(let i = 0; i < 6; i++){ const a = i / 6 * 6.283; M.add(G.sph, Math.cos(a) * .3, .95, Math.sin(a) * .3, .22, .12, .22, 0, 0, 0, 0xff8fb1); } M.add(G.sph, 0, .97, 0, .16, .12, .16, 0, 0, 0, 0xffe066); }
  else { M.add(G.sph, 0, .45, 0, .42, .5, .42, 0, 0, 0, 0xb07a3a); M.add(G.hemi, 0, .72, 0, .48, .3, .48, 0, 0, 0, 0x7a5228); M.add(G.cyl8, 0, 1.05, 0, .05, .2, .05, 0, 0, 0, 0x5a3a20); }
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.6 })); m.castShadow = true; return m;
}

/* ======================================================================
   Maps
   ====================================================================== */
const MAPS = makeMaps(THREE, K, renderer);
let W = null;
const builtMaps = {};
function loadMap(id){
  if(W && W.id === id) return;
  if(W) scene.remove(W.group);
  W = builtMaps[id] || (builtMaps[id] = MAPS.build(id));
  scene.add(W.group);
  hemi.color.set(W.hemi[0]); hemi.groundColor.set(W.hemi[1]); scene.background.set(W.sky);
  for(const c of W.conts){ c.mesh.rotation.z = 0; c.mesh.rotation.x = 0; }
  podium.visible = false;
}
/* podium for the results */
const podium = new THREE.Group(); scene.add(podium); podium.visible = false;
{
  const M = new K.Merge(), G = K.G;
  for(const [x, h, c] of [[0, 2.2, 0xffc23d], [-2.2, 1.5, 0xd9dde6], [2.2, 1, 0xe8a06a]]){ M.add(G.box, x, h / 2, 0, 2, h, 2, 0, 0, 0, c); M.add(G.box, x, h + .04, 0, 1.8, .08, 1.8, 0, 0, 0, 0xffffff); }
  M.add(G.box, 0, .05, 0, 7, .1, 3, 0, 0, 0, 0xff8fb1);
  const m = new THREE.Mesh(M.geometry(), new THREE.MeshStandardMaterial({ vertexColors:true, roughness:.5 })); m.castShadow = m.receiveShadow = true; podium.add(m);
}
const PODIUM_SPOTS = [[0, 2.2], [-2.2, 1.5], [2.2, 1]];

/* ======================================================================
   Players (me, bots, friends)
   ====================================================================== */
let T = 0;
const ACT = [];               // everyone in the round
let me = null;
function mkActor(o){
  const a = Object.assign({ id:'?', kind:'bot', hero:'sara', role:'hider', st:'free', cont:-1, x:0, y:0, z:0, vx:0, vz:0, vy:0, gr:true, f:0, m:0,
    disg:0, dcd:0, wcd:0, finds:0, tFound:0, c:0, h:null, prop:null, ring:null, mark:null, tx:0, ty:0, tz:0, tf:0, tm:0, seen:false, bot:null, t:Math.random() * 5 }, o);
  a.h = HEROES[HEROES[a.hero] ? a.hero : 'sara'](); K.shadowHero(a.h); scene.add(a.h.grp);
  a.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color:MCOL[a.c % 4], transparent:true, opacity:.9, depthWrite:false })); scene.add(a.ring);
  a.shadow = new THREE.Mesh(shadowGeo, shadowMat); scene.add(a.shadow);
  a.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map:eyesTex, transparent:true, depthWrite:false })); a.mark.scale.setScalar(.75); scene.add(a.mark);
  ACT.push(a); return a;
}
function dropActor(a){
  scene.remove(a.h.grp, a.ring, a.mark, a.shadow); if(a.prop) scene.remove(a.prop);
  const i = ACT.indexOf(a); if(i >= 0) ACT.splice(i, 1);
}
function clearActors(){ while(ACT.length) dropActor(ACT[0]); me = null; }
const actor = id => ACT.find(a => a.id === id);
const hiders = () => ACT.filter(a => a.role === 'hider');
const occupant = ci => ACT.find(a => a.st === 'in' && a.cont === ci) || null;
function setDisg(a, on){
  if(on){ if(!a.prop){ a.prop = propMesh(a.disgKind || pick(W.disg)); scene.add(a.prop); } a.disg = DISG_T; a.dcd = DISG_CD; }
  else { a.disg = 0; if(a.prop){ scene.remove(a.prop); a.prop = null; } }
}

/* ======================================================================
   Round state (the host runs it; friends follow)
   ====================================================================== */
const R = { ph:'idle', t:0, map:'kitchen', n:0, online:false, res:null, lastBeep:-1 };
let state = 'menu';          // menu | select | play | pause | end | mp
function rolePick(pref){ return pref === 'seek' ? 'seeker' : pref === 'hide' ? 'hider' : (Math.random() < .3 ? 'seeker' : 'hider'); }
/* roster: [{id, hero, role, kind:'me'|'net'|'bot'}] */
function startRound(map, roster){
  loadMap(map); clearActors(); hideResult();
  R.map = map; R.ph = 'count'; R.t = HIDE_T; R.res = null; R.lastBeep = -1; R.n++; sparkAt = null; podium.visible = false; closeup = null;
  const hs = shuffle(W.spawn.hiders.slice());
  roster.forEach((r, i) => {
    const a = mkActor({ id:r.id, kind:r.kind, hero:r.hero, role:r.role, c:i });
    const sp = r.role === 'seeker' ? W.spawn.seeker : hs.pop() || [0, 0];
    a.x = a.tx = sp[0] + (Math.random() - .5) * .4; a.z = a.tz = sp[1] + (Math.random() - .5) * .4; a.y = a.ty = W.P.support(a.x, a.z, 1);
    a.f = a.tf = r.role === 'seeker' ? Math.PI : Math.atan2(-a.x, -a.z);
    a.disgKind = pick(W.disg);
    if(a.kind === 'bot') a.bot = { mode:'idle', path:null, pi:0, goal:null, stuck:0, best:1e9, wait:0, look:0, seenT:0, visited:new Set(), react:0, think:Math.random() * .3, reach:0 };
    if(a.kind === 'me') me = a;
  });
  state = 'play'; overlay.hidden = true; setPlayUI(true); clearInput(); placeJoyHome();
  cam.yaw = me ? me.f + Math.PI : 0; cam.pAdj = 0; snapCam = true;
  if(me && me.role === 'seeker') cam.yaw = 0;
  if(isHost()) ACT.filter(a => a.kind === 'bot' && a.role === 'hider').forEach(botPlanHide);
  AU.music(true, 'calm');
  hudKey = ''; actKey = ''; toolKey = '';
  tutorial();
}
function tutorial(){
  if(!me) return;
  const first = !(SAVE.tut & (me.role === 'seeker' ? 2 : 1));
  if(me.role === 'seeker'){
    if(first){ setTimeout(() => { if(R.ph === 'count') say(LINES.seek1, 5500, true); }, 600); setTimeout(() => { if(R.ph === 'count') say(LINES.seek2, 6000, true); }, 7000); setTimeout(() => { if(R.ph === 'count') say(LINES.seek3, 6000, true); }, 14500); SAVE.tut |= 2; persist(); }
    else say(LINES.seekShort, 4000, true);
  } else {
    if(first){ say(LINES.hide1, 5500); setTimeout(() => { if(R.ph === 'count' && me && me.st === 'free') say(LINES.hide2, 6000); }, 6500); setTimeout(() => { if(R.ph === 'count' && me && me.st === 'free') say(LINES.hide3, 6000); }, 13500); SAVE.tut |= 1; persist(); }
    else say(LINES.hideShort, 3500);
  }
}
function beginSeek(){
  R.ph = 'seek'; R.t = SEEK_T;
  banner(me && isSeekSide(me) ? L('دوّر! 👀', 'Seek! 👀', 'Ara! 👀') : L('جاي يدوّر! 🙈', 'Here they come! 🙈', 'Geliyor! 🙈'));
  SFX.go(); AU.music(true, 'seek');
  if(me && me.role === 'seeker'){ say(LINES.seekGo, 4500); }
  if(isHost()) ACT.filter(a => a.kind === 'bot' && a.role === 'seeker').forEach(a => { a.bot.mode = 'patrol'; a.bot.path = null; a.wcd = 8; });
  if(R.online && MP.isHost) mpSend('ev', { k:'seek' });
}
/* a hider is found (host decides; friends hear it as an event) */
function doFound(h, by, quiet){
  if(!h || h.role !== 'hider' || h.st === 'found') return;
  if(h.st === 'in'){ h.cont = -1; }
  h.st = 'found'; h.tFound = SEEK_T - R.t; setDisg(h, false);
  if(by) by.finds++;
  if(h.bot){ h.bot.mode = 'help'; h.bot.path = null; h.bot.goal = null; }
  burst(h.x, h.y + 1, h.z, 34, CONFETTI, 4.5, 1.1); SFX.found();
  if(h === me){ pop(L('لقوك! 🙈', 'Found you! 🙈', 'Buldular! 🙈')); say(LINES.helper, 5000); clearInput(); }
  else if(by === me) pop(L('لقيتو! 🎉', 'Found one! 🎉', 'Buldun! 🎉'));
  else if(!quiet) pop(L('انلقى واحد! 👀', 'Someone was found! 👀', 'Biri bulundu! 👀'));
  if(isHost() && R.online) mpSend('ev', { k:'found', t:h.id, by:by ? by.id : null });
  hudKey = '';
  if(isHost() && !hiders().some(a => a.st !== 'found')) setTimeout(() => { if(R.ph === 'seek') endRound(); }, 900);
}
function endRound(){
  if(R.ph === 'end') return;
  const list = ACT.map(a => ({ id:a.id, hero:a.hero, role:a.role, st:a.st, finds:a.finds, tf:a.st === 'found' ? Math.round(a.tFound) : SEEK_T, kind:a.kind === 'me' ? (R.online ? 'net' : 'me') : a.kind }));
  const res = { win:hiders().some(a => a.st !== 'found') ? 'hiders' : 'seeker', list };
  if(R.online && MP.isHost) mpSend('ev', { k:'end', res });
  showEnd(res);
}

/* ======================================================================
   Bots (only the host runs them)
   ====================================================================== */
const claimed = new Set();
function botGo(a, node){
  const from = MAPS.nearest(W, a.x, a.y, a.z);
  const p = MAPS.path(W, from, node);
  a.bot.path = p; a.bot.pi = 0; a.bot.stuck = 0; a.bot.best = 1e9; a.bot.goalNode = node;
  return !!p;
}
function botPlanHide(a){
  const b = a.bot; const sp = W.spawn.seeker;
  const opts = [];
  W.conts.forEach(c => { if(!claimed.has('c' + c.i)) opts.push({ k:'c', c, node:c.node, w:1.3 + Math.hypot(c.x - sp[0], c.z - sp[1]) / 25 }); });
  W.spots.forEach((s, i) => { if(!claimed.has('s' + i)) opts.push({ k:'s', s, i, node:s.node, w:1 + Math.hypot(s.x - sp[0], s.z - sp[1]) / 25 }); });
  shuffle(opts);
  for(let tries = 0; tries < 8 && opts.length; tries++){
    let tot = 0; opts.forEach(o => tot += o.w); let r = Math.random() * tot, ch = opts[0];
    for(const o of opts){ r -= o.w; if(r <= 0){ ch = o; break; } }
    opts.splice(opts.indexOf(ch), 1);
    if(botGo(a, ch.node)){ b.mode = 'tohide'; b.goal = ch; claimed.add(ch.k === 'c' ? 'c' + ch.c.i : 's' + ch.i); return; }
  }
  b.mode = 'wander'; botGo(a, Math.floor(Math.random() * W.nodes.length));
}
/* walk along the current path; returns true when the path is done */
function botWalk(a, dt, speed){
  const b = a.bot;
  if(!b.path || b.pi >= b.path.length){ a.vx *= .8; a.vz *= .8; W.P.step(a, 0, 0, false, dt); return true; }
  const nd = W.nodes[b.path[b.pi]];
  const d = MAPS.steer(W.P, a, nd.x, nd.y, nd.z, speed, dt);
  if(d < .55 && Math.abs(a.y - nd.y) < .7){ b.pi++; b.best = 1e9; b.stuck = 0; }
  else if(d < b.best - .08){ b.best = d; b.stuck = 0; }
  else if((b.stuck += dt) > 2.4){
    b.stuck = 0; b.best = 1e9; b.fails = (b.fails || 0) + 1;
    if(b.fails > 2){ b.fails = 0; a.x = nd.x; a.y = nd.y + .05; a.z = nd.z; a.vx = a.vz = a.vy = 0; burst(a.x, a.y + .6, a.z, 10, [0xffffff], 2, .7); b.pi++; }
    else if(b.goalNode != null){ botGo(a, b.goalNode); }
  }
  return false;
}
function faceMove(a, dt){ const v = Math.hypot(a.vx, a.vz); if(v > .4) a.f += angDiff(Math.atan2(a.vx, a.vz), a.f) * Math.min(1, dt * 10); a.m = Math.min(1, v / SPEED); }
/* can a seeker see a hider? (hiders inside things are never seen; a still disguise only from very close) */
function canSee(s, h){
  if(h.st !== 'free') return false;
  const dx = h.x - s.x, dz = h.z - s.z, dy = h.y - s.y, d = Math.hypot(dx, dz, dy);
  let range = 9;
  if(h.disg > 0) range = Math.hypot(h.vx, h.vz) > .6 ? 4.5 : 1.8;
  if(d > range) return false;
  if(d > 2.2){ const fx = Math.sin(s.f), fz = Math.cos(s.f); if((dx * fx + dz * fz) / Math.max(.01, Math.hypot(dx, dz)) < .35) return false; }
  return W.P.rayHit(s.x, s.y + 1, s.z, h.x, h.y + .7, h.z) >= .999;
}
function botHider(a, dt){
  const b = a.bot;
  if(a.st === 'in'){ a.vx = a.vz = 0; return; }
  if(a.dcd > 0) a.dcd -= dt;
  // a seeker coming close: maybe disguise, maybe run
  if(R.ph === 'seek' && (b.think -= dt) <= 0){
    b.think = .35;
    const s = ACT.filter(isSeekSide).sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0];
    if(s){
      const d = Math.hypot(s.x - a.x, s.z - a.z);
      if(d < 8 && a.disg <= 0 && a.dcd <= 0 && b.mode !== 'flee' && Math.random() < .55){ setDisg(a, true); b.mode = 'still'; b.path = null; if(R.online) mpSend('ev', { k:'poof', t:a.id }); SFXat(a, 'poof'); }
      else if(d < 6 && a.disg <= 0 && b.mode !== 'flee' && canSee(s, a) && Math.random() < .5){
        let far = -1, fd = 0; for(let k = 0; k < 14; k++){ const i = Math.floor(Math.random() * W.nodes.length), n = W.nodes[i], dd = Math.hypot(n.x - s.x, n.z - s.z); if(dd > fd && Math.abs(n.y - a.y) < 3){ fd = dd; far = i; } }
        if(far >= 0 && botGo(a, far)){ b.mode = 'flee'; if(b.goal){ claimed.delete(b.goal.k === 'c' ? 'c' + b.goal.c.i : 's' + b.goal.i); b.goal = null; } }
      }
    }
  }
  if(b.mode === 'still' || (b.mode === 'hidden')){ a.vx *= .7; a.vz *= .7; W.P.step(a, 0, 0, false, dt); if(a.disg <= 0 && b.mode === 'still') b.mode = 'hidden'; return; }
  const done = botWalk(a, dt, b.mode === 'flee' ? BOT_HIDE_SPEED * 1.05 : BOT_HIDE_SPEED);
  faceMove(a, dt);
  if(done){
    if(b.mode === 'tohide' && b.goal){
      if(b.goal.k === 'c' && !occupant(b.goal.c.i) && nearCont(a, b.goal.c)){ enterCont(a, b.goal.c); b.mode = 'hidden'; }
      else { b.mode = 'hidden'; a.f = Math.random() * 6.28; }
    } else if(b.mode === 'flee'){ b.mode = 'hidden'; }
    else if(b.mode === 'wander'){ botPlanHide(a); }
  }
}
function SFXat(a, k){ if(!me) return; const d = Math.hypot(a.x - me.x, a.z - me.z); if(d < 14) SFX[k](); }
function botSeeker(a, dt){
  const b = a.bot, speed = a.role === 'seeker' ? BOT_SEEK_SPEED : BOT_HELP_SPEED;
  if(R.ph !== 'seek'){ W.P.step(a, 0, 0, false, dt); a.m = 0; return; }
  if(a.wcd > 0) a.wcd -= dt;
  // look around
  if((b.look -= dt) <= 0){
    b.look = .22;
    const vis = hiders().filter(h => canSee(a, h));
    if(vis.length){ const h = vis.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z))[0]; if(b.mode !== 'chase'){ b.react = .8; } b.mode = 'chase'; b.target = h; b.seenT = 2.6; }
  }
  if(b.mode === 'chase'){
    const h = b.target;
    if(!h || h.st !== 'free'){ b.mode = 'patrol'; b.path = null; }
    else {
      b.seenT -= dt; if(canSee(a, h)) b.seenT = Math.max(b.seenT, 1.2);
      if(b.seenT <= 0){ b.mode = 'patrol'; b.path = null; b.wait = .6; }
      else if(b.react > 0){ b.react -= dt; W.P.step(a, a.vx * .5, a.vz * .5, false, dt); a.f += angDiff(Math.atan2(h.x - a.x, h.z - a.z), a.f) * Math.min(1, dt * 8); return; }
      else if(Math.abs(h.y - a.y) < 1.2 || Math.hypot(h.x - a.x, h.z - a.z) < 2.4){ MAPS.steer(W.P, a, h.x, h.y, h.z, speed * 1.08, dt); faceMove(a, dt); return; }
      else { if((b.rep = (b.rep || 0) - dt) <= 0){ b.rep = 1; botGo(a, MAPS.nearest(W, h.x, h.y, h.z)); } botWalk(a, dt, speed); faceMove(a, dt); return; }
    }
  }
  if(b.wait > 0){ b.wait -= dt; W.P.step(a, 0, 0, false, dt); a.m = 0; a.f += Math.sin(T * 3 + a.c) * dt * 1.5; return; }
  // whistle now and then: go where it sparkles
  if(a.role === 'seeker' && a.wcd <= 0 && R.t < SEEK_T - 40 && Math.random() < dt * .06){ const t = whistle(a); if(t){ b.hint = t; b.path = null; } }
  if(!b.path){
    let goal = null;
    if(b.hint){ goal = b.hint; b.hint = null; }
    else {
      const opts = [];
      W.conts.forEach(c => { if(!b.visited.has('c' + c.i)) opts.push({ k:'c', c, node:c.node, d:Math.hypot(c.x - a.x, c.z - a.z) + Math.abs(c.y - a.y) * 2 }); });
      W.spots.forEach((s, i) => { if(!b.visited.has('s' + i)) opts.push({ k:'s', s, i, node:s.node, d:Math.hypot(s.x - a.x, s.z - a.z) + Math.abs(s.y - a.y) * 2 }); });
      if(!opts.length){ b.visited.clear(); b.wait = .5; return; }
      opts.sort((p, q) => p.d - q.d);
      goal = opts[Math.floor(Math.random() * Math.min(3, opts.length))];
    }
    b.goal = goal;
    if(!botGo(a, goal.node)){ b.visited.add(goal.k === 'c' ? 'c' + goal.c.i : 's' + goal.i); b.wait = .3; return; }
  }
  const done = botWalk(a, dt, speed); faceMove(a, dt);
  if(done && b.goal){
    const g = b.goal; b.path = null; b.goal = null;
    if(g.k === 'c'){
      b.visited.add('c' + g.c.i); b.wait = 1.4; a.f = Math.atan2(g.c.x - a.x, g.c.z - a.z);
      wobble(g.c, .8);
      const o = occupant(g.c.i);
      if(o && Math.random() < (a.role === 'seeker' ? .55 : .35)) setTimeout(() => { if(o.st === 'in' && R.ph === 'seek') doFound(o, a); }, 450);
      else if(!o) SFXat(a, 'empty');
    } else if(g.k === 's'){ b.visited.add('s' + g.i); b.wait = 1.2; }
    else b.wait = .4;
  }
}
/* whistle: the nearest hider's spot sparkles; returns a goal for bots */
function whistle(a){
  a.wcd = WH_CD;
  const hs = hiders().filter(h => h.st !== 'found'); if(!hs.length) return null;
  hs.sort((p, q) => Math.hypot(p.x - a.x, p.z - a.z) - Math.hypot(q.x - a.x, q.z - a.z));
  const h = hs[0], c = h.st === 'in' ? W.conts[h.cont] : null;
  const x = c ? c.x : h.x, y = c ? c.y + c.h * .5 : h.y + .5, z = c ? c.z : h.z;
  sparkle(x, y, z); if(R.online) mpSend('ev', { k:'spark', x, y, z });
  if(h.kind === 'me' || a.kind === 'me') SFX.whistle(); else SFXat(a, 'whistle');
  if(h === me) say(L('صفّر المدوّر! مكانك عم يلمع ✨', 'The seeker whistled! Your spot is sparkling ✨', 'Ebe ıslık çaldı! Yerin parlıyor ✨'), 3000);
  return c ? { k:'c', c, node:c.node } : { k:'n', node:MAPS.nearest(W, h.x, h.y, h.z) };
}

/* ---------- containers ---------- */
function nearCont(a, c){
  if(Math.abs(a.y - c.y) > 2.6) return false;
  return Math.hypot(a.x - c.ax, a.z - c.az) < NEAR_C || Math.hypot(a.x - c.x, a.z - c.z) < c.r + 1.3;
}
function nearestCont(a, maxD = 99){ let best = null, bd = maxD; for(const c of W.conts){ if(!nearCont(a, c)) continue; const d = Math.hypot(a.x - c.x, a.z - c.z); if(d < bd){ bd = d; best = c; } } return best; }
function enterCont(a, c){
  a.st = 'in'; a.cont = c.i; setDisg(a, false); a.vx = a.vz = 0;
  wobble(c, .6); burst(c.x, c.y + c.h, c.z, 10, [0xffffff, 0xffe9a8], 2.4, .7);
  if(a === me){ SFX.hide(); } else SFXat(a, 'hide');
}
function leaveCont(a){
  const c = W.conts[a.cont]; a.st = 'free'; a.cont = -1;
  if(c){ a.x = c.ax; a.z = c.az; a.y = W.P.support(a.x, a.z, c.y + 1); a.vy = 3; a.gr = false; wobble(c, .4); }
  if(a === me) SFX.peek();
}
function wobble(c, k){ c.wob = Math.max(c.wob, k); }
/* search a container (seeker side): found or empty */
function searchCont(a, c){
  wobble(c, .8);
  const o = occupant(c.i);
  if(o){ doFound(o, a); }
  else { if(a === me){ SFX.empty(); pop(L('فاضي! 🤷', 'Empty! 🤷', 'Boş! 🤷')); } if(isHost() && R.online) mpSend('ev', { k:'empty', c:c.i }); }
}

/* ======================================================================
   Camera and input
   ====================================================================== */
const cam = { yaw:0, pitch:.42, dist:6.4, pAdj:0 };
let snapCam = true, closeup = null;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
function updateCamera(dt){
  if(closeup){ camPos.lerp(_v.set(closeup.px, closeup.py, closeup.pz), 1 - Math.exp(-4 * dt)); camLook.lerp(_s.set(closeup.lx, closeup.ly, closeup.lz), 1 - Math.exp(-5 * dt)); camera.position.copy(camPos); camera.lookAt(camLook); return; }
  if(!me) return;
  let tx = me.x, ty = me.y + 1.1, tz = me.z, dist = 6.4;
  if(me.st === 'in'){ const c = W.conts[me.cont]; if(c){ tx = c.x; ty = c.y + c.h + .5; tz = c.z; dist = 6.5 + c.r; } }
  const pitch = clamp(cam.pitch + cam.pAdj, .08, 1.25);
  const dx = Math.sin(cam.yaw) * Math.cos(pitch), dy = Math.sin(pitch), dz = Math.cos(cam.yaw) * Math.cos(pitch);
  const hit = W.P.rayHit(tx, ty, tz, tx + dx * dist, ty + dy * dist, tz + dz * dist, true);
  const dd = Math.max(1.4, dist * hit - .35);
  cam.dist = dd < cam.dist ? dd : lerp(cam.dist, dd, Math.min(1, dt * 3));
  _v.set(tx + dx * cam.dist, ty + dy * cam.dist, tz + dz * cam.dist);
  if(snapCam){ camPos.copy(_v); camLook.set(tx, ty, tz); snapCam = false; }
  else { camPos.lerp(_v, 1 - Math.exp(-14 * dt)); camLook.lerp(_s.set(tx, ty, tz), 1 - Math.exp(-16 * dt)); }
  camera.position.copy(camPos); camera.lookAt(camLook);
}
const joy = { x:0, y:0, id:null, ox:0, oy:0 }, look = { id:null, x:0, y:0, sx:0, sy:0, t0:0 }, keys = {};
const joyEl = $('#joy'), knob = $('#knob'), touch = $('#touch'), jumpBtn = $('#btnJump'), actBtn = $('#btnAct'), toolBtn = $('#btnTool');
let joyHome = [90, 0], wantJump = false;
function placeJoyHome(){ joyHome = [Math.max(84, SAL + 78), SH - Math.max(92, SH * .16) - SAB * .5]; if(joy.id == null) setJoy(joyHome[0], joyHome[1]); }
function setJoy(x, y){ joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px'; }
touch.addEventListener('pointerdown', e => {
  e.preventDefault(); AU.ac();
  const p = toLayer(e.clientX, e.clientY);
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
  else if(e.pointerId === look.id && state === 'play'){ cam.yaw -= (p.x - look.x) * .0075; cam.pAdj = clamp(cam.pAdj + (p.y - look.y) * .004, -.35, .75); look.x = p.x; look.y = p.y; }
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
function holdBtn(btn, fn){
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); btn.classList.add('on'); fn(); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, () => btn.classList.remove('on')));
}
holdBtn(jumpBtn, () => { wantJump = true; });
holdBtn(actBtn, () => doAction());
holdBtn(toolBtn, () => doTool());
const KEYMAP = { KeyW:'f', ArrowUp:'f', KeyS:'b', ArrowDown:'b', KeyA:'l', ArrowLeft:'l', KeyD:'r', ArrowRight:'r', KeyQ:'cl', KeyE:'cr' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; e.preventDefault(); }
  if(state === 'play' && !e.repeat){
    if(e.code === 'Space'){ wantJump = true; e.preventDefault(); }
    if(e.code === 'Enter' || e.code === 'KeyF'){ doAction(); e.preventDefault(); }
    if(e.code === 'KeyG'){ doTool(); }
  }
  if((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ joy.id = null; joy.x = joy.y = 0; look.id = null; knob.style.transform = ''; joyEl.classList.remove('on'); for(const k in keys) keys[k] = false; wantJump = false; }
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
/* tapping: the seeker side tags a hider (or a disguise) or searches a container */
function tapAt(x, y){
  if(!me || state !== 'play' || R.ph !== 'seek' || !isSeekSide(me)) return;
  ndc.set(x / SW * 2 - 1, -(y / SH * 2 - 1)); ray.setFromCamera(ndc, camera);
  let best = null, bd = 1e9;
  for(const h of hiders()){
    if(h.st !== 'free') continue;
    _v.set(h.x, h.y + .6, h.z);
    if(ray.ray.distanceToPoint(_v) < .9){ const d = camera.position.distanceTo(_v); if(d < bd){ bd = d; best = { h }; } }
  }
  for(const c of W.conts){
    _v.set(c.x, c.y + c.h * .5, c.z);
    if(ray.ray.distanceToPoint(_v) < c.r + .4){ const d = camera.position.distanceTo(_v); if(d < bd){ bd = d; best = { c }; } }
  }
  if(!best) return;
  if(best.h){
    const h = best.h, d = Math.hypot(h.x - me.x, h.z - me.z, h.y - me.y);
    if(d > TAP_R || W.P.rayHit(me.x, me.y + 1, me.z, h.x, h.y + .6, h.z) < .999){ SFX.bonk(); pop(L('قرّب أكتر 👣', 'Get closer 👣', 'Daha yaklaş 👣')); return; }
    requestTag(h);
  } else {
    const c = best.c;
    if(!nearCont(me, c)){ SFX.bonk(); pop(L('قرّب أكتر 👣', 'Get closer 👣', 'Daha yaklaş 👣')); return; }
    requestSearch(c);
  }
}
function requestTag(h){ if(isHost()) doFound(h, me); else mpSend('req', { k:'tag', t:h.id }); }
function requestSearch(c){ if(isHost()) searchCont(me, c); else { wobble(c, .8); mpSend('req', { k:'srch', c:c.i }); } }
const inp = { x:0, z:0, m:0 };
function readInput(dt){
  let ix = joy.x + (keys.r ? 1 : 0) - (keys.l ? 1 : 0), iy = joy.y + (keys.b ? 1 : 0) - (keys.f ? 1 : 0);
  let m = Math.hypot(ix, iy); if(m > 1){ ix /= m; iy /= m; m = 1; } if(m < .12){ ix = iy = 0; m = 0; }
  if(keys.cl) cam.yaw += 2.2 * dt; if(keys.cr) cam.yaw -= 2.2 * dt;
  const fx = -Math.sin(cam.yaw), fz = -Math.cos(cam.yaw), rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
  inp.x = rx * ix - fx * iy; inp.z = rz * ix - fz * iy; inp.m = m;
}
function stepMe(dt){
  if(!me) return;
  const frozen = (R.ph === 'count' && me.role === 'seeker') || R.ph === 'end' || me.st === 'in';
  if(frozen){ wantJump = false; if(me.st !== 'in') W.P.step(me, 0, 0, false, dt); me.m = lerp(me.m, 0, Math.min(1, dt * 10)); return; }
  readInput(dt);
  const sp = SPEED * (me.disg > 0 ? .75 : 1);
  W.P.step(me, inp.x * sp, inp.z * sp, wantJump, dt);
  if(me.jumped){ me.jumped = false; SFX.jump(); }
  if(me.landed){ me.landed = false; SFX.land(); }
  wantJump = false;
  if(inp.m > 0) me.f += angDiff(Math.atan2(inp.x, inp.z), me.f) * Math.min(1, 12 * dt);
  me.m = Math.min(1, Math.hypot(me.vx, me.vz) / SPEED);
  if(me.y < -5){ me.x = W.spawn.seeker[0]; me.z = W.spawn.seeker[1] + 4; me.y = 1; }
}

/* ---------- the context buttons ---------- */
function ctx(){
  if(!me || state !== 'play') return null;
  if(R.ph === 'end') return null;
  if(me.role === 'hider' && me.st === 'in') return { k:'out', e:'🚪', t:L('اطلع', 'Get out', 'Çık') };
  if(me.role === 'hider' && me.st === 'free'){
    const c = nearestCont(me);
    if(c && !occupant(c.i)) return { k:'in', c, e:'🙈', t:L('اختبي', 'Hide', 'Saklan') };
    if(c) return { k:'full', c, e:'🙊', t:L('في حدا!', 'Taken!', 'Dolu!'), dim:true };
    return null;
  }
  if(isSeekSide(me) && R.ph === 'seek'){
    let best = null, bd = 2.2;
    for(const h of hiders()) if(h.st === 'free'){ const d = Math.hypot(h.x - me.x, h.z - me.z, h.y - me.y); if(d < bd){ bd = d; best = h; } }
    if(best) return { k:'tag', h:best, e:'✋', t:L('مسكتك!', 'Tag!', 'Ebe!') };
    const c = nearestCont(me);
    if(c) return { k:'srch', c, e:'🔍', t:L('فتّش', 'Search', 'Ara') };
  }
  return null;
}
function doAction(){
  const c = ctx(); if(!c) return;
  if(c.k === 'in'){ enterCont(me, c.c); hudKey = ''; if(SAVE.tut < 8){ say(L('برافو! إنت مخبّى 🤫 ما حدا شايفك', 'Well done! You are hidden 🤫 nobody can see you', 'Aferin! Saklandın 🤫 kimse seni göremiyor'), 3500); } mpPos(true); }
  else if(c.k === 'out'){ leaveCont(me); mpPos(true); }
  else if(c.k === 'tag') requestTag(c.h);
  else if(c.k === 'srch') requestSearch(c.c);
  else if(c.k === 'full') SFX.bonk();
}
function doTool(){
  if(!me || state !== 'play') return;
  if(me.role === 'hider' && me.st === 'free'){
    if(me.disg > 0){ setDisg(me, false); SFX.unpoof(); mpPos(true); return; }
    if(me.dcd > 0){ SFX.bonk(); return; }
    setDisg(me, true); SFX.poof(); burst(me.x, me.y + .6, me.z, 18, [0xffffff, 0xffe9a8], 2.6, .8); mpPos(true);
    if(!(SAVE.tut & 4)){ SAVE.tut |= 4; persist(); say(L('صرت شي صغير! 🎭 إذا وقفت ما بيعرفك حدا', 'You turned into a little thing! 🎭 Stand still and nobody knows', 'Küçük bir şey oldun! 🎭 Kıpırdamazsan kimse anlamaz'), 4200); }
  } else if(isSeekSide(me) && R.ph === 'seek'){
    if(me.wcd > 0){ SFX.bonk(); return; }
    if(isHost()) whistle(me); else { me.wcd = WH_CD; SFX.whistle(); mpSend('req', { k:'wh' }); }
  }
}

/* ======================================================================
   Aunt Laila, pop-ups
   ====================================================================== */
const guideEl = $('#guide'), guideT = $('#guideT');
let sayTO = 0;
function say(text, ms = 4200, top = false){
  if(R.ph === 'count' && me && me.role === 'seeker' && state === 'play'){ $('#blindP').textContent = text; return; }   // the seeker's eyes are covered: Laila talks on the counting screen
  clearTimeout(sayTO); guideT.textContent = text; guideEl.classList.toggle('top', top);
  guideEl.hidden = false; guideEl.style.animation = 'none'; void guideEl.offsetWidth; guideEl.style.animation = '';
  sayTO = setTimeout(() => { guideEl.hidden = true; }, ms);
}
function hush(){ clearTimeout(sayTO); guideEl.hidden = true; }
const popEl = $('#pop'), bannerEl = $('#banner');
function pop(text){ popEl.textContent = text; popEl.classList.remove('go'); void popEl.offsetWidth; popEl.classList.add('go'); }
function banner(text){ bannerEl.textContent = text; bannerEl.classList.remove('go'); void bannerEl.offsetWidth; bannerEl.classList.add('go'); }
const LINES = {
  hide1: L('أهلا حبيبي! أنا العمة ليلى 👵 إنت صغير قد اللعبة ببيت عملاق!', "Hi sweetie! I'm Aunt Laila 👵 You're as small as a toy in a giant house!", 'Merhaba tatlım! Ben Leyla Teyze 👵 Dev bir evde oyuncak kadar küçüksün!'),
  hide2: L('روح لعند كاسة أو طنجرة أو صندوق، وكبوس 🙈 «اختبي»', 'Walk to a cup, a pot or a box and press 🙈 «Hide»', 'Bir fincana, tencereye ya da kutuya git ve 🙈 «Saklan»a bas'),
  hide3: L('أو اختبي تحت التخت وورا الكتب! وزر 🎭 بيخلّيك شي صغير', 'Or hide under the bed and behind books! The 🎭 button turns you into a little thing', 'Ya da yatağın altına, kitapların arkasına saklan! 🎭 düğmesi seni küçük bir şeye çevirir'),
  hideShort: L('يلا اختبي! 🙈 عندك 30 ثانية', 'Quick, hide! 🙈 You have 30 seconds', 'Hadi saklan! 🙈 30 saniyen var'),
  seek1: L('أهلا! أنا العمة ليلى 👵 إنت المدوّر! سكّر عيونك وعدّ…', "Hi! I'm Aunt Laila 👵 You are the seeker! Close your eyes and count…", 'Merhaba! Ben Leyla Teyze 👵 Ebe sensin! Gözlerini kapat ve say…'),
  seek2: L('بعدين دوّر عليهن: كبوس عليهن أو المسهن ✋', 'Then find them: tap them or touch them ✋', 'Sonra onları bul: dokun ya da yakala ✋'),
  seek3: L('فتّش الكاسات والصناديق 🔍 والصفّارة 📣 بتلمّع مكان أقرب واحد', 'Search the cups and boxes 🔍 and the whistle 📣 makes the nearest spot sparkle', 'Fincanları ve kutuları ara 🔍 ıslık 📣 en yakın yeri parlatır'),
  seekShort: L('سكّر عيونك وعدّ للـ 30 🙈', 'Close your eyes and count to 30 🙈', 'Gözlerini kapat ve 30a kadar say 🙈'),
  seekGo: L('يلا دوّر! 👀 كبوس عالمخبّى أو فتّش 🔍', 'Go seek! 👀 Tap a hider or search 🔍', 'Hadi ara! 👀 Saklanana dokun ya da ara 🔍'),
  helper: L('مش مشكلة! هلّق إنت بتساعد بالتدوير 🔍', "That's okay! Now you help to seek 🔍", 'Sorun değil! Şimdi aramaya yardım ediyorsun 🔍')
};

/* ======================================================================
   HUD
   ====================================================================== */
const hudEl = $('#hud'), hudTime = $('#hudTime'), hudRole = $('#hudRole'), stripEl = $('#strip'), inChip = $('#inChip'), blindEl = $('#blind');
let hudKey = '', actKey = '', toolKey = '';
function setPlayUI(on){
  hudEl.hidden = !on; joyEl.hidden = !on; jumpBtn.hidden = !on;
  if(!on){ actBtn.hidden = true; toolBtn.hidden = true; inChip.hidden = true; blindEl.hidden = true; actKey = ''; toolKey = ''; }
  hudKey = '';
}
const fmt = t => { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
function hudFrame(){
  if(!me) return;
  const tStr = fmt(R.t);
  if(hudTime.textContent !== tStr){ hudTime.textContent = '⏱ ' + tStr; hudTime.classList.toggle('hurry', R.ph === 'seek' && R.t <= 15); }
  const roleK = me.role + me.st + R.ph;
  const key = roleK + '|' + ACT.map(a => a.id + a.st + a.role + a.hero).join(',');
  if(key !== hudKey){
    hudKey = key;
    const rc = me.role === 'seeker' ? ['seek', '👀 ' + L('إنت المدوّر', 'You seek', 'Ebe sensin')] : me.st === 'found' ? ['help', '🔍 ' + L('بتساعد بالتدوير', 'Helping to seek', 'Aramaya yardım')] : ['hide', '🙈 ' + L('إنت مخبّى', 'You hide', 'Saklanıyorsun')];
    hudRole.className = 'chip rolechip ' + rc[0]; hudRole.textContent = rc[1];
    stripEl.innerHTML = ACT.map(a => { const ic = a.role === 'seeker' ? '👀' : a.st === 'found' ? '✅' : '🙈'; return `<div class="ps${a === me ? ' me' : ''}${a.st === 'found' ? ' out' : ''}" style="--c:${MCOL[a.c % 4]}"><img src="${charImg(a.hero)}" alt=""><i>${ic}</i></div>`; }).join('');
  }
  // blindfold for the counting seeker
  const blind = R.ph === 'count' && me.role === 'seeker';
  if(blindEl.hidden === blind){ blindEl.hidden = !blind; if(blind){ $('#blindT').textContent = L('عم عدّ…', "I'm counting…", 'Sayıyorum…'); if(!$('#blindP').textContent) $('#blindP').textContent = L('أصحابك عم يختبوا 🤫', 'Your friends are hiding 🤫', 'Arkadaşların saklanıyor 🤫'); } else $('#blindP').textContent = ''; }
  if(blind){ const n = String(Math.min(HIDE_T, Math.floor(HIDE_T - R.t) + 1)), el = $('#blindN'); if(el.textContent !== N(n)){ el.textContent = N(n); el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); } }
  // context button
  const c = ctx(), ak = c ? c.k + c.e + (c.c ? c.c.i : '') : '';
  if(ak !== actKey){ actKey = ak; actBtn.hidden = !c; if(c){ $('#actI').textContent = c.e; $('#actB').textContent = c.t; actBtn.style.setProperty('--ac', c.k === 'in' ? 'var(--mint)' : c.k === 'tag' ? 'var(--pink)' : c.k === 'srch' ? 'var(--orange)' : 'var(--gold)'); actBtn.classList.toggle('pulse', c.k === 'in' || c.k === 'tag'); actBtn.classList.toggle('wait', !!c.dim); } }
  // tool button
  let tool = null;
  if(R.ph !== 'end' && me.role === 'hider' && me.st === 'free') tool = { e:me.disg > 0 ? '✨' : '🎭', t:me.disg > 0 ? L('رجّعني', 'Back', 'Geri dön') : L('تنكّر', 'Disguise', 'Kılık'), cd:me.disg > 0 ? 0 : me.dcd / DISG_CD, ac:'var(--pink)' };
  else if(R.ph === 'seek' && isSeekSide(me)) tool = { e:'📣', t:L('صفّارة', 'Whistle', 'Islık'), cd:me.wcd / WH_CD, ac:'var(--gold)' };
  const tk = tool ? tool.e + tool.t : '';
  if(tk !== toolKey){ toolKey = tk; toolBtn.hidden = !tool; if(tool){ $('#toolI').textContent = tool.e; $('#toolB').textContent = tool.t; toolBtn.style.setProperty('--ac', tool.ac); } }
  if(tool){ const p = clamp(tool.cd, 0, 1); $('#toolCd').style.setProperty('--p', (p * 100).toFixed(1) + '%'); toolBtn.classList.toggle('wait', p > 0); }
  jumpBtn.hidden = me.st === 'in' || blind;
  // «you are inside …» chip
  const inTxt = me.st === 'in' && W.conts[me.cont] ? '🤫 ' + L('إنت مخبّى بـ', 'You are hiding in ', 'Saklandığın yer: ') + W.conts[me.cont].name : me.disg > 0 ? '🎭 ' + L('إنت متنكّر! وقّف ما تتحرك', "You're disguised! Stand still", 'Kılık değiştirdin! Kıpırdama') : '';
  if(inChip.textContent !== inTxt){ inChip.textContent = inTxt; inChip.hidden = !inTxt; }
}

/* ======================================================================
   Results: podium, stars, coins
   ====================================================================== */
const resultEl = $('#result'), rcard = $('#rcard');
function hideResult(){ resultEl.hidden = true; }
function starsFor(e, res){
  if(e.role === 'seeker'){ const n = res.list.filter(x => x.role === 'hider').length, f = res.list.filter(x => x.role === 'hider' && x.st === 'found').length; return f >= n ? 3 : f * 2 >= n ? 2 : 1; }
  return e.st !== 'found' ? 3 : e.tf >= 60 ? 2 : 1;
}
function showEnd(res){
  R.ph = 'end'; R.res = res; state = 'end'; setPlayUI(false); clearInput(); hush(); AU.music(false);
  // rank: survivors first, then the seeker (by finds), then the found ones by time
  const score = e => e.role === 'hider' ? (e.st !== 'found' ? 1000 + e.tf : e.tf) : e.finds * 60 + (res.win === 'seeker' ? 600 : 0);
  const ranked = res.list.slice().sort((a, b) => score(b) - score(a));
  // podium in the room: find a camera direction with a clear view, turn the podium and everyone toward it
  const px = W.podium.x, pz = W.podium.z, py = W.P.support(px, pz, .5);
  let bestA = W.podium.f, bestS = -1;
  for(let k = 0; k < 24; k++){
    const an = k / 24 * Math.PI * 2, cx = px + Math.sin(an) * 10, cz = pz + Math.cos(an) * 10;
    if(cx < W.bx0 + 1 || cx > W.bx1 - 1 || cz < W.bz0 + 1 || cz > W.bz1 - 1) continue;
    let sc = 0; for(const [dy, side] of [[4.4, 0], [2, 0], [3, 3], [3, -3]]){ const ox = Math.cos(an) * side, oz = -Math.sin(an) * side; sc += W.P.rayHit(px + ox, py + 1.5, pz + oz, cx + ox, py + dy, cz + oz, true); }
    sc -= Math.abs(angDiff(an, W.podium.f)) * .02;
    if(sc > bestS){ bestS = sc; bestA = an; }
  }
  const f = bestA;
  podium.position.set(px, py, pz); podium.rotation.y = f; podium.visible = true;
  for(const a of ACT){ a.st === 'in' && (a.cont = -1); setDisg(a, false); }
  const c = Math.cos(f), s = Math.sin(f);
  ranked.forEach((e, i) => {
    const a = actor(e.id); if(!a) return;
    a.podium = i;
    if(i < 3){ const [lx, ly] = PODIUM_SPOTS[i]; a.x = px + lx * c; a.z = pz - lx * s; a.y = py + ly; }
    else { const lx = 4.6, lz = .8; a.x = px + lx * c + lz * s; a.z = pz - lx * s + lz * c; a.y = py; }
    a.f = f; a.vx = a.vz = a.vy = 0; a.gr = true;
  });
  // the card covers one side of the screen (left in Arabic, right otherwise): put the podium on the other side
  const fx = s, fz = c, side = (window.I18N && I18N.dir === 'rtl') ? 1 : -1, rx = -fz * -1, rz = fx * -1;   // screen-right when looking along -f
  const sh = 3.2 * side;
  closeup = { px:px + fx * 10 - rx * sh, py:py + 4.4, pz:pz + fz * 10 - rz * sh, lx:px - rx * sh, ly:py + 2, lz:pz - rz * sh };
  // me
  const mine = me ? res.list.find(e => e.id === me.id) : null;
  let stars = 0, coins = 0;
  if(mine){
    stars = starsFor(mine, res);
    coins = stars * 2 + (mine.role === 'seeker' ? Math.min(3, mine.finds) : 0);
    SAVE.rounds++; if((mine.role === 'hider' && mine.st !== 'found') || (mine.role === 'seeker' && res.win === 'seeker')) SAVE.wins++;
    if(mine.role === 'seeker') SAVE.finds += mine.finds;
    SAVE.best[R.map] = Math.max(SAVE.best[R.map] || 0, stars); persist();
    try{ if(window.World){ World.addCoins(coins, L('من غميضة بوبو', 'from Bobo Hide & Seek', 'Bobo Saklambaç\'tan')); if(stars === 3) World.track('win', 'hide'); else World.track('play', 'hide'); } }catch(e){}
  }
  const iWon = mine && ((mine.role === 'hider' && mine.st !== 'found') || (mine.role === 'seeker' && res.win === 'seeker'));
  if(iWon || stars >= 2) SFX.fanfare(); else SFX.soft();
  burst(px, py + 3, pz, 60, CONFETTI, 6, 1.2);
  const title = res.win === 'hiders' ? L('المخبّايين ربحوا! 🙈🎉', 'The hiders win! 🙈🎉', 'Saklananlar kazandı! 🙈🎉') : L('المدوّر لقى الكل! 👀🎉', 'The seeker found everyone! 👀🎉', 'Ebe herkesi buldu! 👀🎉');
  const slot = e => { const lab = e.role === 'seeker' ? '👀 ' + N(e.finds) : e.st !== 'found' ? '🏆 ' + L('ما انلقى', 'Not found', 'Bulunamadı') : '⏱ ' + fmt(e.tf);
    const img = `<img src="${charImg(e.hero)}" alt="">`;
    return `<div class="slot${(e.role === 'hider' && e.st !== 'found') || (e.role === 'seeker' && res.win === 'seeker') ? ' win' : ''}" style="--c:${MCOL[(actor(e.id) || { c:0 }).c % 4]}">${img}<span>${e.kind === 'bot' ? '🤖' : (me && e.id === me.id ? L('إنت', 'You', 'Sen') : '👫')} ${HERO_NAME[e.hero] || ''}</span><small>${lab}</small></div>`; };
  const host = isHost();
  rcard.innerHTML = `<h2>${title}</h2>
    ${mine ? `<div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('')}</div>` : ''}
    <div class="slots">${ranked.map(slot).join('')}</div>
    ${coins ? `<p>+${N(coins)} 🪙</p>` : ''}
    <div class="row">${host ? `<button class="big-btn" id="bAgain">🔄 ${L('جولة كمان', 'Play again', 'Tekrar oyna')}</button>` : `<p>${L('استنّى صاحب الغرفة…', 'Waiting for the room owner…', 'Oda sahibini bekle…')}</p>`}
    <button class="ghost-btn" id="bMenuR">🏠 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  resultEl.hidden = false;
  if(host) $('#bAgain').onclick = () => { SFX.tap(); again(); };
  $('#bMenuR').onclick = () => { SFX.tap(); showMenu(); };
}
function again(){
  if(R.online){ mpLobby(); return; }
  startSolo(SAVE.map, SAVE.role);
}

/* ======================================================================
   Menu, hero picker, pause
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showMenu(){
  if(MP.t) mpLeave(true);
  R.ph = 'idle'; clearActors(); hideResult(); closeup = null; podium.visible = false; AU.music(false); sparkAt = null;
  loadMap(SAVE.map);
  state = 'menu'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay clear'; card.className = 'card bare'; clearInput(); hush();
  const rotHint = ROT && !rawGet('hide_rothint');
  const best = m => SAVE.best[m] ? ' ' + '⭐'.repeat(SAVE.best[m]) : '';
  card.innerHTML = `<div class="menu">
    ${rotHint ? `<div class="rothint"><i aria-hidden="true">📱</i><span>${L('لفّ الجوال على جنب', 'Turn your phone sideways', 'Telefonu yan çevir')}</span></div>` : ''}
    <div class="logo">🙈</div><h1>${L('غميضة بوبو', 'Bobo Hide & Seek', 'Bobo Saklambaç')}</h1>
    <p class="sub">${L('إنت صغير قد اللعبة ببيت عملاق! اختبي أو دوّر', "You're toy-sized in a giant house! Hide or seek", 'Dev bir evde oyuncak kadarsın! Saklan ya da ara')}</p>
    <div class="picks" id="maps">${MAP_IDS.map(m => `<button class="pick${m === SAVE.map ? ' on' : ''}" data-m="${m}"><i>${MAP_E[m]}</i>${MAP_NAME[m]}<small>${best(m)}</small></button>`).join('')}</div>
    <div class="picks roles" id="roles">${[['hide', '🙈', L('بختبي', 'Hide', 'Saklan')], ['seek', '👀', L('بدوّر', 'Seek', 'Ara')], ['rand', '🎲', L('عشوائي', 'Random', 'Rastgele')]].map(([k, e, t]) => `<button class="pick${k === SAVE.role ? ' on' : ''}" data-r="${k}"><i>${e}</i>${t}</button>`).join('')}
    <button class="hero-btn" id="bHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button></div>
    <div class="row"><button class="big-btn" id="bPlay">▶️ ${L('العب', 'Play', 'Oyna')}</button>
    <button class="big-btn pink" id="bMp">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button></div></div>`;
  card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { SFX.tap(); SAVE.map = b.dataset.m; persist(); card.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); loadMap(SAVE.map); });
  card.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { SFX.tap(); SAVE.role = b.dataset.r; persist(); card.querySelectorAll('[data-r]').forEach(x => x.classList.toggle('on', x === b)); });
  $('#bPlay').onclick = () => { AU.ac(); SFX.tap(); startSolo(SAVE.map, SAVE.role); };
  $('#bMp').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
  $('#bHero').onclick = () => { AU.ac(); SFX.tap(); showSelect('menu'); };
}
function botHeroes(n, used){ return shuffle(HERO_IDS.filter(h => h !== 'me' && !used.includes(h))).slice(0, n); }
function startSolo(map, pref){
  if(ROT) rawSet('hide_rothint', '1');
  R.online = false; claimed.clear();
  const role = rolePick(pref), bh = botHeroes(3, [heroId]);
  const roster = [{ id:'me', hero:heroId, role, kind:'me' }];
  const seekerBot = role === 'hider' ? 0 : -1;
  bh.forEach((h, i) => roster.push({ id:'b' + i, hero:h, role:i === seekerBot ? 'seeker' : 'hider', kind:'bot' }));
  startRound(map, roster);
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
    SFX.tap(); heroId = selPick; SAVE.hero = selPick; persist(); rawSet('worlds_hero', selPick);
    if(selFrom === 'pause'){
      if(me){ me.hero = heroId; scene.remove(me.h.grp); me.h = HEROES[heroId](); K.shadowHero(me.h); scene.add(me.h.grp); hudKey = ''; }
      if(mpActive()) mpTrack();
      resume();
    }
    else if(selFrom === 'mp'){ if(mpActive()){ mpTrack(); mpLobby(); } else mpMenu(); } else showMenu();
  };
}
let pausedAt = 0;
function showPause(){
  if(state !== 'play') return;
  state = 'pause'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card'; clearInput(); hush();
  const mp = mpActive();
  card.innerHTML = `<h2>⏸️ ${L('استراحة', 'Paused', 'Mola')}</h2>
    <button class="big-btn" id="bRes">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    <div class="row"><button class="ghost-btn" id="bHeroP">🦸 ${L('غيّر الشخصية', 'Change character', 'Karakteri değiştir')}</button>
    <button class="ghost-btn" id="bSnd">${AU.muted ? '🔇' : '🔊'} ${L('الصوت', 'Sound', 'Ses')}</button>
    <button class="ghost-btn" id="bMenuP">🏠 ${mp ? L('اطلع من الغرفة', 'Leave the room', 'Odadan çık') : L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('خروج', 'Exit', 'Çıkış')}</button>`;
  $('#bRes').onclick = () => { SFX.tap(); resume(); };
  $('#bHeroP').onclick = () => { SFX.tap(); showSelect('pause'); };
  $('#bSnd').onclick = () => { AU.setMuted(!AU.muted); $('#bSnd').innerHTML = (AU.muted ? '🔇' : '🔊') + ' ' + L('الصوت', 'Sound', 'Ses'); SFX.tap(); };
  $('#bMenuP').onclick = () => { SFX.tap(); showMenu(); };
  $('#bExit').onclick = () => { SFX.tap(); try{ persist(); if(MP.t) mpLeave(true); }catch(e){} setTimeout(() => { location.href = '../'; }, 150); };
}
function resume(){ overlay.hidden = true; state = R.ph === 'end' ? 'end' : 'play'; if(state === 'play') setPlayUI(true); placeJoyHome(); hudKey = ''; actKey = ''; toolKey = ''; }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* ======================================================================
   Main loop
   ====================================================================== */
let SIMK = 1;          // tests only: run the simulation several times per frame
let last = performance.now(), fpsN = 0, fpsT = 0, fps = 60, slowT = 0, menuT = 0;
function simRound(dt){
  if(R.ph === 'end' || R.ph === 'idle') return;
  if(R.ph === 'count' || R.ph === 'seek'){
    if(isHost() || R.online){ R.t -= dt; }
    if(R.ph === 'seek' && R.t <= 10 && Math.ceil(R.t) !== R.lastBeep){ R.lastBeep = Math.ceil(R.t); if(R.t > 0) SFX.tick(); }
    if(R.ph === 'count' && me && me.role === 'seeker'){ const n = Math.floor(HIDE_T - R.t); if(n !== R.lastBeep && n >= 0){ R.lastBeep = n; SFX.beep(n); } }
    if(isHost()){
      if(R.ph === 'count' && R.t <= 0){ R.lastBeep = -1; beginSeek(); }
      else if(R.ph === 'seek' && R.t <= 0){ R.t = 0; endRound(); }
    }
  }
  for(const a of ACT){
    if(a.disg > 0){ a.disg -= dt; if(a.disg <= 0){ setDisg(a, false); if(a === me) SFX.unpoof(); } }
    if(a.dcd > 0 && a.disg <= 0) a.dcd -= dt;
    if(a.wcd > 0 && a.kind !== 'bot') a.wcd -= dt;
  }
  if(isHost()){
    for(const a of ACT) if(a.kind === 'bot'){ if(a.role === 'seeker' || a.st === 'found') botSeeker(a, dt); else botHider(a, dt); }
    // touch tags
    if(R.ph === 'seek') for(const s of ACT){ if(!isSeekSide(s)) continue; for(const h of ACT){ if(h.role !== 'hider' || h.st !== 'free') continue; if(Math.hypot(h.x - s.x, h.z - s.z) < TOUCH_R && Math.abs(h.y - s.y) < 1.3) doFound(h, s); } }
  }
}
function poseActors(dt){
  for(const a of ACT){
    a.t += dt;
    if(a.kind === 'net' || (a.kind === 'bot' && !isHost())){
      const k = 1 - Math.exp(-10 * dt); a.x = lerp(a.x, a.tx, k); a.y = lerp(a.y, a.ty, k); a.z = lerp(a.z, a.tz, k); a.f += angDiff(a.tf, a.f) * k; a.m = lerp(a.m, a.tm, k);
    }
    const hidden = a.st === 'in' && R.ph !== 'end';
    const showProp = a.disg > 0 && !!a.prop && R.ph !== 'end';
    a.h.grp.visible = !hidden && !showProp;
    a.ring.visible = a.shadow.visible = !hidden && !showProp && R.ph !== 'end';
    if(a.prop){ a.prop.visible = showProp; a.prop.position.set(a.x, a.y, a.z); a.prop.rotation.y = a.f; }
    if(a.h.grp.visible){
      a.h.grp.position.set(a.x, a.y, a.z); a.h.grp.rotation.y = a.f;
      if(R.ph === 'end'){ const hop = a.podium != null && a.podium < 3 ? Math.max(0, Math.sin(a.t * 5 + a.c)) * .35 : 0; a.h.grp.position.y = a.y + hop; poseHero(a.h, { t:a.t, dt, run:0, grounded:hop < .05, vy:hop > .05 ? 2 : 0, sq:0, flip:0 }); }
      else poseHero(a.h, { t:a.t, dt, run:a.m, grounded:a.gr !== false || a.kind === 'net', vy:a.vy || 0, sq:0, flip:0, sneak:a.role === 'hider' && a.st === 'free' && R.ph === 'seek' ? .5 : 0 });
      if(a.role === 'seeker' && R.ph === 'count'){ a.h.grp.rotation.y = a.f; }
    }
    a.ring.position.set(a.x, a.y + .03, a.z); a.shadow.position.set(a.x, W.P.support(a.x, a.z, a.y + .1) + .02, a.z);
    // marker above: seeker eyes / helper magnifier
    const mk = a.role === 'seeker' ? eyesTex : a.st === 'found' ? helpTex : null;
    a.mark.visible = !!mk && R.ph !== 'end' && a.h.grp.visible && !(a.role === 'seeker' && R.ph === 'count');
    if(mk){ if(a.mark.material.map !== mk){ a.mark.material.map = mk; a.mark.material.needsUpdate = true; } a.mark.position.set(a.x, a.y + 2, a.z); }
  }
  // counting number above the seeker
  const sk = ACT.find(a => a.role === 'seeker');
  countSpr.visible = !!sk && R.ph === 'count' && !(me && me.role === 'seeker');
  if(countSpr.visible){ const n = String(Math.min(HIDE_T, Math.floor(HIDE_T - R.t) + 1)); if(n !== countShown){ countShown = n; countSpr.material.map.dispose(); countSpr.material.map = numTex(n, '#ff9a5a'); countSpr.material.needsUpdate = true; } countSpr.position.set(sk.x, sk.y + 2.3 + Math.sin(T * 4) * .08, sk.z); }
  // container wobble (and a little shiver now and then when someone is inside)
  for(const c of W.conts){
    if(R.ph === 'seek' && occupant(c.i) && Math.random() < dt * .18) wobble(c, .25);
    if(c.wob > 0){ c.wob = Math.max(0, c.wob - dt * 1.2); c.mesh.rotation.z = Math.sin(T * 26) * .08 * c.wob; c.mesh.rotation.x = Math.cos(T * 21) * .05 * c.wob; }
    else if(c.mesh.rotation.z){ c.mesh.rotation.z = 0; c.mesh.rotation.x = 0; }
  }
}
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){
    fps = fpsN / fpsT; fpsN = 0; fpsT = 0;
    if(state === 'play' && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; if(dpr > 1){ dpr = Math.max(1, dpr - .25); renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); } else if(renderer.shadowMap.enabled && fps < 30){ renderer.shadowMap.enabled = false; sun.castShadow = false; scene.traverse(o => { if(o.material) o.material.needsUpdate = true; }); } } } else slowT = 0;
  }
  const running = state === 'play' || state === 'end' || (state === 'pause' && R.online) || (state === 'select' && R.online && R.ph !== 'idle');
  if(running && R.ph !== 'idle'){
    for(let k = 0; k < SIMK; k++){ if(state === 'play') stepMe(dt); if(R.ph !== 'idle') simRound(dt); }
  }
  if(W && R.ph !== 'idle') poseActors(dt);
  if(state === 'play') hudFrame();
  if(state === 'menu' || state === 'select' && R.ph === 'idle' || (state === 'mp' && R.ph === 'idle')){
    menuT += dt; const a = menuT * .06 + .6;
    camera.position.set(Math.sin(a) * 26, 15, Math.cos(a) * 18); camera.lookAt(0, 3, 0); aimSun(0, 0);
  } else { updateCamera(dt); aimSun(camLook.x, camLook.z); }
  mpFrame(dt);
  updateParts(dt); updateSparks(dt);
  renderer.render(scene, camera);
}
document.addEventListener('visibilitychange', () => { if(document.hidden){ persist(); if(state === 'play' && !mpActive()) showPause(); } });
addEventListener('pagehide', () => { persist(); try{ if(MP.t) mpLeave(true); }catch(e){} });

/* ======================================================================
   Online («👫 العب مع أصحابك»): a room of up to 4. Nothing is stored on a server.
   The room owner (host) is the referee: roles, timer, bots and tags. No names, no chat.
   Events: pos (each player), st (host snapshot), ev (host events), req (asks to the host), lob (lobby info)
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
/* the room connection itself (re-join after a drop, no HTTP fallback, watchdog) lives in the shared ../rt.js */
class SupabaseTransport{
  async open(code, id, h){
    if(navigator.onLine === false) throw new Error('offline');
    await loadSupabase();
    if(this.closed) throw new Error('cancelled');
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-hide-' + code, id, events:MP_EVENTS, eps:30, h });
    await this.rt.ready;
  }
  track(meta){ if(this.rt) this.rt.track(meta); }
  send(ev, payload){ if(this.rt) this.rt.send(ev, payload); }
  close(){ this.closed = true; if(this.rt){ this.rt.close(); this.rt = null; } }
}
class LocalTransport{
  open(code, id, h){
    this.id = id; this.h = h; this.meta = null; this.peers = new Map(); this.ready = false;
    const bc = this.bc = new BroadcastChannel('bobo-hide-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, sendT:0, stT:0, inviteFor:null, typed:'', map:'kitchen', round:0 };
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const isHost = () => !R.online || MP.isHost;
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const okHero = id => HEROES[id] ? id : 'sara';
/* «أصحابي»: tell friends which room I'm in. The server may not know the game id yet, so every call is guarded. */
const FR_GAME = 'hide';
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
  MP.t = null; MP.meta = null; MP.list = []; MP.players = []; MP.isHost = false; MP.hostId = null; MP.synced = false; MP.hostGone = 0;
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
  MP.meta = { hero:heroId, c, o:others.reduce((m, p) => Math.max(m, p.o || 0), 0) + 1, ph:'play' };
  t.track(MP.meta);
  MP.hostId = how === 'create' ? MP.id : others.slice().sort(mpSort)[0].id;
  mpPresence(MP.list);
  frRoom(code);
  return 'ok';
}
function mpTrack(){ if(MP.t && MP.meta){ MP.meta.hero = heroId; MP.t.track(MP.meta); } }
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p.ph !== 'probe');
  MP.list = list; MP.synced = true;
  if(!MP.meta) return;
  const all = list.filter(p => p.id !== MP.id).concat([Object.assign({}, MP.meta, { id:MP.id })]).sort(mpSort);
  const me2 = all.findIndex(p => p.id === MP.id);
  if(me2 >= MP_MAX){ mpLeave(); showMenu(); say(L('الغرفة مليانة 🙈', 'The room is full 🙈', 'Oda dolu 🙈')); return; }
  const before = MP.players.map(p => p.id);
  MP.players = all.slice(0, MP_MAX);
  MP.isHost = MP.hostId === MP.id;
  // the owner missing from the list: wait a few seconds (a slow phone can miss a heartbeat) before leaving
  if(!MP.isHost && MP.hostId && !MP.players.some(p => p.id === MP.hostId)){ if(!MP.hostGone) MP.hostGone = performance.now(); }
  else MP.hostGone = 0;
  const joined = MP.players.filter(p => p.id !== MP.id && !before.includes(p.id));
  if(joined.length && before.length) SFX.go();
  // a friend who left during a round: a bot takes over their slot
  if(MP.isHost && R.online && R.ph !== 'idle'){
    for(const a of ACT.slice()) if(a.kind === 'net' && !MP.players.some(p => p.id === a.id)){
      a.kind = 'bot'; a.bot = { mode:isSeekSide(a) ? 'patrol' : 'idle', path:null, pi:0, goal:null, stuck:0, best:1e9, wait:0, look:0, seenT:0, visited:new Set(), react:0, think:0 };
      if(a.role === 'hider' && a.st === 'free') botPlanHide(a);
    }
  }
  for(const p of MP.players){ const a = actor(p.id); if(a && a.kind === 'net' && okHero(p.hero) !== a.hero){ a.hero = okHero(p.hero); scene.remove(a.h.grp); a.h = HEROES[a.hero](); K.shadowHero(a.h); scene.add(a.h.grp); hudKey = ''; } }
  if(MP.screen === 'lobby') mpLobbyDraw();
}
/* my position for everyone (and whether I'm inside something or disguised) */
function mpPos(now){
  if(!mpActive() || !me || R.ph === 'idle') return;
  if(!now && MP.sendT > 0) return;
  MP.sendT = .1;
  mpSend('pos', { x:Math.round(me.x * 100) / 100, y:Math.round(me.y * 100) / 100, z:Math.round(me.z * 100) / 100, f:Math.round(me.f * 100) / 100, m:Math.round(me.m * 100) / 100, in:me.st === 'in' ? me.cont : -1, d:me.disg > 0 ? 1 : 0, dk:me.disgKind, r:R.n });
}
/* host snapshot: timer, roles, states and the bots' positions */
function mpSnap(){
  mpSend('st', { ph:R.ph, t:Math.round(R.t * 10) / 10, r:R.n, a:ACT.map(a => [a.id, a.role === 'seeker' ? 1 : 0, a.st, a.cont, a.disg > 0 ? 1 : 0, Math.round(a.x * 100) / 100, Math.round(a.y * 100) / 100, Math.round(a.z * 100) / 100, Math.round(a.f * 100) / 100, Math.round(a.m * 100) / 100, a.finds, a.disgKind]) });
}
function mpMsg(ev, p){
  if(ev === 'pos'){
    const a = actor(p.id); if(!a || a.kind !== 'net' || (p.r != null && p.r !== R.n)) return;
    a.tx = clamp(+p.x || 0, -40, 40); a.ty = clamp(+p.y || 0, -5, 40); a.tz = clamp(+p.z || 0, -40, 40); a.tf = +p.f || 0; a.tm = clamp(+p.m || 0, 0, 1);
    if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; }
    if(a.st !== 'found'){
      const ci = p.in | 0;
      if(ci >= 0 && W.conts[ci] && a.st !== 'in' && !occupant(ci)){ a.st = 'in'; a.cont = ci; wobble(W.conts[ci], .5); }
      else if(ci < 0 && a.st === 'in'){ a.st = 'free'; a.cont = -1; }
      if(typeof p.dk === 'string' && W.disg.includes(p.dk)) a.disgKind = p.dk;
      if(p.d && a.disg <= 0 && a.st === 'free'){ setDisg(a, true); }
      else if(!p.d && a.disg > 0) setDisg(a, false);
    }
    return;
  }
  if(p.id !== MP.hostId && ev !== 'req') return;     // only the room owner decides
  if(ev === 'lob'){
    if(MP.isHost) return;
    if(MAP_IDS.includes(p.map)) MP.map = p.map;
    if(MP.screen === 'lobby') mpLobbyDraw();
    if(p.ph === 'idle' && R.ph === 'end' && state === 'end'){ /* the owner went back to the lobby */ mpLobby(); }
  }
  else if(ev === 'st'){
    if(MP.isHost || !Array.isArray(p.a)) return;
    if(p.r !== R.n){ return; }
    if(R.ph !== 'end') R.t = clamp(+p.t || 0, 0, 999);
    if(p.ph === 'seek' && R.ph === 'count'){ R.lastBeep = -1; beginSeek(); }
    for(const r of p.a){
      const a = actor(r[0]); if(!a || !Array.isArray(r)) continue;
      a.finds = r[10] | 0;
      if(a.kind === 'bot'){
        a.tx = +r[5] || 0; a.ty = +r[6] || 0; a.tz = +r[7] || 0; a.tf = +r[8] || 0; a.tm = +r[9] || 0;
        if(!a.seen){ a.seen = true; a.x = a.tx; a.y = a.ty; a.z = a.tz; }
        if(r[2] === 'in' && a.st !== 'in' && W.conts[r[3]]){ a.st = 'in'; a.cont = r[3]; }
        else if(r[2] === 'free' && a.st === 'in'){ a.st = 'free'; a.cont = -1; }
        if(typeof r[11] === 'string' && W.disg.includes(r[11])) a.disgKind = r[11];
        if(r[4] && a.disg <= 0 && a.st === 'free') setDisg(a, true); else if(!r[4] && a.disg > 0) setDisg(a, false);
      }
      if(r[2] === 'found' && a.st !== 'found') doFound(a, null, true);
    }
  }
  else if(ev === 'ev'){
    if(MP.isHost) return;
    if(p.k === 'start'){ mpStartFrom(p); }
    else if(p.k === 'seek'){ if(R.ph === 'count'){ R.lastBeep = -1; beginSeek(); } }
    else if(p.k === 'found'){ const h = actor(p.t), by = actor(p.by); if(h && h.st !== 'found') doFound(h, by); else if(by && h && h.st === 'found' && by !== me){ /* already applied */ } }
    else if(p.k === 'empty'){ const c = W && W.conts[p.c | 0]; if(c) wobble(c, .8); }
    else if(p.k === 'spark'){ sparkle(+p.x || 0, +p.y || 0, +p.z || 0); if(me && me.role === 'hider' && me.st !== 'found') SFX.whistle(); }
    else if(p.k === 'poof'){ const a = actor(p.t); if(a) SFXat(a, 'poof'); }
    else if(p.k === 'end' && p.res && Array.isArray(p.res.list)){ if(R.ph !== 'end') showEnd(sanRes(p.res)); }
  }
  else if(ev === 'req'){
    if(!MP.isHost || R.ph !== 'seek') return;
    const a = actor(p.id); if(!a || a.kind !== 'net' || !isSeekSide(a)) return;
    if(p.k === 'tag'){ const h = actor(p.t); if(h && h.role === 'hider' && h.st === 'free' && Math.hypot(h.x - a.x, h.z - a.z, h.y - a.y) < TAP_R + 2) doFound(h, a); }
    else if(p.k === 'srch'){ const c = W.conts[p.c | 0]; if(c && Math.hypot(a.x - c.x, a.z - c.z) < c.r + 6) searchCont(a, c); }
    else if(p.k === 'wh'){ if(a.wcd <= 0) whistle(a); }
  }
}
function sanRes(r){ return { win:r.win === 'seeker' ? 'seeker' : 'hiders', list:r.list.slice(0, 4).map(e => ({ id:String(e.id), hero:okHero(e.hero), role:e.role === 'seeker' ? 'seeker' : 'hider', st:e.st === 'found' ? 'found' : 'free', finds:e.finds | 0, tf:clamp(e.tf | 0, 0, SEEK_T), kind:e.kind === 'bot' ? 'bot' : 'net' })) }; }
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){ MP.hostGone = 0; mpLeave(); showMenu(); say(L('صاحب الغرفة طلع 🚪', 'The room owner left 🚪', 'Oda sahibi çıktı 🚪'), 4000); return; }
  MP.sendT -= dt; MP.stT -= dt;
  if(R.online && R.ph !== 'idle' && R.ph !== 'end') mpPos(false);
  if(MP.isHost && R.online && (R.ph === 'count' || R.ph === 'seek') && MP.stT <= 0){ MP.stT = .15; mpSnap(); }
  if(MP.isHost && MP.screen === 'lobby' && MP.stT <= 0){ MP.stT = 1; mpSend('lob', { map:MP.map, ph:'idle' }); }
}
function mpLeave(silent){
  MP.tok++; mpClose(); MP.screen = 'off'; R.online = false;
}
function mpCard(wide){ state = 'mp'; setPlayUI(false); overlay.hidden = false; overlay.className = 'overlay dim'; card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; R.online = false; mpCard(false);
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🙈 ${L('لحتى 4 لاعبين، والبوتات بتكمّل العدد', 'Up to 4 players, bots fill the empty places', '4 oyuncuya kadar, boş yerleri botlar doldurur')}</p>
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
/* the room's waiting card: who is here, which room, and (for the owner) «ابدأ» */
function mpLobby(){
  if(!mpActive()){ mpMenu(); return; }
  R.ph = 'idle'; R.online = true; clearActors(); hideResult(); closeup = null; podium.visible = false; AU.music(false);
  loadMap(MP.map);
  MP.screen = 'lobby'; mpCard(true); mpLobbyDraw();
  if(MP.isHost) mpSend('lob', { map:MP.map, ph:'idle' });
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="slot"><div class="bot">🤖</div><small>${L('بوت', 'Bot', 'Bot')}</small></div>`;
    return `<div class="slot" style="--c:${MCOL[i]}"><img src="${charImg(okHero(p.hero))}" alt=""><span>${p.id === MP.id ? L('إنت', 'You', 'Sen') : '👫'}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  const wasMap = MP.map;
  card.innerHTML = `<h2>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="slots">${slots}</div>
    ${MP.isHost ? `<div class="picks" id="lmaps">${MAP_IDS.map(m => `<button class="pick${m === MP.map ? ' on' : ''}" data-m="${m}"><i>${MAP_E[m]}</i>${MAP_NAME[m]}</button>`).join('')}</div>
      <div class="row"><button class="big-btn" id="bStart">▶️ ${L('ابدأ', 'Start', 'Başla')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>${MAP_E[MP.map]} ${MAP_NAME[MP.map]} · ${L('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row"><button class="hero-btn" id="bMyHero" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]} 🔄</span></button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    card.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { SFX.tap(); MP.map = b.dataset.m; loadMap(MP.map); mpSend('lob', { map:MP.map, ph:'idle' }); mpLobbyDraw(); });
    $('#bStart').onclick = () => { SFX.tap(); mpStart(); };
  } else { const hb = $('#bMyHero'); if(hb) hb.onclick = () => { SFX.tap(); showSelect('mp'); }; if(wasMap) loadMap(MP.map); }
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); mpMenu(); };
}
/* the owner starts: roles (the seeker takes turns among the friends), bots for empty places */
function mpStart(){
  if(!MP.isHost) return;
  const humans = MP.players.slice(0, MP_MAX);
  MP.round = (MP.round || 0);
  const seekIdx = MP.round % humans.length; MP.round++;
  const roster = humans.map((p, i) => ({ id:p.id, hero:okHero(p.hero), role:i === seekIdx ? 'seeker' : 'hider' }));
  const bh = botHeroes(MP_MAX - roster.length, roster.map(r => r.hero));
  bh.forEach((h, i) => roster.push({ id:'b' + i, hero:h, role:'hider', bot:1 }));
  const map = MP.map, n = R.n + 1;
  mpSend('ev', { k:'start', map, n, roster });
  mpStartFrom({ map, n, roster, local:true });
}
function mpStartFrom(p){
  if(!MAP_IDS.includes(p.map) || !Array.isArray(p.roster)) return;
  R.online = true; claimed.clear(); MP.screen = 'in'; MP.map = p.map;
  const roster = p.roster.slice(0, MP_MAX).map(r => ({ id:String(r.id), hero:okHero(r.hero), role:r.role === 'seeker' ? 'seeker' : 'hider', kind:r.id === MP.id ? 'me' : r.bot ? 'bot' : 'net' }));
  R.n = (p.n | 0) - 1;
  startRound(p.map, roster);
}
async function mpCreate(){
  mpConnecting();
  try{
    for(let i = 0; i < 4; i++){
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const r = await mpOpen(code, 'create');
      if(r === 'ok'){ MP.map = SAVE.map; MP.round = 0; mpLobby(); mpSendInvite(); return; }
    }
    throw new Error('busy');
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(mpCreate); }
}
async function mpJoin(code){
  mpConnecting();
  try{
    const r = await mpOpen(code, 'join');
    if(MP.screen !== 'connecting') return;
    if(r === 'ok'){ mpLobby(); mpSend('lob', { ask:1 }); }
    else if(r === 'full') mpKeypad(L('الغرفة مليانة', 'The room is full', 'Oda dolu') + ' 🙈');
    else mpKeypad(L('ما لقينا هالغرفة، تأكّد من الرقم', "We couldn't find that room — check the number", 'Bu oda bulunamadı, numarayı kontrol et'));
  }catch(e){ if(MP.screen === 'connecting' && String(e && e.message) !== 'cancelled') mpError(() => mpJoin(code)); }
}
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'hide' yet: guarded. */
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
const actInfo = a => ({ id:a.id, kind:a.kind, hero:a.hero, role:a.role, st:a.st, cont:a.cont, disg:a.disg > 0, x:a.x, y:a.y, z:a.z, finds:a.finds, mode:a.bot ? a.bot.mode : null, dcd:a.dcd, wcd:a.wcd });
window.__hide = {
  get state(){ return state; }, get mpScreen(){ return MP.screen; }, menu:() => showMenu(),
  start:(map = 'kitchen', role = 'hide') => { SAVE.map = map; SAVE.role = role; startSolo(map, role); },
  get round(){ return { ph:R.ph, t:R.t, map:R.map, n:R.n, online:R.online, res:R.res }; },
  get me(){ return me ? actInfo(me) : null; }, get actors(){ return ACT.map(actInfo); },
  get map(){ return W ? { id:W.id, conts:W.conts.map(c => ({ i:c.i, kind:c.kind, x:c.x, y:c.y, z:c.z, ax:c.ax, az:c.az, occ:occupant(c.i) ? occupant(c.i).id : null })), spots:W.spots.length, nodes:W.nodes.length, edges:W.nodes.reduce((s, n) => s + n.e.length, 0) } : null; },
  tp(x, z, y){ if(!me) return; me.x = x; me.z = z; me.y = y != null ? y : W.P.support(x, z, 30); me.vx = me.vz = me.vy = 0; snapCam = true; },
  setT(t){ R.t = t; }, skipCount(){ if(R.ph === 'count') R.t = .01; },
  act:() => doAction(), tool:() => doTool(), jump:() => { wantJump = true; }, ctx:() => { const c = ctx(); return c ? c.k : null; },
  keys, input(x, z){ joy.x = x; joy.y = z; },
  found:id => { const a = actor(id); if(a) doFound(a, ACT.find(isSeekSide)); }, endNow:() => endRound(),
  tagNearest(){ const hs = hiders().filter(h => h.st === 'free'); if(!hs.length || !me) return false; hs.sort((p, q) => Math.hypot(p.x - me.x, p.z - me.z) - Math.hypot(q.x - me.x, q.z - me.z)); requestTag(hs[0]); return true; },
  searchCont(i){ requestSearch(W.conts[i]); },
  get spark(){ return sparkAt ? { x:sparkAt.x, y:sparkAt.y, z:sparkAt.z, t:sparkAt.t } : null; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, screen:MP.screen, players:MP.players.map(p => ({ id:p.id, hero:p.hero })), id:MP.id }; },
  mpStart:() => mpStart(), mpMap(m){ MP.map = m; mpLobbyDraw(); },
  _dbg:() => ({ W, MAPS, PHYS }), fast(k){ SIMK = clamp(k | 0, 1, 8); },
  nav:() => W.nodes.map((n, i) => ({ i, x:+n.x.toFixed(1), z:+n.z.toFixed(1), y:+n.y.toFixed(2), k:n.kind, e:n.e.map(e => e[0]) })),
  get fps(){ return fps; }, get dpr(){ return dpr; }, get rot(){ return ROT; }, get shadows(){ return renderer.shadowMap.enabled; },
  shot(v){ closeup = v ? { px:v[0], py:v[1], pz:v[2], lx:v[3], ly:v[4], lz:v[5] } : null; if(v){ camPos.set(v[0], v[1], v[2]); camLook.set(v[3], v[4], v[5]); } },
  cam, hud(on){ for(const el of [hudEl, joyEl, jumpBtn, actBtn, toolBtn, guideEl, inChip]) el.style.visibility = on ? '' : 'hidden'; },
  pathCheck(){ // how many hiding places each node can reach (bots' map health)
    const out = {}; const from = MAPS.nearest(W, W.spawn.seeker[0], 0, W.spawn.seeker[1]);
    out.conts = W.conts.map(c => !!MAPS.path(W, from, c.node)); out.spots = W.spots.map(s => !!MAPS.path(W, from, s.node));
    out.back = W.conts.map(c => !!MAPS.path(W, c.node, from)); return out;
  }
};

/* ---------- boot ---------- */
loadMap(SAVE.map);
resize();
showMenu();
requestAnimationFrame(frame);
/* build the other rooms when the phone is idle, so starting a round never stalls */
(function prebuild(){
  const todo = MAP_IDS.filter(m => !builtMaps[m]); if(!todo.length) return;
  const go = () => { if(state === 'menu' || state === 'select' || (state === 'mp' && R.ph === 'idle')){ const m = todo[0]; builtMaps[m] = builtMaps[m] || MAPS.build(m); } setTimeout(prebuild, 600); };
  if(window.requestIdleCallback) requestIdleCallback(go, { timeout:3000 }); else setTimeout(go, 1500);
})();
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite'].forEach(k => q.delete(k));
  try{ history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(); }
})();
