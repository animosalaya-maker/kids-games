/* Bobo Kart («سباق بوبو 🏎️») — an original 3D kart racer for kids.
   7 karts (you + the other characters; you can also race as «شخصيتي»), 4 tracks (sunset beach, jungle temple, snowy mountain, candy land), 3 laps.
   Driving: auto-accelerate, ◀ ▶ to steer, 🛑 to brake, 💨 = hop + drift (blue then orange sparks → mini-turbo), 🎁 = use item.
   Items (no violence — a hit is a funny spin): 🍌 peel, 🫧 bubble shield, 🎈 homing balloon (target bounces), 🚀 turbo rocket,
   🟢 jelly blob, 🪄 magic wand (karts ahead shrink for a moment). ⭐ stars on the road: each one makes your kart a little faster.
   Modes: quick race, cup (4 tracks with points), time trial (ghost + best time on this phone).
   Online («👫 العب مع أصحابك», ../rt.js): up to 4 friends + computer karts. Each phone drives its own kart and sends it ~15×/s;
   the room owner (host) drives the computer karts, owns the item boxes, the race positions and the finish order. */
import * as THREE from '../adventure3d/three.module.min.js';
import { makeKit } from '../worlds/kit.js';
import { TRACKS } from './trackdefs.js';
import { buildTrack, setThree } from './tracks.js';
import { makeModels } from './models.js';
import { makeAudio } from './audio.js';

const $ = s => document.querySelector(s);
{ const md = document.querySelector('meta[name="description"]'), dl = window.I18N && md && md.getAttribute('data-' + I18N.lang); if(dl) md.setAttribute('content', dl); }
const N = n => window.I18N ? I18N.num(n) : String(n);
const LANG = window.I18N ? I18N.lang : 'ar';
const rawGet = k => { try{ return localStorage.getItem(k); }catch(e){ return null; } };
const rawSet = (k, v) => { try{ localStorage.setItem(k, v); }catch(e){} };
const K = makeKit(THREE);
setThree(THREE, K);
const MD = makeModels(THREE, K);
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
const TNAME = t => L(t.name[0], t.name[1], t.name[2]);
const TSUB = t => L(t.sub[0], t.sub[1], t.sub[2]);
const TCOL = { beach:'linear-gradient(160deg,#ff9a6a,#f06a92 55%,#7a4fc0)', jungle:'linear-gradient(160deg,#5ec46a,#2f8a4a)', snow:'linear-gradient(160deg,#8fc8ff,#4f7fd8)', candy:'linear-gradient(160deg,#ff9fd0,#b07cff)' };
const okTrack = id => TRACKS.some(t => t.id === id) ? id : 'beach';

/* ======================================================================
   Numbers
   ====================================================================== */
const LAPS = 3, NK = 7;   // 7 karts: the player + the other 6 characters (no twins)
const MAXS = 23, BOOSTS = 33, ACC = 13, TURN = 2.05, GRAV = 22, KR = 1.15;
const MINI1 = .8, MINI2 = 1.8;
const COIN_CAP = 300;
const PLACE_COINS = [30, 22, 16, 12, 10, 8, 6, 5];
const CUP_PTS = [10, 8, 6, 5, 4, 3, 2, 1];
const ITEMS = {
  banana:{ e:'🍌', n:['قشرة موز', 'Banana peel', 'Muz kabuğu'] },
  shield:{ e:'🫧', n:['فقاعة حماية', 'Bubble shield', 'Baloncuk kalkan'] },
  balloon:{ e:'🎈', n:['بالون لاحق', 'Homing balloon', 'Takip balonu'] },
  rocket:{ e:'🚀', n:['صاروخ تيربو', 'Turbo rocket', 'Turbo roket'] },
  jelly:{ e:'🟢', n:['جيلي لزّيق', 'Jelly blob', 'Jöle'] },
  wand:{ e:'🪄', n:['عصا تصغير', 'Shrink wand', 'Küçültme asası'] }
};
const ITEM_IDS = Object.keys(ITEMS);
const itemName = k => ITEMS[k] ? L(...ITEMS[k].n) : '';

/* ---------- save (this device) ---------- */
const SAVE_KEY = 'kart_save' + (MP_LOCAL && /^[a-z]$/.test(QS.get('slot') || '') ? '_' + QS.get('slot') : ''), SAVE_V = 1;
function freshSave(){ return { v:SAVE_V, hero:null, track:'beach', best:{}, cups:0, races:0, wins:0, tut:0, cd:{ d:'', n:0 } }; }
function loadSave(){
  try{
    const v = JSON.parse(rawGet(SAVE_KEY));
    if(v && typeof v === 'object' && v.v === SAVE_V){
      const s = Object.assign(freshSave(), v);
      const b = {}; if(s.best && typeof s.best === 'object') for(const t of TRACKS){ const x = +s.best[t.id]; if(isFinite(x) && x > 10 && x < 3600) b[t.id] = x; } s.best = b;
      s.track = okTrack(s.track); s.cups = clamp(s.cups | 0, 0, 9999); s.races = clamp(s.races | 0, 0, 99999); s.wins = clamp(s.wins | 0, 0, 99999); s.tut = clamp(s.tut | 0, 0, 9);
      if(!s.cd || typeof s.cd !== 'object') s.cd = { d:'', n:0 }; s.cd.n = clamp(s.cd.n | 0, 0, COIN_CAP);
      return s;
    }
  }catch(e){}
  return null;
}
let SAVE = loadSave() || freshSave();
function persist(){ rawSet(SAVE_KEY, JSON.stringify(SAVE)); }
let heroId = HERO_IDS.includes(SAVE.hero) ? SAVE.hero : HERO_IDS.includes(rawGet('worlds_hero')) ? rawGet('worlds_hero') : 'sara';
/* ghost of the best time trial run: [time, frames…] with a frame every 0.1 s */
function loadGhost(id){ try{ const g = JSON.parse(rawGet('kart_ghost_' + id)); if(g && Array.isArray(g.f) && typeof g.t === 'number' && g.f.length < 20000 && g.f.every(v => typeof v === 'number' && isFinite(v))) return g; }catch(e){} return null; }
function saveGhost(id, g){ rawSet('kart_ghost_' + id, JSON.stringify(g)); }

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
layout();

/* ---------- renderer ---------- */
const canvas = $('#cv');
let renderer;
try{ renderer = new THREE.WebGLRenderer({ canvas, antialias:true, powerPreference:'high-performance' }); }
catch(e){ $('#nogl').hidden = false; $('#overlay').hidden = true; throw e; }
let dpr = (window.BoboGfx ? BoboGfx.dpr(1.5, renderer) : Math.min(window.devicePixelRatio || 1, 1.5)), quality = dpr > 1 ? 2 : 1;
renderer.setPixelRatio(dpr);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(68, 1, .3, 1500);
function resize(){
  layout();
  renderer.setSize(SW, SH, false);
  camera.aspect = SW / SH; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => setTimeout(resize, 120));
const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); scene.add(sun); scene.add(sun.target);
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();

/* ---------- particles: sparks, dust, confetti, stars ---------- */
const PMAX = 420, parts = [], pMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.11, 0), new THREE.MeshBasicMaterial(), PMAX);
pMesh.frustumCulled = false; scene.add(pMesh);
for(let i = 0; i < PMAX; i++){ parts.push({ life:0, x:0, y:0, z:0, vx:0, vy:0, vz:0, s:1, g:12 }); pMesh.setColorAt(i, _c.set(0xffffff)); _m.makeScale(0, 0, 0); pMesh.setMatrixAt(i, _m); }
let pNext = 0;
const CONFETTI = [0xffc23d, 0xff8fb1, 0x5ed6a0, 0x6cc4ff, 0xffffff, 0xc77dff], GOLD = [0xffcf3a, 0xffe680, 0xffffff], DUST = [0xf3d29a, 0xe9c084, 0xfbe2b4],
  BLUE = [0x5ab8ff, 0xa8e0ff, 0xffffff], ORANGE = [0xff8a1a, 0xffd23f, 0xfff3a0], SPLASH = [0xbff3ff, 0xffffff, 0x7fe0f5], PINK = [0xff8fb1, 0xffc0d8, 0xffffff], GREEN = [0x6ee04a, 0xb8f28a];
function burst(x, y, z, n, colors, speed = 4, size = 1, grav = 12, up = 2, life = .6){
  for(let k = 0; k < n; k++){
    const p = parts[pNext], i = pNext; pNext = (pNext + 1) % PMAX;
    const a = Math.random() * 6.28, u = Math.random() * 2 - 1, r = Math.sqrt(1 - u * u);
    p.life = life + Math.random() * life; p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * r * speed; p.vz = Math.sin(a) * r * speed; p.vy = Math.abs(u) * speed + up; p.s = size * (.7 + Math.random() * .8); p.g = grav;
    pMesh.setColorAt(i, _c.set(pick(colors)));
  }
  pMesh.instanceColor.needsUpdate = true;
}
function updateParts(dt){
  for(let i = 0; i < PMAX; i++){
    const p = parts[i]; if(p.life <= 0){ continue; }
    p.life -= dt; p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const s = p.life > 0 ? p.s * Math.min(1, p.life * 3) : 0;
    _m.compose(_v.set(p.x, p.y, p.z), _q.identity(), _s.set(s, s, s)); pMesh.setMatrixAt(i, _m);
  }
  pMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- blob shadows (one instanced mesh) ---------- */
const blobs = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 3.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map:K.blobTex, transparent:true, depthWrite:false }), NK + 1);
blobs.frustumCulled = false; blobs.renderOrder = 2; scene.add(blobs);

/* ======================================================================
   Track
   ====================================================================== */
let T = null, trackId = okTrack(QS.get('track') || SAVE.track);
const trackCache = {};
function useTrack(id){
  id = okTrack(id);
  if(T && T.def.id === id) return T;
  if(T) scene.remove(T.root);
  if(!trackCache[id]){ const def = TRACKS.find(t => t.id === id); trackCache[id] = buildTrack(THREE, K, def); }
  // keep at most two built tracks in memory
  for(const k of Object.keys(trackCache)) if(k !== id && (!T || k !== T.def.id)){ disposeTrack(trackCache[k]); delete trackCache[k]; }
  T = trackCache[id]; trackId = id;
  scene.add(T.root);
  const th = T.TH;
  scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
  scene.background = new THREE.Color(th.fog);
  hemi.color.set(th.hemi[0]); hemi.groundColor.set(th.hemi[1]); hemi.intensity = th.hemi[2];
  sun.color.set(th.sunLight[0]); sun.intensity = th.sunLight[1]; sun.position.set(...th.sunPos); sun.target.position.set(0, 0, 0);
  buildPickups(); drawMiniBase();
  return T;
}
function disposeTrack(t){ t.root.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material){ (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if(m.map && m.map !== K.glowTex) m.map.dispose(); m.dispose(); }); } }); }

/* ---------- item boxes and stars ---------- */
let BOXES = [], STARS = [], boxMesh = null, starMesh = null;
function buildPickups(){
  if(boxMesh){ scene.remove(boxMesh); scene.remove(starMesh); }
  BOXES = []; STARS = [];
  for(const u of T.def.boxes) for(const sd of [-.62, -.21, .21, .62]){ const p = T.at(u, sd); BOXES.push({ x:p.x, y:p.y + 1.25, z:p.z, until:0 }); }
  for(const [u0, u1, sd] of T.def.stars){ const n = Math.max(3, Math.round((u1 - u0) * T.LEN / 4)); for(let k = 0; k <= n; k++){ const p = T.at(u0 + (u1 - u0) * k / n, sd); if(!p.gap) STARS.push({ x:p.x, y:p.y + .9, z:p.z, until:0 }); } }
  boxMesh = MD.boxes(BOXES.length); starMesh = MD.stars(STARS.length);
  scene.add(boxMesh); scene.add(starMesh);
}
function drawPickups(t){
  const tt = R.t;
  BOXES.forEach((b, i) => {
    const on = tt >= b.until && R.mode !== 'tt', grow = on ? clamp((tt - b.until) * 3, 0, 1) : 0, s = on ? (b.until > 0 ? grow : 1) : 0;
    _m.compose(_v.set(b.x, b.y + Math.sin(t * 2 + i) * .18, b.z), _q.setFromEuler(_e.set(.4, t * 1.4 + i, .3)), _s.set(s, s, s)); boxMesh.setMatrixAt(i, _m);
  });
  boxMesh.instanceMatrix.needsUpdate = true;
  STARS.forEach((st, i) => {
    const on = tt >= st.until, s = on ? .55 : 0;
    _m.compose(_v.set(st.x, st.y + Math.sin(t * 3 + i * .7) * .12, st.z), _q.setFromEuler(_e.set(0, t * 2.5 + i * .3, 0)), _s.set(s, s, s)); starMesh.setMatrixAt(i, _m);
  });
  starMesh.instanceMatrix.needsUpdate = true;
}

/* ======================================================================
   Karts
   ====================================================================== */
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
const kartColor = hero => new THREE.Color(HERO_COLOR[hero] || '#9c7be3').getHex();
function makeHero(id, av){ let h; try{ h = id === 'me' ? HEROES.me(av || undefined) : HEROES[id](); }catch(e){ h = HEROES.sara(); } return h; }
/* sit a hero in the kart (legs forward, hands on the wheel) */
function seatPose(h, t, steer, cheer){
  h.body.position.y = 0; h.body.rotation.set(-.08, 0, 0); h.body.scale.set(1, 1, 1);
  h.head.rotation.set(Math.sin(t * 2) * .03, -steer * .3, Math.sin(t * 1.3) * .03 + steer * .08);
  h.legs.forEach(l => { l.rotation.x = -1.45; });
  if(cheer){ h.arms.forEach((a, i) => { a.rotation.x = -2.6 + Math.sin(t * 9 + i * 3) * .3; a.rotation.z = -a.userData.side * .3; }); }
  else h.arms.forEach(a => { a.rotation.x = -1.15; a.rotation.z = -a.userData.side * (.12 - steer * .14 * a.userData.side); });
  h.sway.forEach(p => { p.rotation.x = -.4; });
  const bt = t + h.blink, blink = (bt % 3.7) < .13, fm = h.face.material, want = blink ? h.face.userData.shut : h.face.userData.open; if(fm.map !== want){ fm.map = want; fm.needsUpdate = true; }
}
let karts = [], me = null, ghost = null;
function newKart(o){
  const hero = okHero(o.hero), color = kartColor(hero);
  const M = MD.kart(color, { ghost:o.kind === 'ghost' });
  let H = null;
  if(o.kind !== 'ghost'){ H = makeHero(hero, o.av); H.grp.scale.setScalar(.92); H.grp.position.set(0, -.2, 0); M.seat.add(H.grp); }
  scene.add(M.grp);
  const k = Object.assign({ id:'', kind:'cpu', hero, av:o.av || null, color, M, H,
    x:0, y:0, z:0, h:0, s:0, vy:0, vyG:0, air:false, steer:0, vis:0, rolz:0, pit:0,
    drift:0, dT:0, lvl:0, hopping:false, driftHeld:false, boost:0, spin:0, spinA:0, bounce:0, shrink:0, shield:0, jelly:0, padCd:0, rescue:0, land:0,
    item:null, itemN:0, rl:0, rollItem:null, useAt:0, stars:0,
    lap:-1, u:0, prog:0, maxLap:-1, qi:-1, si:-1, on:'main', fin:false, finT:0, place:1, skill:1, lane:0, laneT:Math.random() * 10, stuck:0,
    tx:0, ty:0, tz:0, th:0, ts:0, flags:0, seenAt:0, gone:false, lbl:null, shieldM:null, nm:'' }, o, { hero, color });
  return k;
}
function removeKart(k){ scene.remove(k.M.grp); if(k.lbl) k.lbl.remove(); }
function clearKarts(){ for(const k of karts) removeKart(k); karts = []; me = null; if(ghost){ removeKart(ghost); ghost = null; } }
/* grid: two by two behind the line */
function gridPos(i){ const row = Math.floor(i / 2), side = i % 2 ? .38 : -.38; const p = T.at(-(14 + row * 7.5) / T.LEN, side + (row % 2 ? .06 : -.06)); return p; }
function placeOnGrid(k, i){
  const p = gridPos(i); k.x = p.x; k.z = p.z; k.y = p.y; k.h = p.h; k.s = 0; k.qi = p.i;
  const q = T.query(k.x, k.z, k.qi); k.u = q.u; k.lap = k.u > .5 ? -1 : 0; k.prog = k.lap + k.u; k.maxLap = k.lap; k.qi = q.i;
}

/* ======================================================================
   Input
   ====================================================================== */
const keys = {};
const ctl = { l:false, r:false, brake:false, drift:false, item:false };
const bL = $('#bL'), bR = $('#bR'), bDrift = $('#bDrift'), bItem = $('#bItem'), bBrake = $('#bBrake');
function holdBtn(btn, key, onDown){
  const ids = new Set();
  btn.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); AU.ac(); ids.add(e.pointerId); try{ btn.setPointerCapture(e.pointerId); }catch(x){} ctl[key] = true; btn.classList.add('on'); if(onDown) onDown(); });
  const up = e => { ids.delete(e.pointerId); if(!ids.size){ ctl[key] = false; btn.classList.remove('on'); } };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => btn.addEventListener(t, up));
}
holdBtn(bL, 'l'); holdBtn(bR, 'r'); holdBtn(bBrake, 'brake'); holdBtn(bDrift, 'drift'); holdBtn(bItem, 'item', () => { wantItem = true; });
let wantItem = false;
const KEYMAP = { ArrowLeft:'l', KeyA:'l', ArrowRight:'r', KeyD:'r', ArrowDown:'brake', KeyS:'brake', Space:'drift', ShiftLeft:'drift', ShiftRight:'drift', KeyJ:'drift' };
addEventListener('keydown', e => {
  if(KEYMAP[e.code]){ keys[KEYMAP[e.code]] = true; if(state === 'race' || state === 'count') e.preventDefault(); }
  if(!e.repeat && (e.code === 'KeyX' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'KeyK') && state === 'race'){ wantItem = true; e.preventDefault(); }
  if((e.code === 'Escape' || e.code === 'KeyP') && (state === 'race' || state === 'count')) showPause();
});
addEventListener('keyup', e => { if(KEYMAP[e.code]) keys[KEYMAP[e.code]] = false; });
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });
function clearInput(){ for(const k in keys) keys[k] = false; for(const k in ctl) ctl[k] = false; wantItem = false; [bL, bR, bDrift, bItem, bBrake].forEach(b => b.classList.remove('on')); }
let testCtl = null, autopilot = false, timeScale = 1;
function myControls(){
  if(testCtl) return testCtl;
  const l = ctl.l || keys.l, r = ctl.r || keys.r;
  return { steer:(r ? 1 : 0) - (l ? 1 : 0), brake:!!(ctl.brake || keys.brake), drift:!!(ctl.drift || keys.drift) };
}

/* ======================================================================
   Race state
   ====================================================================== */
const R = { mode:'quick', t:0, count:0, phase:'off', n:0, order:[], over:false, endT:0, hazards:[], balloons:[], hid:0, cup:null, ghostRec:null, ghostT:0, firstFin:0, lastBeep:0, frozen:false };
let state = 'title', menuT = 0;

/* ---------- physics ---------- */
function stepKart(k, dt, c){
  k.boost = Math.max(0, k.boost - dt); k.spin = Math.max(0, k.spin - dt); k.bounce = Math.max(0, k.bounce - dt); k.shrink = Math.max(0, k.shrink - dt);
  k.shield = Math.max(0, k.shield - dt); k.jelly = Math.max(0, k.jelly - dt); k.padCd = Math.max(0, k.padCd - dt); k.land = Math.max(0, k.land - dt);
  const stunned = k.spin > 0 || k.bounce > 0 || R.frozen;
  let steer = stunned ? 0 : clamp(c.steer, -1, 1);
  k.steer = lerp(k.steer, steer, 1 - Math.exp(-12 * dt));
  // speed
  let top = MAXS * (1 + k.stars * .012) * (k.shrink > 0 ? .74 : 1) * (k.jelly > 0 ? .55 : 1) * (k.skill || 1);
  const offroad = k.on === 'main' && Math.abs(k.qd || 0) > T.hw + .4;
  if(offroad && k.boost <= 0) top *= .68;
  if(k.boost > 0) top = Math.max(top, BOOSTS * (k.shrink > 0 ? .85 : 1));
  let want = c.brake ? -7 : top;
  if(stunned) want = 0;
  if(!k.air){
    if(k.s < want) k.s = Math.min(want, k.s + (k.boost > 0 ? 45 : ACC * (k.s < 8 ? 1.5 : 1)) * dt);
    else k.s = Math.max(want, k.s - (c.brake && k.s > 0 ? 28 : stunned ? 18 : 9) * dt);
  }
  // hop + drift
  // holding 💨: one little hop (as soon as the kart is fast enough), then a drift once you steer
  if(!c.drift) k.hopUsed = false;
  if(!stunned && c.drift && !k.hopUsed && !k.drift && !k.air && k.s > 7){ k.air = true; k.vy = 4.6; k.hopping = true; k.hopUsed = true; if(k === me) SFX.hop(); }
  if(!stunned && c.drift && k.hopUsed && !k.drift && !k.air && Math.abs(steer) > .4 && k.s > 7){ k.drift = Math.sign(steer); k.dT = 0; k.lvl = 0; }
  k.driftHeld = c.drift;
  if(k.drift){
    if(!c.drift || k.s < 6 || stunned){
      if(k.lvl > 0 && !stunned){ k.boost = Math.max(k.boost, k.lvl > 1 ? 1.35 : .75); if(k === me){ SFX.mini(k.lvl); cam.shake = Math.max(cam.shake, k.lvl > 1 ? .28 : .16); } }
      k.drift = 0; k.lvl = 0; k.dT = 0;
    } else {
      k.dT += dt * (1 + .6 * Math.max(0, steer * k.drift));
      const lv = k.dT > MINI2 ? 2 : k.dT > MINI1 ? 1 : 0;
      if(lv > k.lvl && k === me) SFX.spark(lv);
      k.lvl = lv;
    }
  }
  // turning
  const sp = Math.abs(k.s), sf = clamp(sp / 9, 0, 1) * (1 - .22 * clamp((sp - 22) / 10, 0, 1));
  if(k.drift){ k.h -= k.drift * TURN * (.62 + .48 * steer * k.drift) * sf * dt; }
  else k.h -= k.steer * TURN * sf * Math.sign(k.s || 1) * (k.air ? .5 : 1) * dt;
  if(k.spin > 0) k.spinA += dt * 14; else k.spinA = 0;
  // move (in a drift the kart slides a little outwards)
  const mv = k.h + (k.drift ? k.drift * .22 : 0);
  let nx = k.x + Math.sin(mv) * k.s * dt, nz = k.z + Math.cos(mv) * k.s * dt;
  let q = T.query(nx, nz, k.qi, k.si);
  if(q.on === 'out'){
    nx += q.px * (q.over + .02); nz += q.pz * (q.over + .02);
    const into = -(Math.sin(mv) * k.s * q.px + Math.cos(mv) * k.s * q.pz);
    if(into > 5){ k.s *= .6; if(k === me){ SFX.bump(); cam.shake = Math.max(cam.shake, .25); } burst(nx - q.px, k.y + .6, nz - q.pz, 6, [0xffffff, 0xdddddd], 3, .8, 10, 1); }
    const tH = Math.atan2(q.tx, q.tz), fwd = Math.abs(angDiff(tH, k.h)) < Math.PI / 2 ? tH : tH + Math.PI;
    k.h += angDiff(fwd, k.h) * Math.min(1, 6 * dt);
    q = T.query(nx, nz, q.i, q.si);
  }
  k.x = nx; k.z = nz; k.qi = q.i; k.si = q.si; k.qd = q.d; k.on = q.on === 'out' ? k.on : q.on;
  // vertical: follow the road, fly off ramps, fall into the water
  const g = q.gap ? T.WATER_Y - 3 : q.y + q.ramp;
  if(!k.air){
    const climb = (g - k.y) / Math.max(dt, .001);
    if(k.vyG > .8 && g < k.y - .15){ k.air = true; k.vy = Math.max(k.vyG, 7.5); k.s = Math.max(k.s, 22); k.ramped = true; if(k === me) SFX.whoosh(); }
    else if(g < k.y - .6){ k.air = true; k.vy = 0; }
    else { k.y = g; k.vyG = lerp(k.vyG, clamp(climb, -20, 14), .5); }
  }
  if(k.air){
    k.vy -= GRAV * dt; k.y += k.vy * dt;
    if(k.y <= g && k.vy <= 0){
      if(k.hopping && c.drift && Math.abs(steer) > .25 && k.s > 7 && !stunned){ k.drift = Math.sign(steer); k.dT = 0; k.lvl = 0; }
      if(k.vy < -6 && k === me){ SFX.land(); cam.shake = Math.max(cam.shake, .15); }
      if(k.vy < -6) burst(k.x, g + .2, k.z, 6, T.def.theme === 'snow' ? [0xffffff] : DUST, 2.5, 1, 8, 1);
      k.y = g; k.air = false; k.vy = 0; k.vyG = 0; k.hopping = false; k.ramped = false; k.land = .2;
    }
  }
  if(k.y < T.WATER_Y - .3 && q.gap){
    // splash! a friendly bubble puts the kart back on the road after the water
    burst(k.x, T.WATER_Y + .2, k.z, 18, SPLASH, 5, 1.2, 12, 3);
    if(k === me){ SFX.splash(); pop('💦 ' + L('بلّلت!', 'Splash!', 'Şapır şupur!')); }
    let i = q.i; for(let n = 0; n < 40 && T.S[i % T.N].gap; n++) i++; i = (i + 3) % T.N;
    const s = T.S[i]; k.x = s.x; k.z = s.z; k.y = s.y + 3.5; k.h = Math.atan2(s.tx, s.tz); k.s = 6; k.air = true; k.vy = 0; k.qi = i; k.drift = 0;
    q = T.query(k.x, k.z, i);
  }
  // boost pads
  for(const p of T.PADS){ if(k.padCd <= 0 && Math.abs(p.x - k.x) < 3 && Math.abs(p.z - k.z) < 3 && Math.hypot(p.x - k.x, p.z - k.z) < 2.8 && Math.abs(k.y - p.y) < 1.5){ k.boost = Math.max(k.boost, 1.15); k.padCd = .5; if(k === me){ SFX.pad(); cam.shake = Math.max(cam.shake, .2); } } }
  // lap progress
  const du = q.u - k.u;
  if(du < -.5) k.lap++; else if(du > .5) k.lap--;
  k.u = q.u; k.prog = k.lap + k.u;
  if(k.lap > k.maxLap){ k.maxLap = k.lap; if(k.lap >= LAPS && !k.fin){ if(R.phase === 'go' && !R.over && R.mode !== 'menu') kartFinished(k); } else if(k === me && k.lap > 0 && !k.fin){ if(k.lap === LAPS - 1){ SFX.final(); banner(L('آخر لفّة!', 'FINAL LAP!', 'SON TUR!'), 'mid long'); AU.music(true, true); } else { SFX.lap(); banner(L('لفّة ', 'LAP ', 'TUR ') + N(k.lap + 1) + '/' + N(LAPS), 'mid long'); } } }
  // visuals
  k.vis = lerp(k.vis, k.drift ? -k.drift * .42 : 0, 1 - Math.exp(-10 * dt));
  k.rolz = lerp(k.rolz, k.drift ? k.drift * .1 : -k.steer * .06 * sf, 1 - Math.exp(-8 * dt));
  k.M.spin += k.s * dt / .36;
}
/* kart–kart bumps (my kart only reacts to remote karts) */
function bumps(){
  for(let i = 0; i < karts.length; i++){
    const a = karts[i]; if(a.gone) continue;
    for(let j = i + 1; j < karts.length; j++){
      const b = karts[j]; if(b.gone) continue;
      const am = simulated(a), bm = simulated(b); if(!am && !bm) continue;
      const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = KR * ((a.shrink > 0 ? .65 : 1) + (b.shrink > 0 ? .65 : 1));
      if(d < min && d > 1e-3 && Math.abs(a.y - b.y) < 1.6){
        const push = (min - d) / d * .5, nx = dx * push, nz = dz * push;
        const ka = a.shrink > 0 && !(b.shrink > 0) ? 1.6 : 1, kb = b.shrink > 0 && !(a.shrink > 0) ? 1.6 : 1;
        if(am){ a.x -= nx * (bm ? 1 : 2) * ka; a.z -= nz * (bm ? 1 : 2) * ka; }
        if(bm){ b.x += nx * (am ? 1 : 2) * kb; b.z += nz * (am ? 1 : 2) * kb; }
        if((a === me || b === me) && performance.now() - (bumps.t || 0) > 400){ bumps.t = performance.now(); SFX.bump(); }
      }
    }
  }
}
const simulated = k => k === me || (k.kind === 'cpu' && (!R.online || MP.isHost));

/* ---------- computer drivers ---------- */
function cpuControls(k, dt){
  k.laneT += dt * .35;
  const look = clamp(9 + k.s * .55, 9, 24) / T.LEN;
  const lane = clamp(k.lane + Math.sin(k.laneT) * .18, -.55, .55);
  const p = T.at(k.u + look, lane);
  const want = Math.atan2(p.x - k.x, p.z - k.z), d = angDiff(want, k.h);
  // rubber band: close to the kids
  let ref = null;
  for(const o of karts) if(o.kind === 'me' || o.kind === 'net') if(!ref || o.prog > ref.prog) ref = o;
  if(R.mode === 'tt') ref = null;
  let band = 1;
  if(ref){ const gap = ref.prog - k.prog; band = clamp(1 + gap * 1.1, .86, 1.12); if(ref.fin) band = 1; }
  k.skill = k.base * band;
  // stuck against something: steer back to the road
  if(Math.abs(k.s) < 2 && R.t > 3){ k.stuck += dt; if(k.stuck > 1.5){ const s = T.S[k.qi]; k.h = Math.atan2(s.tx, s.tz); k.stuck = 0; } } else k.stuck = 0;
  // items
  if(k.item && R.t > k.useAt) useItem(k);
  return { steer:clamp(-d * 2.6, -1, 1), brake:Math.abs(d) > 1.4 && k.s > 12, drift:false };
}

/* ======================================================================
   Items
   ====================================================================== */
function rollItem(k){
  const n = karts.filter(o => !o.gone).length, pf = n > 1 ? (k.place - 1) / (n - 1) : 0;
  const w = { banana:lerp(32, 4, pf), jelly:lerp(24, 10, pf), shield:lerp(26, 14, pf), balloon:lerp(10, 24, pf), rocket:lerp(6, 30, pf), wand:k.place > 2 ? lerp(0, 16, pf) : 0 };
  let sum = 0; for(const i in w) sum += w[i]; let r = Math.random() * sum;
  for(const i in w){ r -= w[i]; if(r <= 0) return i; }
  return 'banana';
}
function takeBox(k, i){
  const b = BOXES[i]; b.until = R.t + 3;
  if(k === me){ SFX.box(); burst(b.x, b.y, b.z, 14, CONFETTI, 4, 1, 8, 2); }
  if(R.online){ if(MP.isHost) hostBoxes[i] = R.t + 3; else if(k === me) mpSend('req', { k:'box', n:R.n, i }); }
  if(!k.item && !k.rl){ k.rl = k === me ? 1.4 : .1; k.rollItem = rollItem(k); k.itemN = 1; }
}
function pickups(k){
  if(R.mode !== 'tt') for(let i = 0; i < BOXES.length; i++){ const b = BOXES[i]; if(R.t >= b.until && Math.abs(b.x - k.x) < 2.2 && Math.abs(b.z - k.z) < 2.2 && Math.abs(b.y - k.y - .9) < 2.2) takeBox(k, i); }
  for(const st of STARS){ if(R.t >= st.until && Math.abs(st.x - k.x) < 1.9 && Math.abs(st.z - k.z) < 1.9 && Math.abs(st.y - k.y - .5) < 2){ st.until = R.t + 12; if(k.stars < 10) k.stars++; if(k === me){ SFX.star(); burst(st.x, st.y, st.z, 8, GOLD, 3, .9, 8, 2); } } }
  // hazards on the road
  for(const hz of R.hazards){
    if(hz.dead || (hz.by === k.id && R.t - hz.t < .7)) continue;
    if(Math.abs(hz.x - k.x) < 1.6 && Math.abs(hz.z - k.z) < 1.6 && Math.abs(hz.y - k.y) < 1.5){
      hz.dead = true; itemSend({ k:'gone', hid:hz.id });
      hitKart(k, hz.type);
    }
  }
}
function hitKart(k, how){
  if(k.shield > 0){ k.shield = 0; burst(k.x, k.y + 1, k.z, 14, [0x9fe6ff, 0xffffff], 4, 1, 6, 2); if(k === me) SFX.pop(); return false; }
  if(how === 'banana'){ k.spin = 1.1; k.drift = 0; k.lvl = 0; k.s *= .5; burst(k.x, k.y + 1.4, k.z, 10, GOLD, 3, .9, 4, 2); if(k === me){ SFX.spin(); pop('🌀 ' + L('زحلقة!', 'Whoops!', 'Kaydın!')); } }
  else if(how === 'jelly'){ k.jelly = 1.8; k.spin = .5; k.drift = 0; k.s *= .6; burst(k.x, k.y + .6, k.z, 14, GREEN, 3, 1.2, 10, 2); if(k === me){ SFX.splat(); pop('🟢 ' + L('لزّيق!', 'Sticky!', 'Yapış yapış!')); } }
  else if(how === 'balloon'){ k.bounce = 1.1; k.air = true; k.vy = 8; k.drift = 0; k.s *= .4; burst(k.x, k.y + 2, k.z, 16, PINK, 4, 1, 8, 3); if(k === me){ SFX.boing(); pop('🎈 ' + L('بوينغ!', 'Boing!', 'Boing!')); } }
  else if(how === 'shrink'){ k.shrink = 4.5; burst(k.x, k.y + 1, k.z, 12, [0xc77dff, 0xffffff, 0xffd23f], 3, .8, 4, 2); if(k === me){ SFX.shrink(); pop('🪄 ' + L('صرت صغير!', 'Tiny!', 'Minicik!')); } }
  if(k !== me && k.kind === 'cpu' && near(k)) SFX.spin();
  return true;
}
const near = k => me && Math.hypot(k.x - me.x, k.z - me.z) < 30;
function useItem(k){
  const it = k.item; if(!it) return;
  k.itemN--; if(k.itemN <= 0){ k.item = null; k.itemN = 0; }
  const fx = Math.sin(k.h), fz = Math.cos(k.h);
  if(it === 'banana' || it === 'jelly'){
    const back = it === 'banana';
    const x = k.x + fx * (back ? -2.6 : 12), z = k.z + fz * (back ? -2.6 : 12), q = T.query(x, z, k.qi);
    const hz = { id:(k.id || 'k') + '_' + (++R.hid), type:it, x, z, y:q.gap ? k.y : q.y + q.ramp, by:k.id, t:R.t };
    if(q.on === 'out'){ hz.x = x + q.px * (q.over + .5); hz.z = z + q.pz * (q.over + .5); }
    addHazard(hz); itemSend({ k:'drop', hid:hz.id, type:it, x:r2(hz.x), y:r2(hz.y), z:r2(hz.z), by:k.id });
    if(k === me) SFX.peel();
  } else if(it === 'shield'){ k.shield = 9; if(k === me) SFX.shield(); }
  else if(it === 'rocket'){ k.boost = Math.max(k.boost, 2.2); if(k === me){ SFX.boost(); cam.shake = .35; } }
  else if(it === 'balloon'){
    const ahead = placesList().filter(o => o.place < k.place && !o.fin && !o.gone).sort((a, b) => b.place - a.place)[0] || null;
    const b = { id:(k.id || 'k') + '_b' + (++R.hid), by:k.id, target:ahead ? ahead.id : null, prog:k.prog + 3 / T.LEN, lat:0, x:k.x, y:k.y + 1.5, z:k.z, life:8 };
    addBalloon(b); itemSend({ k:'bal', bid:b.id, by:k.id, target:b.target, prog:r4(b.prog) });
    if(k === me) SFX.whoosh();
  } else if(it === 'wand'){
    const ids = placesList().filter(o => o.place < k.place && !o.fin && !o.gone).map(o => o.id);
    applyShrink(ids); itemSend({ k:'shrink', ids, by:k.id });
    if(k === me) SFX.shrink();
  }
}
const r2 = v => Math.round(v * 100) / 100, r4 = v => Math.round(v * 10000) / 10000;
const hzMeshes = new Map();
function addHazard(hz){
  if(R.hazards.some(h => h.id === hz.id)) return;
  R.hazards.push(hz);
  const m = MD.items[hz.type === 'jelly' ? 'jelly' : 'banana'](); m.position.set(hz.x, hz.y, hz.z); m.rotation.y = Math.random() * 6; scene.add(m); hzMeshes.set(hz.id, m);
  if(R.hazards.length > 24){ const old = R.hazards.shift(); dropHazardMesh(old.id); }
}
function dropHazardMesh(id){ const m = hzMeshes.get(id); if(m){ scene.remove(m); hzMeshes.delete(id); } }
function addBalloon(b){ if(R.balloons.some(x => x.id === b.id)) return; b.m = MD.items.balloon(); b.m.position.set(b.x, b.y, b.z); scene.add(b.m); R.balloons.push(b); }
function popBalloon(b){ b.dead = true; scene.remove(b.m); burst(b.x, b.y + 1, b.z, 14, PINK, 4, 1, 6, 2); }
function applyShrink(ids){ for(const k of karts) if(ids.includes(k.id) && simulated(k)) hitKart(k, 'shrink'); for(const k of karts) if(ids.includes(k.id) && !simulated(k)) burst(k.x, k.y + 1, k.z, 10, [0xc77dff, 0xffffff], 3, .8, 4, 2); }
function updateItems(dt, t){
  for(const hz of R.hazards){ const m = hzMeshes.get(hz.id); if(!m) continue; if(hz.dead){ dropHazardMesh(hz.id); continue; } if(hz.type === 'jelly'){ const w = 1.3 + Math.sin(t * 6 + hz.x) * .08; m.scale.set(w, 1.3 * 2.6 - w * 1.6, w); } }
  R.hazards = R.hazards.filter(h => !h.dead);
  for(const b of R.balloons){
    if(b.dead) continue;
    b.life -= dt;
    const tgt = b.target ? karts.find(k => k.id === b.target && !k.gone) : null;
    if(tgt) b.lat = lerp(b.lat, clamp((tgt.qd || 0) / T.hw, -.8, .8), 1 - Math.exp(-3 * dt));
    b.prog += 40 * dt / T.LEN;
    const p = T.at(b.prog, b.lat);
    let x = p.x, z = p.z, y = p.y + 1.4;
    if(tgt && tgt.prog - b.prog < 12 / T.LEN){ x = lerp(b.x, tgt.x, 1 - Math.exp(-10 * dt)); z = lerp(b.z, tgt.z, 1 - Math.exp(-10 * dt)); y = lerp(b.y, tgt.y + 1.2, 1 - Math.exp(-10 * dt)); }
    b.x = x; b.z = z; b.y = y; b.m.position.set(x, y + Math.sin(t * 5) * .15, z); b.m.rotation.y += dt * 3;
    if(tgt && Math.hypot(tgt.x - x, tgt.z - z) < 2.2 && simulated(tgt)){ popBalloon(b); hitKart(tgt, 'balloon'); itemSend({ k:'pop', bid:b.id }); continue; }
    if(b.life <= 0 || (!tgt && b.prog > (karts.find(k => k.id === b.by) || { prog:b.prog }).prog + 120 / T.LEN)) popBalloon(b);
  }
  R.balloons = R.balloons.filter(b => !b.dead);
}

/* ======================================================================
   Places, finish
   ====================================================================== */
function placesList(){ return karts.filter(k => !k.gone); }
function computePlaces(){
  const list = karts.filter(k => !k.gone).slice().sort((a, b) => (a.fin !== b.fin) ? (a.fin ? -1 : 1) : a.fin ? a.finT - b.finT : b.prog - a.prog);
  // online: the host's order for the finishers
  if(R.online && !MP.isHost && MP.order){ const ord = MP.order; list.sort((a, b) => { const ia = ord.indexOf(a.id), ib = ord.indexOf(b.id); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); }); }
  list.forEach((k, i) => { k.place = i + 1; });
  return list;
}
function kartFinished(k){
  k.fin = true; k.finT = R.t;
  if(R.online){
    if(MP.isHost){ if(!R.order.some(o => o.id === k.id)) R.order.push({ id:k.id, t:r2(R.t) }); }
    else if(k === me) mpSend('req', { k:'fin', n:R.n, t:r2(R.t) });
  } else R.order.push({ id:k.id, t:R.t });
  if(k === me) meFinished();
}
function meFinished(){
  me.drift = 0; me.lvl = 0; AU.driftSnd(false);
  const place = computePlaces().indexOf(me) + 1;
  SFX.cheer(); banner(place === 1 ? L('🏆 الأول!', '🏆 1ST!', '🏆 BİRİNCİ!') : '🏁 ' + L('خلصت!', 'FINISH!', 'BİTİŞ!'), 'mid long');
  burst(me.x, me.y + 2, me.z, 60, CONFETTI, 7, 1.1, 9, 5, 1);
  if(R.mode === 'tt'){ state = 'done'; ttFinished(); return; }
  if(R.online){ state = 'done'; showWait(); return; }
  state = 'done';
  setTimeout(() => { if(state === 'done') endRace(); }, 2600);
}
/* single player: the race ends when I finish — the others get their place from how far they got */
function endRace(order){
  if(R.over) return;
  R.over = true; R.phase = 'end';
  let list;
  if(order){ list = order.map(o => karts.find(k => k.id === o.id)).filter(Boolean); for(const o of order){ const k = karts.find(x => x.id === o.id); if(k){ k.finT = o.t; k.fin = o.t > 0; } } for(const k of karts) if(!list.includes(k) && !k.gone) list.push(k); }
  else { list = computePlaces(); }
  list.forEach((k, i) => { k.place = i + 1; if(!k.fin) k.finT = 0; });
  R.final = list;
  showPodium(list);
}

/* ======================================================================
   Race setup
   ====================================================================== */
function cpuRoster(exclude, n){
  const pool = HERO_IDS.filter(h => h !== 'me' && !exclude.includes(h));
  const out = []; while(out.length < n){ out.push(pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : pick(HERO_IDS.filter(h => h !== 'me'))); }
  return out;
}
/* plan: { track, grid:[{ id, kind:'me'|'cpu'|'net', hero, av }] } */
function setupRace(plan, mode){
  useTrack(plan.track);
  clearKarts(); clearItems();
  R.mode = mode; R.t = 0; R.count = 3.6; R.phase = 'count'; R.order = []; R.over = false; R.firstFin = 0; R.final = null; R.frozen = true; R.lastBeep = 4;
  R.online = mode === 'online';
  for(const b of BOXES) b.until = 0; for(const s of STARS) s.until = 0;
  plan.grid.forEach((g, i) => {
    const k = newKart({ id:g.id, kind:g.kind, hero:g.hero, av:g.av });
    placeOnGrid(k, i);
    k.base = g.kind === 'cpu' ? .86 + (1 - i / NK) * .08 + Math.random() * .03 : 1; k.skill = k.base;
    k.lane = g.kind === 'cpu' ? (Math.random() * 2 - 1) * .4 : 0;
    k.tx = k.x; k.ty = k.y; k.tz = k.z; k.th = k.h;
    if(g.kind === 'me') me = k;
    if(g.kind === 'net'){ const l = document.createElement('div'); l.className = 'nm'; l.style.setProperty('--c', HERO_COLOR[k.hero]); l.hidden = true; $('#labels').appendChild(l); k.lbl = l; }
    karts.push(k);
  });
  if(mode === 'tt'){ me.item = 'rocket'; me.itemN = 3; const g = loadGhost(trackId); if(g){ ghost = newKart({ id:'ghost', kind:'ghost', hero:heroId }); ghost.data = g; } R.ghostRec = []; R.ghostT = 0; }
  snapCam = true; cam.intro = 2.4;
  state = 'count'; hideOverlay(); setRaceUI(true);
  AU.music(false); AU.music(true); AU.engine(true, 0);
  hudKey = ''; slotKey = '';
  if(SAVE.tut < 1){ tip(L('💨 اضغط وثبّت للانزلاق بالكوع — شرار أزرق ثم برتقالي = تيربو!', '💨 Hold to drift in turns — blue then orange sparks = turbo!', '💨 Virajlarda basılı tut — mavi sonra turuncu kıvılcım = turbo!'), 7000); SAVE.tut = 1; persist(); }
}
function clearItems(){ for(const id of [...hzMeshes.keys()]) dropHazardMesh(id); R.hazards = []; for(const b of R.balloons) scene.remove(b.m); R.balloons = []; }
function soloPlan(track){
  const grid = [], cpus = cpuRoster([heroId], NK - 1);
  for(let i = 0; i < NK; i++){ if(i === 4) grid.push({ id:'me', kind:'me', hero:heroId, av:myAv() }); else grid.push({ id:'c' + i, kind:'cpu', hero:cpus.pop() }); }
  return { track, grid };
}
function startQuick(track){ SAVE.track = okTrack(track); persist(); R.cup = null; setupRace(soloPlan(okTrack(track)), 'quick'); }
function startTT(track){ SAVE.track = okTrack(track); persist(); R.cup = null; setupRace({ track:okTrack(track), grid:[{ id:'me', kind:'me', hero:heroId, av:myAv() }] }, 'tt'); }
function startCup(){
  const cpus = cpuRoster([heroId], NK - 1);
  R.cup = { i:0, pts:{}, grid:null };
  const grid = []; for(let i = 0; i < NK; i++){ if(i === 4) grid.push({ id:'me', kind:'me', hero:heroId, av:myAv() }); else grid.push({ id:'c' + i, kind:'cpu', hero:cpus.pop() }); }
  R.cup.grid = grid; grid.forEach(g => { R.cup.pts[g.id] = 0; });
  setupRace({ track:TRACKS[0].id, grid }, 'cup');
}
function nextCupRace(){
  const c = R.cup; c.i++;
  // the grid follows the standings: last place starts in front
  const grid = c.grid.slice().sort((a, b) => c.pts[a.id] - c.pts[b.id]);
  setupRace({ track:TRACKS[c.i].id, grid }, 'cup');
}
function restartRace(){
  if(R.mode === 'tt') startTT(trackId); else if(R.mode === 'cup'){ const c = R.cup; setupRace({ track:TRACKS[c.i].id, grid:c.grid }, 'cup'); } else startQuick(trackId);
}

/* ======================================================================
   Frame
   ====================================================================== */
const cam = { shake:0, fov:68, intro:0, yaw:0 };
const camPos = new THREE.Vector3(0, 30, 60), camLook = new THREE.Vector3();
let snapCam = true, camOverride = null;
function updateCamera(dt){
  if(!me) return;
  const k = me, fx = Math.sin(k.h + k.vis * .35), fz = Math.cos(k.h + k.vis * .35);
  const back = 5.4 + Math.min(1.5, Math.abs(k.s) / 22) * .7, up = 2.45;
  let tx = k.x - fx * back, tz = k.z - fz * back, ty = k.y + up;
  if(cam.intro > 0){
    // the countdown swings the camera from the front of the kart to behind it
    const a = clamp(cam.intro / 2.4, 0, 1), ang = k.h + a * Math.PI * .9, d = back + a * 3;
    tx = k.x - Math.sin(ang) * d; tz = k.z - Math.cos(ang) * d; ty = k.y + up + a * 1.2;
    cam.intro -= dt;
  }
  const g = T.groundH(tx, tz); if(ty < g + 1) ty = g + 1;
  const kk = snapCam ? 1 : 1 - Math.exp(-(cam.intro > 0 ? 6 : 9) * dt);
  camPos.x = lerp(camPos.x, tx, kk); camPos.z = lerp(camPos.z, tz, kk); camPos.y = lerp(camPos.y, ty, snapCam ? 1 : 1 - Math.exp(-5 * dt));
  camLook.set(k.x + fx * 4, k.y + 1.35, k.z + fz * 4);
  snapCam = false;
  cam.shake = Math.max(0, cam.shake - dt * .9);
  const sh = cam.shake * cam.shake * 1.6;
  camera.position.set(camPos.x + (Math.random() - .5) * sh, camPos.y + (Math.random() - .5) * sh, camPos.z + (Math.random() - .5) * sh);
  camera.lookAt(camLook);
  const fovT = k.boost > 0 ? 80 : 68 + Math.min(1, k.s / MAXS) * 3;
  cam.fov = lerp(cam.fov, fovT, 1 - Math.exp(-4 * dt));
  if(Math.abs(camera.fov - cam.fov) > .05){ camera.fov = cam.fov; camera.updateProjectionMatrix(); }
}
function poseKart(k, t, dt){
  const M = k.M, flags = k.kind === 'net' || (k.kind === 'cpu' && !simulated(k)) ? k.flags : null;
  const spin = flags ? (flags & 8 ? 1 : 0) : (k.spin > 0 ? 1 : 0), boost = flags ? flags & 4 : k.boost > 0, shield = flags ? flags & 16 : k.shield > 0, shrink = flags ? flags & 32 : k.shrink > 0, jelly = flags ? flags & 64 : k.jelly > 0;
  const drift = flags ? (flags & 1 ? (flags & 512 ? -1 : 1) : 0) : k.drift, lvl = flags ? (flags & 2 ? 2 : flags & 1024 ? 1 : 0) : k.lvl;
  if(flags){ if(spin) k.spinA += dt * 14; else k.spinA = 0; k.vis = lerp(k.vis, drift ? -drift * .42 : 0, 1 - Math.exp(-10 * dt)); M.spin += k.s * dt / .36; }
  M.grp.position.set(k.x, k.y, k.z); M.grp.rotation.y = k.h + k.vis + k.spinA;
  const sc = lerp(M.grp.scale.x, shrink ? .58 : 1, 1 - Math.exp(-8 * dt)); M.grp.scale.setScalar(sc);
  const squash = k.land > 0 ? Math.sin(k.land / .2 * Math.PI) * .07 : 0;
  M.body.rotation.z = k.rolz; M.body.position.y = Math.sin(t * 30) * .012 * Math.min(1, Math.abs(k.s) / 5) - squash + (k.bounce > 0 ? 0 : 0);
  M.body.rotation.x = k.air ? clamp(-k.vy * .03, -.25, .25) : 0;
  if(jelly){ const w = 1 + Math.sin(t * 18) * .06; M.body.scale.set(w, 2 - w, w); } else M.body.scale.set(1, 1, 1);
  for(const w of M.wheels){ w.w.rotation.x = M.spin; if(w.front) w.piv.rotation.y = k.steer * -.45; }
  M.flames.forEach((f, i) => { f.visible = !!boost; if(boost){ const s = .8 + Math.sin(t * 50 + i * 2) * .3; f.scale.set(s, s, s * 1.3); } });
  M.sparks.forEach((s, i) => { s.visible = drift && lvl > 0; if(s.visible){ s.material.color.set(lvl > 1 ? 0xff8a1a : 0x4ab0ff); const z = (lvl > 1 ? 1.5 : 1.2) + Math.random() * .7; s.scale.set(z, z, 1); } });
  if(drift && lvl > 0){ for(const sd of [-1, 1]){ const bx = k.x - Math.sin(k.h) * 1 + Math.cos(k.h) * sd * .85, bz = k.z - Math.cos(k.h) * 1 - Math.sin(k.h) * sd * .85; burst(bx, k.y + .2, bz, 2, lvl > 1 ? ORANGE : BLUE, 3.2, 1.1, 10, 2, .22); } }
  if(boost && Math.random() < .5) burst(k.x - Math.sin(k.h) * 1.6, k.y + .6, k.z - Math.cos(k.h) * 1.6, 1, ORANGE, 1, 1, -2, .5, .25);
  if(shield && !k.shieldM){ k.shieldM = MD.items.shield(); M.grp.add(k.shieldM); }
  if(k.shieldM){ k.shieldM.visible = !!shield; if(shield) k.shieldM.rotation.y = t; }
  if(k.H){ const far = (k.x - camera.position.x) ** 2 + (k.z - camera.position.z) ** 2 > 75 * 75; k.H.grp.visible = !far; if(!far) seatPose(k.H, t + k.color % 7, k.steer, state === 'podium' && k.place <= 3); }
}
function updateGhost(dt){
  if(!ghost || !ghost.data) return;
  const f = ghost.data.f, i = Math.floor(R.t * 10), a = i * 4, b = a + 4;
  if(b + 3 >= f.length || R.phase !== 'go'){ ghost.M.grp.visible = R.phase !== 'go' ? true : false; if(R.phase !== 'go' && f.length >= 4){ ghost.M.grp.position.set(f[0], f[1], f[2]); ghost.M.grp.rotation.y = f[3]; } return; }
  const u = R.t * 10 - i;
  ghost.M.grp.visible = true;
  ghost.M.grp.position.set(lerp(f[a], f[b], u), lerp(f[a + 1], f[b + 1], u), lerp(f[a + 2], f[b + 2], u)); ghost.M.grp.rotation.y = f[a + 3] + angDiff(f[b + 3], f[a + 3]) * u;
  for(const w of ghost.M.wheels) w.w.rotation.x += dt * 50;
}
function raceStep(dt){
  // countdown
  if(R.phase === 'count'){
    R.count -= dt;
    const n = Math.ceil(R.count - .5);
    if(n < R.lastBeep && n >= 1 && n <= 3){ R.lastBeep = n; SFX.beep(); banner(N(n), ''); }
    if(R.count <= .5){ R.phase = 'go'; R.frozen = false; state = state === 'count' ? 'race' : state; SFX.go(); banner(L('انطلق!', 'GO!', 'BAŞLA!'), ''); for(const k of karts) if(k.kind === 'cpu') k.startDelay = Math.random() * .35; }
  }
  if(R.phase === 'go') R.t += dt;
  // my kart
  if(me && !me.gone){
    let c = myControls();
    if(autopilot || me.fin || (testCtl && testCtl.auto)){ const d = testCtl && testCtl.auto ? testCtl.drift : false; c = cpuControlsFor(me, dt); c.drift = d; if(d) c.steer = (testCtl.dir || Math.sign(c.steer) || 1) * clamp(Math.abs(c.steer) * 1.6, .55, 1); }
    if(R.frozen) c = { steer:c.steer, brake:false, drift:false };
    if(!me.fin && R.phase === 'go'){
      if(me.rl > 0){ me.rl -= dt; if(me.rl <= 0){ me.rl = 0; me.item = me.rollItem; me.itemN = me.item === 'rocket' && me.place >= 6 ? 2 : 1; SFX.got(); } }
      if(wantItem && me.item && !me.rl) useItem(me);
    }
    wantItem = false;
    stepKart(me, dt, c);
    if(R.phase === 'go') pickups(me);
    if(R.mode === 'tt' && R.phase === 'go' && !me.fin){ R.ghostT -= dt; if(R.ghostT <= 0){ R.ghostT += .1; R.ghostRec.push(r2(me.x), r2(me.y), r2(me.z), r2(me.h)); } }
  }
  // computer karts
  for(const k of karts){
    if(k.kind !== 'cpu' || k.gone) continue;
    if(!simulated(k)){ netSmooth(k, dt); continue; }
    if(k.startDelay > 0 && R.phase === 'go'){ k.startDelay -= dt; stepKart(k, dt, { steer:0, brake:true, drift:false }); continue; }
    if(k.rl > 0){ k.rl -= dt; if(k.rl <= 0){ k.rl = 0; k.item = k.rollItem; k.itemN = 1; k.useAt = R.t + 1.2 + Math.random() * 4; } }
    stepKart(k, dt, R.phase === 'go' ? cpuControls(k, dt) : { steer:0, brake:false, drift:false });
    if(R.phase === 'go') pickups(k);
  }
  for(const k of karts) if(k.kind === 'net' && !k.gone) netSmooth(k, dt);
  bumps();
  updateItems(dt, T0);
  computePlaces();
  updateGhost(dt);
  // engine and drift sounds
  if(me){ AU.engine(true, clamp(Math.abs(me.s) / BOOSTS, 0, 1), me.boost > 0); AU.driftSnd(!!me.drift && !me.air, me.lvl); }
  // single player safety: the race ends if I'm stuck long after everyone finished
  if(!R.online && R.phase === 'go' && !me.fin && R.t > 600) endRace();
}
function cpuControlsFor(k, dt){ const save = k.item; k.item = null; const c = cpuControls(k, dt); k.item = save; k.skill = 1; return c; }

let last = performance.now(), T0 = 0, fps = 60, fpsN = 0, fpsT = 0, slowT = 0;
function frame(now){
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if(dt > .05) dt = .05; if(dt <= 0) dt = .001;
  T0 += dt; fpsN++; fpsT += dt;
  if(fpsT >= 1){ fps = fpsN / fpsT; fpsN = 0; fpsT = 0; if((state === 'race' || state === 'count') && fps < 42){ slowT++; if(slowT >= 2){ slowT = 0; degrade(); } } else slowT = 0; }
  if(state === 'count' || state === 'race' || state === 'done'){ for(let i = 1; i < timeScale; i++){ raceStep(dt); mpFrame(dt); if(!(state === 'count' || state === 'race' || state === 'done')) break; } if(state === 'count' || state === 'race' || state === 'done'){ raceStep(dt); updateCamera(dt); } }
  else if(state === 'pause'){ if(R.online){ raceStep(dt); } updateCamera(0); }
  else if(state === 'podium'){ podiumFrame(dt); }
  else { menuCam(dt); }
  if(state !== 'podium') clearPodOff();
  if(T){ T.update(dt, T0); T.sky.position.copy(camera.position); const sn = T.root.userData.snow; if(sn) sn.position.set(Math.round(camera.position.x / 10) * 10, camera.position.y - 20, Math.round(camera.position.z / 10) * 10); drawPickups(T0); }
  for(const k of karts) if(!k.gone) poseKart(k, T0, dt);
  drawBlobs();
  updateParts(dt);
  labels();
  mpFrame(dt);
  if(state === 'race' || state === 'count' || state === 'done' || (state === 'pause' && R.online)) hudFrame(dt);
  if(camOverride){ camera.position.set(camOverride[0], camOverride[1], camOverride[2]); camera.lookAt(camOverride[3], camOverride[4], camOverride[5]); }
  renderer.render(scene, camera);
}
function degrade(){
  if(quality === 2 && dpr > 1){ dpr = 1; renderer.setPixelRatio(dpr); renderer.setSize(SW, SH, false); quality = 1; return; }
  if(quality === 1){ quality = 0; renderer.setPixelRatio(.8); renderer.setSize(SW, SH, false); }
}
function drawBlobs(){
  let n = 0;
  for(const k of karts){ if(k.gone) continue; const g = k.air ? T.groundH(k.x, k.z) : k.y; const q = k.y - (k.air ? 0 : 0); const s = (k.shrink > 0 ? .6 : 1) * clamp(1 - (k.y - g) * .12, .4, 1);
    _m.compose(_v.set(k.x, Math.max(g, k.air ? k.y - 30 : k.y) + .06, k.z), _q.setFromEuler(_e.set(0, k.h, 0)), _s.set(s, 1, s)); blobs.setMatrixAt(n++, _m); void q; }
  blobs.count = n; blobs.instanceMatrix.needsUpdate = true;
}
function labels(){
  for(const k of karts){
    if(!k.lbl) continue;
    const n = BoboRT.who(k.id, HERO_NAME[k.hero]) || L('صاحبك', 'Your friend', 'Arkadaşın');
    if(k.nm !== n){ k.nm = n; k.lbl.textContent = n; }
    _v.set(k.x, k.y + 2.6, k.z).project(camera);
    const on = !k.gone && _v.z < 1 && Math.abs(_v.x) < 1.05 && Math.abs(_v.y) < 1.05 && (state === 'race' || state === 'count' || state === 'done' || state === 'pause');
    k.lbl.hidden = !on;
    if(on){ k.lbl.style.left = ((_v.x + 1) / 2 * SW).toFixed(1) + 'px'; k.lbl.style.top = ((1 - _v.y) / 2 * SH).toFixed(1) + 'px'; }
  }
}

/* ---------- menu camera: a slow fly-over of the track ---------- */
function menuCam(dt){
  menuT += dt;
  if(!T) return;
  // a TV camera that rides along with the parade karts (side-chase, slowly swinging round)
  for(const k of karts){ if(k.kind !== 'cpu') continue; stepKart(k, dt, cpuControls(k, dt)); }
  const lead = karts[0];
  if(!lead){ return; }
  const a = lead.h + Math.PI + Math.sin(menuT * .2) * .45, d = 9.5;
  let x = lead.x + Math.sin(a) * d, z = lead.z + Math.cos(a) * d, y = lead.y + 3.4;
  const g = T.groundH(x, z); if(y < g + 2) y = g + 2;
  const k2 = 1 - Math.exp(-3 * dt);
  camPos.x = lerp(camPos.x, x, menuT < .1 ? 1 : k2); camPos.y = lerp(camPos.y, y, menuT < .1 ? 1 : k2); camPos.z = lerp(camPos.z, z, menuT < .1 ? 1 : k2);
  camera.position.copy(camPos); camera.lookAt(lead.x + Math.sin(lead.h) * 6, lead.y + 1.6, lead.z + Math.cos(lead.h) * 6);
  if(camera.fov !== 60){ camera.fov = 60; camera.updateProjectionMatrix(); }
}
let camSide = 0;
function menuParade(){
  clearKarts(); clearItems(); R.mode = 'menu'; R.t = 0; R.frozen = false; R.phase = 'go'; R.online = false;
  const heroes = [heroId].concat(cpuRoster([heroId], 3));
  menuT = 0; camSide = 0;
  heroes.forEach((h, i) => { const k = newKart({ id:'m' + i, kind:'cpu', hero:h, av:h === 'me' ? myAv() : null }); const p = T.at(.06 - i * .012, i % 2 ? .3 : -.3); k.x = p.x; k.z = p.z; k.y = p.y; k.h = p.h; k.qi = p.i; const q = T.query(k.x, k.z, k.qi); k.u = q.u; k.lap = 0; k.base = .62 - i * .015; k.lane = i % 2 ? .3 : -.3; karts.push(k); });
}

/* ======================================================================
   HUD
   ====================================================================== */
const hudEl = $('#hud'), posEl = $('#pos'), slotEl = $('#slot'), lapEl = $('#hudLap'), timeEl = $('#hudTime'), starsEl = $('#hudStars'), miniEl = $('#mini'), mctx = miniEl.getContext('2d');
let hudKey = '', slotKey = '', posKey = '';
const fmtT = s => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return N(m) + ':' + (r < 10 ? '0' : '') + N(r.toFixed(2)); };
function ordinal(n){
  if(LANG === 'tr') return N(n) + '<small>.</small>';
  if(LANG === 'ar') return '<span class="pl">' + L('المركز', '', '') + '</span>' + N(n);
  const s = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return N(n) + '<small>' + s + '</small>';
}
const ordText = n => LANG === 'tr' ? N(n) + '.' : LANG === 'ar' ? L('المركز ', '', '') + N(n) : N(n) + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');
function hudFrame(){
  if(!me) return;
  const lap = clamp(me.maxLap + 1, 1, LAPS);
  const k = lap + '|' + me.stars;
  if(k !== hudKey){ hudKey = k; lapEl.innerHTML = '<small>' + L('لفّة', 'LAP', 'TUR') + '</small> ' + N(lap) + '/' + N(LAPS); starsEl.textContent = '⭐ ' + N(me.stars); }
  timeEl.textContent = fmtT(R.mode === 'tt' || true ? R.t : R.t);
  if(R.mode !== 'tt'){
    const p = me.place;
    if(p + '' !== posKey){ posKey = p + ''; posEl.innerHTML = ordinal(p); posEl.className = p === 1 ? 'p1' : p === 2 ? 'p2' : p === 3 ? 'p3' : 'pn'; void posEl.offsetWidth; posEl.classList.add('bump'); }
  }
  // item slot
  let sk;
  if(me.rl > 0){ sk = 'r' + Math.floor(me.rl * 12); if(sk !== slotKey){ slotKey = sk; slotEl.className = 'slot rolling'; slotEl.textContent = ITEMS[ITEM_IDS[Math.floor(me.rl * 12) % ITEM_IDS.length]].e; SFX.tick(); } }
  else { sk = 'i' + me.item + me.itemN; if(sk !== slotKey){ slotKey = sk; slotEl.className = 'slot' + (me.item ? ' ready' : ''); slotEl.innerHTML = me.item ? ITEMS[me.item].e + (me.itemN > 1 ? '<b>×' + N(me.itemN) + '</b>' : '') : ''; $('#bItemI').textContent = me.item ? ITEMS[me.item].e : '🎁'; bItem.classList.toggle('off', !me.item); } }
  bDrift.classList.toggle('lv1', me.lvl === 1 && !!me.drift); bDrift.classList.toggle('lv2', me.lvl === 2 && !!me.drift);
  drawMini();
}
let miniBase = null;
function drawMiniBase(){
  const c = document.createElement('canvas'); c.width = c.height = 236; const x = c.getContext('2d');
  x.lineJoin = 'round'; x.lineCap = 'round';
  const path = () => { x.beginPath(); T.S.forEach((s, i) => { const [a, b] = T.toMap(s.x, s.z); i ? x.lineTo(a * 236, b * 236) : x.moveTo(a * 236, b * 236); }); x.closePath(); };
  path(); x.strokeStyle = 'rgba(58,35,64,.7)'; x.lineWidth = 20; x.stroke();
  path(); x.strokeStyle = '#fff'; x.lineWidth = 12; x.stroke();
  if(T.SC){ x.beginPath(); T.SC.S.forEach((s, i) => { const [a, b] = T.toMap(s.x, s.z); i ? x.lineTo(a * 236, b * 236) : x.moveTo(a * 236, b * 236); }); x.strokeStyle = 'rgba(255,255,255,.65)'; x.setLineDash([6, 6]); x.lineWidth = 6; x.stroke(); x.setLineDash([]); }
  const s0 = T.S[0], [a, b] = T.toMap(s0.x, s0.z); x.fillStyle = '#222'; x.fillRect(a * 236 - 9, b * 236 - 3, 18, 6);
  miniBase = c;
}
function drawMini(){
  if(!miniBase) return;
  mctx.clearRect(0, 0, 236, 236); mctx.drawImage(miniBase, 0, 0);
  const dot = (k, r, col, ring) => { const [a, b] = T.toMap(k.x, k.z); mctx.beginPath(); mctx.arc(a * 236, b * 236, r, 0, 7); mctx.fillStyle = col; mctx.fill(); mctx.lineWidth = ring ? 4 : 2.5; mctx.strokeStyle = ring ? '#ffd23f' : '#fff'; mctx.stroke(); };
  for(const k of karts) if(k !== me && !k.gone) dot(k, k.kind === 'net' ? 9 : 7, HERO_COLOR[k.hero], false);
  if(ghost && ghost.M.grp.visible){ const p = ghost.M.grp.position; dot({ x:p.x, z:p.z }, 7, 'rgba(255,255,255,.6)', false); }
  if(me) dot(me, 11, HERO_COLOR[me.hero], true);
}
function setRaceUI(on){
  for(const el of [hudEl, bL, bR, bDrift, bItem, bBrake]) el.hidden = !on;
  posEl.hidden = !on || R.mode === 'tt';
  slotEl.style.visibility = 'visible';
  $('#hudRoom').hidden = !(on && R.online && MP.code); if(R.online && MP.code) $('#hudRoom').textContent = '🏠 ' + MP.code;
  if(!on){ $('#tip').hidden = true; $('#waitBox').hidden = true; }
  $('#bDriftB').textContent = L('انزلاق', 'Drift', 'Drift'); $('#bBrakeB').textContent = L('فرامل', 'Brake', 'Fren');
  clearInput(); hudKey = ''; slotKey = ''; posKey = '';
}
let bannerTO = 0;
function banner(text, cls){ const el = $('#banner'); el.className = 'banner'; void el.offsetWidth; el.textContent = text; el.className = 'banner go ' + (cls || ''); clearTimeout(bannerTO); bannerTO = setTimeout(() => { el.className = 'banner'; }, 2300); }
function pop(text){ const el = $('#pop'); el.className = 'pop'; void el.offsetWidth; el.textContent = text; el.className = 'pop go'; }
let tipTO = 0;
function tip(text, ms){ const el = $('#tip'); el.textContent = text; el.hidden = false; clearTimeout(tipTO); tipTO = setTimeout(() => { el.hidden = true; }, ms || 4000); }
let toastTO = 0;
function toast(text, ms = 3500){ const el = $('#toast'); el.textContent = text; el.hidden = false; clearTimeout(toastTO); toastTO = setTimeout(() => { el.hidden = true; }, ms); }
function showWait(){ const el = $('#waitBox'); el.hidden = false; el.textContent = '🏁 ' + L('خلّصت! استنّى أصحابك…', 'You finished! Waiting for your friends…', 'Bitirdin! Arkadaşlarını bekle…'); }

/* ======================================================================
   Menus
   ====================================================================== */
const overlay = $('#overlay'), card = $('#card');
function showOverlay(cls){ overlay.hidden = false; overlay.className = 'overlay ' + (cls || ''); }
function hideOverlay(){ overlay.hidden = true; }
function myHeroBtn(id = 'bMyHero'){ return `<button class="hero-btn" id="${id}" style="--c:${HERO_COLOR[heroId]}"><img src="${charImg(heroId)}" alt=""><span>${HERO_NAME[heroId]}</span><i class="kc"></i> 🔄</button>`; }
function sndBtn(){ return `<button class="icon-btn sndbtn" id="bSnd" aria-label="${L('الصوت', 'Sound', 'Ses')}">${AU.muted ? '🔇' : '🔊'}</button>`; }
function wireSnd(){ const b = $('#bSnd'); if(b) b.onclick = () => { AU.setMuted(!AU.muted); b.textContent = AU.muted ? '🔇' : '🔊'; if(!AU.muted) SFX.tap(); }; }
function toTitleTrack(){ useTrack(SAVE.track); menuParade(); }
function showTitle(){
  if(R.online || MP.t) coStop();
  state = 'title'; setRaceUI(false); AU.music(false); AU.engine(false); AU.driftSnd(false);
  if(!T || R.mode !== 'menu') toTitleTrack();
  showOverlay('clear'); card.className = 'card bare';
  card.innerHTML = `${sndBtn()}<div class="menu">
    <div class="logo">🏎️</div>
    <h1>${L('سباق بوبو', 'Bobo Kart', 'Bobo Kart')}</h1>
    <p class="sub">${L('انزلق، خذ تيربو، وفوز بالسباق! 🏁', 'Drift, grab a turbo and win the race! 🏁', 'Drift yap, turbo al, yarışı kazan! 🏁')}</p>
    ${myHeroBtn()}
    <div class="grid">
      <button class="big-btn" id="bQuick">🏁 ${L('سباق سريع', 'Quick race', 'Hızlı yarış')}</button>
      <button class="big-btn purple" id="bCup">🏆 ${L('الكأس', 'Cup', 'Kupa')}</button>
      <button class="big-btn sky" id="bTT">⏱️ ${L('ضد الساعة', 'Time trial', 'Zamana karşı')}</button>
      <button class="big-btn pink" id="bMP">👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</button>
    </div></div>`;
  wireSnd();
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('title'); };
  $('#bQuick').onclick = () => { AU.ac(); SFX.tap(); showTracks('quick'); };
  $('#bCup').onclick = () => { AU.ac(); SFX.tap(); showCupIntro(); };
  $('#bTT').onclick = () => { AU.ac(); SFX.tap(); showTracks('tt'); };
  $('#bMP').onclick = () => { AU.ac(); SFX.tap(); mpMenu(); };
}
let selFrom = 'title';
function showSelect(from){
  selFrom = from || 'title'; state = 'select'; setRaceUI(false);
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>🏎️ ${L('مين بدّو يسوق؟', 'Who will drive?', 'Kim sürecek?')}</h2>
    <div class="heroes">${HERO_IDS.map(id => `<button class="hero${id === heroId ? ' on' : ''}" data-h="${id}" style="--c:${HERO_COLOR[id]}"><img src="${charImg(id)}" alt=""><b>${HERO_NAME[id]}</b><i></i></button>`).join('')}</div>
    <p>${L('كل واحد إلو سيارة بلونه 🎨', 'Every racer has a kart in their own colour 🎨', 'Her yarışçının kendi renginde bir kartı var 🎨')}</p>
    <div class="row"><button class="big-btn" id="bOk">✅ ${L('تمام', 'OK', 'Tamam')}</button></div>`;
  card.querySelectorAll('.hero').forEach(b => b.onclick = () => { heroId = b.dataset.h; SAVE.hero = heroId; persist(); rawSet('worlds_hero', heroId); SFX.tap(); card.querySelectorAll('.hero').forEach(x => x.classList.toggle('on', x === b)); if(karts[0] && R.mode === 'menu') menuParade(); });
  $('#bOk').onclick = () => { SFX.tap(); backFromSelect(); };
}
function backFromSelect(){ if(selFrom === 'mp'){ if(mpActive() && MP.screen === 'lobby'){ mpTrack(); mpLobby(); } else mpMenu(); } else showTitle(); }
let trackMode = 'quick';
function showTracks(mode){
  trackMode = mode; state = 'tracks'; setRaceUI(false);
  showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<h2>${mode === 'tt' ? '⏱️ ' + L('ضد الساعة — اختار حلبة', 'Time trial — pick a track', 'Zamana karşı — pist seç') : '🏁 ' + L('اختار الحلبة', 'Pick a track', 'Pist seç')}</h2>
    <div class="tracks">${TRACKS.map(t => `<button class="trk${t.id === SAVE.track ? ' on' : ''}" data-t="${t.id}" style="--tc:${TCOL[t.theme]}"><i>${t.emoji}</i><b>${TNAME(t)}</b><small>${TSUB(t)}</small>${SAVE.best[t.id] ? `<u>⏱️ ${fmtT(SAVE.best[t.id])}</u>` : ''}</button>`).join('')}</div>
    <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  card.querySelectorAll('.trk').forEach(b => b.onclick = () => { AU.ac(); SFX.tap(); if(mode === 'tt') startTT(b.dataset.t); else startQuick(b.dataset.t); });
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('title'); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
function showCupIntro(){
  state = 'tracks'; setRaceUI(false); showOverlay('dim'); card.className = 'card wide';
  card.innerHTML = `<div class="bigstar">🏆</div><h2>${L('كأس بوبو', 'The Bobo Cup', 'Bobo Kupası')}</h2>
    <p>${L('4 سباقات ورا بعض. كل مركز إلو نقاط — اللي بيجمع أكتر بيربح الكأس!', '4 races in a row. Every place gives points — most points wins the cup!', 'Arka arkaya 4 yarış. Her sıra puan verir — en çok puan kupayı kazanır!')}</p>
    <div class="tracks">${TRACKS.map((t, i) => `<div class="trk" style="--tc:${TCOL[t.theme]}"><i>${t.emoji}</i><b>${N(i + 1)}. ${TNAME(t)}</b></div>`).join('')}</div>
    <div class="row">${myHeroBtn()}<button class="big-btn purple" id="bGo">▶️ ${L('يلّا', "Let's go", 'Hadi')}</button><button class="ghost-btn" id="bBack">↩️ ${L('رجوع', 'Back', 'Geri')}</button></div>`;
  $('#bGo').onclick = () => { AU.ac(); SFX.tap(); startCup(); };
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('title'); };
  $('#bBack').onclick = () => { SFX.tap(); showTitle(); };
}
let pauseFrom = 'race';
function showPause(){
  if(state !== 'race' && state !== 'count' && state !== 'done') return;
  pauseFrom = state; state = 'pause'; clearInput(); AU.engine(false); AU.driftSnd(false);
  showOverlay('dim'); card.className = 'card';
  card.innerHTML = `${sndBtn()}<div class="bigstar">⏸️</div><h2>${L('استراحة', 'Paused', 'Mola')}</h2>
    <div class="row"><button class="big-btn mint" id="bResume">▶️ ${L('كمّل', 'Continue', 'Devam')}</button>
    ${R.online ? '' : `<button class="big-btn" id="bAgain">🔄 ${L('من الأول', 'Restart', 'Baştan')}</button>`}</div>
    <div class="row"><button class="ghost-btn" id="bMenu">🏁 ${L('القائمة', 'Menu', 'Menü')}</button></div>
    <button class="exit-btn" id="bExit">🚪 ${L('اطلع من اللعبة', 'Leave the game', 'Oyundan çık')}</button>`;
  wireSnd();
  $('#bResume').onclick = () => { SFX.tap(); resume(); };
  if($('#bAgain')) $('#bAgain').onclick = () => { SFX.tap(); restartRace(); };
  $('#bMenu').onclick = () => { SFX.tap(); showTitle(); };
  $('#bExit').onclick = () => { try{ coStop(); }catch(e){} location.href = '../'; };
}
function resume(){ if(state !== 'pause') return; state = pauseFrom; hideOverlay(); AU.engine(true, 0); last = performance.now(); }
$('#btnPause').onclick = () => { SFX.tap(); showPause(); };

/* ---------- the podium ---------- */
let podiumG = null, podT = 0, coinsGiven = 0;
function showPodium(list){
  state = 'podium'; podT = 0; setRaceUI(false); AU.engine(false); AU.driftSnd(false); AU.music(false); clearItems();
  // podium in the middle of the road, just after the line
  if(podiumG) scene.remove(podiumG);
  podiumG = MD.podium(); const p = T.at(.035, 0); podiumG.position.set(p.x, p.y, p.z); podiumG.rotation.y = p.h; scene.add(podiumG);
  const tops = podiumG.userData.tops;
  list.forEach((k, i) => {
    if(k.lbl) k.lbl.hidden = true;
    k.s = 0; k.drift = 0; k.boost = 0; k.spin = 0; k.shrink = 0; k.jelly = 0; k.bounce = 0; k.air = false; k.spinA = 0; k.vis = 0; k.rolz = 0; k.steer = 0; k.flags = 0; k.shield = 0;
    let lx, ly, lz;
    if(i < 3){ lx = tops[i][0]; ly = tops[i][1]; lz = 0; } else { lx = (i - 5.5) * 2.6; ly = 0; lz = -4.5; }
    const cs = Math.cos(p.h), sn = Math.sin(p.h);
    k.x = p.x + lx * cs + lz * sn; k.z = p.z - lx * sn + lz * cs; k.y = p.y + ly + .05; k.h = p.h + (i < 3 ? 0 : 0);
    k.M.grp.visible = true;
  });
  if(ghost) ghost.M.grp.visible = false;
  podiumCam = { x:p.x + Math.sin(p.h) * 11.5, y:p.y + 3.6, z:p.z + Math.cos(p.h) * 11.5, lx:p.x, ly:p.y + 1.9, lz:p.z };
  const place = me ? list.indexOf(me) + 1 : 0;
  SFX.cheer(); setTimeout(() => SFX.win(), 600);
  // coins: once per race, sane cap
  coinsGiven = 0;
  if(me && R.mode !== 'tt'){
    const want = Math.min(40, (PLACE_COINS[place - 1] || 5) + Math.floor(me.stars / 2));
    if(SAVE.cd.d !== today()) SAVE.cd = { d:today(), n:0 };
    coinsGiven = Math.max(0, Math.min(want, COIN_CAP - SAVE.cd.n));
    SAVE.cd.n += coinsGiven; SAVE.races++; if(place === 1) SAVE.wins++; persist();
    try{ if(window.World){ if(coinsGiven > 0) World.addCoins(coinsGiven, L('من سباق بوبو', 'from Bobo Kart', 'Bobo Kart\'tan')); World.track(place === 1 ? 'win' : 'play', 'kart'); } }catch(e){}
  }
  if(R.cup){ list.forEach((k, i) => { R.cup.pts[k.id] = (R.cup.pts[k.id] || 0) + (CUP_PTS[i] || 0); }); }
  setTimeout(() => { if(state === 'podium') podiumCard(list, place); }, 1400);
}
let podiumCam = null, podOff = 0;
function clearPodOff(){ if(podOff){ podOff = 0; camera.clearViewOffset(); } }
function podiumFrame(dt){
  podT += dt;
  // the result card covers one side: shift the picture so the podium shows in the other half
  const off = overlay.hidden ? 0 : SW * .23;   // the card sits on the right in every language
  if(off !== podOff){ podOff = off; if(off) camera.setViewOffset(SW, SH, off, 0, SW, SH); else camera.clearViewOffset(); }
  if(podiumCam){ const a = Math.sin(podT * .3) * .18, c = podiumCam, dx = c.x - c.lx, dz = c.z - c.lz;
    camera.position.set(c.lx + dx * Math.cos(a) - dz * Math.sin(a), c.y, c.lz + dx * Math.sin(a) + dz * Math.cos(a)); camera.lookAt(c.lx, c.ly, c.lz); if(camera.fov !== 55){ camera.fov = 55; camera.updateProjectionMatrix(); } }
  for(const k of (R.final || [])){ if(k.place <= 3){ k.y += Math.sin(podT * 6 + k.place) * .004; } }
  if(Math.random() < dt * 6 && podiumCam) burst(podiumCam.lx + (Math.random() - .5) * 8, podiumCam.ly + 6, podiumCam.lz + (Math.random() - .5) * 4, 3, CONFETTI, 2, 1.1, 3, 0, 1.4);
}
function racerName(k){ if(k === me) return L('إنت', 'You', 'Sen'); if(k.kind === 'net') return BoboRT.who(k.id, HERO_NAME[k.hero]) || HERO_NAME[k.hero]; return HERO_NAME[k.hero]; }
function racerNameH(k){ return BoboRT.esc(racerName(k)); }
function podiumCard(list, place){
  showOverlay('side'); card.className = 'card';
  const stars = place === 1 ? 3 : place <= 3 ? 2 : 1;
  const rows = list.map((k, i) => `<div class="st-row${k === me ? ' me' : ''}" style="--c:${HERO_COLOR[k.hero]}"><b class="n">${i < 3 ? ['🥇', '🥈', '🥉'][i] : N(i + 1)}</b><img src="${k.kind === 'me' ? charImg(k.hero) : charImg(k.hero)}" alt=""><span dir="auto">${racerNameH(k)}${k.kind === 'net' ? ' 👫' : ''}</span><small>${k.fin && k.finT ? fmtT(k.finT) : ''}</small></div>`).join('');
  let extra = '', buttons = '';
  if(R.mode === 'cup'){
    const c = R.cup, last = c.i >= TRACKS.length - 1;
    const st = Object.keys(c.pts).sort((a, b) => c.pts[b] - c.pts[a]);
    extra = `<p>🏆 ${L('نقاط الكأس', 'Cup points', 'Kupa puanları')}: <b>${N(c.pts.me || 0)}</b> · ${L('ترتيبك', 'You are', 'Sıran')} ${ordText(st.indexOf('me') + 1)}</p>`;
    if(last){ const win = st[0] === 'me'; if(win){ SAVE.cups++; persist(); } extra = `<div class="bigstar">${win ? '🏆' : '🎖️'}</div><h2>${win ? L('ربحت الكأس!', 'You won the cup!', 'Kupayı kazandın!') : L('خلص الكأس!', 'Cup finished!', 'Kupa bitti!')}</h2>` + extra; buttons = `<button class="big-btn purple" id="bAgain">🔄 ${L('كأس جديد', 'New cup', 'Yeni kupa')}</button>`; }
    else buttons = `<button class="big-btn purple" id="bNext">▶️ ${L('السباق الجاي', 'Next race', 'Sonraki yarış')} ${TRACKS[c.i + 1].emoji}</button>`;
  } else if(R.online){
    buttons = MP.isHost ? `<button class="big-btn" id="bLobby">🔁 ${L('سباق كمان', 'Race again', 'Tekrar yarış')}</button>` : `<p>${L('استنّى صاحب الغرفة…', 'Wait for the room owner…', 'Oda sahibini bekle…')}</p>`;
  } else buttons = `<button class="big-btn" id="bAgain">🔄 ${L('كمان مرة', 'Again', 'Tekrar')}</button><button class="big-btn mint" id="bTracks">🗺️ ${L('حلبة تانية', 'Other track', 'Başka pist')}</button>`;
  card.innerHTML = `<h2>${place === 1 ? '🏆 ' + L('إنت الأول!', 'You won!', 'Birinci oldun!') : '🏁 ' + ordText(place)}</h2>
    <div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('')}</div>
    ${coinsGiven > 0 ? `<div class="coins">+${N(coinsGiven)} 🪙</div>` : ''}
    ${extra}
    <div class="standings">${rows}</div>
    <div class="row">${buttons}<button class="ghost-btn" id="bMenu">🏁 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
  if($('#bAgain')) $('#bAgain').onclick = () => { SFX.tap(); if(R.mode === 'cup') startCup(); else restartRace(); };
  if($('#bNext')) $('#bNext').onclick = () => { SFX.tap(); nextCupRace(); };
  if($('#bTracks')) $('#bTracks').onclick = () => { SFX.tap(); showTracks(R.mode === 'tt' ? 'tt' : 'quick'); };
  if($('#bLobby')) $('#bLobby').onclick = () => { SFX.tap(); mpBackToLobby(); };
  $('#bMenu').onclick = () => { SFX.tap(); showTitle(); };
}
/* time trial: no podium, a result card with the best time */
function ttFinished(){
  const tm = me.finT, best = SAVE.best[trackId], isBest = !best || tm < best;
  if(isBest){ SAVE.best[trackId] = r2(tm); persist(); saveGhost(trackId, { t:r2(tm), f:R.ghostRec }); }
  R.over = true;
  setTimeout(() => {
    if(state !== 'done') return;
    state = 'podium'; setRaceUI(false); AU.engine(false); AU.driftSnd(false); AU.music(false);
    const p = T.at(.035, 0); podiumCam = { x:me.x + Math.sin(me.h) * 9, y:me.y + 3.5, z:me.z + Math.cos(me.h) * 9, lx:me.x, ly:me.y + 1, lz:me.z }; void p;
    me.s = 0; R.final = [me]; me.place = 1;
    showOverlay('side'); card.className = 'card';
    const stars = !best ? 3 : tm <= best ? 3 : tm <= best * 1.05 ? 2 : 1;
    card.innerHTML = `<div class="bigstar">⏱️</div><h2>${isBest ? L('أحسن وقت جديد!', 'New best time!', 'Yeni en iyi süre!') : L('خلّصت!', 'Finished!', 'Bitti!')}</h2>
      <div class="stars">${[0, 1, 2].map(i => `<span class="${i < stars ? '' : 'off'}">⭐</span>`).join('')}</div>
      <h2 dir="ltr">${fmtT(tm)}</h2>
      <p>${L('أحسن وقت', 'Best time', 'En iyi süre')}: <b dir="ltr">${fmtT(SAVE.best[trackId])}</b> · 👻 ${L('رح تتسابق مع خيالك المرة الجاي', 'Race your ghost next time', 'Bir dahaki sefere hayaletinle yarış')}</p>
      <div class="row"><button class="big-btn" id="bAgain">🔄 ${L('كمان مرة', 'Again', 'Tekrar')}</button><button class="big-btn mint" id="bTracks">🗺️ ${L('حلبة تانية', 'Other track', 'Başka pist')}</button></div>
      <div class="row"><button class="ghost-btn" id="bMenu">🏁 ${L('القائمة', 'Menu', 'Menü')}</button></div>`;
    $('#bAgain').onclick = () => { SFX.tap(); startTT(trackId); };
    $('#bTracks').onclick = () => { SFX.tap(); showTracks('tt'); };
    $('#bMenu').onclick = () => { SFX.tap(); showTitle(); };
  }, 2200);
}

/* ======================================================================
   Online («👫 العب مع أصحابك»): up to 4 kids + computer karts. Nothing is stored on a server.
   Events: pos (each kid's own kart ~15×/s), st (host: computer karts, boxes, places ~10×/s), ev (host: start/end), req (kid → host:
   box taken, finished), it (anyone: banana/jelly dropped or gone, balloon, pop, wand), lob (lobby: the track the host picked).
   Names never travel: only the friend code (presence 'fc'); every phone asks the server for the name (../rt.js).
   ====================================================================== */
const MP_URL = 'https://vgpwtrzplggvlsuvqsas.supabase.co', MP_KEY = 'sb_publishable_D9thEhZlZnfn0t06j8h1Rw_H-LVF786';
const MP_EVENTS = ['pos', 'st', 'ev', 'req', 'it', 'lob'];
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
    this.rt = window.BoboRT.open({ url:MP_URL, key:MP_KEY, topic:'bobo-kart-' + code, id, events:MP_EVENTS, eps:40, h });
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
    const bc = this.bc = new BroadcastChannel('bobo-kart-' + code);
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
const MP = { t:null, id:null, code:null, list:[], players:[], meta:null, isHost:false, hostId:null, synced:false, screen:'off', tok:0, posT:0, stT:0, lobT:0, inviteFor:null, typed:'', hostGone:0, track:'beach', order:null, endAt:0 };
let hostBoxes = [];
window.__boboRoom = () => (MP.t && MP.meta && MP.code) ? MP.code : null;
const mpActive = () => !!(MP.t && MP.meta);
const mpNewId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const mpSort = (a, b) => ((a.o || 0) - (b.o || 0)) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const numIn = (v, a, b, d = 0) => { v = +v; return isFinite(v) ? clamp(v, a, b) : d; };
const avPic = new Map();
function heroPic(hero, av){ if(hero !== 'me' || !av || !window.Avatar) return charImg(hero); const k = JSON.stringify(av); if(!avPic.has(k)){ try{ avPic.set(k, Avatar.portrait(av)); }catch(e){ avPic.set(k, charImg('sara')); } } return avPic.get(k); }

/* «أصحابي»: tell friends which room I'm in. The server may not know the game id: every call is guarded. */
const FR_GAME = 'kart';
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
function mpSend(ev, p){ if(MP.t) MP.t.send(ev, Object.assign({ id:MP.id }, p)); }
function itemSend(p){ if(R.online && MP.t) mpSend('it', Object.assign({ n:R.n }, p)); }
function mpPresence(list){
  list = (list || []).filter(p => p && p.ph !== 'probe');
  BoboRT.see(list, () => { if(MP.screen === 'lobby') mpLobbyDraw(); if(state === 'podium' && R.final) podiumCard(R.final, me ? R.final.indexOf(me) + 1 : 0); });
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
  if(joined.length && before.length) SFX.got();
  // a friend who left the race: their kart goes away
  if(R.online) for(const k of karts) if(k.kind === 'net' && !MP.players.some(p => p.id === k.id) && !k.gone){ k.gone = true; k.M.grp.visible = false; if(k.lbl) k.lbl.hidden = true; }
  if(MP.screen === 'lobby') mpLobbyDraw();
}
/* ---------- race messages ---------- */
function flagsOf(k){ return (k.drift ? 1 : 0) | (k.lvl > 1 ? 2 : 0) | (k.boost > 0 ? 4 : 0) | (k.spin > 0 || k.bounce > 0 ? 8 : 0) | (k.shield > 0 ? 16 : 0) | (k.shrink > 0 ? 32 : 0) | (k.jelly > 0 ? 64 : 0) | (k.air ? 128 : 0) | (k.drift < 0 ? 512 : 0) | (k.lvl === 1 ? 1024 : 0); }
function mpPosNow(){ if(!me || !R.online) return; mpSend('pos', { n:R.n, x:r2(me.x), y:r2(me.y), z:r2(me.z), h:r2(me.h), s:r2(me.s), f:flagsOf(me), lp:me.lap, u:r4(me.u), fin:me.fin ? 1 : 0, st:me.stars }); }
function netSmooth(k, dt){
  // dead reckoning + smoothing toward the last message
  const age = Math.min(.25, (performance.now() - k.seenAt) / 1000);
  const px = k.tx + Math.sin(k.th) * k.ts * age, pz = k.tz + Math.cos(k.th) * k.ts * age;
  if(Math.hypot(px - k.x, pz - k.z) > 12){ k.x = px; k.z = pz; k.y = k.ty; k.h = k.th; }
  const a = 1 - Math.exp(-12 * dt);
  k.x = lerp(k.x, px, a); k.z = lerp(k.z, pz, a); k.y = lerp(k.y, k.ty, a); k.h += angDiff(k.th, k.h) * a; k.s = lerp(k.s, k.ts, a);
  k.air = !!(k.flags & 128); k.shrink = k.flags & 32 ? 1 : 0;
  const q = T.query(k.x, k.z, k.qi); k.qi = q.i; k.qd = q.d;
}
function onPos(p){
  if(!R.online || p.n !== R.n) return;
  const k = karts.find(x => x.id === p.id && x.kind === 'net'); if(!k) return;
  k.tx = numIn(p.x, -500, 500); k.ty = numIn(p.y, -50, 100); k.tz = numIn(p.z, -500, 500); k.th = numIn(p.h, -1e4, 1e4); k.ts = numIn(p.s, -20, 50); k.flags = p.f | 0;
  k.lap = clamp(p.lp | 0, -1, LAPS); k.u = numIn(p.u, 0, 1); k.prog = k.lap + k.u; k.maxLap = Math.max(k.maxLap, k.lap); k.stars = clamp(p.st | 0, 0, 10);
  if(!k.seenAt){ k.x = k.tx; k.z = k.tz; k.y = k.ty; k.h = k.th; }
  k.seenAt = performance.now();
  if(p.fin && !k.fin && MP.isHost){ /* waits for the 'fin' request (with the time) */ }
}
function hostSnap(){
  const cpus = karts.filter(k => k.kind === 'cpu');
  const b = BOXES.map((x, i) => (R.t < (hostBoxes[i] || 0)) ? 1 : 0).join('');
  mpSend('st', { n:R.n, t:r2(R.t), c:cpus.map(k => [k.id, r2(k.x), r2(k.y), r2(k.z), r2(k.h), r2(k.s), flagsOf(k), k.lap, r4(k.u)]), b, pl:computePlaces().map(k => k.id), fo:R.order.map(o => [o.id, o.t]) });
}
function onSnap(p){
  if(!R.online || p.n !== R.n || !Array.isArray(p.c)) return;
  for(const c of p.c.slice(0, NK)){
    if(!Array.isArray(c)) continue;
    const k = karts.find(x => x.id === c[0] && x.kind === 'cpu'); if(!k) continue;
    k.tx = numIn(c[1], -500, 500); k.ty = numIn(c[2], -50, 100); k.tz = numIn(c[3], -500, 500); k.th = numIn(c[4], -1e4, 1e4); k.ts = numIn(c[5], -20, 50); k.flags = c[6] | 0;
    k.lap = clamp(c[7] | 0, -1, LAPS); k.u = numIn(c[8], 0, 1); k.prog = k.lap + k.u;
    if(!k.seenAt){ k.x = k.tx; k.z = k.tz; k.y = k.ty; k.h = k.th; }
    k.seenAt = performance.now();
  }
  if(typeof p.b === 'string') for(let i = 0; i < Math.min(p.b.length, BOXES.length); i++){ if(p.b[i] === '1'){ if(R.t >= BOXES[i].until) BOXES[i].until = R.t + 1; } }
  if(Array.isArray(p.pl)) MP.order = p.pl.filter(x => typeof x === 'string').slice(0, NK);
  if(Array.isArray(p.fo)) for(const f of p.fo){ if(!Array.isArray(f)) continue; const k = karts.find(x => x.id === f[0]); if(k && !k.fin && k !== me){ k.fin = true; k.finT = numIn(f[1], 0, 3600); } }
  if(typeof p.t === 'number' && R.phase === 'go' && Math.abs(p.t - R.t) > .5) R.t = lerp(R.t, p.t, .5);
}
function onReq(p){
  if(!MP.isHost || !R.online || p.n !== R.n) return;
  if(p.k === 'box'){ const i = p.i | 0; if(i >= 0 && i < BOXES.length){ hostBoxes[i] = R.t + 3; BOXES[i].until = Math.max(BOXES[i].until, R.t + 3); } }
  else if(p.k === 'fin'){ const k = karts.find(x => x.id === p.id); if(k && !R.order.some(o => o.id === p.id)){ k.fin = true; k.finT = numIn(p.t, 0, 3600, R.t); R.order.push({ id:p.id, t:r2(k.finT) }); } }
}
function onItem(p){
  if(!R.online || p.n !== R.n) return;
  if(p.k === 'drop' && (p.type === 'banana' || p.type === 'jelly') && typeof p.hid === 'string'){ R.netDrops = (R.netDrops || 0) + 1; } if(p.k === 'drop' && (p.type === 'banana' || p.type === 'jelly') && typeof p.hid === 'string') addHazard({ id:p.hid.slice(0, 40), type:p.type, x:numIn(p.x, -500, 500), y:numIn(p.y, -50, 100), z:numIn(p.z, -500, 500), by:String(p.by || ''), t:R.t });
  else if(p.k === 'gone'){ const h = R.hazards.find(x => x.id === p.hid); if(h){ h.dead = true; burst(h.x, h.y + .5, h.z, 8, h.type === 'jelly' ? GREEN : GOLD, 3, .9, 8, 2); } }
  else if(p.k === 'bal' && typeof p.bid === 'string'){ const by = karts.find(k => k.id === p.by); addBalloon({ id:p.bid.slice(0, 40), by:String(p.by || ''), target:typeof p.target === 'string' ? p.target : null, prog:numIn(p.prog, -2, 5), lat:0, x:by ? by.x : 0, y:by ? by.y + 1.5 : 0, z:by ? by.z : 0, life:8 }); }
  else if(p.k === 'pop'){ const b = R.balloons.find(x => x.id === p.bid); if(b) popBalloon(b); }
  else if(p.k === 'shrink' && Array.isArray(p.ids)) applyShrink(p.ids.filter(x => typeof x === 'string').slice(0, NK));
}
function mpMsg(ev, p){
  if(ev === 'pos'){ onPos(p); return; }
  if(ev === 'req'){ onReq(p); return; }
  if(ev === 'it'){ onItem(p); return; }
  if(p.id !== MP.hostId) return;                    // only the room owner decides
  if(ev === 'lob'){ if(!MP.isHost){ if(p.track) MP.track = okTrack(p.track); if(p.ph === 'idle' && (state === 'podium' || MP.screen === 'in') && R.online){ R.online = false; mpLobby(); } else if(MP.screen === 'lobby') mpLobbyDraw(); } else if(p.ask){} return; }
  if(MP.isHost) return;
  if(ev === 'st'){ onSnap(p); return; }
  if(ev !== 'ev') return;
  if(p.k === 'start') onStart(p);
  else if(p.k === 'end' && R.online && p.n === R.n && Array.isArray(p.order)) { MP.order = null; endRace(p.order.filter(o => Array.isArray(o)).map(o => ({ id:String(o[0]), t:numIn(o[1], 0, 3600) }))); }
}
function okPlan(pl){
  if(!pl || typeof pl !== 'object' || !Array.isArray(pl.grid)) return null;
  const grid = pl.grid.slice(0, NK).filter(g => g && typeof g.id === 'string').map(g => ({ id:g.id.slice(0, 24), kind:g.kind === 'h' ? 'h' : 'cpu', hero:okHero(g.hero), av:g.hero === 'me' ? okAv(g.av) : null }));
  return { track:okTrack(pl.track), grid };
}
function onStart(p){
  const plan = okPlan(p.plan); if(!plan) return;
  if(MP.screen !== 'lobby' && MP.screen !== 'in' && state !== 'podium') return;
  if(R.online && p.n === R.n && !R.over) return;
  if(!plan.grid.some(g => g.id === MP.id)) return;          // came in after the start: wait for the next race
  R.n = p.n | 0; MP.screen = 'in'; MP.order = null;
  beginOnline(plan);
}
function beginOnline(plan){
  const grid = plan.grid.map(g => ({ id:g.id, kind:g.kind === 'h' ? (g.id === MP.id ? 'me' : 'net') : 'cpu', hero:g.id === MP.id ? heroId : g.hero, av:g.id === MP.id ? myAv() : g.av }));
  setupRace({ track:plan.track, grid }, 'online');
  R.online = true; hostBoxes = []; MP.endAt = 0;
  $('#hudRoom').hidden = false; $('#hudRoom').textContent = '🏠 ' + MP.code;
}
/* host: start a race with everyone in the room + computer karts */
function coStartRace(){
  if(!MP.isHost || !mpActive()) return;
  const humans = MP.players.slice(0, MP_MAX);
  const cpus = cpuRoster(humans.map(p => okHero(p.hero)), NK - humans.length);
  const grid = [], hSlots = [3, 4, 5, 6].slice(0, humans.length);
  let hi = 0;
  for(let i = 0; i < NK; i++){
    if(hSlots.includes(i)){ const p = humans[hi++]; grid.push({ id:p.id, kind:'h', hero:okHero(p.hero), av:p.hero === 'me' ? (p.id === MP.id ? myAv() : okAv(p.av)) : null }); }
    else grid.push({ id:'c' + i, kind:'cpu', hero:cpus.pop() });
  }
  R.n = (R.n | 0) + 1; MP.screen = 'in';
  const plan = { track:MP.track, grid };
  mpSend('ev', { k:'start', n:R.n, plan });
  beginOnline(plan);
}
function mpBackToLobby(){ if(!MP.isHost) return; R.online = false; mpLobby(); mpSend('lob', { track:MP.track, ph:'idle' }); }
function mpFrame(dt){
  if(!mpActive()) return;
  if(MP.hostGone && performance.now() - MP.hostGone > 5000){
    MP.hostGone = 0; coStop(); showTitle();
    toast(L('صاحب الغرفة طلع 🚪 بتقدر تلعب لحالك أو تعمل غرفة جديدة', 'The room owner left 🚪 play alone or make a new room', 'Oda sahibi çıktı 🚪 tek başına oyna ya da yeni oda kur'), 5000);
    return;
  }
  MP.posT -= dt; MP.stT -= dt; MP.lobT -= dt; MP.fcT = (MP.fcT || 0) - dt;
  if(MP.meta && !MP.meta.fc && MP.fcT <= 0){
    MP.fcT = 2; const c = BoboRT.fc();
    if(c){ MP.meta.fc = c; MP.t.track(MP.meta); }
    else if(!MP.fcAsked && window.Friends && Friends.has && Friends.has()){ MP.fcAsked = true; try{ const q = Friends.me(); if(q && q.catch) q.catch(() => {}); }catch(e){} }
  }
  if(R.online && !R.over && me){
    if(MP.posT <= 0){ MP.posT = 1 / 15; mpPosNow(); }
    if(MP.isHost && MP.stT <= 0){ MP.stT = .1; hostSnap(); }
    // host: the race ends when every kid has finished (or 25 s after the first one did)
    if(MP.isHost){
      const kids = karts.filter(k => (k.kind === 'me' || k.kind === 'net') && !k.gone);
      const done = kids.filter(k => k.fin).length;
      if(done && !MP.endAt) MP.endAt = performance.now() + 25000;
      if(kids.length && (done === kids.length || (MP.endAt && performance.now() > MP.endAt))){
        // finishing order first, then everyone else by how far they got
        const fins = R.order.slice(), rest = karts.filter(k => !k.gone && !fins.some(o => o.id === k.id)).sort((a, b) => b.prog - a.prog).map(k => ({ id:k.id, t:0 }));
        const order = fins.concat(rest);
        mpSend('ev', { k:'end', n:R.n, order:order.map(o => [o.id, o.t]) });
        endRace(order);
      }
    }
  }
  if(MP.isHost && MP.screen === 'lobby' && MP.lobT <= 0){ MP.lobT = 1; mpSend('lob', { track:MP.track, ph:'idle' }); }
}
function coStop(){
  MP.tok++; mpClose(); MP.screen = 'off';
  if(R.online){ R.online = false; for(const k of karts) if(k.lbl){ k.lbl.remove(); k.lbl = null; } }
}

/* ---------- lobby, keypad ---------- */
function mpCard(wide){ state = 'mp'; setRaceUI(false); showOverlay('dim'); card.className = 'card' + (wide ? ' wide' : ''); }
function mpMenu(){
  MP.tok++; mpClose(); MP.screen = 'menu'; R.online = false; mpCard(false);
  if(R.mode !== 'menu') toTitleTrack();
  card.innerHTML = `<h2>👫 ${L('العب مع أصحابك', 'Play with friends', 'Arkadaşlarla oyna')}</h2>
    <p>🏎️ ${L('لحتى 4 أصحاب بنفس السباق، والباقي سيارات الكمبيوتر!', 'Up to 4 friends in the same race, plus computer karts!', 'Aynı yarışta 4 arkadaşa kadar, gerisi bilgisayar kartları!')}</p>
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
function mpLeave(){ MP.tok++; mpClose(); MP.screen = 'off'; R.online = false; }
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
  R.online = false; MP.screen = 'lobby'; mpCard(true);
  for(const k of karts) if(k.lbl){ k.lbl.remove(); k.lbl = null; }
  if(R.mode !== 'menu'){ useTrack(MP.track); menuParade(); }
  mpLobbyDraw();
  if(MP.isHost) mpSend('lob', { track:MP.track, ph:'idle' });
}
function mpLobbyDraw(){
  if(MP.screen !== 'lobby' || state !== 'mp') return;
  const pl = MP.players, code = [...(MP.code || '')].map(N).join('');
  const slots = [0, 1, 2, 3].map(i => { const p = pl[i]; if(!p) return `<div class="pslot empty"><div class="wt">⏳</div><small>${L('استنّى…', 'Waiting…', 'Bekle…')}</small></div>`;
    const hero = okHero(p.hero), mine = p.id === MP.id;
    return `<div class="pslot" style="--c:${HERO_COLOR[hero]}"><img src="${mine ? charImg(hero) : heroPic(hero, okAv(p.av))}" alt=""><span dir="auto">${mine ? L('إنت', 'You', 'Sen') : ('👫 ' + BoboRT.whoH(p.id, '')).trim()}${p.id === MP.hostId ? ' 👑' : ''}</span></div>`; }).join('');
  const tr = TRACKS.find(t => t.id === MP.track) || TRACKS[0];
  card.innerHTML = `<h2>🏠 ${L('غرفة رقم', 'Room number', 'Oda numarası')} <bdi dir="ltr">${code}</bdi></h2>
    <div class="pslots">${slots}</div>
    ${MP.isHost ? `<p>${L('قلّ لأصحابك رقم الغرفة 👆 واختار الحلبة:', 'Tell your friends the room number 👆 and pick the track:', 'Arkadaşlarına oda numarasını söyle 👆 ve pisti seç:')}</p>
      <div class="tracks">${TRACKS.map(t => `<button class="trk${t.id === MP.track ? ' on' : ''}" data-t="${t.id}" style="--tc:${TCOL[t.theme]}"><i>${t.emoji}</i><b>${TNAME(t)}</b></button>`).join('')}</div>
      <div class="row">${myHeroBtn()}<button class="big-btn" id="bStart">🏁 ${L('ابدأ السباق', 'Start the race', 'Yarışı başlat')}</button><button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`
    : `<p>${tr.emoji} ${TNAME(tr)} · ${L('استنّى صاحب الغرفة يبدأ…', 'Wait for the room owner to start…', 'Oda sahibinin başlatmasını bekle…')}</p>
      <div class="row">${myHeroBtn()}<button class="ghost-btn" id="bLeave">🚪 ${L('اطلع', 'Leave', 'Çık')}</button></div>`}`;
  if(MP.isHost){
    card.querySelectorAll('.trk').forEach(b => b.onclick = () => { MP.track = okTrack(b.dataset.t); SFX.tap(); mpSend('lob', { track:MP.track, ph:'idle' }); useTrack(MP.track); menuParade(); mpLobbyDraw(); });
    $('#bStart').onclick = () => { AU.ac(); SFX.tap(); coStartRace(); };
  }
  $('#bMyHero').onclick = () => { SFX.tap(); showSelect('mp'); };
  $('#bLeave').onclick = () => { SFX.tap(); mpLeave(); mpMenu(); };
}
async function mpCreate(want){
  mpConnecting();
  MP.track = SAVE.track;
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
/* «تعا العب» from the friends page: ?host=1&invite=<friendCode>. The server may not accept 'kart' yet: guarded. */
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

/* ======================================================================
   Test hook
   ====================================================================== */
const kInfo = k => k && ({ id:k.id, kind:k.kind, hero:k.hero, x:r2(k.x), y:r2(k.y), z:r2(k.z), h:r2(k.h), s:r2(k.s), lap:k.lap, maxLap:k.maxLap, u:r4(k.u), prog:r4(k.prog), place:k.place, fin:k.fin, finT:r2(k.finT), item:k.item, itemN:k.itemN, rl:k.rl,
  drift:k.drift, lvl:k.lvl, boost:r2(k.boost), spin:r2(k.spin), shield:r2(k.shield), shrink:r2(k.shrink), jelly:r2(k.jelly), bounce:r2(k.bounce), stars:k.stars, on:k.on, air:k.air, gone:k.gone, label:k.lbl ? (k.lbl.hidden ? null : k.lbl.textContent) : undefined, name:k.lbl ? k.lbl.textContent : undefined });
window.__kart = {
  get state(){ return state; }, get mode(){ return R.mode; }, get track(){ return trackId; }, get phase(){ return R.phase; }, get t(){ return R.t; }, get hero(){ return heroId; },
  get me(){ return kInfo(me); }, get karts(){ return karts.map(kInfo); }, get final(){ return R.final ? R.final.map(k => ({ id:k.id, place:k.place, fin:k.fin, finT:r2(k.finT), hero:k.hero })) : null; },
  get hazards(){ return R.hazards.map(h => ({ id:h.id, type:h.type, x:h.x, z:h.z })); }, get balloons(){ return R.balloons.map(b => ({ id:b.id, target:b.target })); },
  get boxes(){ return BOXES.map(b => ({ x:b.x, y:b.y, z:b.z, on:R.t >= b.until })); }, get pads(){ return T.PADS; }, get len(){ return T.LEN; },
  get fps(){ return fps; }, get dpr(){ return dpr; }, get calls(){ return renderer.info.render.calls; }, get tris(){ return renderer.info.render.triangles; }, get rot(){ return ROT; },
  get banner(){ return $('#banner').textContent; }, get hud(){ return { lap:lapEl.textContent, pos:posEl.textContent, time:timeEl.textContent, slot:slotEl.textContent, stars:starsEl.textContent }; },
  back(){ if(state === 'select') backFromSelect(); else if(state === 'mp') mpBack(); else showTitle(); }, menu:() => showTitle(),
  select(h){ if(HERO_IDS.includes(h)){ heroId = h; SAVE.hero = h; persist(); } return heroId; }, showSelect:() => showSelect('title'), showTracks:m => showTracks(m || 'quick'),
  quick:t => startQuick(t || 'beach'), tt:t => startTT(t || 'beach'), cup:() => startCup(), nextCup:() => nextCupRace(), pause:() => showPause(), resume:() => resume(),
  speed(n){ timeScale = clamp(n | 0, 1, 8); },
  ctl(c){ testCtl = c ? Object.assign({ steer:0, brake:false, drift:false }, c) : null; }, autopilot(b){ autopilot = !!b; }, use(){ wantItem = true; }, give(it, n = 1){ if(me){ me.item = it; me.itemN = n; me.rl = 0; } },
  warp(u, side = 0){ const p = T.at(u, side); me.x = p.x; me.z = p.z; me.y = p.y; me.h = p.h; me.qi = p.i; me.air = false; me.vy = 0; const q = T.query(me.x, me.z, me.qi); const du = q.u - me.u; if(du < -.5) me.lap++; else if(du > .5) me.lap--; me.u = q.u; me.prog = me.lap + me.u; snapCam = true; return kInfo(me); },
  at:(u, s) => T.at(u, s), query:(x, z) => T.query(x, z),
  sim(sec){ const dt = 1 / 30; for(let i = 0; i < sec * 30 && (state === 'race' || state === 'count' || state === 'done'); i++){ T0 += dt; raceStep(dt); for(const k of karts) if(!k.gone) poseKart(k, T0, dt); } updateCamera(1); return kInfo(me); },
  cam(a){ camOverride = a; }, hudOn(on){ for(const el of [hudEl, bL, bR, bDrift, bItem, bBrake, posEl]) el.style.visibility = on ? '' : 'hidden'; }, overlayOn(on){ overlay.style.visibility = on ? '' : 'hidden'; },
  useTrack:id => { useTrack(id); menuParade(); }, banner2:(t) => banner(t, 'mid long'), quality:() => quality,
  /* online */
  get mpScreen(){ return MP.screen; }, get online(){ return R.online; }, get raceN(){ return R.n; },
  get mp(){ return { code:MP.code, active:mpActive(), isHost:MP.isHost, hostId:MP.hostId, screen:MP.screen, id:MP.id, track:MP.track, players:MP.players.map(p => ({ id:p.id, hero:p.hero, c:p.c })) }; },
  get mpErr(){ return MP.err || ''; }, get order(){ return R.order.slice(); }, get netDrops(){ return R.netDrops || 0; },
  mpMenu:() => mpMenu(), mpCreate:c => mpCreate(c), mpJoin:c => mpJoin(c), mpStart:() => coStartRace(), mpTrackPick:t => { MP.track = okTrack(t); mpSend('lob', { track:MP.track, ph:'idle' }); mpLobbyDraw(); }, mpLeave:() => { coStop(); showTitle(); }, mpAgain:() => mpBackToLobby()
};

/* ---------- boot ---------- */
resize();
showTitle();
requestAnimationFrame(frame);
/* ?host=1 (&room=<4 digits>, &invite=<friendCode>, &accept=<id> for invitepop.js) makes a room; ?join=<room> joins one */
(function(){
  const join = QS.get('join'), host = QS.get('host') === '1', inv = QS.get('invite'), room = QS.get('room');
  if(!/^\d{4}$/.test(join || '') && !host) return;
  const q = new URLSearchParams(location.search); ['join', 'host', 'invite', 'room'].forEach(k => q.delete(k));
  try{ history.replaceState(history.state, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash); }catch(e){}
  if(/^\d{4}$/.test(join || '')) mpJoin(join, performance.now() + 20000);
  else { MP.inviteFor = /^[A-Z2-9]{6}$/.test(inv || '') ? inv : null; mpCreate(/^\d{4}$/.test(room || '') ? room : null); }
})();
